# @svelte-kits/a11y-keys

Composable a11y helpers for Svelte：**roving focus**（罗盘式焦点）、**focus trap**（焦点陷阱）、**keyboard shortcuts**（快捷键）、**screen-reader announcer**（读屏播报）。
零依赖、可组合、SSR 安全，适配 Svelte 4/5。🧩♿

- 💡 **rovingFocus**：用方向键在一组按钮/菜单项之间移动焦点（WAI-ARIA 实战套路）
- 🪤 **focusTrap**：限制 Tab 焦点在对话框内循环，支持 `Esc` 退出事件
- 🎹 **shortcut**：声明式键盘快捷键映射，支持 `Ctrl+K`、`Alt+ArrowDown` 等组合
- 🔈 **createAnnouncer**：屏幕阅读器播报（polite / assertive）

> 本包内置 `Action` 类型定义，不依赖 `svelte/action` 类型；正常使用无需额外配置。

---

## 安装

```bash
pnpm add @svelte-kits/a11y-keys
# 或 npm i / yarn add
```

**Peer deps：** `svelte: ^4 || ^5`

---

## 快速上手

### 1) rovingFocus（罗盘式焦点）

```svelte
<script lang="ts">
  import { rovingFocus } from '@svelte-kits/a11y-keys';
</script>

<ul use:rovingFocus={{ selector: '[data-roving]', orientation: 'horizontal' }} role="toolbar" aria-label="Formatting">
  <li><button data-roving aria-label="Bold">B</button></li>
  <li><button data-roving aria-label="Italic">I</button></li>
  <li><button data-roving aria-label="Underline">U</button></li>
</ul>
```

- 方向键左右/上下移动焦点；`Home/End` 跳首尾
- 自动设置 `tabIndex`，仅当前项可 Tab 进入，其他项用方向键导航

---

### 2) focusTrap（焦点陷阱）

```svelte
<script lang="ts">
  import { focusTrap } from '@svelte-kits/a11y-keys';
  let open = true;
</script>

{#if open}
  <div role="dialog" aria-modal="true" aria-label="Settings"
       use:focusTrap={{ initialFocus: '.confirm' }}
       on:focusTrapEscape={() => (open = false)}
       class="modal">
    <h2>Settings</h2>
    <input placeholder="Name" />
    <button class="confirm">OK</button>
    <button on:click={() => (open = false)}>Cancel</button>
  </div>
{/if}
```

- `Esc` 默认触发自定义事件 `focusTrapEscape`
- `initialFocus` 可传选择器 / 元素 / 函数
- 销毁时自动恢复到进入前的聚焦元素

---

### 3) shortcut（键盘快捷键）

```svelte
<script lang="ts">
  import { shortcut } from '@svelte-kits/a11y-keys';

  const map = {
    'Ctrl+K': () => (open = true),
    'Alt+ArrowDown': () => selectNext(),
    'Shift+?': () => (showHelp = true)
  };
</script>

<div use:shortcut={{ map, target: 'window' }} />
```

- 组合写法支持：`Ctrl|Control`、`Alt|Option`、`Shift`、`Meta|Cmd|Command|Super`
- 方向键写法：`ArrowUp/Down/Left/Right`；支持 `Space`、`Escape` 等
- 默认 **不**在输入框内激活（避免劫持输入），可通过 `activeInInputs: true` 开启

---

### 4) createAnnouncer（读屏播报）

```svelte
<script lang="ts">
  import { createAnnouncer } from '@svelte-kits/a11y-keys';
  const sr = createAnnouncer();
  function save() {
    // ...保存逻辑
    sr.announce('已保存');              // polite
    // sr.announce('错误：网络中断', 'assertive'); // 更紧急
  }
</script>

<button on:click={save}>Save</button>
```

---

## API

### `rovingFocus(node, options?)`
- `selector`：参与 roving 的子元素选择器（默认 `"[data-roving]"`）
- `loop`：是否首尾环回（默认 `true`）
- `orientation`：`"horizontal" | "vertical" | "both"`（默认 `"both"`）
- `initial`：初始激活索引（默认 `0`）

**可访问性建议**
- 对容器使用合适的语义：如 `role="toolbar" | "tablist" | "menubar"`
- 子项按钮配合 `aria-label` 或可见文本

---

### `focusTrap(node, options?)`
- `enabled`：启用/禁用（默认 `true`）
- `initialFocus`：初始聚焦元素（元素 / 选择器 / 函数）
- `exitOnEscape`：是否监听 `Esc` 并派发 `focusTrapEscape`（默认 `true`）
- `restoreFocus`：销毁时恢复之前焦点（默认 `true`）

**事件**
- `focusTrapEscape`：用户按下 `Esc` 时触发（你可用它来关闭对话框）

---

### `shortcut(node, options)`
- `map`：`Record<string, (e: KeyboardEvent) => void>`，键为组合字符串
- `target`：`'element' | 'document' | 'window'`（默认 `'element'`）
- `preventDefault`：默认 `true`
- `stopPropagation`：默认 `true`
- `activeInInputs`：输入控件内是否生效（默认 `false`）
- `repeat`：是否允许长按重复触发（默认 `false`）
- `enabled`：是否启用（默认 `true`）

**支持的组合**
`Ctrl`/`Control`、`Alt`/`Option`、`Shift`、`Meta`/`Cmd`/`Command`/`Super`
`ArrowUp/Down/Left/Right`、`Space`、`Enter`、`Escape`、`Delete` 等

---

### `createAnnouncer()`
返回：
- `announce(text: string, mode?: 'polite' | 'assertive')`
- `destroy()`

内部会在 `document.body` 添加两个隐藏的 live region：`aria-live="polite"` 与 `aria-live="assertive"`。

---

## SSR / 性能 / 细节

- **SSR 安全**：Actions 仅在浏览器运行；在 SvelteKit 中直接使用即可。
- **MutationObserver**：`rovingFocus` 监听子元素变化，自动维护 `tabIndex`。
- **可组合**：`shortcut` 可挂在 `window`，`focusTrap` 与 `createAnnouncer` 可同时使用。
- **类型**：包内自带 `Action` 类型；不需要 `svelte/action` 类型依赖。

---

## 示例样式建议（可选）

```css
/* 仅示意：被 roving 激活的元素可加入可见状态 */
[tabindex="0"][data-roving] {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}
.modal {
  position: fixed; inset: 0; display: grid; place-items: center;
  background: rgba(0,0,0,.4);
}
```

---

## 版本与许可

- **Node ≥ 18**
- **Svelte 4/5**
- License：**MIT**

> 贡献建议：新增组件场景的预设（如 `menu`、`tablist`）、`rovingFocus` 的垂直/二维网格导航、以及 `shortcut` 的作用域（分区）支持。欢迎 PR！
