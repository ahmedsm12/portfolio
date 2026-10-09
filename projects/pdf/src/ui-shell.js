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
   §8. PROPS PANEL TOGGLE & SIDEBAR TOGGLE
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

function initSidebarToggle() {
  const btn = document.getElementById('btnToggleSidebarArrow');
  const sidebar = document.getElementById('thumbnailSidebar');
  if (!btn || !sidebar) return;

  function updateArrowPos() {
    const isCollapsed = sidebar.classList.contains('collapsed');
    document.body.classList.toggle('sidebar-collapsed', isCollapsed);
    if (isCollapsed) {
      btn.style.left = '0';
    } else {
      const w = sidebar.offsetWidth || 240;
      btn.style.left = w + 'px';
    }
  }

  btn.addEventListener('click', async () => {
    sidebar.classList.toggle('collapsed');
    const isCollapsed = sidebar.classList.contains('collapsed');
    document.body.classList.toggle('sidebar-collapsed', isCollapsed);
    localStorage.setItem('sidebar_visible', isCollapsed ? 'false' : 'true');
    localStorage.setItem('pdfboard-sidebar-visible', isCollapsed ? 'false' : 'true');
    const pdf = await import('./pdf.js');
    if (pdf && pdf.updateSidebarPadding) pdf.updateSidebarPadding();
    updateArrowPos();
    setTimeout(() => window.dispatchEvent(new Event('resize')), 240);
  });

  const obs = new MutationObserver(updateArrowPos);
  obs.observe(sidebar, { attributes: true, attributeFilter: ['class', 'style'] });
  window.addEventListener('resize', updateArrowPos);
  updateArrowPos();
}

/* ============================================================
   §9. PROJECT DIMS PANEL & ACTIVE TOOL PROPERTIES
   ============================================================ */
function renderActiveToolProps(container, state) {
  if (!container || !state) return;
  const tool = state.tool || 'select';

  if (tool === 'select') {
    container.innerHTML = `
      <div class="prop-section" style="background:rgba(74,126,255,.05);border:1px solid rgba(74,126,255,.25);border-radius:8px;margin-bottom:12px;padding:10px">
        <div class="prop-title" style="color:var(--sh-accent);margin-bottom:4px">👆 أداة التحديد نشطة</div>
        <div style="font-size:11px;color:var(--sh-text-muted);line-height:1.6">
          • انقر على أي عنصر لتحديده وتعديل خصائصه.<br>
          • <b>اسحب بالفأرة على مساحة فارغة</b> لرسم مستطيل شفاف يحدد كل العناصر التي يلمسها.<br>
          • <b>Shift + نقرة</b> للتحديد المتعدد.<br>
          • يمكنك سحب العناصر <b>خارج الكانفاس</b> بحرية تامة دون قيود.
        </div>
      </div>
    `;
    return;
  }

  if (tool === 'hand') {
    container.innerHTML = `
      <div class="prop-section" style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:8px;margin-bottom:12px;padding:10px">
        <div class="prop-title" style="margin-bottom:4px">🖐️ أداة اليد نشطة</div>
        <div style="font-size:11px;color:var(--sh-text-muted);line-height:1.6">
          اسحب لتحريك الشريحة (Pan) والتنقل بسلاسة أثناء الشرح.
        </div>
      </div>
    `;
    return;
  }

  if (tool === 'pen') {
    const colors = ['#000000', '#2563eb', '#dc2626', '#16a34a', '#eab308', '#9333ea', '#ea580c', '#ffffff'];
    const sizes = [2, 5, 10, 16];
    const smooths = [{ v: 0, l: 'بدون' }, { v: 1, l: 'خفيف' }, { v: 2, l: 'متوسط' }, { v: 3, l: 'عالي' }];

    container.innerHTML = `
      <div class="prop-section" style="background:rgba(74,126,255,.04);border:1px solid rgba(74,126,255,.25);border-radius:8px;margin-bottom:12px;padding:10px">
        <div class="prop-title" style="display:flex;justify-content:space-between;align-items:center">
          <span>✏️ خيارات القلم</span>
          <span style="font-size:10px;color:var(--sh-accent);background:rgba(74,126,255,.12);padding:2px 6px;border-radius:4px;font-weight:700">أداة نشطة</span>
        </div>

        <div style="margin-top:8px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <label style="font-size:10.5px;color:var(--sh-text-muted)">اللون:</label>
            <span style="font-size:10.5px;font-family:monospace;color:var(--sh-text-dim)">${state.penColor}</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
            ${colors.map(c => `
              <button type="button" class="tool-color-circle" data-pencolor="${c}"
                style="width:26px;height:26px;border-radius:50%;background:${c};border:${c === state.penColor ? '2.5px solid #4a7eff' : '2px solid rgba(255,255,255,.2)'};cursor:pointer;padding:0;box-shadow:${c === state.penColor ? '0 0 8px rgba(74,126,255,.6)' : 'none'}"></button>
            `).join('')}
            <input type="color" id="sidePenColorInp" value="${state.penColor}" style="width:26px;height:26px;border:none;background:transparent;cursor:pointer" title="لون مخصص">
          </div>
        </div>

        <div style="margin-top:10px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <label style="font-size:10.5px;color:var(--sh-text-muted)">سماكة الخط:</label>
            <span style="font-size:11px;font-weight:700;color:var(--sh-accent)">${state.penSize}px</span>
          </div>
          <div class="prop-row" style="grid-template-columns: repeat(4, 1fr); gap: 4px">
            ${sizes.map(s => `
              <button type="button" class="prop-input" data-pensize="${s}"
                style="cursor:pointer;padding:6px 0;font-size:11px;font-weight:600;display:flex;flex-direction:column;align-items:center;gap:3px;${s === state.penSize ? 'border-color:var(--sh-accent);background:rgba(74,126,255,.15);color:#fff' : ''}">
                <span style="width:${Math.min(16, Math.max(4, s))}px;height:${Math.min(16, Math.max(4, s))}px;background:${state.penColor};border-radius:50%;display:inline-block"></span>
                <span>${s}px</span>
              </button>
            `).join('')}
          </div>
        </div>

        <div style="margin-top:10px">
          <label style="font-size:10.5px;color:var(--sh-text-muted);display:block;margin-bottom:6px">نعومة الخط (Smoothing):</label>
          <div class="prop-row" style="grid-template-columns: repeat(4, 1fr); gap: 4px">
            ${smooths.map(sm => `
              <button type="button" class="prop-input" data-pensmooth="${sm.v}"
                style="cursor:pointer;padding:6px 0;font-size:10.5px;font-weight:500;text-align:center;${sm.v === state.penSmoothing ? 'border-color:var(--sh-accent);background:rgba(74,126,255,.15);color:#fff' : ''}">
                ${sm.l}
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    container.querySelectorAll('[data-pencolor]').forEach(b => {
      b.addEventListener('click', () => {
        state.penColor = b.dataset.pencolor;
        import('./main.js').then(m => m.updateToolbarIndicators());
        renderActiveToolProps(container, state);
      });
    });
    const cInp = container.querySelector('#sidePenColorInp');
    if (cInp) cInp.addEventListener('input', () => {
      state.penColor = cInp.value;
      import('./main.js').then(m => m.updateToolbarIndicators());
      renderActiveToolProps(container, state);
    });
    container.querySelectorAll('[data-pensize]').forEach(b => {
      b.addEventListener('click', () => {
        state.penSize = parseFloat(b.dataset.pensize);
        renderActiveToolProps(container, state);
      });
    });
    container.querySelectorAll('[data-pensmooth]').forEach(b => {
      b.addEventListener('click', () => {
        state.penSmoothing = parseInt(b.dataset.pensmooth, 10);
        renderActiveToolProps(container, state);
      });
    });
    return;
  }

  if (tool === 'highlighter') {
    const colors = ['#fde047', '#86efac', '#93c5fd', '#f472b6', '#fdba74'];
    const sizes = [10, 18, 28, 40];
    const smooths = [{ v: 0, l: 'بدون' }, { v: 1, l: 'خفيف' }, { v: 2, l: 'متوسط' }, { v: 3, l: 'عالي' }];

    container.innerHTML = `
      <div class="prop-section" style="background:rgba(234,179,8,.04);border:1px solid rgba(234,179,8,.25);border-radius:8px;margin-bottom:12px;padding:10px">
        <div class="prop-title" style="display:flex;justify-content:space-between;align-items:center">
          <span>🖍️ خيارات قلم التحديد</span>
          <span style="font-size:10px;color:#eab308;background:rgba(234,179,8,.12);padding:2px 6px;border-radius:4px;font-weight:700">أداة نشطة</span>
        </div>

        <div style="margin-top:8px">
          <label style="font-size:10.5px;color:var(--sh-text-muted);display:block;margin-bottom:6px">لون التمييز:</label>
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
            ${colors.map(c => `
              <button type="button" class="tool-color-circle" data-hlcolor="${c}"
                style="width:26px;height:26px;border-radius:50%;background:${c};border:${c === state.highlighterColor ? '2.5px solid #fff' : '2px solid rgba(255,255,255,.2)'};cursor:pointer;padding:0;box-shadow:${c === state.highlighterColor ? '0 0 8px ' + c : 'none'}"></button>
            `).join('')}
          </div>
        </div>

        <div style="margin-top:10px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <label style="font-size:10.5px;color:var(--sh-text-muted)">العرض:</label>
            <span style="font-size:11px;font-weight:700;color:#eab308">${state.highlighterSize}px</span>
          </div>
          <div class="prop-row" style="grid-template-columns: repeat(4, 1fr); gap: 4px">
            ${sizes.map(s => `
              <button type="button" class="prop-input" data-hlsize="${s}"
                style="cursor:pointer;padding:6px 0;font-size:11px;font-weight:600;display:flex;flex-direction:column;align-items:center;gap:3px;${s === state.highlighterSize ? 'border-color:#eab308;background:rgba(234,179,8,.15);color:#fff' : ''}">
                <span style="width:${Math.min(16, Math.max(6, s/2.5))}px;height:6px;background:${state.highlighterColor};border-radius:2px;display:inline-block"></span>
                <span>${s}px</span>
              </button>
            `).join('')}
          </div>
        </div>

        <div style="margin-top:10px">
          <label style="font-size:10.5px;color:var(--sh-text-muted);display:block;margin-bottom:6px">النعومة:</label>
          <div class="prop-row" style="grid-template-columns: repeat(4, 1fr); gap: 4px">
            ${smooths.map(sm => `
              <button type="button" class="prop-input" data-hlsmooth="${sm.v}"
                style="cursor:pointer;padding:6px 0;font-size:10.5px;font-weight:500;text-align:center;${sm.v === state.highlighterSmoothing ? 'border-color:#eab308;background:rgba(234,179,8,.15);color:#fff' : ''}">
                ${sm.l}
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    container.querySelectorAll('[data-hlcolor]').forEach(b => {
      b.addEventListener('click', () => {
        state.highlighterColor = b.dataset.hlcolor;
        import('./main.js').then(m => m.updateToolbarIndicators());
        renderActiveToolProps(container, state);
      });
    });
    container.querySelectorAll('[data-hlsize]').forEach(b => {
      b.addEventListener('click', () => {
        state.highlighterSize = parseFloat(b.dataset.hlsize);
        renderActiveToolProps(container, state);
      });
    });
    container.querySelectorAll('[data-hlsmooth]').forEach(b => {
      b.addEventListener('click', () => {
        state.highlighterSmoothing = parseInt(b.dataset.hlsmooth, 10);
        renderActiveToolProps(container, state);
      });
    });
    return;
  }

  if (tool === 'laser') {
    const colors = ['#ff0000', '#2563eb', '#22c55e', '#eab308'];
    const glows = [{ v: 1.5, l: 'خفيف' }, { v: 3, l: 'متوسط' }, { v: 6, l: 'قوي' }];
    const sizes = [4, 8, 14];
    const lives = [{ ms: 2000, l: '2 ث' }, { ms: 3000, l: '3 ث' }, { ms: 5000, l: '5 ث' }];

    container.innerHTML = `
      <div class="prop-section" style="background:rgba(239,68,68,.04);border:1px solid rgba(239,68,68,.25);border-radius:8px;margin-bottom:12px;padding:10px">
        <div class="prop-title" style="display:flex;justify-content:space-between;align-items:center">
          <span>🔴 مؤشر الليزر التفاعلي</span>
          <span style="font-size:10px;color:#ef4444;background:rgba(239,68,68,.12);padding:2px 6px;border-radius:4px;font-weight:700">أداة نشطة</span>
        </div>

        <div style="margin-top:8px">
          <label style="font-size:10.5px;color:var(--sh-text-muted);display:block;margin-bottom:6px">لون التوهج (Glow):</label>
          <div style="display:flex;align-items:center;gap:6px">
            ${colors.map(c => `
              <button type="button" class="tool-color-circle" data-lasercolor="${c}"
                style="width:26px;height:26px;border-radius:50%;background:${c};border:${c === state.laserColor ? '2.5px solid #fff' : '2px solid rgba(255,255,255,.2)'};cursor:pointer;padding:0;box-shadow:${c === state.laserColor ? '0 0 10px ' + c : 'none'}"></button>
            `).join('')}
          </div>
        </div>

        <div style="margin-top:10px">
          <label style="font-size:10.5px;color:var(--sh-text-muted);display:block;margin-bottom:6px">شدة التوهج:</label>
          <div class="prop-row" style="grid-template-columns: repeat(3, 1fr); gap: 4px">
            ${glows.map(g => `
              <button type="button" class="prop-input" data-laserglow="${g.v}"
                style="cursor:pointer;padding:6px 0;font-size:10.5px;font-weight:500;text-align:center;${g.v === state.laserGlowIntensity ? 'border-color:#ef4444;background:rgba(239,68,68,.15);color:#fff' : ''}">
                ${g.l}
              </button>
            `).join('')}
          </div>
        </div>

        <div style="margin-top:10px">
          <label style="font-size:10.5px;color:var(--sh-text-muted);display:block;margin-bottom:6px">حجم النقطة والمدة:</label>
          <div class="prop-row" style="grid-template-columns: repeat(3, 1fr); gap: 4px">
            ${sizes.map(s => `
              <button type="button" class="prop-input" data-lasersize="${s}"
                style="cursor:pointer;padding:6px 0;font-size:10.5px;font-weight:600;text-align:center;${s === state.laserSize ? 'border-color:#ef4444;background:rgba(239,68,68,.15);color:#fff' : ''}">
                ${s}px
              </button>
            `).join('')}
          </div>
          <div class="prop-row" style="grid-template-columns: repeat(3, 1fr); gap: 4px; margin-top: 4px">
            ${lives.map(l => `
              <button type="button" class="prop-input" data-laserlife="${l.ms}"
                style="cursor:pointer;padding:6px 0;font-size:10.5px;font-weight:500;text-align:center;${l.ms === state.laserLifeMs ? 'border-color:#ef4444;background:rgba(239,68,68,.15);color:#fff' : ''}">
                ${l.l}
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    container.querySelectorAll('[data-lasercolor]').forEach(b => {
      b.addEventListener('click', () => {
        state.laserColor = b.dataset.lasercolor;
        import('./main.js').then(m => m.updateToolbarIndicators());
        renderActiveToolProps(container, state);
      });
    });
    container.querySelectorAll('[data-laserglow]').forEach(b => {
      b.addEventListener('click', () => {
        state.laserGlowIntensity = parseFloat(b.dataset.laserglow);
        renderActiveToolProps(container, state);
      });
    });
    container.querySelectorAll('[data-lasersize]').forEach(b => {
      b.addEventListener('click', () => {
        state.laserSize = parseFloat(b.dataset.lasersize);
        renderActiveToolProps(container, state);
      });
    });
    container.querySelectorAll('[data-laserlife]').forEach(b => {
      b.addEventListener('click', () => {
        state.laserLifeMs = parseInt(b.dataset.laserlife, 10);
        renderActiveToolProps(container, state);
      });
    });
    return;
  }

  if (tool === 'shape') {
    const kinds = [{ k: 'rect', l: '▭ مستطيل' }, { k: 'circle', l: '◯ دائرة' }, { k: 'arrow', l: '↗ سهم / خط' }];
    const sizes = [2, 5, 10, 16];
    const starts = [{ v: 'none', l: 'بدون' }, { v: 'arrow', l: 'سهم' }, { v: 'arrow-hollow', l: 'مفرغ' }];
    const ends = [{ v: 'none', l: 'بدون' }, { v: 'arrow', l: 'سهم' }, { v: 'arrow-hollow', l: 'مفرغ' }, { v: 'circle', l: 'دائرة' }];

    container.innerHTML = `
      <div class="prop-section" style="background:rgba(74,126,255,.04);border:1px solid rgba(74,126,255,.25);border-radius:8px;margin-bottom:12px;padding:10px">
        <div class="prop-title" style="display:flex;justify-content:space-between;align-items:center">
          <span>▭ أداة الأشكال</span>
          <span style="font-size:10px;color:var(--sh-accent);background:rgba(74,126,255,.12);padding:2px 6px;border-radius:4px;font-weight:700">أداة نشطة</span>
        </div>

        <div style="margin-top:8px">
          <label style="font-size:10.5px;color:var(--sh-text-muted);display:block;margin-bottom:6px">نوع الشكل:</label>
          <div class="prop-row" style="grid-template-columns: repeat(3, 1fr); gap: 4px">
            ${kinds.map(k => `
              <button type="button" class="prop-input" data-sideshape="${k.k}"
                style="cursor:pointer;padding:6px 0;font-size:11px;font-weight:600;text-align:center;${k.k === state.shapeKind ? 'border-color:var(--sh-accent);background:rgba(74,126,255,.15);color:#fff' : ''}">
                ${k.l}
              </button>
            `).join('')}
          </div>
        </div>

        <div style="margin-top:10px">
          <div class="prop-row" style="grid-template-columns: 1fr 1fr; gap: 8px">
            <div>
              <label style="font-size:10.5px;color:var(--sh-text-muted);display:block;margin-bottom:4px">الحد الخارجي (Stroke):</label>
              <input type="color" id="sideShapeStroke" value="${state.shapeStroke}" style="width:100%;height:30px;border:none;background:transparent;cursor:pointer">
            </div>
            <div>
              <label style="font-size:10.5px;color:var(--sh-text-muted);display:block;margin-bottom:4px">التعبئة (Fill):</label>
              <input type="color" id="sideShapeFill" value="${state.shapeFill}" ${state.shapeFillNone ? 'disabled style="opacity:0.4;width:100%;height:30px"' : 'style="width:100%;height:30px;border:none;background:transparent;cursor:pointer"'}>
            </div>
          </div>
          <label style="font-size:10.5px;color:var(--sh-text);cursor:pointer;display:inline-flex;align-items:center;gap:6px;margin-top:6px">
            <input type="checkbox" id="sideShapeNoFill" ${state.shapeFillNone ? 'checked' : ''}> بدون تعبئة (شفاف)
          </label>
        </div>

        <div style="margin-top:10px">
          <label style="font-size:10.5px;color:var(--sh-text-muted);display:block;margin-bottom:6px">سماكة الحد:</label>
          <div class="prop-row" style="grid-template-columns: repeat(4, 1fr); gap: 4px">
            ${sizes.map(s => `
              <button type="button" class="prop-input" data-sideshapesize="${s}"
                style="cursor:pointer;padding:6px 0;font-size:11px;font-weight:600;text-align:center;${s === state.shapeSize ? 'border-color:var(--sh-accent);background:rgba(74,126,255,.15);color:#fff' : ''}">
                ${s}px
              </button>
            `).join('')}
          </div>
        </div>

        <div style="margin-top:10px">
          <label style="font-size:10.5px;color:var(--sh-text-muted);display:block;margin-bottom:4px">رأس السهم في البداية والنهاية:</label>
          <div class="prop-row" style="grid-template-columns: 1fr 1fr; gap: 4px">
            <select class="prop-input" id="sideShapeStart">
              ${starts.map(o => `<option value="${o.v}" ${o.v === state.shapeLineStart ? 'selected' : ''}>البداية: ${o.l}</option>`).join('')}
            </select>
            <select class="prop-input" id="sideShapeEnd">
              ${ends.map(o => `<option value="${o.v}" ${o.v === state.shapeLineEnd ? 'selected' : ''}>النهاية: ${o.l}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>
    `;

    container.querySelectorAll('[data-sideshape]').forEach(b => {
      b.addEventListener('click', () => {
        state.shapeKind = b.dataset.sideshape;
        renderActiveToolProps(container, state);
      });
    });
    const sStr = container.querySelector('#sideShapeStroke');
    if (sStr) sStr.addEventListener('input', () => { state.shapeStroke = sStr.value; });
    const sFil = container.querySelector('#sideShapeFill');
    if (sFil) sFil.addEventListener('input', () => { state.shapeFill = sFil.value; });
    const sNoFil = container.querySelector('#sideShapeNoFill');
    if (sNoFil) sNoFil.addEventListener('change', () => {
      state.shapeFillNone = sNoFil.checked;
      if (sFil) sFil.disabled = state.shapeFillNone;
    });
    container.querySelectorAll('[data-sideshapesize]').forEach(b => {
      b.addEventListener('click', () => {
        state.shapeSize = parseFloat(b.dataset.sideshapesize);
        renderActiveToolProps(container, state);
      });
    });
    const sStart = container.querySelector('#sideShapeStart');
    if (sStart) sStart.addEventListener('change', () => { state.shapeLineStart = sStart.value; });
    const sEnd = container.querySelector('#sideShapeEnd');
    if (sEnd) sEnd.addEventListener('change', () => { state.shapeLineEnd = sEnd.value; });
    return;
  }

  if (tool === 'text') {
    const fonts = ['system-ui', 'Cairo', 'Tajawal', 'Amiri', 'Noto Kufi Arabic', 'Arial', 'Georgia', 'Times New Roman'];
    const sizes = [14, 18, 22, 28, 36, 48];
    const colors = ['#000000', '#1e3a8a', '#dc2626', '#16a34a', '#eab308', '#7c3aed', '#ffffff'];

    container.innerHTML = `
      <div class="prop-section" style="background:rgba(74,126,255,.04);border:1px solid rgba(74,126,255,.25);border-radius:8px;margin-bottom:12px;padding:10px">
        <div class="prop-title" style="display:flex;justify-content:space-between;align-items:center">
          <span>🔤 أداة إضافة النص</span>
          <span style="font-size:10px;color:var(--sh-accent);background:rgba(74,126,255,.12);padding:2px 6px;border-radius:4px;font-weight:700">أداة نشطة</span>
        </div>

        <div style="margin-top:8px">
          <label style="font-size:10.5px;color:var(--sh-text-muted);display:block;margin-bottom:4px">نوع الخط:</label>
          <select class="prop-input" id="sideTextFont">
            ${fonts.map(f => `<option value="${f}" ${f === state.textFamily ? 'selected' : ''}>${f}</option>`).join('')}
          </select>
        </div>

        <div style="margin-top:10px">
          <label style="font-size:10.5px;color:var(--sh-text-muted);display:block;margin-bottom:6px">حجم الخط:</label>
          <div class="prop-row" style="grid-template-columns: repeat(6, 1fr); gap: 3px">
            ${sizes.map(s => `
              <button type="button" class="prop-input" data-sidetextsize="${s}"
                style="cursor:pointer;padding:6px 0;font-size:11px;font-weight:600;text-align:center;${s === state.textSize ? 'border-color:var(--sh-accent);background:rgba(74,126,255,.15);color:#fff' : ''}">
                ${s}
              </button>
            `).join('')}
          </div>
        </div>

        <div style="margin-top:10px">
          <div class="prop-row" style="grid-template-columns: 1fr 1fr; gap: 6px">
            <button type="button" class="prop-input" id="sideTextBold" style="cursor:pointer;font-weight:bold;${state.textBold ? 'border-color:var(--sh-accent);background:rgba(74,126,255,.15);color:#fff' : ''}">B عريض</button>
            <button type="button" class="prop-input" id="sideTextItalic" style="cursor:pointer;font-style:italic;${state.textItalic ? 'border-color:var(--sh-accent);background:rgba(74,126,255,.15);color:#fff' : ''}">I مائل</button>
          </div>
        </div>

        <div style="margin-top:10px">
          <label style="font-size:10.5px;color:var(--sh-text-muted);display:block;margin-bottom:6px">لون النص:</label>
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
            ${colors.map(c => `
              <button type="button" class="tool-color-circle" data-sidetextcolor="${c}"
                style="width:26px;height:26px;border-radius:50%;background:${c};border:${c === state.textColor ? '2.5px solid #4a7eff' : '2px solid rgba(255,255,255,.2)'};cursor:pointer;padding:0;box-shadow:${c === state.textColor ? '0 0 8px rgba(74,126,255,.6)' : 'none'}"></button>
            `).join('')}
            <input type="color" id="sideTextColorInp" value="${state.textColor}" style="width:26px;height:26px;border:none;background:transparent;cursor:pointer" title="لون مخصص">
          </div>
        </div>
      </div>
    `;

    const fSel = container.querySelector('#sideTextFont');
    if (fSel) fSel.addEventListener('change', () => { state.textFamily = fSel.value; });
    container.querySelectorAll('[data-sidetextsize]').forEach(b => {
      b.addEventListener('click', () => {
        state.textSize = parseFloat(b.dataset.sidetextsize);
        renderActiveToolProps(container, state);
      });
    });
    const bBtn = container.querySelector('#sideTextBold');
    if (bBtn) bBtn.addEventListener('click', () => {
      state.textBold = !state.textBold;
      renderActiveToolProps(container, state);
    });
    const iBtn = container.querySelector('#sideTextItalic');
    if (iBtn) iBtn.addEventListener('click', () => {
      state.textItalic = !state.textItalic;
      renderActiveToolProps(container, state);
    });
    container.querySelectorAll('[data-sidetextcolor]').forEach(b => {
      b.addEventListener('click', () => {
        state.textColor = b.dataset.sidetextcolor;
        import('./main.js').then(m => m.updateToolbarIndicators());
        renderActiveToolProps(container, state);
      });
    });
    const tColInp = container.querySelector('#sideTextColorInp');
    if (tColInp) tColInp.addEventListener('input', () => {
      state.textColor = tColInp.value;
      import('./main.js').then(m => m.updateToolbarIndicators());
      renderActiveToolProps(container, state);
    });
    return;
  }

  if (tool === 'eraser') {
    const sizes = [12, 24, 40, 60];

    container.innerHTML = `
      <div class="prop-section" style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.15);border-radius:8px;margin-bottom:12px;padding:10px">
        <div class="prop-title" style="display:flex;justify-content:space-between;align-items:center">
          <span>🧽 خيارات الممحاة</span>
          <span style="font-size:10px;color:var(--sh-accent);background:rgba(74,126,255,.12);padding:2px 6px;border-radius:4px;font-weight:700">أداة نشطة</span>
        </div>

        <div style="margin-top:8px">
          <label style="font-size:10.5px;color:var(--sh-text-muted);display:block;margin-bottom:6px">قطر الممحاة:</label>
          <div class="prop-row" style="grid-template-columns: repeat(4, 1fr); gap: 4px">
            ${sizes.map(s => `
              <button type="button" class="prop-input" data-erasersize="${s}"
                style="cursor:pointer;padding:6px 0;font-size:11px;font-weight:600;text-align:center;${s === state.eraserSize ? 'border-color:var(--sh-accent);background:rgba(74,126,255,.15);color:#fff' : ''}">
                ${s}px
              </button>
            `).join('')}
          </div>
        </div>

        <div style="margin-top:10px">
          <label style="font-size:11px;color:var(--sh-text);cursor:pointer;display:inline-flex;align-items:center;gap:6px">
            <input type="checkbox" id="sideEraseShapes" ${state.eraserErasesShapes ? 'checked' : ''}> مسح الأشكال أيضاً
          </label>
        </div>
      </div>
    `;

    container.querySelectorAll('[data-erasersize]').forEach(b => {
      b.addEventListener('click', () => {
        state.eraserSize = parseFloat(b.dataset.erasersize);
        renderActiveToolProps(container, state);
      });
    });
    const cShapes = container.querySelector('#sideEraseShapes');
    if (cShapes) cShapes.addEventListener('change', () => {
      state.eraserErasesShapes = cShapes.checked;
    });
    return;
  }
}

function initProjectDimsPanel() {
  const infoPanel = document.getElementById('documentInfoPanel');
  if (!infoPanel) return;

  infoPanel.innerHTML = `
    <div id="activeToolPropsHost"></div>

    <div class="prop-section" id="projectDimsSection">
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
  const toolHost = document.getElementById('activeToolPropsHost');

  async function refresh() {
    const core = await import('./core.js');
    const st = core.state;

    if (toolHost) {
      renderActiveToolProps(toolHost, st);
    }

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
  document.addEventListener('ipb:toolChanged', () => setTimeout(refresh, 40));
  document.addEventListener('ipb:toolConfigChanged', () => setTimeout(refresh, 40));

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
   §9B. ELEMENT DESIGN PROPERTIES — لوحة التصميم والمحاذاة والخصائص
   ============================================================ */
function initElementDesignProps() {
  const panel = document.getElementById('selectedElementPropsPanel');
  const infoPanel = document.getElementById('documentInfoPanel');
  if (!panel) return;

  let currentAlignTarget = 'selection';

  async function getSelectionInfo() {
    const core = await import('./core.js');
    const list = core.state.selectedList && core.state.selectedList.length > 0
      ? core.state.selectedList
      : (core.state.selected ? [core.state.selected] : []);
    return {
      list,
      count: list.length,
      primary: list.length > 0 ? list[0] : null,
    };
  }

  async function renderProps() {
    const { list, count, primary } = await getSelectionInfo();
    const inter = await import('./interaction.js');
    const core = await import('./core.js');

    if (count === 0) {
      panel.style.display = 'none';
      panel.innerHTML = '';
      if (infoPanel) infoPanel.style.display = 'block';
      return;
    }

    panel.style.display = 'block';
    if (infoPanel) infoPanel.style.display = 'none';

    // ═══════════ MULTI-SELECTION VIEW ═══════════
    if (count > 1) {
      panel.innerHTML = `
        <div class="prop-section">
          <div class="prop-title" style="display:flex;justify-content:space-between;align-items:center">
            <span>🗂️ تحديد متعدد (${count} عناصر)</span>
            <span style="font-size:10px;color:var(--sh-accent);background:rgba(74,126,255,.1);padding:2px 6px;border-radius:4px">كتلة واحدة</span>
          </div>

          <div style="margin-top:8px">
            <label style="font-size:10.5px;color:var(--sh-text-muted);display:block;margin-bottom:4px">مرجع المحاذاة والتوزيع:</label>
            <div class="align-target-switch">
              <button type="button" class="align-target-btn ${currentAlignTarget === 'selection' ? 'active' : ''}" data-target="selection">🔲 العناصر المحددة</button>
              <button type="button" class="align-target-btn ${currentAlignTarget === 'canvas' ? 'active' : ''}" data-target="canvas">🖼️ الكانفاس</button>
            </div>
          </div>

          <div style="margin-top:8px">
            <label style="font-size:10.5px;color:var(--sh-text-muted);display:block;margin-bottom:4px">المحاذاة:</label>
            <div class="align-grid">
              <button type="button" class="align-action-btn" data-align="left" title="محاذاة لليسار">⫷</button>
              <button type="button" class="align-action-btn" data-align="centerH" title="توسيط أفقياً">⫿</button>
              <button type="button" class="align-action-btn" data-align="right" title="محاذاة لليمين">⫸</button>
              <button type="button" class="align-action-btn" data-align="top" title="محاذاة للأعلى">⫠</button>
              <button type="button" class="align-action-btn" data-align="centerV" title="توسيط رأسياً">⫰</button>
              <button type="button" class="align-action-btn" data-align="bottom" title="محاذاة للأسفل">⫡</button>
            </div>
          </div>

          <div style="margin-top:8px">
            <label style="font-size:10.5px;color:var(--sh-text-muted);display:block;margin-bottom:4px">التوزيع بالتساوي:</label>
            <div class="distribute-grid">
              <button type="button" class="distribute-action-btn" data-dist="horizontal">⫯ توزيع أفقي</button>
              <button type="button" class="distribute-action-btn" data-dist="vertical">⫶ توزيع رأسي</button>
            </div>
          </div>
        </div>

        <div class="prop-section">
          <div class="prop-title">🗂 ترتيب الطبقات</div>
          <div class="prop-row" style="grid-template-columns:1fr 1fr;gap:4px">
            <button type="button" class="prop-input" id="bulkFrontBtn" style="cursor:pointer;font-size:11px;font-weight:600">⏫ إلى المقدمة</button>
            <button type="button" class="prop-input" id="bulkBackBtn" style="cursor:pointer;font-size:11px;font-weight:600">⏬ إلى الخلف</button>
          </div>
        </div>

        <div class="prop-section">
          <div class="prop-title">👁 الشفافية للكل</div>
          <div class="prop-row" style="grid-template-columns:1fr auto;align-items:center;gap:8px">
            <input type="range" id="bulkOpacitySlider" min="5" max="100" value="100" style="width:100%;accent-color:var(--sh-accent);cursor:pointer">
            <span id="bulkOpacityVal" style="font-size:11.5px;font-variant-numeric:tabular-nums;min-width:36px;text-align:center">100%</span>
          </div>
        </div>

        <div class="prop-section">
          <div class="prop-title">⚡ إجراءات سريعة</div>
          <div class="prop-row" style="grid-template-columns:1fr 1fr;gap:4px">
            <button type="button" class="prop-input" id="bulkDupBtn" style="cursor:pointer;font-size:11px;font-weight:600;background:rgba(74,126,255,.1);border-color:var(--sh-accent);color:#fff">📑 تكرار العناصر</button>
            <button type="button" class="prop-input" id="bulkDelBtn" style="cursor:pointer;font-size:11px;font-weight:600;background:rgba(239,68,68,.12);border-color:#ef4444;color:#ef4444">🗑️ حذف العناصر</button>
          </div>
        </div>
      `;

      // Wire target switch
      panel.querySelectorAll('.align-target-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          currentAlignTarget = btn.dataset.target;
          panel.querySelectorAll('.align-target-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        });
      });

      // Wire align buttons
      panel.querySelectorAll('.align-action-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          inter.alignSelected(btn.dataset.align, currentAlignTarget);
        });
      });

      // Wire distribute buttons
      panel.querySelectorAll('.distribute-action-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          inter.distributeSelected(btn.dataset.dist, currentAlignTarget);
        });
      });

      // Bulk layer
      const bFront = document.getElementById('bulkFrontBtn');
      const bBack = document.getElementById('bulkBackBtn');
      if (bFront) bFront.addEventListener('click', () => {
        list.forEach(it => inter.bringToFront(it.el));
        core.commitChange();
        refreshLayersPanel();
      });
      if (bBack) bBack.addEventListener('click', () => {
        list.forEach(it => inter.sendToBack(it.el));
        core.commitChange();
        refreshLayersPanel();
      });

      // Bulk opacity
      const bOpSlider = document.getElementById('bulkOpacitySlider');
      const bOpVal = document.getElementById('bulkOpacityVal');
      if (bOpSlider) {
        bOpSlider.addEventListener('input', () => {
          const v = parseInt(bOpSlider.value, 10);
          if (bOpVal) bOpVal.textContent = v + '%';
          const op = v / 100;
          list.forEach(it => {
            if (it.kind === 'svg') {
              const inner = it.el.querySelector('[data-annot]') || it.el;
              inner.setAttribute('opacity', op);
              it.el.style.opacity = op;
            } else {
              it.el.style.opacity = op;
            }
          });
        });
        bOpSlider.addEventListener('change', () => core.commitChange());
      }

      // Bulk Duplicate & Delete
      const bDup = document.getElementById('bulkDupBtn');
      const bDel = document.getElementById('bulkDelBtn');
      if (bDup) bDup.addEventListener('click', () => inter.duplicateSelectedElements());
      if (bDel) bDel.addEventListener('click', () => inter.deleteSelectedElements());
      return;
    }

    // ═══════════ SINGLE-ELEMENT VIEW ═══════════
    const sel = primary;
    const kindLabel = {
      svg: 'شكل / رسم',
      text: 'مربع نص',
      media: 'صورة / فيديو',
      button: 'زر تفاعلي',
      embed: 'تضمين ويب',
    }[sel.kind] || 'عنصر';

    panel.innerHTML = `
      <div class="prop-section">
        <div class="prop-title" style="display:flex;justify-content:space-between;align-items:center">
          <span>✨ خصائص العنصر</span>
          <span style="font-size:10px;color:var(--sh-accent);background:rgba(74,126,255,.1);padding:2px 6px;border-radius:4px">${kindLabel}</span>
        </div>
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
        <div class="prop-title">📐 محاذاة للشريحة (الكانفاس)</div>
        <div class="align-grid">
          <button type="button" class="align-action-btn" data-align="left" title="محاذاة لليسار">⫷</button>
          <button type="button" class="align-action-btn" data-align="centerH" title="توسيط أفقياً">⫿</button>
          <button type="button" class="align-action-btn" data-align="right" title="محاذاة لليمين">⫸</button>
          <button type="button" class="align-action-btn" data-align="top" title="محاذاة للأعلى">⫠</button>
          <button type="button" class="align-action-btn" data-align="centerV" title="توسيط رأسياً">⫰</button>
          <button type="button" class="align-action-btn" data-align="bottom" title="محاذاة للأسفل">⫡</button>
        </div>
      </div>

      <div id="elementSpecificProps"></div>

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

      <div class="prop-section">
        <div class="prop-title">⚡ إجراءات</div>
        <div class="prop-row" style="grid-template-columns:1fr 1fr;gap:4px">
          <button type="button" class="prop-input" id="elemDupBtn" style="cursor:pointer;font-size:11px;font-weight:600;background:rgba(74,126,255,.1);border-color:var(--sh-accent);color:#fff">📑 تكرار العنصر</button>
          <button type="button" class="prop-input" id="elemDelBtn" style="cursor:pointer;font-size:11px;font-weight:600;background:rgba(239,68,68,.12);border-color:#ef4444;color:#ef4444">🗑️ حذف العنصر</button>
        </div>
      </div>
    `;

    // Populate type-specific controls
    const specHost = document.getElementById('elementSpecificProps');
    if (specHost) {
      if (sel.kind === 'text') {
        const curFont = sel.el.dataset.fontFamily || 'Cairo, sans-serif';
        const curSize = parseInt(sel.el.dataset.fontSize || '20', 10);
        const curColor = sel.el.dataset.color || '#1e3a8a';
        const isBold = sel.el.dataset.fontWeight === 'bold';
        const isItalic = sel.el.dataset.fontStyle === 'italic';

        specHost.innerHTML = `
          <div class="prop-section">
            <div class="prop-title">✍️ خصائص النص</div>
            <div class="prop-row" style="margin-bottom:6px">
              <div class="prop-field">
                <label>حجم الخط (px)</label>
                <input type="number" class="prop-input" id="textPropSize" value="${curSize}" min="8" max="200" />
              </div>
              <div class="prop-field">
                <label>لون النص</label>
                <input type="color" class="prop-input" id="textPropColor" value="${curColor}" style="padding:2px;height:28px" />
              </div>
            </div>
            <div class="prop-row" style="grid-template-columns:1fr 1fr 1fr;gap:4px">
              <button type="button" class="prop-input ${isBold ? 'active' : ''}" id="textBoldBtn" style="cursor:pointer;font-weight:bold">B عريض</button>
              <button type="button" class="prop-input ${isItalic ? 'active' : ''}" id="textItalicBtn" style="cursor:pointer;font-style:italic">I مائل</button>
              <button type="button" class="prop-input" id="textAlignRBtn" style="cursor:pointer">يمين ⇥</button>
            </div>
          </div>
        `;

        const tSize = document.getElementById('textPropSize');
        const tColor = document.getElementById('textPropColor');
        const tBold = document.getElementById('textBoldBtn');
        const tItal = document.getElementById('textItalicBtn');
        const tAlign = document.getElementById('textAlignRBtn');

        if (tSize) tSize.addEventListener('change', () => {
          sel.el.dataset.fontSize = tSize.value;
          inter.applyTextStyles(sel.el);
          core.commitChange();
        });
        if (tColor) tColor.addEventListener('input', () => {
          sel.el.dataset.color = tColor.value;
          inter.applyTextStyles(sel.el);
          core.commitChange();
        });
        if (tBold) tBold.addEventListener('click', () => {
          const nowB = sel.el.dataset.fontWeight === 'bold';
          sel.el.dataset.fontWeight = nowB ? 'normal' : 'bold';
          inter.applyTextStyles(sel.el);
          tBold.classList.toggle('active', !nowB);
          core.commitChange();
        });
        if (tItal) tItal.addEventListener('click', () => {
          const nowI = sel.el.dataset.fontStyle === 'italic';
          sel.el.dataset.fontStyle = nowI ? 'normal' : 'italic';
          inter.applyTextStyles(sel.el);
          tItal.classList.toggle('active', !nowI);
          core.commitChange();
        });
        if (tAlign) tAlign.addEventListener('click', () => {
          const curA = sel.el.dataset.align || 'right';
          const nextA = curA === 'right' ? 'center' : (curA === 'center' ? 'left' : 'right');
          sel.el.dataset.align = nextA;
          inter.applyTextStyles(sel.el);
          core.commitChange();
        });
      } else if (sel.kind === 'svg') {
        const inner = sel.el.querySelector('[data-annot]') || sel.el;
        const curStroke = inner.getAttribute('stroke') || '#000000';
        const curFill = inner.getAttribute('fill') || 'none';
        const curSW = inner.getAttribute('stroke-width') || '3';

        specHost.innerHTML = `
          <div class="prop-section">
            <div class="prop-title">🎨 مظهر الشكل</div>
            <div class="prop-row">
              <div class="prop-field">
                <label>لون الحدود</label>
                <input type="color" class="prop-input" id="shapeStrokeColor" value="${curStroke.startsWith('#') ? curStroke : '#000000'}" style="padding:2px;height:28px" />
              </div>
              <div class="prop-field">
                <label>لون التعبئة</label>
                <div style="display:flex;gap:4px">
                  <input type="color" class="prop-input" id="shapeFillColor" value="${curFill.startsWith('#') ? curFill : '#4a7eff'}" style="padding:2px;height:28px" />
                  <button type="button" class="prop-input" id="shapeFillNoneBtn" style="cursor:pointer;font-size:10px;padding:0 6px" title="تعبئة شفافة">شفاف</button>
                </div>
              </div>
            </div>
            <div class="prop-row" style="margin-top:6px">
              <div class="prop-field">
                <label>سمك الخط (px)</label>
                <input type="number" class="prop-input" id="shapeStrokeWidth" value="${parseFloat(curSW) || 3}" min="1" max="40" />
              </div>
            </div>
          </div>
        `;

        const sStr = document.getElementById('shapeStrokeColor');
        const sFill = document.getElementById('shapeFillColor');
        const sFillNone = document.getElementById('shapeFillNoneBtn');
        const sSW = document.getElementById('shapeStrokeWidth');

        if (sStr) sStr.addEventListener('input', () => {
          inner.setAttribute('stroke', sStr.value);
          core.commitChange();
        });
        if (sFill) sFill.addEventListener('input', () => {
          inner.setAttribute('fill', sFill.value);
          core.commitChange();
        });
        if (sFillNone) sFillNone.addEventListener('click', () => {
          inner.setAttribute('fill', 'none');
          core.commitChange();
        });
        if (sSW) sSW.addEventListener('change', () => {
          inner.setAttribute('stroke-width', sSW.value);
          core.commitChange();
        });
      }
    }

    // Align to canvas for single item
    panel.querySelectorAll('.align-action-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        inter.alignSelected(btn.dataset.align, 'canvas');
      });
    });

    // Populate geometry inputs
    const inpX = document.getElementById('elemPropX');
    const inpY = document.getElementById('elemPropY');
    const inpW = document.getElementById('elemPropW');
    const inpH = document.getElementById('elemPropH');
    const opSlider = document.getElementById('elemOpacitySlider');
    const opVal = document.getElementById('elemOpacityVal');

    const b = inter.getElementBBoxInStage(sel.el);
    if (b) {
      if (inpX) inpX.value = Math.round(b.x);
      if (inpY) inpY.value = Math.round(b.y);
      if (inpW) inpW.value = Math.round(b.width);
      if (inpH) inpH.value = Math.round(b.height);
    }

    let opacity = 1;
    if (sel.kind === 'svg') {
      const inner = sel.el.querySelector('[data-annot]') || sel.el;
      opacity = parseFloat(inner.getAttribute('opacity') || sel.el.style.opacity || '1');
    } else {
      opacity = parseFloat(sel.el.style.opacity || '1');
    }
    const opPct = Math.round(opacity * 100);
    if (opSlider) opSlider.value = opPct;
    if (opVal) opVal.textContent = opPct + '%';

    // Apply geometry changes
    async function applyGeometry() {
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
            const curB = inner.getBBox();
            inner.setAttribute('transform', `translate(${newX - curB.x}, ${newY - curB.y})`);
          } catch (_) {}
        }
      } else {
        sel.el.style.left = (newX / (core.state.pdfW || 2000) * 100) + '%';
        sel.el.style.top = (newY / (core.state.pdfH || 2828) * 100) + '%';
        sel.el.style.width = newW + 'px';
        sel.el.style.height = newH + 'px';
      }

      inter.drawSelectionOverlay();
      core.commitChange(pre);
      document.dispatchEvent(new CustomEvent('ipb:elementTransformed'));
    }

    [inpX, inpY, inpW, inpH].forEach(inp => {
      if (inp) {
        inp.addEventListener('change', applyGeometry);
        inp.addEventListener('keydown', e => {
          if (e.key === 'Enter') { inp.blur(); applyGeometry(); }
        });
      }
    });

    if (opSlider) {
      opSlider.addEventListener('input', () => {
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
      opSlider.addEventListener('change', () => core.commitChange());
    }

    // Layer Ordering
    const btnFront = document.getElementById('elemFrontBtn');
    const btnBack = document.getElementById('elemBackBtn');
    const btnFwd = document.getElementById('elemFwdBtn');
    const btnBwd = document.getElementById('elemBwdBtn');
    if (btnFront) btnFront.addEventListener('click', () => {
      inter.bringToFront(sel.el); core.commitChange(); refreshLayersPanel();
    });
    if (btnBack) btnBack.addEventListener('click', () => {
      inter.sendToBack(sel.el); core.commitChange(); refreshLayersPanel();
    });
    if (btnFwd) btnFwd.addEventListener('click', () => {
      inter.bringForward(sel.el); core.commitChange(); refreshLayersPanel();
    });
    if (btnBwd) btnBwd.addEventListener('click', () => {
      inter.sendBackward(sel.el); core.commitChange(); refreshLayersPanel();
    });

    // Duplicate & Delete
    const btnDup = document.getElementById('elemDupBtn');
    const btnDel = document.getElementById('elemDelBtn');
    if (btnDup) btnDup.addEventListener('click', () => inter.duplicateSelectedElements());
    if (btnDel) btnDel.addEventListener('click', () => inter.deleteSelectedElements());
  }

  document.addEventListener('ipb:selectionChanged', renderProps);
  document.addEventListener('ipb:elementTransformed', renderProps);
  document.addEventListener('ipb:pageChanged', renderProps);

  renderProps();
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
  initSidebarToggle();
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
