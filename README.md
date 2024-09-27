# Find-Your-Shell
- Find-Your-Shell是一款由go语言开发得网站webshell查杀工具,支持linux,windows,默认包含了一部分php规则,
- 用户可以自定义添加规则对指定类型得文件进行查杀。
***
## 安装与使用
- 下载对应操作系统的release版本上次到需要扫描的服务器或者git clone 源代码
- 启动服务,会根据你的电脑提示服务器API,点击访问即可打开页面,如果是go源代码运行,可以输入命令 `go run main.go
![更改服务器API](/demos/run.jpg)
***
## 文件说明
### 启动必要文件
- `find-your-shell.exe 或 findyourshell `启动文件 
- `conf.db` 规则与配置文件，复制可以跨电脑使用
### 启动辅助文件
- `public`文件夹用于展现UI,其实就是前后端分离的前端文件,无论你有多少服务器运行，只需一个能打开的前端文件点击服务器切换API即可
- `config.ini`用于配置启动端口，默认端口`9999`该文件可以不需要
### 其他文件 
- `main.go` 开发的主要文件,目前是一个文件一把撸   `go.mod` 这个应该不需要解释
- `air.exe` 开发模式下修改代码自动重启工具 `.air.toml`是它的配置文件
***
## 项目演示
![主页](/demos/home.jpg)
![规则](/demos/rules.jpg)
![扫描结果](/demos/scan-result.jpg)
![编辑文件和创建规则](/demos/edit-code-file-and-rule.jpg)
![编辑规则](/demos/edit-rule.jpg) 
![更改服务器API](/demos/change-server.jpg)
***
## 捐赠与支持  
[规则讨论交流QQ群](https://jq.qq.com/?_wv=1027&k=5r3f8q0)

