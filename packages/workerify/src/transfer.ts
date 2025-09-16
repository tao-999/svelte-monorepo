// packages/workerify/src/transfer.ts
const TRANSFERABLE_TAG = new Set([
  "ArrayBuffer",
  "MessagePort",
  "ImageBitmap",
  "OffscreenCanvas",
  "RTCDataChannel",
  "AudioData",           // 浏览器支持时
  "VideoFrame"          // 浏览器支持时
]);

export function isTransferable(x: any): boolean {
  if (!x) return false;
  if (typeof ArrayBuffer !== "undefined" && x instanceof ArrayBuffer) return true;
  if (typeof MessagePort !== "undefined" && x instanceof MessagePort) return true;
  if (typeof ImageBitmap !== "undefined" && x instanceof ImageBitmap) return true;
  if (typeof OffscreenCanvas !== "undefined" && x instanceof OffscreenCanvas) return true;
  const tag = Object.prototype.toString.call(x).slice(8, -1);
  return TRANSFERABLE_TAG.has(tag);
}

/** 递归收集 Transferable（数组/对象深度遍历，避免循环） */
export function collectTransferables(x: any, maxDepth = 3): Transferable[] {
  const out: Transferable[] = [];
  const seen = new WeakSet();
  function walk(v: any, d: number) {
    if (!v || d > maxDepth) return;
    if (isTransferable(v)) {
      out.push(v as Transferable);
      return;
    }
    if (typeof v !== "object") return;
    if (seen.has(v)) return;
    seen.add(v);
    if (Array.isArray(v)) {
      for (const it of v) walk(it, d + 1);
    } else {
      for (const k of Object.keys(v)) walk((v as any)[k], d + 1);
    }
  }
  walk(x, 0);
  return out;
}

export function toPlainError(err: any) {
  try {
    const e: any = err ?? {};
    return {
      name: String(e.name ?? "Error"),
      message: String(e.message ?? ""),
      stack: typeof e.stack === "string" ? e.stack : undefined,
      cause: e.cause
    };
  } catch {
    return { name: "Error", message: String(err) };
  }
}
