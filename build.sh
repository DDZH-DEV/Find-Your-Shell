#!/bin/bash

# 设置Go环境变量
export GOARCH=amd64
export CGO_ENABLED=0
export LANG=zh_CN.UTF-8

# 编译Windows版本
echo "正在编译Windows版本..."
export GOOS=windows
go build -o findshell_windows.exe main.go

# 编译Linux版本
echo "正在编译Linux版本..."
export GOOS=linux
go build -o findshell_linux main.go

echo "编译完成。"
echo "Windows版本: findshell_windows.exe"
echo "Linux版本: findshell_linux"

read -p "按任意键继续..."
