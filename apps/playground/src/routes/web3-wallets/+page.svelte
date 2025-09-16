<script lang="ts">
  import { Web3Wallets, injectedConnector } from '@svelte-kits/web3-wallets';

  const wallets = new Web3Wallets({
    connectors: [injectedConnector()],
    autoConnect: true,
    storageKey: 'web3:last'
  });

  let state = wallets.state;
  const off = wallets.subscribe((s) => (state = s));

  async function connect() {
    try { await wallets.connect('injected'); } catch (e) { alert(String(e)); }
  }
  async function disconnect() { await wallets.disconnect(); }
  async function sign() {
    try {
      const sig = await wallets.signMessage('gm, Svelte Kits ✨');
      alert('signature:\n' + sig);
    } catch (e) { alert(String(e)); }
  }
</script>

<h2>web3-wallets</h2>
<p>status: {state.status}</p>
<p>account: {state.accounts[0] || '(none)'} | chainId: {state.chainId ?? '(?)'}</p>

<div style="display:flex;gap:.5rem">
  <button on:click={connect}>Connect Injected</button>
  <button on:click={disconnect}>Disconnect</button>
  <button on:click={sign} disabled={state.status!=='connected'}>personal_sign</button>
</div>

<p style="opacity:.7">提示：需要浏览器装有 MetaMask/Coinbase 才能连接。</p>
