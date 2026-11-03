#!/usr/bin/env bash
# 一键构建并启动 Minecraft RCON 控制台
# 用法：bash start.sh        （可用 bash / sh 调用，不必加执行权限）
#       ./start.sh           （已 chmod +x 时也可直接运行）
#       PORT=8080 bash start.sh   （环境变量优先于脚本内配置）
set -euo pipefail

cd "$(dirname "$0")"

# ── 配置 ──
PORT="${PORT:-7000}"          # 监听端口
BASE_PATH="${BASE_PATH:-}"    # 部署子路径，空表示根路径；反代到 /mcrcon/ 时填 mcrcon
NPM_INSTALL="${NPM_INSTALL:-auto}" # auto | always | never

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
exec node server.js
