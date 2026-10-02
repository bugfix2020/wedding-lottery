package server

import (
	"io/fs"
	"net/http"
	"path"
	"strings"
)

// basePath 是 Next.js 静态导出的 basePath（见 next.config.mjs），
// 所有资源引用都带此前缀，因此这里把它挂到同一路径下，Web 侧零改动。
const basePath = "/wedding-lottery"

// 显式 MIME 表：Windows 上 mime.TypeByExtension 依赖注册表，
// .mp3 常常拿不到 audio/mpeg，因此按扩展名强制 Content-Type。
var mimeByExt = map[string]string{
	".html":  "text/html; charset=utf-8",
	".js":    "text/javascript; charset=utf-8",
	".css":   "text/css; charset=utf-8",
	".json":  "application/json",
	".txt":   "text/plain; charset=utf-8", // App Router 预取的 RSC payload
	".svg":   "image/svg+xml",
	".png":   "image/png",
	".jpg":   "image/jpeg",
	".jpeg":  "image/jpeg",
	".webp":  "image/webp",
	".ico":   "image/x-icon",
	".mp3":   "audio/mpeg",
	".woff2": "font/woff2",
}

// New 返回把 sub 挂载在 /wedding-lottery/ 下的 HTTP handler。
func New(sub fs.FS) http.Handler {
	files := http.FileServer(http.FS(sub))
	mux := http.NewServeMux()
	// 精确注册无斜杠形式，避免 Go 1.22+ ServeMux 的自动 301 接管重定向。
	mux.HandleFunc(basePath, redirectToIndex)
	// StripPrefix 不带尾斜杠：strip 后 "/" 才能命中 FileServer 的目录 index。
	mux.Handle(basePath+"/", withMime(http.StripPrefix(basePath, files)))
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/" {
			redirectToIndex(w, r)
			return
		}
		http.NotFound(w, r)
	})
	return mux
}

func redirectToIndex(w http.ResponseWriter, r *http.Request) {
	http.Redirect(w, r, basePath+"/", http.StatusFound)
}

// withMime 按请求路径强制 Content-Type。
func withMime(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if ct, ok := mimeByExt[strings.ToLower(path.Ext(r.URL.Path))]; ok {
			w.Header().Set("Content-Type", ct)
		}
		next.ServeHTTP(w, r)
	})
}
