export type Bytes = number;

export type RetryPolicy = {
  attempts: number;       // e.g. 3
  baseDelayMs: number;    // e.g. 600
  maxDelayMs?: number;
  jitter?: boolean;
};

export type UploaderOptions = {
  chunkSize: Bytes;       // default 5 * 1024 * 1024
  concurrency: number;    // default 4
  retry: RetryPolicy;     // default {attempts:3, baseDelayMs:600, jitter:true}
  persistKey?: string;    // localStorage key prefix (default 'up:pro')
  adapter: UploadAdapter; // backend adapter
};

export type FileHash = {
  fileIdHex: string;      // sha256(concat(sha256(chunk_i)))
  chunkHashesHex: string[];
};

export type PrepareContext = {
  file: File;
  fileHash: FileHash;
  chunkSize: Bytes;
  chunkCount: number;
  meta?: Record<string, unknown>;
};

export type PrepareResult = {
  sessionId: string;
  alreadyUploaded?: number[];
  uploadUrls?: Record<number, string>;
  extra?: Record<string, unknown>;
};

export type ChunkUploadContext = {
  sessionId: string;
  file: File;
  chunkIndex: number;
  chunkStart: number;
  chunkEnd: number;       // exclusive
  body: Blob;
  fileHash: FileHash;
  uploadUrl?: string;     // optional (S3 presigned)
  signal?: AbortSignal;   // ← NEW: allow hard-cancel
};

export type ChunkUploadedResult = {
  ok: boolean;
  etag?: string;          // S3 ETag or custom
};

export type FinalizeContext = {
  sessionId: string;
  file: File;
  fileHash: FileHash;
  chunkCount: number;
  parts?: { partNumber: number; etag: string }[];
};

export type FinalizeResult = {
  ok: boolean;
  url?: string;
  extra?: Record<string, unknown>;
};

export interface UploadAdapter {
  name: string;
  prepare(ctx: PrepareContext): Promise<PrepareResult>;
  uploadChunk(ctx: ChunkUploadContext): Promise<ChunkUploadedResult>;
  finalize(ctx: FinalizeContext): Promise<FinalizeResult>;
  abort?(sessionId: string): Promise<void>;
}
