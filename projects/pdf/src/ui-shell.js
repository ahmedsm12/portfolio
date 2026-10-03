/* ============================================================
 * ui-shell.js — الواجهة الجديدة
 * ============================================================
 *  لا يستورد أي شيء من الوحدات الأخرى — يعمل عبر DOM + dynamic import.
 *  مستقل تماماً — إن فشل جزء لا يكسر التطبيق الأساسي.
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
      const panel = root.querySelector('.props-panel[data-ppanel="' + key + '"]');
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

  function setExpanded(expanded) {
    panel.classList.toggle('collapsed', !expanded);
    document.body.classList.toggle('bp-expanded', expanded);
    if (toggle) toggle.textContent = expanded ? '▾' : '▴';
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const key = tab.dataset.btab;
      const wasActive = tab.classList.contains('active');
      const isCollapsed = panel.classList.contains('collapsed');

      if (wasActive && !isCollapsed) {
        setExpanded(false);
        return;
      }

      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));
      tab.classList.add('active');

      const content = panel.querySelector('.bp-content[data-bpanel="' + key + '"]');
      if (content) content.classList.add('active');

      setExpanded(true);
    });
  });

  if (toggle) {
    toggle.addEventListener('click', () => {
      const currentlyExpanded = !panel.classList.contains('collapsed');
      setExpanded(!currentlyExpanded);
    });
  }

  setExpanded(false);
}

/* ============================================================
   §5. LAYERS PANEL
   ============================================================ */
function getLayerIcon(type) {
  if (type === 'image') return '🖼';
  if (type === 'text') return 'T';
  if (type === 'equation') return '∑';
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

  const svg = document.getElementById('svgLayer');
  if (svg) {
    svg.querySelectorAll('[data-annot]').forEach(el => {
      if (el.tagName.toLowerCase() === 'g') return;
      const t = el.dataset.type || el.tagName.toLowerCase();
      items.push({
        el: el,
        kind: 'svg',
        type: t,
        name: t + ' ' + (el.dataset.id ? el.dataset.id.slice(-4) : '')
      });
    });
  }

  const txt = document.getElementById('textLayer');
  if (txt) {
    txt.querySelectorAll('.pdf-text-box').forEach((el, i) => {
      const isEq = el.dataset.isEquation === 'true';
      items.push({
        el: el,
        kind: 'text',
        type: isEq ? 'equation' : 'text',
        name: (isEq ? 'معادلة ' : 'نص ') + (i + 1)
      });
    });
  }

  const vid = document.getElementById('videoLayer');
  if (vid) {
    vid.querySelectorAll('.media-obj').forEach((el, i) => {
      items.push({
        el: el,
        kind: 'media',
        type: 'media',
        name: el.dataset.title || ('ميديا ' + (i + 1))
      });
    });
  }

  const emb = document.getElementById('embedLayer');
  if (emb) {
    emb.querySelectorAll('.embed').forEach((el, i) => {
      items.push({
        el: el,
        kind: 'embed',
        type: 'embed',
        name: 'تضمين: ' + (el.dataset.url || ('#' + (i + 1)))
      });
    });
  }

  const ib = document.getElementById('interactiveLayer');
  if (ib) {
    ib.querySelectorAll('.pdf-interactive-btn').forEach((el, i) => {
      items.push({
        el: el,
        kind: 'button',
        type: 'button',
        name: el.dataset.text || ('زر ' + (i + 1))
      });
    });
  }

  items.reverse();

  if (count) count.textContent = String(items.length);

  if (!items.length) {
    list.innerHTML = '<div class="bp-empty">لا توجد عناصر في هذه الشريحة</div>';
    return;
  }

  list.innerHTML = '';

  items.forEach(item => {
    const row = document.createElement('div');
    row.className = 'layer-row';

    const iconSpan = document.createElement('span');
    iconSpan.className = 'ly-icon';
    iconSpan.textContent = getLayerIcon(item.type);

    const nameSpan = document.createElement('span');
    nameSpan.className = 'ly-name';
    nameSpan.textContent = item.name;

    const visSpan = document.createElement('span');
    visSpan.className = 'ly-toggle on';
    visSpan.dataset.act = 'vis';
    visSpan.title = 'إظهار / إخفاء';
    visSpan.textContent = '👁';

    row.appendChild(iconSpan);
    row.appendChild(nameSpan);
    row.appendChild(visSpan);

    row.addEventListener('click', (e) => {
      if (e.target.dataset.act === 'vis') {
        const visible = e.target.classList.toggle('on');
        item.el.style.display = visible ? '' : 'none';
        return;
      }
      list.querySelectorAll('.layer-row').forEach(r => r.classList.remove('active'));
      row.classList.add('active');
      document.dispatchEvent(new CustomEvent('ipb:selectLayer', {
        detail: { el: item.el, kind: item.kind }
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

  if (btnUndo) {
    btnUndo.addEventListener('click', async () => {
      try {
        const core = await import('./core.js');
        core.undo();
        setSaveBadge('تم التراجع', false);
      } catch (e) { console.warn(e); }
    });
  }

  if (btnRedo) {
    btnRedo.addEventListener('click', async () => {
      try {
        const core = await import('./core.js');
        core.redo();
        setSaveBadge('تم الإعادة', false);
      } catch (e) { console.warn(e); }
    });
  }

  if (btnOpen) {
    btnOpen.addEventListener('click', () => {
      const input = document.getElementById('fileInput');
      if (input) input.click();
    });
  }

  if (btnSave) {
    btnSave.addEventListener('click', async () => {
      setSaveBadge('جارٍ الحفظ…', true);
      try {
        const storage = await import('./storage.js');
        await storage.saveProjectAsFile();
        setSaveBadge('محفوظ الآن', false);
      } catch (e) {
        setSaveBadge('فشل الحفظ', false);
      }
    });
  }

  if (btnPreview) {
    btnPreview.addEventListener('click', openPresentMode);
  }
  if (btnPresent) {
    btnPresent.addEventListener('click', openPresentMode);
  }
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
  document.body.classList.add('present-active');

  setPresentTool('select');
  updatePresentUndoRedo();
  resetPresentTimer();
  startPresentTimer();
  updatePresentPageNum();
  copyStageToPresent();
  bindPresentKeys();
  bindPresentToolbar();

  const bar = document.getElementById('presentToolbar');
  if (bar) {
    bar.classList.add('show');
    setTimeout(() => bar.classList.remove('show'), 2500);
  }

  document.addEventListener('ipb:pageChanged', onPresentPageChanged);
}

function closePresentMode() {
  if (!presentState.active) return;
  presentState.active = false;

  const overlay = document.getElementById('presentOverlay');
  if (overlay) overlay.classList.remove('active');
  document.body.classList.remove('present-active');

  stopPresentTimer();
  unbindPresentKeys();

  document.removeEventListener('ipb:pageChanged', onPresentPageChanged);

  presentState.undoStack = [];
  presentState.redoStack = [];
  updatePresentUndoRedo();
}

function onPresentPageChanged() {
  copyStageToPresent();
  updatePresentPageNum();
}

function copyStageToPresent() {
  const stage = document.getElementById('stage');
  const presentStage = document.getElementById('presentStage');
  const presentCanvas = document.getElementById('presentCanvas');
  const pdfCanvas = document.getElementById('pdfCanvas');
  const presentLayerHost = document.getElementById('presentLayerHost');
  const svgLayer = document.getElementById('svgLayer');

  if (!stage || !presentStage || !pdfCanvas || !presentCanvas) return;

  const stageRect = stage.getBoundingClientRect();
  const vw = window.innerWidth * 0.9;
  const vh = window.innerHeight * 0.9;
  const aspect = stageRect.width / stageRect.height;
  let w = vw;
  let h = w / aspect;
  if (h > vh) {
    h = vh;
    w = h * aspect;
  }

  presentStage.style.width = w + 'px';
  presentStage.style.height = h + 'px';

  presentCanvas.width = pdfCanvas.width;
  presentCanvas.height = pdfCanvas.height;
  const pctx = presentCanvas.getContext('2d');
  pctx.drawImage(pdfCanvas, 0, 0);

  if (presentLayerHost && svgLayer) {
    presentLayerHost.innerHTML = '';
    const clone = svgLayer.cloneNode(true);
    clone.setAttribute('width', '100%');
    clone.setAttribute('height', '100%');
    clone.style.width = '100%';
    clone.style.height = '100%';
    presentLayerHost.appendChild(clone);
  }

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
    detail: { tool: tool }
  }));
}

function bindPresentToolbar() {
  const bar = document.getElementById('presentToolbar');
  if (!bar) return;

  bar.querySelectorAll('[data-ptool]').forEach(btn => {
    btn.addEventListener('click', () => setPresentTool(btn.dataset.ptool));
  });

  const u = document.getElementById('presentUndo');
  const r = document.getElementById('presentRedo');
  const clr = document.getElementById('presentClear');
  const prev = document.getElementById('presentPrev');
  const next = document.getElementById('presentNext');
  const exit = document.getElementById('presentExit');

  if (u) u.addEventListener('click', presentUndo);
  if (r) r.addEventListener('click', presentRedo);
  if (clr) clr.addEventListener('click', presentClearAll);
  if (prev) prev.addEventListener('click', presentPrevPage);
  if (next) next.addEventListener('click', presentNextPage);
  if (exit) exit.addEventListener('click', closePresentMode);
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
  if (item.el && item.el.parentNode) item.el.style.display = 'none';
  updatePresentUndoRedo();
}

function presentRedo() {
  if (!presentState.redoStack.length) return;
  const item = presentState.redoStack.pop();
  presentState.undoStack.push(item);
  if (item.el && item.el.parentNode) item.el.style.display = '';
  updatePresentUndoRedo();
}

function presentClearAll() {
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
      if (e.shiftKey) presentRedo();
      else presentUndo();
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

/* ============================================================
   §8. EQUATION DIALOG — إغلاق عند النقر خارج المحرر
   ============================================================
   لا نعدّل interaction.js — فقط نراقب.
   عندما يُفتح المحرر (class .show)، نضيف مستمع للنقر على الخلفية.
   ============================================================ */
function initEquationDialogGuard() {
  const eq = document.getElementById('equationEditor');
  if (!eq) return;

  document.addEventListener('pointerdown', (e) => {
    if (!eq.classList.contains('show')) return;
    if (eq.contains(e.target)) return;

    /* إغلاق آمن — نستدعي closeEquationEditor من interaction.js */
    import('./interaction.js').then(mod => {
      if (mod.closeEquationEditor) mod.closeEquationEditor();
    }).catch(() => {
      /* fallback: نزيل الصنف مباشرة */
      eq.classList.remove('show');
    });
  }, true);
}

/* ============================================================
   §9. LAYERS OBSERVER
   ============================================================ */
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

function initPageChangeListener() {
  document.addEventListener('ipb:pageChanged', () => {
    setTimeout(refreshLayersPanel, 50);
  });
}

/* ============================================================
   §10. GLOBAL SHORTCUTS
   ============================================================ */
function initGlobalShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'F5') {
      e.preventDefault();
      if (presentState.active) closePresentMode();
      else openPresentMode();
    }
  });
}

/* ============================================================
   §11. INIT
   ============================================================ */
export function initUIShell() {
  applyVersion();
  initPropsTabs();
  initBottomPanel();
  initTopbarActions();
  initGlobalShortcuts();
  initEquationDialogGuard();

  setTimeout(() => {
    initLayersObserver();
    initPageChangeListener();
    refreshLayersPanel();
  }, 500);
}

/* Expose for debugging */
if (typeof window !== 'undefined') {
  window.__UI_SHELL__ = {
    version: APP_VERSION,
    openPresent: openPresentMode,
    closePresent: closePresentMode,
    refreshLayers: refreshLayersPanel,
  };
}