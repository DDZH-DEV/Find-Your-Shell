package libs

import (
	"crypto/md5"
	"encoding/hex"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path/filepath"
)

// GetFileHash 获取文件的Hash
func GetFileHash(filename string) (string, error) {
	file, err := os.Open(filename)
	if err != nil {
		return "", err
	}
	defer file.Close()

	hash := md5.New()
	if _, err := io.Copy(hash, file); err != nil {
		return "", err
	}

	return hex.EncodeToString(hash.Sum(nil)), nil
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

// IsEmpty 判断字符串是否为空
func IsEmpty(str string) bool {
	return len(str) == 0
}

// IsDir 判断是否为文件夹
func IsDir(path string) bool {
	fileInfo, err := os.Stat(path)
	return err == nil && fileInfo.IsDir()
}

// ReadDir 扫描文件夹下面的文件夹
func ReadDir(root string) []string {
	if root == "" {
		root = "/"
	}
	var fileList []string
	dirEntries, err := os.ReadDir(root)
	if err != nil {
		return fileList
	}

	for _, entry := range dirEntries {
		if entry.IsDir() {
			fileList = append(fileList, entry.Name())
		}
	}
	return fileList
}

// Scandir 扫描文件夹下面的文件
func Scandir(searchDir string, exts []string) []File {
	if searchDir == "" {
		searchDir = "/"
	}

	// 将exts转换为map以提高查找效率
	extMap := make(map[string]bool)
	for _, ext := range exts {
		extMap[ext] = true
	}

	var fileList []File

	err := filepath.WalkDir(searchDir, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if !d.IsDir() {
			if extMap[filepath.Ext(path)] {
				info, err := d.Info()
				if err != nil {
					return err
				}
				fileList = append(fileList, File{File: path, Size: info.Size(), Time: info.ModTime()})
			}
		}
		return nil
	})

	if err != nil {
		fmt.Println("扫描目录错误:", err)
	}
	return fileList
}
