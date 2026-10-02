//go:build windows

// lottery.exe：本地 HTTP server + WebView2 全屏窗口。
package main

import (
	"fmt"
	"net"
	"net/http"
	"os"
	"path/filepath"

	"github.com/jchv/go-webview2"

	"wedding-lottery/desktop/internal/server"
	"wedding-lottery/desktop/internal/winutil"
	"wedding-lottery/desktop/internal/wv2env"
)

const title = "郑雨 & 胡紫萱 · 婚礼抽奖"

func main() {
	// 1. 本地 HTTP server：只绑回环、随机端口。
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		winutil.MessageBox("启动失败", "无法启动本地服务:\n"+err.Error())
		os.Exit(1)
	}
	go func() {
		_ = http.Serve(ln, server.Handler())
	}()
	port := ln.Addr().(*net.TCPAddr).Port

	// 2. 放行无手势音频（必须在创建 WebView2 环境之前）。
	wv2env.AllowAutoplay()

	// 3. 创建窗口。
	dataPath := filepath.Join(os.Getenv("LOCALAPPDATA"), "WeddingLottery", "WebView2")
	w := webview2.NewWithOptions(webview2.WebViewOptions{
		Debug:     false, // 自动关闭 DevTools / 右键菜单
		AutoFocus: true,
		DataPath:  dataPath,
		WindowOptions: webview2.WindowOptions{
			Title:  title,
			Width:  1600,
			Height: 900,
			IconId: 1, // 对应 go-winres 的 RT_GROUP_ICON "1"
			Center: true,
		},
	})
	if w == nil {
		// WebView2 Runtime 缺失或加载失败。
		winutil.PromptInstallWebView2()
		os.Exit(1)
	}
	defer w.Destroy()

	// 4. 默认无边框全屏（婚礼大屏）。
	winutil.Fullscreen(uintptr(w.Window()))

	// 5. 加载嵌入的 Web 应用。
	w.Navigate(fmt.Sprintf("http://127.0.0.1:%d/wedding-lottery/", port))
	w.Run() // 消息循环，直到窗口关闭
}
