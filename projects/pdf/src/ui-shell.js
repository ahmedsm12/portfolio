/* ============================================================
 * ui-shell.js — الواجهة الجديدة (TopBar, Props, Bottom, Present)
 * ============================================================
 *  لا يستورد أي شيء من الوحدات الأخرى — يعمل عبر DOM + dynamic import.
 *  يعمل بشكل مستقل — إن فشل أي جزء، لا يكسر التطبيق الأساسي.
 * ============================================================ */

export const APP_VERSION = '0.5.0';

/* ============================================================
   §1. VERSION
   ============================================================ */
function applyVersion() {
  const el = document.getElementById('appVersion');
  if (el) el.textContent = 'v' + APP_VERSION;
}

/* ============================================================
   §2. SAVE BADGE
   ============================================================ */
let _saveBadgeTimer = null;
function setSaveBadge(text, saving) {
  const txt = document.getElementById('saveBadgeText');
  const dot = document.querySelector('#saveBadge .save-dot');
  if (txt) txt.textContent = text || 'محفوظ';
  if (dot) dot.classList.toggle('saving', !!saving);
}

/* ============================================================
   §3. PROPS TABS
   ============================================================ */
function initPropsTabs() {
  const root = document.getElementById('propsRight');
  if (!root) return;
  const tabs = root.querySelectorAll('.props-tab');
  const panels = root.querySelectorAll('.props-panel');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.style.display = 'none');
      tab.classList.add('active');
      const key = tab.dataset.ptab;
      const panel = root.querySelector(`.props-panel[data-ppanel="${key}"]`);
      if (panel) panel.style.display = 'block';
    });
  });
}

/* ============================================================
   §4. BOTTOM PANEL
   ============================================================ */
function initBottomPanel() {
  const panel = document.getElementById('bottomPanel');
  if (!panel) return;
  const tabs = panel.querySelectorAll('.bp-tab');
  const contents = panel.querySelectorAll('.bp-content');
  const toggle = document.getElementById('bpToggle');

  /* دالة موحّدة لتحديث الحالة + إبلاغ الـ CSS */
  function setPanelExpanded(expanded) {
    panel.classList.toggle('collapsed', !expanded);
    document.body.classList.toggle('bp-expanded', expanded);
    if (toggle) toggle.textContent = expanded ? '▾' : '▴';
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const key = tab.dataset.btab;

      // نفس التبويب مفتوح → اطوِ
      if (tab.classList.contains('active') && !panel.classList.contains('collapsed')) {
        setPanelExpanded(false);
        return;
      }

      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));
      tab.classList.add('active');

      const content = panel.querySelector(`.bp-content[data-bpanel="${key}"]`);
      if (content) content.classList.add('active');

      setPanelExpanded(true);
    });
  });

  if (toggle) {
    toggle.addEventListener('click', () => {
      setPanelExpanded(panel.classList.contains('collapsed'));
    });
  }

  /* الحالة الابتدائية: مطويّة */
  setPanelExpanded(false);
}
  const panel = document.getElementById('bottomPanel');
  if (!panel) return;
  const tabs = panel.querySelectorAll('.bp-tab');
  const contents = panel.querySelectorAll('.bp-content');
  const toggle = document.getElementById('bpToggle');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const key = tab.dataset.btab;
      // If same tab & already expanded → collapse
      if (tab.classList.contains('active') && !panel.classList.contains('collapsed')) {
        panel.classList.add('collapsed');
        if (toggle) toggle.textContent = '▴';
        return;
      }
      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      const content = panel.querySelector(`.bp-content[data-bpanel="${key}"]`);
      if (content) content.classList.add('active');
      panel.classList.remove('collapsed');
      if (toggle) toggle.textContent = '▾';
    });
  });

  if (toggle) {
    toggle.addEventListener('click', () => {
      panel.classList.toggle('collapsed');
      toggle.textContent = panel.classList.contains('collapsed') ? '▴' : '▾';
    });
  }
}

/* ============================================================
   §5. LAYERS PANEL — قراءة من DOM الحقيقي
   ============================================================ */
function getLayerIcon(type) {
  if (type === 'image') return '🖼';
  if (type === 'text') return 'T';
  if (type === 'button') return '🔘';
  if (type === 'media') return '🎬';
  if (type === 'embed') return '🔗';
  if (type === 'path') return '✏';
  if (type === 'highlighter') return '🖍';
  if (type === 'rect') return '▭';
  if (type === 'ellipse') return '◯';
  if (type === 'line') return '╱';
  return '·';
}

export function refreshLayersPanel() {
  const list = document.getElementById('layersList');
  const count = document.getElementById('layerCount');
  if (!list) return;

  const items = [];

  // SVG annotations
  const svg = document.getElementById('svgLayer');
  if (svg) {
    svg.querySelectorAll('[data-annot]').forEach(el => {
      if (el.tagName.toLowerCase() === 'g') return;
      const t = el.dataset.type || el.tagName.toLowerCase();
      items.push({
        el,
        kind: 'svg',
        type: t,
        name: t + ' ' + (el.dataset.id ? el.dataset.id.slice(-4) : ''),
      });
    });
  }

  // Text boxes
  const txt = document.getElementById('textLayer');
  if (txt) {
    txt.querySelectorAll('.pdf-text-box').forEach((el, i) => {
      const isEq = el.dataset.isEquation === 'true';
      items.push({
        el,
        kind: 'text',
        type: isEq ? 'equation' : 'text',
        name: (isEq ? 'معادلة ' : 'نص ') + (i + 1),
      });
    });
  }

  // Media
  const vid = document.getElementById('videoLayer');
  if (vid) {
    vid.querySelectorAll('.media-obj').forEach((el, i) => {
      items.push({
        el,
        kind: 'media',
        type: 'media',
        name: el.dataset.title || ('ميديا ' + (i + 1)),
      });
    });
  }

  // Embeds
  const emb = document.getElementById('embedLayer');
  if (emb) {
    emb.querySelectorAll('.embed').forEach((el, i) => {
      items.push({
        el,
        kind: 'embed',
        type: 'embed',
        name: 'تضمين: ' + (el.dataset.url || ('#' + (i + 1))),
      });
    });
  }

  // Buttons
  const ib = document.getElementById('interactiveLayer');
  if (ib) {
    ib.querySelectorAll('.pdf-interactive-btn').forEach((el, i) => {
      items.push({
        el,
        kind: 'button',
        type: 'button',
        name: el.dataset.text || ('زر ' + (i + 1)),
      });
    });
  }

  // Reverse: front-most first
  items.reverse();

  if (!items.length) {
    list.innerHTML = '<div class="bp-empty">لا توجد عناصر في هذه الشريحة</div>';
    if (count) count.textContent = '0';
    return;
  }

  if (count) count.textContent = String(items.length);

  list.innerHTML = '';
  items.forEach(item => {
    const row = document.createElement('div');
    row.className = 'layer-row';
    row.innerHTML = `
      <span class="ly-icon">${getLayerIcon(item.type)}</span>
      <span class="ly-name"></span>
      <span class="ly-toggle on" data-act="vis" title="إظهار/إخفاء">👁</span>
    `;
    row.querySelector('.ly-name').textContent = item.name;
    row.dataset.layerType = item.kind;

    row.addEventListener('click', (e) => {
      if (e.target.dataset.act === 'vis') {
        const visible = e.target.classList.toggle('on');
        item.el.style.display = visible ? '' : 'none';
        return;
      }
      // Select the element via the existing interaction system
      list.querySelectorAll('.layer-row').forEach(r => r.classList.remove('active'));
      row.classList.add('active');
      // Dispatch a custom event the interaction layer can listen to
      document.dispatchEvent(new CustomEvent('ipb:selectLayer', {
        detail: { el: item.el, kind: item.kind },
      }));
    });

    list.appendChild(row);
  });
}

/* ============================================================
   §6. TOPBAR ACTIONS
   ============================================================ */
function initTopbarActions() {
  const btnUndo = document.getElementById('btnUndo');
  const btnRedo = document.getElementById('btnRedo');
  const btnOpen = document.getElementById('btnOpen');
  const btnSave = document.getElementById('btnSave');
  const btnPreview = document.getElementById('btnPreview');
  const btnPresent = document.getElementById('btnPresent');

  btnUndo?.addEventListener('click', async () => {
    try {
      const core = await import('./core.js');
      core.undo();
      setSaveBadge('تم التراجع', false);
    } catch (e) { console.warn(e); }
  });

  btnRedo?.addEventListener('click', async () => {
    try {
      const core = await import('./core.js');
      core.redo();
      setSaveBadge('تم الإعادة', false);
    } catch (e) { console.warn(e); }
  });

  btnOpen?.addEventListener('click', () => {
    const input = document.getElementById('fileInput');
    if (input) input.click();
  });

  btnSave?.addEventListener('click', async () => {
    setSaveBadge('جارٍ الحفظ…', true);
    try {
      const storage = await import('./storage.js');
      await storage.saveProjectAsFile();
      setSaveBadge('محفوظ الآن', false);
    } catch (e) {
      setSaveBadge('فشل الحفظ', false);
    }
  });

  btnPreview?.addEventListener('click', () => {
    openPresentMode();
  });

  btnPresent?.addEventListener('click', () => {
    openPresentMode();
  });
}

/* ============================================================
   §7. PRESENT MODE
   ============================================================ */
const presentState = {
  active: false,
  tool: 'select',
  undoStack: [],
  redoStack: [],
  timerStart: 0,
  timerInterval: null,
  keyListener: null,
};

async function openPresentMode() {
  if (presentState.active) return;
  presentState.active = true;

  const overlay = document.getElementById('presentOverlay');
  if (!overlay) return;
  overlay.classList.add('active');

  // Set toolbar default
  setPresentTool('select');
  updatePresentUndoRedo();
  resetPresentTimer();
  startPresentTimer();
  updatePresentPageNum();
  copyStageToPresent();
  bindPresentKeys();
  bindPresentToolbar();

  // Show toolbar briefly on entry
  const bar = document.getElementById('presentToolbar');
  if (bar) {
    bar.classList.add('show');
    setTimeout(() => bar.classList.remove('show'), 2500);
  }

  // Listen for state changes to update page number
  document.addEventListener('ipb:pageChanged', onPresentPageChanged);

  // Listen for annotation changes to push to undo stack
  document.addEventListener('ipb:annotationChanged', onPresentAnnotationChanged);
}

function closePresentMode() {
  if (!presentState.active) return;
  presentState.active = false;

  const overlay = document.getElementById('presentOverlay');
  overlay?.classList.remove('active');

  stopPresentTimer();
  unbindPresentKeys();
  unbindPresentToolbar();

  document.removeEventListener('ipb:pageChanged', onPresentPageChanged);
  document.removeEventListener('ipb:annotationChanged', onPresentAnnotationChanged);

  presentState.undoStack = [];
  presentState.redoStack = [];
  updatePresentUndoRedo();
}

function onPresentPageChanged() {
  copyStageToPresent();
  updatePresentPageNum();
}

function onPresentAnnotationChanged(e) {
  if (e.detail && e.detail.type === 'add') {
    presentState.undoStack.push(e.detail);
    presentState.redoStack = [];
    updatePresentUndoRedo();
  }
}

function copyStageToPresent() {
  const stage = document.getElementById('stage');
  const presentStage = document.getElementById('presentStage');
  const presentCanvas = document.getElementById('presentCanvas');
  const pdfCanvas = document.getElementById('pdfCanvas');
  const presentLayerHost = document.getElementById('presentLayerHost');
  const svgLayer = document.getElementById('svgLayer');

  if (!stage || !presentStage || !pdfCanvas || !presentCanvas) return;

  // Match aspect ratio
  const stageRect = stage.getBoundingClientRect();
  const vw = window.innerWidth * 0.9;
  const vh = window.innerHeight * 0.9;
  const aspect = stageRect.width / stageRect.height;
  let w = vw, h = w / aspect;
  if (h > vh) { h = vh; w = h * aspect; }

  presentStage.style.width = w + 'px';
  presentStage.style.height = h + 'px';

  // Copy PDF canvas
  presentCanvas.width = pdfCanvas.width;
  presentCanvas.height = pdfCanvas.height;
  const pctx = presentCanvas.getContext('2d');
  pctx.drawImage(pdfCanvas, 0, 0);

  // Copy SVG layer
  if (presentLayerHost && svgLayer) {
    presentLayerHost.innerHTML = '';
    const clone = svgLayer.cloneNode(true);
    clone.setAttribute('width', '100%');
    clone.setAttribute('height', '100%');
    clone.style.width = '100%';
    clone.style.height = '100%';
    presentLayerHost.appendChild(clone);
  }

  // Setup laser canvas
  const presentLaser = document.getElementById('presentLaser');
  if (presentLaser) {
    presentLaser.width = pdfCanvas.width;
    presentLaser.height = pdfCanvas.height;
  }
}

function updatePresentPageNum() {
  const el = document.getElementById('presentPageNum');
  const indicator = document.getElementById('pageIndicator');
  if (el && indicator) {
    el.textContent = indicator.textContent || '— / —';
  }
}

function setPresentTool(tool) {
  presentState.tool = tool;
  const bar = document.getElementById('presentToolbar');
  if (!bar) return;
  bar.querySelectorAll('[data-ptool]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.ptool === tool);
  });
  document.dispatchEvent(new CustomEvent('ipb:presentToolChanged', {
    detail: { tool },
  }));
}

function bindPresentToolbar() {
  const bar = document.getElementById('presentToolbar');
  if (!bar) return;

  bar.querySelectorAll('[data-ptool]').forEach(btn => {
    btn.addEventListener('click', () => {
      setPresentTool(btn.dataset.ptool);
    });
  });

  document.getElementById('presentUndo')?.addEventListener('click', presentUndo);
  document.getElementById('presentRedo')?.addEventListener('click', presentRedo);
  document.getElementById('presentClear')?.addEventListener('click', presentClearAll);
  document.getElementById('presentPrev')?.addEventListener('click', presentPrevPage);
  document.getElementById('presentNext')?.addEventListener('click', presentNextPage);
  document.getElementById('presentExit')?.addEventListener('click', closePresentMode);
}

function unbindPresentToolbar() {
  // Simple approach: replace listeners by cloning nodes
  // Not done here to keep it simple — the overlay is destroyed when we exit
}

async function presentPrevPage() {
  try {
    const pdf = await import('./pdf.js');
    const state = (await import('./core.js')).state;
    if (state.currentPage > 1) {
      await pdf.goToPage(state.currentPage - 1);
    }
  } catch (e) { console.warn(e); }
}

async function presentNextPage() {
  try {
    const pdf = await import('./pdf.js');
    const state = (await import('./core.js')).state;
    if (state.currentPage < state.totalPages) {
      await pdf.goToPage(state.currentPage + 1);
    }
  } catch (e) { console.warn(e); }
}

function presentUndo() {
  if (!presentState.undoStack.length) return;
  const item = presentState.undoStack.pop();
  presentState.redoStack.push(item);
  // Apply undo action
  if (item.el && item.el.parentNode) {
    item.el.style.display = 'none';
  }
  updatePresentUndoRedo();
}

function presentRedo() {
  if (!presentState.redoStack.length) return;
  const item = presentState.redoStack.pop();
  presentState.undoStack.push(item);
  if (item.el && item.el.parentNode) {
    item.el.style.display = '';
  }
  updatePresentUndoRedo();
}

function presentClearAll() {
  // Remove all drawings from the present layer (visual only)
  const host = document.getElementById('presentLayerHost');
  if (host) {
    host.querySelectorAll('[data-present-annot]').forEach(el => el.remove());
  }
  presentState.undoStack = [];
  presentState.redoStack = [];
  updatePresentUndoRedo();
}

function updatePresentUndoRedo() {
  const u = document.getElementById('presentUndo');
  const r = document.getElementById('presentRedo');
  if (u) u.disabled = presentState.undoStack.length === 0;
  if (r) r.disabled = presentState.redoStack.length === 0;
}

function resetPresentTimer() {
  presentState.timerStart = Date.now();
  updatePresentTimerDisplay();
}
function startPresentTimer() {
  stopPresentTimer();
  presentState.timerInterval = setInterval(updatePresentTimerDisplay, 1000);
}
function stopPresentTimer() {
  if (presentState.timerInterval) {
    clearInterval(presentState.timerInterval);
    presentState.timerInterval = null;
  }
}
function updatePresentTimerDisplay() {
  const el = document.getElementById('presentTimer');
  if (!el) return;
  const elapsed = Math.floor((Date.now() - presentState.timerStart) / 1000);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');
  el.textContent = mm + ':' + ss;
}

function bindPresentKeys() {
  presentState.keyListener = (e) => {
    if (!presentState.active) return;
    if (e.key === 'Escape') { closePresentMode(); return; }
    if (e.key === 'ArrowRight') { presentNextPage(); return; }
    if (e.key === 'ArrowLeft') { presentPrevPage(); return; }
    if (e.key === 'p' || e.key === 'P') { setPresentTool('pen'); return; }
    if (e.key === 'h' || e.key === 'H') { setPresentTool('hand'); return; }
    if (e.key === 'l' || e.key === 'L') { setPresentTool('laser'); return; }
    if (e.key === 'e' || e.key === 'E') { setPresentTool('eraser'); return; }
    if (e.key === 'v' || e.key === 'V') { setPresentTool('select'); return; }
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      if (e.shiftKey) presentRedo(); else presentUndo();
      return;
    }
  };
  document.addEventListener('keydown', presentState.keyListener);
}

function unbindPresentKeys() {
  if (presentState.keyListener) {
    document.removeEventListener('keydown', presentState.keyListener);
    presentState.keyListener = null;
  }
}

/* ═══════════════════════════════════════════════════════════
   §8. HOOKS — مراقبة أحداث التطبيق
   ═══════════════════════════════════════════════════════════ */

// Observe stage mutations to keep layers panel in sync
let _layersObserver = null;
function initLayersObserver() {
  if (_layersObserver) return;
  const stageContent = document.getElementById('stageContent');
  if (!stageContent) return;
  _layersObserver = new MutationObserver(() => {
    refreshLayersPanel();
  });
  _layersObserver.observe(stageContent, {
    childList: true,
    subtree: true,
  });
  refreshLayersPanel();
}

// Sync page change events to update layers panel
function initPageChangeListener() {
  document.addEventListener('ipb:pageChanged', () => {
    setTimeout(refreshLayersPanel, 50);
  });
}

// F5 shortcut from anywhere
function initGlobalShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'F5') {
      e.preventDefault();
      if (presentState.active) closePresentMode();
      else openPresentMode();
    }
    // Note: Esc inside present mode handled by its own listener
  });
}

/* ═══════════════════════════════════════════════════════════
   §9. INIT
   ═══════════════════════════════════════════════════════════ */
export function initUIShell() {
  applyVersion();
  initPropsTabs();
  initBottomPanel();
  initTopbarActions();
  initGlobalShortcuts();

  // Wait for stage + layers to appear
  setTimeout(() => {
    initLayersObserver();
    initPageChangeListener();
    refreshLayersPanel();
  }, 500);
}

/* Expose to window for debugging */
if (typeof window !== 'undefined') {
  window.__UI_SHELL__ = {
    version: APP_VERSION,
    openPresent: openPresentMode,
    closePresent: closePresentMode,
    refreshLayers: refreshLayersPanel,
  };
}