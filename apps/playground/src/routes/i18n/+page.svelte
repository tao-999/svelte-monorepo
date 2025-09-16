<script lang="ts">
  import { createI18nHot, HttpJsonAdapter } from '@sv-kit/i18n-hot';

  const { t, setLocale, version, locale, dict } = createI18nHot({
    adapter: new HttpJsonAdapter({ manifestURL: '/i18n/manifest.json' }),
    initialLocale: 'zh-CN',
    fallbackLocale: 'en'
  });

  let name = '骚哥';
</script>

<p class="muted">version: {$version ?? '(loading...)'} · locale: {$locale}</p>

{#key $locale + ':' + Object.keys($dict).length}
  <p style="font-size:1.2rem; margin:0 0 .75rem 0">{t('hello', { name })}</p>
{/key}

<div style="display:flex;gap:.5rem">
  <button class="btn" on:click={() => setLocale('zh-CN')}>中文</button>
  <button class="btn ghost" on:click={() => setLocale('en')}>EN</button>
</div>
