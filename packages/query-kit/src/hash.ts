// packages/query-kit/src/hash.ts
// 稳定 JSON 序列化（无依赖）：键排序、跳过 undefined / function / symbol
export function stableHash(key: unknown): string {
  if (typeof key === "string") return key;
  const seen = new WeakSet();
  const s = stringify(key);
  // 便于前缀匹配：加上简短长度信息防冲突（随意）
  return "q$" + s;
  function stringify(x: any): string {
    const t = typeof x;
    if (x === null || t === "number" || t === "boolean") return JSON.stringify(x);
    if (t === "string") return JSON.stringify(x);
    if (t === "bigint") return `"${x.toString()}n"`;
    if (t === "function" || t === "symbol" || x === undefined) return '"~"';
    if (Array.isArray(x)) return "[" + x.map(stringify).join(",") + "]";
    if (t === "object") {
      if (seen.has(x)) return '"~circular~"';
      seen.add(x);
      const keys = Object.keys(x).sort();
      const body = keys.map(k => JSON.stringify(k) + ":" + stringify(x[k])).join(",");
      return "{" + body + "}";
    }
    return JSON.stringify(String(x));
  }
}
