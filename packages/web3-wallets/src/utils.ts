import type { EIP1193Provider, Hex, RequestArguments } from "./types";

export const isBrowser = typeof window !== "undefined" && typeof document !== "undefined";

export function hexToNumber(hex: Hex | string): number {
  const h = String(hex);
  return Number.parseInt(h.startsWith("0x") ? h.slice(2) : h, 16);
}

export function numberToHex(n: number): Hex {
  return ("0x" + n.toString(16)) as Hex;
}

export async function safeRequest<T = any>(provider: EIP1193Provider, args: RequestArguments): Promise<T> {
  return provider.request(args);
}

/** ✅ 统一处理单/多 provider；优先 MetaMask → Coinbase → 第一个 */
export function pickInjectedProvider(): EIP1193Provider | null {
  const anyWin = isBrowser ? (window as any) : {};
  let eth = anyWin.ethereum as any;

  // 无论 eth 是否存在，都尝试读取 providers 数组（EIP-6963 多钱包）
  const provs = Array.isArray(eth?.providers) ? eth.providers : null;
  if (provs && provs.length) {
    eth = provs.find((p: any) => p?.isMetaMask)
       ?? provs.find((p: any) => p?.isCoinbaseWallet)
       ?? provs[0];
  }

  // 回退到单 provider
  if (!eth && anyWin.ethereum) eth = anyWin.ethereum;

  return (eth ?? null) as EIP1193Provider | null;
}

export function once<T extends (...a: any[]) => void>(fn: T): T {
  let used = false;
  return ((...a: any[]) => {
    if (used) return;
    used = true;
    return fn(...a);
  }) as T;
}

export function u8ToHex(u8: Uint8Array): `0x${string}` {
  let hex = '';
  for (let i = 0; i < u8.length; i++) {
    hex += u8[i].toString(16).padStart(2, '0');
  }
  return ('0x' + hex) as `0x${string}`;
}
