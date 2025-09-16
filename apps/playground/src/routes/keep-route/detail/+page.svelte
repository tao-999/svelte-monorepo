<script lang="ts">
  import { page } from '$app/stores';
</script>

<h2>keep-route / detail</h2>
<p>id: {$page.url.searchParams.get('id')}</p>
<p>q: {$page.url.searchParams.get('q')} | page: {$page.url.searchParams.get('p')}</p>

<a href="/keep-route/search">返回搜索页（应恢复滚动与表单状态）</a>
