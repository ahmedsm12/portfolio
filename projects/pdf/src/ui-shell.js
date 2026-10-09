/* ============================================================
 * ui-shell.js — الواجهة الجديدة
 * ============================================================
 *  ★ لوحة أبعاد المشروع (تظهر فقط بدون تحديد)
 *  ★ لون الخلفية لكل شريحة
 *  ★ الطبقات مع Drag and Drop
 *  ★ إغلاق المشروع
 *  ★ وضع العرض
 *  ★ التحكم في إظهار وإخفاء الشريط الجانبي الأيمن والأيسر
 * ============================================================ */

export const APP_VERSION = '0.5.1';

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
    svg.querySelectorAll(':scope > .annot-wrapper').forEach(wrap => {
      const inner = wrap.querySelector('[data-annot]');
      if (!inner) return;
      const t = inner.dataset.type || inner.tagName.toLowerCase();
      items.push({
        el: wrap,
        kind: 'svg',
        type: t,
        name: t + ' ' + (inner.dataset.id ? inner.dataset.id.slice(-4) : ''),
        z: parseInt(wrap.style.zIndex || '0', 10),
        id: wrap.dataset.annotId,
      });
    });
  }

  const txt = document.getElementById('textLayer');
  if (txt) {
    txt.querySelectorAll('.pdf-text-box').forEach((el, i) => {
      const isEq = el.dataset.isEquation === 'true';
      items.push({
        el,
        kind: 'text',
        type: isEq ? 'equation' : 'text',
        name: (isEq ? 'معادلة ' : 'نص ') + (i + 1),
        z: parseInt(el.style.zIndex || '0', 10),
        id: el.dataset.textId,
      });
    });
  }

  const vid = document.getElementById('videoLayer');
  if (vid) {
    vid.querySelectorAll('.media-obj').forEach((el, i) => {
      items.push({
        el,
        kind: 'media',
        type: 'media',
        name: el.dataset.title || ('ميديا ' + (i + 1)),
        z: parseInt(el.style.zIndex || '0', 10),
        id: el.dataset.mediaId,
      });
    });
  }

  const emb = document.getElementById('embedLayer');
  if (emb) {
    emb.querySelectorAll('.embed').forEach((el, i) => {
      items.push({
        el,
        kind: 'embed',
        type: 'embed',
        name: 'تضمين: ' + (el.dataset.url || ('#' + (i + 1))),
        z: parseInt(el.style.zIndex || '0', 10),
        id: 'embed-' + i,
      });
    });
  }

  const ib = document.getElementById('interactiveLayer');
  if (ib) {
    ib.querySelectorAll('.pdf-interactive-btn').forEach((el, i) => {
      items.push({
        el,
        kind: 'button',
        type: 'button',
        name: el.dataset.text || ('زر ' + (i + 1)),
        z: parseInt(el.style.zIndex || '0', 10),
        id: el.dataset.btnId,
      });
    });
  }

  items.sort((a, b) => a.z - b.z);
  const displayItems = items.slice().reverse();

  if (count) count.textContent = String(items.length);

  if (!displayItems.length) {
    list.innerHTML = '<div class="bp-empty">لا توجد عناصر في هذه الشريحة</div>';
    return;
  }

  list.innerHTML = '';

  displayItems.forEach((item, displayIdx) => {
    const row = document.createElement('div');
    row.className = 'layer-row';
    row.draggable = true;
    row.dataset.zidx = String(item.z);
    row.dataset.id = item.id || '';

    const dragHandle = document.createElement('span');
    dragHandle.className = 'ly-drag-handle';
    dragHandle.textContent = '⋮⋮';
    dragHandle.title = 'اسحب لإعادة الترتيب';

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

    row.appendChild(dragHandle);
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
        detail: { el: item.el, kind: item.kind },
      }));
    });

    row.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', String(displayIdx));
      e.dataTransfer.effectAllowed = 'move';
      row.classList.add('dragging');
      list.classList.add('drag-active');
    });

    row.addEventListener('dragend', () => {
      row.classList.remove('dragging');
      list.classList.remove('drag-active');
      list.querySelectorAll('.layer-row').forEach(r =>
        r.classList.remove('drag-over-top', 'drag-over-bottom')
      );
    });

    row.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const rect = row.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      const isTop = e.clientY < mid;
      list.querySelectorAll('.layer-row').forEach(r => {
        r.classList.remove('drag-over-top', 'drag-over-bottom');
      });
      row.classList.add(isTop ? 'drag-over-top' : 'drag-over-bottom');
    });

    row.addEventListener('dragleave', () => {
      row.classList.remove('drag-over-top', 'drag-over-bottom');
    });

    row.addEventListener('drop', async (e) => {
      e.preventDefault();
      row.classList.remove('drag-over-top', 'drag-over-bottom');

      const fromDisplayIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
      if (isNaN(fromDisplayIdx) || fromDisplayIdx === displayIdx) return;

      const rect = row.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      const insertAbove = e.clientY < mid;

      try {
        const inter = await import('./interaction.js');
        const core = await import('./core.js');

        const reordered = [...displayItems];
        const [movedItem] = reordered.splice(fromDisplayIdx, 1);
        if (!movedItem) return;

        let insertIdx = displayIdx;
        if (fromDisplayIdx < displayIdx) {
          insertIdx = displayIdx - 1;
        }
        if (!insertAbove) {
          insertIdx += 1;
        }
        insertIdx = Math.max(0, Math.min(reordered.length, insertIdx));
        reordered.splice(insertIdx, 0, movedItem);

        // Convert top-to-bottom display order to bottom-to-top z-index order
        const ascendingItems = reordered.slice().reverse();

        const pre = core.snapshot();
        inter.assignZIndexesInOrder(ascendingItems);
        core.commitChange(pre);

        refreshLayersPanel();

        // تحديث المصغرات
        const pdf = await import('./pdf.js');
        if (pdf.captureStageThumbnail && core.state.currentPage) {
          pdf.captureStageThumbnail(core.state.currentPage).catch(() => {});
        }
      } catch (err) {
        console.warn('layer reorder drop error:', err);
      }
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
  if (btnPreview) btnPreview.addEventListener('click', openPresentMode);
  if (btnPresent) btnPresent.addEventListener('click', openPresentMode);
}

/* ============================================================
   §7. CLOSE PROJECT
   ============================================================ */
function initCloseProject() {
  const btn = document.getElementById('btnCloseProject');
  if (!btn) return;
  btn.addEventListener('click', showCloseDialog);

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'w') {
      e.preventDefault();
      showCloseDialog();
    }
  });
}

function showCloseDialog() {
  import('./core.js').then(core => {
    const state = core.state;
    const hasProject = state.slides && state.slides.length > 0 &&
                       (state.pdfDoc || state.pdfBlob || state.projectDims);

    if (!hasProject) {
      resetToEmptyState();
      return;
    }

    openConfirmDialog({
      title: 'إغلاق المشروع',
      message: 'هل تريد حفظ المشروع قبل الإغلاق؟',
      subtitle: state.pdfName || 'مشروع جديد',
      primaryLabel: '💾 حفظ وإغلاق',
      secondaryLabel: 'عدم الحفظ',
      cancelLabel: 'إلغاء',
      onPrimary: async () => {
        try {
          const storage = await import('./storage.js');
          await storage.saveProjectAsFile();
        } catch (e) {
          console.warn('save failed', e);
        }
        resetToEmptyState();
      },
      onSecondary: () => {
        resetToEmptyState();
      },
    });
  }).catch(err => console.error(err));
}

function openConfirmDialog(opts) {
  const backdrop = document.createElement('div');
  backdrop.className = 'ipb-confirm-backdrop';

  const dialog = document.createElement('div');
  dialog.className = 'ipb-confirm-dialog';

  dialog.innerHTML = `
    <div class="ipb-confirm-icon">⚠️</div>
    <h2 class="ipb-confirm-title"></h2>
    <p class="ipb-confirm-subtitle"></p>
    <p class="ipb-confirm-message"></p>
    <div class="ipb-confirm-actions">
      <button type="button" class="ipb-confirm-btn ipb-confirm-cancel"></button>
      <button type="button" class="ipb-confirm-btn ipb-confirm-secondary"></button>
      <button type="button" class="ipb-confirm-btn ipb-confirm-primary"></button>
    </div>
  `;

  dialog.querySelector('.ipb-confirm-title').textContent = opts.title || 'تأكيد';
  dialog.querySelector('.ipb-confirm-subtitle').textContent = opts.subtitle || '';
  dialog.querySelector('.ipb-confirm-message').textContent = opts.message || '';
  dialog.querySelector('.ipb-confirm-primary').textContent = opts.primaryLabel || 'حفظ';
  dialog.querySelector('.ipb-confirm-secondary').textContent = opts.secondaryLabel || 'عدم الحفظ';
  dialog.querySelector('.ipb-confirm-cancel').textContent = opts.cancelLabel || 'إلغاء';

  backdrop.appendChild(dialog);
  document.body.appendChild(backdrop);

  function close() {
    backdrop.classList.remove('show');
    setTimeout(() => backdrop.remove(), 180);
  }

  dialog.querySelector('.ipb-confirm-primary').addEventListener('click', () => {
    close();
    if (opts.onPrimary) opts.onPrimary();
  });
  dialog.querySelector('.ipb-confirm-secondary').addEventListener('click', () => {
    close();
    if (opts.onSecondary) opts.onSecondary();
  });
  dialog.querySelector('.ipb-confirm-cancel').addEventListener('click', () => {
    close();
    if (opts.onCancel) opts.onCancel();
  });

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });
  document.addEventListener('keydown', function onEsc(e) {
    if (e.key === 'Escape') {
      document.removeEventListener('keydown', onEsc);
      close();
    }
  });

  requestAnimationFrame(() => backdrop.classList.add('show'));
  setTimeout(() => {
    try { dialog.querySelector('.ipb-confirm-primary').focus(); } catch (_) {}
  }, 100);
}

/**
 * إعادة التطبيق إلى الحالة الفارغة — إعادة تعيين كاملة
 */
function resetToEmptyState() {
  import('./core.js').then(core => {
    const state = core.state;

    document.body.classList.remove('present-active');
    const presentOverlay = document.getElementById('presentOverlay');
    if (presentOverlay) presentOverlay.classList.remove('active');

    try {
      if (window.__UI_SHELL__ && typeof window.__UI_SHELL__.closePresent === 'function') {
        window.__UI_SHELL__.closePresent();
      }
    } catch (_) {}

    ['textContextToolbar', 'shapeContextToolbar', 'slideContextMenu', 'submenu'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.remove('show');
        if (id === 'textContextToolbar' || id === 'shapeContextToolbar') {
          el.innerHTML = '';
        }
      }
    });

    document.querySelectorAll('.element-delete-btn').forEach(el => {
      el.style.display = 'none';
    });

    try {
      if (window.__INTERACTION__ && typeof window.__INTERACTION__.deselect === 'function') {
        window.__INTERACTION__.deselect();
      }
    } catch (_) {}

    state.pdfDoc = null;
    state.pdfBlob = null;
    state.pdfName = '';
    state.pdfIsImage = false;
    state.slides = [];
    state.totalPages = 0;
    state.currentPage = 1;
    state.pages = {};
    state.history = {};
    state.selected = null;
    state.projectDims = null;
    state.pageCache.clear();
    state.thumbCache.clear();
    state.view = { scale: 1, tx: 0, ty: 0 };

    state.pdfW = 0;
    state.pdfH = 0;
    state.cssW = 0;
    state.cssH = 0;
    state.canvasScale = 1;
    state.dpr = 1;
    state.stageRect0 = { left: 0, top: 0, width: 0, height: 0 };

    ['svgLayer', 'embedLayer', 'videoLayer', 'textLayer', 'interactiveLayer'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = '';
    });

    const pdfCanvas = document.getElementById('pdfCanvas');
    if (pdfCanvas) {
      try {
        const ctx = pdfCanvas.getContext('2d');
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, pdfCanvas.width, pdfCanvas.height);
      } catch (_) {}
      pdfCanvas.width = 0;
      pdfCanvas.height = 0;
      pdfCanvas.style.width = '0';
      pdfCanvas.style.height = '0';
    }

    ['transientCanvas', 'laserCanvas'].forEach(id => {
      const c = document.getElementById(id);
      if (!c) return;
      try {
        const ctx = c.getContext('2d');
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, c.width, c.height);
      } catch (_) {}
      c.width = 0;
      c.height = 0;
      c.style.width = '0';
      c.style.height = '0';
    });

    const stageEl = document.getElementById('stage');
    if (stageEl) {
      stageEl.classList.add('empty');
      stageEl.style.cssText = '';
      stageEl.classList.add('empty');
      stageEl.style.width = '0';
      stageEl.style.height = '0';
      stageEl.style.transform = 'none';
      stageEl.style.background = 'transparent';
      stageEl.style.boxShadow = 'none';
      stageEl.style.borderRadius = '0';
      stageEl.dataset.tool = 'select';
    }

    const stageContent = document.getElementById('stageContent');
    if (stageContent) {
      stageContent.style.transform = 'none';
      stageContent.style.transition = 'none';
    }

    const loadingEl = document.getElementById('loading');
    if (loadingEl) loadingEl.classList.remove('show');

    const thumbsList = document.getElementById('thumbsList');
    if (thumbsList) {
      thumbsList.innerHTML = '<div class="thumbs-empty">لا توجد صفحات<br>افتح ملفاً للبدء</div>';
    }

    const pageIndicator = document.getElementById('pageIndicator');
    if (pageIndicator) pageIndicator.textContent = '';

    const btnPrev = document.getElementById('btnPrev');
    const btnNext = document.getElementById('btnNext');
    if (btnPrev) btnPrev.disabled = true;
    if (btnNext) btnNext.disabled = true;

    const emptyState = document.getElementById('emptyState');
    if (emptyState) {
      emptyState.style.display = 'flex';
      emptyState.style.backgroundColor = 'transparent';
      emptyState.style.backgroundImage = 'none';
    }

    setSaveBadge('لا مشروع', false);

    const docInfo = document.getElementById('documentInfoPanel');
    if (docInfo) docInfo.innerHTML = '';

    const propsHint = document.getElementById('elementPropsHint');
    if (propsHint) {
      propsHint.textContent = 'افتح مشروعاً أو أنشئ مشروعاً جديداً للبدء';
      propsHint.style.display = '';
    }

    refreshLayersPanel();

    try {
      if (core.updateCursorForTool) core.updateCursorForTool();
    } catch (_) {}

    /* إخفاء الشريطين الجانبيين عند الإغلاق */
    document.body.classList.remove('has-project');
    document.body.classList.add('no-project');

    document.dispatchEvent(new CustomEvent('ipb:projectClosed'));
    document.dispatchEvent(new CustomEvent('ipb:pageChanged', {
      detail: { page: 0 },
    }));
  }).catch(err => console.error('resetToEmptyState failed:', err));
}

/* ============================================================
   §8. PROPS PANEL TOGGLE
   ============================================================ */
function initPropsToggle() {
  let btn = document.getElementById('btnToggleProps');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'btnToggleProps';
    btn.className = 'props-toggle-btn';
    btn.title = 'إخفاء / إظهار لوحة الخصائص';
    document.body.appendChild(btn);
  }

  btn.addEventListener('click', () => {
    document.body.classList.toggle('props-hidden');
    setTimeout(() => window.dispatchEvent(new Event('resize')), 260);
  });

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === '.') {
      e.preventDefault();
      document.body.classList.toggle('props-hidden');
      setTimeout(() => window.dispatchEvent(new Event('resize')), 260);
    }
  });
}

/* ============================================================
   §9. PROJECT DIMS PANEL — يظهر فقط بدون تحديد
   ============================================================ */
function initProjectDimsPanel() {
  const infoPanel = document.getElementById('documentInfoPanel');
  if (!infoPanel) return;

  infoPanel.innerHTML = `
    <div class="prop-section">
      <div class="prop-title">📐 أبعاد المشروع</div>
      <div class="prop-row">
        <div class="prop-field">
          <label>العرض (px)</label>
          <input type="number" class="prop-input" id="projW"
                 min="100" max="20000" step="1" />
        </div>
        <div class="prop-field">
          <label>الارتفاع (px)</label>
          <input type="number" class="prop-input" id="projH"
                 min="100" max="20000" step="1" />
        </div>
      </div>
      <div class="prop-row" style="grid-template-columns:1fr 1fr 1fr;gap:4px;margin-top:6px">
        <button type="button" class="prop-input" data-preset="16:9" style="cursor:pointer;padding:6px 4px;font-size:11px">16:9</button>
        <button type="button" class="prop-input" data-preset="4:3" style="cursor:pointer;padding:6px 4px;font-size:11px">4:3</button>
        <button type="button" class="prop-input" data-preset="1:1" style="cursor:pointer;padding:6px 4px;font-size:11px">1:1</button>
        <button type="button" class="prop-input" data-preset="A4-P" style="cursor:pointer;padding:6px 4px;font-size:11px">A4 ↓</button>
        <button type="button" class="prop-input" data-preset="A4-L" style="cursor:pointer;padding:6px 4px;font-size:11px">A4 →</button>
        <button type="button" class="prop-input" data-preset="9:16" style="cursor:pointer;padding:6px 4px;font-size:11px">9:16</button>
      </div>
      <button type="button" class="prop-input" id="projApply"
        style="margin-top:10px;cursor:pointer;background:var(--sh-accent);color:#fff;border:none;font-weight:600;padding:8px;border-radius:8px">
        ✨ تطبيق الأبعاد على جميع الشرائح
      </button>
      <div id="projHint" style="font-size:10px;color:var(--sh-text-dim);margin-top:6px;text-align:center;line-height:1.5"></div>
    </div>

    <div class="prop-section">
      <div class="prop-title">🎨 خلفية الشريحة الحالية</div>
      <div class="prop-row" style="grid-template-columns:auto 1fr;gap:6px">
        <input type="color" class="prop-input" id="projBgColor" value="#ffffff"
               style="width:46px;height:32px;padding:2px;cursor:pointer">
        <button type="button" class="prop-input" id="projBgApply"
                style="cursor:pointer;font-weight:600;padding:6px">تطبيق اللون</button>
      </div>
      <div class="prop-row" style="grid-template-columns:1fr 1fr 1fr 1fr;gap:4px;margin-top:6px">
        <button type="button" class="prop-input" data-bgcolor="#ffffff" style="cursor:pointer;padding:6px 4px;background:#fff;color:#000;font-size:10.5px;border:1px solid #444">أبيض</button>
        <button type="button" class="prop-input" data-bgcolor="#000000" style="cursor:pointer;padding:6px 4px;background:#000;color:#fff;font-size:10.5px">أسود</button>
        <button type="button" class="prop-input" data-bgcolor="#f5f5dc" style="cursor:pointer;padding:6px 4px;background:#f5f5dc;color:#000;font-size:10.5px">بيج</button>
        <button type="button" class="prop-input" data-bgcolor="#eef2ff" style="cursor:pointer;padding:6px 4px;background:#eef2ff;color:#000;font-size:10.5px">فاتح</button>
      </div>
      <div id="projBgHint" style="font-size:10px;color:var(--sh-text-dim);margin-top:6px;text-align:center;line-height:1.5"></div>
    </div>
  `;

  const wInp = document.getElementById('projW');
  const hInp = document.getElementById('projH');
  const applyBtn = document.getElementById('projApply');
  const hint = document.getElementById('projHint');
  const bgColorInp = document.getElementById('projBgColor');
  const bgApplyBtn = document.getElementById('projBgApply');
  const bgHint = document.getElementById('projBgHint');

  async function refresh() {
    const core = await import('./core.js');
    const st = core.state;

    if (!st || !st.pdfW || !st.pdfH) {
      if (hint) hint.textContent = 'افتح مشروعاً أولاً لتعديل الأبعاد';
      if (wInp) { wInp.disabled = true; }
      if (hInp) { hInp.disabled = true; }
      if (applyBtn) { applyBtn.disabled = true; applyBtn.style.opacity = '0.5'; }
      if (bgColorInp) { bgColorInp.disabled = true; }
      if (bgApplyBtn) { bgApplyBtn.disabled = true; bgApplyBtn.style.opacity = '0.5'; }
      if (bgHint) bgHint.textContent = 'لا توجد شريحة نشطة';
      return;
    }

    if (wInp) wInp.disabled = false;
    if (hInp) hInp.disabled = false;
    if (applyBtn) { applyBtn.disabled = false; applyBtn.style.opacity = '1'; }

    const w = st.projectDims && st.projectDims.width
      ? st.projectDims.width
      : Math.round(st.pdfW);
    const h = st.projectDims && st.projectDims.height
      ? st.projectDims.height
      : Math.round(st.pdfH);
    if (wInp && document.activeElement !== wInp) wInp.value = w;
    if (hInp && document.activeElement !== hInp) hInp.value = h;
    if (hint) hint.textContent = `النسبة: ${(w / h).toFixed(3)} : 1`;

    const slide = st.slides[st.currentPage - 1];
    if (slide && slide.bg) {
      if (slide.bg.type === 'blank') {
        if (bgColorInp) bgColorInp.disabled = false;
        if (bgApplyBtn) { bgApplyBtn.disabled = false; bgApplyBtn.style.opacity = '1'; }
        const c = slide.bg.color
          || (st.projectDims && st.projectDims.bg)
          || '#ffffff';
        if (bgColorInp && document.activeElement !== bgColorInp) bgColorInp.value = c;
        if (bgHint) bgHint.textContent = 'شريحة فارغة — يمكنك تغيير لونها';
      } else {
        if (bgColorInp) bgColorInp.disabled = true;
        if (bgApplyBtn) { bgApplyBtn.disabled = true; bgApplyBtn.style.opacity = '0.5'; }
        if (bgHint) bgHint.textContent = 'شريحة PDF — الخلفية ثابتة';
      }
    }
  }

  refresh();
  document.addEventListener('ipb:pageChanged', () => setTimeout(refresh, 80));
  document.addEventListener('ipb:projectCreated', () => setTimeout(refresh, 80));
  document.addEventListener('ipb:projectClosed', () => setTimeout(refresh, 80));

  infoPanel.querySelectorAll('[data-preset]').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = btn.dataset.preset;
      let w = 2000, h = 1125;
      if (p === '16:9') { w = 2000; h = 1125; }
      if (p === '4:3') { w = 2000; h = 1500; }
      if (p === '1:1') { w = 2000; h = 2000; }
      if (p === 'A4-P') { w = 1414; h = 2000; }
      if (p === 'A4-L') { w = 2000; h = 1414; }
      if (p === '9:16') { w = 1125; h = 2000; }
      if (wInp) wInp.value = w;
      if (hInp) hInp.value = h;
    });
  });

  if (applyBtn) {
    applyBtn.addEventListener('click', async () => {
      const w = parseInt(wInp.value, 10);
      const h = parseInt(hInp.value, 10);
      if (!w || !h) { alert('الرجاء إدخال أبعاد صالحة'); return; }
      if (w < 100 || h < 100) { alert('الأبعاد صغيرة جداً (الحد الأدنى 100px)'); return; }
      if (w > 20000 || h > 20000) { alert('الأبعاد كبيرة جداً (الحد الأقصى 20000px)'); return; }

      try {
        const core = await import('./core.js');
        const pdf = await import('./pdf.js');
        const st = core.state;
        const oldW = st.pdfW || 2000;
        const oldH = st.pdfH || 1414;
        const scaleX = w / oldW;
        const scaleY = h / oldH;

        Object.keys(st.pages).forEach(pageNum => {
          const pg = st.pages[pageNum];
          if (!pg) return;

          (pg.annotations || []).forEach(spec => {
            const a = spec.attrs || {};
            ['x', 'y', 'cx', 'cy', 'x1', 'y1', 'x2', 'y2', 'width', 'height', 'rx', 'ry'].forEach(k => {
              if (a[k] !== undefined) {
                const fx = (k === 'x' || k === 'width' || k === 'cx'
                  || k === 'x1' || k === 'x2' || k === 'rx') ? scaleX : scaleY;
                a[k] = parseFloat(a[k]) * fx;
              }
            });
            if (a.transform) {
              const m = a.transform.match(/translate\(\s*(-?[\d.]+)[ ,]+(-?[\d.]+)\s*\)/);
              if (m) a.transform = `translate(${parseFloat(m[1]) * scaleX}, ${parseFloat(m[2]) * scaleY})`;
            }
            if (a['stroke-width']) {
              a['stroke-width'] = parseFloat(a['stroke-width']) * ((scaleX + scaleY) / 2);
            }
          });

          ['texts', 'buttons', 'embeds', 'media', 'videos'].forEach(key => {
            (pg[key] || []).forEach(spec => {
              if (spec.x && typeof spec.x === 'string' && !spec.x.endsWith('%')) {
                spec.x = (parseFloat(spec.x) * scaleX) + 'px';
              }
              if (spec.y && typeof spec.y === 'string' && !spec.y.endsWith('%')) {
                spec.y = (parseFloat(spec.y) * scaleY) + 'px';
              }
              if (spec.w && typeof spec.w === 'string' && spec.w.endsWith('px')) {
                spec.w = (parseFloat(spec.w) * scaleX) + 'px';
              }
              if (spec.h && typeof spec.h === 'string' && spec.h.endsWith('px')) {
                spec.h = (parseFloat(spec.h) * scaleY) + 'px';
              }
            });
          });
        });

        st.projectDims = st.projectDims || {};
        st.projectDims.width = w;
        st.projectDims.height = h;

        st.pageCache.clear();
        st.thumbCache.clear();
        st.history = {};

        await pdf.renderPage(st.currentPage);
        pdf.renderThumbnails();

        if (hint) hint.textContent = `✓ تم التطبيق — ${w} × ${h}`;
        setTimeout(refresh, 1500);
      } catch (e) {
        console.error(e);
        alert('تعذّر التطبيق: ' + e.message);
      }
    });
  }

  async function applyBg(color) {
    try {
      const core = await import('./core.js');
      const pdf = await import('./pdf.js');
      const st = core.state;
      if (!st.currentPage || st.currentPage < 1 || st.currentPage > st.totalPages) return;
      const slide = st.slides[st.currentPage - 1];
      if (!slide) return;
      if (slide.bg.type !== 'blank') {
        if (core.toast) core.toast('لا يمكن تغيير خلفية شريحة PDF', 'warn');
        return;
      }
      slide.bg.color = color;
      st.pageCache.delete(st.currentPage);
      st.thumbCache.delete(st.currentPage);
      await pdf.renderPage(st.currentPage);
      pdf.renderThumbnails();
      if (bgHint) bgHint.textContent = '✓ تم تطبيق اللون';
      setTimeout(refresh, 1200);
    } catch (e) {
      console.error(e);
    }
  }

  if (bgApplyBtn && bgColorInp) {
    bgApplyBtn.addEventListener('click', () => applyBg(bgColorInp.value));
  }
  infoPanel.querySelectorAll('[data-bgcolor]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (bgColorInp) bgColorInp.value = btn.dataset.bgcolor;
      applyBg(btn.dataset.bgcolor);
    });
  });

  function updateVisibility() {
    const panel = document.getElementById('selectedElementPropsPanel');
    const hasSel = document.querySelectorAll('#stageContent .selected').length > 0;
    if (hasSel) {
      infoPanel.style.display = 'none';
      if (panel) panel.style.display = 'block';
    } else {
      infoPanel.style.display = 'block';
      if (panel) panel.style.display = 'none';
    }
  }
  updateVisibility();

  const stageContent = document.getElementById('stageContent');
  if (stageContent) {
    const obs = new MutationObserver(updateVisibility);
    obs.observe(stageContent, {
      attributes: true,
      attributeFilter: ['class'],
      subtree: true,
    });
  }
}

/* ============================================================
   §9B. ELEMENT DESIGN PROPERTIES — خصائص التصميم (الموضع والحجم والترتيب)
   ============================================================ */
function initElementDesignProps() {
  const panel = document.getElementById('selectedElementPropsPanel');
  const infoPanel = document.getElementById('documentInfoPanel');
  if (!panel) return;

  panel.innerHTML = `
    <div class="prop-section">
      <div class="prop-title">📐 الموضع والحجم</div>
      <div class="prop-row">
        <div class="prop-field">
          <label>الموضع الأفقي X (px)</label>
          <input type="number" class="prop-input" id="elemPropX" step="1" />
        </div>
        <div class="prop-field">
          <label>الموضع الرأسي Y (px)</label>
          <input type="number" class="prop-input" id="elemPropY" step="1" />
        </div>
      </div>
      <div class="prop-row">
        <div class="prop-field">
          <label>العرض W (px)</label>
          <input type="number" class="prop-input" id="elemPropW" min="1" step="1" />
        </div>
        <div class="prop-field">
          <label>الارتفاع H (px)</label>
          <input type="number" class="prop-input" id="elemPropH" min="1" step="1" />
        </div>
      </div>
    </div>

    <div class="prop-section">
      <div class="prop-title">🗂 ترتيب الطبقة</div>
      <div class="prop-row" style="grid-template-columns:1fr 1fr;gap:4px">
        <button type="button" class="prop-input" id="elemFrontBtn" style="cursor:pointer;font-size:11px;font-weight:600">⏫ إلى المقدمة</button>
        <button type="button" class="prop-input" id="elemBackBtn" style="cursor:pointer;font-size:11px;font-weight:600">⏬ إلى الخلف</button>
        <button type="button" class="prop-input" id="elemFwdBtn" style="cursor:pointer;font-size:11px;font-weight:600">▲ تقديم خطوة</button>
        <button type="button" class="prop-input" id="elemBwdBtn" style="cursor:pointer;font-size:11px;font-weight:600">▼ تأخير خطوة</button>
      </div>
    </div>

    <div class="prop-section">
      <div class="prop-title">👁 الشفافية</div>
      <div class="prop-row" style="grid-template-columns:1fr auto;align-items:center;gap:8px">
        <input type="range" id="elemOpacitySlider" min="5" max="100" value="100" style="width:100%;accent-color:var(--sh-accent);cursor:pointer">
        <span id="elemOpacityVal" style="font-size:11.5px;font-variant-numeric:tabular-nums;min-width:36px;text-align:center">100%</span>
      </div>
    </div>
  `;

  const inpX = document.getElementById('elemPropX');
  const inpY = document.getElementById('elemPropY');
  const inpW = document.getElementById('elemPropW');
  const inpH = document.getElementById('elemPropH');
  const opSlider = document.getElementById('elemOpacitySlider');
  const opVal = document.getElementById('elemOpacityVal');

  const btnFront = document.getElementById('elemFrontBtn');
  const btnBack = document.getElementById('elemBackBtn');
  const btnFwd = document.getElementById('elemFwdBtn');
  const btnBwd = document.getElementById('elemBwdBtn');

  async function getSelected() {
    const core = await import('./core.js');
    return core.state.selected;
  }

  async function syncInputsFromSelection() {
    const sel = await getSelected();
    if (!sel || !sel.el) {
      panel.style.display = 'none';
      if (infoPanel) infoPanel.style.display = 'block';
      return;
    }

    panel.style.display = 'block';
    if (infoPanel) infoPanel.style.display = 'none';

    let x = 0, y = 0, w = 0, h = 0, opacity = 1;

    if (sel.kind === 'svg') {
      const inner = sel.el.querySelector('[data-annot]') || sel.el;
      const tag = inner.tagName.toLowerCase();
      if (tag === 'rect') {
        x = parseFloat(inner.getAttribute('x')) || 0;
        y = parseFloat(inner.getAttribute('y')) || 0;
        w = parseFloat(inner.getAttribute('width')) || 0;
        h = parseFloat(inner.getAttribute('height')) || 0;
      } else if (tag === 'circle' || tag === 'ellipse') {
        const cx = parseFloat(inner.getAttribute('cx')) || 0;
        const cy = parseFloat(inner.getAttribute('cy')) || 0;
        const rx = parseFloat(inner.getAttribute('rx') || inner.getAttribute('r')) || 0;
        const ry = parseFloat(inner.getAttribute('ry') || inner.getAttribute('r')) || 0;
        x = cx - rx;
        y = cy - ry;
        w = rx * 2;
        h = ry * 2;
      } else if (tag === 'line') {
        const x1 = parseFloat(inner.getAttribute('x1')) || 0;
        const y1 = parseFloat(inner.getAttribute('y1')) || 0;
        const x2 = parseFloat(inner.getAttribute('x2')) || 0;
        const y2 = parseFloat(inner.getAttribute('y2')) || 0;
        x = Math.min(x1, x2);
        y = Math.min(y1, y2);
        w = Math.abs(x2 - x1);
        h = Math.abs(y2 - y1);
      } else {
        try {
          const b = inner.getBBox();
          const t = inner.getAttribute('transform') || '';
          const m = t.match(/translate\(\s*(-?[\d.]+)[ ,]+(-?[\d.]+)\s*\)/);
          const tx = m ? parseFloat(m[1]) : 0;
          const ty = m ? parseFloat(m[2]) : 0;
          x = b.x + tx;
          y = b.y + ty;
          w = b.width;
          h = b.height;
        } catch (_) {}
      }
      opacity = parseFloat(inner.getAttribute('opacity') || sel.el.style.opacity || '1');
    } else {
      const el = sel.el;
      x = parseFloat(el.style.left) || el.offsetLeft || 0;
      y = parseFloat(el.style.top) || el.offsetTop || 0;
      w = parseFloat(el.style.width) || el.offsetWidth || 0;
      h = parseFloat(el.style.height) || el.offsetHeight || 0;
      opacity = parseFloat(el.style.opacity || '1');
    }

    x = Math.round(x);
    y = Math.round(y);
    w = Math.round(w);
    h = Math.round(h);
    const opPct = Math.round(opacity * 100);

    if (inpX && document.activeElement !== inpX) inpX.value = x;
    if (inpY && document.activeElement !== inpY) inpY.value = y;
    if (inpW && document.activeElement !== inpW) inpW.value = w;
    if (inpH && document.activeElement !== inpH) inpH.value = h;
    if (opSlider && document.activeElement !== opSlider) opSlider.value = opPct;
    if (opVal) opVal.textContent = opPct + '%';
  }

  async function applyGeometryChange() {
    const sel = await getSelected();
    if (!sel || !sel.el) return;

    const core = await import('./core.js');
    const inter = await import('./interaction.js');
    const pre = core.snapshot();

    const newX = parseFloat(inpX.value) || 0;
    const newY = parseFloat(inpY.value) || 0;
    const newW = Math.max(2, parseFloat(inpW.value) || 10);
    const newH = Math.max(2, parseFloat(inpH.value) || 10);

    if (sel.kind === 'svg') {
      const inner = sel.el.querySelector('[data-annot]') || sel.el;
      const tag = inner.tagName.toLowerCase();
      if (tag === 'rect') {
        inner.setAttribute('x', newX);
        inner.setAttribute('y', newY);
        inner.setAttribute('width', newW);
        inner.setAttribute('height', newH);
      } else if (tag === 'circle' || tag === 'ellipse') {
        inner.setAttribute('cx', newX + newW / 2);
        inner.setAttribute('cy', newY + newH / 2);
        inner.setAttribute('rx', newW / 2);
        inner.setAttribute('ry', newH / 2);
      } else if (tag === 'line') {
        inner.setAttribute('x1', newX);
        inner.setAttribute('y1', newY);
        inner.setAttribute('x2', newX + newW);
        inner.setAttribute('y2', newY + newH);
      } else {
        try {
          const b = inner.getBBox();
          inner.setAttribute('transform', `translate(${newX - b.x}, ${newY - b.y})`);
        } catch (_) {}
      }
      inter.drawSelectionOverlay(inner);
      inter.updateFloatingToolbarPosition();
    } else {
      sel.el.style.left = newX + 'px';
      sel.el.style.top = newY + 'px';
      sel.el.style.width = newW + 'px';
      sel.el.style.height = newH + 'px';
    }

    core.commitChange(pre);
  }

  [inpX, inpY, inpW, inpH].forEach(inp => {
    if (inp) {
      inp.addEventListener('change', applyGeometryChange);
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          inp.blur();
          applyGeometryChange();
        }
      });
    }
  });

  if (opSlider) {
    opSlider.addEventListener('input', async () => {
      const sel = await getSelected();
      if (!sel || !sel.el) return;
      const val = parseInt(opSlider.value, 10);
      if (opVal) opVal.textContent = val + '%';
      const op = val / 100;
      if (sel.kind === 'svg') {
        const inner = sel.el.querySelector('[data-annot]') || sel.el;
        inner.setAttribute('opacity', op);
        sel.el.style.opacity = op;
      } else {
        sel.el.style.opacity = op;
      }
    });
    opSlider.addEventListener('change', async () => {
      const core = await import('./core.js');
      core.commitChange();
    });
  }

  async function handleLayerAction(action) {
    const sel = await getSelected();
    if (!sel || !sel.el) return;
    const inter = await import('./interaction.js');
    const core = await import('./core.js');
    const pre = core.snapshot();
    const target = sel.el;
    if (action === 'front') inter.bringToFront(target);
    else if (action === 'back') inter.sendToBack(target);
    else if (action === 'fwd') inter.bringForward(target);
    else if (action === 'bwd') inter.sendBackward(target);
    core.commitChange(pre);
    refreshLayersPanel();
  }

  if (btnFront) btnFront.addEventListener('click', () => handleLayerAction('front'));
  if (btnBack) btnBack.addEventListener('click', () => handleLayerAction('back'));
  if (btnFwd) btnFwd.addEventListener('click', () => handleLayerAction('fwd'));
  if (btnBwd) btnBwd.addEventListener('click', () => handleLayerAction('bwd'));

  document.addEventListener('ipb:selectionChanged', syncInputsFromSelection);
  document.addEventListener('ipb:elementTransformed', syncInputsFromSelection);
  document.addEventListener('ipb:pageChanged', syncInputsFromSelection);

  syncInputsFromSelection();
}

/* ============================================================
   §9C. CANVAS CONTROLS (من ui.html)
   ============================================================ */
function initCanvasControls() {
  const zoomIn = document.getElementById('ctrlZoomIn');
  const zoomOut = document.getElementById('ctrlZoomOut');
  const zoomVal = document.getElementById('ctrlZoomVal');
  const fitBtn = document.getElementById('ctrlFit');
  const actualBtn = document.getElementById('ctrlActual');
  const gridBtn = document.getElementById('ctrlGrid');
  const presentBtn = document.getElementById('ctrlPresent');
  const gridOverlay = document.getElementById('canvasGridOverlay');

  async function updateZoomDisplay() {
    const core = await import('./core.js');
    if (!zoomVal || !core.state || !core.state.view) return;
    const pct = Math.round((core.state.view.scale || 1) * 100);
    zoomVal.textContent = pct + '%';
  }

  if (zoomIn) {
    zoomIn.addEventListener('click', async () => {
      const core = await import('./core.js');
      const pdf = await import('./pdf.js');
      core.state.view.scale = Math.min(5, Math.round((core.state.view.scale + 0.1) * 10) / 10);
      pdf.applyView();
      updateZoomDisplay();
    });
  }

  if (zoomOut) {
    zoomOut.addEventListener('click', async () => {
      const core = await import('./core.js');
      const pdf = await import('./pdf.js');
      core.state.view.scale = Math.max(0.2, Math.round((core.state.view.scale - 0.1) * 10) / 10);
      pdf.applyView();
      updateZoomDisplay();
    });
  }

  if (actualBtn) {
    actualBtn.addEventListener('click', async () => {
      const core = await import('./core.js');
      const pdf = await import('./pdf.js');
      core.state.view.scale = 1;
      core.state.view.tx = 0;
      core.state.view.ty = 0;
      pdf.applyView();
      updateZoomDisplay();
    });
  }

  if (fitBtn) {
    fitBtn.addEventListener('click', async () => {
      const core = await import('./core.js');
      const pdf = await import('./pdf.js');
      const wrapper = document.getElementById('stageWrapper');
      if (!wrapper || !core.state.cssW || !core.state.cssH) return;
      const wrapRect = wrapper.getBoundingClientRect();
      const availW = wrapRect.width - 60;
      const availH = wrapRect.height - 60;
      if (availW <= 0 || availH <= 0) return;
      const scale = Math.min(availW / core.state.cssW, availH / core.state.cssH);
      core.state.view.scale = Math.min(3, Math.max(0.2, Math.round(scale * 100) / 100));
      core.state.view.tx = 0;
      core.state.view.ty = 0;
      pdf.applyView();
      updateZoomDisplay();
    });
  }

  if (gridBtn) {
    gridBtn.addEventListener('click', () => {
      if (!gridOverlay) return;
      const isVisible = gridOverlay.style.display !== 'none';
      gridOverlay.style.display = isVisible ? 'none' : 'block';
      gridBtn.classList.toggle('active', !isVisible);
    });
  }

  if (presentBtn) {
    presentBtn.addEventListener('click', () => {
      openPresentMode();
    });
  }

  window.addEventListener('resize', updateZoomDisplay);
  document.addEventListener('ipb:pageChanged', () => setTimeout(updateZoomDisplay, 80));
  document.addEventListener('ipb:viewChanged', updateZoomDisplay);
  updateZoomDisplay();
}

/* ============================================================
   §9D. TOOLBAR TOGGLE
   ============================================================ */
function initToolbarToggle() {
  const toggleBtn = document.getElementById('btnToggleToolbar');
  const showBtn = document.getElementById('btnShowToolbar');

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      document.body.classList.add('tools-hidden');
    });
  }

  if (showBtn) {
    showBtn.addEventListener('click', () => {
      document.body.classList.remove('tools-hidden');
    });
  }
}

/* ============================================================
   §10. EQUATION DIALOG
   ============================================================ */
function setupEquationBackdropMirror() {
  let backdrop = document.getElementById('equationBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'equationBackdrop';
    document.body.appendChild(backdrop);
  }

  const editor = document.getElementById('equationEditor');
  if (!editor) return;

  if (!editor._uiShieldWired) {
    editor._uiShieldWired = true;
    const shieldEvents = [
      'pointerdown', 'pointerup', 'pointermove',
      'mousedown', 'mouseup', 'mousemove',
      'click', 'dblclick',
      'touchstart', 'touchend', 'touchmove',
      'keydown', 'keyup', 'keypress',
      'wheel', 'contextmenu',
    ];
    shieldEvents.forEach(evt => {
      editor.addEventListener(evt, (e) => { e.stopPropagation(); }, false);
    });
  }

  if (!backdrop._uiShieldWired) {
    backdrop._uiShieldWired = true;
    ['pointerdown', 'click', 'mousedown', 'mouseup'].forEach(evt => {
      backdrop.addEventListener(evt, (e) => {
        e.stopPropagation();
        if (e.target === backdrop) hideBoth();
      }, false);
    });
  }

  function hideBoth() {
    editor.classList.remove('show');
    backdrop.classList.remove('show');
    backdrop.style.display = 'none';
  }

  function syncFromBackdrop() {
    const shown = backdrop.classList.contains('show');
    if (shown) {
      backdrop.style.display = 'block';
      editor.classList.add('show');
      ensureEquationPalette(editor);
      ensureEquationTabs(editor);
      const ta = document.getElementById('eqTextarea');
      if (ta) setTimeout(() => { try { ta.focus(); } catch (_) {} }, 100);
    } else {
      backdrop.style.display = 'none';
      editor.classList.remove('show');
    }
  }

  const obs = new MutationObserver(syncFromBackdrop);
  obs.observe(backdrop, { attributes: true, attributeFilter: ['class'] });
  backdrop.style.display = backdrop.classList.contains('show') ? 'block' : 'none';

  const closeBtn = document.getElementById('eqCloseBtn');
  const cancelBtn = document.getElementById('eqCancelBtn');
  if (closeBtn && !closeBtn._uiWired) {
    closeBtn._uiWired = true;
    closeBtn.addEventListener('click', (e) => { e.stopPropagation(); hideBoth(); });
  }
  if (cancelBtn && !cancelBtn._uiWired) {
    cancelBtn._uiWired = true;
    cancelBtn.addEventListener('click', (e) => { e.stopPropagation(); hideBoth(); });
  }

  if (!editor._uiEscapeWired) {
    editor._uiEscapeWired = true;
    editor.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); hideBoth(); }
    });
  }

  const eqBtn = document.querySelector('#toolbar button[data-tool="equation"]');
  if (eqBtn && !eqBtn._uiMirrorWired) {
    eqBtn._uiMirrorWired = true;
    eqBtn.addEventListener('click', () => {
      setTimeout(() => {
        if (editor.classList.contains('show')) {
          ensureEquationTabs(editor);
          return;
        }
        backdrop.classList.add('show');
        backdrop.style.display = 'block';
        editor.classList.add('show');
        ensureEquationPalette(editor);
        ensureEquationTabs(editor);
        const ta = document.getElementById('eqTextarea');
        if (ta) setTimeout(() => { try { ta.focus(); } catch (_) {} }, 80);
      }, 250);
    }, true);
  }
}

function ensureEquationTabs(editor) {
  const host = editor.querySelector('#eqPaletteHost');
  if (!host) return;
  const existingTabs = host.parentElement.querySelector('.eq-cat-tabs');
  if (existingTabs) {
    if (!host.querySelector('.eq-grid.active')) {
      const firstGrid = host.querySelector('.eq-grid');
      if (firstGrid) firstGrid.classList.add('active');
    }
    return;
  }

  const sections = [];
  let currentCat = null;
  Array.from(host.children).forEach(child => {
    if (child.classList.contains('eq-section-label')) {
      currentCat = { label: child.textContent.trim() };
      sections.push(currentCat);
    }
  });
  if (sections.length < 2) return;

  const tabsBar = document.createElement('div');
  tabsBar.className = 'eq-cat-tabs';

  const allBtn = document.createElement('button');
  allBtn.type = 'button';
  allBtn.className = 'eq-cat-tab';
  allBtn.textContent = '★ الكل';
  allBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    tabsBar.querySelectorAll('.eq-cat-tab').forEach(b => b.classList.remove('active'));
    allBtn.classList.add('active');
    host.querySelectorAll('.eq-grid').forEach(g => g.classList.add('active'));
  });
  tabsBar.appendChild(allBtn);

  sections.forEach((sec, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'eq-cat-tab' + (i === 0 ? ' active' : '');
    btn.textContent = sec.label;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      tabsBar.querySelectorAll('.eq-cat-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const grids = host.querySelectorAll('.eq-grid');
      grids.forEach((g, j) => g.classList.toggle('active', j === i));
    });
    tabsBar.appendChild(btn);
  });

  host.parentElement.insertBefore(tabsBar, host);
  host.querySelectorAll('.eq-grid').forEach((g, i) => g.classList.toggle('active', i === 0));
}

function ensureEquationPalette(editor) {
  const host = editor.querySelector('#eqPaletteHost');
  if (!host) return;
  if (host.children.length > 0) return;

  import('./interaction.js').then(mod => {
    if (mod.buildEquationPaletteInto) {
      try { mod.buildEquationPaletteInto(host); } catch (_) {}
    }
    if (!host.children.length) buildFallbackPalette(host);
    ensureEquationTabs(editor);
  }).catch(() => {
    if (!host.children.length) buildFallbackPalette(host);
    ensureEquationTabs(editor);
  });
}

function buildFallbackPalette(host) {
  const TEMPLATES = [
    { cat: 'الكسور والجذور', items: [
      { label: 'a/b', latex: '\\frac{a}{b}' },
      { label: '√',   latex: '\\sqrt{x}' },
      { label: 'ⁿ√',  latex: '\\sqrt[n]{x}' },
      { label: 'x/y', latex: '\\frac{x}{y}' },
      { label: '¹⁄₂', latex: '\\frac{1}{2}' },
      { label: 'a+b/c', latex: '\\frac{a+b}{c}' },
    ]},
    { cat: 'الأسس', items: [
      { label: 'x²', latex: 'x^{2}' },
      { label: 'xₙ', latex: 'x_{n}' },
      { label: 'xⁿ', latex: 'x^{n}' },
      { label: 'xₐᵦ', latex: 'x_{a}^{b}' },
      { label: 'eˣ', latex: 'e^{x}' },
      { label: 'a⁺ᵇ', latex: 'a^{n+1}' },
    ]},
    { cat: 'المجاميع والتكاملات', items: [
      { label: '∑',   latex: '\\sum_{i=1}^{n}' },
      { label: '∏',   latex: '\\prod_{i=1}^{n}' },
      { label: '∫',   latex: '\\int_{a}^{b}' },
      { label: '∬',   latex: '\\iint' },
      { label: '∮',   latex: '\\oint' },
      { label: 'lim', latex: '\\lim_{x \\to \\infty}' },
      { label: 'd/dx', latex: '\\frac{d}{dx}' },
      { label: '∂/∂x', latex: '\\frac{\\partial}{\\partial x}' },
      { label: '∞',   latex: '\\infty' },
    ]},
    { cat: 'حروف يونانية', items: [
      { label: 'α', latex: '\\alpha' }, { label: 'β', latex: '\\beta' }, { label: 'γ', latex: '\\gamma' },
      { label: 'δ', latex: '\\delta' }, { label: 'ε', latex: '\\epsilon' }, { label: 'θ', latex: '\\theta' },
      { label: 'λ', latex: '\\lambda' }, { label: 'μ', latex: '\\mu' }, { label: 'π', latex: '\\pi' },
      { label: 'ρ', latex: '\\rho' }, { label: 'σ', latex: '\\sigma' }, { label: 'τ', latex: '\\tau' },
      { label: 'φ', latex: '\\phi' }, { label: 'χ', latex: '\\chi' }, { label: 'ψ', latex: '\\psi' },
      { label: 'ω', latex: '\\omega' }, { label: 'Δ', latex: '\\Delta' }, { label: 'Σ', latex: '\\Sigma' },
    ]},
    { cat: 'العلاقات والعمليات', items: [
      { label: '≠',  latex: '\\neq' }, { label: '≤', latex: '\\leq' }, { label: '≥', latex: '\\geq' },
      { label: '≈',  latex: '\\approx' }, { label: '≡', latex: '\\equiv' }, { label: '∝', latex: '\\propto' },
      { label: '±',  latex: '\\pm' }, { label: '×', latex: '\\times' }, { label: '÷', latex: '\\div' },
      { label: '·',  latex: '\\cdot' }, { label: '→', latex: '\\to' }, { label: '⇒', latex: '\\Rightarrow' },
      { label: '⇔',  latex: '\\Leftrightarrow' }, { label: '∈', latex: '\\in' }, { label: '∉', latex: '\\notin' },
      { label: '⊂',  latex: '\\subset' }, { label: '∪', latex: '\\cup' }, { label: '∩', latex: '\\cap' },
      { label: '∀',  latex: '\\forall' }, { label: '∃', latex: '\\exists' },
    ]},
    { cat: 'الدوال', items: [
      { label: 'sin',  latex: '\\sin' }, { label: 'cos', latex: '\\cos' }, { label: 'tan', latex: '\\tan' },
      { label: 'cot',  latex: '\\cot' }, { label: 'sec', latex: '\\sec' }, { label: 'csc', latex: '\\csc' },
      { label: 'log',  latex: '\\log' }, { label: 'ln',  latex: '\\ln' },  { label: 'exp', latex: '\\exp' },
      { label: 'sin⁻¹', latex: '\\arcsin' }, { label: 'cos⁻¹', latex: '\\arccos' }, { label: 'tan⁻¹', latex: '\\arctan' },
    ]},
    { cat: 'مصفوفات', items: [
      { label: 'matrix 2×2', latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}' },
      { label: 'matrix 3×3', latex: '\\begin{pmatrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{pmatrix}' },
      { label: 'cases',      latex: '\\begin{cases} a \\\\ b \\end{cases}' },
      { label: 'vec',        latex: '\\vec{v}' },
      { label: 'hat',        latex: '\\hat{x}' },
      { label: 'bar',        latex: '\\bar{x}' },
      { label: 'det',        latex: '\\det A' },
    ]},
    { cat: 'أحرف لاتينية', items: [
      { label: 'x',  latex: 'x' }, { label: 'y', latex: 'y' }, { label: 'z', latex: 'z' },
      { label: 'a',  latex: 'a' }, { label: 'b', latex: 'b' }, { label: 'c', latex: 'c' },
      { label: 'f(x)', latex: 'f(x)' }, { label: 'dx', latex: 'dx' }, { label: 'dy', latex: 'dy' },
      { label: '≠0', latex: '\\neq 0' }, { label: 'x∈ℝ', latex: 'x \\in \\mathbb{R}' },
      { label: 'ℕ', latex: '\\mathbb{N}' }, { label: 'ℤ', latex: '\\mathbb{Z}' },
      { label: 'ℚ', latex: '\\mathbb{Q}' }, { label: 'ℝ', latex: '\\mathbb{R}' },
      { label: 'ℂ', latex: '\\mathbb{C}' },
    ]},
  ];

  host.innerHTML = '';
  TEMPLATES.forEach(cat => {
    const lbl = document.createElement('div');
    lbl.className = 'eq-section-label';
    lbl.textContent = cat.cat;
    host.appendChild(lbl);

    const grid = document.createElement('div');
    grid.className = 'eq-grid';

    cat.items.forEach(item => {
      const btn = document.createElement('button');
      btn.className = 'eq-btn';
      btn.type = 'button';

      const inner = document.createElement('span');
      try {
        if (window.katex) {
          window.katex.render(item.latex, inner, {
            throwOnError: false, displayMode: false, output: 'html',
          });
        } else {
          inner.textContent = item.label;
        }
      } catch (e) { inner.textContent = item.label; }

      btn.appendChild(inner);
      btn.title = item.latex;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const ta = document.getElementById('eqTextarea');
        if (!ta) return;
        const pos = ta.selectionStart || ta.value.length;
        ta.value = ta.value.substring(0, pos) + item.latex + ta.value.substring(pos);
        const newPos = pos + item.latex.length;
        ta.focus();
        try { ta.setSelectionRange(newPos, newPos); } catch (_) {}
        ta.dispatchEvent(new Event('input', { bubbles: true }));
      });
      grid.appendChild(btn);
    });

    host.appendChild(grid);
  });
}

/* ============================================================
   §11. PRESENT MODE
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
  if (h > vh) { h = vh; w = h * aspect; }
  presentStage.style.width = w + 'px';
  presentStage.style.height = h + 'px';

  presentCanvas.width = pdfCanvas.width;
  presentCanvas.height = pdfCanvas.height;
  presentCanvas.getContext('2d').drawImage(pdfCanvas, 0, 0);

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
  if (el && indicator) el.textContent = indicator.textContent || '— / —';
}

function setPresentTool(tool) {
  presentState.tool = tool;
  const bar = document.getElementById('presentToolbar');
  if (!bar) return;
  bar.querySelectorAll('[data-ptool]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.ptool === tool);
  });
  document.dispatchEvent(new CustomEvent('ipb:presentToolChanged', {
    detail: { tool: tool },
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
    if (state.currentPage > 1) await pdf.goToPage(state.currentPage - 1);
  } catch (e) { console.warn(e); }
}
async function presentNextPage() {
  try {
    const pdf = await import('./pdf.js');
    const state = (await import('./core.js')).state;
    if (state.currentPage < state.totalPages) await pdf.goToPage(state.currentPage + 1);
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
  if (host) host.querySelectorAll('[data-present-annot]').forEach(el => el.remove());
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
   §12. LAYERS OBSERVER
   ============================================================ */
let _layersObserver = null;
function initLayersObserver() {
  if (_layersObserver) return;
  const stageContent = document.getElementById('stageContent');
  if (!stageContent) return;
  _layersObserver = new MutationObserver(() => refreshLayersPanel());
  _layersObserver.observe(stageContent, { childList: true, subtree: true });
  refreshLayersPanel();
}

function initPageChangeListener() {
  document.addEventListener('ipb:pageChanged', () => {
    setTimeout(refreshLayersPanel, 50);
  });
}

/* ============================================================
   §13. GLOBAL SHORTCUTS
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
   §14. INIT
   ============================================================ */
export function initUIShell() {
  applyVersion();
  initPropsTabs();
  initBottomPanel();
  initTopbarActions();
  initGlobalShortcuts();
  setupEquationBackdropMirror();
  initPropsToggle();
  initCloseProject();
  initProjectDimsPanel();
  initElementDesignProps();
  initCanvasControls();
  initToolbarToggle();

  // إخفاء الشريطين افتراضياً حتى يتم فتح أو إنشاء ملف
  import('./core.js').then(core => {
    const hasProject = core.state.slides && core.state.slides.length > 0;
    if (hasProject) {
      document.body.classList.add('has-project');
      document.body.classList.remove('no-project');
    } else {
      document.body.classList.remove('has-project');
      document.body.classList.add('no-project');
    }
  });

  setTimeout(() => {
    initLayersObserver();
    initPageChangeListener();
    refreshLayersPanel();
  }, 500);
}

if (typeof window !== 'undefined') {
  window.__UI_SHELL__ = {
    version: APP_VERSION,
    openPresent: openPresentMode,
    closePresent: closePresentMode,
    refreshLayers: refreshLayersPanel,
    closeProject: showCloseDialog,
  };
}
