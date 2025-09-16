export class LRU<K, V> {
  private map = new Map<K, V>();
  constructor(private max: number) {}

  get(k: K): V | undefined {
    const v = this.map.get(k);
    if (v !== undefined) {
      this.map.delete(k);
      this.map.set(k, v);
    }
    return v;
  }
  set(k: K, v: V) {
    if (this.map.has(k)) this.map.delete(k);
    this.map.set(k, v);
    if (this.map.size > this.max) {
      const first = this.map.keys().next().value as K;
      this.map.delete(first);
    }
  }
  has(k: K) { return this.map.has(k); }
  delete(k: K) { return this.map.delete(k); }
}
