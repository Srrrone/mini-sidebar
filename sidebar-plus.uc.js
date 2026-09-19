// ==UserScript==
// @name           Dia Sidebar
// @description    Moves the native Spaces switcher up next to the window
//                  control buttons at the top of the sidebar.
// @version        1.0.0
// ==/UserScript==

(() => {
  'use strict';

  // Moves the native Spaces/workspace switcher (<zen-workspace-icons
  // id="zen-workspaces-button">) up into #zen-sidebar-top-buttons, so it
  // sits alongside the window controls instead of in the bottom bar.
  // The window control buttons themselves (.titlebar-buttonbox-container)
  // already live in #zen-sidebar-top-buttons natively on this setup —
  // no relocation needed for those; see userChrome.css for what makes
  // them look like Dia's colored dots instead of square buttons.
  function moveSpacesSwitcherToTop() {
    const topButtons = document.getElementById('zen-sidebar-top-buttons');
    if (!topButtons) return;

    const spacesButton = document.getElementById('zen-workspaces-button');
    if (spacesButton && spacesButton.parentElement !== topButtons) {
      topButtons.appendChild(spacesButton);
    }
  }

  function observeTopRow() {
    const navBar = document.getElementById('nav-bar');
    if (navBar) {
      new MutationObserver(() => moveSpacesSwitcherToTop()).observe(navBar, { childList: true });
    }

    // Also re-run whenever compact mode itself gets toggled, since Zen
    // can reset toolbar contents around that transition.
    new MutationObserver(() => moveSpacesSwitcherToTop()).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['zen-compact-mode']
    });
  }

  function init() {
    moveSpacesSwitcherToTop();
    observeTopRow();
  }

  if (document.readyState === 'complete') {
    init();
  } else {
    window.addEventListener('load', init, { once: true });
  }
})();
