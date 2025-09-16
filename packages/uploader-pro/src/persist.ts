type Manifest = {
  key: string;               // adapter|fileId
  name: string;
  size: number;
  chunkSize: number;
  chunkCount: number;
  uploaded: number[];        // done indices
  sessionId?: string;
  etags?: Record<number, string>;
  url?: string;
  completed?: boolean;
  at: number;                // updatedAt
};

const LS = () => {
  if (typeof window === "undefined") throw new Error("No window");
  return window.localStorage;
};

export class ManifestStore {
  constructor(private prefix = "up:pro") {}

  key(adapter: string, fileId: string) {
    return `${this.prefix}:manifest:${adapter}|${fileId}`;
  }

  load(adapter: string, fileId: string): Manifest | null {
    try {
      const s = LS().getItem(this.key(adapter, fileId));
      return s ? JSON.parse(s) as Manifest : null;
    } catch { return null; }
  }

  save(m: Manifest) {
    m.at = Date.now();
    LS().setItem(this.keyPart(m.key), JSON.stringify(m));
  }

  keyPart(full: string) {
    return `${this.prefix}:manifest:${full}`;
  }

  put(adapter: string, fileId: string, data: Omit<Manifest, "key"|"at">) {
    const m: Manifest = { key: `${adapter}|${fileId}`, at: Date.now(), ...data };
    this.save(m);
    return m;
  }

  updateUploaded(adapter: string, fileId: string, idx: number, etag?: string) {
    const m = this.load(adapter, fileId);
    if (!m) return;
    if (!m.uploaded.includes(idx)) m.uploaded.push(idx);
    if (etag) {
      m.etags = m.etags ?? {};
      m.etags[idx] = etag;
    }
    this.save(m);
  }

  markCompleted(adapter: string, fileId: string, url?: string) {
    const m = this.load(adapter, fileId);
    if (!m) return;
    m.completed = true;
    if (url) m.url = url;
    this.save(m);
  }
}
