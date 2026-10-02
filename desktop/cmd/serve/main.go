// serve 是 macOS/开发机上可运行的调试 server，
// 与 lottery.exe 内部使用同一套 embed handler，用于验证 Web 层。
package main

import (
	"fmt"
	"net"
	"net/http"

	"wedding-lottery/desktop/internal/server"
)

func main() {
	ln, err := net.Listen("tcp", "127.0.0.1:8787")
	if err != nil {
		panic(err)
	}
	fmt.Printf("Serving http://127.0.0.1:8787/wedding-lottery/\n")
	if err := http.Serve(ln, server.Handler()); err != nil {
		panic(err)
	}
}
