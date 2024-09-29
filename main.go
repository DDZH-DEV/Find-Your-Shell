package main

import (
	"embed"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"runtime"

	"findshell/libs"

	"github.com/go-ini/ini"
	"github.com/jmoiron/sqlx"
	_ "github.com/logoove/sqlite"
)

//go:embed public/* public/*/* conf.db
var embeddedFiles embed.FS

func main() {
	// 检查并释放数据库文件
	if !fileExists("conf.db") {
		err := extractFile("conf.db", "conf.db")
		if err != nil {
			fmt.Println("释放数据库文件失败:", err)
			return
		}
		fmt.Println("数据库文件已成功释放")
	} else {
		fmt.Println("数据库文件已存在，跳过释放")
	}

	// 检查并释放静态文件
	if !directoryExists("public") {
		err := extractStaticFiles()
		if err != nil {
			fmt.Println("释放静态文件失败:", err)
			return
		}
		fmt.Println("静态文件已成功释放")
	} else {
		fmt.Println("静态文件目录已存在，跳过释放")
	}

	db, err := sqlx.Open("sqlite3", "./conf.db")
	if err != nil {
		fmt.Println("数据库连接失败:", err)
		return
	}
	defer db.Close()

	cfg, err := ini.Load("config.ini")
	port := "9999"
	if err == nil {
		if p := cfg.Section("http").Key("port").String(); p != "" {
			port = p
		}
	}

	// 开启全性能
	runtime.GOMAXPROCS(runtime.NumCPU() - 1)
	libs.PrintIPs(port)
	libs.LoadRules(db)
	libs.StartHTTPServer(db, port)

}

func extractFile(embeddedPath, targetPath string) error {
	data, err := embeddedFiles.ReadFile(embeddedPath)
	if err != nil {
		return err
	}
	return os.WriteFile(targetPath, data, 0644)
}

func extractStaticFiles() error {
	return fs.WalkDir(embeddedFiles, "public", func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}

		targetPath := filepath.Join(".", path)

		if d.IsDir() {
			return os.MkdirAll(targetPath, 0755)
		}

		return extractFile(path, targetPath)
	})
}

func fileExists(filename string) bool {
	info, err := os.Stat(filename)
	if os.IsNotExist(err) {
		return false
	}
	return !info.IsDir()
}

func directoryExists(name string) bool {
	_, err := os.Stat(name)
	return err == nil
}
