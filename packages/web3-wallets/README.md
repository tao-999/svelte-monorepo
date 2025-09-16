# @svelte-kits/web3-wallets

Headless Web3 钱包内核：EIP-1193 适配、连接器（Injected/External）、自动重连、链切换/添加、消息签名与交易发送、事件订阅。
零第三方依赖，适配 Svelte/React/Node 等任意上层。🧠🔌

- 🔌 连接器：`injectedConnector()`（MetaMask/Coinbase 等注入）/ `externalConnector()`（WalletConnect/Coinbase SDK 等外部 provider）
- ♻️ 自动重连：记住上次连接器，刷新后恢复
- 🔄 链管理：`wallet_switchEthereumChain` + 缺链时自动 `wallet_addEthereumChain`
- ✍️ 签名：`personal_sign`、`eth_signTypedData_v4`
- 💸 交易：`eth_sendTransaction`
- 📡 事件：`accountsChanged` / `chainChanged` / `disconnect` / `connect`
- 🧱 零 UI/零框架：只负责逻辑，UI 随你写

---

## 安装
```bash
pnpm add @svelte-kits/web3-wallets
```

---

## 极速上手

```ts
import { Web3Wallets, injectedConnector, externalConnector } from "@svelte-kits/web3-wallets";

const wallets = new Web3Wallets({
  connectors: [
    injectedConnector(), // 自动挑 MetaMask > Coinbase > 其他
    // WalletConnect 举例：请自行创建 EIP-1193 provider 再“包”进来
    externalConnector("walletconnect", "WalletConnect", async () => {
      // 这里返回你的 WalletConnect EIP-1193 provider 实例
      // 例如：return new WalletConnectProvider({...}) as any;
      throw new Error("todo: return your WC provider");
    })
  ],
  storageKey: "web3:last", // 记住上次连接器
  autoConnect: true         // 默认 true
});

// 订阅状态（可接到任意 UI 框架）
const off = wallets.subscribe((s) => console.log("state:", s));

// 连接（by id）
await wallets.connect("injected");
// 或者：await wallets.connect(wallets.connectors[0]);

// 当前账户/链
console.log(wallets.state.accounts[0], wallets.state.chainId);

// 切换链（若缺失则自动添加）
await wallets.switchChain(137, {
  chain: {
    id: 137,
    name: "Polygon",
    rpcUrls: ["https://polygon-rpc.com"],
    nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
    blockExplorers: [{ name: "Polygonscan", url: "https://polygonscan.com" }]
  }
});

// 签名与交易
const sig = await wallets.signMessage("gm, fren 👋");
const hash = await wallets.sendTransaction({ to: "0x1234...abcd" as any, value: "0x2386f26fc10000" /* 0.01 ETH */ });

// 断开
await wallets.disconnect();
off();
```

---

## API

### `new Web3Wallets(options)`
```ts
type Web3WalletsOptions = {
  connectors: ConnectorInfo[];
  storageKey?: string;   // 记住上次连接器 id（localStorage）
  autoConnect?: boolean; // 默认 true
};
```

**实例方法**
- `subscribe(fn)`：订阅 `WalletState`
- `get state`：立即读取状态
- `get provider`：底层 EIP-1193 provider
- `get connectors`：当前可用连接器列表
- `connect(connectorOrId)`：连接钱包
- `disconnect()`：断开（尽力 revoke；某些注入钱包仅清状态）
- `request(args)`：直接发 EIP-1193 请求
- `switchChain(chainId, { addIfMissing=true, chain? })`
- `signMessage(message, from?)`
- `signTypedDataV4(address, typedData)`
- `sendTransaction(tx)`

**状态结构**
```ts
type WalletState = {
  status: "disconnected" | "connecting" | "connected";
  accounts: Address[];
  chainId?: number;
  provider?: EIP1193Provider | null;
  connectorId?: string | null;
};
```

---

## 连接器

### `injectedConnector(options?)`
```ts
type InjectedOptions = {
  only?: "metamask" | "coinbase" | "any"; // 限定特定钱包
  get?: () => EIP1193Provider | null;     // 自定义抓取逻辑
};
```
自动从 `window.ethereum`（或多 provider 数组）挑选最合适的注入钱包。

### `externalConnector(id, name, getProvider)`
把任何 **EIP-1193** 兼容的外部 provider 包成连接器（如 WalletConnect/Coinbase SDK）。你负责创建 provider 实例；本库负责连接/事件/状态管理。

---

## Svelte/React 接入提示

这是 **headless** 库：
- 在 **Svelte** 里你可以用 `readable/derived` 包一层，把 `wallets.subscribe` 接成 store。
- 在 **React** 里用 `useSyncExternalStore` 或自写订阅，把状态推进组件树。

---

## 安全与兼容

- 永远 **校验链 ID**（`wallets.state.chainId`）与 DApp 后端预期一致再执行关键逻辑。
- 用户拒绝/取消会以异常形式抛出；请在 UI 层区分展示。
- 注入钱包的 **程序化断开** 并不标准化：`disconnect()` 会尽量 revoke 或清理状态，但某些钱包仍保持“已连接”视图，这属于钱包实现差异。

---

## License

MIT
