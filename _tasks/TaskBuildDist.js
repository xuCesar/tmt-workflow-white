var _ = require('lodash');
var fs = require('fs');
var del = require('del');
var path = require('path');
var ejs = require('gulp-ejs');
var gulpif = require('gulp-if');
var less = require('gulp-less');
var sass = require('gulp-sass');
var util = require('./lib/util');
var uglify = require('gulp-uglify');
var useref = require('gulp-useref');
var lazyImageCSS = require('gulp-lazyimagecss');  // 自动为图片样式添加 宽/高/background-size 属性
var minifyCSS = require('gulp-cssnano');
var imagemin = require('gulp-imagemin');          // 压缩PNG，JPEG，GIF和SVG图像
var pngquant = require('imagemin-pngquant');
var tmtsprite = require('gulp-tmtsprite');        // 雪碧图合并
var ejshelper = require('tmt-ejs-helper');
var tmodjs = require('gulp-tmod');                // art-template 预编译
var inject = require('gulp-inject');              // 自动注入
var postcss = require('gulp-postcss');            // CSS 预处理
var postcssPxtorem = require('postcss-pxtorem');  // 转换 px 为 rem
var postcssAutoprefixer = require('autoprefixer');
var posthtml = require('gulp-posthtml');
var posthtmlPx2rem = require('posthtml-px2rem');
var RevAll = require('gulp-rev-all');   // reversion
var revDel = require('gulp-rev-delete-original');
var changed = require('./common/changed')();
var cache = require('gulp-cache');

var paths = {
    src: {
        dir: './src',
        img: './src/img/**/*.{JPG,jpg,jpeg,png,gif,svg}',
        slice: './src/slice/**/*.png',
        js: './src/js/**/*.js',
        media: './src/media/**/*',
        less: './src/css/style-*.less',
        lessAll: './src/css/**/*.less',
        sass: './src/css/style-*.scss',
        sassAll: './src/css/**/*.scss',
        template: './src/template/**/*.html',
        html: ['./src/html/**/*.html', '!./src/html/_*/**.html'],
        htmlAll: './src/html/**/*',
        index: './src/*.html',
        php: ['./src/*.php','./src/interface/*.php','./src/interface/**/*.php']
    },
    tmp: {
        dir: './tmp',
        css: './tmp/css',
        img: './tmp/img',
        html: './tmp/html',
        js: './tmp/js',
        sprite: './tmp/sprite'
    },
    dist: {
        dir: './dist',
        css: './dist/css',
        img: './dist/img',
        html: './dist/html',
        sprite: './dist/sprite',
        template: './dist/js'
    }
};

module.exports = function (gulp, config) {
    var webp = require('./common/webp')(config);

    var lazyDir = config.lazyDir || ['../slice'];
    var remConfig = config.remConfig || {rootValue: 75,unitPrecision: 10, prop_white_list:[], minPixelValue: 2};

    var postcssOption = [];

    if (config.supportREM) {
        postcssOption = [
            postcssAutoprefixer({browsers: ['last 5 versions']}),
            postcssPxtorem(remConfig)
        ]
    } else {
        postcssOption = [
            postcssAutoprefixer({browsers: ['last 5 versions']})
        ]
    }

    // 清除 dist 目录
    function delDist() {
        return del([paths.dist.dir]);
    }

    // 清除 tmp 目录
    function delTmp() {
        return del([paths.tmp.dir]);
    }

    // 清除 JS 合并产生后原始文件
    function delTmpJS(){
        var delConf = config['delTmpJS'] || ['./dist/js/**/*', '!./dist/js/template.js', '!./dist/js/main.js', '!./dist/js/libs.js','!./dist/js/build/*.js', '!./dist/js/template.*.js', '!./dist/js/main.*.js', '!./dist/js/libs.*.js'];
        return del(delConf)
    }

    //编译 less
    function compileLess() {
        return gulp.src(paths.src.less)
            .pipe(less())
            .pipe(lazyImageCSS({imagePath: lazyDir}))
            .pipe(tmtsprite({margin: 4}))
            .pipe(gulpif('*.png', gulp.dest(paths.tmp.sprite), gulp.dest(paths.tmp.css)));
    }

    //编译 sass
    function compileSass() {
        return gulp.src(paths.src.sass)
            .pipe(sass())
            .on('error', sass.logError)
            .pipe(lazyImageCSS({imagePath: lazyDir}))
            .pipe(tmtsprite({margin: 4}))
            .pipe(gulpif('*.png', gulp.dest(paths.tmp.sprite), gulp.dest(paths.tmp.css)));
    }

    //自动补全
    function compileAutoprefixer() {
        return gulp.src('./tmp/css/style-*.css')
            .pipe(postcss(postcssOption))
            .pipe(gulp.dest('./tmp/css/'));
    }

    //CSS 压缩
    function miniCSS() {
        return gulp.src('./tmp/css/style-*.css')
            .pipe(minifyCSS({
                safe: true,
                reduceTransforms: false,
                advanced: false,
                compatibility: 'ie7',
                keepSpecialComments: 0
            }))
            .pipe(gulp.dest('./tmp/css/'));
    }

    //图片压缩
    function imageminImg() {
        return gulp.src(paths.src.img)
            .pipe(cache(imagemin({
                //optimizationLevel: 5, // 默认：3  取值范围：0-7（优化等级）
                //progressive: true,    // 无损压缩jpg图片
                verbose: true,
                use: [pngquant()]     //使用pngquant深度压缩png图片的imagemin插件
            })))
            .pipe(gulp.dest(paths.tmp.img));
    }

    //复制媒体文件
    function copyMedia() {
        return gulp.src(paths.src.media, {base: paths.src.dir}).pipe(gulp.dest(paths.dist.dir));
    }

    function copyIndex() {
        return gulp.src(paths.src.index, {base: paths.src.dir}).pipe(gulp.dest(paths.dist.dir));
    }

    function copyPHP() {
        return gulp.src(paths.src.php, {base: paths.src.dir}).pipe(gulp.dest(paths.dist.dir));
    }

    //JS 压缩
    function uglifyJs() {
        return gulp.src(paths.src.js, {base: paths.src.dir})
            .pipe(uglify())
            // .pipe(obfuscate())
            .pipe(gulp.dest(paths.tmp.dir));
    }

    //雪碧图压缩
    function imageminSprite() {
        return gulp.src('./tmp/sprite/**/*')
            .pipe(imagemin({
                use: [pngquant()]
            }))
            .pipe(gulp.dest(paths.tmp.sprite));
    }

    // 判断是否执行 art-template 模板预编译 white++
    function supportTmod() {
        if (config['tmod']) {
            return gulp.series(
                artTemplate
            );
        } else {
            return function noTmod(cb) {
                cb();
            };
        }
    }

    //art Template 预编译 white++
    function artTemplate() {
        // console.log("compileTemplate: "+config.tmod);
        var temp_path = process.cwd() + '/src/template';
        return gulp.src(paths.src.template)
            .pipe(tmodjs({
                output: false,
                templateBase: temp_path
            }))
            .pipe(gulp.dest(paths.tmp.js))
            .on('data', function () {
            })
            .on('end', function () {
            });
    }

    //编译 根目录html
    function compileRootHtml() {
        // console.log(gulp.src('./dev/js/template.js'));
        return gulp.src(paths.src.index)
            .pipe(gulpif(
                config.tmod,
                supportInjectTemplate())  //,cwd: process.cwd() +'/dev'
            )
            .pipe(ejs(ejshelper()).on('error', function (error) {
                console.log(error.message);
            }))
            .pipe(gulpif(
                config.supportREM,
                posthtml(
                    posthtmlPx2rem(remConfig)
                ))
            )
            .pipe(useref({  //JS 合并压缩
                jsmin: uglify()
            }))
            .pipe(gulp.dest(paths.tmp.dir))
            .on('data', function () {
            })
            .on('end', function () {
            });
    }

    //html 编译
    function compileHtml() {
        return gulp.src(paths.src.html)
            .pipe(gulpif(
                config.tmod,
                supportInjectTemplate())  //,cwd: process.cwd() +'/dev'
            )
            .pipe(ejs(ejshelper()))
            .pipe(gulpif(
                config.supportREM,
                posthtml(
                    posthtmlPx2rem(remConfig)
                ))
            )
            .pipe(useref({  //JS 合并压缩
                jsmin: uglify()
            }))
            .pipe(gulp.dest(paths.tmp.html));
    }

    // 判断是否插入template.js white++
    function supportInjectTemplate() {
        if (config['tmod']) {
            return injectTemplate();
        } else {
            return function noTmod(cb) {
                cb();
            };
        }
    }

    function injectTemplate(){
        return inject(gulp.src('./js/template.js', {read: false,cwd: process.cwd() +'/tmp'}), {relative:true, name:'template', transform: function (filepath) {
            arguments[0] = filepath.replace('../tmp/', '');
            // console.log(arguments);
            // Use the default transform as fallback:
            return inject.transform.apply(inject.transform, arguments);
        }});
    }

    //webp 编译
    function supportWebp() {
        if (config['supportWebp']) {
            return webp();
        } else {
            return function noWebp(cb) {
                cb();
            }
        }
    }

    //新文件名(md5)
    function reversion(cb) {
        var revAll = new RevAll({
            fileNameManifest: 'manifest.json',
            dontRenameFile: ['.html', '.php']
        });
        if (config['reversion']) {
            return gulp.src(['./tmp/**/*'])
                .pipe(revAll.revision())
                .pipe(gulp.dest(paths.tmp.dir))
                .pipe(revDel({
                    exclude: /(.html|.htm)$/
                }))
                .pipe(revAll.manifestFile())
                .pipe(gulp.dest(paths.tmp.dir));
        } else {
            cb();
        }
    }

    function findChanged(cb) {
        if (!config['supportChanged']) {
            return gulp.src('./tmp/**/*', {base: paths.tmp.dir})
                .pipe(gulp.dest(paths.dist.dir))
                .on('end', function () {
                    delTmp();
                    delTmpJS();
                })
        } else {
            var diff = changed('./tmp');
            var tmpSrc = [];

            if (!_.isEmpty(diff)) {

                //如果有reversion
                if (config['reversion'] && config['reversion']['available']) {
                    var keys = _.keys(diff);

                    //先取得 reversion 生成的manifest.json
                    var reversionManifest = require(path.resolve('./tmp/manifest.json'));

                    if (reversionManifest) {
                        reversionManifest = _.invert(reversionManifest);

                        reversionManifest = _.pick(reversionManifest, keys);

                        reversionManifest = _.invert(reversionManifest);

                        _.forEach(reversionManifest, function (item, index) {
                            tmpSrc.push('./tmp/' + item);
                            console.log('[changed:] ' + util.colors.blue(index));
                        });

                        //将新的 manifest.json 保存
                        fs.writeFileSync('./tmp/manifest.json', JSON.stringify(reversionManifest));

                        tmpSrc.push('./tmp/manifest.json');
                    }
                } else {
                    _.forEach(diff, function (item, index) {
                        tmpSrc.push('./tmp/' + index);
                        console.log('[changed:] ' + util.colors.blue(index));
                    });
                }

                return gulp.src(tmpSrc, {base: paths.tmp.dir})
                    .pipe(gulp.dest(paths.dist.dir))
                    .on('end', function () {
                        delTmp();
                        delTmpJS();
                    })

            } else {
                console.log('Nothing changed!');
                delTmp();
                cb();
            }
        }

    }


    //加载插件
    function loadPlugin(cb) {
        util.loadPlugin('build_dist');
        cb();
    }

    //注册 build_dist 任务
    gulp.task('build_dist', gulp.series(
        delDist,
        compileLess,
        compileSass,
        compileAutoprefixer,
        miniCSS,
        gulp.parallel(
            imageminImg,
            imageminSprite,
            copyIndex,
            copyPHP,
            copyMedia,
            uglifyJs
        ),
        supportTmod(),
        compileHtml,
        compileRootHtml,
        reversion,
        supportWebp(),
        findChanged,
        loadPlugin
    ));
};
