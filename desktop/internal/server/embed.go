package server

import (
	"embed"
	"io/fs"
	"net/http"
)

// web/ 是 pnpm build 产物 out/ 的暂存副本（见 scripts/build-windows.sh）。
// 必须使用 all: 前缀，否则 _next/（下划线开头）会被 go:embed 静默丢弃。
//
//go:embed all:web
var webFS embed.FS

// Handler 返回嵌入资源的完整 HTTP handler。
func Handler() http.Handler {
	sub, err := fs.Sub(webFS, "web")
	if err != nil {
		panic(err)
	}
	return New(sub)
}
