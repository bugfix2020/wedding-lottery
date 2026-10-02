//go:build windows

// winutil 提供少量 Windows 原生调用：全屏、原生弹窗、打开下载页。
package winutil

import (
	"syscall"
	"unsafe"
)

var (
	user32             = syscall.NewLazyDLL("user32.dll")
	shell32            = syscall.NewLazyDLL("shell32.dll")
	procMessageBoxW    = user32.NewProc("MessageBoxW")
	procSetWindowLongP = user32.NewProc("SetWindowLongPtrW")
	procGetWindowLongP = user32.NewProc("GetWindowLongPtrW")
	procSetWindowPos   = user32.NewProc("SetWindowPos")
	procMonitorFromWin = user32.NewProc("MonitorFromWindow")
	procGetMonitorInfo = user32.NewProc("GetMonitorInfoW")
	procShellExecuteW  = shell32.NewProc("ShellExecuteW")
)

const (
	gwlpStyle           = -16
	wsCaption           = 0x00C00000 // WS_CAPTION
	wsThickFrame        = 0x00040000 // WS_THICKFRAME
	wsSysMenu           = 0x00080000
	wsMinimizeBox       = 0x00020000
	wsMaximizeBox       = 0x00010000
	swShow              = 5
	monDefaultToNearest = 2
	soNoZOrder          = 0
	swpNoActivate       = 0x0010
	swpFrameChanged     = 0x0020
	swpShowWindow       = 0x0040
	mbYesNo             = 0x04
	mbIconWarning       = 0x30
	idYes               = 6
)

type rect struct{ L, T, R, B int32 }

// Fullscreen 去掉窗口边框并铺满所在显示器（无边框盖住任务栏）。
func Fullscreen(hwnd uintptr) {
	var idx32 int32 = gwlpStyle // -16，运行时变量转 uintptr 会得到补码
	idx := uintptr(idx32)
	style, _, _ := procGetWindowLongP.Call(hwnd, idx)
	style &^= wsCaption | wsThickFrame | wsSysMenu | wsMinimizeBox | wsMaximizeBox
	procSetWindowLongP.Call(hwnd, idx, style)

	// 取窗口所在显示器的坐标，铺满整个屏幕（含任务栏区域）。
	var mi struct {
		cbSize uint32
		rc     rect
		rcWork rect
		flags  uint32
	}
	// MONITORINFO is 40 bytes on Windows (cbSize, two RECTs, dwFlags).
	// Derive the size from the Go layout so GetMonitorInfoW can fill it.
	mi.cbSize = uint32(unsafe.Sizeof(mi))
	mon, _, _ := procMonitorFromWin.Call(hwnd, monDefaultToNearest)
	if mon == 0 {
		return
	}
	if ok, _, _ := procGetMonitorInfo.Call(mon, uintptr(unsafe.Pointer(&mi))); ok == 0 {
		// Keep the window's original size if monitor lookup fails. Passing the
		// zero-value RECT to SetWindowPos would shrink it to a tiny window.
		return
	}

	procSetWindowPos.Call(
		hwnd,
		0, // HWND_TOP
		uintptr(mi.rc.L), uintptr(mi.rc.T),
		uintptr(mi.rc.R-mi.rc.L), uintptr(mi.rc.B-mi.rc.T),
		soNoZOrder|swpNoActivate|swpFrameChanged|swpShowWindow,
	)
}

// MessageBox 弹一个系统提示框。
func MessageBox(title, text string) {
	procMessageBoxW.Call(0,
		uintptr(unsafe.Pointer(syscall.StringToUTF16Ptr(text))),
		uintptr(unsafe.Pointer(syscall.StringToUTF16Ptr(title))),
		mbYesNo|mbIconWarning)
}

// MessageBoxYesNo 弹框并返回用户是否点了「是」。
func MessageBoxYesNo(title, text string) bool {
	r, _, _ := procMessageBoxW.Call(0,
		uintptr(unsafe.Pointer(syscall.StringToUTF16Ptr(text))),
		uintptr(unsafe.Pointer(syscall.StringToUTF16Ptr(title))),
		mbYesNo|mbIconWarning)
	return r == idYes
}

// OpenURL 用系统默认浏览器打开 URL。
func OpenURL(url string) {
	procShellExecuteW.Call(0,
		uintptr(unsafe.Pointer(syscall.StringToUTF16Ptr("open"))),
		uintptr(unsafe.Pointer(syscall.StringToUTF16Ptr(url))),
		0, 0, 0, swShow)
}

// PromptInstallWebView2 缺少 WebView2 Runtime 时提示并引导下载。
func PromptInstallWebView2() {
	const dl = "https://go.microsoft.com/fwlink/p/?LinkId=2124703"
	if MessageBoxYesNo("缺少 WebView2 运行时",
		"本程序需要 Microsoft Edge WebView2 运行时（Windows 11 通常已内置）。\n\n"+
			"是否现在打开下载页面安装？\n\n"+
			"安装后重新运行本程序即可。") {
		OpenURL(dl)
	}
}
