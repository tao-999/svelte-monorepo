# @sv-kit/workerify

轻量 **Web Worker RPC 工具**（零依赖）：
- 在 **Worker** 里 `expose({ foo(){...} })` 暴露方法
- 在 **主线程**用 `wrap(url)` 生成同名代理，直接当异步函数调用
- 想偷懒？`workerify(fn)` 一行把单函数变 Worker（动态 Blob）
- 自带 **AbortSignal** 取消、**错误序列化**、自动收集 **Transferable**、默认 `type:"module"`、SSR 安全

## 安装
```bash
pnpm add @sv-kit/workerify
```

## 用法 1：多方法模块（推荐）
**worker.ts**
```ts
import { expose } from '@sv-kit/workerify';

function sha256(buf: ArrayBuffer, { signal }: { signal: AbortSignal }) {
  signal.throwIfAborted?.();
  return crypto.subtle.digest('SHA-256', buf);
}
async function heavySum(nums: Float64Array) {
  let s = 0;
  for (let i = 0; i < nums.length; i++) s += nums[i];
  return s;
}

expose({ sha256, heavySum });
```

**主线程**
```ts
import { wrap } from '@sv-kit/workerify';

const api = wrap<typeof import('./worker')>('/workers/worker.js', { name: 'calc' });

const ctrl = new AbortController();
setTimeout(() => ctrl.abort(), 1000); // 1s 取消

// 自动把 ArrayBuffer 作为 Transferable 传过去，不会拷贝
const buf = new Uint8Array([1,2,3]).buffer;
const digest = await api.sha256(buf, { signal: ctrl.signal }).catch(e => console.warn(e.name));

const sum = await api.heavySum(new Float64Array([1,2,3,4]));
api.terminate(); // 用完销毁
```

## 用法 2：单函数 worker（动态 Blob）
```ts
import { workerify } from '@sv-kit/workerify';

const fib = workerify((n: number) => {
  const f = (x: number): number => x <= 1 ? x : f(x-1) + f(x-2);
  return f(n);
}, { name: 'fib' });

console.log(await fib(35));
fib.terminate();
```
> 注意：`workerify(fn)` 会把 `fn.toString()` 注入 Worker，所以 **fn 不要闭包外部变量**。

## 取消 / 错误
- 主线程 `wrap(url)` 调用时传 `{ signal }`，Worker 内你的方法会收到 `{ signal }` 作为**最后一个参数**（可选）。
- Worker 里抛出的错误会被序列化回主线程（`name/message/stack`）。

## Transferable（零拷贝）
调用时会自动递归收集 `ArrayBuffer`、`MessagePort`、`ImageBitmap`、`OffscreenCanvas` 等 **Transferable** 对象并随 `postMessage` 传输，避免拷贝大数据。
自定义结构深度可在 `wrap(url,{transferDepth})` 调整（默认 3 层）。

## SSR 安全
`wrap/workerify` 仅在浏览器有效；服务端调用会抛错以避免踩坑。

## 与 Svelte/React 的关系
这是 **headless 工具**，不依赖任何框架；你可在 Svelte action/store 或 React hooks 里随意包一层胶水。

## 许可
MIT
