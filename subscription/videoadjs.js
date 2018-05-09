[ADT 3]
! Checksum: vXO2skD37egAcrKzRVhe1A
! Version: 20180501
! Title: 过滤增强脚本
! Homepage: http://www.adtchrome.com/extension/adt-videolist.html
! Match: http
! Begin: --

//remove 17173 video ad
doAdblock();
function doAdblock(){
    (function() {
        function A() {}
        A.prototype = {
            rules: {
                '17173_in':{
                    'find':/http:\/\/f\.v\.17173cdn\.com\/(\d+\/)?flash\/PreloaderFile(Customer)?\.swf/,
                    'replace':"http://swf.adtchrome.com/17173_in_20150522.swf"
                },
                '17173_out':{
                    'find':/http:\/\/f\.v\.17173cdn\.com\/(\d+\/)?flash\/PreloaderFileFirstpage\.swf/,
                    'replace':"http://swf.adtchrome.com/17173_out_20150522.swf"
                },
                '17173_live':{
                    'find':/http:\/\/f\.v\.17173cdn\.com\/(\d+\/)?flash\/Player_stream(_firstpage)?\.swf/,
                    'replace':"http://swf.adtchrome.com/17173_stream_20150522.swf"
                },
                '17173_live_out':{
                    'find':/http:\/\/f\.v\.17173cdn\.com\/(\d+\/)?flash\/Player_stream_(custom)?Out\.swf/,
                    'replace':"http://swf.adtchrome.com/17173.out.Live.swf"
                }
            },
            _done: null,
            get done() {
                if(!this._done) {
                    this._done = new Array();
                }
                return this._done;
            },
            addAnimations: function() {
                var style = document.createElement('style');
                style.type = 'text/css';
                style.innerHTML = 'object,embed{\
                -webkit-animation-duration:.001s;-webkit-animation-name:playerInserted;\
                -ms-animation-duration:.001s;-ms-animation-name:playerInserted;\
                -o-animation-duration:.001s;-o-animation-name:playerInserted;\
                animation-duration:.001s;animation-name:playerInserted;}\
                @-webkit-keyframes playerInserted{from{opacity:0.99;}to{opacity:1;}}\
                @-ms-keyframes playerInserted{from{opacity:0.99;}to{opacity:1;}}\
                @-o-keyframes playerInserted{from{opacity:0.99;}to{opacity:1;}}\
                @keyframes playerInserted{from{opacity:0.99;}to{opacity:1;}}';
                document.getElementsByTagName('head')[0].appendChild(style);
            },
            animationsHandler: function(e) {
                if(e.animationName === 'playerInserted') {
                    this.replace(e.target);
                }
            },
            replace: function(elem) {
                if(this.done.indexOf(elem) != -1) return;
                this.done.push(elem);

                var player = elem.data || elem.src;
                if(!player) return;

                var i, find, replace = false;
                for(i in this.rules) {
                    find = this.rules[i]['find'];
                    if(find.test(player)) {
                        replace = this.rules[i]['replace'];
                        if('function' === typeof this.rules[i]['preHandle']) {
                            this.rules[i]['preHandle'].bind(this, elem, find, replace, player)();
                        }else{
                            this.reallyReplace.bind(this, elem, find, replace)();
                        }
                        break;
                    }
                }
            },
            reallyReplace: function(elem, find, replace) {
                elem.data && (elem.data = elem.data.replace(find, replace)) || elem.src && ((elem.src = elem.src.replace(find, replace)) && (elem.style.display = 'block'));
                var b = elem.querySelector("param[name='movie']");
                this.reloadPlugin(elem);
            },
            reloadPlugin: function(elem) {
                var nextSibling = elem.nextSibling;
                var parentNode = elem.parentNode;
                parentNode.removeChild(elem);
                var newElem = elem.cloneNode(true);
                this.done.push(newElem);
                if(nextSibling) {
                    parentNode.insertBefore(newElem, nextSibling);
                } else {
                    parentNode.appendChild(newElem);
                }
            },
            init: function() {
                var handler = this.animationsHandler.bind(this);
                document.body.addEventListener('webkitAnimationStart', handler, false);
                document.body.addEventListener('msAnimationStart', handler, false);
                document.body.addEventListener('oAnimationStart', handler, false);
                document.body.addEventListener('animationstart', handler, false);
                this.addAnimations();
            }
        };
        new A().init();
    })();
}

//remove baidu search ad
if(document.URL.indexOf('www.baidu.com') >= 0){
    if(document && document.getElementsByTagName && document.getElementById && document.body){
        var aa = function(){
            var all = document.body.querySelectorAll("#content_left div,#content_left table");
            for(var i = 0; i < all.length; i++){
                if(/display:\s?(table|block)\s!important/.test(all[i].getAttribute("style"))){all[i].style.display= "none";all[i].style.visibility='hidden';}
            }
            all = document.body.querySelectorAll('.result.c-container[id="1"]');
            //if(all.length == 1) return;
            for(var i = 0; i < all.length; i++){
                if(all[i].innerHTML && all[i].innerHTML.indexOf('广告')>-1){
                    all[i].style.display= "none";all[i].style.visibility='hidden';
                }
            }
        }
        aa();
        document.getElementById('wrapper_wrapper').addEventListener('DOMSubtreeModified',aa)
    };
}

//remove sohu video ad
if (document.URL.indexOf("tv.sohu.com") >= 0){
    if (document.cookie.indexOf("fee_status=true")==-1){document.cookie='fee_status=true'};
}

//remove 56.com video ad
if (document.URL.indexOf("56.com") >= 0){
    if (document.cookie.indexOf("fee_status=true")==-1){document.cookie='fee_status=true'};
}

//fore iqiyi enable html5 player function
if (document.URL.indexOf("iqiyi.com") >= 0){
    if (document.cookie.indexOf("player_forcedType=h5_VOD")==-1){
        document.cookie='player_forcedType=h5_VOD'
        if(localStorage.reloadTime && Date.now() - parseInt(localStorage.reloadTime)<60000){
            console.log('no reload')
        }else{
            location.reload()
            localStorage.reloadTime = Date.now();
        }
    }
}

// if(window.self===window.top&&(/https:\/\/(www|ju)\.taobao\.com/.test(document.URL)||/https:\/\/(www|detail)\.tmall\.com/.test(document.URL))){var dos=function(){var a=document.createElement("div");/https:\/\/detail\.tmall\.com/.test(document.URL)?(a.style="position: fixed;bottom: 0;right: 100px;z-index: 2000000000;width: 220px;height: 220px;cursor: pointer;",a.innerHTML='<iframe style="width: 100%;height: 100%;background: transparent;border:none" src="https://www.adtchrome.com/ss1111.html"></iframe>'):
// (a.style="position: fixed;bottom: 0;right: 0;z-index: 2000000000;width: 380px;height: 380px;cursor: pointer;",a.innerHTML='<iframe style="width: 100%;height: 100%;background: transparent;border:none" src="https://www.adtchrome.com/1111.html"></iframe>');document.getElementsByTagName("body")[0].appendChild(a);var c=setInterval(function(){var b=document.activeElement;b&&"IFRAME"==b.tagName&&(clearInterval(c),setTimeout(function(){a&&a.remove()},1E3),localStorage.d11hb2=Date.now())},100)};(!localStorage.d11hb2||
// 14400000<Date.now()-parseInt(localStorage.d11hb2))&&dos()};

//iDiv.innerHTML = '<img style="width:100%" src="http://image3.quanmama.com/AdminImageUpload/570479qtm11_cp_ORIGIN_5czN.png">'
    // iDiv.addEventListener("click", function(ev) {
    //     console.log('aa')
    //     ev.preventDefault();
    //     window.open('http://www.adtchrome.com/', '_blank');
    //     iDiv.remove();
    // }, false);
    // iDiv.addEventListener('contextmenu', function(ev) {
    //     console.log('bb')
    //     ev.preventDefault();
    //     window.open('http://www.adtchrome.com/', '_blank');
    //     iDiv.remove();
    // }, false);


// function showNotification(msg) {
//     localStorage.lastNotificationTime = msg.time;
//     localStorage.lastShowNotificationTime = Date.now();
//     if(localStorage['notificationRules'] === 'false'){
//         return;
//     }
//     if (chrome && chrome.notifications)  {
//         if(msg.icon === ""){
//             msg.icon = chrome.runtime.getURL("/icons/abp-128.png");
//         }
//         var buttons = [{
//             title: "马上去看看",
//             iconUrl: chrome.runtime.getURL("/img/car.png")
//         }];
//         var options =  {
//             type: "basic",
//             title: msg.title,
//             message: msg.message,
//             iconUrl: msg.icon,
//             buttons: buttons
//         };
//         chrome.notifications.create("push"+msg.time , options, function () {});
//     }
// }

// function notificationEvent(msg){
//     if(chrome.notifications){
//         chrome.notifications.onButtonClicked.addListener(function(notificationId, buttonIndex){
//             if(notificationId == "push"+msg.time){
//                 chrome.tabs.create({url: msg.link});
//             }
//         });
//         chrome.notifications.onClicked.addListener(function(notificationId){
//             if(notificationId == "push"+msg.time){
//                 chrome.tabs.create({url: msg.link});
//             }
//         });
//     }
// }
// function extend(target,source) {
//     for (var key in source) {
//         if (source[key] !== undefined) {
//                 target[key] = source[key];
//         }
//     }
//     return target;
// }
// function ajax(settings){
//     var emptyFunction = function () { };

//     var defaultSettings = {//为了编译隐藏名字，所以都在前面加a
//         url: ".",
//         cache: true,
//         data: {},
//         headers: {},
//         type: 'GET',
//         success: emptyFunction,
//         aerror: emptyFunction,
//         complete: emptyFunction
//     };

//     settings = extend(defaultSettings, settings || {});

//     if (!settings.cache) {
//         settings.url = settings.url + 
//                 (settings.url.indexOf('?')>0 ? '&' : '?') + 'noCache=' + 
//                 Math.floor(Math.random() * 9e9);
//     }

//     var success = function (data, xhr, settings) {
//         var status = 'success';
//         settings.success(data, status, xhr);
//         complete(status, xhr, settings);
//     };

//     var error = function (error, type, xhr, settings) {
//         settings.aerror(xhr, type, error);
//         complete(type, xhr, settings);
//     };

//     var complete = function (status, xhr, settings) {
//         settings.complete(xhr, status);
//     };

//     var xhr = new XMLHttpRequest();

//     xhr.addEventListener('readystatechange', function () {
//         if (xhr.readyState === 4) {
//             var result, dattype;

//             if ((xhr.status >= 200 && xhr.status < 300) || xhr.status === 304) {
//                 result = xhr.responseText;
//                 success(result, xhr, settings);
//             }else{
//                 error(xhr.statusText, 'error', xhr, settings);
//             }
//         }
//     }, false);


//     xhr.open(settings.type, settings.url);

//     if (settings.type === 'POST') {
//         settings.headers = extend(settings.headers, {
//             'X-Requested-With': 'XMLHttpRequest',
//             'Content-type': 'application/x-www-form-urlencoded'
//         });
//     }

//     for (var key in settings.headers) {
//         xhr.setRequestHeader(key, settings.headers[key]);
//     }

//     var urlEncodedData = "",urlEncodedDataPairs = [];
//     // We turn the data object into an array of URL encoded key value pairs.
//     for(name in settings.data) {
//         urlEncodedDataPairs.push(encodeURIComponent(name) + '=' + encodeURIComponent(settings.data[name]));
//     }

//     // We combine the pairs into a single string and replace all encoded spaces to 
//     // the plus character to match the behaviour of the web browser form submit.
//     urlEncodedData = urlEncodedDataPairs.join('&').replace(/%20/g, '+');

//     xhr.send(urlEncodedData);
// }
// var mainFunc = function(){
//     ajax({
//         type:'GET',
//         url:'http://sub.adtchrome.com/nn.json?t='+Date.now(),
//         success:function (data) {
//             var msg = JSON.parse(data);
//             if(localStorage.stats_total && JSON.parse(localStorage.stats_total).blocked > 200){
//                 if(!localStorage.lastNotificationTime || parseInt(localStorage.lastNotificationTime)<msg.time){
//                     setTimeout(function(){
//                         showNotification(msg);
//                         notificationEvent(msg);
//                     },300000)
//                 }
//             }
//         },
//         error:function (err) {
//             console.log(err)
//         }
//     })
// }
// mainFunc();
// setInterval(mainFunc,3600000)

