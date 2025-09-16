import { expose } from '@svelte-kits/workerify';

async function sha256Hex(buf: ArrayBuffer) {
  const dig = await crypto.subtle.digest('SHA-256', buf);
  return [...new Uint8Array(dig)].map(b => b.toString(16).padStart(2,'0')).join('');
}

function fib(n: number): number {
  return n <= 1 ? n : fib(n - 1) + fib(n - 2);
}

expose({ sha256Hex, fib });
