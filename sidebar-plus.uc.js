// ==UserScript==
// @name           Sidebar Plus
// @description    Mirrors the current workspace's name ("Personal", etc.)
//                  into the sidebar's top row, next to the window controls.
// @version        2.1.0
// ==/UserScript==

(() => {
  'use strict';

  const MIRROR_ID = 'hf-space-name-mirror';

  // The active workspace's root element gets an `active="true"` attribute
  // (confirmed via Zen's source, ZenSpace.mjs) — every OTHER workspace's
  // name label also exists in the DOM at the same time (just not shown),
  // so a plain querySelector without this scoping always grabbed
  // whichever one happened to be first in the page, not the one that was
  // actually active. That's why the mirrored label was stuck on one
  // workspace's name regardless of which space was actually selected.
  function getSourceLabel() {
    return document.querySelector('zen-workspace[active] .zen-current-workspace-indicator-name');
  }

  function ensureMirrorLabel(topButtons) {
    let mirror = document.getElementById(MIRROR_ID);
    if (!mirror) {
      mirror = document.createElement('span');
      mirror.id = MIRROR_ID;
      topButtons.appendChild(mirror);
    } else if (mirror.parentElement !== topButtons) {
      topButtons.appendChild(mirror);
    }
    return mirror;
  }

  function syncWorkspaceName() {
    const topButtons = document.getElementById('zen-sidebar-top-buttons');
    if (!topButtons) return;

    const source = getSourceLabel();
    const mirror = ensureMirrorLabel(topButtons);
    mirror.textContent = source?.textContent || '';
  }

  function observeTopRow() {
    // Re-sync whenever ANY workspace's [active] attribute changes — this
    // is what actually happens on switching spaces (a different
    // <zen-workspace> element becomes the active one; watching one
    // specific label node, like before, missed this entirely since that
    // node stayed the same, it just stopped being the active one).
    // Scoped to just this one attribute so it's cheap even watching the
    // whole document.
    new MutationObserver(() => syncWorkspaceName()).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['active'],
      subtree: true
    });

    // Also re-sync on broader toolbar changes and compact-mode toggling,
    // as a fallback in case workspaces get added/removed/reordered.
    const navBar = document.getElementById('nav-bar');
    if (navBar) {
      new MutationObserver(() => syncWorkspaceName()).observe(navBar, { childList: true });
    }

    new MutationObserver(() => syncWorkspaceName()).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['zen-compact-mode']
    });
  }

  function init() {
    syncWorkspaceName();
    observeTopRow();
  }

  if (document.readyState === 'complete') {
    init();
  } else {
    window.addEventListener('load', init, { once: true });
  }
})();
