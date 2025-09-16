<script lang="ts">
  import { rovingFocus, focusTrap, shortcut } from '@svelte-kits/a11y-keys';

  // 用 aria-pressed 让 SR 自动播报，不再手动 announce
  let bold = false, italic = false, underline = false;

  function toggle(kind: 'bold'|'italic'|'underline') {
    if (kind === 'bold') bold = !bold;
    if (kind === 'italic') italic = !italic;
    if (kind === 'underline') underline = !underline;
    // 如需额外提示，可轻量更新一个隐藏 live，但默认不必：
    // queueMicrotask(()=> live = `${kind} ${({bold,italic,underline}[kind] ? 'on' : 'off')}`);
  }

  let open = false;

  // 可选：隐藏的 live（不默认使用，避免任何潜在互踩）
  let live = '';
</script>

<!-- 视觉隐藏但可读屏 -->
<div class="sr-only" aria-live="polite" aria-atomic="true">{live}</div>

<h2 class="h2">a11y-keys</h2>

<section class="card">
  <h3 class="h3">Roving Focus（方向键切换）</h3>

  <!-- ✅ div + role="toolbar"，只做键盘焦点管理；不再调用 announce -->
  <div
    use:rovingFocus={{ selector:'[data-roving]', orientation:'horizontal' }}
    role="toolbar"
    aria-label="Formatting"
    class="toolbar"
  >
    <button
      class="chip"
      data-roving
      aria-pressed={bold}
      on:click={() => toggle('bold')}
    >Bold</button>

    <button
      class="chip"
      data-roving
      aria-pressed={italic}
      on:click={() => toggle('italic')}
    >Italic</button>

    <button
      class="chip"
      data-roving
      aria-pressed={underline}
      on:click={() => toggle('underline')}
    >Underline</button>
  </div>
</section>

<section class="card">
  <h3 class="h3">Focus Trap（对话框） + Shortcut（Ctrl+K 打开）</h3>
  <div use:shortcut={{ map:{ 'Ctrl+K': () => (open = true) }, target:'window' }} aria-hidden="true"></div>
  <button class="btn" on:click={() => (open = true)}>Open Dialog (or Ctrl+K)</button>
</section>

{#if open}
  <div class="overlay">
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dlg-title"
      aria-describedby="dlg-desc"
      class="panel elevation"
      use:focusTrap={{ initialFocus: '.ok' }}
      on:focusTrapEscape={() => (open = false)}
    >
      <h4 id="dlg-title" class="h4">Demo Dialog</h4>
      <p id="dlg-desc" class="muted">按 Tab 在内部循环；按 Esc 关闭。</p>

      <label class="field">
        <span>Message</span>
        <input placeholder="Type here" />
      </label>

      <div class="actions">
        <button class="btn ok" on:click={() => (open = false)}>OK</button>
        <button class="btn ghost" on:click={() => (open = false)}>Cancel</button>
      </div>
    </div>
  </div>
{/if}

<style>
  /* 全局盒模型，杜绝 100% + padding 溢出 */
  :global(*, *::before, *::after){ box-sizing: border-box; }

  :root{
    --primary: #1a73e8;
    --on-primary: #fff;
    --surface: var(--sk-surface, #fff);
    --surface-2: color-mix(in oklab, var(--surface) 92%, black);
    --border: color-mix(in oklab, var(--surface) 86%, black);
    --ink: color-mix(in oklab, black 86%, white);
    --muted: color-mix(in oklab, black 52%, white);
    --shadow: 0 1px 2px rgba(0,0,0,.06), 0 4px 14px rgba(0,0,0,.08);
    --radius: 14px;
  }
  @media (prefers-color-scheme: dark){
    :root{
      --surface: #0f1115;
      --surface-2: #161a20;
      --border: #2a2f3a;
      --ink: #e8eaed;
      --muted: #9aa0a6;
      --shadow: 0 1px 2px rgba(0,0,0,.45), 0 8px 24px rgba(0,0,0,.35);
    }
  }

  .sr-only{
    position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;
  }

  .h2{ font-size:1.6rem; margin:0 0 .75rem 0; }
  .h3{ font-size:1.1rem; margin:.25rem 0 .5rem; }
  .h4{ font-size:1rem; margin:.25rem 0 .25rem; }
  .muted{ color: var(--muted); margin: .25rem 0 1rem; }

  .card{
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    padding: 1rem;
    margin: 1rem 0;
  }

  .toolbar{
    display:flex; gap:.5rem; align-items:center; padding:.25rem;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: .75rem;
  }
  .chip{
    appearance:none; border:1px solid var(--border);
    background: var(--surface);
    border-radius: 999px;
    padding: .4rem .8rem;
    font: inherit; color: var(--ink);
    cursor: pointer;
    transition: border-color .12s ease, background .12s ease, transform .02s ease-in;
  }
  .chip[aria-pressed="true"]{
    background: color-mix(in oklab, var(--primary) 12%, var(--surface));
    border-color: color-mix(in oklab, var(--primary) 40%, var(--border));
    color: color-mix(in oklab, var(--primary) 70%, var(--ink));
  }
  .chip:focus-visible{ outline: 2px solid var(--primary); outline-offset: 2px; }
  .chip:active{ transform: translateY(1px); }

  .btn{
    appearance:none; cursor:pointer;
    background: var(--primary); color: var(--on-primary);
    border: 1px solid color-mix(in oklab, var(--primary) 85%, black);
    padding: .55rem .9rem; border-radius: .7rem; font-weight: 600;
    transition: filter .12s ease, transform .02s ease-in;
  }
  .btn:hover{ filter: brightness(1.05); }
  .btn:active{ transform: translateY(1px); }
  .btn.ghost{
    background: transparent; color: var(--primary);
    border-color: color-mix(in oklab, var(--primary) 35%, transparent);
  }

  .field{
    display:flex; flex-direction: column; gap:.35rem; margin:.25rem 0 1rem;
    min-width: 0; /* 防止输入框按最小内容把容器撑爆 */
  }
  .field input{
    display:block;
    width: 100%;
    min-width: 0;
    appearance:none; -webkit-appearance:none; /* iOS/Safari 去系统外观 */
    padding: .6rem .7rem;
    border-radius: .6rem;
    border:1px solid var(--border);
    background: var(--surface-2);
    color: var(--ink);
  }
  .field input:focus{
    outline: 2px solid color-mix(in oklab, var(--primary) 55%, transparent); outline-offset: 2px;
  }

  .overlay{
    position: fixed; inset: 0;
    background: rgba(0,0,0,.35);
    display:grid; place-items:center;
    padding: 1rem; /* 留边，避免贴边溢出 */
  }
  .panel{
    background: var(--surface);
    color: var(--ink);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 1rem;
    width: min(520px, calc(100vw - 2rem));
    max-height: calc(100dvh - 2rem); /* 小屏也不炸 */
    overflow: auto;                   /* 内容多时滚动，且裁剪圆角 */
    overscroll-behavior: contain;     /* 防止滚动穿透 */
  }
  .elevation{ box-shadow: var(--shadow); }
  .actions{ display:flex; gap:.5rem; justify-content:flex-end; }
</style>
