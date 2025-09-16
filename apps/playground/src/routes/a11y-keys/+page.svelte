<script lang="ts">
  import { rovingFocus, focusTrap, shortcut, createAnnouncer } from '@svelte-kits/a11y-keys';
  const sr = createAnnouncer();
  let open = false;
</script>

<h2>a11y-keys</h2>

<h3>rovingFocus（方向键切换）</h3>
<ul use:rovingFocus={{ selector:'[data-roving]', orientation:'horizontal' }} role="toolbar" aria-label="Formatting" style="display:flex;gap:.5rem">
  <li><button data-roving on:click={() => sr.announce('Bold toggled')}>Bold</button></li>
  <li><button data-roving on:click={() => sr.announce('Italic toggled')}>Italic</button></li>
  <li><button data-roving on:click={() => sr.announce('Underline toggled')}>Underline</button></li>
</ul>

<h3>focusTrap（对话框） + shortcut（Ctrl+K 打开）</h3>
<div use:shortcut={{ map:{ 'Ctrl+K': () => open = true }, target:'window' }}></div>
<button on:click={() => (open = true)}>Open Dialog (or Ctrl+K)</button>

{#if open}
  <div class="overlay">
    <div role="dialog" aria-modal="true" aria-label="Demo Dialog"
      use:focusTrap={{ initialFocus: '.ok' }}
      on:focusTrapEscape={() => (open = false)}
      class="panel">
      <p>按 Tab 在内部循环；按 Esc 关闭。</p>
      <input placeholder="Type here" />
      <div style="display:flex;gap:.5rem;margin-top:.5rem">
        <button class="ok" on:click={() => (open = false)}>OK</button>
        <button on:click={() => (open = false)}>Cancel</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .overlay { position: fixed; inset: 0; background: rgba(0,0,0,.4); display:grid; place-items:center; }
  .panel { background:white; padding:1rem; border-radius:.5rem; min-width:260px; }
</style>
