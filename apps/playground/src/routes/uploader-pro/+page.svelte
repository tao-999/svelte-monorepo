<script lang="ts">
  import { merkleFileHash } from '@svelte-kits/uploader-pro';

  let file: File | null = null;
  let info: any = null;
  let time = 0;

  async function hashIt() {
    if (!file) return;
    const t0 = performance.now();
    // 演示：256KB 分片哈希 + Merkle 合并（与你包里的实现一致）
    info = await merkleFileHash(file, 256 * 1024);
    time = Math.round(performance.now() - t0);
  }
</script>

<h2>uploader-pro（离线演示：Merkle File Hash）</h2>
<input type="file" on:change={(e:any)=> file = e.currentTarget.files?.[0] ?? null} />
<button disabled={!file} on:click={hashIt}>计算 Hash</button>

{#if info}
  <p>耗时：{time} ms</p>
  <p><b>fileIdHex</b></p>
  <code style="display:block;word-break:break-all">{info.fileIdHex}</code>
  <p><b>chunkHashesHex</b>（前 3 个）</p>
  <code style="display:block;word-break:break-all">{info.chunkHashesHex.slice(0,3).join('\n')}</code>
{/if}

<p style="opacity:.7">注：真正上传需要服务端接口；此页仅演示本地分片哈希流程。</p>
