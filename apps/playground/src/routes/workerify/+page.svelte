<script lang="ts">
  import { wrap, workerify } from '@svelte-kits/workerify';

  // 1) wrap 已有 worker 脚本
  const api: any = wrap(new URL('$lib/workers/hash.worker.ts', import.meta.url), { name: 'hash' });

  // 2) workerify 单函数
  const fibAsync = workerify((n: number) => {
    const f = (x: number): number => (x <= 1 ? x : f(x - 1) + f(x - 2));
    return f(n);
  }, { name: 'fib-inline' });

  let text = 'hello worker';
  let out1 = '';
  let out2 = '';
  let n = 35;

  async function doHash() {
    const buf = new TextEncoder().encode(text).buffer;
    out1 = await api.sha256Hex(buf);
  }
  async function doFib() {
    out2 = String(await fibAsync(n));
  }
</script>

<h2>workerify</h2>

<h3>wrap(url) → sha256Hex</h3>
<input bind:value={text} />
<button on:click={doHash}>Hash</button>
{#if out1}<p><code style="word-break:break-all">{out1}</code></p>{/if}

<h3>workerify(fn) → fib({n})</h3>
<input type="number" bind:value={n} min="1" />
<button on:click={doFib}>Run</button>
{#if out2}<p>Result: {out2}</p>{/if}
