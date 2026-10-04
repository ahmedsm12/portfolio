/* ============================================================
 * ui-shell.js — الواجهة الجديدة
 * ============================================================ */

export const APP_VERSION = '0.5.0';

/* ============================================================
   §1. VERSION
   ============================================================ */
function applyVersion() {
  const el = document.getElementById('appVersion');
  if (el) el.textContent = 'v' + APP_VERSION;
}

/* ============================================================
   §2. SAVE BADGE
   ============================================================ */
function setSaveBadge(text, saving) {
  const txt = document.getElementById('saveBadgeText');
  const dot = document.querySelector('#saveBadge .save-dot');
  if (txt) txt.textContent = text || 'محفوظ';
  if (dot) dot.classList.toggle('saving', !!saving);
}

/* ============================================================
   §3. PROPS TABS
   ============================================================ */
function initPropsTabs() {
  const root = document.getElementById('propsRight');
  if (!root) return;
  const tabs = root.querySelectorAll('.props-tab');
  const panels = root.querySelectorAll('.props-panel');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.style.display = 'none');
      tab.classList.add('active');
      const key = tab.dataset.ptab;
      const panel = root.querySelector('.props-panel[data-ppanel="' + key + '"]');
      if (panel) panel.style.display = 'block';
    });
  });
}

/* ============================================================
   §4. BOTTOM PANEL
   ============================================================ */
function initBottomPanel() {
  const panel = document.getElementById('bottomPanel');
  if (!panel) return;

  const tabs = panel.querySelectorAll('.bp-tab');
  const contents = panel.querySelectorAll('.bp-content');
  const toggle = document.getElementById('bpToggle');

  function setExpanded(expanded) {
    panel.classList.toggle('collapsed', !expanded);
    document.body.classList.toggle('bp-expanded', expanded);
    if (toggle) toggle.textContent = expanded ? '▾' : '▴';
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const key = tab.dataset.btab;
      const wasActive = tab.classList.contains('active');
      const isCollapsed = panel.classList.contains('collapsed');

      if (wasActive && !isCollapsed) {
        setExpanded(false);
        return;
      }

      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));
      tab.classList.add('active');

      const content = panel.querySelector('.bp-content[data-bpanel="' + key + '"]');
      if (content) content.classList.add('active');

      setExpanded(true);
    });
  });

  if (toggle) {
    toggle.addEventListener('click', () => {
      const currentlyExpanded = !panel.classList.contains('collapsed');
      setExpanded(!currentlyExpanded);
    });
  }

  setExpanded(false);
}

/* ============================================================
   §5. LAYERS PANEL
   ============================================================ */
function getLayerIcon(type) {
  if (type === 'image') return '🖼';
  if (type === 'text') return 'T';
  if (type === 'equation') return '∑';
  if (type === 'button') return '🔘';
  if (type === 'media') return '🎬';
  if (type === 'embed') return '🔗';
  if (type === 'path') return '✏';
  if (type === 'highlighter') return '🖍';
  if (type === 'rect') return '▭';
  if (type === 'ellipse') return '◯';
  if (type === 'line') return '╱';
  return '·';
}

export function refreshLayersPanel() {
  const list = document.getElementById('layersList');
  const count = document.getElementById('layerCount');
  if (!list) return;

  const items = [];

  const svg = document.getElementById('svgLayer');
  if (svg) {
    svg.querySelectorAll('[data-annot]').forEach(el => {
      if (el.tagName.toLowerCase() === 'g') return;
      const t = el.dataset.type || el.tagName.toLowerCase();
      items.push({
        el: el, kind: 'svg', type: t,
        name: t + ' ' + (el.dataset.id ? el.dataset.id.slice(-4) : '')
      });
    });
  }

  const txt = document.getElementById('textLayer');
  if (txt) {
    txt.querySelectorAll('.pdf-text-box').forEach((el, i) => {
      const isEq = el.dataset.isEquation === 'true';
      items.push({
        el: el, kind: 'text',
        type: isEq ? 'equation' : 'text',
        name: (isEq ? 'معادلة ' : 'نص ') + (i + 1)
      });
    });
  }

  const vid = document.getElementById('videoLayer');
  if (vid) {
    vid.querySelectorAll('.media-obj').forEach((el, i) => {
      items.push({
        el: el, kind: 'media', type: 'media',
        name: el.dataset.title || ('ميديا ' + (i + 1))
      });
    });
  }

  const emb = document.getElementById('embedLayer');
  if (emb) {
    emb.querySelectorAll('.embed').forEach((el, i) => {
      items.push({
        el: el, kind: 'embed', type: 'embed',
        name: 'تضمين: ' + (el.dataset.url || ('#' + (i + 1)))
      });
    });
  }

  const ib = document.getElementById('interactiveLayer');
  if (ib) {
    ib.querySelectorAll('.pdf-interactive-btn').forEach((el, i) => {
      items.push({
        el: el, kind: 'button', type: 'button',
        name: el.dataset.text || ('زر ' + (i + 1))
      });
    });
  }

  items.reverse();

  if (count) count.textContent = String(items.length);

  if (!items.length) {
    list.innerHTML = '<div class="bp-empty">لا توجد عناصر في هذه الشريحة</div>';
    return;
  }

  list.innerHTML = '';

  items.forEach(item => {
    const row = document.createElement('div');
    row.className = 'layer-row';

    const iconSpan = document.createElement('span');
    iconSpan.className = 'ly-icon';
    iconSpan.textContent = getLayerIcon(item.type);

    const nameSpan = document.createElement('span');
    nameSpan.className = 'ly-name';
    nameSpan.textContent = item.name;

    const visSpan = document.createElement('span');
    visSpan.className = 'ly-toggle on';
    visSpan.dataset.act = 'vis';
    visSpan.title = 'إظهار / إخفاء';
    visSpan.textContent = '👁';

    row.appendChild(iconSpan);
    row.appendChild(nameSpan);
    row.appendChild(visSpan);

    row.addEventListener('click', (e) => {
      if (e.target.dataset.act === 'vis') {
        const visible = e.target.classList.toggle('on');
        item.el.style.display = visible ? '' : 'none';
        return;
      }
      list.querySelectorAll('.layer-row').forEach(r => r.classList.remove('active'));
      row.classList.add('active');
      document.dispatchEvent(new CustomEvent('ipb:selectLayer', {
        detail: { el: item.el, kind: item.kind }
      }));
    });

    list.appendChild(row);
  });
}

/* ============================================================
   §6. TOPBAR ACTIONS
   ============================================================ */
function initTopbarActions() {
  const btnUndo = document.getElementById('btnUndo');
  const btnRedo = document.getElementById('btnRedo');
  const btnOpen = document.getElementById('btnOpen');
  const btnSave = document.getElementById('btnSave');
  const btnPreview = document.getElementById('btnPreview');
  const btnPresent = document.getElementById('btnPresent');

  if (btnUndo) {
    btnUndo.addEventListener('click', async () => {
      try {
        const core = await import('./core.js');
        core.undo();
        setSaveBadge('تم التراجع', false);
      } catch (e) { console.warn(e); }
    });
  }
  if (btnRedo) {
    btnRedo.addEventListener('click', async () => {
      try {
        const core = await import('./core.js');
        core.redo();
        setSaveBadge('تم الإعادة', false);
      } catch (e) { console.warn(e); }
    });
  }
  if (btnOpen) {
    btnOpen.addEventListener('click', () => {
      const input = document.getElementById('fileInput');
      if (input) input.click();
    });
  }
  if (btnSave) {
    btnSave.addEventListener('click', async () => {
      setSaveBadge('جارٍ الحفظ…', true);
      try {
        const storage = await import('./storage.js');
        await storage.saveProjectAsFile();
        setSaveBadge('محفوظ الآن', false);
      } catch (e) {
        setSaveBadge('فشل الحفظ', false);
      }
    });
  }
  if (btnPreview) btnPreview.addEventListener('click', openPresentMode);
  if (btnPresent) btnPresent.addEventListener('click', openPresentMode);
}

/* ============================================================
   §7. PROPS PANEL TOGGLE ★★★ جديد
   ============================================================ */
function initPropsToggle() {
  /* زر عائم على الحافة اليمنى */
  let btn = document.getElementById('btnToggleProps');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'btnToggleProps';
    btn.className = 'props-toggle-btn';
    btn.title = 'إخفاء / إظهار لوحة الخصائص';
    document.body.appendChild(btn);
  }

  btn.addEventListener('click', () => {
    document.body.classList.toggle('props-hidden');
    /* بعد إخفاء اللوحة، المساحة للـ stage تتغير → أعد حساب الأبعاد */
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 260);
  });

  /* اختصار لوحة المفاتيح Ctrl+. */
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === '.') {
      e.preventDefault();
      document.body.classList.toggle('props-hidden');
      setTimeout(() => window.dispatchEvent(new Event('resize')), 260);
    }
  });
}

/* ============================================================
   §8. EQUATION DIALOG — النسخة المُصلَحة
   ============================================================
   الإصلاحات:
   - grids تُبنى بفئة .active على أول فئة
   - عند إعادة الفتح، يُفعَّل أول grid إن لم يكن أي grid نشطاً
   - التبويبات تستخدم index بدل مرجع مباشر (يبقى صالحاً بعد إعادة البناء)
   ============================================================ */
function setupEquationBackdropMirror() {
  let backdrop = document.getElementById('equationBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'equationBackdrop';
    document.body.appendChild(backdrop);
  }

  const editor = document.getElementById('equationEditor');
  if (!editor) {
    console.warn('[ui-shell] #equationEditor غير موجود');
    return;
  }

  /* درع الأحداث — bubble phase */
  if (!editor._uiShieldWired) {
    editor._uiShieldWired = true;
    const shieldEvents = [
      'pointerdown', 'pointerup', 'pointermove',
      'mousedown', 'mouseup', 'mousemove',
      'click', 'dblclick',
      'touchstart', 'touchend', 'touchmove',
      'keydown', 'keyup', 'keypress',
      'wheel', 'contextmenu'
    ];
    shieldEvents.forEach(evt => {
      editor.addEventListener(evt, (e) => {
        e.stopPropagation();
      }, false);
    });
  }

  if (!backdrop._uiShieldWired) {
    backdrop._uiShieldWired = true;
    ['pointerdown', 'click', 'mousedown', 'mouseup'].forEach(evt => {
      backdrop.addEventListener(evt, (e) => {
        e.stopPropagation();
        if (e.target === backdrop) hideBoth();
      }, false);
    });
  }

  function hideBoth() {
    editor.classList.remove('show');
    backdrop.classList.remove('show');
    backdrop.style.display = 'none';
  }

  function syncFromBackdrop() {
    const shown = backdrop.classList.contains('show');
    if (shown) {
      backdrop.style.display = 'block';
      editor.classList.add('show');
      ensureEquationPalette(editor);
      ensureEquationTabs(editor);
      const ta = document.getElementById('eqTextarea');
      if (ta) setTimeout(() => { try { ta.focus(); } catch (_) {} }, 100);
    } else {
      backdrop.style.display = 'none';
      editor.classList.remove('show');
    }
  }

  const obs = new MutationObserver(syncFromBackdrop);
  obs.observe(backdrop, { attributes: true, attributeFilter: ['class'] });
  backdrop.style.display = backdrop.classList.contains('show') ? 'block' : 'none';

  /* أزرار الإغلاق */
  const closeBtn = document.getElementById('eqCloseBtn');
  const cancelBtn = document.getElementById('eqCancelBtn');
  if (closeBtn && !closeBtn._uiWired) {
    closeBtn._uiWired = true;
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      hideBoth();
    });
  }
  if (cancelBtn && !cancelBtn._uiWired) {
    cancelBtn._uiWired = true;
    cancelBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      hideBoth();
    });
  }

  /* Escape */
  if (!editor._uiEscapeWired) {
    editor._uiEscapeWired = true;
    editor.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        hideBoth();
      }
    });
  }

  /* زر المعادلة في الشريط */
  const eqBtn = document.querySelector('#toolbar button[data-tool="equation"]');
  if (eqBtn && !eqBtn._uiMirrorWired) {
    eqBtn._uiMirrorWired = true;
    eqBtn.addEventListener('click', () => {
      setTimeout(() => {
        if (editor.classList.contains('show')) {
          /* مفتوح بالفعل — تأكد من grid نشط */
          ensureEquationTabs(editor);
          return;
        }
        console.warn('[ui-shell] fallback: فتح المحرر يدوياً');
        backdrop.classList.add('show');
        backdrop.style.display = 'block';
        editor.classList.add('show');
        ensureEquationPalette(editor);
        ensureEquationTabs(editor);
        const ta = document.getElementById('eqTextarea');
        if (ta) setTimeout(() => { try { ta.focus(); } catch (_) {} }, 80);
      }, 250);
    }, true);
  }
}

/* ============================================================
   §8.1 EQUATION TABS — الإصلاح الجذري
   ============================================================ */
function ensureEquationTabs(editor) {
  const host = editor.querySelector('#eqPaletteHost');
  if (!host) return;

  const existingTabs = host.parentElement.querySelector('.eq-cat-tabs');

  if (existingTabs) {
    /* ★ التبويبات موجودة — تأكد فقط من وجود grid نشط */
    if (!host.querySelector('.eq-grid.active')) {
      const firstGrid = host.querySelector('.eq-grid');
      if (firstGrid) firstGrid.classList.add('active');
    }
    if (!existingTabs.querySelector('.eq-cat-tab.active')) {
      const firstTab = existingTabs.querySelector('.eq-cat-tab');
      if (firstTab) firstTab.classList.add('active');
    }
    return;
  }

  /* جمع الأقسام من DOM */
  const sections = [];
  let currentCat = null;

  Array.from(host.children).forEach(child => {
    if (child.classList.contains('eq-section-label')) {
      currentCat = { label: child.textContent.trim() };
      sections.push(currentCat);
    } else if (child.classList.contains('eq-grid') && currentCat) {
      /* لا شيء هنا */
    }
  });

  if (sections.length < 2) return;

  /* شريط التبويبات */
  const tabsBar = document.createElement('div');
  tabsBar.className = 'eq-cat-tabs';

  /* أضف زر "الكل" */
  const allBtn = document.createElement('button');
  allBtn.type = 'button';
  allBtn.className = 'eq-cat-tab';
  allBtn.textContent = '★ الكل';
  allBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    tabsBar.querySelectorAll('.eq-cat-tab').forEach(b => b.classList.remove('active'));
    allBtn.classList.add('active');
    /* أظهر كل الشبكات */
    host.querySelectorAll('.eq-grid').forEach(g => g.classList.add('active'));
  });
  tabsBar.appendChild(allBtn);

  sections.forEach((sec, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'eq-cat-tab' + (i === 0 ? ' active' : '');
    btn.textContent = sec.label;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      tabsBar.querySelectorAll('.eq-cat-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      /* ★ استخدم index بدل مرجع — يبقى صالحاً بعد إعادة البناء */
      const grids = host.querySelectorAll('.eq-grid');
      grids.forEach((g, j) => g.classList.toggle('active', j === i));
    });

    tabsBar.appendChild(btn);
  });

  /* إذا شريط التبويبات موجود سابقاً لأي سبب، أزله */
  const old = host.parentElement.querySelector('.eq-cat-tabs');
  if (old) old.remove();

  host.parentElement.insertBefore(tabsBar, host);

  /* ★ فعّل أول grid */
  const grids = host.querySelectorAll('.eq-grid');
  grids.forEach((g, i) => g.classList.toggle('active', i === 0));
}

/* ============================================================
   §8.2 ENSURE PALETTE
   ============================================================ */
function ensureEquationPalette(editor) {
  const host = editor.querySelector('#eqPaletteHost');
  if (!host) return;
  if (host.children.length > 0) return;

  import('./interaction.js').then(mod => {
    if (mod.buildEquationPaletteInto) {
      try { mod.buildEquationPaletteInto(host); } catch (_) {}
    }
    if (!host.children.length) buildFallbackPalette(host);
    ensureEquationTabs(editor);
  }).catch(() => {
    if (!host.children.length) buildFallbackPalette(host);
    ensureEquationTabs(editor);
  });
}

/* ============================================================
   §8.3 FALLBACK PALETTE
   ============================================================ */
function buildFallbackPalette(host) {
  const TEMPLATES = [
    { cat: 'الكسور والجذور', items: [
      { label: 'a/b', latex: '\\frac{a}{b}' },
      { label: '√',   latex: '\\sqrt{x}' },
      { label: 'ⁿ√',  latex: '\\sqrt[n]{x}' },
      { label: 'x/y', latex: '\\frac{x}{y}' },
      { label: '¹⁄₂', latex: '\\frac{1}{2}' },
      { label: 'a+b/c', latex: '\\frac{a+b}{c}' },
    ]},
    { cat: 'الأسس', items: [
      { label: 'x²', latex: 'x^{2}' },
      { label: 'xₙ', latex: 'x_{n}' },
      { label: 'xⁿ', latex: 'x^{n}' },
      { label: 'xₐᵦ', latex: 'x_{a}^{b}' },
      { label: 'eˣ', latex: 'e^{x}' },
      { label: 'a⁺ᵇ', latex: 'a^{n+1}' },
    ]},
    { cat: 'المجاميع والتكاملات', items: [
      { label: '∑',   latex: '\\sum_{i=1}^{n}' },
      { label: '∏',   latex: '\\prod_{i=1}^{n}' },
      { label: '∫',   latex: '\\int_{a}^{b}' },
      { label: '∬',   latex: '\\iint' },
      { label: '∮',   latex: '\\oint' },
      { label: 'lim', latex: '\\lim_{x \\to \\infty}' },
      { label: 'd/dx', latex: '\\frac{d}{dx}' },
      { label: '∂/∂x', latex: '\\frac{\\partial}{\\partial x}' },
      { label: '∞',   latex: '\\infty' },
    ]},
    { cat: 'حروف يونانية', items: [
      { label: 'α', latex: '\\alpha' },
      { label: 'β', latex: '\\beta' },
      { label: 'γ', latex: '\\gamma' },
      { label: 'δ', latex: '\\delta' },
      { label: 'ε', latex: '\\epsilon' },
      { label: 'θ', latex: '\\theta' },
      { label: 'λ', latex: '\\lambda' },
      { label: 'μ', latex: '\\mu' },
      { label: 'π', latex: '\\pi' },
      { label: 'ρ', latex: '\\rho' },
      { label: 'σ', latex: '\\sigma' },
      { label: 'τ', latex: '\\tau' },
      { label: 'φ', latex: '\\phi' },
      { label: 'χ', latex: '\\chi' },
      { label: 'ψ', latex: '\\psi' },
      { label: 'ω', latex: '\\omega' },
      { label: 'Δ', latex: '\\Delta' },
      { label: 'Σ', latex: '\\Sigma' },
    ]},
    { cat: 'العلاقات والعمليات', items: [
      { label: '≠',  latex: '\\neq' },
      { label: '≤',  latex: '\\leq' },
      { label: '≥',  latex: '\\geq' },
      { label: '≈',  latex: '\\approx' },
      { label: '≡',  latex: '\\equiv' },
      { label: '∝',  latex: '\\propto' },
      { label: '±',  latex: '\\pm' },
      { label: '×',  latex: '\\times' },
      { label: '÷',  latex: '\\div' },
      { label: '·',  latex: '\\cdot' },
      { label: '→',  latex: '\\to' },
      { label: '⇒',  latex: '\\Rightarrow' },
      { label: '⇔',  latex: '\\Leftrightarrow' },
      { label: '∈',  latex: '\\in' },
      { label: '∉',  latex: '\\notin' },
      { label: '⊂',  latex: '\\subset' },
      { label: '∪',  latex: '\\cup' },
      { label: '∩',  latex: '\\cap' },
      { label: '∀',  latex: '\\forall' },
      { label: '∃',  latex: '\\exists' },
    ]},
    { cat: 'الدوال', items: [
      { label: 'sin',  latex: '\\sin' },
      { label: 'cos',  latex: '\\cos' },
      { label: 'tan',  latex: '\\tan' },
      { label: 'cot',  latex: '\\cot' },
      { label: 'sec',  latex: '\\sec' },
      { label: 'csc',  latex: '\\csc' },
      { label: 'log',  latex: '\\log' },
      { label: 'ln',   latex: '\\ln' },
      { label: 'exp',  latex: '\\exp' },
      { label: 'sin⁻¹', latex: '\\arcsin' },
      { label: 'cos⁻¹', latex: '\\arccos' },
      { label: 'tan⁻¹', latex: '\\arctan' },
    ]},
    { cat: 'مصفوفات', items: [
      { label: 'matrix 2×2', latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}' },
      { label: 'matrix 3×3', latex: '\\begin{pmatrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{pmatrix}' },
      { label: 'cases',      latex: '\\begin{cases} a \\\\ b \\end{cases}' },
      { label: 'vec',        latex: '\\vec{v}' },
      { label: 'hat',        latex: '\\hat{x}' },
      { label: 'bar',        latex: '\\bar{x}' },
      { label: 'det',        latex: '\\det A' },
    ]},
    { cat: 'أحرف لاتينية', items: [
      { label: 'x',  latex: 'x' },
      { label: 'y',  latex: 'y' },
      { label: 'z',  latex: 'z' },
      { label: 'a',  latex: 'a' },
      { label: 'b',  latex: 'b' },
      { label: 'c',  latex: 'c' },
      { label: 'f(x)', latex: 'f(x)' },
      { label: 'dx',  latex: 'dx' },
      { label: 'dy',  latex: 'dy' },
      { label: '≠0', latex: '\\neq 0' },
      { label: 'x∈ℝ', latex: 'x \\in \\mathbb{R}' },
      { label: 'ℕ',  latex: '\\mathbb{N}' },
      { label: 'ℤ',  latex: '\\mathbb{Z}' },
      { label: 'ℚ',  latex: '\\mathbb{Q}' },
      { label: 'ℝ',  latex: '\\mathbb{R}' },
      { label: 'ℂ',  latex: '\\mathbb{C}' },
    ]},
  ];

  host.innerHTML = '';
  TEMPLATES.forEach(cat => {
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
        if (window.katex) {
          window.katex.render(item.latex, inner, {
            throwOnError: false, displayMode: false, output: 'html'
          });
        } else {
          inner.textContent = item.label;
        }
      } catch (e) {
        inner.textContent = item.label;
      }

      btn.appendChild(inner);
      btn.title = item.latex;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const ta = document.getElementById('eqTextarea');
        if (!ta) return;
        const pos = ta.selectionStart || ta.value.length;
        const before = ta.value.substring(0, pos);
        const after = ta.value.substring(pos);
        ta.value = before + item.latex + after;
        const newPos = pos + item.latex.length;
        ta.focus();
        try { ta.setSelectionRange(newPos, newPos); } catch (_) {}
        ta.dispatchEvent(new Event('input', { bubbles: true }));
      });
      grid.appendChild(btn);
    });

    host.appendChild(grid);
  });
}

/* ============================================================
   §9. PRESENT MODE
   ============================================================ */
const presentState = {
  active: false,
  tool: 'select',
  undoStack: [],
  redoStack: [],
  timerStart: 0,
  timerInterval: null,
  keyListener: null,
};

async function openPresentMode() {
  if (presentState.active) return;
  presentState.active = true;

  const overlay = document.getElementById('presentOverlay');
  if (!overlay) return;
  overlay.classList.add('active');
  document.body.classList.add('present-active');

  setPresentTool('select');
  updatePresentUndoRedo();
  resetPresentTimer();
  startPresentTimer();
  updatePresentPageNum();
  copyStageToPresent();
  bindPresentKeys();
  bindPresentToolbar();

  const bar = document.getElementById('presentToolbar');
  if (bar) {
    bar.classList.add('show');
    setTimeout(() => bar.classList.remove('show'), 2500);
  }

  document.addEventListener('ipb:pageChanged', onPresentPageChanged);
}

function closePresentMode() {
  if (!presentState.active) return;
  presentState.active = false;
  const overlay = document.getElementById('presentOverlay');
  if (overlay) overlay.classList.remove('active');
  document.body.classList.remove('present-active');
  stopPresentTimer();
  unbindPresentKeys();
  document.removeEventListener('ipb:pageChanged', onPresentPageChanged);
  presentState.undoStack = [];
  presentState.redoStack = [];
  updatePresentUndoRedo();
}

function onPresentPageChanged() {
  copyStageToPresent();
  updatePresentPageNum();
}

function copyStageToPresent() {
  const stage = document.getElementById('stage');
  const presentStage = document.getElementById('presentStage');
  const presentCanvas = document.getElementById('presentCanvas');
  const pdfCanvas = document.getElementById('pdfCanvas');
  const presentLayerHost = document.getElementById('presentLayerHost');
  const svgLayer = document.getElementById('svgLayer');
  if (!stage || !presentStage || !pdfCanvas || !presentCanvas) return;

  const stageRect = stage.getBoundingClientRect();
  const vw = window.innerWidth * 0.9;
  const vh = window.innerHeight * 0.9;
  const aspect = stageRect.width / stageRect.height;
  let w = vw;
  let h = w / aspect;
  if (h > vh) { h = vh; w = h * aspect; }
  presentStage.style.width = w + 'px';
  presentStage.style.height = h + 'px';

  presentCanvas.width = pdfCanvas.width;
  presentCanvas.height = pdfCanvas.height;
  presentCanvas.getContext('2d').drawImage(pdfCanvas, 0, 0);

  if (presentLayerHost && svgLayer) {
    presentLayerHost.innerHTML = '';
    const clone = svgLayer.cloneNode(true);
    clone.setAttribute('width', '100%');
    clone.setAttribute('height', '100%');
    clone.style.width = '100%';
    clone.style.height = '100%';
    presentLayerHost.appendChild(clone);
  }

  const presentLaser = document.getElementById('presentLaser');
  if (presentLaser) {
    presentLaser.width = pdfCanvas.width;
    presentLaser.height = pdfCanvas.height;
  }
}

function updatePresentPageNum() {
  const el = document.getElementById('presentPageNum');
  const indicator = document.getElementById('pageIndicator');
  if (el && indicator) el.textContent = indicator.textContent || '— / —';
}

function setPresentTool(tool) {
  presentState.tool = tool;
  const bar = document.getElementById('presentToolbar');
  if (!bar) return;
  bar.querySelectorAll('[data-ptool]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.ptool === tool);
  });
  document.dispatchEvent(new CustomEvent('ipb:presentToolChanged', {
    detail: { tool: tool }
  }));
}

function bindPresentToolbar() {
  const bar = document.getElementById('presentToolbar');
  if (!bar) return;
  bar.querySelectorAll('[data-ptool]').forEach(btn => {
    btn.addEventListener('click', () => setPresentTool(btn.dataset.ptool));
  });
  const u = document.getElementById('presentUndo');
  const r = document.getElementById('presentRedo');
  const clr = document.getElementById('presentClear');
  const prev = document.getElementById('presentPrev');
  const next = document.getElementById('presentNext');
  const exit = document.getElementById('presentExit');
  if (u) u.addEventListener('click', presentUndo);
  if (r) r.addEventListener('click', presentRedo);
  if (clr) clr.addEventListener('click', presentClearAll);
  if (prev) prev.addEventListener('click', presentPrevPage);
  if (next) next.addEventListener('click', presentNextPage);
  if (exit) exit.addEventListener('click', closePresentMode);
}

async function presentPrevPage() {
  try {
    const pdf = await import('./pdf.js');
    const state = (await import('./core.js')).state;
    if (state.currentPage > 1) await pdf.goToPage(state.currentPage - 1);
  } catch (e) { console.warn(e); }
}
async function presentNextPage() {
  try {
    const pdf = await import('./pdf.js');
    const state = (await import('./core.js')).state;
    if (state.currentPage < state.totalPages) await pdf.goToPage(state.currentPage + 1);
  } catch (e) { console.warn(e); }
}
function presentUndo() {
  if (!presentState.undoStack.length) return;
  const item = presentState.undoStack.pop();
  presentState.redoStack.push(item);
  if (item.el && item.el.parentNode) item.el.style.display = 'none';
  updatePresentUndoRedo();
}
function presentRedo() {
  if (!presentState.redoStack.length) return;
  const item = presentState.redoStack.pop();
  presentState.undoStack.push(item);
  if (item.el && item.el.parentNode) item.el.style.display = '';
  updatePresentUndoRedo();
}
function presentClearAll() {
  const host = document.getElementById('presentLayerHost');
  if (host) host.querySelectorAll('[data-present-annot]').forEach(el => el.remove());
  presentState.undoStack = [];
  presentState.redoStack = [];
  updatePresentUndoRedo();
}
function updatePresentUndoRedo() {
  const u = document.getElementById('presentUndo');
  const r = document.getElementById('presentRedo');
  if (u) u.disabled = presentState.undoStack.length === 0;
  if (r) r.disabled = presentState.redoStack.length === 0;
}
function resetPresentTimer() {
  presentState.timerStart = Date.now();
  updatePresentTimerDisplay();
}
function startPresentTimer() {
  stopPresentTimer();
  presentState.timerInterval = setInterval(updatePresentTimerDisplay, 1000);
}
function stopPresentTimer() {
  if (presentState.timerInterval) {
    clearInterval(presentState.timerInterval);
    presentState.timerInterval = null;
  }
}
function updatePresentTimerDisplay() {
  const el = document.getElementById('presentTimer');
  if (!el) return;
  const elapsed = Math.floor((Date.now() - presentState.timerStart) / 1000);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');
  el.textContent = mm + ':' + ss;
}
function bindPresentKeys() {
  presentState.keyListener = (e) => {
    if (!presentState.active) return;
    if (e.key === 'Escape') { closePresentMode(); return; }
    if (e.key === 'ArrowRight') { presentNextPage(); return; }
    if (e.key === 'ArrowLeft') { presentPrevPage(); return; }
    if (e.key === 'p' || e.key === 'P') { setPresentTool('pen'); return; }
    if (e.key === 'h' || e.key === 'H') { setPresentTool('hand'); return; }
    if (e.key === 'l' || e.key === 'L') { setPresentTool('laser'); return; }
    if (e.key === 'e' || e.key === 'E') { setPresentTool('eraser'); return; }
    if (e.key === 'v' || e.key === 'V') { setPresentTool('select'); return; }
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      if (e.shiftKey) presentRedo();
      else presentUndo();
    }
  };
  document.addEventListener('keydown', presentState.keyListener);
}
function unbindPresentKeys() {
  if (presentState.keyListener) {
    document.removeEventListener('keydown', presentState.keyListener);
    presentState.keyListener = null;
  }
}

/* ============================================================
   §10. LAYERS OBSERVER
   ============================================================ */
let _layersObserver = null;
function initLayersObserver() {
  if (_layersObserver) return;
  const stageContent = document.getElementById('stageContent');
  if (!stageContent) return;
  _layersObserver = new MutationObserver(() => refreshLayersPanel());
  _layersObserver.observe(stageContent, { childList: true, subtree: true });
  refreshLayersPanel();
}

function initPageChangeListener() {
  document.addEventListener('ipb:pageChanged', () => {
    setTimeout(refreshLayersPanel, 50);
  });
}

/* ============================================================
   §11. GLOBAL SHORTCUTS
   ============================================================ */
function initGlobalShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'F5') {
      e.preventDefault();
      if (presentState.active) closePresentMode();
      else openPresentMode();
    }
  });
}

/* ============================================================
   §12. INIT
   ============================================================ */
export function initUIShell() {
  applyVersion();
  initPropsTabs();
  initBottomPanel();
  initTopbarActions();
  initGlobalShortcuts();
  setupEquationBackdropMirror();
  initPropsToggle();

  setTimeout(() => {
    initLayersObserver();
    initPageChangeListener();
    refreshLayersPanel();
  }, 500);
}

if (typeof window !== 'undefined') {
  window.__UI_SHELL__ = {
    version: APP_VERSION,
    openPresent: openPresentMode,
    closePresent: closePresentMode,
    refreshLayers: refreshLayersPanel,
    openEquation: () => {
      const bd = document.getElementById('equationBackdrop');
      if (bd) bd.classList.add('show');
    }
  };
}