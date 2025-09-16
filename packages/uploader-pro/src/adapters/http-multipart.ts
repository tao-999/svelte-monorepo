import type {
  UploadAdapter, PrepareContext, PrepareResult,
  ChunkUploadContext, ChunkUploadedResult, FinalizeContext, FinalizeResult
} from "../types";

export type HttpMultipartAdapterOptions = {
  baseURL: string;
  headers?: Record<string,string>;
};

export class HttpMultipartAdapter implements UploadAdapter {
  name = "http-multipart";
  constructor(private opts: HttpMultipartAdapterOptions) {}

  async prepare(ctx: PrepareContext): Promise<PrepareResult> {
    const res = await fetch(`${this.opts.baseURL}/upload/prepare`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(this.opts.headers ?? {}) },
      body: JSON.stringify({
        fileId: ctx.fileHash.fileIdHex,
        name: ctx.file.name,
        size: ctx.file.size,
        chunkSize: ctx.chunkSize,
        chunkCount: ctx.chunkCount,
        chunkHashes: ctx.fileHash.chunkHashesHex,
        meta: ctx.meta ?? {}
      })
    });
    if (!res.ok) throw new Error(`prepare failed: ${res.status}`);
    return await res.json() as PrepareResult;
  }

  async uploadChunk(ctx: ChunkUploadContext): Promise<ChunkUploadedResult> {
    const u = ctx.uploadUrl ?? `${this.opts.baseURL}/upload/${ctx.sessionId}/${ctx.chunkIndex}`;
    const res = await fetch(u, {
      method: "PUT",
      headers: { ...(this.opts.headers ?? {}) },
      body: ctx.body,
      signal: ctx.signal ?? undefined // ← respect cancel
    });
    if (!res.ok) return { ok: false };
    return { ok: true, etag: res.headers.get("ETag") ?? undefined };
  }

  async finalize(ctx: FinalizeContext): Promise<FinalizeResult> {
    const res = await fetch(`${this.opts.baseURL}/upload/${ctx.sessionId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(this.opts.headers ?? {}) },
      body: JSON.stringify({
        fileId: ctx.fileHash.fileIdHex,
        name: ctx.file.name,
        size: ctx.file.size,
        chunkCount: ctx.chunkCount
      })
    });
    if (!res.ok) return { ok: false };
    return await res.json() as FinalizeResult;
  }

  async abort(sessionId: string): Promise<void> {
    await fetch(`${this.opts.baseURL}/upload/${sessionId}/abort`, {
      method: "POST",
      headers: this.opts.headers
    });
  }
}
