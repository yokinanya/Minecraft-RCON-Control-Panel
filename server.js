const express = require('express');
const fs = require('fs');
const path = require('path');
const { Rcon } = require('rcon-client');

const app = express();
const port = Number(process.env.PORT) || 7000;
// 部署子路径，如 BASE_PATH=mcrcon → 访问 /mcrcon/api/...，需与构建时的 BASE_PATH 一致
const basePath = `/${(process.env.BASE_PATH || '').trim().replace(/^\/+|\/+$/g, '')}`.replace(/^\/$/, '');
const api = `${basePath}/api`;
const distDir = path.join(__dirname, 'dist');
// 自定义背景图不随仓库分发，放在此处；缺失时前端自动回退为纯色主题
const customDir = path.join(__dirname, 'data', 'custom');

let rcon = null;
let connectionInfo = null;
let closingRcon = false;

app.use(express.json());
app.use(express.static(distDir));
if (basePath) app.use(basePath, express.static(distDir));
app.use('/assets/custom', express.static(customDir, { fallthrough: true }));

async function closeRcon() {
  if (!rcon || closingRcon) return;
  closingRcon = true;
  try {
    await rcon.end();
  } catch (error) {
    const msg = error.message || error;
    if (!/End called twice|Not connected/i.test(msg)) {
      console.warn('RCON close error:', msg);
    }
  } finally {
    rcon = null;
    connectionInfo = null;
    closingRcon = false;
  }
}

function parsePlayerList(raw) {
  const players = {
    total: 0,
    max: 0,
    names: [],
  };

  if (typeof raw !== 'string') {
    raw = String(raw || '');
  }

  const match = raw.match(/There are (\d+) of a max of (\d+) players(?:[:]?\s*(.*))?/i);
  if (match) {
    players.total = Number(match[1]);
    players.max = Number(match[2]);
    if (match[3]) {
      players.names = match[3].split(',').map((name) => name.trim()).filter(Boolean);
    }
  }

  return players;
}

/** 判断 RCON 返回是否是错误消息（命令不存在等） */
function isErrorResponse(raw) {
  if (!raw) return false;
  return /^Unknown or incomplete command/i.test(raw) ||
    /^Incorrect argument/i.test(raw) ||
    /^Error: /i.test(raw) ||
    /<--\[HERE\]/.test(raw);
}

/** 安全地执行一条可选命令，失败或返回错误时返回 null */
async function tryCommand(cmd) {
  if (!rcon) return null;
  try {
    const result = String(await rcon.send(cmd));
    return isErrorResponse(result) ? null : result;
  } catch {
    return null;
  }
}

/**
 * 从 /version 等输出中提取精简版本号，去掉服务端类型前缀
 * 例："This server is running CraftBukkit version 1.20.4 ..." → "1.20.4"
 *     "Paper 1.21.1 (MC: 1.21.1)" → "1.21.1"；"Server version: 1.21.1" → "1.21.1"
 * 无法确认时返回 null（宁可不显示，也不要显示玩家数之类的无关文本）
 */
function parseVersion(raw) {
  if (!raw || isErrorResponse(raw)) return null;

  // 先匹配明确的版本标识，避免把 "There are 0 of a max of 10 players" 误识别为版本
  const patterns = [
    /\bversion[:\s]+(\d+\.\d+(?:\.\d+)?)/i,
    /\(MC:\s*(\d+\.\d+(?:\.\d+)?)\)/i,
    /\b(?:Paper|Purpur|Spigot|CraftBukkit|Bukkit|Fabric|Forge|NeoForge|Mohist|Arclight|Pufferfish|Velocity|BungeeCord)\D{0,20}?(\d+\.\d+(?:\.\d+)?)/i,
  ];
  for (const pattern of patterns) {
    const match = raw.match(pattern);
    if (match) return match[1];
  }

  // 不像版本输出的内容（如 "There are 0 of a max of 10 players online:"）一律视为未知
  return null;
}

/**
 * 从 Forge /forge mods 输出（或任意含 jar 文件名的文本）推断 Minecraft 版本
 * Forge 生态的 jar 名形如 "clumps-forge-1.20.1-12.0.0.4.jar"、"structure-1.20.x_v1.35.jar"
 * 取所有文件名的版本段中最常见的 (主.次) 组合，避免单个异常文件名误导
 */
function parseVersionFromModFiles(raw) {
  if (!raw || isErrorResponse(raw)) return null;

  const counts = new Map();
  const filePattern = /([\w.+-]+\.jar)/gi;
  for (const [, fileName] of raw.matchAll(filePattern) || []) {
    // 形如 clumps-forge-1.20.1-12.0.0.4.jar / jei-1.21.1-forge-19.19.0.jar / structure-1.20.x_v1.35.jar
    const match = fileName.match(/(?:^|[-+_mc])(1\.\d+)(\.\d+)?(?=[-.+_]|$)/);
    if (!match) continue;
    // 只有主.次（如 1.20.1 里的 "1.20"）可能是模组自身版本，权重减半
    const weight = match[2] ? 2 : 1;
    const version = `${match[1]}${match[2] || ''}`;
    counts.set(version, (counts.get(version) || 0) + weight);
  }

  let best = null;
  for (const [version, count] of counts) {
    if (!best || count > best.count) best = { version, count };
  }
  return best ? best.version : null;
}

/** 尝试解析 TPS（Paper/Spigot 服务端） */
function parseTPS(raw) {
  if (!raw || isErrorResponse(raw)) return null;
  const match = raw.match(/TPS from last[\s\S]*?:\s*([\d.]+)\s*,?\s*([\d.]+)?\s*,?\s*([\d.]+)?/i);
  if (match) {
    return match[1];
  }
  const numMatch = raw.match(/([\d.]+)/);
  return numMatch ? numMatch[1] : null;
}

/** 尝试解析 MSPT（Paper/Spigot 服务端） */
function parseMSPT(raw) {
  if (!raw || isErrorResponse(raw)) return null;
  const match = raw.match(/MSPT[\s\S]*?:\s*([\d.]+)/i);
  if (match) return match[1];
  return null;
}

/** 尝试解析世界种子（提取纯数字） */
function parseSeed(raw) {
  if (!raw || isErrorResponse(raw)) return null;
  // Minecraft /seed 返回 "Seed: [-3150894598531538528]" 或 "Seed: 12345"
  const match = String(raw).match(/Seed:\s*\[?(-?\d+)\]?/i);
  return match ? match[1] : null;
}

/** 尝试解析 mod 列表 */
function parseMods(raw) {
  if (!raw || isErrorResponse(raw)) return null;
  const lines = raw.split('\n').filter(Boolean);
  const mods = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // 跳过标题行和错误行
    if (trimmed.match(/^(Mod|Plugin|Server Mod|模组|Unknown|Usage:)/i)) continue;
    if (isErrorResponse(trimmed)) continue;
    // 提取 mod 名
    const cleaned = trimmed.replace(/^[-\s•]+/, '').replace(/\s+v?\d[\d.]*.*$/, '').trim();
    if (cleaned && cleaned.length < 100) mods.push(cleaned);
  }
  return mods.length > 0 ? mods : null;
}

app.post([`${api}/connect`, `/api/connect`], async (req, res) => {
  const { host, port: portValue, password } = req.body;
  if (!host || !portValue || !password) {
    return res.status(400).json({ error: 'host、port、password 都不能为空' });
  }

  try {
    if (rcon) {
      await closeRcon();
    }

    rcon = await Rcon.connect({
      host,
      port: Number(portValue),
      password,
    });

    connectionInfo = {
      host,
      port: Number(portValue),
    };

    res.json({ ok: true, info: connectionInfo });
  } catch (error) {
    await closeRcon();
    res.status(500).json({ error: error.message || '连接失败' });
  }
});

app.post([`${api}/command`, `/api/command`], async (req, res) => {
  const { command } = req.body;
  if (!rcon) {
    return res.status(400).json({ error: '尚未连接 RCON' });
  }
  if (!command || !command.trim()) {
    return res.status(400).json({ error: 'command 不能为空' });
  }

  try {
    const response = await rcon.send(command.trim());
    res.json({ ok: true, response: String(response) });
  } catch (error) {
    res.status(500).json({ error: error.message || '命令执行失败' });
  }
});

app.post([`${api}/disconnect`, `/api/disconnect`], async (req, res) => {
  if (!rcon) {
    return res.status(400).json({ error: '当前没有连接' });
  }

  try {
    await closeRcon();
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message || '断开失败' });
  }
});

app.get([`${api}/server-info`, `/api/server-info`], async (req, res) => {
  if (!rcon) {
    return res.status(400).json({ error: '未连接 RCON' });
  }

  try {
    const listRaw = String(await rcon.send('list'));
    const players = parsePlayerList(listRaw);

    // 尝试获取版本（支持不同服务端）
    let version = null;
    for (const cmd of ['version', 'bukkit:version', 'minecraft:version', 'about']) {
      version = parseVersion(await tryCommand(cmd));
      if (version) break;
    }
    if (!version) {
      // 命令不可用时，部分服务端在 list 响应里附带版本（如 Paper 的 "Server version: ..."）
      version = parseVersion(listRaw);
    }

    // 尝试获取 TPS / MSPT（Paper/Spigot 专有）；Forge 用 /forge tps
    const tpsRaw = await tryCommand('tps');
    const tps = parseTPS(tpsRaw);
    const mspt = parseMSPT(tpsRaw);

    // 尝试获取 mod 列表（Forge/Fabric）
    let modsRaw = await tryCommand('mods');
    if (!modsRaw) modsRaw = await tryCommand('forge mods');
    if (!modsRaw) modsRaw = await tryCommand('fabric mods');
    const mods = parseMods(modsRaw);

    // 末路：Forge 没有 /version，改从 mod jar 文件名推断 MC 版本
    let versionSource = version ? 'command' : undefined;
    if (!version) {
      version = parseVersionFromModFiles(modsRaw);
      if (version) versionSource = 'modfiles';
    }

    // 尝试获取世界种子
    const seedRaw = await tryCommand('seed');
    const seed = parseSeed(seedRaw);

    res.json({
      ok: true,
      players,
      version: version || '未知',
      versionSource,
      tps: tps || undefined,
      mspt: mspt || undefined,
      mods: mods || undefined,
      seed: seed || undefined,
      raw: {
        list: listRaw,
        version: version || undefined,
        versionSource,
        tps: tpsRaw || undefined,
        mods: modsRaw || undefined,
        seed: seedRaw || undefined,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message || '获取服务器信息失败' });
  }
});

// ── Custom Items Persistence (always stored as groups) ──
const CUSTOM_ITEMS_PATH = path.join(__dirname, 'data', 'custom-items.json');

function readGroups() {
  try {
    if (!fs.existsSync(CUSTOM_ITEMS_PATH)) return [];
    const data = JSON.parse(fs.readFileSync(CUSTOM_ITEMS_PATH, 'utf-8'));
    if (!Array.isArray(data)) return [];
    // Migrate old flat format: [{id, name, mod}] → groups
    if (data.length > 0 && !data[0].items) {
      const map = {};
      for (const item of data) {
        const m = item.mod || '未知Mod';
        if (!map[m]) map[m] = { mod: m, items: [] };
        map[m].items.push({ id: item.id, name: item.name });
      }
      const migrated = Object.values(map);
      writeGroups(migrated); // persist migration
      return migrated;
    }
    return data;
  } catch { return []; }
}

function writeGroups(groups) {
  const dir = path.dirname(CUSTOM_ITEMS_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CUSTOM_ITEMS_PATH, JSON.stringify(groups, null, 2), 'utf-8');
}

app.get([`${api}/custom-items`, `/api/custom-items`], (req, res) => {
  try {
    res.json({ ok: true, groups: readGroups() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post([`${api}/custom-items`, `/api/custom-items`], (req, res) => {
  const { mod, items } = req.body;
  if (!mod || !mod.trim()) {
    return res.status(400).json({ error: 'Mod 名称不能为空' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: '物品列表不能为空' });
  }
  for (const item of items) {
    if (!item.id || !item.name) {
      return res.status(400).json({ error: '每个物品必须包含 id 和 name' });
    }
  }
  try {
    const groups = readGroups();
    if (groups.some(g => g.mod === mod.trim())) {
      return res.status(400).json({ error: 'Mod 名称重复，请使用不同的名称' });
    }
    const newGroup = { mod: mod.trim(), items: items.map(it => ({ id: it.id.trim(), name: it.name.trim() })) };
    groups.push(newGroup);
    writeGroups(groups);
    res.json({ ok: true, groups });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete([`${api}/custom-items`, `/api/custom-items`], (req, res) => {
  const { mod } = req.body;
  if (!mod) return res.status(400).json({ error: 'Mod 名称不能为空' });
  try {
    let groups = readGroups();
    groups = groups.filter(g => g.mod !== mod);
    writeGroups(groups);
    res.json({ ok: true, groups });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// SPA fallback：无后缀路径一律返回前端入口（子路径部署时由反向代理决定是否保留前缀）
const sendIndex = (req, res) => res.sendFile(path.join(distDir, 'index.html'));

app.get('/', sendIndex);
if (basePath) {
  app.get(basePath, sendIndex);
}
// 兜底：反代剥离子路径前缀后也能返回页面；带后缀的静态资源缺失时直接 404，避免回退成 HTML
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  if (req.path.startsWith('/api') || path.extname(req.path)) return next();
  return sendIndex(req, res);
});

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${port}${basePath || '/'}`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`端口 ${port} 已被占用，请先释放该端口或修改环境变量 PORT。`);
  } else {
    console.error('启动服务器时发生错误：', error);
  }
  process.exit(1);
});
