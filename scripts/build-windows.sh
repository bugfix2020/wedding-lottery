#!/usr/bin/env bash
# 一键构建 Windows 版 lottery.exe：
#   pnpm build → out/ → 拷贝到 embed 目录 → go-winres 图标 → 交叉编译
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> [1/4] pnpm build (Next.js 静态导出)"
pnpm build

echo "==> [2/4] 拷贝 out/ 到 embed 目录"
# go:embed 不允许 .. 且不跟符号链接，必须真实复制。
EMBED_DIR="desktop/internal/server/web"
rm -rf "$EMBED_DIR"
mkdir -p "$EMBED_DIR"
cp -R out/. "$EMBED_DIR/"
find "$EMBED_DIR" -name ".DS_Store" -delete

echo "==> [3/4] 生成 Windows 图标与版本资源 (go-winres)"
cd desktop
go run github.com/tc-hib/go-winres@latest make --arch amd64

echo "==> [4/4] 交叉编译 lottery.exe"
mkdir -p ../dist
GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -trimpath \
  -ldflags "-H windowsgui -s -w" -o ../dist/lottery.exe .

echo "OK -> dist/lottery.exe ($(du -h ../dist/lottery.exe | cut -f1))"
