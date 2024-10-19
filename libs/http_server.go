package libs

import (
	"crypto/rand"
	"encoding/base64"
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
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

var (
	FileList       []File
	LastSearchPath string
	ScanResult     []FileScanRes
	VERSION        = "1.0.2"
)

func init() {
	// 在 init 函数中设置 Gin 模式
	gin.SetMode(gin.ReleaseMode)
	// 禁用 Gin 的控制台颜色
	gin.DisableConsoleColor()
	// 禁用 Gin 的日志输出
	gin.DefaultWriter = io.Discard
}
func StartHTTPServer(db *sqlx.DB, port string) {
	loadAuthConfig()

	r := gin.New()

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
		r.Static("/static", "./public/static")
	}

	// 设置路由处理函数
	r.GET("/", handleIndex)
	r.POST("/auth", handleAuth)
	r.GET("/getMachineID", handleGetMachineID)
	r.GET("/config", func(c *gin.Context) { handleConfig(c, db) })
	r.GET("/dir", handleDir)

	r.POST("/saveConfig", handleSaveConfig(db))

	r.POST("/delfile", handleDelFile)

	r.POST("/files", handleFiles(db))

	r.GET("/update", handleUpdate)
	r.POST("/delData", handleDelData(db))
	r.POST("/verifyAuthKey", handleVerifyAuthKey)
	r.POST("/generateKey", handleGenerateKey)
	// 应用 authMiddleware 到所有需要认证的路由
	authorized := r.Group("/")
	authorized.Use(authMiddleware())
	{
		authorized.POST("/saveFile", handleSaveFile)
		authorized.POST("/code", handleCode)
		authorized.POST("/joinWhiteList", handleJoinWhiteList(db))
		authorized.POST("/rule", handleRule(db))
	}
}

func handleGenerateKey(c *gin.Context) {
	expirationDate := c.PostForm("expirationDate")

	authPassword := c.PostForm("authPassword")

	fmt.Println("getDoubleMD5Hash(authPassword):", getDoubleMD5Hash(authPassword))
	// 验证密码（使用双重 MD5 加密后的密码进行比较）
	if getDoubleMD5Hash(authPassword) != "aa19f1dcdeea2280fefbcee02c334760" {
		MJson(http.StatusUnauthorized, nil, "无权生成密钥", c)
		return
	}

	expiresAt, err := time.Parse("2006-01-02", expirationDate)
	if err != nil {
		MJson(http.StatusBadRequest, nil, "无效的过期日期", c)
		return
	}

	machineID := c.Query("machineID")
	if machineID == "" {
		machineID = GetMachineID()
	}

	key, err := generateKey(machineID, expiresAt)
	if err != nil {
		MJson(http.StatusBadRequest, nil, err.Error(), c)
		return
	}

	MJson(http.StatusOK, gin.H{"key": key}, "密钥生成成功", c)
}

func generateKey(machineID string, expiresAt time.Time) (string, error) {
	fmt.Println("开始生成密钥...")
	fmt.Printf("机器ID: %s\n", machineID)
	fmt.Printf("过期时间: %s\n", expiresAt.Format("2006-01-02"))

	// 生成一个随机字符串
	randomBytes := make([]byte, 16)
	if _, err := io.ReadFull(rand.Reader, randomBytes); err != nil {
		fmt.Printf("生成随机字节失败: %v\n", err)
		return "", err
	}
	randomString := base64.StdEncoding.EncodeToString(randomBytes)
	fmt.Printf("生成的随机字符串: %s\n", randomString)

	// 构造密钥内容
	key := fmt.Sprintf("%s|%s|%s", machineID, expiresAt.Format("2006-01-02"), randomString)
	fmt.Printf("未加密的密钥内容: %s\n", key)

	// 加密密钥
	encryptedKey, err := EncryptKey(key)
	if err != nil {
		fmt.Printf("加密密钥失败: %v\n", err)
		return "", err
	}
	fmt.Printf("加密后的密钥: %s\n", encryptedKey)

	fmt.Println("密钥生成完成")
	return encryptedKey, nil
}

func handleVerifyAuthKey(c *gin.Context) {
	key := c.PostForm("key")
	if key == "" {
		MJson(http.StatusBadRequest, nil, "密钥不能为空", c)
		return
	}

	machineID := GetMachineID()

	decryptedKey, err := DecryptKey(key)
	if err != nil {
		MJson(http.StatusBadRequest, nil, "无效的密钥", c)
		return
	}

	parts := strings.Split(decryptedKey, "|")
	if len(parts) != 3 {
		MJson(http.StatusBadRequest, nil, "密钥格式错误", c)
		return
	}

	expectedMachineID := parts[0]
	expiresAt, err := time.Parse("2006-01-02", parts[1])
	if err != nil {
		MJson(http.StatusBadRequest, nil, "无效的过期日期", c)
		return
	}

	if time.Now().After(expiresAt) {
		MJson(http.StatusUnauthorized, nil, "密钥已过期", c)
		return
	}

	if machineID != expectedMachineID {
		MJson(http.StatusUnauthorized, nil, "密钥对此机器无效", c)
		return
	}

	// 设置临时cookie
	c.SetCookie("auth", expiresAt.Format(time.RFC3339), int(expiresAt.Sub(time.Now()).Seconds()), "/", "", false, true)

	MJson(http.StatusOK, gin.H{"expiresAt": expiresAt}, "", c)
}

func handleIndex(c *gin.Context) {
	if IsDir("./public") {
		// 修改这部分代码
		content, err := os.ReadFile("./public/index.html")
		if err != nil {
			c.String(http.StatusInternalServerError, "无法读取 index.html 文件")
			return
		}
		c.Header("Content-Type", "text/html; charset=utf-8")
		c.String(http.StatusOK, string(content))
	} else {
		c.Header("Content-Type", "text/html; charset=utf-8")
		c.String(200, "<h1>Find-Your-Shell V"+VERSION+"</h1>"+
			"<p>开源地址 : <a href='https://github.com/DDZH-DEV/Find-Your-Shell' target='_blank'>github</a></p>")
	}
}

func handleRule(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.PostForm("id")
		rule := strings.Trim(strings.Trim(c.PostForm("rule"), " "), "/")
		lang := c.PostForm("lang")
		remark := c.PostForm("remark")
		level := c.PostForm("level")

		if id != "" {
			// 更新现有规则
			if CheckInDb(db, "rules", "id", id) {
				row := Rule{
					Id:     id,
					Rule:   rule,
					Remark: remark,
					Lang:   lang,
					Level:  level,
				}
				_, err := db.NamedExec("UPDATE rules SET rule=:rule, remark=:remark, lang=:lang, level=:level WHERE id=:id", row)
				if err != nil {
					MJson(http.StatusInternalServerError, nil, err.Error(), c)
					return
				}
				LoadRules(db)
				MJson(http.StatusOK, nil, "规则更新成功", c)
			} else {
				MJson(http.StatusNotFound, nil, "规则不存在", c)
			}
		} else {
			// 新增规则
			if CheckInDb(db, "rules", "rule", "rule = '"+rule+"' and lang='"+lang+"'") {
				MJson(http.StatusConflict, nil, "该规则已存在", c)
			} else {
				row := Rule{
					Rule:   rule,
					Remark: remark,
					Lang:   lang,
					Level:  level,
				}
				_, err := db.NamedExec("INSERT INTO rules (rule, remark, lang, level) VALUES (:rule, :remark, :lang, :level)", row)
				if err != nil {
					MJson(http.StatusInternalServerError, nil, err.Error(), c)
					return
				}
				LoadRules(db)
				MJson(http.StatusOK, nil, "规则添加成功", c)
			}
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
		path_exclude := c.PostFormArray("path_exclude[]")
		fmt.Println(path, "scan exts:", exts)

		if !IsDir(path) {
			MJson(0, "目录不存在", "", c)
			return
		}

		files := Scandir(path, exts, path_exclude)
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
	urls := []string{
		"https://github.moeyy.xyz/https://github.com/DDZH-DEV/Find-Your-Shell/raw/refs/heads/master/update.json",
		"https://github.com/DDZH-DEV/Find-Your-Shell/raw/refs/heads/master/update.json",
	}

	var resp *http.Response
	var err error

	for _, url := range urls {
		resp, err = http.Get(url)
		if err == nil && resp.StatusCode == 200 {
			break
		}
		if resp != nil {
			resp.Body.Close()
		}
	}

	if err != nil {
		MJson(0, "", "无法获取更新信息: "+err.Error(), c)
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		MJson(0, "", "读取响应失败: "+err.Error(), c)
		return
	}

	if string(body) == "" {
		MJson(0, "", "更新信息为空", c)
		return
	}

	var res map[string]interface{}
	err = json.Unmarshal(body, &res)
	if err != nil {
		MJson(0, "", "解析JSON失败: "+err.Error(), c)
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
			fmt.Println("file hash in white list:", fileHash)
			return nil
		}
		if isPathInWhitelist(file.File, WhitePaths) {
			fmt.Println("file path in white list:", file.File)
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

	// 使用对应语言的则
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

func authMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {

		if c.Request.URL.Path == "/" || c.Request.URL.Path == "/auth" {
			c.Next()
			return
		}

		authorized := false
		if AuthConfig.Key != "" && time.Now().Before(AuthConfig.ExpiresAt) {
			authorized = true
		}

		if !authorized {
			MJson(http.StatusUnauthorized, nil, "未授权", c)
			c.Abort()
			return
		}

		c.Next()
	}
}

func handleAuth(c *gin.Context) {
	key := c.PostForm("key")
	if key == "" {
		if IsValidLocalLicense() {
			MJson(http.StatusOK, nil, "", c)
			return
		} else {
			DeleteLicenseFile()
			MJson(http.StatusUnauthorized, GetMachineID(), "", c)
			return
		}
	}

	machineID := GetMachineID()

	decryptedKey, err := DecryptKey(key)
	if err != nil {
		MJson(http.StatusBadRequest, nil, "无效的密钥", c)
		return
	}

	parts := strings.Split(decryptedKey, "|")
	if len(parts) != 3 {
		MJson(http.StatusBadRequest, nil, "密钥格式错误", c)
		return
	}

	expectedMachineID := parts[0]
	expiresAt, err := time.Parse("2006-01-02", parts[1])
	if err != nil {
		MJson(http.StatusBadRequest, nil, "无效的过期日期", c)
		return
	}

	if machineID != expectedMachineID {
		MJson(http.StatusUnauthorized, nil, "密钥对此机器无效", c)
		return
	}

	if time.Now().After(expiresAt) {
		MJson(http.StatusUnauthorized, nil, "密钥已过期", c)
		return
	}

	AuthConfig.Key = key
	AuthConfig.ExpiresAt = expiresAt
	AuthConfig.MachineID = machineID
	SaveAuthConfig()

	c.SetCookie("auth", expiresAt.Format(time.RFC3339), int(expiresAt.Sub(time.Now()).Seconds()), "/", "", false, true)

	MJson(http.StatusOK, gin.H{"expiresAt": expiresAt}, "", c)
}

func saveAuthConfig() {
	err := os.WriteFile(".license", []byte(AuthConfig.Key), 0644)
	if err != nil {
		fmt.Println("保存授权密钥失败:", err)
	}
}

func loadAuthConfig() {
	licenseData, err := os.ReadFile(".license")
	if err != nil {
		if !os.IsNotExist(err) {
			fmt.Println("读取授权文件失败:", err)
		}
		return
	}

	encryptedKey := string(licenseData)
	decryptedKey, err := DecryptKey(encryptedKey)
	if err != nil {
		fmt.Println("解密授权密钥失败:", err)
		return
	}

	parts := strings.Split(decryptedKey, "|")
	if len(parts) != 3 {
		fmt.Println("授权密钥格式错误")
		return
	}

	machineID := parts[0]
	expiresAt, err := time.Parse("2006-01-02", parts[1])
	if err != nil {
		fmt.Println("解析过期日期失败:", err)
		return
	}

	AuthConfig.Key = encryptedKey
	AuthConfig.ExpiresAt = expiresAt
	AuthConfig.MachineID = machineID

	fmt.Println("授权信息加载成功，过期时间:", expiresAt)
}

// 添加新的路由处理函数来获取机器ID
func handleGetMachineID(c *gin.Context) {
	machineID := GetMachineID()
	MJson(http.StatusOK, gin.H{"machineID": machineID}, "获取机器唯一码成功", c)
}
