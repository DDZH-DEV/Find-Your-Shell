package libs

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"runtime"
	"strings"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

var (
	FileList       []File
	LastSearchPath string
	ScanResult     []FileScanRes
	VERSION        = "1.0.2"
)

func StartHTTPServer(db *sqlx.DB, port string) {
	gin.SetMode(gin.DebugMode)
	r := gin.Default()

	// 设置中间件
	r.Use(corsMiddleware())
	r.Use(gin.Recovery())

	// 设置路由
	setupRoutes(r, db)

	r.Run(":" + port)
}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(200)
			return
		}
		c.Next()
	}
}

func setupRoutes(r *gin.Engine, db *sqlx.DB) {
	// 设置静态文件服务
	if IsDir("./public") {
		r.LoadHTMLFiles("./public/index.html")
		r.Static("/static", "./public/static")
	}

	// 设置路由处理函数
	r.GET("/", handleIndex)
	r.POST("/rule", handleRule(db))
	r.POST("/joinWhiteList", handleJoinWhiteList(db))
	r.GET("/config", func(c *gin.Context) { handleConfig(c, db) })
	r.POST("/saveConfig", handleSaveConfig(db))
	r.POST("/code", handleCode)
	r.POST("/delfile", handleDelFile)
	r.POST("/saveFile", handleSaveFile)
	r.POST("/files", handleFiles(db))
	r.GET("/dir", handleDir)
	r.GET("/update", handleUpdate)
	r.POST("/delData", handleDelData(db))
}

func handleIndex(c *gin.Context) {
	if IsDir("./public") {
		c.HTML(http.StatusOK, "index.html", nil)
	} else {
		c.Header("Content-Type", "text/html; charset=utf-8")
		c.String(200, "<h1>Find-Your-Shell V"+VERSION+"</h1>"+
			"<p>开源地址 : <a href='https://gitee.com/DDZH-DEV/Find-Your-Shell' target='_blank'>Gitee</a></p>"+
			"<p>一般情况下,只需将执行文件和conf.db拷贝到对应得系统启动即可,文件夹 public 下得文件可以放置任意服务器网址下访问,只要填写对应得API地址即可</p>")
	}
}

func handleRule(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.PostForm("id")
		rule := strings.Trim(strings.Trim(c.PostForm("rule"), " "), "/")
		lang := c.PostForm("lang")
		remark := c.PostForm("remark")
		level := c.PostForm("level")

		if id != "" && CheckInDb(db, "rules", "rule", "id = '"+id+"' and lang='"+lang+"'") {
			r := Rule{
				Id:     id,
				Lang:   lang,
				Rule:   rule,
				Remark: remark,
				Level:  level,
			}
			query := "UPDATE rules SET rule = :rule, remark = :remark ,lang =:lang,level=:level WHERE id = :id"
			_, err := db.NamedExec(query, r)
			if err != nil {
				MJson(0, "", err.Error(), c)
				return
			}
			MJson(200, "", "操作成功!", c)
			return
		}

		if CheckInDb(db, "rules", "rule", "rule = '"+rule+"' and lang='"+lang+"'") {
			MJson(200, "", "该规则为空或已存在数据库中", c)
		} else {
			row := Rule{
				Id:     id,
				Rule:   rule,
				Remark: remark,
				Lang:   lang,
				Level:  level,
			}
			_, err := db.NamedExec("INSERT INTO rules (rule, remark,lang,level) VALUES (:rule,:remark,:lang,:level)", row)
			if err != nil {
				MJson(0, "", err.Error(), c)
				return
			}
			LoadRules(db)
			MJson(200, "", "操作成功!", c)
		}
	}
}

func handleJoinWhiteList(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		rules := c.PostFormArray("file[]")
		ruleType := c.PostForm("type")
		remark := c.PostForm("remark")

		for _, rule := range rules {
			if ruleType == "hash" {
				hash, err := GetFileHash(rule)
				if err != nil {
					continue
				}
				rule = hash
			}

			if !CheckInDb(db, "white_list", "rule", rule) {
				row := White{
					Id:       "",
					Rule:     rule,
					Remark:   remark,
					RuleType: ruleType,
				}
				_, err := db.NamedExec("INSERT INTO white_list (rule, remark,rule_type) VALUES (:rule,:remark,:rule_type)", row)
				if err != nil {
					fmt.Println("插入白名单失败:", err)
				}
			}
		}

		LoadRules(db)
		MJson(200, "", "操作成功!", c)
	}
}

func handleConfig(c *gin.Context, db *sqlx.DB) {
	type Res struct {
		Rules   []Rule
		Whites  []White
		Configs []Conf
	}

	LoadRules(db)

	var result = Res{
		Rules:   Rules,
		Whites:  Whites,
		Configs: Configs,
	}
	MJson(200, result, "", c)
}

func handleSaveConfig(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		r := struct {
			Id    string
			Value string
		}{
			Id:    c.PostForm("Id"),
			Value: c.PostForm("Value"),
		}
		query := "UPDATE config SET value=:value WHERE id = :id"
		result, err := db.NamedExec(query, r)
		if err != nil {
			MJson(0, "", err.Error(), c)
			return
		}

		// 检查是否有行被更新
		rowsAffected, err := result.RowsAffected()
		if err != nil {
			MJson(0, "", "无法确定更新状态: "+err.Error(), c)
			return
		}

		if rowsAffected == 0 {
			MJson(0, "", "未找到要更新的配置项", c)
			return
		}

		// 更新内存中的配置
		db.Select(&Configs, "SELECT * FROM config")

		MJson(200, "", "配置更新成功!", c)
	}
}

func handleCode(c *gin.Context) {
	path := c.PostForm("path")

	_, err := os.Stat(path)
	if os.IsNotExist(err) {
		MJson(http.StatusNotFound, "文件"+path+"不存在", "", c)
		return
	}

	content, err := os.ReadFile(path)
	if err != nil {
		MJson(http.StatusInternalServerError, err.Error(), "", c)
		return
	}

	MJson(200, string(content), "", c)
}

func handleDelFile(c *gin.Context) {
	path := c.PostForm("path")

	_, err := os.Stat(path)
	if os.IsNotExist(err) {
		MJson(http.StatusNotFound, "文件"+path+"不存在", "", c)
		return
	}

	err = os.Remove(path)
	if err != nil {
		MJson(0, err.Error(), "", c)
		return
	}

	MJson(200, "删除成功!", "", c)
}

func handleSaveFile(c *gin.Context) {
	path := c.PostForm("path")
	content := c.PostForm("content")

	_, err := os.Stat(path)
	if os.IsNotExist(err) {
		MJson(http.StatusNotFound, "", "文件"+path+"不存在", c)
		return
	}

	err = os.WriteFile(path, []byte(content), 0644)
	if err != nil {
		MJson(0, "", "文件"+path+"写入失败", c)
		return
	}

	MJson(200, "", "操作成功!", c)
}

func handleFiles(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		exts := c.PostFormArray("filter[]")
		path := c.PostForm("path")
		scan := c.PostForm("scan")
		fmt.Println(path, "scan exts:", exts)

		if !IsDir(path) {
			MJson(0, "目录不存在", "", c)
			return
		}

		files := Scandir(path, exts)
		ScanResult = []FileScanRes{}

		//在此处把Rules按照lang类型分组
		var langRulesMap = make(map[string][]Rule)
		for _, rule := range Rules {
			langRulesMap[rule.Lang] = append(langRulesMap[rule.Lang], rule)
		}

		if scan != "" && scan != "false" {
			// 使用协程池来限制并发数
			numWorkers := runtime.NumCPU() * 2 // 使用CPU核心数的两倍作为并发数
			semaphore := make(chan struct{}, numWorkers)
			resultChan := make(chan FileScanRes, len(files))
			var wg sync.WaitGroup

			for _, file := range files {
				wg.Add(1)
				go func(f File) {
					defer wg.Done()
					semaphore <- struct{}{}        // 获取信号量
					defer func() { <-semaphore }() // 释放信号量

					if result := matchFile(f, langRulesMap); result != nil {
						resultChan <- *result
					}
				}(file)
			}

			// 等待所有协程完成并关闭结果通道
			go func() {
				wg.Wait()
				close(resultChan)
			}()

			// 收集结果
			for result := range resultChan {
				ScanResult = append(ScanResult, result)
			}
		}

		// 将扫描结果保存到文件
		mjsonData, err := json.Marshal(ScanResult)
		if err != nil {
			fmt.Println("Failed to marshal JSON:", err)
			MJson(500, nil, "Failed to process scan results", c)
			return
		}

		err = os.WriteFile("last_scan.json", mjsonData, 0644)
		if err != nil {
			fmt.Println("Failed to write file:", err)
			// 继续执行，因为这不是致命错误
		}

		// 准备响应数据
		rs := struct {
			Files  []File
			Shells []FileScanRes
		}{
			Files:  files,
			Shells: ScanResult,
		}

		MJson(200, rs, "", c)
	}
}

func handleDir(c *gin.Context) {
	scanDir := c.Query("path")
	if IsDir(scanDir) {
		dirs := ReadDir(scanDir)
		MJson(200, dirs, "", c)
	} else {
		MJson(0, "", "目录不存在", c)
	}
}

func handleUpdate(c *gin.Context) {
	resp, err := http.Get("https://gitee.com/DDZH-DEV/Find-Your-Shell/raw/master/update.json")
	if err != nil {
		MJson(200, "", err.Error(), c)
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		fmt.Println("Failed to read response body:", err)
		return
	}

	if resp.StatusCode != 200 || string(body) == "" {
		MJson(0, "", "", c)
		return
	}
	var res map[string]interface{}
	err = json.Unmarshal(body, &res)
	if err != nil {
		MJson(0, "", err.Error(), c)
		return
	}

	MJson(200, res, "", c)
}

func handleDelData(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.PostForm("id")
		table := c.PostForm("table")
		if CheckInDb(db, table, "id", id) {
			fmt.Println("delete from " + table + " where id =" + id + " limit 1")
			_, err := db.Query("delete from " + table + " where id =" + id)
			if err != nil {
				MJson(0, "", err.Error(), c)
				return
			}
		}
		MJson(200, "操作成功", "", c)
	}
}

func MJson(code int, data interface{}, msg interface{}, c *gin.Context) {
	c.JSON(200, gin.H{"msg": msg, "code": code, "data": data})
}

func matchFile(file File, langRulesMap map[string][]Rule) *FileScanRes {
	if len(Whites) > 0 {
		fileHash, err := GetFileHash(file.File)
		if err == nil && InArray(fileHash, WhiteHashes) {
			return nil
		}
		if InArray(file.File, WhitePaths) {
			return nil
		}
	}

	content, err := os.ReadFile(file.File)
	if err != nil {
		return &FileScanRes{
			File:   file.File,
			Size:   file.Size,
			Time:   file.Time,
			Match:  "io error",
			Lang:   "",
			Level:  "0",
			Remark: err.Error(),
		}
	}

	// 根据文件扩展名确定语言
	ext := strings.ToLower(strings.TrimPrefix(filepath.Ext(file.File), "."))

	// 使用对应语言的规则
	rules, ok := langRulesMap[ext]
	if !ok {
		// 如果没有找到对应语言的规则，使用所有规则
		rules = Rules
	}

	for _, rule := range rules {
		regex := regexp.MustCompile(rule.Rule)
		if regex.MatchString(string(content)) {
			return &FileScanRes{
				File:   file.File,
				Size:   file.Size,
				Time:   file.Time,
				Match:  rule.Rule,
				Lang:   rule.Lang,
				Level:  rule.Level,
				Remark: rule.Remark,
			}
		}
	}

	return nil
}
