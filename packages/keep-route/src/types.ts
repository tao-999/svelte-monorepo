import type { Readable } from "svelte/store";

/** 轻量 Action 类型，避免依赖 'svelte/action' */
export type Action<El extends HTMLElement = HTMLElement, P = any> =
  (node: El, parameter?: P) => {
    update?: (parameter?: P) => void;
    destroy?: () => void;
  };

export type RouteKey = string; // 通常用 pathname+search

export type KeepRouteOptions = {
  /** 生效路由白名单（glob），默认 ['/**'] */
  include?: string[];
  /** 排除名单（glob），默认 [] */
  exclude?: string[];
  /** LRU 最大缓存路由数，默认 10 */
  max?: number;
  /** 是否保存与恢复 window.scroll，默认 true */
  scroll?: boolean;
  /** localStorage 前缀，用于持久化滚动与状态（可选） */
  persistKey?: string; // e.g. 'kr'
};

export type SnapshotMap = Record<string, any>;

export type Keeper = {
  id: string;
  /** 序列化自身状态（必须可 JSON 化） */
  get: () => any;
  /** 恢复状态（可能传入 undefined） */
  set: (state: any) => void;
};

export type KeepInstance = {
  /** 注册/注销当前页面的 keeper */
  register: (k: Keeper) => () => void;
  /** 由 SvelteKit 接线：导航前调用（保存当前路由） */
  onBeforeNavigate: (routeKey: RouteKey) => void;
  /** 由 SvelteKit 接线：导航后调用（恢复目标路由） */
  onAfterNavigate: (routeKey: RouteKey) => void;
  /** 手动保存/恢复（可选） */
  save: (routeKey: RouteKey) => void;
  restore: (routeKey: RouteKey) => void;

  /** 当前命中的路由 key（调试用） */
  current: Readable<RouteKey | null>;
};

export type KeepStateParam = {
  /** 组件内唯一 id（建议显式传）；不传则自动分配 */
  id?: string;
  /** 从组件读取状态 */
  get: () => any;
  /** 把状态恢复回去 */
  set: (v: any) => void;
};
