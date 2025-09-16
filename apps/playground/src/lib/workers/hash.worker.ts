import { expose } from '@sv-kit/workerify';

async function sha256Hex(buf: ArrayBuffer) {
  const dig = await crypto.subtle.digest('SHA-256', buf);
  return [...new Uint8Array(dig)].map(b => b.toString(16).padStart(2,'0')).join('');
}

expose({ sha256Hex });
