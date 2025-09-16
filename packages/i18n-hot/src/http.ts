import type { I18nAdapter, ManifestResult, LocaleFetchResult } from "./types";

export type HttpAdapterOptions = {
  manifestURL: string;                 // 如 /i18n/manifest.json
  headers?: Record<string, string>;    // 需要鉴权时
};

export class HttpJsonAdapter implements I18nAdapter {
  name = "http-json";
  constructor(private opts: HttpAdapterOptions) {}

  async getManifest(etag?: string | null): Promise<ManifestResult> {
    const res = await fetch(this.opts.manifestURL, {
      headers: { ...(this.opts.headers ?? {}), ...(etag ? { "If-None-Match": etag } : {}) }
    });
    if (res.status === 304) return { changed: false, etag: etag ?? null };
    if (!res.ok) throw new Error(`manifest ${res.status}`);
    const manifest = await res.json();
    return { changed: true, manifest, etag: res.headers.get("ETag") };
  }

  async getLocale(_locale: string, url: string, etag?: string | null): Promise<LocaleFetchResult> {
    const res = await fetch(url, {
      headers: { ...(this.opts.headers ?? {}), ...(etag ? { "If-None-Match": etag } : {}) }
    });
    if (res.status === 304) {
      // 调用方会跳过覆盖
      return { dict: {}, etag };
    }
    if (!res.ok) throw new Error(`locale ${_locale} ${res.status}`);
    const dict = await res.json();
    return { dict, etag: res.headers.get("ETag") };
  }
}
