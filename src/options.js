$(document).on('click.tab.data-api','[data-toggle="tab"]',function(e){
  if(!$(this).parent('li').hasClass('active')){
    var $oldActive = $(this).parent().siblings(".active");
    $oldActive.removeClass('active');
    $(this).parent().addClass('active');
    $($oldActive.children("a").attr("href")).hide();
    $($(this).attr("href")).show();
    window.location.hash = $(this).attr("href")
  }
})
$(document).ready(function(){
  $('[data-toggle="tab"][href="'+window.location.hash+'"]').click();
})

var backgroundPage = chrome.extension.getBackgroundPage();
var require = backgroundPage.require;

with(require("filterClasses"))
{
  this.Filter = Filter;
  this.WhitelistFilter = WhitelistFilter;
}
with(require("subscriptionClasses"))
{
  this.Subscription = Subscription;
  this.SpecialSubscription = SpecialSubscription;
  this.DownloadableSubscription = DownloadableSubscription;
}
var FilterStorage = require("filterStorage").FilterStorage;
var FilterNotifier = require("filterNotifier").FilterNotifier;

var Synchronizer = require("synchronizer").Synchronizer;
var Utils = require("utils").Utils;
var Cscript = require("cscript").Cscript;

// Loads options from localStorage and sets UI elements accordingly
function loadOptions()
{
  // Set page title to i18n version of "Adblock Plus Options"
  document.title = i18n.getMessage("options");

  // Set links
  setLinks("filter-must-follow-syntax", "http://www.adtchrome.com/extension/filtersyntax.html");
  setLinks("rule-subscription-advice", "http://www.adtchrome.com/help/index.html#help2-6");

  // Add event listeners
  window.addEventListener("unload", unloadOptions, false);
  $("#updateFilterLists").click(updateFilterLists);
  $("#startSubscriptionSelection").click(startSubscriptionSelection);
  $("#subscriptionSelector").change(updateSubscriptionSelection);
  $("#addSubscription").click(addSubscription);
  $("#whitelistForm").submit(addWhitelistDomain);
  $("#removeWhitelist").click(removeSelectedExcludedDomain);
  $("#customFilterForm").submit(addTypedFilter);
  $("#removeCustomFilter").click(removeSelectedFilters);
  $("#rawFiltersButton").click(toggleFiltersInRawFormat);
  $("#importRawFilters").click(importRawFiltersText);
  $("#startScriptSelection").click(startScriptSelection);
  $("#scriptSelector").change(updateScriptSelection);
  $("#addScript").click(addScript);
  $("#updateCsxript").click(updateCsxript);

  FilterNotifier.addListener(onFilterChange);
  //这里有个奇怪的bug，firame无法加载

  // Popuplate option checkboxes
  initCheckbox("shouldShowIcon",true);
  initCheckbox("shouldShowBlockElementMenu",true);
  initCheckbox("tfl2",false);
  initCheckbox("hidePlaceholders",true);
  initCheckbox("debug",false);
  initCheckbox("notificationRules",false);

  //重启扩展事件
  $("#reloadextension").click(function(){
    chrome.runtime.reload();
  })

  // Load recommended subscriptions
  loadRecommendations();
  loadRecommendationScript();

  // Show user's filters
  reloadFilters();
}
$(loadOptions);

// Reloads the displayed subscriptions and filters
function reloadFilters() {
  // Load user filter URLs
  var container = document.getElementById("filterLists");
  while (container.lastChild)
    container.removeChild(container.lastChild);

  for (var i = 0; i < FilterStorage.subscriptions.length; i++) {
    var subscription = FilterStorage.subscriptions[i];
    if (subscription instanceof SpecialSubscription)
      continue;

    addSubscriptionEntry(subscription);
  }

  var cscripts = Cscript.cscripts.list;
  for (var i = 0; i < cscripts.length; i++) {
    var timeDate = i18n_timeDateStrings(cscripts[i].lastCheck);
    var messageID = (timeDate[1] ? "last_updated_at" : "last_updated_at_today");
    var timeStr = i18n.getMessage(messageID, timeDate);
    if(cscripts[i].enabled == undefined){
      cscripts[i].enabled = true;
    }
    addCscript(cscripts[i].title,cscripts[i].link,cscripts[i].homepage,timeStr,cscripts[i].enabled);
  };

  $(document).on('click', '.rscript', function(){
    Cscript.remove($(this).next().next().attr("title"));
  })

  $(document).on('click','.cscriptEnabled',function(){
    Cscript.enable($(this).parent().next().attr("title"),$(this).is(':checked'));
  })

  // User-entered filters
  showUserFilters();
}

// Cleans up when the options window is closed
function unloadOptions()
{
  FilterNotifier.removeListener(onFilterChange);
}

function initCheckbox(id, defaultState)
{
  var checkbox = document.getElementById(id);
  if(typeof localStorage[id] == "undefined"){
    localStorage[id] = defaultState;
  }
  checkbox.checked = localStorage[id] == "true";
  checkbox.addEventListener("click", function(){
    localStorage[id] = checkbox.checked;
  }, false);
}

function showUserFilters()
{
  var filters = [];
  var exceptions = [];
  for (var i = 0; i < FilterStorage.subscriptions.length; i++)
  {
    var subscription = FilterStorage.subscriptions[i];
    if (!(subscription instanceof SpecialSubscription))
      continue;

    for (var j = 0; j < subscription.filters.length; j++)
    {
      var filter = subscription.filters[j];
      if (filter instanceof WhitelistFilter && /^@@\|\|([^\/:]+)\^\$document$/.test(filter.text))
        exceptions.push(RegExp.$1)
      else
        filters.push(filter.text);
    }
  }

  populateList("userFiltersBox", filters);
  populateList("excludedDomainsBox", exceptions);
}

var delayedSubscriptionSelection = null;

function loadRecommendations(){
  var request = new XMLHttpRequest();
  request.open("GET", "subscriptions.xml");
  request.onload = function()
  {
    var selectedIndex = 0;
    var selectedPrefix = null;
    var matchCount = 0;

    var list = document.getElementById("subscriptionSelector");
    var elements = request.responseXML.documentElement.getElementsByTagName("subscription");
    for (var i = 0; i < elements.length; i++)
    {
      var element = elements[i];
      var option = new Option();
      option.text = element.getAttribute("title") + " (" + element.getAttribute("specialization") + ")";
      option._data = {
        title: element.getAttribute("title"),
        url: element.getAttribute("url"),
        homepage: element.getAttribute("homepage")
      };

      /**不需要默认的指定规则
      var prefix = require("utils").Utils.checkLocalePrefixMatch(element.getAttribute("prefixes"));
      if (prefix)
      {
        option.style.fontWeight = "bold";
        option.style.backgroundColor = "#E0FFE0";
        option.style.color = "#000000";
        if (!selectedPrefix || selectedPrefix.length < prefix.length)
        {
          selectedIndex = i;
          selectedPrefix = prefix;
          matchCount = 1;
        }
        else if (selectedPrefix && selectedPrefix.length == prefix.length)
        {
          matchCount++;

          // If multiple items have a matching prefix of the same length:
          // Select one of the items randomly, probability should be the same
          // for all items. So we replace the previous match here with
          // probability 1/N (N being the number of matches).
          if (Math.random() * matchCount < 1)
          {
            selectedIndex = i;
            selectedPrefix = prefix;
          }
        }
      }**/
      list.appendChild(option);
    }

    var option = new Option();
    option.text = i18n.getMessage("filters_addSubscriptionOther_label") + "\u2026";
    option._data = null;
    list.appendChild(option);

    list.selectedIndex = selectedIndex;

    if (delayedSubscriptionSelection)
      startSubscriptionSelection.apply(null, delayedSubscriptionSelection);
  };
  request.send(null);
}

function loadRecommendationScript(){
  var request = new XMLHttpRequest();
  request.open("GET", "http://sub.adtchrome.com/subscriptions.xml");
  request.onload = function()
  {
    var selectedIndex = 0;
    var selectedPrefix = null;
    var matchCount = 0;

    var list = document.getElementById("scriptSelector");
    var elements = request.responseXML.documentElement.getElementsByTagName("script");
    for (var i = 0; i < elements.length; i++)
    {
      var element = elements[i];
      var option = new Option();
      option.text = element.getAttribute("title");
      option._data = {
        title: element.getAttribute("title"),
        url: element.getAttribute("url"),
      };
      list.appendChild(option);
    }

    var option = new Option();
    option.text = i18n.getMessage("filters_addSubscriptionOther_label") + "\u2026";
    option._data = null;
    list.appendChild(option);

    list.selectedIndex = selectedIndex;

    if (delayedSubscriptionSelection)
      startSubscriptionSelection.apply(null, delayedSubscriptionSelection);
  };
  request.send(null);
}

function startSubscriptionSelection(title, url)
{
  var list = document.getElementById("subscriptionSelector");
  if (list.length == 0)
  {
    delayedSubscriptionSelection = [title, url];
    return;
  }

  $("#addSubscriptionContainer").show();
  $("#addSubscriptionButton").hide();
  $("#subscriptionSelector").focus();
  if (typeof url != "undefined")
  {
    list.selectedIndex = list.length - 1;
    document.getElementById("customSubscriptionTitle").value = title;
    document.getElementById("customSubscriptionLocation").value = url;
  }
  updateSubscriptionSelection();
  document.getElementById("addSubscriptionContainer").scrollIntoView(true);
}

function startScriptSelection(){
  $("#addScriptContainer").show();
  $("#addScriptButton").hide();
  $("#subscriptSelector").focus();
}

function updateSubscriptionSelection()
{
  var list = document.getElementById("subscriptionSelector");
  var data = list.options[list.selectedIndex]._data;
  if (data)
    $("#customSubscriptionContainer").hide();
  else
  {
    $("#customSubscriptionContainer").show();
    $("#customSubscriptionTitle").focus();
  }
}

function updateScriptSelection(){
  var list = document.getElementById("scriptSelector");
  var data = list.options[list.selectedIndex]._data;
  if (data)
    $("#customScriptContainer").hide();
  else {
    $("#customScriptContainer").show();
    $("#customScriptTitle").focus();
  }
}

function addSubscription()
{
  var list = document.getElementById("subscriptionSelector");
  var data = list.options[list.selectedIndex]._data;
  if (data)
    doAddSubscription(data.url, data.title, data.homepage);
  else
  {
    var url = document.getElementById("customSubscriptionLocation").value.replace(/^\s+/, "").replace(/\s+$/, "");
    if (!/^https?:/i.test(url))
    {
      alert(i18n.getMessage("global_subscription_invalid_location"));
      $("#customSubscriptionLocation").focus();
      return;
    }

    var title = document.getElementById("customSubscriptionTitle").value.replace(/^\s+/, "").replace(/\s+$/, "");
    if (!title)
      title = url;

    doAddSubscription(url, title, null);
  }

  $("#addSubscriptionContainer").hide();
  $("#customSubscriptionContainer").hide();
  $("#addSubscriptionButton").show();
}
function updateCsxript(){
  Cscript.execute();
}
function addScript()
{
  var list = document.getElementById("scriptSelector");
  var data = list.options[list.selectedIndex]._data;
  if (data)
    doAddScript(data.url, data.title);
  else{
    var url = document.getElementById("customScriptLocation").value.replace(/^\s+/, "").replace(/\s+$/, "");
    if (!/^https?:/i.test(url)){
      alert(i18n.getMessage("global_subscription_invalid_location"));
      $("#customScriptLocation").focus();
      return;
    }

    var title = document.getElementById("customScriptTitle").value.replace(/^\s+/, "").replace(/\s+$/, "");
    if (!title)
      title = url;

    doAddScript(url, title);
  }

  $("#addScriptContainer").hide();
  $("#customScriptContainer").hide();
  $("#addScriptButton").show();
}

function doAddSubscription(url, title, homepage)
{
  if (url in FilterStorage.knownSubscriptions)
    return;

  var subscription = Subscription.fromURL(url);
  if (!subscription)
    return;

  subscription.title = title;
  if (homepage)
    subscription.homepage = homepage;
  FilterStorage.addSubscription(subscription);

  if (subscription instanceof DownloadableSubscription && !subscription.lastDownload)
    Synchronizer.execute(subscription);
}

function doAddScript(url, title){
  Cscript.add(title,url);
}

function findSubscriptionElement(subscription)
{
  var children = document.getElementById("filterLists").childNodes;
  for (var i = 0; i < children.length; i++)
    if (children[i]._subscription == subscription)
      return children[i];
  return null;
}

function updateSubscriptionInfo(element)
{
  var subscription = element._subscription;

  var title = element.getElementsByClassName("subscriptionTitle")[0];
  title.textContent = subscription.title;
  title.setAttribute("title", subscription.url);
  if (subscription.homepage)
    title.href = subscription.homepage;
  else
    title.href = subscription.url;

  var enabled = element.getElementsByClassName("subscriptionEnabled")[0];
  enabled.checked = !subscription.disabled;

  var lastUpdate = element.getElementsByClassName("subscriptionUpdate")[0];
  lastUpdate.classList.remove("error");
  if (Synchronizer.isExecuting(subscription.url))
    lastUpdate.textContent = i18n.getMessage("filters_subscription_lastDownload_inProgress");
  else if (subscription.downloadStatus && subscription.downloadStatus != "synchronize_ok")
  {
    var map =
    {
      "synchronize_invalid_url": "filters_subscription_lastDownload_invalidURL",
      "synchronize_connection_error": "filters_subscription_lastDownload_connectionError",
      "synchronize_invalid_data": "filters_subscription_lastDownload_invalidData",
      "synchronize_checksum_mismatch": "filters_subscription_lastDownload_checksumMismatch"
    };
    if (subscription.downloadStatus in map)
      lastUpdate.textContent = i18n.getMessage(map[subscription.downloadStatus]);
    else
      lastUpdate.textContent = subscription.downloadStatus;
    lastUpdate.classList.add("error");
  }
  else if (subscription.lastDownload > 0)
  {
    var timeDate = i18n_timeDateStrings(subscription.lastDownload * 1000);
    var messageID = (timeDate[1] ? "last_updated_at" : "last_updated_at_today");
    lastUpdate.textContent = i18n.getMessage(messageID, timeDate);
  }
}

function onFilterChange(action, item, param1, param2)
{
  console.log(action);
  switch (action)
  {
    case "load":
      reloadFilters();
      break;
    case "subscription.title":
    case "subscription.disabled":
    case "subscription.homepage":
    case "subscription.lastDownload":
    case "subscription.downloadStatus":
      var element = findSubscriptionElement(item);
      if (element)
        updateSubscriptionInfo(element);
      break;
    case "subscription.added":
      if (item instanceof SpecialSubscription)
      {
        for (var i = 0; i < item.filters.length; i++)
          onFilterChange("filter.added", item.filters[i]);
      }
      else if (!findSubscriptionElement(item))
        addSubscriptionEntry(item);
      break;
    case "subscription.removed":
      if (item instanceof SpecialSubscription)
      {
        for (var i = 0; i < item.filters.length; i++)
          onFilterChange("filter.removed", item.filters[i]);
      }
      else
      {
        var element = findSubscriptionElement(item);
        if (element)
          element.parentNode.removeChild(element);
      }
      break;
    case "filter.added":
      if (item instanceof WhitelistFilter && /^@@\|\|([^\/:]+)\^\$document$/.test(item.text))
        appendToListBox("excludedDomainsBox", RegExp.$1);
      else
        appendToListBox("userFiltersBox", item.text);
      break;
    case "filter.removed":
      if (item instanceof WhitelistFilter && /^@@\|\|([^\/:]+)\^\$document$/.test(item.text))
        removeFromListBox("excludedDomainsBox", RegExp.$1);
      else
        removeFromListBox("userFiltersBox", item.text);
      break;
    case "cscript.added":
      addCscript(item,param1,param1,'正在下载...',true);
      break;
    case "cscript.downloadStart":
      $('[title="'+item.link+'"]').next().html('正在下载...');
      break;
    case "cscript.downloadStatus":
      var timeDate = i18n_timeDateStrings(item.lastCheck);
      var messageID = (timeDate[1] ? "last_updated_at" : "last_updated_at_today");
      var timeStr = i18n.getMessage(messageID, timeDate);
      $('[title="'+item.link+'"]').next().html(timeStr);
      break;
    case "cscript.removed":
      $('[title="'+item+'"]').parent().remove();
      break;
  }
}

// Populates a list box with a number of entries
function populateList(id, entries)
{
  var list = document.getElementById(id);
  while (list.lastChild)
    list.removeChild(list.lastChild);

  entries.sort();
  for (var i = 0; i < entries.length; i++)
  {
    var option = new Option();
    option.text = entries[i];
    option.value = entries[i];
    list.appendChild(option);
  }
}

// Add a filter string to the list box.
function appendToListBox(boxId, text)
{
  var elt = new Option();  /* Note: document.createElement("option") is unreliable in Opera */
  elt.text = text;
  elt.value = text;
  document.getElementById(boxId).appendChild(elt);
}

// Remove a filter string from a list box.
function removeFromListBox(boxId, text)
{
  var list = document.getElementById(boxId);
  for (var i = 0; i < list.length; i++)
    if (list.options[i].value == text)
      list.remove(i--);
}

function addWhitelistDomain(event)
{
  event.preventDefault();

  var domain = document.getElementById("newWhitelistDomain").value.replace(/\s/g, "");
  document.getElementById("newWhitelistDomain").value = "";
  if (!domain)
    return;

  var filterText = "@@||" + domain + "^$document";
  FilterStorage.addFilter(Filter.fromText(filterText));
}

// Adds filter text that user typed to the selection box
function addTypedFilter(event)
{
  event.preventDefault();

  var filterText = Filter.normalize(document.getElementById("newFilter").value);
  document.getElementById("newFilter").value = "";
  if (!filterText)
    return;

  FilterStorage.addFilter(Filter.fromText(filterText));
}

// Removes currently selected whitelisted domains
function removeSelectedExcludedDomain()
{
  var excludedDomainsBox = document.getElementById("excludedDomainsBox");
  var remove = [];
  for (var i = 0; i < excludedDomainsBox.length; i++)
    if (excludedDomainsBox.options[i].selected)
      remove.push(excludedDomainsBox.options[i].value);
  if (!remove.length)
    return;

  for (var i = 0; i < remove.length; i++)
    FilterStorage.removeFilter(Filter.fromText("@@||" + remove[i] + "^$document"));
}

// Removes all currently selected filters
function removeSelectedFilters()
{
  var userFiltersBox = document.getElementById("userFiltersBox");
  var remove = [];
  for (var i = 0; i < userFiltersBox.length; i++)
    if (userFiltersBox.options[i].selected)
      remove.push(userFiltersBox.options[i].value);
  if (!remove.length)
    return;

  for (var i = 0; i < remove.length; i++)
    FilterStorage.removeFilter(Filter.fromText(remove[i]));
}

// Shows raw filters box and fills it with the current user filters
function toggleFiltersInRawFormat(event)
{
  event.preventDefault();

  $("#rawFilters").toggle();
  if ($("#rawFilters").is(":visible"))
  {
    var userFiltersBox = document.getElementById("userFiltersBox");
    var text = "";
    for (var i = 0; i < userFiltersBox.length; i++)
      text += userFiltersBox.options[i].value + "\n";
    document.getElementById("rawFiltersText").value = text;
  }
}

// Imports filters in the raw text box
function importRawFiltersText()
{
  $("#rawFilters").hide();
  var filters = document.getElementById("rawFiltersText").value.split("\n");
  var seenFilter = {__proto__: null};
  for (var i = 0; i < filters.length; i++)
  {
    var text = Filter.normalize(filters[i]);
    if (!text)
      continue;

    // Don't import filter list header
    if (/^\[/.test(text))
      continue;

    FilterStorage.addFilter(Filter.fromText(text));
    seenFilter[text] = true;
  }

  var remove = [];
  for (var i = 0; i < FilterStorage.subscriptions.length; i++)
  {
    var subscription = FilterStorage.subscriptions[i];
    if (!(subscription instanceof SpecialSubscription))
      continue;

    for (var j = 0; j < subscription.filters.length; j++)
    {
      var filter = subscription.filters[j];
      if (filter instanceof WhitelistFilter && /^@@\|\|([^\/:]+)\^\$document$/.test(filter.text))
        continue;

      if (!(filter.text in seenFilter))
        remove.push(filter);
    }
  }
  for (var i = 0; i < remove.length; i++)
    FilterStorage.removeFilter(remove[i]);
}

// Called when user explicitly requests filter list updates
function updateFilterLists()
{
  for (var i = 0; i < FilterStorage.subscriptions.length; i++)
  {
    var subscription = FilterStorage.subscriptions[i];
    if (subscription instanceof DownloadableSubscription)
      Synchronizer.execute(subscription, true, true);
  }
}

// Adds a subscription entry to the UI.
function addSubscriptionEntry(subscription)
{
  var template = document.getElementById("subscriptionTemplate");
  var element = template.cloneNode(true);
  element.removeAttribute("id");
  element._subscription = subscription;

  var removeButton = element.getElementsByClassName("subscriptionRemoveButton")[0];
  if (subscription.url.indexOf("adt-chinalist-easylist.txt") > 0) {
    removeButton.className += " undisable";
    removeButton.textContent="";
  }else{
    removeButton.textContent = "\xD7";
    removeButton.setAttribute("title", removeButton.textContent);
    removeButton.addEventListener("click", function(){
      if (!confirm(i18n.getMessage("global_remove_subscription_warning")))
        return;
      FilterStorage.removeSubscription(subscription);
    }, false);
  }
  

  var enabled = element.getElementsByClassName("subscriptionEnabled")[0];
  enabled.addEventListener("click", function()
  {
    if (subscription.disabled == !enabled.checked)
      return;

    subscription.disabled = !enabled.checked;
  }, false);

  updateSubscriptionInfo(element);

  document.getElementById("filterLists").appendChild(element);
}

function addCscript(title,link,home,timeStr,checked){
  var scriptList = document.getElementById("scriptList");
  var subscript = document.createElement("div");
  var checkStr= checked?'checked="checked"':'';
  if (link.indexOf("videoadjs.txt")>0) {
    var buttonStr = '<button class="subscriptionRemoveButton rscript undisable"></button> ';
  }else{
    var buttonStr = '<button class="subscriptionRemoveButton rscript">x</button> ';
  }
  subscript.setAttribute("class","subscription");
  subscript.innerHTML = buttonStr + '<span class="subscriptionEnabledContainer"><input class="subscriptionEnabled cscriptEnabled" type="checkbox" '+checkStr+'> <span class="i18n_filters_subscription_enabled_label">启用</span></span> \
                         <a class="subscriptionTitle" title="'+link+'" href="'+home+'">'+title+'</a><span class="subscriptionUpdate">'+timeStr+'</span>';
  scriptList.appendChild(subscript);
}

function setLinks(id)
{
  var element = document.getElementById(id);
  if (!element)
    return;

  var links = element.getElementsByTagName("a");
  for (var i = 0; i < links.length; i++)
  {
    if (typeof arguments[i + 1] == "string")
    {
      links[i].href = arguments[i + 1];
      links[i].setAttribute("target", "_blank");
    }
    else if (typeof arguments[i + 1] == "function")
    {
      links[i].href = "javascript:void(0);";
      links[i].addEventListener("click", arguments[i + 1], false);
    }
  }
}

function browserCheck(){
  var browser = 'chrome';
  var is360se = function () {
    if( navigator.userAgent.toLowerCase().indexOf('chrome') > -1 ) {
      var desc = navigator.mimeTypes['application/x-shockwave-flash'].description.toLowerCase();
      if( desc.indexOf('adobe') > -1 ) {
        return true;
      }
    }
    return false;
  };
  if(is360se()){
    browser = '360se';      //360se
  }else{
    if(document.createElement("style").scoped!==undefined&&window.v8Locale){
      browser = '360ee';      //360极速
    }else{
      if(window.navigator.userAgent.match(/(LBBROWSER)/i)){
        browser = 'liebao';   //猎豹
      }else if(window.navigator.userAgent.match(/(Chrome)/i)&&window.navigator.userAgent.match(/(MetaSr)/i)){
        browser = 'sogou';  //搜狗
      }else if(window.navigator.userAgent.match(/(Chrome)/i)&&window.navigator.userAgent.match(/(BIDUBrowser)/i)){
        browser = 'baidu';  //百度
      }else{
        browser = 'chrome'; //chrome
      }
    }
  }
  return browser;
}