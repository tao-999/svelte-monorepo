// packages/a11y-keys/src/types.ts
// 兼容 Svelte 的 Action 形状，避免从 'svelte/action' 引入类型
export type Action<El extends HTMLElement = HTMLElement, P = any> =
  (node: El, parameter?: P) => {
    update?: (parameter?: P) => void;
    destroy?: () => void;
  };
