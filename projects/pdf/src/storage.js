/* ============================================================
 * storage.js — حفظ/فتح .actpdf + تصدير PDF
 * ============================================================
 *  ★ يحفظ zOrder لكل شريحة
 *  ★ يدعم wrappers الجديدة للـ SVG annotations
 *  ★ تصدير PDF مع z-order صحيح
 * ============================================================ */

import {
  state, mediaBlobs,
  JSZIP_URL, JSPDF_URL, HTML2CANVAS_URL, FILE_EXT,
  uid, setLoading, toast, showSaveStatus,
  hexToRgba, roundRect, escapeXml, stripMathToPlain,
  renderTextWithMath, loadScript,
  savePageNow, applySnapshot,
} from './core.js';

import {
  loadPdfFile, loadImageFile, renderPage, preloadAllPages,
  renderThumbnails, updatePageIndicator,
} from './pdf.js';

/* ============================================================
   §1. LAZY LIBRARY LOADERS
   ============================================================ */
let JSZipLib = null;
async function ensureJSZip() {
  if (JSZipLib) return JSZipLib;
  if (window.JSZip) { JSZipLib = window.JSZip; return JSZipLib; }
  await loadScript(JSZIP_URL);
  JSZipLib = window.JSZip;
  return JSZipLib;
}

async function getJsPDF() {
  if (window.jspdf && window.jspdf.jsPDF) return window.jspdf.jsPDF;
  await loadScript(JSPDF_URL);
  return window.jspdf.jsPDF;
}

async function getHtml2Canvas() {
  if (window.html2canvas) return window.html2canvas;
  await loadScript(HTML2CANVAS_URL);
  return window.html2canvas;
}

/* ============================================================
   §2. SVG ANNOTATIONS → PNG
   ============================================================ */
function buildAnnotationSvg(annotations, pdfW, pdfH, scale) {
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${pdfW} ${pdfH}" width="${pdfW}" height="${pdfH}">`
  ];
  parts.push(`<defs>
    <marker id="arrow-end-normal" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse" markerUnits="strokeWidth"><path d="M 0 0 L 10 5 L 0 10 Z" fill="context-stroke"/></marker>
    <marker id="arrow-end-hollow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse" markerUnits="strokeWidth"><path d="M 0 0 L 10 5 L 0 10 Z" fill="#fff" stroke="context-stroke" stroke-width="1"/></marker>
    <marker id="arrow-start-normal" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="6" markerHeight="6" orient="auto" markerUnits="strokeWidth"><path d="M 10 0 L 0 5 L 10 10 Z" fill="context-stroke"/></marker>
    <marker id="arrow-start-hollow" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="6" markerHeight="6" orient="auto" markerUnits="strokeWidth"><path d="M 10 0 L 0 5 L 10 10 Z" fill="#fff" stroke="context-stroke" stroke-width="1"/></marker>
    <marker id="circle-end" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto" markerUnits="strokeWidth"><circle cx="5" cy="5" r="4" fill="context-stroke"/></marker>
    <marker id="square-end" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto" markerUnits="strokeWidth"><rect x="1" y="1" width="8" height="8" fill="context-stroke"/></marker>
  </defs>`);
  for (const spec of annotations) {
    const tag = spec.tag, out = {}, attrs = spec.attrs || {};
    for (const k in attrs) out[k] = attrs[k];
    if (out['stroke-width']) out['stroke-width'] = parseFloat(out['stroke-width']) * scale;
    const attrStr = Object.keys(out).map(k => `${k}="${escapeXml(out[k])}"`).join(' ');
    if (['path', 'line', 'rect', 'ellipse', 'circle'].includes(tag)) {
      parts.push(`<${tag} ${attrStr}/>`);
    }
  }
  parts.push('</svg>');
  return parts.join('');
}

function loadImageFromUrl(url) {
  return new Promise(res => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => res(null);
    i.src = url;
  });
}

async function svgStrToPngDataUrl(svgStr, w, h) {
  const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr);
  const img = await loadImageFromUrl(dataUrl);
  if (!img) return null;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  cv.getContext('2d').drawImage(img, 0, 0, w, h);
  return cv.toDataURL('image/png');
}

/* ============================================================
   §3. SAVE .actpdf
   ============================================================ */
export async function saveProjectAsFile() {
  if (!state.slides.length) { toast('لا يوجد مشروع لحفظه', 'warn'); return; }
  setLoading(true, 'جارٍ تجهيز الملف…');
  try {
    const JSZip = await ensureJSZip();
    savePageNow();

    const now = new Date();
    const version = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}-${String(now.getMinutes()).padStart(2,'0')}`;

    const zip = new JSZip();
    const projectData = {
      version: 2,
      slides: state.slides,
      pages: state.pages,
      currentPage: state.currentPage,
      totalPages: state.totalPages,
      pdfName: `${state.pdfName}_v${version}`,
      pdfIsImage: state.pdfIsImage,
      projectDims: state.projectDims || null,
      savedAt: Date.now(),
    };
    zip.file('project.json', JSON.stringify(projectData));

    if (state.pdfBlob) {
      const ext = state.pdfIsImage ? 'bin' : 'pdf';
      zip.file(`document.${ext}`, state.pdfBlob);
      zip.file('meta.json', JSON.stringify({ ext }));
    }

    mediaBlobs.forEach((blob, id) => {
      zip.file(`media/${id}`, blob);
    });

    const blob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });
    const outName = (state.pdfName || 'project').replace(/\.[^.]+$/, '') + FILE_EXT;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = outName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    toast('تم حفظ المشروع ✅', 'ok');
    showSaveStatus('✓ تم التنزيل');
  } catch (err) {
    console.error(err);
    toast('فشل الحفظ: ' + err.message, 'error');
  } finally {
    setLoading(false);
  }
}

/* ============================================================
   §4. LOAD .actpdf
   ============================================================ */
export async function loadProjectFromFile(file) {
  setLoading(true, 'جارٍ فتح المشروع…');
  try {
    const JSZip = await ensureJSZip();
    const zip = await JSZip.loadAsync(file);

    const projectFile = zip.file('project.json');
    if (!projectFile) throw new Error('ملف المشروع غير صالح');
    const data = JSON.parse(await projectFile.async('string'));

    const metaFile = zip.file('meta.json');
    let meta = { ext: 'pdf' };
    if (metaFile) {
      try { meta = JSON.parse(await metaFile.async('string')); }
      catch (_) {}
    }

    const docFile = zip.file(`document.${meta.ext}`)
                 || zip.file('document.pdf')
                 || zip.file('document.bin');
    let pdfBlob = null;
    if (docFile) pdfBlob = await docFile.async('blob');

    mediaBlobs.clear();
    const mediaFiles = Object.keys(zip.files)
      .filter(p => p.startsWith('media/') && !zip.files[p].dir);
    for (const path of mediaFiles) {
      const id = path.substring('media/'.length);
      const blob = await zip.file(path).async('blob');
      mediaBlobs.set(id, blob);
    }

    if (data.projectDims) {
      state.projectDims = data.projectDims;
    } else {
      state.projectDims = null;
    }

    state.slides = data.slides || [];
    state.pages = data.pages || {};
    state.history = {};
    state.totalPages = data.totalPages || state.slides.length;
    state.currentPage = data.currentPage || 1;
    state.pdfName = data.pdfName || 'project.pdf';
    state.pdfIsImage = !!data.pdfIsImage;

    const stageEl = document.getElementById('stage');
    if (stageEl) stageEl.classList.remove('empty');

    document.body.classList.add('has-project');
    document.body.classList.remove('no-project');

    if (pdfBlob) {
      const f = new File([pdfBlob], state.pdfName, {
        type: state.pdfIsImage ? (pdfBlob.type || 'image/png') : 'application/pdf',
      });

      if (state.pdfIsImage) {
        await loadImageFile(f, { keepPages: true, skipRender: true });
      } else {
        await loadPdfFile(f, {
          keepPages: true,
          skipRender: true,
          restoredSlides: state.slides,
        });
      }

      state.slides = data.slides;
      state.totalPages = state.slides.length;
      state.currentPage = Math.min(data.currentPage || 1, state.totalPages) || 1;
      renderThumbnails();
      await renderPage(state.currentPage);
      preloadAllPages(state.preloadToken);
    }
    toast('تم فتح المشروع ✅', 'ok');
  } catch (err) {
    console.error(err);
    alert('تعذّر فتح المشروع: ' + err.message);
  } finally {
    setLoading(false);
  }
}

/* ============================================================
   §5. EXPORT PDF
   ============================================================ */
export async function exportAnnotatedPdf() {
  if (!state.pdfBlob) { toast('لا يوجد ملف مفتوح', 'warn'); return; }
  savePageNow();
  setLoading(true, 'جارٍ تجهيز PDF…');

  try {
    const jsPDF = await getJsPDF();
    const html2canvas = await getHtml2Canvas();

    let pageW, pageH;
    if (state.pdfDoc) {
      const page = await state.pdfDoc.getPage(1);
      const vp = page.getViewport({ scale: 1 });
      pageW = vp.width;
      pageH = vp.height;
    } else if (state.projectDims) {
      pageW = state.projectDims.width;
      pageH = state.projectDims.height;
    } else {
      pageW = 595;
      pageH = 842;
    }

    const pdf = new jsPDF({
      unit: 'pt',
      format: [pageW, pageH],
      orientation: pageW > pageH ? 'landscape' : 'portrait',
      compress: true,
    });
    const strokeScale = state.cssW > 0 ? state.pdfW / state.cssW : 1;
    const EXPORT_W = 1600;

    for (let i = 1; i <= state.totalPages; i++) {
      if (i > 1) pdf.addPage([pageW, pageH]);

      let pageImg = state.pageCache.get(i) && state.pageCache.get(i).dataUrl;
      if (!pageImg || state.slides[i - 1].bg.type === 'blank') {
        const cvs = document.createElement('canvas');
        cvs.width = Math.floor(pageW);
        cvs.height = Math.floor(pageH);
        const c = cvs.getContext('2d');

        let bgColor = '#ffffff';
        const slide = state.slides[i - 1];
        if (slide && slide.bg) {
          if (slide.bg.type === 'blank' && slide.bg.color) bgColor = slide.bg.color;
          else if (state.projectDims && state.projectDims.bg) bgColor = state.projectDims.bg;
        }
        c.fillStyle = bgColor;
        c.fillRect(0, 0, cvs.width, cvs.height);

        if (state.slides[i - 1].bg.type === 'pdf' && state.pdfDoc) {
          const page = await state.pdfDoc.getPage(state.slides[i - 1].bg.page);
          const vp = page.getViewport({ scale: 1 });
          const scale = pageW / vp.width;
          const viewport = page.getViewport({ scale });
          await page.render({ canvasContext: c, viewport }).promise;
        }
        pageImg = cvs.toDataURL('image/jpeg', 0.9);
      }
      pdf.addImage(pageImg, 'JPEG', 0, 0, pageW, pageH);

      const saved = state.pages[i];
      if (!saved) continue;

      if (saved.annotations && saved.annotations.length) {
        const svgStr = buildAnnotationSvg(
          saved.annotations, state.pdfW, state.pdfH, strokeScale
        );
        const pngUrl = await svgStrToPngDataUrl(
          svgStr, EXPORT_W,
          Math.round(EXPORT_W * state.pdfH / state.pdfW)
        );
        if (pngUrl) pdf.addImage(pngUrl, 'PNG', 0, 0, pageW, pageH);
      }

      (saved.embeds || []).forEach(spec => {
        const x = parseFloat(spec.x) / 100 * pageW;
        const y = parseFloat(spec.y) / 100 * pageH;
        const w = parseFloat(spec.w) / 100 * pageW;
        const h = parseFloat(spec.h) / 100 * pageH;
        pdf.setDrawColor(74, 126, 255);
        pdf.setLineWidth(1);
        pdf.setFillColor(240, 245, 255);
        pdf.roundedRect(x, y, w, h, 4, 4, 'FD');
        pdf.setTextColor(74, 126, 255);
        pdf.setFontSize(11);
        pdf.text('Embed: ' + (spec.url || ''), x + 8, y + 16, { maxWidth: w - 16 });
      });

      const mediaList = saved.media || saved.videos || [];
      mediaList.forEach(spec => {
        const x = parseFloat(spec.x) / 100 * pageW;
        const y = parseFloat(spec.y) / 100 * pageH;
        const w = parseFloat(spec.w) / 100 * pageW;
        const h = parseFloat(spec.h) / 100 * pageH;
        pdf.setDrawColor(74, 126, 255);
        pdf.setFillColor(20, 20, 20);
        pdf.roundedRect(x, y, w, h, 6, 6, 'FD');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(11);
        const label = (spec.mediaType === 'image' ? 'Image: ' : 'Video: ') + (spec.title || '');
        pdf.text(label, x + 8, y + 16, { maxWidth: w - 16 });
      });

      for (const spec of (saved.texts || [])) {
        const x = parseFloat(spec.x) / 100 * pageW;
        const y = parseFloat(spec.y) / 100 * pageH;
        const w = parseFloat(spec.w);
        const h = parseFloat(spec.h);
        if (isNaN(w) || isNaN(h)) continue;

        const temp = document.createElement('div');
        temp.style.cssText =
          `position:fixed;left:-99999px;top:0;width:${w}px;min-height:${h}px;` +
          `font-family:${spec.fontFamily || 'system-ui'};` +
          `font-size:${spec.fontSize || 20}px;` +
          `font-weight:${spec.fontWeight || 'normal'};` +
          `font-style:${spec.fontStyle || 'normal'};` +
          `color:${spec.color || '#000'};` +
          `text-align:${spec.align || 'right'};` +
          `direction:${spec.dir || 'rtl'};` +
          'line-height:1.4;word-wrap:break-word;white-space:pre-wrap;' +
          'padding:4px 6px;box-sizing:border-box;background:transparent;';
        renderTextWithMath(temp, spec.text || '');
        document.body.appendChild(temp);

        try {
          const canvas = await html2canvas(temp, {
            backgroundColor: null,
            scale: 3,
            logging: false,
            useCORS: true,
          });
          const pngUrl = canvas.toDataURL('image/png');
          const realH = canvas.height / 3;
          pdf.addImage(pngUrl, 'PNG', x, y, w, realH, undefined, 'FAST');
        } catch (e) { console.warn('text export', e); }
        finally { document.body.removeChild(temp); }
      }

      for (const spec of (saved.buttons || [])) {
        const x = parseFloat(spec.x) / 100 * pageW;
        const y = parseFloat(spec.y) / 100 * pageH;
        const w = parseFloat(spec.w);
        const h = parseFloat(spec.h);
        if (isNaN(w) || isNaN(h)) continue;

        const temp = document.createElement('div');
        temp.style.cssText =
          `position:fixed;left:-99999px;top:0;width:${w}px;height:${h}px;` +
          'display:inline-flex;align-items:center;justify-content:center;' +
          'padding:6px 14px;' +
          'font-family:system-ui,-apple-system,"Segoe UI",Tahoma,sans-serif;' +
          'font-weight:600;text-align:center;line-height:1.25;' +
          `border-radius:${spec.borderRadius || 12}px;box-sizing:border-box;` +
          `background:${hexToRgba(spec.fillColor, spec.fillOpacity)};` +
          `border:1.5px solid ${hexToRgba(spec.borderColor, spec.borderOpacity)};` +
          `color:${spec.textColor || '#1e3a8a'};` +
          `font-size:${spec.fontSize || 18}px;` +
          (spec.isLtr ? 'direction:ltr;' : '') +
          'overflow:hidden;white-space:nowrap;';
        const span = document.createElement('span');
        span.style.cssText =
          'display:inline-flex;align-items:center;justify-content:center;' +
          'gap:2px;flex-wrap:wrap;max-width:100%';
        renderTextWithMath(span, spec.text || '');
        temp.appendChild(span);
        document.body.appendChild(temp);

        try {
          const canvas = await html2canvas(temp, {
            backgroundColor: null,
            scale: 3,
            logging: false,
            useCORS: true,
            width: w,
            height: h,
          });
          const pngUrl = canvas.toDataURL('image/png');
          pdf.addImage(pngUrl, 'PNG', x, y, w, h, undefined, 'FAST');
        } catch (e) { console.warn('btn export', e); }
        finally { document.body.removeChild(temp); }
      }
    }

    const outName = (state.pdfName || 'document')
      .replace(/\.(pdf|jpg|jpeg|png|webp|gif|actpdf)$/i, '') + '-annotated.pdf';
    pdf.save(outName);
    toast('تم تصدير PDF ✅', 'ok');
  } catch (err) {
    console.error(err);
    toast('تعذّر التصدير: ' + err.message, 'error');
  } finally {
    setLoading(false);
  }
}
