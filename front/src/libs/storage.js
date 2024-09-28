/**
 * 如果需要对键进行加密请自行安装模块
 * npm install md5
 */
//let md5 = require('md5');
export default {
    /**
     * 新增数据
     * @param {String} _key
     * @param {mixed} val
     * @param {Number} _expire_time
     */
    set: function (_key, val, _expire_time) {
        var time = new Date().getTime(),
            key = this.hash(_key),
            expire_time = _expire_time ? _expire_time : 0;
        if (expire_time > 0) {
            expire_time = time + expire_time * 1000;
        }
        var obj = {},
            _v = {
                val: val,
                expire_time: expire_time,
            };
        localStorage.setItem(key, JSON.stringify(_v));
    },
    /**
     * 获取数据
     * @param  {String}   key
     * @param  {Function} callback
     * @return mixed
     */
    get: function (key, callback) {
        var _this = this,
            _key = this.hash(key),
            res = localStorage.getItem(_key);
        //console.log('读取的结果：' + key + ':' + res);
        if (res) {
            res = JSON.parse(res);
            if (typeof res.val != "undefined") {
                if (typeof res.expire_time != "undefined") {
                    var time = new Date().getTime();
                    if (res.expire_time > 0 && time > res.expire_time) {
                        console.log("过期删除KEY:" + key, key);
                        _this.remove(key);
                        if (this.isCallback(callback)) {
                            callback(null);
                        }
                        return null;
                    }
                }
                if (this.isCallback(callback)) {
                    callback(res.val);
                }
                return res.val;
            }
        } else {
            if (this.isCallback(callback)) {
                callback(null);
            }
            return null;
        }
    },
    /**
     * 删除单个数据
     * @param  {String}   key
     * @param  {Function} callback
     */
    remove: function (key, callback) {
        var _key = this.hash(key);
        localStorage.removeItem(_key);
        if (this.isCallback(callback)) {
            callback();
        }
    },
    /**
     * 清除全部
     * @param  {Function} callback
     */
    clear: function (callback) {
        var len = localStorage.length; // 获取长度
        for (var i = 0; i < len; i++) {
            // 获取key 索引从0开始
            var getKey = localStorage.key(i);
            if (getKey !== "crx_api_url") {
                localStorage.removeItem(getKey);
            }
        }
        if (this.isCallback(callback)) {
            callback();
        }
    },
    hash: function (key) {
        //return md5(key);
        return key;
    },
    isCallback: function (callback) {
        return typeof callback == "function";
    },
};
