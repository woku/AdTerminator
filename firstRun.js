/*
 * This file is part of the Adblock Plus extension,
 * Copyright (C) 2006-2012 Eyeo GmbH
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

var backgroundPage = chrome.extension.getBackgroundPage();
var require = backgroundPage.require;
var Prefs = require("prefs").Prefs;
var Utils = require("utils").Utils;
var Filter = require("filterClasses").Filter;

function init()
{

  // Set up page title
  var titleId = (backgroundPage.isFirstRun ? "firstRun_title_install" : "firstRun_title_update");
  var pageTitle = i18n.getMessage(titleId);
  document.title = document.getElementById("title-main").textContent = pageTitle;

  // Only show changelog link on the update page
  if (backgroundPage.isFirstRun)
    document.getElementById("title-changelog").style.display = "none";

  // Show warning if data corruption was detected
  if (backgroundPage.seenDataCorruption)
    document.getElementById("dataCorruptionWarning").removeAttribute("hidden");

}
window.addEventListener("load", init, false);

