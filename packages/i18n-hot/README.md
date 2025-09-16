# @svelte-kits/i18n-hot

**Svelte/SvelteKit 的热更新 i18n**：远端 Manifest + 304/ETag 校验 + 本地缓存 + Svelte stores。
不绑框架路由、零第三方依赖，支持懒加载、预加载、占位符校验与自动刷新。🈶🔥

- ⚡ **热更新**：更新服务器上的 manifest（或变更 ETag）即可增量拉取新词条
- 🧳 **本地缓存**：`localStorage` 缓存 manifest ETag、各语言 ETag 与词典，断网也能用
- 🧩 **Svelte 原生**：`locale` / `dict` / `version` 三个 store；`t()` 翻译函数
- 🧮 **占位符校验**：同 key 新旧占位符不一致时 `console.warn`
- 🌏 **多云适配**：默认 `HttpJsonAdapter`；也可自定义适配器对接 OSS/COS/CDN 等

> 推荐在 monorepo 根安装 `svelte` 作为 **devDependency**，而在本包中声明 `peerDependencies: { svelte: "^4 || ^5" }`。

---

## 安装

```bash
pnpm add @svelte-kits/i18n-hot
# or npm i / yarn add
```

---

## 快速开始

### 1) 准备后端文件（示例）

**`/i18n/manifest.json`**
```json
{
  "version": "2025-09-16T12:00:00Z",
  "locales": {
    "en":   { "url": "/i18n/en.json" },
    "zh-CN":{ "url": "/i18n/zh-CN.json" }
  }
}
```

**`/i18n/en.json`**
```json
{
  "hello": "Hello, {name}!",
  "save.ok": "Saved."
}
```

**`/i18n/zh-CN.json`**
```json
{
  "hello": "你好，{name}！",
  "save.ok": "已保存。"
}
```

> 生产环境建议为 `manifest.json` 与每个 `{locale}.json` 配置 **ETag/Last-Modified**，返回 304 提升效率（下方有示例）。

---

### 2) 前端使用（任意组件/布局）

```svelte
<script lang="ts">
  import { createI18nHot, HttpJsonAdapter } from "@svelte-kits/i18n-hot";

  const i18n = createI18nHot({
    adapter: new HttpJsonAdapter({ manifestURL: "/i18n/manifest.json" }),
    initialLocale: "zh-CN",
    fallbackLocale: "en",
    preload: ["en"],          // 可选：预加载这些语言
    autoRefreshMs: 60_000     // 可选：自动每 60s 检查更新
  });

  // 切换语言
  function toEN()   { i18n.setLocale("en"); }
  function toZH()   { i18n.setLocale("zh-CN"); }
</script>

<h1>{i18n.t("hello", { name: "骚哥" })}</h1>
<button on:click={toEN}>EN</button>
<button on:click={toZH}>中文</button>
```

---

## Manifest 与缓存机制

- **Manifest**（上面的 `manifest.json`）声明版本号和每个语言文件的 URL；
- 本包会将：
  - Manifest 的 **ETag**、
  - 各 locale 的 **ETag**、
  - 已拉取的词典 `dicts`

  一并存进 `localStorage`（默认键前缀 `i18n:hot`），下次启动先用缓存，再按 ETag 差量拉取。

> 修改 `manifest.json` 的 `version` 或响应头 `ETag` → 触发热更新。
> 语言文件若返回 `304 Not Modified` → 不复写本地词典；返回 `200 OK` → 合并新词条。

---

## API 参考

```ts
import { createI18nHot, HttpJsonAdapter } from "@svelte-kits/i18n-hot";
import type { Dict, I18nAdapter, I18nHotOptions, Snapshot } from "@svelte-kits/i18n-hot";
```

### `createI18nHot(options: I18nHotOptions)`
**Options**
- `adapter: I18nAdapter`：后端适配器（默认提供 `HttpJsonAdapter`）
- `initialLocale: string`：初始语言
- `fallbackLocale?: string`：回退语言
- `persistKey?: string`：本地缓存键前缀（默认 `"i18n:hot"`）
- `preload?: string[]`：预加载这些语言
- `autoRefreshMs?: number`：自动刷新间隔（ms）
- `warnPlaceholders?: boolean`：占位符差异警告（默认 `true`）

**返回对象（I18nPublicAPI）**
- **Stores**
  - `locale: Readable<string>`
  - `dict: Readable<Dict>`
  - `version: Readable<string | null>`
- **Ops**
  - `t(key: string, params?: Record<string, unknown>): string`
  - `setLocale(locale: string): Promise<void>`
  - `hasKey(key: string): boolean`
- **Lifecycle**
  - `refresh(): Promise<void>`：手动重新检查 manifest 并刷新当前语言
  - `startAutoRefresh(ms?: number): void` / `stopAutoRefresh(): void`
- **SSR / 持久化**
  - `snapshot(): Snapshot`：导出当前快照（含版本/ETag/字典）
  - `hydrate(snap: Snapshot): void`：在客户端复水

---

## 默认适配器：`HttpJsonAdapter`

```ts
import { HttpJsonAdapter } from "@svelte-kits/i18n-hot";

const adapter = new HttpJsonAdapter({
  manifestURL: "/i18n/manifest.json",
  headers: { Authorization: "Bearer <token>" } // 可选
});
```

- `getManifest(etag?)`：携带 `If-None-Match` 请求 manifest；`304` → `changed=false`
- `getLocale(locale, url, etag?)`：同理；`304` → 返回空 dict，调用方跳过合并

### 自定义适配器（示意）
对接 OSS/COS/CDN/GraphQL 皆可，形状如下：

```ts
export interface I18nAdapter {
  name: string;
  getManifest(etag?: string | null): Promise<{ changed: boolean; manifest?: Manifest; etag?: string | null }>;
  getLocale(locale: string, url: string, etag?: string | null): Promise<{ dict: Dict; etag?: string | null }>;
}
```

---

## SvelteKit SSR 复水（可选）

**+layout.server.ts**
```ts
import { createI18nHot, HttpJsonAdapter } from "@svelte-kits/i18n-hot";

export const load = async () => {
  const i18n = createI18nHot({
    adapter: new HttpJsonAdapter({ manifestURL: "https://example.com/i18n/manifest.json" }),
    initialLocale: "zh-CN",
    fallbackLocale: "en"
  });
  // 服务器端可以可选地预拉一次快照（也可以不拉，保持懒加载）
  const snap = i18n.snapshot();
  return { i18nSnap: snap };
};
```

**+layout.svelte**
```svelte
<script lang="ts">
  import { createI18nHot, HttpJsonAdapter } from "@svelte-kits/i18n-hot";
  export let data;

  const i18n = createI18nHot({
    adapter: new HttpJsonAdapter({ manifestURL: "/i18n/manifest.json" }),
    initialLocale: "zh-CN",
    fallbackLocale: "en"
  });
  // 客户端复水
  i18n.hydrate(data.i18nSnap);
</script>

<slot />
```

---

## ETag / 304 服务端示例

### Node（Fastify）返回 manifest 与 ETag
```ts
app.get("/i18n/manifest.json", async (req, reply) => {
  const body = JSON.stringify({
    version: "2025-09-16T12:00:00Z",
    locales: { "en": { url: "/i18n/en.json" }, "zh-CN": { url: "/i18n/zh-CN.json" } }
  });

  const etag = `"m-${Buffer.from(body).toString("hex").slice(0,16)}"`;
  if (req.headers["if-none-match"] === etag) {
    return reply.code(304).send();
  }
  return reply.header("ETag", etag).type("application/json").send(body);
});
```

### Cloudflare Workers / 任意 CDN
- 将 `manifest.json` 与 `{locale}.json` 上传到对象存储/Pages；
- 配置 **强制 ETag** 与 **Cache-Control**；
- 前端会用 `If-None-Match` 自动走 304。

---

## 占位符最佳实践

- 文本里使用 `{name}`、`{order.id}` 这类占位符；
- 新版词条若与旧版同 key，但占位符集合不同，本包会 `console.warn`（可通过 `warnPlaceholders:false` 关闭）；
- 参数可嵌套：`i18n.t("helloOrder", { order: { id: 42 }})`，匹配 `{order.id}`。

---

## 常见问题（FAQ）

**Q：首次进入为什么没立即看到翻译？**
A：本包采用**懒加载**策略。`createI18nHot` 会在 microtask 发起初始化加载；如需“首屏必有”，可在 SSR preload 或入口处调用 `await i18n.setLocale('xx')` 后再渲染。

**Q：如何手动触发热更新？**
A：调用 `await i18n.refresh()`；或设置 `autoRefreshMs` 自动轮询。

**Q：多语言切换时闪烁？**
A：配置 `fallbackLocale` 并**先加载 fallback 再加载当前**（本包已这样做）；也可以在 UI 层为缺失 key 提供占位样式。

**Q：能把词典放到 GraphQL / 私有 API 吗？**
A：可以，写一个自定义 `I18nAdapter` 就行（上面接口参考）。

---

## 版本 & 许可

- Node ≥ 18，Svelte 4/5
- License：**MIT**

> Roadmap：批量预取 + LRU 缓存；基于 Service Worker 的离线包；多命名空间（分模块翻译）支持；占位符类型提示（TS 模板类型）。
