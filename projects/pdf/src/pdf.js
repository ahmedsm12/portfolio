/* ============================================================
 * pdf.js — معالجة PDF والشرائح والمصغرات وإعادة الترتيب
 * ============================================================
 *  ★ disableFontFace: true → رسم دقيق للحروف
 *  ★ thumbnail: يلتقط من نسخة clone خارج الشاشة
 *  ★ fit-contain للصور المصغرة
 *  ★ أيقونة + تحت آخر thumbnail لإضافة شريحة جديدة
 *  ★ سحب وإفلات (Drag & Drop) لإعادة ترتيب الشرائح بلحظية وسلاسة
 * ============================================================ */

import {
  $, SVG_NS, PDFJS_BASE, COORD_WIDTH, CACHE_WIDTH, THUMB_WIDTH,
  SIDEBAR_MIN_W, SIDEBAR_MAX_W, SIDEBAR_DEFAULT_W,
  SIDEBAR_W_KEY, SIDEBAR_V_KEY,
  stage, stageWrapper, stageContent, pdfCanvas, svgLayer,
  transientCanvas, laserCanvas, emptyState, pageIndicator,
  thumbnailSidebar, thumbsList, slideContextMenu,
  state, slideClipboard,
  uid, setLoading, toast,
} from './core.js';

import {
  loadPageState, deselect,
  updateUndoButtonsSafe,
} from './interaction.js';

/* ============================================================
   §1. PDFJS LOADING
   ============================================================ */
export let pdfjsLib = null;

export async function initPdfJs() {
  const mod = await import(`${PDFJS_BASE}/build/pdf.min.mjs`);
  pdfjsLib = mod;
  pdfjsLib.GlobalWorkerOptions.workerSrc = `${PDFJS_BASE}/build/pdf.worker.min.mjs`;
  pdfjsLib.GlobalWorkerOptions.cMapUrl = `${PDFJS_BASE}/cmaps/`;
  pdfjsLib.GlobalWorkerOptions.cMapPacked = true;
  pdfjsLib.GlobalWorkerOptions.standardFontDataUrl = `${PDFJS_BASE}/standard_fonts/`;
  pdfjsLib.GlobalWorkerOptions.useWorkerFetch = true;
  pdfjsLib.GlobalWorkerOptions.useSystemFonts = false;
  pdfjsLib.GlobalWorkerOptions.isEvalSupported = true;
  if (typeof window !== 'undefined') {
    window.__PDFJS__ = pdfjsLib;
    window.__PDF_MODULE__ = { pdfjsLib };
  }
}

/* ============================================================
   §2. STAGE SIZING
   ============================================================ */
export function getSidebarWidth() {
  if (!thumbnailSidebar || thumbnailSidebar.classList.contains('collapsed')) return 0;
  return thumbnailSidebar.offsetWidth || 0;
}

export function computeStageSize(naturalW, naturalH) {
  const wrap = stageWrapper ? stageWrapper.getBoundingClientRect() : { width: window.innerWidth, height: window.innerHeight };
  const sW = getSidebarWidth();
  const availW = Math.max(80, wrap.width - sW - 12 - 66);
  const availH = Math.max(80, wrap.height - 30 - 80);
  const aspect = naturalW / naturalH;
  let cW = availW, cH = cW / aspect;
  if (cH > availH) { cH = availH; cW = cH * aspect; }
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  let canvasW = Math.ceil(cW * dpr);
  let canvasH = Math.ceil(cH * dpr);
  const maxPx = 16 * 1024 * 1024;
  if (canvasW * canvasH > maxPx) {
    const f = Math.sqrt(maxPx / (canvasW * canvasH));
    canvasW = Math.floor(canvasW * f);
    canvasH = Math.floor(canvasH * f);
  }
  return { cssW: cW, cssH: cH, canvasW, canvasH, dpr };
}

export function updateStageRect0() {
  if (!stageWrapper) return;
  const wrap = stageWrapper.getBoundingClientRect();
  const sW = getSidebarWidth();
  const cW = state.cssW, cH = state.cssH;
  state.stageRect0.left = wrap.left + sW + (wrap.width - sW - cW) / 2;
  state.stageRect0.top = wrap.top + (wrap.height - cH) / 2;
  state.stageRect0.width = cW;
  state.stageRect0.height = cH;
}

export function applyView() {
  if (!stage) return;
  const { scale, tx, ty } = state.view;
  if (scale === 1 && tx === 0 && ty === 0) stage.style.transform = '';
  else stage.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
}

/* ============================================================
   §3. renderPageWithFonts
   ============================================================ */
async function renderPageWithFonts(page, pdfPageNum, canvas, cssW, cssH, dpr) {
  const vp1 = page.getViewport({ scale: 1 });
  const renderScale = (cssW * dpr) / vp1.width;
  const viewport = page.getViewport({ scale: renderScale });

  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';

  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  await page.render({
    canvasContext: ctx,
    viewport,
    background: '#ffffff',
  }).promise;

  return ctx;
}

/* ============================================================
   §4. renderPageToOffscreen
   ============================================================ */
async function renderPageToOffscreen(page, pdfPageNum, cssW, dpr, format = 'jpeg', quality = 0.92) {
  const vp1 = page.getViewport({ scale: 1 });
  const aspect = vp1.height / vp1.width;
  const cssH = cssW * aspect;

  const canvas = document.createElement('canvas');
  await renderPageWithFonts(page, pdfPageNum, canvas, cssW, cssH, dpr);

  const mime = format === 'png' ? 'image/png' : 'image/jpeg';
  return { dataUrl: canvas.toDataURL(mime, quality), cssW, cssH };
}

/* ============================================================
   §5. RENDER PAGE
   ============================================================ */
export async function renderPage(pageNum) {
  const slide = state.slides[pageNum - 1];
  if (!slide) return;
  const hasCache = state.pageCache.has(pageNum);
  if (!hasCache) setLoading(true, 'جارٍ عرض الصفحة…');

  try {
    const bg = slide.bg;
    let vp1W, vp1H, aspect;

    if (bg.type === 'pdf' && state.pdfDoc) {
      const page = await state.pdfDoc.getPage(bg.page);
      const vp1 = page.getViewport({ scale: 1 });
      vp1W = vp1.width;
      vp1H = vp1.height;
      aspect = vp1.height / vp1.width;
    } else if (bg.type === 'blank') {
      if (state.pdfDoc) {
        const page = await state.pdfDoc.getPage(1);
        const vp1 = page.getViewport({ scale: 1 });
        vp1W = vp1.width;
        vp1H = vp1.height;
        aspect = vp1.height / vp1.width;
      } else if (state.projectDims && state.projectDims.width && state.projectDims.height) {
        vp1W = state.projectDims.width;
        vp1H = state.projectDims.height;
        aspect = vp1H / vp1W;
      } else {
        vp1W = .707;
        vp1H = 1;
        aspect = 1 / .707;
      }
    } else {
      vp1W = 1;
      vp1H = (state.pdfH / state.pdfW) || 1.414;
      aspect = vp1H / vp1W;
    }

    state.pdfW = COORD_WIDTH;
    state.pdfH = Math.round(COORD_WIDTH * aspect);
    updateThumbAspect();

    const { cssW, cssH, canvasW, canvasH, dpr } = computeStageSize(vp1W, vp1H);
    state.canvasScale = canvasW / state.pdfW;
    state.cssW = cssW;
    state.cssH = cssH;
    state.dpr = dpr;

    if (stage) {
      stage.style.width = cssW + 'px';
      stage.style.height = cssH + 'px';
    }

    [pdfCanvas, transientCanvas, laserCanvas].forEach(c => {
      if (c) {
        c.width = canvasW;
        c.height = canvasH;
        c.style.width = cssW + 'px';
        c.style.height = cssH + 'px';
      }
    });

    const svgDefs = document.getElementById('svgDefs');
    if (svgDefs) {
      svgDefs.setAttribute('viewBox', `0 0 ${state.pdfW} ${state.pdfH}`);
    }

    const selectionSvg = document.getElementById('selectionSvg');
    if (selectionSvg) {
      selectionSvg.setAttribute('viewBox', `0 0 ${state.pdfW} ${state.pdfH}`);
      selectionSvg.setAttribute('preserveAspectRatio', 'none');
    }

    let fillColor = '#ffffff';
    if (bg.type === 'blank') {
      if (bg.color) fillColor = bg.color;
      else if (state.projectDims && state.projectDims.bg) fillColor = state.projectDims.bg;
    }

    if (pdfCanvas) {
      const ctx = pdfCanvas.getContext('2d', { alpha: false });
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = fillColor;
      ctx.fillRect(0, 0, canvasW, canvasH);

      const cached = state.pageCache.get(pageNum);

      if (cached) {
        const img = new Image();
        await new Promise(res => {
          img.onload = res;
          img.onerror = res;
          img.src = cached.dataUrl;
        });
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvasW, canvasH);
      } else if (bg.type === 'pdf' && state.pdfDoc) {
        const page = await state.pdfDoc.getPage(bg.page);
        await renderPageWithFonts(page, bg.page, pdfCanvas, cssW, cssH, dpr);

        try {
          const result = await renderPageToOffscreen(
            page, bg.page,
            Math.min(cssW * 1.5, CACHE_WIDTH),
            Math.min(dpr, 2),
            'jpeg', 0.95
          );
          state.pageCache.set(pageNum, { dataUrl: result.dataUrl });
        } catch (_) {
          try {
            const cc = document.createElement('canvas');
            const cw = Math.min(canvasW, CACHE_WIDTH);
            const ch = Math.round(cw * canvasH / canvasW);
            cc.width = cw;
            cc.height = ch;
            const cctx = cc.getContext('2d', { alpha: false });
            cctx.imageSmoothingEnabled = true;
            cctx.imageSmoothingQuality = 'high';
            cctx.drawImage(pdfCanvas, 0, 0, cw, ch);
            state.pageCache.set(pageNum, {
              dataUrl: cc.toDataURL('image/jpeg', 0.95),
            });
          } catch (__) {}
        }
      } else if (bg.type === 'blank') {
        try {
          const cc = document.createElement('canvas');
          const cw = Math.min(canvasW, CACHE_WIDTH);
          const ch = Math.round(cw * canvasH / canvasW);
          cc.width = cw;
          cc.height = ch;
          const cctx = cc.getContext('2d', { alpha: false });
          cctx.fillStyle = fillColor;
          cctx.fillRect(0, 0, cw, ch);
          state.pageCache.set(pageNum, {
            dataUrl: cc.toDataURL('image/jpeg', 0.95),
          });
        } catch (_) {}
      } else if (state.pdfBlob) {
        const url = URL.createObjectURL(state.pdfBlob);
        try {
          const img = await new Promise((res, rej) => {
            const i = new Image();
            i.onload = () => res(i);
            i.onerror = () => rej(new Error('image'));
            i.src = url;
          });
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, canvasW, canvasH);
        } finally {
          URL.revokeObjectURL(url);
        }
      }
    }

    updateStageRect0();
    applyView();
    loadPageState(pageNum);
    updatePageIndicator();
    updateUndoButtonsSafe();
    
    if (emptyState) {
      emptyState.style.display = 'none';
      emptyState.style.backgroundColor = 'transparent';
      emptyState.style.backgroundImage = 'none';
    }

    if (stage) stage.classList.remove('empty');
    document.body.classList.add('has-project');
    document.body.classList.remove('no-project');

    setTimeout(() => { captureStageThumbnail(pageNum).catch(() => {}); }, 50);
  } catch (err) {
    console.error(err);
    toast('تعذّر عرض الصفحة', 'error');
  } finally {
    if (!hasCache) setLoading(false);
  }
}

/* ============================================================
   §6. PRELOAD
   ============================================================ */
export async function preloadAllPages(token) {
  for (let i = 1; i <= state.totalPages; i++) {
    if (state.preloadToken !== token) return;
    if (state.thumbCache.has(i)) { updateThumbnailImg(i); continue; }
    try {
      const slide = state.slides[i - 1];
      if (!slide) continue;
      const bg = slide.bg;

      if (bg.type === 'pdf' && state.pdfDoc) {
        const page = await state.pdfDoc.getPage(bg.page);
        const vp1 = page.getViewport({ scale: 1 });
        const cssW = THUMB_WIDTH;
        const cssH = cssW * vp1.height / vp1.width;
        const cvs = document.createElement('canvas');
        cvs.width = Math.round(cssW);
        cvs.height = Math.round(cssH);
        const c = cvs.getContext('2d', { alpha: false });
        c.fillStyle = '#fff';
        c.fillRect(0, 0, cvs.width, cvs.height);
        const cssViewport = page.getViewport({ scale: cssW / vp1.width });
        await page.render({ canvasContext: c, viewport: cssViewport }).promise;
        if (state.preloadToken !== token) return;
        state.thumbCache.set(i, {
          dataUrl: cvs.toDataURL('image/jpeg', 0.82),
        });
        updateThumbnailImg(i);
        page.cleanup();
        await new Promise(r => setTimeout(r, 0));
      } else if (bg.type === 'blank') {
        const cvs = document.createElement('canvas');
        cvs.width = THUMB_WIDTH;
        cvs.height = Math.round(
          THUMB_WIDTH * (state.pdfH / state.pdfW || 1.414)
        );
        const c = cvs.getContext('2d');
        c.fillStyle = (bg.color || (state.projectDims && state.projectDims.bg) || '#fff');
        c.fillRect(0, 0, cvs.width, cvs.height);
        state.thumbCache.set(i, {
          dataUrl: cvs.toDataURL('image/jpeg', 0.82),
        });
        updateThumbnailImg(i);
        await new Promise(r => setTimeout(r, 0));
      }
    } catch (e) {
      console.warn('thumb preload', i, e);
    }
  }

  for (let i = 1; i <= state.totalPages; i++) {
    if (state.preloadToken !== token) return;
    if (state.pageCache.has(i)) continue;
    try {
      const slide = state.slides[i - 1];
      if (!slide) continue;
      const bg = slide.bg;
      if (bg.type === 'pdf' && state.pdfDoc) {
        const page = await state.pdfDoc.getPage(bg.page);
        const vp1 = page.getViewport({ scale: 1 });
        const cacheCSS = Math.min(
          CACHE_WIDTH,
          Math.max(1200, Math.round(vp1.width * 1.6))
        );
        const cacheDpr = Math.min(window.devicePixelRatio || 1, 2);
        const result = await renderPageToOffscreen(
          page, bg.page, cacheCSS, cacheDpr, 'jpeg', 0.95
        );
        if (state.preloadToken !== token) return;
        state.pageCache.set(i, { dataUrl: result.dataUrl });
        page.cleanup();
        await new Promise(r => setTimeout(r, 0));
      } else if (bg.type === 'blank') {
        await new Promise(r => setTimeout(r, 0));
      }
    } catch (e) {
      console.warn('page preload', i, e);
    }
  }
}

/* ============================================================
   §7. THUMBNAIL CAPTURE
   ============================================================ */
let _html2canvasPromise = null;

function ensureHtml2Canvas() {
  if (window.html2canvas) return Promise.resolve(window.html2canvas);
  if (_html2canvasPromise) return _html2canvasPromise;
  _html2canvasPromise = new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    s.onload = () => resolve(window.html2canvas);
    s.onerror = () => {
      console.warn('html2canvas load failed');
      resolve(null);
    };
    document.head.appendChild(s);
  });
  return _html2canvasPromise;
}

export async function captureStageThumbnail(pageNum) {
  if (!pageNum || pageNum < 1 || pageNum > state.totalPages) return;
  if (state.currentPage !== pageNum) return;
  if (!state.cssW || !state.cssH) return;

  try {
    const TW = 320;
    const aspect = (state.pdfW && state.pdfH)
      ? (state.pdfW / state.pdfH)
      : (16 / 9);
    const TH = Math.max(1, Math.round(TW / aspect));

    const html2canvas = await ensureHtml2Canvas();
    if (!html2canvas) return;

    const stageEl = document.getElementById('stage');
    if (!stageEl) return;

    const cssW = Math.max(1, Math.round(state.cssW));
    const cssH = Math.max(1, Math.round(state.cssH));

    const cloneHost = document.createElement('div');
    cloneHost.style.cssText =
      'position:fixed;left:-99999px;top:0;' +
      `width:${cssW}px;height:${cssH}px;overflow:hidden;` +
      'pointer-events:none;z-index:-1;opacity:0;';

    const clonedStage = stageEl.cloneNode(true);
    clonedStage.style.cssText =
      'position:absolute;left:0;top:0;' +
      `width:${cssW}px;height:${cssH}px;` +
      'transform:none;box-shadow:none;margin:0;border-radius:0;' +
      'background:#ffffff;opacity:1;';

    clonedStage.querySelectorAll(
      '.selection-overlay, .handle, .selection-outline, ' +
      '.element-delete-btn, .media-play-btn, .media-resize, ' +
      '.embed-resize, .pdf-interactive-btn-resize, .pdf-text-resize, ' +
      '#transientCanvas, #laserCanvas, #submenu, ' +
      '#slideContextMenu, #textContextToolbar, ' +
      '#shapeContextToolbar, #equationEditor, #selectionSvg'
    ).forEach(el => el.remove());

    clonedStage.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));

    cloneHost.appendChild(clonedStage);
    document.body.appendChild(cloneHost);

    await new Promise(r => requestAnimationFrame(r));
    await new Promise(r => requestAnimationFrame(r));
    if (document.fonts && document.fonts.ready) {
      try { await document.fonts.ready; } catch (_) {}
    }

    let canvas = null;
    try {
      canvas = await html2canvas(clonedStage, {
        backgroundColor: '#ffffff',
        scale: 1,
        logging: false,
        useCORS: true,
        allowTaint: false,
        width: cssW,
        height: cssH,
        windowWidth: cssW,
        windowHeight: cssH,
      });
    } finally {
      cloneHost.remove();
    }

    if (!canvas) return;

    const resized = document.createElement('canvas');
    resized.width = TW;
    resized.height = TH;
    const rctx = resized.getContext('2d');

    let bgColor = '#ffffff';
    const slide = state.slides[pageNum - 1];
    if (slide && slide.bg && slide.bg.type === 'blank' && slide.bg.color) {
      bgColor = slide.bg.color;
    } else if (state.projectDims && state.projectDims.bg) {
      bgColor = state.projectDims.bg;
    }
    rctx.fillStyle = bgColor;
    rctx.fillRect(0, 0, TW, TH);
    rctx.imageSmoothingEnabled = true;
    rctx.imageSmoothingQuality = 'high';

    const srcAspect = canvas.width / canvas.height;
    const dstAspect = TW / TH;
    let dw, dh, dx, dy;
    if (srcAspect > dstAspect) {
      dw = TW;
      dh = TW / srcAspect;
      dx = 0;
      dy = (TH - dh) / 2;
    } else {
      dh = TH;
      dw = TH * srcAspect;
      dx = (TW - dw) / 2;
      dy = 0;
    }
    rctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, dx, dy, dw, dh);

    const dataUrl = resized.toDataURL('image/jpeg', 0.85);
    state.thumbCache.set(pageNum, { dataUrl, userEdited: true });
    updateThumbnailImg(pageNum);
  } catch (e) {
    console.warn('captureStageThumbnail failed:', e);
  }
}

/* ============================================================
   §8. CACHE SHIFTING
   ============================================================ */
function _shiftCachesAfterInsert(atIdx, count) {
  const newThumbs = new Map();
  state.thumbCache.forEach((v, k) => {
    if (k <= atIdx) newThumbs.set(k, v);
    else newThumbs.set(k + count, v);
  });
  state.thumbCache = newThumbs;

  const newPages = new Map();
  state.pageCache.forEach((v, k) => {
    if (k <= atIdx) newPages.set(k, v);
    else newPages.set(k + count, v);
  });
  state.pageCache = newPages;
}

function _shiftCachesAfterDelete(atIdx) {
  const newThumbs = new Map();
  state.thumbCache.forEach((v, k) => {
    if (k < atIdx) newThumbs.set(k, v);
    else if (k > atIdx) newThumbs.set(k - 1, v);
  });
  state.thumbCache = newThumbs;

  const newPages = new Map();
  state.pageCache.forEach((v, k) => {
    if (k < atIdx) newPages.set(k, v);
    else if (k > atIdx) newPages.set(k - 1, v);
  });
  state.pageCache = newPages;
}

/* ============================================================
   §9. LOAD PDF / IMAGE
   ============================================================ */
export function initSlidesFromPdf(numPages) {
  state.slides = [];
  for (let i = 1; i <= numPages; i++) {
    state.slides.push({ id: uid(), bg: { type: 'pdf', page: i } });
  }
  state.totalPages = state.slides.length;
}

export async function loadPdfFile(file, opts = {}) {
  setLoading(true, 'جارٍ قراءة الملف…');
  try {
    const buf = await file.arrayBuffer();
    const doc = await pdfjsLib.getDocument({
      data: buf,
      cMapUrl: `${PDFJS_BASE}/cmaps/`,
      cMapPacked: true,
      standardFontDataUrl: `${PDFJS_BASE}/standard_fonts/`,
      wasmUrl: `${PDFJS_BASE}/wasm/`,
      useSystemFonts: false,
      disableFontFace: true,
      fontExtraProperties: true,
      isEvalSupported: true,
      useWorkerFetch: true,
      disableRange: false,
      disableStream: false,
      disableAutoFetch: false,
      verbosity: 0,
    }).promise;

    state.pdfDoc = doc;
    state.pdfBlob = file;
    state.pdfName = file.name;
    state.pdfIsImage = false;
    state.pageCache.clear();
    state.thumbCache.clear();
    state.preloadToken++;
    const token = state.preloadToken;

    if (!opts.keepPages) {
      state.pages = {};
      state.history = {};
      state.currentPage = 1;
      state.selected = null;
      initSlidesFromPdf(doc.numPages);
    } else {
      if (opts.restoredSlides) state.slides = opts.restoredSlides;
      else initSlidesFromPdf(doc.numPages);
      state.totalPages = state.slides.length;
    }

    document.body.classList.add('has-project');
    document.body.classList.remove('no-project');

    renderThumbnails();
    if (!opts.skipRender) {
      updateUndoButtonsSafe();
      await renderPage(state.currentPage || 1);
      preloadAllPages(token);
    }
  } catch (err) {
    console.error(err);
    setLoading(false);
    alert('تعذّر فتح PDF: ' + err.message);
    throw err;
  }
}

export async function loadImageFile(file, opts = {}) {
  setLoading(true, 'جارٍ تحميل الصورة…');
  try {
    state.pdfDoc = null;
    state.totalPages = 1;
    state.pdfBlob = file;
    state.pdfName = file.name;
    state.pdfIsImage = true;
    state.pageCache.clear();
    state.thumbCache.clear();
    state.preloadToken++;

    if (!opts.keepPages) {
      state.pages = {};
      state.history = {};
      state.currentPage = 1;
      state.slides = [{ id: uid(), bg: { type: 'blank' } }];
      state.totalPages = 1;
    }

    document.body.classList.add('has-project');
    document.body.classList.remove('no-project');

    renderThumbnails();
    if (!opts.skipRender) await renderPage(1);
  } catch (err) {
    console.error(err);
    alert(err.message);
    throw err;
  } finally {
    setLoading(false);
  }
}

/* ============================================================
   §10. PAGE INDICATOR
   ============================================================ */
export function updatePageIndicator() {
  if (!state.totalPages) {
    if (pageIndicator) pageIndicator.textContent = '';
    return;
  }
  if (pageIndicator) pageIndicator.textContent = state.currentPage + ' / ' + state.totalPages;
  const btnPrev = $('btnPrev'), btnNext = $('btnNext');
  if (btnPrev) btnPrev.disabled = state.currentPage <= 1;
  if (btnNext) btnNext.disabled = state.currentPage >= state.totalPages;
  updateThumbnailActive(state.currentPage);
}

/* ============================================================
   §11. SIDEBAR
   ============================================================ */
export function updateSidebarPadding() {
  const w = getSidebarWidth();
  document.documentElement.style.setProperty('--sidebar-effective-w', w + 'px');
  const sbs = $('btnShowSidebar');
  if (sbs && thumbnailSidebar) {
    sbs.classList.toggle('show', thumbnailSidebar.classList.contains('collapsed'));
  }
}

export function updateThumbAspect() {
  const aspect = (state.pdfW && state.pdfH)
    ? (state.pdfW / state.pdfH)
    : 0.75;
  document.documentElement.style.setProperty('--thumb-aspect', String(aspect));
}

export function initSidebar() {
  if (!thumbnailSidebar) return;
  let savedW = parseInt(
    localStorage.getItem(SIDEBAR_W_KEY) || String(SIDEBAR_DEFAULT_W),
    10
  );
  if (isNaN(savedW)) savedW = SIDEBAR_DEFAULT_W;
  savedW = Math.max(SIDEBAR_MIN_W, Math.min(SIDEBAR_MAX_W, savedW));
  thumbnailSidebar.style.width = savedW + 'px';

  const savedVisible = localStorage.getItem(SIDEBAR_V_KEY) !== 'false';
  if (!savedVisible) thumbnailSidebar.classList.add('collapsed');

  updateSidebarPadding();
  renderThumbnails();

  const btnToggle = $('btnToggleSidebar');
  if (btnToggle) {
    btnToggle.addEventListener('click', () => {
      thumbnailSidebar.classList.add('collapsed');
      localStorage.setItem(SIDEBAR_V_KEY, 'false');
      updateSidebarPadding();
      setTimeout(() => window.dispatchEvent(new Event('resize')), 230);
    });
  }

  const btnShow = $('btnShowSidebar');
  if (btnShow) {
    btnShow.addEventListener('click', () => {
      thumbnailSidebar.classList.remove('collapsed');
      localStorage.setItem(SIDEBAR_V_KEY, 'true');
      updateSidebarPadding();
      setTimeout(() => window.dispatchEvent(new Event('resize')), 230);
    });
  }

  const handle = $('sidebarResize');
  if (handle) {
    handle.addEventListener('pointerdown', e => {
      e.preventDefault();
      e.stopPropagation();
      handle.classList.add('dragging');
      thumbnailSidebar.style.transition = 'none';
      if (stageWrapper) stageWrapper.classList.add('no-transition');
      const sx = e.clientX;
      const sw0 = thumbnailSidebar.offsetWidth;
      try { handle.setPointerCapture(e.pointerId); } catch (_) {}
      function onMove(ev) {
        let nw = sw0 + (ev.clientX - sx);
        nw = Math.max(SIDEBAR_MIN_W, Math.min(SIDEBAR_MAX_W, nw));
        thumbnailSidebar.style.width = nw + 'px';
        document.documentElement.style.setProperty('--sidebar-effective-w', nw + 'px');
      }
      function onUp() {
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        document.removeEventListener('pointercancel', onUp);
        handle.classList.remove('dragging');
        thumbnailSidebar.style.transition = '';
        if (stageWrapper) stageWrapper.classList.remove('no-transition');
        localStorage.setItem(SIDEBAR_W_KEY, String(thumbnailSidebar.offsetWidth));
        updateSidebarPadding();
        window.dispatchEvent(new Event('resize'));
      }
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
      document.addEventListener('pointercancel', onUp);
    });
  }
}

/* ============================================================
   §12. THUMBNAILS UI + DRAG & DROP REORDER + ADD SLIDE BUTTON
   ============================================================ */
let draggedThumbPage = null;

export function renderThumbnails() {
  if (!thumbsList) return;
  thumbsList.innerHTML = '';

  if (!state.totalPages || state.totalPages === 0) {
    thumbsList.innerHTML =
      '<div class="thumbs-empty">لا توجد صفحات<br>افتح ملفاً للبدء</div>';
    return;
  }

  /* ═══ 1) بناء عناصر الشرائح ═══ */
  for (let i = 1; i <= state.totalPages; i++) {
    const item = document.createElement('div');
    item.className = 'thumb-item loading';
    item.dataset.page = String(i);
    item.draggable = true;
    item.setAttribute('tabindex', '0');
    item.setAttribute('role', 'button');
    item.setAttribute('aria-label', `الشريحة ${i}`);

    const spinner = document.createElement('div');
    spinner.className = 'thumb-spinner';

    const imgContainer = document.createElement('div');
    imgContainer.className = 'thumb-img-container';

    const img = document.createElement('img');
    img.dataset.page = String(i);
    img.alt = 'صفحة ' + i;
    img.draggable = false;

    const cached = state.thumbCache.get(i) || state.pageCache.get(i);
    if (cached) {
      img.src = cached.dataUrl;
      item.classList.remove('loading');
      item.classList.add('loaded');
    }

    const num = document.createElement('span');
    num.className = 'thumb-num';
    num.textContent = String(i);

    /* مقبض سحب اختياري */
    const dragGrip = document.createElement('div');
    dragGrip.className = 'thumb-drag-grip';
    dragGrip.title = 'اسحب لإعادة الترتيب';
    dragGrip.innerHTML = '⋮⋮';

    imgContainer.appendChild(img);
    item.appendChild(spinner);
    item.appendChild(imgContainer);
    item.appendChild(num);
    item.appendChild(dragGrip);

    /* ─── Navigation onClick ─── */
    item.addEventListener('click', (e) => {
      if (item.classList.contains('was-dragged')) {
        item.classList.remove('was-dragged');
        return;
      }
      if (state.currentPage !== i) goToPage(i);
    });

    item.addEventListener('contextmenu', e => {
      e.preventDefault();
      e.stopPropagation();
      showSlideContextMenu(e, i);
    });

    /* ══════════════════════════════════════════════════════
       ★★★ خاصية السحب والإفلات لإعادة ترتيب الشرائح
       ══════════════════════════════════════════════════════ */
    item.addEventListener('dragstart', (e) => {
      draggedThumbPage = i;
      e.dataTransfer.setData('text/plain', String(i));
      e.dataTransfer.effectAllowed = 'move';
      item.classList.add('dragging');
      thumbsList.classList.add('drag-in-progress');

      try {
        const previewEl = item.cloneNode(true);
        previewEl.style.width = '120px';
        previewEl.style.height = '80px';
        previewEl.style.opacity = '0.9';
        previewEl.style.position = 'absolute';
        previewEl.style.top = '-9999px';
        document.body.appendChild(previewEl);
        e.dataTransfer.setDragImage(previewEl, 60, 40);
        setTimeout(() => previewEl.remove(), 0);
      } catch (_) {}
    });

    item.addEventListener('dragend', () => {
      draggedThumbPage = null;
      item.classList.remove('dragging');
      thumbsList.classList.remove('drag-in-progress');
      thumbsList.querySelectorAll('.thumb-item').forEach(el => {
        el.classList.remove('drop-target-before', 'drop-target-after');
      });
      setTimeout(() => item.classList.remove('was-dragged'), 50);
    });

    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (draggedThumbPage === i) return;

      const rect = item.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      const isAfter = e.clientY >= mid;

      thumbsList.querySelectorAll('.thumb-item').forEach(el => {
        if (el !== item) el.classList.remove('drop-target-before', 'drop-target-after');
      });

      if (isAfter) {
        item.classList.remove('drop-target-before');
        item.classList.add('drop-target-after');
      } else {
        item.classList.remove('drop-target-after');
        item.classList.add('drop-target-before');
      }
    });

    item.addEventListener('dragleave', (e) => {
      if (!item.contains(e.relatedTarget)) {
        item.classList.remove('drop-target-before', 'drop-target-after');
      }
    });

    item.addEventListener('drop', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      item.classList.add('was-dragged');

      const isAfter = item.classList.contains('drop-target-after');
      item.classList.remove('drop-target-before', 'drop-target-after');

      const fromPage = parseInt(e.dataTransfer.getData('text/plain') || String(draggedThumbPage), 10);
      if (isNaN(fromPage) || fromPage === i) return;

      let targetPage = isAfter ? i + 1 : i;
      if (fromPage < targetPage) targetPage--;

      if (fromPage === targetPage) return;

      await reorderSlide(fromPage, targetPage);
    });

    thumbsList.appendChild(item);
    if (i === state.currentPage) item.classList.add('active');
  }

  /* ═══ 2) زر إشارة زائد تحت آخر thumbnail لإضافة شريحة جديدة ═══ */
  const addSlideBtn = document.createElement('button');
  addSlideBtn.type = 'button';
  addSlideBtn.className = 'thumb-add-btn';
  addSlideBtn.id = 'btnAddSlideUnderThumbs';
  addSlideBtn.title = 'إضافة شريحة جديدة';
  addSlideBtn.innerHTML = `
    <div class="thumb-add-icon-wrap">
      <span class="thumb-add-plus">＋</span>
    </div>
    <span class="thumb-add-label">شريحة جديدة</span>
  `;
  addSlideBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    e.preventDefault();
    await newBlankSlide(state.totalPages);
  });
  thumbsList.appendChild(addSlideBtn);
}

/* ============================================================
   §12b. REORDER SLIDE — تحديث لحظي وسلس لترتيب الشرائح
   ============================================================ */
export async function reorderSlide(fromPage, toPage) {
  if (fromPage < 1 || fromPage > state.totalPages || toPage < 1 || toPage > state.totalPages || fromPage === toPage) {
    return;
  }

  const { savePageNow } = await import('./core.js');
  savePageNow();

  const total = state.totalPages;
  const order = Array.from({ length: total }, (_, idx) => idx + 1);

  // تحديث مصفوفة الترتيب
  const [movedOldIndex] = order.splice(fromPage - 1, 1);
  order.splice(toPage - 1, 0, movedOldIndex);

  // تحديث slides
  const [movedSlide] = state.slides.splice(fromPage - 1, 1);
  state.slides.splice(toPage - 1, 0, movedSlide);

  // تحديث pages
  const newPages = {};
  for (let newPos = 1; newPos <= total; newPos++) {
    const origPageNum = order[newPos - 1];
    newPages[newPos] = state.pages[origPageNum] || {
      annotations: [], embeds: [], media: [], buttons: [], texts: [], zOrder: [],
    };
  }
  state.pages = newPages;

  // تحديث history
  const newHistory = {};
  for (let newPos = 1; newPos <= total; newPos++) {
    const origPageNum = order[newPos - 1];
    if (state.history[origPageNum]) {
      newHistory[newPos] = state.history[origPageNum];
    }
  }
  state.history = newHistory;

  // تحديث pageCache
  const newPageCache = new Map();
  for (let newPos = 1; newPos <= total; newPos++) {
    const origPageNum = order[newPos - 1];
    if (state.pageCache.has(origPageNum)) {
      newPageCache.set(newPos, state.pageCache.get(origPageNum));
    }
  }
  state.pageCache = newPageCache;

  // تحديث thumbCache
  const newThumbCache = new Map();
  for (let newPos = 1; newPos <= total; newPos++) {
    const origPageNum = order[newPos - 1];
    if (state.thumbCache.has(origPageNum)) {
      newThumbCache.set(newPos, state.thumbCache.get(origPageNum));
    }
  }
  state.thumbCache = newThumbCache;

  // تحديث الصفحة الحالية
  const oldCurrentPage = state.currentPage;
  const newCurrentPos = order.indexOf(oldCurrentPage) + 1;
  state.currentPage = newCurrentPos > 0 ? newCurrentPos : toPage;

  // تحديث الواجهة فوراً
  renderThumbnails();
  updatePageIndicator();
  updateUndoButtonsSafe();

  await renderPage(state.currentPage);

  document.dispatchEvent(new CustomEvent('ipb:pageChanged', {
    detail: { page: state.currentPage },
  }));

  toast(`تم نقل الشريحة إلى الموضع ${toPage} ✨`, 'ok');
}

export function updateThumbnailImg(p) {
  if (!thumbsList) return;
  const item = thumbsList.querySelector(`.thumb-item[data-page="${p}"]`);
  if (!item) return;
  const img = item.querySelector('img');
  if (!img) return;
  const cached = state.thumbCache.get(p) || state.pageCache.get(p);
  if (cached && img.src !== cached.dataUrl) {
    img.src = cached.dataUrl;
    img.onload = () => {
      item.classList.remove('loading');
      item.classList.add('loaded');
    };
    if (img.complete) {
      item.classList.remove('loading');
      item.classList.add('loaded');
    }
  }
}

export function updateThumbnailActive(p) {
  if (!thumbsList) return;
  let active = null;
  thumbsList.querySelectorAll('.thumb-item').forEach(el => {
    const is = parseInt(el.dataset.page, 10) === p;
    el.classList.toggle('active', is);
    if (is) active = el;
  });
  if (active) {
    try { active.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
    catch (_) {}
  }
}

/* ============================================================
   §13. SLIDE NAVIGATION
   ============================================================ */
let sliding = false;

export async function goToPage(p) {
  if (sliding || p < 1 || p > state.totalPages || p === state.currentPage) return;
  sliding = true;
  const { savePageNow } = await import('./core.js');
  savePageNow();
  await captureStageThumbnail(state.currentPage).catch(() => {});
  if (stageContent) {
    stageContent.style.transition = 'none';
    stageContent.style.transform = '';
    void stageContent.offsetWidth;
  }
  state.currentPage = p;
  await renderPage(p);
  sliding = false;
}

/* ============================================================
   §14. SLIDE CONTEXT MENU
   ============================================================ */
let currentCtxSlideIdx = null;

export function showSlideContextMenu(e, slideIdx) {
  if (!slideContextMenu) return;
  currentCtxSlideIdx = slideIdx;
  const pasteBtn = slideContextMenu.querySelector('[data-action="paste"]');
  if (pasteBtn) pasteBtn.disabled = !slideClipboard.slides || !slideClipboard.slides.length;
  slideContextMenu.classList.add('show');

  const menuW = slideContextMenu.offsetWidth;
  const menuH = slideContextMenu.offsetHeight;
  let x = e.clientX, y = e.clientY;
  if (x + menuW > window.innerWidth - 8) x = window.innerWidth - menuW - 8;
  if (y + menuH > window.innerHeight - 8) y = window.innerHeight - menuH - 8;
  if (x < 8) x = 8;
  if (y < 8) y = 8;
  slideContextMenu.style.left = x + 'px';
  slideContextMenu.style.top = y + 'px';
}

export function hideSlideContextMenu() {
  if (slideContextMenu) slideContextMenu.classList.remove('show');
  currentCtxSlideIdx = null;
}

/* ============================================================
   §15. SLIDE OPERATIONS
   ============================================================ */
export async function cutSlide(idx) {
  const { savePageNow } = await import('./core.js');
  savePageNow();
  const slide = state.slides[idx - 1];
  if (!slide) return;
  const pagesData = state.pages[idx] || {
    annotations: [], embeds: [], media: [], buttons: [], texts: [], zOrder: [],
  };
  slideClipboard.slides = [{ ...slide, id: uid() }];
  slideClipboard.pagesData = { 1: JSON.parse(JSON.stringify(pagesData)) };

  state.slides.splice(idx - 1, 1);
  const newPages = {};
  for (let i = 1; i <= state.totalPages; i++) {
    if (i < idx) newPages[i] = state.pages[i];
    else if (i > idx) newPages[i - 1] = state.pages[i];
  }
  state.pages = newPages;
  state.history = {};
  _shiftCachesAfterDelete(idx);
  state.totalPages = state.slides.length;
  renderThumbnails();

  if (state.totalPages === 0) {
    if (pdfCanvas) pdfCanvas.getContext('2d').clearRect(0, 0, pdfCanvas.width, pdfCanvas.height);
    if (emptyState) {
      emptyState.style.display = 'flex';
      emptyState.style.backgroundColor = 'transparent';
      emptyState.style.backgroundImage = 'none';
    }
    document.body.classList.remove('has-project');
    document.body.classList.add('no-project');
  } else {
    const nc = Math.min(idx, state.totalPages) || 1;
    state.currentPage = nc;
    await renderPage(state.currentPage);
  }
  updatePageIndicator();
  toast('تم قص الشريحة', 'ok');
}

export async function pasteSlide(idx) {
  if (!slideClipboard.slides || !slideClipboard.slides.length) {
    toast('لا يوجد شيء للصقه', 'warn');
    return;
  }
  const { savePageNow } = await import('./core.js');
  savePageNow();
  const clip = slideClipboard;
  const insertAt = idx;
  const count = clip.slides.length;

  _shiftCachesAfterInsert(idx, count);

  clip.slides.forEach((s, k) => {
    state.slides.splice(insertAt + k, 0, { ...s, id: uid() });
  });

  const newPages = {};
  for (let i = 1; i <= idx; i++) newPages[i] = state.pages[i];
  clip.slides.forEach((s, k) => {
    const src = clip.pagesData[1];
    newPages[idx + 1 + k] = JSON.parse(JSON.stringify(src));
  });
  for (let i = idx + 1; i <= state.totalPages; i++) {
    newPages[i + count] = state.pages[i];
  }

  state.pages = newPages;
  state.history = {};
  state.totalPages = state.slides.length;
  renderThumbnails();
  state.currentPage = idx + 1;
  await renderPage(state.currentPage);
  updatePageIndicator();
  toast('تم لصق الشريحة', 'ok');
}

export async function newBlankSlide(idx) {
  const { savePageNow } = await import('./core.js');
  savePageNow();
  const insertAt = idx;
  _shiftCachesAfterInsert(idx, 1);
  state.slides.splice(insertAt, 0, { id: uid(), bg: { type: 'blank' } });

  const newPages = {};
  for (let i = 1; i <= idx; i++) newPages[i] = state.pages[i];
  newPages[idx + 1] = {
    annotations: [], embeds: [], media: [], buttons: [], texts: [], zOrder: [],
  };
  for (let i = idx + 1; i <= state.totalPages; i++) {
    newPages[i + 1] = state.pages[i];
  }

  state.pages = newPages;
  state.history = {};
  state.totalPages = state.slides.length;

  document.body.classList.add('has-project');
  document.body.classList.remove('no-project');

  renderThumbnails();
  state.currentPage = idx + 1;
  await renderPage(state.currentPage);
  updatePageIndicator();
  toast('تمت إضافة شريحة جديدة ✨', 'ok');
}

export async function duplicateSlide(idx) {
  const { savePageNow } = await import('./core.js');
  savePageNow();
  const slide = state.slides[idx - 1];
  if (!slide) return;
  const data = state.pages[idx] || {
    annotations: [], embeds: [], media: [], buttons: [], texts: [], zOrder: [],
  };
  const clone = JSON.parse(JSON.stringify(data));
  const insertAt = idx;
  _shiftCachesAfterInsert(idx, 1);
  state.slides.splice(insertAt, 0, { id: uid(), bg: { ...slide.bg } });

  const newPages = {};
  for (let i = 1; i <= idx; i++) newPages[i] = state.pages[i];
  newPages[idx + 1] = clone;
  for (let i = idx + 1; i <= state.totalPages; i++) {
    newPages[i + 1] = state.pages[i];
  }

  state.pages = newPages;
  state.history = {};
  state.totalPages = state.slides.length;
  renderThumbnails();
  state.currentPage = idx + 1;
  await renderPage(state.currentPage);
  updatePageIndicator();
  toast('تم تكرار الشريحة', 'ok');
}

export async function deleteSlide(idx) {
  if (state.totalPages <= 1) {
    toast('لا يمكن حذف الشريحة الأخيرة', 'warn');
    return;
  }
  const { savePageNow } = await import('./core.js');
  savePageNow();
  state.slides.splice(idx - 1, 1);

  const newPages = {};
  for (let i = 1; i <= state.totalPages; i++) {
    if (i < idx) newPages[i] = state.pages[i];
    else if (i > idx) newPages[i - 1] = state.pages[i];
  }

  state.pages = newPages;
  state.history = {};
  _shiftCachesAfterDelete(idx);
  state.totalPages = state.slides.length;
  renderThumbnails();
  const nc = Math.min(idx, state.totalPages) || 1;
  state.currentPage = nc;
  await renderPage(state.currentPage);
  updatePageIndicator();
  toast('تم حذف الشريحة', 'ok');
}

/* ============================================================
   §16. BINDING
   ============================================================ */
export function bindSlideContextMenu() {
  if (!slideContextMenu) return;
  slideContextMenu.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      e.preventDefault();
      const action = btn.dataset.action;
      const idx = currentCtxSlideIdx;
      hideSlideContextMenu();
      if (idx == null) return;
      if (action === 'cut') await cutSlide(idx);
      else if (action === 'paste') await pasteSlide(idx);
      else if (action === 'new') await newBlankSlide(idx);
      else if (action === 'duplicate') await duplicateSlide(idx);
      else if (action === 'delete') await deleteSlide(idx);
    });
  });
  document.addEventListener('pointerdown', e => {
    if (
      slideContextMenu.classList.contains('show') &&
      !slideContextMenu.contains(e.target)
    ) {
      hideSlideContextMenu();
    }
  }, true);
}
