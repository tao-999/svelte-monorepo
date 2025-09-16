import type {
  UploadAdapter, PrepareContext, PrepareResult,
  ChunkUploadContext, ChunkUploadedResult, FinalizeContext, FinalizeResult
} from "../types";

export type S3MultipartAdapterOptions = {
  baseURL: string;
  headers?: Record<string,string>;
  acl?: "private"|"public-read";
  contentType?: string;
};

export class S3MultipartAdapter implements UploadAdapter {
  name = "s3-multipart";
  constructor(private opts: S3MultipartAdapterOptions) {}

  async prepare(ctx: PrepareContext): Promise<PrepareResult> {
    const res = await fetch(`${this.opts.baseURL}/s3/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(this.opts.headers ?? {}) },
      body: JSON.stringify({
        fileId: ctx.fileHash.fileIdHex,
        name: ctx.file.name,
        size: ctx.file.size,
        chunkCount: ctx.chunkCount,
        contentType: this.opts.contentType ?? ctx.file.type ?? "application/octet-stream",
        acl: this.opts.acl ?? "private"
      })
    });
    if (!res.ok) throw new Error(`s3 create failed: ${res.status}`);
    return await res.json() as PrepareResult;
  }

  async uploadChunk(ctx: ChunkUploadContext): Promise<ChunkUploadedResult> {
    if (!ctx.uploadUrl) throw new Error("missing presigned url");
    const res = await fetch(ctx.uploadUrl, {
      method: "PUT",
      body: ctx.body,
      signal: ctx.signal ?? undefined // ← respect cancel
    });
    if (!res.ok) return { ok: false };
    const etag = res.headers.get("ETag") ?? res.headers.get("etag") ?? undefined;
    return { ok: true, etag };
  }

  async finalize(ctx: FinalizeContext): Promise<FinalizeResult> {
    const res = await fetch(`${this.opts.baseURL}/s3/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(this.opts.headers ?? {}) },
      body: JSON.stringify({
        sessionId: ctx.sessionId,
        fileId: ctx.fileHash.fileIdHex,
        parts: ctx.parts
      })
    });
    if (!res.ok) return { ok: false };
    return await res.json() as FinalizeResult;
  }
}
