/* ============================================================
 * new-project.js — إنشاء مشروع جديد بأبعاد مخصصة
 * ============================================================ */

/* ─── وحدات القياس ─── */
const UNIT_FACTORS = {
  px: 1,
  pt: 96 / 72,
  mm: 96 / 25.4,
  cm: 96 / 2.54,
  in: 96,
};

const UNIT_LABELS = {
  px: 'بكسل',
  pt: 'نقطة',
  mm: 'مليمتر',
  cm: 'سنتيمتر',
  in: 'إنش',
};

/* ─── الأحجام الجاهزة ─── */
const PRESETS = [
  { id: 'a4-p', name: 'A4 عمودي',    icon: '📄', w: 21,   h: 29.7,  unit: 'cm' },
  { id: 'a4-l', name: 'A4 أفقي',     icon: '📄', w: 29.7, h: 21,    unit: 'cm' },
  { id: 'a3',   name: 'A3',          icon: '📰', w: 29.7, h: 42,    unit: 'cm' },
  { id: 'letter', name: 'Letter',    icon: '📃', w: 8.5,  h: 11,    unit: 'in' },
  { id: 'hd',   name: 'HD 720p',     icon: '🎬', w: 1280, h: 720,   unit: 'px' },
  { id: 'fhd',  name: 'Full HD 1080p', icon: '🎬', w: 1920, h: 1080, unit: 'px' },
  { id: 'uhd',  name: '4K UHD',      icon: '🎬', w: 3840, h: 2160,  unit: 'px' },
  { id: 'sq',   name: 'مربع',        icon: '⬛', w: 1080, h: 1080,  unit: 'px' },
  { id: 'story', name: 'ستوري 9:16', icon: '📱', w: 1080, h: 1920,  unit: 'px' },
  { id: 'slide43', name: 'عرض 4:3',  icon: '📊', w: 1024, h: 768,   unit: 'px' },
];

/* ─── حالة الحوار ─── */
const npState = {
  backdrop: null,
  dialog: null,
  selectedPreset: null,
  width: 1920,
  height: 1080,
  unit: 'px',
  bg: '#ffffff',
  prevOrientation: 'landscape',
};

/* ============================================================
   §1. UTILITIES
   ============================================================ */
function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}

function formatRatio(w, h) {
  if (!w || !h) return '—';
  const gw = Math.round(w);
  const gh = Math.round(h);
  const g = gcd(gw, gh);
  const rw = gw / g;
  const rh = gh / g;
  if (rw > 60 || rh > 60) return (w / h).toFixed(2) + ' : 1';
  return rw + ' : ' + rh;
}

function toPx(value, unit) {
  const factor = UNIT_FACTORS[unit] || 1;
  return Math.round(value * factor);
}

function fromPx(px, unit) {
  const factor = UNIT_FACTORS[unit] || 1;
  return +(px / factor).toFixed(2);
}

function isLandscape(w, h) {
  return w >= h;
}

/* ============================================================
   §2. DIALOG HTML
   ============================================================ */
function buildDialogHTML() {
  return `
    <div class="np-dialog" role="dialog" aria-modal="true" aria-label="مشروع جديد">
      <header class="np-header">
        <div class="np-header-left">
          <span class="np-header-icon">✨</span>
          <div>
            <div class="np-header-title">مشروع جديد</div>
            <div class="np-header-sub">اختر حجماً جاهزاً أو أدخل أبعاداً مخصصة</div>
          </div>
        </div>
        <button class="np-close" data-action="cancel" title="إغلاق">✕</button>
      </header>

      <div class="np-body">
        <div class="np-left">
          <div class="np-section-label">الأحجام الجاهزة</div>
          <div class="np-presets" id="npPresets"></div>

          <div class="np-or-sep"><span>أو</span></div>

          <div class="np-section-label">أبعاد مخصصة</div>
          <div class="np-custom">
            <div class="np-field np-field-w">
              <label>العرض</label>
              <input type="number" id="npW" min="1" step="any" value="1920">
            </div>
            <div class="np-field np-field-h">
              <label>الارتفاع</label>
              <input type="number" id="npH" min="1" step="any" value="1080">
            </div>
            <div class="np-field np-field-unit">
              <label>الوحدة</label>
              <select id="npUnit">
                <option value="px">بكسل</option>
                <option value="cm">سنتيمتر</option>
                <option value="mm">مليمتر</option>
                <option value="in">إنش</option>
                <option value="pt">نقطة</option>
              </select>
            </div>
          </div>

          <div class="np-orientation">
            <button class="np-orient-btn active" data-orient="landscape" title="أفقي">
              <span class="np-orient-rect landscape"></span>
              <span>أفقي</span>
            </button>
            <button class="np-orient-btn" data-orient="portrait" title="عمودي">
              <span class="np-orient-rect portrait"></span>
              <span>عمودي</span>
            </button>
          </div>
        </div>

        <div class="np-right">
          <div class="np-preview-label">معاينة</div>
          <div class="np-preview-box">
            <div class="np-preview-rect" id="npPreviewRect"></div>
          </div>
          <div class="np-preview-info">
            <div class="np-info-row">
              <span>الأبعاد:</span>
              <strong id="npInfoDims">—</strong>
            </div>
            <div class="np-info-row">
              <span>النسبة:</span>
              <strong id="npInfoRatio">—</strong>
            </div>
            <div class="np-info-row">
              <span>البكسل:</span>
              <strong id="npInfoPx">—</strong>
            </div>
          </div>
        </div>
      </div>

      <footer class="np-footer">
        <div class="np-bg-row">
          <span class="np-bg-label">خلفية الشريحة:</span>
          <button class="np-bg-swatch active" data-bg="#ffffff" style="background:#ffffff" title="أبيض"></button>
          <button class="np-bg-swatch" data-bg="#000000" style="background:#000000" title="أسود"></button>
          <button class="np-bg-swatch" data-bg="#f5f5dc" style="background:#f5f5dc" title="بيج"></button>
          <button class="np-bg-swatch" data-bg="#eef2ff" style="background:#eef2ff" title="أزرق فاتح"></button>
          <label class="np-bg-custom" title="لون مخصص">
            <input type="color" id="npBgColor" value="#ffffff">
            <span>مخصص</span>
          </label>
        </div>

        <div class="np-actions">
          <button type="button" class="np-btn-secondary" data-action="cancel">إلغاء</button>
          <button type="button" class="np-btn-primary" data-action="create">
            <span>✨</span> إنشاء المشروع
          </button>
        </div>
      </footer>
    </div>
  `;
}

/* ============================================================
   §3. PRESETS RENDER
   ============================================================ */
function renderPresets(container) {
  container.innerHTML = '';
  PRESETS.forEach(preset => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'np-preset';
    btn.dataset.presetId = preset.id;

    const icon = document.createElement('span');
    icon.className = 'np-preset-icon';
    icon.textContent = preset.icon;

    const name = document.createElement('span');
    name.className = 'np-preset-name';
    name.textContent = preset.name;

    const dims = document.createElement('span');
    dims.className = 'np-preset-dims';
    dims.textContent = preset.w + ' × ' + preset.h + ' ' + preset.unit;

    btn.appendChild(icon);
    btn.appendChild(name);
    btn.appendChild(dims);

    btn.addEventListener('click', () => {
      npState.selectedPreset = preset.id;
      npState.width = preset.w;
      npState.height = preset.h;
      npState.unit = preset.unit;

      const wInp = document.getElementById('npW');
      const hInp = document.getElementById('npH');
      const uSel = document.getElementById('npUnit');
      if (wInp) wInp.value = preset.w;
      if (hInp) hInp.value = preset.h;
      if (uSel) uSel.value = preset.unit;

      container.querySelectorAll('.np-preset').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      npState.prevOrientation = isLandscape(preset.w, preset.h) ? 'landscape' : 'portrait';
      updateOrientationButtons();
      updatePreview();
    });

    container.appendChild(btn);
  });
}

/* ============================================================
   §4. PREVIEW
   ============================================================ */
function updatePreview() {
  const rect = document.getElementById('npPreviewRect');
  const dimsEl = document.getElementById('npInfoDims');
  const ratioEl = document.getElementById('npInfoRatio');
  const pxEl = document.getElementById('npInfoPx');
  const box = document.querySelector('.np-preview-box');

  if (!rect || !box) return;

  const w = parseFloat(npState.width) || 0;
  const h = parseFloat(npState.height) || 0;

  if (w <= 0 || h <= 0) {
    rect.style.width = '0px';
    rect.style.height = '0px';
    if (dimsEl) dimsEl.textContent = '—';
    if (ratioEl) ratioEl.textContent = '—';
    if (pxEl) pxEl.textContent = '—';
    return;
  }

  const boxW = box.clientWidth - 32;
  const boxH = box.clientHeight - 32;
  const aspect = w / h;

  let rw = boxW;
  let rh = boxW / aspect;
  if (rh > boxH) {
    rh = boxH;
    rw = boxH * aspect;
  }

  rect.style.width = Math.max(20, rw) + 'px';
  rect.style.height = Math.max(20, rh) + 'px';
  rect.style.background = npState.bg;

  if (dimsEl) dimsEl.textContent = w + ' × ' + h + ' ' + UNIT_LABELS[npState.unit];
  if (ratioEl) ratioEl.textContent = formatRatio(w, h);

  const pxW = toPx(w, npState.unit);
  const pxH = toPx(h, npState.unit);
  if (pxEl) pxEl.textContent = pxW + ' × ' + pxH + ' px';
}

function updateOrientationButtons() {
  const btns = document.querySelectorAll('.np-orient-btn');
  btns.forEach(b => {
    b.classList.toggle('active', b.dataset.orient === npState.prevOrientation);
  });
}

function swapOrientation() {
  const w = npState.width;
  const h = npState.height;
  npState.width = h;
  npState.height = w;
  const wInp = document.getElementById('npW');
  const hInp = document.getElementById('npH');
  if (wInp) wInp.value = h;
  if (hInp) hInp.value = w;
  npState.prevOrientation = isLandscape(h, w) ? 'landscape' : 'portrait';
  updateOrientationButtons();
  updatePreview();
}

/* ============================================================
   §5. BUILD & BIND DIALOG
   ============================================================ */
function buildDialog() {
  if (npState.backdrop) return npState.backdrop;

  const backdrop = document.createElement('div');
  backdrop.className = 'np-backdrop';
  backdrop.id = 'npBackdrop';
  backdrop.innerHTML = buildDialogHTML();
  document.body.appendChild(backdrop);

  npState.backdrop = backdrop;
  npState.dialog = backdrop.querySelector('.np-dialog');

  /* عرض الأحجام الجاهزة */
  renderPresets(backdrop.querySelector('#npPresets'));

  /* ملء القيم الحالية */
  const wInp = backdrop.querySelector('#npW');
  const hInp = backdrop.querySelector('#npH');
  const uSel = backdrop.querySelector('#npUnit');
  const bgInp = backdrop.querySelector('#npBgColor');

  wInp.value = npState.width;
  hInp.value = npState.height;
  uSel.value = npState.unit;
  bgInp.value = npState.bg;

  /* ربط الأحداث */
  wInp.addEventListener('input', () => {
    npState.width = parseFloat(wInp.value) || 0;
    npState.selectedPreset = null;
    clearPresetSelection();
    updatePreview();
  });

  hInp.addEventListener('input', () => {
    npState.height = parseFloat(hInp.value) || 0;
    npState.selectedPreset = null;
    clearPresetSelection();
    updatePreview();
  });

  uSel.addEventListener('change', () => {
    npState.unit = uSel.value;
    updatePreview();
  });

  /* خلفية */
  backdrop.querySelectorAll('.np-bg-swatch').forEach(sw => {
    sw.addEventListener('click', () => {
      npState.bg = sw.dataset.bg;
      bgInp.value = sw.dataset.bg;
      backdrop.querySelectorAll('.np-bg-swatch').forEach(s => s.classList.remove('active'));
      sw.classList.add('active');
      updatePreview();
    });
  });

  bgInp.addEventListener('input', () => {
    npState.bg = bgInp.value;
    backdrop.querySelectorAll('.np-bg-swatch').forEach(s => s.classList.remove('active'));
    updatePreview();
  });

  /* اتجاه */
  backdrop.querySelectorAll('.np-orient-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const desired = btn.dataset.orient;
      if (desired === npState.prevOrientation) return;
      swapOrientation();
    });
  });

  /* الإجراءات */
  backdrop.querySelectorAll('[data-action="cancel"]').forEach(el => {
    el.addEventListener('click', closeDialog);
  });

  backdrop.querySelectorAll('[data-action="create"]').forEach(el => {
    el.addEventListener('click', () => {
      createProjectFromDialog();
    });
  });

  /* الإغلاق بالنقر على الخلفية */
  backdrop.addEventListener('pointerdown', (e) => {
    if (e.target === backdrop) closeDialog();
  });

  /* Escape */
  backdrop.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      closeDialog();
    } else if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
      createProjectFromDialog();
    }
  });

  /* السحب من الرأس */
  makeDialogDraggable(backdrop.querySelector('.np-header'), npState.dialog);

  return backdrop;
}

function clearPresetSelection() {
  if (!npState.backdrop) return;
  npState.backdrop.querySelectorAll('.np-preset').forEach(b => b.classList.remove('active'));
}

/* ============================================================
   §6. DRAGGABLE DIALOG
   ============================================================ */
function makeDialogDraggable(handle, dialog) {
  if (!handle || !dialog) return;
  let startX = 0, startY = 0;
  let startLeft = 0, startTop = 0;
  let dragging = false;

  handle.style.cursor = 'move';
  handle.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return;
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    const rect = dialog.getBoundingClientRect();
    startLeft = rect.left;
    startTop = rect.top;
    dialog.style.transform = 'none';
    dialog.style.left = startLeft + 'px';
    dialog.style.top = startTop + 'px';
    try { handle.setPointerCapture(e.pointerId); } catch (_) {}
    e.preventDefault();
  });

  handle.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    dialog.style.left = (startLeft + dx) + 'px';
    dialog.style.top = (startTop + dy) + 'px';
  });

  handle.addEventListener('pointerup', (e) => {
    dragging = false;
    try { handle.releasePointerCapture(e.pointerId); } catch (_) {}
  });
}

/* ============================================================
   §7. OPEN / CLOSE
   ============================================================ */
export function openNewProjectDialog() {
  const backdrop = buildDialog();

  /* إعادة ملء القيم */
  const wInp = backdrop.querySelector('#npW');
  const hInp = backdrop.querySelector('#npH');
  const uSel = backdrop.querySelector('#npUnit');
  if (wInp) wInp.value = npState.width;
  if (hInp) hInp.value = npState.height;
  if (uSel) uSel.value = npState.unit;

  /* إعادة تعيين الموضع */
  if (npState.dialog) {
    npState.dialog.style.left = '';
    npState.dialog.style.top = '';
    npState.dialog.style.transform = '';
  }

  backdrop.classList.add('show');
  requestAnimationFrame(updatePreview);

  /* تركيز أول حقل */
  setTimeout(() => { try { wInp.focus(); wInp.select(); } catch (_) {} }, 100);
}

function closeDialog() {
  if (!npState.backdrop) return;
  npState.backdrop.classList.remove('show');
}

/* ============================================================
   §8. CREATE PROJECT
   ============================================================ */
async function createProjectFromDialog() {
  const w = parseFloat(npState.width) || 0;
  const h = parseFloat(npState.height) || 0;

  if (w <= 0 || h <= 0) {
    alert('الرجاء إدخال أبعاد صالحة');
    return;
  }

  const pxW = toPx(w, npState.unit);
  const pxH = toPx(h, npState.unit);

  if (pxW < 100 || pxH < 100) {
    alert('الأبعاد صغيرة جداً. الحد الأدنى 100 بكسل');
    return;
  }
  if (pxW > 20000 || pxH > 20000) {
    alert('الأبعاد كبيرة جداً. الحد الأقصى 20000 بكسل');
    return;
  }

  try {
    const core = await import('./core.js');
    const pdf = await import('./pdf.js');

    /* إعادة تهيئة الحالة */
    core.state.pdfDoc = null;
    core.state.pdfBlob = null;
    core.state.pdfName = 'مشروع جديد';
    core.state.pdfIsImage = false;
    core.state.projectDims = {
      width: pxW,
      height: pxH,
      unit: npState.unit,
      bg: npState.bg,
    };

    core.state.slides = [{
      id: core.uid(),
      bg: { type: 'blank', color: npState.bg },
    }];
    core.state.totalPages = 1;
    core.state.currentPage = 1;
    core.state.selected = null;
    core.state.pages = {
      1: { annotations: [], embeds: [], media: [], videos: [], texts: [], buttons: [] },
    };
    core.state.history = {};
    core.state.pageCache.clear();
    core.state.thumbCache.clear();

    /* إخفاء شاشة البداية */
    const emptyState = document.getElementById('emptyState');
    if (emptyState) emptyState.style.display = 'none';

    /* عرض */
    pdf.renderThumbnails();
    await pdf.renderPage(1);
    pdf.updatePageIndicator();

    /* تحديث الأزرار */
    if (core.updateUndoButtons) core.updateUndoButtons();

    /* إشعار الواجهة الجديدة */
    document.dispatchEvent(new CustomEvent('ipb:pageChanged', {
      detail: { page: 1 },
    }));
    document.dispatchEvent(new CustomEvent('ipb:projectCreated', {
      detail: { width: pxW, height: pxH, unit: npState.unit, bg: npState.bg },
    }));

    closeDialog();

    /* toast */
    try {
      const utils = await import('./core.js');
      if (utils.toast) {
        utils.toast('تم إنشاء المشروع ✨ ' + pxW + '×' + pxH + ' px', 'ok');
      }
    } catch (_) {}

  } catch (err) {
    console.error(err);
    alert('تعذّر إنشاء المشروع: ' + err.message);
  }
}

/* ============================================================
   §9. INIT — ربط زر "جديد" + زر "مشروع جديد" في شاشة البداية
   ============================================================ */
export function initNewProject() {
  /* زر TopBar */
  const btnNew = document.getElementById('btnNew');
  if (btnNew) {
    btnNew.addEventListener('click', openNewProjectDialog);
  }

  /* زر شاشة البداية */
  const btnNewEmpty = document.getElementById('btnNewEmpty');
  if (btnNewEmpty) {
    btnNewEmpty.addEventListener('click', openNewProjectDialog);
  }

  /* اختصار لوحة المفاتيح Ctrl+N */
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
      e.preventDefault();
      openNewProjectDialog();
    }
  });
}

/* Expose for debugging */
if (typeof window !== 'undefined') {
  window.__NEW_PROJECT__ = {
    open: openNewProjectDialog,
    close: closeDialog,
  };
}