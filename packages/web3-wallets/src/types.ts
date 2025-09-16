export type Hex = `0x${string}`;
export type Address = `0x${string}`;

export interface EIP1193Provider {
  request(args: { method: string; params?: unknown[] | object }): Promise<any>;
  on?(event: string, listener: (...args: any[]) => void): void;
  removeListener?(event: string, listener: (...args: any[]) => void): void;
  // 常见识别
  isMetaMask?: boolean;
  isCoinbaseWallet?: boolean;
}

export type Chain = {
  id: number;            // e.g. 1 for Ethereum mainnet
  name?: string;
  rpcUrls?: string[];
  nativeCurrency?: { name: string; symbol: string; decimals: number };
  blockExplorers?: { name: string; url: string }[];
};

export type WalletStatus = "disconnected" | "connecting" | "connected";

export type WalletState = {
  status: WalletStatus;
  accounts: Address[];
  chainId?: number;
  provider?: EIP1193Provider | null;
  connectorId?: string | null;
};

export type ConnectorInfo = {
  id: string;
  name: string;
  ready(): boolean;
  getProvider(): Promise<EIP1193Provider | null>;
  connect(): Promise<{ provider: EIP1193Provider; accounts: Address[]; chainId: number }>;
  disconnect?(): Promise<void>;
};

export type SwitchChainOptions = {
  addIfMissing?: boolean; // 默认 true：遇到 4902 自动 addChain
  chain?: Chain;          // addChain 所需信息
};

export type RequestArguments = { method: string; params?: unknown[] | object };

export type Listener<T> = (v: T) => void;
