# @sv-kit/query-kit

**无 UI 的查询/缓存核心库**：去重并发、SWR（stale-while-revalidate）、TTL/GC、重试退避、Abort 取消、预取、失效、持久化快照（hydrate/dehydrate）。
零第三方依赖，纯 TypeScript，可配任何上层（Svelte/React/Node 都能用）。🧠⚡

- 🔁 **去重并发**：同一 key 并发只打一次网
- 🔄 **SWR**：先回旧数据，再后台新鲜化
- ⏱️ **TTL/GC**：可配置过期与垃圾回收
- 🧯 **重试退避**：指数退避 + 抖动
- 🛑 **取消**：AbortSignal & 精准匹配取消
- 🚀 **预取/失效**：主动 warming 与刷新
- 🔒 **hydrate/dehydrate**：SSR/持久化快照

> 只是“核心”，不绑定 UI、不绑定框架。你可以把它包成 Svelte/React hooks，或直接在 Node 里用。

---

## 安装

```bash
pnpm add @sv-kit/query-kit
# 或 npm / yarn
```

---

## 快速上手

```ts
import { QueryClient, httpJSON } from "@sv-kit/query-kit";

const qc = new QueryClient({
  staleTime: 10_000,                 // 命中 10s 内不重新请求
  gcTime: 5 * 60_000,                // 5 分钟无人订阅则回收
  swr: true,
  retry: { attempts: 2, baseMs: 500 } // 失败重试 2 次，指数退避
});

// 定义 key（可嵌套对象，内部会稳定哈希）
const key = ["GET", "/api/user", { id: 42 }];

// 1) 拉取（自动去重 + SWR + 重试）
const user = await qc.fetchQuery(key, httpJSON(() => `/api/user?id=42`));

// 2) 订阅（配合 UI）
const off = qc.subscribe(key, (ev) => {
  if (ev.type === "update" || ev.type === "fetchSuccess") {
    console.log("user updated", ev);
  }
});

// 3) 失效/预取
qc.invalidate((hash) => hash.includes("/api/user"));
qc.prefetchQuery(key, httpJSON(`/api/user?id=42`));

// 4) 取消（页面切走、组件卸载等）
qc.cancel((hash) => hash.startsWith('q$["GET","/api/user"'));

// 5) SSR：dehydrate/hydrate
const snap = qc.dehydrate();
// --- 传给客户端后 ---
qc.hydrate(snap);
```

---

## 核心概念

### QueryKey
`string | unknown[]`，推荐数组（更稳且可读）。库内通过**稳定哈希**序列化，最终变成以 `q$` 开头的可前缀匹配字符串。

### SWR（stale-while-revalidate）
命中但已过期时：**立即返回旧数据**，同时后台刷新，刷新成功会派发事件（订阅方更新 UI）。

### TTL / GC
- `staleTime`：多久后判定为“过期但可用”
- `gcTime`：多久后“无人订阅 + 非进行中”可回收

---

## API 参考

```ts
import { QueryClient, httpJSON, stableHash } from "@sv-kit/query-kit";
import type {
  QueryKey, QueryOptions, Fetcher, RetryPolicy, Match,
  DehydratedState, QueryEvent
} from "@sv-kit/query-kit";
```

### `class QueryClient(defaults?)`
**defaults**（全部可选）：
```ts
{
  staleTime?: number;          // 默认 0（立即过期 → SWR 背景刷新）
  gcTime?: number;             // 默认 300_000（5 分钟）
  swr?: boolean;               // 默认 true
  retry?: RetryPolicy;         // 默认 { attempts:3, baseMs:600, jitter:true }
}
```

#### `fetchQuery<T>(key, fetcher, options?): Promise<T>`
- 命中未过期 → 直接返回缓存
- 命中过期 + `swr:true` → 返回旧值，同时后台刷新
- 其余 → 等待请求完成后返回
**options：**
```ts
type QueryOptions<T = unknown> = {
  staleTime?: number; gcTime?: number;
  retry?: RetryPolicy; swr?: boolean;
  signal?: AbortSignal;       // 外部取消
  select?: (data: any) => T;  // 投影/挑选子集
  meta?: Record<string, unknown>;
};
```

#### `prefetchQuery<T>(key, fetcher, options?)`
后台预拉取，失败忽略。

#### `getQueryData<T>(key): T | undefined`
读当前缓存（不触发网络）。

#### `setQueryData<T>(key, updater: T | (prev?: T) => T)`
直接写缓存（乐观更新、表单草稿等）。

#### `subscribe<T>(key, (ev: QueryEvent<T>) => void): () => void`
订阅事件：`fetchStart | fetchSuccess | fetchError | update | invalidate | remove`。

#### `invalidate(match?: Match)`
标记匹配项“已过期”，订阅者会收到 `invalidate`，下次 `fetchQuery` 会刷新。
`Match` 可以是**前缀字符串**、`RegExp` 或 `(hash)=>boolean`。

#### `cancel(match?: Match)`
对匹配项调用 `AbortController.abort()`，会导致 in-flight 请求以 `AbortError` 失败。

#### `dehydrate(): DehydratedState` / `hydrate(state, {gcTime?})`
把缓存序列化（仅包含 `data/updatedAt/staleAt`），便于 SSR/持久化。`hydrate` 时可覆盖 `gcTime`。

---

## Fetcher & 工具

### `Fetcher<T>`
```ts
type Fetcher<T> = (ctx: {
  key: QueryKey;
  hash: string;
  signal: AbortSignal;     // 用于取消
  meta?: Record<string, unknown>;
}) => Promise<T>;
```

### `httpJSON(input, init?)`
便捷 JSON fetcher：
```ts
const getUser = httpJSON(() => `/api/user?id=42`);
const data = await qc.fetchQuery(["GET","/api/user",{id:42}], getUser);
```
- `input` 可是字符串/URL，或函数（拿到 key 动态构造）
- 按响应头 `content-type` 解析 JSON，否则返回文本

### `stableHash(value)`
把任意对象稳定序列化成哈希字符串（键排序、跳过 `undefined/function/symbol`，处理循环引用），所有缓存与匹配都基于它。

---

## 常见模式

### 乐观更新 + 回滚
```ts
const key = ["todo", { id }];
const prev = qc.getQueryData<any>(key);
qc.setQueryData(key, (p) => ({ ...p, title: newTitle }));
try {
  await fetch("/api/todo/"+id, { method:"PUT", body: JSON.stringify({ title:newTitle }) });
  qc.invalidate(stableHash(key)); // 或直接 setQueryData 为服务端返回值
} catch (e) {
  qc.setQueryData(key, prev!); // 回滚
}
```

### 组合取消（外部 + 内部）
```ts
const ctrl = new AbortController();
setTimeout(() => ctrl.abort(), 2000); // 2s 超时

await qc.fetchQuery(key, fetcher, { signal: ctrl.signal });
```

### 批量失效 / 预取
```ts
// 失效一类接口
qc.invalidate((h) => h.startsWith('q$["GET","/api/list"'));
// 预热热门数据
qc.prefetchQuery(["GET","/api/hot"], httpJSON("/api/hot"));
```

---

## 与框架集成（示例：把订阅包成 Svelte/React Store）

**Svelte 派生 store**
```ts
import { readable } from "svelte/store";
export function queryStore<T>(qc: QueryClient, key: QueryKey, fetcher: Fetcher<T>) {
  return readable<{data?:T; error?:any; loading:boolean}>({ loading: true }, (set) => {
    let mounted = true;
    const unsub = qc.subscribe<T>(key, (ev) => {
      if (!mounted) return;
      if (ev.type === "fetchStart") set((s) => ({ ...s, loading: true }));
      if (ev.type === "fetchSuccess" || ev.type === "update") set({ data: qc.getQueryData<T>(key), loading: false, error: undefined });
      if (ev.type === "fetchError") set({ data: qc.getQueryData<T>(key), loading: false, error: ev.error });
    });
    qc.fetchQuery(key, fetcher).catch(()=>{});
    return () => { mounted = false; unsub(); };
  });
}
```

**React Hook（简化版思路）**：用 `useSyncExternalStore` 订阅 `qc.subscribe`，在 `useEffect` 中 `fetchQuery`。

---

## FAQ

**Q：和 React Query/SWR 的关系？**
A：同类能力的“最小实现”，无框架耦合、无依赖，适合你在多端/多框架统一封装。

**Q：为什么 key 用数组更好？**
A：对象会被稳定序列化，避免顺序抖动；数组语义清晰（`[method, url, params]`）。

**Q：SWR 会不会导致旧数据覆盖新数据？**
A：不会。SWR 的刷新完成后会以“更新”事件覆盖旧值；你也可关闭 `swr:false` 改为“强一致等待”。

**Q：如何只按 pathname 而忽略查询做失效？**
A：用前缀或正则匹配 `hash`：`qc.invalidate(h => h.startsWith('q$["GET","/api/list"'))`。

---

## 许可

MIT

---

## 路线图

- 并发限速（per-domain concurrency）
- 依赖联动（A 成功后失效/刷新 B）
- 细粒度监听（只监听某个 `select` 结果）
- 更丰富的 http 工具（重定向/分页游标助手）
