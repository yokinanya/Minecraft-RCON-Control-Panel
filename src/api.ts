/** 部署基路径，与 vite 的 base 保持一致（例如 '/mcrcon/'、'/'），保证子路径反代可用 */
const BASE = import.meta.env.BASE_URL.replace(/\/+$/, '');

/** 拼接带基路径的 API 地址，如 '/mcrcon/api/connect' */
export const apiUrl = (endpoint: string) => `${BASE}${endpoint}`;

/** 统一的请求封装：非 2xx 时抛出后端返回的错误信息 */
export const request = async (endpoint: string, options: RequestInit = {}) => {
  const response = await fetch(apiUrl(endpoint), options);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || response.statusText || '请求失败');
  }
  return response.json();
};
