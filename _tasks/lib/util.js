var fs = require('fs');
var path = require('path');
var util = require('gulp-util');
// todo 两个config (index.js and util.js) ...
var config = require('rc')('tmtworkflow', {
    projectName: process.cwd().split(path.sep).pop(),
    //自动刷新
    livereload: {
        "available": true,  //开启自动刷新
        "port": 8080,
        "startPath": "TmTIndex.html"  //启动时自动打开的路径
    },
    //插件功能
    //路径相对于 tasks/plugins 目录
    plugins: {
        "build_devAfter": ["TmTIndex"],  //dev 任务执行后自动执行
        "build_distAfter": [],          //build 任务执行后自动执行
        "ftpAfter": ["ftp"]        //ftp 任务执行后自动执行
    },
    lazyDir: ["../slice"], //gulp-lazyImageCSS 寻找目录(https://github.com/weixin/gulp-lazyimagecss)
    supportWebp: false,  //编译使用 webp
    supportREM: false,   //REM转换
    reversion: false,     //新文件名功能
    remConfig: {
        "rootValue": 20,
        "unitPrecision": 10,
        "minPixelValue": 2
    },
    tmod: false,          // art-template 模板预编译
});

var tmt_util = {
    log: function (task_name) {
        util.log.apply(util, arguments);
    },
    task_log: function (task_name) {
        this.log(util.colors.magenta(task_name), util.colors.green.bold('√'));
    },
    loadPlugin: function (name, cb) {
        name = name + 'After';

        if (config['plugins'] && config['plugins'][name] && config['plugins'][name].length) {
            var plugins = config['plugins'][name];

            plugins.every(function (plugin) {
                if (plugin.indexOf('.js') === -1) {
                    plugin += '.js';
                }

                var filepath = path.resolve(__dirname, '../plugins', plugin);

                if (fs.existsSync(filepath)) {
                    require(filepath)(config);
                    (typeof cb === 'function') && cb();
                } else {
                    console.log('The ' + filepath + ' is not found!');
                    (typeof cb === 'function') && cb();
                }
            });
        }
    },
    colors: util.colors
};

module.exports = tmt_util;
