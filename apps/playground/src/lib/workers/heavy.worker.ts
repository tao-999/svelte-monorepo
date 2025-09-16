import { expose } from '@sv-kit/workerify';

/** 计数 ≤ limit 的素数个数（只筛奇数，提高速度与内存效率） */
export function countPrimes(limit: number): number {
  limit = Math.max(0, Math.floor(limit || 0));
  if (limit < 2) return 0;
  if (limit === 2) return 1;

  // 只存奇数：index i 表示数字 (2*i + 3)
  const size = ((limit - 1) >> 1);
  const comp = new Uint8Array(size); // 0=prime, 1=composite
  const r = Math.floor(Math.sqrt(limit));

  for (let n = 3; n <= r; n += 2) {
    if (comp[(n - 3) >> 1]) continue;
    const step = n;
    let j = ((n * n) - 3) >> 1; // 从 n*n 开始
    for (; j < size; j += step) comp[j] = 1;
  }

  // prime 2 + 未标记的奇数
  let count = 1;
  for (let i = 0; i < size; i++) if (!comp[i]) count++;
  return count;
}

/** 选配：矩阵乘法（O(n^3)），返回 checksum，避免传大数组 */
export function matmul(n: number): { n: number; checksum: number } {
  n = Math.max(1, Math.floor(n || 0));
  const N = n * n;
  const A = new Float64Array(N);
  const B = new Float64Array(N);
  const C = new Float64Array(N);
  for (let i = 0; i < N; i++) { A[i] = (i % 100) / 100; B[i] = ((i * 7) % 100) / 100; }
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < n; k++) {
      const aik = A[i * n + k];
      for (let j = 0; j < n; j++) C[i * n + j] += aik * B[k * n + j];
    }
  }
  let sum = 0; for (let i = 0; i < N; i++) sum += C[i];
  return { n, checksum: Number(sum.toFixed(4)) };
}

/** 选配：纯忙等，演示“主线程不卡顿” */
export function burnMs(ms: number): number {
  const end = performance.now() + Math.max(0, (ms | 0));
  while (performance.now() < end) {}
  return ms;
}

expose({ countPrimes, matmul, burnMs });
