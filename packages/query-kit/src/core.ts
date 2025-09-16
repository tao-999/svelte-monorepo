// packages/query-kit/src/core.ts
import { stableHash } from "./hash";
import { backoff, mergeAbort, now } from "./utils";
import type {
  CacheEntry, DehydratedState, Fetcher, Match, QueryEvent, QueryKey, QueryOptions
} from "./types";

export class QueryClient {
  private cache = new Map<string, CacheEntry>();
  private gcTimer: any = null;

  constructor(private defaults: Required<Pick<QueryOptions, "staleTime" | "gcTime" | "swr" | "retry">> = {
    staleTime: 0,              // 立即过期 → SWR 背景刷新
    gcTime: 5 * 60_000,        // 5 分钟回收
    swr: true,
    retry: { attempts: 3, baseMs: 600, jitter: true }
  }) {
    this.startGC();
  }

  // ————— 公共 API —————

  getQueryData<T = unknown>(key: QueryKey): T | undefined {
    const e = this.cache.get(stableHash(key));
    return e?.data as T | undefined;
  }

  setQueryData<T>(key: QueryKey, updater: T | ((prev: T | undefined) => T)) {
    const hash = stableHash(key);
    const e = this.ensure(hash);
    const prev = e.data as T | undefined;
    e.data = typeof updater === "function" ? (updater as any)(prev) : updater;
    e.updatedAt = now();
    e.staleAt = e.updatedAt + this.defaults.staleTime;
    e.gcAt = e.updatedAt + this.defaults.gcTime;
    this.emit(e, { type: "update", data: e.data });
  }

  async fetchQuery<T>(
    key: QueryKey,
    fetcher: Fetcher<T>,
    opts?: QueryOptions<T>
  ): Promise<T> {
    const hash = stableHash(key);
    const e = this.ensure<T>(hash);
    const staleTime = opts?.staleTime ?? this.defaults.staleTime;
    const gcTime    = opts?.gcTime ?? this.defaults.gcTime;
    const swr       = opts?.swr ?? this.defaults.swr;
    const retry     = opts?.retry ?? this.defaults.retry;

    // 命中且未过期 → 直接返回
    if (e.data !== undefined && (e.staleAt ?? 0) > now()) {
      return (opts?.select ? opts.select(e.data) : e.data) as T;
    }

    // 命中但已过期 + SWR → 背景刷新，先返回旧值
    if (e.data !== undefined && swr) {
      if (!e.inflight) this.#startFetch(e, key, fetcher, retry, opts?.signal, opts?.meta, staleTime, gcTime);
      return (opts?.select ? opts.select(e.data) : e.data) as T;
    }

    // 无数据或需要等待新鲜数据 → join inflight
    if (!e.inflight) this.#startFetch(e, key, fetcher, retry, opts?.signal, opts?.meta, staleTime, gcTime);
    const data = await e.inflight!;
    return (opts?.select ? opts.select(data) : data) as T;
  }

  async prefetchQuery<T>(key: QueryKey, fetcher: Fetcher<T>, opts?: QueryOptions<T>) {
    const hash = stableHash(key);
    const e = this.ensure<T>(hash);
    const staleTime = opts?.staleTime ?? this.defaults.staleTime;
    const gcTime    = opts?.gcTime ?? this.defaults.gcTime;
    const retry     = opts?.retry ?? this.defaults.retry;
    if (!e.inflight) this.#startFetch(e, key, fetcher, retry, opts?.signal, opts?.meta, staleTime, gcTime);
    try { await e.inflight; } catch { /* 预取失败忽略 */ }
  }

  invalidate(match?: Match) {
    for (const [hash, e] of this.cache) {
      if (match && !this.matches(match, hash)) continue;
      e.staleAt = 0;
      this.emit(e, { type: "invalidate" });
    }
  }

  cancel(match?: Match) {
    for (const [hash, e] of this.cache) {
      if (match && !this.matches(match, hash)) continue;
      e.controller?.abort(new DOMException("canceled", "AbortError"));
    }
  }

  subscribe<T = unknown>(key: QueryKey, fn: (e: QueryEvent<T>) => void) {
    const e = this.ensure<T>(stableHash(key));
    e.listeners.add(fn as any);
    return () => e.listeners.delete(fn as any);
  }

  dehydrate(): DehydratedState {
    const out: DehydratedState = {};
    for (const [hash, e] of this.cache) {
      if (e.data !== undefined) {
        out[hash] = { data: e.data, updatedAt: e.updatedAt ?? now(), staleAt: e.staleAt ?? 0 };
      }
    }
    return out;
  }

  hydrate(state: DehydratedState, { gcTime }: { gcTime?: number } = {}) {
    const gc = gcTime ?? this.defaults.gcTime;
    const t = now();
    for (const [hash, s] of Object.entries(state)) {
      const e = this.ensure(hash);
      e.data = s.data;
      e.updatedAt = s.updatedAt;
      e.staleAt = s.staleAt;
      e.gcAt = t + gc;
      this.emit(e, { type: "update", data: e.data });
    }
  }

  // ————— 内部 —————

  private ensure<T = any>(hash: string): CacheEntry<T> {
    let e = this.cache.get(hash) as CacheEntry<T> | undefined;
    if (!e) {
      e = { hash, listeners: new Set() };
      this.cache.set(hash, e);
    }
    return e;
  }

  private matches(m: Match, hash: string) {
    if (typeof m === "string") return hash === m || hash.startsWith(m);
    if (m instanceof RegExp) return m.test(hash);
    if (typeof m === "function") return m(hash);
    return false;
  }

  private emit<T>(e: CacheEntry<T>, ev: QueryEvent<T>) {
    for (const fn of e.listeners) {
      try { (fn as any)(ev); } catch {}
    }
  }

  #startFetch<T>(
    e: CacheEntry<T>,
    key: QueryKey,
    fetcher: Fetcher<T>,
    retry: NonNullable<QueryOptions["retry"]>,
    externalSignal: AbortSignal | undefined,
    meta: Record<string, unknown> | undefined,
    staleTime: number,
    gcTime: number
  ) {
    // 若已有 inflight，直接复用
    if (e.inflight) return;
    // 合并取消
    e.controller = new AbortController();
    const signal = mergeAbort(e.controller.signal, externalSignal);

    let attempt = 0;
    this.emit(e, { type: "fetchStart" });

    e.inflight = (async () => {
      for (;;) {
        try {
          const data = await fetcher({ key, hash: e.hash, signal: signal!, meta });
          // 写入缓存
          e.data = data as any;
          e.error = undefined;
          e.updatedAt = now();
          e.staleAt = e.updatedAt + staleTime;
          e.gcAt = e.updatedAt + gcTime;
          this.emit(e, { type: "fetchSuccess", data });
          return data;
        } catch (err) {
          // Abort 直接抛
          if ((signal as AbortSignal)?.aborted) {
            e.error = err;
            this.emit(e, { type: "fetchError", error: err });
            throw err;
          }
          if (attempt >= (retry.attempts ?? 0)) {
            e.error = err;
            this.emit(e, { type: "fetchError", error: err });
            throw err;
          }
          const delay = backoff(attempt++, retry);
          await new Promise(r => setTimeout(r, delay));
        }
      }
    })();

    // 清理 inflight
    e.inflight.finally(() => {
      e.inflight = undefined;
      e.controller = undefined;
    });
  }

  private startGC() {
    if (this.gcTimer) clearInterval(this.gcTimer);
    this.gcTimer = setInterval(() => {
      const t = now();
      for (const [hash, e] of this.cache) {
        if ((e.gcAt ?? Infinity) < t && e.listeners.size === 0 && !e.inflight) {
          this.emit(e, { type: "remove" });
          this.cache.delete(hash);
        }
      }
    }, 30_000);
  }
}
