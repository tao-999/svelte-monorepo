<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { ripple } from '$lib/actions/ripple';

  // browser-only 句柄
  let workersReady = false;
  let hashApi: any = null;
  let heavyApi: any = null;

  // 状态
  let text = 'hello worker';
  let out1 = '';
  let out2 = '';
  let n = 10; // ← 这里表示“百万”，也就是 10_000_000
  let busyHash = false;
  let busyPrime = false;

  onMount(async () => {
    if (!browser) return;
    try {
      const { wrap } = await import('@svelte-kits/workerify');

      // ✅ 用 ?url 让 Vite 产出可访问的最终 URL（避免 /src/... 404）
      const hashUrl  = (await import('$lib/workers/hash.worker.ts?url')).default;
      const heavyUrl = (await import('$lib/workers/heavy.worker.ts?url')).default;

      hashApi  = wrap(hashUrl,  { name: 'hash'  });
      heavyApi = wrap(heavyUrl, { name: 'heavy' });

      workersReady = true;
    } catch (e) {
      console.error('worker 加载失败', e);
      toast('Worker 加载失败，请看控制台');
    }
  });

  async function doHash() {
    if (!workersReady || !hashApi) return toast('Worker 尚未就绪');
    try {
      busyHash = true;
      const buf = new TextEncoder().encode(text).buffer;
      out1 = await hashApi.sha256Hex(buf);
    } catch (e) {
      console.error(e);
      toast('哈希失败，请看控制台');
    } finally {
      busyHash = false;
    }
  }

  async function doPrime() {
    if (!workersReady || !heavyApi) return toast('Worker 尚未就绪');
    try {
      busyPrime = true;
      const limit = Math.max(1, Number(n)) * 1_000_000; // n 百万
      const t0 = performance.now();

      // 加个超时保护，避免 Promise 悬挂
      const count = await Promise.race<number>([
        heavyApi.countPrimes(limit),
        new Promise<number>((_, rej) => setTimeout(() => rej(new Error('timeout')), 60_000)) // 60s 超时
      ]);

      const ms = (performance.now() - t0).toFixed(0);
      out2 = `≤ ${limit.toLocaleString()} 的素数个数：${count.toLocaleString()}（${ms} ms）`;
      console.log(out2);
    } catch (e) {
      console.error(e);
      toast(e instanceof Error ? `计算失败：${e.message}` : '计算失败');
    } finally {
      busyPrime = false;
    }
  }

  // —— Toast —— //
  let toastMsg = ''; let timer: any = null;
  function toast(m: string) { toastMsg = m; clearTimeout(timer); timer = setTimeout(() => toastMsg = '', 2600); }
  async function copy(s: string) { try { await navigator.clipboard.writeText(s); toast('已复制到剪贴板'); } catch { toast('复制失败'); } }
</script>

<!-- App Bar -->
<header class="appbar">
  <div class="bar">
    <div class="title">Workerify Demo</div>
    <div class="sub">Google/Material 风格 · Web Workers</div>
  </div>
</header>

<main class="container">
  <!-- Hash Card -->
  <section class="card">
    <h2>SHA-256 · wrap(url) → <code>sha256Hex(ArrayBuffer)</code></h2>

    <div class="field">
      <input id="txt" class="md-input" type="text" bind:value={text} placeholder=" " />
      <label for="txt" class="md-label">输入文本</label>
      <div class="assist">在 Worker 中使用 SubtleCrypto 计算哈希</div>
    </div>

    <button
      class="md-btn filled"
      use:ripple
      on:click={doHash}
      disabled={!workersReady || busyHash}
      data-busy={busyHash}
      aria-busy={busyHash}
    >
      <span class="spinner" aria-hidden="true"></span>
      <span class="label">{workersReady ? 'Hash' : 'Loading…'}</span>
    </button>

    {#if out1}
      <div class="result">
        <div class="result-head">
          <span>结果</span>
          <button class="md-icon" use:ripple aria-label="复制" on:click={() => copy(out1)}>📋</button>
        </div>
        <code class="codeblock">{out1}</code>
      </div>
    {/if}
  </section>

  <!-- Heavy Card -->
  <section class="card">
    <h2>Count Primes（重负载） · <code>countPrimes(limit)</code></h2>

    <div class="row">
      <div class="field">
        <input id="num" class="md-input" type="number" bind:value={n} min="1" placeholder=" " />
        <label for="num" class="md-label">规模（百万，建议 5–50）</label>
        <div class="assist">示例：10 → 10,000,000；越大越吃 CPU，放到 Worker 不卡主线程</div>
      </div>
      <input class="md-slider" type="range" min="1" max="100" bind:value={n} />
    </div>

    <button
      class="md-btn tonal"
      use:ripple
      on:click={doPrime}
      disabled={!workersReady || busyPrime}
      data-busy={busyPrime}
      aria-busy={busyPrime}
    >
      <span class="spinner" aria-hidden="true"></span>
      <span class="label">{workersReady ? 'Count Primes' : 'Loading…'}</span>
    </button>

    {#if out2}
      <div class="result">
        <div class="result-head">
          <span>结果</span>
          <button class="md-icon" use:ripple aria-label="复制" on:click={() => copy(out2)}>📋</button>
        </div>
        <code class="codeblock">{out2}</code>
      </div>
    {/if}
  </section>
</main>

{#if toastMsg}
  <div class="toast">{toastMsg}</div>
{/if}

<style>
  :root {
    --md-primary: #6750a4;
    --md-on-primary: #ffffff;
    --md-primary-container: #eaddff;
    --md-on-primary-container: #21005d;

    --md-surface: #faf6ff;
    --md-on-surface: #1d1b20;
    --md-surface-variant: #e7e0ec;
    --md-outline: #79747e;

    --radius: 12px;
    --shadow-1: 0 1px 2px rgba(0,0,0,.12), 0 1px 3px 1px rgba(0,0,0,.08);
    --shadow-2: 0 3px 6px rgba(0,0,0,.16), 0 3px 6px 2px rgba(0,0,0,.10);

    --code-bg: #0b1020;
    --code-fg: #e7eaf6;
  }

  * { box-sizing: border-box; }

  /* svelte-ignore css-unused-selector */
  :global(body) {
    margin: 0;
    background: var(--md-surface);
    color: var(--md-on-surface);
    font: 16px/1.5 system-ui, -apple-system, Segoe UI, Roboto, 'Noto Sans SC', Arial, sans-serif;
  }

  .appbar { position: sticky; top: 0; z-index: 10; background: var(--md-primary); color: var(--md-on-primary); box-shadow: var(--shadow-2); }
  .bar { max-width: 1080px; margin: 0 auto; padding: 14px 20px; }
  .title { font-weight: 700; letter-spacing: .2px; }
  .sub { opacity: .9; font-size: 13px; margin-top: 2px; }

  .container {
    max-width: 1080px; margin: 24px auto; padding: 0 16px;
    display: grid; gap: 20px; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  }
  .card { background: #fff; border-radius: var(--radius); padding: 20px; box-shadow: var(--shadow-1); border: 1px solid rgba(0,0,0,0.06); }
  .card h2 { margin: 0 0 12px; font-size: 18px; letter-spacing: .2px; }

  .field { position: relative; margin: 12px 0 8px; }
  .md-input {
    width: 100%; border: 1px solid var(--md-outline); border-radius: 8px;
    padding: 16px 12px 12px; background: #fff; outline: none; transition: border .2s, box-shadow .2s;
  }
  .md-input:focus { border-color: var(--md-primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--md-primary) 20%, transparent); }
  .md-label {
    position: absolute; left: 12px; top: 12px; padding: 0 4px; background: #fff; color: #6b6b6b; font-size: 14px; pointer-events: none;
    transform-origin: left top; transition: transform .18s, color .18s, top .18s;
  }
  .md-input:focus + .md-label, .md-input:not(:placeholder-shown) + .md-label {
    color: var(--md-primary); transform: scale(.85) translateY(-14px); top: 4px;
  }
  .assist { color: #6b6b6b; font-size: 12px; margin-top: 6px; }

  .row { display: grid; grid-template-columns: 1fr; gap: 10px; }
  @media (min-width: 560px) { .row { grid-template-columns: 1fr 180px; align-items: end; } }
  .md-slider { width: 100%; accent-color: var(--md-primary); }

  .md-btn {
    position: relative; display: inline-flex; align-items: center; justify-content: center; gap: 10px;
    padding: 10px 16px 10px 40px; min-width: 120px;
    border-radius: 999px; cursor: pointer; border: 1px solid transparent; user-select: none; overflow: hidden; transition: box-shadow .2s;
  }
  .md-btn:active { transform: none; }
  .md-btn:disabled { opacity: .5; cursor: not-allowed; }

  .filled { background: var(--md-primary); color: var(--md-on-primary); box-shadow: var(--shadow-1); }
  .filled:hover { box-shadow: var(--shadow-2); }
  .tonal { background: var(--md-primary-container); color: var(--md-on-primary-container); border-color: color-mix(in srgb, var(--md-primary-container) 70%, #000 0%); }

  .md-btn .spinner {
    position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
    width: 16px; height: 16px; border: 2px solid color-mix(in srgb, currentColor 40%, transparent);
    border-top-color: currentColor; border-radius: 50%; animation: spin .8s linear infinite;
    opacity: 0; pointer-events: none; transition: opacity .12s;
  }
  .md-btn[data-busy="true"] .spinner { opacity: 1; }

  .md-icon { padding: 6px 10px; border-radius: 8px; border: 1px solid transparent; background: transparent; cursor: pointer; position: relative; overflow: hidden; }
  .md-icon:hover { background: rgba(0,0,0,.04); }

  /* svelte-ignore css-unused-selector */
  :global(.md-ripple) { position: absolute; border-radius: 50%; pointer-events: none; background: color-mix(in srgb, #000 20%, transparent); transform: scale(0); animation: ripple .45s ease-out forwards; }
  @keyframes ripple {
    to { transform: scale(1); opacity: 0; }  /* ✅ 没有多余的 ) */
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .result { margin-top: 14px; }
  .result-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
  .codeblock { display: block; max-width: 100%; background: var(--code-bg); color: var(--code-fg); padding: 12px; border-radius: 10px; overflow-wrap: anywhere; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }

  .toast { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); background: #323232; color: #fff; padding: 10px 14px; border-radius: 8px; box-shadow: var(--shadow-2); font-size: 14px; z-index: 20; }
</style>
