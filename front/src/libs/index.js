import util from "./util";
import storage from "./storage";
import config from "../config";
import videojs from "video.js";

function findNext() {
    window.editor.refresh();
    var inpEle = document.getElementById("CodeMirror-search-field"), val = inpEle.value;
    // 模拟回车
    inpEle.focus();
    setTimeout(function () {
        const event = new Event("keydown");
        // 设置按键码为回车键的值
        Object.defineProperty(event, "keyCode", {value: 13});
        // 分派按键事件到目标输入框元素
        inpEle.dispatchEvent(event);
    }, 100)
}

window.findNext = findNext;


$(document).on("input propertychange", "#CodeMirror-search-field", function () {
    $("#match_rule").val($(this).val());
    findNext();
});
$(document).on("blur", "#CodeMirror-search-field", function () {
    $(".CodeMirror-sizer").css({"padding-top": "0px"});
});


export default {


    match_rule: "",
    file_index: "",

    dirs: [],
    files: [],

    show: [],
    show_type: 'shell',
    showFiles(type) {
        this.show_type = type;
        this.show = type === 'file' ? this.files : this.shells;
        this.showfiles(this.show);
    },
    inShellFiles(file) {
        return this.shell_files.length > 0 && this.shell_files.indexOf(file) !== -1 ? ' shell ' : '';
    },

    code_file: "",
    saveFile() {

        util.ajax("/saveFile",
            {
                path: this.code_file,
                content: window.editor.getValue()
            });

    },
    code(file, rule, file_index) {

        try {
            file = util.getDecode64(file)
            rule = util.getDecode64(rule)
        } catch (e) {

        }
        console.log('code 编辑文件:', file, rule)
        this.code_file = file;
        this.file_index = file_index;
        this.rule_id = '';
        this.showRule(rule, false);
        this.match_rule = typeof rule == "undefined" || rule == "undefined" ? '' : '/' + rule + '/';
        util.ajax("/code", {path: file}, (response) => {
            window.editor.setValue(response.data);
            $("#code_file").val(file);
            window.dialog = new Dialog({
                title: "代码查看",
                content: $("#editor").show(),
                width: "80%",
                onShow() {
                    setTimeout(function () {
                        $('#match_rule').trigger('click');
                        findNext();
                    }, 300)
                }
            });
        });
    },
    delFile() {
        var _this = this;
        console.log('$("[title=\'' + _this.code_file + '\']").addClass(\'color-red\')')
        new Dialog().confirm(
            "<h6>您确定要删除该文件吗？</h6>\
                <p>删除前最好先手动备份一下文件。</p>",
            {
                buttons: [
                    {
                        value: "删除",
                        events: function (event) {
                            util.ajax("/delfile", {path: _this.code_file}, (response) => {
                                event.data.dialog.remove();
                                if (response.code === 200) {
                                    window.dialog.hide();

                                    $('[title="' + _this.code_file + '"]').addClass('color-red');
                                    setTimeout(function () {
                                        _this['show'].splice(_this.file_index, 1);
                                    }, 1000)
                                }
                            });
                        },
                    },
                    {},
                ],
            }
        );
    },

    files_num: "",
    shells_num: 0,
    shells: [],
    shell_files: [],
    scan:'',
    scaning: false,
    scaning_time: 0,
    ls(scan) {
        this.shells_num = "...";
        this.scan = typeof scan == "undefined" ? '' : scan;
        $('#scan-btn,#load-file').addClass('loading');
        var _this = this;

        if (scan) {
            this.scaning = true;
            this.scaning_time = 0;
            window.scan_time = setInterval(function () {
                _this.scaning_time++;
            }, 1000)
        }

        util.ajax("/files", {path: _this.path, scan: scan, filter: this.select_file_types}, (response) => {

 
            _this.scaning = false;
            clearInterval(window.scan_time);
            $('#scan-btn,#load-file').removeClass('loading');



            _this.files = response.data.Files ? response.data.Files : [];
            _this.shells = response.data.Shells ? response.data.Shells : [];

            _this.files_num = _this.files.length;
            _this.shells_num = _this.shells.length;
            console.log('shells', scan,this.shells);
            _this.show_type = scan=='shell' ? 'shell' : 'file';
            // _this.show = scan=='shell' ? _this.shells : _this.files;
            _this.showfiles(scan=='shell' ? response.data.Shells : response.data.Files)
            if (_this.shells) {
                _this.shell_files = [];
                for (var i in _this.shells) {
                    _this.shell_files.push(_this.shells[i].File)
                } 
                //console.log('shell_files', _this.shell_files);
            }
            _this.hash_ls = true;  

        });
    },
    showfiles(files) {

        var tpl=`{{~it :file:index}}
            <li class="file level-{{=file.Level}} {{=app.inShellFiles(file.File)}}" id="file-{{=index}}">
                <span class="num">{{=index+1}}</span>
                <span class="name tips" title="{{=file.File}}"
                      onclick=app.code('{{=util.getEncode64(file['File'])}}','{{=util.getEncode64(file.Match)}}',{{=index}})><i
                        class="text">文件:</i> <b class="file-path">{{=file.File}}</b></span>
                <span class="size {{=app.show_type}}"><i class="text">大小:</i><b>{{=util.formatSize(file.Size)}}</b></span>
                <span class="match tips" x-show="show_type==='shell'"
                      onclick=app.showRule('{{=util.getEncode64(file['Match'])}}',true)
                      title="{{=file.Remark}}"><i class="text">规则:</i><b class="file-path">{{=file.Match}} </b></span>
                <span class="time {{=app.show_type}} "><i class="text">日期:</i> <b>{{=util.formatDate(file.Time,'yyyy-MM-dd hh:mm:ss',true)}}</b></span>
            </li> {{~}}`;
        var html = doT.template(tpl)(files);
        //console.log(html,files,document.getElementById('file-list-tpl').innerHTML)
        $('#show-files').html(html)
    },
    // 文件类型选择
    select_file_types: [],
    selectFileExt(file_ext) {
        if (file_ext && this.select_file_types.indexOf('.' + file_ext) < 0) {
            this.select_file_types.push('.' + file_ext);
        } else {
            this.select_file_types = util.removeItem(this.select_file_types, '.' + file_ext)
        }

        console.log(this.select_file_types)
    },
    inSelectFile(file_ext) {

        return file_ext && this.select_file_types.indexOf('.' + file_ext) > -1;

    },
    search() {
        if ($(".CodeMirror-dialog").length < 1) {
            try {
                window.editor.execCommand("findPersistent", true, $("#match_rule").val());
            } catch (e) {
            }
        }
        $(".CodeMirror-sizer").css({"padding-top": "20px"});
        $("#CodeMirror-search-field").val($('#match_rule').val());
    },


    rules: [],
    white_list: [],

    load() {
        var _this = this;

        util.ajax("/dir?path=" + encodeURI(_this.path), (response) => {
            if(response.code==200){
                _this.dirs = response.data;
                _this.files_num = response.msg > 0 ? response.msg : 0;
            }else{
                _this.setPath('/');
            }
        });

    },
    configs: {},
    config: {},
    editConfig(config) {
        console.log(config)
        this.config = config;
        window.cfgDialog = new Dialog({
            title: "配置编辑",
            content: $("#config").show()
        });
    },

    saveConfig() {
        var _this = this;
        util.ajax("/saveConfig", this.config, (response) => {
            window.cfgDialog.hide();
            _this.loadConfig()
        });
    },
    file_types: [],
    quick_dirs: {},
    quick_dirs_exts: {},
    loadConfig() {
        var _this = this;
        util.ajax("/config", (response) => {
            _this.configs = response.data.Configs;

            for (var i in _this.configs) {

                if (_this.configs[i]['Value']) {

                    switch (_this.configs[i].Name) {
                        case 'file_type':
                            _this.file_types = _this.configs[i]['Value'].split('|');
                            break;
                        case 'css':
                            console.log($('#user-css'))
                            $('#user-css').remove();
                            $('head').append('<style id="user-css">' + _this.configs[i]['Value'] + '</style>');
                            break;
                        case 'js':
                            $('#user-js').remove();
                            $('head').append('<script  id="user-js">' + _this.configs[i]['Value'] + '</script>');
                            break;
                        case "quick_dirs":
                            var arr = _this.configs[i]['Value'].split("\n");
                            if (arr) {
                                _this['quick_dirs'] = {};
                                _this['quick_dirs_exts'] = {};
                                arr.forEach(function (item) {
                                    var _ = item.split('|');
                                    _this['quick_dirs'][_[0]] = {path: _[1],exts: _[2].split(',')||[]};
                                 
                                }) 
                            }

                            break;
                    }
                }

            }
            _this.rules = response.data.Rules || [];
            _this.white_list = response.data.Whites || [];
        });


    },

    init() {
        this.loadConfig()
        this.load();
        this.checkUpdate();
        this.player= videojs('player');

    },


    hash_ls: false,
    path: storage.get("path") || "/",
    path_root: storage.get("path_root") || "/",
    setPath(item) {
        let path=typeof item==='string'?item:item.path;
        this.path_root = this.path = path.replace("//", "/");
        this.hash_ls = false;
        this.now_show = "files";

        var exts=typeof item==='string'?false:(item.exts||[]);
        console.log('exts',exts);
        if(exts){
            this.select_file_types=exts;
        }
        
        storage.set('path', this.path);
        storage.set('path_root', this.path);

    },
    goBackPath() {
        if (this.path === "/") {
            new LightTip().success("已经是根目录了");
            return;
        }
        var dir =
                this.path === "/"
                    ? "/"
                    : this.path.substring(0, this.path.lastIndexOf("/")),
            reg = new RegExp("%20", "g");
        dir = dir.replace(reg, " ");
        if (dir === "") {
            dir = "/";
        }
        this.path_root = this.path = dir;
        storage.set('path', dir);
        storage.set('path_root', dir);
        this.hash_ls = false;
    },

    white_type: 'hash',
    white_remark: '',
    white_all: false,
    getShowFiles() {
        if (!this.show || this.show.length < 1) {
            return null;
        }
        var files = [];
        for (var i in this.show) {
            files.push(this.show[i].File)
        }
        return files;

    },
    joinWhiteList() {
        var _this = this, files = this.white_all ? this.getShowFiles() : [this.code_file];

        if (!files || files.length < 1) {
            return util.msg('无选定的文件', 'error');
        }
        util.ajax("/joinWhiteList", {
            file: files,
            type: this.white_type,
            remark: this.white_remark
        }, (response) => {
            window.wld.hide();
            _this.ls(true);
        });
    },
    showJoinWhiteList(all) {
        this.white_all = typeof all !== "undefined" && all ? true : false;
        window.wld = new Dialog({
            title: "白名单设置",
            content: $("#join-white").show()
        });
    },
    rule_lang: 'php',
    rule_remark: '',
    rule_level: 1,
    rule_id: '',

    showRule(rule, show_dialog) {

        console.log(typeof rule, rule);
        if (typeof rule == "object") {
            this.match_rule = rule.Rule;
            this.rule_id = rule.Id;
            this.rule_lang = rule.Lang;
            this.rule_remark = rule.Remark;
            this.rule_level = rule.Level;
            $('#match_rule').val(rule.Rule);
            return;
        }
        try {
            rule = util.getDecode64(rule)
        } catch (e) {

        }
        this.match_rule = rule;
        this.rule_id = "";
        typeof show_dialog !== "undefined" && show_dialog && this.showSaveRule()
        for (var i in this.rules) {
            if (this['rules'][i].Rule == rule) {
                this.match_rule = this['rules'][i].Rule;
                this.rule_id = this['rules'][i].Id;
                this.rule_lang = this['rules'][i].Lang;
                this.rule_remark = this['rules'][i].Remark;
                this.rule_level = this['rules'][i].Level;
                $('#match_rule').val(rule.Rule);
                break;
            }
        }

    },
    joinRule() {
        var _this = this;
        util.ajax("/rule", {
            id: this.rule_id,
            rule: $('#rule').val(),
            lang: this.rule_lang,
            remark: this.rule_remark,
            level: this.rule_level
        }, (response) => {
            _this.loadConfig()
            window.rld.hide();
        });
    },
    showSaveRule() {
        if (!this.match_rule && !$('#match_rule').val()) {
            return util.msg('请先输入规则', 'error');
        }
        this.match_rule = $('#match_rule').val();
        console.log(this.match_rule, typeof this.match_rule, 'this.match_rule')
        window.rld = new Dialog({title: "规则设置", content: $("#join-rule").show()});
    },
    searchRule() {
        if (!this.match_rule && !$('#match_rule').val()) {
            return util.msg('请先输入规则', 'error');
        }
        this.match_rule = $('#match_rule').val();
        this.similarRules = [];
        var html = '';
        for (var i in this.rules) {

            if (util.similar(this.rules[i].Rule, this.match_rule) > 0.2) {

                console.log(util.similar(this.rules[i].Rule, this.match_rule), this.rules[i].Rule, this.match_rule);
                html += '<span class="ui-button ui-button-primary small-btn" onclick="app.showRule(app.rules[' + i + '])"><b>' + app.rules[i].Rule + '</b></span>'

            }
        }

        $('#similar-rules').html(html)
        console.log(html)
    },


    now_show: 'files',
    delData(id, table) {
        var _this = this;
        util.ajax('/delData', {id: id, table: table}, function (response) {
            _this.loadConfig()
        })
    },
    videos:[],
    player:null,
    video_src:'https://www.w3schools.com/html/movie.mp4',
    loadVideos(){
        this.videos=[];
        var url=storage.get('video_url') || config.VIDEO_URL,_this=this;
        if(url && util.isUrl(url)){
            util.ajax(url,function (response) {
                if(response.data && response.data.length>0){
                    _this.videos=response.data
                }
            })
        }
    }
    ,
    play(video){
        this.video_src=video.src;
         this.player.src(video.video_src);
         this.player.play();

         new Dialog({
            title: video.name,
            content: $("#video").show()
        });
    }
};
