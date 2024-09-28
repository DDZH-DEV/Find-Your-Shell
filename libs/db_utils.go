package libs

import (
	"fmt"
	"strings"

	"github.com/jmoiron/sqlx"
)

var (
	Rules       []Rule
	Whites      []White
	WhiteHashes []string
	WhitePaths  []string
	Configs     []Conf
)

// LoadRules 加载DB数据
func LoadRules(db *sqlx.DB) {
	db.Select(&Rules, "SELECT id,rule,remark,lang,level,status,official FROM rules ORDER BY id DESC")
	db.Select(&Whites, "SELECT id,rule,remark,rule_type FROM white_list ORDER BY id DESC")
	db.Select(&Configs, "SELECT * FROM config")

	WhiteHashes = []string{}
	WhitePaths = []string{}
	for _, rule := range Whites {
		if rule.RuleType == "hash" {
			WhiteHashes = append(WhiteHashes, rule.Rule)
		} else {
			WhitePaths = append(WhitePaths, rule.Rule)
		}
	}
}

// CheckInDb 判断是否在数据库中
func CheckInDb(db *sqlx.DB, table string, field string, val string) bool {
	if val == "" {
		return true
	}

	var sql string
	if strings.Contains(val, "=") {
		sql = fmt.Sprintf("SELECT COUNT(*) FROM %s WHERE %s LIMIT 1", table, val)
	} else {
		sql = fmt.Sprintf("SELECT COUNT(*) FROM %s WHERE %s='%s' LIMIT 1", table, field, val)
	}

	var count int
	err := db.QueryRowx(sql).Scan(&count)
	if err != nil {
		fmt.Println("查询数据库错误:", err)
		return false
	}
	return count > 0
}
