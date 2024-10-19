package libs

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/md5"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"io"
	"net"
	"os"
	"strings"
	"time"
)

var AuthConfig AuthConfigStruct

type AuthConfigStruct struct {
	Key       string    `json:"key"`
	ExpiresAt time.Time `json:"expires_at"`
	MachineID string    `json:"machine_id"`
}

func GetMachineID() string {
	hostname, _ := os.Hostname()
	interfaces, _ := net.Interfaces()
	var macs []string
	for _, i := range interfaces {
		if i.Flags&net.FlagUp != 0 && !strings.HasPrefix(i.Name, "lo") {
			addrs, err := i.Addrs()
			if err != nil {
				continue
			}
			for _, addr := range addrs {
				if ipnet, ok := addr.(*net.IPNet); ok && !ipnet.IP.IsLoopback() {
					if ipnet.IP.To4() != nil {
						macs = append(macs, i.HardwareAddr.String())
						break
					}
				}
			}
		}
	}
	id := hostname + strings.Join(macs, "")
	hash := sha256.Sum256([]byte(id))
	return fmt.Sprintf("%x", hash[:16]) // 返回前16字节作为机器ID
}

func EncryptKey(key string) (string, error) {
	encryptionKey := []byte("your-32-byte-secret-here!!!!!!!!")
	block, err := aes.NewCipher(encryptionKey)
	if err != nil {
		return "", err
	}

	plaintext := []byte(key)
	ciphertext := make([]byte, aes.BlockSize+len(plaintext))
	iv := ciphertext[:aes.BlockSize]
	if _, err := io.ReadFull(rand.Reader, iv); err != nil {
		return "", err
	}

	stream := cipher.NewCFBEncrypter(block, iv)
	stream.XORKeyStream(ciphertext[aes.BlockSize:], plaintext)

	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

func DecryptKey(encryptedKey string) (string, error) {
	encryptionKey := []byte("your-32-byte-secret-here!!!!!!!!")
	ciphertext, err := base64.StdEncoding.DecodeString(encryptedKey)
	if err != nil {
		return "", err
	}

	block, err := aes.NewCipher(encryptionKey)
	if err != nil {
		return "", err
	}

	if len(ciphertext) < aes.BlockSize {
		return "", fmt.Errorf("ciphertext too short")
	}
	iv := ciphertext[:aes.BlockSize]
	ciphertext = ciphertext[aes.BlockSize:]

	stream := cipher.NewCFBDecrypter(block, iv)
	stream.XORKeyStream(ciphertext, ciphertext)

	return string(ciphertext), nil
}

func IsValidLocalLicense() bool {
	licenseData, err := os.ReadFile(".license")
	if err != nil {
		if os.IsNotExist(err) {
			return false
		}
		fmt.Println("读取.license文件失败:", err)
		return false
	}

	decryptedKey, err := DecryptKey(string(licenseData))
	if err != nil {
		fmt.Println("解密.license文件内容失败:", err)
		return false
	}

	parts := strings.Split(decryptedKey, "|")
	if len(parts) != 3 {
		fmt.Println("license格式错误")
		return false
	}

	machineID := parts[0]
	expiresAt, err := time.Parse("2006-01-02", parts[1])
	if err != nil {
		fmt.Println("解析过期时间失败:", err)
		return false
	}

	if machineID != GetMachineID() {
		fmt.Println("机器ID不匹配")
		return false
	}

	if time.Now().After(expiresAt) {
		fmt.Println("license已过期")
		return false
	}

	AuthConfig.Key = string(licenseData)
	AuthConfig.ExpiresAt = expiresAt
	AuthConfig.MachineID = machineID

	return true
}

func DeleteLicenseFile() {
	err := os.Remove(".license")
	if err != nil {
		if !os.IsNotExist(err) {
			fmt.Println("删除.license文件失败:", err)
		}
	} else {
		fmt.Println(".license文件已成功删除")
	}

	AuthConfig = AuthConfigStruct{}
}

func SaveAuthConfig() {
	err := os.WriteFile(".license", []byte(AuthConfig.Key), 0644)
	if err != nil {
		fmt.Println("保存授权密钥失败:", err)
	}
}

// 实现与 PHP 中 md5(md5(str).md5(str)) 等效的函数
func getDoubleMD5Hash(str string) string {
	md5First := getMD5Hash(str)
	md5Second := getMD5Hash(str)
	return getMD5Hash(md5First + md5Second)
}

// 计算单次 MD5 哈希的辅助函数
func getMD5Hash(text string) string {
	hasher := md5.New()
	hasher.Write([]byte(text))
	return hex.EncodeToString(hasher.Sum(nil))
}
