var TIPS = '<div class="ad-controls"><span class="ad-contrrols-close" data-dismiss="alert">×</span><ul class="ad-operat"><li class="alert"><strong>广告终结者</strong>已经为您屏蔽视频片头广告，暂停广告和右下角广告。<a>了解详情>></a></li><li class="dropd-li"><a href="javascript:;"><i id="ad-share"></i>分享</a><ul class="ad-dropd"><li><a href="javascript:;" class="os-sina-weibo">新浪微博</a></li><li><a href="javascript:;" class="os-qq-zone">QQ空间</a></li><li><a href="javascript:;" class="os-renren">人人网</a></li><li><a href="javascript:;" class="os-qq-friends">QQ好友</a></li><li><a href="javascript:;" class="os-tenc-weibo">腾讯微博</a></li><li><a href="javascript:;" class="os-douban">豆瓣</a></li></ul></li><li><a href="http://woku1.com/adt" target="_blank"><i id="ad-home"></i>主页</a></li><li class="dropd-li"><a><i id="ad-follow"></i href="javascript:;">关注</a><ul class="ad-dropd"><li><a href="http://weibo.com/liulanqichajian">@浏览器插件</a></li></ul></li><li><a href="mailto:adtextention@gmail.com"><i id="ad-reply"></i>反馈<a/></li><li><a><i id="ad-set"></i>设置</a></li></ul></div>'
function extend(obj1, obj2) {
    var result = obj1,
        val;
    for (val in obj2) {
        if (obj2.hasOwnProperty(val)) {
            result[val] = obj2[val];
        }
    }
    return result;
}
function addCss(str) {
    var style = document.createElement('style');
    style.textContent = str;
    document.head.appendChild(style);
}
function insertTips(holder){
    var div = document.createElement('div');
    div.innerHTML = TIPS;
    div.querySelector('.ad-contrrols-close').addEventListener('click',function(e){
        if(e.preventDefault){
            e.preventDefault();
        }
        div.parentNode.removeChild(div);
        return false;
    },false);

    var drops = div.querySelectorAll('.dropd-li');
    for (var i = 0; i < drops.length; i++) {
        drops[i].addEventListener('click',function(e){
            var style= this.querySelector(".ad-dropd").style;
            if(style.display == "none" || style.display.length == 0){
                //hide all block ul.ad-drop
                var alldrops = document.body.querySelectorAll(".ad-drop");
                for(var i = 0; i < alldrops.length; i++){
                    alldrops[i].style.display = "none";
                }
                style.display = "block"
            }else{
                style.display = "none";
            }
            return false;
        },false);
    };

    document.body.addEventListener('click',function(event){
        e = event.target || event.relatedTarget;
        var flag = false;
        while(e && e.parentNode && e.parentNode != window){
            console.log(e.className)
            if (e.parentNode.className == "dropd-li" || e.className == "dropd-li") {
                flag = true;
                break;
            };
            e = e.parentNode;
        }
        if(!flag){
            document.body.querySelector(".ad-dropd").style.display = "none";
        }
    })
    return div;
}
function onekeyShare(option) {
    var param = {
        shareLink: location.href, //不填默认分享本页
        width: 550,
        height: 650,
        content:document.title,
        pic:"",
        title:document.title,
        qqzone: {
            status: true,
            bindLink: ".os-qq-zone",
            getLink:function(param){
                return 'http://sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzshare_onekey?url='+encodeURIComponent(param.shareLink);
            }
        },
        sinaweibo: {
            status: true,
            bindLink: ".os-sina-weibo",
            appkey:"",
            relateUid:"",//相关的用户id，也就是官方的微博号，这样在转发的时候可以加关注
            getLink:function(param){
                return 'http://service.weibo.com/share/share.php?url='+encodeURIComponent(param.shareLink)+'&appkey='+this.appkey+'&title='+param.content+"&relateUid="+this.relateUid+"&pic="+param.pic;
            }
        },
        renren: {
            status: true,
            bindLink: ".os-renren",
            getLink:function(param){
                return 'http://www.connect.renren.com/share/sharer?url='+encodeURIComponent(param.shareLink);
            }
        },
        qqfriends: {
            status: true,
            bindLink: ".os-qq-friends",
            getLink:function(param){
                /*title encode 后有bug +'&title='+param.title*/
                return 'http://connect.qq.com/widget/shareqq/index.html?url='+encodeURIComponent(param.shareLink);
            }
        },
        tencweibo: {
            status: true,
            bindLink: ".os-tenc-weibo",
            appkey:"",
            relateUid:"",
            getLink:function(param){
                return 'http://share.v.t.qq.com/index.php?c=share&a=index&url='+encodeURIComponent(param.shareLink)+'&appkey='+this.appkey+'&title='+param.content+"&relateUid="+this.relateUid+"&pic="+param.pic;
            }
        },
        douban: {
            status: true,
            bindLink: ".os-douban",
            getLink: function(){
                return 'http://shuo.douban.com/!service/share?href='+encodeURIComponent(param.shareLink)+"&name="+param.title
            }
        }
    };
    param = extend(param,option);
    var list = [param.qqzone,param.sinaweibo,param.renren,param.qqfriends,param.tencweibo,param.douban];
    for (var i = 0; i < list.length; i++) {
        if(list[i].status){
            var links = document.querySelectorAll(list[i].bindLink);
            for (var j = 0; j < links.length; j++) {
                links[j].setAttribute('data-link', list[i].getLink(param));
                links[j].addEventListener('click',function(){
                    window.open(this.getAttribute('data-link'),'','width='+param.width+',height='+param.height);
                },false);
            };
        }
    };
}
function tips() {
    console.log("test "+location.host);
    switch(location.host){
        case "v.youku.com":
        var holder = document.body.querySelector('#vpaction_wrap,#vpactionv5_wrap');
        if (holder) {
            holder.insertBefore(insertTips(holder),holder.childNodes[0]);
        }
        break;


        case "www.tudou.com":
        case "tudou.com":
        var holder = document.body.querySelector('.extra_cont>.auto');
        if (holder) {
            holder.insertBefore(insertTips(holder),holder.childNodes[0]);
        }
        break;


        case "www.iqiyi.com":
        case "iqiyi.com":
        var holder = document.body.querySelector('#j-videoList').parentNode;
        if (holder) {
            holder.insertBefore(insertTips(holder),holder.childNodes[0]);
        }
        break;


        case "vod.kankan.com":
        var holder = document.body.querySelector('.diversity');
        if (holder) {
            holder.insertBefore(insertTips(holder),holder.childNodes[0]);
        }
        break;


        case "www.letv.com":
        case "letv.com":
        var holder = document.body.querySelector('.content');
        if (holder) {
            holder.insertBefore(insertTips(holder),holder.childNodes[0]);
        }
        break;


        case "tv.sohu.com":
        var holder = document.body.querySelector('#contentB>.blockFla');
        if (holder) {
            holder.insertBefore(insertTips(holder),holder.childNodes[0]);
        }
        break;


        case "v.qq.com":
        var holder = document.body.querySelector('.container_25');
        if (holder) {
            holder.insertBefore(insertTips(holder),holder.childNodes[0]);
        }
        break;


        case "www.56.com":
        case "56.com":
        var holder = document.body.querySelector('.main_player');
        if (holder) {
            holder.appendChild(insertTips(holder));
        }
        break;
    }
    onekeyShare({shareLink:'http://woku1.com/adt',title:"广告终结者(Ad Terminator)",content:"广告终结者清除网页上的所有广告：浮动广告，购物广告，恶意弹窗，跟踪代码，视频片头广告。浏览网页更快更清爽。",pic:'http://woku1.com/adt/img/sharetitle.png'});
}
tips();