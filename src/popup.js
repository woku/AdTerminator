  
  var backgroundPage = chrome.extension.getBackgroundPage();
  var imports = ["require", "isWhitelisted", "extractHostFromURL", "refreshIconAndContextMenu"];
  for (var i = 0; i < imports.length; i++)
    window[imports[i]] = backgroundPage[imports[i]];
  var require = backgroundPage.require;
  var getStats = require("stats").getStats;
  var FilterNotifier = require("filterNotifier").FilterNotifier;
  var Filter = require("filterClasses").Filter;
  var FilterStorage = require("filterStorage").FilterStorage;
  var Prefs = require("prefs").Prefs;
  var Cscript = require("cscript").Cscript;
  with(require("subscriptionClasses")){
    this.Subscription = Subscription;
    this.DownloadableSubscription = DownloadableSubscription;
  }
$(function(){
  //定义变量
  var currentTabId;

  var tab = null;

  /**获取和更新广告过滤数量的**/
  function initBlockState(){
    chrome.tabs.query({
      active: true,
      windowId: chrome.windows.WINDOW_ID_CURRENT
    }, function(tabs){
      if (tabs.length > 0){
        currentTabId = tabs[0].id;
        updateStats();
        FilterNotifier.addListener(onNotify);
      }
    });
    //关闭的时候要完成一些清理工作
    window.addEventListener("unload", function(){
      FilterNotifier.removeListener(onNotify);
    }, false);
  }

  function updateStats(){
    //获取广告屏蔽数量
    var blockedPage = getStats("blocked", currentTabId).toLocaleString();
    $(".current-block-ad").html(blockedPage);
    
    var blockedTotal = getStats("blocked").toLocaleString();
    $(".total-block-ad").html(blockedTotal);
  }

  function onNotify(action, item){
    if (action == "filter.hitCount")
      updateStats();
  }

  /**初始化状态：是否启用广告过滤、是否在自定义屏蔽中**/
  function initPopupState(){
    // Ask content script whether clickhide is active. If so, show cancel button.
    // If that isn't the case, ask background.html whether it has cached filters. If so,
    // ask the user whether she wants those filters.
    // Otherwise, we are in default state.
    chrome.windows.getCurrent(function(w){
      chrome.tabs.getSelected(w.id, function(t){
        tab = t;
        if(!isWhitelisted(tab.url)){
          //当前网站是否启用屏蔽
          $("#enable-block").addClass("checked");
          $("#enable-block-text").show();
          $("#disable-block-text").hide();
        }
        chrome.tabs.sendMessage(tab.id, {reqtype: "get-clickhide-state"}, function(response){
          if(response.active){
            //处于自定义屏蔽广告状态中
            $(".main-menu").hide(0);
            $(".click-block").show(0);
          }
        });
      });
    });

    /*subscription = Subscription.fromURL(Prefs.subscriptions_videoblockurl);
    if(!subscription.disabled){
      $(".block-video-icon").toggleClass("checked");
      $("#enable-video-block-text").toggle();
      $("#disable-video-block-text").toggle();
    }*/
    var s = Cscript.getScript('http://sub.adtchrome.com/videoadjs.txt');
    if (s != undefined && s.enabled) {
      $(".block-video-icon").toggleClass("checked");
      $("#enable-video-block-text").toggle();
      $("#disable-video-block-text").toggle();
    };
  }

  /**启用或者关闭广告过滤**/
  function toggleEnabledAdblock(checked){
    if (checked){
      // Remove any exception rules applying to this URL
      var filter = isWhitelisted(tab.url);
      while (filter){
        FilterStorage.removeFilter(filter);
        if (filter.subscriptions.length)
          filter.disabled = true;
        filter = isWhitelisted(tab.url);
      }
    }else{
      var host = extractHostFromURL(tab.url).replace(/^www\./, "");
      var filter = Filter.fromText("@@||" + host + "^$document");
      if (filter.subscriptions.length && filter.disabled)
        filter.disabled = false;
      else{
        filter.disabled = false;
        FilterStorage.addFilter(filter);
      }
    }
    //禁用或者启用广告过滤都要重新修改icon
    refreshIconAndContextMenu(tab);
  }

  function toggleEnabledVideoAdblock(checked){
    //首次启用要提醒用户
    /*if (checked && localStorage["shouldShowVideoWarn"]!="false") {//首次安装没有任何的直
      chrome.tabs.sendMessage(tab.id, {reqtype: "show-video-warn"});
    };
    subscription = Subscription.fromURL(Prefs.subscriptions_videoblockurl);
    subscription.disabled = !checked;*/
    //这里不再试用video规则，而是试用脚本
    Cscript.enable("http://sub.adtchrome.com/videoadjs.txt",checked);
  }

  /**手动过滤广告事件**/
  function activateClickBlock(){
    chrome.tabs.sendMessage(tab.id, {reqtype: "clickhide-activate"});
    // Close the popup after a few seconds, so user doesn't have to
    $("body").bind("mouseleave",function(){
      window.setTimeout(window.close, 500);
    });
  }

  /**取消手动过滤广告**/
  function cancelClickBlock(){
    $("body").unbind("mouseleave");
    chrome.tabs.sendMessage(tab.id, {reqtype: "clickhide-deactivate"});
  }
  /**
   * 分享
   * @param  {[type]} type [description]
   * @return {[type]}      [description]
   */
  function onekeyshare(type){
    var url;
    var appkey = "";
    var title = "广告终结者(Ad Terminator)——功能最全面的广告屏蔽扩展";
    var pic = "http://www.adtchrome.com/img/download-slide2.jpg";
    var shareLink = encodeURIComponent("http://www.adtchrome.com");
    switch (type){
      case "sina-weibo":
      url = "http://service.weibo.com/share/share.php?url="+shareLink+"&appkey="+appkey+"&title="+title+"&pic="+pic;
      break;

      case "qq-zone":
      url = "http://sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzshare_onekey?url="+shareLink+"&desc=广告终结者(Ad Terminator)——功能最全面的广告屏蔽插件"+"&title=广告终结者(Ad Terminator)"+"&pic="+pic;
      break;

      case "tenc-weibo":
      url = "http://share.v.t.qq.com/index.php?c=share&a=index&url="+shareLink+"&title="+title+"&appkey="+appkey+"&pic="+pic;
      break;

      case "renren":
      var description = "广告终结者可以清除所有网页广告，恶意弹窗，视频广告，跟踪代码，加快网页加载速度 ";
      var message = "广告终结者(Ad Terminator)——功能最全面的广告屏蔽插件";
      url = "http://widget.renren.com/dialog/share?resourceUrl="+shareLink+"&message="+message+"&description="+description+"&pic="+pic;
      break;

    }

    window.open(url);
  }

  /**界面绑定相关事件**/
  function initEventBind(){
    $(".header").click(function(){
      $("#ad-statistic").show();
      $("#menu").hide();
    });
    $(".footer").click(function(){
      $("#ad-statistic").hide();
      $("#menu").show();
    });
    $(".checkbox-hoverhook").click(function(){
      $(this).find(".checkbox-green").toggleClass("checked");
      $("#enable-block-text").toggle();
      $("#disable-block-text").toggle();
      //绑定启用广告过滤事件
      toggleEnabledAdblock($(this).find(".checkbox-green").hasClass("checked"));
    });
    $(".click-block-video-hook").click(function(){
      $(this).find(".block-video-icon").toggleClass("checked")
      $("#enable-video-block-text").toggle();
      $("#disable-video-block-text").toggle();
      //绑定启用视频广告过滤事件
      toggleEnabledVideoAdblock($(this).find(".block-video-icon").hasClass("checked"));
    })

    $(".checkbox-hoverhook").hover(function(){
      $(this).find(".checkbox-green").addClass("hover");
    },function(){
      $(this).find(".checkbox-green").removeClass("hover");
    });

    //设置选项绑定事件
    $(".option-hook").click(function(){
      window.close();
      chrome.tabs.create({url: "options.html"});
    });

    //帮助选贤
    $(".click-help-hook").click(function(){
      window.open("http://www.adtchrome.com/help/index.html")
    })

    $("#help-block").click(function(){
      window.open("http://www.adtchrome.com/help/help-block.html")
    })

    $(".click-block-hook").click(function(){
      $(".main-menu").hide();
      $(".click-block").show();
      activateClickBlock();

    });
    $("#click-block-cancel").click(function(){
      cancelClickBlock();
      $(".main-menu").show();
      $(".click-block").hide();
    });

    //分享事件
    $(".sina-weibo").click(function(){
      onekeyshare("sina-weibo");
    });
    $(".qq-zone").click(function(){
      onekeyshare("qq-zone");
    });
    $(".tenc-weibo").click(function(){
      onekeyshare("tenc-weibo");
    });
    $(".renren").click(function(){
      onekeyshare("renren");
    });
  }

  //初始化广告拦截数量
  initPopupState();
  initBlockState();
  initEventBind();

});

/**
   (window.requestFileSystem || window.webkitRequestFileSystem)(window.PERSISTENT, 1024 * 1024 * 1024, function(fs) {
    var dirReader = fs.root.createReader();
    dirReader.readEntries(function(entries) {

      for (var i = 0, entry; entry = entries[i]; ++i){
        console.log(entry.isDirectory + " " + entry.name)
        entry.file(function(file){
          var reader = new FileReader();
          reader.onloadend = function(){
            console.log(reader.result);
          }
          reader.readAsText(file);
        });
      }
    }, null);
  }, null);**/