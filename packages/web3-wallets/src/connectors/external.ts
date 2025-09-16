import type { ConnectorInfo, EIP1193Provider, Address } from "../types";
import { hexToNumber, safeRequest } from "../utils";

/** 包一层外部 EIP-1193 Provider（WalletConnect、Coinbase SDK 等） */
export function externalConnector(id: string, name: string, getProvider: () => Promise<EIP1193Provider> | EIP1193Provider): ConnectorInfo {
  return {
    id,
    name,
    ready() { return true; },
    async getProvider() {
      return await getProvider();
    },
    async connect() {
      const provider = await getProvider();
      const accounts = (await safeRequest<Address[]>(provider, { method: "eth_requestAccounts" })) as Address[];
      const chainHex: string = await safeRequest(provider, { method: "eth_chainId" });
      return { provider, accounts, chainId: hexToNumber(chainHex) };
    },
    async disconnect() {
      const p: any = await getProvider();
      // 有些 SDK 含有 disconnect/close
      if (typeof p.disconnect === "function") { try { await p.disconnect(); } catch {} }
      if (typeof p.close === "function") { try { await p.close(); } catch {} }
    }
  };
}
