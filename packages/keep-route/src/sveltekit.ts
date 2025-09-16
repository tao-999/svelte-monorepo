// packages/keep-route/src/sveltekit.ts
import type { Readable } from "svelte/store";
import type { KeepInstance, RouteKey } from "./types";

/** 兼容 SvelteKit v2：事件对象可能是 { url: URL } 或直接 URL，且可能为 null */
type URLLike = URL | { url: URL } | null | undefined;
function toURL(x: URLLike): URL | null {
  if (!x) return null;
  if (x instanceof URL) return x;
  const u = (x as any).url;
  return u instanceof URL ? u : null;
}

/**
 * 接线 SvelteKit：放宽事件类型为 unknown，内部自行提取 URL
 */
export function wireSvelteKit(
  keep: KeepInstance,
  wiring: {
    page: Readable<{ url: URL }>;
    beforeNavigate: (cb: (e: unknown) => void) => void;
    afterNavigate: (cb: (e: unknown) => void) => void;
    key?: (url: URL) => RouteKey; // 默认 pathname+search
  }
) {
  const key = wiring.key ?? ((u) => u.pathname + u.search);

  // 初次挂载做一次 restore
  let initialized = false;
  const stop = wiring.page.subscribe(($p) => {
    if (!initialized && $p?.url) {
      initialized = true;
      keep.onAfterNavigate(key($p.url));
    }
  });

  wiring.beforeNavigate((e: any) => {
    const from = toURL(e?.from);
    if (from) keep.onBeforeNavigate(key(from));
  });

  wiring.afterNavigate((e: any) => {
    const to = toURL(e?.to);
    if (to) keep.onAfterNavigate(key(to));
  });

  return () => stop();
}
