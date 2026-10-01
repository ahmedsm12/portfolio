/* ============================================================
 * core.js — النواة: DOM + Utils + State + History + Serialization
 * ============================================================ */

/* ============================================================
   §1. DOM REFERENCES
   ============================================================ */
export const $ = id => document.getElementById(id);

export const stage            = $('stage');
export const stageWrapper     = $('stageWrapper');
export const stageContent     = $('stageContent');
export const pdfCanvas        = $('pdfCanvas');
export const svgLayer         = $('svgLayer');
export const embedLayer       = $('embedLayer');
export const videoLayer       = $('videoLayer');
export const textLayer        = $('textLayer');
export const interactiveLayer = $('interactiveLayer');
export const transientCanvas  = $('transientCanvas');
export const laserCanvas      = $('laserCanvas');
export const emptyState       = $('emptyState');
export const loadingEl        = $('loading');
export const loadingText      = $('loadingText');
export const pageIndicator    = $('pageIndicator');
export const toolbar          = $('toolbar');
export const submenu          = $('submenu');
export const fileInput        = $('fileInput');
export const btnUndo          = $('btnUndo');
export const btnRedo          = $('btnRedo');
export const btnPaste         = $('btnPaste');
export const btnPrev          = $('btnPrev');
export const btnNext          = $('btnNext');
export const saveStatusEl     = $('saveStatus');
export const thumbnailSidebar = $('thumbnailSidebar');
export const thumbsList       = $('thumbsList');
export const slideContextMenu = $('slideContextMenu');
export const textContextToolbar  = $('textContextToolbar');
export const shapeContextToolbar = $('shapeContextToolbar');
export const equationEditor   = $('equationEditor');

export const transCtx = transientCanvas.getContext('2d');
export const laserCtx = laserCanvas.getContext('2d');

export const SVG_NS = 'http://www.w3.org/2000/svg';

/* ============================================================
   §2. CONSTANTS
   ============================================================ */
export const PDFJS_VERSION  = '4.7.76';
export const PDFJS_BASE     = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}`;
export const KATEX_VERSION  = '0.16.9';
export const KATEX_CSS      = `https://cdn.jsdelivr.net/npm/katex@${KATEX_VERSION}/dist/katex.min.css`;
export const KATEX_JS       = `https://cdn.jsdelivr.net/npm/katex@${KATEX_VERSION}/dist/katex.min.js`;
export const JSZIP_URL      = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
export const JSPDF_URL      = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
export const HTML2CANVAS_URL= 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';

export const LASER_FADE_MS  = 1500;
export const UNDO_LIMIT     = 50;
export const COORD_WIDTH    = 2000;
export const CACHE_WIDTH    = 2200;
export const THUMB_WIDTH    = 320;

export const FILE_EXT       = '.actpdf';
export const SIDEBAR_MIN_W  = 100;
export const SIDEBAR_MAX_W  = 420;
export const SIDEBAR_DEFAULT_W = 180;
export const SIDEBAR_W_KEY  = 'pdfboard-sidebar-width';
export const SIDEBAR_V_KEY  = 'pdfboard-sidebar-visible';

export const TOOLS_WITH_SUBMENU = ['pen','highlighter','eraser','laser','shape','text','equation'];

export const EQUATION_TEMPLATES = [
  { cat: 'الكسور والجذور', items: [
    { label: 'a/b', latex: '\\frac{a}{b}' },
    { label: '√',  latex: '\\sqrt{x}' },
    { label: 'ⁿ√', latex: '\\sqrt[n]{x}' },
  ]},
  { cat: 'الأسس', items: [
    { label: 'x²', latex: 'x^{2}' },
    { label: 'xₙ', latex: 'x_{n}' },
    { label: 'xⁿ', latex: 'x^{n}' },
  ]},
  { cat: 'المجاميع والتكاملات', items: [
    { label: '∑',  latex: '\\sum_{i=1}^{n}' },
    { label: '∏',  latex: '\\prod_{i=1}^{n}' },
    { label: '∫',  latex: '\\int_{a}^{b}' },
    { label: '∬',  latex: '\\iint' },
    { label: 'lim', latex: '\\lim_{x \\to \\infty}' },
    { label: 'd/dx', latex: '\\frac{d}{dx}' },
  ]},
  { cat: 'حروف يونانية', items: [
    { label: 'α', latex: '\\alpha' }, { label: 'β', latex: '\\beta' }, { label: 'γ', latex: '\\gamma' },
    { label: 'δ', latex: '\\delta' }, { label: 'ε', latex: '\\epsilon' }, { label: 'θ', latex: '\\theta' },
    { label: 'λ', latex: '\\lambda' }, { label: 'μ', latex: '\\mu' }, { label: 'π', latex: '\\pi' },
    { label: 'σ', latex: '\\sigma' }, { label: 'φ', latex: '\\phi' }, { label: 'ω', latex: '\\omega' },
  ]},
  { cat: 'العلاقات', items: [
    { label: '≠', latex: '\\neq' }, { label: '≤', latex: '\\leq' }, { label: '≥', latex: '\\geq' },
    { label: '≈', latex: '\\approx' }, { label: '∞', latex: '\\infty' }, { label: '±', latex: '\\pm' },
    { label: '→', latex: '\\to' }, { label: '⇒', latex: '\\Rightarrow' }, { label: '∈', latex: '\\in' },
  ]},
  { cat: 'الدوال', items: [
    { label: 'sin', latex: '\\sin' }, { label: 'cos', latex: '\\cos' }, { label: 'tan', latex: '\\tan' },
    { label: 'log', latex: '\\log' }, { label: 'ln', latex: '\\ln' }, { label: 'exp', latex: '\\exp' },
  ]},
  { cat: 'مصفوفات', items: [
    { label: 'matrix', latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}' },
    { label: 'cases',  latex: '\\begin{cases} a \\\\ b \\end{cases}' },
    { label: 'vec',    latex: '\\vec{v}' },
  ]},
];

/* ============================================================
   §3. UTILITIES
   ============================================================ */
export function uid() {
  return 'a' + Math.random().toString(36).slice(2, 9);
}

export function setLoading(on, text) {
  loadingEl.classList.toggle('show', !!on);
  if (text) loadingText.textContent = text;
}

export function toast(msg, type) {
  const el = document.createElement('div');
  el.className = 'toast' + (type ? ' ' + type : '');
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2400);
}

let _saveStatusTimer = null;
export function showSaveStatus(text) {
  saveStatusEl.textContent = text;
  saveStatusEl.classList.add('show');
  clearTimeout(_saveStatusTimer);
  _saveStatusTimer = setTimeout(() => saveStatusEl.classList.remove('show'), 1600);
}

export function hexToRgba(hex, alpha) {
  if (!hex || hex === 'transparent') return `rgba(0,0,0,${alpha})`;
  hex = String(hex).replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const r = parseInt(hex.substr(0,2), 16) || 0;
  const g = parseInt(hex.substr(2,2), 16) || 0;
  const b = parseInt(hex.substr(4,2), 16) || 0;
  const a = typeof alpha === 'number' && !isNaN(alpha)
    ? Math.max(0, Math.min(1, alpha)) : 1;
  return `rgba(${r},${g},${b},${a})`;
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function escapeXml(s) {
  return String(s).replace(/[<>&"']/g, c => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;'
  }[c]));
}

export function getVideoDimensions(url) {
  return new Promise(resolve => {
    const v = document.createElement('video');
    v.preload = 'metadata'; v.src = url;
    const done = r => { try { v.src = ''; } catch (_) {} resolve(r); };
    v.onloadedmetadata = () => done({ w: v.videoWidth || 1280, h: v.videoHeight || 720 });
    v.onerror = () => done({ w: 1280, h: 720 });
    setTimeout(() => done({ w: 1280, h: 720 }), 3000);
  });
}

export function getImageDimensions(url) {
  return new Promise(resolve => {
    const i = new Image();
    i.onload = () => resolve({ w: i.naturalWidth || 800, h: i.naturalHeight || 600 });
    i.onerror = () => resolve({ w: 800, h: 600 });
    i.src = url;
  });
}

export function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1, len2 = dx*dx + dy*dy;
  if (len2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t*dx), py - (y1 + t*dy));
}

export function distToEllipse(px, py, cx, cy, rx, ry) {
  let minD = Infinity;
  for (let i = 0; i < 48; i++) {
    const t = (i / 48) * Math.PI * 2;
    const x = cx + rx * Math.cos(t);
    const y = cy + ry * Math.sin(t);
    const d = Math.hypot(px - x, py - y);
    if (d < minD) minD = d;
  }
  return minD;
}

export function getTranslate(el) {
  const t = el.getAttribute('transform');
  if (!t) return { tx: 0, ty: 0 };
  const m = t.match(/translate\(\s*(-?[\d.]+)[ ,]+(-?[\d.]+)\s*\)/);
  return m ? { tx: parseFloat(m[1]), ty: parseFloat(m[2]) } : { tx: 0, ty: 0 };
}

export function renderTextWithMath(container, text) {
  container.innerHTML = '';
  if (!text) return;
  if (typeof window.katex === 'undefined') { container.textContent = text; return; }
  const re = /\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g;
  const parts = [];
  let lastIndex = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > lastIndex) parts.push({ type: 'text', value: text.slice(lastIndex, m.index) });
    parts.push({
      type: 'math',
      value: m[1] !== undefined ? m[1] : m[2],
      displayMode: m[1] !== undefined,
    });
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < text.length) parts.push({ type: 'text', value: text.slice(lastIndex) });
  if (!parts.some(p => p.type === 'math')) { container.textContent = text; return; }
  parts.forEach(p => {
    if (p.type === 'text') {
      container.appendChild(document.createTextNode(p.value));
    } else {
      const span = document.createElement('span');
      try { window.katex.render(p.value, span, { throwOnError: false, displayMode: false, output: 'html' }); }
      catch (e) { span.textContent = p.value; }
      container.appendChild(span);
    }
  });
}

export function stripMathToPlain(t) {
  if (!t) return '';
  return String(t).replace(/\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g, (_, a, b) => ' ' + (a || b) + ' ');
}

export function loadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = res;
    s.onerror = rej;
    document.head.appendChild(s);
  });
}

export function loadStyle(href) {
  return new Promise(res => {
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    l.onload = res;
    l.onerror = res;
    document.head.appendChild(l);
  });
}

/* ============================================================
   §4. AUDIO FEEDBACK
   ============================================================ */
let _audioCtx = null;
function getAudioCtx() {
  if (!_audioCtx) {
    try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch (e) { return null; }
  }
  if (_audioCtx.state === 'suspended') _audioCtx.resume().catch(() => {});
  return _audioCtx;
}
export function playTone(freq, duration, type, volume, delay) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const startAt = ctx.currentTime + (delay || 0);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type || 'sine';
  osc.frequency.setValueAtTime(freq, startAt);
  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(volume || 0.06, startAt + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.05);
}
export function playCorrectSound() {
  playTone(523.25, 0.14, 'sine', 0.055, 0);
  playTone(783.99, 0.20, 'sine', 0.055, 0.10);
}
export function playWrongSound() {
  playTone(196, 0.20, 'triangle', 0.045, 0);
  playTone(130.81, 0.28, 'triangle', 0.045, 0.10);
}

/* ============================================================
   §5. STATE
   ============================================================ */
export const state = {
  pdfDoc: null,
  pdfBlob: null,
  pdfName: '',
  pdfIsImage: false,

  slides: [],
  currentPage: 1,
  totalPages: 0,

  pdfW: 0, pdfH: 0,
  canvasScale: 1, dpr: 1,
  cssW: 0, cssH: 0,
  stageRect0: { left: 0, top: 0, width: 0, height: 0 },

  view: { scale: 1, tx: 0, ty: 0 },

  pageCache: new Map(),
  thumbCache: new Map(),
  preloadToken: 0,

  tool: 'select',

  penColor: '#000000', penSize: 3, penSmoothing: 1,
  highlighterColor: '#eab308', highlighterSize: 16, highlighterSmoothing: 1,
  eraserSize: 20, eraserErasesShapes: true,
  laserColor: '#ff0000', laserSize: 4, laserLifeMs: 3000,
  laserGlowIntensity: 3, laserInnerColor: '#ffffff',

  textColor: '#1e3a8a', textSize: 20, textFamily: 'system-ui',
  textBold: false, textItalic: false,
  textAlign: 'right', textDir: 'rtl',
  customTextColors: [null, null],

  equationColor: '#000000', equationSize: 20,

  shapeKind: 'rect',
  shapeStroke: '#000000', shapeFill: '#ffffff',
  shapeFillNone: true, shapeSize: 3,
  shapeLineStart: 'none', shapeLineEnd: 'arrow', shapeLineCap: 'round',

  selected: null,
  pages: {},
  history: {},
};

export const mediaBlobs = new Map();
export const clipboard = { element: null };
export const slideClipboard = { slides: null, pagesData: null };

/* ============================================================
   §6. SERIALIZATION
   ============================================================ */
export function serializeSvgElement(el) {
  const tag = el.tagName.toLowerCase();
  const attrs = {};
  for (let i = 0; i < el.attributes.length; i++) {
    const a = el.attributes[i];
    if (['class', 'data-annot', 'data-id', 'selected'].includes(a.name)) continue;
    attrs[a.name] = a.value;
  }
  return { kind: 'svg', tag, attrs, dataId: el.dataset.id || uid(), shapeType: el.dataset.type || tag };
}

export function deserializeSvgElement(spec) {
  const el = document.createElementNS(SVG_NS, spec.tag);
  Object.keys(spec.attrs || {}).forEach(k => el.setAttribute(k, spec.attrs[k]));
  el.dataset.annot = '1';
  el.dataset.id = spec.dataId;
  if (spec.shapeType) el.dataset.type = spec.shapeType;
  el.classList.add('annot');
  return el;
}

export function serializeEmbed(el) {
  return {
    kind: 'embed', url: el.dataset.url,
    x: el.style.left, y: el.style.top,
    w: el.style.width, h: el.style.height,
  };
}

export function serializeMedia(el) {
  return {
    kind: 'media', mediaId: el.dataset.mediaId,
    mediaType: el.dataset.mediaType || 'video',
    url: el.dataset.url, title: el.dataset.title || '',
    x: el.style.left, y: el.style.top,
    w: el.style.width, h: el.style.height,
  };
}

export function serializeButton(el) {
  return {
    kind: 'button', btnId: el.dataset.btnId,
    text: el.dataset.text || '',
    fillColor: el.dataset.fillColor || '#4a7eff',
    fillOpacity: parseFloat(el.dataset.fillOpacity || '.15'),
    borderColor: el.dataset.borderColor || '#4a7eff',
    borderOpacity: parseFloat(el.dataset.borderOpacity || '.45'),
    textColor: el.dataset.textColor || '#1e3a8a',
    fontSize: parseFloat(el.dataset.fontSize || '18'),
    borderRadius: parseFloat(el.dataset.borderRadius || '12'),
    isCorrect: el.dataset.isCorrect === 'true',
    isLtr: el.dataset.isLtr === 'true',
    x: el.style.left, y: el.style.top,
    w: el.style.width, h: el.style.height,
  };
}

export function serializeText(el) {
  return {
    kind: 'text', textId: el.dataset.textId,
    text: el.dataset.text || '',
    x: el.style.left, y: el.style.top,
    w: el.style.width, h: el.style.height,
    fontSize: parseFloat(el.dataset.fontSize || '20'),
    fontFamily: el.dataset.fontFamily || 'system-ui',
    fontWeight: el.dataset.fontWeight || 'normal',
    fontStyle: el.dataset.fontStyle || 'normal',
    color: el.dataset.color || '#1e3a8a',
    align: el.dataset.align || 'right',
    dir: el.dataset.dir || 'rtl',
    isEquation: el.dataset.isEquation === 'true',
  };
}

export function snapshot() {
  const annotations = [];
  svgLayer.querySelectorAll('[data-annot]').forEach(el => {
    if (el.tagName.toLowerCase() === 'g') return;
    if (el.classList.contains('handle') || el.classList.contains('selection-outline')) return;
    annotations.push(serializeSvgElement(el));
  });
  const embeds = [];
  embedLayer.querySelectorAll('.embed').forEach(el => embeds.push(serializeEmbed(el)));
  const media = [];
  videoLayer.querySelectorAll('.media-obj').forEach(el => media.push(serializeMedia(el)));
  const texts = [];
  textLayer.querySelectorAll('.pdf-text-box').forEach(el => texts.push(serializeText(el)));
  const buttons = [];
  interactiveLayer.querySelectorAll('.pdf-interactive-btn').forEach(el => buttons.push(serializeButton(el)));
  return { annotations, embeds, media, videos: media, texts, buttons };
}

/* ============================================================
   §7. HISTORY (per page)
   ============================================================ */
export function getHistory() {
  return state.history[state.currentPage] || (state.history[state.currentPage] = { past: [], future: [] });
}

export function savePageNow() {
  if (state.currentPage) state.pages[state.currentPage] = snapshot();
}

export function commitChange(pre) {
  if (!state.currentPage) return;
  const h = getHistory();
  h.past.push(pre || { annotations: [], embeds: [], media: [], texts: [], buttons: [] });
  if (h.past.length > UNDO_LIMIT) h.past.shift();
  h.future.length = 0;
  savePageNow();
  updateUndoButtons();
}

export function updateUndoButtons() {
  const h = state.history[state.currentPage] || { past: [], future: [] };
  btnUndo.disabled = h.past.length === 0;
  btnRedo.disabled = h.future.length === 0;
}

export function undo() {
  if (!state.currentPage) return;
  const h = getHistory();
  if (!h.past.length) return;
  h.future.push(snapshot());
  const p = h.past.pop();
  state.pages[state.currentPage] = p;
  applySnapshot(p);
  updateUndoButtons();
}

export function redo() {
  if (!state.currentPage) return;
  const h = getHistory();
  if (!h.future.length) return;
  h.past.push(snapshot());
  const n = h.future.pop();
  state.pages[state.currentPage] = n;
  applySnapshot(n);
  updateUndoButtons();
}

/* ============================================================
   §8. APPLY SNAPSHOT (يُهيَّأ من main.js)
   ============================================================ */
export let applySnapshot = function(s) {
  /* Placeholder — main.js يعيّن التنفيذ الحقيقي */
  if (typeof applySnapshot._impl === 'function') applySnapshot._impl(s);
};
export function setApplySnapshot(fn) { applySnapshot._impl = fn; }

/* ============================================================
   §9. CURSOR & TOOLBAR SIZE
   ============================================================ */
export function adjustToolbarSize() {
  const h = window.innerHeight;
  const bc = 20, dc = 4, pad = 20;
  const total = dc * 5 + pad;
  const avail = h * 0.92 - total;
  const per = avail / bc;
  let s = Math.floor(per - 3);
  s = Math.max(24, Math.min(36, s));
  document.documentElement.style.setProperty('--tb-btn-size', s + 'px');
}

export function updateCursorForTool() {
  const tool = state.tool;
  let cursor = '';
  if (tool === 'pen' || tool === 'highlighter' || tool === 'eraser') {
    let size, color, fo, bc;
    if (tool === 'pen') { size = state.penSize; color = state.penColor; fo = .35; bc = state.penColor; }
    else if (tool === 'highlighter') { size = state.highlighterSize; color = state.highlighterColor; fo = .35; bc = state.highlighterColor; }
    else { size = state.eraserSize; color = '#ffffff'; fo = .9; bc = '#000000'; }
    const SZ = 32, cx = SZ / 2, cy = SZ / 2;
    const r = Math.min(SZ / 2 - 2, Math.max(2, size / 2));
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SZ}" height="${SZ}" viewBox="0 0 ${SZ} ${SZ}"><circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" fill-opacity="${fo}" stroke="${bc}" stroke-width="1.5"/></svg>`;
    cursor = `url('data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}') ${cx} ${cy}, crosshair`;
  }
  stage.style.cursor = cursor || '';
}

/* ============================================================
   §10. KATEX LOADING
   ============================================================ */
export async function loadKatex() {
  if (typeof window.katex !== 'undefined') return;
  await loadStyle(KATEX_CSS);
  await loadScript(KATEX_JS);
}