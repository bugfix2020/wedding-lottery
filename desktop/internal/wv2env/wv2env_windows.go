//go:build windows

// wv2env 在创建 WebView2 环境之前注入浏览器命令行参数。
package wv2env

import "os"

const autoplayFlag = "--autoplay-policy=no-user-gesture-required"

// AllowAutoplay 放行无用户手势的 HTML5 媒体自动播放。
// 中奖音效在减速动画的 setTimeout 里 play()，没有用户手势，
// 严格策略下会被静默吞掉。
// 必须在 webview2.NewWithOptions 之前调用（环境创建时读取）。
//
// 依据：WebView2 官方文档支持环境变量 WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS
// 向浏览器进程追加命令行 flag，其中包含 autoplay-policy。
func AllowAutoplay() {
	args := autoplayFlag
	if v := os.Getenv("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS"); v != "" {
		args = v + " " + args
	}
	_ = os.Setenv("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS", args)
}
