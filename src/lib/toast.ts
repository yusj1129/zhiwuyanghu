import { toast as rawToast, type ExternalToast } from 'sonner';

/** 相同文案在极短时间内重复触发（如 React Strict Mode、双击）时只展示一次 */
const DEDUP_MS = 600;
const recent = new Map<string, number>();

function shouldEmit(kind: string, message: string): boolean {
  const key = `${kind}::${message}`;
  const now = Date.now();
  const prev = recent.get(key);
  if (prev !== undefined && now - prev < DEDUP_MS) return false;
  recent.set(key, now);
  if (recent.size > 120) {
    for (const [k, t] of recent) {
      if (now - t > DEDUP_MS * 20) recent.delete(k);
    }
  }
  return true;
}

function normalizeMessage(message: string | number): string {
  return typeof message === 'number' ? String(message) : message;
}

/**
 * 与 `sonner` 用法一致，但对 success / error / message（及 info / warning）做短时去重。
 * 需要允许多次相同时可传 `data.id` 区分业务场景，或调大间隔后仍受 DEDUP_MS 限制——此时请直接 `import { toast } from 'sonner'`。
 */
export const toast = {
  success: (message: string | number, data?: ExternalToast) => {
    const msg = normalizeMessage(message);
    if (!shouldEmit('success', msg)) return;
    return rawToast.success(msg, data);
  },
  error: (message: string | number, data?: ExternalToast) => {
    const msg = normalizeMessage(message);
    if (!shouldEmit('error', msg)) return;
    return rawToast.error(msg, data);
  },
  message: (message: string | number, data?: ExternalToast) => {
    const msg = normalizeMessage(message);
    if (!shouldEmit('message', msg)) return;
    return rawToast.message(msg, data);
  },
  info: (message: string | number, data?: ExternalToast) => {
    const msg = normalizeMessage(message);
    if (!shouldEmit('info', msg)) return;
    return rawToast.info(msg, data);
  },
  warning: (message: string | number, data?: ExternalToast) => {
    const msg = normalizeMessage(message);
    if (!shouldEmit('warning', msg)) return;
    return rawToast.warning(msg, data);
  },
  /** 以下较少重复触发，直接透传 */
  promise: rawToast.promise,
  loading: rawToast.loading,
  custom: rawToast.custom,
  dismiss: rawToast.dismiss,
};
