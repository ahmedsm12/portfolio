/**
 * ============================================================
 * shapes.js — محرك الأشكال الهندسية والدارات والمستوى الديكارتي
 * ============================================================
 */

import { SVG_NS, uid } from './core.js';

export const SHAPE_CATEGORIES = [
  { id: 'basic', label: '🔷 هندسية' },
  { id: 'lines', label: '〰️ خطوط ومنحنيات' },
  { id: 'circuits', label: '⚡ دارات كهربائية' },
  { id: 'math', label: '📈 مستوى ديكارتي' },
];

export const SHAPE_DEFS = {
  'rect': { id: 'rect', cat: 'basic', label: 'مستطيل', icon: '▭' },
  'rounded-rect': { id: 'rounded-rect', cat: 'basic', label: 'مستطيل مدور', icon: '▢' },
  'circle': { id: 'circle', cat: 'basic', label: 'دائرة / بيضاوي', icon: '◯' },
  'triangle': { id: 'triangle', cat: 'basic', label: 'مثلث متساوي الساقين', icon: '△' },
  'right-triangle': { id: 'right-triangle', cat: 'basic', label: 'مثلث قائم الزاوية', icon: '⊿' },
  'cylinder': { id: 'cylinder', cat: 'basic', label: 'أسطوانة', icon: '🛢️' },
  'diamond': { id: 'diamond', cat: 'basic', label: 'معين', icon: '◇' },
  'star': { id: 'star', cat: 'basic', label: 'نجمة', icon: '★' },
  'hexagon': { id: 'hexagon', cat: 'basic', label: 'شكل سداسي', icon: '⬡' },
  'block-arrow': { id: 'block-arrow', cat: 'basic', label: 'سهم عريض', icon: '➔' },

  'line': { id: 'line', cat: 'lines', label: 'خط مستقيم', icon: '╱' },
  'arrow': { id: 'arrow', cat: 'lines', label: 'سهم أحادي', icon: '↗' },
  'double-arrow': { id: 'double-arrow', cat: 'lines', label: 'سهم ثنائي', icon: '⬄' },
  'curve': { id: 'curve', cat: 'lines', label: 'منحنى قابل للتعديل', icon: '〰️' },

  'circuit-battery': { id: 'circuit-battery', cat: 'circuits', label: 'بطارية DC', icon: '🔋' },
  'circuit-resistor': { id: 'circuit-resistor', cat: 'circuits', label: 'مقاومة كهربائية', icon: '⚡' },
  'circuit-switch': { id: 'circuit-switch', cat: 'circuits', label: 'مفتاح مفتوح', icon: '⏻' },
  'circuit-switch-closed': { id: 'circuit-switch-closed', cat: 'circuits', label: 'مفتاح مغلق', icon: '━' },
  'circuit-lamp': { id: 'circuit-lamp', cat: 'circuits', label: 'مصباح كهربائي', icon: '💡' },
  'circuit-capacitor': { id: 'circuit-capacitor', cat: 'circuits', label: 'مكثف كهربائي', icon: '⫽' },
  'circuit-inductor': { id: 'circuit-inductor', cat: 'circuits', label: 'ملف / محث', icon: '∿' },
  'circuit-ground': { id: 'circuit-ground', cat: 'circuits', label: 'تأريض (أرضي)', icon: '⏚' },
  'circuit-ammeter': { id: 'circuit-ammeter', cat: 'circuits', label: 'أمبيرمتر Ⓐ', icon: 'Ⓐ' },
  'circuit-voltmeter': { id: 'circuit-voltmeter', cat: 'circuits', label: 'فولتميتر Ⓥ', icon: 'Ⓥ' },
  'circuit-ac': { id: 'circuit-ac', cat: 'circuits', label: 'مصدر AC متناوب', icon: '〜' },
  'circuit-wire': { id: 'circuit-wire', cat: 'circuits', label: 'سلك زاوية قائمة', icon: '⌐' },

  'cartesian': { id: 'cartesian', cat: 'math', label: 'مستوى ديكارتي', icon: '📈' },
};

/* ============================================================
   §1. CREATE SHAPE
   ============================================================ */
export function createShapeElement(kind, state, p) {
  const stroke = state.shapeStroke || '#000000';
  const strokeWidth = state.shapeSize || 3;
  const fill = state.shapeFillNone ? 'none' : (state.shapeFill || '#ffffff');
  const lineCap = state.shapeLineCap || 'round';

  let el;

  if (kind === 'rect' || kind === 'rounded-rect') {
    el = document.createElementNS(SVG_NS, 'rect');
    el.setAttribute('x', p.x);
    el.setAttribute('y', p.y);
    el.setAttribute('width', '0');
    el.setAttribute('height', '0');
    const r = (kind === 'rounded-rect') ? 24 : (state.shapeCornerRadius || 0);
    el.setAttribute('rx', r);
    el.setAttribute('ry', r);
    el.setAttribute('stroke', stroke);
    el.setAttribute('stroke-width', strokeWidth);
    el.setAttribute('fill', fill);
  } else if (kind === 'circle') {
    el = document.createElementNS(SVG_NS, 'ellipse');
    el.setAttribute('cx', p.x);
    el.setAttribute('cy', p.y);
    el.setAttribute('rx', '0');
    el.setAttribute('ry', '0');
    el.setAttribute('stroke', stroke);
    el.setAttribute('stroke-width', strokeWidth);
    el.setAttribute('fill', fill);
  } else if (kind === 'line' || kind === 'arrow' || kind === 'double-arrow') {
    el = document.createElementNS(SVG_NS, 'line');
    el.setAttribute('x1', p.x);
    el.setAttribute('y1', p.y);
    el.setAttribute('x2', p.x);
    el.setAttribute('y2', p.y);
    el.setAttribute('stroke', stroke);
    el.setAttribute('stroke-width', strokeWidth);
    el.setAttribute('stroke-linecap', lineCap);
    el.setAttribute('fill', 'none');

    if (kind === 'arrow') {
      el.setAttribute('marker-end', 'url(#arrow-end-normal)');
    } else if (kind === 'double-arrow') {
      el.setAttribute('marker-start', 'url(#arrow-start-normal)');
      el.setAttribute('marker-end', 'url(#arrow-end-normal)');
    } else if (state.shapeLineStart && state.shapeLineStart !== 'none') {
      el.setAttribute('marker-start', `url(#arrow-start-${state.shapeLineStart === 'arrow-hollow' ? 'hollow' : 'normal'})`);
    }
  } else if (kind === 'triangle' || kind === 'right-triangle' || kind === 'diamond' || kind === 'star' || kind === 'hexagon') {
    el = document.createElementNS(SVG_NS, 'polygon');
    el.setAttribute('points', `${p.x},${p.y} ${p.x},${p.y} ${p.x},${p.y}`);
    el.setAttribute('stroke', stroke);
    el.setAttribute('stroke-width', strokeWidth);
    el.setAttribute('fill', fill);
    el.setAttribute('stroke-linejoin', 'round');
    el.dataset.origX = p.x;
    el.dataset.origY = p.y;
  } else if (kind === 'curve') {
    el = document.createElementNS(SVG_NS, 'path');
    el.setAttribute('d', `M ${p.x} ${p.y} Q ${p.x} ${p.y} ${p.x} ${p.y}`);
    el.setAttribute('stroke', stroke);
    el.setAttribute('stroke-width', strokeWidth);
    el.setAttribute('stroke-linecap', lineCap);
    el.setAttribute('fill', 'none');
    el.dataset.x0 = p.x; el.dataset.y0 = p.y;
    el.dataset.cx = p.x; el.dataset.cy = p.y;
    el.dataset.x1 = p.x; el.dataset.y1 = p.y;
    if (state.shapeLineEnd === 'arrow') el.setAttribute('marker-end', 'url(#arrow-end-normal)');
  } else if (kind === 'cylinder') {
    el = document.createElementNS(SVG_NS, 'g');
    el.setAttribute('stroke', stroke);
    el.setAttribute('stroke-width', strokeWidth);
    el.setAttribute('fill', fill);
    el.dataset.x = p.x;
    el.dataset.y = p.y;
    el.dataset.w = '0';
    el.dataset.h = '0';
    el.dataset.capH = '24';
  } else if (kind === 'block-arrow') {
    el = document.createElementNS(SVG_NS, 'path');
    el.setAttribute('stroke', stroke);
    el.setAttribute('stroke-width', strokeWidth);
    el.setAttribute('fill', fill);
    el.setAttribute('stroke-linejoin', 'round');
    el.dataset.x = p.x; el.dataset.y = p.y;
  } else if (kind.startsWith('circuit-')) {
    el = document.createElementNS(SVG_NS, 'g');
    el.setAttribute('stroke', stroke);
    el.setAttribute('stroke-width', strokeWidth);
    el.setAttribute('fill', fill);
    el.dataset.x = p.x; el.dataset.y = p.y;
    el.dataset.w = '0'; el.dataset.h = '0';
  } else if (kind === 'cartesian') {
    el = document.createElementNS(SVG_NS, 'g');
    el.setAttribute('stroke', stroke);
    el.setAttribute('stroke-width', strokeWidth);
    el.dataset.x = p.x; el.dataset.y = p.y;
    el.dataset.w = '0'; el.dataset.h = '0';
    el.dataset.range = '5';
    el.dataset.showGrid = 'true';
    el.dataset.showNumbers = 'true';
    el.dataset.lang = 'ar';
  } else {
    el = document.createElementNS(SVG_NS, 'rect');
    el.setAttribute('x', p.x); el.setAttribute('y', p.y);
    el.setAttribute('width', '0'); el.setAttribute('height', '0');
    el.setAttribute('stroke', stroke);
    el.setAttribute('stroke-width', strokeWidth);
    el.setAttribute('fill', fill);
  }

  el.dataset.annot = '1';
  el.dataset.id = uid();
  el.dataset.type = kind;
  el.classList.add('annot');
  return el;
}

/* ============================================================
   §2. UPDATE DURING DRAW
   ============================================================ */
export function updateShapeDuringDraw(kind, el, s, p, state) {
  const x = Math.min(s.x, p.x);
  const y = Math.min(s.y, p.y);
  const w = Math.abs(p.x - s.x);
  const h = Math.abs(p.y - s.y);

  if (kind === 'rect' || kind === 'rounded-rect') {
    el.setAttribute('x', x);
    el.setAttribute('y', y);
    el.setAttribute('width', Math.max(1, w));
    el.setAttribute('height', Math.max(1, h));
  } else if (kind === 'circle') {
    el.setAttribute('cx', (s.x + p.x) / 2);
    el.setAttribute('cy', (s.y + p.y) / 2);
    el.setAttribute('rx', Math.max(1, w / 2));
    el.setAttribute('ry', Math.max(1, h / 2));
  } else if (kind === 'line' || kind === 'arrow' || kind === 'double-arrow') {
    el.setAttribute('x2', p.x);
    el.setAttribute('y2', p.y);
  } else if (kind === 'curve') {
    const x0 = s.x, y0 = s.y;
    const x1 = p.x, y1 = p.y;
    const mx = (x0 + x1) / 2;
    const my = (y0 + y1) / 2;
    const dx = x1 - x0, dy = y1 - y0;
    const dist = Math.hypot(dx, dy);
    const nx = -dy / (dist || 1) * (dist * 0.25);
    const ny = dx / (dist || 1) * (dist * 0.25);
    const cx = mx + nx;
    const cy = my + ny;

    el.setAttribute('d', `M ${x0} ${y0} Q ${cx} ${cy} ${x1} ${y1}`);
    el.dataset.x0 = x0; el.dataset.y0 = y0;
    el.dataset.cx = cx; el.dataset.cy = cy;
    el.dataset.x1 = x1; el.dataset.y1 = y1;
  } else if (kind === 'triangle') {
    const topX = x + w / 2, topY = y;
    const brX = x + w, brY = y + h;
    const blX = x, blY = y + h;
    el.setAttribute('points', `${topX},${topY} ${brX},${brY} ${blX},${blY}`);
  } else if (kind === 'right-triangle') {
    const tlX = x, tlY = y;
    const blX = x, blY = y + h;
    const brX = x + w, brY = y + h;
    el.setAttribute('points', `${tlX},${tlY} ${blX},${blY} ${brX},${brY}`);
  } else if (kind === 'diamond') {
    const tX = x + w / 2, tY = y;
    const rX = x + w, rY = y + h / 2;
    const bX = x + w / 2, bY = y + h;
    const lX = x, lY = y + h / 2;
    el.setAttribute('points', `${tX},${tY} ${rX},${rY} ${bX},${bY} ${lX},${lY}`);
  } else if (kind === 'star') {
    const pts = calculateStarPoints(x + w / 2, y + h / 2, Math.max(2, w / 2), Math.max(1, h / 2), 5);
    el.setAttribute('points', pts.map(pt => `${pt.x},${pt.y}`).join(' '));
  } else if (kind === 'hexagon') {
    const pts = calculatePolygonPoints(x + w / 2, y + h / 2, Math.max(2, w / 2), Math.max(1, h / 2), 6);
    el.setAttribute('points', pts.map(pt => `${pt.x},${pt.y}`).join(' '));
  } else if (kind === 'block-arrow') {
    const d = calculateBlockArrowPath(x, y, Math.max(5, w), Math.max(5, h));
    el.setAttribute('d', d);
  } else if (kind === 'cylinder') {
    renderCylinder(el, x, y, Math.max(10, w), Math.max(10, h));
  } else if (kind.startsWith('circuit-')) {
    renderCircuitComponent(el, kind, x, y, Math.max(20, w), Math.max(15, h));
  } else if (kind === 'cartesian') {
    renderCartesianPlane(el, x, y, Math.max(40, w), Math.max(40, h));
  }
}

function calculateStarPoints(cx, cy, rx, ry, points = 5) {
  const pts = [];
  const innerRatio = 0.42;
  const step = Math.PI / points;
  let angle = -Math.PI / 2;
  for (let i = 0; i < points * 2; i++) {
    const rX = (i % 2 === 0) ? rx : rx * innerRatio;
    const rY = (i % 2 === 0) ? ry : ry * innerRatio;
    pts.push({
      x: cx + rX * Math.cos(angle),
      y: cy + rY * Math.sin(angle),
    });
    angle += step;
  }
  return pts;
}

function calculatePolygonPoints(cx, cy, rx, ry, sides = 6) {
  const pts = [];
  const step = (Math.PI * 2) / sides;
  let angle = -Math.PI / 2;
  for (let i = 0; i < sides; i++) {
    pts.push({
      x: cx + rx * Math.cos(angle),
      y: cy + ry * Math.sin(angle),
    });
    angle += step;
  }
  return pts;
}

export function calculateBlockArrowPath(x, y, w, h) {
  const shaftH = h * 0.4;
  const shaftY = y + (h - shaftH) / 2;
  const headW = w * 0.4;
  const shaftW = w - headW;

  return `M ${x} ${shaftY}
    H ${x + shaftW}
    V ${y}
    L ${x + w} ${y + h / 2}
    L ${x + shaftW} ${y + h}
    V ${shaftY + shaftH}
    H ${x}
    Z`;
}

/* ============================================================
   §3. CYLINDER
   ============================================================ */
export function renderCylinder(group, x, y, w, h, customCapRatio) {
  const stroke = group.getAttribute('stroke') || '#000000';
  const strokeWidth = group.getAttribute('stroke-width') || '3';
  const fill = group.getAttribute('fill') || 'none';

  group.dataset.x = x;
  group.dataset.y = y;
  group.dataset.w = w;
  group.dataset.h = h;

  const capH = Math.max(6, Math.min(h * 0.4, (customCapRatio != null ? customCapRatio * h : h * 0.22)));
  group.dataset.capH = capH;

  const ry = capH / 2;
  const rx = w / 2;
  const cx = x + rx;
  const topCy = y + ry;
  const botCy = y + h - ry;

  group.innerHTML = `
    <path class="cylinder-body"
          d="M ${x} ${topCy}
             L ${x} ${botCy}
             A ${rx} ${ry} 0 0 0 ${x + w} ${botCy}
             L ${x + w} ${topCy}
             Z"
          fill="${fill}"
          stroke="${stroke}"
          stroke-width="${strokeWidth}"
          stroke-linejoin="round" />
    <path class="cylinder-bottom-curve"
          d="M ${x} ${botCy} A ${rx} ${ry} 0 0 0 ${x + w} ${botCy}"
          fill="none"
          stroke="${stroke}"
          stroke-width="${strokeWidth}" />
    <ellipse class="cylinder-top-cap"
             cx="${cx}"
             cy="${topCy}"
             rx="${rx}"
             ry="${ry}"
             fill="${fill === 'none' ? '#ffffff' : fill}"
             stroke="${stroke}"
             stroke-width="${strokeWidth}" />
  `;
}

/* ============================================================
   §4. CIRCUITS
   ============================================================ */
export function renderCircuitComponent(group, kind, x, y, w, h) {
  const stroke = group.getAttribute('stroke') || '#000000';
  const strokeWidth = group.getAttribute('stroke-width') || '3';
  const fill = group.getAttribute('fill') || 'none';

  group.dataset.x = x; group.dataset.y = y;
  group.dataset.w = w; group.dataset.h = h;
  group.dataset.type = kind;

  const cy = y + h / 2;
  const cx = x + w / 2;

  let inner = '';

  if (kind === 'circuit-battery') {
    const leadW = w * 0.35;
    const plateGap = w * 0.08;
    const p1x = x + leadW;
    const p2x = p1x + plateGap;
    const longH = h * 0.8;
    const shortH = h * 0.44;

    inner = `
      <line x1="${x}" y1="${cy}" x2="${p1x}" y2="${cy}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round"/>
      <line x1="${p1x}" y1="${cy - longH / 2}" x2="${p1x}" y2="${cy + longH / 2}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round"/>
      <line x1="${p2x}" y1="${cy - shortH / 2}" x2="${p2x}" y2="${cy + shortH / 2}" stroke="${stroke}" stroke-width="${Math.max(4, strokeWidth * 2)}" stroke-linecap="round"/>
      <line x1="${p2x}" y1="${cy}" x2="${x + w}" y2="${cy}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round"/>
      <text x="${p1x - 8}" y="${cy - longH / 2 - 2}" font-size="12" font-weight="bold" fill="${stroke}" text-anchor="middle">+</text>
      <text x="${p2x + 8}" y="${cy - shortH / 2 - 2}" font-size="12" font-weight="bold" fill="${stroke}" text-anchor="middle">−</text>
    `;
  } else if (kind === 'circuit-resistor') {
    const leadW = w * 0.2;
    const bodyW = w - leadW * 2;
    const bodyStartX = x + leadW;
    const segW = bodyW / 6;
    const peak = h * 0.38;

    let pathD = `M ${x} ${cy} L ${bodyStartX} ${cy}`;
    for (let i = 0; i < 6; i++) {
      const segX = bodyStartX + (i + 0.5) * segW;
      const segY = (i % 2 === 0) ? cy - peak : cy + peak;
      pathD += ` L ${segX} ${segY}`;
    }
    pathD += ` L ${bodyStartX + bodyW} ${cy} L ${x + w} ${cy}`;

    inner = `
      <path d="${pathD}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linejoin="round" stroke-linecap="round"/>
    `;
  } else if (kind === 'circuit-switch') {
    const leadW = w * 0.25;
    const termR = 4;
    const t1x = x + leadW;
    const t2x = x + w - leadW;

    inner = `
      <line x1="${x}" y1="${cy}" x2="${t1x - termR}" y2="${cy}" stroke="${stroke}" stroke-width="${strokeWidth}"/>
      <circle cx="${t1x}" cy="${cy}" r="${termR}" fill="#fff" stroke="${stroke}" stroke-width="${strokeWidth}"/>
      <line x1="${t1x + termR}" y1="${cy}" x2="${t2x - 4}" y2="${cy - h * 0.45}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round"/>
      <circle cx="${t2x}" cy="${cy}" r="${termR}" fill="#fff" stroke="${stroke}" stroke-width="${strokeWidth}"/>
      <line x1="${t2x + termR}" y1="${cy}" x2="${x + w}" y2="${cy}" stroke="${stroke}" stroke-width="${strokeWidth}"/>
    `;
  } else if (kind === 'circuit-switch-closed') {
    const leadW = w * 0.25;
    const termR = 4;
    const t1x = x + leadW;
    const t2x = x + w - leadW;

    inner = `
      <line x1="${x}" y1="${cy}" x2="${t1x - termR}" y2="${cy}" stroke="${stroke}" stroke-width="${strokeWidth}"/>
      <circle cx="${t1x}" cy="${cy}" r="${termR}" fill="${stroke}" stroke="${stroke}" stroke-width="${strokeWidth}"/>
      <line x1="${t1x}" y1="${cy}" x2="${t2x}" y2="${cy}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round"/>
      <circle cx="${t2x}" cy="${cy}" r="${termR}" fill="${stroke}" stroke="${stroke}" stroke-width="${strokeWidth}"/>
      <line x1="${t2x + termR}" y1="${cy}" x2="${x + w}" y2="${cy}" stroke="${stroke}" stroke-width="${strokeWidth}"/>
    `;
  } else if (kind === 'circuit-lamp') {
    const r = Math.min(w * 0.3, h * 0.45);
    const diag = r * 0.707;

    inner = `
      <line x1="${x}" y1="${cy}" x2="${cx - r}" y2="${cy}" stroke="${stroke}" stroke-width="${strokeWidth}"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill === 'none' ? '#ffffff' : fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>
      <line x1="${cx - diag}" y1="${cy - diag}" x2="${cx + diag}" y2="${cy + diag}" stroke="${stroke}" stroke-width="${strokeWidth}"/>
      <line x1="${cx - diag}" y1="${cy + diag}" x2="${cx + diag}" y2="${cy - diag}" stroke="${stroke}" stroke-width="${strokeWidth}"/>
      <line x1="${cx + r}" y1="${cy}" x2="${x + w}" y2="${cy}" stroke="${stroke}" stroke-width="${strokeWidth}"/>
    `;
  } else if (kind === 'circuit-capacitor') {
    const leadW = w * 0.42;
    const plateH = h * 0.75;
    const p1x = x + leadW;
    const p2x = x + w - leadW;

    inner = `
      <line x1="${x}" y1="${cy}" x2="${p1x}" y2="${cy}" stroke="${stroke}" stroke-width="${strokeWidth}"/>
      <line x1="${p1x}" y1="${cy - plateH / 2}" x2="${p1x}" y2="${cy + plateH / 2}" stroke="${stroke}" stroke-width="${Math.max(3, strokeWidth * 1.5)}"/>
      <line x1="${p2x}" y1="${cy - plateH / 2}" x2="${p2x}" y2="${cy + plateH / 2}" stroke="${stroke}" stroke-width="${Math.max(3, strokeWidth * 1.5)}"/>
      <line x1="${p2x}" y1="${cy}" x2="${x + w}" y2="${cy}" stroke="${stroke}" stroke-width="${strokeWidth}"/>
    `;
  } else if (kind === 'circuit-inductor') {
    const leadW = w * 0.15;
    const coilW = (w - leadW * 2) / 4;
    const coilR = coilW / 2;
    const startX = x + leadW;

    let pathD = `M ${x} ${cy} L ${startX} ${cy}`;
    for (let i = 0; i < 4; i++) {
      const arcStartX = startX + i * coilW;
      const arcEndX = arcStartX + coilW;
      pathD += ` A ${coilR} ${h * 0.4} 0 0 1 ${arcEndX} ${cy}`;
    }
    pathD += ` L ${x + w} ${cy}`;

    inner = `
      <path d="${pathD}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round"/>
    `;
  } else if (kind === 'circuit-ground') {
    const line1W = w * 0.6;
    const line2W = w * 0.4;
    const line3W = w * 0.2;
    const stemH = h * 0.5;

    inner = `
      <line x1="${cx}" y1="${y}" x2="${cx}" y2="${y + stemH}" stroke="${stroke}" stroke-width="${strokeWidth}"/>
      <line x1="${cx - line1W / 2}" y1="${y + stemH}" x2="${cx + line1W / 2}" y2="${y + stemH}" stroke="${stroke}" stroke-width="${strokeWidth}"/>
      <line x1="${cx - line2W / 2}" y1="${y + stemH + h * 0.2}" x2="${cx + line2W / 2}" y2="${y + stemH + h * 0.2}" stroke="${stroke}" stroke-width="${strokeWidth}"/>
      <line x1="${cx - line3W / 2}" y1="${y + stemH + h * 0.4}" x2="${cx + line3W / 2}" y2="${y + stemH + h * 0.4}" stroke="${stroke}" stroke-width="${strokeWidth}"/>
    `;
  } else if (kind === 'circuit-ammeter' || kind === 'circuit-voltmeter') {
    const letter = kind === 'circuit-ammeter' ? 'A' : 'V';
    const r = Math.min(w * 0.3, h * 0.45);

    inner = `
      <line x1="${x}" y1="${cy}" x2="${cx - r}" y2="${cy}" stroke="${stroke}" stroke-width="${strokeWidth}"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill === 'none' ? '#ffffff' : fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>
      <text x="${cx}" y="${cy + 6}" font-size="${Math.round(r * 1.1)}" font-weight="bold" font-family="system-ui, sans-serif" fill="${stroke}" text-anchor="middle" dominant-baseline="middle">${letter}</text>
      <line x1="${cx + r}" y1="${cy}" x2="${x + w}" y2="${cy}" stroke="${stroke}" stroke-width="${strokeWidth}"/>
    `;
  } else if (kind === 'circuit-ac') {
    const r = Math.min(w * 0.3, h * 0.45);
    const waveW = r * 0.8;
    const waveH = r * 0.45;

    inner = `
      <line x1="${x}" y1="${cy}" x2="${cx - r}" y2="${cy}" stroke="${stroke}" stroke-width="${strokeWidth}"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill === 'none' ? '#ffffff' : fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>
      <path d="M ${cx - waveW} ${cy} Q ${cx - waveW / 2} ${cy - waveH} ${cx} ${cy} T ${cx + waveW} ${cy}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}"/>
      <line x1="${cx + r}" y1="${cy}" x2="${x + w}" y2="${cy}" stroke="${stroke}" stroke-width="${strokeWidth}"/>
    `;
  } else if (kind === 'circuit-wire') {
    inner = `
      <path d="M ${x} ${cy} L ${cx} ${cy} L ${cx} ${y + h}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="${x}" cy="${cy}" r="3" fill="${stroke}"/>
      <circle cx="${cx}" cy="${y + h}" r="3" fill="${stroke}"/>
    `;
  }

  group.innerHTML = inner;
}

/* ============================================================
   §5. CARTESIAN PLANE
   ============================================================ */
export function renderCartesianPlane(group, x, y, w, h, opts = {}) {
  const stroke = group.getAttribute('stroke') || '#2563eb';
  const strokeWidth = parseFloat(group.getAttribute('stroke-width') || '2.5');

  const range = parseInt(opts.range || group.dataset.range || '5', 10);
  const showGrid = opts.showGrid !== undefined ? opts.showGrid : (group.dataset.showGrid !== 'false');
  const showNumbers = opts.showNumbers !== undefined ? opts.showNumbers : (group.dataset.showNumbers !== 'false');
  const lang = opts.lang || group.dataset.lang || 'ar';

  group.dataset.x = x; group.dataset.y = y;
  group.dataset.w = w; group.dataset.h = h;
  group.dataset.range = range;
  group.dataset.showGrid = String(showGrid);
  group.dataset.showNumbers = String(showNumbers);
  group.dataset.lang = lang;

  const cx = x + w / 2;
  const cy = y + h / 2;
  const stepX = (w * 0.88) / (range * 2);
  const stepY = (h * 0.88) / (range * 2);

  let gridLines = '';
  if (showGrid) {
    for (let i = -range; i <= range; i++) {
      if (i === 0) continue;
      const gx = cx + i * stepX;
      gridLines += `<line x1="${gx}" y1="${y}" x2="${gx}" y2="${y + h}" stroke="rgba(100, 116, 139, 0.22)" stroke-width="1" stroke-dasharray="3 3"/>`;
    }
    for (let j = -range; j <= range; j++) {
      if (j === 0) continue;
      const gy = cy - j * stepY;
      gridLines += `<line x1="${x}" y1="${gy}" x2="${x + w}" y2="${gy}" stroke="rgba(100, 116, 139, 0.22)" stroke-width="1" stroke-dasharray="3 3"/>`;
    }
  }

  let ticks = '';
  const tickLen = 5;
  const fontSize = Math.max(9, Math.min(13, Math.round(stepX * 0.45)));

  for (let i = -range; i <= range; i++) {
    if (i === 0) continue;
    const tx = cx + i * stepX;
    ticks += `<line x1="${tx}" y1="${cy - tickLen}" x2="${tx}" y2="${cy + tickLen}" stroke="${stroke}" stroke-width="${Math.max(1.5, strokeWidth * 0.8)}"/>`;
    if (showNumbers) {
      ticks += `<text x="${tx}" y="${cy + tickLen + fontSize + 1}" font-size="${fontSize}" fill="#475569" font-family="sans-serif" text-anchor="middle">${i}</text>`;
    }
  }

  for (let j = -range; j <= range; j++) {
    if (j === 0) continue;
    const ty = cy - j * stepY;
    ticks += `<line x1="${cx - tickLen}" y1="${ty}" x2="${cx + tickLen}" y2="${ty}" stroke="${stroke}" stroke-width="${Math.max(1.5, strokeWidth * 0.8)}"/>`;
    if (showNumbers) {
      ticks += `<text x="${cx - tickLen - 4}" y="${ty + fontSize / 3}" font-size="${fontSize}" fill="#475569" font-family="sans-serif" text-anchor="end">${j}</text>`;
    }
  }

  const xLabel = lang === 'ar' ? 'س' : 'x';
  const yLabel = lang === 'ar' ? 'ص' : 'y';
  const labelSize = Math.max(14, fontSize + 3);

  group.innerHTML = `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="rgba(255,255,255,0.01)" pointer-events="all"/>
    <g class="cartesian-grid">${gridLines}</g>
    <line x1="${x}" y1="${cy}" x2="${x + w}" y2="${cy}" stroke="${stroke}" stroke-width="${strokeWidth}" marker-end="url(#arrow-end-normal)"/>
    <line x1="${cx}" y1="${y + h}" x2="${cx}" y2="${y}" stroke="${stroke}" stroke-width="${strokeWidth}" marker-end="url(#arrow-end-normal)"/>
    <g class="cartesian-ticks">${ticks}</g>
    <text x="${cx - 8}" y="${cy + 14}" font-size="${fontSize}" font-weight="bold" fill="#64748b" text-anchor="end">O</text>
    <text x="${x + w - 4}" y="${cy - 8}" font-size="${labelSize}" font-weight="bold" fill="${stroke}" text-anchor="end">${xLabel}</text>
    <text x="${cx + 10}" y="${y + 14}" font-size="${labelSize}" font-weight="bold" fill="${stroke}" text-anchor="start">${yLabel}</text>
  `;
}

/* ============================================================
   §6. BOUNDS
   ============================================================ */
export function getUniversalShapeBounds(el) {
  if (!el) return null;
  const tag = el.tagName ? el.tagName.toLowerCase() : '';

  if (tag === 'rect') {
    return {
      x: parseFloat(el.getAttribute('x')) || 0,
      y: parseFloat(el.getAttribute('y')) || 0,
      width: parseFloat(el.getAttribute('width')) || 0,
      height: parseFloat(el.getAttribute('height')) || 0,
    };
  }
  if (tag === 'ellipse' || tag === 'circle') {
    const cx = parseFloat(el.getAttribute('cx')) || 0;
    const cy = parseFloat(el.getAttribute('cy')) || 0;
    const rx = parseFloat(el.getAttribute('rx') || el.getAttribute('r')) || 0;
    const ry = parseFloat(el.getAttribute('ry') || el.getAttribute('r')) || 0;
    return {
      x: cx - rx,
      y: cy - ry,
      width: rx * 2,
      height: ry * 2,
    };
  }
  if (tag === 'line') {
    const x1 = parseFloat(el.getAttribute('x1')) || 0;
    const y1 = parseFloat(el.getAttribute('y1')) || 0;
    const x2 = parseFloat(el.getAttribute('x2')) || 0;
    const y2 = parseFloat(el.getAttribute('y2')) || 0;
    return {
      x: Math.min(x1, x2),
      y: Math.min(y1, y2),
      width: Math.max(2, Math.abs(x2 - x1)),
      height: Math.max(2, Math.abs(y2 - y1)),
    };
  }
  if (tag === 'polygon' && el.getAttribute('points')) {
    const raw = el.getAttribute('points').trim().split(/\s+/);
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    raw.forEach(pt => {
      const parts = pt.split(',').map(Number);
      if (!isNaN(parts[0]) && !isNaN(parts[1])) {
        minX = Math.min(minX, parts[0]);
        minY = Math.min(minY, parts[1]);
        maxX = Math.max(maxX, parts[0]);
        maxY = Math.max(maxY, parts[1]);
      }
    });
    if (minX !== Infinity && maxX !== -Infinity) {
      return {
        x: minX,
        y: minY,
        width: Math.max(2, maxX - minX),
        height: Math.max(2, maxY - minY),
      };
    }
  }
  if (el.dataset && el.dataset.type === 'curve') {
    const x0 = parseFloat(el.dataset.x0 || '0');
    const y0 = parseFloat(el.dataset.y0 || '0');
    const cx = parseFloat(el.dataset.cx || String(x0 + 50));
    const cy = parseFloat(el.dataset.cy || String(y0 - 40));
    const x1 = parseFloat(el.dataset.x1 || String(x0 + 100));
    const y1 = parseFloat(el.dataset.y1 || String(y0));
    const minX = Math.min(x0, cx, x1);
    const minY = Math.min(y0, cy, y1);
    const maxX = Math.max(x0, cx, x1);
    const maxY = Math.max(y0, cy, y1);
    return {
      x: minX,
      y: minY,
      width: Math.max(2, maxX - minX),
      height: Math.max(2, maxY - minY),
    };
  }

  let tx = 0, ty = 0;
  const t = el.getAttribute('transform');
  if (t) {
    const m = t.match(/translate\(\s*(-?[\d.]+)[ ,]+(-?[\d.]+)\s*\)/);
    if (m) { tx = parseFloat(m[1]) || 0; ty = parseFloat(m[2]) || 0; }
  }

  try {
    const b = el.getBBox();
    if (b && (b.width > 0 || b.height > 0)) {
      return {
        x: b.x + tx,
        y: b.y + ty,
        width: b.width,
        height: b.height,
      };
    }
  } catch (_) {}

  if (el.dataset.x !== undefined && el.dataset.w !== undefined) {
    return {
      x: parseFloat(el.dataset.x) || 0,
      y: parseFloat(el.dataset.y) || 0,
      width: parseFloat(el.dataset.w) || 0,
      height: parseFloat(el.dataset.h) || 0,
    };
  }
  return null;
}

/* ============================================================
   §7. RESIZE — Non-Rotated
   ============================================================ */
export function resizeUniversalShape(el, handle, origBox, startPt, currentPt) {
  const dx = currentPt.x - startPt.x;
  const dy = currentPt.y - startPt.y;

  let newX = origBox.x;
  let newY = origBox.y;
  let newW = origBox.width;
  let newH = origBox.height;

  if (handle === 'se') {
    newW = Math.max(10, origBox.width + dx);
    newH = Math.max(10, origBox.height + dy);
  } else if (handle === 'nw') {
    newW = Math.max(10, origBox.width - dx);
    newH = Math.max(10, origBox.height - dy);
    newX = origBox.x + (origBox.width - newW);
    newY = origBox.y + (origBox.height - newH);
  } else if (handle === 'ne') {
    newW = Math.max(10, origBox.width + dx);
    newH = Math.max(10, origBox.height - dy);
    newY = origBox.y + (origBox.height - newH);
  } else if (handle === 'sw') {
    newW = Math.max(10, origBox.width - dx);
    newH = Math.max(10, origBox.height + dy);
    newX = origBox.x + (origBox.width - newW);
  } else if (handle === 'n') {
    newH = Math.max(10, origBox.height - dy);
    newY = origBox.y + (origBox.height - newH);
  } else if (handle === 's') {
    newH = Math.max(10, origBox.height + dy);
  } else if (handle === 'w') {
    newW = Math.max(10, origBox.width - dx);
    newX = origBox.x + (origBox.width - newW);
  } else if (handle === 'e') {
    newW = Math.max(10, origBox.width + dx);
  }

  const tag = el.tagName.toLowerCase();
  const kind = el.dataset.type || tag;

  if (tag === 'rect') {
    el.setAttribute('x', newX);
    el.setAttribute('y', newY);
    el.setAttribute('width', newW);
    el.setAttribute('height', newH);
  } else if (tag === 'ellipse') {
    el.setAttribute('cx', newX + newW / 2);
    el.setAttribute('cy', newY + newH / 2);
    el.setAttribute('rx', newW / 2);
    el.setAttribute('ry', newH / 2);
  } else if (tag === 'line') {
    if (handle === 'start' || handle === 'nw') {
      el.setAttribute('x1', (origBox.x1 != null ? origBox.x1 : origBox.x) + dx);
      el.setAttribute('y1', (origBox.y1 != null ? origBox.y1 : origBox.y) + dy);
    } else if (handle === 'end' || handle === 'se') {
      el.setAttribute('x2', (origBox.x2 != null ? origBox.x2 : origBox.x + origBox.width) + dx);
      el.setAttribute('y2', (origBox.y2 != null ? origBox.y2 : origBox.y + origBox.height) + dy);
    } else {
      el.setAttribute('x1', newX);
      el.setAttribute('y1', newY);
      el.setAttribute('x2', newX + newW);
      el.setAttribute('y2', newY + newH);
    }
  } else if (tag === 'polygon') {
    const sx = newW / (origBox.width || 1);
    const sy = newH / (origBox.height || 1);
    if (origBox.origPoints && origBox.origPoints.length > 0) {
      const scaled = origBox.origPoints.map(pt => {
        const relX = pt.x - origBox.x;
        const relY = pt.y - origBox.y;
        return `${newX + relX * sx},${newY + relY * sy}`;
      });
      el.setAttribute('points', scaled.join(' '));
    } else {
      if (kind === 'triangle') {
        el.setAttribute('points', `${newX + newW / 2},${newY} ${newX + newW},${newY + newH} ${newX},${newY + newH}`);
      } else if (kind === 'right-triangle') {
        el.setAttribute('points', `${newX},${newY} ${newX},${newY + newH} ${newX + newW},${newY + newH}`);
      } else if (kind === 'diamond') {
        el.setAttribute('points', `${newX + newW / 2},${newY} ${newX + newW},${newY + newH / 2} ${newX + newW / 2},${newY + newH} ${newX},${newY + newH / 2}`);
      } else if (kind === 'star') {
        const pts = calculateStarPoints(newX + newW / 2, newY + newH / 2, newW / 2, newH / 2, 5);
        el.setAttribute('points', pts.map(pt => `${pt.x},${pt.y}`).join(' '));
      } else if (kind === 'hexagon') {
        const pts = calculatePolygonPoints(newX + newW / 2, newY + newH / 2, newW / 2, newH / 2, 6);
        el.setAttribute('points', pts.map(pt => `${pt.x},${pt.y}`).join(' '));
      }
    }
  } else if (kind === 'curve') {
    const sx = newW / (origBox.width || 1);
    const sy = newH / (origBox.height || 1);
    const oX0 = parseFloat(origBox.x0 || el.dataset.x0 || origBox.x);
    const oY0 = parseFloat(origBox.y0 || el.dataset.y0 || origBox.y);
    const oCx = parseFloat(origBox.cx || el.dataset.cx || (origBox.x + origBox.width / 2));
    const oCy = parseFloat(origBox.cy || el.dataset.cy || (origBox.y + origBox.height / 2));
    const oX1 = parseFloat(origBox.x1 || el.dataset.x1 || (origBox.x + origBox.width));
    const oY1 = parseFloat(origBox.y1 || el.dataset.y1 || (origBox.y + origBox.height));

    const x0 = newX + (oX0 - origBox.x) * sx;
    const y0 = newY + (oY0 - origBox.y) * sy;
    const cx = newX + (oCx - origBox.x) * sx;
    const cy = newY + (oCy - origBox.y) * sy;
    const x1 = newX + (oX1 - origBox.x) * sx;
    const y1 = newY + (oY1 - origBox.y) * sy;

    el.setAttribute('d', `M ${x0} ${y0} Q ${cx} ${cy} ${x1} ${y1}`);
    el.dataset.x0 = x0; el.dataset.y0 = y0;
    el.dataset.cx = cx; el.dataset.cy = cy;
    el.dataset.x1 = x1; el.dataset.y1 = y1;
  } else if (kind === 'cylinder') {
    renderCylinder(el, newX, newY, newW, newH);
  } else if (kind.startsWith('circuit-')) {
    renderCircuitComponent(el, kind, newX, newY, newW, newH);
  } else if (kind === 'cartesian') {
    renderCartesianPlane(el, newX, newY, newW, newH);
  } else if (kind === 'block-arrow') {
    const d = calculateBlockArrowPath(newX, newY, newW, newH);
    el.setAttribute('d', d);
  }

  el.dataset.x = newX;
  el.dataset.y = newY;
  el.dataset.w = newW;
  el.dataset.h = newH;
}

/* ============================================================
   §8. RESIZE — Rotated (Session 3)
   ============================================================ */

/**
 * يطبّق box محسوب على عنصر SVG — منطق التطبيق منفصل من resizeUniversalShape
 */
export function applyResizedBox(el, newX, newY, newW, newH) {
  const tag = el.tagName.toLowerCase();
  const kind = el.dataset.type || tag;

  if (tag === 'rect') {
    el.setAttribute('x', newX);
    el.setAttribute('y', newY);
    el.setAttribute('width', newW);
    el.setAttribute('height', newH);
  } else if (tag === 'ellipse') {
    el.setAttribute('cx', newX + newW / 2);
    el.setAttribute('cy', newY + newH / 2);
    el.setAttribute('rx', newW / 2);
    el.setAttribute('ry', newH / 2);
  } else if (tag === 'line') {
    el.setAttribute('x1', newX);
    el.setAttribute('y1', newY);
    el.setAttribute('x2', newX + newW);
    el.setAttribute('y2', newY + newH);
  } else if (tag === 'polygon') {
    if (kind === 'triangle') {
      el.setAttribute('points', `${newX + newW / 2},${newY} ${newX + newW},${newY + newH} ${newX},${newY + newH}`);
    } else if (kind === 'right-triangle') {
      el.setAttribute('points', `${newX},${newY} ${newX},${newY + newH} ${newX + newW},${newY + newH}`);
    } else if (kind === 'diamond') {
      el.setAttribute('points', `${newX + newW / 2},${newY} ${newX + newW},${newY + newH / 2} ${newX + newW / 2},${newY + newH} ${newX},${newY + newH / 2}`);
    } else if (kind === 'star') {
      const pts = calculateStarPoints(newX + newW / 2, newY + newH / 2, newW / 2, newH / 2, 5);
      el.setAttribute('points', pts.map(p => `${p.x},${p.y}`).join(' '));
    } else if (kind === 'hexagon') {
      const pts = calculatePolygonPoints(newX + newW / 2, newY + newH / 2, newW / 2, newH / 2, 6);
      el.setAttribute('points', pts.map(p => `${p.x},${p.y}`).join(' '));
    }
  } else if (kind === 'curve') {
    const oX0 = parseFloat(el.dataset.x0) || newX;
    const oY0 = parseFloat(el.dataset.y0) || (newY + newH);
    const oX1 = parseFloat(el.dataset.x1) || (newX + newW);
    const oY1 = parseFloat(el.dataset.y1) || (newY + newH);
    const oCx = parseFloat(el.dataset.cx) || (newX + newW / 2);
    const oCy = parseFloat(el.dataset.cy) || (newY + newH / 2);

    const oldMinX = Math.min(oX0, oX1, oCx);
    const oldMinY = Math.min(oY0, oY1, oCy);
    const oldMaxX = Math.max(oX0, oX1, oCx);
    const oldMaxY = Math.max(oY0, oY1, oCy);
    const oldW = Math.max(1, oldMaxX - oldMinX);
    const oldH = Math.max(1, oldMaxY - oldMinY);

    const sx = newW / oldW;
    const sy = newH / oldH;

    const x0 = newX + (oX0 - oldMinX) * sx;
    const y0 = newY + (oY0 - oldMinY) * sy;
    const x1 = newX + (oX1 - oldMinX) * sx;
    const y1 = newY + (oY1 - oldMinY) * sy;
    const cx = newX + (oCx - oldMinX) * sx;
    const cy = newY + (oCy - oldMinY) * sy;

    el.setAttribute('d', `M ${x0} ${y0} Q ${cx} ${cy} ${x1} ${y1}`);
    el.dataset.x0 = x0; el.dataset.y0 = y0;
    el.dataset.x1 = x1; el.dataset.y1 = y1;
    el.dataset.cx = cx; el.dataset.cy = cy;
  } else if (kind === 'cylinder') {
    renderCylinder(el, newX, newY, newW, newH);
  } else if (kind.startsWith('circuit-')) {
    renderCircuitComponent(el, kind, newX, newY, newW, newH);
  } else if (kind === 'cartesian') {
    renderCartesianPlane(el, newX, newY, newW, newH);
  } else if (kind === 'block-arrow') {
    el.setAttribute('d', calculateBlockArrowPath(newX, newY, newW, newH));
  }

  el.dataset.x = newX;
  el.dataset.y = newY;
  el.dataset.w = newW;
  el.dataset.h = newH;
}

function anchorForHandle(handle, box) {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  switch (handle) {
    case 'se': return { x: box.x, y: box.y };
    case 'nw': return { x: box.x + box.width, y: box.y + box.height };
    case 'ne': return { x: box.x, y: box.y + box.height };
    case 'sw': return { x: box.x + box.width, y: box.y };
    case 'n':  return { x: cx, y: box.y + box.height };
    case 's':  return { x: cx, y: box.y };
    case 'e':  return { x: box.x, y: cy };
    case 'w':  return { x: box.x + box.width, y: cy };
    default:   return { x: cx, y: cy };
  }
}

/**
 * يحسب box جديد لعنصر مُدوَّر بحيث يبقى "الركن المقابل" ثابتاً بصرياً.
 */
export function computeRotatedResize(el, handle, origBox, startPt, currentPt) {
  const rot = parseFloat(el.dataset.rotation) || 0;

  const ox = parseFloat(el.dataset.originX ?? 0.5);
  const oy = parseFloat(el.dataset.originY ?? 0.5);
  const pivot0 = {
    x: origBox.x + ox * origBox.width,
    y: origBox.y + oy * origBox.height,
  };

  // 1) delta محلي
  const radN = -rot * Math.PI / 180;
  const cosN = Math.cos(radN), sinN = Math.sin(radN);
  const sdx = startPt.x - pivot0.x, sdy = startPt.y - pivot0.y;
  const cdx = currentPt.x - pivot0.x, cdy = currentPt.y - pivot0.y;
  const sLocal = { x: pivot0.x + sdx * cosN - sdy * sinN, y: pivot0.y + sdx * sinN + sdy * cosN };
  const cLocal = { x: pivot0.x + cdx * cosN - cdy * sinN, y: pivot0.y + cdx * sinN + cdy * cosN };
  const dx = cLocal.x - sLocal.x;
  const dy = cLocal.y - sLocal.y;

  // 2) أبعاد جديدة
  let nx = origBox.x, ny = origBox.y, nw = origBox.width, nh = origBox.height;
  if (handle === 'se') { nw = Math.max(10, origBox.width + dx); nh = Math.max(10, origBox.height + dy); }
  else if (handle === 'nw') { nw = Math.max(10, origBox.width - dx); nh = Math.max(10, origBox.height - dy); nx = origBox.x + (origBox.width - nw); ny = origBox.y + (origBox.height - nh); }
  else if (handle === 'ne') { nw = Math.max(10, origBox.width + dx); nh = Math.max(10, origBox.height - dy); ny = origBox.y + (origBox.height - nh); }
  else if (handle === 'sw') { nw = Math.max(10, origBox.width - dx); nh = Math.max(10, origBox.height + dy); nx = origBox.x + (origBox.width - nw); }
  else if (handle === 'n') { nh = Math.max(10, origBox.height - dy); ny = origBox.y + (origBox.height - nh); }
  else if (handle === 's') { nh = Math.max(10, origBox.height + dy); }
  else if (handle === 'w') { nw = Math.max(10, origBox.width - dx); nx = origBox.x + (origBox.width - nw); }
  else if (handle === 'e') { nw = Math.max(10, origBox.width + dx); }

  if (rot === 0) {
    return { x: nx, y: ny, width: nw, height: nh };
  }

  // 3) anchor
  const A_old = anchorForHandle(handle, origBox);
  const A_new = anchorForHandle(handle, { x: nx, y: ny, width: nw, height: nh });

  const rad = rot * Math.PI / 180;
  const cos = Math.cos(rad), sin = Math.sin(rad);
  const ax0 = A_old.x - pivot0.x, ay0 = A_old.y - pivot0.y;
  const screenAnchor = {
    x: pivot0.x + ax0 * cos - ay0 * sin,
    y: pivot0.y + ax0 * sin + ay0 * cos,
  };

  const pivot1 = { x: nx + ox * nw, y: ny + oy * nh };

  const ax1 = screenAnchor.x - pivot1.x, ay1 = screenAnchor.y - pivot1.y;
  const A_target_local = {
    x: pivot1.x + ax1 * cosN - ay1 * sinN,
    y: pivot1.y + ax1 * sinN + ay1 * cosN,
  };

  const shiftX = A_target_local.x - A_new.x;
  const shiftY = A_target_local.y - A_new.y;

  return { x: nx + shiftX, y: ny + shiftY, width: nw, height: nh };
}