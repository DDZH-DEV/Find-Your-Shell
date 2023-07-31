package main

// 导入内置 fmt
import (
	"crypto/md5"
	"embed"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/go-ini/ini"
	"github.com/jmoiron/sqlx"
	_ "github.com/logoove/sqlite"
	"io"
	"io/fs"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"runtime"
	"strings"
	"time"
)

// GetFileHash 获取文件的Hash
func GetFileHash(filename string) (string, error) {
	// 打开文件
	file, err := os.Open(filename)
	if err != nil {
		return "", err
	}
	defer file.Close()

	// 创建MD5哈希对象
	hash := md5.New()

	// 从文件中复制数据，并计算哈希值
	_, err = io.Copy(hash, file)
	if err != nil {
		return "", err
	}

	// 计算哈希值的字符表示
	hashValue := hash.Sum(nil)
	hashString := hex.EncodeToString(hashValue)

	return hashString, nil
}

// InArray 判断是否在切片数组中
func InArray(element string, array []string) bool {
	for _, v := range array {
		if v == element {
			return true
		}
	}
	return false
}

// isEmpty 判断字符串是否为空
func isEmpty(str string) bool {
	return len(str) == 0
}

// isDir 判断是否为文件夹
func isDir(path string) bool {
	fileInfo, err := os.Stat(path)
	if err != nil {
		return false
	}

	if fileInfo.IsDir() {
		return true
	}
	return false
}

// readDir 扫描文件夹下面的文件夹
func readDir(root string) []string {
	fileList := []string{}
	if len(root) == 0 {
		root = "/"
	}
	dirEntries, err := os.ReadDir(root)
	if err != nil {
	}

	for _, entry := range dirEntries {
		if entry.IsDir() {
			fileList = append(fileList, entry.Name())

		}
	}

	return fileList
}

// 自定义json输出
func mjson(code int, data any, msg any, c *gin.Context) {
	c.JSON(200, gin.H{"msg": msg, "code": code, "data": data})
}

// 加载DB数据
func loadRules() {
	db.Select(&rules, "SELECT id,rule,remark,lang,level,status,official  FROM rules  order by id desc")
	db.Select(&whites, "SELECT id,rule,remark,rule_type FROM white_list  order by id desc")
	db.Select(&configs, "SELECT * FROM config ")
	if len(whites) > 0 {
		//先清空
		whiteHashes = []string{}
		whitePathes = []string{}
		for _, rule := range whites {
			if rule.RuleType == "hash" {
				whiteHashes = append(whiteHashes, rule.Rule)
			} else {
				whitePathes = append(whiteHashes, rule.Rule)
			}
		}
	}
}

// 判断是否在数据库中
func checkInDb(table string, field string, val string) bool {
	if len(val) == 0 {
		return true
	}

	var sql string

	if strings.Contains(val, "=") {
		sql = "SELECT count(*) FROM " + table + " where " + val + " limit 1"
	} else {
		sql = "SELECT count(*) FROM " + table + " where " + field + "='" + val + "' limit 1"
	}

	//db.Select(&result, sql)
	var count int

	err := db.QueryRowx(sql).Scan(&count)

	fmt.Println(sql, count)
	if err != nil {
	}
	return count > 0

}

// scandir 扫描文件夹下面的文件
func scandir(searchDir string, exts []string) []File {
	if len(searchDir) == 0 {
		searchDir = "/"
	}
	if searchDir == lastSearchPath {
		fmt.Println("searchDir == lastSearchPath", searchDir, lastSearchPath)
		return fileList
	}

	fmt.Println("list dir file :"+searchDir, exts)
	fileList = []File{}

	err := filepath.Walk(searchDir, func(path string, info os.FileInfo, err error) error {
		if err == nil {
			fmt.Println("file-----------------------Ext", filepath.Ext(path), exts)
			if !info.IsDir() && InArray(filepath.Ext(path), exts) {
				fileList = append(fileList, File{File: path, Size: info.Size(), Time: info.ModTime()})
			}
		}
		return nil
	})
	if err != nil {
		return nil
	}
	lastSearchPath = searchDir
	return fileList
}

// matchFile
func matchFile(file File) {
	//defer wg.Done() // 通知 WaitGroup 计数减1
	//文件白名单
	if len(whites) > 0 {

		fileHash, err := GetFileHash(file.File)

		if err != nil {
		}

		if InArray(fileHash, whiteHashes) {
			return
		}

		if InArray(file.File, whitePathes) {
			return
		}

	}

	content, err := os.ReadFile(file.File)

	if err != nil {
		scanResult = append(scanResult, FileScanRes{
			File:   file.File,
			Size:   file.Size,
			Time:   file.Time,
			Match:  "io error ",
			Lang:   "",
			Level:  "0",
			Remark: err.Error(),
		})
		return

	}

	for _, rule := range rules {

		regex := regexp.MustCompile(rule.Rule)

		if regex.MatchString(string(content)) {

			scanResult = append(scanResult, FileScanRes{
				File:   file.File,
				Size:   file.Size,
				Time:   file.Time,
				Match:  rule.Rule,
				Lang:   rule.Lang,
				Level:  rule.Level,
				Remark: rule.Remark,
			})
			break
		}

	}
}

type File struct {
	File string
	Size int64
	Time time.Time
}

type Rule struct {
	Id       any    `db:"id"`
	Rule     string `db:"rule"`
	Remark   string `db:"remark"`
	Lang     string `db:"lang"`
	Level    string `db:"level"`
	Status   string `db:"status"`
	Official string `db:"official"`
}

type White struct {
	Id       any    `db:"id"`
	Rule     string `db:"rule"`
	Remark   string `db:"remark"`
	RuleType string `db:"rule_type"`
}

type FileScanRes struct {
	File   string
	Size   int64
	Time   time.Time
	Lang   string
	Match  string
	Level  string
	Remark string
}

type Conf struct {
	Id       any    `db:"id"`
	Title    string `db:"title"`
	Name     string `db:"name"`
	Value    string `db:"value"`
	Remark   string `db:"remark"`
	Official string `db:"official"`
	Type     string `db:"type"`
	Option   string `db:"option"`
}

type Data struct {
}

var db *sqlx.DB
var rules []Rule
var whites []White
var whiteHashes []string
var whitePathes []string
var fileList []File
var lastSearchPath string
var configs []Conf
var scanResult []FileScanRes

//go:embed  public/*
var staticFiles embed.FS

func startHttpServer() {

	// 1.创建路由
	r := gin.Default()
	// 2.绑定路由规则，执行的函数
	// gin.Context，封装了request和response
	r.LoadHTMLFiles("./public/index.html")
	//r.Static("/static", "./public/static")
	//r.StaticFS("/static", http.FS(staticFiles))

	fcss, _ := fs.Sub(staticFiles, "public/static/css")
	fjs, _ := fs.Sub(staticFiles, "public/static/js")
	ficonfont, _ := fs.Sub(staticFiles, "public/static/iconfont")
	r.StaticFS("static/css", http.FS(fcss))
	r.StaticFS("static/js", http.FS(fjs))
	r.StaticFS("static/iconfont", http.FS(ficonfont))

	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")

		// 处理跨域请求中的OPTIONS预检请求
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(200)
			return
		}
		c.Next()
	})
	//捕获异常
	r.Use(gin.Recovery())

	//r.Any("/static/*filepath", func(c *gin.Context) {
	//	staticServer := http.FileServer(http.FS(staticFiles))
	//	staticServer.ServeHTTP(c.Writer, c.Request)
	//})

	//默认请求
	r.GET("/", func(c *gin.Context) {
		fmt.Println("staticFiles", staticFiles)
		c.HTML(http.StatusOK, "index.html", c)
	})

	r.POST("/rule", func(c *gin.Context) {
		id := c.PostForm("id")
		rule := strings.Trim(strings.Trim(c.PostForm("rule"), " "), "/")
		lang := c.PostForm("lang")
		remark := c.PostForm("remark")
		level := c.PostForm("level")

		fmt.Println(len(id) > 0, checkInDb("rules", "rule", "id = '"+id+"' and lang='"+lang+"'"))

		if len(id) > 0 && checkInDb("rules", "rule", "id = '"+id+"' and lang='"+lang+"'") {

			r := Rule{
				Id:     id,
				Lang:   lang,
				Rule:   rule,
				Remark: remark,
				Level:  level,
			}
			//更新规则
			query := "UPDATE rules SET rule = :rule, remark = :remark ,lang =:lang,level=:level WHERE id = :id"
			_, err := db.NamedExec(query, r)
			if err != nil {
			}
			mjson(200, "", "操作成功!", c)
			return

		}

		if checkInDb("rules", "rule", "rule = '"+rule+"' and lang='"+lang+"'") {
			mjson(200, "", "该规则为空或已存在数据库中", c)
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
				mjson(0, "", err.Error(), c)
				return
			}
			loadRules()

			mjson(200, "", "操作成功!", c)
		}
	})
	//加入白名单
	r.POST("/joinWhiteList", func(c *gin.Context) {

		rules := c.PostFormArray("file[]")
		rule_type := c.PostForm("type")
		remark := c.PostForm("remark")

		for _, rule := range rules {

			if rule_type == "hash" {
				hash, err := GetFileHash(rule)
				if err != nil {
				}
				rule = hash
			}

			if checkInDb("white_list", "rule", rule) {

				//mjson(0, "", "该规则为空或已存在数据库中", c)
				///return
			} else {
				row := White{
					Id:       "",
					Rule:     rule,
					Remark:   remark,
					RuleType: rule_type,
				}
				_, err := db.NamedExec("INSERT INTO white_list (rule, remark,rule_type) VALUES (:rule,:remark,:rule_type)", row)

				if err != nil {
					///mjson(0, "", err.Error(), c)
					//return
				}

			}

		}

		loadRules()
		mjson(200, "", "操作成功!", c)
	})
	//规则列表
	r.GET("/config", func(c *gin.Context) {
		loadRules()
		type Res struct {
			Rules   []Rule
			Whites  []White
			Configs []Conf
		}

		var result = Res{
			Rules:   rules,
			Whites:  whites,
			Configs: configs,
		}
		mjson(200, result, "", c)
	})

	//保存配置
	r.POST("/saveConfig", func(c *gin.Context) {

		r := struct {
			Id    string
			Value string
		}{
			Id:    c.PostForm("Id"),
			Value: c.PostForm("Value"),
		}
		//更新规则
		fmt.Println(r)
		query := "UPDATE config SET value=:value WHERE id = :id"
		_, err := db.NamedExec(query, r)
		if err != nil {
			mjson(200, "", err.Error(), c)
			return
		}
		mjson(200, "", "操作成功!", c)
	})

	//代码
	r.POST("/code", func(c *gin.Context) {

		path := c.PostForm("path")

		// 检查文件是否存在
		_, err := os.Stat(path)
		if os.IsNotExist(err) {
			mjson(http.StatusNotFound, "文件"+path+"不存在", "", c)
			return
		}

		// 读取文件内容
		content, err := os.ReadFile(path)

		if err != nil {
			mjson(http.StatusInternalServerError, err.Error(), "", c)
			return
		}

		mjson(200, string(content), "", c)
	})

	//删除文件
	r.POST("/delfile", func(c *gin.Context) {

		path := c.PostForm("path")

		// 检查文件是否存在
		_, err := os.Stat(path)
		if os.IsNotExist(err) {
			mjson(http.StatusNotFound, "文件"+path+"不存在", "", c)
			return
		}

		// 删除文件
		err = os.Remove(path)
		if err != nil {
			mjson(0, err.Error(), "", c)
			return
		}

		mjson(200, "删除成功!", "", c)
	})

	//保存文件
	r.POST("/saveFile", func(c *gin.Context) {

		path := c.PostForm("path")
		content := c.PostForm("content")
		// 检查文件是否存在
		_, err := os.Stat(path)
		if os.IsNotExist(err) {
			mjson(http.StatusNotFound, "", "文件"+path+"不存在", c)
			return
		}

		// 使用 ioutil.WriteFile 函数直接将内容写入文件
		err = os.WriteFile(path, []byte(content), 0644)
		if err != nil {
			mjson(0, "", "文件"+path+"写入失败", c)
			return
		}

		mjson(200, "", "操作成功!", c)
	})

	//扫描文件夹下面的文件
	r.POST("/files", func(c *gin.Context) {
		exts := c.PostFormArray("filter[]")
		path := c.PostForm("path")
		scan := c.PostForm("scan")
		fmt.Println(path, "scan exts:", exts)
		if isDir(path) {
			//扫描文件
			files := scandir(path, exts)
			scanResult = []FileScanRes{}
			if len(scan) > 0 && scan != "false" {

				//var wg sync.WaitGroup
				//for _, file := range files {
				//	wg.Add(1)
				//	//多进程读取匹配
				//	go matchFile(file, &wg)
				//}
				//wg.Wait()
				for _, file := range files {
					matchFile(file)
				}
			}

			// 将User结构体转换为JSON格式
			mjsonData, err := json.Marshal(scanResult)
			if err != nil {
				fmt.Println("Failed to marshal JSON:", err)
				return
			}

			// 将JSON数据写入本地文件
			err = os.WriteFile("last_scan.json", mjsonData, 0644)
			if err != nil {
				fmt.Println("Failed to write file:", err)
				return
			}

			type Rs struct {
				Files  []File
				Shells []FileScanRes
			}
			var rs = Rs{
				Files:  files,
				Shells: scanResult,
			}

			mjson(200, rs, "", c)
		} else {
			mjson(0, "目录不存在", "", c)
		}
	})

	//扫描目录
	r.GET("/dir", func(c *gin.Context) {
		scanDir := c.Query("path")
		if isDir(scanDir) {
			dirs := readDir(scanDir)
			mjson(200, dirs, "", c)

		} else {
			mjson(0, "", "目录不存在", c)
		}
	})

	//扫描目录
	r.GET("/update", func(c *gin.Context) {
		resp, err := http.Get("https://gitee.com/DDZH-DEV/Find-Your-Shell/raw/master/update.json")
		if err != nil {
			mjson(200, "", err.Error(), c)
			return
		}
		defer resp.Body.Close()

		body, err := io.ReadAll(resp.Body)
		if err != nil {
			fmt.Println("Failed to read response body:", err)
			return
		}

		if resp.StatusCode != 200 || string(body) == "" {
			//请求失败
			mjson(0, "", "", c)
			return
		}
		var res map[string]interface{}
		err = json.Unmarshal([]byte(string(body)), &res)
		if err != nil {

		}

		mjson(200, res, "", c)
	})

	//删除数据
	r.POST("/delData", func(c *gin.Context) {
		id := c.PostForm("id")
		table := c.PostForm("table")
		if checkInDb(table, "id", id) {
			fmt.Println("delete from " + table + " where id =" + id + " limit 1")
			_, err := db.Query("delete from " + table + " where id =" + id)

			if err != nil {
				mjson(0, "", err.Error(), c)
				return
			}

		}

		mjson(200, "操作成功", "", c)

	})

	r.Run(":9999")

}

var cfg *ini.File

func main() { // main函数，是程序执行的入口
	db, _ = sqlx.Open("sqlite3", "./conf.db")
	cfg, err := ini.Load("config.ini")
	if err != nil {
		fmt.Println(cfg, err.Error())
		return
	}
	//开启全性能
	numCPU := runtime.NumCPU()
	runtime.GOMAXPROCS(numCPU - 1)
	loadRules()
	startHttpServer()
}
