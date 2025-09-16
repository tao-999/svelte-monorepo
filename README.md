# Svelte Kits Monorepo

现代 Web 的一套 **Headless 工具库**集合：轻依赖、可组合、跨框架（主要面向 Svelte/SvelteKit，也可在任意 TS/JS 环境使用）。当前包含 7 个包，覆盖可访问性、i18n 热更新、路由级保活、数据查询缓存、健壮上传、Web3 钱包与 Web Worker RPC。

> 设计取向：**小而专**、**零或极少依赖**、**ESM 优先**、**类型完备**、**可在浏览器与边缘端稳定运行**。

---

## 包列表（Packages）

> 这里只是用途概览，不展开每个包的 API 示例（详见各自的 `README.md`）。

- **@svelte-kits/a11y-keys** — 无依赖的可访问性动作合集：`rovingFocus`、`focusTrap`、`shortcut`、读屏播报器等（Action 内置类型，避免 `svelte/action` 依赖）。
- **@svelte-kits/i18n-hot** — i18n 热更新内核：远端 Manifest + ETag/304 差量拉取 + 本地缓存 + Svelte stores（也可纯 TS 使用）。
- **@svelte-kits/keep-route** — 路由级保活：为页面/组件生成状态快照并在返回时恢复，含滚动定位、include/exclude、LRU 与可选持久化。
- **@svelte-kits/query-kit** — 无 UI 查询/缓存内核：并发去重、SWR、TTL/GC、重试退避、取消、失效、预取与 SSR 持久化。
- **@svelte-kits/uploader-pro** — 弹性上传器：断点续传、分片/并发、去重与校验、持久化任务；内置 S3/HTTP 适配器，可扩展其他云。
- **@svelte-kits/web3-wallets** — Web3 钱包核心：EIP-1193 连接器（Injected/External）、自动重连、链切换/添加、消息签名与交易发送、事件订阅。
- **@svelte-kits/workerify** — 轻量 Worker RPC：`expose()`/`wrap()`/`workerify(fn)`，支持 Abort 取消、错误序列化与 Transferable 自动收集。

---

## 环境与约定

- **Node ≥ 18**、**pnpm ≥ 8**。
- **ESM** 项目，`tsconfig.base.json` 使用 `moduleResolution: "bundler"`。
- 面向浏览器的包默认不依赖 Node 内置（例如 `Buffer`）；如需二进制转 hex，已提供工具函数（见各包 `utils`）。
- 各包将 **Svelte** 声明为 `peerDependencies: "svelte": "^4 || ^5"`；**根目录**建议把 `svelte@^5` 作为 **devDependency** 安装，便于类型检查与本地构建。

---

## 仓库结构

```
.
├─ packages/
│  ├─ a11y-keys/
│  ├─ i18n-hot/
│  ├─ keep-route/
│  ├─ query-kit/
│  ├─ uploader-pro/
│  ├─ web3-wallets/
│  └─ workerify/
├─ package.json
├─ pnpm-workspace.yaml
├─ tsconfig.base.json
└─ README.md
```

> 如果存在示例应用，可放在 `apps/`（例如 `apps/playground/`），用于手动联调。

---

## 安装与构建

```bash
pnpm i                         # 安装依赖（workspace）
pnpm -r build                  # 构建所有包到各自 dist/
pnpm -r clean                  # 清理 dist（跨平台 Node 脚本）
```

**工作区引用**
在外部应用中使用这些包时，通过 `pnpm` workspace 自动软链接即可；发布后按常规 npm 依赖安装。

---

## 开发流程

- **类型与导入**：源文件使用相对导入（不需要显式 `.js` 扩展），TS 解析由 `moduleResolution: "bundler"` 负责；若编辑器缓存导致“找不到模块”，请重启 TypeScript Server。
- **脚本**：每个包内提供统一的 `clean` 与 `build` 脚本；尽量避免平台相关工具（如 `rimraf`），使用 Node 内置实现跨平台清理。
- **浏览器优先**：涉及 Worker、WebCrypto、File API 等能力时，保证 SSR 安全（仅在浏览器路径上执行），必要时暴露降级逻辑。
- **互相协同**：
  - `workerify` 可为 `uploader-pro`/`image处理` 等重计算移出主线程；
  - `query-kit` 可与任何适配器/HTTP 工具配合，并可在 SSR `dehydrate/hydrate`；
  - `keep-route` 与表单/列表等页面搭配，增强回退体验；
  - `i18n-hot` 支持按版本/ETag 热更新；
  - `web3-wallets` 仅负责状态与请求，UI 自行封装为 store/hook。

---

## 版本与发布（Changesets）

仓库使用 **Changesets**（已在脚手架中配置）：
```bash
pnpm changeset                # 录入变更（选择包、填写说明）
pnpm changeset version        # 根据变更自动升版本并写入 changelog
pnpm -r build                 # 构建所有包
pnpm -r publish --access public
```

> 需要在 CI 或本地设置 `NPM_TOKEN`。发布策略建议：**尽量独立语义化版本**，避免无关包被动 bump。

---

## 质量与兼容

- 浏览器特性：尽量依赖 **标准 API**（例如 `AbortController`、`fetch`、`MessageChannel`、`IndexedDB` 等）；必要时检测存在性并降级。
- TypeScript：所有公共 API 都有类型导出；包与包之间避免循环依赖。
- 可访问性：`a11y-keys` 覆盖常见焦点与快捷键场景，遵循 WAI-ARIA 规范。

---

## 路线图（Roadmap）

- 文档与示例应用完善（`apps/playground`）：为每个包提供可交互演示。
- 可选的 `idb-cache` 持久化适配器（与 `query-kit` 协作）。
- PWA/离线与后台同步工具（与 `uploader-pro`、`query-kit` 协作）。
- 更多存储/云适配器（`uploader-pro`）。

---

## 许可证

MIT © Project Authors

---
**鸣谢**：本仓库聚焦“工程增效 + 运行时体验”的通用能力，欢迎 Issue/PR 讨论边界与扩展点。
