// ==UserScript==
// @name           Mini Sidebar
// @description    Hover-triggered icon rail on the right edge, opening a
//                  Reading List panel or an embedded AI chat panel.
// @version        1.1.0
// ==/UserScript==

(() => {
  'use strict';

  const PREF_BRANCH = 'srrrone.mini-sidebar.';
  const PREF_READING_LIST = `${PREF_BRANCH}reading-list`;
  const PREF_AI_URL = `${PREF_BRANCH}ai-url`;

  const DEFAULT_AI_URL = 'https://claude.ai';
  const HIDE_DELAY_MS = 350;

  function getPrefs() {
    try {
      return Services.prefs;
    } catch {
      return null;
    }
  }

  function readStringPref(name, fallback) {
    const prefs = getPrefs();
    try {
      const value = prefs?.getStringPref(name, '');
      return value || fallback;
    } catch {
      return fallback;
    }
  }

  function readReadingList() {
    const raw = readStringPref(PREF_READING_LIST, '');
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function writeReadingList(list) {
    const prefs = getPrefs();
    try {
      prefs?.setStringPref(PREF_READING_LIST, JSON.stringify(list));
    } catch {}
  }

  function addCurrentTabToReadingList() {
    const browser = gBrowser?.selectedBrowser;
    if (!browser) return;

    const url = browser.currentURI?.spec;
    const title = gBrowser.selectedTab?.label || url;
    if (!url) return;

    const list = readReadingList();
    if (list.some((item) => item.url === url)) return; // already saved

    list.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      url,
      title
    });
    writeReadingList(list);
    renderReadingList();
  }

  function removeFromReadingList(id) {
    writeReadingList(readReadingList().filter((item) => item.id !== id));
    renderReadingList();
  }

  let readingListBody = null;

  function renderReadingList() {
    if (!readingListBody) return;

    const list = readReadingList();
    readingListBody.innerHTML = '';

    if (!list.length) {
      const empty = document.createElement('div');
      empty.id = 'msb-reading-empty';
      empty.textContent = 'Nothing saved yet — use "Add current page" above.';
      readingListBody.appendChild(empty);
      return;
    }

    for (const item of list) {
      const row = document.createElement('div');
      row.className = 'msb-reading-item';

      const title = document.createElement('span');
      title.className = 'msb-reading-item-title';
      title.textContent = item.title || item.url;
      title.title = item.url;
      title.addEventListener('click', () => {
        window.open(item.url, '_blank');
      });

      const remove = document.createElement('button');
      remove.className = 'msb-reading-item-remove';
      remove.textContent = '×';
      remove.title = 'Remove';
      remove.addEventListener('click', (event) => {
        event.stopPropagation();
        removeFromReadingList(item.id);
      });

      row.appendChild(title);
      row.appendChild(remove);
      readingListBody.appendChild(row);
    }
  }

  function buildReadingListPanelBody() {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.height = '100%';

    const addButton = document.createElement('button');
    addButton.id = 'msb-reading-list-add';
    addButton.textContent = '+ Add current page';
    addButton.addEventListener('click', addCurrentTabToReadingList);

    const items = document.createElement('div');
    items.id = 'msb-reading-list-items';
    readingListBody = items;

    wrapper.appendChild(addButton);
    wrapper.appendChild(items);
    renderReadingList();

    return wrapper;
  }

  // Built once and reused (not recreated on every open), so the AI site
  // stays logged in and doesn't reload each time you toggle the panel.
  let aiBrowserEl = null;

  function buildAiPanelBody() {
    if (!aiBrowserEl) {
      aiBrowserEl = document.createXULElement('browser');
      aiBrowserEl.id = 'msb-ai-browser';
      aiBrowserEl.setAttribute('type', 'content');
      aiBrowserEl.setAttribute('remote', 'true');
      aiBrowserEl.setAttribute('maychangeremoteness', 'true');
      aiBrowserEl.setAttribute('src', readStringPref(PREF_AI_URL, DEFAULT_AI_URL));
      aiBrowserEl.setAttribute('flex', '1');
    }
    return aiBrowserEl;
  }

  const PANELS = {
    reading: { title: 'Reading List', build: buildReadingListPanelBody },
    ai: { title: 'AI Chat', build: buildAiPanelBody }
  };

  let activePanelId = null;
  let hideTimer = 0;

  function clearHideTimer() {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = 0;
    }
  }

  function scheduleHideRail(rail) {
    clearHideTimer();
    hideTimer = setTimeout(() => {
      rail.classList.remove('msb-visible');
    }, HIDE_DELAY_MS);
  }

  function updateRailActiveState() {
    document.querySelectorAll('.msb-rail-icon').forEach((icon) => {
      icon.setAttribute('data-active', String(icon.dataset.panelId === activePanelId));
    });
  }

  function openPanel(panelId, panel, panelTitle, panelBody) {
    const definition = PANELS[panelId];
    if (!definition) return;

    if (activePanelId === panelId) {
      // Clicking the already-open panel's icon again closes it.
      panel.classList.remove('msb-visible');
      activePanelId = null;
      document.documentElement.removeAttribute('msb-panel-open');
      updateRailActiveState();
      return;
    }

    panelTitle.textContent = definition.title;
    panelBody.innerHTML = '';
    panelBody.appendChild(definition.build());

    panel.classList.add('msb-visible');
    activePanelId = panelId;
    document.documentElement.setAttribute('msb-panel-open', 'true');
    updateRailActiveState();
  }

  function closePanel(panel) {
    panel.classList.remove('msb-visible');
    activePanelId = null;
    document.documentElement.removeAttribute('msb-panel-open');
    updateRailActiveState();
  }

  function buildUI() {
    const trigger = document.createElement('div');
    trigger.id = 'msb-hover-trigger';

    const rail = document.createElement('div');
    rail.id = 'msb-rail';

    const readingIcon = document.createElement('button');
    readingIcon.className = 'msb-rail-icon';
    readingIcon.dataset.panelId = 'reading';
    readingIcon.title = 'Reading List';
    readingIcon.textContent = '📖';

    const aiIcon = document.createElement('button');
    aiIcon.className = 'msb-rail-icon';
    aiIcon.dataset.panelId = 'ai';
    aiIcon.title = 'AI Chat';
    aiIcon.textContent = '✨';

    rail.appendChild(readingIcon);
    rail.appendChild(aiIcon);

    const panel = document.createElement('div');
    panel.id = 'msb-panel';

    const header = document.createElement('div');
    header.id = 'msb-panel-header';

    const panelTitle = document.createElement('span');
    panelTitle.id = 'msb-panel-title';

    const closeButton = document.createElement('button');
    closeButton.id = 'msb-panel-close';
    closeButton.textContent = '×';
    closeButton.addEventListener('click', () => closePanel(panel));

    header.appendChild(panelTitle);
    header.appendChild(closeButton);

    const panelBody = document.createElement('div');
    panelBody.id = 'msb-panel-body';

    panel.appendChild(header);
    panel.appendChild(panelBody);

    readingIcon.addEventListener('click', () => openPanel('reading', panel, panelTitle, panelBody));
    aiIcon.addEventListener('click', () => openPanel('ai', panel, panelTitle, panelBody));

    // Hover logic: entering the trigger strip or the rail itself keeps
    // the rail visible; leaving both (after a short grace delay, so
    // moving from the trigger onto the rail doesn't flicker it shut)
    // retracts it. The panel, once opened, stays open regardless of the
    // rail's hover state — only closes via the × or its own icon again.
    const showRail = () => {
      clearHideTimer();
      rail.classList.add('msb-visible');
    };
    const scheduleHide = () => scheduleHideRail(rail);

    trigger.addEventListener('mouseenter', showRail);
    trigger.addEventListener('mouseleave', scheduleHide);
    rail.addEventListener('mouseenter', showRail);
    rail.addEventListener('mouseleave', scheduleHide);

    document.documentElement.appendChild(trigger);
    document.documentElement.appendChild(rail);
    document.documentElement.appendChild(panel);
  }

  function init() {
    buildUI();
  }

  if (document.readyState === 'complete') {
    init();
  } else {
    window.addEventListener('load', init, { once: true });
  }
})();
