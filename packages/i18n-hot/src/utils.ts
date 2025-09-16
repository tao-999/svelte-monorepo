export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
export const nowIso = () => new Date().toISOString();

export function placeholders(s: string): string[] {
  // 解析 {foo} 型占位符，简单够用
  const m = s.match(/\{[a-zA-Z0-9_.$]+\}/g) || [];
  return [...new Set(m.map(x => x.slice(1, -1)))];
}

export function format(template: string, params: Record<string, unknown> = {}): string {
  return template.replace(/\{([a-zA-Z0-9_.$]+)\}/g, (_m, key) => {
    const v = getByPath(params, key);
    return v == null ? "" : String(v);
  });
}

function getByPath(obj: any, path: string): unknown {
  const parts = path.split(".");
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

export function shallowEqual(a: any, b: any) {
  if (a === b) return true;
  if (!a || !b) return false;
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  for (const k of ak) if (a[k] !== b[k]) return false;
  return true;
}
