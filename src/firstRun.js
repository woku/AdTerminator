  var backgroundPage = chrome.extension.getBackgroundPage();
  var require = backgroundPage.require;

  /**
  var Synchronizer = require("synchronizer").Synchronizer;
  var Utils = require("utils").Utils;
  var Prefs = require("prefs").Prefs;

  var filterClasses = require("filterClasses");
  var Filter = filterClasses.Filter;
  var BlockingFilter = filterClasses.BlockingFilter;
  var defaultMatcher = require("matcher").defaultMatcher;
  **/
  var subscriptionClasses = require("subscriptionClasses");
  var Subscription = subscriptionClasses.Subscription;
  var FilterNotifier = require("filterNotifier").FilterNotifier;
  var FilterStorage = require("filterStorage").FilterStorage;
  var DownloadableSubscription = subscriptionClasses.DownloadableSubscription;
  var Synchronizer = require("synchronizer").Synchronizer;
  var Cscript = require("cscript").Cscript;

  var fdownnum = 0;
  var alldown = 1;

function getURLParameter(name) {
  return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search)||[,""])[1].replace(/\+/g, '%20'))||null;
}
/*
function filterListener(action){
  //subscription.lastDownload 10%
  //subscription.downloadStatus 20%
  //subscription.homepage 60%
  //subscription.fixedTitle 70%
  //subscription.updated 100%
  console.log(action)
  switch (action){
    case "subscription.lastDownload":
      $(".progress-bar").css("width",50/(alldown-fdownnum)+"%");
      break;

    case "subscription.downloadStatus":
      $(".progress-bar").css("width",60/(alldown-fdownnum)+"%");
      break;

    case "subscription.homepage":
     $(".progress-bar").css("width",70/(alldown-fdownnum)+"%");
     break;

    case "subscription.updated":
      $(".progress-bar").css("width",100/(alldown-fdownnum)+"%");
      fdownnum += 1;
      if (alldown == fdownnum) {
        //全部下载完毕，等待动画结束执行
        setTimeout(function(){
          $("body").removeClass("stop-scrolling");
          $(".popboxbg").remove();
          $(".popbox").remove();
        }, 500);
      };
      break;
    }
}
*/
/*20s直接说下载完成*/
var cc = 0;
function doprogress(){
  var sum = 20;
  if (cc != sum) {
    var num = (cc+1)*100/sum;
    $(".progress-bar").css("width",num+"%");
    cc+=1;
    setTimeout(doprogress,8000/sum);
  }else{
    $("body").removeClass("stop-scrolling");
    $(".popboxbg").remove();
    $(".popbox").remove();
  }
}
doprogress();

function addsubscription(){
    //添加订阅规则
    var featureSubscriptions = [{
      homepage: "http://www.adtchrome.com/extension/adt-chinalist-easylist.html",
      title: "广告终结者默认过滤规则",
      url: "http://sub.adtchrome.com/adt-chinalist-easylist.txt",
      disabled:false
    }/*,{
      homepage: "http://www.adtchrome.com/extension/adt-videolist.html",
      title: "Videolist(不稳定)",
      url: "http://sub.adtchrome.com/adt-videolist.txt",
      disabled:true
    }*/];
    featureSubscriptions.forEach(function(s){
      var subscription = Subscription.fromURL(s.url);
      FilterStorage.addSubscription(subscription);
      subscription.disabled = s.disabled;
      subscription.title = s.title;
      subscription.homepage = s.homepage;
      if (subscription instanceof DownloadableSubscription && !subscription.lastDownload){
        Synchronizer.execute(subscription);//立即开始下载规则
      }
    })
    Cscript.add('去视频广告脚本','http://sub.adtchrome.com/videoadjs.txt');
    //Cscript.add('HTML5播放','http://sub.adtchrome.com/html5player.txt');
}

function getBroswerType(){
  var ua = navigator.userAgent.toLowerCase();
  if (ua.indexOf("lbbrowser")>0) {
    return "lbbrowser";
  };
  var _track = "track" in document.createElement("track");
  var _style = "scoped" in document.createElement("style");
  var _v8locale = "v8Locale"in window;
  if(_track && _style && _v8locale){
    return "360se";
  }else if(_track && _style && !_v8locale){
    return "360ee";
  }
  return "chrome";
}
//居中jquery插件
(function($){
     $.fn.extend({
          center: function (options) {
               var options =  $.extend({ // Default values
                    inside:window, // element, center into window
                    transition: 0, // millisecond, transition time
                    minX:0, // pixel, minimum left element value
                    minY:0, // pixel, minimum top element value
                    withScrolling:true, // booleen, take care of the scrollbar (scrollTop)
                    vertical:true, // booleen, center vertical
                    horizontal:true // booleen, center horizontal
               }, options);
               return this.each(function() {
                    var props = {position:'absolute'};
                    if (options.vertical) {
                         var top = ($(options.inside).height() - $(this).outerHeight()) / 2;
                         if (options.withScrolling) top += $(options.inside).scrollTop() || 0;
                         top = (top > options.minY ? top : options.minY);
                         $.extend(props, {top: top+'px'});
                    }
                    if (options.horizontal) {
                          var left = ($(options.inside).width() - $(this).outerWidth()) / 2;
                          if (options.withScrolling) left += $(options.inside).scrollLeft() || 0;
                          left = (left > options.minX ? left : options.minX);
                          $.extend(props, {left: left+'px'});
                    }
                    if (options.transition > 0) $(this).animate(props, options.transition);
                    else $(this).css(props);
                    return $(this);
               });
          }
     });
})(jQuery);

$(function(){

  $("body").addClass("stop-scrolling");
  //居中
  $('.popbox').center();
  $(window).bind('resize', function() {
      $('.popbox').center({transition:300});
  });
  //提醒用户不要离开
  /*window.onbeforeunload = function(e) {
    if(!canLeave){
      return '广告终结者还在配置中，建议你不要关闭这个页面。';
    }
  };*/
  /*
  $(":radio[name=chooserules]").click(function(){
    chooseRules = $("input[name=chooserules]:checked").val();
    $(".sure-btn").removeAttr("disabled");
  })
  $(".sure-btn").click(function(){
    $(".popbox .main").animate({"margin-left":"-500px"},300);
  })*/
  /*FilterNotifier.addListener(filterListener);
  window.addEventListener("unload", function(event){
    FilterNotifier.removeListener(filterListener);
  }, false);*/
  addsubscription();
  /*$(".sure-btn").click(function(){
    $("body").removeClass("stop-scrolling");
    $(".popboxbg").remove();
    $(".popbox").remove();
    canLeave = true;
  })*/

  //回到顶部事件
  $(window).scroll(function(e) {
    if($(window).scrollTop()>69){
      $("#sideToolbar-up").fadeIn(100);
    }else{
      $("#sideToolbar-up").fadeOut(100);
    }
  });

  //点击回到顶部的元素
  $("#sideToolbar-up").click(function(e) {
    //以1秒的间隔返回顶部
    $('body,html').animate({scrollTop:0},500);
  });

  //显示提示
  $("#"+getBroswerType()+"-warn").show();

  if(getURLParameter("test") != null){
    //测试
    $("body").removeClass("stop-scrolling");
    $(".popboxbg").remove();
    $(".popbox").remove();
  }
});

//统计代码
var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-48334954-1']);
_gaq.push(['_trackPageview']);

(function() {
  var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
  ga.src = 'https://ssl.google-analytics.com/ga.js';
  var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
})();
/**"use strict";

(function()
{
  // Load subscriptions for features
  var featureSubscriptions = [
    {
      feature: "malware",
      homepage: "http://malwaredomains.com/",
      title: "Malware Domains",
      url: "https://easylist-downloads.adblockplus.org/malwaredomains_full.txt"
    },
    {
      feature: "social",
      homepage: "https://www.fanboy.co.nz/",
      title: "Fanboy's Social Blocking List",
      url: "https://easylist-downloads.adblockplus.org/fanboy-social.txt"
    },
    {
      feature: "tracking",
      homepage: "https://easylist.adblockplus.org/",
      title: "EasyPrivacy",
      url: "https://easylist-downloads.adblockplus.org/easyprivacy.txt"
    }
  ];

  function onDOMLoaded()
  {
    var locale = require("utils").Utils.appLocale;
    document.documentElement.setAttribute("lang", locale);

    // Set up URLs
    var donateLink = E("donate");
    donateLink.href = Utils.getDocLink("donate");

    var contributors = E("contributors");
    contributors.href = Utils.getDocLink("contributors");

    setLinks("acceptableAdsExplanation", Utils.getDocLink("acceptable_ads_criteria"), openFilters);
    setLinks("share-headline", Utils.getDocLink("contribute"));

    // Show warning if data corruption was detected
    if (typeof backgroundPage != "undefined" && backgroundPage.seenDataCorruption)
    {
      E("dataCorruptionWarning").removeAttribute("hidden");
      setLinks("dataCorruptionWarning", Utils.getDocLink("knownIssuesChrome_filterstorage"));
    }

    // Set up feature buttons linked to subscriptions
    featureSubscriptions.forEach(setToggleSubscriptionButton);
    var filterListener = function(action)
    {
      if (/^subscription\.(added|removed|disabled)$/.test(action))
      {
        for (var i = 0; i < featureSubscriptions.length; i++)
        {
          var featureSubscription = featureSubscriptions[i];
          updateToggleButton(featureSubscription.feature, isSubscriptionEnabled(featureSubscription));
        }
      }
    }
    FilterNotifier.addListener(filterListener);
    window.addEventListener("unload", function(event)
    {
      FilterNotifier.removeListener(filterListener);
    }, false);

    // You can click activate-feature or one of the icons to toggle the features area
    E("activate-features").addEventListener("click", toggleFeature, false);
    E("can-do-more-overview").addEventListener("click", toggleFeature, false);

    initSocialLinks();
  }

  function toggleFeature()
  {
    E("can-do-more").classList.toggle("expanded");
  }

  function isSubscriptionEnabled(featureSubscription)
  {
    return featureSubscription.url in FilterStorage.knownSubscriptions
      && !Subscription.fromURL(featureSubscription.url).disabled;
  }

  function setToggleSubscriptionButton(featureSubscription)
  {
    var feature = featureSubscription.feature;

    var element = E("toggle-" + feature);
    updateToggleButton(feature, isSubscriptionEnabled(featureSubscription));
    element.addEventListener("click", function(event)
    {
      var subscription = Subscription.fromURL(featureSubscription.url);
      if (isSubscriptionEnabled(featureSubscription))
        FilterStorage.removeSubscription(subscription);
      else
      {
        subscription.disabled = false;
        subscription.title = featureSubscription.title;
        subscription.homepage = featureSubscription.homepage;
        FilterStorage.addSubscription(subscription);
        if (!subscription.lastDownload)
          Synchronizer.execute(subscription);
      }
    }, false);
  }

  function openSharePopup(url)
  {
    var iframe = E("share-popup");
    var glassPane = E("glass-pane");
    var popupMessageReceived = false;

    var popupMessageListener = function(event)
    {
      var originFilter = Filter.fromText("||adblockplus.org^");
      if (!originFilter.matches(event.origin, "OTHER", null, null))
        return;

      var width = event.data.width;
      var height = event.data.height;
      iframe.width = width;
      iframe.height = height;
      iframe.style.marginTop = -height/2 + "px";
      iframe.style.marginLeft = -width/2 + "px";
      popupMessageReceived = true;
      window.removeEventListener("message", popupMessageListener);
    };
    // Firefox requires last parameter to be true to be triggered by unprivileged pages
    window.addEventListener("message", popupMessageListener, false, true);

    var popupLoadListener = function()
    {
      if (popupMessageReceived)
      {
        iframe.className = "visible";

        var popupCloseListener = function()
        {
          iframe.className = glassPane.className = "";
          document.removeEventListener("click", popupCloseListener);
        };
        document.addEventListener("click", popupCloseListener, false);
      }
      else
      {
        glassPane.className = "";
        window.removeEventListener("message", popupMessageListener);
      }

      iframe.removeEventListener("load", popupLoadListener);
    };
    iframe.addEventListener("load", popupLoadListener, false);

    iframe.src = url;
    glassPane.className = "visible";
  }

  function initSocialLinks()
  {
    var networks = ["twitter", "facebook", "gplus"];
    networks.forEach(function(network)
    {
      var link = E("share-" + network);
      link.addEventListener("click", onSocialLinkClick, false);
    });
  }

  function onSocialLinkClick(event)
  {
    // Don't open the share page if the sharing script would be blocked
    var filter = defaultMatcher.matchesAny(event.target.getAttribute("data-script"), "SCRIPT", "adblockplus.org", true);
    if (!(filter instanceof BlockingFilter))
    {
      event.preventDefault();
      openSharePopup(Utils.getDocLink(event.target.id));
    }
  }

  function openFilters()
  {
    if (typeof UI != "undefined")
      UI.openFiltersDialog();
    else
    {
      backgroundPage.openOptions();
    }
  }

  function updateToggleButton(feature, isEnabled)
  {
    var button = E("toggle-" + feature);
    if (isEnabled)
      button.classList.remove("off");
    else
      button.classList.add("off");
  }

  document.addEventListener("DOMContentLoaded", onDOMLoaded, false);
})();
**/