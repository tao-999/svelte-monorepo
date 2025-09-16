<h2>keep-route · 长列表（切路由验证缓存与滚动）</h2>
<p style="opacity:.7">
  下拉到很下面 → 切到其它 Tab → 再切回本页，应该原地不动 ✅
</p>

<ul style="list-style:none;padding:0;margin:0">
  {#each Array.from({ length: 600 }) as _, i}
    <li style="padding:12px 0;border-bottom:1px solid rgba(0,0,0,.08)">
      第 {i + 1} 行 · KeepRoute 测试
    </li>
  {/each}
</ul>
