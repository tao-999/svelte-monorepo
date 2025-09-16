export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export function backoffDelay(attempt: number, base: number, max?: number, jitter = true) {
  const expo = base * Math.pow(2, attempt);
  const d = jitter ? expo * (0.5 + Math.random()) : expo;
  return Math.min(max ?? Number.MAX_SAFE_INTEGER, d);
}

export function toHex(buf: ArrayBuffer) {
  const v = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < v.length; i++) s += v[i].toString(16).padStart(2, "0");
  return s;
}

export async function sha256(ab: ArrayBuffer): Promise<ArrayBuffer> {
  return await crypto.subtle.digest("SHA-256", ab);
}

export function sliceFile(file: File, start: number, end: number) {
  return file.slice(start, end);
}

export function range(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}

export function difference(all: number[], done: Set<number>) {
  return all.filter(i => !done.has(i));
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
