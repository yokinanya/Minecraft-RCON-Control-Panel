/** 记住最近一次成功连接的信息，仅存于浏览器本地 */
export interface SavedConnection {
  host: string;
  port: number;
  remember: boolean;
}

const KEY = 'mcrcon-connection';

export const loadConnection = (): SavedConnection | null => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data.host !== 'string') return null;
    return {
      host: data.host,
      port: Number(data.port) || 25575,
      remember: data.remember !== false,
    };
  } catch {
    return null;
  }
};

export const saveConnection = (conn: SavedConnection | null) => {
  try {
    if (!conn || !conn.remember) {
      localStorage.removeItem(KEY);
      return;
    }
    localStorage.setItem(KEY, JSON.stringify(conn));
  } catch { /* 隐私模式下 localStorage 不可用时忽略 */ }
};
