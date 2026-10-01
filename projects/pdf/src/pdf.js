/* ============================================================
 * pdf.js — النسخة النهائية
 * ============================================================
 *  ★ الحل الجذري لمشكلة letter spacing:
 *    1) Pass 1 يرسم الصفحة → يجبر pdf.js على تسجيل الخطوط
 *    2) ننتظر كل font object في page.commonObjs (مصدر widths)
 *    3) ننتظر document.fonts.ready + كل FontFace.load()
 *    4) ننتظر loadingdone event مع timeout
 *    5) Pass 2 يعيد الرسم — widths جاهزة الآن
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
  hexToRgba, roundRect, stripMathToPlain,
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
  if (typeof window !== 'undefined') window.__PDFJS__ = pdfjsLib;
}

/* ============================================================
   §2. ★★★ FONT WARMUP — الحل الجذري ★★★
   ============================================================
   ننتظر 4 طبقات معاً لضمان جاهزية widths:
     1. كل font object في page.commonObjs (مصدر widths الأساسي)
     2. document.fonts.ready (تحميل ملف الخط)
     3. fontFace.load() لكل FontFace (تحميل فعلي)
     4. loadingdone event + تأخير (تفعيل على canvas)
   ============================================================ */

/**
 * ينتظر كل font objects في page.commonObjs.
 * هذه هي الطريقة الموثوقة للانتظار حتى pdf.js يجهّز الـ widths.
 */
function waitForCommonObjsFonts(page) {
  return new Promise(resolve => {
    let opList;
    try {
      /* getOperatorList يمكن استدعاؤه أكثر من مرة — pdf.js يعيد النتيجة المخزّنة */
      page.getOperatorList().then(list => {
        opList = list;

        const fontIds = new Set();
        const OPS = pdfjsLib.OPS;
        for (let i = 0; i < opList.fnArray.length; i++) {
          if (opList.fnArray[i] === OPS.setFont) {
            const id = opList.argsArray[i][0];
            if (id) fontIds.add(id);
          }
        }

        if (fontIds.size === 0) {
          resolve();
          return;
        }

        let remaining = fontIds.size;
        const done = () => {
          remaining--;
          if (remaining === 0) resolve();
        };

        fontIds.forEach(id => {
          try {
            if (page.commonObjs.has && page.commonObjs.has(id)) {
              done();
            } else {
              page.commonObjs.get(id, () => done());
            }
          } catch (_) {
            done();
          }
        });

        /* timeout أمان */
        setTimeout(resolve, 2000);
      }).catch(() => resolve());
    } catch (_) {
      resolve();
    }
  });
}

/**
 * ينتظر FontFace API بعد الرسم (font loading on canvas).
 */
async function waitForFontFaceAPI(timeoutMs = 1500) {
  try {
    /* 1) document.fonts.ready */
    if (document.fonts && document.fonts.ready) {
      try { await document.fonts.ready; } catch (_) {}
    }

    /* 2) fontFace.load() صراحةً لكل الخطوط */
    if (document.fonts && document.fonts.forEach) {
      const faces = [];
      document.fonts.forEach(f => faces.push(f));
      await Promise.all(faces.map(f => {
        try {
          return (f.load ? f.load() : Promise.resolve()).catch(() => {});
        } catch (_) {
          return Promise.resolve();
        }
      }));
    }

    /* 3) loadingdone event مع timeout */
    await new Promise(resolve => {
      let done = false;
      const finish = () => { if (!done) { done = true; resolve(); } };

      if (!document.fonts) { finish(); return; }

      if (document.fonts.status === 'loaded') {
        setTimeout(finish, 80);
        return;
      }

      const handler = () => {
        document.fonts.removeEventListener('loadingdone', handler);
        finish();
      };
      document.fonts.addEventListener('loadingdone', handler);
      setTimeout(() => {
        try { document.fonts.removeEventListener('loadingdone', handler); } catch (_) {}
        finish();
      }, timeoutMs);
    });
  } catch (_) {}
}

/**
 * تأخير RAF × 2 + timeout صغير لضمان أن canvas يستخدم الخطوط الجديدة.
 */
function waitFramesAndDelay(delayMs = 100) {
  return new Promise(resolve => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(resolve, delayMs);
      });
    });
  });
}

/* ============================================================
   §3. RENDER OPTIONS
   ============================================================ */
function _buildRenderOpts(canvasContext, viewport, transform, intent) {
  const opts = {
    canvasContext,
    viewport,
    transform: transform || null,
    background: '#ffffff',
  };
  if (intent) opts.intent = intent;
  try {
    if (pdfjsLib?.AnnotationMode?.DISABLE !== undefined) {
      opts.annotationMode = pdfjsLib.AnnotationMode.DISABLE;
    }
  } catch (_) {}
  return opts;
}

/* ============================================================
   §4. ★★★ RENDER PAGE WITH FONTS — Double Render ★★★
   ============================================================ */

/* ============================================================
   ★★★ renderPageWithFonts — نسخة بسيطة بعد disableFontFace:true ★★★
   ============================================================
   مع disableFontFace: true، pdf.js يرسم كل glyph مباشرة من
   مصفوفة transform — لا يعتمد على canvas font metrics.
   النتيجة: letter spacing دقيق من الرسم الأول.
   ============================================================ */
async function renderPageWithFonts(page, pdfPageNum, canvas, cssW, cssH, dpr) {
  const vp1 = page.getViewport({ scale: 1 });

  /* viewport كامل — لا transform */
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


  const vp1 = page.getViewport({ scale: 1 });

  /* ★ viewport كامل — لا transform */
  const renderScale = (cssW * dpr) / vp1.width;
  const viewport = page.getViewport({ scale: renderScale });

  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';

  const ctx = canvas.getContext('2d', { alpha: false });

  const prep = () => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
  };

  /* ═══ المرحلة 1: تحضير الخطوط ═══ */
  try { await page.getTextContent(); } catch (_) {}
  try { await page.getOperatorList(); } catch (_) {}

  /* ═══ جمع كل font objects ═══ */
  const fonts = [];
  try {
    const opList = await page.getOperatorList();
    const OPS = pdfjsLib.OPS;
    const ids = new Set();
    for (let i = 0; i < opList.fnArray.length; i++) {
      if (opList.fnArray[i] === OPS.setFont) {
        const id = opList.argsArray[i][0];
        if (id) ids.add(id);
      }
    }
    for (const id of ids) {
      const f = await new Promise(r => {
        let done = false;
        const fin = x => { if (!done) { done = true; r(x); } };
        try { page.commonObjs.get(id, fin); } catch (_) { fin(null); }
        setTimeout(() => fin(null), 1500);
      });
      if (f) fonts.push(f);
    }
  } catch (_) {}

  /* ═══ انتظار FontFace API ═══ */
  try {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
  } catch (_) {}
  const faces = [];
  try { document.fonts.forEach(f => faces.push(f)); } catch (_) {}
  for (const f of faces) {
    try { if (f.load) await f.load(); } catch (_) {}
  }

  /* ═══ تسخين canvas بكل خط ═══ */
  try {
    ctx.fillStyle = '#000';
    ctx.textBaseline = 'alphabetic';
    for (const f of fonts) {
      const fam = f.loadedName || f.name;
      if (!fam) continue;
      ctx.font = `20px "${fam}"`;
      ctx.fillText('Wg 0123', 0, 20);
    }
  } catch (_) {}

  await new Promise(r => requestAnimationFrame(r));
  await new Promise(r => requestAnimationFrame(r));
  await new Promise(r => setTimeout(r, 300));

  /* ═══ Pass 1: رسم أول (يجبر pdf.js على استخدام الخطوط الجاهزة) ═══ */
  prep();
  await page.render({
    canvasContext: ctx,
    viewport,
    background: '#ffffff',
  }).promise;

  await new Promise(r => setTimeout(r, 80));

  /* ═══ Pass 2: رسم نهائي ═══ */
  prep();
  await page.render({
    canvasContext: ctx,
    viewport,
    background: '#ffffff',
  }).promise;
  /* Pass 3 للضمان */
await new Promise(r => setTimeout(r, 80));
prep();
await page.render({ canvasContext: ctx, viewport, background: '#ffffff' }).promise;

  return ctx;
}
/* ============================================================
   §5. RENDER TO OFFSCREEN (للـ cache والـ thumbnails)
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
   §6. STAGE SIZING
   ============================================================ */
export function getSidebarWidth() {
  return thumbnailSidebar.classList.contains('collapsed') ? 0 : (thumbnailSidebar.offsetWidth || 0);
}

export function computeStageSize(naturalW, naturalH) {
  const wrap = stageWrapper.getBoundingClientRect();
  const sW = getSidebarWidth();
  const availW = Math.max(80, wrap.width - sW - 12 - 66);
  const availH = Math.max(80, wrap.height - 30 - 80);
  const aspect = naturalW / naturalH;
  let cW = availW, cH = cW / aspect;
  if (cH > availH) { cH = availH; cW = cH * aspect; }
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  let canvasW = Math.ceil(cW * dpr), canvasH = Math.ceil(cH * dpr);
  const maxPx = 16 * 1024 * 1024;
  if (canvasW * canvasH > maxPx) {
    const f = Math.sqrt(maxPx / (canvasW * canvasH));
    canvasW = Math.floor(canvasW * f);
    canvasH = Math.floor(canvasH * f);
  }
  return { cssW: cW, cssH: cH, canvasW, canvasH, dpr };
}

export function updateStageRect0() {
  const wrap = stageWrapper.getBoundingClientRect();
  const sW = getSidebarWidth();
  const cW = state.cssW, cH = state.cssH;
  state.stageRect0.left = wrap.left + sW + (wrap.width - sW - cW) / 2;
  state.stageRect0.top = wrap.top + (wrap.height - cH) / 2;
  state.stageRect0.width = cW;
  state.stageRect0.height = cH;
}

export function applyView() {
  const { scale, tx, ty } = state.view;
  if (scale === 1 && tx === 0 && ty === 0) stage.style.transform = '';
  else stage.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
}

/* ============================================================
   §7. RENDER PAGE
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
      vp1W = vp1.width; vp1H = vp1.height; aspect = vp1.height / vp1.width;
    } else if (bg.type === 'blank') {
      if (state.pdfDoc) {
        const page = await state.pdfDoc.getPage(1);
        const vp1 = page.getViewport({ scale: 1 });
        vp1W = vp1.width; vp1H = vp1.height; aspect = vp1.height / vp1.width;
      } else { vp1W = .707; vp1H = 1; aspect = 1 / .707; }
    } else {
      vp1W = 1; vp1H = (state.pdfH / state.pdfW) || 1.414; aspect = vp1H / vp1W;
    }

    state.pdfW = COORD_WIDTH;
    state.pdfH = Math.round(COORD_WIDTH * aspect);
    updateThumbAspect();

    const { cssW, cssH, canvasW, canvasH, dpr } = computeStageSize(vp1W, vp1H);
    state.canvasScale = canvasW / state.pdfW;
    state.cssW = cssW; state.cssH = cssH;
    state.dpr = dpr;

    stage.style.width = cssW + 'px';
    stage.style.height = cssH + 'px';

    [pdfCanvas, transientCanvas, laserCanvas].forEach(c => {
      c.width = canvasW;
      c.height = canvasH;
      c.style.width = cssW + 'px';
      c.style.height = cssH + 'px';
    });
    svgLayer.setAttribute('viewBox', `0 0 ${state.pdfW} ${state.pdfH}`);

    const cached = state.pageCache.get(pageNum);

    if (cached) {
      const ctx = pdfCanvas.getContext('2d', { alpha: false });
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvasW, canvasH);
      const img = new Image();
      await new Promise(res => { img.onload = res; img.onerror = res; img.src = cached.dataUrl; });
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvasW, canvasH);
    } else if (bg.type === 'pdf' && state.pdfDoc) {
      const page = await state.pdfDoc.getPage(bg.page);
      await renderPageWithFonts(page, bg.page, pdfCanvas, cssW, cssH, dpr);

      /* خزّن في الـ cache (الآن مضمون) */
      try {
        const result = await renderPageToOffscreen(
          page, bg.page, Math.min(cssW * 1.5, CACHE_WIDTH), Math.min(dpr, 2), 'jpeg', 0.95
        );
        state.pageCache.set(pageNum, { dataUrl: result.dataUrl });
      } catch (_) {
        try {
          const cc = document.createElement('canvas');
          const cw = Math.min(canvasW, CACHE_WIDTH);
          const ch = Math.round(cw * canvasH / canvasW);
          cc.width = cw; cc.height = ch;
          const cctx = cc.getContext('2d', { alpha: false });
          cctx.imageSmoothingEnabled = true;
          cctx.imageSmoothingQuality = 'high';
          cctx.drawImage(pdfCanvas, 0, 0, cw, ch);
          state.pageCache.set(pageNum, { dataUrl: cc.toDataURL('image/jpeg', 0.95) });
        } catch (__) {}
      }
    } else if (bg.type === 'blank') {
      const ctx = pdfCanvas.getContext('2d', { alpha: false });
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvasW, canvasH);
      try {
        const cc = document.createElement('canvas');
        const cw = Math.min(canvasW, CACHE_WIDTH);
        const ch = Math.round(cw * canvasH / canvasW);
        cc.width = cw; cc.height = ch;
        const cctx = cc.getContext('2d', { alpha: false });
        cctx.fillStyle = '#fff';
        cctx.fillRect(0, 0, cw, ch);
        state.pageCache.set(pageNum, { dataUrl: cc.toDataURL('image/jpeg', 0.95) });
      } catch (_) {}
    } else if (state.pdfBlob) {
      const ctx = pdfCanvas.getContext('2d', { alpha: false });
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvasW, canvasH);
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
      } finally { URL.revokeObjectURL(url); }
    }

    updateStageRect0();
    applyView();
    loadPageState(pageNum);
    updatePageIndicator();
    updateUndoButtonsSafe();
    emptyState.style.display = 'none';

    setTimeout(() => { captureStageThumbnail(pageNum).catch(() => {}); }, 50);

  } catch (err) {
    console.error(err);
    toast('تعذّر عرض الصفحة', 'error');
  } finally {
    if (!hasCache) setLoading(false);
  }
}

/* ============================================================
   §8. PRELOAD
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
        /* ⚠️ لا ننتظر الخطوط في thumbnails (أسرع بكثير) */
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
        await page.render({ canvasContext: c, viewport: cssViewport, intent: 'display' }).promise;
        if (state.preloadToken !== token) return;
        state.thumbCache.set(i, { dataUrl: cvs.toDataURL('image/jpeg', 0.82) });
        updateThumbnailImg(i);
        page.cleanup();
        await new Promise(r => setTimeout(r, 0));
      } else if (bg.type === 'blank') {
        const cvs = document.createElement('canvas');
        cvs.width = THUMB_WIDTH;
        cvs.height = Math.round(THUMB_WIDTH * (state.pdfH / state.pdfW || 1.414));
        const c = cvs.getContext('2d');
        c.fillStyle = '#fff';
        c.fillRect(0, 0, cvs.width, cvs.height);
        state.thumbCache.set(i, { dataUrl: cvs.toDataURL('image/jpeg', 0.82) });
        updateThumbnailImg(i);
        await new Promise(r => setTimeout(r, 0));
      }
    } catch (e) { console.warn('thumb preload', i, e); }
  }

  /* cache عالي الدقة — يستخدم renderPageWithFonts كاملاً */
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
        const cacheCSS = Math.min(CACHE_WIDTH, Math.max(1200, Math.round(vp1.width * 1.6)));
        const cacheDpr = Math.min(window.devicePixelRatio || 1, 2);
        const result = await renderPageToOffscreen(page, bg.page, cacheCSS, cacheDpr, 'jpeg', 0.95);
        if (state.preloadToken !== token) return;
        state.pageCache.set(i, { dataUrl: result.dataUrl });
        page.cleanup();
        await new Promise(r => setTimeout(r, 0));
      } else if (bg.type === 'blank') {
        await new Promise(r => setTimeout(r, 0));
      }
    } catch (e) { console.warn('page preload', i, e); }
  }
}

/* ============================================================
   §9. THUMBNAIL CAPTURE
   ============================================================ */
export async function captureStageThumbnail(pageNum) {
  if (!pageNum || pageNum < 1 || pageNum > state.totalPages) return;
  if (state.currentPage !== pageNum) return;
  if (!state.cssW || !state.cssH) return;

  try {
    const TW = 320;
    const aspect = state.cssW / state.cssH;
    const TH = Math.round(TW / aspect);

    const canvas = document.createElement('canvas');
    canvas.width = TW;
    canvas.height = TH;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, TW, TH);

    try { ctx.drawImage(pdfCanvas, 0, 0, TW, TH); } catch (_) {}

    try {
      const svgClone = svgLayer.cloneNode(true);
      svgClone.querySelectorAll('.selection-overlay, .handle').forEach(n => n.remove());
      svgClone.setAttribute('width', state.pdfW);
      svgClone.setAttribute('height', state.pdfH);
      svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      const svgStr = new XMLSerializer().serializeToString(svgClone);
      const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      try {
        const svgImg = await new Promise((res, rej) => {
          const i = new Image();
          i.onload = () => res(i);
          i.onerror = rej;
          i.src = svgUrl;
        });
        ctx.drawImage(svgImg, 0, 0, TW, TH);
      } finally { URL.revokeObjectURL(svgUrl); }
    } catch (_) {}

    const saved = state.pages[pageNum];
    if (saved) {
      const scale = TW / state.cssW;
      ctx.textBaseline = 'top';

      (saved.texts || []).forEach(spec => {
        try {
          const x = parseFloat(spec.x) / 100 * TW;
          const y = parseFloat(spec.y) / 100 * TH;
          const w = parseFloat(spec.w) * scale;
          const fontSize = (spec.fontSize || 20) * scale;
          const text = stripMathToPlain(spec.text || '');
          if (!text) return;
          ctx.fillStyle = spec.color || '#000';
          ctx.font = `${spec.fontStyle === 'italic' ? 'italic ' : ''}${spec.fontWeight === 'bold' ? 'bold ' : ''}${fontSize}px ${spec.fontFamily || 'system-ui'}`;
          ctx.textAlign = spec.align === 'center' ? 'center'
                        : spec.align === 'left' ? 'left' : 'right';
          const drawX = spec.align === 'center' ? x + w / 2
                      : spec.align === 'left' ? x : x + w;
          ctx.fillText(text, drawX, y, w);
        } catch (_) {}
      });

      (saved.buttons || []).forEach(spec => {
        try {
          const x = parseFloat(spec.x) / 100 * TW;
          const y = parseFloat(spec.y) / 100 * TH;
          const w = parseFloat(spec.w) * scale;
          const h = parseFloat(spec.h) * scale;
          const r = Math.min((spec.borderRadius || 12) * scale, Math.min(w, h) / 2);
          ctx.fillStyle = hexToRgba(spec.fillColor, spec.fillOpacity);
          roundRect(ctx, x, y, w, h, r);
          ctx.fill();
          ctx.strokeStyle = hexToRgba(spec.borderColor, spec.borderOpacity);
          ctx.lineWidth = 1;
          ctx.stroke();
          const fontSize = (spec.fontSize || 18) * scale;
          const text = stripMathToPlain(spec.text || '');
          if (text) {
            ctx.fillStyle = spec.textColor || '#000';
            ctx.font = `600 ${fontSize}px system-ui`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, x + w / 2, y + h / 2, w - 4);
            ctx.textBaseline = 'top';
          }
        } catch (_) {}
      });

      const mediaList = saved.media || saved.videos || [];
      mediaList.forEach(spec => {
        try {
          const x = parseFloat(spec.x) / 100 * TW;
          const y = parseFloat(spec.y) / 100 * TH;
          const w = parseFloat(spec.w) / 100 * TW;
          const h = parseFloat(spec.h) / 100 * TH;
          ctx.fillStyle = '#2b2b2b';
          ctx.fillRect(x, y, w, h);
        } catch (_) {}
      });
      (saved.embeds || []).forEach(spec => {
        try {
          const x = parseFloat(spec.x) / 100 * TW;
          const y = parseFloat(spec.y) / 100 * TH;
          const w = parseFloat(spec.w) / 100 * TW;
          const h = parseFloat(spec.h) / 100 * TH;
          ctx.fillStyle = '#e6eeff';
          ctx.fillRect(x, y, w, h);
          ctx.strokeStyle = '#4a7eff';
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
        } catch (_) {}
      });
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    state.thumbCache.set(pageNum, { dataUrl, userEdited: true });
    updateThumbnailImg(pageNum);
  } catch (e) {
    console.warn('captureStageThumbnail failed:', e);
  }
}

/* ============================================================
   §10. CACHE SHIFTING
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
   §11. LOAD PDF / IMAGE
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
   §12. PAGE INDICATOR
   ============================================================ */
export function updatePageIndicator() {
  if (!state.totalPages) { pageIndicator.textContent = ''; return; }
  pageIndicator.textContent = state.currentPage + ' / ' + state.totalPages;
  const btnPrev = $('btnPrev'), btnNext = $('btnNext');
  btnPrev.disabled = state.currentPage <= 1;
  btnNext.disabled = state.currentPage >= state.totalPages;
  updateThumbnailActive(state.currentPage);
}

/* ============================================================
   §13. SIDEBAR
   ============================================================ */
export function updateSidebarPadding() {
  const w = getSidebarWidth();
  document.documentElement.style.setProperty('--sidebar-effective-w', w + 'px');
  $('btnShowSidebar').classList.toggle('show', thumbnailSidebar.classList.contains('collapsed'));
}

export function updateThumbAspect() {
  const aspect = (state.pdfW && state.pdfH) ? (state.pdfW / state.pdfH) : 0.75;
  document.documentElement.style.setProperty('--thumb-aspect', String(aspect));
}

export function initSidebar() {
  let savedW = parseInt(localStorage.getItem(SIDEBAR_W_KEY) || String(SIDEBAR_DEFAULT_W), 10);
  if (isNaN(savedW)) savedW = SIDEBAR_DEFAULT_W;
  savedW = Math.max(SIDEBAR_MIN_W, Math.min(SIDEBAR_MAX_W, savedW));
  thumbnailSidebar.style.width = savedW + 'px';

  const savedVisible = localStorage.getItem(SIDEBAR_V_KEY) !== 'false';
  if (!savedVisible) thumbnailSidebar.classList.add('collapsed');

  updateSidebarPadding();
  renderThumbnails();

  $('btnToggleSidebar').addEventListener('click', () => {
    thumbnailSidebar.classList.add('collapsed');
    localStorage.setItem(SIDEBAR_V_KEY, 'false');
    updateSidebarPadding();
    setTimeout(() => window.dispatchEvent(new Event('resize')), 230);
  });
  $('btnShowSidebar').addEventListener('click', () => {
    thumbnailSidebar.classList.remove('collapsed');
    localStorage.setItem(SIDEBAR_V_KEY, 'true');
    updateSidebarPadding();
    setTimeout(() => window.dispatchEvent(new Event('resize')), 230);
  });

  const handle = $('sidebarResize');
  handle.addEventListener('pointerdown', e => {
    e.preventDefault(); e.stopPropagation();
    handle.classList.add('dragging');
    thumbnailSidebar.style.transition = 'none';
    stageWrapper.classList.add('no-transition');
    const sx = e.clientX, sw0 = thumbnailSidebar.offsetWidth;
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
      stageWrapper.classList.remove('no-transition');
      localStorage.setItem(SIDEBAR_W_KEY, String(thumbnailSidebar.offsetWidth));
      updateSidebarPadding();
      window.dispatchEvent(new Event('resize'));
    }
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
  });
}

/* ============================================================
   §14. THUMBNAILS UI
   ============================================================ */
export function renderThumbnails() {
  if (!thumbsList) return;
  thumbsList.innerHTML = '';
  if (!state.totalPages) {
    thumbsList.innerHTML = '<div class="thumbs-empty">لا توجد صفحات<br>افتح ملفاً للبدء</div>';
    return;
  }
  for (let i = 1; i <= state.totalPages; i++) {
    const item = document.createElement('div');
    item.className = 'thumb-item loading';
    item.dataset.page = i;

    const spinner = document.createElement('div');
    spinner.className = 'thumb-spinner';

    const img = document.createElement('img');
    img.dataset.page = i;
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
    num.textContent = i;

    item.appendChild(spinner);
    item.appendChild(img);
    item.appendChild(num);

    item.addEventListener('click', () => {
      if (state.currentPage !== i) goToPage(i);
    });
    item.addEventListener('contextmenu', e => {
      e.preventDefault(); e.stopPropagation();
      showSlideContextMenu(e, i);
    });

    thumbsList.appendChild(item);
    if (i === state.currentPage) item.classList.add('active');
  }
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
   §15. SLIDE NAVIGATION
   ============================================================ */
let sliding = false;

export async function goToPage(p) {
  if (sliding || p < 1 || p > state.totalPages || p === state.currentPage) return;
  sliding = true;
  const { savePageNow } = await import('./core.js');
  savePageNow();
  await captureStageThumbnail(state.currentPage).catch(() => {});
  stageContent.style.transition = 'none';
  stageContent.style.transform = '';
  void stageContent.offsetWidth;
  state.currentPage = p;
  await renderPage(p);
  sliding = false;
}

/* ============================================================
   §16. SLIDE CONTEXT MENU
   ============================================================ */
let currentCtxSlideIdx = null;

export function showSlideContextMenu(e, slideIdx) {
  currentCtxSlideIdx = slideIdx;
  const pasteBtn = slideContextMenu.querySelector('[data-action="paste"]');
  pasteBtn.disabled = !slideClipboard.slides || !slideClipboard.slides.length;
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
  slideContextMenu.classList.remove('show');
  currentCtxSlideIdx = null;
}

/* ============================================================
   §17. SLIDE OPERATIONS
   ============================================================ */
export async function cutSlide(idx) {
  const { savePageNow } = await import('./core.js');
  savePageNow();
  const slide = state.slides[idx - 1];
  if (!slide) return;
  const pagesData = state.pages[idx] || { annotations: [], embeds: [], media: [], buttons: [], texts: [] };
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
    pdfCanvas.getContext('2d').clearRect(0, 0, pdfCanvas.width, pdfCanvas.height);
    emptyState.style.display = 'flex';
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
  newPages[idx + 1] = { annotations: [], embeds: [], media: [], buttons: [], texts: [] };
  for (let i = idx + 1; i <= state.totalPages; i++) newPages[i + 1] = state.pages[i];

  state.pages = newPages;
  state.history = {};
  state.totalPages = state.slides.length;
  renderThumbnails();
  state.currentPage = idx + 1;
  await renderPage(state.currentPage);
  updatePageIndicator();
  toast('تمت إضافة شريحة جديدة', 'ok');
}

export async function duplicateSlide(idx) {
  const { savePageNow } = await import('./core.js');
  savePageNow();
  const slide = state.slides[idx - 1];
  if (!slide) return;
  const data = state.pages[idx] || { annotations: [], embeds: [], media: [], buttons: [], texts: [] };
  const clone = JSON.parse(JSON.stringify(data));
  const insertAt = idx;
  _shiftCachesAfterInsert(idx, 1);
  state.slides.splice(insertAt, 0, { id: uid(), bg: { ...slide.bg } });

  const newPages = {};
  for (let i = 1; i <= idx; i++) newPages[i] = state.pages[i];
  newPages[idx + 1] = clone;
  for (let i = idx + 1; i <= state.totalPages; i++) newPages[i + 1] = state.pages[i];

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
   §18. BINDING
   ============================================================ */
export function bindSlideContextMenu() {
  slideContextMenu.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation(); e.preventDefault();
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
    if (slideContextMenu.classList.contains('show') && !slideContextMenu.contains(e.target)) {
      hideSlideContextMenu();
    }
  }, true);
}