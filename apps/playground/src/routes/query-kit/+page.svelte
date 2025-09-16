<script lang="ts">
  import { QueryClient, httpJSON } from '@svelte-kits/query-kit';
  const qc = new QueryClient({ staleTime: 10_000, retry: { attempts: 1, baseMs: 400 } });

  const key = ['GET','https://jsonplaceholder.typicode.com/posts?_limit=8'];
  const fetcher = httpJSON(key[1] as string);

  let data: any[] = [];
  let loading = true;
  let error: any = null;

  async function load() {
    loading = true; error = null;
    try { data = await qc.fetchQuery(key, fetcher); }
    catch (e) { error = e; }
    loading = false;
  }

  load();

  function invalidate() {
    qc.invalidate((h) => h.includes('jsonplaceholder.typicode.com/posts'));
    load();
  }
</script>

<h2>query-kit</h2>
<div style="display:flex;gap:.5rem">
  <button on:click={load}>刷新（SWR）</button>
  <button on:click={invalidate}>失效后刷新</button>
</div>

{#if loading}<p>Loading...</p>{/if}
{#if error}<pre>{String(error)}</pre>{/if}
<ul>
  {#each data as p}
    <li><b>{p.id}</b> — {p.title}</li>
  {/each}
</ul>
