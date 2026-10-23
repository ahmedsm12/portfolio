/* ============================================================
 * ui-shell.js — الواجهة الجديدة
 * ============================================================
 *  ★ Undo شامل عبر الشرائح (Session 1)
 *  ★ Notes محفوظ ومعروض في وضع العرض (Session 2)
 *  ★ Tilt يدور حول مركز العنصر (Session 3)
 *  ★ نسبة الزوم صادقة (Session 4)
 *  ★ Save Over + Present Touch Toggle (Session 6)
 * ============================================================ */

export const APP_VERSION = '0.6.0';

import { toast, state } from './core.js';
import * as shapes from './shapes.js';

function safeToast(msg, type) {
  try {
    if (typeof toast === 'function') toast(msg, type);
    else {
      const el = document.createElement('div');
      el.className = 'toast' + (type ? ' ' + type : '');
      el.textContent = msg;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 2400);
    }
  } catch (_) { console.log(msg); }
}

/* ═══════════════════════════════════════════════════════════
   §1. VERSION
   ═══════════════════════════════════════════════════════════ */
function applyVersion() {
  const el = document.getElementById('appVersion');
  if (el) el.textContent = 'v' + APP_VERSION;
}

/* ═══════════════════════════════════════════════════════════
   §2. SAVE BADGE — يعكس dirty (Session 1)
   ═══════════════════════════════════════════════════════════ */
function setSaveBadge(text, saving) {
  const txt = document.getElementById('saveBadgeText');
  const dot = document.querySelector('#saveBadge .save-dot');
  if (txt) txt.textContent = text || (state.dirty ? 'غير محفوظ' : 'محفوظ');
  if (dot) {
    dot.classList.toggle('saving', !!saving);
    dot.classList.toggle('dirty', !saving && state.dirty);
  }
}

/* ═══════════════════════════════════════════════════════════
   §3. PROPS TABS
   ═══════════════════════════════════════════════════════════ */
let _activeShapeCat = 'all';
let _shapeSearchQuery = '';

const SHAPES_LIBRARY_DATA = [
  { id: 'rect', label: 'مستطيل', cat: 'basic', icon: '<rect x="3" y="5" width="18" height="14" rx="1" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="2"/>' },
  { id: 'rounded-rect', label: 'مستطيل مدور', cat: 'basic', icon: '<rect x="3" y="5" width="18" height="14" rx="5" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="2"/>' },
  { id: 'circle', label: 'دائرة / بيضاوي', cat: 'basic', icon: '<circle cx="12" cy="12" r="9" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="2"/>' },
  { id: 'triangle', label: 'مثلث متساوي', cat: 'basic', icon: '<polygon points="12,3 21,20 3,20" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="2"/>' },
  { id: 'right-triangle', label: 'مثلث قائم', cat: 'basic', icon: '<polygon points="4,4 4,20 20,20" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="2"/>' },
  { id: 'diamond', label: 'معين هندسي', cat: 'basic', icon: '<polygon points="12,3 21,12 12,21 3,12" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="2"/>' },
  { id: 'star', label: 'نجمة خماسية', cat: 'basic', icon: '<polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="2"/>' },
  { id: 'hexagon', label: 'مسدس منتظم', cat: 'basic', icon: '<polygon points="7,3 17,3 22,12 17,21 7,21 2,12" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="2"/>' },
  { id: 'cylinder', label: 'أسطوانة 3D', cat: 'basic', icon: '<path d="M4 6 C4 3, 20 3, 20 6 L20 18 C20 21, 4 21, 4 18 Z M4 6 C4 9, 20 9, 20 6" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="2"/>' },
  { id: 'block-arrow', label: 'سهم عريض', cat: 'basic', icon: '<path d="M3 9 L13 9 L13 5 L21 12 L13 19 L13 15 L3 15 Z" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="2"/>' },
  { id: 'line', label: 'خط مستقيم', cat: 'lines', icon: '<line x1="3" y1="21" x2="21" y2="3" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>' },
  { id: 'arrow', label: 'سهم أحادي', cat: 'lines', icon: '<path d="M4 20 L20 4 M12 4 L20 4 L20 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' },
  { id: 'double-arrow', label: 'سهم مزدوج', cat: 'lines', icon: '<path d="M4 20 L20 4 M7 20 L4 20 L4 17 M17 4 L20 4 L20 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' },
  { id: 'curve', label: 'منحنى بيزير', cat: 'lines', icon: '<path d="M3 18 Q12 2 21 18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>' },
  { id: 'circuit-battery', label: 'بطارية DC', cat: 'circuits', icon: '<path d="M2 12 L9 12 M9 6 L9 18 M15 9 L15 15 M15 12 L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' },
  { id: 'circuit-resistor', label: 'مقاومة R', cat: 'circuits', icon: '<path d="M2 12 L6 12 L8 7 L11 17 L14 7 L17 17 L19 12 L22 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' },
  { id: 'circuit-lamp', label: 'مصباح كهربائي', cat: 'circuits', icon: '<circle cx="12" cy="12" r="8" fill="currentColor" fill-opacity="0.1" stroke="currentColor" stroke-width="2"/><path d="M7 7 L17 17 M17 7 L7 17" stroke="currentColor" stroke-width="2"/>' },
  { id: 'circuit-switch', label: 'مفتاح مفتوح', cat: 'circuits', icon: '<circle cx="5" cy="12" r="2" fill="currentColor"/><circle cx="19" cy="12" r="2" fill="currentColor"/><path d="M6 11 L16 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' },
  { id: 'circuit-switch-closed', label: 'مفتاح مغلق', cat: 'circuits', icon: '<circle cx="5" cy="12" r="2" fill="currentColor"/><circle cx="19" cy="12" r="2" fill="currentColor"/><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2"/>' },
  { id: 'circuit-capacitor', label: 'مكثف C', cat: 'circuits', icon: '<path d="M2 12 L10 12 M10 6 L10 18 M14 6 L14 18 M14 12 L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' },
  { id: 'circuit-inductor', label: 'ملف محث L', cat: 'circuits', icon: '<path d="M2 14 C4 14 5 7 8 7 C11 7 11 14 14 14 C17 14 17 7 20 7 C22 7 22 14 22 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' },
  { id: 'circuit-ground', label: 'تأريض أرضي', cat: 'circuits', icon: '<path d="M12 4 L12 12 M6 12 L18 12 M8 15 L16 15 M10 18 L14 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' },
  { id: 'cartesian', label: 'مستوى ديكارتي', cat: 'math', icon: '<path d="M3 12 L21 12 M12 3 L12 21 M21 12 L18 9 M21 12 L18 15 M12 3 L9 6 M12 3 L15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/>' },
];

export function switchPropsTab(tabName) {
  const root = document.getElementById('propsRight');
  if (!root) return;
  if (tabName === 'shapes') tabName = 'design';

  const tabs = root.querySelectorAll('.props-tab');
  const panels = root.querySelectorAll('.props-panel');
  tabs.forEach(t => t.classList.toggle('active', t.dataset.ptab === tabName));
  panels.forEach(p => {
    p.style.display = p.dataset.ppanel === tabName ? 'block' : 'none';
  });

  document.body.classList.remove('props-collapsed');
  document.body.classList.remove('props-hidden');
  document.body.classList.add('props-mobile-open');

  const btn = document.getElementById('btnToggleProps');
  if (btn) btn.classList.remove('collapsed');

  if (tabName === 'design') updateDesignTabContent();
  if (tabName === 'effects') renderEffectsPanel();
  if (tabName === 'anim') {
  import('./ui-animation.js')
    .then(m => m.renderAnimationPanel())
    .catch(err => console.warn('Animation panel failed:', err));
}
  if (tabName === 'ai') import('./ui-ai-design.js').then(m => m.renderAiDesignPanel());
}

export async function updateDesignTabContent() {
  const core = await import('./core.js');
  const shapesPanel = document.getElementById('shapesLibraryPanel');
  const textPanel = document.getElementById('textToolDesignPanel');
  const elemPanel = document.getElementById('selectedElementPropsPanel');
  const docPanel = document.getElementById('documentInfoPanel');

  const selList = core.state.selectedList || [];
  const hasSelection = selList.length > 0 || !!core.state.selected;

  if (hasSelection) {
    if (shapesPanel) shapesPanel.style.display = 'none';
    if (textPanel) textPanel.style.display = 'none';
    if (docPanel) docPanel.style.display = 'none';
    if (elemPanel) elemPanel.style.display = 'block';
  } else if (core.state.tool === 'shape') {
    if (elemPanel) elemPanel.style.display = 'none';
    if (textPanel) textPanel.style.display = 'none';
    if (docPanel) docPanel.style.display = 'none';
    if (shapesPanel) { shapesPanel.style.display = 'block'; renderShapesLibrary(); }
  } else if (core.state.tool === 'text') {
    if (elemPanel) elemPanel.style.display = 'none';
    if (shapesPanel) shapesPanel.style.display = 'none';
    if (docPanel) docPanel.style.display = 'none';
    if (textPanel) { textPanel.style.display = 'block'; renderTextToolDesignPanel(); }
  } else {
    if (shapesPanel) shapesPanel.style.display = 'none';
    if (textPanel) textPanel.style.display = 'none';
    if (elemPanel) elemPanel.style.display = 'none';
    if (docPanel) docPanel.style.display = 'block';
  }
}

export async function renderTextToolDesignPanel() {
  const host = document.getElementById('textToolDesignPanel');
  if (!host) return;
  const core = await import('./core.js');
  const inter = await import('./interaction.js');
  const state = core.state;

  const curFont = state.textFamily || 'Cairo, sans-serif';
  const curSize = state.textSize || 24;
  const curColor = state.textColor || '#1e3a8a';
  const curBg = state.textBg || '';

  host.innerHTML = `
    <div class="tt-panel-container">
      <div class="tt-header">
        <div class="tt-title"><span>✍️ إعدادات الكتابة والنصوص</span></div>
        <div class="tt-subtitle">انقر في أي مكان داخل الشريحة للبدء في الكتابة، أو أدرج مربع نص تلقائي في المنتصف.</div>
      </div>
      <div class="prop-section">
        <div class="prop-title">حجم ولون الخط</div>
        <div class="prop-row">
          <div class="prop-field"><label>حجم الخط (px)</label><input type="number" class="prop-input" id="ttDefaultSize" value="${curSize}" min="10" max="180"></div>
          <div class="prop-field"><label>لون الخط</label><input type="color" class="prop-input" id="ttDefaultColor" value="${curColor.startsWith('#') ? curColor : '#1e3a8a'}" style="padding:2px;height:28px"></div>
        </div>
        <div class="prop-row" style="margin-top:8px">
          <div class="prop-field" style="grid-column: 1 / -1">
            <label>🎨 لون تعبئة خلفية مربع النص</label>
            <div style="display:flex;gap:6px;align-items:center">
              <input type="color" class="prop-input" id="ttDefaultBgColor" value="${curBg && curBg.startsWith('#') ? curBg : '#ffffff'}" style="padding:2px;height:28px;flex:1">
              <button type="button" class="prop-input ${!curBg || curBg === 'transparent' || curBg === 'none' ? 'active' : ''}" id="ttDefaultBgNone" style="cursor:pointer;font-size:11px;padding:0 12px;height:28px">شفاف</button>
            </div>
          </div>
        </div>
        <div class="prop-row" style="grid-template-columns:1fr 1fr 1fr;gap:4px;margin-top:8px">
          <button type="button" class="prop-input ${state.textBold ? 'active' : ''}" id="ttDefaultBold" style="cursor:pointer;font-weight:bold">B عريض</button>
          <button type="button" class="prop-input ${state.textItalic ? 'active' : ''}" id="ttDefaultItalic" style="cursor:pointer;font-style:italic">I مائل</button>
          <button type="button" class="prop-input" id="ttDefaultAlign" style="cursor:pointer">محاذاة ⇄</button>
        </div>
      </div>
      <div class="prop-section">
        <button type="button" class="tt-btn-primary" id="ttInsertCenterBtn">➕ إدراج مربع نص في وسط الشريحة</button>
      </div>
    </div>
  `;

  const sSize = document.getElementById('ttDefaultSize');
  const sColor = document.getElementById('ttDefaultColor');
  const sBg = document.getElementById('ttDefaultBgColor');
  const sBgNone = document.getElementById('ttDefaultBgNone');
  const sBold = document.getElementById('ttDefaultBold');
  const sItalic = document.getElementById('ttDefaultItalic');
  const sAlign = document.getElementById('ttDefaultAlign');
  const btnInsert = document.getElementById('ttInsertCenterBtn');

  if (sSize) sSize.addEventListener('change', () => { state.textSize = parseInt(sSize.value, 10) || 24; });
  if (sColor) sColor.addEventListener('input', () => { state.textColor = sColor.value; });
  if (sBg) sBg.addEventListener('input', () => { state.textBg = sBg.value; if (sBgNone) sBgNone.classList.remove('active'); });
  if (sBgNone) sBgNone.addEventListener('click', () => { state.textBg = ''; sBgNone.classList.add('active'); });
  if (sBold) sBold.addEventListener('click', () => { state.textBold = !state.textBold; sBold.classList.toggle('active', state.textBold); });
  if (sItalic) sItalic.addEventListener('click', () => { state.textItalic = !state.textItalic; sItalic.classList.toggle('active', state.textItalic); });
  if (sAlign) sAlign.addEventListener('click', () => {
    const cur = state.textAlign || 'right';
    state.textAlign = cur === 'right' ? 'center' : (cur === 'center' ? 'left' : 'right');
    core.toast('تم تغيير المحاذاة إلى: ' + state.textAlign, 'info');
  });

  if (btnInsert) btnInsert.addEventListener('click', () => {
    const pre = core.snapshot();
    const el = inter.addTextBox({
      x: '35%', y: '40%', w: '260px', h: 'auto',
      text: 'اكتب النص هنا...',
      fontSize: state.textSize || 24,
      fontFamily: state.textFamily || 'Cairo, sans-serif',
      fontWeight: state.textBold ? 'bold' : 'normal',
      fontStyle: state.textItalic ? 'italic' : 'normal',
      color: state.textColor || '#1e3a8a',
      bg: state.textBg || '',
      align: state.textAlign || 'right',
      dir: 'rtl',
    }, true);
    core.commitChange(pre);
    inter.selectTextBox(el);
    core.toast('تم إدراج مربع النص بنجاح ✨', 'ok');
  });
}

export function initPropsTabs() {
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
      if (key === 'design') updateDesignTabContent();
      if (key === 'effects') renderEffectsPanel();
      if (key === 'anim') {
  import('./ui-animation.js')
    .then(m => m.renderAnimationPanel())
    .catch(err => console.warn('Animation panel failed:', err));
}
      if (key === 'ai') import('./ui-ai-design.js').then(m => m.renderAiDesignPanel());
    });
  });

  // ★★ Session 2 — مزامنة اللوحة النشطة مع تغيير التحديد / التراجع / الصفحة
  function refreshActivePropsTab() {
    const activeTabEl = root.querySelector('.props-tab.active');
    const key = activeTabEl ? activeTabEl.dataset.ptab : null;
    if (key === 'effects') renderEffectsPanel();
    else if (key === 'anim') import('./ui-animation.js').then(m => m.renderAnimationPanel());
    else if (key === 'design') updateDesignTabContent();
  }

  document.addEventListener('ipb:selectionChanged', refreshActivePropsTab);
  document.addEventListener('ipb:snapshotApplied', refreshActivePropsTab);
  document.addEventListener('ipb:pageChanged', refreshActivePropsTab);

  document.addEventListener('ipb:toolChanged', (e) => {
    const tool = e.detail && e.detail.tool;
    if (tool === 'shape' || tool === 'text') switchPropsTab('design');
    else updateDesignTabContent();
  });
}

/* ═══════════════════════════════════════════════════════════
   §4. SHAPES LIBRARY
   ═══════════════════════════════════════════════════════════ */
export async function renderShapesLibrary() {
  const panel = document.getElementById('shapesLibraryPanel');
  if (!panel) return;

  const core = await import('./core.js');
  const state = core.state;

  const categories = [
    { id: 'all', label: 'الكل' },
    { id: 'basic', label: '🔷 هندسية' },
    { id: 'lines', label: '〰️ خطوط وأسهم' },
    { id: 'circuits', label: '⚡ دارات كهربائية' },
    { id: 'math', label: '📈 ديكارتي' },
  ];

  const filtered = SHAPES_LIBRARY_DATA.filter(sh => {
    const matchCat = _activeShapeCat === 'all' || sh.cat === _activeShapeCat;
    const matchQuery = !_shapeSearchQuery || sh.label.includes(_shapeSearchQuery) || sh.id.includes(_shapeSearchQuery);
    return matchCat && matchQuery;
  });

  const curStroke = state.shapeColor || '#2563eb';
  const curFill = state.shapeFill || 'none';
  const curSW = state.shapeSize || 4;
  const curRadius = state.shapeCornerRadius || 24;

  panel.innerHTML = `
    <div class="shlib-container">
      <div class="shlib-header">
        <div class="shlib-title">
          <span>📐 مكتبة الأشكال والدارات</span>
          <span class="shlib-badge">${state.shapeKind || 'rect'}</span>
        </div>
        <p class="shlib-subtitle">انقر على الشكل لاختياره والرسم على الكانفاس، أو اضغط زر "إدراج" لوضعه مباشرة في الشريحة.</p>
      </div>
      <div class="shlib-search-box">
        <input type="text" class="shlib-search-input" id="shlibSearchInput" placeholder="🔍 بحث عن شكل أو دارة..." value="${_shapeSearchQuery}">
      </div>
      <div class="shlib-cats">
        ${categories.map(c => `<button type="button" class="shlib-cat-btn ${_activeShapeCat === c.id ? 'active' : ''}" data-cat="${c.id}">${c.label}</button>`).join('')}
      </div>
      <div class="shlib-style-bar">
        <div class="shlib-style-row">
          <div class="shlib-style-col">
            <label>الحدود</label>
            <input type="color" id="shlibStrokeColor" value="${curStroke.startsWith('#') ? curStroke : '#2563eb'}" class="shlib-color-pick">
          </div>
          <div class="shlib-style-col">
            <label>التعبئة</label>
            <div style="display:flex;gap:4px;align-items:center">
              <input type="color" id="shlibFillColor" value="${curFill.startsWith('#') ? curFill : '#3b82f6'}" class="shlib-color-pick">
              <button type="button" id="shlibFillNoneBtn" class="shlib-mini-btn ${curFill === 'none' ? 'active' : ''}" title="شفاف بدون تعبئة">شفاف</button>
            </div>
          </div>
        </div>
        <div class="shlib-style-row" style="margin-top:6px">
          <div class="shlib-style-col">
            <label>السمك: <span id="shlibSWVal">${curSW}px</span></label>
            <div class="shlib-sizes-row">
              ${[1,2,4,8,12,16].map(sz => `<button type="button" class="shlib-sz-btn ${sz === curSW ? 'active' : ''}" data-sz="${sz}">${sz}</button>`).join('')}
            </div>
          </div>
        </div>
        ${state.shapeKind === 'rounded-rect' ? `
          <div class="shlib-style-row" style="margin-top:6px">
            <div class="shlib-style-col" style="width:100%">
              <label>استدارة الزوايا: <span id="shlibRadiusVal">${curRadius}px</span></label>
              <input type="range" id="shlibRadiusSlider" min="0" max="60" value="${curRadius}" style="width:100%;accent-color:var(--sh-accent)">
            </div>
          </div>
        ` : ''}
      </div>
      <div class="shlib-grid">
        ${filtered.map(item => {
          const isActive = (state.shapeKind || 'rect') === item.id;
          return `
            <div class="shlib-card ${isActive ? 'active' : ''}" data-shape="${item.id}" title="${item.label}">
              <div class="shlib-card-icon"><svg viewBox="0 0 24 24" width="36" height="36">${item.icon}</svg></div>
              <div class="shlib-card-name">${item.label}</div>
              <button type="button" class="shlib-insert-btn" data-insert="${item.id}" title="إدراج في وسط الشريحة">➕ إدراج</button>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  const searchInput = document.getElementById('shlibSearchInput');
  if (searchInput) searchInput.addEventListener('input', e => {
    _shapeSearchQuery = e.target.value.trim();
    renderShapesLibrary();
  });

  panel.querySelectorAll('.shlib-cat-btn').forEach(btn => {
    btn.addEventListener('click', () => { _activeShapeCat = btn.dataset.cat; renderShapesLibrary(); });
  });

  const strInp = document.getElementById('shlibStrokeColor');
  if (strInp) strInp.addEventListener('input', () => {
    state.shapeColor = strInp.value;
    document.dispatchEvent(new CustomEvent('ipb:toolConfigChanged'));
  });

  const fillInp = document.getElementById('shlibFillColor');
  const fillNone = document.getElementById('shlibFillNoneBtn');
  if (fillInp) fillInp.addEventListener('input', () => {
    state.shapeFill = fillInp.value;
    if (fillNone) fillNone.classList.remove('active');
    document.dispatchEvent(new CustomEvent('ipb:toolConfigChanged'));
  });
  if (fillNone) fillNone.addEventListener('click', () => {
    state.shapeFill = 'none';
    fillNone.classList.add('active');
    document.dispatchEvent(new CustomEvent('ipb:toolConfigChanged'));
  });

  panel.querySelectorAll('.shlib-sz-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const sz = parseInt(btn.dataset.sz, 10);
      state.shapeSize = sz;
      const val = document.getElementById('shlibSWVal');
      if (val) val.textContent = sz + 'px';
      panel.querySelectorAll('.shlib-sz-btn').forEach(b => b.classList.toggle('active', parseInt(b.dataset.sz, 10) === sz));
      document.dispatchEvent(new CustomEvent('ipb:toolConfigChanged'));
    });
  });

  const rSlider = document.getElementById('shlibRadiusSlider');
  if (rSlider) rSlider.addEventListener('input', e => {
    state.shapeCornerRadius = parseInt(e.target.value, 10) || 0;
    const lbl = document.getElementById('shlibRadiusVal');
    if (lbl) lbl.textContent = state.shapeCornerRadius + 'px';
    document.dispatchEvent(new CustomEvent('ipb:toolConfigChanged'));
  });

  panel.querySelectorAll('.shlib-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('.shlib-insert-btn')) return;
      state.shapeKind = card.dataset.shape;
      import('./main.js').then(m => m.setTool('shape'));
      renderShapesLibrary();
    });
  });

  panel.querySelectorAll('.shlib-insert-btn').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      state.shapeKind = btn.dataset.insert;
      await insertShapeInSlide(btn.dataset.insert);
      renderShapesLibrary();
    });
  });
}

export async function insertShapeInSlide(shapeKind, options = {}) {
  const inter = await import('./interaction.js');
  const core = await import('./core.js');

  const pdfW = core.state.pdfW || 2000;
  const pdfH = core.state.pdfH || 2828;
  const w = options.width || (shapeKind === 'cartesian' ? 650 : (shapeKind.startsWith('circuit-') ? 220 : 280));
  const h = options.height || (shapeKind === 'cartesian' ? 650 : (shapeKind.startsWith('circuit-') ? 140 : 180));
  const cx = pdfW / 2;
  const cy = pdfH / 2;
  const s = { x: cx - w / 2, y: cy - h / 2 };
  const p = { x: cx + w / 2, y: cy + h / 2 };

  const stroke = options.stroke || core.state.shapeColor || '#2563eb';
  const fill = options.fill || (core.state.shapeFill || 'none');
  const strokeWidth = options.strokeWidth || core.state.shapeSize || 4;

  const pre = core.snapshot();
  const el = shapes.createShapeElement(shapeKind, core.state, s);
  shapes.updateShapeDuringDraw(shapeKind, el, s, p, core.state);

  el.dataset.x = s.x;
  el.dataset.y = s.y;
  el.dataset.w = w;
  el.dataset.h = h;
  el.setAttribute('stroke', stroke);
  el.setAttribute('fill', fill);
  el.setAttribute('stroke-width', String(strokeWidth));

  const svgLayer = document.getElementById('svgLayer');
  if (svgLayer) {
    const wrap = inter.createAnnotWrapper(el);
    svgLayer.appendChild(wrap);
    core.commitChange(pre);
    inter.selectAnnotation(el);
    core.savePageNow();
    core.toast('تم إدراج الشكل في الشريحة بنجاح ✨', 'ok');
  }
}

/* ═══════════════════════════════════════════════════════════
   §5. VISUAL EFFECTS
   ═══════════════════════════════════════════════════════════ */
function getEffectsListFromElement(el) {
  if (!el) return [];
  try {
    const raw = el.dataset.effectsList || el.dataset.effects;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      const arr = [];
      if (parsed.shadow && parsed.shadow.active) arr.push({ id: 'fx_' + Math.random().toString(36).slice(2, 7), type: 'shadow', name: 'ظل ساقط', active: true, ...parsed.shadow });
      if (parsed.glow && parsed.glow.active) arr.push({ id: 'fx_' + Math.random().toString(36).slice(2, 7), type: 'glow', name: 'توهج خارجي', active: true, ...parsed.glow });
      if (parsed.stroke && parsed.stroke.active) arr.push({ id: 'fx_' + Math.random().toString(36).slice(2, 7), type: 'stroke', name: 'إطار وحدود', active: true, ...parsed.stroke });
      if (parsed.fill && parsed.fill.active) arr.push({ id: 'fx_' + Math.random().toString(36).slice(2, 7), type: 'fill', name: 'تعبئة وتدرج', active: true, ...parsed.fill });
      if (parsed.blur && parsed.blur.active) arr.push({ id: 'fx_' + Math.random().toString(36).slice(2, 7), type: 'blur', name: 'تمويه زجاجي', active: true, ...parsed.blur });
      if (parsed.tilt && parsed.tilt.active) arr.push({ id: 'fx_' + Math.random().toString(36).slice(2, 7), type: 'tilt', name: 'بعد 3D', active: true, ...parsed.tilt });
      return arr;
    }
  } catch (_) {}
  return [];
}

/* ═══════════════════════════════════════════════════════════
   §5. VISUAL EFFECTS — Redesigned (v2)
   ═══════════════════════════════════════════════════════════ */

const FX_TYPES = {
  shadow: { icon: '☁️', name: 'ظل', cost: 1, isGlass: false, controls: ['shadow'] },
  glow: { icon: '💡', name: 'توهج', cost: 2, isGlass: false, controls: ['glow'] },
  stroke: { icon: '📐', name: 'حدود', cost: 0.5, isGlass: false, controls: ['stroke'] },
  fill: { icon: '🎨', name: 'تعبئة', cost: 0.5, isGlass: false, controls: ['fill'] },
  blur: { icon: '🔍', name: 'تمويه', cost: 3, isGlass: false, controls: ['blur'] },
  tilt: { icon: '📐', name: '3D', cost: 2, isGlass: false, controls: ['tilt'] },
  'liquid-glass': { icon: '🔮', name: 'Liquid Glass', cost: 15, isGlass: true, controls: ['glass'] },
};

const FX_DEFAULTS = {
  shadow: { x: 0, y: 12, blur: 24, color: '#000000', opacity: 0.4 },
  glow: { color: '#3b82f6', blur: 20, spread: 2 },
  stroke: { color: '#3b82f6', width: 3, style: 'solid' },
  fill: { fillType: 'gradient', c1: '#3b82f6', c2: '#9333ea', angle: 45 },
  blur: { val: 8 },
  tilt: { rx: 15, ry: -15 },
  'liquid-glass': { blur: 18, refraction: 0.15, aberration: 0.03, edgeGlow: 0.6, tint: '#ffffff' },
};

const FX_PRESETS = [
  { id: 'soft-card', icon: '💳', name: 'Soft Card',
    effects: [
      { type: 'shadow', params: { x: 0, y: 8, blur: 24, color: '#000', opacity: 0.25 } },
      { type: 'stroke', params: { color: '#ffffff', width: 1, style: 'solid' } },
    ] },
  { id: 'neon-glow', icon: '🌟', name: 'Neon',
    effects: [
      { type: 'glow', params: { color: '#7c3aed', blur: 30, spread: 3 } },
      { type: 'glow', params: { color: '#a78bfa', blur: 12, spread: 1 } },
    ] },
  { id: 'glass-morph', icon: '🔮', name: 'Glass Morph',
    effects: [
      { type: 'liquid-glass', params: {} },
      { type: 'shadow', params: { x: 0, y: 6, blur: 16, color: '#000', opacity: 0.3 } },
    ] },
  { id: 'sharp', icon: '🎯', name: 'Sharp',
    effects: [
      { type: 'stroke', params: { color: '#000', width: 2, style: 'solid' } },
      { type: 'shadow', params: { x: 2, y: 2, blur: 0, color: '#000', opacity: 0.8 } },
    ] },
];

const FX_QUICK_ADD = ['shadow', 'glow', 'stroke', 'fill', 'blur', 'tilt', 'liquid-glass'];

/* ─── Normalize old format → new ─── */
function migrateFxList(fxList) {
  const counters = {};
  return fxList.map(item => {
    if (!item.id) item.id = 'fx_' + Math.random().toString(36).slice(2, 9);
    if (!counters[item.type]) counters[item.type] = 0;
    counters[item.type] += 1;
    if (item.instanceIndex == null) item.instanceIndex = counters[item.type];
    if (item.active == null) item.active = true;
    if (!item.name && FX_TYPES[item.type]) item.name = FX_TYPES[item.type].name;
    return item;
  });
}

function getFxCost(fx) {
  if (!fx.active) return 0;
  const meta = FX_TYPES[fx.type];
  return meta ? meta.cost : 1;
}

function getTotalFxCost(fxList) {
  return fxList.reduce((sum, fx) => sum + getFxCost(fx), 0);
}

function getNextFxIndex(fxList, type) {
  const same = fxList.filter(fx => fx.type === type);
  return same.length === 0 ? 1 : Math.max(...same.map(f => f.instanceIndex || 0)) + 1;
}

/* ─── Main render ─── */
export async function renderEffectsPanel() {
  const panel = document.getElementById('visualEffectsPanel');
  if (!panel) return;

  const core = await import('./core.js');
  const sel = (core.state.selectedList && core.state.selectedList.length > 0)
    ? core.state.selectedList[0]
    : core.state.selected;

  if (!sel || !sel.el) {
    panel.innerHTML = `
      <div class="fx-empty-state">
        <div class="fx-empty-icon">✨</div>
        <div class="fx-empty-title">التأثيرات البصرية</div>
        <div class="fx-empty-desc">حدد عنصراً (شكلاً، نصاً، صورة، زراً) لتطبيق التأثيرات عليه.</div>
      </div>
    `;
    return;
  }

  const el = sel.el;
  let fxList = getEffectsListFromElement(el);
  fxList = migrateFxList(fxList);

  const activeCount = fxList.filter(f => f.active).length;
  const totalCost = getTotalFxCost(fxList);

  panel.innerHTML = `
    <div class="fx-panel-container">

      <!-- Presets -->
      <div class="fx-section">
        <div class="fx-section-title">
          <span>🎴 تركيبات جاهزة</span>
          <span class="fx-section-hint">نقرة = إضافة</span>
        </div>
        <div class="fx-presets-grid" id="fxPresetsGrid">
          ${FX_PRESETS.map(p => `
            <div class="fx-preset-card" data-preset="${p.id}" title="${p.effects.map(e => FX_TYPES[e.type]?.name || e.type).join(' + ')}">
              <span class="fx-preset-icon">${p.icon}</span>
              <div class="fx-preset-body">
                <span class="fx-preset-name">${p.name}</span>
                <span class="fx-preset-count">${p.effects.length} تأثيرات</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Quick Add -->
      <div class="fx-section">
        <div class="fx-section-title">
          <span>➕ إضافة سريعة</span>
          <span class="fx-section-hint">نقرة = إضافة</span>
        </div>
        <div class="fx-quick-add-grid" id="fxQuickAddGrid">
          ${FX_QUICK_ADD.map(type => {
            const meta = FX_TYPES[type];
            const count = fxList.filter(f => f.type === type).length;
            return `
              <button type="button" class="fx-quick-add-btn ${meta.isGlass ? 'special' : ''}" data-add-type="${type}">
                <span class="fx-qa-icon">${meta.icon}</span>
                <span class="fx-qa-label">${meta.name}</span>
                <span class="fx-qa-count ${count > 0 ? 'show' : ''}">${count > 0 ? count : ''}</span>
              </button>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Effects list -->
      <div class="fx-section">
        <div class="fx-section-title">
          <span>📚 التأثيرات (${activeCount} نشطة)</span>
          ${fxList.length > 0 ? `<span class="fx-section-hint">${fxList.length} إجمالي</span>` : ''}
        </div>
        <div class="fx-effects-list" id="fxEffectsList">
          ${fxList.length === 0 ? `
            <div class="fx-empty-state" style="padding:16px 12px">
              <div class="fx-empty-desc" style="font-size:11px">لا توجد تأثيرات — أضف من الأعلى</div>
            </div>
          ` : fxList.map((fx, idx) => renderFxCard(fx, idx)).join('')}
        </div>
      </div>

      <!-- Cost bar -->
      ${fxList.length > 0 ? `
        <div class="fx-cost-bar">
          <div class="fx-cost-bar-row">
            <span class="fx-cost-label">📊 التكلفة</span>
            <span class="fx-cost-value" id="fxCostValue">${formatFxNum(totalCost)}ms / إطار</span>
            <span class="fx-cost-status ${totalCost < 10 ? 'safe' : totalCost < 16 ? 'warn' : 'danger'}" id="fxCostStatus">
              ${totalCost < 10 ? 'آمن' : totalCost < 16 ? 'تحذير' : 'بطيء'}
            </span>
          </div>
          <div class="fx-cost-track">
            <div class="fx-cost-fill ${totalCost < 10 ? 'safe' : totalCost < 16 ? 'warn' : 'danger'}"
                 id="fxCostFill"
                 style="width:${Math.min(100, (totalCost / 16) * 100)}%"></div>
          </div>
        </div>
      ` : ''}

    </div>
  `;

  wireFxPanel(panel, el, fxList);
}

function formatFxNum(n) {
  return n % 1 === 0 ? String(n) : n.toFixed(2);
}

function renderFxCard(fx, idx) {
  const meta = FX_TYPES[fx.type] || { icon: '✨', name: fx.type, cost: 1, isGlass: false };
  const isExpanded = fx._expanded === true;
  const costClass = meta.cost < 1 ? 'light' : meta.cost < 5 ? 'medium' : 'heavy';
  const expandedClass = isExpanded ? ' expanded' : '';
  const disabledClass = !fx.active ? ' disabled' : '';
  const glassClass = meta.isGlass ? ' glass' : '';

  return `
    <div class="fx-effect-card${expandedClass}${disabledClass}${glassClass}" data-fx-id="${fx.id}" draggable="true">
      <div class="fx-effect-header">
        <span class="fx-drag-handle" title="اسحب لإعادة الترتيب">⋮⋮</span>
        <span class="fx-effect-icon">${meta.icon}</span>
        <span class="fx-effect-name">
          ${meta.name}<span class="fx-effect-index">#${fx.instanceIndex || idx + 1}</span>
        </span>
        <span class="fx-effect-cost ${costClass}">${formatFxNum(meta.cost)}ms</span>
        <div class="fx-effect-actions">
          <button type="button" class="fx-effect-action ${fx.active ? 'active' : ''}" data-action="toggle" title="${fx.active ? 'إخفاء' : 'إظهار'}">${fx.active ? '👁' : '🚫'}</button>
          <button type="button" class="fx-effect-action danger" data-action="delete" title="حذف">🗑</button>
        </div>
      </div>
      <div class="fx-effect-body">
        <div class="fx-effect-body-inner">
          ${meta.isGlass ? `<div class="fx-export-note">⚙️ يعمل فقط عند التصدير</div>` : ''}
          ${renderFxControls(fx)}
          <div class="fx-card-actions">
            <button type="button" class="fx-card-action-btn accent" data-action="duplicate">⧉ تكرار</button>
            <button type="button" class="fx-card-action-btn" data-action="reset">↺ إعادة ضبط</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderFxControls(fx) {
  const p = fx.params || FX_DEFAULTS[fx.type] || {};
  const t = fx.type;

  if (t === 'shadow') {
    return `
      <div class="fx-ctrl-row">
        <span class="fx-ctrl-label">اللون</span>
        <input type="color" class="fx-ctrl-color ctrl-input" data-key="color" value="${p.color || '#000000'}">
        <div class="fx-ctrl-slider-wrap">
          <input type="range" class="fx-ctrl-slider ctrl-input" data-key="opacity" min="0" max="1" step="0.05" value="${p.opacity ?? 0.4}">
          <span class="fx-ctrl-value" data-unit="%">${Math.round((p.opacity ?? 0.4) * 100)}%</span>
        </div>
      </div>
      <div class="fx-ctrl-row">
        <span class="fx-ctrl-label">Blur</span>
        <div class="fx-ctrl-slider-wrap">
          <input type="range" class="fx-ctrl-slider ctrl-input" data-key="blur" min="0" max="60" step="1" value="${p.blur ?? 24}">
          <span class="fx-ctrl-value" data-unit="px">${p.blur ?? 24}px</span>
        </div>
      </div>
      <div class="fx-ctrl-row">
        <span class="fx-ctrl-label">Y</span>
        <div class="fx-ctrl-slider-wrap">
          <input type="range" class="fx-ctrl-slider ctrl-input" data-key="y" min="-40" max="40" step="1" value="${p.y ?? 12}">
          <span class="fx-ctrl-value" data-unit="px">${p.y ?? 12}px</span>
        </div>
      </div>
    `;
  }

  if (t === 'glow') {
    return `
      <div class="fx-ctrl-row">
        <span class="fx-ctrl-label">اللون</span>
        <input type="color" class="fx-ctrl-color ctrl-input" data-key="color" value="${p.color || '#3b82f6'}">
      </div>
      <div class="fx-ctrl-row">
        <span class="fx-ctrl-label">Blur</span>
        <div class="fx-ctrl-slider-wrap">
          <input type="range" class="fx-ctrl-slider ctrl-input" data-key="blur" min="2" max="60" step="1" value="${p.blur ?? 20}">
          <span class="fx-ctrl-value" data-unit="px">${p.blur ?? 20}px</span>
        </div>
      </div>
      <div class="fx-ctrl-row">
        <span class="fx-ctrl-label">Spread</span>
        <div class="fx-ctrl-slider-wrap">
          <input type="range" class="fx-ctrl-slider ctrl-input" data-key="spread" min="1" max="5" step="1" value="${p.spread ?? 2}">
          <span class="fx-ctrl-value" data-unit="x">${p.spread ?? 2}x</span>
        </div>
      </div>
    `;
  }

  if (t === 'stroke') {
    return `
      <div class="fx-ctrl-row">
        <span class="fx-ctrl-label">اللون</span>
        <input type="color" class="fx-ctrl-color ctrl-input" data-key="color" value="${p.color || '#3b82f6'}">
      </div>
      <div class="fx-ctrl-row">
        <span class="fx-ctrl-label">السماكة</span>
        <div class="fx-ctrl-slider-wrap">
          <input type="range" class="fx-ctrl-slider ctrl-input" data-key="width" min="1" max="20" step="1" value="${p.width ?? 3}">
          <span class="fx-ctrl-value" data-unit="px">${p.width ?? 3}px</span>
        </div>
      </div>
    `;
  }

  if (t === 'fill') {
    return `
      <div class="fx-ctrl-row">
        <span class="fx-ctrl-label">الألوان</span>
        <input type="color" class="fx-ctrl-color ctrl-input" data-key="c1" value="${p.c1 || '#3b82f6'}">
        <input type="color" class="fx-ctrl-color ctrl-input" data-key="c2" value="${p.c2 || '#9333ea'}">
      </div>
      <div class="fx-ctrl-row">
        <span class="fx-ctrl-label">الزاوية</span>
        <div class="fx-ctrl-slider-wrap">
          <input type="range" class="fx-ctrl-slider ctrl-input" data-key="angle" min="0" max="360" step="1" value="${p.angle ?? 45}">
          <span class="fx-ctrl-value" data-unit="°">${p.angle ?? 45}°</span>
        </div>
      </div>
    `;
  }

  if (t === 'blur') {
    return `
      <div class="fx-ctrl-row">
        <span class="fx-ctrl-label">الشدة</span>
        <div class="fx-ctrl-slider-wrap">
          <input type="range" class="fx-ctrl-slider ctrl-input" data-key="val" min="1" max="40" step="1" value="${p.val ?? 8}">
          <span class="fx-ctrl-value" data-unit="px">${p.val ?? 8}px</span>
        </div>
      </div>
    `;
  }

  if (t === 'tilt') {
    return `
      <div class="fx-ctrl-row">
        <span class="fx-ctrl-label">X</span>
        <div class="fx-ctrl-slider-wrap">
          <input type="range" class="fx-ctrl-slider ctrl-input" data-key="rx" min="-45" max="45" step="1" value="${p.rx ?? 15}">
          <span class="fx-ctrl-value" data-unit="°">${p.rx ?? 15}°</span>
        </div>
      </div>
      <div class="fx-ctrl-row">
        <span class="fx-ctrl-label">Y</span>
        <div class="fx-ctrl-slider-wrap">
          <input type="range" class="fx-ctrl-slider ctrl-input" data-key="ry" min="-45" max="45" step="1" value="${p.ry ?? -15}">
          <span class="fx-ctrl-value" data-unit="°">${p.ry ?? -15}°</span>
        </div>
      </div>
    `;
  }

  if (t === 'liquid-glass') {
    return `
      <div class="fx-ctrl-row">
        <span class="fx-ctrl-label">Blur</span>
        <div class="fx-ctrl-slider-wrap">
          <input type="range" class="fx-ctrl-slider ctrl-input" data-key="blur" min="4" max="40" step="1" value="${p.blur ?? 18}">
          <span class="fx-ctrl-value" data-unit="px">${p.blur ?? 18}px</span>
        </div>
      </div>
      <div class="fx-ctrl-row">
        <span class="fx-ctrl-label">انكسار</span>
        <div class="fx-ctrl-slider-wrap">
          <input type="range" class="fx-ctrl-slider ctrl-input" data-key="refraction" min="0" max="0.5" step="0.01" value="${p.refraction ?? 0.15}">
          <span class="fx-ctrl-value">${formatFxNum(p.refraction ?? 0.15)}</span>
        </div>
      </div>
      <div class="fx-ctrl-row">
        <span class="fx-ctrl-label">انحراف</span>
        <div class="fx-ctrl-slider-wrap">
          <input type="range" class="fx-ctrl-slider ctrl-input" data-key="aberration" min="0" max="0.1" step="0.005" value="${p.aberration ?? 0.03}">
          <span class="fx-ctrl-value">${formatFxNum(p.aberration ?? 0.03)}</span>
        </div>
      </div>
      <div class="fx-ctrl-row">
        <span class="fx-ctrl-label">حافة</span>
        <div class="fx-ctrl-slider-wrap">
          <input type="range" class="fx-ctrl-slider ctrl-input" data-key="edgeGlow" min="0" max="1" step="0.05" value="${p.edgeGlow ?? 0.6}">
          <span class="fx-ctrl-value">${formatFxNum(p.edgeGlow ?? 0.6)}</span>
        </div>
      </div>
      <div class="fx-ctrl-row">
        <span class="fx-ctrl-label">اللون</span>
        <input type="color" class="fx-ctrl-color ctrl-input" data-key="tint" value="${p.tint || '#ffffff'}">
      </div>
    `;
  }

  return '';
}

/* ─── Wire all handlers ─── */
function wireFxPanel(panel, el, fxList) {
  const corePromise = import('./core.js');

  /* Quick-add */
  panel.querySelectorAll('[data-add-type]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const type = btn.dataset.addType;
      const core = await corePromise;

      const newFx = {
        id: 'fx_' + Math.random().toString(36).slice(2, 9),
        type,
        instanceIndex: getNextFxIndex(fxList, type),
        active: true,
        params: { ...FX_DEFAULTS[type] },
        name: FX_TYPES[type]?.name || type,
      };
      newFx._expanded = true;
      fxList.push(newFx);

      const cleanList = fxList.map(f => { const c = {...f}; delete c._expanded; return c; });
el.dataset.effectsList = JSON.stringify(cleanList);
      applyVisualEffectsToElement(el, fxList);
      core.commitChange();
      core.toast(`تم إضافة ${FX_TYPES[type]?.name || type} #${newFx.instanceIndex}`, 'ok');
      renderEffectsPanel();
    });
  });

  /* Presets */
  panel.querySelectorAll('[data-preset]').forEach(card => {
    card.addEventListener('click', async () => {
      const preset = FX_PRESETS.find(p => p.id === card.dataset.preset);
      if (!preset) return;
      const core = await corePromise;

      preset.effects.forEach(e => {
        const newFx = {
          id: 'fx_' + Math.random().toString(36).slice(2, 9),
          type: e.type,
          instanceIndex: getNextFxIndex(fxList, e.type),
          active: true,
          params: { ...FX_DEFAULTS[e.type], ...(e.params || {}) },
          name: FX_TYPES[e.type]?.name || e.type,
        };
        fxList.push(newFx);
      });

      const cleanList = fxList.map(f => { const c = {...f}; delete c._expanded; return c; });
el.dataset.effectsList = JSON.stringify(cleanList);;
      applyVisualEffectsToElement(el, fxList);
      core.commitChange();
      core.toast(`تم إضافة تركيبة "${preset.name}" (${preset.effects.length} تأثيرات)`, 'ok');
      renderEffectsPanel();
    });
  });

  /* Card actions */
  panel.querySelectorAll('.fx-effect-card').forEach(card => {
    const fxId = card.dataset.fxId;
    const fx = fxList.find(f => f.id === fxId);
    if (!fx) return;

    // Expand toggle on header click
    const header = card.querySelector('.fx-effect-header');
    header?.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      fx._expanded = !fx._expanded;
      renderEffectsPanel();
    });

    // Toggle active
    card.querySelector('[data-action="toggle"]')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      const core = await corePromise;
      fx.active = !fx.active;
      const cleanList = fxList.map(f => { const c = {...f}; delete c._expanded; return c; });
el.dataset.effectsList = JSON.stringify(cleanList);
      applyVisualEffectsToElement(el, fxList);
      core.commitChange();
      renderEffectsPanel();
    });

    // Delete
    card.querySelector('[data-action="delete"]')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      const core = await corePromise;
      const idx = fxList.findIndex(f => f.id === fxId);
      if (idx >= 0) fxList.splice(idx, 1);
      const cleanList = fxList.map(f => { const c = {...f}; delete c._expanded; return c; });
el.dataset.effectsList = JSON.stringify(cleanList);
      applyVisualEffectsToElement(el, fxList);
      core.commitChange();
      core.toast(`تم حذف ${FX_TYPES[fx.type]?.name || fx.type} #${fx.instanceIndex}`, 'info');
      renderEffectsPanel();
    });

    // Duplicate
    card.querySelector('[data-action="duplicate"]')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      const core = await corePromise;
      const copy = {
        id: 'fx_' + Math.random().toString(36).slice(2, 9),
        type: fx.type,
        instanceIndex: getNextFxIndex(fxList, fx.type),
        active: true,
        params: JSON.parse(JSON.stringify(fx.params || {})),
        name: FX_TYPES[fx.type]?.name || fx.type,
        _expanded: true,
      };
      fxList.push(copy);
      const cleanList = fxList.map(f => { const c = {...f}; delete c._expanded; return c; });
el.dataset.effectsList = JSON.stringify(cleanList);
      applyVisualEffectsToElement(el, fxList);
      core.commitChange();
      core.toast(`تم تكرار ${FX_TYPES[fx.type]?.name || fx.type} #${fx.instanceIndex} → #${copy.instanceIndex}`, 'ok');
      renderEffectsPanel();
    });

    // Reset
    card.querySelector('[data-action="reset"]')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      const core = await corePromise;
      fx.params = { ...FX_DEFAULTS[fx.type] };
      const cleanList = fxList.map(f => { const c = {...f}; delete c._expanded; return c; });
el.dataset.effectsList = JSON.stringify(cleanList);
      applyVisualEffectsToElement(el, fxList);
      core.commitChange();
      core.toast('تم إعادة ضبط التأثير', 'info');
      renderEffectsPanel();
    });

    // Control inputs
    const controls = card.querySelectorAll('.ctrl-input');
    let preSnapshot = null;
    const capturePre = () => { if (!preSnapshot) { import('./core.js').then(c => preSnapshot = c.snapshot()); } };

    controls.forEach(ctrl => {
      const key = ctrl.dataset.key;
      ctrl.addEventListener('pointerdown', capturePre);
      ctrl.addEventListener('focus', capturePre);

      const update = () => {
        const val = (ctrl.type === 'range') ? parseFloat(ctrl.value) : ctrl.value;
        if (!fx.params) fx.params = {};
        fx.params[key] = val;

        // Update display value without re-render
        const display = ctrl.parentElement.querySelector('.fx-ctrl-value');
        if (display && ctrl.type === 'range') {
          const unit = display.dataset.unit || '';
          if (unit === '%') display.textContent = Math.round(val * 100) + '%';
          else if (unit === 'px') display.textContent = val + 'px';
          else if (unit === 'x') display.textContent = val + 'x';
          else if (unit === '°') display.textContent = val + '°';
          else display.textContent = formatFxNum(val);
        }

        // Live apply
        const cleanList = fxList.map(f => { const c = {...f}; delete c._expanded; return c; });
el.dataset.effectsList = JSON.stringify(cleanList);
        applyVisualEffectsToElement(el, fxList);
      };

      ctrl.addEventListener('input', update);
      ctrl.addEventListener('change', async () => {
        update();
        const core = await corePromise;
        if (preSnapshot) {
          core.commitChange(preSnapshot);
          preSnapshot = null;
        } else {
          core.commitChange();
        }
      });
    });

    // Drag & drop
    card.addEventListener('dragstart', (e) => {
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', fxId);
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      panel.querySelectorAll('.fx-effect-card').forEach(c => {
        c.classList.remove('drag-over-top', 'drag-over-bottom');
      });
    });
    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const srcId = e.dataTransfer.types.includes('text/plain');
      if (!srcId) return;
      const rect = card.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      const isTop = e.clientY < mid;
      panel.querySelectorAll('.fx-effect-card').forEach(c => {
        c.classList.remove('drag-over-top', 'drag-over-bottom');
      });
      card.classList.add(isTop ? 'drag-over-top' : 'drag-over-bottom');
    });
    card.addEventListener('dragleave', (e) => {
      if (!card.contains(e.relatedTarget)) {
        card.classList.remove('drag-over-top', 'drag-over-bottom');
      }
    });
    card.addEventListener('drop', async (e) => {
      e.preventDefault();
      card.classList.remove('drag-over-top', 'drag-over-bottom');
      const srcId = e.dataTransfer.getData('text/plain');
      if (!srcId || srcId === fxId) return;
      const core = await corePromise;

      const fromIdx = fxList.findIndex(f => f.id === srcId);
      const toIdx = fxList.findIndex(f => f.id === fxId);
      if (fromIdx < 0 || toIdx < 0) return;

      const rect = card.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      const insertBefore = e.clientY < mid;

      const [moved] = fxList.splice(fromIdx, 1);
      let target = toIdx;
      if (fromIdx < toIdx) target = insertBefore ? toIdx - 1 : toIdx;
      else target = insertBefore ? toIdx : toIdx + 1;
      target = Math.max(0, Math.min(fxList.length, target));
      fxList.splice(target, 0, moved);

      const cleanList = fxList.map(f => { const c = {...f}; delete c._expanded; return c; });
el.dataset.effectsList = JSON.stringify(cleanList);
      applyVisualEffectsToElement(el, fxList);
      core.commitChange();
      renderEffectsPanel();
    });
  });
}

/* ─── Apply effects visually (updated for liquid-glass) ─── */
export function applyVisualEffectsToElement(el, effects) {
  if (!el || !effects) return;
  const isSvg = el.tagName && ['rect','circle','ellipse','line','polygon','path','g'].includes(el.tagName.toLowerCase());

  const fxList = Array.isArray(effects) ? effects : getEffectsListFromElement(el);

  const filters = [];
  let transformStr = '';
  let activeStroke = null;
  let activeFill = null;
  let hasGlass = false;

  fxList.forEach(item => {
    if (!item.active) return;
    if (item.type === 'shadow') {
      const op = item.opacity != null ? item.opacity : 0.4;
      let col = item.color || '#000000';
      if (col.startsWith('#') && col.length === 7) {
        const r = parseInt(col.slice(1, 3), 16);
        const g = parseInt(col.slice(3, 5), 16);
        const b = parseInt(col.slice(5, 7), 16);
        col = `rgba(${r},${g},${b},${op})`;
      }
      filters.push(`drop-shadow(${item.x || 0}px ${item.y || 12}px ${item.blur || 24}px ${col})`);
    } else if (item.type === 'glow') {
      const col = item.color || '#3b82f6';
      const b = item.blur || 20;
      const repeat = Math.min(3, Math.max(1, item.spread || 1));
      for (let i = 0; i < repeat; i++) filters.push(`drop-shadow(0 0 ${b}px ${col})`);
    } else if (item.type === 'blur') {
      if ((item.val || 0) > 0) filters.push(`blur(${item.val}px)`);
    } else if (item.type === 'tilt') {
      transformStr = `perspective(800px) rotateX(${item.rx || 0}deg) rotateY(${item.ry || 0}deg)`;
    } else if (item.type === 'stroke') {
      activeStroke = item;
    } else if (item.type === 'fill') {
      activeFill = item;
    } else if (item.type === 'liquid-glass') {
      hasGlass = true;
    }
  });

  const filterStr = filters.join(' ');

  if (isSvg) {
    el.style.filter = filterStr;

    if (transformStr) {
      const existing = el.style.transform || '';
      const rotMatch = existing.match(/rotate\([^)]+\)/);
      const combined = [rotMatch ? rotMatch[0] : '', transformStr].filter(Boolean).join(' ');
      el.style.transformBox = 'fill-box';
      el.style.transformOrigin = 'center center';
      el.style.transform = combined;
    }

    if (activeStroke) {
      el.setAttribute('stroke', activeStroke.color || '#3b82f6');
      el.setAttribute('stroke-width', activeStroke.width || 3);
      if (activeStroke.style === 'dashed') el.setAttribute('stroke-dasharray', '8 4');
      else if (activeStroke.style === 'dotted') el.setAttribute('stroke-dasharray', '2 4');
      else el.removeAttribute('stroke-dasharray');
    }

    if (activeFill) {
      if (activeFill.fillType === 'solid') {
        el.setAttribute('fill', activeFill.c1 || '#3b82f6');
      } else {
        const gradId = 'grad_' + (el.dataset.id || 'fx');
        let defs = document.getElementById('svgDefs');
        if (!defs) {
          defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
          defs.id = 'svgDefs';
          document.body.appendChild(defs);
        }
        let grad = defs.querySelector('#' + gradId);
        if (!grad) {
          grad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
          grad.id = gradId;
          defs.appendChild(grad);
        }
        const ang = (activeFill.angle || 45) * Math.PI / 180;
        grad.setAttribute('x1', Math.round(50 - Math.cos(ang) * 50) + '%');
        grad.setAttribute('y1', Math.round(50 - Math.sin(ang) * 50) + '%');
        grad.setAttribute('x2', Math.round(50 + Math.cos(ang) * 50) + '%');
        grad.setAttribute('y2', Math.round(50 + Math.sin(ang) * 50) + '%');
        grad.innerHTML = `<stop offset="0%" stop-color="${activeFill.c1 || '#3b82f6'}"/><stop offset="100%" stop-color="${activeFill.c2 || '#9333ea'}"/>`;
        el.setAttribute('fill', `url(#${gradId})`);
      }
    }

    // liquid-glass: CSS approximation for preview only
    if (hasGlass) {
      const g = fxList.find(f => f.active && f.type === 'liquid-glass');
      el.style.backdropFilter = `blur(${g.blur || 18}px) saturate(1.4)`;
      el.style.webkitBackdropFilter = `blur(${g.blur || 18}px) saturate(1.4)`;
    } else {
      el.style.backdropFilter = '';
      el.style.webkitBackdropFilter = '';
    }
  } else {
    el.style.filter = filterStr;
    if (transformStr) {
      el.style.transform = transformStr;
      el.style.transformOrigin = 'center center';
    }
    if (activeStroke) el.style.border = `${activeStroke.width || 2}px ${activeStroke.style || 'solid'} ${activeStroke.color || '#3b82f6'}`;
    if (activeFill) {
      if (activeFill.fillType === 'solid') el.style.backgroundColor = activeFill.c1 || '#3b82f6';
      else el.style.background = `linear-gradient(${activeFill.angle || 45}deg, ${activeFill.c1 || '#3b82f6'}, ${activeFill.c2 || '#9333ea'})`;
    }

    // liquid-glass preview
    if (hasGlass) {
      const g = fxList.find(f => f.active && f.type === 'liquid-glass');
      el.style.backdropFilter = `blur(${g.blur || 18}px) saturate(1.4)`;
      el.style.webkitBackdropFilter = `blur(${g.blur || 18}px) saturate(1.4)`;
    } else {
      el.style.backdropFilter = '';
      el.style.webkitBackdropFilter = '';
    }
  }
}

/**
 * تطبيق التأثيرات البصرية (Session 3 — Tilt يدور حول مركز العنصر)
 */
export function applyVisualEffectsToElement(el, effects) {
  if (!el || !effects) return;
  const isSvg = el.tagName && ['rect','circle','ellipse','line','polygon','path','g'].includes(el.tagName.toLowerCase());

  const fxList = Array.isArray(effects) ? effects : getEffectsListFromElement(el);

  const filters = [];
  let transformStr = '';
  let activeStroke = null;
  let activeFill = null;

  fxList.forEach(item => {
    if (!item.active) return;
    if (item.type === 'shadow') {
      const op = item.opacity != null ? item.opacity : 0.4;
      let col = item.color || '#000000';
      if (col.startsWith('#') && col.length === 7) {
        const r = parseInt(col.slice(1, 3), 16);
        const g = parseInt(col.slice(3, 5), 16);
        const b = parseInt(col.slice(5, 7), 16);
        col = `rgba(${r},${g},${b},${op})`;
      }
      filters.push(`drop-shadow(${item.x || 0}px ${item.y || 12}px ${item.blur || 24}px ${col})`);
    } else if (item.type === 'glow') {
      const col = item.color || '#3b82f6';
      const b = item.blur || 20;
      const repeat = Math.min(3, Math.max(1, item.spread || 1));
      for (let i = 0; i < repeat; i++) filters.push(`drop-shadow(0 0 ${b}px ${col})`);
    } else if (item.type === 'blur') {
      if ((item.val || 0) > 0) filters.push(`blur(${item.val}px)`);
    } else if (item.type === 'tilt') {
      transformStr = `perspective(800px) rotateX(${item.rx || 0}deg) rotateY(${item.ry || 0}deg)`;
    } else if (item.type === 'stroke') {
      activeStroke = item;
    } else if (item.type === 'fill') {
      activeFill = item;
    }
  });

  const filterStr = filters.join(' ');

  if (isSvg) {
    el.style.filter = filterStr;

    // ★ Session 3 — Tilt يُطبَّق على العنصر نفسه (fill-box) بدل الـ wrapper
    if (transformStr) {
      const existing = el.style.transform || '';
      const rotMatch = existing.match(/rotate\([^)]+\)/);
      const combined = [rotMatch ? rotMatch[0] : '', transformStr].filter(Boolean).join(' ');
      el.style.transformBox = 'fill-box';
      el.style.transformOrigin = 'center center';
      el.style.transform = combined;
    }

    if (activeStroke) {
      el.setAttribute('stroke', activeStroke.color || '#3b82f6');
      el.setAttribute('stroke-width', activeStroke.width || 3);
      if (activeStroke.style === 'dashed') el.setAttribute('stroke-dasharray', '8 4');
      else if (activeStroke.style === 'dotted') el.setAttribute('stroke-dasharray', '2 4');
      else el.removeAttribute('stroke-dasharray');
    }

    if (activeFill) {
      if (activeFill.fillType === 'solid') {
        el.setAttribute('fill', activeFill.c1 || '#3b82f6');
      } else {
        const gradId = 'grad_' + (el.dataset.id || 'fx');
        let defs = document.getElementById('svgDefs');
        if (!defs) {
          defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
          defs.id = 'svgDefs';
          document.body.appendChild(defs);
        }
        let grad = defs.querySelector('#' + gradId);
        if (!grad) {
          grad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
          grad.id = gradId;
          defs.appendChild(grad);
        }
        const ang = (activeFill.angle || 45) * Math.PI / 180;
        grad.setAttribute('x1', Math.round(50 - Math.cos(ang) * 50) + '%');
        grad.setAttribute('y1', Math.round(50 - Math.sin(ang) * 50) + '%');
        grad.setAttribute('x2', Math.round(50 + Math.cos(ang) * 50) + '%');
        grad.setAttribute('y2', Math.round(50 + Math.sin(ang) * 50) + '%');
        grad.innerHTML = `<stop offset="0%" stop-color="${activeFill.c1 || '#3b82f6'}"/><stop offset="100%" stop-color="${activeFill.c2 || '#9333ea'}"/>`;
        el.setAttribute('fill', `url(#${gradId})`);
      }
    }
  } else {
    el.style.filter = filterStr;
    if (transformStr) {
      el.style.transform = transformStr;
      el.style.transformOrigin = 'center center';
    }
    if (activeStroke) el.style.border = `${activeStroke.width || 2}px ${activeStroke.style || 'solid'} ${activeStroke.color || '#3b82f6'}`;
    if (activeFill) {
      if (activeFill.fillType === 'solid') el.style.backgroundColor = activeFill.c1 || '#3b82f6';
      else el.style.background = `linear-gradient(${activeFill.angle || 45}deg, ${activeFill.c1 || '#3b82f6'}, ${activeFill.c2 || '#9333ea'})`;
    }
  }
}

/* ═══════════════════════════════════════════════════════════
   §6. BOTTOM PANEL (Session 2 — Notes listener)
   ═══════════════════════════════════════════════════════════ */
function initBottomPanel() {
  const panel = document.getElementById('bottomPanel');
  if (!panel) return;

  const tabs = panel.querySelectorAll('.bp-tab');
  const contents = panel.querySelectorAll('.bp-content');
  const toggle = document.getElementById('bpToggle');

  // ★★ ربط ملاحظات الشريحة
  const notesArea = document.getElementById('notesTextarea');
  if (notesArea && !notesArea._uiNotesWired) {
    notesArea._uiNotesWired = true;
    notesArea.addEventListener('input', () => {
      const slide = state.slides && state.slides[state.currentPage - 1];
      if (slide) slide.notes = notesArea.value;
      import('./core.js').then(c => c.markDirty());
    });
    document.addEventListener('ipb:pageChanged', () => {
      const slide = state.slides && state.slides[state.currentPage - 1];
      notesArea.value = (slide && slide.notes) || '';
    });
  }

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

      if (wasActive && !isCollapsed) { setExpanded(false); return; }

      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));
      tab.classList.add('active');

      const content = panel.querySelector('.bp-content[data-bpanel="' + key + '"]');
      if (content) content.classList.add('active');

      if (key === 'timeline') import('./ui-animation.js').then(m => m.renderTimelineTracks && m.renderTimelineTracks());
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

/* ═══════════════════════════════════════════════════════════
   §7. LAYERS (Session 1 — __CORE__ fix)
   ═══════════════════════════════════════════════════════════ */
function getLayerIcon(type) {
  if (type === 'pdf-page') return '📄';
  if (type === 'slide-bg') return '🎨';
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
    svg.querySelectorAll(':scope > .annot-wrapper').forEach(wrap => {
      const inner = wrap.querySelector('[data-annot]');
      if (!inner) return;
      const t = inner.dataset.type || inner.tagName.toLowerCase();
      items.push({
        el: wrap, kind: 'svg', type: t,
        name: t + ' ' + (inner.dataset.id ? inner.dataset.id.slice(-4) : ''),
        z: parseInt(wrap.style.zIndex || '0', 10),
        id: wrap.dataset.annotId,
      });
    });
  }

  const txt = document.getElementById('textLayer');
  if (txt) {
    txt.querySelectorAll('.pdf-text-box').forEach((el, i) => {
      const isEq = el.dataset.isEquation === 'true';
      items.push({
        el, kind: 'text', type: isEq ? 'equation' : 'text',
        name: (isEq ? 'معادلة ' : 'نص ') + (i + 1),
        z: parseInt(el.style.zIndex || '0', 10),
        id: el.dataset.textId,
      });
    });
  }

  const vid = document.getElementById('videoLayer');
  if (vid) {
    vid.querySelectorAll('.media-obj').forEach((el, i) => {
      items.push({ el, kind: 'media', type: 'media', name: el.dataset.title || ('ميديا ' + (i + 1)), z: parseInt(el.style.zIndex || '0', 10), id: el.dataset.mediaId });
    });
  }

  const emb = document.getElementById('embedLayer');
  if (emb) {
    emb.querySelectorAll('.embed').forEach((el, i) => {
      items.push({ el, kind: 'embed', type: 'embed', name: 'تضمين: ' + (el.dataset.url || ('#' + (i + 1))), z: parseInt(el.style.zIndex || '0', 10), id: 'embed-' + i });
    });
  }

  const ib = document.getElementById('interactiveLayer');
  if (ib) {
    ib.querySelectorAll('.pdf-interactive-btn').forEach((el, i) => {
      items.push({ el, kind: 'button', type: 'button', name: el.dataset.text || ('زر ' + (i + 1)), z: parseInt(el.style.zIndex || '0', 10), id: el.dataset.btnId });
    });
  }

  // ★ Session 1 — استخدام state المُستورد بدل window.__CORE__
  const pdfCanvas = document.getElementById('pdfCanvas');
  const hasProject = document.body.classList.contains('has-project');
  if (pdfCanvas && hasProject) {
    let isPdf = false;
    let pageNum = 1;
    try {
      const s = state;
      if (s && s.slides) {
        const sl = s.slides[s.currentPage - 1];
        isPdf = !!(s.pdfDoc || (sl && sl.bg && sl.bg.type === 'pdf'));
        pageNum = (sl && sl.bg && sl.bg.page) || s.currentPage || 1;
      }
    } catch (_) {}
    const isVisible = pdfCanvas.style.visibility !== 'hidden' && pdfCanvas.style.display !== 'none';
    items.push({
      el: pdfCanvas, kind: 'canvas',
      type: isPdf ? 'pdf-page' : 'slide-bg',
      name: isPdf ? `صفحة PDF (${pageNum})` : 'خلفية الشريحة',
      z: -9999, id: 'pdf-page-canvas-layer',
      isBaseLayer: true, visible: isVisible,
    });
  }

  items.sort((a, b) => a.z - b.z);
  const displayItems = items.slice().reverse();

  if (count) count.textContent = String(items.length);

  if (!displayItems.length) {
    list.innerHTML = '<div class="bp-empty">لا توجد عناصر في هذه الشريحة</div>';
    return;
  }

  list.innerHTML = '';

  displayItems.forEach((item, displayIdx) => {
    const row = document.createElement('div');
    row.className = 'layer-row';
    row.dataset.zidx = String(item.z);
    row.dataset.id = item.id || '';

    const dragHandle = document.createElement('span');
    dragHandle.className = 'ly-drag-handle';
    if (item.isBaseLayer) {
      row.draggable = false;
      dragHandle.textContent = '🔒';
      dragHandle.style.cursor = 'default';
      dragHandle.style.opacity = '0.7';
    } else {
      row.draggable = true;
      dragHandle.textContent = '⋮⋮';
    }

    const iconSpan = document.createElement('span');
    iconSpan.className = 'ly-icon';
    iconSpan.textContent = getLayerIcon(item.type);

    const nameSpan = document.createElement('span');
    nameSpan.className = 'ly-name';
    nameSpan.textContent = item.name;

    const visSpan = document.createElement('span');
    visSpan.className = 'ly-toggle ' + (item.visible !== false ? 'on' : '');
    visSpan.dataset.act = 'vis';
    visSpan.textContent = '👁';

    row.appendChild(dragHandle);
    row.appendChild(iconSpan);
    row.appendChild(nameSpan);
    row.appendChild(visSpan);

    row.addEventListener('click', (e) => {
      if (e.target.dataset.act === 'vis') {
        const visible = e.target.classList.toggle('on');
        if (item.isBaseLayer) item.el.style.visibility = visible ? 'visible' : 'hidden';
        else item.el.style.display = visible ? '' : 'none';
        return;
      }
      list.querySelectorAll('.layer-row').forEach(r => r.classList.remove('active'));
      row.classList.add('active');
      if (item.isBaseLayer) {
        showDocumentDimsPanel();
      } else {
        document.dispatchEvent(new CustomEvent('ipb:selectLayer', { detail: { el: item.el, kind: item.kind } }));
      }
    });

    row.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', String(displayIdx));
      e.dataTransfer.effectAllowed = 'move';
      row.classList.add('dragging');
      list.classList.add('drag-active');
    });

    row.addEventListener('dragend', () => {
      row.classList.remove('dragging');
      list.classList.remove('drag-active');
      list.querySelectorAll('.layer-row').forEach(r => r.classList.remove('drag-over-top', 'drag-over-bottom'));
    });

    row.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const rect = row.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      const isTop = e.clientY < mid;
      list.querySelectorAll('.layer-row').forEach(r => r.classList.remove('drag-over-top', 'drag-over-bottom'));
      row.classList.add(isTop ? 'drag-over-top' : 'drag-over-bottom');
    });

    row.addEventListener('dragleave', () => row.classList.remove('drag-over-top', 'drag-over-bottom'));

    row.addEventListener('drop', async (e) => {
      e.preventDefault();
      row.classList.remove('drag-over-top', 'drag-over-bottom');

      const fromDisplayIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
      if (isNaN(fromDisplayIdx) || fromDisplayIdx === displayIdx) return;

      const rect = row.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      const insertAbove = e.clientY < mid;

      try {
        const inter = await import('./interaction.js');
        const core = await import('./core.js');

        const reordered = [...displayItems];
        const [movedItem] = reordered.splice(fromDisplayIdx, 1);
        if (!movedItem) return;

        let insertIdx = displayIdx;
        if (fromDisplayIdx < displayIdx) insertIdx = displayIdx - 1;
        if (!insertAbove) insertIdx += 1;
        insertIdx = Math.max(0, Math.min(reordered.length, insertIdx));
        reordered.splice(insertIdx, 0, movedItem);

        const ascendingItems = reordered.slice().reverse();

        const pre = core.snapshot();
        inter.assignZIndexesInOrder(ascendingItems);
        core.commitChange(pre);

        refreshLayersPanel();

        const pdf = await import('./pdf.js');
        if (pdf.captureStageThumbnail && core.state.currentPage) {
          pdf.captureStageThumbnail(core.state.currentPage).catch(() => {});
        }
      } catch (err) { console.warn('layer reorder drop error:', err); }
    });

    list.appendChild(row);
  });
}

/* ═══════════════════════════════════════════════════════════
   §8. TOPBAR (Session 6 — saveProjectOver)
   ═══════════════════════════════════════════════════════════ */
function initTopbarActions() {
  const btnUndo = document.getElementById('btnUndo');
  const btnRedo = document.getElementById('btnRedo');
  const btnCopy = document.getElementById('btnCopy');
  const btnPaste = document.getElementById('btnPaste');
  const btnOpen = document.getElementById('btnOpen');
  const btnSave = document.getElementById('btnSave');
  const btnPreview = document.getElementById('btnPreview');
  const btnPresent = document.getElementById('btnPresent');

  if (btnUndo) btnUndo.addEventListener('click', async () => {
    try { const core = await import('./core.js'); core.undo(); setSaveBadge('تم التراجع', false); } catch (e) { console.warn(e); }
  });
  if (btnRedo) btnRedo.addEventListener('click', async () => {
    try { const core = await import('./core.js'); core.redo(); setSaveBadge('تم الإعادة', false); } catch (e) { console.warn(e); }
  });
  if (btnCopy) btnCopy.addEventListener('click', async () => {
    try {
      const inter = await import('./interaction.js');
      const core = await import('./core.js');
      const sel = core.state.selectedList && core.state.selectedList.length > 0 ? core.state.selectedList[0] : core.state.selected;
      if (sel && sel.el) inter.copyElement(sel.el);
      else safeToast('حدد عنصراً أولاً للنسخ', 'info');
    } catch (e) { console.warn(e); }
  });
  if (btnPaste) btnPaste.addEventListener('click', async () => {
    try { const inter = await import('./interaction.js'); inter.pasteElement(); } catch (e) { console.warn(e); }
  });
  if (btnOpen) btnOpen.addEventListener('click', () => {
    const input = document.getElementById('fileInput');
    if (input) input.click();
  });

  // ★ Session 6 — Save Over بدل Save As
  if (btnSave) btnSave.addEventListener('click', async () => {
    setSaveBadge('جارٍ الحفظ…', true);
    try {
      const storage = await import('./storage.js');
      await storage.saveProjectOver();
      setSaveBadge('محفوظ الآن', false);
    } catch (e) { setSaveBadge('فشل الحفظ', false); }
  });

  if (btnPreview) btnPreview.addEventListener('click', openPresentMode);
  if (btnPresent) btnPresent.addEventListener('click', openPresentMode);
}

/* ═══════════════════════════════════════════════════════════
   §9. CLOSE PROJECT
   ═══════════════════════════════════════════════════════════ */
function initCloseProject() {
  const btn = document.getElementById('btnCloseProject');
  if (!btn) return;
  btn.addEventListener('click', showCloseDialog);

  document.addEventListener('keydown', (e) => {
    // Ctrl+Shift+W (لتفادي تعارض Ctrl+W مع المتصفح)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'w') {
      e.preventDefault();
      showCloseDialog();
    }
  });
}

function showCloseDialog() {
  import('./core.js').then(core => {
    const state = core.state;
    openConfirmDialog({
      title: 'إغلاق المشروع',
      message: 'هل تريد حفظ التغييرات في هذا المشروع قبل الإغلاق؟',
      subtitle: state.pdfName || 'عرض تقديمي',
      primaryLabel: '💾 حفظ وإغلاق',
      secondaryLabel: 'عدم الحفظ',
      cancelLabel: 'إلغاء',
      onPrimary: async () => {
        try { const storage = await import('./storage.js'); await storage.saveProjectOver(); }
        catch (e) { console.warn('save failed', e); }
        resetToEmptyState();
      },
      onSecondary: () => resetToEmptyState(),
    });
  }).catch(err => console.error(err));
}

function openConfirmDialog(opts) {
  const backdrop = document.createElement('div');
  backdrop.className = 'ipb-confirm-backdrop';

  const dialog = document.createElement('div');
  dialog.className = 'ipb-confirm-dialog';

  dialog.innerHTML = `
    <div class="ipb-confirm-icon">⚠️</div>
    <h2 class="ipb-confirm-title"></h2>
    <p class="ipb-confirm-subtitle"></p>
    <p class="ipb-confirm-message"></p>
    <div class="ipb-confirm-actions">
      <button type="button" class="ipb-confirm-btn ipb-confirm-cancel"></button>
      <button type="button" class="ipb-confirm-btn ipb-confirm-secondary"></button>
      <button type="button" class="ipb-confirm-btn ipb-confirm-primary"></button>
    </div>
  `;

  dialog.querySelector('.ipb-confirm-title').textContent = opts.title || 'تأكيد';
  dialog.querySelector('.ipb-confirm-subtitle').textContent = opts.subtitle || '';
  dialog.querySelector('.ipb-confirm-message').textContent = opts.message || '';
  dialog.querySelector('.ipb-confirm-primary').textContent = opts.primaryLabel || 'حفظ';
  dialog.querySelector('.ipb-confirm-secondary').textContent = opts.secondaryLabel || 'عدم الحفظ';
  dialog.querySelector('.ipb-confirm-cancel').textContent = opts.cancelLabel || 'إلغاء';

  backdrop.appendChild(dialog);
  document.body.appendChild(backdrop);
  requestAnimationFrame(() => backdrop.classList.add('show'));

  function close() {
    backdrop.classList.remove('show');
    setTimeout(() => backdrop.remove(), 180);
  }

  dialog.querySelector('.ipb-confirm-primary').addEventListener('click', () => { close(); if (opts.onPrimary) opts.onPrimary(); });
  dialog.querySelector('.ipb-confirm-secondary').addEventListener('click', () => { close(); if (opts.onSecondary) opts.onSecondary(); });
  dialog.querySelector('.ipb-confirm-cancel').addEventListener('click', () => { close(); if (opts.onCancel) opts.onCancel(); });

  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
  document.addEventListener('keydown', function onEsc(e) {
    if (e.key === 'Escape') { document.removeEventListener('keydown', onEsc); close(); }
  });

  setTimeout(() => { try { dialog.querySelector('.ipb-confirm-primary').focus(); } catch (_) {} }, 100);
}

/* ═══════════════════════════════════════════════════════════
   §10. RESET TO EMPTY (Session 6 — resetProjectHandles)
   ═══════════════════════════════════════════════════════════ */
function resetToEmptyState() {
  import('./core.js').then(core => {
    const state = core.state;

    // ★ إعادة تعيين مقابض الملف + auto-save
    try {
      if (window.__UI_SHELL__ && typeof window.__UI_SHELL__.resetProjectHandles === 'function') {
        window.__UI_SHELL__.resetProjectHandles();
      }
    } catch (_) {}

    document.body.classList.remove('present-active');
    const presentOverlay = document.getElementById('presentOverlay');
    if (presentOverlay) presentOverlay.classList.remove('active');

    try {
      if (window.__UI_SHELL__ && typeof window.__UI_SHELL__.closePresent === 'function') {
        window.__UI_SHELL__.closePresent();
      }
    } catch (_) {}

    ['textContextToolbar', 'shapeContextToolbar', 'slideContextMenu', 'submenu'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.classList.remove('show'); if (id === 'textContextToolbar' || id === 'shapeContextToolbar') el.innerHTML = ''; }
    });

    document.querySelectorAll('.element-delete-btn').forEach(el => el.style.display = 'none');

    try {
      if (window.__INTERACTION__ && typeof window.__INTERACTION__.deselect === 'function') {
        window.__INTERACTION__.deselect();
      }
    } catch (_) {}

    state.pdfDoc = null;
    state.pdfBlob = null;
    state.pdfName = '';
    state.pdfIsImage = false;
    state.slides = [];
    state.totalPages = 0;
    state.currentPage = 1;
    state.pages = {};
    state.history = { past: [], future: [] };
    state.selected = null;
    state.projectDims = null;
    state.dirty = false;
    state.pageCache.clear();
    state.thumbCache.clear();
    state.view = { scale: 1, tx: 0, ty: 0 };

    state.pdfW = 0; state.pdfH = 0;
    state.cssW = 0; state.cssH = 0;
    state.canvasScale = 1; state.dpr = 1;
    state.stageRect0 = { left: 0, top: 0, width: 0, height: 0 };

    ['svgLayer', 'embedLayer', 'videoLayer', 'textLayer', 'interactiveLayer'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = '';
    });

    const pdfCanvas = document.getElementById('pdfCanvas');
    if (pdfCanvas) {
      try {
        const ctx = pdfCanvas.getContext('2d');
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, pdfCanvas.width, pdfCanvas.height);
      } catch (_) {}
      pdfCanvas.width = 0; pdfCanvas.height = 0;
      pdfCanvas.style.width = '0'; pdfCanvas.style.height = '0';
    }

    ['transientCanvas', 'laserCanvas'].forEach(id => {
      const c = document.getElementById(id);
      if (!c) return;
      try {
        const ctx = c.getContext('2d');
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, c.width, c.height);
      } catch (_) {}
      c.width = 0; c.height = 0;
      c.style.width = '0'; c.style.height = '0';
    });

    const stageEl = document.getElementById('stage');
    if (stageEl) {
      stageEl.classList.add('empty');
      stageEl.style.cssText = '';
      stageEl.classList.add('empty');
      stageEl.style.width = '0'; stageEl.style.height = '0';
      stageEl.style.transform = 'none';
      stageEl.style.background = 'transparent';
      stageEl.style.boxShadow = 'none';
      stageEl.style.borderRadius = '0';
      stageEl.dataset.tool = 'select';
    }

    const stageContent = document.getElementById('stageContent');
    if (stageContent) { stageContent.style.transform = 'none'; stageContent.style.transition = 'none'; }

    const loadingEl = document.getElementById('loading');
    if (loadingEl) loadingEl.classList.remove('show');

    const thumbsList = document.getElementById('thumbsList');
    if (thumbsList) thumbsList.innerHTML = '<div class="thumbs-empty">لا توجد صفحات<br>افتح ملفاً للبدء</div>';

    const pageIndicator = document.getElementById('pageIndicator');
    if (pageIndicator) pageIndicator.textContent = '';

    const btnPrev = document.getElementById('btnPrev');
    const btnNext = document.getElementById('btnNext');
    if (btnPrev) btnPrev.disabled = true;
    if (btnNext) btnNext.disabled = true;

    const emptyState = document.getElementById('emptyState');
    if (emptyState) { emptyState.style.display = 'flex'; emptyState.style.backgroundColor = 'transparent'; emptyState.style.backgroundImage = 'none'; }

    setSaveBadge('لا مشروع', false);

    const docInfo = document.getElementById('documentInfoPanel');
    if (docInfo) docInfo.innerHTML = '';

    const propsHint = document.getElementById('elementPropsHint');
    if (propsHint) { propsHint.textContent = 'افتح مشروعاً أو أنشئ مشروعاً جديداً للبدء'; propsHint.style.display = ''; }

    refreshLayersPanel();

    try { if (core.updateCursorForTool) core.updateCursorForTool(); } catch (_) {}

    document.body.classList.remove('has-project');
    document.body.classList.add('no-project');

    document.dispatchEvent(new CustomEvent('ipb:projectClosed'));
    document.dispatchEvent(new CustomEvent('ipb:pageChanged', { detail: { page: 0 } }));
  }).catch(err => console.error('resetToEmptyState failed:', err));
}

/* ═══════════════════════════════════════════════════════════
   §11. PROPS TOGGLE & SIDEBAR TOGGLE
   ═══════════════════════════════════════════════════════════ */
function initPropsToggle() {
  let btn = document.getElementById('btnToggleProps');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'btnToggleProps';
    btn.className = 'props-toggle-btn';
    btn.title = 'إخفاء / إظهار لوحة الخصائص';
    document.body.appendChild(btn);
  }

  let backdrop = document.querySelector('.props-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.className = 'props-backdrop';
    document.body.appendChild(backdrop);
  }

  const toggle = () => {
    const isMobile = window.innerWidth <= 768 || window.matchMedia('(orientation: portrait)').matches;
    if (isMobile) document.body.classList.toggle('props-mobile-open');
    else document.body.classList.toggle('props-hidden');
    setTimeout(() => window.dispatchEvent(new Event('resize')), 260);
  };

  btn.addEventListener('click', toggle);
  const topBtn = document.getElementById('btnTogglePropsTop');
  if (topBtn) topBtn.addEventListener('click', toggle);

  const closeMobile = document.getElementById('btnClosePropsMobile');
  if (closeMobile) closeMobile.addEventListener('click', () => {
    document.body.classList.remove('props-mobile-open');
    document.body.classList.add('props-hidden');
    setTimeout(() => window.dispatchEvent(new Event('resize')), 260);
  });

  backdrop.addEventListener('click', () => {
    document.body.classList.remove('props-mobile-open');
    setTimeout(() => window.dispatchEvent(new Event('resize')), 260);
  });

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === '.') { e.preventDefault(); toggle(); }
  });
}

function initSidebarToggle() {
  const btn = document.getElementById('btnToggleSidebarArrow');
  const sidebar = document.getElementById('thumbnailSidebar');
  if (!btn || !sidebar) return;

  function updateArrowPos() {
    const isCollapsed = sidebar.classList.contains('collapsed');
    document.body.classList.toggle('sidebar-collapsed', isCollapsed);
    if (isCollapsed) btn.style.left = '0';
    else btn.style.left = (sidebar.offsetWidth || 240) + 'px';
  }

  btn.addEventListener('click', async () => {
    sidebar.classList.toggle('collapsed');
    const isCollapsed = sidebar.classList.contains('collapsed');
    document.body.classList.toggle('sidebar-collapsed', isCollapsed);
    localStorage.setItem('sidebar_visible', isCollapsed ? 'false' : 'true');
    localStorage.setItem('pdfboard-sidebar-visible', isCollapsed ? 'false' : 'true');
    const pdf = await import('./pdf.js');
    if (pdf && pdf.updateSidebarPadding) pdf.updateSidebarPadding();
    updateArrowPos();
    setTimeout(() => window.dispatchEvent(new Event('resize')), 240);
  });

  const obs = new MutationObserver(updateArrowPos);
  obs.observe(sidebar, { attributes: true, attributeFilter: ['class', 'style'] });
  window.addEventListener('resize', updateArrowPos);
  updateArrowPos();
}

/* ═══════════════════════════════════════════════════════════
   §12. ACTIVE TOOL PROPS
   ═══════════════════════════════════════════════════════════ */
function renderActiveToolProps(container, state) {
  if (!container || !state) return;
  const tool = state.tool || 'select';

  if (tool === 'select') {
    container.innerHTML = `
      <div class="prop-section" style="background:rgba(74,126,255,.05);border:1px solid rgba(74,126,255,.25);border-radius:8px;margin-bottom:12px;padding:10px">
        <div class="prop-title" style="color:var(--sh-accent);margin-bottom:4px">👆 أداة التحديد نشطة</div>
        <div style="font-size:11px;color:var(--sh-text-muted);line-height:1.6">
          • انقر على أي عنصر لتحديده وتعديل خصائصه.<br>
          • <b>اسحب على مساحة فارغة</b> لرسم مستطيل تحديد.<br>
          • <b>Shift+نقرة</b> للتحديد المتعدد، <b>Alt+سحب</b> للتكرار، <b>Space+سحب</b> للتحريك.<br>
          • <b>النقر المزدوج</b> على النص لتحريره.
        </div>
      </div>
    `;
    return;
  }

  if (tool === 'hand') {
    container.innerHTML = `
      <div class="prop-section" style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:8px;margin-bottom:12px;padding:10px">
        <div class="prop-title" style="margin-bottom:4px">🖐️ أداة اليد نشطة</div>
        <div style="font-size:11px;color:var(--sh-text-muted);line-height:1.6">اسحب لتحريك الشريحة (Pan) والتنقل.</div>
      </div>
    `;
    return;
  }

  // قلم
  if (tool === 'pen') {
    const colors = ['#000000', '#2563eb', '#dc2626', '#16a34a', '#eab308', '#9333ea', '#ea580c', '#ffffff'];
    const sizes = [2, 5, 10, 16];
    const smooths = [{ v: 0, l: 'بدون' }, { v: 1, l: 'خفيف' }, { v: 2, l: 'متوسط' }, { v: 3, l: 'عالي' }];
    container.innerHTML = `
      <div class="prop-section" style="background:rgba(74,126,255,.04);border:1px solid rgba(74,126,255,.25);border-radius:8px;margin-bottom:12px;padding:10px">
        <div class="prop-title">✏️ خيارات القلم</div>
        <div style="margin-top:8px">
          <label style="font-size:10.5px;color:var(--sh-text-muted)">اللون:</label>
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:6px">
            ${colors.map(c => `<button type="button" class="tool-color-circle" data-pencolor="${c}" style="width:26px;height:26px;border-radius:50%;background:${c};border:${c === state.penColor ? '2.5px solid #4a7eff' : '2px solid rgba(255,255,255,.2)'};cursor:pointer;padding:0"></button>`).join('')}
            <input type="color" id="sidePenColorInp" value="${state.penColor}" style="width:26px;height:26px;border:none;background:transparent;cursor:pointer">
          </div>
        </div>
        <div style="margin-top:10px">
          <label style="font-size:10.5px;color:var(--sh-text-muted)">السماكة: <b style="color:var(--sh-accent)">${state.penSize}px</b></label>
          <div class="prop-row" style="grid-template-columns: repeat(4, 1fr); gap: 4px; margin-top:6px">
            ${sizes.map(s => `<button type="button" class="prop-input" data-pensize="${s}" style="cursor:pointer;padding:6px 0;font-size:11px;${s === state.penSize ? 'border-color:var(--sh-accent);background:rgba(74,126,255,.15);color:#fff' : ''}">${s}px</button>`).join('')}
          </div>
        </div>
        <div style="margin-top:10px">
          <label style="font-size:10.5px;color:var(--sh-text-muted)">النعومة:</label>
          <div class="prop-row" style="grid-template-columns: repeat(4, 1fr); gap: 4px; margin-top:6px">
            ${smooths.map(sm => `<button type="button" class="prop-input" data-pensmooth="${sm.v}" style="cursor:pointer;padding:6px 0;font-size:10.5px;${sm.v === state.penSmoothing ? 'border-color:var(--sh-accent);background:rgba(74,126,255,.15);color:#fff' : ''}">${sm.l}</button>`).join('')}
          </div>
        </div>
      </div>
    `;
    container.querySelectorAll('[data-pencolor]').forEach(b => b.addEventListener('click', () => {
      state.penColor = b.dataset.pencolor;
      import('./main.js').then(m => m.updateToolbarIndicators());
      renderActiveToolProps(container, state);
    }));
    const cInp = container.querySelector('#sidePenColorInp');
    if (cInp) cInp.addEventListener('input', () => {
      state.penColor = cInp.value;
      import('./main.js').then(m => m.updateToolbarIndicators());
      renderActiveToolProps(container, state);
    });
    container.querySelectorAll('[data-pensize]').forEach(b => b.addEventListener('click', () => {
      state.penSize = parseFloat(b.dataset.pensize);
      renderActiveToolProps(container, state);
    }));
    container.querySelectorAll('[data-pensmooth]').forEach(b => b.addEventListener('click', () => {
      state.penSmoothing = parseInt(b.dataset.pensmooth, 10);
      renderActiveToolProps(container, state);
    }));
    return;
  }

  if (tool === 'highlighter') {
    const colors = ['#fde047', '#86efac', '#93c5fd', '#f472b6', '#fdba74'];
    const sizes = [10, 18, 28, 40];
    const smooths = [{ v: 0, l: 'بدون' }, { v: 1, l: 'خفيف' }, { v: 2, l: 'متوسط' }, { v: 3, l: 'عالي' }];
    container.innerHTML = `
      <div class="prop-section" style="background:rgba(234,179,8,.04);border:1px solid rgba(234,179,8,.25);border-radius:8px;margin-bottom:12px;padding:10px">
        <div class="prop-title">🖍️ خيارات قلم التحديد</div>
        <div style="margin-top:8px">
          <label style="font-size:10.5px;color:var(--sh-text-muted)">اللون:</label>
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:6px">
            ${colors.map(c => `<button type="button" class="tool-color-circle" data-hlcolor="${c}" style="width:26px;height:26px;border-radius:50%;background:${c};border:${c === state.highlighterColor ? '2.5px solid #fff' : '2px solid rgba(255,255,255,.2)'};cursor:pointer;padding:0"></button>`).join('')}
          </div>
        </div>
        <div style="margin-top:10px">
          <label style="font-size:10.5px;color:var(--sh-text-muted)">العرض: <b style="color:#eab308">${state.highlighterSize}px</b></label>
          <div class="prop-row" style="grid-template-columns: repeat(4, 1fr); gap: 4px; margin-top:6px">
            ${sizes.map(s => `<button type="button" class="prop-input" data-hlsize="${s}" style="cursor:pointer;padding:6px 0;font-size:11px;${s === state.highlighterSize ? 'border-color:#eab308;background:rgba(234,179,8,.15);color:#fff' : ''}">${s}px</button>`).join('')}
          </div>
        </div>
        <div style="margin-top:10px">
          <label style="font-size:10.5px;color:var(--sh-text-muted)">النعومة:</label>
          <div class="prop-row" style="grid-template-columns: repeat(4, 1fr); gap: 4px; margin-top:6px">
            ${smooths.map(sm => `<button type="button" class="prop-input" data-hlsmooth="${sm.v}" style="cursor:pointer;padding:6px 0;font-size:10.5px;${sm.v === state.highlighterSmoothing ? 'border-color:#eab308;background:rgba(234,179,8,.15);color:#fff' : ''}">${sm.l}</button>`).join('')}
          </div>
        </div>
      </div>
    `;
    container.querySelectorAll('[data-hlcolor]').forEach(b => b.addEventListener('click', () => {
      state.highlighterColor = b.dataset.hlcolor;
      import('./main.js').then(m => m.updateToolbarIndicators());
      renderActiveToolProps(container, state);
    }));
    container.querySelectorAll('[data-hlsize]').forEach(b => b.addEventListener('click', () => {
      state.highlighterSize = parseFloat(b.dataset.hlsize);
      renderActiveToolProps(container, state);
    }));
    container.querySelectorAll('[data-hlsmooth]').forEach(b => b.addEventListener('click', () => {
      state.highlighterSmoothing = parseInt(b.dataset.hlsmooth, 10);
      renderActiveToolProps(container, state);
    }));
    return;
  }

  if (tool === 'laser') {
    const colors = ['#ff0000', '#2563eb', '#22c55e', '#eab308'];
    const glows = [{ v: 1.5, l: 'خفيف' }, { v: 3, l: 'متوسط' }, { v: 6, l: 'قوي' }];
    const sizes = [4, 8, 14];
    const lives = [{ ms: 2000, l: '2 ث' }, { ms: 3000, l: '3 ث' }, { ms: 5000, l: '5 ث' }];
    container.innerHTML = `
      <div class="prop-section" style="background:rgba(239,68,68,.04);border:1px solid rgba(239,68,68,.25);border-radius:8px;margin-bottom:12px;padding:10px">
        <div class="prop-title">🔴 مؤشر الليزر</div>
        <div style="margin-top:8px">
          <label style="font-size:10.5px;color:var(--sh-text-muted)">اللون:</label>
          <div style="display:flex;align-items:center;gap:6px;margin-top:6px">
            ${colors.map(c => `<button type="button" data-lasercolor="${c}" style="width:26px;height:26px;border-radius:50%;background:${c};border:${c === state.laserColor ? '2.5px solid #fff' : '2px solid rgba(255,255,255,.2)'};cursor:pointer;padding:0"></button>`).join('')}
          </div>
        </div>
        <div style="margin-top:10px">
          <label style="font-size:10.5px;color:var(--sh-text-muted)">التوهج:</label>
          <div class="prop-row" style="grid-template-columns: repeat(3, 1fr); gap: 4px; margin-top:6px">
            ${glows.map(g => `<button type="button" class="prop-input" data-laserglow="${g.v}" style="cursor:pointer;padding:6px 0;font-size:10.5px;${g.v === state.laserGlowIntensity ? 'border-color:#ef4444;background:rgba(239,68,68,.15);color:#fff' : ''}">${g.l}</button>`).join('')}
          </div>
        </div>
        <div style="margin-top:10px">
          <label style="font-size:10.5px;color:var(--sh-text-muted)">الحجم والمدة:</label>
          <div class="prop-row" style="grid-template-columns: repeat(3, 1fr); gap: 4px; margin-top:6px">
            ${sizes.map(s => `<button type="button" class="prop-input" data-lasersize="${s}" style="cursor:pointer;padding:6px 0;font-size:10.5px;${s === state.laserSize ? 'border-color:#ef4444;background:rgba(239,68,68,.15);color:#fff' : ''}">${s}px</button>`).join('')}
          </div>
          <div class="prop-row" style="grid-template-columns: repeat(3, 1fr); gap: 4px; margin-top: 4px">
            ${lives.map(l => `<button type="button" class="prop-input" data-laserlife="${l.ms}" style="cursor:pointer;padding:6px 0;font-size:10.5px;${l.ms === state.laserLifeMs ? 'border-color:#ef4444;background:rgba(239,68,68,.15);color:#fff' : ''}">${l.l}</button>`).join('')}
          </div>
        </div>
      </div>
    `;
    container.querySelectorAll('[data-lasercolor]').forEach(b => b.addEventListener('click', () => {
      state.laserColor = b.dataset.lasercolor;
      import('./main.js').then(m => m.updateToolbarIndicators());
      renderActiveToolProps(container, state);
    }));
    container.querySelectorAll('[data-laserglow]').forEach(b => b.addEventListener('click', () => {
      state.laserGlowIntensity = parseFloat(b.dataset.laserglow);
      renderActiveToolProps(container, state);
    }));
    container.querySelectorAll('[data-lasersize]').forEach(b => b.addEventListener('click', () => {
      state.laserSize = parseFloat(b.dataset.lasersize);
      renderActiveToolProps(container, state);
    }));
    container.querySelectorAll('[data-laserlife]').forEach(b => b.addEventListener('click', () => {
      state.laserLifeMs = parseInt(b.dataset.laserlife, 10);
      renderActiveToolProps(container, state);
    }));
    return;
  }

  if (tool === 'eraser') {
    const sizes = [12, 24, 40, 60];
    container.innerHTML = `
      <div class="prop-section" style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.15);border-radius:8px;margin-bottom:12px;padding:10px">
        <div class="prop-title">🧽 خيارات الممحاة</div>
        <div style="margin-top:8px">
          <label style="font-size:10.5px;color:var(--sh-text-muted)">القطر:</label>
          <div class="prop-row" style="grid-template-columns: repeat(4, 1fr); gap: 4px; margin-top:6px">
            ${sizes.map(s => `<button type="button" class="prop-input" data-erasersize="${s}" style="cursor:pointer;padding:6px 0;font-size:11px;${s === state.eraserSize ? 'border-color:var(--sh-accent);background:rgba(74,126,255,.15);color:#fff' : ''}">${s}px</button>`).join('')}
          </div>
        </div>
        <div style="margin-top:10px">
          <label style="font-size:11px;color:var(--sh-text);cursor:pointer;display:inline-flex;align-items:center;gap:6px">
            <input type="checkbox" id="sideEraseShapes" ${state.eraserErasesShapes ? 'checked' : ''}> مسح الأشكال أيضاً
          </label>
        </div>
      </div>
    `;
    container.querySelectorAll('[data-erasersize]').forEach(b => b.addEventListener('click', () => {
      state.eraserSize = parseFloat(b.dataset.erasersize);
      renderActiveToolProps(container, state);
    }));
    const cShapes = container.querySelector('#sideEraseShapes');
    if (cShapes) cShapes.addEventListener('change', () => { state.eraserErasesShapes = cShapes.checked; });
    return;
  }

  if (tool === 'shape') {
    const kinds = [{ k: 'rect', l: '▭ مستطيل' }, { k: 'circle', l: '◯ دائرة' }, { k: 'arrow', l: '↗ سهم / خط' }];
    const sizes = [2, 5, 10, 16];
    container.innerHTML = `
      <div class="prop-section" style="background:rgba(74,126,255,.04);border:1px solid rgba(74,126,255,.25);border-radius:8px;margin-bottom:12px;padding:10px">
        <div class="prop-title">▭ أداة الأشكال</div>
        <div style="margin-top:8px">
          <label style="font-size:10.5px;color:var(--sh-text-muted)">نوع الشكل:</label>
          <div class="prop-row" style="grid-template-columns: repeat(3, 1fr); gap: 4px; margin-top:6px">
            ${kinds.map(k => `<button type="button" class="prop-input" data-sideshape="${k.k}" style="cursor:pointer;padding:6px 0;font-size:11px;${k.k === state.shapeKind ? 'border-color:var(--sh-accent);background:rgba(74,126,255,.15);color:#fff' : ''}">${k.l}</button>`).join('')}
          </div>
        </div>
        <div style="margin-top:10px">
          <label style="font-size:10.5px;color:var(--sh-text-muted)">السماكة:</label>
          <div class="prop-row" style="grid-template-columns: repeat(4, 1fr); gap: 4px; margin-top:6px">
            ${sizes.map(s => `<button type="button" class="prop-input" data-sideshapesize="${s}" style="cursor:pointer;padding:6px 0;font-size:11px;${s === state.shapeSize ? 'border-color:var(--sh-accent);background:rgba(74,126,255,.15);color:#fff' : ''}">${s}px</button>`).join('')}
          </div>
        </div>
      </div>
    `;
    container.querySelectorAll('[data-sideshape]').forEach(b => b.addEventListener('click', () => {
      state.shapeKind = b.dataset.sideshape;
      renderActiveToolProps(container, state);
    }));
    container.querySelectorAll('[data-sideshapesize]').forEach(b => b.addEventListener('click', () => {
      state.shapeSize = parseFloat(b.dataset.sideshapesize);
      renderActiveToolProps(container, state);
    }));
    return;
  }

  if (tool === 'text') {
    const sizes = [14, 18, 22, 28, 36, 48];
    const colors = ['#000000', '#1e3a8a', '#dc2626', '#16a34a', '#eab308', '#7c3aed', '#ffffff'];
    container.innerHTML = `
      <div class="prop-section" style="background:rgba(74,126,255,.04);border:1px solid rgba(74,126,255,.25);border-radius:8px;margin-bottom:12px;padding:10px">
        <div class="prop-title">🔤 أداة النص</div>
        <div style="margin-top:8px">
          <label style="font-size:10.5px;color:var(--sh-text-muted)">الحجم:</label>
          <div class="prop-row" style="grid-template-columns: repeat(6, 1fr); gap: 3px; margin-top:6px">
            ${sizes.map(s => `<button type="button" class="prop-input" data-sidetextsize="${s}" style="cursor:pointer;padding:6px 0;font-size:11px;${s === state.textSize ? 'border-color:var(--sh-accent);background:rgba(74,126,255,.15);color:#fff' : ''}">${s}</button>`).join('')}
          </div>
        </div>
        <div style="margin-top:10px">
          <div class="prop-row" style="grid-template-columns: 1fr 1fr; gap: 6px">
            <button type="button" class="prop-input" id="sideTextBold" style="cursor:pointer;font-weight:bold;${state.textBold ? 'border-color:var(--sh-accent);background:rgba(74,126,255,.15);color:#fff' : ''}">B عريض</button>
            <button type="button" class="prop-input" id="sideTextItalic" style="cursor:pointer;font-style:italic;${state.textItalic ? 'border-color:var(--sh-accent);background:rgba(74,126,255,.15);color:#fff' : ''}">I مائل</button>
          </div>
        </div>
        <div style="margin-top:10px">
          <label style="font-size:10.5px;color:var(--sh-text-muted)">اللون:</label>
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:6px">
            ${colors.map(c => `<button type="button" data-sidetextcolor="${c}" style="width:26px;height:26px;border-radius:50%;background:${c};border:${c === state.textColor ? '2.5px solid #4a7eff' : '2px solid rgba(255,255,255,.2)'};cursor:pointer;padding:0"></button>`).join('')}
          </div>
        </div>
      </div>
    `;
    container.querySelectorAll('[data-sidetextsize]').forEach(b => b.addEventListener('click', () => {
      state.textSize = parseFloat(b.dataset.sidetextsize);
      renderActiveToolProps(container, state);
    }));
    const bBtn = container.querySelector('#sideTextBold');
    if (bBtn) bBtn.addEventListener('click', () => { state.textBold = !state.textBold; renderActiveToolProps(container, state); });
    const iBtn = container.querySelector('#sideTextItalic');
    if (iBtn) iBtn.addEventListener('click', () => { state.textItalic = !state.textItalic; renderActiveToolProps(container, state); });
    container.querySelectorAll('[data-sidetextcolor]').forEach(b => b.addEventListener('click', () => {
      state.textColor = b.dataset.sidetextcolor;
      import('./main.js').then(m => m.updateToolbarIndicators());
      renderActiveToolProps(container, state);
    }));
    return;
  }
}

/* ═══════════════════════════════════════════════════════════
   §13. PROJECT DIMS PANEL (Session 6 — safeToast بدل alert)
   ═══════════════════════════════════════════════════════════ */
function showDocumentDimsPanel() {
  const docPanel = document.getElementById('documentInfoPanel');
  if (docPanel && docPanel.style.display === 'none') {
    const elemPanel = document.getElementById('selectedElementPropsPanel');
    if (elemPanel) elemPanel.style.display = 'none';
    docPanel.style.display = 'block';
  }
}

function initProjectDimsPanel() {
  const infoPanel = document.getElementById('documentInfoPanel');
  if (!infoPanel) return;

  infoPanel.innerHTML = `
    <div id="activeToolPropsHost"></div>
    <div class="prop-section" id="projectDimsSection">
      <div class="prop-title">📐 أبعاد المشروع</div>
      <div class="prop-row">
        <div class="prop-field"><label>العرض (px)</label><input type="number" class="prop-input" id="projW" min="100" max="20000" step="1" /></div>
        <div class="prop-field"><label>الارتفاع (px)</label><input type="number" class="prop-input" id="projH" min="100" max="20000" step="1" /></div>
      </div>
      <div class="prop-row" style="grid-template-columns:1fr 1fr 1fr;gap:4px;margin-top:6px">
        <button type="button" class="prop-input" data-preset="16:9" style="cursor:pointer;padding:6px 4px;font-size:11px">16:9</button>
        <button type="button" class="prop-input" data-preset="4:3" style="cursor:pointer;padding:6px 4px;font-size:11px">4:3</button>
        <button type="button" class="prop-input" data-preset="1:1" style="cursor:pointer;padding:6px 4px;font-size:11px">1:1</button>
        <button type="button" class="prop-input" data-preset="A4-P" style="cursor:pointer;padding:6px 4px;font-size:11px">A4 ↓</button>
        <button type="button" class="prop-input" data-preset="A4-L" style="cursor:pointer;padding:6px 4px;font-size:11px">A4 →</button>
        <button type="button" class="prop-input" data-preset="9:16" style="cursor:pointer;padding:6px 4px;font-size:11px">9:16</button>
      </div>
      <button type="button" class="prop-input" id="projApply" style="margin-top:10px;cursor:pointer;background:var(--sh-accent);color:#fff;border:none;font-weight:600;padding:8px;border-radius:8px">✨ تطبيق الأبعاد على جميع الشرائح</button>
      <div id="projHint" style="font-size:10px;color:var(--sh-text-dim);margin-top:6px;text-align:center"></div>
    </div>
    <div class="prop-section">
      <div class="prop-title">🎨 خلفية الشريحة</div>
      <div class="prop-row" style="grid-template-columns:auto 1fr;gap:6px">
        <input type="color" class="prop-input" id="projBgColor" value="#ffffff" style="width:46px;height:32px;padding:2px;cursor:pointer">
        <button type="button" class="prop-input" id="projBgApply" style="cursor:pointer;font-weight:600;padding:6px">تطبيق اللون</button>
      </div>
      <div id="projBgHint" style="font-size:10px;color:var(--sh-text-dim);margin-top:6px;text-align:center"></div>
    </div>
  `;

  const wInp = document.getElementById('projW');
  const hInp = document.getElementById('projH');
  const applyBtn = document.getElementById('projApply');
  const hint = document.getElementById('projHint');
  const bgColorInp = document.getElementById('projBgColor');
  const bgApplyBtn = document.getElementById('projBgApply');
  const bgHint = document.getElementById('projBgHint');
  const toolHost = document.getElementById('activeToolPropsHost');

  async function refresh() {
    const core = await import('./core.js');
    const st = core.state;
    if (toolHost) renderActiveToolProps(toolHost, st);

    if (!st || !st.pdfW || !st.pdfH) {
      if (hint) hint.textContent = 'افتح مشروعاً أولاً';
      if (wInp) wInp.disabled = true;
      if (hInp) hInp.disabled = true;
      if (applyBtn) { applyBtn.disabled = true; applyBtn.style.opacity = '0.5'; }
      if (bgColorInp) bgColorInp.disabled = true;
      if (bgApplyBtn) { bgApplyBtn.disabled = true; bgApplyBtn.style.opacity = '0.5'; }
      return;
    }

    if (wInp) wInp.disabled = false;
    if (hInp) hInp.disabled = false;
    if (applyBtn) { applyBtn.disabled = false; applyBtn.style.opacity = '1'; }

    const w = st.projectDims && st.projectDims.width ? st.projectDims.width : Math.round(st.pdfW);
    const h = st.projectDims && st.projectDims.height ? st.projectDims.height : Math.round(st.pdfH);
    if (wInp && document.activeElement !== wInp) wInp.value = w;
    if (hInp && document.activeElement !== hInp) hInp.value = h;
    if (hint) hint.textContent = `النسبة: ${(w / h).toFixed(3)} : 1`;

    const slide = st.slides[st.currentPage - 1];
    if (slide && slide.bg) {
      if (slide.bg.type === 'blank') {
        if (bgColorInp) bgColorInp.disabled = false;
        if (bgApplyBtn) { bgApplyBtn.disabled = false; bgApplyBtn.style.opacity = '1'; }
        const c = slide.bg.color || (st.projectDims && st.projectDims.bg) || '#ffffff';
        if (bgColorInp && document.activeElement !== bgColorInp) bgColorInp.value = c;
        if (bgHint) bgHint.textContent = 'شريحة فارغة';
      } else {
        if (bgColorInp) bgColorInp.disabled = true;
        if (bgApplyBtn) { bgApplyBtn.disabled = true; bgApplyBtn.style.opacity = '0.5'; }
        if (bgHint) bgHint.textContent = 'شريحة PDF — الخلفية ثابتة';
      }
    }
  }

  refresh();
  document.addEventListener('ipb:pageChanged', () => setTimeout(refresh, 80));
  document.addEventListener('ipb:projectCreated', () => setTimeout(refresh, 80));
  document.addEventListener('ipb:projectClosed', () => setTimeout(refresh, 80));
  document.addEventListener('ipb:toolChanged', () => setTimeout(refresh, 40));
  document.addEventListener('ipb:toolConfigChanged', () => setTimeout(refresh, 40));

  infoPanel.querySelectorAll('[data-preset]').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = btn.dataset.preset;
      let w = 2000, h = 1125;
      if (p === '16:9') { w = 2000; h = 1125; }
      if (p === '4:3') { w = 2000; h = 1500; }
      if (p === '1:1') { w = 2000; h = 2000; }
      if (p === 'A4-P') { w = 1414; h = 2000; }
      if (p === 'A4-L') { w = 2000; h = 1414; }
      if (p === '9:16') { w = 1125; h = 2000; }
      if (wInp) wInp.value = w;
      if (hInp) hInp.value = h;
    });
  });

  if (applyBtn) {
    applyBtn.addEventListener('click', async () => {
      const w = parseInt(wInp.value, 10);
      const h = parseInt(hInp.value, 10);
      if (!w || !h) { safeToast('الرجاء إدخال أبعاد صالحة', 'warn'); return; }
      if (w < 100 || h < 100) { safeToast('الأبعاد صغيرة جداً (الحد الأدنى 100px)', 'warn'); return; }
      if (w > 20000 || h > 20000) { safeToast('الأبعاد كبيرة جداً (الحد الأقصى 20000px)', 'warn'); return; }

      try {
        const core = await import('./core.js');
        const pdf = await import('./pdf.js');
        const st = core.state;
        const oldW = st.pdfW || 2000;
        const oldH = st.pdfH || 1414;
        const scaleX = w / oldW;
        const scaleY = h / oldH;

        Object.keys(st.pages).forEach(pageNum => {
          const pg = st.pages[pageNum];
          if (!pg) return;
          (pg.annotations || []).forEach(spec => {
            const a = spec.attrs || {};
            ['x', 'y', 'cx', 'cy', 'x1', 'y1', 'x2', 'y2', 'width', 'height', 'rx', 'ry'].forEach(k => {
              if (a[k] !== undefined) {
                const fx = (k === 'x' || k === 'width' || k === 'cx' || k === 'x1' || k === 'x2' || k === 'rx') ? scaleX : scaleY;
                a[k] = parseFloat(a[k]) * fx;
              }
            });
            if (a['stroke-width']) a['stroke-width'] = parseFloat(a['stroke-width']) * ((scaleX + scaleY) / 2);
          });
        });

        st.projectDims = st.projectDims || {};
        st.projectDims.width = w;
        st.projectDims.height = h;
        st.pageCache.clear();
        st.thumbCache.clear();
        st.history = { past: [], future: [] };

        await pdf.renderPage(st.currentPage);
        pdf.renderThumbnails();
        if (hint) hint.textContent = `✓ تم التطبيق — ${w} × ${h}`;
        setTimeout(refresh, 1500);
      } catch (e) {
        console.error(e);
        safeToast('تعذّر التطبيق: ' + e.message, 'error');
      }
    });
  }

  async function applyBg(color) {
    try {
      const core = await import('./core.js');
      const pdf = await import('./pdf.js');
      const st = core.state;
      if (!st.currentPage || st.currentPage < 1 || st.currentPage > st.totalPages) return;
      const slide = st.slides[st.currentPage - 1];
      if (!slide) return;
      if (slide.bg.type !== 'blank') { if (core.toast) core.toast('لا يمكن تغيير خلفية شريحة PDF', 'warn'); return; }
      slide.bg.color = color;
      st.pageCache.delete(st.currentPage);
      st.thumbCache.delete(st.currentPage);
      await pdf.renderPage(st.currentPage);
      pdf.renderThumbnails();
      if (bgHint) bgHint.textContent = '✓ تم التطبيق';
      setTimeout(refresh, 1200);
    } catch (e) { console.error(e); }
  }

  if (bgApplyBtn && bgColorInp) bgApplyBtn.addEventListener('click', () => applyBg(bgColorInp.value));

  function updateVisibility() {
    const panel = document.getElementById('selectedElementPropsPanel');
    const hasSel = document.querySelectorAll('#stageContent .selected').length > 0;
    if (hasSel) { infoPanel.style.display = 'none'; if (panel) panel.style.display = 'block'; }
    else { infoPanel.style.display = 'block'; if (panel) panel.style.display = 'none'; }
  }
  updateVisibility();

  const stageContent = document.getElementById('stageContent');
  if (stageContent) {
    const obs = new MutationObserver(updateVisibility);
    obs.observe(stageContent, { attributes: true, attributeFilter: ['class'], subtree: true });
  }
}

/* ═══════════════════════════════════════════════════════════
   §14. ELEMENT DESIGN PROPS — placeholder (long; see original)
   ═══════════════════════════════════════════════════════════ */
function initElementDesignProps() {
  const panel = document.getElementById('selectedElementPropsPanel');
  const infoPanel = document.getElementById('documentInfoPanel');
  if (!panel) return;

  const PPT_ALIGN_ICONS = {
    left: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><line x1="2.5" y1="2" x2="2.5" y2="16" stroke="currentColor" stroke-width="2"/><rect x="2.5" y="4" width="11" height="3" rx="1" fill="currentColor" opacity="0.85"/><rect x="2.5" y="10" width="7" height="3" rx="1" fill="currentColor" opacity="0.85"/></svg>`,
    centerH: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><line x1="9" y1="2" x2="9" y2="16" stroke="currentColor" stroke-width="1.8" stroke-dasharray="2 1"/><rect x="3" y="4" width="12" height="3" rx="1" fill="currentColor" opacity="0.85"/><rect x="5.5" y="10" width="7" height="3" rx="1" fill="currentColor" opacity="0.85"/></svg>`,
    right: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><line x1="15.5" y1="2" x2="15.5" y2="16" stroke="currentColor" stroke-width="2"/><rect x="4.5" y="4" width="11" height="3" rx="1" fill="currentColor" opacity="0.85"/><rect x="8.5" y="10" width="7" height="3" rx="1" fill="currentColor" opacity="0.85"/></svg>`,
    top: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><line x1="2" y1="2.5" x2="16" y2="2.5" stroke="currentColor" stroke-width="2"/><rect x="4" y="2.5" width="3" height="11" rx="1" fill="currentColor" opacity="0.85"/><rect x="10" y="2.5" width="3" height="7" rx="1" fill="currentColor" opacity="0.85"/></svg>`,
    centerV: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><line x1="2" y1="9" x2="16" y2="9" stroke="currentColor" stroke-width="1.8" stroke-dasharray="2 1"/><rect x="4" y="3" width="3" height="12" rx="1" fill="currentColor" opacity="0.85"/><rect x="10" y="5.5" width="3" height="7" rx="1" fill="currentColor" opacity="0.85"/></svg>`,
    bottom: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><line x1="2" y1="15.5" x2="16" y2="15.5" stroke="currentColor" stroke-width="2"/><rect x="4" y="4.5" width="3" height="11" rx="1" fill="currentColor" opacity="0.85"/><rect x="10" y="8.5" width="3" height="7" rx="1" fill="currentColor" opacity="0.85"/></svg>`,
    distH: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" style="vertical-align:middle;margin-left:4px"><line x1="2" y1="1" x2="2" y2="15" stroke="currentColor" stroke-width="1.8"/><line x1="14" y1="1" x2="14" y2="15" stroke="currentColor" stroke-width="1.8"/><rect x="5.5" y="3.5" width="2" height="9" rx="0.5" fill="currentColor"/><rect x="8.5" y="3.5" width="2" height="9" rx="0.5" fill="currentColor"/></svg>`,
    distV: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" style="vertical-align:middle;margin-left:4px"><line x1="1" y1="2" x2="15" y2="2" stroke="currentColor" stroke-width="1.8"/><line x1="1" y1="14" x2="15" y2="14" stroke="currentColor" stroke-width="1.8"/><rect x="3.5" y="5.5" width="9" height="2" rx="0.5" fill="currentColor"/><rect x="3.5" y="8.5" width="9" height="2" rx="0.5" fill="currentColor"/></svg>`,
  };

  let currentAlignTarget = 'selection';

  async function getSelectionInfo() {
    const core = await import('./core.js');
    const list = core.state.selectedList && core.state.selectedList.length > 0
      ? core.state.selectedList
      : (core.state.selected ? [core.state.selected] : []);
    return { list, count: list.length, primary: list.length > 0 ? list[0] : null };
  }

  async function renderProps() {
    const { list, count, primary } = await getSelectionInfo();
    const inter = await import('./interaction.js');
    const core = await import('./core.js');

    if (count === 0) {
      panel.style.display = 'none';
      panel.innerHTML = '';
      if (infoPanel) infoPanel.style.display = 'block';
      return;
    }

    panel.style.display = 'block';
    if (infoPanel) infoPanel.style.display = 'none';

    /* ═══════════ تحديد متعدد ═══════════ */
    if (count > 1) {
      panel.innerHTML = `
        <div class="prop-section">
          <div class="prop-title" style="display:flex;justify-content:space-between;align-items:center">
            <span>🗂️ تحديد متعدد (${count} عناصر)</span>
            <span style="font-size:10px;color:var(--sh-accent);background:rgba(74,126,255,.1);padding:2px 6px;border-radius:4px">كتلة واحدة</span>
          </div>
          <div style="margin-top:8px">
            <label style="font-size:10.5px;color:var(--sh-text-muted);display:block;margin-bottom:4px">مرجع المحاذاة والتوزيع:</label>
            <div class="align-target-switch">
              <button type="button" class="align-target-btn ${currentAlignTarget === 'selection' ? 'active' : ''}" data-target="selection">🔲 العناصر المحددة</button>
              <button type="button" class="align-target-btn ${currentAlignTarget === 'canvas' ? 'active' : ''}" data-target="canvas">🖼️ الكانفاس</button>
            </div>
          </div>
          <div style="margin-top:8px">
            <label style="font-size:10.5px;color:var(--sh-text-muted);display:block;margin-bottom:4px">المحاذاة:</label>
            <div class="align-grid">
              <button type="button" class="align-action-btn" data-align="left" title="محاذاة لليسار">${PPT_ALIGN_ICONS.left}</button>
              <button type="button" class="align-action-btn" data-align="centerH" title="توسيط أفقياً">${PPT_ALIGN_ICONS.centerH}</button>
              <button type="button" class="align-action-btn" data-align="right" title="محاذاة لليمين">${PPT_ALIGN_ICONS.right}</button>
              <button type="button" class="align-action-btn" data-align="top" title="محاذاة للأعلى">${PPT_ALIGN_ICONS.top}</button>
              <button type="button" class="align-action-btn" data-align="centerV" title="توسيط رأسياً">${PPT_ALIGN_ICONS.centerV}</button>
              <button type="button" class="align-action-btn" data-align="bottom" title="محاذاة للأسفل">${PPT_ALIGN_ICONS.bottom}</button>
            </div>
          </div>
          <div style="margin-top:8px">
            <label style="font-size:10.5px;color:var(--sh-text-muted);display:block;margin-bottom:4px">التوزيع بالتساوي:</label>
            <div class="distribute-grid">
              <button type="button" class="distribute-action-btn" data-dist="horizontal">${PPT_ALIGN_ICONS.distH} توزيع أفقي</button>
              <button type="button" class="distribute-action-btn" data-dist="vertical">${PPT_ALIGN_ICONS.distV} توزيع رأسي</button>
            </div>
          </div>
        </div>
        <div class="prop-section">
          <div class="prop-title">🗂 ترتيب الطبقات</div>
          <div class="prop-row" style="grid-template-columns:1fr 1fr;gap:4px">
            <button type="button" class="prop-input" id="bulkFrontBtn" style="cursor:pointer;font-size:11px;font-weight:600">⏫ إلى المقدمة</button>
            <button type="button" class="prop-input" id="bulkBackBtn" style="cursor:pointer;font-size:11px;font-weight:600">⏬ إلى الخلف</button>
          </div>
        </div>
        <div class="prop-section">
          <div class="prop-title">👁 الشفافية للكل</div>
          <div class="prop-row" style="grid-template-columns:1fr auto;align-items:center;gap:8px">
            <input type="range" id="bulkOpacitySlider" min="5" max="100" value="100" style="width:100%;accent-color:var(--sh-accent);cursor:pointer">
            <span id="bulkOpacityVal" style="font-size:11.5px;font-variant-numeric:tabular-nums;min-width:36px;text-align:center">100%</span>
          </div>
        </div>
        <div class="prop-section">
          <div class="prop-title">⚡ إجراءات سريعة</div>
          <div class="prop-row" style="grid-template-columns:1fr 1fr;gap:4px">
            <button type="button" class="prop-input" id="bulkDupBtn" style="cursor:pointer;font-size:11px;font-weight:600;background:rgba(74,126,255,.1);border-color:var(--sh-accent);color:#fff">📑 تكرار العناصر</button>
            <button type="button" class="prop-input" id="bulkDelBtn" style="cursor:pointer;font-size:11px;font-weight:600;background:rgba(239,68,68,.12);border-color:#ef4444;color:#ef4444">🗑️ حذف العناصر</button>
          </div>
        </div>
      `;

      panel.querySelectorAll('.align-target-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          currentAlignTarget = btn.dataset.target;
          panel.querySelectorAll('.align-target-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        });
      });

      panel.querySelectorAll('.align-action-btn').forEach(btn => {
        btn.addEventListener('click', () => inter.alignSelected(btn.dataset.align, currentAlignTarget));
      });

      panel.querySelectorAll('.distribute-action-btn').forEach(btn => {
        btn.addEventListener('click', () => inter.distributeSelected(btn.dataset.dist, currentAlignTarget));
      });

      const bFront = document.getElementById('bulkFrontBtn');
      const bBack = document.getElementById('bulkBackBtn');
      if (bFront) bFront.addEventListener('click', () => { list.forEach(it => inter.bringToFront(it.el)); core.commitChange(); refreshLayersPanel(); });
      if (bBack) bBack.addEventListener('click', () => { list.forEach(it => inter.sendToBack(it.el)); core.commitChange(); refreshLayersPanel(); });

      const bOpSlider = document.getElementById('bulkOpacitySlider');
      const bOpVal = document.getElementById('bulkOpacityVal');
      if (bOpSlider) {
        bOpSlider.addEventListener('input', () => {
          const v = parseInt(bOpSlider.value, 10);
          if (bOpVal) bOpVal.textContent = v + '%';
          const op = v / 100;
          list.forEach(it => {
            if (it.kind === 'svg') {
              const inner = it.el.querySelector('[data-annot]') || it.el;
              inner.setAttribute('opacity', op);
              it.el.style.opacity = op;
            } else {
              it.el.style.opacity = op;
            }
          });
        });
        bOpSlider.addEventListener('change', () => core.commitChange());
      }

      const bDup = document.getElementById('bulkDupBtn');
      const bDel = document.getElementById('bulkDelBtn');
      if (bDup) bDup.addEventListener('click', () => inter.duplicateSelectedElements());
      if (bDel) bDel.addEventListener('click', () => inter.deleteSelectedElements());
      return;
    }

    /* ═══════════ عنصر واحد ═══════════ */
    const sel = primary;
    const targetInner = sel.kind === 'svg' ? (sel.el.querySelector('[data-annot]') || sel.el) : sel.el;
    const curRot = parseFloat(targetInner.dataset.rotation) || 0;
    const isFlipH = targetInner.dataset.flipH === 'true';
    const isFlipV = targetInner.dataset.flipV === 'true';

    const kindLabel = {
      svg: 'شكل / رسم', text: 'مربع نص', media: 'صورة / فيديو', button: 'زر تفاعلي', embed: 'تضمين ويب',
    }[sel.kind] || 'عنصر';

    panel.innerHTML = `
      <div class="prop-section">
        <div class="prop-title" style="display:flex;justify-content:space-between;align-items:center">
          <span>✨ خصائص العنصر</span>
          <span style="font-size:10px;color:var(--sh-accent);background:rgba(74,126,255,.1);padding:2px 6px;border-radius:4px">${kindLabel}</span>
        </div>
        <div class="prop-row">
          <div class="prop-field scrub-field">
            <label class="scrub-label" id="lblPropX" data-scrub="x" title="اسحب للأعلى للزيادة وللأسفل للإنقاص"><span>الموضع الأفقي X</span> <span class="scrub-hint">⇕ سحب</span></label>
            <input type="number" class="prop-input scrubbable" id="elemPropX" step="1" />
          </div>
          <div class="prop-field scrub-field">
            <label class="scrub-label" id="lblPropY" data-scrub="y" title="اسحب للأعلى للزيادة وللأسفل للإنقاص"><span>الموضع الرأسي Y</span> <span class="scrub-hint">⇕ سحب</span></label>
            <input type="number" class="prop-input scrubbable" id="elemPropY" step="1" />
          </div>
        </div>
        <div class="prop-row">
          <div class="prop-field scrub-field">
            <label class="scrub-label" id="lblPropW" data-scrub="w"><span>العرض W</span> <span class="scrub-hint">⇕ سحب</span></label>
            <input type="number" class="prop-input scrubbable" id="elemPropW" min="1" step="1" />
          </div>
          <div class="prop-field scrub-field">
            <label class="scrub-label" id="lblPropH" data-scrub="h"><span>الارتفاع H</span> <span class="scrub-hint">⇕ سحب</span></label>
            <input type="number" class="prop-input scrubbable" id="elemPropH" min="1" step="1" />
          </div>
        </div>
      </div>
      <div class="prop-section">
        <div class="prop-title">📐 محاذاة للشريحة (PowerPoint Align)</div>
        <div class="align-grid">
          <button type="button" class="align-action-btn" data-align="left">${PPT_ALIGN_ICONS.left}</button>
          <button type="button" class="align-action-btn" data-align="centerH">${PPT_ALIGN_ICONS.centerH}</button>
          <button type="button" class="align-action-btn" data-align="right">${PPT_ALIGN_ICONS.right}</button>
          <button type="button" class="align-action-btn" data-align="top">${PPT_ALIGN_ICONS.top}</button>
          <button type="button" class="align-action-btn" data-align="centerV">${PPT_ALIGN_ICONS.centerV}</button>
          <button type="button" class="align-action-btn" data-align="bottom">${PPT_ALIGN_ICONS.bottom}</button>
        </div>
      </div>
      <div class="prop-section">
        <div class="prop-title">🔄 الدوران والانعكاس (Transform & Flip)</div>
        <div class="prop-row" style="grid-template-columns:1fr auto;gap:8px;align-items:center">
          <input type="range" class="prop-input" id="elemRotateSlider" min="0" max="360" value="${curRot}" style="accent-color:var(--sh-accent);cursor:pointer"/>
          <div style="display:flex;align-items:center;gap:3px">
            <input type="number" class="prop-input" id="elemRotateInput" min="0" max="360" value="${curRot}" style="width:48px;text-align:center"/>
            <span style="font-size:11px;color:#8a94a6">°</span>
          </div>
        </div>
        <div class="prop-row" style="grid-template-columns:repeat(4,1fr);gap:4px;margin-top:6px">
          <button type="button" class="prop-input" id="elemRotLBtn" title="تدوير 90° لليسار">↶ -90°</button>
          <button type="button" class="prop-input" id="elemRotRBtn" title="تدوير 90° لليمين">↷ +90°</button>
          <button type="button" class="prop-input ${isFlipH?'active':''}" id="elemFlipHBtn" title="عكس أفقي">↔ عكس</button>
          <button type="button" class="prop-input ${isFlipV?'active':''}" id="elemFlipVBtn" title="عكس رأسي">↕ عكس</button>
        </div>
        <div style="margin-top:6px">
          <button type="button" class="prop-input" id="elemResetTransformBtn" style="font-size:10.5px;cursor:pointer;width:100%">↺ إعادة ضبط الدوران والانعكاس</button>
        </div>
      </div>
      <div class="prop-section">
        <div class="prop-title" style="display:flex;justify-content:space-between;align-items:center">
          <span>🎯 نقطة الارتكاز (Origin Pivot)</span>
          <span style="font-size:10px;color:#10b981;font-weight:700" id="originCoordsBadge">${Math.round(parseFloat(targetInner.dataset.originX ?? 0.5) * 100)}%, ${Math.round(parseFloat(targetInner.dataset.originY ?? 0.5) * 100)}%</span>
        </div>
        <div style="font-size:10px;color:var(--sh-text-dim);margin-bottom:6px">اسحب المقبض الأخضر ⊕ في الكانفاس أو اختر من الشبكة:</div>
        <div style="display:flex;gap:10px;align-items:center">
          <div class="origin-9grid" id="origin9Grid">
            <button type="button" class="origin-dot-btn" data-ox="0" data-oy="0"></button>
            <button type="button" class="origin-dot-btn" data-ox="0.5" data-oy="0"></button>
            <button type="button" class="origin-dot-btn" data-ox="1" data-oy="0"></button>
            <button type="button" class="origin-dot-btn" data-ox="0" data-oy="0.5"></button>
            <button type="button" class="origin-dot-btn" data-ox="0.5" data-oy="0.5"></button>
            <button type="button" class="origin-dot-btn" data-ox="1" data-oy="0.5"></button>
            <button type="button" class="origin-dot-btn" data-ox="0" data-oy="1"></button>
            <button type="button" class="origin-dot-btn" data-ox="0.5" data-oy="1"></button>
            <button type="button" class="origin-dot-btn" data-ox="1" data-oy="1"></button>
          </div>
          <div style="flex:1">
            <div class="prop-row" style="margin-bottom:4px">
              <div class="prop-field"><label>X %</label><input type="number" class="prop-input" id="elemOriginX" min="0" max="100" value="${Math.round(parseFloat(targetInner.dataset.originX ?? 0.5) * 100)}" /></div>
              <div class="prop-field"><label>Y %</label><input type="number" class="prop-input" id="elemOriginY" min="0" max="100" value="${Math.round(parseFloat(targetInner.dataset.originY ?? 0.5) * 100)}" /></div>
            </div>
            <button type="button" class="prop-input" id="btnCenterOrigin" style="cursor:pointer;font-size:10px;padding:3px 6px;width:100%">توسيط (50%, 50%)</button>
          </div>
        </div>
      </div>
      <div id="elementSpecificProps"></div>
      <div class="prop-section">
        <div class="prop-title">🗂 ترتيب الطبقة</div>
        <div class="prop-row" style="grid-template-columns:1fr 1fr;gap:4px">
          <button type="button" class="prop-input" id="elemFrontBtn" style="cursor:pointer;font-size:11px;font-weight:600">⏫ إلى المقدمة</button>
          <button type="button" class="prop-input" id="elemBackBtn" style="cursor:pointer;font-size:11px;font-weight:600">⏬ إلى الخلف</button>
          <button type="button" class="prop-input" id="elemFwdBtn" style="cursor:pointer;font-size:11px;font-weight:600">▲ تقديم خطوة</button>
          <button type="button" class="prop-input" id="elemBwdBtn" style="cursor:pointer;font-size:11px;font-weight:600">▼ تأخير خطوة</button>
        </div>
      </div>
      <div class="prop-section">
        <div class="prop-title">👁 الشفافية</div>
        <div class="prop-row" style="grid-template-columns:1fr auto;align-items:center;gap:8px">
          <input type="range" id="elemOpacitySlider" min="5" max="100" value="100" style="width:100%;accent-color:var(--sh-accent);cursor:pointer">
          <span id="elemOpacityVal" style="font-size:11.5px;font-variant-numeric:tabular-nums;min-width:36px;text-align:center">100%</span>
        </div>
      </div>
      <div class="prop-section">
        <div class="prop-title">⚡ إجراءات</div>
        <div class="prop-row" style="grid-template-columns:1fr 1fr;gap:4px">
          <button type="button" class="prop-input" id="elemCopyBtn" style="cursor:pointer;font-size:11px;font-weight:600">📋 نسخ</button>
          <button type="button" class="prop-input" id="elemPasteBtn" style="cursor:pointer;font-size:11px;font-weight:600">📄 لصق</button>
        </div>
        <div class="prop-row" style="grid-template-columns:1fr 1fr;gap:4px;margin-top:4px">
          <button type="button" class="prop-input" id="elemDupBtn" style="cursor:pointer;font-size:11px;font-weight:600;background:rgba(74,126,255,.1);border-color:var(--sh-accent);color:#fff">📑 تكرار</button>
          <button type="button" class="prop-input" id="elemDelBtn" style="cursor:pointer;font-size:11px;font-weight:600;background:rgba(239,68,68,.12);border-color:#ef4444;color:#ef4444">🗑️ حذف</button>
        </div>
      </div>
    `;

    /* ═══════════ خصائص حسب النوع ═══════════ */
    const specHost = document.getElementById('elementSpecificProps');
    if (specHost) {
      if (sel.kind === 'text') {
        const curFont = sel.el.dataset.fontFamily || 'Cairo, sans-serif';
        const curSize = parseInt(sel.el.dataset.fontSize || '20', 10);
        const curColor = sel.el.dataset.color || '#1e3a8a';
        const isBold = sel.el.dataset.fontWeight === 'bold';
        const isItalic = sel.el.dataset.fontStyle === 'italic';
        const curBg = sel.el.dataset.bg || '';

        specHost.innerHTML = `
          <div class="prop-section">
            <div class="prop-title">✍️ خصائص النص</div>
            <div class="prop-row" style="margin-bottom:6px">
              <div class="prop-field"><label>حجم الخط (px)</label><input type="number" class="prop-input" id="textPropSize" value="${curSize}" min="8" max="200" /></div>
              <div class="prop-field"><label>لون النص</label><input type="color" class="prop-input" id="textPropColor" value="${curColor}" style="padding:2px;height:28px" /></div>
            </div>
            <div class="prop-row" style="margin-top:6px;margin-bottom:6px">
              <div class="prop-field" style="grid-column: 1 / -1">
                <label>🎨 لون تعبئة خلفية مربع النص</label>
                <div style="display:flex;gap:6px;align-items:center">
                  <input type="color" class="prop-input" id="textPropBgColor" value="${curBg && curBg.startsWith('#') ? curBg : '#ffffff'}" style="padding:2px;height:28px;flex:1" />
                  <button type="button" class="prop-input ${!curBg || curBg === 'transparent' || curBg === 'none' ? 'active' : ''}" id="textPropBgNone" style="cursor:pointer;font-size:11px;padding:0 12px;height:28px">شفاف</button>
                </div>
              </div>
            </div>
            <div class="prop-row" style="grid-template-columns:1fr 1fr 1fr;gap:4px">
              <button type="button" class="prop-input ${isBold ? 'active' : ''}" id="textBoldBtn" style="cursor:pointer;font-weight:bold">B</button>
              <button type="button" class="prop-input ${isItalic ? 'active' : ''}" id="textItalicBtn" style="cursor:pointer;font-style:italic">I</button>
              <button type="button" class="prop-input" id="textAlignRBtn" style="cursor:pointer">⇥</button>
            </div>
          </div>
        `;

        const tSize = document.getElementById('textPropSize');
        const tColor = document.getElementById('textPropColor');
        const tBgColor = document.getElementById('textPropBgColor');
        const tBgNone = document.getElementById('textPropBgNone');
        const tBold = document.getElementById('textBoldBtn');
        const tItal = document.getElementById('textItalicBtn');
        const tAlign = document.getElementById('textAlignRBtn');

        // ★ Session 4 — fontSizeRefCssW
        if (tSize) tSize.addEventListener('change', () => {
          sel.el.dataset.fontSize = tSize.value;
          sel.el.dataset.fontSizeRefCssW = String(core.state.cssW || 800);
          inter.applyTextStyles(sel.el);
          core.commitChange();
        });
        if (tColor) tColor.addEventListener('input', () => {
          sel.el.dataset.color = tColor.value;
          inter.applyTextStyles(sel.el);
          core.commitChange();
        });
        if (tBgColor) tBgColor.addEventListener('input', () => {
          sel.el.dataset.bg = tBgColor.value;
          inter.applyTextStyles(sel.el);
          if (tBgNone) tBgNone.classList.remove('active');
          core.commitChange();
        });
        if (tBgNone) tBgNone.addEventListener('click', () => {
          sel.el.dataset.bg = 'transparent';
          inter.applyTextStyles(sel.el);
          tBgNone.classList.add('active');
          core.commitChange();
        });
        if (tBold) tBold.addEventListener('click', () => {
          const nowB = sel.el.dataset.fontWeight === 'bold';
          sel.el.dataset.fontWeight = nowB ? 'normal' : 'bold';
          inter.applyTextStyles(sel.el);
          tBold.classList.toggle('active', !nowB);
          core.commitChange();
        });
        if (tItal) tItal.addEventListener('click', () => {
          const nowI = sel.el.dataset.fontStyle === 'italic';
          sel.el.dataset.fontStyle = nowI ? 'normal' : 'italic';
          inter.applyTextStyles(sel.el);
          tItal.classList.toggle('active', !nowI);
          core.commitChange();
        });
        if (tAlign) tAlign.addEventListener('click', () => {
          const curA = sel.el.dataset.align || 'right';
          const nextA = curA === 'right' ? 'center' : (curA === 'center' ? 'left' : 'right');
          sel.el.dataset.align = nextA;
          inter.applyTextStyles(sel.el);
          core.commitChange();
        });
      } else if (sel.kind === 'svg') {
        const inner = sel.el.querySelector('[data-annot]') || sel.el;
        const curStroke = inner.getAttribute('stroke') || '#000000';
        const curFill = inner.getAttribute('fill') || 'none';
        const curSW = inner.getAttribute('stroke-width') || '3';
        const tag = inner.tagName ? inner.tagName.toLowerCase() : '';
        const shapeType = inner.dataset.type || tag;

        let extraPropsHtml = '';
        if (tag === 'rect') {
          const curRx = parseFloat(inner.getAttribute('rx') || '0');
          extraPropsHtml += `
            <div class="prop-section">
              <div class="prop-title">📐 استدارة الزوايا</div>
              <div class="prop-row" style="grid-template-columns:1fr auto;gap:8px;align-items:center">
                <input type="range" class="prop-input" id="shapeRadiusSlider" min="0" max="80" value="${curRx}" style="accent-color:var(--sh-accent);cursor:pointer"/>
                <input type="number" class="prop-input" id="shapeRadiusInput" min="0" max="150" value="${curRx}" style="width:50px;text-align:center"/>
              </div>
              <div class="prop-row" style="grid-template-columns:repeat(4,1fr);gap:4px;margin-top:6px">
                <button type="button" class="prop-input preset-radius-btn" data-r="0">حاد 0</button>
                <button type="button" class="prop-input preset-radius-btn" data-r="12">خفيف 12</button>
                <button type="button" class="prop-input preset-radius-btn" data-r="24">متوسط 24</button>
                <button type="button" class="prop-input preset-radius-btn" data-r="50">كبسولة 50</button>
              </div>
            </div>
          `;
        } else if (shapeType === 'curve') {
          extraPropsHtml += `
            <div class="prop-section">
              <div class="prop-title">〰️ التحكم في المنحنى</div>
              <div class="prop-row" style="grid-template-columns:1fr 1fr;gap:4px">
                <button type="button" class="prop-input" id="curveFlipBtn">🔄 عكس الانحناء</button>
                <button type="button" class="prop-input" id="curveStraightenBtn">━ تسوية الخط</button>
              </div>
            </div>
          `;
        } else if (shapeType === 'cartesian') {
          const curRange = inner.dataset.range || '5';
          const curGrid = inner.dataset.showGrid !== 'false';
          const curNums = inner.dataset.showNumbers !== 'false';
          const curLang = inner.dataset.lang || 'ar';
          extraPropsHtml += `
            <div class="prop-section">
              <div class="prop-title">📈 خصائص المستوى الديكارتي</div>
              <div class="prop-row" style="grid-template-columns:1fr 1fr;gap:6px">
                <div class="prop-field"><label>النطاق</label>
                  <select class="prop-input" id="cartesianRangeSelect">
                    <option value="3" ${curRange === '3' ? 'selected' : ''}>-3 إلى 3</option>
                    <option value="5" ${curRange === '5' ? 'selected' : ''}>-5 إلى 5</option>
                    <option value="8" ${curRange === '8' ? 'selected' : ''}>-8 إلى 8</option>
                    <option value="10" ${curRange === '10' ? 'selected' : ''}>-10 إلى 10</option>
                  </select>
                </div>
                <div class="prop-field"><label>اللغة</label>
                  <select class="prop-input" id="cartesianLangSelect">
                    <option value="ar" ${curLang === 'ar' ? 'selected' : ''}>عربي (س / ص)</option>
                    <option value="en" ${curLang === 'en' ? 'selected' : ''}>إنجليزي (X / Y)</option>
                  </select>
                </div>
              </div>
              <div class="prop-row" style="grid-template-columns:1fr 1fr;gap:4px;margin-top:6px">
                <button type="button" class="prop-input ${curGrid ? 'active' : ''}" id="cartesianToggleGridBtn">⊞ ${curGrid ? 'إخفاء الشبكة' : 'إظهار الشبكة'}</button>
                <button type="button" class="prop-input ${curNums ? 'active' : ''}" id="cartesianToggleNumsBtn">🔢 ${curNums ? 'إخفاء الأرقام' : 'إظهار الأرقام'}</button>
              </div>
            </div>
          `;
        } else if (shapeType === 'cylinder') {
          const b = shapes.getUniversalShapeBounds(inner) || { width: 100, height: 100 };
          const curCap = parseFloat(inner.dataset.capH || '24');
          const capPct = Math.round((curCap / (b.height || 1)) * 100);
          extraPropsHtml += `
            <div class="prop-section">
              <div class="prop-title">🛢️ عمق الأسطوانة</div>
              <div class="prop-row" style="grid-template-columns:1fr auto;gap:8px;align-items:center">
                <input type="range" class="prop-input" id="cylinderDepthSlider" min="10" max="45" value="${capPct}" style="accent-color:var(--sh-accent);cursor:pointer"/>
                <span id="cylinderDepthVal" style="font-size:11px;min-width:32px">${capPct}%</span>
              </div>
            </div>
          `;
        } else if (shapeType.startsWith('circuit-')) {
          const compDef = shapes.SHAPE_DEFS[shapeType];
          extraPropsHtml += `
            <div class="prop-section">
              <div class="prop-title">⚡ عنصر دارة كهربائية</div>
              <div style="font-size:11.5px;color:var(--sh-accent);background:rgba(74,126,255,0.08);padding:6px 10px;border-radius:6px;display:flex;align-items:center;gap:6px">
                <span style="font-size:16px">${compDef ? compDef.icon : '⚡'}</span>
                <span>${compDef ? compDef.label : 'عنصر دارة'}</span>
              </div>
            </div>
          `;
        }

        specHost.innerHTML = `
          <div class="prop-section">
            <div class="prop-title">🎨 مظهر الشكل</div>
            <div class="prop-row">
              <div class="prop-field"><label>لون الحدود</label><input type="color" class="prop-input" id="shapeStrokeColor" value="${curStroke.startsWith('#') ? curStroke : '#000000'}" style="padding:2px;height:28px" /></div>
              <div class="prop-field"><label>لون التعبئة</label>
                <div style="display:flex;gap:4px">
                  <input type="color" class="prop-input" id="shapeFillColor" value="${curFill.startsWith('#') ? curFill : '#4a7eff'}" style="padding:2px;height:28px" />
                  <button type="button" class="prop-input" id="shapeFillNoneBtn" style="cursor:pointer;font-size:10px;padding:0 6px" title="تعبئة شفافة">شفاف</button>
                </div>
              </div>
            </div>
            <div class="prop-row" style="margin-top:6px">
              <div class="prop-field"><label>سمك الخط (px)</label><input type="number" class="prop-input" id="shapeStrokeWidth" value="${parseFloat(curSW) || 3}" min="1" max="40" /></div>
            </div>
          </div>
          ${extraPropsHtml}
        `;

        const sStr = document.getElementById('shapeStrokeColor');
        const sFill = document.getElementById('shapeFillColor');
        const sFillNone = document.getElementById('shapeFillNoneBtn');
        const sSW = document.getElementById('shapeStrokeWidth');

        if (sStr) sStr.addEventListener('input', () => { inner.setAttribute('stroke', sStr.value); core.commitChange(); });
        if (sFill) sFill.addEventListener('input', () => { inner.setAttribute('fill', sFill.value); core.commitChange(); });
        if (sFillNone) sFillNone.addEventListener('click', () => { inner.setAttribute('fill', 'none'); core.commitChange(); });
        if (sSW) sSW.addEventListener('change', () => { inner.setAttribute('stroke-width', sSW.value); core.commitChange(); });

        // Radius
        const rSlider = document.getElementById('shapeRadiusSlider');
        const rInput = document.getElementById('shapeRadiusInput');
        function applyRadius(val) {
          inner.setAttribute('rx', val);
          inner.setAttribute('ry', val);
          if (rSlider) rSlider.value = val;
          if (rInput) rInput.value = val;
          inter.drawSelectionOverlay();
          core.commitChange();
        }
        if (rSlider) rSlider.addEventListener('input', () => applyRadius(parseFloat(rSlider.value) || 0));
        if (rInput) rInput.addEventListener('change', () => applyRadius(parseFloat(rInput.value) || 0));
        specHost.querySelectorAll('.preset-radius-btn').forEach(btn => {
          btn.addEventListener('click', () => applyRadius(parseFloat(btn.dataset.r) || 0));
        });

        // Curve
        const cFlip = document.getElementById('curveFlipBtn');
        if (cFlip) cFlip.addEventListener('click', () => {
          const x0 = parseFloat(inner.dataset.x0) || 0, y0 = parseFloat(inner.dataset.y0) || 0;
          const x1 = parseFloat(inner.dataset.x1) || 0, y1 = parseFloat(inner.dataset.y1) || 0;
          const cx = parseFloat(inner.dataset.cx) || ((x0 + x1) / 2);
          const cy = parseFloat(inner.dataset.cy) || ((y0 + y1) / 2);
          const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
          const newCx = mx - (cx - mx), newCy = my - (cy - my);
          inner.setAttribute('d', `M ${x0} ${y0} Q ${newCx} ${newCy} ${x1} ${y1}`);
          inner.dataset.cx = newCx; inner.dataset.cy = newCy;
          inter.drawSelectionOverlay();
          core.commitChange();
        });
        const cStraight = document.getElementById('curveStraightenBtn');
        if (cStraight) cStraight.addEventListener('click', () => {
          const x0 = parseFloat(inner.dataset.x0) || 0, y0 = parseFloat(inner.dataset.y0) || 0;
          const x1 = parseFloat(inner.dataset.x1) || 0, y1 = parseFloat(inner.dataset.y1) || 0;
          const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
          inner.setAttribute('d', `M ${x0} ${y0} Q ${mx} ${my} ${x1} ${y1}`);
          inner.dataset.cx = mx; inner.dataset.cy = my;
          inter.drawSelectionOverlay();
          core.commitChange();
        });

        // Cartesian
        const cartRange = document.getElementById('cartesianRangeSelect');
        const cartLang = document.getElementById('cartesianLangSelect');
        const cartGrid = document.getElementById('cartesianToggleGridBtn');
        const cartNums = document.getElementById('cartesianToggleNumsBtn');
        function updateCartesian() {
          const b = shapes.getUniversalShapeBounds(inner);
          if (!b) return;
          shapes.renderCartesianPlane(inner, b.x, b.y, b.width, b.height, {
            range: cartRange ? cartRange.value : inner.dataset.range,
            lang: cartLang ? cartLang.value : inner.dataset.lang,
            showGrid: inner.dataset.showGrid !== 'false',
            showNumbers: inner.dataset.showNumbers !== 'false',
          });
          inter.drawSelectionOverlay();
          core.commitChange();
        }
        if (cartRange) cartRange.addEventListener('change', updateCartesian);
        if (cartLang) cartLang.addEventListener('change', updateCartesian);
        if (cartGrid) cartGrid.addEventListener('click', () => {
          const cur = inner.dataset.showGrid !== 'false';
          inner.dataset.showGrid = String(!cur);
          cartGrid.classList.toggle('active', !cur);
          cartGrid.textContent = (!cur ? '⊞ إخفاء الشبكة' : '⊞ إظهار الشبكة');
          updateCartesian();
        });
        if (cartNums) cartNums.addEventListener('click', () => {
          const cur = inner.dataset.showNumbers !== 'false';
          inner.dataset.showNumbers = String(!cur);
          cartNums.classList.toggle('active', !cur);
          cartNums.textContent = (!cur ? '🔢 إخفاء الأرقام' : '🔢 إظهار الأرقام');
          updateCartesian();
        });

        // Cylinder
        const cylDepth = document.getElementById('cylinderDepthSlider');
        const cylVal = document.getElementById('cylinderDepthVal');
        if (cylDepth) cylDepth.addEventListener('input', () => {
          const pct = parseInt(cylDepth.value, 10);
          if (cylVal) cylVal.textContent = pct + '%';
          const b = shapes.getUniversalShapeBounds(inner);
          if (!b) return;
          shapes.renderCylinder(inner, b.x, b.y, b.width, b.height, pct / 100);
          core.commitChange();
        });
      }
    }

    /* ═══════════ ربط المحاذاة ═══════════ */
    panel.querySelectorAll('.align-action-btn').forEach(btn => {
      btn.addEventListener('click', () => inter.alignSelected(btn.dataset.align, 'canvas'));
    });

    /* ═══════════ المدخلات الهندسية ═══════════ */
    const inpX = document.getElementById('elemPropX');
    const inpY = document.getElementById('elemPropY');
    const inpW = document.getElementById('elemPropW');
    const inpH = document.getElementById('elemPropH');
    const opSlider = document.getElementById('elemOpacitySlider');
    const opVal = document.getElementById('elemOpacityVal');

    const b = inter.getElementBBoxInStage(sel.el);
    if (b) {
      if (inpX) inpX.value = Math.round(b.x);
      if (inpY) inpY.value = Math.round(b.y);
      if (inpW) inpW.value = Math.round(b.width);
      if (inpH) inpH.value = Math.round(b.height);
    }

    let opacity = 1;
    if (sel.kind === 'svg') {
      const inner = sel.el.querySelector('[data-annot]') || sel.el;
      opacity = parseFloat(inner.getAttribute('opacity') || sel.el.style.opacity || '1');
    } else {
      opacity = parseFloat(sel.el.style.opacity || '1');
    }
    const opPct = Math.round(opacity * 100);
    if (opSlider) opSlider.value = opPct;
    if (opVal) opVal.textContent = opPct + '%';

    async function applyGeometry(recordChange = true) {
      const pre = recordChange ? core.snapshot() : null;
      const newX = parseFloat(inpX.value) || 0;
      const newY = parseFloat(inpY.value) || 0;
      const newW = Math.max(2, parseFloat(inpW.value) || 10);
      const newH = Math.max(2, parseFloat(inpH.value) || 10);

      if (sel.kind === 'svg') {
        const inner = sel.el.querySelector('[data-annot]') || sel.el;
        const tag = inner.tagName.toLowerCase();
        if (tag === 'rect') {
          inner.setAttribute('x', newX);
          inner.setAttribute('y', newY);
          inner.setAttribute('width', newW);
          inner.setAttribute('height', newH);
        } else if (tag === 'circle' || tag === 'ellipse') {
          inner.setAttribute('cx', newX + newW / 2);
          inner.setAttribute('cy', newY + newH / 2);
          inner.setAttribute('rx', newW / 2);
          inner.setAttribute('ry', newH / 2);
        } else if (tag === 'line') {
          inner.setAttribute('x1', newX);
          inner.setAttribute('y1', newY);
          inner.setAttribute('x2', newX + newW);
          inner.setAttribute('y2', newY + newH);
        } else {
          const shapeK = inner.dataset.type || tag;
          if (shapeK === 'cylinder') {
            shapes.renderCylinder(inner, newX, newY, newW, newH);
          } else if (shapeK && shapeK.startsWith('circuit-')) {
            shapes.renderCircuitComponent(inner, shapeK, newX, newY, newW, newH);
          } else if (shapeK === 'cartesian') {
            shapes.renderCartesianPlane(inner, newX, newY, newW, newH);
          } else {
            const curB = shapes.getUniversalShapeBounds(inner);
            if (curB) {
              shapes.resizeUniversalShape(inner, 'se', curB, { x: curB.x + curB.width, y: curB.y + curB.height }, { x: newX + newW, y: newY + newH });
            }
          }
        }
      } else {
        // ★ Session 4 — % للعناصر HTML
        const pdfW = core.state.pdfW || 2000;
        const pdfH = core.state.pdfH || 2828;
        sel.el.style.left = (newX / pdfW * 100) + '%';
        sel.el.style.top = (newY / pdfH * 100) + '%';
        sel.el.style.width = (newW / pdfW * 100) + '%';
        sel.el.style.height = (newH / pdfH * 100) + '%';
      }

      inter.drawSelectionOverlay();
      if (recordChange && pre) core.commitChange(pre);
    }

    [inpX, inpY, inpW, inpH].forEach(inp => {
      if (inp) {
        inp.addEventListener('change', () => applyGeometry(true));
        inp.addEventListener('keydown', e => {
          if (e.key === 'Enter') { inp.blur(); applyGeometry(true); }
        });
      }
    });

    /* ═══════════ Scrubbing ═══════════ */
    function setupScrubber(inputEl, labelEl, propName) {
      if (!inputEl) return;
      const targets = [labelEl, inputEl].filter(Boolean);
      targets.forEach(target => {
        target.addEventListener('pointerdown', (e) => {
          if (e.pointerType === 'mouse' && e.button !== 0) return;
          const startY = e.clientY, startX = e.clientX;
          const startVal = parseFloat(inputEl.value) || 0;
          let isDragging = false;
          let pre = core.snapshot();

          const onPointerMove = (ev) => {
            const dy = startY - ev.clientY;
            const dx = ev.clientX - startX;
            const dist = Math.abs(dy) + Math.abs(dx);
            if (!isDragging && dist > 3) {
              isDragging = true;
              document.body.classList.add('scrubbing-active');
              try { target.setPointerCapture(e.pointerId); } catch (_) {}
              if (document.activeElement === inputEl) inputEl.blur();
            }
            if (isDragging) {
              ev.preventDefault();
              let step = 1;
              if (ev.shiftKey) step = 5;
              if (ev.altKey) step = 0.2;
              let newVal = Math.round(startVal + dy * step);
              if (propName === 'w' || propName === 'h') newVal = Math.max(4, newVal);
              inputEl.value = newVal;
              applyGeometry(false);
            }
          };

          const onPointerUp = (ev) => {
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
            window.removeEventListener('pointercancel', onPointerUp);
            try { target.releasePointerCapture(e.pointerId); } catch (_) {}
            document.body.classList.remove('scrubbing-active');
            if (isDragging) {
              ev.preventDefault();
              ev.stopPropagation();
              core.commitChange(pre);
              inter.drawSelectionOverlay();
            } else if (target === inputEl) {
              inputEl.focus();
            }
          };

          window.addEventListener('pointermove', onPointerMove, { passive: false });
          window.addEventListener('pointerup', onPointerUp);
          window.addEventListener('pointercancel', onPointerUp);
        });
      });
    }

    setupScrubber(inpX, document.getElementById('lblPropX'), 'x');
    setupScrubber(inpY, document.getElementById('lblPropY'), 'y');
    setupScrubber(inpW, document.getElementById('lblPropW'), 'w');
    setupScrubber(inpH, document.getElementById('lblPropH'), 'h');

    if (opSlider) {
      opSlider.addEventListener('input', () => {
        const val = parseInt(opSlider.value, 10);
        if (opVal) opVal.textContent = val + '%';
        const op = val / 100;
        if (sel.kind === 'svg') {
          const inner = sel.el.querySelector('[data-annot]') || sel.el;
          inner.setAttribute('opacity', op);
          sel.el.style.opacity = op;
        } else {
          sel.el.style.opacity = op;
        }
      });
      opSlider.addEventListener('change', () => core.commitChange());
    }

    /* ═══════════ الدوران ═══════════ */
    const rotSlider = document.getElementById('elemRotateSlider');
    const rotInput = document.getElementById('elemRotateInput');
    const btnRotL = document.getElementById('elemRotLBtn');
    const btnRotR = document.getElementById('elemRotRBtn');
    const btnFlipH = document.getElementById('elemFlipHBtn');
    const btnFlipV = document.getElementById('elemFlipVBtn');
    const btnResetTf = document.getElementById('elemResetTransformBtn');

    if (rotSlider) {
      rotSlider.addEventListener('input', () => {
        const val = parseFloat(rotSlider.value) || 0;
        if (rotInput) rotInput.value = val;
        inter.setElementRotation(sel.el, val);
        inter.drawSelectionOverlay();
      });
      rotSlider.addEventListener('change', () => core.commitChange());
    }
    if (rotInput) rotInput.addEventListener('change', () => {
      const val = parseFloat(rotInput.value) || 0;
      if (rotSlider) rotSlider.value = val;
      inter.setElementRotation(sel.el, val);
      inter.drawSelectionOverlay();
      core.commitChange();
    });
    if (btnRotL) btnRotL.addEventListener('click', () => {
      inter.rotateElement(sel.el, -90);
      inter.drawSelectionOverlay();
      core.commitChange();
      renderProps();
    });
    if (btnRotR) btnRotR.addEventListener('click', () => {
      inter.rotateElement(sel.el, 90);
      inter.drawSelectionOverlay();
      core.commitChange();
      renderProps();
    });
    if (btnFlipH) btnFlipH.addEventListener('click', () => {
      inter.flipElementHorizontal(sel.el);
      inter.drawSelectionOverlay();
      core.commitChange();
      renderProps();
    });
    if (btnFlipV) btnFlipV.addEventListener('click', () => {
      inter.flipElementVertical(sel.el);
      inter.drawSelectionOverlay();
      core.commitChange();
      renderProps();
    });
    if (btnResetTf) btnResetTf.addEventListener('click', () => {
      inter.resetElementTransform(sel.el);
      inter.drawSelectionOverlay();
      core.commitChange();
      renderProps();
    });

    /* ═══════════ نقطة الارتكاز ═══════════ */
    const curOx = parseFloat(targetInner.dataset.originX ?? 0.5);
    const curOy = parseFloat(targetInner.dataset.originY ?? 0.5);
    panel.querySelectorAll('.origin-dot-btn').forEach(dot => {
      const ox = parseFloat(dot.dataset.ox);
      const oy = parseFloat(dot.dataset.oy);
      const active = Math.abs(ox - curOx) < 0.05 && Math.abs(oy - curOy) < 0.05;
      dot.classList.toggle('active', active);
      dot.addEventListener('click', () => {
        targetInner.dataset.originX = String(ox);
        targetInner.dataset.originY = String(oy);
        inter.applyElementTransform(targetInner);
        inter.drawSelectionOverlay();
        core.commitChange();
        renderProps();
      });
    });

    const oxInp = document.getElementById('elemOriginX');
    const oyInp = document.getElementById('elemOriginY');
    const btnCenterOrig = document.getElementById('btnCenterOrigin');

    if (oxInp) oxInp.addEventListener('change', () => {
      const val = Math.max(0, Math.min(100, parseFloat(oxInp.value) || 50)) / 100;
      targetInner.dataset.originX = String(val);
      inter.applyElementTransform(targetInner);
      inter.drawSelectionOverlay();
      core.commitChange();
      renderProps();
    });
    if (oyInp) oyInp.addEventListener('change', () => {
      const val = Math.max(0, Math.min(100, parseFloat(oyInp.value) || 50)) / 100;
      targetInner.dataset.originY = String(val);
      inter.applyElementTransform(targetInner);
      inter.drawSelectionOverlay();
      core.commitChange();
      renderProps();
    });
    if (btnCenterOrig) btnCenterOrig.addEventListener('click', () => {
      targetInner.dataset.originX = '0.5';
      targetInner.dataset.originY = '0.5';
      inter.applyElementTransform(targetInner);
      inter.drawSelectionOverlay();
      core.commitChange();
      renderProps();
    });

    /* ═══════════ نسخ/لصق ═══════════ */
    const btnCopy = document.getElementById('elemCopyBtn');
    const btnPaste = document.getElementById('elemPasteBtn');
    if (btnCopy) btnCopy.addEventListener('click', () => inter.copyElement(sel.el));
    if (btnPaste) btnPaste.addEventListener('click', () => inter.pasteElement());

    /* ═══════════ ترتيب الطبقات ═══════════ */
    const btnFront = document.getElementById('elemFrontBtn');
    const btnBack = document.getElementById('elemBackBtn');
    const btnFwd = document.getElementById('elemFwdBtn');
    const btnBwd = document.getElementById('elemBwdBtn');
    if (btnFront) btnFront.addEventListener('click', () => { inter.bringToFront(sel.el); core.commitChange(); refreshLayersPanel(); });
    if (btnBack) btnBack.addEventListener('click', () => { inter.sendToBack(sel.el); core.commitChange(); refreshLayersPanel(); });
    if (btnFwd) btnFwd.addEventListener('click', () => { inter.bringForward(sel.el); core.commitChange(); refreshLayersPanel(); });
    if (btnBwd) btnBwd.addEventListener('click', () => { inter.sendBackward(sel.el); core.commitChange(); refreshLayersPanel(); });

    /* ═══════════ تكرار/حذف ═══════════ */
    const btnDup = document.getElementById('elemDupBtn');
    const btnDel = document.getElementById('elemDelBtn');
    if (btnDup) btnDup.addEventListener('click', () => inter.duplicateSelectedElements());
    if (btnDel) btnDel.addEventListener('click', () => inter.deleteSelectedElements());
  }

  /* ═══════════ تحديث القيم فقط ═══════════ */
  function updateGeometryInputsValuesOnly() {
    const inpX = document.getElementById('elemPropX');
    const inpY = document.getElementById('elemPropY');
    const inpW = document.getElementById('elemPropW');
    const inpH = document.getElementById('elemPropH');
    if (!inpX || !inpY) return;

    import('./core.js').then(core => {
      const sel = (core.state.selectedList && core.state.selectedList.length > 0)
        ? core.state.selectedList[0]
        : core.state.selected;
      if (!sel || !sel.el) return;
      import('./interaction.js').then(inter => {
        const b = inter.getElementBBoxInStage(sel.el);
        if (!b) return;
        if (document.activeElement !== inpX) inpX.value = Math.round(b.x);
        if (document.activeElement !== inpY) inpY.value = Math.round(b.y);
        if (document.activeElement !== inpW) inpW.value = Math.round(b.width);
        if (document.activeElement !== inpH) inpH.value = Math.round(b.height);
      });
    });
  }

  document.addEventListener('ipb:selectionChanged', renderProps);
  document.addEventListener('ipb:elementTransformed', updateGeometryInputsValuesOnly);
  document.addEventListener('ipb:pageChanged', renderProps);

  renderProps();
}

/* ═══════════════════════════════════════════════════════════
   §15. CANVAS CONTROLS (Session 4 — honest percentage)
   ═══════════════════════════════════════════════════════════ */
function initCanvasControls() {
  const zoomIn = document.getElementById('ctrlZoomIn');
  const zoomOut = document.getElementById('ctrlZoomOut');
  const zoomVal = document.getElementById('ctrlZoomVal');
  const fitBtn = document.getElementById('ctrlFit');
  const actualBtn = document.getElementById('ctrlActual');
  const gridBtn = document.getElementById('ctrlGrid');
  const presentBtn = document.getElementById('ctrlPresent');
  const gridOverlay = document.getElementById('canvasGridOverlay');

  function getZoomPercent() {
    const pdfW = state.pdfW || 2000;
    const cssW = state.cssW || 800;
    return (cssW * state.view.scale) / pdfW * 100;
  }

  function setZoomPercent(targetPercent) {
    const pdfW = state.pdfW || 2000;
    const cssW = state.cssW || 800;
    targetPercent = Math.max(10, Math.min(500, targetPercent));
    state.view.scale = (targetPercent / 100) * pdfW / cssW;
    import('./pdf.js').then(pdf => pdf.applyView());
  }

  function updateZoomDisplay() {
    if (!zoomVal) return;
    if (!state.pdfW || !state.cssW) { zoomVal.textContent = '—'; return; }
    zoomVal.textContent = Math.round(getZoomPercent()) + '%';
  }

  if (zoomIn) zoomIn.addEventListener('click', () => setZoomPercent(getZoomPercent() + 10));
  if (zoomOut) zoomOut.addEventListener('click', () => setZoomPercent(getZoomPercent() - 10));
  if (actualBtn) actualBtn.addEventListener('click', () => setZoomPercent(100));
  if (fitBtn) {
    fitBtn.addEventListener('click', () => {
      state.view.scale = 1;
      state.view.tx = 0;
      state.view.ty = 0;
      import('./pdf.js').then(pdf => pdf.applyView());
    });
  }
  if (gridBtn) {
    gridBtn.addEventListener('click', () => {
      if (!gridOverlay) return;
      const isVisible = gridOverlay.style.display !== 'none';
      gridOverlay.style.display = isVisible ? 'none' : 'block';
      gridBtn.classList.toggle('active', !isVisible);
    });
  }
  if (presentBtn) presentBtn.addEventListener('click', () => openPresentMode());

  window.addEventListener('resize', updateZoomDisplay);
  document.addEventListener('ipb:pageChanged', () => setTimeout(updateZoomDisplay, 80));
  document.addEventListener('ipb:viewChanged', updateZoomDisplay);
  updateZoomDisplay();
}

/* ═══════════════════════════════════════════════════════════
   §16. TOOLBAR TOGGLE
   ═══════════════════════════════════════════════════════════ */
function initToolbarToggle() {
  const toggleBtn = document.getElementById('btnToggleToolbar');
  const showBtn = document.getElementById('btnShowToolbar');
  if (toggleBtn) toggleBtn.addEventListener('click', () => document.body.classList.add('tools-hidden'));
  if (showBtn) showBtn.addEventListener('click', () => document.body.classList.remove('tools-hidden'));
}

/* ═══════════════════════════════════════════════════════════
   §17. EQUATION HELPERS
   ═══════════════════════════════════════════════════════════ */
function setupEquationBackdropMirror() {
  let backdrop = document.getElementById('equationBackdrop');
  if (!backdrop) { backdrop = document.createElement('div'); backdrop.id = 'equationBackdrop'; document.body.appendChild(backdrop); }
  const editor = document.getElementById('equationEditor');
  if (!editor) return;

  if (!editor._uiShieldWired) {
    editor._uiShieldWired = true;
    ['pointerdown','pointerup','pointermove','mousedown','mouseup','mousemove','click','dblclick','touchstart','touchend','touchmove','keydown','keyup','keypress','wheel','contextmenu'].forEach(evt => {
      editor.addEventListener(evt, (e) => { e.stopPropagation(); }, false);
    });
  }

  if (!backdrop._uiShieldWired) {
    backdrop._uiShieldWired = true;
    ['pointerdown','click','mousedown','mouseup'].forEach(evt => {
      backdrop.addEventListener(evt, (e) => { e.stopPropagation(); if (e.target === backdrop) hideBoth(); }, false);
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

  const closeBtn = document.getElementById('eqCloseBtn');
  const cancelBtn = document.getElementById('eqCancelBtn');
  if (closeBtn && !closeBtn._uiWired) { closeBtn._uiWired = true; closeBtn.addEventListener('click', (e) => { e.stopPropagation(); hideBoth(); }); }
  if (cancelBtn && !cancelBtn._uiWired) { cancelBtn._uiWired = true; cancelBtn.addEventListener('click', (e) => { e.stopPropagation(); hideBoth(); }); }

  if (!editor._uiEscapeWired) {
    editor._uiEscapeWired = true;
    editor.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); hideBoth(); } });
  }

  const eqBtn = document.querySelector('#toolbar button[data-tool="equation"]');
  if (eqBtn && !eqBtn._uiMirrorWired) {
    eqBtn._uiMirrorWired = true;
    eqBtn.addEventListener('click', () => {
      setTimeout(() => {
        if (editor.classList.contains('show')) { ensureEquationTabs(editor); return; }
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

function ensureEquationTabs(editor) {
  const host = editor.querySelector('#eqPaletteHost');
  if (!host) return;
  const existingTabs = host.parentElement.querySelector('.eq-cat-tabs');
  if (existingTabs) {
    if (!host.querySelector('.eq-grid.active')) {
      const firstGrid = host.querySelector('.eq-grid');
      if (firstGrid) firstGrid.classList.add('active');
    }
    return;
  }
  const sections = [];
  Array.from(host.children).forEach(child => {
    if (child.classList.contains('eq-section-label')) sections.push({ label: child.textContent.trim() });
  });
  if (sections.length < 2) return;

  const tabsBar = document.createElement('div');
  tabsBar.className = 'eq-cat-tabs';

  const allBtn = document.createElement('button');
  allBtn.type = 'button';
  allBtn.className = 'eq-cat-tab';
  allBtn.textContent = '★ الكل';
  allBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    tabsBar.querySelectorAll('.eq-cat-tab').forEach(b => b.classList.remove('active'));
    allBtn.classList.add('active');
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
      host.querySelectorAll('.eq-grid').forEach((g, j) => g.classList.toggle('active', j === i));
    });
    tabsBar.appendChild(btn);
  });

  host.parentElement.insertBefore(tabsBar, host);
  host.querySelectorAll('.eq-grid').forEach((g, i) => g.classList.toggle('active', i === 0));
}

function ensureEquationPalette(editor) {
  const host = editor.querySelector('#eqPaletteHost');
  if (!host) return;
  if (host.children.length > 0) return;
  import('./interaction.js').then(mod => {
    if (mod.buildEquationPaletteInto) { try { mod.buildEquationPaletteInto(host); } catch (_) {} }
    if (!host.children.length) buildFallbackPalette(host);
    ensureEquationTabs(editor);
  }).catch(() => {
    if (!host.children.length) buildFallbackPalette(host);
    ensureEquationTabs(editor);
  });
}

function buildFallbackPalette(host) {
  const TEMPLATES = [
    { cat: 'الكسور', items: [{ label: 'a/b', latex: '\\frac{a}{b}' }, { label: '√', latex: '\\sqrt{x}' }] },
    { cat: 'الأسس', items: [{ label: 'x²', latex: 'x^{2}' }, { label: 'xₙ', latex: 'x_{n}' }] },
    { cat: 'يونانية', items: [{ label: 'α', latex: '\\alpha' }, { label: 'β', latex: '\\beta' }, { label: 'π', latex: '\\pi' }] },
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
      try { if (window.katex) window.katex.render(item.latex, inner, { throwOnError: false, displayMode: false, output: 'html' }); else inner.textContent = item.label; } catch (e) { inner.textContent = item.label; }
      btn.appendChild(inner);
      btn.title = item.latex;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const ta = document.getElementById('eqTextarea');
        if (!ta) return;
        const pos = ta.selectionStart || ta.value.length;
        ta.value = ta.value.substring(0, pos) + item.latex + ta.value.substring(pos);
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

/* ═══════════════════════════════════════════════════════════
   §18. PRESENT MODE (with Notes + Touch Toggle)
   ═══════════════════════════════════════════════════════════ */
const presentState = {
  active: false,
  tool: 'select',
  penColor: '#ef4444', penSize: 4,
  highlighterColor: '#fef08a', highlighterSize: 18,
  laserColor: '#ff1744', laserSize: 8, laserMode: 'trail',
  strokes: [], redoStrokes: [], laserStrokes: [],
  isDrawing: false, currentStroke: null, lastLaserPoint: null,
  laserRAF: null, timerStart: 0, timerInterval: null,
  keyListener: null, drawingBound: false,
  recorder: null, recordStream: null, recordedChunks: [],
  recordStartTime: 0, recordTimerInterval: null,
  isRecording: false, isRecordingPaused: false,
  recordedVideoBlob: null, recordedVideoUrl: null, recAnimId: null,
};

// ★★ Session 2 — عرض الملاحظات في وضع العرض
function updatePresentNotes() {
  const banner = document.getElementById('presentNotes');
  const body = document.getElementById('presentNotesBody');
  if (!banner || !body) return;
  const slide = state.slides && state.slides[state.currentPage - 1];
  const notes = (slide && slide.notes) || '';
  if (!notes.trim()) { banner.style.display = 'none'; return; }
  banner.style.display = 'flex';
  body.textContent = notes;
}

// ★★ Session 6 — زر إظهار شريط الأدوات على اللمس
function setupPresentTouchToggle() {
  const overlay = document.getElementById('presentOverlay');
  if (!overlay) return;
  let btn = document.getElementById('presentTouchToggle');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'presentTouchToggle';
    btn.className = 'present-touch-toggle';
    btn.title = 'إظهار / إخفاء شريط الأدوات';
    btn.textContent = '⌃';
    overlay.appendChild(btn);
  }
  if (btn._wired) return;
  btn._wired = true;
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const bar = document.getElementById('presentToolbar');
    if (!bar) return;
    if (bar.classList.contains('show')) {
      bar.classList.remove('show');
    } else {
      bar.classList.add('show');
      clearTimeout(btn._hideTimer);
      btn._hideTimer = setTimeout(() => {
        if (presentState.active && bar) bar.classList.remove('show');
      }, 5000);
    }
  });
}

async function openPresentMode() {
  if (presentState.active) return;
  presentState.active = true;

  const overlay = document.getElementById('presentOverlay');
  if (!overlay) return;
  overlay.classList.add('active');
  document.body.classList.add('present-active');

  presentState.strokes = [];
  presentState.redoStrokes = [];
  presentState.laserStrokes = [];
  presentState.isDrawing = false;
  presentState.currentStroke = null;
  presentState.lastLaserPoint = null;

  copyStageToPresent();
  bindPresentDrawing();
  bindPresentToolbar();
  bindPresentKeys();
  updatePresentIndicators();
  setPresentTool('select');
  updatePresentUndoRedo();
  resetPresentTimer();
  startPresentTimer();
  updatePresentPageNum();
  setupPresentTouchToggle();  // Session 6
  updatePresentNotes();       // Session 2

  const bar = document.getElementById('presentToolbar');
  if (bar) {
    bar.classList.add('show');
    setTimeout(() => { if (presentState.active && bar) bar.classList.remove('show'); }, 2800);
  }

  document.addEventListener('ipb:pageChanged', onPresentPageChanged);
}

function closePresentMode() {
  if (!presentState.active) return;
  presentState.active = false;
  if (presentState.isRecording) stopPresentRecording(false);
  stopPresentLaserLoop();
  savePresentStrokesToSlide();

  const overlay = document.getElementById('presentOverlay');
  if (overlay) overlay.classList.remove('active');
  document.body.classList.remove('present-active');

  const optionsBar = document.getElementById('presentToolOptionsBar');
  if (optionsBar) optionsBar.style.display = 'none';

  stopPresentTimer();
  unbindPresentKeys();
  document.removeEventListener('ipb:pageChanged', onPresentPageChanged);

  presentState.strokes = [];
  presentState.redoStrokes = [];
  presentState.laserStrokes = [];
  updatePresentUndoRedo();
}

function onPresentPageChanged() {
  savePresentStrokesToSlide();
  presentState.strokes = [];
  presentState.redoStrokes = [];
  presentState.laserStrokes = [];
  copyStageToPresent();
  updatePresentPageNum();
  updatePresentNotes();  // Session 2
  updatePresentUndoRedo();
}

function copyStageToPresent() {
  const stage = document.getElementById('stage');
  const presentStage = document.getElementById('presentStage');
  const presentCanvas = document.getElementById('presentCanvas');
  const pdfCanvas = document.getElementById('pdfCanvas');
  const presentLayerHost = document.getElementById('presentLayerHost');
  const presentDrawCanvas = document.getElementById('presentDrawCanvas');
  const presentLaser = document.getElementById('presentLaser');
  if (!stage || !presentStage || !pdfCanvas || !presentCanvas) return;

  let aspect = 16 / 9;
  if (pdfCanvas.width && pdfCanvas.height) aspect = pdfCanvas.width / pdfCanvas.height;
  else { const stageRect = stage.getBoundingClientRect(); if (stageRect.width && stageRect.height) aspect = stageRect.width / stageRect.height; }

  const vw = window.innerWidth * 0.94;
  const vh = window.innerHeight * 0.94;
  let w = vw; let h = w / aspect;
  if (h > vh) { h = vh; w = h * aspect; }
  presentStage.style.width = Math.round(w) + 'px';
  presentStage.style.height = Math.round(h) + 'px';

  presentCanvas.width = pdfCanvas.width;
  presentCanvas.height = pdfCanvas.height;
  const ctx = presentCanvas.getContext('2d');
  ctx.drawImage(pdfCanvas, 0, 0);

  if (presentDrawCanvas) {
    presentDrawCanvas.width = pdfCanvas.width;
    presentDrawCanvas.height = pdfCanvas.height;
    redrawPresentStrokes();
  }

  if (presentLaser) {
    presentLaser.width = pdfCanvas.width;
    presentLaser.height = pdfCanvas.height;
    const lctx = presentLaser.getContext('2d');
    lctx.clearRect(0, 0, presentLaser.width, presentLaser.height);
  }

  if (presentLayerHost) {
    presentLayerHost.innerHTML = '';
    const stageEl = document.getElementById('stage');
    const sRect = stageEl ? stageEl.getBoundingClientRect() : null;
    ['svgLayer', 'textLayer', 'videoLayer', 'embedLayer', 'interactiveLayer'].forEach(id => {
      const srcEl = document.getElementById(id);
      if (srcEl && srcEl.childNodes.length > 0) {
        const clone = srcEl.cloneNode(true);
        clone.id = 'present_' + id;
        clone.style.position = 'absolute';
        clone.style.inset = '0';
        clone.style.width = '100%';
        clone.style.height = '100%';
        clone.style.pointerEvents = 'auto';

        if (sRect && sRect.width > 0) {
          clone.querySelectorAll('.media-obj, .embed, .pdf-text-box, .pdf-interactive-btn').forEach(obj => {
            if (obj.style.width && obj.style.width.endsWith('px')) {
              obj.style.width = ((parseFloat(obj.style.width) / sRect.width) * 100) + '%';
            }
            if (obj.style.height && obj.style.height.endsWith('px')) {
              obj.style.height = ((parseFloat(obj.style.height) / sRect.height) * 100) + '%';
            }
          });
        }
        presentLayerHost.appendChild(clone);
      }
    });
  }
}

function updatePresentPageNum() {
  const el = document.getElementById('presentPageNum');
  const indicator = document.getElementById('pageIndicator');
  if (el && indicator) el.textContent = indicator.textContent || '— / —';
  import('./core.js').then(({ state }) => {
    const total = state.totalPages || (state.slides ? state.slides.length : 1);
    const prev = document.getElementById('presentPrev');
    const next = document.getElementById('presentNext');
    if (prev) prev.disabled = state.currentPage <= 1;
    if (next) next.disabled = state.currentPage >= total;
  }).catch(() => {});
}

function updatePresentIndicators() {
  const pPen = document.getElementById('pPenIndicator');
  if (pPen) pPen.style.background = presentState.penColor;
  const pHigh = document.getElementById('pHighlighterIndicator');
  if (pHigh) pHigh.style.background = presentState.highlighterColor;
  const pLaser = document.getElementById('pLaserIndicator');
  if (pLaser) pLaser.style.background = presentState.laserColor;
}

function setPresentTool(tool) {
  presentState.tool = tool;
  const bar = document.getElementById('presentToolbar');
  if (bar) bar.querySelectorAll('[data-ptool]').forEach(btn => btn.classList.toggle('active', btn.dataset.ptool === tool));

  const drawCanvas = document.getElementById('presentDrawCanvas');
  if (drawCanvas) {
    if (tool === 'select' || tool === 'hand') { drawCanvas.style.pointerEvents = 'none'; drawCanvas.style.cursor = 'default'; }
    else if (tool === 'eraser') { drawCanvas.style.pointerEvents = 'auto'; drawCanvas.style.cursor = 'cell'; }
    else if (tool === 'laser') { drawCanvas.style.pointerEvents = 'auto'; drawCanvas.style.cursor = 'none'; startPresentLaserLoop(); }
    else { drawCanvas.style.pointerEvents = 'auto'; drawCanvas.style.cursor = 'crosshair'; }
  }

  if (tool === 'pen' || tool === 'highlighter' || tool === 'laser') renderPresentToolOptions(tool);
  else { const optionsBar = document.getElementById('presentToolOptionsBar'); if (optionsBar) optionsBar.style.display = 'none'; }

  document.dispatchEvent(new CustomEvent('ipb:presentToolChanged', { detail: { tool } }));
}

// renderPresentToolOptions (long, unchanged from original) — يُستورد من الأصل
function renderPresentToolOptions(tool = presentState.tool) {
  const optionsBar = document.getElementById('presentToolOptionsBar');
  if (!optionsBar) return;
  if (tool !== 'pen' && tool !== 'highlighter' && tool !== 'laser') { optionsBar.style.display = 'none'; return; }
  optionsBar.style.display = 'flex';
  optionsBar.innerHTML = '';

  if (tool === 'pen') {
    const colors = [{ c: '#ef4444', n: 'أحمر' }, { c: '#3b82f6', n: 'أزرق' }, { c: '#10b981', n: 'أخضر' }, { c: '#eab308', n: 'أصفر' }, { c: '#a855f7', n: 'بنفسجي' }, { c: '#0f172a', n: 'أسود' }];
    const sizes = [{ s: 2, l: 'رفيع' }, { s: 4, l: 'متوسط' }, { s: 8, l: 'عريض' }, { s: 16, l: 'سميك' }];

    const cGroup = document.createElement('div'); cGroup.className = 'popt-group';
    const cLabel = document.createElement('span'); cLabel.className = 'popt-label'; cLabel.textContent = 'اللون:'; cGroup.appendChild(cLabel);
    colors.forEach(item => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'popt-swatch' + (presentState.penColor === item.c ? ' active' : '');
      btn.style.background = item.c;
      btn.title = item.n;
      btn.addEventListener('click', (e) => { e.stopPropagation(); presentState.penColor = item.c; updatePresentIndicators(); renderPresentToolOptions('pen'); });
      cGroup.appendChild(btn);
    });
    optionsBar.appendChild(cGroup);

    const sGroup = document.createElement('div'); sGroup.className = 'popt-group';
    const sLabel = document.createElement('span'); sLabel.className = 'popt-label'; sLabel.textContent = 'الحجم:'; sGroup.appendChild(sLabel);
    sizes.forEach(item => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'popt-size-btn' + (presentState.penSize === item.s ? ' active' : '');
      btn.innerHTML = `<span class="popt-size-dot" style="width:${Math.max(4, item.s)}px;height:${Math.max(4, item.s)}px;"></span> ${item.l}`;
      btn.addEventListener('click', (e) => { e.stopPropagation(); presentState.penSize = item.s; renderPresentToolOptions('pen'); });
      sGroup.appendChild(btn);
    });
    optionsBar.appendChild(sGroup);
  } else if (tool === 'highlighter') {
    const colors = [{ c: '#fef08a', n: 'أصفر' }, { c: '#86efac', n: 'أخضر' }, { c: '#7dd3fc', n: 'أزرق' }, { c: '#f472b6', n: 'وردي' }];
    const sizes = [{ s: 12, l: '12px' }, { s: 18, l: '18px' }, { s: 28, l: '28px' }];
    const cGroup = document.createElement('div'); cGroup.className = 'popt-group';
    const cLabel = document.createElement('span'); cLabel.className = 'popt-label'; cLabel.textContent = 'اللون:'; cGroup.appendChild(cLabel);
    colors.forEach(item => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'popt-swatch' + (presentState.highlighterColor === item.c ? ' active' : '');
      btn.style.background = item.c;
      btn.addEventListener('click', (e) => { e.stopPropagation(); presentState.highlighterColor = item.c; updatePresentIndicators(); renderPresentToolOptions('highlighter'); });
      cGroup.appendChild(btn);
    });
    optionsBar.appendChild(cGroup);
    const sGroup = document.createElement('div'); sGroup.className = 'popt-group';
    sizes.forEach(item => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'popt-size-btn' + (presentState.highlighterSize === item.s ? ' active' : '');
      btn.textContent = item.l;
      btn.addEventListener('click', (e) => { e.stopPropagation(); presentState.highlighterSize = item.s; renderPresentToolOptions('highlighter'); });
      sGroup.appendChild(btn);
    });
    optionsBar.appendChild(sGroup);
  } else if (tool === 'laser') {
    const colors = [{ c: '#ff1744', n: 'أحمر' }, { c: '#00e676', n: 'أخضر' }, { c: '#00e5ff', n: 'أزرق' }];
    const sizes = [{ s: 5, l: 'صغير' }, { s: 8, l: 'متوسط' }, { s: 14, l: 'كبير' }];
    const cGroup = document.createElement('div'); cGroup.className = 'popt-group';
    const cLabel = document.createElement('span'); cLabel.className = 'popt-label'; cLabel.textContent = 'اللون:'; cGroup.appendChild(cLabel);
    colors.forEach(item => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'popt-swatch' + (presentState.laserColor === item.c ? ' active' : '');
      btn.style.background = item.c;
      btn.style.boxShadow = `0 0 6px ${item.c}`;
      btn.addEventListener('click', (e) => { e.stopPropagation(); presentState.laserColor = item.c; updatePresentIndicators(); renderPresentToolOptions('laser'); });
      cGroup.appendChild(btn);
    });
    optionsBar.appendChild(cGroup);
    const sGroup = document.createElement('div'); sGroup.className = 'popt-group';
    sizes.forEach(item => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'popt-size-btn' + (presentState.laserSize === item.s ? ' active' : '');
      btn.textContent = item.l;
      btn.addEventListener('click', (e) => { e.stopPropagation(); presentState.laserSize = item.s; renderPresentToolOptions('laser'); });
      sGroup.appendChild(btn);
    });
    optionsBar.appendChild(sGroup);
  }
}

// Present drawing engine — same as original with minor cleanup
function getPresentCanvasPoint(e) {
  const canvas = document.getElementById('presentDrawCanvas');
  if (!canvas) return { x: 0, y: 0 };
  const rect = canvas.getBoundingClientRect();
  return { x: (e.clientX - rect.left) * (canvas.width / rect.width), y: (e.clientY - rect.top) * (canvas.height / rect.height) };
}

function bindPresentDrawing() {
  if (presentState.drawingBound) return;
  const canvas = document.getElementById('presentDrawCanvas');
  if (!canvas) return;
  presentState.drawingBound = true;

  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const pt = getPresentCanvasPoint(e);
    if (presentState.tool === 'pen' || presentState.tool === 'highlighter') {
      presentState.isDrawing = true;
      presentState.currentStroke = {
        tool: presentState.tool,
        color: presentState.tool === 'pen' ? presentState.penColor : presentState.highlighterColor,
        size: presentState.tool === 'pen' ? presentState.penSize : presentState.highlighterSize,
        points: [pt],
      };
      drawSinglePresentStroke(canvas.getContext('2d'), presentState.currentStroke);
      e.preventDefault();
    } else if (presentState.tool === 'laser') {
      presentState.isDrawing = true;
      presentState.lastLaserPoint = pt;
      if (presentState.laserMode === 'trail') presentState.laserStrokes.push({ points: [pt], color: presentState.laserColor, size: presentState.laserSize, time: performance.now() });
      startPresentLaserLoop();
      e.preventDefault();
    } else if (presentState.tool === 'eraser') {
      presentState.isDrawing = true;
      erasePresentStrokesAt(pt, 24);
      e.preventDefault();
    }
  });

  window.addEventListener('pointermove', (e) => {
    if (!presentState.active) return;
    const pt = getPresentCanvasPoint(e);
    if (presentState.tool === 'laser') {
      presentState.lastLaserPoint = pt;
      if (presentState.isDrawing && presentState.laserMode === 'trail') {
        const currentTrail = presentState.laserStrokes[presentState.laserStrokes.length - 1];
        if (currentTrail) { currentTrail.points.push(pt); currentTrail.time = performance.now(); }
      }
      startPresentLaserLoop();
      return;
    }
    if (!presentState.isDrawing) return;
    if (presentState.tool === 'pen' || presentState.tool === 'highlighter') {
      if (presentState.currentStroke) {
        presentState.currentStroke.points.push(pt);
        const ctx = canvas.getContext('2d');
        const pts = presentState.currentStroke.points;
        if (pts.length >= 2) {
          ctx.save();
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.globalAlpha = presentState.currentStroke.tool === 'highlighter' ? 0.42 : 1;
          ctx.strokeStyle = presentState.currentStroke.color;
          ctx.lineWidth = presentState.currentStroke.size;
          ctx.beginPath();
          const prev = pts[pts.length - 2];
          const curr = pts[pts.length - 1];
          ctx.moveTo(prev.x, prev.y);
          ctx.lineTo(curr.x, curr.y);
          ctx.stroke();
          ctx.restore();
        }
      }
    } else if (presentState.tool === 'eraser') {
      erasePresentStrokesAt(pt, 24);
    }
  });

  window.addEventListener('pointerup', () => {
    if (!presentState.active || !presentState.isDrawing) return;
    presentState.isDrawing = false;
    if (presentState.currentStroke && (presentState.tool === 'pen' || presentState.tool === 'highlighter')) {
      presentState.strokes.push(presentState.currentStroke);
      presentState.currentStroke = null;
      presentState.redoStrokes = [];
      redrawPresentStrokes();
      updatePresentUndoRedo();
    }
  });

  canvas.addEventListener('pointerleave', () => {
    if (presentState.tool === 'laser' && !presentState.isDrawing) presentState.lastLaserPoint = null;
  });
}

function redrawPresentStrokes() {
  const canvas = document.getElementById('presentDrawCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  presentState.strokes.forEach(s => drawSinglePresentStroke(ctx, s));
}

function drawSinglePresentStroke(ctx, stroke) {
  if (!stroke.points || stroke.points.length === 0) return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = stroke.tool === 'highlighter' ? 0.42 : 1;
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = stroke.size;
  const pts = stroke.points;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  if (pts.length === 1) {
    ctx.arc(pts[0].x, pts[0].y, stroke.size / 2, 0, Math.PI * 2);
    ctx.fillStyle = stroke.color;
    ctx.fill();
  } else {
    for (let i = 1; i < pts.length; i++) {
      const xc = (pts[i - 1].x + pts[i].x) / 2;
      const yc = (pts[i - 1].y + pts[i].y) / 2;
      ctx.quadraticCurveTo(pts[i - 1].x, pts[i - 1].y, xc, yc);
    }
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
    ctx.stroke();
  }
  ctx.restore();
}

function erasePresentStrokesAt(pt, radius) {
  const initialCount = presentState.strokes.length;
  presentState.strokes = presentState.strokes.filter(stroke => !stroke.points.some(p => {
    const dx = p.x - pt.x, dy = p.y - pt.y;
    return (dx * dx + dy * dy) < (radius + stroke.size / 2) * (radius + stroke.size / 2);
  }));
  if (presentState.strokes.length !== initialCount) { redrawPresentStrokes(); updatePresentUndoRedo(); }
}

function startPresentLaserLoop() { if (!presentState.laserRAF) presentState.laserRAF = requestAnimationFrame(presentLaserTick); }
function stopPresentLaserLoop() {
  if (presentState.laserRAF) { cancelAnimationFrame(presentState.laserRAF); presentState.laserRAF = null; }
  const canvas = document.getElementById('presentLaser');
  if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
}

function presentLaserTick() {
  const canvas = document.getElementById('presentLaser');
  if (!canvas || !presentState.active) { presentState.laserRAF = null; return; }
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const now = performance.now();
  let hasActiveElements = false;

  if (presentState.laserMode === 'trail') {
    const lifeMs = 900;
    presentState.laserStrokes = presentState.laserStrokes.filter(s => (now - s.time) < lifeMs);
    if (presentState.laserStrokes.length > 0) hasActiveElements = true;
    presentState.laserStrokes.forEach(s => {
      const age = now - s.time;
      const alpha = Math.max(0, 1 - age / lifeMs);
      if (alpha <= 0 || s.points.length < 1) return;
      ctx.save();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.globalAlpha = alpha;
      ctx.shadowColor = s.color; ctx.shadowBlur = s.size * 3.5;
      ctx.strokeStyle = s.color; ctx.lineWidth = s.size;
      ctx.beginPath(); ctx.moveTo(s.points[0].x, s.points[0].y);
      for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i].x, s.points[i].y);
      ctx.stroke();
      ctx.shadowBlur = 0; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(1, s.size * 0.4);
      ctx.beginPath(); ctx.moveTo(s.points[0].x, s.points[0].y);
      for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i].x, s.points[i].y);
      ctx.stroke();
      ctx.restore();
    });
  }

  if (presentState.tool === 'laser' && presentState.lastLaserPoint) {
    hasActiveElements = true;
    const pt = presentState.lastLaserPoint;
    const color = presentState.laserColor;
    const size = presentState.laserSize;
    ctx.save();
    const pulse = 1 + 0.18 * Math.sin(now / 100);
    ctx.shadowColor = color; ctx.shadowBlur = size * 4 * pulse;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(pt.x, pt.y, (size / 1.8) * pulse, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(pt.x, pt.y, Math.max(2, size * 0.32), 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  if (hasActiveElements || presentState.tool === 'laser') presentState.laserRAF = requestAnimationFrame(presentLaserTick);
  else presentState.laserRAF = null;
}

function presentUndo() {
  if (!presentState.strokes.length) return;
  presentState.redoStrokes.push(presentState.strokes.pop());
  redrawPresentStrokes(); updatePresentUndoRedo();
}
function presentRedo() {
  if (!presentState.redoStrokes.length) return;
  presentState.strokes.push(presentState.redoStrokes.pop());
  redrawPresentStrokes(); updatePresentUndoRedo();
}
function presentClearAll() { presentState.strokes = []; presentState.redoStrokes = []; redrawPresentStrokes(); updatePresentUndoRedo(); }
function updatePresentUndoRedo() {
  const u = document.getElementById('presentUndo');
  const r = document.getElementById('presentRedo');
  if (u) u.disabled = presentState.strokes.length === 0;
  if (r) r.disabled = presentState.redoStrokes.length === 0;
}

async function savePresentStrokesToSlide() {
  if (!presentState.strokes.length) return;
  try {
    const core = await import('./core.js');
    const SVG_NS = 'http://www.w3.org/2000/svg';
    const svgLayer = document.getElementById('svgLayer');
    const pdfCanvas = document.getElementById('pdfCanvas');
    if (!svgLayer || !pdfCanvas) return;
    const scaleX = (core.state.pdfW || 1000) / pdfCanvas.width;
    const scaleY = (core.state.pdfH || 1414) / pdfCanvas.height;
    const pre = core.snapshot ? core.snapshot() : null;
    presentState.strokes.forEach(stroke => {
      if (!stroke.points || stroke.points.length < 2) return;
      let d = `M ${(stroke.points[0].x * scaleX).toFixed(1)} ${(stroke.points[0].y * scaleY).toFixed(1)}`;
      for (let i = 1; i < stroke.points.length; i++) {
        const xc = ((stroke.points[i - 1].x + stroke.points[i].x) / 2 * scaleX).toFixed(1);
        const yc = ((stroke.points[i - 1].y + stroke.points[i].y) / 2 * scaleY).toFixed(1);
        d += ` Q ${(stroke.points[i - 1].x * scaleX).toFixed(1)} ${(stroke.points[i - 1].y * scaleY).toFixed(1)} ${xc} ${yc}`;
      }
      const last = stroke.points[stroke.points.length - 1];
      d += ` L ${(last.x * scaleX).toFixed(1)} ${(last.y * scaleY).toFixed(1)}`;
      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', d);
      path.setAttribute('stroke', stroke.color);
      path.setAttribute('stroke-width', String(Math.round(stroke.size * scaleX)));
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('stroke-linejoin', 'round');
      if (stroke.tool === 'highlighter') { path.setAttribute('stroke-opacity', '0.45'); path.style.mixBlendMode = 'multiply'; path.dataset.type = 'highlighter'; }
      else path.dataset.type = 'path';
      if (core.addAnnotation) core.addAnnotation(path);
      else {
        const wrap = document.createElement('div');
        wrap.className = 'annot-wrapper';
        const svg = document.createElementNS(SVG_NS, 'svg');
        svg.appendChild(path);
        wrap.appendChild(svg);
        svgLayer.appendChild(wrap);
      }
    });
    if (pre && core.commitChange) core.commitChange(pre);
  } catch (err) { console.warn('savePresentStrokesToSlide failed:', err); }
}

// ── Recording (same as original with minor cleanup) ──
async function togglePresentRecording() {
  if (presentState.isRecording) stopPresentRecording(true);
  else startPresentRecording();
}

async function startPresentRecording() {
  if (presentState.isRecording) return;
  presentState.recordedChunks = [];
  let stream = null;
  try {
    if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
      stream = await navigator.mediaDevices.getDisplayMedia({ video: { displaySurface: 'browser', frameRate: { ideal: 30, max: 60 } }, audio: true });
    }
  } catch (err) { console.warn('getDisplayMedia not available, using composite canvas capture:', err); }

  if (!stream) {
    try {
      const pCanvas = document.getElementById('presentCanvas') || document.getElementById('pdfCanvas');
      const dCanvas = document.getElementById('presentDrawCanvas');
      const lCanvas = document.getElementById('presentLaser');
      if (pCanvas) {
        const cW = pCanvas.width || 1280, cH = pCanvas.height || 720;
        const compCanvas = document.createElement('canvas');
        compCanvas.width = cW; compCanvas.height = cH;
        const compCtx = compCanvas.getContext('2d', { alpha: false });
        const renderComposite = () => {
          if (!presentState.isRecording) return;
          try {
            compCtx.fillStyle = '#ffffff';
            compCtx.fillRect(0, 0, cW, cH);
            if (pCanvas && pCanvas.width) compCtx.drawImage(pCanvas, 0, 0);
            if (dCanvas && dCanvas.width) compCtx.drawImage(dCanvas, 0, 0);
            if (lCanvas && lCanvas.width) compCtx.drawImage(lCanvas, 0, 0);
          } catch (_) {}
          presentState.recAnimId = requestAnimationFrame(renderComposite);
        };
        renderComposite();
        if (compCanvas.captureStream) stream = compCanvas.captureStream(30);
      }
    } catch (e) { console.warn('Composite canvas stream failed:', e); }
  }

  if (!stream) { safeToast('تعذّر بدء تسجيل الشاشة في متصفحك.', 'error'); return; }

  try {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        const audioCtx = new AudioContextClass();
        const dest = audioCtx.createMediaStreamDestination();
        if (stream.getAudioTracks().length > 0) {
          const displayAudioSrc = audioCtx.createMediaStreamSource(new MediaStream(stream.getAudioTracks()));
          displayAudioSrc.connect(dest);
        }
        const micSrc = audioCtx.createMediaStreamSource(micStream);
        micSrc.connect(dest);
        stream = new MediaStream([...stream.getVideoTracks(), ...dest.stream.getAudioTracks()]);
      }
    }
  } catch (_) {}

  let mimeType = '';
  const testTypes = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm;codecs=h264', 'video/webm', 'video/mp4'];
  if (typeof MediaRecorder !== 'undefined') {
    for (const t of testTypes) { if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) { mimeType = t; break; } }
  }

  try {
    const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    presentState.recorder = recorder;
    presentState.recordStream = stream;
    recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) presentState.recordedChunks.push(e.data); };
    recorder.onstop = () => handleRecordingStopped();
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) videoTrack.addEventListener('ended', () => { if (presentState.isRecording) stopPresentRecording(true); });

    recorder.start(1000);
    presentState.isRecording = true;
    presentState.isRecordingPaused = false;
    presentState.recordStartTime = Date.now();

    const recBtn = document.getElementById('presentRecordBtn');
    const recPill = document.getElementById('presentRecPill');
    if (recBtn) recBtn.style.display = 'none';
    if (recPill) recPill.style.display = 'flex';

    startRecordingTimer();
    safeToast('بدأ تسجيل العرض 🔴', 'ok');
  } catch (err) {
    console.error('Failed to start MediaRecorder:', err);
    safeToast('تعذّر بدء تسجيل الفيديو: ' + err.message, 'error');
  }
}

function pauseOrResumeRecording() {
  if (!presentState.recorder || !presentState.isRecording) return;
  const pauseBtn = document.getElementById('presentRecPauseBtn');
  if (!presentState.isRecordingPaused) {
    presentState.recorder.pause();
    presentState.isRecordingPaused = true;
    if (pauseBtn) { pauseBtn.textContent = '▶️'; pauseBtn.title = 'استئناف التسجيل'; }
    safeToast('تم إيقاف التسجيل مؤقتاً ⏸️', 'info');
  } else {
    presentState.recorder.resume();
    presentState.isRecordingPaused = false;
    if (pauseBtn) { pauseBtn.textContent = '⏸️'; pauseBtn.title = 'إيقاف مؤقت'; }
    safeToast('تم استئناف التسجيل ▶️', 'info');
  }
}

function stopPresentRecording(showModal = true) {
  if (!presentState.isRecording) return;
  presentState.isRecording = false;
  if (presentState.recAnimId) { cancelAnimationFrame(presentState.recAnimId); presentState.recAnimId = null; }
  stopRecordingTimer();
  if (presentState.recorder && presentState.recorder.state !== 'inactive') presentState.recorder.stop();
  if (presentState.recordStream) { presentState.recordStream.getTracks().forEach(t => t.stop()); presentState.recordStream = null; }

  const recBtn = document.getElementById('presentRecordBtn');
  const recPill = document.getElementById('presentRecPill');
  if (recBtn) recBtn.style.display = '';
  if (recPill) recPill.style.display = 'none';

  if (!showModal) presentState.recordedChunks = [];
}

function startRecordingTimer() {
  stopRecordingTimer();
  updateRecordingTimerDisplay();
  presentState.recordTimerInterval = setInterval(updateRecordingTimerDisplay, 1000);
}
function stopRecordingTimer() {
  if (presentState.recordTimerInterval) { clearInterval(presentState.recordTimerInterval); presentState.recordTimerInterval = null; }
}
function updateRecordingTimerDisplay() {
  const el = document.getElementById('presentRecTimer');
  if (!el) return;
  const elapsed = Math.floor((Date.now() - presentState.recordStartTime) / 1000);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');
  el.textContent = mm + ':' + ss;
}

function handleRecordingStopped() {
  if (!presentState.recordedChunks.length) return;
  const blob = new Blob(presentState.recordedChunks, { type: 'video/webm' });
  presentState.recordedVideoBlob = blob;
  const url = URL.createObjectURL(blob);
  presentState.recordedVideoUrl = url;

  const modal = document.getElementById('presentVideoModal');
  const preview = document.getElementById('presentVideoPreview');
  const durEl = document.getElementById('presentVideoDuration');
  const sizeEl = document.getElementById('presentVideoSize');
  if (preview) preview.src = url;
  const elapsed = Math.floor((Date.now() - presentState.recordStartTime) / 1000);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');
  if (durEl) durEl.textContent = `⏱️ المدة: ${mm}:${ss}`;
  const sizeMb = (blob.size / (1024 * 1024)).toFixed(2);
  if (sizeEl) sizeEl.textContent = `💾 الحجم: ${sizeMb} MB`;
  if (modal) modal.style.display = 'flex';
  safeToast('تم حفظ تسجيل العرض بنجاح 🎬', 'ok');
}

function downloadRecordedVideo() {
  if (!presentState.recordedVideoBlob) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(presentState.recordedVideoBlob);
  const dateStr = new Date().toISOString().slice(0, 10);
  a.download = `presentation-recording-${dateStr}.webm`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => a.remove(), 100);
  safeToast('جارٍ تنزيل ملف الفيديو ⬇️', 'ok');
}

function dismissVideoModal() {
  const modal = document.getElementById('presentVideoModal');
  const preview = document.getElementById('presentVideoPreview');
  if (preview) { preview.pause(); preview.src = ''; }
  if (modal) modal.style.display = 'none';
  if (presentState.recordedVideoUrl) { URL.revokeObjectURL(presentState.recordedVideoUrl); presentState.recordedVideoUrl = null; }
}

function bindPresentToolbar() {
  const bar = document.getElementById('presentToolbar');
  if (!bar) return;
  bar.querySelectorAll('[data-ptool]').forEach(btn => { btn.onclick = () => setPresentTool(btn.dataset.ptool); });

  const optToggle = document.getElementById('presentOptionsToggleBtn');
  if (optToggle) optToggle.onclick = () => {
    const optionsBar = document.getElementById('presentToolOptionsBar');
    if (optionsBar) {
      if (optionsBar.style.display === 'none') {
        const t = (presentState.tool === 'pen' || presentState.tool === 'highlighter' || presentState.tool === 'laser') ? presentState.tool : 'pen';
        setPresentTool(t);
      } else optionsBar.style.display = 'none';
    }
  };

  const u = document.getElementById('presentUndo');
  const r = document.getElementById('presentRedo');
  const clr = document.getElementById('presentClear');
  const prev = document.getElementById('presentPrev');
  const next = document.getElementById('presentNext');
  const exit = document.getElementById('presentExit');
  if (u) u.onclick = presentUndo;
  if (r) r.onclick = presentRedo;
  if (clr) clr.onclick = presentClearAll;
  if (prev) prev.onclick = presentPrevPage;
  if (next) next.onclick = presentNextPage;
  if (exit) exit.onclick = closePresentMode;

  const recBtn = document.getElementById('presentRecordBtn');
  const recPause = document.getElementById('presentRecPauseBtn');
  const recStop = document.getElementById('presentRecStopBtn');
  if (recBtn) recBtn.onclick = togglePresentRecording;
  if (recPause) recPause.onclick = pauseOrResumeRecording;
  if (recStop) recStop.onclick = () => stopPresentRecording(true);

  const vidClose = document.getElementById('presentVideoCloseBtn');
  const vidDismiss = document.getElementById('presentVideoDismissBtn');
  const vidDown = document.getElementById('presentVideoDownloadBtn');
  if (vidClose) vidClose.onclick = dismissVideoModal;
  if (vidDismiss) vidDismiss.onclick = dismissVideoModal;
  if (vidDown) vidDown.onclick = downloadRecordedVideo;

  // ★ Session 2 — زر إغلاق الملاحظات
  const notesClose = document.getElementById('presentNotesClose');
  if (notesClose) notesClose.onclick = () => {
    const b = document.getElementById('presentNotes');
    if (b) b.style.display = 'none';
  };
}

async function presentPrevPage() {
  try {
    const pdf = await import('./pdf.js');
    const state = (await import('./core.js')).state;
    if (state.currentPage > 1) { await pdf.goToPage(state.currentPage - 1); onPresentPageChanged(); }
  } catch (e) { console.warn('presentPrevPage error:', e); }
}
async function presentNextPage() {
  try {
    const pdf = await import('./pdf.js');
    const state = (await import('./core.js')).state;
    const total = state.totalPages || (state.slides ? state.slides.length : 1);
    if (state.currentPage < total) { await pdf.goToPage(state.currentPage + 1); onPresentPageChanged(); }
  } catch (e) { console.warn('presentNextPage error:', e); }
}

function resetPresentTimer() { presentState.timerStart = Date.now(); updatePresentTimerDisplay(); }
function startPresentTimer() { stopPresentTimer(); presentState.timerInterval = setInterval(updatePresentTimerDisplay, 1000); }
function stopPresentTimer() { if (presentState.timerInterval) { clearInterval(presentState.timerInterval); presentState.timerInterval = null; } }
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
    if (e.key === 'p' || e.key === 'P') { if (e.shiftKey) setPresentTool('highlighter'); else setPresentTool('pen'); return; }
    if (e.key === 'h' || e.key === 'H') { setPresentTool('hand'); return; }
    if (e.key === 'l' || e.key === 'L') { setPresentTool('laser'); return; }
    if (e.key === 'e' || e.key === 'E') { setPresentTool('eraser'); return; }
    if (e.key === 'v' || e.key === 'V') { setPresentTool('select'); return; }
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); if (e.shiftKey) presentRedo(); else presentUndo(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); presentRedo(); }
  };
  document.addEventListener('keydown', presentState.keyListener);
}

function unbindPresentKeys() {
  if (presentState.keyListener) { document.removeEventListener('keydown', presentState.keyListener); presentState.keyListener = null; }
}

/* ═══════════════════════════════════════════════════════════
   §19. OBSERVERS + SHORTCUTS
   ═══════════════════════════════════════════════════════════ */
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
  document.addEventListener('ipb:pageChanged', () => setTimeout(refreshLayersPanel, 50));
}

function initGlobalShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'F5') {
      e.preventDefault();
      if (presentState.active) closePresentMode();
      else openPresentMode();
    }
  });
}

/* ═══════════════════════════════════════════════════════════
   §20. INIT
   ═══════════════════════════════════════════════════════════ */
export function initUIShell() {
  applyVersion();
  initPropsTabs();
  initBottomPanel();
  initTopbarActions();
  initGlobalShortcuts();
  setupEquationBackdropMirror();
  initPropsToggle();
  initSidebarToggle();
  initCloseProject();
  initProjectDimsPanel();
  initElementDesignProps();
  initCanvasControls();
  initToolbarToggle();

  // ★ Session 1 — listener لـ dirty
  document.addEventListener('ipb:dirtyChanged', () => {
    const txt = document.getElementById('saveBadgeText');
    const dot = document.querySelector('#saveBadge .save-dot');
    if (txt) txt.textContent = state.dirty ? 'غير محفوظ' : 'محفوظ';
    if (dot) dot.classList.toggle('dirty', state.dirty);
  });

  import('./ui-animation.js')
  .then(m => m.initTimelineEditor && m.initTimelineEditor())
  .catch(err => console.warn('Animation module init failed:', err));

  import('./core.js').then(core => {
    const hasProject = core.state.slides && core.state.slides.length > 0;
    if (hasProject) { document.body.classList.add('has-project'); document.body.classList.remove('no-project'); }
    else { document.body.classList.remove('has-project'); document.body.classList.add('no-project'); }
  });

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
    closeProject: showCloseDialog,
    // ★ Session 6
    resetProjectHandles: async () => {
      try {
        const storage = await import('./storage.js');
        if (storage.resetFileHandle) storage.resetFileHandle();
        if (storage.stopAutoSave) storage.stopAutoSave();
        if (storage.startAutoSave) storage.startAutoSave();
      } catch (_) {}
    },
  };
}