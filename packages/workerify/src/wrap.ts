// packages/workerify/src/wrap.ts
import { collectTransferables } from "./transfer";
import type {
  CallMessage, InvokeOptions, SerializedError, WrapOptions, Wrapped
} from "./types";

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

type AnyFn = (...a: any[]) => any;

/** 把 Worker 脚本 URL 包成“同名方法的代理” */
export function wrap<T extends Record<string, AnyFn>>(
  url: string | URL,
  opts?: WrapOptions
): Wrapped<{ [K in keyof T]: (...a: Parameters<T[K]>) => Promise<Awaited<ReturnType<T[K]>>> }> {
  if (typeof window === "undefined") {
    throw new Error("@svelte-kits/workerify: wrap() must run in browser/worker thread");
  }
  const worker = new Worker(url, { type: opts?.type ?? "module", name: opts?.name });

  // 懒路由：任何方法名都可调用，由 Worker expose 决定是否存在
  const invoke = <R>(method: string, args: any[], iopts?: InvokeOptions): Promise<R> =>
    new Promise<R>((resolve, reject) => {
      const id = uid();
      const onMsg = (ev: MessageEvent) => {
        const m = ev.data as any;
        if (!m || m.id !== id || m.type !== "result") return;
        worker.removeEventListener("message", onMsg);
        if (m.ok) {
          resolve(m.value as R);
        } else {
          const e = m.error as SerializedError;
          const err = new Error(e?.message || "Worker error");
          err.name = e?.name || "Error";
          (err as any).stack = e?.stack;
          reject(err);
        }
      };
      worker.addEventListener("message", onMsg);

      // 取消
      const abort = iopts?.signal?.addEventListener("abort", () => {
        worker.postMessage({ type: "abort", id });
      }, { once: true });

      const msg: CallMessage = { type: "call", id, method, args };
      const transfer = collectTransferables(args, opts?.transferDepth ?? 3);
      worker.postMessage(msg, transfer);

      // 清理监听
      const cleanup = () => {
        worker.removeEventListener("message", onMsg);
        iopts?.signal?.removeEventListener("abort", abort as any);
      };
      // 无论成功失败都会移除，在上面两个分支各自执行
      (resolve as any).__cleanup = cleanup;
      (reject as any).__cleanup = cleanup;
    });

  // 生成“任意方法名”的代理对象
  const proxy = new Proxy(
    {},
    {
      get(_t, prop: string | symbol) {
        if (prop === "terminate") return () => worker.terminate();
        if (typeof prop !== "string") throw new Error("symbol keys not supported");
        return (...a: any[]) => invoke(prop, a);
      }
    }
  ) as any;

  return proxy;
}
