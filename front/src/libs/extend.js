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
        var _this = this,update_notice=storage.get('update_notice');
        util.ajax('/update', function (res) {
            var data=res.data;
            _this.updateConfig(data)
            if (config.VERSION !== data.version && (typeof update_notice !="undefined" && update_notice!=0 )) {
                new Dialog({
                    title: "检测到新版本 V"+data.version+",可前往github下载",
                    content: '<div id="update"> <a class="ui-button ui-button ui-button-warning" target="_blank" href="https://github.com/DDZH-DEV/Find-Your-Shell">GITHUB下载</a>' +
                        '<a href="https://gitee.com/DDZH-DEV/Find-Your-Shell" class="ui-button ui-button ui-button-warning"  target="_blank" >GITEE下载</a></div>',
                    buttons:[{
                        value:'不再提醒',
                        events: function(event) {
                            storage.set('update_notice',0,86400)
                            event.data.dialog.remove();
                        }
                    }]
                });
            }
        })
    },
    shang() {
        new Dialog({
            title: "打赏作者",
            content: '<div  id="shang"><img src="' + config.SHANG + '"/> <p class="text">软件花费的是个人业余时间，不定期更新，如果你觉得软件不错，打赏将为我提供源源不断的动力。</p></div>',
        });
    },
    help(){
        new Dialog({
            title: '温馨提示',
            content: '这个功能本是上传到云端进行匹配,但这功能没写完,可以找人去识别判断.',
            buttons: [{},{}]
        });
    }
}