# @svelte-kits/keep-route

**SvelteKit 的“路由级保活（Keep-Alive）”插件**：缓存每个路由的**组件状态快照**与**滚动位置**，切路由来回不丢表单、不丢分页、不丢滚动。支持 **include/exclude**、**LRU 上限**、**本地持久化**，零第三方依赖。🧠💾

- 🔁 **状态保活**：给需要保活的组件打上 `use:keepState`，自动保存/恢复其快照
- 🧭 **滚动恢复**：同一路由返回时自动回到离开前的滚动位置
- 🎯 **精确控制**：`include` / `exclude` 按路由 **glob** 匹配
- 🧳 **LRU 缓存**：只保留最近使用的 N 个路由，防止内存炸掉
- 🗂️ **可持久化**：可选写入 `localStorage`，刷新后仍可恢复
- 🧩 **零侵入**：不改编译产物、不克隆 DOM，组件按原样运行

> 这不是 Vue 的 vnode 级 `<KeepAlive>`，而是**数据层**的“状态快照”方案，更贴合 Svelte 的编译模型，稳定、可控、易调试。

---

## 安装

```bash
pnpm add @svelte-kits/keep-route
# or npm i / yarn add
```

---

## 快速开始（两步走）

### 1) 在 `+layout.svelte` 里接线 SvelteKit 导航事件

```svelte
<script lang="ts">
  import { createKeepRoute, wireSvelteKit, makeKeepState } from '@svelte-kits/keep-route';
  import { page } from '$app/stores';
  import { beforeNavigate, afterNavigate } from '$app/navigation';

  // 1) 创建 keep 实例
  const keep = createKeepRoute({
    include: ['/dashboard/**', '/search/**', '/detail/**'], // 需要保活的路由
    exclude: ['/login/**'],                                  // 不保活的路由
    max: 12,                  // LRU 上限
    scroll: true,             // 是否恢复滚动
    persistKey: 'kr'          // 可选：持久化键前缀
  });

  // 2) 接线（挂到 SvelteKit 的导航事件）
  wireSvelteKit(keep, { page, beforeNavigate, afterNavigate });

  // 3) 导出一个 action，给页面/组件使用
  export const keepState = makeKeepState(keep);
</script>

<slot />
```

> ✅ **SvelteKit v2 兼容说明**
> `wireSvelteKit` 内部会自动从事件对象的 `e.from?.url / e.to?.url` 提取 `URL`，同时兼容旧形态（直接传 `URL`）。你无需自己做类型转换。

### 2) 在页面或组件上声明“我需要被保活的状态”

```svelte
<script lang="ts">
  import { keepState } from '../+layout.svelte'; // 从布局导出的 action
  let q = '';          // 搜索词
  let pageNo = 1;      // 分页页码

  function snap() {         // 序列化自身状态（必须可 JSON 化）
    return { q, pageNo };
  }
  function hydrate(s: any) {// 反序列化恢复
    if (!s) return;
    q = s.q ?? q;
    pageNo = s.pageNo ?? pageNo;
  }
</script>

<!-- 你可以把 action 绑在任意一个“承载该状态”的顶层元素上 -->
<div use:keepState={{ id: 'searchForm', get: snap, set: hydrate }}>
  <input bind:value={q} placeholder="关键词" />
  <button on:click={() => pageNo = 1}>搜索</button>
  <!-- ...列表与分页... -->
</div>
```

切到别的路由再返回，`q/pageNo` 会**自动复活**；回退也会**回到原滚动位置**。🎯

---

## 核心概念

### RouteKey（路由键）
默认用 `pathname + search`，例如 `/search?q=abc&page=2`。
需要自定义可在 `wireSvelteKit(keep, { key(url){...} })` 里覆盖。

### Keeper（保活单元）
`use:keepState({ id, get, set })` 会注册一个 keeper：
- `id`：同一路由内应唯一（不传会自动分配）
- `get()`：返回可 JSON 化的快照
- `set(v)`：把快照恢复回组件状态

### LRU
只缓存最近 `max` 个路由（默认 10）。超过就淘汰“最久未使用”的路由缓存。

### 滚动恢复
默认启用。导航返回时在下一帧 `window.scrollTo(x,y)`，尽量与 SvelteKit 内置滚动行为协调。

### 持久化（可选）
传入 `persistKey` 会把每个路由的 `{state, scroll}` 存到 `localStorage`。刷新后仍能恢复。

---

## API

```ts
import {
  createKeepRoute, wireSvelteKit, makeKeepState,
  type KeepRouteOptions, type KeepInstance, type KeepStateParam, type RouteKey
} from '@svelte-kits/keep-route';
```

### `createKeepRoute(options?: KeepRouteOptions): KeepInstance`
**Options**
- `include?: string[]`：生效白名单（glob），默认 `['/**']`
- `exclude?: string[]`：排除名单（glob），默认 `[]`
- `max?: number`：LRU 上限，默认 `10`
- `scroll?: boolean`：是否恢复滚动，默认 `true`
- `persistKey?: string`：持久化前缀，例如 `'kr'`

**KeepInstance**
- `register(k: { id, get, set }): () => void`：注册 keeper（通常通过 `makeKeepState` 封装）
- `onBeforeNavigate(routeKey: RouteKey)` / `onAfterNavigate(routeKey: RouteKey)`：导航钩子（由 `wireSvelteKit` 代调用）
- `save(routeKey)` / `restore(routeKey)`：手动保存/恢复
- `current: Readable<RouteKey | null>`：当前命中的路由键（调试用）

### `wireSvelteKit(keep, wiring)`
把 keep 实例接到 SvelteKit（**v2 事件形态**）：
```ts
wireSvelteKit(keep, {
  page,                  // $app/stores -> page
  beforeNavigate,        // $app/navigation
  afterNavigate,         // $app/navigation
  key?: (url: URL) => string // 可自定义路由键（默认 pathname+search）
});
```

**类型提示（说明用）**
```ts
type Wiring = {
  page: import('svelte/store').Readable<{ url: URL }>;
  // SvelteKit v2 的事件；库内会从 e.from?.url / e.to?.url 提取 URL
  beforeNavigate: (cb: (e: import('@sveltejs/kit').BeforeNavigate) => void) => void;
  afterNavigate:  (cb: (e: import('@sveltejs/kit').AfterNavigate)  => void) => void;
  key?: (url: URL) => RouteKey;
};
```

### `makeKeepState(keep): Action<HTMLElement, KeepStateParam>`
返回一个 Svelte Action（`use:keepState={...}`）
- `KeepStateParam`
  - `id?: string`：唯一标识，不传自动生成
  - `get: () => any`：序列化快照（必须可 JSON 化）
  - `set: (v:any) => void`：恢复快照

---

## 路由匹配：glob 规则

- `/**`：任意多层目录
- `*`：一层内任意字符（不含 `/`）

示例：
```ts
include: ['/search/**', '/detail/*']
exclude: ['/login/**', '/admin/**']
```

---

## 进阶用法

### 自定义路由键（忽略查询参数）
```ts
wireSvelteKit(keep, {
  page, beforeNavigate, afterNavigate,
  key: (u) => u.pathname // 仅按 path 缓存
});
```

### 多个 keeper（复杂页面拆分）
```svelte
<div use:keepState={{ id:'filters', get: getFilters, set: setFilters }} />
<div use:keepState={{ id:'table',   get: getTable,   set: setTable   }} />
```
同一路由下各 keeper 互不影响。

### 手动保存/恢复（很少需要）
```ts
keep.save('/search?q=abc');    // 强制保存
keep.restore('/search?q=abc'); // 强制恢复
```

### 与 SSR 的关系
本插件只在浏览器运行（依赖导航事件与 `window.scrollTo`）。SSR 无需特殊处理；如启用 `persistKey`，刷新后也能恢复。

---

## 实战建议

- **快照要小**：只存 UI 状态（表单、分页、选中项、折叠状态…），避免把大数组整段写入本地持久化。
- **表单组件最受益**：搜索页、筛选页、表格分页；回退立即还原，用户好感度+++。
- **滚动冲突**：若你自定义了 SvelteKit 的 `handleScroll`，可把 `scroll:false` 交由你统一管理。
- **LRU 调大有代价**：注意内存占用；建议 10–20 之间权衡。

---

## FAQ

**Q：为啥不做成 Vue 那种 `<KeepAlive>`？**
A：Svelte 的编译模型不暴露 vnode 层拦截点，DOM 克隆/劫持不稳定，且副作用多。**数据层快照**更稳、更透明、可测试。

**Q：刷新页面还能恢复吗？**
A：给 `createKeepRoute` 传 `persistKey`，状态与滚动会写入 `localStorage`。刷新后同一路由会恢复。

**Q：内存会不会爆？**
A：有 **LRU**。超过 `max` 就自动淘汰最久未使用的路由缓存。

**Q：同一路由的不同查询要不要区分？**
A：默认 **区分**（`pathname+search`）；可自定义 key 只按 `pathname`。

**Q：导航事件类型不匹配，TS 报错？**
A：升级到本版（内置 v2 兼容），并按本文的 `wireSvelteKit` 用法接线即可；库内会自动从 `e.from?.url / e.to?.url` 提取 `URL`，无需你转型。

**Q：组件卸载/重新挂载时如何避免冲突？**
A：`use:keepState` 在组件销毁时自动注销；同一路由 id 要保持唯一。

---

## 兼容性 & 许可

- Svelte **4 / 5**
- 浏览器支持：现代浏览器（需要 `MutationObserver` / `localStorage` 若启用持久化）
- License：**MIT**

---

## 变更日志 & 路线图

- v0.1.0：首发，状态快照 + 滚动恢复 + include/exclude + LRU + 持久化
- v0.1.1：**SvelteKit v2 导航事件类型兼容**（自动识别 `e.from?.url / e.to?.url`），初始订阅时自动做一次 restore
- 计划：按模块导出 Dev 面板（可视化当前缓存路由/快照大小）、每路由限速持久化、跨标签同步

---

## 示例样式（可选）

```css
/* 仅示意：让恢复滚动时更顺滑 */
html { scroll-behavior: smooth; }
```
