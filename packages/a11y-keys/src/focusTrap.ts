// packages/a11y-keys/src/focusTrap.ts
import type { Action } from './types';

export type FocusTrapOptions = {
  /** 开启/关闭；默认 true */
  enabled?: boolean;
  /** 初始聚焦：元素/选择器/函数 */
  initialFocus?: HTMLElement | string | (() => HTMLElement | null | undefined);
  /** 按 Esc 是否触发自定义事件 'focusTrapEscape'；默认 true */
  exitOnEscape?: boolean;
  /** 销毁时是否恢复到进入前的聚焦元素；默认 true */
  restoreFocus?: boolean;
};

function getFocusable(container: HTMLElement): HTMLElement[] {
  const SEL = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]'
  ].join(',');

  const all = Array.from(container.querySelectorAll<HTMLElement>(SEL));
  return all.filter((el) => {
    const style = getComputedStyle(el);
    return style.visibility !== 'hidden' && style.display !== 'none' && !el.hasAttribute('disabled');
  });
}

function resolveInitial(node: HTMLElement, init?: FocusTrapOptions['initialFocus']): HTMLElement | null {
  if (!init) return getFocusable(node)[0] ?? null;
  if (typeof init === 'function') return init() ?? null;
  if (typeof init === 'string') return node.querySelector<HTMLElement>(init);
  return init ?? null;
}

export const focusTrap: Action<HTMLElement, FocusTrapOptions | undefined> = (node, opts) => {
  let o: Required<FocusTrapOptions> = {
    enabled: true,
    exitOnEscape: true,
    restoreFocus: true,
    initialFocus: opts?.initialFocus ?? undefined
  } as any;

  let prevActive: Element | null = null;

  function enable() {
    if (!o.enabled) return;
    prevActive = document.activeElement;
    const target = resolveInitial(node, o.initialFocus) ?? node;
    queueMicrotask(() => target.focus({ preventScroll: true }));

    document.addEventListener('keydown', onKeydown, true);
    document.addEventListener('focusin', onFocusIn, true);
  }

  function disable() {
    document.removeEventListener('keydown', onKeydown, true);
    document.removeEventListener('focusin', onFocusIn, true);
    if (o.restoreFocus && prevActive instanceof HTMLElement) {
      prevActive.focus({ preventScroll: true });
    }
  }

  function onKeydown(e: KeyboardEvent) {
    if (!o.enabled) return;

    if (e.key === 'Escape' && o.exitOnEscape) {
      node.dispatchEvent(new CustomEvent('focusTrapEscape'));
      e.stopPropagation();
      e.preventDefault();
      return;
    }

    if (e.key !== 'Tab') return;

    const f = getFocusable(node);
    if (f.length === 0) {
      e.preventDefault();
      return;
    }
    const first = f[0];
    const last = f[f.length - 1];

    const active = document.activeElement as HTMLElement | null;

    if (e.shiftKey) {
      if (active === first || !node.contains(active)) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (active === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  function onFocusIn(ev: FocusEvent) {
    if (!o.enabled) return;
    if (!node.contains(ev.target as Node)) {
      const f = getFocusable(node);
      (f[0] ?? node).focus({ preventScroll: true });
    }
  }

  enable();

  return {
    update(next) {
      const wasEnabled = o.enabled;
      o = { ...o, ...(next ?? {}) };
      if (o.enabled && !wasEnabled) enable();
      if (!o.enabled && wasEnabled) disable();
    },
    destroy() {
      disable();
    }
  };
};
