import type { Readable } from "svelte/store";
import type { KeepInstance, RouteKey } from "./types";

/**
 * 让 KeepRoute 接上 SvelteKit 的 $page / 导航事件（v2 兼容）
 * - SvelteKit v2 的 before/afterNavigate 事件对象 e.from/e.to 是 NavigationTarget | null，
 *   需要从 e.?.url 里取出 URL；这里做了向后兼容（也兼容直接传 URL 的旧写法）。
 */
type BNLike = { from: { url: URL } | URL | null; to?: { url: URL } | URL | null; cancel: () => void };
type ANLike = { from: { url: URL } | URL | null; to: { url: URL } | URL };

export function wireSvelteKit(
  keep: KeepInstance,
  wiring: {
    page: Readable<{ url: URL }>;
    beforeNavigate: (cb: (e: BNLike) => void) => void;
    afterNavigate: (cb: (e: ANLike) => void) => void;
    key?: (url: URL) => RouteKey; // 自定义 key，默认 pathname+search
  }
) {
  const key = wiring.key ?? ((u: URL) => u.pathname + u.search);

  // 初始 restore：首次订阅 page 时把当前 url 作为命中
  let initialized = false;
  const unsub = wiring.page.subscribe(($p) => {
    if (!initialized && $p?.url) {
      initialized = true;
      keep.onAfterNavigate(key($p.url));
    }
  });

  wiring.beforeNavigate((e) => {
    const fromUrl: URL | null =
      (e?.from && (e.from as any).url ? (e.from as any).url : (e?.from ?? null)) || null;
    if (fromUrl) keep.onBeforeNavigate(key(fromUrl));
  });

  wiring.afterNavigate((e) => {
    const toUrl: URL | null =
      (e?.to && (e.to as any).url ? (e.to as any).url : (e?.to ?? null)) || null;
    if (toUrl) keep.onAfterNavigate(key(toUrl));
  });

  return () => unsub();
}
