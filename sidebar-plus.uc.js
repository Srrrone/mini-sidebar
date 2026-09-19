// ==UserScript==
// @name           Sidebar Plus
// @description    A custom header bar — window controls + current
//                  workspace name — injected directly into the sidebar's
//                  own visible content, above the pinned icons.
// @version        3.1.0
// ==/UserScript==

(() => {
  'use strict';

  const HEADER_ID = 'hf-sidebar-header';

  // Earlier versions tried to relocate/restyle Zen's native
  // #zen-sidebar-top-buttons toolbar. That turned out to be a dead end —
  // confirmed via Zen's own source (ZenCustomizableUI.sys.mjs) that this
  // toolbar is inserted into window.gNavToolbox, the SAME shared toolbox
  // that holds the address bar. No CSS width/position trick moves an
  // element into a genuinely different box. This version instead builds
  // its own small header and injects it directly into the sidebar's
  // real scrollable content (#tabbrowser-tabs — the same container the
  // Highlighted Folders mod already uses reliably), as the first thing
  // shown, above the pinned icons.

  function getActiveWorkspaceName() {
    return document.querySelector('zen-workspace[active] .zen-current-workspace-indicator-name')
      ?.textContent || '';
  }

  // Reuses Zen's own real commands (the exact same ones its native
  // window-control buttons invoke) rather than reimplementing
  // minimize/maximize/close logic ourselves — guarantees identical
  // behavior instead of an approximation.
  function invokeCommand(id) {
    const cmd = document.getElementById(id);
    if (cmd?.doCommand) cmd.doCommand();
  }

  function toggleMaximize() {
    const STATE_MAXIMIZED = 1;
    if (window.windowState === STATE_MAXIMIZED) {
      invokeCommand('cmd_restoreWindow');
    } else {
      invokeCommand('cmd_maximizeWindow');
    }
  }

  function buildHeader() {
    const header = document.createElement('div');
    header.id = HEADER_ID;

    const dots = document.createElement('div');
    dots.className = 'hf-header-dots';

    const closeDot = document.createElement('button');
    closeDot.className = 'hf-header-dot hf-dot-close';
    closeDot.title = 'Close';
    closeDot.addEventListener('click', () => invokeCommand('cmd_closeWindow'));

    const minDot = document.createElement('button');
    minDot.className = 'hf-header-dot hf-dot-min';
    minDot.title = 'Minimize';
    minDot.addEventListener('click', () => invokeCommand('cmd_minimizeWindow'));

    const maxDot = document.createElement('button');
    maxDot.className = 'hf-header-dot hf-dot-max';
    maxDot.title = 'Maximize';
    maxDot.addEventListener('click', () => toggleMaximize());

    dots.append(closeDot, minDot, maxDot);

    const name = document.createElement('span');
    name.id = 'hf-header-space-name';
    name.textContent = getActiveWorkspaceName();
    name.title = 'Click to collapse/expand pinned folders';
    // Delegates to the REAL native indicator's own click handling
    // (confirmed in ZenSpace.mjs — it toggles the pinned-folders
    // collapse state) rather than reimplementing that logic ourselves.
    name.addEventListener('click', () => {
      document.querySelector('zen-workspace[active] .zen-current-workspace-indicator')?.click();
    });

    header.append(dots, name);
    return header;
  }

  function ensureHeader() {
    const tabs = document.getElementById('tabbrowser-tabs');
    if (!tabs) return;

    let header = document.getElementById(HEADER_ID);
    if (!header) {
      header = buildHeader();
      tabs.prepend(header);
    } else if (tabs.firstElementChild !== header) {
      tabs.prepend(header);
    }

    const name = document.getElementById('hf-header-space-name');
    if (name) name.textContent = getActiveWorkspaceName();
  }

  function observe() {
    // Re-run whenever the active workspace changes, or the sidebar's
    // tab list is rebuilt (which would otherwise leave our header
    // behind or duplicated).
    new MutationObserver(() => ensureHeader()).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['active'],
      subtree: true
    });

    const tabs = document.getElementById('tabbrowser-tabs');
    if (tabs) {
      new MutationObserver(() => ensureHeader()).observe(tabs, { childList: true });
    }
  }

  function init() {
    ensureHeader();
    observe();
  }

  if (document.readyState === 'complete') {
    init();
  } else {
    window.addEventListener('load', init, { once: true });
  }
})();
