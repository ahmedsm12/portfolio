/* ============================================================
 * interaction.js — الأحداث والرسم والتحديد والأدوات العائمة
 * ============================================================
 *  ★ نظام z-index موحّد لكل العناصر
 *  ★ SVG annotations ملفوفة في wrappers لدعم z-index
 *  ★ selection overlay في SVG منفصل
 *  ★ حركة حرة للعناصر (بلا قيود)
 *  ★ الرسم يعمل فوق الصور والفيديو والـ embed
 * ============================================================ */

import {
  $, SVG_NS, EQUATION_TEMPLATES, LASER_FADE_MS,
  stage, stageContent, svgLayer, selectionSvg, embedLayer, videoLayer,
  textLayer, interactiveLayer, transientCanvas, laserCanvas, transCtx, laserCtx,
  textContextToolbar, shapeContextToolbar, equationEditor,
  state, mediaBlobs, clipboard,
  uid, toast, hexToRgba, escapeXml, renderTextWithMath,
  commitChange, snapshot, savePageNow,
  serializeSvgElement, deserializeSvgElement, serializeText,
  serializeButton, serializeMedia, serializeEmbed,
  distToSegment, distToEllipse, getTranslate,
} from './core.js';

import {
  addEmbedElement, addMediaElement, addButtonElement,
  applyButtonStyles, BUTTON_DEFAULTS,
} from './elements.js';

import {
  createShapeElement as createShapeElementFromShapes,
  updateShapeDuringDraw,
  resizeUniversalShape,
  getUniversalShapeBounds,
  renderCylinder,
  renderCircuitComponent,
  renderCartesianPlane,
} from './shapes.js';

/* ============================================================
   §1. UI HOOKS
   ============================================================ */
export const uiHooks = {
  setTool: () => {},
  closeSubmenu: () => {},
  setApplySnapshot: () => {},
};

/* ============================================================
   §2. STATE LOCALS
   ============================================================ */
let interaction = null;
let handDrag = null;
const stagePointers = new Map();
let pinchState = null;
let strokeRAF = null;

const laserStrokes = [];
let currentLaserStroke = null;
let laserRAF = null;
let laserLastActivity = 0;

let _floatingDeleteBtn = null;
let _eqCurrentTarget = null;

const equationBackdropEl = () => document.getElementById('equationBackdrop');

/* ============================================================
   §2b. Z-INDEX MANAGEMENT
   ============================================================ */
let _zCounter = 100;

export function getNextZIndex() {
  _zCounter += 5;
  return _zCounter;
}

export function getAllZElements() {
  const items = [];
  if (svgLayer) {
    svgLayer.querySelectorAll(':scope > .annot-wrapper').forEach(el => {
      items.push({ el, kind: 'svg' });
    });
  }
  if (videoLayer) {
    videoLayer.querySelectorAll('.media-obj').forEach(el => {
      items.push({ el, kind: 'media' });
    });
  }
  if (textLayer) {
    textLayer.querySelectorAll('.pdf-text-box').forEach(el => {
      items.push({ el, kind: 'text' });
    });
  }
  if (interactiveLayer) {
    interactiveLayer.querySelectorAll('.pdf-interactive-btn').forEach(el => {
      items.push({ el, kind: 'button' });
    });
  }
  if (embedLayer) {
    embedLayer.querySelectorAll('.embed').forEach(el => {
      items.push({ el, kind: 'embed' });
    });
  }
  items.sort((a, b) => {
    const za = parseInt(a.el.style.zIndex || '0', 10);
    const zb = parseInt(b.el.style.zIndex || '0', 10);
    return za - zb;
  });
  return items;
}

export function assignZIndexesInOrder(orderedItems) {
  let z = 100;
  orderedItems.forEach(item => {
    item.el.style.zIndex = String(z);
    if (item.el.parentNode) {
      item.el.parentNode.appendChild(item.el);
    }
    z += 5;
  });
  _zCounter = z + 100;
  document.dispatchEvent(new CustomEvent('ipb:layersReordered'));
}

export function moveLayerToPosition(el, targetIdx) {
  const all = getAllZElements();
  const currentIdx = all.findIndex(x => x.el === el || (el.closest && x.el === el.closest('.annot-wrapper')));
  if (currentIdx < 0) return;
  const [item] = all.splice(currentIdx, 1);
  const idx = Math.max(0, Math.min(all.length, targetIdx));
  all.splice(idx, 0, item);
  assignZIndexesInOrder(all);
}

export function bringToFront(el) {
  const all = getAllZElements();
  const currentIdx = all.findIndex(x => x.el === el || (el.closest && x.el === el.closest('.annot-wrapper')));
  if (currentIdx < 0 || currentIdx === all.length - 1) return;
  const [item] = all.splice(currentIdx, 1);
  all.push(item);
  assignZIndexesInOrder(all);
}

export function sendToBack(el) {
  const all = getAllZElements();
  const currentIdx = all.findIndex(x => x.el === el || (el.closest && x.el === el.closest('.annot-wrapper')));
  if (currentIdx <= 0) return;
  const [item] = all.splice(currentIdx, 1);
  all.unshift(item);
  assignZIndexesInOrder(all);
}

export function bringForward(el) {
  const all = getAllZElements();
  const currentIdx = all.findIndex(x => x.el === el || (el.closest && x.el === el.closest('.annot-wrapper')));
  if (currentIdx < 0 || currentIdx === all.length - 1) return;
  const [item] = all.splice(currentIdx, 1);
  all.splice(currentIdx + 1, 0, item);
  assignZIndexesInOrder(all);
}

export function sendBackward(el) {
  const all = getAllZElements();
  const currentIdx = all.findIndex(x => x.el === el || (el.closest && x.el === el.closest('.annot-wrapper')));
  if (currentIdx <= 0) return;
  const [item] = all.splice(currentIdx, 1);
  all.splice(currentIdx - 1, 0, item);
  assignZIndexesInOrder(all);
}

/* ============================================================
   §3. SVG GEOMETRY
   ============================================================ */
export function captureSvgGeom(el) {
  const g = {};
  ['x','y','width','height','cx','cy','rx','ry','x1','y1','x2','y2'].forEach(a => {
    const v = el.getAttribute(a);
    if (v !== null) g[a] = parseFloat(v);
  });
  if (el.dataset) {
    ['x','y','w','h','x0','y0','cx','cy','x1','y1','capH','radius'].forEach(a => {
      if (el.dataset[a] !== undefined) g[a] = parseFloat(el.dataset[a]);
    });
  }
  if (el.tagName && el.tagName.toLowerCase() === 'polygon' && el.getAttribute('points')) {
    g.origPoints = el.getAttribute('points').trim().split(/\s+/).map(p => {
      const [px, py] = p.split(',').map(Number);
      return { x: px, y: py };
    });
  }
  const b = getUniversalShapeBounds(el);
  if (b) {
    g.bounds = b;
    if (g.x === undefined) g.x = b.x;
    if (g.y === undefined) g.y = b.y;
    if (g.width === undefined) g.width = b.width;
    if (g.height === undefined) g.height = b.height;
  }
  const t = el.getAttribute('transform');
  if (t) {
    const m = t.match(/translate\(\s*(-?[\d.]+)[ ,]+(-?[\d.]+)\s*\)/);
    if (m) { g.tx = parseFloat(m[1]); g.ty = parseFloat(m[2]); }
  }
  g._tag = el.tagName ? el.tagName.toLowerCase() : '';
  g._type = el.dataset.type || g._tag;
  return g;
}

export function applySvgGeom(el, orig, dx, dy) {
  const t = orig._tag;
  if (t === 'rect') { el.setAttribute('x', orig.x + dx); el.setAttribute('y', orig.y + dy); }
  else if (t === 'ellipse') { el.setAttribute('cx', orig.cx + dx); el.setAttribute('cy', orig.cy + dy); }
  else if (t === 'line') {
    el.setAttribute('x1', orig.x1 + dx); el.setAttribute('y1', orig.y1 + dy);
    el.setAttribute('x2', orig.x2 + dx); el.setAttribute('y2', orig.y2 + dy);
  } else if (t === 'polygon') {
    if (orig.origPoints) {
      const moved = orig.origPoints.map(p => `${p.x + dx},${p.y + dy}`).join(' ');
      el.setAttribute('points', moved);
    }
  } else if (orig._type === 'curve') {
    const x0 = (orig.x0 != null ? orig.x0 : orig.x) + dx;
    const y0 = (orig.y0 != null ? orig.y0 : orig.y) + dy;
    const cx = (orig.cx != null ? orig.cx : (orig.x + orig.width / 2)) + dx;
    const cy = (orig.cy != null ? orig.cy : (orig.y + orig.height / 2)) + dy;
    const x1 = (orig.x1 != null ? orig.x1 : (orig.x + orig.width)) + dx;
    const y1 = (orig.y1 != null ? orig.y1 : (orig.y + orig.height)) + dy;
    el.setAttribute('d', `M ${x0} ${y0} Q ${cx} ${cy} ${x1} ${y1}`);
    el.dataset.x0 = x0; el.dataset.y0 = y0;
    el.dataset.cx = cx; el.dataset.cy = cy;
    el.dataset.x1 = x1; el.dataset.y1 = y1;
  } else if (t === 'g') {
    const b = orig.bounds || { x: orig.x || 0, y: orig.y || 0, width: orig.width || 50, height: orig.height || 50 };
    const newX = b.x + dx, newY = b.y + dy;
    if (orig._type === 'cylinder') {
      renderCylinder(el, newX, newY, b.width, b.height);
    } else if (orig._type && orig._type.startsWith('circuit-')) {
      renderCircuitComponent(el, orig._type, newX, newY, b.width, b.height);
    } else if (orig._type === 'cartesian') {
      renderCartesianPlane(el, newX, newY, b.width, b.height);
    } else {
      el.setAttribute('transform', `translate(${(orig.tx || 0) + dx}, ${(orig.ty || 0) + dy})`);
    }
  } else if (t === 'path') {
    el.setAttribute('transform', `translate(${(orig.tx || 0) + dx}, ${(orig.ty || 0) + dy})`);
  }
}

export function resizeSvg(el, handle, startPt, orig, p) {
  if (handle === 'radius') {
    const origR = parseFloat(el.getAttribute('rx') || '0');
    const b = orig.bounds || getUniversalShapeBounds(el);
    const maxR = Math.min(b.width, b.height) / 2;
    const dx = p.x - startPt.x;
    const newR = Math.max(0, Math.min(maxR, origR + dx));
    el.setAttribute('rx', newR);
    el.setAttribute('ry', newR);
    return;
  }
  if (handle === 'curve-start') {
    const dx = p.x - startPt.x, dy = p.y - startPt.y;
    const x0 = (orig.x0 != null ? orig.x0 : parseFloat(el.dataset.x0)) + dx;
    const y0 = (orig.y0 != null ? orig.y0 : parseFloat(el.dataset.y0)) + dy;
    const cx = parseFloat(el.dataset.cx);
    const cy = parseFloat(el.dataset.cy);
    const x1 = parseFloat(el.dataset.x1);
    const y1 = parseFloat(el.dataset.y1);
    el.setAttribute('d', `M ${x0} ${y0} Q ${cx} ${cy} ${x1} ${y1}`);
    el.dataset.x0 = x0; el.dataset.y0 = y0;
    return;
  }
  if (handle === 'curve-end') {
    const dx = p.x - startPt.x, dy = p.y - startPt.y;
    const x1 = (orig.x1 != null ? orig.x1 : parseFloat(el.dataset.x1)) + dx;
    const y1 = (orig.y1 != null ? orig.y1 : parseFloat(el.dataset.y1)) + dy;
    const x0 = parseFloat(el.dataset.x0);
    const y0 = parseFloat(el.dataset.y0);
    const cx = parseFloat(el.dataset.cx);
    const cy = parseFloat(el.dataset.cy);
    el.setAttribute('d', `M ${x0} ${y0} Q ${cx} ${cy} ${x1} ${y1}`);
    el.dataset.x1 = x1; el.dataset.y1 = y1;
    return;
  }
  if (handle === 'curve-ctrl') {
    const dx = p.x - startPt.x, dy = p.y - startPt.y;
    const cx = (orig.cx != null ? orig.cx : parseFloat(el.dataset.cx)) + dx;
    const cy = (orig.cy != null ? orig.cy : parseFloat(el.dataset.cy)) + dy;
    const x0 = parseFloat(el.dataset.x0);
    const y0 = parseFloat(el.dataset.y0);
    const x1 = parseFloat(el.dataset.x1);
    const y1 = parseFloat(el.dataset.y1);
    el.setAttribute('d', `M ${x0} ${y0} Q ${cx} ${cy} ${x1} ${y1}`);
    el.dataset.cx = cx; el.dataset.cy = cy;
    return;
  }

  const origBox = orig.bounds || {
    x: orig.x || 0,
    y: orig.y || 0,
    width: orig.width || 50,
    height: orig.height || 50,
    origPoints: orig.origPoints,
    x0: orig.x0, y0: orig.y0, cx: orig.cx, cy: orig.cy, x1: orig.x1, y1: orig.y1,
    x1Line: orig.x1, y1Line: orig.y1, x2Line: orig.x2, y2Line: orig.y2,
  };

  resizeUniversalShape(el, handle, origBox, startPt, p);
}

export function isPointNearShape(p, el, tol) {
  const tag = el.tagName ? el.tagName.toLowerCase() : '';
  if (tag === 'line') {
    return distToSegment(p.x, p.y,
      +el.getAttribute('x1'), +el.getAttribute('y1'),
      +el.getAttribute('x2'), +el.getAttribute('y2')) <= tol;
  }
  if (tag === 'rect') {
    const x = +el.getAttribute('x'), y = +el.getAttribute('y');
    const w = +el.getAttribute('width'), h = +el.getAttribute('height');
    return distToSegment(p.x, p.y, x, y, x+w, y) <= tol
        || distToSegment(p.x, p.y, x+w, y, x+w, y+h) <= tol
        || distToSegment(p.x, p.y, x+w, y+h, x, y+h) <= tol
        || distToSegment(p.x, p.y, x, y+h, x, y) <= tol;
  }
  if (tag === 'ellipse') {
    const cx = +el.getAttribute('cx'), cy = +el.getAttribute('cy');
    const rx = +el.getAttribute('rx'), ry = +el.getAttribute('ry');
    return distToEllipse(p.x, p.y, cx, cy, rx, ry) <= tol;
  }
  const b = getUniversalShapeBounds(el);
  if (b) {
    return p.x >= b.x - tol && p.x <= b.x + b.width + tol &&
           p.y >= b.y - tol && p.y <= b.y + b.height + tol;
  }
  if (tag === 'path') {
    const d = el.getAttribute('d');
    if (!d) return false;
    const { tx, ty } = getTranslate(el);
    const lx = p.x - tx, ly = p.y - ty;
    const re = /([MLQ])\s*([-\d.]+)\s+([-\d.]+)(?:\s+([-\d.]+)\s+([-\d.]+))?/g;
    const pts = []; let m;
    while ((m = re.exec(d))) {
      if (m[1] === 'Q' && m[4] !== undefined) {
        pts.push({ x: parseFloat(m[2]), y: parseFloat(m[3]) });
        pts.push({ x: parseFloat(m[4]), y: parseFloat(m[5]) });
      } else pts.push({ x: parseFloat(m[2]), y: parseFloat(m[3]) });
    }
    for (let i = 1; i < pts.length; i++) {
      if (distToSegment(lx, ly, pts[i-1].x, pts[i-1].y, pts[i-1].x, pts[i].y) <= tol) return true;
    }
    return false;
  }
  return false;
}

/* ============================================================
   §4. SMOOTHING
   ============================================================ */
function getSmoothingLevel(kind) {
  if (kind === 'pen') return state.penSmoothing;
  if (kind === 'highlighter') return state.highlighterSmoothing;
  return 0;
}
function getSmoothedPoints(points, level) {
  if (points.length < 3 || level === 0) return points;
  const alphas = [1, 0.6, 0.4, 0.22];
  const alpha = alphas[level] || 1;
  const out = [{ x: points[0].x, y: points[0].y }];
  for (let i = 1; i < points.length; i++) {
    const prev = out[out.length - 1];
    const p = points[i];
    out.push({ x: prev.x + (p.x - prev.x) * alpha, y: prev.y + (p.y - prev.y) * alpha });
  }
  out[out.length - 1] = { x: points[points.length-1].x, y: points[points.length-1].y };
  return out;
}

/* ============================================================
   §5. ANNOTATION CREATION (with wrappers)
   ============================================================ */
function createAnnotWrapper(innerEl) {
  const wrap = document.createElementNS(SVG_NS, 'svg');
  wrap.setAttribute('xmlns', SVG_NS);
  wrap.setAttribute('viewBox', `0 0 ${state.pdfW || 2000} ${state.pdfH || 2828}`);
  wrap.setAttribute('preserveAspectRatio', 'none');
  wrap.classList.add('annot-wrapper');
  wrap.dataset.annotId = innerEl.dataset.id || uid();
  wrap.style.cssText =
    'position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none;';
  wrap.style.zIndex = String(getNextZIndex());
  wrap.appendChild(innerEl);
  return wrap;
}

export function addAnnotation(el) {
  el.dataset.annot = '1';
  if (!el.dataset.id) el.dataset.id = uid();
  el.classList.add('annot');
  const wrap = createAnnotWrapper(el);
  if (svgLayer) svgLayer.appendChild(wrap);
  return wrap;
}

function buildPathFromPoints(points, kind) {
  if (!points || points.length < 2) return null;
  const level = getSmoothingLevel(kind);
  const pts = level > 0 ? getSmoothedPoints(points, level) : points;
  if (pts.length < 2) return null;

  let d;
  if (level === 0) {
    d = 'M ' + pts[0].x.toFixed(1) + ' ' + pts[0].y.toFixed(1);
    for (let i = 1; i < pts.length; i++) d += ' L ' + pts[i].x.toFixed(1) + ' ' + pts[i].y.toFixed(1);
  } else {
    d = 'M ' + pts[0].x.toFixed(1) + ' ' + pts[0].y.toFixed(1);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i].x + pts[i+1].x) / 2;
      const my = (pts[i].y + pts[i+1].y) / 2;
      d += ' Q ' + pts[i].x.toFixed(1) + ' ' + pts[i].y.toFixed(1) + ' ' + mx.toFixed(1) + ' ' + my.toFixed(1);
    }
    const last = pts[pts.length - 1];
    d += ' L ' + last.x.toFixed(1) + ' ' + last.y.toFixed(1);
  }

  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', d);
  if (kind === 'pen') {
    path.setAttribute('stroke', state.penColor);
    path.setAttribute('stroke-width', state.penSize);
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    path.setAttribute('fill', 'none');
    path.dataset.type = 'path';
  } else {
    path.setAttribute('stroke', state.highlighterColor);
    path.setAttribute('stroke-width', state.highlighterSize);
    path.setAttribute('stroke-linecap', 'square');
    path.setAttribute('stroke-linejoin', 'miter');
    path.setAttribute('stroke-opacity', '0.4');
    path.setAttribute('fill', 'none');
    path.style.mixBlendMode = 'multiply';
    path.dataset.type = 'highlighter';
  }
  addAnnotation(path);
  return path;
}

export function createShapeElement(kind, customState, p) {
  return createShapeElementFromShapes(kind, customState || state, p || { x: 0, y: 0 });
}

function _legacyCreateShape(kind) {
  const tag = kind === 'circle' ? 'ellipse' : (kind === 'arrow' ? 'line' : kind);
  const el = document.createElementNS(SVG_NS, tag);
  el.setAttribute('stroke', state.shapeStroke);
  el.setAttribute('stroke-width', state.shapeSize);
  if (tag !== 'line') {
    el.setAttribute('fill', (kind === 'line' || state.shapeFillNone) ? 'none' : state.shapeFill);
  } else {
    el.setAttribute('fill', 'none');
    el.setAttribute('stroke-linecap', state.shapeLineCap);
    if (state.shapeLineStart === 'arrow') el.setAttribute('marker-start', 'url(#arrow-start-normal)');
    else if (state.shapeLineStart === 'arrow-hollow') el.setAttribute('marker-start', 'url(#arrow-start-hollow)');
    if (state.shapeLineEnd === 'arrow') el.setAttribute('marker-end', 'url(#arrow-end-normal)');
    else if (state.shapeLineEnd === 'arrow-hollow') el.setAttribute('marker-end', 'url(#arrow-end-hollow)');
    else if (state.shapeLineEnd === 'circle') el.setAttribute('marker-end', 'url(#circle-end)');
    else if (state.shapeLineEnd === 'square') el.setAttribute('marker-end', 'url(#square-end)');
  }
  el.classList.add('annot');
  return el;
}

/* ============================================================
   §6. STROKE DRAWING
   ============================================================ */
function startStroke(kind, p) {
  const rect = stage.getBoundingClientRect();
  const inter = { type: 'stroke', kind, points: [p], rect, pre: snapshot() };
  clearTransient();
  if (kind === 'highlighter' && transientCanvas) transientCanvas.style.opacity = '0.4';
  else if (transientCanvas) transientCanvas.style.opacity = '1';
  interaction = inter;
  scheduleStrokeRedraw();
}
function scheduleStrokeRedraw() {
  if (strokeRAF) return;
  strokeRAF = requestAnimationFrame(() => { strokeRAF = null; redrawStroke(); });
}
function redrawStroke() {
  const inter = interaction;
  if (!inter || inter.type !== 'stroke' || !transientCanvas || !transCtx) return;
  const k = state.canvasScale, dpr = state.dpr;
  transCtx.setTransform(1, 0, 0, 1, 0, 0);
  transCtx.clearRect(0, 0, transientCanvas.width, transientCanvas.height);
  const raw = inter.points;
  if (raw.length < 1) return;

  if (inter.kind === 'eraser') {
    transCtx.strokeStyle = '#fff';
    transCtx.fillStyle = '#fff';
    transCtx.lineWidth = state.eraserSize * dpr;
    transCtx.lineCap = 'round';
    transCtx.lineJoin = 'round';
    transCtx.shadowColor = 'rgba(0,0,0,.28)';
    transCtx.shadowBlur = 4 * dpr;
    if (raw.length === 1) {
      transCtx.beginPath();
      transCtx.arc(raw[0].x*k, raw[0].y*k, (state.eraserSize*dpr)/2, 0, Math.PI*2);
      transCtx.fill();
    } else {
      transCtx.beginPath();
      transCtx.moveTo(raw[0].x*k, raw[0].y*k);
      for (let i = 1; i < raw.length; i++) transCtx.lineTo(raw[i].x*k, raw[i].y*k);
      transCtx.stroke();
    }
    transCtx.shadowBlur = 0;
    transCtx.shadowColor = 'transparent';
    return;
  }

  const level = getSmoothingLevel(inter.kind);
  const pts = level > 0 ? getSmoothedPoints(raw, level) : raw;
  if (inter.kind === 'pen') {
    transCtx.strokeStyle = state.penColor;
    transCtx.fillStyle = state.penColor;
    transCtx.lineWidth = state.penSize * dpr;
    transCtx.lineCap = 'round';
    transCtx.lineJoin = 'round';
  } else {
    transCtx.strokeStyle = state.highlighterColor;
    transCtx.fillStyle = state.highlighterColor;
    transCtx.lineWidth = state.highlighterSize * dpr;
    transCtx.lineCap = 'square';
    transCtx.lineJoin = 'miter';
  }

  if (pts.length === 1) {
    transCtx.beginPath();
    transCtx.arc(pts[0].x*k, pts[0].y*k, Math.max(1, transCtx.lineWidth/2), 0, Math.PI*2);
    transCtx.fill();
    return;
  }
  if (level === 0) {
    transCtx.beginPath();
    transCtx.moveTo(pts[0].x*k, pts[0].y*k);
    for (let i = 1; i < pts.length; i++) transCtx.lineTo(pts[i].x*k, pts[i].y*k);
    transCtx.stroke();
  } else {
    transCtx.beginPath();
    transCtx.moveTo(pts[0].x*k, pts[0].y*k);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i].x + pts[i+1].x) / 2 * k;
      const my = (pts[i].y + pts[i+1].y) / 2 * k;
      transCtx.quadraticCurveTo(pts[i].x*k, pts[i].y*k, mx, my);
    }
    const last = pts[pts.length - 1];
    transCtx.lineTo(last.x*k, last.y*k);
    transCtx.stroke();
  }
}

function appendStrokePoints(e) {
  const inter = interaction;
  if (!inter || inter.type !== 'stroke') return;
  const events = (typeof e.getCoalescedEvents === 'function') ? (e.getCoalescedEvents() || [e]) : [e];
  const level = inter.kind === 'eraser' ? 0 : getSmoothingLevel(inter.kind);
  const minDist = [1, 1, 2, 3, 4][level] || 1;
  const minDistSq = minDist * minDist;
  let added = 0;
  const r = inter.rect;
  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    if (!ev) continue;
    const p = { x: ((ev.clientX-r.left)/r.width)*state.pdfW, y: ((ev.clientY-r.top)/r.height)*state.pdfH };
    const last = inter.points[inter.points.length - 1];
    const dx = p.x - last.x, dy = p.y - last.y;
    if (dx*dx + dy*dy > minDistSq) { inter.points.push(p); added++; }
  }
  if (added > 0) {
    scheduleStrokeRedraw();
    if (inter.kind === 'eraser') eraserEraseAlongPath();
  }
}

function eraserEraseAlongPath() {
  const inter = interaction;
  if (!inter || inter.type !== 'stroke' || inter.kind !== 'eraser') return;
  const pts = inter.points;
  const cssToPdf = state.cssW > 0 ? state.pdfW / state.cssW : 1;
  const tol = (state.eraserSize / 2) * cssToPdf;
  const startIdx = Math.max(1, pts.length - 4);
  for (let i = startIdx; i < pts.length; i++) {
    const a = pts[i-1], b = pts[i];
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    const step = Math.max(tol / 2, 4);
    const n = Math.max(1, Math.ceil(dist / step));
    for (let j = 0; j <= n; j++) {
      const t = j / n;
      eraseAtPdf({ x: a.x + (b.x-a.x)*t, y: a.y + (b.y-a.y)*t }, tol);
    }
  }
}

function eraseAtPdf(p, tol) {
  const toRemove = [];
  if (!svgLayer) return 0;
  svgLayer.querySelectorAll('.annot-wrapper').forEach(wrap => {
    const el = wrap.querySelector('[data-annot]');
    if (!el) return;
    if (el.tagName.toLowerCase() === 'g') return;
    if (!state.eraserErasesShapes) {
      const tag = el.tagName;
      if (tag === 'rect' || tag === 'ellipse') return;
    }
    if (isPointNearShape(p, el, tol)) toRemove.push(wrap);
  });
  toRemove.forEach(wrap => {
    const inner = wrap.querySelector('[data-annot]');
    if (state.selected && state.selected.el === inner) state.selected = null;
    wrap.remove();
  });
  return toRemove.length;
}

function endStroke() {
  const inter = interaction;
  if (!inter || inter.type !== 'stroke') return;
  interaction = null;
  clearTransient();
  if (strokeRAF) { cancelAnimationFrame(strokeRAF); strokeRAF = null; }

  if (inter.kind === 'pen' || inter.kind === 'highlighter') {
    if (inter.points.length >= 2) {
      const p = buildPathFromPoints(inter.points, inter.kind);
      if (p) commitChange(inter.pre);
    }
  } else if (inter.kind === 'eraser') {
    if (inter.pre) {
      const before = (inter.pre.annotations || []).map(a => a.dataId).sort().join(',');
      const after = snapshot().annotations.map(a => a.dataId).sort().join(',');
      if (before !== after) commitChange(inter.pre);
    }
  }
}

function clearTransient() {
  if (transCtx && transientCanvas) {
    transCtx.clearRect(0, 0, transientCanvas.width, transientCanvas.height);
    transientCanvas.style.opacity = '1';
  }
}

/* ============================================================
   §7. LASER
   ============================================================ */
export function clearLaser() {
  laserStrokes.length = 0;
  currentLaserStroke = null;
  laserLastActivity = 0;
  if (laserCtx && laserCanvas) {
    laserCtx.clearRect(0, 0, laserCanvas.width, laserCanvas.height);
  }
}
function startLaserRAF() { if (laserRAF) return; laserRAF = requestAnimationFrame(laserTick); }
function laserTick() {
  const now = performance.now();
  if (laserStrokes.length === 0 || !laserCtx || !laserCanvas) { laserRAF = null; return; }
  const age = now - laserLastActivity;
  let alpha = 1;
  if (age > state.laserLifeMs) alpha = Math.max(0, 1 - (age - state.laserLifeMs) / LASER_FADE_MS);
  laserCtx.setTransform(1, 0, 0, 1, 0, 0);
  laserCtx.clearRect(0, 0, laserCanvas.width, laserCanvas.height);
  if (alpha <= 0) { laserStrokes.length = 0; currentLaserStroke = null; laserRAF = null; return; }

  laserCtx.globalAlpha = alpha;
  laserCtx.lineCap = 'round';
  laserCtx.lineJoin = 'round';
  const k = state.canvasScale;
  const intensity = state.laserGlowIntensity;
  const inner = state.laserInnerColor;

  for (let i = 0; i < laserStrokes.length; i++) {
    const s = laserStrokes[i];
    if (!s.points || s.points.length < 1) continue;
    laserCtx.shadowColor = s.color;
    laserCtx.shadowBlur = s.width * k * intensity;
    laserCtx.strokeStyle = s.color;
    laserCtx.lineWidth = s.width * k;
    laserCtx.beginPath();
    laserCtx.moveTo(s.points[0].x*k, s.points[0].y*k);
    if (s.points.length === 1) laserCtx.lineTo(s.points[0].x*k + 0.01, s.points[0].y*k);
    else for (let j = 1; j < s.points.length; j++) laserCtx.lineTo(s.points[j].x*k, s.points[j].y*k);
    laserCtx.stroke();
  }
  laserCtx.shadowBlur = 0;
  laserCtx.shadowColor = 'transparent';

  if (inner === 'transparent') {
    laserCtx.globalCompositeOperation = 'destination-out';
    laserCtx.fillStyle = 'rgba(0,0,0,1)';
    laserCtx.strokeStyle = 'rgba(0,0,0,1)';
    for (let i = 0; i < laserStrokes.length; i++) {
      const s = laserStrokes[i];
      if (!s.points || s.points.length < 1) continue;
      if (s.points.length === 1) {
        laserCtx.beginPath();
        laserCtx.arc(s.points[0].x*k, s.points[0].y*k, (s.width*k)/2, 0, Math.PI*2);
        laserCtx.fill();
      } else {
        laserCtx.lineWidth = s.width * k;
        laserCtx.beginPath();
        laserCtx.moveTo(s.points[0].x*k, s.points[0].y*k);
        for (let j = 1; j < s.points.length; j++) laserCtx.lineTo(s.points[j].x*k, s.points[j].y*k);
        laserCtx.stroke();
      }
    }
    laserCtx.globalCompositeOperation = 'source-over';
  } else {
    laserCtx.fillStyle = inner;
    laserCtx.strokeStyle = inner;
    for (let i = 0; i < laserStrokes.length; i++) {
      const s = laserStrokes[i];
      if (!s.points || s.points.length < 1) continue;
      if (s.points.length === 1) {
        laserCtx.beginPath();
        laserCtx.arc(s.points[0].x*k, s.points[0].y*k, Math.max(1, s.width*k*0.3), 0, Math.PI*2);
        laserCtx.fill();
      } else {
        laserCtx.lineWidth = Math.max(1, s.width*k*0.55);
        laserCtx.beginPath();
        laserCtx.moveTo(s.points[0].x*k, s.points[0].y*k);
        for (let j = 1; j < s.points.length; j++) laserCtx.lineTo(s.points[j].x*k, s.points[j].y*k);
        laserCtx.stroke();
      }
    }
  }
  laserCtx.shadowBlur = 0;
  laserCtx.shadowColor = 'transparent';
  laserCtx.globalAlpha = 1;
  laserRAF = requestAnimationFrame(laserTick);
}
function laserStart(p) {
  laserLastActivity = performance.now();
  currentLaserStroke = { points: [p], color: state.laserColor, width: state.laserSize };
  laserStrokes.push(currentLaserStroke);
  startLaserRAF();
}
function laserAdd(p) {
  if (!currentLaserStroke) return;
  const last = currentLaserStroke.points[currentLaserStroke.points.length - 1];
  if (Math.hypot(p.x - last.x, p.y - last.y) < 1.5) return;
  currentLaserStroke.points.push(p);
  laserLastActivity = performance.now();
}
function laserEnd() { currentLaserStroke = null; laserLastActivity = performance.now(); }

/* ============================================================
   §8. SELECTION & MULTI-SELECTION
   ============================================================ */
export function deselect() {
  if (state.selectedList && state.selectedList.length > 0) {
    state.selectedList.forEach(sel => {
      try {
        if (sel.kind === 'svg') {
          const inner = sel.el.querySelector && sel.el.querySelector('[data-annot]') || sel.el;
          inner.classList.remove('selected');
        } else if (sel.kind === 'text') {
          sel.el.classList.remove('selected');
          if (sel.el.classList.contains('editing')) finishEdit(sel.el);
        } else {
          sel.el.classList.remove('selected');
        }
      } catch (_) {}
    });
  } else if (state.selected) {
    const sel = state.selected;
    if (sel.kind === 'svg') {
      const inner = sel.el.querySelector && sel.el.querySelector('[data-annot]') || sel.el;
      inner.classList.remove('selected');
    } else if (sel.kind === 'text') {
      sel.el.classList.remove('selected');
      if (sel.el.classList.contains('editing')) finishEdit(sel.el);
    } else if (sel.el) {
      sel.el.classList.remove('selected');
    }
  }

  state.selectedList = [];
  state.selected = null;

  if (selectionSvg) selectionSvg.innerHTML = '';

  if (embedLayer) embedLayer.querySelectorAll('.embed').forEach(e => e.classList.remove('selected'));
  if (videoLayer) videoLayer.querySelectorAll('.media-obj').forEach(e => e.classList.remove('selected'));
  if (textLayer) textLayer.querySelectorAll('.pdf-text-box').forEach(e => e.classList.remove('selected'));
  if (interactiveLayer) interactiveLayer.querySelectorAll('.pdf-interactive-btn').forEach(e => e.classList.remove('selected'));
  hideFloatingToolbars();
  document.dispatchEvent(new CustomEvent('ipb:selectionChanged', { detail: { selected: null, list: [] } }));
}

function addToSelection(item, additive = false) {
  if (!state.selectedList) state.selectedList = [];
  if (!additive) {
    deselect();
    state.selectedList = [item];
    item.el.classList.add('selected');
  } else {
    const idx = state.selectedList.findIndex(it => it.el === item.el);
    if (idx >= 0) {
      state.selectedList.splice(idx, 1);
      item.el.classList.remove('selected');
      if (state.selectedList.length === 0) { deselect(); return; }
    } else {
      state.selectedList.push(item);
      item.el.classList.add('selected');
    }
  }
  state.selected = state.selectedList.length > 0 ? state.selectedList[0] : null;
  drawSelectionOverlay();
  hideFloatingToolbars();
  document.dispatchEvent(new CustomEvent('ipb:selectionChanged', {
    detail: { selected: state.selected, list: state.selectedList }
  }));
}

export function selectAnnotation(el, additive = false) {
  addToSelection({ kind: 'svg', el }, additive);
}
export function selectEmbed(el, additive = false) {
  addToSelection({ kind: 'embed', el }, additive);
}
export function selectMedia(el, additive = false) {
  addToSelection({ kind: 'media', el }, additive);
}
export function selectButton(el, additive = false) {
  addToSelection({ kind: 'button', el }, additive);
}
export function selectTextBox(el, additive = false) {
  addToSelection({ kind: 'text', el }, additive);
}

// استماع لاختيار الطبقة من الشريط السفلي
if (typeof document !== 'undefined') {
  document.addEventListener('ipb:selectLayer', (e) => {
    const { el, kind } = e.detail || {};
    if (!el) return;
    if (kind === 'svg') {
      const inner = el.querySelector('[data-annot]') || el;
      selectAnnotation(inner);
    } else if (kind === 'text') {
      selectTextBox(el);
    } else if (kind === 'media') {
      selectMedia(el);
    } else if (kind === 'button') {
      selectButton(el);
    } else if (kind === 'embed') {
      selectEmbed(el);
    }
  });
}

export function getShapeBBox(el) {
  try {
    if (el.tagName === 'line') {
      const x1 = +el.getAttribute('x1'), y1 = +el.getAttribute('y1');
      const x2 = +el.getAttribute('x2'), y2 = +el.getAttribute('y2');
      const pad = 8;
      return {
        x: Math.min(x1, x2) - pad, y: Math.min(y1, y2) - pad,
        width: Math.abs(x2 - x1) + pad * 2, height: Math.abs(y2 - y1) + pad * 2,
      };
    }
    return el.getBBox();
  } catch (_) { return null; }
}

export function getElementBBoxInStage(el) {
  if (!el || !stage) return null;
  const tag = el.tagName ? el.tagName.toLowerCase() : '';
  if (tag === 'rect' || tag === 'circle' || tag === 'ellipse' || tag === 'line' || tag === 'path') {
    const b = getShapeBBox(el);
    if (b) return b;
  }
  const inner = el.querySelector && el.querySelector('[data-annot]');
  if (inner) {
    const b = getShapeBBox(inner);
    if (b) return b;
  }
  const sr = stage.getBoundingClientRect();
  const er = el.getBoundingClientRect();
  if (sr.width === 0 || sr.height === 0) return null;
  const sx = (state.pdfW || 2000) / sr.width;
  const sy = (state.pdfH || 2828) / sr.height;
  return {
    x: (er.left - sr.left) * sx,
    y: (er.top - sr.top) * sy,
    width: er.width * sx,
    height: er.height * sy,
  };
}

export function rectsIntersect(r1, r2) {
  return !(
    r2.x > r1.x + r1.width ||
    r2.x + r2.width < r1.x ||
    r2.y > r1.y + r1.height ||
    r2.y + r2.height < r1.y
  );
}

export function getAllSelectableElements() {
  const list = [];
  if (svgLayer) {
    svgLayer.querySelectorAll('[data-annot]').forEach(inner => {
      if (!inner.classList.contains('handle')) {
        list.push({ kind: 'svg', el: inner });
      }
    });
  }
  if (textLayer) {
    textLayer.querySelectorAll('.pdf-text-box').forEach(el => {
      list.push({ kind: 'text', el });
    });
  }
  if (videoLayer) {
    videoLayer.querySelectorAll('.media-obj').forEach(el => {
      list.push({ kind: 'media', el });
    });
  }
  if (embedLayer) {
    embedLayer.querySelectorAll('.embed').forEach(el => {
      list.push({ kind: 'embed', el });
    });
  }
  if (interactiveLayer) {
    interactiveLayer.querySelectorAll('.pdf-interactive-btn').forEach(el => {
      list.push({ kind: 'button', el });
    });
  }
  return list;
}

export function drawSelectionOverlay(target) {
  if (!selectionSvg) return;
  const marqueeEl = selectionSvg.querySelector('.marquee-box');
  const savedMarquee = marqueeEl ? marqueeEl.cloneNode(true) : null;

  selectionSvg.innerHTML = '';
  if (savedMarquee) selectionSvg.appendChild(savedMarquee);

  const selectedItems = state.selectedList && state.selectedList.length > 0
    ? state.selectedList
    : (state.selected ? [state.selected] : []);

  if (selectedItems.length === 0) return;

  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('class', 'selection-overlay');
  const hs = Math.max(6, (state.pdfW || 2000) / 140);

  // إذا كان خطاً مستقيماً واحداً
  if (selectedItems.length === 1 && selectedItems[0].kind === 'svg' && selectedItems[0].el.tagName === 'line') {
    const el = selectedItems[0].el;
    const x1 = +el.getAttribute('x1'), y1 = +el.getAttribute('y1');
    const x2 = +el.getAttribute('x2'), y2 = +el.getAttribute('y2');
    const outline = document.createElementNS(SVG_NS, 'line');
    outline.setAttribute('x1', x1); outline.setAttribute('y1', y1);
    outline.setAttribute('x2', x2); outline.setAttribute('y2', y2);
    outline.setAttribute('class', 'selection-outline');
    g.appendChild(outline);
    [['start', x1, y1], ['end', x2, y2]].forEach(([name, x, y]) => {
      const c = document.createElementNS(SVG_NS, 'circle');
      c.setAttribute('cx', x); c.setAttribute('cy', y);
      c.setAttribute('r', hs);
      c.setAttribute('class', 'handle ' + name);
      c.dataset.handle = name;
      g.appendChild(c);
    });
    selectionSvg.appendChild(g);
    return;
  }

  // إذا كان منحنى واحداً (Curve) — إظهار نقاط البداية والنهاية ونقطة التحكم بالانحناء
  if (selectedItems.length === 1 && selectedItems[0].kind === 'svg' && selectedItems[0].el.dataset.type === 'curve') {
    const el = selectedItems[0].el;
    const x0 = parseFloat(el.dataset.x0) || 0;
    const y0 = parseFloat(el.dataset.y0) || 0;
    const cx = parseFloat(el.dataset.cx) || ((x0 + parseFloat(el.dataset.x1 || x0 + 100)) / 2);
    const cy = parseFloat(el.dataset.cy) || ((y0 + parseFloat(el.dataset.y1 || y0)) / 2 - 40);
    const x1 = parseFloat(el.dataset.x1) || (x0 + 100);
    const y1 = parseFloat(el.dataset.y1) || y0;

    // خطوط إرشادية منقطة إلى نقطة الانحناء
    const gLine1 = document.createElementNS(SVG_NS, 'line');
    gLine1.setAttribute('x1', x0); gLine1.setAttribute('y1', y0);
    gLine1.setAttribute('x2', cx); gLine1.setAttribute('y2', cy);
    gLine1.setAttribute('stroke', '#f59e0b');
    gLine1.setAttribute('stroke-width', '1.5');
    gLine1.setAttribute('stroke-dasharray', '3 3');
    g.appendChild(gLine1);

    const gLine2 = document.createElementNS(SVG_NS, 'line');
    gLine2.setAttribute('x1', x1); gLine2.setAttribute('y1', y1);
    gLine2.setAttribute('x2', cx); gLine2.setAttribute('y2', cy);
    gLine2.setAttribute('stroke', '#f59e0b');
    gLine2.setAttribute('stroke-width', '1.5');
    gLine2.setAttribute('stroke-dasharray', '3 3');
    g.appendChild(gLine2);

    // مقبض نقطة البداية
    const cStart = document.createElementNS(SVG_NS, 'circle');
    cStart.setAttribute('cx', x0); cStart.setAttribute('cy', y0);
    cStart.setAttribute('r', hs);
    cStart.setAttribute('class', 'handle curve-point');
    cStart.dataset.handle = 'curve-start';
    cStart.setAttribute('style', 'fill:#3b82f6;stroke:#fff;stroke-width:2');
    g.appendChild(cStart);

    // مقبض نقطة النهاية
    const cEnd = document.createElementNS(SVG_NS, 'circle');
    cEnd.setAttribute('cx', x1); cEnd.setAttribute('cy', y1);
    cEnd.setAttribute('r', hs);
    cEnd.setAttribute('class', 'handle curve-point');
    cEnd.dataset.handle = 'curve-end';
    cEnd.setAttribute('style', 'fill:#3b82f6;stroke:#fff;stroke-width:2');
    g.appendChild(cEnd);

    // مقبض نقطة التحكم بالانحناء (بلون ذهبي برتقالي)
    const cCtrl = document.createElementNS(SVG_NS, 'circle');
    cCtrl.setAttribute('cx', cx); cCtrl.setAttribute('cy', cy);
    cCtrl.setAttribute('r', hs * 1.25);
    cCtrl.setAttribute('class', 'handle curve-ctrl');
    cCtrl.dataset.handle = 'curve-ctrl';
    cCtrl.setAttribute('style', 'fill:#f59e0b;stroke:#fff;stroke-width:2.5');
    g.appendChild(cCtrl);
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  selectedItems.forEach(item => {
    const b = getUniversalShapeBounds(item.el) || getElementBBoxInStage(item.el);
    if (!b) return;
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.width);
    maxY = Math.max(maxY, b.y + b.height);

    if (selectedItems.length > 1) {
      const subRect = document.createElementNS(SVG_NS, 'rect');
      subRect.setAttribute('x', b.x);
      subRect.setAttribute('y', b.y);
      subRect.setAttribute('width', b.width);
      subRect.setAttribute('height', b.height);
      subRect.setAttribute('class', 'selection-outline-sub');
      subRect.style.stroke = 'rgba(74, 126, 255, 0.45)';
      subRect.style.strokeDasharray = '3 3';
      subRect.style.fill = 'none';
      g.appendChild(subRect);
    }
  });

  if (minX === Infinity) return;

  const width = Math.max(2, maxX - minX);
  const height = Math.max(2, maxY - minY);

  const rect = document.createElementNS(SVG_NS, 'rect');
  rect.setAttribute('x', minX);
  rect.setAttribute('y', minY);
  rect.setAttribute('width', width);
  rect.setAttribute('height', height);
  rect.setAttribute('class', 'selection-outline');
  g.appendChild(rect);

  // إذا كان مستطيلاً واحداً — إضافة مقبض استدارة الزوايا (Radius Handle)
  if (selectedItems.length === 1 && selectedItems[0].kind === 'svg' && selectedItems[0].el.tagName && selectedItems[0].el.tagName.toLowerCase() === 'rect') {
    const curRx = parseFloat(selectedItems[0].el.getAttribute('rx') || '0');
    const radHandleX = Math.min(minX + width / 2, minX + Math.max(14, curRx));
    const radHandleY = minY + Math.min(20, height / 2);

    const radHandle = document.createElementNS(SVG_NS, 'circle');
    radHandle.setAttribute('cx', radHandleX);
    radHandle.setAttribute('cy', radHandleY);
    radHandle.setAttribute('r', hs * 0.9);
    radHandle.setAttribute('class', 'handle radius');
    radHandle.dataset.handle = 'radius';
    radHandle.setAttribute('style', 'fill:#f59e0b;stroke:#fff;stroke-width:2;cursor:ew-resize');
    g.appendChild(radHandle);
  }

  // 8 مقَابض كاملة للتكبير والتصغير من الزوايا الأربع وجميع الأطراف
  const pts = {
    nw: [minX, minY],
    ne: [minX + width, minY],
    se: [minX + width, minY + height],
    sw: [minX, minY + height],
    n:  [minX + width / 2, minY],
    s:  [minX + width / 2, minY + height],
    w:  [minX, minY + height / 2],
    e:  [minX + width, minY + height / 2],
  };
  Object.keys(pts).forEach(k => {
    const c = document.createElementNS(SVG_NS, 'circle');
    c.setAttribute('cx', pts[k][0]);
    c.setAttribute('cy', pts[k][1]);
    c.setAttribute('r', hs);
    c.setAttribute('class', 'handle ' + k);
    c.dataset.handle = k;
    g.appendChild(c);
  });

  // مقبض الدوران الدائري بالأعلى مع خط توصيل أنيق (PowerPoint / Figma Rotate Handle)
  const rotDist = Math.max(22, hs * 2.8);
  const rotLine = document.createElementNS(SVG_NS, 'line');
  rotLine.setAttribute('x1', minX + width / 2);
  rotLine.setAttribute('y1', minY);
  rotLine.setAttribute('x2', minX + width / 2);
  rotLine.setAttribute('y2', minY - rotDist);
  rotLine.setAttribute('stroke', '#4a7eff');
  rotLine.setAttribute('stroke-width', '1.5');
  g.appendChild(rotLine);

  const rotHandle = document.createElementNS(SVG_NS, 'circle');
  rotHandle.setAttribute('cx', minX + width / 2);
  rotHandle.setAttribute('cy', minY - rotDist);
  rotHandle.setAttribute('r', hs * 1.05);
  rotHandle.setAttribute('class', 'handle rot');
  rotHandle.dataset.handle = 'rot';
  rotHandle.setAttribute('style', 'fill:#3b82f6;stroke:#fff;stroke-width:2.5;cursor:grab');
  g.appendChild(rotHandle);

  selectionSvg.appendChild(g);
}

export function deleteSelectedElements() {
  const items = state.selectedList && state.selectedList.length > 0
    ? [...state.selectedList]
    : (state.selected ? [state.selected] : []);
  if (items.length === 0) return;

  const pre = snapshot();
  items.forEach(sel => {
    try {
      if (sel.kind === 'media') {
        const v = sel.el.querySelector && sel.el.querySelector('video');
        if (v) { v.pause(); v.src = ''; }
      }
      const wrap = sel.el.closest && sel.el.closest('.annot-wrapper');
      (wrap || sel.el).remove();
    } catch (_) {}
  });

  deselect();
  commitChange(pre);
}

export function duplicateSelectedElements() {
  const items = state.selectedList && state.selectedList.length > 0
    ? [...state.selectedList]
    : (state.selected ? [state.selected] : []);
  if (items.length === 0) return;

  const pre = snapshot();
  const offset = 24;
  const newSelected = [];

  items.forEach(it => {
    try {
      if (it.kind === 'svg') {
        const wrap = it.el.closest && it.el.closest('.annot-wrapper');
        if (wrap) {
          const clone = wrap.cloneNode(true);
          const inner = clone.querySelector('[data-annot]') || clone.firstElementChild;
          if (inner) {
            inner.dataset.id = uid();
            const orig = captureSvgGeom(inner);
            applySvgGeom(inner, orig, offset, offset);
            inner.classList.remove('selected');
            if (svgLayer) svgLayer.appendChild(clone);
            newSelected.push({ kind: 'svg', el: inner });
          }
        }
      } else if (it.kind === 'text') {
        const curLeft = parseFloat(it.el.style.left) || 0;
        const curTop = parseFloat(it.el.style.top) || 0;
        const isLeftPct = String(it.el.style.left).includes('%');
        const isTopPct = String(it.el.style.top).includes('%');
        const newLeft = isLeftPct ? (curLeft + (offset / (state.pdfW || 2000) * 100)) + '%' : (curLeft + offset) + 'px';
        const newTop = isTopPct ? (curTop + (offset / (state.pdfH || 2828) * 100)) + '%' : (curTop + offset) + 'px';
        const newEl = addTextBox({
          text: it.el.dataset.text || '',
          x: newLeft, y: newTop,
          w: it.el.style.width || '200px',
          h: it.el.style.height || 'auto',
          fontSize: it.el.dataset.fontSize,
          fontFamily: it.el.dataset.fontFamily,
          fontWeight: it.el.dataset.fontWeight,
          fontStyle: it.el.dataset.fontStyle,
          color: it.el.dataset.color,
          align: it.el.dataset.align,
          dir: it.el.dataset.dir,
          isEquation: it.el.dataset.isEquation === 'true',
        }, false);
        newSelected.push({ kind: 'text', el: newEl });
      } else if (it.kind === 'media') {
        const curLeft = parseFloat(it.el.style.left) || 0;
        const curTop = parseFloat(it.el.style.top) || 0;
        const isLeftPct = String(it.el.style.left).includes('%');
        const isTopPct = String(it.el.style.top).includes('%');
        const newLeft = isLeftPct ? (curLeft + (offset / (state.pdfW || 2000) * 100)) + '%' : (curLeft + offset) + 'px';
        const newTop = isTopPct ? (curTop + (offset / (state.pdfH || 2828) * 100)) + '%' : (curTop + offset) + 'px';
        const newEl = addMediaElement(
          uid(), it.el.dataset.url, it.el.dataset.title, it.el.dataset.mediaType,
          newLeft, newTop, it.el.style.width, it.el.style.height, false
        );
        newSelected.push({ kind: 'media', el: newEl });
      } else if (it.kind === 'button') {
        const curLeft = parseFloat(it.el.style.left) || 0;
        const curTop = parseFloat(it.el.style.top) || 0;
        const isLeftPct = String(it.el.style.left).includes('%');
        const isTopPct = String(it.el.style.top).includes('%');
        const newLeft = isLeftPct ? (curLeft + (offset / (state.pdfW || 2000) * 100)) + '%' : (curLeft + offset) + 'px';
        const newTop = isTopPct ? (curTop + (offset / (state.pdfH || 2828) * 100)) + '%' : (curTop + offset) + 'px';
        const newEl = addButtonElement({
          text: it.el.dataset.text,
          fillColor: it.el.dataset.fillColor,
          fillOpacity: it.el.dataset.fillOpacity,
          borderColor: it.el.dataset.borderColor,
          borderOpacity: it.el.dataset.borderOpacity,
          textColor: it.el.dataset.textColor,
          fontSize: it.el.dataset.fontSize,
          borderRadius: it.el.dataset.borderRadius,
          isCorrect: it.el.dataset.isCorrect === 'true',
          isLtr: it.el.dataset.isLtr === 'true',
          x: newLeft, y: newTop,
          w: it.el.style.width, h: it.el.style.height,
        }, false);
        newSelected.push({ kind: 'button', el: newEl });
      }
    } catch (_) {}
  });

  deselect();
  state.selectedList = newSelected;
  state.selected = newSelected[0] || null;
  newSelected.forEach(it => it.el.classList.add('selected'));
  drawSelectionOverlay();
  commitChange(pre);
  document.dispatchEvent(new CustomEvent('ipb:selectionChanged', {
    detail: { selected: state.selected, list: state.selectedList }
  }));
}

export function alignSelected(alignType, targetMode = 'selection') {
  const items = state.selectedList && state.selectedList.length > 0
    ? state.selectedList
    : (state.selected ? [state.selected] : []);
  if (items.length === 0) return;

  if (items.length === 1) targetMode = 'canvas';

  const pre = snapshot();
  const boxes = items.map(it => ({
    item: it,
    box: getElementBBoxInStage(it.el),
  })).filter(b => b.box != null);

  if (boxes.length === 0) return;

  let refLeft = 0, refTop = 0, refW = state.pdfW || 2000, refH = state.pdfH || 2828;
  if (targetMode === 'selection') {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    boxes.forEach(b => {
      minX = Math.min(minX, b.box.x);
      minY = Math.min(minY, b.box.y);
      maxX = Math.max(maxX, b.box.x + b.box.width);
      maxY = Math.max(maxY, b.box.y + b.box.height);
    });
    refLeft = minX;
    refTop = minY;
    refW = maxX - minX;
    refH = maxY - minY;
  }

  boxes.forEach(({ item, box }) => {
    let targetX = box.x;
    let targetY = box.y;

    if (alignType === 'left') {
      targetX = refLeft;
    } else if (alignType === 'centerH') {
      targetX = refLeft + (refW - box.width) / 2;
    } else if (alignType === 'right') {
      targetX = refLeft + refW - box.width;
    } else if (alignType === 'top') {
      targetY = refTop;
    } else if (alignType === 'centerV') {
      targetY = refTop + (refH - box.height) / 2;
    } else if (alignType === 'bottom') {
      targetY = refTop + refH - box.height;
    }

    const dx = targetX - box.x;
    const dy = targetY - box.y;
    applyElementDelta(item, dx, dy);
  });

  drawSelectionOverlay();
  commitChange(pre);
  document.dispatchEvent(new CustomEvent('ipb:elementTransformed'));
}

export function distributeSelected(axis, targetMode = 'selection') {
  const items = state.selectedList && state.selectedList.length > 0
    ? state.selectedList
    : (state.selected ? [state.selected] : []);
  if (items.length < 2) return;

  const pre = snapshot();
  const boxes = items.map(it => ({
    item: it,
    box: getElementBBoxInStage(it.el),
  })).filter(b => b.box != null);

  if (boxes.length < 2) return;

  if (axis === 'horizontal') {
    boxes.sort((a, b) => a.box.x - b.box.x);
    const canvasW = state.pdfW || 2000;
    let refLeft = targetMode === 'canvas' ? 0 : boxes[0].box.x;
    let refRight = targetMode === 'canvas' ? canvasW : (boxes[boxes.length - 1].box.x + boxes[boxes.length - 1].box.width);
    const totalW = boxes.reduce((acc, b) => acc + b.box.width, 0);
    const availSpace = refRight - refLeft - totalW;

    if (targetMode === 'selection' && boxes.length > 2) {
      const gap = availSpace / (boxes.length - 1);
      let curX = boxes[0].box.x;
      boxes.forEach((b, idx) => {
        if (idx > 0) {
          const dx = curX - b.box.x;
          applyElementDelta(b.item, dx, 0);
        }
        curX += b.box.width + gap;
      });
    } else if (targetMode === 'canvas') {
      const gap = Math.max(0, availSpace / (boxes.length + 1));
      let curX = refLeft + gap;
      boxes.forEach(b => {
        const dx = curX - b.box.x;
        applyElementDelta(b.item, dx, 0);
        curX += b.box.width + gap;
      });
    }
  } else if (axis === 'vertical') {
    boxes.sort((a, b) => a.box.y - b.box.y);
    const canvasH = state.pdfH || 2828;
    let refTop = targetMode === 'canvas' ? 0 : boxes[0].box.y;
    let refBottom = targetMode === 'canvas' ? canvasH : (boxes[boxes.length - 1].box.y + boxes[boxes.length - 1].box.height);
    const totalH = boxes.reduce((acc, b) => acc + b.box.height, 0);
    const availSpace = refBottom - refTop - totalH;

    if (targetMode === 'selection' && boxes.length > 2) {
      const gap = availSpace / (boxes.length - 1);
      let curY = boxes[0].box.y;
      boxes.forEach((b, idx) => {
        if (idx > 0) {
          const dy = curY - b.box.y;
          applyElementDelta(b.item, 0, dy);
        }
        curY += b.box.height + gap;
      });
    } else if (targetMode === 'canvas') {
      const gap = Math.max(0, availSpace / (boxes.length + 1));
      let curY = refTop + gap;
      boxes.forEach(b => {
        const dy = curY - b.box.y;
        applyElementDelta(b.item, 0, dy);
        curY += b.box.height + gap;
      });
    }
  }

  drawSelectionOverlay();
  commitChange(pre);
  document.dispatchEvent(new CustomEvent('ipb:elementTransformed'));
}

export function applyElementDelta(item, dx, dy) {
  if (item.kind === 'svg') {
    const orig = captureSvgGeom(item.el);
    applySvgGeom(item.el, orig, dx, dy);
  } else {
    const curLeft = parseFloat(item.el.style.left) || 0;
    const curTop = parseFloat(item.el.style.top) || 0;
    const isLeftPct = String(item.el.style.left).includes('%');
    const isTopPct = String(item.el.style.top).includes('%');
    if (isLeftPct) {
      item.el.style.left = (curLeft + (dx / (state.pdfW || 2000) * 100)) + '%';
    } else {
      item.el.style.left = (curLeft + dx) + 'px';
    }
    if (isTopPct) {
      item.el.style.top = (curTop + (dy / (state.pdfH || 2828) * 100)) + '%';
    } else {
      item.el.style.top = (curTop + dy) + 'px';
    }
  }
}

/* ============================================================
   §9. TEXT BOX
   ============================================================ */
export function applyTextStyles(el) {
  el.style.fontSize = (el.dataset.fontSize || '20') + 'px';
  el.style.fontFamily = el.dataset.fontFamily || 'system-ui';
  el.style.fontWeight = el.dataset.fontWeight || 'normal';
  el.style.fontStyle = el.dataset.fontStyle || 'normal';
  el.style.color = el.dataset.color || '#1e3a8a';
  el.style.textAlign = el.dataset.align || 'right';
  el.style.direction = el.dataset.dir || 'rtl';
}

export function addTextBox(spec, save, z) {
  const s = Object.assign({
    textId: uid(), text: '', x: '30%', y: '35%', w: '200px', h: 'auto',
    fontSize: 20, fontFamily: 'system-ui', fontWeight: 'normal', fontStyle: 'normal',
    color: '#1e3a8a', align: 'right', dir: 'rtl', isEquation: false,
  }, spec || {});

  const el = document.createElement('div');
  el.className = 'pdf-text-box' + (s.isEquation ? ' equation' : '');
  el.dataset.textId = s.textId;
  el.dataset.text = s.text || '';
  el.style.left = s.x;
  el.style.top = s.y;
  el.style.width = s.w;
  el.style.height = (s.h && s.h !== 'auto') ? s.h : 'auto';
  el.style.zIndex = String(
    z != null ? z : (s.z ? parseInt(s.z, 10) : getNextZIndex())
  );
  el.dataset.fontSize = String(s.fontSize);
  el.dataset.fontFamily = s.fontFamily;
  el.dataset.fontWeight = s.fontWeight;
  el.dataset.fontStyle = s.fontStyle;
  el.dataset.color = s.color;
  el.dataset.align = s.align;
  el.dataset.dir = s.dir;
  el.dataset.isEquation = (s.isEquation === true || s.isEquation === 'true') ? 'true' : 'false';

  const body = document.createElement('div');
  body.className = 'pdf-text-body';
  body.setAttribute('contenteditable', 'false');
  renderTextWithMath(body, s.text || '');
  el.appendChild(body);

  const resize = document.createElement('div');
  resize.className = 'pdf-text-resize';
  el.appendChild(resize);

  applyTextStyles(el);
  if (!s.text) el.classList.add('placeholder-empty');

  el.addEventListener('pointerdown', e => {
    if (state.tool === 'select') {
      if (e.target.classList.contains('pdf-text-resize')) return;
      e.preventDefault(); e.stopPropagation();
      const isAlreadySelected = (state.selectedList || []).some(it => it.el === el);
      if (e.shiftKey) {
        selectTextBox(el, true);
      } else if (!isAlreadySelected) {
        selectTextBox(el, false);
      }
      try { el.setPointerCapture(e.pointerId); } catch (_) {}
      startTextDrag(el, e, 'move');
    } else if (state.tool === 'text' || state.tool === 'equation') {
      e.stopPropagation();
    } else if (state.tool === 'hand') {
      e.stopPropagation();
    }
  });

  el.addEventListener('dblclick', e => {
    if (state.tool !== 'select' && state.tool !== 'text' && state.tool !== 'equation') return;
    e.stopPropagation(); e.preventDefault();
    if (el.dataset.isEquation === 'true') openEquationEditor(el);
    else startEditTextBox(el);
  });

  resize.addEventListener('pointerdown', e => {
    if (state.tool !== 'select') return;
    e.preventDefault(); e.stopPropagation();
    selectTextBox(el);
    try { resize.setPointerCapture(e.pointerId); } catch (_) {}
    startTextDrag(el, e, 'resize');
  });

  if (textLayer) textLayer.appendChild(el);
  if (save !== false) savePageNow();
  return el;
}

export function startTextDrag(el, e, mode) {
  const sr = stage.getBoundingClientRect();
  const er = el.getBoundingClientRect();
  const sX = e.clientX, sY = e.clientY;
  const sL = er.left - sr.left, sT = er.top - sr.top;
  const sW = er.width;
  const pre = snapshot();

  const isMulti = state.selectedList && state.selectedList.length > 1 && state.selectedList.some(it => it.el === el);
  const multiOrigs = isMulti ? state.selectedList.map(it => ({
    item: it,
    kind: it.kind,
    svgOrig: it.kind === 'svg' ? captureSvgGeom(it.el) : null,
    left: parseFloat(it.el.style.left) || 0,
    top: parseFloat(it.el.style.top) || 0,
    isLeftPct: String(it.el.style.left).includes('%'),
    isTopPct: String(it.el.style.top).includes('%'),
  })) : null;

  function onMove(ev) {
    const dx = ev.clientX - sX, dy = ev.clientY - sY;
    if (mode === 'move') {
      if (isMulti && multiOrigs) {
        const sx = (state.pdfW || 2000) / sr.width;
        const sy = (state.pdfH || 2828) / sr.height;
        const stageDx = dx * sx;
        const stageDy = dy * sy;
        multiOrigs.forEach(o => {
          if (o.kind === 'svg') {
            applySvgGeom(o.item.el, o.svgOrig, stageDx, stageDy);
          } else {
            if (o.isLeftPct) {
              o.item.el.style.left = (o.left + (stageDx / (state.pdfW || 2000) * 100)) + '%';
            } else {
              o.item.el.style.left = (o.left + stageDx) + 'px';
            }
            if (o.isTopPct) {
              o.item.el.style.top = (o.top + (stageDy / (state.pdfH || 2828) * 100)) + '%';
            } else {
              o.item.el.style.top = (o.top + stageDy) + 'px';
            }
          }
        });
      } else {
        const nl = sL + dx;
        const nt = sT + dy;
        el.style.left = (nl / sr.width * 100) + '%';
        el.style.top = (nt / sr.height * 100) + '%';
      }
    } else {
      const nw = Math.max(60, sW + dx);
      el.style.width = nw + 'px';
    }
    drawSelectionOverlay();
    document.dispatchEvent(new CustomEvent('ipb:elementTransformed'));
  }
  function onUp() {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
    commitChange(pre);
    drawSelectionOverlay();
    document.dispatchEvent(new CustomEvent('ipb:elementTransformed'));
  }
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
}

function startEditTextBox(el) {
  const body = el.querySelector('.pdf-text-body');
  el.classList.add('editing');
  el.classList.remove('placeholder-empty');
  body.setAttribute('contenteditable', 'true');
  body.textContent = el.dataset.text || '';
  body.focus();
  try {
    const range = document.createRange();
    range.selectNodeContents(body);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  } catch (_) {}

  const onBlur = () => {
    body.removeEventListener('blur', onBlur);
    finishEdit(el);
  };
  body.addEventListener('blur', onBlur);
  body.addEventListener('keydown', ev => {
    if (ev.key === 'Escape') { ev.preventDefault(); body.blur(); }
  });
}

function finishEdit(el) {
  const body = el.querySelector('.pdf-text-body');
  const raw = body.textContent || '';
  body.setAttribute('contenteditable', 'false');
  el.classList.remove('editing');
  el.dataset.text = raw;
  renderTextWithMath(body, raw);
  if (!raw) el.classList.add('placeholder-empty');
  savePageNow();
  updateFloatingToolbarPosition();
}

/* ============================================================
   §10. EQUATION EDITOR
   ============================================================ */
export function buildEquationPaletteInto(host) {
  host.innerHTML = '';
  EQUATION_TEMPLATES.forEach(cat => {
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
        if (window.katex) window.katex.render(item.latex, inner, {
          throwOnError: false, displayMode: false, output: 'html',
        });
        else inner.textContent = item.label;
      } catch (e) { inner.textContent = item.label; }
      btn.appendChild(inner);
      btn.title = item.latex;
      btn.addEventListener('click', () => {
        const ta = $('eqTextarea');
        const pos = ta.selectionStart || ta.value.length;
        const before = ta.value.substring(0, pos);
        const after = ta.value.substring(pos);
        ta.value = before + item.latex + after;
        const newPos = pos + item.latex.length;
        ta.focus();
        try { ta.setSelectionRange(newPos, newPos); } catch (_) {}
        updateEqPreview();
      });
      grid.appendChild(btn);
    });
    host.appendChild(grid);
  });
}

function updateEqPreview() {
  const eqTa = $('eqTextarea');
  const host = $('eqPreview');
  if (!eqTa || !host) return;
  const raw = eqTa.value.trim();
  host.innerHTML = '';
  if (!raw) return;
  if (typeof window.katex === 'undefined') { host.textContent = raw; return; }
  try { window.katex.render(raw, host, { throwOnError: false, displayMode: true, output: 'html' }); }
  catch (e) { host.textContent = raw; }
}

export function openEquationEditor(el) {
  _eqCurrentTarget = el || null;
  const raw = el ? (el.dataset.text || '').replace(/^\$|\$$/g, '') : '';
  const textarea = $('eqTextarea');
  if (textarea) {
    textarea.value = raw;
    updateEqPreview();
  }
  const palHost = $('eqPaletteHost');
  if (palHost) buildEquationPaletteInto(palHost);
  const backdrop = equationBackdropEl();
  if (backdrop) backdrop.classList.add('show');
  const ed = $('equationEditor');
  if (ed) ed.classList.add('show');
  if (textarea) setTimeout(() => { textarea.focus(); textarea.select(); }, 50);
}

export function closeEquationEditor() {
  const backdrop = equationBackdropEl();
  if (backdrop) backdrop.classList.remove('show');
  const ed = $('equationEditor');
  if (ed) ed.classList.remove('show');
  _eqCurrentTarget = null;
}

export function bindEquationEditor() {
  const ta = $('eqTextarea');
  if (ta) ta.addEventListener('input', updateEqPreview);
  const closeBtn = $('eqCloseBtn');
  if (closeBtn) closeBtn.addEventListener('click', () => { closeEquationEditor(); uiHooks.setTool('select'); });
  const cancelBtn = $('eqCancelBtn');
  if (cancelBtn) cancelBtn.addEventListener('click', () => { closeEquationEditor(); uiHooks.setTool('select'); });
  const insBtn = $('eqInsertBtn');
  if (insBtn) {
    insBtn.addEventListener('click', () => {
      const raw = $('eqTextarea').value.trim();
      if (!raw) { toast('المعادلة فارغة', 'warn'); return; }
      const wrapped = '$' + raw + '$';

      if (_eqCurrentTarget) {
        const pre = snapshot();
        _eqCurrentTarget.dataset.text = wrapped;
        _eqCurrentTarget.classList.remove('placeholder-empty');
        const body = _eqCurrentTarget.querySelector('.pdf-text-body');
        renderTextWithMath(body, wrapped);
        commitChange(pre);
        closeEquationEditor();
        toast('تم تحديث المعادلة', 'ok');
      } else {
        const pre = snapshot();
        const el = addTextBox({
          x: '30%', y: '35%', w: '240px', h: 'auto',
          fontSize: state.equationSize,
          fontFamily: 'KaTeX_Main, Cambria Math, serif',
          fontWeight: 'normal', fontStyle: 'normal',
          color: state.equationColor, align: 'left', dir: 'ltr',
          isEquation: true, text: wrapped,
        }, false);
        commitChange(pre);
        closeEquationEditor();
        uiHooks.setTool('select');
        selectTextBox(el);
      }
    });
  }
  const backdrop = equationBackdropEl();
  if (backdrop) {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        closeEquationEditor();
        uiHooks.setTool('select');
      }
    });
  }
}

/* ============================================================
   §11. FLOATING TOOLBARS (تم استبدالها بلوحة الخصائص بالكامل)
   ============================================================ */
function ensureDeleteBtn() {
  if (_floatingDeleteBtn) {
    try { _floatingDeleteBtn.remove(); } catch (_) {}
    _floatingDeleteBtn = null;
  }
  return null;
}

function showDeleteBtnFor(el) {
  // تم إلغاء الدائرة الحمراء نهائياً كما طلب المستخدم
  hideDeleteBtn();
}
function hideDeleteBtn() {
  if (_floatingDeleteBtn) {
    try { _floatingDeleteBtn.remove(); } catch (_) {}
    _floatingDeleteBtn = null;
  }
}

export function hideTextContextToolbar() {
  if (textContextToolbar) {
    textContextToolbar.classList.remove('show');
    textContextToolbar.innerHTML = '';
  }
}
export function hideShapeContextToolbar() {
  if (shapeContextToolbar) {
    shapeContextToolbar.classList.remove('show');
    shapeContextToolbar.innerHTML = '';
  }
}
export function hideFloatingToolbars() {
  hideTextContextToolbar();
  hideShapeContextToolbar();
  hideDeleteBtn();
}

export function updateFloatingToolbarPosition() {
  // لا توجد أشرطة عائمة فوق العناصر بعد الآن
  hideFloatingToolbars();
}

export function showFloatingToolbarForSelection() {
  // جميع الخصائص تم توجيهها للوحة الخصائص والتصميم في الشريط الجانبي
  hideFloatingToolbars();
}

/* ============================================================
   §12. TEXT CONTEXT TOOLBAR
   ============================================================ */
function showTextContextToolbar(el) {
  if (!textContextToolbar) return;
  const isEq = el.dataset.isEquation === 'true';
  const align = el.dataset.align || 'right';
  const dir = el.dataset.dir || 'rtl';
  const fontFam = el.dataset.fontFamily || 'system-ui';
  const fontSize = parseInt(el.dataset.fontSize || '20', 10);
  const isBold = el.dataset.fontWeight === 'bold';
  const isItalic = el.dataset.fontStyle === 'italic';
  const color = el.dataset.color || '#1e3a8a';
  const allFonts = [...new Set([...(window.__localFonts || []), ...getDefaultFonts()])];
  const fontOptions = allFonts.map(f =>
    `<option value="${escapeXml(f)}" ${f === fontFam ? 'selected' : ''}>${escapeXml(f)}</option>`
  ).join('');

  const fixedColors = ['#000000', '#e11d48', '#2563eb', '#22c55e'];
  let swatches = fixedColors.map(c =>
    `<button type="button" class="ctx-swatch ${c === color ? 'active' : ''}" data-act="color" data-val="${c}" title="${c}"><span class="ctx-swatch-inner" style="background:${c}"></span></button>`
  ).join('');

  const customSlots = state.customTextColors || [null, null];
  swatches += customSlots.map((c, i) => {
    if (c) {
      return `<button type="button" class="ctx-swatch ${c === color ? 'active' : ''}" data-act="color" data-val="${c}" title="${c}"><span class="ctx-swatch-inner" style="background:${c}"></span></button>`;
    }
    return `<label class="ctx-color-picker" title="لون مخصص"><input type="color" data-act="customColor" data-slot="${i}" value="${color || '#000000'}"></label>`;
  }).join('');

  textContextToolbar.innerHTML = `
    ${!isEq ? `
      <button type="button" class="ctx-btn ${align==='right'?'active':''}" data-act="align" data-val="right" title="يمين">⇥</button>
      <button type="button" class="ctx-btn ${align==='center'?'active':''}" data-act="align" data-val="center" title="وسط">↔</button>
      <button type="button" class="ctx-btn ${align==='left'?'active':''}" data-act="align" data-val="left" title="يسار">⇤</button>
      <button type="button" class="ctx-btn ${align==='justify'?'active':''}" data-act="align" data-val="justify" title="justify">≡</button>
      <div class="ctx-sep-v"></div>
      <button type="button" class="ctx-btn ${dir==='rtl'?'active':''}" data-act="dir" data-val="rtl" title="RTL">RTL</button>
      <button type="button" class="ctx-btn ${dir==='ltr'?'active':''}" data-act="dir" data-val="ltr" title="LTR">LTR</button>
      <div class="ctx-sep-v"></div>
      <select class="ctx-select" data-act="font" title="نوع الخط">${fontOptions}</select>
    ` : `
      <span style="font-size:11px;color:#8a94a6;padding:0 6px;font-weight:700">معادلة LTR</span>
      <div class="ctx-sep-v"></div>
    `}
    <button type="button" class="ctx-btn" data-act="sizeMinus" title="تصغير">−</button>
    <input type="number" class="ctx-num" data-act="sizeInput" value="${fontSize}" min="6" max="200">
    <button type="button" class="ctx-btn" data-act="sizePlus" title="تكبير">+</button>
    <div class="ctx-sep-v"></div>
    ${!isEq ? `
      <button type="button" class="ctx-btn ${isBold?'active':''}" data-act="bold" style="font-weight:900">B</button>
      <button type="button" class="ctx-btn ${isItalic?'active':''}" data-act="italic" style="font-style:italic">I</button>
      <div class="ctx-sep-v"></div>
    ` : ''}
    ${swatches}
    <div class="ctx-sep-v"></div>
    <button type="button" class="ctx-btn" data-act="copy" title="نسخ">📋</button>
    <button type="button" class="ctx-btn danger" data-act="delete" title="حذف">🗑️</button>
  `;
  textContextToolbar.classList.add('show');
  positionToolbar(textContextToolbar, el);
  showDeleteBtnFor(el);
  bindTextContextToolbarEvents(el);
}

function updateTextContextToolbarState(el) {
  if (!el || !el.parentNode || !textContextToolbar) return;
  const align = el.dataset.align || 'right';
  const dir = el.dataset.dir || 'rtl';
  const isBold = el.dataset.fontWeight === 'bold';
  const isItalic = el.dataset.fontStyle === 'italic';
  const color = el.dataset.color || '#1e3a8a';
  const fontSize = parseInt(el.dataset.fontSize || '20', 10);

  textContextToolbar.querySelectorAll('[data-act="align"]').forEach(b => b.classList.toggle('active', b.dataset.val === align));
  textContextToolbar.querySelectorAll('[data-act="dir"]').forEach(b => b.classList.toggle('active', b.dataset.val === dir));
  const boldBtn = textContextToolbar.querySelector('[data-act="bold"]');
  if (boldBtn) boldBtn.classList.toggle('active', isBold);
  const italicBtn = textContextToolbar.querySelector('[data-act="italic"]');
  if (italicBtn) italicBtn.classList.toggle('active', isItalic);
  const sizeInput = textContextToolbar.querySelector('[data-act="sizeInput"]');
  if (sizeInput && document.activeElement !== sizeInput) sizeInput.value = fontSize;
  textContextToolbar.querySelectorAll('[data-act="color"]').forEach(b => b.classList.toggle('active', b.dataset.val === color));
}

function applyTextChange(el, key, value) {
  const pre = snapshot();
  el.dataset[key] = value;
  applyTextStyles(el);
  savePageNow();
  commitChange(pre);
  updateFloatingToolbarPosition();
}

function bindTextContextToolbarEvents(el) {
  if (!textContextToolbar) return;
  textContextToolbar.querySelectorAll('[data-act]').forEach(ctrl => {
    const act = ctrl.dataset.act;

    if (act === 'sizeInput') {
      ctrl.addEventListener('change', () => {
        let v = parseInt(ctrl.value, 10);
        if (isNaN(v)) v = 20;
        v = Math.max(6, Math.min(200, v));
        ctrl.value = v;
        applyTextChange(el, 'fontSize', String(v));
      });
      ctrl.addEventListener('pointerdown', e => e.stopPropagation());
      return;
    }
    if (act === 'font') {
      ctrl.addEventListener('change', () => applyTextChange(el, 'fontFamily', ctrl.value));
      ctrl.addEventListener('pointerdown', e => e.stopPropagation());
      return;
    }
    if (act === 'customColor') {
      ctrl.addEventListener('input', () => {
        const c = ctrl.value;
        const slot = parseInt(ctrl.dataset.slot, 10);
        if (!state.customTextColors) state.customTextColors = [null, null];
        state.customTextColors[slot] = c;
        applyTextChange(el, 'color', c);
        showTextContextToolbar(el);
      });
      ctrl.addEventListener('pointerdown', e => e.stopPropagation());
      ctrl.addEventListener('click', e => e.stopPropagation());
      return;
    }
    if (act === 'delete') {
      ctrl.addEventListener('click', e => {
        e.stopPropagation();
        const pre = snapshot();
        el.remove();
        state.selected = null;
        hideFloatingToolbars();
        commitChange(pre);
      });
      return;
    }
    if (act === 'copy') {
      ctrl.addEventListener('click', e => {
        e.stopPropagation();
        copyElement(el);
      });
      return;
    }
    ctrl.addEventListener('click', e => {
      e.stopPropagation();
      if (act === 'color') { applyTextChange(el, 'color', ctrl.dataset.val); updateTextContextToolbarState(el); }
      else if (act === 'align') { applyTextChange(el, 'align', ctrl.dataset.val); updateTextContextToolbarState(el); }
      else if (act === 'dir') { applyTextChange(el, 'dir', ctrl.dataset.val); updateTextContextToolbarState(el); }
      else if (act === 'sizeMinus') {
        const cur = parseInt(el.dataset.fontSize || '20', 10);
        applyTextChange(el, 'fontSize', String(Math.max(6, cur - 2)));
        updateTextContextToolbarState(el);
      } else if (act === 'sizePlus') {
        const cur = parseInt(el.dataset.fontSize || '20', 10);
        applyTextChange(el, 'fontSize', String(Math.min(200, cur + 2)));
        updateTextContextToolbarState(el);
      } else if (act === 'bold') {
        applyTextChange(el, 'fontWeight', el.dataset.fontWeight === 'bold' ? 'normal' : 'bold');
        updateTextContextToolbarState(el);
      } else if (act === 'italic') {
        applyTextChange(el, 'fontStyle', el.dataset.fontStyle === 'italic' ? 'normal' : 'italic');
        updateTextContextToolbarState(el);
      }
    });
  });
}

function getDefaultFonts() {
  return ['system-ui', 'Arial', 'Tahoma', 'Times New Roman', 'Courier New',
          'Georgia', 'Verdana', 'Cairo', 'Tajawal', 'Amiri',
          'Noto Kufi Arabic', 'Scheherazade New'];
}

/* ============================================================
   §13. SHAPE CONTEXT TOOLBAR
   ============================================================ */
function showShapeContextToolbar(el) {
  if (!shapeContextToolbar) return;
  const tag = el.tagName;
  const stroke = el.getAttribute('stroke') || '#000';
  const fill = el.getAttribute('fill') || 'none';
  const sw = parseFloat(el.getAttribute('stroke-width') || '3');
  const hasFill = fill !== 'none' && fill !== 'transparent';
  const isLine = tag === 'line';

  const curMarkerStart = el.getAttribute('marker-start') || '';
  const curMarkerEnd = el.getAttribute('marker-end') || '';
  const curCap = el.getAttribute('stroke-linecap') || 'round';

  const startV = (() => {
    if (!curMarkerStart) return 'none';
    if (curMarkerStart.includes('arrow-start-normal')) return 'arrow';
    if (curMarkerStart.includes('arrow-start-hollow')) return 'arrow-hollow';
    return 'none';
  })();
  const endV = (() => {
    if (!curMarkerEnd) return 'none';
    if (curMarkerEnd.includes('arrow-end-normal')) return 'arrow';
    if (curMarkerEnd.includes('arrow-end-hollow')) return 'arrow-hollow';
    if (curMarkerEnd.includes('circle-end')) return 'circle';
    if (curMarkerEnd.includes('square-end')) return 'square';
    return 'none';
  })();

  const strokeSwatches = ['#000000','#e11d48','#2563eb','#22c55e','#eab308','#dc2626'].map(c =>
    `<button type="button" class="ctx-swatch ${c===stroke?'active':''}" data-act="strokeColor" data-val="${c}" title="${c}"><span class="ctx-swatch-inner" style="background:${c}"></span></button>`
  ).join('');
  const fillSwatches = ['#ffffff','#000000','#4a7eff','#e11d48','#22c55e','#eab308'].map(c =>
    `<button type="button" class="ctx-swatch ${c===fill?'active':''}" data-act="fillColor" data-val="${c}" title="${c}"><span class="ctx-swatch-inner" style="background:${c}"></span></button>`
  ).join('');

  let html = '';
  html += `<span style="font-size:10px;color:#8a94a6;padding:0 4px;font-weight:700">الحدود</span>`;
  html += strokeSwatches;
  html += `<label class="ctx-color-picker" title="لون الحدود"><input type="color" data-act="customStroke" value="${stroke}"></label>`;
  html += `<div class="ctx-sep-v"></div>`;

  if (!isLine) {
    html += `<span style="font-size:10px;color:#8a94a6;padding:0 4px;font-weight:700">التعبئة</span>`;
    html += `<button type="button" class="ctx-swatch ${!hasFill?'active':''}" data-act="fillNone" title="بدون تعبئة"><span class="ctx-swatch-inner" style="background-image:linear-gradient(45deg,#666 25%,transparent 25%),linear-gradient(-45deg,#666 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#666 75%),linear-gradient(-45deg,transparent 75%,#666 75%);background-size:6px 6px;background-color:#fff"></span></button>`;
    html += fillSwatches;
    html += `<label class="ctx-color-picker" title="لون التعبئة"><input type="color" data-act="customFill" value="${hasFill?fill:'#ffffff'}"></label>`;
    html += `<div class="ctx-sep-v"></div>`;
  }

  html += `<span style="font-size:10px;color:#8a94a6;padding:0 4px;font-weight:700">السماكة</span>`;
  html += `<button type="button" class="ctx-btn" data-act="swMinus">−</button>`;
  html += `<input type="number" class="ctx-num" data-act="swInput" value="${sw}" min="1" max="30" step="0.5">`;
  html += `<button type="button" class="ctx-btn" data-act="swPlus">+</button>`;

  if (isLine) {
    html += `<div class="ctx-sep-v"></div>`;
    html += `<span style="font-size:10px;color:#8a94a6;padding:0 4px;font-weight:700">البداية</span>`;
    html += `<select class="ctx-select" data-act="markerStart" style="max-width:90px">
      <option value="none" ${startV==='none'?'selected':''}>بدون</option>
      <option value="arrow" ${startV==='arrow'?'selected':''}>◄ سهم</option>
      <option value="arrow-hollow" ${startV==='arrow-hollow'?'selected':''}>◁ سهم مفرغ</option>
    </select>`;
    html += `<span style="font-size:10px;color:#8a94a6;padding:0 4px;font-weight:700">النهاية</span>`;
    html += `<select class="ctx-select" data-act="markerEnd" style="max-width:90px">
      <option value="none" ${endV==='none'?'selected':''}>بدون</option>
      <option value="arrow" ${endV==='arrow'?'selected':''}>► سهم</option>
      <option value="arrow-hollow" ${endV==='arrow-hollow'?'selected':''}>▷ سهم مفرغ</option>
      <option value="circle" ${endV==='circle'?'selected':''}>● دائرة</option>
      <option value="square" ${endV==='square'?'selected':''}>■ مربع</option>
    </select>`;
    html += `<span style="font-size:10px;color:#8a94a6;padding:0 4px;font-weight:700">شكل الطرف</span>`;
    html += `<select class="ctx-select" data-act="lineCap" style="max-width:90px">
      <option value="round" ${curCap==='round'?'selected':''}>دائري</option>
      <option value="square" ${curCap==='square'?'selected':''}>مربع</option>
      <option value="butt" ${curCap==='butt'?'selected':''}>مسطح</option>
    </select>`;
  }

  html += `<div class="ctx-sep-v"></div>`;
  html += `<button type="button" class="ctx-btn" data-act="copy" title="نسخ (Ctrl+C)">📋</button>`;
  html += `<button type="button" class="ctx-btn" data-act="rotL" title="تدوير 90° لليسار">↶</button>`;
  html += `<button type="button" class="ctx-btn" data-act="rotR" title="تدوير 90° لليمين">↷</button>`;
  html += `<button type="button" class="ctx-btn" data-act="flipH" title="عكس أفقي">↔</button>`;
  html += `<button type="button" class="ctx-btn" data-act="flipV" title="عكس رأسي">↕</button>`;
  html += `<div class="ctx-sep-v"></div>`;
  html += `<button type="button" class="ctx-btn danger" data-act="delete" title="حذف">🗑️</button>`;

  shapeContextToolbar.innerHTML = html;
  shapeContextToolbar.classList.add('show');
  positionToolbar(shapeContextToolbar, el);
  showDeleteBtnFor(el);
  bindShapeContextToolbarEvents(el);
}

function applyShapeChange(el, key, val) {
  const pre = snapshot();
  if (key === 'stroke') el.setAttribute('stroke', val);
  else if (key === 'fill') el.setAttribute('fill', val);
  else if (key === 'strokeWidth') el.setAttribute('stroke-width', val);
  else if (key === 'lineCap') el.setAttribute('stroke-linecap', val);
  else if (key === 'markerStart') {
    if (val === 'none') el.removeAttribute('marker-start');
    else el.setAttribute('marker-start', `url(#arrow-start-${val === 'arrow-hollow' ? 'hollow' : 'normal'})`);
  } else if (key === 'markerEnd') {
    if (val === 'none') el.removeAttribute('marker-end');
    else if (val === 'circle') el.setAttribute('marker-end', 'url(#circle-end)');
    else if (val === 'square') el.setAttribute('marker-end', 'url(#square-end)');
    else el.setAttribute('marker-end', `url(#arrow-end-${val === 'arrow-hollow' ? 'hollow' : 'normal'})`);
  }
  savePageNow();
  commitChange(pre);
}

function bindShapeContextToolbarEvents(el) {
  if (!shapeContextToolbar) return;
  shapeContextToolbar.querySelectorAll('[data-act]').forEach(ctrl => {
    const act = ctrl.dataset.act;
    if (act === 'customStroke') {
      ctrl.addEventListener('input', () => { applyShapeChange(el, 'stroke', ctrl.value); showShapeContextToolbar(el); });
      return;
    }
    if (act === 'customFill') {
      ctrl.addEventListener('input', () => { applyShapeChange(el, 'fill', ctrl.value); showShapeContextToolbar(el); });
      return;
    }
    if (act === 'swInput') {
      ctrl.addEventListener('change', () => {
        let v = parseFloat(ctrl.value);
        if (isNaN(v)) v = 3;
        v = Math.max(.5, Math.min(30, v));
        ctrl.value = v;
        applyShapeChange(el, 'strokeWidth', String(v));
      });
      return;
    }
    if (act === 'markerStart') { ctrl.addEventListener('change', () => applyShapeChange(el, 'markerStart', ctrl.value)); return; }
    if (act === 'markerEnd')   { ctrl.addEventListener('change', () => applyShapeChange(el, 'markerEnd', ctrl.value)); return; }
    if (act === 'lineCap')     { ctrl.addEventListener('change', () => applyShapeChange(el, 'lineCap', ctrl.value)); return; }

    ctrl.addEventListener('click', () => {
      if (act === 'copy') {
        copyElement(el);
        return;
      }
      if (act === 'rotL') {
        const pre = snapshot();
        rotateElement(el, -90);
        commitChange(pre);
        drawSelectionOverlay();
        document.dispatchEvent(new CustomEvent('ipb:elementTransformed'));
        return;
      }
      if (act === 'rotR') {
        const pre = snapshot();
        rotateElement(el, 90);
        commitChange(pre);
        drawSelectionOverlay();
        document.dispatchEvent(new CustomEvent('ipb:elementTransformed'));
        return;
      }
      if (act === 'flipH') {
        const pre = snapshot();
        flipElementHorizontal(el);
        commitChange(pre);
        drawSelectionOverlay();
        document.dispatchEvent(new CustomEvent('ipb:elementTransformed'));
        return;
      }
      if (act === 'flipV') {
        const pre = snapshot();
        flipElementVertical(el);
        commitChange(pre);
        drawSelectionOverlay();
        document.dispatchEvent(new CustomEvent('ipb:elementTransformed'));
        return;
      }
      if (act === 'delete') {
        const pre = snapshot();
        const wrap = el.closest('.annot-wrapper');
        (wrap || el).remove();
        state.selected = null;
        hideFloatingToolbars();
        commitChange(pre);
        return;
      }
      if (act === 'strokeColor') applyShapeChange(el, 'stroke', ctrl.dataset.val);
      else if (act === 'fillColor') applyShapeChange(el, 'fill', ctrl.dataset.val);
      else if (act === 'fillNone') applyShapeChange(el, 'fill', 'none');
      else if (act === 'swMinus') {
        const cur = parseFloat(el.getAttribute('stroke-width') || '3');
        applyShapeChange(el, 'strokeWidth', String(Math.max(.5, cur - 1)));
      } else if (act === 'swPlus') {
        const cur = parseFloat(el.getAttribute('stroke-width') || '3');
        applyShapeChange(el, 'strokeWidth', String(Math.min(30, cur + 1)));
      }
      showShapeContextToolbar(el);
    });
  });
}

/* ============================================================
   §14. ELEMENT HOOKS (for elements.js)
   ============================================================ */
export function startEmbedDrag(el, e, mode) {
  const sr = stage.getBoundingClientRect();
  const er = el.getBoundingClientRect();
  const sX = e.clientX, sY = e.clientY;
  const sL = er.left - sr.left, sT = er.top - sr.top;
  const sW = er.width, sH = er.height;
  const pre = snapshot();

  const isMulti = state.selectedList && state.selectedList.length > 1 && state.selectedList.some(it => it.el === el);
  const multiOrigs = isMulti ? state.selectedList.map(it => ({
    item: it,
    kind: it.kind,
    svgOrig: it.kind === 'svg' ? captureSvgGeom(it.el) : null,
    left: parseFloat(it.el.style.left) || 0,
    top: parseFloat(it.el.style.top) || 0,
    isLeftPct: String(it.el.style.left).includes('%'),
    isTopPct: String(it.el.style.top).includes('%'),
  })) : null;

  function onMove(ev) {
    const dx = ev.clientX - sX, dy = ev.clientY - sY;
    if (mode === 'move') {
      if (isMulti && multiOrigs) {
        const sx = (state.pdfW || 2000) / sr.width;
        const sy = (state.pdfH || 2828) / sr.height;
        const stageDx = dx * sx;
        const stageDy = dy * sy;
        multiOrigs.forEach(o => {
          if (o.kind === 'svg') {
            applySvgGeom(o.item.el, o.svgOrig, stageDx, stageDy);
          } else {
            if (o.isLeftPct) {
              o.item.el.style.left = (o.left + (stageDx / (state.pdfW || 2000) * 100)) + '%';
            } else {
              o.item.el.style.left = (o.left + stageDx) + 'px';
            }
            if (o.isTopPct) {
              o.item.el.style.top = (o.top + (stageDy / (state.pdfH || 2828) * 100)) + '%';
            } else {
              o.item.el.style.top = (o.top + stageDy) + 'px';
            }
          }
        });
      } else {
        const nl = sL + dx;
        const nt = sT + dy;
        el.style.left = (nl / sr.width * 100) + '%';
        el.style.top = (nt / sr.height * 100) + '%';
      }
    } else {
      const nw = Math.max(80, sW + dx);
      const nh = Math.max(60, sH + dy);
      el.style.width = (nw / sr.width * 100) + '%';
      el.style.height = (nh / sr.height * 100) + '%';
    }
    drawSelectionOverlay();
    document.dispatchEvent(new CustomEvent('ipb:elementTransformed'));
  }
  function onUp() {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
    commitChange(pre);
    drawSelectionOverlay();
    document.dispatchEvent(new CustomEvent('ipb:elementTransformed'));
  }
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
}

export function startMediaDrag(el, e, mode) {
  const sr = stage.getBoundingClientRect();
  const er = el.getBoundingClientRect();
  const sX = e.clientX, sY = e.clientY;
  const sL = er.left - sr.left, sT = er.top - sr.top;
  const sW = er.width, sH = er.height;
  const pre = snapshot();

  const isMulti = state.selectedList && state.selectedList.length > 1 && state.selectedList.some(it => it.el === el);
  const multiOrigs = isMulti ? state.selectedList.map(it => ({
    item: it,
    kind: it.kind,
    svgOrig: it.kind === 'svg' ? captureSvgGeom(it.el) : null,
    left: parseFloat(it.el.style.left) || 0,
    top: parseFloat(it.el.style.top) || 0,
    isLeftPct: String(it.el.style.left).includes('%'),
    isTopPct: String(it.el.style.top).includes('%'),
  })) : null;

  function onMove(ev) {
    const dx = ev.clientX - sX, dy = ev.clientY - sY;
    if (mode === 'move') {
      if (isMulti && multiOrigs) {
        const sx = (state.pdfW || 2000) / sr.width;
        const sy = (state.pdfH || 2828) / sr.height;
        const stageDx = dx * sx;
        const stageDy = dy * sy;
        multiOrigs.forEach(o => {
          if (o.kind === 'svg') {
            applySvgGeom(o.item.el, o.svgOrig, stageDx, stageDy);
          } else {
            if (o.isLeftPct) {
              o.item.el.style.left = (o.left + (stageDx / (state.pdfW || 2000) * 100)) + '%';
            } else {
              o.item.el.style.left = (o.left + stageDx) + 'px';
            }
            if (o.isTopPct) {
              o.item.el.style.top = (o.top + (stageDy / (state.pdfH || 2828) * 100)) + '%';
            } else {
              o.item.el.style.top = (o.top + stageDy) + 'px';
            }
          }
        });
      } else {
        const nl = sL + dx;
        const nt = sT + dy;
        el.style.left = (nl / sr.width * 100) + '%';
        el.style.top = (nt / sr.height * 100) + '%';
      }
    } else {
      const nw = Math.max(80, sW + dx);
      const nh = Math.max(60, sH + dy);
      el.style.width = (nw / sr.width * 100) + '%';
      el.style.height = (nh / sr.height * 100) + '%';
    }
    drawSelectionOverlay();
    document.dispatchEvent(new CustomEvent('ipb:elementTransformed'));
  }
  function onUp() {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
    commitChange(pre);
    drawSelectionOverlay();
    document.dispatchEvent(new CustomEvent('ipb:elementTransformed'));
  }
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
}

export function startButtonDrag(el, e, mode) {
  const sr = stage.getBoundingClientRect();
  const er = el.getBoundingClientRect();
  const sX = e.clientX, sY = e.clientY;
  const sL = er.left - sr.left, sT = er.top - sr.top;
  const sW = er.width, sH = er.height;
  const pre = snapshot();
  let moved = false;

  const isMulti = state.selectedList && state.selectedList.length > 1 && state.selectedList.some(it => it.el === el);
  const multiOrigs = isMulti ? state.selectedList.map(it => ({
    item: it,
    kind: it.kind,
    svgOrig: it.kind === 'svg' ? captureSvgGeom(it.el) : null,
    left: parseFloat(it.el.style.left) || 0,
    top: parseFloat(it.el.style.top) || 0,
    isLeftPct: String(it.el.style.left).includes('%'),
    isTopPct: String(it.el.style.top).includes('%'),
  })) : null;

  function onMove(ev) {
    const dx = ev.clientX - sX, dy = ev.clientY - sY;
    if (!moved && Math.hypot(dx, dy) > 3) moved = true;
    if (mode === 'move') {
      if (isMulti && multiOrigs) {
        const sx = (state.pdfW || 2000) / sr.width;
        const sy = (state.pdfH || 2828) / sr.height;
        const stageDx = dx * sx;
        const stageDy = dy * sy;
        multiOrigs.forEach(o => {
          if (o.kind === 'svg') {
            applySvgGeom(o.item.el, o.svgOrig, stageDx, stageDy);
          } else {
            if (o.isLeftPct) {
              o.item.el.style.left = (o.left + (stageDx / (state.pdfW || 2000) * 100)) + '%';
            } else {
              o.item.el.style.left = (o.left + stageDx) + 'px';
            }
            if (o.isTopPct) {
              o.item.el.style.top = (o.top + (stageDy / (state.pdfH || 2828) * 100)) + '%';
            } else {
              o.item.el.style.top = (o.top + stageDy) + 'px';
            }
          }
        });
      } else {
        const nl = sL + dx;
        const nt = sT + dy;
        el.style.left = (nl / sr.width * 100) + '%';
        el.style.top = (nt / sr.height * 100) + '%';
      }
    } else {
      const nw = Math.max(40, sW + dx);
      const nh = Math.max(24, sH + dy);
      el.style.width = nw + 'px';
      el.style.height = nh + 'px';
    }
    drawSelectionOverlay();
    document.dispatchEvent(new CustomEvent('ipb:elementTransformed'));
  }
  function onUp() {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
    if (moved) commitChange(pre);
    drawSelectionOverlay();
    document.dispatchEvent(new CustomEvent('ipb:elementTransformed'));
  }
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
}

export function installElementHooks() {
  const proto = Element.prototype;
  proto.__selectEmbed = selectEmbed;
  proto.__startEmbedDrag = startEmbedDrag;
  proto.__selectMedia = selectMedia;
  proto.__startMediaDrag = startMediaDrag;
  proto.__selectButton = selectButton;
  proto.__startButtonDrag = startButtonDrag;
}

/* ============================================================
   §15. SNAPSHOT APPLICATION
   ============================================================ */
function applyZOrder(order) {
  const all = getAllZElements();
  const byId = new Map();
  all.forEach(it => {
    const id = it.el.dataset.annotId
      || it.el.dataset.id
      || it.el.dataset.textId
      || it.el.dataset.btnId
      || it.el.dataset.mediaId;
    if (id) byId.set(id, it);
  });

  const ordered = [];
  order.forEach(id => {
    const it = byId.get(id);
    if (it) {
      ordered.push(it);
      byId.delete(id);
    }
  });
  byId.forEach(it => ordered.push(it));

  assignZIndexesInOrder(ordered);
}

export function applySnapshotImpl(s) {
  deselect();
  if (svgLayer) {
    while (svgLayer.firstChild) svgLayer.removeChild(svgLayer.firstChild);
  }

  if (embedLayer) embedLayer.innerHTML = '';
  if (videoLayer) videoLayer.innerHTML = '';
  if (textLayer) textLayer.innerHTML = '';
  if (interactiveLayer) interactiveLayer.innerHTML = '';

  (s.annotations || []).forEach(spec => {
    try {
      const el = deserializeSvgElement(spec);
      const wrap = createAnnotWrapper(el);
      if (svgLayer) svgLayer.appendChild(wrap);
    } catch (e) {}
  });

  (s.embeds || []).forEach(spec =>
    addEmbedElement(spec.url, spec.x, spec.y, spec.w, spec.h, false,
      spec.z ? parseInt(spec.z, 10) : undefined));

  const mediaList = s.media || s.videos || [];
  mediaList.forEach(spec =>
    addMediaElement(
      spec.mediaId, spec.url, spec.title, spec.mediaType || 'video',
      spec.x, spec.y, spec.w, spec.h, false,
      spec.z ? parseInt(spec.z, 10) : undefined
    ));

  (s.texts || []).forEach(spec => addTextBox(spec, false));

  (s.buttons || []).forEach(spec =>
    addButtonElement(spec, false,
      spec.z ? parseInt(spec.z, 10) : undefined));

  if (s.zOrder && Array.isArray(s.zOrder) && s.zOrder.length) {
    applyZOrder(s.zOrder);
  } else {
    const all = getAllZElements();
    assignZIndexesInOrder(all);
  }
}

/* ============================================================
   §16. LOAD PAGE STATE
   ============================================================ */
export function loadPageState(pageNum) {
  deselect();
  clearLaser();
  clearTransient();
  if (svgLayer) {
    while (svgLayer.firstChild) svgLayer.removeChild(svgLayer.firstChild);
  }
  if (embedLayer) embedLayer.innerHTML = '';
  if (videoLayer) videoLayer.innerHTML = '';
  if (textLayer) textLayer.innerHTML = '';
  if (interactiveLayer) interactiveLayer.innerHTML = '';
  const s = state.pages[pageNum];
  if (s) applySnapshotImpl(s);
}

export function updateUndoButtonsSafe() {
  import('./core.js').then(m => m.updateUndoButtons());
}

/* ============================================================
   §17. CLIPBOARD
   ============================================================ */
export function updatePasteBtnState() {
  const pb = $('btnPaste');
  if (pb) pb.disabled = !clipboard.element;
}

function offsetPct(p, delta) {
  const n = parseFloat(p);
  if (isNaN(n)) return p;
  return (n + delta) + '%';
}

export function applyElementTransform(el, options = {}) {
  if (!el) return;
  const target = el.dataset && el.dataset.annot ? el : ((el.querySelector && el.querySelector('[data-annot]')) || el);

  let curRot = options.rotation !== undefined ? options.rotation : (parseFloat(target.dataset.rotation) || 0);
  let curFlipH = options.flipH !== undefined ? options.flipH : (target.dataset.flipH === 'true');
  let curFlipV = options.flipV !== undefined ? options.flipV : (target.dataset.flipV === 'true');

  curRot = ((Math.round(curRot) % 360) + 360) % 360;

  target.dataset.rotation = String(curRot);
  target.dataset.flipH = String(curFlipH);
  target.dataset.flipV = String(curFlipV);

  const scaleX = curFlipH ? -1 : 1;
  const scaleY = curFlipV ? -1 : 1;

  let tf = '';
  if (curRot !== 0) tf += `rotate(${curRot}deg) `;
  if (curFlipH || curFlipV) tf += `scale(${scaleX}, ${scaleY}) `;

  if (target.dataset && target.dataset.annot) {
    target.style.transformBox = 'fill-box';
    target.style.transformOrigin = 'center center';
    target.style.transform = tf.trim();
  } else {
    target.style.transformOrigin = 'center center';
    target.style.transform = tf.trim();
  }
}

export function rotateElement(el, deltaDeg) {
  if (!el) return;
  const target = el.dataset && el.dataset.annot ? el : ((el.querySelector && el.querySelector('[data-annot]')) || el);
  const cur = parseFloat(target.dataset.rotation) || 0;
  applyElementTransform(target, { rotation: cur + deltaDeg });
}

export function setElementRotation(el, deg) {
  if (!el) return;
  const target = el.dataset && el.dataset.annot ? el : ((el.querySelector && el.querySelector('[data-annot]')) || el);
  applyElementTransform(target, { rotation: deg });
}

export function flipElementHorizontal(el) {
  if (!el) return;
  const target = el.dataset && el.dataset.annot ? el : ((el.querySelector && el.querySelector('[data-annot]')) || el);
  const cur = target.dataset.flipH === 'true';
  applyElementTransform(target, { flipH: !cur });
}

export function flipElementVertical(el) {
  if (!el) return;
  const target = el.dataset && el.dataset.annot ? el : ((el.querySelector && el.querySelector('[data-annot]')) || el);
  const cur = target.dataset.flipV === 'true';
  applyElementTransform(target, { flipV: !cur });
}

export function resetElementTransform(el) {
  if (!el) return;
  const target = el.dataset && el.dataset.annot ? el : ((el.querySelector && el.querySelector('[data-annot]')) || el);
  applyElementTransform(target, { rotation: 0, flipH: false, flipV: false });
}

export function copyElement(el) {
  if (!el) return;
  let data;
  if (el.classList.contains('pdf-text-box')) data = serializeText(el);
  else if (el.classList.contains('pdf-interactive-btn')) data = serializeButton(el);
  else if (el.classList.contains('media-obj')) data = serializeMedia(el);
  else if (el.classList.contains('embed')) data = serializeEmbed(el);
  else {
    const annot = el.dataset && el.dataset.annot ? el : ((el.querySelector && el.querySelector('[data-annot]')) || el.closest('[data-annot]'));
    if (annot) data = serializeSvgElement(annot);
  }
  if (!data) return;
  clipboard.element = { data };
  updatePasteBtnState();
  toast('تم نسخ العنصر 📋', 'ok');
}

export function pasteElement() {
  if (!clipboard.element) { toast('لا يوجد شيء في الحافظة للصق', 'warn'); return; }
  const data = clipboard.element.data;
  const pre = snapshot();
  let newEl = null;

  if (data.kind === 'text') {
    newEl = addTextBox({ ...data, textId: uid(), x: offsetPct(data.x, 3), y: offsetPct(data.y, 3), z: undefined }, false);
  } else if (data.kind === 'svg') {
    const inner = deserializeSvgElement({ ...data, dataId: uid() });
    if (data.tag === 'line') {
      inner.setAttribute('x1', +inner.getAttribute('x1') + 30);
      inner.setAttribute('y1', +inner.getAttribute('y1') + 30);
      inner.setAttribute('x2', +inner.getAttribute('x2') + 30);
      inner.setAttribute('y2', +inner.getAttribute('y2') + 30);
    } else if (data.tag === 'rect') {
      inner.setAttribute('x', +inner.getAttribute('x') + 30);
      inner.setAttribute('y', +inner.getAttribute('y') + 30);
    } else if (data.tag === 'ellipse') {
      inner.setAttribute('cx', +inner.getAttribute('cx') + 30);
      inner.setAttribute('cy', +inner.getAttribute('cy') + 30);
    } else {
      const curT = inner.getAttribute('transform') || '';
      inner.setAttribute('transform', (curT ? curT + ' ' : '') + 'translate(30, 30)');
    }
    if (data.dataset && (data.dataset.rotation || data.dataset.flipH || data.dataset.flipV)) {
      applyElementTransform(inner, {
        rotation: parseFloat(data.dataset.rotation) || 0,
        flipH: data.dataset.flipH === 'true',
        flipV: data.dataset.flipV === 'true',
      });
    }
    const wrap = createAnnotWrapper(inner);
    if (svgLayer) svgLayer.appendChild(wrap);
    newEl = inner;
  } else if (data.kind === 'button') {
    newEl = addButtonElement({ ...data, btnId: uid(), x: offsetPct(data.x, 3), y: offsetPct(data.y, 3), z: undefined }, false);
  } else if (data.kind === 'media') {
    newEl = addMediaElement(uid(), data.url, data.title, data.mediaType, offsetPct(data.x, 3), offsetPct(data.y, 3), data.w, data.h, false);
  } else if (data.kind === 'embed') {
    newEl = addEmbedElement(data.url, offsetPct(data.x, 3), offsetPct(data.y, 3), data.w, data.h, false);
  }
  commitChange(pre);

  if (newEl) {
    if (data.kind === 'text') selectTextBox(newEl);
    else if (data.kind === 'svg') selectAnnotation(newEl);
    else if (data.kind === 'button') selectButton(newEl);
    else if (data.kind === 'media') selectMedia(newEl);
    else if (data.kind === 'embed') selectEmbed(newEl);
  }
  toast('تم لصق العنصر 📄', 'ok');
}

/* ============================================================
   §18. POINTER EVENTS
   ============================================================ */
function getStagePoint(e) {
  const r = stage.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width) * state.pdfW,
    y: ((e.clientY - r.top) / r.height) * state.pdfH,
  };
}

function getPinchCenter() {
  const pts = Array.from(stagePointers.values());
  if (pts.length < 2) return null;
  return { x: (pts[0].x + pts[1].x)/2, y: (pts[0].y + pts[1].y)/2 };
}
function getPinchDistance() {
  const pts = Array.from(stagePointers.values());
  if (pts.length < 2) return 0;
  return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
}
function startPinch() {
  const c = getPinchCenter(), d = getPinchDistance();
  if (!c || d < 5) return;
  pinchState = {
    initialScale: state.view.scale,
    initialTx: state.view.tx, initialTy: state.view.ty,
    initialDist: d,
    initialCenterX: c.x, initialCenterY: c.y,
  };
}
function updatePinch() {
  if (!pinchState) return;
  const c = getPinchCenter(), d = getPinchDistance();
  if (!c || d < 5) return;
  const s0 = pinchState.initialScale;
  const newScale = Math.min(5, Math.max(.5, s0 * (d / pinchState.initialDist)));
  const R0 = state.stageRect0;
  const ux = (pinchState.initialCenterX - R0.left - pinchState.initialTx) / s0;
  const uy = (pinchState.initialCenterY - R0.top - pinchState.initialTy) / s0;
  state.view.scale = newScale;
  state.view.tx = c.x - R0.left - ux * newScale;
  state.view.ty = c.y - R0.top - uy * newScale;
  import('./pdf.js').then(m => m.applyView());
}
function endPinch() { pinchState = null; }

function cancelInteraction() {
  if (interaction) {
    if (interaction.type === 'stroke') {
      interaction = null;
      clearTransient();
      if (strokeRAF) { cancelAnimationFrame(strokeRAF); strokeRAF = null; }
    } else interaction = null;
  }
  handDrag = null;
  if (stage) stage.classList.remove('dragging');
}

export function initPointerEvents() {
  if (!stage) return;
  stage.addEventListener('pointerdown', e => {
    if (!state.pdfW) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    const isDrawingTool = (
      state.tool === 'pen' ||
      state.tool === 'highlighter' ||
      state.tool === 'eraser' ||
      state.tool === 'laser' ||
      state.tool === 'shape'
    );

    if (!isDrawingTool && e.target.closest) {
      if (
        e.target.closest('.embed') ||
        e.target.closest('.media-obj') ||
        e.target.closest('.pdf-interactive-btn') ||
        e.target.closest('.pdf-text-box')
      ) {
        return;
      }
    }

    stagePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (state.tool === 'hand' && stagePointers.size === 2) {
      cancelInteraction();
      startPinch();
      try { stage.setPointerCapture(e.pointerId); } catch (_) {}
      e.preventDefault();
      return;
    }
    if (stagePointers.size > 1) return;

    try { stage.setPointerCapture(e.pointerId); } catch (_) {}
    const p = getStagePoint(e), tool = state.tool;

    if (tool === 'hand') {
      if (state.view.scale > 1.02) {
        interaction = {
          type: 'pan',
          startX: e.clientX, startY: e.clientY,
          startTx: state.view.tx, startTy: state.view.ty,
        };
      } else {
        stage.classList.add('dragging');
        handDrag = { startX: e.clientX, dx: 0 };
        interaction = { type: 'hand' };
      }
      e.preventDefault();
      return;
    }

    if (tool === 'select') {
      const handle = e.target.closest && e.target.closest('#selectionSvg .handle');
      if (handle && (state.selected || (state.selectedList && state.selectedList.length > 0))) {
        const selItem = (state.selectedList && state.selectedList.length > 0) ? state.selectedList[0] : state.selected;
        const handleName = handle.dataset.handle;
        if (handleName === 'rot') {
          const b = getUniversalShapeBounds(selItem.el) || getElementBBoxInStage(selItem.el) || { x: p.x, y: p.y, width: 0, height: 0 };
          const cx = b.x + b.width / 2;
          const cy = b.y + b.height / 2;
          const targetInner = selItem.kind === 'svg' ? (selItem.el.querySelector('[data-annot]') || selItem.el) : selItem.el;
          const curRot = parseFloat(targetInner.dataset.rotation) || 0;
          interaction = {
            type: 'rotate',
            el: targetInner,
            center: { x: cx, y: cy },
            initialRot: curRot,
            startAngle: Math.atan2(p.y - cy, p.x - cx) * 180 / Math.PI,
            pre: snapshot(),
          };
          try { stage.setPointerCapture(e.pointerId); } catch (_) {}
          e.preventDefault();
          return;
        }
        if (selItem.kind === 'svg') {
          interaction = {
            type: 'resizeSvg', el: selItem.el,
            handle: handleName, start: p,
            orig: captureSvgGeom(selItem.el),
            pre: snapshot(),
          };
          try { stage.setPointerCapture(e.pointerId); } catch (_) {}
          e.preventDefault();
          return;
        }
      }
      const annot = e.target.closest && e.target.closest('#svgLayer [data-annot]');
      if (annot && !annot.classList.contains('handle')) {
        const isAlreadySelected = (state.selectedList || []).some(it => it.el === annot);
        if (e.shiftKey) {
          selectAnnotation(annot, true);
        } else if (!isAlreadySelected) {
          selectAnnotation(annot, false);
        }

        const selectedItems = (state.selectedList && state.selectedList.length > 0)
          ? state.selectedList
          : [{ kind: 'svg', el: annot }];

        interaction = {
          type: 'moveMulti',
          start: p,
          origs: selectedItems.map(it => ({
            item: it,
            kind: it.kind,
            svgOrig: it.kind === 'svg' ? captureSvgGeom(it.el) : null,
            left: parseFloat(it.el.style.left) || 0,
            top: parseFloat(it.el.style.top) || 0,
            isLeftPct: String(it.el.style.left).includes('%'),
            isTopPct: String(it.el.style.top).includes('%'),
          })),
          pre: snapshot(),
        };
        try { stage.setPointerCapture(e.pointerId); } catch (_) {}
        e.preventDefault();
        return;
      }

      if (!e.shiftKey) deselect();
      interaction = {
        type: 'marquee',
        start: p,
        startClient: { x: e.clientX, y: e.clientY },
        additive: e.shiftKey,
        preSelected: e.shiftKey ? [...(state.selectedList || [])] : [],
      };
      try { stage.setPointerCapture(e.pointerId); } catch (_) {}
      e.preventDefault();
      return;
    }

    if (tool === 'pen') { startStroke('pen', p); e.preventDefault(); return; }
    if (tool === 'highlighter') { startStroke('highlighter', p); e.preventDefault(); return; }
    if (tool === 'eraser') { startStroke('eraser', p); e.preventDefault(); return; }
    if (tool === 'laser') { laserStart(p); interaction = { type: 'laser' }; e.preventDefault(); return; }

    if (tool === 'text') {
      const pre = snapshot();
      const rect = stage.getBoundingClientRect();
      const xPct = ((e.clientX - rect.left) / rect.width) * 100;
      const yPct = ((e.clientY - rect.top) / rect.height) * 100;
      const el = addTextBox({
        x: xPct + '%', y: yPct + '%', w: '220px', h: 'auto',
        fontSize: state.textSize, fontFamily: state.textFamily,
        fontWeight: state.textBold ? 'bold' : 'normal',
        fontStyle: state.textItalic ? 'italic' : 'normal',
        color: state.textColor, align: state.textAlign, dir: state.textDir,
        isEquation: false,
      }, false);
      commitChange(pre);
      setTimeout(() => { startEditTextBox(el); }, 30);
      e.preventDefault();
      return;
    }

    if (tool === 'equation') {
      openEquationEditor(null);
      e.preventDefault();
      return;
    }

    if (tool === 'shape') {
      const pre = snapshot();
      const el = createShapeElement(state.shapeKind, state, p);
      const wrap = createAnnotWrapper(el);
      if (svgLayer) svgLayer.appendChild(wrap);
      interaction = { type: 'shapeDraw', kind: state.shapeKind, start: p, el, wrap, pre };
      e.preventDefault();
      return;
    }
  });

  stage.addEventListener('pointermove', e => {
    if (stagePointers.has(e.pointerId)) stagePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinchState && stagePointers.size >= 2) { updatePinch(); e.preventDefault(); return; }
    if (!interaction) return;

    if (interaction.type === 'stroke') { appendStrokePoints(e); return; }
    const p = getStagePoint(e);

    if (interaction.type === 'pan') {
      state.view.tx = interaction.startTx + (e.clientX - interaction.startX);
      state.view.ty = interaction.startTy + (e.clientY - interaction.startY);
      import('./pdf.js').then(m => m.applyView());
      return;
    }
    if (interaction.type === 'hand' && handDrag && stageContent) {
      handDrag.dx = e.clientX - handDrag.startX;
      stageContent.style.transition = 'none';
      stageContent.style.transform = `translateX(${handDrag.dx}px)`;
      return;
    }
    if (interaction.type === 'laser') { laserAdd(p); return; }
    if (interaction.type === 'shapeDraw') {
      updateShapeDuringDraw(interaction.kind, interaction.el, interaction.start, p, state);
      return;
    }
    if (interaction.type === 'marquee') {
      const s = interaction.start;
      const rx = Math.min(s.x, p.x), ry = Math.min(s.y, p.y);
      const rw = Math.max(1, Math.abs(p.x - s.x)), rh = Math.max(1, Math.abs(p.y - s.y));

      let mRect = selectionSvg ? selectionSvg.querySelector('.marquee-box') : null;
      if (!mRect && selectionSvg) {
        mRect = document.createElementNS(SVG_NS, 'rect');
        mRect.setAttribute('class', 'marquee-box');
        selectionSvg.appendChild(mRect);
      }
      if (mRect) {
        mRect.setAttribute('x', rx);
        mRect.setAttribute('y', ry);
        mRect.setAttribute('width', rw);
        mRect.setAttribute('height', rh);
      }

      const marqueeBox = { x: rx, y: ry, width: rw, height: rh };
      const allSelectable = getAllSelectableElements();
      const newlyHit = [];

      allSelectable.forEach(item => {
        const b = getElementBBoxInStage(item.el);
        if (b && rectsIntersect(b, marqueeBox)) {
          newlyHit.push(item);
        }
      });

      const combined = [...interaction.preSelected];
      newlyHit.forEach(item => {
        if (!combined.some(it => it.el === item.el)) {
          combined.push(item);
        }
      });

      allSelectable.forEach(it => {
        const isSel = combined.some(c => c.el === it.el);
        it.el.classList.toggle('selected', isSel);
      });

      state.selectedList = combined;
      state.selected = combined.length > 0 ? combined[0] : null;
      drawSelectionOverlay();
      return;
    }
    if (interaction.type === 'moveMulti' || interaction.type === 'moveSvg') {
      const dx = p.x - interaction.start.x;
      const dy = p.y - interaction.start.y;
      if (interaction.origs) {
        interaction.origs.forEach(o => {
          if (o.kind === 'svg') {
            applySvgGeom(o.item.el, o.svgOrig, dx, dy);
          } else {
            if (o.isLeftPct) {
              o.item.el.style.left = (o.left + (dx / (state.pdfW || 2000) * 100)) + '%';
            } else {
              o.item.el.style.left = (o.left + dx) + 'px';
            }
            if (o.isTopPct) {
              o.item.el.style.top = (o.top + (dy / (state.pdfH || 2828) * 100)) + '%';
            } else {
              o.item.el.style.top = (o.top + dy) + 'px';
            }
          }
        });
      } else if (interaction.orig) {
        applySvgGeom(interaction.el, interaction.orig, dx, dy);
      }
      drawSelectionOverlay();
      document.dispatchEvent(new CustomEvent('ipb:elementTransformed'));
      return;
    }
    if (interaction.type === 'resizeSvg') {
      resizeSvg(interaction.el, interaction.handle, interaction.start, interaction.orig, p);
      drawSelectionOverlay(interaction.el);
      document.dispatchEvent(new CustomEvent('ipb:elementTransformed', { detail: { el: interaction.el } }));
      return;
    }
  });

  stage.addEventListener('pointerup', e => {
    stagePointers.delete(e.pointerId);
    if (pinchState && stagePointers.size < 2) {
      endPinch();
      try { stage.releasePointerCapture(e.pointerId); } catch (_) {}
      return;
    }
    if (!interaction) return;
    const inter = interaction;
    try { stage.releasePointerCapture(e.pointerId); } catch (_) {}

    if (inter.type === 'stroke') { endStroke(); return; }
    if (inter.type === 'marquee') {
      const mRect = selectionSvg ? selectionSvg.querySelector('.marquee-box') : null;
      if (mRect) mRect.remove();
      interaction = null;
      if (!state.selectedList || state.selectedList.length === 0) {
        deselect();
      } else {
        drawSelectionOverlay();
        document.dispatchEvent(new CustomEvent('ipb:selectionChanged', {
          detail: { selected: state.selected, list: state.selectedList }
        }));
      }
      return;
    }
    if (inter.type === 'moveMulti' || inter.type === 'moveSvg') {
      commitChange(inter.pre);
      drawSelectionOverlay();
      interaction = null;
      document.dispatchEvent(new CustomEvent('ipb:elementTransformed'));
      return;
    }
    interaction = null;
    if (inter.type === 'pan') return;

    if (inter.type === 'hand' && handDrag) {
      stage.classList.remove('dragging');
      const dx = handDrag.dx, w = stage.clientWidth, thr = w * 0.15;
      handDrag = null;
      let tp = null;
      if (dx < -thr && state.currentPage < state.totalPages) tp = state.currentPage + 1;
      else if (dx > thr && state.currentPage > 1) tp = state.currentPage - 1;

      if (tp !== null && stageContent) {
        stageContent.style.transition = 'none';
        stageContent.style.transform = '';
        void stageContent.offsetWidth;
        import('./pdf.js').then(m => m.goToPage(tp));
      } else if (stageContent) {
        stageContent.style.transition = 'transform .2s ease-out';
        stageContent.style.transform = 'translateX(0)';
        setTimeout(() => { stageContent.style.transition = ''; stageContent.style.transform = ''; }, 220);
      }
      return;
    }
    if (inter.type === 'laser') { laserEnd(); return; }
    if (inter.type === 'shapeDraw') {
      const el = inter.el, kind = inter.kind;
      const b = getUniversalShapeBounds(el);
      let tooSmall = false;
      if (b && (b.width < 10 && b.height < 10)) tooSmall = true;
      if (tooSmall) {
        (inter.wrap || el).remove();
      } else {
        el.dataset.annot = '1';
        el.dataset.id = uid();
        el.dataset.type = kind;
        if (inter.wrap) {
          inter.wrap.dataset.annotId = el.dataset.id;
        }
        commitChange(inter.pre);
        selectAnnotation(el);
      }
      return;
    }
    if (inter.type === 'moveSvg' || inter.type === 'resizeSvg') {
      commitChange(inter.pre);
      document.dispatchEvent(new CustomEvent('ipb:elementTransformed'));
    }
  });

  stage.addEventListener('pointercancel', e => {
    stagePointers.delete(e.pointerId);
    if (pinchState && stagePointers.size < 2) endPinch();
    if (interaction && interaction.type === 'stroke') {
      interaction = null;
      clearTransient();
      if (strokeRAF) { cancelAnimationFrame(strokeRAF); strokeRAF = null; }
    }
  });

  // ضمان استمرار وإتمام السحب خارج الكانفاس بدون أي فقدان أو تجمد
  window.addEventListener('pointerup', e => {
    if (!interaction) return;
    if (interaction.type === 'moveMulti' || interaction.type === 'moveSvg' || interaction.type === 'resizeSvg' || interaction.type === 'marquee') {
      const upEvt = new PointerEvent('pointerup', e);
      stage.dispatchEvent(upEvt);
    }
  });

  [textContextToolbar, shapeContextToolbar].forEach(tb => {
    if (tb) tb.addEventListener('pointerdown', e => e.stopPropagation());
  });
}

/* ============================================================
   §19. REGISTER SETUP
   ============================================================ */
export function registerApplySnapshot() {
  import('./core.js').then(m => m.setApplySnapshot(applySnapshotImpl));
}

/* ============================================================
   §20. KEYBOARD
   ============================================================ */
export async function undoAction() {
  const core = await import('./core.js');
  core.undo();
  updateFloatingToolbarPosition();
}
export async function redoAction() {
  const core = await import('./core.js');
  core.redo();
  updateFloatingToolbarPosition();
}
