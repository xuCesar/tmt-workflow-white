/**
 * Created by white on 2017/5/2.
 */

var InlineVideo = (function () {
    //private
    var videoDom = null;
    var videoCont = null;
    var isInitVideo = false;
    var videoMonitors = [];
    var monitorId = null;
    var monitorGap = 2;  // 监测时间范围 单位:s
    var isFullScreen = false;
    var initWidth, initHeight;
    var isRuning = false;

    // 构造函数
    function Constructor() {
        this.onVideoEnterFullScreen = null;
        this.onVideoExitFullScreen = null;
        this.onVideoEnd = null;
        this.isplay = false;
    }

    //class method
    //init with video src
    Constructor.init = function (vod, w, h, poster) {
        initWidth = window.innerWidth;
        initHeight = window.innerHeight;

        if (vod != undefined) {
            if (!isInitVideo && ua.iOS) {
                makeVideoPlayableInline(video, true)
            }
            ;

            w = w || 640;
            h = h || 1138;
            videoDom = vod;
            videoDom.className = "IIV";
            videoDom.style.width = w + "px";
            videoDom.style.height = h + "px";
            videoDom.setAttribute("poster", poster || "")
            videoDom.setAttribute("playsinline", "")
            videoDom.setAttribute("webkit-playsinline", "")
            videoDom.setAttribute("preload", "auto");
            videoDom.setAttribute("x5-video-player-type", "h5");
            videoDom.setAttribute("x5-video-player-fullscreen", "true");
            videoDom.setAttribute("x5-video-orientation", "portraint");

            initEvents();
            isInitVideo = true;
        }
    }
    // instance method
    Constructor.show = function () {
        videoDom.style.display = "block";
        InlineVideo.play();
    }

    Constructor.hide = function () {
        InlineVideo.pause();
        videoDom.style.display = "none";
        videoDom.setAttribute("z-index", "-1");
    }

    Constructor.play = function () {
        videoDom.play();
        InlineVideo.isplay = true;
    }

    Constructor.pause = function () {
        videoDom.pause();
        InlineVideo.isplay = false;
    }

    Constructor.addMonitor = function (t, callback) {
        var monitor = {"active": false, "id": videoMonitors.length, "time": t, "callback": callback};
        videoMonitors.push(monitor);
    }

    Constructor.cleanMonitor = function (t, callback) {
        videoMonitors = [];
    }

    Constructor.resetMonitors = function () {
        for (var i in videoMonitors) {
            videoMonitors[i]["active"] = false;
        }
    }
    function reviseFullScreen() {
        if (window.orientation == 0 || window.orientation == 180) {
            if (window.innerHeight > initHeight && !isFullScreen) {
                var offsetHeight = window.innerHeight - initHeight;
                if (this.onVideoEnterFullScreen != null) this.onVideoEnterFullScreen(offsetHeight);
                isFullScreen = true;
            } else {
                if (this.onVideoExitFullScreen != null) this.onVideoExitFullScreen();
                isFullScreen = false;
            }
        }
    }

    //private
    function initEvents() {
        if (ua.Android && ua.isWeixin) {
            window.addEventListener('resize', reviseFullScreen, false);
        }
        isRuning = true;
        requestAnimationFrame(videoMonitor);

        videoDom.addEventListener("ended", function () {
            if(InlineVideo.onVideoEnd)InlineVideo.onVideoEnd();
        });
        // videoDom.addEventListener("x5videoenterfullscreen", function () {});
        // videoDom.addEventListener("x5videoexitfullscreen", function () {});
        // videoDom.addEventListener("play", function () {});
    }

    function stopEvents() {
        window.removeEventListener('resize', reviseFullScreen);
        isRuning = false;
    }


    function videoMonitor() {
        if (videoDom != null) {
            var current = videoDom.currentTime;
            for (var i in videoMonitors) {
                var monitor = videoMonitors[i];
                var t = monitor["time"];
                var id = monitor["id"];
                // var callback = videoMonitors[i]["callback"];
                if (current > t && current < t + monitorGap && !monitor["active"]) {
                    monitor["callback"]();
                    monitor["active"] = true;
                    break;
                }
            }
        }

        if (isRuning) requestAnimationFrame(videoMonitor);
    }

    return Constructor;
})();
