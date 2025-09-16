import type { Action } from "./types";
import type { KeepInstance, KeepStateParam } from "./types";

/** 每实例一个自增 id，避免开发者不传 id 时冲突 */
let autoId = 0;

/** 工厂：基于 keep 实例生成 Svelte Action */
export function makeKeepState(keep: KeepInstance): Action<HTMLElement, KeepStateParam> {
  return (node, param) => {
    let id = param?.id ?? `kr_${++autoId}`;
    const k = { id, get: param!.get, set: param!.set };
    const off = keep.register(k);

    return {
      update(next) {
        // 允许运行中改变 id 或 getter/setter
        const nid = next?.id ?? id;
        if (nid !== id) {
          off();
          id = nid;
          keep.register({ id, get: next!.get, set: next!.set });
        }
      },
      destroy() {
        off();
      }
    };
  };
}
