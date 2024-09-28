package main

import (
	"fmt"
	"runtime"

	"go-shell-scan/libs"

	"github.com/go-ini/ini"
	"github.com/jmoiron/sqlx"
	_ "github.com/logoove/sqlite"
)

func main() {
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
