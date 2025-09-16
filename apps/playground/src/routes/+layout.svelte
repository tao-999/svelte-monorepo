<script lang="ts">
  import { createKeepRoute, wireSvelteKit } from '@svelte-kits/keep-route';
  import { page } from '$app/stores';
  import { beforeNavigate, afterNavigate } from '$app/navigation';

  // ① 全局 keep 配置：只在 layout 接一次线
  const keep = createKeepRoute({
    include: ['/**'],           // 全站
    exclude: ['/login/**'],     // 登录相关不保留
    max: 20,                    // 最多 20 条历史
    scroll: true,               // ⭐ 自动恢复滚动
    persistKey: 'kr-demo'       // 会话键（可换）
  });

  // ② 浏览器环境仅接一次（HMR 防重入）
  if (typeof window !== 'undefined' && !(window as any).__kr_wired__) {
    wireSvelteKit(keep, { page, beforeNavigate, afterNavigate });
    (window as any).__kr_wired__ = true;
  }

  // ③ 导航（保留你原来的）
  const nav = [
    { href: '/',              label: 'Home',          match: (p: string) => p === '/' },
    { href: '/a11y-keys',     label: 'a11y-keys',     match: (p: string) => p.startsWith('/a11y-keys') },
    { href: '/i18n',          label: 'i18n-hot',      match: (p: string) => p.startsWith('/i18n') },
    { href: '/keep-route',    label: 'keep-route',    match: (p: string) => p.startsWith('/keep-route') },
    { href: '/query-kit',     label: 'query-kit',     match: (p: string) => p.startsWith('/query-kit') },
    { href: '/uploader-pro',  label: 'uploader-pro',  match: (p: string) => p.startsWith('/uploader-pro') },
    { href: '/workerify',     label: 'workerify',     match: (p: string) => p.startsWith('/workerify') }
  ];
</script>

<svelte:head>
  <!-- 可选：Google 字体；不想联网可删 -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Roboto:wght@400;500;700&display=swap">
</svelte:head>

<a href="#content" class="skip">跳到内容</a>

<header class="appbar elevation-2">
  <div class="bar">
    <div class="brand">
      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M12 2L20 7v10l-8 5l-8-5V7l8-5zm0 2.3L6 6.8v6.4l6 3.5l6-3.5V6.8L12 4.3z"></path>
      </svg>
      <strong>Svelte Kits Playground</strong>
      <span class="tag">demo</span>
    </div>
    <nav class="tabs">
      {#each nav as item}
        {#key item.href}
          <a
            href={item.href}
            class="tab"
            aria-current={item.match($page.url.pathname) ? 'page' : undefined}
            data-active={item.match($page.url.pathname) ? '1' : '0'}
          >
            {item.label}
            <span class="indicator"></span>
          </a>
        {/key}
      {/each}
    </nav>
  </div>
</header>

<main id="content" class="container">
  <slot></slot>
</main>

<footer class="footer">
  <span>© {new Date().getFullYear()} Svelte Kits • Google 风味 UI · 纯 CSS · 无依赖</span>
</footer>

<style>
  :root{
    --font-sans: "Inter", "Roboto", ui-sans-serif, system-ui, -apple-system, "Segoe UI", "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
    --primary: #1a73e8;        /* Google Blue 600 */
    --primary-ink: #fff;
    --on-surface: #1f1f1f;
    --surface: #ffffff;
    --surface-2: #f6f8fb;
    --border: #e5e7eb;
    --shadow: 0 1px 2px rgba(0,0,0,.06), 0 2px 8px rgba(0,0,0,.06);
    --radius: 12px;
    --tab-gap: .25rem;
  }
  @media (prefers-color-scheme: dark){
    :root{
      --on-surface: #eaeaea;
      --surface: #0f1115;
      --surface-2: #161a20;
      --border: #2a2f3a;
      --shadow: 0 1px 2px rgba(0,0,0,.5), 0 4px 16px rgba(0,0,0,.35);
    }
  }

  :global(html, body){
    padding:0; margin:0;
    background: var(--surface);
    color: var(--on-surface);
    font-family: var(--font-sans);
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }

  .skip{
    position:absolute; left:-9999px; top:auto; width:1px; height:1px; overflow:hidden;
  }
  .skip:focus{
    left: 1rem; top: 1rem; width:auto; height:auto; padding:.5rem .75rem; border-radius:.5rem;
    background: var(--primary); color: var(--primary-ink); z-index: 1000;
    box-shadow: var(--shadow);
  }

  .appbar{
    position: sticky; top: 0; z-index: 50;
    background: var(--surface);
    backdrop-filter: saturate(120%) blur(6px);
    border-bottom: 1px solid var(--border);
  }
  .elevation-2{ box-shadow: var(--shadow); }

  .bar{
    max-width: 1100px; margin: 0 auto;
    display: grid; grid-template-columns: 1fr auto; align-items: end;
    padding: .75rem 1rem .25rem;
    gap: 1rem;
  }

  .brand{
    display:flex; align-items:center; gap:.5rem; color: var(--on-surface);
  }
  .brand strong{ font-weight: 600; letter-spacing: .1px; }
  .brand .tag{
    margin-left:.25rem; font-size:.75rem; padding:.15rem .4rem; border-radius: .5rem;
    background: var(--surface-2); color: #6b7280; border: 1px solid var(--border);
  }

  .tabs{
    display:flex; gap: var(--tab-gap);
    padding: 0 .25rem;
    overflow-x: auto;
  }
  .tab{
    position:relative;
    display:inline-flex; align-items:center; justify-content:center;
    padding: .55rem .8rem;
    border-radius: .75rem;
    text-decoration: none;
    color: inherit;
    transition: background .15s ease, color .15s ease;
    white-space: nowrap;
  }
  .tab:hover{ background: var(--surface-2); }
  .tab[data-active="1"]{ color: var(--primary); font-weight: 600; }
  .tab .indicator{
    position:absolute; left: .5rem; right: .5rem; bottom: .15rem;
    height: 3px; border-radius: 3px;
    background: transparent; transition: background .15s ease, transform .15s ease;
  }
  .tab[data-active="1"] .indicator{ background: var(--primary); }

  .container{
    max-width: 1100px;
    margin: 1.25rem auto 2.5rem;
    padding: 0 1rem;
  }

  .footer{
    max-width: 1100px;
    margin: 2rem auto 3rem;
    padding: 0 1rem;
    color: #6b7280;
  }

  :global(.card){
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    padding: 1rem;
  }
  :global(.btn){
    appearance:none; border:1px solid var(--primary); background: var(--primary);
    color: var(--primary-ink); padding:.55rem .85rem; border-radius:.6rem;
    font-weight:600; cursor:pointer;
  }
  :global(.btn.ghost){
    background: transparent; color: var(--primary);
    border-color: color-mix(in oklab, var(--primary) 35%, transparent);
  }
</style>
