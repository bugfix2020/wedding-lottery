//go:build !windows

// 非 Windows 平台的占位入口，保证 macOS 上 go vet / go test 可用。
// 真实产物请用 scripts/build-windows.sh 交叉编译。
package main

import "fmt"

func main() {
	fmt.Println("lottery.exe 只能构建到 Windows：请运行 scripts/build-windows.sh")
	fmt.Println("开发调试可用 go run ./cmd/serve")
}
