import { backoffDelay, difference, range, sleep, sliceFile, clamp } from "./utils";
import { merkleFileHash } from "./hash";
import { ManifestStore } from "./persist";
import type {
  UploaderOptions,
  UploadAdapter,
  PrepareResult,
  ChunkUploadedResult,
  FinalizeResult
} from "./types";

export type UploadEvents = {
  onProgress?: (p: { total: number; uploaded: number; percent: number }) => void;
  onState?: (
    s:
      | "hashing"
      | "preparing"
      | "uploading"
      | "finalizing"
      | "paused"
      | "done"
      | "error"
      | "canceled"
  ) => void;
  onChunk?: (c: { index: number; ok: boolean; attempt: number }) => void;
};

export class UploadTask {
  private paused = false;
  private canceled = false;
  private controller = new AbortController(); // ← NEW

  constructor(
    private file: File,
    private opts: UploaderOptions,
    private events: UploadEvents = {},
    private store = new ManifestStore(opts.persistKey ?? "up:pro")
  ) {}

  async start(meta?: Record<string, unknown>) {
    try {
      this.events.onState?.("hashing");
      const chunkSize = this.opts.chunkSize || 5 * 1024 * 1024;
      const fileHash = await merkleFileHash(this.file, chunkSize);

      this.events.onState?.("preparing");
      const adapter: UploadAdapter = this.opts.adapter;
      const chunkCount = Math.ceil(this.file.size / chunkSize) || 1;

      const manifest =
        this.store.load(adapter.name, fileHash.fileIdHex) ??
        this.store.put(adapter.name, fileHash.fileIdHex, {
          name: this.file.name,
          size: this.file.size,
          chunkSize,
          chunkCount,
          uploaded: []
        });

      const prep: PrepareResult = await adapter.prepare({
        file: this.file,
        fileHash,
        chunkSize,
        chunkCount,
        meta
      });

      if (prep.alreadyUploaded?.length) {
        for (const i of prep.alreadyUploaded) {
          if (!manifest.uploaded.includes(i)) manifest.uploaded.push(i);
        }
      }
      if (manifest.sessionId !== prep.sessionId) {
        manifest.sessionId = prep.sessionId;
      }
      this.store.save(manifest);

      if (manifest.uploaded.length >= chunkCount) {
        this.events.onState?.("finalizing");
        const fin = await adapter.finalize({
          sessionId: prep.sessionId,
          file: this.file,
          fileHash,
          chunkCount,
          parts: manifest.etags
            ? Object.entries(manifest.etags).map(([k, v]) => ({
                partNumber: Number(k) + 1,
                etag: v
              }))
            : undefined
        });
        this.done(fin);
        return fin;
      }

      const all = range(chunkCount);
      const todo = difference(all, new Set(manifest.uploaded));
      const conc = clamp(this.opts.concurrency ?? 4, 1, 16);

      const tick = () => {
        const percent = Math.floor((manifest.uploaded.length / chunkCount) * 100);
        this.events.onProgress?.({
          total: chunkCount,
          uploaded: manifest.uploaded.length,
          percent
        });
      };

      const runOne = async (index: number) => {
        const start = index * chunkSize;
        const end = Math.min(this.file.size, start + chunkSize);
        const body = sliceFile(this.file, start, end);

        let attempt = 0;
        while (!this.canceled) {
          try {
            const uploadUrl = prep.uploadUrls?.[index];
            const r: ChunkUploadedResult = await adapter.uploadChunk({
              sessionId: prep.sessionId,
              file: this.file,
              chunkIndex: index,
              chunkStart: start,
              chunkEnd: end,
              body,
              fileHash,
              uploadUrl,
              signal: this.controller.signal // ← pass signal
            });
            this.events.onChunk?.({ index, ok: r.ok, attempt });
            if (!r.ok) throw new Error("upload failed");

            if (!manifest.uploaded.includes(index)) manifest.uploaded.push(index);
            if (r.etag) {
              manifest.etags = manifest.etags ?? {};
              manifest.etags[index] = r.etag;
            }
            this.store.save(manifest);
            tick();
            break;
          } catch (e) {
            if (this.canceled) return; // ← if canceled, stop retrying immediately
            if (attempt >= (this.opts.retry.attempts ?? 0)) throw e;
            const d = backoffDelay(
              attempt++,
              this.opts.retry.baseDelayMs ?? 600,
              this.opts.retry.maxDelayMs,
              this.opts.retry.jitter ?? true
            );
            await sleep(d);
          }
        }
      };

      const inflight = new Set<Promise<void>>();
      let cursor = 0;

      const add = (pr: Promise<void>) => {
        inflight.add(pr);
        pr.finally(() => inflight.delete(pr));
      };

      this.events.onState?.("uploading");

      const pump = async () => {
        while (cursor < todo.length && !this.canceled) {
          if (this.paused) {
            this.events.onState?.("paused");
            await sleep(200);
            continue;
          }
          const idx = todo[cursor++];
          add(runOne(idx));
          if (inflight.size >= conc) {
            await Promise.race([...inflight]);
          }
        }
        await Promise.all([...inflight]);
      };

      await pump();

      if (this.canceled) {
        await adapter.abort?.(prep.sessionId);
        this.events.onState?.("canceled");
        return { ok: false } as FinalizeResult;
      }

      this.events.onState?.("finalizing");
      const fin = await adapter.finalize({
        sessionId: prep.sessionId,
        file: this.file,
        fileHash,
        chunkCount,
        parts: manifest.etags
          ? Object.entries(manifest.etags).map(([k, v]) => ({
              partNumber: Number(k) + 1,
              etag: v
            }))
          : undefined
      });
      this.done(fin);
      return fin;
    } catch (err) {
      this.events.onState?.("error");
      throw err;
    }
  }

  pause() { this.paused = true; }
  resume() { this.paused = false; }
  cancel() {
    this.canceled = true;
    this.controller.abort(); // ← NEW: hard-cancel in-flight fetches
  }

  private done(fin: FinalizeResult) {
    if (fin.ok) this.events.onState?.("done");
  }
}
