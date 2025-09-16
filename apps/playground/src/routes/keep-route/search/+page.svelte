<script lang="ts">
  import { keepState } from '../../+layout.svelte';
  import { goto } from '$app/navigation';

  let q = '';
  let pageNo = 1;

  const getSnap = () => ({ q, pageNo, scrollY: scrollY });
  const setSnap = (s: any) => {
    if (!s) return;
    q = s.q ?? q;
    pageNo = s.pageNo ?? pageNo;
    if (typeof s.scrollY === 'number') requestAnimationFrame(() => scrollTo(0, s.scrollY));
  };

  function toDetail(i: number) {
    goto(`/keep-route/detail?id=${i}&q=${encodeURIComponent(q)}&p=${pageNo}`);
  }
</script>

<h2>keep-route / search</h2>

<div use:keepState={{ id: 'searchForm', get: getSnap, set: setSnap }}>
  <input bind:value={q} placeholder="关键词" />
  <button on:click={() => pageNo = 1}>搜索</button>
  <p>页码：{pageNo}</p>
  <div style="display:flex;gap:.5rem">
    <button on:click={() => pageNo = Math.max(1, pageNo - 1)}>上一页</button>
    <button on:click={() => pageNo = pageNo + 1}>下一页</button>
  </div>

  <hr />
  <h3>模拟列表（滚动到下面再点详情，回来会原地恢复）</h3>
  <ul>
    {#each Array.from({ length: 100 }) as _, i}
      <li style="margin:1rem 0">
        Item {i + 1} — <a href="javascript:void 0" on:click={() => toDetail(i + 1)}>查看详情</a>
      </li>
    {/each}
  </ul>
</div>
