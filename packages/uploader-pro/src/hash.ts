// packages/uploader-pro/src/hash.ts
import { sha256, toHex, sliceFile } from "./utils";
import type { FileHash } from "./types";

export async function merkleFileHash(file: File, chunkSize: number): Promise<FileHash> {
  const chunkCount = Math.ceil(file.size / chunkSize) || 1;
  const chunkHashes: Uint8Array[] = [];

  for (let i = 0; i < chunkCount; i++) {
    const start = i * chunkSize;
    const end = Math.min(file.size, start + chunkSize);
    const buf = await sliceFile(file, start, end).arrayBuffer(); // ArrayBuffer ✅
    const h = await sha256(buf); // utils.sha256 接收 ArrayBuffer
    chunkHashes.push(new Uint8Array(h)); // 保存分片哈希（Uint8Array）
  }

  // 拼接所有分片哈希，再整体 sha256
  const catLen = chunkHashes.reduce((s, v) => s + v.length, 0);
  const cat = new Uint8Array(catLen);
  let off = 0;
  for (const h of chunkHashes) {
    cat.set(h, off);
    off += h.length;
  }

  // 这里 cat.buffer 的类型是 ArrayBufferLike（TS 定义如此）
  // 对 utils.sha256(ArrayBuffer) 做一次断言，避免 TS 报错
  const fileId = await sha256(cat.buffer as ArrayBuffer);

  return {
    fileIdHex: toHex(fileId), // toHex(ArrayBuffer)
    // 同理，对 b.buffer 做 ArrayBuffer 断言，避免 ArrayBufferLike 的类型告警
    chunkHashesHex: chunkHashes.map((b) => toHex(b.buffer as ArrayBuffer)),
  };
}
