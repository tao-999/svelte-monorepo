// packages/workerify/src/workerify.ts
import { expose } from "./expose";

/** 把单个函数转成 Worker，可直接调用。限制：fn 不得闭包外部变量。 */
export function workerify<T extends (...args: any[]) => any>(
  fn: T,
  { name = "workerify:fn" }: { name?: string } = {}
) {
  if (typeof window === "undefined") {
    throw new Error("@sv-kit/workerify: workerify(fn) must run in browser");
  }
  // 生成一段内联 Worker 代码（ESM）
  const src = `
    import { expose } from '${/* 同包内相对路径在打包后为同模块名 */ ""}@sv-kit/workerify';
    const __FN__ = (${fn.toString()});
    expose({ default: __FN__ });
  `.trim();

  const blob = new Blob([src], { type: "text/javascript" });
  const url = URL.createObjectURL(blob);
  const w = new Worker(url, { type: "module", name });

  // 单方法代理（方法名固定为 'default'）
  const call = (...args: any[]) =>
    new Promise<any>((resolve, reject) => {
      const id = Math.random().toString(36).slice(2);
      const onMsg = (ev: MessageEvent) => {
        const m = ev.data;
        if (!m || m.id !== id || m.type !== "result") return;
        w.removeEventListener("message", onMsg);
        if (m.ok) resolve(m.value);
        else reject(new Error(m.error?.message || "Worker error"));
      };
      w.addEventListener("message", onMsg);
      const msg = { type: "call", id, method: "default", args };
      w.postMessage(msg);
    });

  (call as any).terminate = () => {
    w.terminate();
    URL.revokeObjectURL(url);
  };

  return call as ((...a: Parameters<T>) => Promise<Awaited<ReturnType<T>>>) & { terminate(): void };
}
