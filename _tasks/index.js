var fs = require('fs');
var path = require('path');
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

module.exports = function (gulp) {
    fs.readdirSync(__dirname).filter(function (file) {
        return (file.indexOf(".") !== 0) && (file.indexOf('Task') === 0);
    }).forEach(function (file) {
        var registerTask = require(path.join(__dirname, file));
        registerTask(gulp, config);
    });
};
