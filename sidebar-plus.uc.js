// ==UserScript==
// @name           Sidebar Plus
// @description    Mirrors the current workspace's name ("Personal", etc.)
//                  into the sidebar's top row, next to the window controls.
// @version        2.0.0
// ==/UserScript==

(() => {
  'use strict';

  const MIRROR_ID = 'hf-space-name-mirror';

  // The real element showing the current workspace's name
  // (.zen-current-workspace-indicator-name) is fused into a much bigger
  // native structure — the vbox that wraps a workspace's entire tab-list
  // section — not a small standalone label. Actually relocating THAT
  // risks breaking real tab-list functionality. So instead of moving it,
  // this creates a small label of our own in the top row and just keeps
  // its text mirrored to whatever the real one currently shows.
  function getSourceLabel() {
    return document.querySelector('.zen-current-workspace-indicator-name');
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
    // Re-sync whenever the real label's text actually changes (switching
    // workspaces, renaming one, etc.).
    const source = getSourceLabel();
    if (source) {
      new MutationObserver(() => syncWorkspaceName()).observe(source, {
        childList: true,
        characterData: true,
        subtree: true
      });
    }

    // Also re-sync on broader toolbar changes and compact-mode toggling,
    // in case the source label itself gets recreated rather than just
    // having its text updated.
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
