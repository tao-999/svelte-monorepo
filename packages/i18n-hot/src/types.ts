import type { Readable } from "svelte/store";

export type Dict = Record<string, string>;

export type ManifestLocale = {
  url: string;      // 该 locale 的词条文件 URL
  hash?: string;    // 可选 hash（内容指纹）
  etag?: string;    // 可选 ETag（由服务端返回）
};

export type Manifest = {
  version: string;  // 版本号（可用时间戳/semver）
  locales: Record<string, ManifestLocale>;
};

export type ManifestResult = {
  changed: boolean;         // 304 -> false；200 -> true
  manifest?: Manifest;      // 仅当 changed=true 有
  etag?: string | null;     // manifest 的 ETag
};

export type LocaleFetchResult = {
  dict: Dict;
  etag?: string | null;
};

export interface I18nAdapter {
  name: string;
  getManifest(etag?: string | null): Promise<ManifestResult>;
  getLocale(locale: string, url: string, etag?: string | null): Promise<LocaleFetchResult>;
}

export type I18nHotOptions = {
  adapter: I18nAdapter;
  initialLocale: string;
  fallbackLocale?: string;
  persistKey?: string;         // localStorage 键前缀（默认 "i18n:hot"）
  preload?: string[];          // 预加载这些语言（可选）
  autoRefreshMs?: number;      // 轮询热更间隔（ms，可选）
  warnPlaceholders?: boolean;  // 校验占位符不一致时 console.warn（默认 true）
};

export type Snapshot = {
  version: string | null;
  etag: string | null;
  current: string;
  fallback: string | null;
  dicts: Record<string, Dict>;
  localeEtags: Record<string, string | null>;
};

export type I18nPublicAPI = {
  // Svelte stores
  locale: Readable<string>;
  dict: Readable<Dict>;
  version: Readable<string | null>;

  // runtime ops
  t: (key: string, params?: Record<string, unknown>) => string;
  setLocale: (locale: string) => Promise<void>;
  hasKey: (key: string) => boolean;

  // lifecycle
  refresh: () => Promise<void>;           // 拉 manifest，如有更新则拉取当前语言
  startAutoRefresh: (ms?: number) => void;
  stopAutoRefresh: () => void;

  // persistence / SSR
  snapshot: () => Snapshot;
  hydrate: (snap: Snapshot) => void;
};
