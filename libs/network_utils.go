package libs

import (
	"fmt"
	"net"
)

func PrintIPs(port string) {
	ifaces, err := net.Interfaces()
	if err != nil {
		fmt.Println("获取网络接口失败:", err)
		return
	}

	for _, iface := range ifaces {
		addrs, err := iface.Addrs()
		if err != nil {
			fmt.Println("获取地址失败:", err)
			continue
		}

		for _, addr := range addrs {
			ipnet, ok := addr.(*net.IPNet)
			if ok && !ipnet.IP.IsLoopback() && ipnet.IP.To4() != nil {
				// 添加检查，排除169.254开头的IP地址
				if !ipnet.IP.IsLinkLocalUnicast() {
					fmt.Printf("API: http://%s:%s\n", ipnet.IP.String(), port)
				}
			}
		}
	}
}
