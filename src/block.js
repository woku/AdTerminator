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
var tabId = parseInt(location.href.match(/block.html\?tabId=(\d+)/)[1]);
function init()
{
  // Attach event listeners
  window.addEventListener("keydown", onKeyDown, false);

  $("#addButton").click(addFilters);
  $("#cancelButton").click(closeDialog.bind(null, false));
  $("#close").click(closeDialog.bind(null, false));

  chrome.tabs.sendMessage(tabId, {
    reqtype: "clickhide-init",
    width: Math.max(document.body.offsetWidth , document.body.scrollWidth),
    height: document.body.offsetHeight
  }, function(response){
    document.getElementById("filters").value = response.filters.join("\n");
  })

  document.getElementById("filters").focus();
}
$(init);

function onKeyDown(event)
{
  if (event.keyCode == 27)
  {
    event.preventDefault();
    closeDialog();
  }
  else if (event.keyCode == 13 && !event.shiftKey && !event.ctrlKey)
  {
    event.preventDefault();
    addFilters();
  }
}

function addFilters()
{
  // Tell the background page to add the filters
  var filters = document.getElementById("filters").value.split(/[\r\n]+/)
                        .map(function(f) {return f.replace(/^\s+/, "").replace(/\s+$/, "");})
                        .filter(function(f) {return f != "";});
  chrome.runtime.sendMessage({reqtype: "add-filters", filters: filters});
  closeDialog(true);
}

function closeDialog(success){
  window.close();
}
