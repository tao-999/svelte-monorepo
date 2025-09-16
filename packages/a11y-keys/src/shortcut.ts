// packages/a11y-keys/src/shortcut.ts
import type { Action } from './types';

export type ShortcutMap = Record<string, (e: KeyboardEvent) => void>;

export type ShortcutOptions = {
  map: ShortcutMap;
  target?: 'window' | 'document' | 'element';
  preventDefault?: boolean;
  stopPropagation?: boolean;
  activeInInputs?: boolean;
  repeat?: boolean;
  enabled?: boolean;
};

type Combo = {
  key: string;
  alt: boolean;
  ctrl: boolean;
  meta: boolean;
  shift: boolean;
};

function normalizeKey(k: string) {
  const specials: Record<string, string> = {
    ' ': 'Space',
    Spacebar: 'Space',
    Esc: 'Escape',
    Up: 'ArrowUp',
    Down: 'ArrowDown',
    Left: 'ArrowLeft',
    Right: 'ArrowRight',
    Return: 'Enter',
    Del: 'Delete'
  };
  return specials[k] ?? (k.length === 1 ? k.toUpperCase() : k);
}

function parseCombo(s: string): Combo {
  const parts = s.split('+').map((p) => p.trim());
  let combo: Combo = { key: '', alt: false, ctrl: false, meta: false, shift: false };
  for (const p of parts) {
    const up = p.toUpperCase();
    if (up === 'CTRL' || up === 'CONTROL') combo.ctrl = true;
    else if (up === 'ALT' || up === 'OPTION') combo.alt = true;
    else if (up === 'SHIFT') combo.shift = true;
    else if (up === 'META' || up === 'CMD' || up === 'COMMAND' || up === 'SUPER') combo.meta = true;
    else combo.key = normalizeKey(p);
  }
  return combo;
}

function match(e: KeyboardEvent, c: Combo) {
  const key = normalizeKey(e.key);
  return key === c.key && e.altKey === c.alt && e.ctrlKey === c.ctrl && e.metaKey === c.meta && e.shiftKey === c.shift;
}

function isTextInput(el: Element | null) {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || el.isContentEditable || tag === 'select';
}

export const shortcut: Action<HTMLElement, ShortcutOptions> = (node, opts) => {
  let o: Required<ShortcutOptions> = {
    map: opts?.map ?? {},
    target: opts?.target ?? 'element',
    preventDefault: opts?.preventDefault ?? true,
    stopPropagation: opts?.stopPropagation ?? true,
    activeInInputs: opts?.activeInInputs ?? false,
    repeat: opts?.repeat ?? false,
    enabled: opts?.enabled ?? true
  };

  const parsed = new Map<string, Combo>();
  function rebuild() {
    parsed.clear();
    for (const k of Object.keys(o.map)) parsed.set(k, parseCombo(k));
  }
  rebuild();

  const handler = (e: KeyboardEvent) => {
    if (!o.enabled) return;
    if (!o.repeat && e.repeat) return;
    if (!o.activeInInputs && isTextInput(document.activeElement)) return;

    for (const [comboStr, cb] of Object.entries(o.map)) {
      const c = parsed.get(comboStr)!;
      if (match(e, c)) {
        if (o.preventDefault) e.preventDefault();
        if (o.stopPropagation) e.stopPropagation();
        cb(e);
        break;
      }
    }
  };

  const target: EventTarget = o.target === 'window' ? window : o.target === 'document' ? document : node;
  target.addEventListener('keydown', handler as EventListener);

  return {
    update(next) {
      o = { ...o, ...(next ?? {}) };
      rebuild();
    },
    destroy() {
      target.removeEventListener('keydown', handler as EventListener);
    }
  };
};
