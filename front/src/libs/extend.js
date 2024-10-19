import storage from "./storage";
import config from "../config";

export default {

    changeServer() {
        var server = storage.get('api_url') ? storage.get('api_url') : config.API_URL
        new Dialog({
            title: "服务器切换",
            content: '<input class="ui-input"  id="server" value="' + server + '" />',
            buttons: [{
                value: '切换',
                events: function (event) {

                    var url = $('#server').val();
                    if (util.isUrl(url)) {
                        util.msg('操作成功!');
                        storage.set('api_url', url);
                        event.data.dialog.remove();
                        setTimeout(function () {
                            window.location.reload();
                        }, 500)
                    }

                }
            }, {}]
        });
    },
    updateConfig(data) {
        for (var i in data) {
            data[i] && storage.set(i, data[i]);
        }
    },
    checkUpdate() {
        var _this = this;
        var lastCheckTime = storage.get('last_check_time');
        var currentTime = new Date().getTime();
        var sixHours = 6 * 60 * 60 * 1000; // 6小时的毫秒数

        if (!lastCheckTime || (currentTime - lastCheckTime) > sixHours) {
            storage.set('last_check_time', currentTime);
            util.ajax('/update', function (res) {
                var data = res.data;
                _this.updateConfig(data);
                var update_notice = storage.get('update_notice');
                if (data.version && config.VERSION !== data.version && (typeof update_notice != "undefined" && update_notice != 0)) {
                    new Dialog({
                        title: "您当前的版本为 V" + config.VERSION + ", 检测到新版本 V" + data.version + ",可前往github下载",
                        content: '<div id="update"> <a class="ui-button ui-button ui-button-warning" target="_blank" href="https://github.com/DDZH-DEV/Find-Your-Shell">GITHUB下载</a></div>',
                        buttons: [{
                            value: '不再提醒',
                            events: function (event) {
                                storage.set('update_notice', 0, 86400);
                                event.data.dialog.remove();
                            }
                        }]
                    });
                }
            });
        }
    },
    help() {
        new Dialog({
            title: "远程求助",
            content: `
                <div id="shang">
                    <p class="text mg-b-10">如果您无法判断代码是否有问题，可以尝试联系求助。</p>
                    <div>
                        <a class="ui-button mg-b-10 ui-button-success small-btn " href="tencent://message/?uin=764807501">QQ: 764807501</a>
                        <a class="ui-button mg-b-10 ui-button-success small-btn " href="weixin://dl/chat?songlin20111026">微信: songlin20111026</a>
                        <a class="ui-button mg-b-10 ui-button-success small-btn " href="${config.GITHUB_URL}" target="_blank">GITHUB</a>
                    </div>
                </div>
            `,
        });
    }, 
    authenticated: false,
    authKey: '',
    authDialog: null,
    mid:"",
    authenticate: function () {
        let _this = this;
        this.authKey = storage.get('auth_key') || '';
        util.ajax('/auth', {
            key: this.authKey
        }, function (res) { 
            if (res.code === 200) {
                _this.authenticated = true; 
                storage.set('auth_key', _this.authKey);
            } else {
                if(res.data){
                    _this.mid=res.data;
                }
                _this.showAuthDialog()
            }
        }, () => {
            _this.showAuthDialog();
        });
    },
    showAuthDialog() {
        let authKey = storage.get('auth_key') || '',_this=this;
        // 在页面加载时检查认证状态 
        this.authDialog = new Dialog({
            title: '授权验证',
            with: 300,
            content: '<textarea id="authKey" class="ui-textarea" placeholder="输入密钥" rows="4">' + authKey + '</textarea><p class="text mg-t-5">机器码:'+this.mid+'</p>',
            buttons: [{
                value: '确定',
                events: {
                    click: function (event) {
                        var dialog = event.data.dialog,authKey=document.getElementById("authKey").value;  
                        // 发送验证请求到后端
                        util.ajax("/verifyAuthKey", { key: authKey }, function (response) {
                            if (response.code === 200) {
                                _this.authDialog.remove();
                                storage.set('auth_key', authKey);
                                // 执行授权后的操作
                                new LightTip().success("授权成功");
                            } else {
                                new LightTip().error('密钥错误，请重试');
                            }
                        });
                    }
                }
            }]
        });
    },
    sgkd() { 
        util.click(8, function () {
            new Dialog({
                title: '生成密钥',
                content: $('#auth-key-box').show(),
                buttons: [{
                    value: '生成',
                    events: function (event) {
                        var dialog = event.data.dialog;
                        var expirationDate = $('#expirationDate').val();
                        var authPassword = $('#authPassword').val();
                        var mid = $('#mid').val() || '';
    
                        util.ajax("/generateKey", {
                            expirationDate: expirationDate,
                            authPassword: authPassword,
                            machineID:mid
                        }, function (res) {
                            if (res.code === 200) {
                                dialog.hide();  // 使用 hide() 替代 remove()
                                new Dialog({
                                    title: '生成的密钥',
                                    content: '<textarea class="ui-textarea" readonly rows="4">' + res.data.key + '</textarea>',
                                    buttons: [{
                                        value: '复制',
                                        events: function () {
                                            util.copyToClipboard(res.data.key);
                                            util.msg('密钥已复制到剪贴板');
                                        }
                                    }, {
                                        value: '关闭'
                                    }]
                                });
                            } else {
                                util.msg( res.msg,'error');
                            }
                        });
                    }
                }, {
                    value: '取消'
                }]
            });
        });
        
    },
    getMachineID() {
        return new Promise((resolve, reject) => {
            util.ajax("/getMachineID", {}, (response) => {
                if (response.code === 200 && response.data.machineID) {
                    resolve(response.data.machineID);
                } else {
                    reject(new Error("无法获取机器ID"));
                }
            });
        });
    },

}
