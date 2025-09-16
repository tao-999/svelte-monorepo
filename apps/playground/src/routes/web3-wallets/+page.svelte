<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Web3Wallets, injectedConnector } from '@svelte-kits/web3-wallets';

  let wallets: Web3Wallets | null = null;
  let ready = false;
  let hasInjected = false;

  let state = {
    status: 'disconnected',
    accounts: [] as string[],
    chainId: null as number | string | null
  };

  let unsubscribe = () => {};

  onMount(() => {
    hasInjected = typeof (window as any).ethereum !== 'undefined';

    const g = window as any;
    wallets = g.__w3w__ ?? (g.__w3w__ = new Web3Wallets({
      connectors: [injectedConnector()],
      autoConnect: true,
      storageKey: 'web3:last'
    }));

    unsubscribe = wallets!.subscribe((s) => (state = s as typeof state));
    ready = true;
  });

  onDestroy(() => unsubscribe());

  const W = () => {
    if (!wallets) throw new Error('wallet not ready');
    return wallets;
  };
  const msg = (e: unknown) =>
    (e as any)?.message ?? (e as any)?.cause?.message ?? JSON.stringify(e);

  async function connect()   { try { await W().connect('injected'); } catch (e) { alert(msg(e)); } }
  async function disconnect(){ try { await W().disconnect(); }      catch (e) { alert(msg(e)); } }
  async function sign()      { try {
      const sig = await W().signMessage('gm, Svelte Kits ✨');
      alert('signature:\n' + sig);
    } catch (e) { alert(msg(e)); } }
</script>

<h2>web3-wallets</h2>
<p>status: {state.status}</p>
<p>account: {state.accounts[0] || '(none)'} | chainId: {state.chainId ?? '(?)'}</p>

<div style="display:flex;gap:.5rem">
  <button on:click={connect}    disabled={!ready || state.status==='connecting'}>Connect</button>
  <button on:click={disconnect} disabled={!ready || state.status!=='connected'}>Disconnect</button>
  <button on:click={sign}       disabled={!ready || state.status!=='connected'}>personal_sign</button>
</div>

{#if !hasInjected}
  <p style="opacity:.7;margin-top:.5rem">
    未检测到注入钱包（window.ethereum）。请安装/启用 MetaMask 或 Coinbase 扩展，然后刷新页面。
  </p>
{/if}
