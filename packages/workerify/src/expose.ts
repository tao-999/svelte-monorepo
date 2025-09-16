// packages/workerify/src/expose.ts
/// <reference lib="webworker" />
import { collectTransferables, toPlainError } from "./transfer";
import type { AbortMessage, CallMessage, ExposedAPI, ResultMessage } from "./types";

/** 在 Worker 内调用：暴露一组方法给主线程调用 */
export function expose(api: ExposedAPI) {
  const controllers = new Map<string, AbortController>();

  self.onmessage = async (ev: MessageEvent) => {
    const data = ev.data as CallMessage | AbortMessage;
    if (!data || typeof data !== "object") return;

    if (data.type === "abort") {
      const c = controllers.get(data.id);
      if (c) c.abort(new DOMException("aborted", "AbortError"));
      return;
    }

    if (data.type !== "call") return;
    const { id, method, args } = data;

    const fn = (api as any)[method];
    const controller = new AbortController();
    controllers.set(id, controller);

    const reply = (msg: ResultMessage, transfer?: Transferable[]) =>
      (self as any).postMessage(msg, { transfer });

    try {
      if (typeof fn !== "function") {
        throw new Error(`No such method: ${method}`);
      }
      const res = await fn(...args, { signal: controller.signal });
      // 自动挑选可转移
      const transfer = collectTransferables(res, 2);
      reply({ type: "result", id, ok: true, value: res }, transfer);
    } catch (err) {
      reply({ type: "result", id, ok: false, error: toPlainError(err) });
    } finally {
      controllers.delete(id);
    }
  };
}
