export type Announcer = {
  /** 播报文本；mode 默认 'polite' */
  announce: (text: string, mode?: 'polite' | 'assertive') => void;
  destroy: () => void;
};

function srStyles(el: HTMLElement) {
  Object.assign(el.style, {
    position: 'absolute',
    width: '1px',
    height: '1px',
    margin: '-1px',
    border: '0',
    padding: '0',
    clip: 'rect(0 0 0 0)',
    clipPath: 'inset(50%)',
    overflow: 'hidden',
    whiteSpace: 'nowrap'
  } as CSSStyleDeclaration);
}

export function createAnnouncer(): Announcer {
  const polite = document.createElement('div');
  const assertive = document.createElement('div');
  polite.setAttribute('role', 'status');
  polite.setAttribute('aria-live', 'polite');
  assertive.setAttribute('role', 'alert');
  assertive.setAttribute('aria-live', 'assertive');
  srStyles(polite);
  srStyles(assertive);
  document.body.appendChild(polite);
  document.body.appendChild(assertive);

  let toggle = false;

  function announce(text: string, mode: 'polite' | 'assertive' = 'polite') {
    const el = mode === 'assertive' ? assertive : polite;
    // 为了同样文本能再次播报，交替写入空格
    el.textContent = toggle ? '' : ' ';
    toggle = !toggle;
    // 下一帧写入真正内容
    requestAnimationFrame(() => { el.textContent = text; });
  }

  function destroy() {
    polite.remove();
    assertive.remove();
  }

  return { announce, destroy };
}
