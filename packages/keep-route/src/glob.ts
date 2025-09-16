/** 极简 glob 匹配：支持 ** 和 * */
export function globMatch(pattern: string, input: string) {
  // 转成正则
  const re = new RegExp("^" + pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "___GLOBSTAR___")
    .replace(/\*/g, "[^/]*")
    .replace(/___GLOBSTAR___/g, ".*")
  + "$");
  return re.test(input);
}

export function matchAny(patterns: string[] | undefined, input: string) {
  if (!patterns || patterns.length === 0) return false;
  return patterns.some(p => globMatch(p, input));
}
