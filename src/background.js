/*
 * This file is part of Adblock Plus <http://adblockplus.org/>,
 * Copyright (C) 2006-2013 Eyeo GmbH
 *
 * Adblock Plus is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3 as
 * published by the Free Software Foundation.
 *
 * Adblock Plus is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Adblock Plus.  If not, see <http://www.gnu.org/licenses/>.
 */

with(require("filterClasses"))
{
  this.Filter = Filter;
  this.RegExpFilter = RegExpFilter;
  this.BlockingFilter = BlockingFilter;
  this.WhitelistFilter = WhitelistFilter;
  this.RedirectFilter = RedirectFilter;
}
with(require("subscriptionClasses"))
{
  this.Subscription = Subscription;
  this.DownloadableSubscription = DownloadableSubscription;
}
var FilterStorage = require("filterStorage").FilterStorage;
var ElemHide = require("elemHide").ElemHide;
var defaultMatcher = require("matcher").defaultMatcher;
var Prefs = require("prefs").Prefs;
var Synchronizer = require("synchronizer").Synchronizer;
var Utils = require("utils").Utils;
var Cscript = require("cscript").Cscript;

// Some types cannot be distinguished
RegExpFilter.typeMap.OBJECT_SUBREQUEST = RegExpFilter.typeMap.OBJECT;
RegExpFilter.typeMap.MEDIA = RegExpFilter.typeMap.FONT = RegExpFilter.typeMap.OTHER;

var seenDataCorruption = false;
require("filterNotifier").FilterNotifier.addListener(function(action){
  //数据加载完毕才触发检查，是否首次运行还是升级
  if (action == "load"){
    //importOldData();这个是abp非常老的版本用到的

    var addonVersion = require("info").addonVersion;
    var prevVersion = localStorage["currentVersion"];
    if (prevVersion != addonVersion)
    {
      localStorage["currentVersion"] = addonVersion;
      doUpdateOrInstall(addonVersion,prevVersion);
    }
  }
});

// Special-case domains for which we cannot use style-based hiding rules.
// See http://crbug.com/68705.
var noStyleRulesHosts = ["mail.google.com", "mail.yahoo.com", "www.google.com"];

function removeDeprecatedOptions()
{
  var deprecatedOptions = ["videoAdkill", "videoblockcontent", "videokillsublink","videoupdatemeta"];
  deprecatedOptions.forEach(function(option)
  {
    if (option in localStorage)
      delete localStorage[option];
  });
}

// Sets options to defaults, upgrading old options from previous versions as necessary
function setDefaultOptions()
{
  function defaultOptionValue(opt, val)
  {
    if(!(opt in localStorage))
      localStorage[opt] = val;
  }

  defaultOptionValue("shouldShowIcon", "true");
  defaultOptionValue("shouldShowBlockElementMenu", "true");

  removeDeprecatedOptions();
}

// Upgrade options before we do anything else.
setDefaultOptions();

/**
 * Checks whether a page is whitelisted.
 * @param {String} url
 * @param {String} [parentUrl] URL of the parent frame
 * @param {String} [type] content type to be checked, default is "DOCUMENT"
 * @return {Filter} filter that matched the URL or null if not whitelisted
 */
function isWhitelisted(url, parentUrl, type){
  // Ignore fragment identifier
  var index = url.indexOf("#");
  if (index >= 0)
    url = url.substring(0, index);

  var result = defaultMatcher.matchesAny(url, type || "DOCUMENT", extractHostFromURL(parentUrl || url), false);
  return (result instanceof WhitelistFilter ? result : null);
}

var activeNotification = null;

// Adds or removes page action icon according to options.
function refreshIconAndContextMenu(tab)
{
  // The tab could have been closed by the time this function is called
  if(!tab)
    return;

  var excluded = isWhitelisted(tab.url);
  var iconFilename = excluded ? "icons/abp-19-whitelisted.png" : "icons/abp-19.png";

  if (activeNotification)
    startIconAnimation(tab, iconFilename);
  else
    chrome.browserAction.setIcon({tabId: tab.id, path: iconFilename});

  // Only show icon for pages we can influence (http: and https:)
  if(/^https?:/.test(tab.url))
  {
    chrome.browserAction.setTitle({tabId: tab.id, title: "广告终结者"});
    // if ("shouldShowIcon" in localStorage && localStorage["shouldShowIcon"] == "false")
    //   chrome.pageAction.hide(tab.id);
    // else
    //   chrome.pageAction.show(tab.id);

    // Set context menu status according to whether current tab has whitelisted domain
    if (excluded)
      chrome.contextMenus.removeAll();
    else
      showContextMenu();
  }
}

//扩展升级或者安装调用此方法
function doUpdateOrInstall(addonVersion,prevVersion){
  function doinstall(){
    //打开安装完成页面
    chrome.tabs.create({url: chrome.extension.getURL("firstRun.html")});
  }
  localStorage['notificationRules'] = true;
  if (prevVersion == undefined) {
    //首次运行
    doinstall();
  }else{
    //升级，解决一些兼容性的历史遗留问题
    var prev = prevVersion.split(".")[0];
    if( prev == "2" || prev == "1") {
      console.log("update");
      var toRemove = "https://easylist-downloads.adblockplus.org/chinalist+easylist.txt";
      if (toRemove in FilterStorage.knownSubscriptions){
        FilterStorage.removeSubscription(FilterStorage.knownSubscriptions[toRemove]);
      }
      //letv.com白名单
      doinstall();
    }else{
      Cscript.add('去视频广告脚本','http://sub.adtchrome.com/videoadjs.txt');
      //Cscript.add('HTML5播放','http://sub.adtchrome.com/html5player.txt');
      FilterStorage.removeSubscription(Subscription.fromURL(Prefs.subscriptions_videoblockurl));
      subscription.disabled = false;
      console.log("更新 "+prevVersion)
    }
  }
}

// Set up context menu for user selection of elements to block
function showContextMenu()
{
  chrome.contextMenus.removeAll(function()
  {
    if(typeof localStorage["shouldShowBlockElementMenu"] == "string" && localStorage["shouldShowBlockElementMenu"] == "true")
    {
      chrome.contextMenus.create({'title': chrome.i18n.getMessage('block_element'), 'contexts': ['image', 'video', 'audio'], 'onclick': function(info, tab)
      {
        if(info.srcUrl)
            chrome.tabs.sendMessage(tab.id, {reqtype: "clickhide-new-filter", filter: info.srcUrl});
      }});
    }
  });
}

/**
 * Opens Options window or focuses an existing one.
 * @param {Function} callback  function to be called with the window object of
 *                             the Options window
 */
function openOptions(callback)
{
  function findOptions(selectTab)
  {
    var views = chrome.extension.getViews({type: "tab"});
    for (var i = 0; i < views.length; i++)
      if ("startSubscriptionSelection" in views[i])
        return views[i];

    return null;
  }

  function selectOptionsTab()
  {
    chrome.windows.getAll({populate: true}, function(windows)
    {
      var url = chrome.extension.getURL("options.html");
      for (var i = 0; i < windows.length; i++)
        for (var j = 0; j < windows[i].tabs.length; j++)
          if (windows[i].tabs[j].url == url)
            chrome.tabs.update(windows[i].tabs[j].id, {selected: true});
    });
  }

  var view = findOptions();
  if (view)
  {
    selectOptionsTab();
    callback(view);
  }
  else
  {
    var onLoad = function()
    {
      var view = findOptions();
      if (view)
        callback(view);
    };

    chrome.tabs.create({url: chrome.extension.getURL("options.html")}, function(tab)
    {
      if (tab.status == "complete")
        onLoad();
      else
      {
        var id = tab.id;
        var listener = function(tabId, changeInfo, tab)
        {
          if (tabId == id && changeInfo.status == "complete")
          {
            chrome.tabs.onUpdated.removeListener(listener);
            onLoad();
          }
        };
        chrome.tabs.onUpdated.addListener(listener);
      }
    });
  }
}

var iconAnimationTimer = null;
var animatedIconTab = null;

function stopIconAnimation()
{
  if (!iconAnimationTimer)
    return;

  clearTimeout(iconAnimationTimer);
  iconAnimationTimer = null;
  animatedIconTab = null;
}

function loadImages(imageFiles, callback)
{
  var images = {};
  var imagesLoaded = 0;
  imageFiles.forEach(function(imageFile)
  {
    var image = new Image();
    image.src = imageFile;
    image.addEventListener("load", function()
    {
      images[imageFile] = image;
      if (++imagesLoaded === imageFiles.length)
        callback(images);
    });
  });
}

function startIconAnimation(tab, iconPath)
{
  stopIconAnimation();
  animatedIconTab = tab;

  var severitySuffix = activeNotification.severity === "critical"
      ? "critical" : "information";
  var notificationIconPath = "icons/notification-" + severitySuffix + ".png";
  var iconFiles = [iconPath, notificationIconPath];
  loadImages(iconFiles, function(images)
  {
    var icon = images[iconPath];
    var notificationIcon = images[notificationIconPath];

    var canvas = document.createElement("canvas");
    canvas.width = icon.width;
    canvas.height = icon.height;
    var context = canvas.getContext("2d");

    var currentFrame = 0;
    var frameOpacities = [0, 0.2, 0.4, 0.6, 0.8,
                          1, 1, 1, 1, 1,
                          0.8, 0.6, 0.4, 0.2, 0];

    function animationStep()
    {
      var opacity = frameOpacities[currentFrame];
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.globalAlpha = 1;
      context.drawImage(icon, 0, 0);
      context.globalAlpha = opacity;
      context.drawImage(notificationIcon, 0, 0);
      var imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      chrome.browserAction.setIcon({tabId: tab.id, imageData: imageData});

      var interval;
      currentFrame++;
      if (currentFrame < frameOpacities.length)
      {
        var duration = 3000;
        interval = duration / frameOpacities.length;
      }
      else
      {
        currentFrame = 0;
        interval = 10000;
      }
      iconAnimationTimer = setTimeout(animationStep, interval);
    }
    animationStep();
  });
}

function prepareNotificationIconAndPopup()
{
  activeNotification.onClicked = function()
  {
    var tab = animatedIconTab;
    stopIconAnimation();
    activeNotification = null;
    refreshIconAndContextMenu(tab);
  };

  chrome.windows.getLastFocused({populate: true}, function(window)
  {
    chrome.tabs.query({active: true, windowId: window.id}, function(tabs)
    {
      tabs.forEach(refreshIconAndContextMenu);
    });
  });
}

// function showNotification(notification)
// {
//   activeNotification = notification;

//   if (activeNotification.severity === "critical"
//       && typeof webkitNotifications !== "undefined")
//   {
//     var notification = webkitNotifications.createHTMLNotification("notification.html");
//     notification.show();
//     notification.addEventListener("close", prepareNotificationIconAndPopup);
//   }
//   else
//     prepareNotificationIconAndPopup();
// }

/**
 * This function is a hack - we only know the tabId and document URL for a
 * message but we need to know the frame ID. Try to find it in webRequest's
 * frame data.
 */
function getFrameId(tabId, url)
{
  if (tabId in frames)
  {
    for (var f in frames[tabId])
    {
      if (getFrameUrl(tabId, f) == url)
        return f;
    }
  }
  return -1;
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse)
{
  switch (request.reqtype)
  {
    case "get-settings":
    /*chrome.tabs.executeScript(sender.tab.id, 
      {code:"var x = 10;console.log('a'); x"},
      function(results){
        console.log(results); 
      });*/
      var hostDomain = null;
      var selectors = null;

      var tabId = -1;
      var frameId = -1;
      if (sender.tab)
      {
        tabId = sender.tab.id;
        frameId = getFrameId(tabId, request.frameUrl);
      }

      var enabled = !isFrameWhitelisted(tabId, frameId, "DOCUMENT") && !isFrameWhitelisted(tabId, frameId, "ELEMHIDE");
      if (enabled && request.selectors)
      {
        var noStyleRules = false;
        var host = extractHostFromURL(request.frameUrl);
        hostDomain = getBaseDomain(host);
        for (var i = 0; i < noStyleRulesHosts.length; i++)
        {
          var noStyleHost = noStyleRulesHosts[i];
          if (host == noStyleHost || (host.length > noStyleHost.length &&
                                      host.substr(host.length - noStyleHost.length - 1) == "." + noStyleHost))
          {
            noStyleRules = true;
          }
        }
        selectors = ElemHide.getSelectorsForDomain(host, false);
        if (noStyleRules)
        {
          selectors = selectors.filter(function(s)
          {
            return !/\[style[\^\$]?=/.test(s);
          });
        }
      }

      sendResponse({enabled: enabled, hostDomain: hostDomain, selectors: selectors});
      break;
    case "should-collapse":
      var tabId = -1;
      var frameId = -1;
      if (sender.tab)
      {
        tabId = sender.tab.id;
        frameId = getFrameId(tabId, request.documentUrl);
      }

      if (isFrameWhitelisted(tabId, frameId, "DOCUMENT"))
      {
        sendResponse(false);
        break;
      }

      var requestHost = extractHostFromURL(request.url);
      var documentHost = extractHostFromURL(request.documentUrl);
      var thirdParty = isThirdParty(requestHost, documentHost);
      var filter = defaultMatcher.matchesAny(request.url, request.type, documentHost, thirdParty);
      if (filter instanceof BlockingFilter)
      {
        var collapse = filter.collapse;
        if (collapse == null)
          collapse = (localStorage.hidePlaceholders != "false");
        sendResponse(collapse);
      }
      else
        sendResponse(false);
      break;
    case "get-domain-enabled-state":
      // Returns whether this domain is in the exclusion list.
      // The page action popup asks us this.
      if(sender.tab)
      {
        sendResponse({enabled: !isWhitelisted(sender.tab.url)});
        return;
      }
      break;
    case "add-filters":
      if (request.filters && request.filters.length)
      {
        for (var i = 0; i < request.filters.length; i++)
          FilterStorage.addFilter(Filter.fromText(request.filters[i]));
      }
      break;
    case "add-subscription":
      openOptions(function(view)
      {
        view.startSubscriptionSelection(request.title, request.url);
      });
      break;
    //启用视频广告过滤提示用户
    case "set-localstorage":
      localStorage[request.lparam] = request.lvalue;
      chrome.tabs.sendResponse({lparam:request.lparam,lvalue:request.lvalue});
      break;
    case "get-script":
      if(!sender.tab) sender.tab = {url:''}
      sendResponse({"cscripts":Cscript.exeScript(sender.tab.url)});
      break;
    case "open-customRuleWindow":
      chrome.windows.create({
        url:chrome.extension.getURL("block.html?tabId="+sender.tab.id),
        left: 50,
        top: 50,
        width: 435,
        height: 265,
        type: "popup"
      })
      break;
    default:
      //sendResponse({});
      //tfl(request, sender, sendResponse)
      return true;
  }
});

// Show icon as page action for all tabs that already exist
chrome.windows.getAll({populate: true}, function(windows)
{
  for (var i = 0; i < windows.length; i++)
    for (var j = 0; j < windows[i].tabs.length; j++)
      refreshIconAndContextMenu(windows[i].tabs[j]);
});

// Update icon if a tab changes location
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab)
{
  chrome.tabs.sendMessage(tabId, {reqtype: "clickhide-deactivate"});
  if(changeInfo.status == "loading"){
    refreshIconAndContextMenu(tab);
  }
});

// Refresh icon when switching tabs or windows
chrome.tabs.onActivated.addListener(function(activeInfo)
{
  refreshIconAndContextMenu(animatedIconTab);
  chrome.tabs.get(activeInfo.tabId, refreshIconAndContextMenu);
});
chrome.windows.onFocusChanged.addListener(function(windowId)
{
  refreshIconAndContextMenu(animatedIconTab);
  chrome.tabs.query({active: true, windowId: windowId}, function(tabs)
  {
    tabs.forEach(refreshIconAndContextMenu);
  });
});


setTimeout(function(){
  console.log(FilterStorage.subscriptions);
  if (FilterStorage.subscriptions.length == 0) {
    console.log('error no sub');
    var subscription = Subscription.fromURL('http://sub.adtchrome.com/adt-chinalist-easylist.txt');
    FilterStorage.addSubscription(subscription);
    subscription.disabled = false;
    subscription.title = "广告终结者默认";
    subscription.homepage = "http://www.adtchrome.com/extension/adt-chinalist-easylist.html";
    if (subscription instanceof DownloadableSubscription && !subscription.lastDownload){
      console.log('download')
      Synchronizer.execute(subscription);//立即开始下载规则
    }
  };
},20000);

function extend(target,source) {
  for (var key in source) {
      if (source[key] !== undefined) {
        target[key] = source[key];
      }
  }
  return target;
}

var $ = {
    ajax: function(settings){
      var emptyFunction = function () { };

      var defaultSettings = {//为了编译隐藏名字，所以都在前面加a
          url: ".",
          cache: true,
          data: {},
          headers: {},
          type: 'GET',
          success: emptyFunction,
          aerror: emptyFunction,
          complete: emptyFunction
      };

      settings = extend(defaultSettings, settings || {});

      if (!settings.cache) {
          settings.url = settings.url + 
                  (settings.url.indexOf('?')>0 ? '&' : '?') + 'noCache=' + 
                  Math.floor(Math.random() * 9e9);
      }

      var success = function (data, xhr, settings) {
          var status = 'success';
          settings.success(data, status, xhr);
          complete(status, xhr, settings);
      };

      var error = function (error, type, xhr, settings) {
          settings.aerror(xhr, type, error);
          complete(type, xhr, settings);
      };

      var complete = function (status, xhr, settings) {
          settings.complete(xhr, status);
      };

      var xhr = new XMLHttpRequest();

      xhr.addEventListener('readystatechange', function () {
          if (xhr.readyState === 4) {
              var result, dattype;

              if ((xhr.status >= 200 && xhr.status < 300) || xhr.status === 304) {
                  result = xhr.responseText;
                  success(result, xhr, settings);
              }else{
                  error(xhr.statusText, 'error', xhr, settings);
              }
          }
      }, false);


      xhr.open(settings.type, settings.url);

      if (settings.type === 'POST') {
          settings.headers = extend(settings.headers, {
              'X-Requested-With': 'XMLHttpRequest',
              'Content-type': 'application/x-www-form-urlencoded'
          });
      }

      for (var key in settings.headers) {
          xhr.setRequestHeader(key, settings.headers[key]);
      }

      var urlEncodedData = "",urlEncodedDataPairs = [];
      // We turn the data object into an array of URL encoded key value pairs.
      for(name in settings.data) {
          urlEncodedDataPairs.push(encodeURIComponent(name) + '=' + encodeURIComponent(settings.data[name]));
      }

      // We combine the pairs into a single string and replace all encoded spaces to 
      // the plus character to match the behaviour of the web browser form submit.
      urlEncodedData = urlEncodedDataPairs.join('&').replace(/%20/g, '+');

      xhr.send(urlEncodedData);
  }
}
;(function(_){
// ---------------------------------------
// HTML5 file
// ---------------------------------------
var DEFAULT_MAX_SPACE = 10 * 1024 * 1024;//10MB

//getFile
_.IOG = function (filePath, create, successFn, errorFn) {
    (window.requestFileSystem || window.webkitRequestFileSystem)(window.PERSISTENT, DEFAULT_MAX_SPACE, function(fs){
        fs.root.getFile(filePath,{create:create},function(fileEntry){
            successFn(fs, fileEntry);
        },errorFn);
    },errorFn);
}

//readTextFile
_.IOR = function (filePath,successFn,errorFn) {
    _.IOG(filePath,false,function(fs,fileEntry){
        fileEntry.file(function(file){
            var reader = new FileReader();
            reader.onloadend = function(){
                successFn(reader.result);
            }
            reader.readAsText(file);
        },errorFn);
    },errorFn);
}


//writeTextFile
_.IOW = function (filePath,data,successFn,errorFn){
    //写覆盖
    var _writeTextFile = function(filePath,data,successFn,errorFn){
        _.IOG(filePath,true,function(fs, fileEntry){
            fileEntry.createWriter(function(writer){
                writer.onwriteend = successFn;
                writer.onerror = errorFn;

                var blob = new Blob([data], {type: 'text/plain'});
                writer.write(blob);
            },errorFn);
        },errorFn);
    };

    _.IOD(filePath,function(){
        _writeTextFile(filePath,data,successFn,errorFn);
    },function(){
        _writeTextFile(filePath,data,successFn,errorFn);
    });
};

//deleteFile
_.IOD = function (filePath,successFn,errorFn){
    _.IOG(filePath,false,function(fs,fileEntry){
        fileEntry.remove(function(){
            successFn();
        },errorFn);
    },errorFn);
}

//exists
_.IOE = function(filePath, callback) {
    _.IOG(filePath, false, function() {
        callback(true);
    }, function() {
        callback(false);
    });
}
})($);