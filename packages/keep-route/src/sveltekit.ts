import type { Readable } from "svelte/store";
import type { KeepInstance, RouteKey } from "./types";

/** 让 KeepRoute 接上 SvelteKit 的 $page / 导航事件 */
export function wireSvelteKit(
  keep: KeepInstance,
  wiring: {
    page: Readable<{ url: URL }>;
    beforeNavigate: (cb: (e: { from: URL; to: URL | null; cancel: () => void }) => void) => void;
    afterNavigate:  (cb: (e: { from: URL; to: URL }) => void) => void;
    key?: (url: URL) => RouteKey; // 自定义 key，默认 pathname+search
  }
) {
  const key = wiring.key ?? ((u: URL) => u.pathname + u.search);

  // 初始 current
  let initUrl: URL | null = null;
  const unsub = wiring.page.subscribe(($p) => {
    if (!initUrl) {
      initUrl = $p.url;
      keep.onAfterNavigate(key($p.url)); // 首次进入也当一次 restore
    }
  });

  wiring.beforeNavigate((e) => {
    if (e.from) keep.onBeforeNavigate(key(e.from));
  });

  wiring.afterNavigate((e) => {
    if (e.to) keep.onAfterNavigate(key(e.to));
  });

  return () => unsub();
}
