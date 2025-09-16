<script lang="ts">
  // —— ① 你的包：优先用包里的实现；没有就用 Polyfill —— //
  type MerkleInfo = {
    fileIdHex: string;
    chunkHashesHex: string[];
    chunkSize?: number;
    chunks?: number;
  };

  let file: File | null = null;
  let info: MerkleInfo | null = null;
  let time = 0;
  let usingPolyfill = false;

  // 显示用途：记住上次文件的“名字+大小”（可序列化）
  let lastMeta: { name: string; size: number } | null = null;

  // —— ② 会话持久化（切路由回来自动恢复） —— //
  const KEY = 'uploader:merkle:v1';

  function saveSession() {
    const payload = { info, time, lastMeta };
    sessionStorage.setItem(KEY, JSON.stringify(payload));
  }
  function restoreSession() {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw);
        info = s.info ?? null;
        time = s.time ?? 0;
        lastMeta = s.lastMeta ?? null;
      }
    } catch {}
  }

  // —— ③ 内存缓存 File（不可序列化，但在同次会话内保留引用） —— //
  const g: any = typeof window !== 'undefined' ? window : {};
  if (!g.__UPLOADER_LAST_FILE__) g.__UPLOADER_LAST_FILE__ = null;
  function stashFile(f: File | null) {
    g.__UPLOADER_LAST_FILE__ = f;
  }
  function pickStashed() {
    const f = g.__UPLOADER_LAST_FILE__ as File | null;
    if (f) {
      file = f; // 注意：原生 input 仍不会显示文件名，这里只是把引用放回变量
    }
  }

  // —— ④ 装载 hasher（包优先，缺失则 Polyfill） —— //
  let hasher: ((file: File, chunkSize?: number) => Promise<MerkleInfo>) | null = null;

  async function ensureHasher() {
    if (hasher) return;
    try {
      const mod: any = await import('@svelte-kits/uploader-pro');
      hasher =
        mod.merkleFileHash ||
        mod.computeFileMerkle ||
        mod.merkleHashFile ||
        mod.fileMerkleHash ||
        mod.hashFileMerkle ||
        null;
    } catch { /* ignore */ }
    if (!hasher) {
      hasher = polyfillMerkleFileHash;
      usingPolyfill = true;
    }
  }

  async function hashIt() {
    if (!file) return;
    await ensureHasher();
    const t0 = performance.now();
    info = await hasher!(file, 256 * 1024);
    time = Math.round(performance.now() - t0);
    lastMeta = { name: file.name, size: file.size };
    stashFile(file);     // 把 File 引用留在内存，便于“复用上次文件”
    saveSession();       // 把可序列化结果写入会话存储
  }

  // —— ⑤ 页面生命周期：首次进来恢复会话 —— //
  if (typeof window !== 'undefined') {
    restoreSession();
    // 离开前写一份，稳一点
    addEventListener('pagehide', saveSession, { once: true });
  }

  // —— ⑥ Polyfill（与上条消息一致） —— //
  async function polyfillMerkleFileHash(file: File, chunkSize = 256 * 1024): Promise<MerkleInfo> {
    const chunkHashes: Uint8Array[] = [];
    const chunkHex: string[] = [];

    for (let off = 0; off < file.size; off += chunkSize) {
      const buf = await file.slice(off, Math.min(off + chunkSize, file.size)).arrayBuffer();
      const digest = await crypto.subtle.digest('SHA-256', buf);
      const arr = new Uint8Array(digest);
      chunkHashes.push(arr);
      chunkHex.push(toHex(arr));
      if ((off / chunkSize) % 32 === 31) await new Promise(r => setTimeout(r));
    }

    if (chunkHashes.length === 0) {
      const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array()));
      return { fileIdHex: toHex(digest), chunkHashesHex: [], chunkSize, chunks: 0 };
    }

    let level = chunkHashes.slice();
    while (level.length > 1) {
      const next: Uint8Array[] = [];
      for (let i = 0; i < level.length; i += 2) {
        const left = level[i];
        const right = level[i + 1] ?? level[i];
        const cat = new Uint8Array(left.length + right.length);
        cat.set(left, 0);
        cat.set(right, left.length);
        const dig = new Uint8Array(await crypto.subtle.digest('SHA-256', cat));
        next.push(dig);
      }
      level = next;
      await new Promise(r => setTimeout(r));
    }

    return {
      fileIdHex: toHex(level[0]),
      chunkHashesHex: chunkHex,
      chunkSize,
      chunks: chunkHex.length
    };
  }
  function toHex(arr: Uint8Array) {
    let s = '';
    for (let i = 0; i < arr.length; i++) s += arr[i].toString(16).padStart(2, '0');
    return s;
  }
</script>

<h2>uploader-pro（离线演示：Merkle File Hash）</h2>
<p style="opacity:.7">
  默认 256KB 分片；奇数分片按“复制最后一叶”合并。切路由回来会自动恢复上次的
  <b>哈希结果</b>与<b>文件元信息</b>；原生文件框出于安全不会自动回填。
</p>

<div style="display:flex;gap:.5rem;align-items:center;margin:.5rem 0 1rem">
  <input type="file" on:change={(e:any)=> { file = e.currentTarget.files?.[0] ?? null }} />
  <button class="btn" disabled={!file} on:click={hashIt}>计算 Hash</button>
  <button class="btn ghost" on:click={pickStashed} title="复用本会话内上次的文件（不会回填到原生 input）">
    复用上次文件
  </button>
</div>

{#if lastMeta}
  <p style="margin:.25rem 0 .75rem; opacity:.75">
    上次文件：<b>{lastMeta.name}</b>（{(lastMeta.size/1024).toFixed(1)} KB）
  </p>
{/if}

{#if info}
  <div class="card" style="margin:.75rem 0">
    <p>耗时：<b>{time} ms</b> {usingPolyfill ? '（Polyfill）' : '（包内实现）'}</p>
    <p><b>fileIdHex（Merkle Root）</b></p>
    <code class="mono">{info.fileIdHex}</code>
    <p><b>chunkHashesHex</b>（前 3 个）</p>
    <code class="mono">
      {#each info.chunkHashesHex.slice(0,3) as h}
{h}
      {/each}
    </code>
    <p style="opacity:.7">分片大小：{info.chunkSize ?? 256*1024} 字节 · 分片数：{info.chunks ?? info.chunkHashesHex.length}</p>
  </div>
{/if}

<p style="opacity:.6">提示：真正上传需要服务端；此页仅演示本地分片哈希流程。文件框不回填是浏览器安全策略，并非插件失效。</p>

<style>
  .btn{ appearance:none; border:1px solid #1a73e8; background:#1a73e8; color:#fff;
        padding:.5rem .8rem; border-radius:.5rem; font-weight:600; cursor:pointer; }
  .btn.ghost{ background:transparent; color:#1a73e8; border-color:#98c2ff; }
  .btn[disabled]{ opacity:.55; cursor:not-allowed; }
  .card{ background:#fff; border:1px solid #e5e7eb; border-radius:.6rem; padding:1rem; }
  .mono{ display:block; white-space:pre-wrap; word-break:break-all; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  @media (prefers-color-scheme: dark){
    .card{ background:#0f1115; border-color:#2a2f3a; }
  }
</style>
