import { expose } from '@svelte-kits/workerify';

async function sha256Hex(buf: ArrayBuffer) {
  const dig = await crypto.subtle.digest('SHA-256', buf);
  return [...new Uint8Array(dig)].map(b => b.toString(16).padStart(2,'0')).join('');
}

export function fib(n: number): number {
  n = Math.max(0, Math.floor(n || 0));
  if (n <= 1) return n;
  let a = 0, b = 1;
  for (let i = 2; i <= n; i++) {
    const t = a + b;
    a = b;
    b = t;
  }
  return b;
}

expose({ sha256Hex, fib });
