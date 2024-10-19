import storage from "./storage";
import config from "../config";


function _multipleClick() {

    this.click_time = 0;
    this.click_count = 0;

    var _this = this;

    this.addClick = function(num, callback, tag) {
        var time = new Date().getTime();

        if (this.click_count == 0 || time - this.click_time < 300) {

            this.click_count += 1;

            console.log(tag + '事件当前点击：' + this.click_count);

            if (this.click_count == num) {

                if (!(!callback || typeof callback == 'undefined' || callback == undefined)) callback();

            }

            this.click_time = time;
        }
        setTimeout(function() {
            check();
        }, 300);

    }


    function check() {
        var time = new Date().getTime();
        if (time - _this.click_time > 300) {
            _this.click_count = 0;
            _this.click_time = 0;
        }
    }
}

export default {
    turn: function (str) {
        str = typeof str == "string" ? str.replace(/\\/g, '\\\\') : '';
        return str ? encodeURIComponent(str) : str;
    },

    //字符串转base64
    getEncode64(str) {
        return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
            function toSolidBytes(match, p1) {
                return String.fromCharCode('0x' + p1);
            }));

    },
    getDecode64(str) {
        return decodeURIComponent(atob(str).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
    },
    msg: function (msg, type) {
        let _type = ["success", "error"].indexOf(type) > -1 ? type : "success";
        //console.log("消息类型：", _type, $.lightTip);

        if (!msg) return;

        return typeof $.lightTip !== "undefined"
            ? $.lightTip[_type](msg)
            : alert(msg);
    },
    modal: function (msg, type, callback) {
        let _this = this;
        new Dialog().confirm(
            "\
            <h6>" +
            msg +
            "</h6>\
        <p>" +
            type +
            "</p>",
            {
                buttons: [
                    {
                        events: function (event) {
                            if (_this.isCallback(callback)) {
                                callback();
                            }
                            event.data.dialog.remove();
                        },
                    },
                    {},
                ],
            }
        );
    },
    i18n: function (name) {
        return compatible.i18n(name);
    },
    md5: function (str) {
        return str;
    },
    randomString: function (len) {
        len = len || 32;
        var $chars = "ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678";
        /****默认去掉了容易混淆的字符oOLl,9gq,Vv,Uu,I1****/
        var maxPos = $chars.length;
        var pwd = "";
        for (var i = 0; i < len; i++) {
            pwd += $chars.charAt(Math.floor(Math.random() * maxPos));
        }
        return pwd;
    },
    parse_str: function (str) {
        let s = str.split("&"),
            arr = {};
        for (let i = 0; i < s.length; i++) {
            let d = s[i].split("=");
            arr[d[0]] = d[1];
        }
        return arr;
    },
    ajax: function (url, data, callback,failcallback) {
        let _this = this,
            type = typeof data != "object" ? "get" : "post",
            server = storage.get('api_url') || config.API_URL,
            _url = url.indexOf("http") < 0 ? server + "///" + url : url;
        _url = _url.replace(/\/{3,}/gi, "/");
        callback = (typeof callback == "undefined" && typeof data == "function") ? data : callback;
        if (typeof data == "object") {
            data.t = data.token || storage.get("token");
        }
        $.ajax({
            url: _url,
            xhrFields: {
                // withCredentials: true
            },
            // contentType: "application/json",
            data: data,
            dataType: "json",
            type: type,
            // async: false,
            success: function (response) {
                if (
                    response &&
                    typeof response.msg != "undefined" &&
                    response.msg
                ) {
                    let type =
                        response.code !== 200
                            ? "error"
                            : "success";
                    _this.msg(response.msg, type);
                    if (response.code === 403) {
                    }
                }
                if (_this.isCallback(callback)) {
                    callback(response);
                }
            },
            fail: function (res) {
                console.log(res);
                _this.msg('请求失败:' + res.statusText, 'error');
                failcallback && failcallback(res);
            },
            error(res) {
                console.log(res);
                failcallback && failcallback(res);
            }
        });
    },
    isMobile: function () {
        if (
            /(iPhone|iPad|iPod|iOS|Android|BlackBerry|Windows Phone)/i.test(
                navigator.userAgent
            )
        ) {
            return true;
        }
        return false;
    },
    getBase64: function (img) {
        function getBase64Image(img, width, height) {
            //width、height调用时传入具体像素值，控制大小 ,不传则默认图像大小
            var canvas = document.createElement("canvas");
            canvas.width = width ? width : img.width;
            canvas.height = height ? height : img.height;
            var ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            var dataURL = canvas.toDataURL();
            return dataURL;
        }

        var image = new Image();
        image.crossOrigin = "";
        image.src = img;
        var deferred = $.Deferred();
        if (img) {
            image.onload = function () {
                deferred.resolve(getBase64Image(image)); //将base64传给done上传处理
            };
            return deferred.promise(); //问题要让onload完成后再return sessionStorage['imgTest']
        }
    },
    formatDate: function (time, fmt, is_date) {
        if (is_date) {
            var date = new Date(time);
        } else {
            var _time = time.toString(),
                timeStr =
                    _time.length === 10
                        ? parseInt(_time) * 1000
                        : parseInt(_time),
                date = new Date(timeStr);
        }
        var _fmt = fmt ? fmt : "yyyy-MM-dd";
        if (/(y+)/.test(_fmt)) {
            _fmt = _fmt.replace(
                RegExp.$1,
                (date.getFullYear() + "").substr(4 - RegExp.$1.length)
            );
        }
        let o = {
            "M+": date.getMonth() + 1,
            "d+": date.getDate(),
            "h+": date.getHours(),
            "m+": date.getMinutes(),
            "s+": date.getSeconds(),
        };
        // 遍历这个对象
        for (let k in o) {
            if (new RegExp(`(${k})`).test(_fmt)) {
                let str = o[k] + "";
                _fmt = _fmt.replace(
                    RegExp.$1,
                    RegExp.$1.length === 1
                        ? str
                        : ("00" + str).substr(str.length)
                );
            }
        }
        //let date=new Date(fmt);
        return _fmt;
    },
    getNowTime: function () {
        return new Date().getTime();
    },
    removeItem: function (arr, val) {
        return arr.filter(function (i) {
            return i !== val;
        })
    },
    objIsEmpty: function (obj) {
        return JSON.stringify(obj) === "{}";
    },
    isObj: function (val) {
        return (
            val != null &&
            typeof val === "object" &&
            this.isArray(val) === false
        );
    },
    isArray: function (str) {
        return Object.prototype.toString.call(str) === "[object Array]";
    },
    isStr: function (str) {
        return (
            typeof str == "string" && !(this.isObj(str) || this.isArray(str))
        );
    },
    isCallback: function (callback) {
        return typeof callback == "function";
    },
    cloneObj: function (obj) {
        let str,
            newobj = obj.constructor === Array ? [] : {};
        if (typeof obj !== "object") {
            return;
        } else if (window.JSON) {
            (str = JSON.stringify(obj)), //系列化对象
                (newobj = JSON.parse(str)); //还原
        } else {
            for (let i in obj) {
                newobj[i] =
                    typeof obj[i] === "object" ? cloneObj(obj[i]) : obj[i];
            }
        }
        return newobj;
    },
    objSort: function (obj) {
        //排序的函数
        let newkey = Object.keys(obj).sort(); //先用Object内置类的keys方法获取要排序对象的属性名，再利用Array原型上的sort方法对获取的属性名进行排序，newkey是一个数组
        let newObj = {}; //创建一个新的对象，用于存放排好序的键值对
        for (let i = 0; i < newkey.length; i++) {
            //遍历newkey数组
            newObj[newkey[i]] = obj[newkey[i]]; //向新创建的对象中按照排好的顺序依次增加键值对
        }
        return newObj; //返回排好序的新对象
    },
    getUrlParams: function () {
        let res = {},
            params = window.location.href.split("?");
        params = params[1].split("&");
        for (let i in params) {
            let item = params[i].split("=");
            res[item[0]] = item[1];
        }
        return res;
    },
    /**
     *
     * @param url
     * @returns {{path: string, protocol: string, file: string | string, port: string, query: string, host: string, source, params: {}, hash: string, relative: string | string, segments: string[]}}
     */
    parseURL: function (url) {
        let a = document.createElement("a");
        a.href = url;
        return {
            source: url,
            protocol: a.protocol.replace(":", ""),
            host: a.hostname,
            port: a.port,
            query: a.search,
            params: (function () {
                let ret = {},
                    seg = a.search.replace(/^\?/, "").split("&"),
                    len = seg.length,
                    i = 0,
                    s;
                for (; i < len; i++) {
                    if (!seg[i]) {
                        continue;
                    }
                    s = seg[i].split("=");
                    ret[s[0]] = s[1];
                }
                return ret;
            })(),
            file: (a.pathname.match(/\/([^\/?#]+)$/i) || [, ""])[1],
            hash: a.hash.replace("#", ""),
            path: a.pathname.replace(/^([^\/])/, "/$1"),
            relative: (a.href.match(/tps?:\/\/[^\/]+(.+)/) || [, ""])[1],
            segments: a.pathname.replace(/^\//, "").split("/"),
        };
    },
    isUrl: function (str_url) {
        var strRegex =
            "^((https|http|ftp|rtsp|mms)?://)" +
            "?(([0-9a-z_!~*'().&=+$%-]+: )?[0-9a-z_!~*'().&=+$%-]+@)?" + //ftp的user@
            "(([0-9]{1,3}.){3}[0-9]{1,3}" + // IP形式的URL- 199.194.52.184
            "|" + // 允许IP和DOMAIN（域名）
            "([0-9a-z_!~*'()-]+.)*" + // 域名- www.
            "([0-9a-z][0-9a-z-]{0,61})?[0-9a-z]." + // 二级域名
            "[a-z]{2,6})" + // first level domain- .com or .museum
            "(:[0-9]{1,4})?" + // 端口- :80
            "((/?)|" + // a slash isn't required if there is no file name
            "(/[0-9a-zA-Z_!~*'().;?:@&=+$,%#-]+)+/?)$";
        var re = new RegExp(strRegex);
        return re.test(str_url);
    },
    formatSize: (limit) => {
        if (!limit || Number(limit) == 0) return ''
        limit = Number(limit)
        // 将size B转换成 M
        var size = ''
        if (limit < 1 * 1024) {
            //小于1KB，则转化成B
            size = limit.toFixed(2) + 'B'
        } else if (limit < 1 * 1024 * 1024) {
            //小于1MB，则转化成KB
            size = (limit / 1024).toFixed(2) + 'KB'
        } else if (limit < 1 * 1024 * 1024 * 1024) {
            //小于1GB，则转化成MB
            size = (limit / (1024 * 1024)).toFixed(2) + 'MB'
        } else {
            //其他转化成GB
            size = (limit / (1024 * 1024 * 1024)).toFixed(2) + 'GB'
        }

        var sizeStr = size + '' //转成字符串
        var index = sizeStr.indexOf('.') //获取小数点处的索引
        var dou = sizeStr.substr(index + 1, 2) //获取小数点后两位的值
        if (dou == '00') {
            //判断后两位是否为00，如果是则删除00
            return sizeStr.substring(0, index) + sizeStr.substr(index + 3, 2)
        }
        return size
    },
    //相似度算法
    similar(s, t, f) {
        if (!s || !t) {
            return 0
        }
        var l = s.length > t.length ? s.length : t.length
        var n = s.length
        var m = t.length
        var d = []
        f = f || 3
        var min = function (a, b, c) {
            return a < b ? (a < c ? a : c) : (b < c ? b : c)
        }
        var i, j, si, tj, cost
        if (n === 0) return m
        if (m === 0) return n
        for (i = 0; i <= n; i++) {
            d[i] = []
            d[i][0] = i
        }
        for (j = 0; j <= m; j++) {
            d[0][j] = j
        }
        for (i = 1; i <= n; i++) {
            si = s.charAt(i - 1)
            for (j = 1; j <= m; j++) {
                tj = t.charAt(j - 1)
                if (si === tj) {
                    cost = 0
                } else {
                    cost = 1
                }
                d[i][j] = min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
            }
        }
        let res = (1 - d[n][m] / l)
        return res.toFixed(f)
    },
    copyToClipboard(text) {
        if (navigator.clipboard && window.isSecureContext) {
            // 对于支持 Clipboard API 的现代浏览器
            navigator.clipboard.writeText(text).then(() => {
                util.msg('密钥已成功复制到剪贴板');
            }).catch(err => {
                console.error('无法复制文本: ', err);
                util.msg('复制失败，请手动复制');
            });
        } else {
            // 回退方法，适用于不支持 Clipboard API 的浏览器
            let textArea = document.createElement("textarea");
            textArea.value = text;
            
            // 使 textArea 不可见
            textArea.style.position = "fixed";
            textArea.style.left = "-999999px";
            textArea.style.top = "-999999px";
            document.body.appendChild(textArea);
            
            textArea.focus();
            textArea.select();
    
            try {
                let successful = document.execCommand('copy');
                if (successful) {
                    util.msg('密钥已成功复制到剪贴板');
                } else {
                    util.msg('复制失败，请手动复制');
                }
            } catch (err) {
                console.error('无法复制文本: ', err);
                util.msg('复制失败，请手动复制');
            }
    
            document.body.removeChild(textArea);
        }
    },
    click: function(num, callback, tag) {

        if (!global.multipleClick) {
            global.multipleClick = {};
        }
		 
        var obj = global.multipleClick[tag];

        if (!obj) {
            obj = global.multipleClick[tag] = new _multipleClick();
        }

        obj.addClick(num, callback, tag);
    } 
    
 

};
