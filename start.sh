#!/usr/bin/env bash
# 一键构建并启动 Minecraft RCON 控制台
# 用法：bash start.sh        （可用 bash / sh 调用，不必加执行权限）
#       ./start.sh           （已 chmod +x 时也可直接运行）
#       PORT=8080 bash start.sh   （环境变量优先于脚本内配置）
# 在 MCSManager 等面板中：启动命令填 `env PORT=12080 BASE_PATH=mcrcon bash start.sh`，
# 或改下方默认值后只填 `bash start.sh`（面板会把首个空格前的片段当作程序名）。
set -euo pipefail

cd "$(dirname "$0")"

# ── 配置 ──
PORT="${PORT:-7000}"          # 监听端口
BASE_PATH="${BASE_PATH:-}"    # 部署子路径，空表示根路径；反代到 /mcrcon/ 时填 mcrcon
NPM_INSTALL="${NPM_INSTALL:-auto}" # auto | always | never

# ── Node.js 环境 ──
# 守护进程（面板/systemd/cron）的 PATH 往往不含 nvm 等用户级安装目录，先手动补上
NODE_HOME="${NODE_HOME:-}"    # 可显式指定 Node 安装目录，如 /opt/node 或 ~/.nvm/versions/node/v20.11.0
for dir in "$NODE_HOME" \
           ${HOME:+$HOME/.nvm/versions/node/*/bin} \
           ${HOME:+$HOME/.volta/bin} \
           ${HOME:+$HOME/.local/bin} \
           ${HOME:+$HOME/.local/share/fnm/aliases/default/bin} \
           /usr/local/node/bin /usr/local/bin /usr/bin /snap/bin; do
  [[ -n "$dir" && -x "$dir/node" && ":$PATH:" != *":$dir:"* ]] && PATH="$dir:$PATH"
done
export PATH

if ! command -v node >/dev/null 2>&1; then
  echo "[start.sh] 未找到 Node.js。请安装 Node.js 18+，或设置 NODE_HOME 指向其安装目录。" >&2
  echo "[start.sh] 当前 PATH=$PATH" >&2
  exit 1
fi
if ! command -v npm >/dev/null 2>&1; then
  echo "[start.sh] 已找到 node（$(command -v node)），但未找到 npm。" >&2
  exit 1
fi

NODE_VERSION="$(node -v)"
NODE_MAJOR="${NODE_VERSION#v}"
NODE_MAJOR="${NODE_MAJOR%%.*}"
if (( NODE_MAJOR < 18 )); then
  echo "[start.sh] Node.js 版本过低：${NODE_VERSION}（需要 18 及以上）。" >&2
  exit 1
fi
echo "[start.sh] 使用 Node ${NODE_VERSION}（$(command -v node)）"

# 去掉 BASE_PATH 首尾斜杠，保证构建与运行使用同一个值
BASE_PATH="${BASE_PATH#/}"
BASE_PATH="${BASE_PATH%/}"

export PORT BASE_PATH

# ── 依赖与构建 ──
if [[ "$NPM_INSTALL" == "always" || ( "$NPM_INSTALL" == "auto" && ! -d node_modules ) ]]; then
  echo "[start.sh] 安装依赖..."
  npm install
elif [[ ! -d node_modules ]]; then
  echo "[start.sh] 未找到 node_modules 且 NPM_INSTALL=never，跳过安装。" >&2
  exit 1
fi

echo "[start.sh] 构建前端（BASE_PATH=${BASE_PATH:-<根路径>}）..."
npm run build

# 背景图与自定义数据目录（不随仓库分发）
mkdir -p data/custom

echo "[start.sh] 启动服务：http://0.0.0.0:${PORT}/${BASE_PATH}"
exec "$(command -v node)" server.js
