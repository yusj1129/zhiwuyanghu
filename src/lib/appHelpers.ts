import { toast } from '@/lib/toast';

export const FILTER_STORAGE_KEY = 'plants_filter_state_v1';
export const REMEMBER_ME_KEY = 'auth_remember_me_v1';

/** 校验 YYYY-MM-DD 等日期输入是否可解析 */
export function isValidDateInput(value: string) {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

/** 网络请求失败时有限次重试（指数退避） */
export async function withRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 800) {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === retries) break;
      await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
    }
  }
  throw lastError;
}

export function requireOnline() {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    toast.error('当前网络不可用，请稍后重试');
    return false;
  }
  return true;
}

/** 本地“记住密码”：Base64 编码 JSON，非强加密，仅降低明文可见性 */
export function saveRememberedCredential(email: string, password: string, enabled: boolean) {
  try {
    if (!enabled) {
      localStorage.removeItem(REMEMBER_ME_KEY);
      return;
    }
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify({ email, password }))));
    localStorage.setItem(REMEMBER_ME_KEY, encoded);
  } catch {
    localStorage.removeItem(REMEMBER_ME_KEY);
  }
}

export function readRememberedCredential() {
  try {
    const raw = localStorage.getItem(REMEMBER_ME_KEY);
    if (!raw) return null;
    const decoded = decodeURIComponent(escape(atob(raw)));
    return JSON.parse(decoded) as { email: string; password: string };
  } catch {
    return null;
  }
}

/** 可选埋点：写入 localStorage，便于后续接入分析 SDK */
export function trackEvent(event: string, payload?: Record<string, unknown>) {
  try {
    const key = 'plant_app_analytics_v1';
    const raw = localStorage.getItem(key);
    const list = raw ? (JSON.parse(raw) as unknown[]) : [];
    list.push({ event, payload: payload ?? {}, created_at: new Date().toISOString() });
    localStorage.setItem(key, JSON.stringify(list.slice(-300)));
  } catch {
    // no-op
  }
}
