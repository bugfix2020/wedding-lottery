.PHONY: windows serve test-go vet

# 完整构建 Windows 版 lottery.exe（pnpm build → embed → 交叉编译）
windows:
	bash scripts/build-windows.sh

# macOS 上的调试 server（与 exe 同一套 embed handler），访问 /wedding-lottery/
serve: test-go
	cd desktop && go run ./cmd/serve

test-go:
	cd desktop && go vet ./... && go test ./...

vet:
	cd desktop && go vet ./... && GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go vet ./...
