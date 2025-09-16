// packages/query-kit/src/http.ts
import type { Fetcher, QueryKey } from "./types";

/** 便捷：返回一个“固定 URL + 可选 init 生成器”的 JSON fetcher */
export function httpJSON<T = any>(
  input: string | URL | ((ctx: { key: QueryKey }) => string | URL),
  init?: RequestInit | ((ctx: { key: QueryKey }) => RequestInit)
): Fetcher<T> {
  return async ({ key, signal }) => {
    const url = typeof input === "function" ? input({ key }) : input;
    const req = typeof init === "function" ? init({ key }) : init;
    const res = await fetch(url, { ...(req ?? {}), signal });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} ${res.statusText} ${text ? "- " + text : ""}`);
    }
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) return (await res.json()) as T;
    return (await res.text()) as unknown as T;
  };
}
