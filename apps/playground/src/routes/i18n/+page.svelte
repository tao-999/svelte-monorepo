<script lang="ts">
  import { createI18nHot, HttpJsonAdapter } from '@svelte-kits/i18n-hot';

  const i18n = createI18nHot({
    adapter: new HttpJsonAdapter({ manifestURL: '/i18n/manifest.json' }),
    initialLocale: 'zh-CN',
    fallbackLocale: 'en',
    preload: ['en'],
    autoRefreshMs: 30_000
  });

  let name = '骚哥';
</script>

<h2>i18n-hot</h2>
<p>{$i18n.version ? `version: ${$i18n.version}` : 'version: (loading...)'}</p>

<p style="font-size:1.2rem">{i18n.t('hello', { name })}</p>

<div style="display:flex;gap:.5rem">
  <button on:click={() => i18n.setLocale('zh-CN')}>中文</button>
  <button on:click={() => i18n.setLocale('en')}>EN</button>
  <button on:click={() => i18n.refresh()}>手动 refresh()</button>
</div>
