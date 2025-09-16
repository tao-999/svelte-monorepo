import type {
  Address, Chain, ConnectorInfo, EIP1193Provider, Listener, RequestArguments, SwitchChainOptions, WalletState
} from "./types";
import { hexToNumber, numberToHex, safeRequest, u8ToHex } from "./utils";

/** 极简可订阅 store（不依赖框架） */
class Store<T> {
  private v: T;
  private subs = new Set<Listener<T>>();
  constructor(v: T) { this.v = v; }
  get() { return this.v; }
  set(n: T) { this.v = n; for (const s of [...this.subs]) s(this.v); }
  subscribe(fn: Listener<T>) { this.subs.add(fn); fn(this.v); return () => this.subs.delete(fn); }
}

export type Web3WalletsOptions = {
  connectors: ConnectorInfo[];
  storageKey?: string;         // 记住上次连接的 connectorId
  autoConnect?: boolean;       // 默认 true：初始化尝试重连
};

type ProviderEvents = {
  accountsChanged?: (accs: Address[]) => void;
  chainChanged?: (chainIdHex: string) => void;
  disconnect?: (...a: any[]) => void;
  connect?: (...a: any[]) => void;
};

export class Web3Wallets {
  #connectors: ConnectorInfo[];
  #storageKey: string;
  #state = new Store<WalletState>({ status: "disconnected", accounts: [], provider: null, chainId: undefined, connectorId: null });
  #boundHandlers?: ProviderEvents;
  #provider?: EIP1193Provider | null;

  constructor(opts: Web3WalletsOptions) {
    this.#connectors = opts.connectors;
    this.#storageKey = opts.storageKey ?? "web3:wallets:last";
    if (opts.autoConnect ?? true) {
      const last = typeof localStorage !== "undefined" ? localStorage.getItem(this.#storageKey) : null;
      if (last) this.connect(last).catch(()=>{});
    }
  }

  // —— 订阅与状态 —— //
  subscribe(fn: Listener<WalletState>) { return this.#state.subscribe(fn); }
  get state() { return this.#state.get(); }
  get provider() { return this.#provider ?? null; }
  get connectors() { return [...this.#connectors]; }

  // —— 基础 RPC —— //
  request<T = any>(args: RequestArguments): Promise<T> {
    if (!this.#provider) throw new Error("No provider");
    return this.#provider.request(args);
  }

  // —— 连接/断开 —— //
  async connect(connectorOrId: string | ConnectorInfo) {
    const c = typeof connectorOrId === "string" ? this.#connectors.find(x => x.id === connectorOrId) : connectorOrId;
    if (!c) throw new Error("Connector not found");
    if (!c.ready()) throw new Error(`Connector ${c.id} not ready`);

    this.#state.set({ ...this.#state.get(), status: "connecting" });
    const { provider, accounts, chainId } = await c.connect();

    // 解绑旧监听，绑新监听
    this.#unbind();
    this.#bind(provider);

    this.#provider = provider;
    this.#state.set({ status: "connected", accounts, chainId, provider, connectorId: c.id });

    try { localStorage?.setItem(this.#storageKey, c.id); } catch {}

    return this.#state.get();
  }

  async disconnect() {
    const st = this.#state.get();
    const c = this.#connectors.find(x => x.id === st.connectorId);
    try { await c?.disconnect?.(); } catch {}
    this.#unbind();
    this.#provider = null;
    this.#state.set({ status: "disconnected", accounts: [], chainId: undefined, provider: null, connectorId: null });
    try { localStorage?.removeItem(this.#storageKey); } catch {}
  }

  // —— 链管理 —— //
  async switchChain(target: number, opts?: SwitchChainOptions) {
    if (!this.#provider) throw new Error("No provider");
    const hex = numberToHex(target);
    try {
      await safeRequest(this.#provider, { method: "wallet_switchEthereumChain", params: [{ chainId: hex }] });
    } catch (e: any) {
      const code = e?.code ?? e?.data?.originalError?.code;
      if ((opts?.addIfMissing ?? true) && code === 4902 /* Unrecognized chain */) {
        const ch = opts?.chain;
        if (!ch?.rpcUrls?.length || !ch?.nativeCurrency) throw new Error("Missing chain info for wallet_addEthereumChain");
        await safeRequest(this.#provider, {
          method: "wallet_addEthereumChain",
          params: [{
            chainId: hex,
            chainName: ch.name ?? `Chain ${target}`,
            rpcUrls: ch.rpcUrls!,
            nativeCurrency: ch.nativeCurrency!,
            blockExplorerUrls: ch.blockExplorers?.map(b => b.url)
          }]
        });
        // 再切一次
        await safeRequest(this.#provider, { method: "wallet_switchEthereumChain", params: [{ chainId: hex }] });
      } else {
        throw e;
      }
    }
    // 成功后本地同步
    const s = this.#state.get();
    this.#state.set({ ...s, chainId: target });
  }

  // —— 签名与交易 —— //
   async signMessage(message: string | Uint8Array, from?: Address) {
    if (!this.#provider) throw new Error("No provider");
    const addr = from ?? this.#state.get().accounts[0];
    if (!addr) throw new Error("No account");

    // personal_sign 通常接受纯文本或 0xHEX；Uint8Array 时我们转成 0xHEX
    const data = typeof message === "string" ? message : u8ToHex(message);

    return this.#provider.request({
      method: "personal_sign",
      params: [data, addr] // 注意顺序：message 在前，address 在后（大多数钱包约定）
    });
  }

  async signTypedDataV4(address: Address, typedData: object) {
    if (!this.#provider) throw new Error("No provider");
    // 部分钱包要求 JSON 字符串
    const payload = JSON.stringify(typedData);
    return this.#provider.request({ method: "eth_signTypedData_v4", params: [address, payload] });
  }

  async sendTransaction(tx: {
    from?: Address; to?: Address; value?: string; data?: string;
    gas?: string; gasPrice?: string; nonce?: string; maxFeePerGas?: string; maxPriorityFeePerGas?: string;
  }) {
    if (!this.#provider) throw new Error("No provider");
    const from = tx.from ?? this.#state.get().accounts[0];
    if (!from) throw new Error("No account");
    const hash: string = await this.#provider.request({ method: "eth_sendTransaction", params: [{ ...tx, from }] });
    return hash as `0x${string}`;
  }

  // —— 内部：事件绑定 —— //
  #bind(p: EIP1193Provider) {
    const onAccounts = (accs: Address[]) => {
      const s = this.#state.get();
      this.#state.set({ ...s, accounts: accs ?? [] });
      if (!accs || accs.length === 0) {
        // 大多数钱包 accounts=[] 视为未连接
        this.disconnect().catch(()=>{});
      }
    };
    const onChain = (hex: string) => {
      const s = this.#state.get();
      this.#state.set({ ...s, chainId: hexToNumber(hex) });
    };
    const onDisconnect = () => {
      this.disconnect().catch(()=>{});
    };
    const onConnect = async () => {
      try {
        const ch = await p.request({ method: "eth_chainId" });
        const acc = await p.request({ method: "eth_accounts" });
        const s = this.#state.get();
        this.#state.set({ ...s, chainId: hexToNumber(ch), accounts: acc ?? [] });
      } catch {}
    };

    this.#boundHandlers = { accountsChanged: onAccounts, chainChanged: onChain, disconnect: onDisconnect, connect: onConnect };
    p.on?.("accountsChanged", onAccounts as any);
    p.on?.("chainChanged", onChain as any);
    p.on?.("disconnect", onDisconnect as any);
    p.on?.("connect", onConnect as any);
  }

  #unbind() {
    const p = this.#provider;
    const h = this.#boundHandlers;
    if (p && h) {
      p.removeListener?.("accountsChanged", h.accountsChanged as any);
      p.removeListener?.("chainChanged", h.chainChanged as any);
      p.removeListener?.("disconnect", h.disconnect as any);
      p.removeListener?.("connect", h.connect as any);
    }
    this.#boundHandlers = undefined;
  }
}
