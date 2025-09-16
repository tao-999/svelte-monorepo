import { writable, type Readable } from "svelte/store";
import type {
  KeepInstance, KeepRouteOptions, Keeper, RouteKey, SnapshotMap
} from "./types";
import { LRU } from "./lru";
import { matchAny } from "./glob";

type RouteCache = {
  state: SnapshotMap;         // id -> snapshot
  scroll?: { x: number; y: number };
};

function keyFromUrl(url: URL): RouteKey {
  return url.pathname + url.search;
}

export function createKeepRoute(opts?: KeepRouteOptions): KeepInstance {
  const o: Required<KeepRouteOptions> = {
    include: opts?.include ?? ["/**"],
    exclude: opts?.exclude ?? [],
    max: opts?.max ?? 10,
    scroll: opts?.scroll ?? true,
    persistKey: opts?.persistKey ?? ""
  };

  const current = writable<RouteKey | null>(null);
  const keepers = new Map<string, Keeper>();           // 当前路由里注册的组件
  const lru = new LRU<RouteKey, RouteCache>(o.max);

  function allowed(routeKey: RouteKey) {
    if (o.exclude.length && matchAny(o.exclude, routeKey)) return false;
    return matchAny(o.include, routeKey) || o.include.length === 0;
  }

  function save(routeKey: RouteKey) {
    if (!allowed(routeKey)) return;
    const state: SnapshotMap = {};
    for (const [id, k] of keepers.entries()) {
      try { state[id] = k.get(); } catch {}
    }
    const cache: RouteCache = {
      state,
      scroll: o.scroll ? { x: window.scrollX, y: window.scrollY } : undefined
    };
    lru.set(routeKey, cache);
    if (o.persistKey) {
      try {
        localStorage.setItem(`${o.persistKey}:${routeKey}`, JSON.stringify(cache));
      } catch {}
    }
  }

  function restore(routeKey: RouteKey) {
    if (!allowed(routeKey)) return;
    let cache = lru.get(routeKey);
    if (!cache && o.persistKey) {
      try {
        const s = localStorage.getItem(`${o.persistKey}:${routeKey}`);
        if (s) cache = JSON.parse(s) as RouteCache;
      } catch {}
    }
    if (cache) {
      const { state, scroll } = cache;
      for (const [id, k] of keepers.entries()) {
        try { k.set(state[id]); } catch {}
      }
      if (o.scroll && scroll) {
        // 等待下一帧，避免和 SvelteKit 默认滚动冲突
        requestAnimationFrame(() => window.scrollTo(scroll.x, scroll.y));
      }
    }
  }

  function register(k: Keeper) {
    keepers.set(k.id, k);
    return () => { keepers.delete(k.id); };
  }

  function onBeforeNavigate(routeKey: RouteKey) { save(routeKey); }
  function onAfterNavigate(routeKey: RouteKey)  { current.set(routeKey); restore(routeKey); }

  return {
    register,
    onBeforeNavigate,
    onAfterNavigate,
    save,
    restore,
    current: { subscribe: current.subscribe } as Readable<RouteKey | null>
  };
}
