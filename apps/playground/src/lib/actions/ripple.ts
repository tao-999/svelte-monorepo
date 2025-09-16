// src/lib/actions/ripple.ts
export type ActionReturn = { destroy(): void };

/** Material-like 按钮涟漪 */
export function ripple(node: HTMLElement): ActionReturn {
  function onPointerDown(e: PointerEvent) {
    const rect = node.getBoundingClientRect();
    const d = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - d / 2;
    const y = e.clientY - rect.top - d / 2;

    const span = document.createElement('span');
    span.className = 'md-ripple';
    span.style.width = `${d}px`;
    span.style.height = `${d}px`;
    span.style.left = `${x}px`;
    span.style.top = `${y}px`;
    node.appendChild(span);

    const cleanup = () => span.remove();
    span.addEventListener('animationend', cleanup, { once: true });
  }

  node.addEventListener('pointerdown', onPointerDown);
  return {
    destroy() {
      node.removeEventListener('pointerdown', onPointerDown);
    }
  };
}
