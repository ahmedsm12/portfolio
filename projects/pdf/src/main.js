/* ============================================================
 * main.js — الشريط + القوائم الفرعية + التهيئة
 * ============================================================ */

import {
  $, PDFJS_BASE, KATEX_CSS,
  UNDO_LIMIT, TOOLS_WITH_SUBMENU,
  stage, submenu, toolbar, fileInput,
  state,
  uid, toast, showSaveStatus, adjustToolbarSize, updateCursorForTool,
  commitChange, snapshot, savePageNow, undo, redo, updateUndoButtons,
  setApplySnapshot, loadKatex, loadScript, loadStyle,
  setLoading,
} from './core.js';

import {
  initPdfJs, loadPdfFile, loadImageFile, renderPage, preloadAllPages,
  initSidebar, renderThumbnails, updatePageIndicator, goToPage,
  bindSlideContextMenu, updateSidebarPadding,
} from './pdf.js';

import {
  addEmbedElement, addMediaElement, openButtonDialog, openMediaPicker, openEmbedDialog,
} from './elements.js';

import {
  saveProjectAsFile, loadProjectFromFile, exportAnnotatedPdf,
} from './storage.js';

import {
  initPointerEvents, installElementHooks, registerApplySnapshot,
  applySnapshotImpl,
  deselect, updateUndoButtonsSafe, updateFloatingToolbarPosition,
  hideFloatingToolbars, closeEquationEditor, bindEquationEditor,
  openEquationEditor, copyElement, pasteElement, updatePasteBtnState,
  uiHooks, undoAction, redoAction,
} from './interaction.js';

/* ============================================================
   §1. SET TOOL
   ============================================================ */
export function setTool(tool) {
  /* إغلاق القائمة الفرعية */
  closeSubmenu();
  closeEquationEditor();

  if (tool !== 'select' && tool !== 'text' && tool !== 'equation') deselect();
  if ((tool === 'text' || tool === 'equation') && state.selected && state.selected.kind === 'text') {
    /* keep selection */
  } else if (tool !== 'select') {
    if (!(state.selected && state.selected.kind === 'text')) deselect();
  }
  state.tool = tool;
  stage.dataset.tool = tool;
  document.querySelectorAll('#toolbar button[data-tool]').forEach(b => {
    b.classList.toggle('active', b.dataset.tool === tool);
  });
  updateCursorForTool();
  if (tool !== 'select') hideFloatingToolbars();
}

/* ============================================================
   §2. SUBMENU
   ============================================================ */
let submenuOwner = null;

function closeSubmenu() {
  submenu.classList.remove('show');
  submenu.innerHTML = '';
  submenuOwner = null;
}

function repositionSubmenu() {
  if (!submenuOwner || !submenu.classList.contains('show')) return;
  const r = submenuOwner.getBoundingClientRect();
  let top = r.top;
  const h = submenu.offsetHeight;
  if (top + h > window.innerHeight - 8) top = window.innerHeight - h - 8;
  if (top < 8) top = 8;
  submenu.style.top = top + 'px';
}

function openSubmenu(ownerBtn, kind) {
  submenuOwner = ownerBtn;
  const t = {
    pen: 'قلم', highlighter: 'قلم تحديد', eraser: 'ممحاة',
    laser: 'ليزر', shape: 'أشكال', text: 'نص',
  }[kind] || '';
  submenu.innerHTML =
    `<div class="submenu-head"><span class="sub-title">${t}</span><button type="button" class="sub-close">×</button></div>` +
    renderSubmenuHTML(kind);
  submenu.classList.add('show');
  requestAnimationFrame(repositionSubmenu);
  bindSubmenuHandlers();
  const cb = submenu.querySelector('.sub-close');
  if (cb) cb.addEventListener('click', closeSubmenu);
}

function renderSubmenuHTML(kind) {
  if (kind === 'pen') return renderPenSubmenu();
  if (kind === 'highlighter') return renderHighlighterSubmenu();
  if (kind === 'eraser') return renderEraserSubmenu();
  if (kind === 'laser') return renderLaserSubmenu();
  if (kind === 'shape') return renderShapeSubmenu();
  if (kind === 'text') return renderTextSubmenu();
  return '';
}

function renderSmoothingSection(current) {
  const labels = ['٠','١','٢','٣'];
  return `<div class="sub-section"><div class="sub-label">نعومة الخط</div><div class="smooth-grid">` +
    labels.map((l, i) => `<button type="button" class="smooth-btn ${i===current?'active':''}" data-smooth="${i}">${l}</button>`).join('') +
    `</div></div>`;
}

function renderPenSubmenu() {
  const colors = ['#000000','#e11d48','#2563eb','#eab308'];
  const sizes = [2,5,10];
  return `
  <div class="sub-section"><div class="sub-label">اللون</div><div class="color-grid">${colors.map(c =>
    `<button type="button" class="color-btn ${c===state.penColor?'active':''}" data-kind="pen" data-color="${c}"><div class="swatch" style="background:${c}"></div></button>`
  ).join('')}</div></div>
  <div class="sub-section"><div class="sub-label">الحجم</div><div class="size-grid">${sizes.map(s =>
    `<button type="button" class="size-btn ${s===state.penSize?'active':''}" data-kind="pen" data-size="${s}"><div class="dot" style="width:${Math.min(20,Math.max(3,s))}px;height:${Math.min(20,Math.max(3,s))}px"></div></button>`
  ).join('')}</div></div>
  ${renderSmoothingSection(state.penSmoothing)}`;
}

function renderHighlighterSubmenu() {
  const colors = ['#ff0000','#2563eb','#22c55e','#eab308'];
  const sizes = [8,16,30];
  return `
  <div class="sub-section"><div class="sub-label">اللون</div><div class="color-grid">${colors.map(c =>
    `<button type="button" class="color-btn ${c===state.highlighterColor?'active':''}" data-kind="highlighter" data-color="${c}"><div class="swatch" style="background:${c}"></div></button>`
  ).join('')}</div></div>
  <div class="sub-section"><div class="sub-label">الحجم</div><div class="size-grid">${sizes.map(s =>
    `<button type="button" class="size-btn ${s===state.highlighterSize?'active':''}" data-kind="highlighter" data-size="${s}"><div class="dot" style="width:${Math.min(20,Math.max(3,s/1.5))}px;height:${Math.min(20,Math.max(3,s/1.5))}px"></div></button>`
  ).join('')}</div></div>
  ${renderSmoothingSection(state.highlighterSmoothing)}`;
}

function renderLaserSubmenu() {
  const colors = ['#ff0000','#2563eb','#22c55e','#eab308'];
  const sizes = [3,6,12];
  const lives = [{ms:2000,l:'2 ث'},{ms:3000,l:'3 ث'},{ms:5000,l:'5 ث'}];
  const innerColors = [
    {c:'#ffffff',t:'أبيض'},{c:'#000000',t:'أسود'},{c:'#ff0000',t:'أحمر'},
    {c:'#2563eb',t:'أزرق'},{c:'#22c55e',t:'أخضر'},{c:'transparent',t:'شفاف'},
  ];
  const glows = [{v:1.5,l:'خفيف'},{v:3,l:'متوسط'},{v:6,l:'قوي'}];
  return `
  <div class="sub-section"><div class="sub-label">لون الـ Glow</div><div class="color-grid">${colors.map(c =>
    `<button type="button" class="color-btn ${c===state.laserColor?'active':''}" data-kind="laser" data-color="${c}"><div class="swatch" style="background:${c}"></div></button>`
  ).join('')}</div></div>
  <div class="sub-section"><div class="sub-label">شدة الـ Glow</div><div class="size-grid">${glows.map(o =>
    `<button type="button" class="size-btn ${o.v===state.laserGlowIntensity?'active':''}" data-kind="laserGlow" data-size="${o.v}">${o.l}</button>`
  ).join('')}</div></div>
  <div class="sub-section"><div class="sub-label">اللون الداخلي</div><div class="color-grid">${innerColors.map(o =>
    `<button type="button" class="color-btn ${o.c===state.laserInnerColor?'active':''} ${o.c==='transparent'?'transparent':''}" data-kind="laserInner" data-color="${o.c}" title="${o.t}"><div class="swatch" style="background:${o.c==='transparent'?'transparent':o.c}"></div></button>`
  ).join('')}</div></div>
  <div class="sub-section"><div class="sub-label">الحجم</div><div class="size-grid">${sizes.map(s =>
    `<button type="button" class="size-btn ${s===state.laserSize?'active':''}" data-kind="laser" data-size="${s}"><div class="dot" style="width:${Math.max(3,s)}px;height:${Math.max(3,s)}px"></div></button>`
  ).join('')}</div></div>
  <div class="sub-section"><div class="sub-label">مدة الظهور</div><div class="size-grid">${lives.map(o =>
    `<button type="button" class="size-btn ${o.ms===state.laserLifeMs?'active':''}" data-kind="laserLife" data-size="${o.ms}">${o.l}</button>`
  ).join('')}</div></div>`;
}

function renderEraserSubmenu() {
  const sizes = [10,20,36];
  return `
  <div class="sub-section"><div class="sub-label">الحجم</div><div class="size-grid">${sizes.map(s =>
    `<button type="button" class="size-btn ${s===state.eraserSize?'active':''}" data-kind="eraser" data-size="${s}"><div class="dot" style="width:${Math.max(3,s/2)}px;height:${Math.max(3,s/2)}px"></div></button>`
  ).join('')}</div></div>
  <div class="sub-section"><div class="color-input-row"><label><input type="checkbox" id="subEraseShapes" ${state.eraserErasesShapes?'checked':''}> امسح الأشكال</label></div></div>`;
}

function renderShapeSubmenu() {
  const kinds = [{k:'rect',l:'▭'},{k:'circle',l:'◯'},{k:'arrow',l:'↗'}];
  const sizes = [2,5,10];
  const startMarkers = [{v:'none',l:'بدون'},{v:'arrow',l:'سهم'},{v:'arrow-hollow',l:'سهم مفرغ'}];
  const endMarkers = [{v:'none',l:'بدون'},{v:'arrow',l:'سهم'},{v:'arrow-hollow',l:'سهم مفرغ'},{v:'circle',l:'دائرة'},{v:'square',l:'مربع'}];
  const caps = [{v:'round',l:'دائري'},{v:'square',l:'مربع'},{v:'butt',l:'مسطح'}];
  return `
  <div class="sub-section"><div class="sub-label">الشكل</div><div class="shape-grid">${kinds.map(o =>
    `<button type="button" class="shape-btn ${o.k===state.shapeKind?'active':''}" data-shape="${o.k}">${o.l}</button>`
  ).join('')}</div></div>
  <div class="sub-section"><div class="sub-label">الحدود</div><div class="color-input-row"><input type="color" id="subShapeStroke" value="${state.shapeStroke}"></div></div>
  <div class="sub-section"><div class="sub-label">التعبئة</div><div class="color-input-row"><input type="color" id="subShapeFill" value="${state.shapeFill}" ${state.shapeFillNone?'disabled':''}></div><div class="color-input-row"><label><input type="checkbox" id="subNoFill" ${state.shapeFillNone?'checked':''}> بدون تعبئة</label></div></div>
  <div class="sub-section"><div class="sub-label">السماكة</div><div class="size-grid">${sizes.map(s =>
    `<button type="button" class="size-btn ${s===state.shapeSize?'active':''}" data-kind="shape" data-size="${s}"><div class="dot" style="width:${Math.max(3,s)}px;height:${Math.max(3,s)}px"></div></button>`
  ).join('')}</div></div>
  <div class="sub-section"><div class="sub-label">بداية الخط</div><div class="marker-grid">${startMarkers.map(o =>
    `<button type="button" class="marker-btn ${o.v===state.shapeLineStart?'active':''}" data-shapestart="${o.v}">${o.l}</button>`
  ).join('')}</div></div>
  <div class="sub-section"><div class="sub-label">نهاية الخط</div><div class="marker-grid">${endMarkers.map(o =>
    `<button type="button" class="marker-btn ${o.v===state.shapeLineEnd?'active':''}" data-shapeend="${o.v}">${o.l}</button>`
  ).join('')}</div></div>
  <div class="sub-section"><div class="sub-label">شكل الطرف</div><div class="marker-grid">${caps.map(o =>
    `<button type="button" class="marker-btn ${o.v===state.shapeLineCap?'active':''}" data-shapecap="${o.v}">${o.l}</button>`
  ).join('')}</div></div>`;
}

function renderTextSubmenu() {
  const colors = ['#000000','#1e3a8a','#e11d48','#2563eb','#22c55e','#eab308','#dc2626','#7c3aed'];
  const sizes = [12,16,20,24,32,48];
  const aligns = [{v:'right',i:'⇥'},{v:'center',i:'↔'},{v:'left',i:'⇤'},{v:'justify',i:'≡'}];
  const allFonts = [...new Set([...(window.__localFonts||[]), ...getDefaultFonts()])];
  const fontOptions = allFonts.map(f =>
    `<option value="${f}" ${f===state.textFamily?'selected':''}>${f}</option>`
  ).join('');
  return `
  <div class="sub-section"><div class="sub-label">محاذاة النص</div><div class="txt-align-grid">${aligns.map(a =>
    `<button type="button" class="txt-align-btn ${a.v===state.textAlign?'active':''}" data-txtalign="${a.v}">${a.i}</button>`
  ).join('')}</div></div>
  <div class="sub-section"><div class="sub-label">اتجاه النص</div><div class="txt-dir-grid">
    <button type="button" class="txt-dir-btn ${state.textDir==='rtl'?'active':''}" data-txtdir="rtl">RTL →</button>
    <button type="button" class="txt-dir-btn ${state.textDir==='ltr'?'active':''}" data-txtdir="ltr">LTR ←</button>
  </div></div>
  <div class="sub-section"><div class="sub-label">الخط</div><select class="font-select" id="subTextFont">${fontOptions}</select></div>
  <div class="sub-section"><div class="sub-label">الحجم</div><div class="size-grid">${sizes.map(s =>
    `<button type="button" class="size-btn ${s===state.textSize?'active':''}" data-kind="textSize" data-size="${s}">${s}</button>`
  ).join('')}</div></div>
  <div class="sub-section"><div class="sub-label">التنسيق</div><div class="txt-style-grid">
    <button type="button" class="txt-style-btn bold ${state.textBold?'active':''}" data-txtstyle="bold"><b>B</b></button>
    <button type="button" class="txt-style-btn italic ${state.textItalic?'active':''}" data-txtstyle="italic"><i>I</i></button>
  </div></div>
  <div class="sub-section"><div class="sub-label">اللون</div><div class="color-grid">${colors.map(c =>
    `<button type="button" class="color-btn ${c===state.textColor?'active':''}" data-kind="textColor" data-color="${c}"><div class="swatch" style="background:${c}"></div></button>`
  ).join('')}</div></div>`;
}

function getDefaultFonts() {
  return ['system-ui','Arial','Tahoma','Times New Roman','Courier New',
          'Georgia','Verdana','Cairo','Tajawal','Amiri',
          'Noto Kufi Arabic','Scheherazade New'];
}

function bindSubmenuHandlers() {
  submenu.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const kind = btn.dataset.kind, color = btn.dataset.color;
      if (kind === 'pen') state.penColor = color;
      else if (kind === 'highlighter') state.highlighterColor = color;
      else if (kind === 'laser') state.laserColor = color;
      else if (kind === 'laserInner') state.laserInnerColor = color;
      else if (kind === 'textColor') state.textColor = color;
      submenu.querySelectorAll(`.color-btn[data-kind="${kind}"]`).forEach(b =>
        b.classList.toggle('active', b.dataset.color === color));
      updateToolbarIndicators();
      updateCursorForTool();
    });
  });
  submenu.querySelectorAll('.size-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const kind = btn.dataset.kind, size = parseFloat(btn.dataset.size);
      if (kind === 'pen') state.penSize = size;
      else if (kind === 'highlighter') state.highlighterSize = size;
      else if (kind === 'eraser') state.eraserSize = size;
      else if (kind === 'laser') state.laserSize = size;
      else if (kind === 'laserGlow') state.laserGlowIntensity = size;
      else if (kind === 'laserLife') state.laserLifeMs = size;
      else if (kind === 'shape') state.shapeSize = size;
      else if (kind === 'textSize') state.textSize = size;
      submenu.querySelectorAll(`.size-btn[data-kind="${kind}"]`).forEach(b =>
        b.classList.toggle('active', parseFloat(b.dataset.size) === size));
      updateCursorForTool();
    });
  });
  submenu.querySelectorAll('.shape-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.shapeKind = btn.dataset.shape;
      submenu.querySelectorAll('.shape-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.shape === state.shapeKind));
    });
  });
  submenu.querySelectorAll('.smooth-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const lvl = parseInt(btn.dataset.smooth, 10);
      if (state.tool === 'highlighter') state.highlighterSmoothing = lvl;
      else state.penSmoothing = lvl;
      submenu.querySelectorAll('.smooth-btn').forEach(b =>
        b.classList.toggle('active', parseInt(b.dataset.smooth, 10) === lvl));
    });
  });
  submenu.querySelectorAll('.txt-align-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.textAlign = btn.dataset.txtalign;
      submenu.querySelectorAll('.txt-align-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.txtalign === state.textAlign));
    });
  });
  submenu.querySelectorAll('.txt-dir-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.textDir = btn.dataset.txtdir;
      submenu.querySelectorAll('.txt-dir-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.txtdir === state.textDir));
    });
  });
  submenu.querySelectorAll('.txt-style-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const s = btn.dataset.txtstyle;
      if (s === 'bold') { state.textBold = !state.textBold; btn.classList.toggle('active', state.textBold); }
      else if (s === 'italic') { state.textItalic = !state.textItalic; btn.classList.toggle('active', state.textItalic); }
    });
  });
  submenu.querySelectorAll('[data-shapestart]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.shapeLineStart = btn.dataset.shapestart;
      submenu.querySelectorAll('[data-shapestart]').forEach(b =>
        b.classList.toggle('active', b.dataset.shapestart === state.shapeLineStart));
    });
  });
  submenu.querySelectorAll('[data-shapeend]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.shapeLineEnd = btn.dataset.shapeend;
      submenu.querySelectorAll('[data-shapeend]').forEach(b =>
        b.classList.toggle('active', b.dataset.shapeend === state.shapeLineEnd));
    });
  });
  submenu.querySelectorAll('[data-shapecap]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.shapeLineCap = btn.dataset.shapecap;
      submenu.querySelectorAll('[data-shapecap]').forEach(b =>
        b.classList.toggle('active', b.dataset.shapecap === state.shapeLineCap));
    });
  });
}

submenu.addEventListener('input', e => {
  if (e.target.id === 'subShapeStroke') state.shapeStroke = e.target.value;
  if (e.target.id === 'subShapeFill') state.shapeFill = e.target.value;
  if (e.target.id === 'subNoFill') {
    state.shapeFillNone = e.target.checked;
    const fi = submenu.querySelector('#subShapeFill');
    if (fi) fi.disabled = state.shapeFillNone;
  }
  if (e.target.id === 'subEraseShapes') state.eraserErasesShapes = e.target.checked;
  if (e.target.id === 'subTextFont') state.textFamily = e.target.value;
});

/* ============================================================
   §3. TOOLBAR
   ============================================================ */
function updateToolbarIndicators() {
  const p = toolbar.querySelector('button[data-tool="pen"]');
  const hh = toolbar.querySelector('button[data-tool="highlighter"]');
  const l = toolbar.querySelector('button[data-tool="laser"]');
  const t = toolbar.querySelector('button[data-tool="text"]');
  const eq = toolbar.querySelector('button[data-tool="equation"]');
  if (p) p.style.setProperty('--indicator', state.penColor);
  if (hh) hh.style.setProperty('--indicator', state.highlighterColor);
  if (l) l.style.setProperty('--indicator', state.laserColor);
  if (t) t.style.setProperty('--indicator', state.textColor);
  if (eq) eq.style.setProperty('--indicator', state.equationColor);
}

function bindToolbar() {
  toolbar.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (btn.id === 'btnUndo') { await undoAction(); return; }
      if (btn.id === 'btnRedo') { await redoAction(); return; }
      if (btn.id === 'btnPaste') { pasteElement(); return; }
      if (btn.id === 'btnResetZoom') { resetView(); return; }
      if (btn.id === 'btnFullscreen') { toggleFullscreen(); return; }
      if (btn.id === 'btnOpen') { fileInput.click(); return; }
      if (btn.id === 'btnExport') { exportAnnotatedPdf(); return; }
      if (btn.id === 'btnSave') { await saveProjectAsFile(); return; }

      const tool = btn.dataset.tool;
      if (!tool) return;

      if (tool === 'embed') { openEmbedDialog(); setTool('embed'); return; }
      if (tool === 'button') { openButtonDialog(); setTool('button'); return; }
      if (tool === 'media') { openMediaPicker(); setTool('media'); return; }
      if (tool === 'equation') { setTool('equation'); openEquationEditor(null); return; }

      const hasSub = btn.dataset.submenu;
      setTool(tool);
      if (hasSub) openSubmenu(btn, tool);
    });
  });
}

function resetView() {
  state.view.scale = 1;
  state.view.tx = 0;
  state.view.ty = 0;
  import('./pdf.js').then(m => m.applyView());
  toast('تم إعادة الضبط', 'ok');
}

function toggleFullscreen() {
  const el = document.documentElement;
  if (!document.fullscreenElement && !document.webkitFullscreenElement) {
    if (el.requestFullscreen) el.requestFullscreen().catch(console.warn);
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  } else {
    if (document.exitFullscreen) document.exitFullscreen().catch(console.warn);
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
  }
}

/* ============================================================
   §4. KEYBOARD
   ============================================================ */
function bindKeyboard() {
  document.addEventListener('keydown', async e => {
    if (e.target.matches('input, textarea, select')) return;
    if (e.target.isContentEditable) return;

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
      e.preventDefault(); await undoAction(); return;
    }
    if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' ||
        (e.shiftKey && e.key.toLowerCase() === 'z'))) {
      e.preventDefault(); await redoAction(); return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault(); await saveProjectAsFile(); return;
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (state.selected) {
        const pre = snapshot();
        const sel = state.selected;
        if (sel.kind === 'media') {
          try {
            const v = sel.el.querySelector('video');
            if (v) { v.pause(); v.src = ''; }
          } catch (_) {}
        }
        sel.el.remove();
        state.selected = null;
        hideFloatingToolbars();
        commitChange(pre);
        e.preventDefault();
      }
      return;
    }
    if (e.key === 'Escape') {
      deselect();
      closeSubmenu();
      closeEquationEditor();
      e.preventDefault();
      return;
    }
    const map = { h:'hand', v:'select', p:'pen', m:'highlighter',
                  e:'eraser', a:'laser', s:'shape', t:'text' };
    const t = map[e.key.toLowerCase()];
    if (t) {
      const btn = toolbar.querySelector(`button[data-tool="${t}"]`);
      if (btn && btn.dataset.submenu) {
        setTool(t);
        openSubmenu(btn, t);
      } else setTool(t);
    }
    if (e.key === 'ArrowRight') import('./pdf.js').then(m => m.goToPage(state.currentPage + 1));
    if (e.key === 'ArrowLeft') import('./pdf.js').then(m => m.goToPage(state.currentPage - 1));
  });
}

/* ============================================================
   §5. FILE INPUT + DRAG/DROP + CONTEXTMENU
   ============================================================ */
function bindFileInput() {
  fileInput.addEventListener('change', async e => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const isActPdf = /\.actpdf$/i.test(f.name);
      if (isActPdf) await loadProjectFromFile(f);
      else if (f.type === 'application/pdf' || /\.pdf$/i.test(f.name)) await loadPdfFile(f);
      else if (/^image\//.test(f.type)) await loadImageFile(f);
      else alert('نوع الملف غير مدعوم');
    } catch (err) {
      console.error(err);
      alert('خطأ: ' + err.message);
    }
    fileInput.value = '';
  });

  $('btnOpenEmpty').addEventListener('click', () => fileInput.click());
}

function bindGlobalListeners() {
  document.addEventListener('dragover', e => e.preventDefault());
  document.addEventListener('drop', e => e.preventDefault());
  document.addEventListener('contextmenu', e => e.preventDefault());

  window.addEventListener('resize', () => {
    adjustToolbarSize();
    clearTimeout(window.__resizeTimer);
    window.__resizeTimer = setTimeout(async () => {
      if (state.totalPages && state.currentPage) {
        savePageNow();
        await renderPage(state.currentPage);
      }
      updateFloatingToolbarPosition();
    }, 250);
  });

  window.addEventListener('orientationchange', () => {
    setTimeout(() => window.dispatchEvent(new Event('resize')), 300);
  });

  /* page nav buttons */
  $('btnPrev').addEventListener('click', () => goToPage(state.currentPage - 1));
  $('btnNext').addEventListener('click', () => goToPage(state.currentPage + 1));
}

/* ============================================================
   §6. INIT
   ============================================================ */
async function loadLocalFonts() {
  if (!('queryLocalFonts' in window)) return [];
  try {
    const fonts = await window.queryLocalFonts();
    return [...new Set(fonts.map(f => f.family))].sort();
  } catch (e) { return []; }
}

async function init() {
  /* 1) تحميل KaTeX */
  await loadKatex();
  await import('./core.js').then(m => m.loadKatex ? null : null);

  /* 2) تحميل pdf.js */
  await initPdfJs();

  /* 3) ربط الـ UI hooks */
  uiHooks.setTool = setTool;
  uiHooks.closeSubmenu = closeSubmenu;

  /* 4) تسجيل applySnapshot */
  setApplySnapshot(applySnapshotImpl);

  /* 5) تثبيت hooks العناصر */
  installElementHooks();

  /* 6) ربط أحداث الـ pointer */
  initPointerEvents();

  /* 7) ضبط حجم الشريط */
  adjustToolbarSize();

  /* 8) الشريط + المفاتيح + الملفات */
  bindToolbar();
  bindKeyboard();
  bindFileInput();
  bindGlobalListeners();
  bindSlideContextMenu();
  bindEquationEditor();

  /* 9) الشريط الجانبي */
  initSidebar();

  /* 10) تحميل الخطوط المحلية (إن كانت مدعومة) */
  try {
    const fonts = await loadLocalFonts();
    window.__localFonts = fonts;
  } catch (_) { window.__localFonts = []; }

  /* 11) الوضع الابتدائي */
  setTool('select');
  updateToolbarIndicators();
  updateUndoButtons();
  updatePasteBtnState();
  updatePageIndicator();

  /* 12) مراقبة clipboard لتحديث زر اللصق */
  const origCopy = copyElement;
  setInterval(updatePasteBtnState, 1500);
    /* ====== تصحيح فقط: عرض المتغيرات على window ====== */
  if (typeof window !== 'undefined') {
    window.__APP__ = {
      state,
      get pdfjsLib() { return import('./pdf.js').then(m => m.pdfjsLib); },
      get pages() { return state.pages; },
      get slides() { return state.slides; },
      reload: () => location.reload(),
    };
  }
  /* ====== مراقبة التعديلات لالتقاط thumbnail تلقائياً ====== */
  import('./pdf.js').then(pdf => {
    let thumbTimer = null;
    const scheduleCapture = () => {
      clearTimeout(thumbTimer);
      thumbTimer = setTimeout(() => {
        pdf.captureStageThumbnail(state.currentPage).catch(() => {});
      }, 900);
    };

    const stageEl = document.getElementById('stage');
    if (stageEl) {
      stageEl.addEventListener('pointerup', scheduleCapture);
      stageEl.addEventListener('pointercancel', scheduleCapture);
    }
    document.addEventListener('keyup', (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') scheduleCapture();
    });
  });
}	

/* ============================================================
   §7. BOOT
   ============================================================ */
init().catch(err => {
  console.error(err);
  document.body.innerHTML = '<div style="padding:40px;color:#ffb4b4;text-align:center;font-family:system-ui">' +
    'تعذّر إقلاع التطبيق: ' + (err.message || err) + '</div>';
});