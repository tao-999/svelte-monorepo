// packages/query-kit/src/utils.ts
import type { RetryPolicy } from "./types";

export function now() { return Date.now(); }

export function backoff(attempt: number, p?: RetryPolicy) {
  const base = p?.baseMs ?? 600;
  const max  = p?.maxMs ?? Infinity;
  let ms = Math.min(max, base * Math.pow(2, attempt));
  if (p?.jitter ?? true) {
    const j = Math.random() * 0.4 + 0.8; // 0.8x~1.2x
    ms = Math.floor(ms * j);
  }
  return ms;
}

export function mergeAbort(a?: AbortSignal, b?: AbortSignal) {
  if (!a) return b;
  if (!b) return a;
  const c = new AbortController();
  const onA = () => c.abort(a.reason);
  const onB = () => c.abort(b.reason);
  if (a.aborted) c.abort(a.reason);
  if (b.aborted) c.abort(b.reason);
  a.addEventListener("abort", onA, { once: true });
  b.addEventListener("abort", onB, { once: true });
  return c.signal;
}
