import type { Action } from './types';

export type RovingOptions = {
  /** 参与 roving 的子元素选择器；默认 '[data-roving]' */
  selector?: string;
  /** 焦点在首尾是否环回；默认 true */
  loop?: boolean;
  /** 箭头键方向；默认 'both' */
  orientation?: 'horizontal' | 'vertical' | 'both';
  /** 初始激活索引；默认 0 */
  initial?: number;
};

const DEFAULTS: Required<Omit<RovingOptions, 'initial'>> = {
  selector: '[data-roving]',
  loop: true,
  orientation: 'both'
} as const;

function isFocusable(el: HTMLElement) {
  const style = getComputedStyle(el);
  return !el.hasAttribute('disabled') && style.display !== 'none' && style.visibility !== 'hidden';
}

function getItems(node: HTMLElement, selector: string): HTMLElement[] {
  return Array.from(node.querySelectorAll<HTMLElement>(selector)).filter(isFocusable);
}

export const rovingFocus: Action<HTMLElement, RovingOptions | undefined> = (node, opts) => {
  let o: RovingOptions = { ...DEFAULTS, initial: 0, ...(opts ?? {}) };

  let items: HTMLElement[] = getItems(node, o.selector ?? DEFAULTS.selector);
  let current = Math.min(Math.max(o.initial ?? 0, 0), Math.max(items.length - 1, 0));

  // 防止 MO 自触发；以及 RAF 合批
  let suppressMO = false;
  let raf = 0;

  function applyTabStops() {
    suppressMO = true;
    for (let i = 0; i < items.length; i++) {
      const desired = i === current ? 0 : -1;
      if (items[i].tabIndex !== desired) items[i].tabIndex = desired;
    }
    suppressMO = false;
  }

  function focusAt(i: number) {
    if (!items.length) return;
    current = i;
    applyTabStops();
    items[current]?.focus();
  }

  function move(delta: number) {
    if (!items.length) return;
    let next = current + delta;
    if (o.loop ?? true) next = (next + items.length) % items.length;
    else next = Math.max(0, Math.min(items.length - 1, next));
    focusAt(next);
  }

  function onKeydown(e: KeyboardEvent) {
    if (!items.length) return;

    const horiz = o.orientation === 'horizontal' || o.orientation === 'both';
    const vert = o.orientation === 'vertical' || o.orientation === 'both';

    switch (e.key) {
      case 'ArrowRight':
        if (horiz) { e.preventDefault(); move(+1); }
        break;
      case 'ArrowLeft':
        if (horiz) { e.preventDefault(); move(-1); }
        break;
      case 'ArrowDown':
        if (vert) { e.preventDefault(); move(+1); }
        break;
      case 'ArrowUp':
        if (vert) { e.preventDefault(); move(-1); }
        break;
      case 'Home':
        e.preventDefault(); focusAt(0);
        break;
      case 'End':
        e.preventDefault(); focusAt(items.length - 1);
        break;
    }
  }

  function onClick(e: MouseEvent) {
    const t = e.target as HTMLElement | null;
    if (!t) return;
    const i = items.indexOf(t.closest(o.selector ?? DEFAULTS.selector) as HTMLElement);
    if (i >= 0) focusAt(i);
  }

  function onFocusin(e: FocusEvent) {
    const t = e.target as HTMLElement | null;
    if (!t) return;
    const i = items.indexOf(t.closest(o.selector ?? DEFAULTS.selector) as HTMLElement);
    if (i >= 0 && i !== current) {
      current = i;
      applyTabStops();
    }
  }

  // 初始态
  applyTabStops();

  // 仅监听「我们不控制」的变化，避免自触发：不监听 tabindex！
  const mo = new MutationObserver(() => {
    if (suppressMO) return;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      items = getItems(node, o.selector ?? DEFAULTS.selector);
      if (current >= items.length) current = Math.max(0, items.length - 1);
      applyTabStops();
    });
  });
  mo.observe(node, {
    subtree: true,
    childList: true,
    attributes: true,
    // ⚠️ 不要监听 'tabindex'；这些是我们自己写入的
    attributeFilter: ['disabled', 'aria-disabled', 'hidden', 'style', 'class']
  });

  node.addEventListener('keydown', onKeydown);
  node.addEventListener('click', onClick);
  node.addEventListener('focusin', onFocusin);

  return {
    update(next) {
      o = { ...DEFAULTS, initial: o.initial, ...(next ?? {}) };
      items = getItems(node, o.selector ?? DEFAULTS.selector);
      current = Math.min(Math.max(o.initial ?? current ?? 0, 0), Math.max(items.length - 1, 0));
      applyTabStops();
    },
    destroy() {
      node.removeEventListener('keydown', onKeydown);
      node.removeEventListener('click', onClick);
      node.removeEventListener('focusin', onFocusin);
      mo.disconnect();
      cancelAnimationFrame(raf);
    }
  };
};
