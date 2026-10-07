/**
 * ============================================================
 * config.js — الثوابت وروابط CDN
 * ============================================================
 */

export const PDFJS_VERSION = '4.7.76';
export const PDFJS_BASE = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}`;
export const KATEX_VERSION = '0.16.9';
export const KATEX_CSS = `https://cdn.jsdelivr.net/npm/katex@${KATEX_VERSION}/dist/katex.min.css`;
export const KATEX_JS  = `https://cdn.jsdelivr.net/npm/katex@${KATEX_VERSION}/dist/katex.min.js`;
export const JSZIP_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
export const JSPDF_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
export const HTML2CANVAS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';

export const LASER_FADE_MS = 1500;
export const UNDO_LIMIT = 50;
export const COORD_WIDTH = 2000;
export const CACHE_WIDTH = 2200;
export const THUMB_WIDTH = 320;

export const FILE_EXT = '.actpdf';
export const SVG_NS = 'http://www.w3.org/2000/svg';

export const SIDEBAR_MIN_W = 100;
export const SIDEBAR_MAX_W = 420;
export const SIDEBAR_DEFAULT_W = 180;
export const SIDEBAR_W_KEY = 'pdfboard-sidebar-width';
export const SIDEBAR_V_KEY = 'pdfboard-sidebar-visible';

/** الأدوات التي تملك قائمة فرعية */
export const TOOLS_WITH_SUBMENU = ['pen', 'highlighter', 'eraser', 'laser', 'shape', 'text', 'equation'];

/** قوالب المعادلات */
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
