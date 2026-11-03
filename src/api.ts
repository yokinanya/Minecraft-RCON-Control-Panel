/** 部署基路径，与 vite 的 base 保持一致（例如 '/mcrcon/'、'/'），保证子路径反代可用 */
const BASE = import.meta.env.BASE_URL.replace(/\/+$/, '');

let resolvedBase = BASE;

/** 运行时校准基路径：反代未剥离子路径时，页面地址里会多出前缀，用它纠正避免重复拼接 */
const detectBase = () => {
  let pathname = window.location.pathname;
  try {
    pathname = decodeURIComponent(pathname);
  } catch { /* 非法编码时保持原样 */ }

  if (!BASE) {
    resolvedBase = BASE;
    return;
  }
  // 第一个 base 之前的片段即反代挂载的额外前缀；连续重复的 base（如历史 bug 造成的 /mcrcon/mcrcon/）会被折叠
  const index = pathname.indexOf(`${BASE}/`);
  const prefix = index > 0 ? pathname.slice(0, index) : '';
  resolvedBase = `${prefix.replace(/\/+$/, '')}${BASE}`;
};

/** 拼接带基路径的 API 地址（调用方只传 '/api/xxx'，不要重复带子路径） */
export const apiUrl = (endpoint: string) => {
  detectBase();
  return `${resolvedBase}${endpoint}`;
};

/** 统一的请求封装：非 2xx 时抛出后端返回的错误信息 */
export const request = async (endpoint: string, options: RequestInit = {}) => {
  const response = await fetch(apiUrl(endpoint), options);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || response.statusText || '请求失败');
  }
  return response.json();
};
