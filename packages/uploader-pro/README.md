# @sv-kit/uploader-pro

分片 / 断点续传 / 秒传（Merkle Hash）/ 并发与重试；**可直传任意云**，通过“适配器（adapter）”切换后端协议。
自带两套适配器：**HTTP 分片（自有后端）**、**S3 兼容多段（S3/R2/Spaces/MinIO/Ceph …）**。
想上其他云（OSS/COS/GCS/七牛/又拍/TUS）？**写 50～100 行适配器就能接**。🧱🚀

---

## ✨ 特性

- 分片上传（默认 5 MiB，可配置）· 并发上传 · 指数退避重试 · 可暂停/恢复/取消
- “秒传” + 断点续传：**Merkle 式文件指纹**（分片 hash → 汇总 hash）+ 本地 manifest + 服务端校验
- 适配器可插拔：**协议/云供应商解耦**，业务不动、一键切换
- 事件回调：`onProgress` / `onState` / `onChunk`，好做 UI
- 纯 TS，无重依赖；Svelte/SvelteKit 里用更顺，但不是 Svelte 专用
- 全局取消：基于 **AbortSignal**，`task.cancel()` 会立刻中断所有进行中的分片请求（不再重试），并调用适配器的 `abort()`（若实现）

---

## 📦 安装

```bash
pnpm add @sv-kit/uploader-pro
# or: npm i / yarn add
```

---

## 🚀 快速开始（任选适配器）

```ts
import {
  UploadTask,
  HttpMultipartAdapter,
  S3MultipartAdapter
} from "@sv-kit/uploader-pro";

// 方案 A：自有后端分片（最通用、最可控）
const http = new HttpMultipartAdapter({ baseURL: "/api" });

// 方案 B：S3 兼容直传（S3、R2、Spaces、MinIO、Ceph…）
const s3 = new S3MultipartAdapter({ baseURL: "/api", acl: "public-read" });

const task = new UploadTask(file, {
  chunkSize: 5 * 1024 * 1024,
  concurrency: 4,
  retry: { attempts: 3, baseDelayMs: 600, jitter: true },
  adapter: http // 或 s3 / 其他云适配器
}, {
  onProgress: p => console.log(p.percent + "%"),
  onState: s => console.log("state:", s),
  onChunk: c => console.log("chunk", c.index, "ok?", c.ok)
});

await task.start({ bizId: "example-42" });
// task.pause(); task.resume(); task.cancel();
```

---

## ⛔️ 取消上传（AbortSignal）

本库内置全局取消：`task.cancel()` 会触发 `AbortController.abort()`，让**所有正在进行的分片请求立刻停止**，并将状态切到 `"canceled"`。如果适配器实现了 `abort(sessionId)`，也会被调用以释放后端会话资源。

```ts
const task = new UploadTask(file, {
  chunkSize: 5 * 1024 * 1024,
  concurrency: 4,
  retry: { attempts: 3, baseDelayMs: 600, jitter: true },
  adapter: http // 或 s3 / 自定义适配器
}, { onState: s => console.log(s) });

// …用户点“取消”：
task.cancel(); // 中断所有 in-flight 分片请求，停止后续调度
```

### 自定义适配器如何接入取消？
只需要把 `ctx.signal` 透传给你的 `fetch` 即可：

```ts
// 适配器中的分片上传实现
async uploadChunk(ctx) {
  const res = await fetch(ctx.uploadUrl, {
    method: 'PUT',
    body: ctx.body,
    signal: ctx.signal, // ← 关键：支持 AbortSignal
  });
  return { ok: res.ok, etag: res.headers.get('ETag') ?? undefined };
}
```

> 说明
> - 取消后**不会**进入 `finalize`；如需清理后端临时分片，请在适配器实现 `abort(sessionId)` 并在服务端删除会话。
> - 如果你用 `XMLHttpRequest` 实现直传，需自行处理中止；推荐使用 `fetch` + `signal` 以获得一致体验。

---

## 🔌 适配器总览（多云友好）

| 适配器 | 适用场景 | 后端职责 | 前端行为 |
|---|---|---|---|
| `HttpMultipartAdapter` | 自有后端存临时分片再合并；任意云最终落盘 | `prepare` 返回 `sessionId` + 已有分片；接收 `PUT /upload/:sid/:index`；`complete` 合并 | 前端并发 `PUT` 分片到你后端 |
| `S3MultipartAdapter` | S3 及**兼容 S3 协议**的对象存储（Cloudflare R2、DigitalOcean Spaces、MinIO、Ceph…） | `create` 返回 `uploadId/key` 与每片 **预签名 URL**；`complete` 合并 | 前端直接 `PUT` 到对象存储（收集 ETag） |
| 自定义适配器 | **阿里 OSS / 腾讯 COS / GCS / 七牛 / 又拍 / TUS** 等 | 由你后端按该云的 API 签名/创建会话/合并 | 实现 `prepare/uploadChunk/finalize` 三步即可 |

> **为什么 README 里示例 S3？** 因为 S3 Multipart 是事实标准，**大量云兼容 S3 协议**。但本包并不绑定 S3——换适配器就能换云。

---

## 🧩 接口一眼懂（写你自己的适配器）

```ts
interface UploadAdapter {
  name: string;
  prepare(ctx): Promise<{ sessionId: string; alreadyUploaded?: number[]; uploadUrls?: Record<number,string> }>;
  uploadChunk(ctx): Promise<{ ok: boolean; etag?: string }>;
  finalize(ctx): Promise<{ ok: boolean; url?: string }>;
  abort?(sessionId: string): Promise<void>;
}
```

> 约定俗成：
> - `prepare`：返回上传会话 `sessionId`，可选返回已上传分片（续传/秒传）与每片直传 URL
> - `uploadChunk`：上传分片（成功可回 `etag` 供合并用）
> - `finalize`：服务端合并或调用云端 Complete API
> - `abort`：可选，取消会话释放资源

---

## ☁️ 各云怎么用（除了 S3）

### 1) 阿里云 OSS / 腾讯云 COS
- 两者都提供**各自的 Multipart API**，也在不少场景提供 **S3 兼容端点**。
- **优先选 S3 兼容端点** → 直接用 `S3MultipartAdapter`。
- 若需原生 API：写 `OssAdapter` / `CosAdapter`：
  - `prepare`：后端调用云端“初始化分片上传”，为每个 `partNumber` 生成 **预签名 URL** 返回
  - `uploadChunk`：前端 `PUT` 分片到对应 URL（注意某些云要求 `Content-MD5` 或 `x-oss-*` / `x-cos-*` 头）
  - `finalize`：后端用 `UploadId + Parts(ETag)` 触发合并，返回最终 URL

> 迁移成本：更换适配器即可；业务代码与 UI 零修改。

### 2) Google Cloud Storage（GCS）
- 推荐走 **Resumable Upload**（单会话、多次 `PUT`，用 `Content-Range` 标定偏移）。
- 写 `GcsResumableAdapter`：
  - `prepare`：后端向 GCS 发起 Resumable 会话，返回 `sessionUrl`（你可直接当 `sessionId`）
  - `uploadChunk`：前端对 `sessionUrl` 发送 `PUT`，带 `Content-Range: bytes start-end/total`，分片体在 body
  - `finalize`：最后一片 `PUT` 成功即完成；或让后端确认并回 URL

### 3) 七牛 / 又拍 / 其它对象存储
- 它们均有**分片/断点续传 API**（有的也提供 S3 兼容层）。
- 套路与 OSS/COS 相同：后端生成**短时可用**的上传 URL（或会话），前端按片 `PUT`，收集标识（ETag/ctx），合并完成。

### 4) 通用协议：**TUS**
- 若你想和跨语言/跨云的现成服务对接（`tusd`、`S3-tus-bridge` 等），写 `TusAdapter`：
  - `prepare`：`POST` 创建上传；服务端回 `Location` 为会话 URL
  - `uploadChunk`：使用 `PATCH`，带 `Upload-Offset` 与分片 body
  - `finalize`：Tus 完成由服务端把关，前端可空实现

---

## 🧪 参考后端端点（示例）

### A) HTTP 分片（最通用，自有后端落盘再合并）
- `POST /upload/prepare` → `{ sessionId, alreadyUploaded?: number[] }`
- `PUT  /upload/:sessionId/:index` → 写入第 `index` 片（返回可带 `ETag`）
- `POST /upload/:sessionId/complete` → 合并，返回 `{ ok, url? }`
- `POST /upload/:sessionId/abort`（可选）

### B) S3 兼容直传
- `POST /s3/create` → `{ sessionId, uploadUrls: Record<index,string> }`
- （前端）逐片 `PUT uploadUrls[index]`，收集 `ETag`
- `POST /s3/complete` → 传 `{ sessionId, parts: [{partNumber, etag}] }`，返回 `{ ok, url? }`

> 这些端点**只是示意**；你也可以把 `prepare/complete` 合并到一个 GraphQL mutation、或走 Cloudflare Worker、或任何后端框架。

---

## 🧯 CORS / 安全 / 配置清单

- **CORS**：直传对象存储必须在存储端配置允许：`Origin`、`PUT`/`POST`/`OPTIONS` 方法、`Content-Type` + 需要的自定义头（如 `x-oss-*`/`x-cos-*`）。
- **签名只在后端做**：前端只拿**时效性**强的 URL/会话。
- **分片大小**：S3 兼容通常要求除最后一片外 **≥ 5 MiB**；其他云按文档设置。建议默认 5–16 MiB。
- **断点续传**：前端 manifest + 后端 `alreadyUploaded` 双保险；更换设备也能靠 `prepare` 返回的已上传列表续传。
- **哈希计算**：超大文件建议放 WebWorker，避免阻塞 UI 线程。

---

## 🧭 我该选哪条路？

- **你全控后端**、想要最大自由度 → **`HttpMultipartAdapter`**
- **你就想直传对象存储**，而且是 S3 兼容家族 → **`S3MultipartAdapter`**
- **你正在用 GCS/七牛/又拍** → 写一个 **小适配器**（`prepare/uploadChunk/finalize` 三步照抄模板），十来分钟能跑
- **跨云/跨端生态** → 考虑 **TUS** 协议，接上 `TusAdapter`

---

## 🗺️ Roadmap（欢迎 PR）

- WebWorker 内计算哈希（避免主线程卡顿）
- 多文件批量队列管理器（限速/优先级/并行度动态调整）
- 自适应并发（根据 RTT/吞吐自动调度）
- 现成适配器：`OssAdapter` / `CosAdapter` / `GcsResumableAdapter` / `TusAdapter`

---

## 📄 许可

MIT
