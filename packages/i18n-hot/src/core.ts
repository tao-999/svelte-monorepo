import { writable, derived, get, type Readable } from "svelte/store";
import { format, placeholders } from "./utils";
import type {
  Dict, I18nAdapter, I18nHotOptions, Snapshot, I18nPublicAPI, Manifest
} from "./types";

type CacheShape = {
  version: string | null;
  etag: string | null;
  dicts: Record<string, Dict>;
  localeEtags: Record<string, string | null>;
};

const defaultCache = (): CacheShape => ({
  version: null,
  etag: null,
  dicts: {},
  localeEtags: {}
});

export function createI18nHot(opts: I18nHotOptions): I18nPublicAPI {
  const persistKey = opts.persistKey ?? "i18n:hot";
  const warnPH = opts.warnPlaceholders ?? true;

  // state
  const $locale = writable(opts.initialLocale);
  const $dicts = writable<Record<string, Dict>>({});
  const $version = writable<string | null>(null);
  let manifestETag: string | null = null;
  let manifest: Manifest | null = null;
  let timer: any = null;

  // hydrate from localStorage
  const cached = loadCache(persistKey);
  if (cached) {
    $version.set(cached.version);
    manifestETag = cached.etag;
    $dicts.set(cached.dicts);
  }
  // 恢复上次选择的语言（若有）
  const savedLocale = readSavedLocale(persistKey);
  if (savedLocale) $locale.set(savedLocale);

  const dict: Readable<Dict> = derived([$locale, $dicts], ([$l, $d]) => $d[$l] ?? {});
  const fallback = opts.fallbackLocale ?? null;

  function t(key: string, params?: Record<string, unknown>) {
    const d = get(dict);
    if (key in d) return format(d[key], params);
    if (fallback) {
      const d2 = get($dicts)[fallback];
      if (d2 && key in d2) return format(d2[key], params);
    }
    return key; // key-as-fallback
  }

  function hasKey(key: string) {
    const d = get(dict);
    if (key in d) return true;
    if (fallback) {
      const d2 = get($dicts)[fallback];
      if (d2 && key in d2) return true;
    }
    return false;
  }

  async function ensureManifest() {
    const res = await opts.adapter.getManifest(manifestETag);
    if (!res.changed) return false;
    manifest = res.manifest!;
    manifestETag = res.etag ?? null;
    $version.set(manifest.version ?? null);
    saveCache(persistKey, {
      version: manifest.version ?? null,
      etag: manifestETag,
      dicts: get($dicts),
      localeEtags: readCache(persistKey)?.localeEtags ?? {}
    });
    return true;
  }

  async function loadLocale(locale: string) {
    if (!manifest) {
      await ensureManifest();
      if (!manifest) throw new Error("manifest unavailable");
    }
    const info = manifest.locales[locale];
    if (!info) throw new Error(`locale not in manifest: ${locale}`);

    const cache = readCache(persistKey);
    const currentEtags = cache?.localeEtags ?? {};
    const prevEtag = currentEtags[locale] ?? null;

    const res = await opts.adapter.getLocale(locale, info.url, prevEtag);
    // 304: dict={}，直接跳过覆盖
    if (Object.keys(res.dict).length > 0) {
      // optional placeholder check
      if (warnPH) warnMismatchedPlaceholders(get($dicts)[locale], res.dict, locale);
      const merged = { ...(get($dicts)[locale] ?? {}), ...res.dict };
      const nextAll = { ...get($dicts), [locale]: merged };
      $dicts.set(nextAll);
      // persist
      saveCache(persistKey, {
        version: get($version),
        etag: manifestETag,
        dicts: nextAll,
        localeEtags: { ...(cache?.localeEtags ?? {}), [locale]: res.etag ?? null }
      });
    }
  }

  function warnMismatchedPlaceholders(oldD: Dict | undefined, newD: Dict, locale: string) {
    if (!oldD) return;
    for (const k of Object.keys(newD)) {
      if (!(k in oldD)) continue;
      const a = placeholders(oldD[k]);
      const b = placeholders(newD[k]);
      const A = a.sort().join(",");
      const B = b.sort().join(",");
      if (A !== B) {
        console.warn(`[i18n-hot] placeholder mismatch @ ${locale}.${k}: ${A} -> ${B}`);
      }
    }
  }

  async function setLocale(locale: string) {
    $locale.set(locale);
    saveSavedLocale(persistKey, locale); // ★ 持久化当前语言

    // 保证 manifest
    await ensureManifest();
    // 先加载 fallback（减少闪烁）
    if (fallback && !get($dicts)[fallback] && manifest?.locales[fallback]) {
      try { await loadLocale(fallback); } catch {}
    }
    // 再加载当前
    if (!get($dicts)[locale]) {
      await loadLocale(locale);
    }
    // 预加载
    if (opts.preload?.length) {
      for (const l of opts.preload) {
        if (l !== locale && l !== fallback && manifest?.locales[l] && !get($dicts)[l]) {
          loadLocale(l).catch(() => {});
        }
      }
    }
  }

  async function refresh() {
    const changed = await ensureManifest();
    if (!changed) return;
    // manifest 改了：优先刷新当前 + fallback
    const cur = get($locale);
    if (fallback) await loadLocale(fallback).catch(() => {});
    await loadLocale(cur).catch(() => {});
  }

  function startAutoRefresh(ms?: number) {
    const interval = ms ?? opts.autoRefreshMs ?? 60_000;
    stopAutoRefresh();
    timer = setInterval(() => {
      refresh().catch(() => {});
    }, interval);
  }

  function stopAutoRefresh() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function snapshot(): Snapshot {
    const cache = readCache(persistKey) ?? defaultCache();
    return {
      version: get($version),
      etag: manifestETag,
      current: get($locale),
      fallback,
      dicts: get($dicts),
      localeEtags: cache.localeEtags
    };
  }

  function hydrate(snap: Snapshot) {
    if (!snap) return;
    $version.set(snap.version);
    manifestETag = snap.etag;
    $locale.set(snap.current);
    saveSavedLocale(persistKey, snap.current); // ★ hydrate 也同步当前语言
    // 不直接覆写：合并以便后续加载覆盖
    $dicts.set({ ...(get($dicts) ?? {}), ...(snap.dicts ?? {}) });
    // 覆写缓存（让 etag 接上）
    saveCache(persistKey, {
      version: snap.version,
      etag: snap.etag,
      dicts: snap.dicts,
      localeEtags: snap.localeEtags
    });
  }

  // 初始化：保证当前语言可用（懒加载）
  queueMicrotask(() => {
    const cur = get($locale);
    if (!get($dicts)[cur]) {
      setLocale(cur).catch(err => console.error("[i18n-hot] init fail:", err));
    }
    if (opts.autoRefreshMs) startAutoRefresh(opts.autoRefreshMs);
  });

  return {
    // stores
    locale: { subscribe: $locale.subscribe },
    dict: { subscribe: dict.subscribe },
    version: { subscribe: $version.subscribe },

    // ops
    t, setLocale, hasKey,

    // lifecycle
    refresh, startAutoRefresh, stopAutoRefresh,

    // ssr/persist
    snapshot, hydrate
  };
}

/* --------------------------------------------------------- */
/* localStorage cache & helpers                              */
/* --------------------------------------------------------- */
function readCache(prefix: string): CacheShape | null {
  if (typeof window === "undefined") return null;
  try {
    const s = window.localStorage.getItem(`${prefix}:cache`);
    return s ? (JSON.parse(s) as CacheShape) : null;
  } catch { return null; }
}

function saveCache(prefix: string, c: CacheShape) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${prefix}:cache`, JSON.stringify(c));
  } catch {}
}

function loadCache(prefix: string): CacheShape | null {
  return readCache(prefix);
}

// ★ 单独保存/恢复“当前语言”
function readSavedLocale(prefix: string): string | null {
  if (typeof window === "undefined") return null;
  try { return window.localStorage.getItem(`${prefix}:current`); } catch { return null; }
}
function saveSavedLocale(prefix: string, locale: string) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(`${prefix}:current`, locale); } catch {}
}
