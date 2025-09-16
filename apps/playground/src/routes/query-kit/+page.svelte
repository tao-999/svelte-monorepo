<script lang="ts">
  import { QueryClient, httpJSON, type QueryKey } from '@svelte-kits/query-kit';

  type Post = { userId: number; id: number; title: string; body: string };

  // 必填项：staleTime + gcTime + swr + retry
  const qc = new QueryClient({
    staleTime: 10_000,  // 10s 内视为新鲜
    gcTime: 60_000,     // 60s 未用回收
    swr: true,          // SWR：先缓存再校验
    retry: { attempts: 1, baseMs: 400 }
  });

  const url = 'https://jsonplaceholder.typicode.com/posts?_limit=8';
  const key: QueryKey = ['GET', url];
  const baseFetcher = httpJSON<Post[]>(url);

  let data: Post[] = [];
  let loading = true;
  let error: unknown = null;

  // 反馈信息：看得见“是否真的发网”
  let updatedAt = 0;
  let networkHits = 0;
  let banner = '';

  // ✅ 关键修复：透传参数给底层 fetcher，别手撸成 0 参数调用
  //    这样无论底层需要 (ctx) / (signal) / (...args) 都能对上
  const netFetcher = async (...args: unknown[]) => {
    networkHits++;
    // @ts-expect-error 透传给底层即可（匹配它的签名）
    return baseFetcher(...args);
  };

  async function load() {
    loading = data.length === 0;
    error = null;
    const t0 = performance.now();
    try {
      data = await qc.fetchQuery<Post[]>(key, netFetcher);
      updatedAt = Date.now();
      const ms = Math.round(performance.now() - t0);
      banner = `✅ 获取完成（${ms}ms）`;
    } catch (e) {
      error = e;
      banner = '❌ 请求失败';
    } finally {
      loading = false;
      setTimeout(() => (banner = ''), 1200);
    }
  }

  // 首次拉取
  load();

  // SWR 刷新：新鲜期内可能直接命中缓存 → 不一定发网
  const refresh = () => { void load(); };

  // 失效后刷新：一定会发网（networkHits 会 +1）
  const invalidate = async () => {
    qc.invalidate((h: string) => h.includes('jsonplaceholder.typicode.com/posts'));
    await load();
  };
</script>

<h2>query-kit · 演示</h2>

<div style="display:flex;gap:.5rem;align-items:center;margin-bottom:.5rem">
  <button class="btn" on:click={refresh} disabled={loading}>刷新（SWR）</button>
  <button class="btn ghost" on:click={invalidate} disabled={loading}>失效后刷新</button>
  <span style="opacity:.7;margin-left:.5rem">
    上次更新时间：{updatedAt ? new Date(updatedAt).toLocaleTimeString() : '—'}
    · 网络命中：{networkHits}
  </span>
</div>

{#if banner}<div class="toast">{banner}</div>{/if}
{#if loading}<p>Loading...</p>{/if}
{#if error}<pre style="color:#c00">{String(error)}</pre>{/if}

<ul>
  {#each data as p}
    <li><b>{p.id}</b> — {p.title}</li>
  {/each}
</ul>

<style>
  .btn{ appearance:none; border:1px solid #1a73e8; background:#1a73e8; color:#fff;
        padding:.5rem .8rem; border-radius:.5rem; font-weight:600; cursor:pointer; }
  .btn[disabled]{ opacity:.55; cursor:not-allowed; }
  .btn.ghost{ background:transparent; color:#1a73e8; border-color:#98c2ff; }
  .toast{ display:inline-block; margin:.25rem 0 1rem; padding:.35rem .6rem; border-radius:.4rem;
          background:#eef4ff; color:#1a4ee8; border:1px solid #cfe0ff; }
</style>
