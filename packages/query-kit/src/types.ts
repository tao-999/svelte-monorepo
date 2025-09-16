// packages/query-kit/src/types.ts
export type QueryKey = unknown[] | string;

export type RetryPolicy = {
  attempts?: number;     // default 3
  baseMs?: number;       // default 600
  maxMs?: number;        // optional cap
  jitter?: boolean;      // default true
};

export type QueryOptions<T = unknown> = {
  staleTime?: number;    // ms, default 0 (immediately stale)
  gcTime?: number;       // ms, default 5 * 60_000
  retry?: RetryPolicy;
  swr?: boolean;         // default true: return stale data and revalidate in bg
  signal?: AbortSignal;  // external cancel
  select?: (data: any) => T; // optional projector
  meta?: Record<string, unknown>;
};

export type Fetcher<T> = (ctx: {
  key: QueryKey;
  hash: string;
  signal: AbortSignal;
  meta?: Record<string, unknown>;
}) => Promise<T>;

export type CacheEntry<T = any> = {
  hash: string;
  data?: T;
  error?: any;
  updatedAt?: number;
  staleAt?: number;
  gcAt?: number;
  inflight?: Promise<T>;
  controller?: AbortController;
  listeners: Set<(e: QueryEvent<T>) => void>;
};

export type QueryEvent<T = any> =
  | { type: "fetchStart" }
  | { type: "fetchSuccess"; data: T }
  | { type: "fetchError"; error: any }
  | { type: "update"; data: T }
  | { type: "invalidate" }
  | { type: "remove" };

export type DehydratedState = Record<string, { data: any; updatedAt: number; staleAt: number }>;

export type Match =
  | string                 // 前缀或完整 hash
  | RegExp
  | ((hash: string) => boolean);
