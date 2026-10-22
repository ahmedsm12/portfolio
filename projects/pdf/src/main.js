/* ============================================================
 * main.js — الشريط + القوائم الفرعية + التهيئة
 * ============================================================
 *  ★ Undo شامل عبر الشرائح (من core.js)
 *  ★ Dirty state + beforeunload
 *  ★ Auto-save + Recovery عند البدء
 *  ★ Zoom بـ Ctrl+Wheel + pinch على التراك باد
 *  ★ اختصارات كاملة (Ctrl+A/D/X/G, Nudge, Space+Drag, Alt+Drag)
 * ============================================================ */

import {
  $, PDFJS_BASE, KATEX_CSS,
  UNDO_LIMIT, TOOLS_WITH_SUBMENU,
  stage, submenu, toolbar, fileInput,
  transientCanvas,
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
  applyElementDelta, drawSelectionOverlay,
  deleteSelectedElements, duplicateSelectedElements,
  getAllSelectableElements,
} from './interaction.js';

import { initUIShell } from './ui-shell.js';
import { initNewProject } from './new-project.js';

/* ============================================================
   §1. SET TOOL
   ============================================================ */
export function setTool(tool) {
  closeSubmenu();
  closeEquationEditor();

  if (tool !== 'select') deselect();
  if (tool !== 'select') hideFloatingToolbars();

  if (transientCanvas) transientCanvas.style.display = 'block';

  if ((tool === 'text' || tool === 'equation') && state.selected && state.selected.kind === 'text') {
    // keep selection
  } else if (tool !== 'select') {
    if (!(state.selected && state.selected.kind === 'text')) deselect();
  }
  state.tool = tool;
  if (stage) stage.dataset.tool = tool;
  document.querySelectorAll('#toolbar button[data-tool]').forEach(b => {
    b.classList.toggle('active', b.dataset.tool === tool);
  });
  updateCursorForTool();
  if (tool !== 'select') hideFloatingToolbars();
  document.dispatchEvent(new CustomEvent('ipb:toolChanged', { detail: { tool } }));
}

/* ============================================================
   §2. SUBMENU
   ============================================================ */
let submenuOwner = null;

export function closeSubmenu() {
  if (!submenu) return;
  submenu.classList.remove('show');
  submenu.innerHTML = '';
  submenuOwner = null;
}

export function repositionSubmenu() {
  if (!submenuOwner || !submenu || !submenu.classList.contains('show')) return;
  const r = submenuOwner.getBoundingClientRect();
  const h = submenu.offsetHeight;
  const w = submenu.offsetWidth;

  const rightOffset = Math.max(10, (window.innerWidth - r.left) + 8);
  let top = r.top + (r.height / 2) - (h / 2);

  if (top + h > window.innerHeight - 12) top = window.innerHeight - h - 12;
  if (top < 12) top = 12;

  submenu.style.top = top + 'px';
  submenu.style.right = rightOffset + 'px';
  submenu.style.left = 'auto';
}

export function openSubmenu(ownerBtn, kind) {
  if (!submenu) return;
  if (typeof ownerBtn === 'string' && (typeof kind === 'object' || !kind)) {
    const tmp = ownerBtn;
    ownerBtn = kind;
    kind = tmp;
  }
  if (!ownerBtn && kind) {
    ownerBtn = document.querySelector(`#toolbar button[data-submenu="${kind}"]`)
            || document.querySelector(`#toolbar button[data-tool="${kind}"]`);
  }
  if (!ownerBtn) {
    ownerBtn = document.getElementById('toolbar');
  }
  submenuOwner = ownerBtn;
  submenu.dataset.currentKind = kind;
  if (kind === 'shape') {
    submenu.classList.add('submenu-shape-mode');
  } else {
    submenu.classList.remove('submenu-shape-mode');
  }
  const t = {
    pen: 'قلم', highlighter: 'قلم تحديد', eraser: 'ممحاة',
    laser: 'ليزر', shape: 'أشكال هندسية ودارات', text: 'نص',
    equation: 'معادلة',
  }[kind] || 'خيارات الأداة';
  submenu.innerHTML =
    `<div class="submenu-head"><span class="sub-title">${t}</span><button type="button" class="sub-close" title="إغلاق القائمة">✕</button></div>` +
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
  if (kind === 'equation') return '';
  return '';
}

function renderSmoothingSection(current) {
  const labels = ['بدون','خفيف','متوسط','عالي'];
  return `<div class="sub-section"><div class="sub-label">النعومة</div><div class="smooth-grid">` +
    labels.map((l, i) => `<button type="button" class="smooth-btn ${i===current?'active':''}" data-smooth="${i}">${l}</button>`).join('') +
    `</div></div>`;
}

function renderPenSubmenu() {
  const colors = ['#000000','#2563eb','#dc2626','#16a34a','#eab308','#9333ea','#ffffff'];
  const sizes = [2,5,10,16];
  return `
  <div class="sub-section"><div class="sub-label">اللون</div><div class="color-grid">${colors.map(c =>
    `<button type="button" class="color-btn ${c===state.penColor?'active':''}" data-kind="pen" data-color="${c}"><div class="swatch" style="background:${c}"></div></button>`
  ).join('')}
  <input type="color" id="subPenCustomColor" value="${state.penColor}" style="width:24px;height:24px;border:none;background:transparent;cursor:pointer;border-radius:4px" title="لون مخصص">
  </div></div>
  <div class="sub-section"><div class="sub-label">الحجم</div><div class="size-grid">${sizes.map(s =>
    `<button type="button" class="size-btn ${s===state.penSize?'active':''}" data-kind="pen" data-size="${s}"><div class="dot" style="width:${Math.min(18,Math.max(4,s))}px;height:${Math.min(18,Math.max(4,s))}px"></div><span style="font-size:9.5px">${s}</span></button>`
  ).join('')}</div></div>
  ${renderSmoothingSection(state.penSmoothing)}`;
}

function renderHighlighterSubmenu() {
  const colors = ['#fde047','#86efac','#93c5fd','#f472b6','#fdba74'];
  const sizes = [10,18,28,40];
  return `
  <div class="sub-section"><div class="sub-label">اللون</div><div class="color-grid">${colors.map(c =>
    `<button type="button" class="color-btn ${c===state.highlighterColor?'active':''}" data-kind="highlighter" data-color="${c}"><div class="swatch" style="background:${c}"></div></button>`
  ).join('')}</div></div>
  <div class="sub-section"><div class="sub-label">الحجم</div><div class="size-grid">${sizes.map(s =>
    `<button type="button" class="size-btn ${s===state.highlighterSize?'active':''}" data-kind="highlighter" data-size="${s}"><div class="dot" style="width:${Math.min(18,Math.max(5,s/2))}px;height:${Math.min(18,Math.max(5,s/2))}px"></div><span style="font-size:9.5px">${s}</span></button>`
  ).join('')}</div></div>
  ${renderSmoothingSection(state.highlighterSmoothing)}`;
}

function renderLaserSubmenu() {
  const colors = ['#ff0000','#2563eb','#22c55e','#eab308'];
  const sizes = [4,8,14];
  const lives = [{ms:2000,l:'2 ث'},{ms:3000,l:'3 ث'},{ms:5000,l:'5 ث'}];
  const innerColors = [
    {c:'#ffffff',t:'أبيض'},{c:'#000000',t:'أسود'},{c:'#ff0000',t:'أحمر'},
    {c:'#2563eb',t:'أزرق'},{c:'#22c55e',t:'أخضر'},{c:'transparent',t:'شفاف'},
  ];
  const glows = [{v:1.5,l:'خفيف'},{v:3,l:'متوسط'},{v:6,l:'قوي'}];
  return `
  <div class="sub-section"><div class="sub-label">لون Glow</div><div class="color-grid">${colors.map(c =>
    `<button type="button" class="color-btn ${c===state.laserColor?'active':''}" data-kind="laser" data-color="${c}"><div class="swatch" style="background:${c}"></div></button>`
  ).join('')}</div></div>
  <div class="sub-section"><div class="sub-label">الشدة</div><div class="size-grid">${glows.map(o =>
    `<button type="button" class="size-btn ${o.v===state.laserGlowIntensity?'active':''}" data-kind="laserGlow" data-size="${o.v}">${o.l}</button>`
  ).join('')}</div></div>
  <div class="sub-section"><div class="sub-label">القلب الداخلي</div><div class="color-grid">${innerColors.map(o =>
    `<button type="button" class="color-btn ${o.c===state.laserInnerColor?'active':''} ${o.c==='transparent'?'transparent':''}" data-kind="laserInner" data-color="${o.c}" title="${o.t}"><div class="swatch" style="background:${o.c==='transparent'?'transparent':o.c}"></div></button>`
  ).join('')}</div></div>
  <div class="sub-section"><div class="sub-label">الحجم</div><div class="size-grid">${sizes.map(s =>
    `<button type="button" class="size-btn ${s===state.laserSize?'active':''}" data-kind="laser" data-size="${s}"><div class="dot" style="width:${Math.max(4,s)}px;height:${Math.max(4,s)}px"></div><span style="font-size:9.5px">${s}</span></button>`
  ).join('')}</div></div>
  <div class="sub-section"><div class="sub-label">المدة</div><div class="size-grid">${lives.map(o =>
    `<button type="button" class="size-btn ${o.ms===state.laserLifeMs?'active':''}" data-kind="laserLife" data-size="${o.ms}">${o.l}</button>`
  ).join('')}</div></div>`;
}

function renderEraserSubmenu() {
  const sizes = [12,24,40];
  return `
  <div class="sub-section"><div class="sub-label">الحجم</div><div class="size-grid">${sizes.map(s =>
    `<button type="button" class="size-btn ${s===state.eraserSize?'active':''}" data-kind="eraser" data-size="${s}"><div class="dot" style="width:${Math.max(4,s/2)}px;height:${Math.max(4,s/2)}px"></div><span style="font-size:9.5px">${s}</span></button>`
  ).join('')}</div></div>
  <div class="sub-section"><div class="color-input-row"><label style="font-size:11px;cursor:pointer"><input type="checkbox" id="subEraseShapes" ${state.eraserErasesShapes?'checked':''}> مسح الأشكال</label></div></div>`;
}

function renderShapeSubmenu() {
  const currentCat = state.shapeCategory || 'basic';
  const categories = [
    { id: 'basic', label: '🔷 هندسية' },
    { id: 'lines', label: '〰️ خطوط ومنحنيات' },
    { id: 'circuits', label: '⚡ دارات كهربائية' },
    { id: 'math', label: '📈 مستوى ديكارتي' },
  ];

  const shapesByCat = {
    basic: [
      { k: 'rect', l: '▭', t: 'مستطيل' },
      { k: 'rounded-rect', l: '▢', t: 'مستطيل مدور' },
      { k: 'circle', l: '◯', t: 'دائرة / بيضاوي' },
      { k: 'triangle', l: '△', t: 'مثلث متساوي الساقين' },
      { k: 'right-triangle', l: '⊿', t: 'مثلث قائم الزاوية' },
      { k: 'cylinder', l: '🛢️', t: 'أسطوانة ثلاثية الأبعاد' },
      { k: 'diamond', l: '◇', t: 'معين' },
      { k: 'star', l: '★', t: 'نجمة خماسية' },
      { k: 'hexagon', l: '⬡', t: 'مسدس منتظم' },
      { k: 'block-arrow', l: '➔', t: 'سهم عريض' },
    ],
    lines: [
      { k: 'arrow', l: '↗', t: 'سهم أحادي' },
      { k: 'double-arrow', l: '⬄', t: 'سهم ثنائي' },
      { k: 'line', l: '╱', t: 'خط مستقيم' },
      { k: 'curve', l: '〰️', t: 'منحنى قابل لتعديل نقاط التحكم' },
    ],
    circuits: [
      { k: 'circuit-battery', l: '🔋', t: 'بطارية DC' },
      { k: 'circuit-resistor', l: '⚡', t: 'مقاومة كهربائية R' },
      { k: 'circuit-switch', l: '⏻', t: 'مفتاح مفتوح Switch' },
      { k: 'circuit-switch-closed', l: '━', t: 'مفتاح مغلق' },
      { k: 'circuit-lamp', l: '💡', t: 'مصباح كهربائي' },
      { k: 'circuit-capacitor', l: '⫽', t: 'مكثف كهربائي C' },
      { k: 'circuit-inductor', l: '∿', t: 'ملف / محث L' },
      { k: 'circuit-ground', l: '⏚', t: 'تأريض (أرضي)' },
      { k: 'circuit-ammeter', l: 'Ⓐ', t: 'أمبيرمتر' },
      { k: 'circuit-voltmeter', l: 'Ⓥ', t: 'فولتميتر' },
      { k: 'circuit-ac', l: '〜', t: 'مصدر تيار متناوب AC' },
      { k: 'circuit-wire', l: '⌐', t: 'سلك توصيل زاوية' },
    ],
    math: [
      { k: 'cartesian', l: '📈', t: 'مستوى ديكارتي قابل للتعديل' },
    ],
  };

  const activeShapes = shapesByCat[currentCat] || shapesByCat.basic;
  const sizes = [2, 4, 8];
  const startMarkers = [{v:'none',l:'بدون'},{v:'arrow',l:'سهم'},{v:'arrow-hollow',l:'سهم مفرغ'}];
  const endMarkers = [{v:'none',l:'بدون'},{v:'arrow',l:'سهم'},{v:'arrow-hollow',l:'سهم مفرغ'},{v:'circle',l:'دائرة'},{v:'square',l:'مربع'}];
  const caps = [{v:'round',l:'دائري'},{v:'square',l:'مربع'},{v:'butt',l:'مسطح'}];

  const catTabsHtml = `<div class="shape-cat-tabs">` +
    categories.map(c => `<button type="button" class="shape-cat-tab ${c.id===currentCat?'active':''}" data-shapecat="${c.id}">${c.label}</button>`).join('') +
    `</div>`;

  const shapesGridHtml = `<div class="sub-section"><div class="shape-grid">` +
    activeShapes.map(o => `<button type="button" class="shape-btn ${o.k===state.shapeKind?'active':''}" data-shape="${o.k}" title="${o.t}">${o.l}</button>`).join('') +
    `</div></div>`;

  const isLineOrCurve = ['line','arrow','double-arrow','curve'].includes(state.shapeKind);
  const isRect = state.shapeKind === 'rect' || state.shapeKind === 'rounded-rect';

  let rectCornerHtml = '';
  if (isRect) {
    rectCornerHtml = `
      <div class="sub-section">
        <div class="sub-label">استدارة الحواف</div>
        <div style="display:flex;align-items:center;gap:6px">
          <input type="range" id="subShapeCornerRadius" min="0" max="60" value="${state.shapeCornerRadius || 0}" style="flex:1;accent-color:var(--sh-accent);cursor:pointer">
          <span style="font-size:10px;min-width:26px;color:#cbd5e1">${state.shapeCornerRadius || 0}px</span>
        </div>
      </div>
    `;
  }

  let lineOptionsHtml = '';
  if (isLineOrCurve) {
    lineOptionsHtml = `
      <div class="sub-section"><div class="sub-label">بداية الخط</div><div class="marker-grid">${startMarkers.map(o =>
        `<button type="button" class="marker-btn ${o.v===state.shapeLineStart?'active':''}" data-shapestart="${o.v}">${o.l}</button>`
      ).join('')}</div></div>
      <div class="sub-section"><div class="sub-label">نهاية الخط</div><div class="marker-grid">${endMarkers.map(o =>
        `<button type="button" class="marker-btn ${o.v===state.shapeLineEnd?'active':''}" data-shapeend="${o.v}">${o.l}</button>`
      ).join('')}</div></div>
      <div class="sub-section"><div class="sub-label">شكل الطرف</div><div class="marker-grid">${caps.map(o =>
        `<button type="button" class="marker-btn ${o.v===state.shapeLineCap?'active':''}" data-shapecap="${o.v}">${o.l}</button>`
      ).join('')}</div></div>
    `;
  }

  return `
    ${catTabsHtml}
    ${shapesGridHtml}
    ${rectCornerHtml}
    <div class="sub-section"><div class="sub-label">الحدود</div><div class="color-input-row"><input type="color" id="subShapeStroke" value="${state.shapeStroke}"></div></div>
    <div class="sub-section"><div class="sub-label">التعبئة</div><div class="color-input-row"><input type="color" id="subShapeFill" value="${state.shapeFill}" ${state.shapeFillNone?'disabled':''}></div><div class="color-input-row"><label><input type="checkbox" id="subNoFill" ${state.shapeFillNone?'checked':''}> بدون تعبئة</label></div></div>
    <div class="sub-section"><div class="sub-label">السماكة</div><div class="size-grid">${sizes.map(s =>
      `<button type="button" class="size-btn ${s===state.shapeSize?'active':''}" data-kind="shape" data-size="${s}"><div class="dot" style="width:${Math.max(3,s)}px;height:${Math.max(3,s)}px"></div></button>`
    ).join('')}</div></div>
    ${lineOptionsHtml}
  `;
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
  if (!submenu) return;
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
  submenu.querySelectorAll('.shape-cat-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      state.shapeCategory = btn.dataset.shapecat;
      openSubmenu(submenuOwner, 'shape');
    });
  });
  submenu.querySelectorAll('.shape-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.shapeKind = btn.dataset.shape;
      if (state.shapeKind === 'rounded-rect' && !state.shapeCornerRadius) {
        state.shapeCornerRadius = 24;
      }
      openSubmenu(submenuOwner, 'shape');
    });
  });
  const subRadiusInput = submenu.querySelector('#subShapeCornerRadius');
  if (subRadiusInput) {
    subRadiusInput.addEventListener('input', e => {
      state.shapeCornerRadius = parseInt(e.target.value, 10) || 0;
      const lbl = subRadiusInput.nextElementSibling;
      if (lbl) lbl.textContent = state.shapeCornerRadius + 'px';
    });
  }
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

if (submenu) {
  submenu.addEventListener('input', e => {
    if (e.target.id === 'subPenCustomColor') {
      state.penColor = e.target.value;
      updateToolbarIndicators();
      updateCursorForTool();
      document.dispatchEvent(new CustomEvent('ipb:toolConfigChanged'));
    }
    if (e.target.id === 'subShapeStroke') state.shapeStroke = e.target.value;
    if (e.target.id === 'subShapeFill') state.shapeFill = e.target.value;
    if (e.target.id === 'subNoFill') {
      state.shapeFillNone = e.target.checked;
      const fi = submenu.querySelector('#subShapeFill');
      if (fi) fi.disabled = state.shapeFillNone;
    }
    if (e.target.id === 'subEraseShapes') state.eraserErasesShapes = e.target.checked;
    if (e.target.id === 'subTextFont') state.textFamily = e.target.value;
    document.dispatchEvent(new CustomEvent('ipb:toolConfigChanged'));
  });
}

/* ============================================================
   §3. TOOLBAR
   ============================================================ */
export function updateToolbarIndicators() {
  if (!toolbar) return;
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
  if (!toolbar) return;
  toolbar.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (btn.id === 'btnUndo') { await undoAction(); return; }
      if (btn.id === 'btnRedo') { await redoAction(); return; }
      if (btn.id === 'btnPaste') { pasteElement(); return; }
      if (btn.id === 'btnResetZoom') { resetView(); return; }
      if (btn.id === 'btnFullscreen') { toggleFullscreen(); return; }
      if (btn.id === 'btnOpen') { fileInput.click(); return; }
      if (btn.id === 'btnExport') { exportAnnotatedPdf(); return; }
      if (btn.id === 'btnSave') {
        const storage = await import('./storage.js');
        await storage.saveProjectOver();
        return;
      }

      const tool = btn.dataset.tool;
      if (!tool) return;

      if (tool === 'embed') { openEmbedDialog(); setTool('embed'); return; }
      if (tool === 'button') { openButtonDialog(); setTool('button'); return; }
      if (tool === 'media') { openMediaPicker(); setTool('media'); return; }
      if (tool === 'equation') { setTool('equation'); openEquationEditor(null); return; }
      if (tool === 'text') {
        setTool('text');
        import('./ui-shell.js').then(m => m.switchPropsTab('design'));
        return;
      }
      if (tool === 'shape') {
        setTool('shape');
        import('./ui-shell.js').then(m => m.switchPropsTab('design'));
        return;
      }

      const hasSub = btn.dataset.submenu;
      if (state.tool === tool && hasSub && submenu && submenu.classList.contains('show')) {
        closeSubmenu();
        return;
      }
      setTool(tool);
      if (hasSub) openSubmenu(btn, tool);
    });
  });

  document.addEventListener('pointerdown', e => {
    if (!submenu || !submenu.classList.contains('show')) return;
    if (e.target.closest('#submenu') || e.target.closest('#toolbar')) return;
    closeSubmenu();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && submenu && submenu.classList.contains('show')) {
      closeSubmenu();
    }
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
let _nudgePre = null;
let _nudgeTimer = null;

function flushNudgeCommit() {
  if (_nudgePre) {
    clearTimeout(_nudgeTimer);
    try { commitChange(_nudgePre); } catch (_) {}
    _nudgePre = null;
  }
}

function nudgeSelection(dxPdf, dyPdf) {
  const items = state.selectedList && state.selectedList.length > 0
    ? state.selectedList
    : (state.selected ? [state.selected] : []);
  if (items.length === 0) return;

  if (!_nudgePre) _nudgePre = snapshot();
  clearTimeout(_nudgeTimer);
  _nudgeTimer = setTimeout(() => {
    if (_nudgePre) {
      try { commitChange(_nudgePre); } catch (_) {}
      _nudgePre = null;
    }
  }, 500);

  items.forEach(it => {
    try { applyElementDelta(it, dxPdf, dyPdf); } catch (_) {}
  });
  drawSelectionOverlay();
  document.dispatchEvent(new CustomEvent('ipb:elementTransformed'));
}

function bindKeyboard() {
  document.addEventListener('keydown', async e => {
    if (e.target.matches('input, textarea, select')) return;
    if (e.target.isContentEditable) return;

    // ═══ ملفات ═══
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 's') {
      e.preventDefault();
      const storage = await import('./storage.js');
      await storage.saveProjectOver();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 's') {
      e.preventDefault();
      const storage = await import('./storage.js');
      await storage.saveProjectAsFile();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
      e.preventDefault();
      const fi = document.getElementById('fileInput');
      if (fi) fi.click();
      return;
    }

    // ═══ تاريخ ═══
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
      e.preventDefault();
      flushNudgeCommit();
      await undoAction(); return;
    }
    if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' ||
        (e.shiftKey && e.key.toLowerCase() === 'z'))) {
      e.preventDefault();
      flushNudgeCommit();
      await redoAction(); return;
    }

    // ═══ تحديد الكل ═══
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      const items = getAllSelectableElements();
      if (items.length === 0) return;
      deselect();
      state.selectedList = items;
      state.selected = items[0] || null;
      items.forEach(it => it.el.classList.add('selected'));
      drawSelectionOverlay();
      document.dispatchEvent(new CustomEvent('ipb:selectionChanged', {
        detail: { selected: state.selected, list: state.selectedList },
      }));
      return;
    }

    // ═══ نسخ ═══
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
      const sel = state.selectedList && state.selectedList.length > 0 ? state.selectedList[0] : state.selected;
      if (sel && sel.el) {
        e.preventDefault();
        copyElement(sel.el);
        return;
      }
    }

    // ═══ قص ═══
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x') {
      const sel = state.selectedList && state.selectedList.length > 0 ? state.selectedList[0] : state.selected;
      if (sel && sel.el) {
        e.preventDefault();
        copyElement(sel.el);
        deleteSelectedElements();
        return;
      }
    }

    // ═══ لصق ═══
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
      e.preventDefault();
      pasteElement(!!e.shiftKey);
      return;
    }

    // ═══ تكرار ═══
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      duplicateSelectedElements();
      return;
    }

    // ═══ تجميع (غير مدعوم بعد) ═══
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g') {
      e.preventDefault();
      toast('التجميع (Group) غير مدعوم بعد — قيد التطوير', 'info');
      return;
    }

    // ═══ حذف ═══
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (state.selected || (state.selectedList && state.selectedList.length)) {
        e.preventDefault();
        deleteSelectedElements();
      }
      return;
    }

    // ═══ إلغاء ═══
    if (e.key === 'Escape') {
      deselect();
      closeSubmenu();
      closeEquationEditor();
      e.preventDefault();
      return;
    }

    // ═══ Nudge بالأسهم ═══
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      const hasSel = (state.selectedList && state.selectedList.length > 0) || state.selected;
      if (hasSel && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const pdfW = state.pdfW || 2000;
        const pdfH = state.pdfH || 2828;
        const cssW = state.cssW || 800;
        const cssH = state.cssH || 600;
        const step = e.shiftKey ? 10 : 1;
        const stepX = (pdfW / cssW) * step;
        const stepY = (pdfH / cssH) * step;
        const dx = e.key === 'ArrowLeft' ? -stepX : (e.key === 'ArrowRight' ? stepX : 0);
        const dy = e.key === 'ArrowUp' ? -stepY : (e.key === 'ArrowDown' ? stepY : 0);
        nudgeSelection(dx, dy);
        return;
      }
    }

    // ═══ التنقل بين الشرائح — PageUp / PageDown ═══
    if (e.key === 'PageDown' || e.key === 'PageUp') {
      e.preventDefault();
      const pdf = await import('./pdf.js');
      if (e.key === 'PageDown') pdf.goToPage(state.currentPage + 1);
      else pdf.goToPage(state.currentPage - 1);
      return;
    }

    // ═══ اختصارات الأدوات ═══
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const map = { h:'hand', v:'select', p:'pen', m:'highlighter',
                  e:'eraser', a:'laser', s:'shape', t:'text' };
    const t = map[e.key.toLowerCase()];
    if (t && toolbar) {
      if (t === 'shape') {
        setTool('shape');
        import('./ui-shell.js').then(m => m.switchPropsTab('shapes'));
      } else {
        const btn = toolbar.querySelector(`button[data-tool="${t}"]`);
        if (btn && btn.dataset.submenu) {
          setTool(t);
          openSubmenu(btn, t);
        } else setTool(t);
      }
    }
  });
}

/* ═══ Space+Drag = Pan مؤقت ═══ */
function bindSpacePan() {
  window.addEventListener('keydown', (e) => {
    if (e.code !== 'Space' || e.repeat) return;
    if (e.target.matches('input, textarea, select')) return;
    if (e.target.isContentEditable) return;
    if (state._spaceHeld) return;
    e.preventDefault();
    state._spaceHeld = true;
    const stageEl = document.getElementById('stage');
    if (stageEl) stageEl.style.cursor = 'grab';
  });

  window.addEventListener('keyup', (e) => {
    if (e.code !== 'Space') return;
    state._spaceHeld = false;
    const stageEl = document.getElementById('stage');
    if (stageEl) stageEl.style.cursor = '';
    updateCursorForTool();
  });

  window.addEventListener('blur', () => {
    state._spaceHeld = false;
    const stageEl = document.getElementById('stage');
    if (stageEl) stageEl.style.cursor = '';
    updateCursorForTool();
  });
}

/* ============================================================
   §5. FILE INPUT + GLOBAL LISTENERS
   ============================================================ */
function bindFileInput() {
  if (!fileInput) return;
  fileInput.addEventListener('change', async e => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const isActPdf = /\.actpdf$/i.test(f.name);
      if (isActPdf) await loadProjectFromFile(f);
      else if (f.type === 'application/pdf' || /\.pdf$/i.test(f.name)) await loadPdfFile(f);
      else if (/^image\//.test(f.type)) await loadImageFile(f);
      else toast('نوع الملف غير مدعوم', 'warn');
    } catch (err) {
      console.error(err);
      toast('خطأ: ' + err.message, 'error');
    }
    fileInput.value = '';
  });

  const btnOpenEmpty = document.getElementById('btnOpenEmpty');
  if (btnOpenEmpty) {
    btnOpenEmpty.addEventListener('click', () => fileInput.click());
  }
}

function bindGlobalListeners() {
  document.addEventListener('dragover', e => e.preventDefault());
  document.addEventListener('drop', e => e.preventDefault());
  document.addEventListener('contextmenu', e => e.preventDefault());

  // ★ تحذير عند إغلاق التبويب مع تعديلات غير محفوظة
  window.addEventListener('beforeunload', (e) => {
    if (state.dirty) {
      e.preventDefault();
      e.returnValue = '';
      return '';
    }
  });

  let _lastWinW = window.innerWidth;
  window.addEventListener('resize', () => {
    adjustToolbarSize();
    const isEditing = !!document.querySelector('.pdf-text-box.editing, [contenteditable="true"]');
    const widthChanged = Math.abs(window.innerWidth - _lastWinW) > 15;
    if (isEditing || !widthChanged) {
      updateFloatingToolbarPosition();
      return;
    }
    _lastWinW = window.innerWidth;
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

  const pBtn = $('btnPrev');
  if (pBtn) pBtn.addEventListener('click', () => goToPage(state.currentPage - 1));
  const nBtn = $('btnNext');
  if (nBtn) nBtn.addEventListener('click', () => goToPage(state.currentPage + 1));
}

/* ============================================================
   §6. LOCAL FONTS
   ============================================================ */
async function loadLocalFonts() {
  if (!('queryLocalFonts' in window)) return [];
  try {
    const fonts = await window.queryLocalFonts();
    return [...new Set(fonts.map(f => f.family))].sort();
  } catch (e) { return []; }
}

/* ============================================================
   §7. ZOOM — على الكانفاس فقط (Ctrl+Wheel + Pinch)
   ============================================================ */
function disableBrowserZoom() {
  const stageEl = document.getElementById('stage');
  if (!stageEl) return;

  // عجلة مع Ctrl = zoom على الكانفاس (يشمل pinch على التراك باد)
  stageEl.addEventListener('wheel', (e) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    e.stopPropagation();
    if (!state.pdfW || !state.cssW) return;
    const delta = e.deltaY > 0 ? -10 : 10;
    const pdfW = state.pdfW;
    const cssW = state.cssW;
    const curPct = (cssW * state.view.scale) / pdfW * 100;
    const nextPct = Math.max(10, Math.min(500, curPct + delta));
    state.view.scale = (nextPct / 100) * pdfW / cssW;
    import('./pdf.js').then(pdf => pdf.applyView());
  }, { passive: false });

  // Safari pinch (gesture events)
  let lastScale = 1;
  stageEl.addEventListener('gesturestart', (e) => {
    e.preventDefault();
    lastScale = e.scale || 1;
  }, { passive: false });

  stageEl.addEventListener('gesturechange', (e) => {
    e.preventDefault();
    if (!state.pdfW || !state.cssW) return;
    const ratio = (e.scale || 1) / lastScale;
    lastScale = e.scale || 1;
    const pdfW = state.pdfW;
    const cssW = state.cssW;
    const curPct = (cssW * state.view.scale) / pdfW * 100;
    const nextPct = Math.max(10, Math.min(500, curPct * ratio));
    state.view.scale = (nextPct / 100) * pdfW / cssW;
    import('./pdf.js').then(pdf => pdf.applyView());
  }, { passive: false });

  stageEl.addEventListener('gestureend', (e) => {
    e.preventDefault();
  }, { passive: false });
}

/* ============================================================
   §8. RECOVERY PROMPT
   ============================================================ */
async function checkAndPromptRecovery() {
  try {
    const storage = await import('./storage.js');
    const saved = await storage.checkForRecovery();
    if (!saved) return;
    if (state.slides && state.slides.length > 0) return;

    const age = Math.round((Date.now() - saved.timestamp) / 60000);
    const timeLabel = age < 60
      ? `قبل ${age} دقيقة`
      : age < 1440
        ? `قبل ${Math.round(age/60)} ساعة`
        : `قبل ${Math.round(age/1440)} يوم`;

    const projectName = (saved.projectData && saved.projectData.pdfName) || 'مشروع';
    const choice = await new Promise(resolve => {
      const backdrop = document.createElement('div');
      backdrop.className = 'ipb-confirm-backdrop';
      backdrop.innerHTML = `
        <div class="ipb-confirm-dialog">
          <div class="ipb-confirm-icon">💾</div>
          <h2 class="ipb-confirm-title">استعادة جلسة سابقة</h2>
          <p class="ipb-confirm-subtitle">${projectName}</p>
          <p class="ipb-confirm-message">يوجد مشروع محفوظ تلقائياً ${timeLabel}. هل تريد استعادته؟</p>
          <div class="ipb-confirm-actions">
            <button type="button" class="ipb-confirm-btn ipb-confirm-primary" data-r="yes">💾 استعادة</button>
            <button type="button" class="ipb-confirm-btn ipb-confirm-secondary" data-r="no">تجاهل</button>
            <button type="button" class="ipb-confirm-btn ipb-confirm-cancel" data-r="cancel">لاحقاً</button>
          </div>
        </div>
      `;
      document.body.appendChild(backdrop);
      requestAnimationFrame(() => backdrop.classList.add('show'));

      backdrop.querySelectorAll('[data-r]').forEach(btn => {
        btn.onclick = () => {
          backdrop.classList.remove('show');
          setTimeout(() => backdrop.remove(), 180);
          resolve(btn.dataset.r);
        };
      });
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          backdrop.classList.remove('show');
          setTimeout(() => backdrop.remove(), 180);
          resolve('cancel');
        }
      });
    });

    if (choice === 'yes') {
      await storage.restoreFromAutoSave();
    } else if (choice === 'no') {
      await storage.discardAutoSave();
    }
  } catch (err) {
    console.warn('Recovery prompt failed:', err);
  }
}

/* ============================================================
   §9. INIT
   ============================================================ */
async function init() {
  await loadKatex();
  await initPdfJs();

  uiHooks.setTool = setTool;
  uiHooks.closeSubmenu = closeSubmenu;

  setApplySnapshot(applySnapshotImpl);
  installElementHooks();
  initPointerEvents();
  adjustToolbarSize();

  bindToolbar();
  bindKeyboard();
  bindSpacePan();
  bindFileInput();
  bindGlobalListeners();
  bindSlideContextMenu();
  bindEquationEditor();
  disableBrowserZoom();

  initSidebar();

  try {
    const fonts = await loadLocalFonts();
    window.__localFonts = fonts;
  } catch (_) { window.__localFonts = []; }

  setTool('select');
  updateToolbarIndicators();
  updateUndoButtons();
  updatePasteBtnState();
  updatePageIndicator();

  setInterval(updatePasteBtnState, 1500);

  if (typeof window !== 'undefined') {
    window.__APP__ = {
      state,
      get pdfjsLib() { return import('./pdf.js').then(m => m.pdfjsLib); },
      get pages() { return state.pages; },
      get slides() { return state.slides; },
      reload: () => location.reload(),
    };
    // ★ كشف state للمكونات القديمة التي تعتمد على window.__CORE__
    window.__CORE__ = { state };
  }

  import('./pdf.js').then(pdf => {
    let thumbTimer = null;

    const scheduleCapture = () => {
      clearTimeout(thumbTimer);
      thumbTimer = setTimeout(() => {
        pdf.captureStageThumbnail(state.currentPage).catch(() => {});
      }, 1200);
    };
    const cancelCapture = () => clearTimeout(thumbTimer);

    const stageEl = document.getElementById('stage');
    if (stageEl) {
      stageEl.addEventListener('pointerup', scheduleCapture);
      stageEl.addEventListener('pointercancel', scheduleCapture);
      stageEl.addEventListener('pointerdown', cancelCapture);
      stageEl.addEventListener('pointermove', cancelCapture);
    }
    document.addEventListener('keyup', (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') scheduleCapture();
    });
  });

  import('./pdf.js').then(mod => { window.__PDF__ = mod; });
  import('./interaction.js').then(mod => { window.__INTERACTION__ = mod; });

  initUIShell();
  initNewProject();

  // ★ بدء الحفظ التلقائي
  import('./storage.js').then(s => s.startAutoSave());

  // ★ فحص الاستعادة — بعد 800ms ليتيح للواجهة الاستقرار
  setTimeout(() => checkAndPromptRecovery(), 800);
}

/* ============================================================
   §10. BOOT
   ============================================================ */
init().catch(err => {
  console.error(err);
  document.body.innerHTML = '<div style="padding:40px;color:#ffb4b4;text-align:center;font-family:system-ui">' +
    'تعذّر إقلاع التطبيق: ' + (err.message || err) + '</div>';
});