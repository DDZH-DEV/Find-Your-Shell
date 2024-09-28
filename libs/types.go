package libs

import (
	"time"
)

type File struct {
	File string
	Size int64
	Time time.Time
}

type Rule struct {
	Id       interface{} `db:"id"`
	Rule     string      `db:"rule"`
	Remark   string      `db:"remark"`
	Lang     string      `db:"lang"`
	Level    string      `db:"level"`
	Status   string      `db:"status"`
	Official string      `db:"official"`
}

type White struct {
	Id       interface{} `db:"id"`
	Rule     string      `db:"rule"`
	Remark   string      `db:"remark"`
	RuleType string      `db:"rule_type"`
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
	Id       interface{} `db:"id"`
	Title    string      `db:"title"`
	Name     string      `db:"name"`
	Value    string      `db:"value"`
	Remark   string      `db:"remark"`
	Official string      `db:"official"`
	Type     string      `db:"type"`
	Option   string      `db:"option"`
}
