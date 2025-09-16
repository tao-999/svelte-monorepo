import type { ConnectorInfo, EIP1193Provider, Address } from "../types";
import { isBrowser, pickInjectedProvider, hexToNumber, safeRequest } from "../utils";

export type InjectedOptions = {
  // 是否只接受特定钱包
  only?: "metamask" | "coinbase" | "any";
  get?: () => EIP1193Provider | null; // 自定义获取逻辑
};

export function injectedConnector(opts?: InjectedOptions): ConnectorInfo {
  return {
    id: "injected",
    name: "Injected",
    ready() {
      if (!isBrowser) return false;
      const p = (opts?.get?.() ?? pickInjectedProvider()) as any;
      if (!p) return false;
      if (opts?.only === "metamask") return !!p.isMetaMask;
      if (opts?.only === "coinbase") return !!p.isCoinbaseWallet;
      return true;
    },
    async getProvider() {
      if (!isBrowser) return null;
      return (opts?.get?.() ?? pickInjectedProvider()) ?? null;
    },
    async connect() {
      const provider = await this.getProvider();
      if (!provider) throw new Error("No injected provider found");
      // eth_requestAccounts 触发授权弹窗
      const accounts = (await safeRequest<Address[]>(provider, { method: "eth_requestAccounts" })) as Address[];
      const chainHex: string = await safeRequest(provider, { method: "eth_chainId" });
      const chainId = hexToNumber(chainHex);
      return { provider, accounts, chainId };
    },
    async disconnect() {
      // 大多数注入钱包不支持程序化断开，这里尽量 revoke
      const provider = await this.getProvider();
      try {
        // EIP-2255 (可选) 部分钱包实现
        await safeRequest(provider!, {
          method: "wallet_revokePermissions",
          params: [{ eth_accounts: {} } as any]
        });
      } catch {
        /* 忽略 */
      }
    }
  };
}
