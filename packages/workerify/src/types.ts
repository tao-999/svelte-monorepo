// packages/workerify/src/types.ts
export type CallMessage = {
  type: "call";
  id: string;
  method: string;
  args: unknown[];
};
export type AbortMessage = {
  type: "abort";
  id: string;
};
export type ResultMessage =
  | { type: "result"; id: string; ok: true; value: unknown }
  | { type: "result"; id: string; ok: false; error: SerializedError };

export type SerializedError = {
  name?: string;
  message?: string;
  stack?: string;
  cause?: any;
};

export type ExposedAPI = Record<string, (...args: any[]) => any>;

export type WrapOptions = {
  /** 默认 'module' */
  type?: WorkerType;
  /** Worker 名称（调试友好） */
  name?: string;
  /** 收集 transferable 的最大深度（默认 3） */
  transferDepth?: number;
};

export type InvokeOptions = {
  signal?: AbortSignal;
};

export type Wrapped<T> = T & {
  /** 终止底层 Worker */
  terminate(): void;
};
