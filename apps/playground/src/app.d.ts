// apps/playground/src/app.d.ts
// 让元素支持 on:focusTrapEscape 自定义事件（由 a11y-keys/focusTrap 派发）
declare namespace svelteHTML {
  interface HTMLAttributes<T> {
    'on:focusTrapEscape'?: (e: CustomEvent<void>) => void;
  }
}
