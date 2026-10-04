/* ============================================================
 * elements.js — مصانع العناصر (embed / media / button)
 * ============================================================ */

import {
  state, mediaBlobs,
  uid, hexToRgba, escapeXml,
  getVideoDimensions, getImageDimensions,
  renderTextWithMath,
  playCorrectSound, playWrongSound,
  toast,
  commitChange, snapshot,
  serializeButton, serializeMedia, serializeEmbed,
  embedLayer, videoLayer, interactiveLayer, stage,
} from './core.js';

/* ============================================================
   §1. EMBED (iframe)
   ============================================================ */
export function addEmbedElement(url, x, y, w, h, save) {
  const el = document.createElement('div');
  el.className = 'embed';
  el.dataset.url = url;
  el.style.left = x || '30%';
  el.style.top = y || '25%';
  el.style.width = w || '40%';
  el.style.height = h || '40%';

  const header = document.createElement('div');
  header.className = 'embed-header';

  const title = document.createElement('span');
  title.className = 'embed-title';
  try { title.textContent = new URL(url).hostname; }
  catch (_) { title.textContent = url; }

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'embed-close';
  close.textContent = '×';
  close.addEventListener('pointerdown', e => e.stopPropagation());
  close.addEventListener('click', e => {
    e.stopPropagation();
    const pre = snapshot();
    if (state.selected && state.selected.el === el) state.selected = null;
    el.remove();
    commitChange(pre);
  });

  header.appendChild(title);
  header.appendChild(close);

  const iframe = document.createElement('iframe');
  iframe.src = url;
  iframe.setAttribute('sandbox',
    'allow-scripts allow-same-origin allow-forms allow-popups allow-modals ' +
    'allow-pointer-lock allow-downloads allow-popups-to-escape-sandbox allow-presentation');
  iframe.setAttribute('allow',
    'fullscreen; autoplay; clipboard-read; clipboard-write; gamepad; ' +
    'microphone; camera; encrypted-media; picture-in-picture');
  iframe.setAttribute('referrerpolicy', 'no-referrer');

  const resize = document.createElement('div');
  resize.className = 'embed-resize';

  el.appendChild(header);
  el.appendChild(iframe);
  el.appendChild(resize);
  embedLayer.appendChild(el);

  /* drag/resize binding — used by interaction.js when selection is set */
  header.addEventListener('pointerdown', e => {
    if (state.tool !== 'select' || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault(); e.stopPropagation();
    try { header.setPointerCapture(e.pointerId); } catch (_) {}
    if (typeof el.__selectEmbed === 'function') el.__selectEmbed(el);
    if (typeof el.__startEmbedDrag === 'function') el.__startEmbedDrag(el, e, 'move');
  });
  resize.addEventListener('pointerdown', e => {
    if (state.tool !== 'select' || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault(); e.stopPropagation();
    try { resize.setPointerCapture(e.pointerId); } catch (_) {}
    if (typeof el.__selectEmbed === 'function') el.__selectEmbed(el);
    if (typeof el.__startEmbedDrag === 'function') el.__startEmbedDrag(el, e, 'resize');
  });

  if (save !== false) {
    import('./core.js').then(m => m.savePageNow());
  }
  return el;
}

/* ============================================================
   §2. MEDIA (image / gif / video) — نسخة مبسّطة كالأشكال
   ============================================================
   - لا إطار، لا خلفية افتراضية
   - السحب من أي مكان على العنصر (في وضع التحديد)
   - شريط العنوان عائم فوق العنصر (hover/select فقط)
   - الفيديو يعمل في وضع hand
   ============================================================ */
export function addMediaElement(mediaId, url, title, mediaType, x, y, w, h, save) {
  const el = document.createElement('div');
  el.className = 'media-obj';
  el.dataset.mediaId = mediaId;
  el.dataset.mediaType = mediaType || 'video';
  el.dataset.title = title || '';
  el.style.left = x || '25%';
  el.style.top = y || '20%';
  el.style.width = w || '50%';
  el.style.height = h || '40%';

  /* Blob URL من الـ registry إن وُجد */
  let actualUrl = url;
  const storedBlob = mediaBlobs.get(mediaId);
  if (storedBlob) {
    try {
      if (actualUrl && actualUrl.startsWith('blob:')) URL.revokeObjectURL(actualUrl);
    } catch (_) {}
    actualUrl = URL.createObjectURL(storedBlob);
  }
  el.dataset.url = actualUrl;

  /* ─── المحتوى (img أو video) ─── */
  const content = document.createElement('div');
  content.className = 'media-content';

  if (mediaType === 'video') {
    const video = document.createElement('video');
    video.src = actualUrl;
    video.preload = 'metadata';
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.addEventListener('error', () => el.classList.add('media-error'));
    content.appendChild(video);

    /* زر تشغيل مركزي */
    const playBtn = document.createElement('button');
    playBtn.type = 'button';
    playBtn.className = 'media-play-btn';
    playBtn.innerHTML = '▶';
    playBtn.title = 'تشغيل / إيقاف';
    playBtn.addEventListener('pointerdown', e => e.stopPropagation());
    playBtn.addEventListener('click', e => {
      e.stopPropagation();
      e.preventDefault();
      if (state.tool !== 'hand' && state.tool !== 'select') return;
      if (video.paused) video.play().catch(() => toast('تعذّر تشغيل الفيديو', 'error'));
      else video.pause();
    });
    video.addEventListener('play', () => playBtn.classList.add('hidden'));
    video.addEventListener('pause', () => playBtn.classList.remove('hidden'));
    video.addEventListener('ended', () => playBtn.classList.remove('hidden'));
    el.appendChild(playBtn);
  } else {
    /* صورة أو GIF */
    const img = document.createElement('img');
    img.src = actualUrl;
    img.alt = title || '';
    img.draggable = false;
    img.addEventListener('error', () => el.classList.add('media-error'));
    content.appendChild(img);
  }

  /* ─── شريط العنوان العائم ─── */
  const header = document.createElement('div');
  header.className = 'media-header';

  const titleEl = document.createElement('span');
  titleEl.className = 'media-title';
  titleEl.textContent = title || (mediaType === 'video' ? 'فيديو' : 'صورة');

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'media-close';
  closeBtn.textContent = '×';
  closeBtn.title = 'حذف';
  closeBtn.addEventListener('pointerdown', e => e.stopPropagation());
  closeBtn.addEventListener('click', e => {
    e.stopPropagation();
    e.preventDefault();
    const pre = snapshot();
    if (state.selected && state.selected.el === el) state.selected = null;
    try {
      const v = el.querySelector('video');
      if (v) { v.pause(); v.src = ''; }
      const im = el.querySelector('img');
      if (im) im.src = '';
    } catch (_) {}
    el.remove();
    commitChange(pre);
  });

  header.appendChild(titleEl);
  header.appendChild(closeBtn);

  /* ─── مقبض التحجيم ─── */
  const resize = document.createElement('div');
  resize.className = 'media-resize';

  /* ─── التجميع ─── */
  el.appendChild(content);
  el.appendChild(header);
  el.appendChild(resize);
  videoLayer.appendChild(el);

  /* ═══════════════════════════════════════════════════════
     التفاعل: نفس أسلوب SVG shapes
     - في وضع التحديد: pointerdown من أي مكان → تحديد + سحب
     - في وضع hand: pointerdown → play/pause للفيديو
     ═══════════════════════════════════════════════════════ */

  /* سحب من الشريط العلوي (يظهر فقط عند hover/select) */
  header.addEventListener('pointerdown', e => {
    if (state.tool !== 'select' || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault();
    e.stopPropagation();
    try { header.setPointerCapture(e.pointerId); } catch (_) {}
    if (typeof el.__selectMedia === 'function') el.__selectMedia(el);
    if (typeof el.__startMediaDrag === 'function') el.__startMediaDrag(el, e, 'move');
  });

  /* سحب من أي مكان على العنصر (وضع التحديد) */
  el.addEventListener('pointerdown', e => {
    if (state.tool !== 'select') return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.target.classList.contains('media-resize')) return;
    if (e.target.classList.contains('media-close')) return;
    if (e.target.classList.contains('media-play-btn')) return;
    if (e.target.closest('.media-header')) return;

    e.preventDefault();
    e.stopPropagation();
    try { el.setPointerCapture(e.pointerId); } catch (_) {}
    if (typeof el.__selectMedia === 'function') el.__selectMedia(el);
    if (typeof el.__startMediaDrag === 'function') el.__startMediaDrag(el, e, 'move');
  });

  /* في وضع hand: pointerdown على الفيديو → play/pause */
  if (mediaType === 'video') {
    const video = el.querySelector('video');
    if (video) {
      video.addEventListener('pointerdown', e => {
        if (state.tool !== 'hand') return;
        e.stopPropagation();
      });
      video.addEventListener('click', e => {
        if (state.tool !== 'hand') return;
        e.stopPropagation();
        e.preventDefault();
        if (video.paused) video.play().catch(() => {});
        else video.pause();
      });
    }
  }

  /* تحجيم */
  resize.addEventListener('pointerdown', e => {
    if (state.tool !== 'select') return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    try { resize.setPointerCapture(e.pointerId); } catch (_) {}
    if (typeof el.__selectMedia === 'function') el.__selectMedia(el);
    if (typeof el.__startMediaDrag === 'function') el.__startMediaDrag(el, e, 'resize');
  });

  if (save !== false) savePageNow();
  return el;
}
/* ============================================================
   §3. INTERACTIVE BUTTON
   ============================================================ */
export const BUTTON_DEFAULTS = {
  text: 'خيار',
  fillColor: '#4a7eff',
  fillOpacity: 0.13,
  borderColor: '#4a7eff',
  borderOpacity: 0.45,
  textColor: '#1e3a8a',
  fontSize: 18,
  borderRadius: 12,
  isCorrect: true,
  isLtr: false,
  w: '130px',
  h: '46px',
};

export function applyButtonStyles(el) {
  el.style.background = hexToRgba(el.dataset.fillColor, parseFloat(el.dataset.fillOpacity));
  el.style.border = `1.5px solid ${hexToRgba(el.dataset.borderColor, parseFloat(el.dataset.borderOpacity))}`;
  el.style.color = el.dataset.textColor;
  el.style.fontSize = (el.dataset.fontSize || '18') + 'px';
  el.style.borderRadius = (el.dataset.borderRadius || '12') + 'px';
  if (el.dataset.isLtr === 'true') el.style.direction = 'ltr';
  else el.style.direction = '';
}

export function addButtonElement(spec, save) {
  const s = Object.assign({}, BUTTON_DEFAULTS, spec || {});
  const el = document.createElement('div');
  el.className = 'pdf-interactive-btn';
  el.setAttribute('role', 'button');
  el.setAttribute('tabindex', '0');

  el.dataset.btnId = s.btnId || uid();
  el.dataset.text = s.text || '';
  el.dataset.fillColor = s.fillColor;
  el.dataset.fillOpacity = String(s.fillOpacity);
  el.dataset.borderColor = s.borderColor;
  el.dataset.borderOpacity = String(s.borderOpacity);
  el.dataset.textColor = s.textColor;
  el.dataset.fontSize = String(s.fontSize);
  el.dataset.borderRadius = String(s.borderRadius);
  el.dataset.isCorrect = (s.isCorrect === true || s.isCorrect === 'true') ? 'true' : 'false';
  el.dataset.isLtr = (s.isLtr === true || s.isLtr === 'true') ? 'true' : 'false';

  el.style.left = s.x || '35%';
  el.style.top = s.y || '35%';
  el.style.width = s.w || BUTTON_DEFAULTS.w;
  el.style.height = s.h || BUTTON_DEFAULTS.h;

  const span = document.createElement('span');
  span.className = 'pdf-interactive-btn-text';
  renderTextWithMath(span, s.text || '');
  el.appendChild(span);

  const resize = document.createElement('div');
  resize.className = 'pdf-interactive-btn-resize';
  el.appendChild(resize);

  applyButtonStyles(el);

  el.addEventListener('pointerdown', e => {
    if (state.tool === 'hand') {
      e.stopPropagation();
    } else if (state.tool === 'select') {
      e.preventDefault(); e.stopPropagation();
      try { el.setPointerCapture(e.pointerId); } catch (_) {}
      if (typeof el.__selectButton === 'function') el.__selectButton(el);
      if (typeof el.__startButtonDrag === 'function') el.__startButtonDrag(el, e, 'move');
    }
  });

  el.addEventListener('click', e => {
    if (state.tool !== 'hand') return;
    e.stopPropagation(); e.preventDefault();
    triggerButtonFeedback(el);
  });

  resize.addEventListener('pointerdown', e => {
    if (state.tool !== 'select') return;
    e.preventDefault(); e.stopPropagation();
    try { resize.setPointerCapture(e.pointerId); } catch (_) {}
    if (typeof el.__selectButton === 'function') el.__selectButton(el);
    if (typeof el.__startButtonDrag === 'function') el.__startButtonDrag(el, e, 'resize');
  });

  el.addEventListener('dblclick', e => {
    if (state.tool !== 'select') return;
    e.stopPropagation(); e.preventDefault();
    openButtonDialog(serializeButton(el), el);
  });

  interactiveLayer.appendChild(el);
  if (save !== false) {
    import('./core.js').then(m => m.savePageNow());
  }
  return el;
}

export function triggerButtonFeedback(el) {
  const isCorrect = el.dataset.isCorrect === 'true';
  el.classList.remove('correct-feedback', 'wrong-feedback');
  void el.offsetWidth;
  if (isCorrect) {
    el.classList.add('correct-feedback');
    setTimeout(() => el.classList.remove('correct-feedback'), 1100);
    playCorrectSound();
  } else {
    el.classList.add('wrong-feedback');
    setTimeout(() => el.classList.remove('wrong-feedback'), 800);
    playWrongSound();
  }
}

/* ============================================================
   §4. BUTTON DIALOG
   ============================================================ */
export function openButtonDialog(existingSpec, existingEl) {
  const isEdit = !!existingEl;
  const s = existingSpec || Object.assign({}, BUTTON_DEFAULTS);
  const b = document.createElement('div');
  b.className = 'dialog-backdrop';

  b.innerHTML = `
    <div class="dialog" style="max-width:480px">
      <h3>${isEdit ? '✏️ تعديل الزر' : '🔘 إضافة زر تفاعلي'}</h3>
      <div class="btn-form-row">
        <label>النص (يدعم المعادلات: $x^2$)</label>
        <textarea id="btnText" maxlength="200" rows="2" style="width:100%;padding:10px 12px;background:#0f1115;color:#eee;border:1px solid rgba(255,255,255,.12);border-radius:9px;font-size:14px;font-family:inherit;outline:none;resize:vertical;direction:rtl;text-align:right">${escapeXml(s.text || '')}</textarea>
      </div>
      <div class="btn-form-row inline">
        <span style="font-size:12px;color:#8a94a6;font-weight:600">النوع:</span>
        <label><input type="radio" name="btnType" value="correct" ${s.isCorrect ? 'checked' : ''}> صحيح ✅</label>
        <label><input type="radio" name="btnType" value="wrong" ${!s.isCorrect ? 'checked' : ''}> خاطئ ❌</label>
      </div>
      <div class="btn-form-row inline">
        <label><input type="checkbox" id="btnLtr" ${s.isLtr ? 'checked' : ''}> اتجاه LTR (للمعادلات)</label>
      </div>
      <div class="btn-form-grid">
        <div>
          <label>لون التعبئة</label>
          <div class="color-row">
            <input type="color" id="btnFill" value="${s.fillColor || '#4a7eff'}">
            <input type="range" id="btnFillOp" min="0" max="100" value="${Math.round((s.fillOpacity || 0) * 100)}">
          </div>
        </div>
        <div>
          <label>لون الحدود</label>
          <div class="color-row">
            <input type="color" id="btnBorder" value="${s.borderColor || '#4a7eff'}">
            <input type="range" id="btnBorderOp" min="0" max="100" value="${Math.round((s.borderOpacity || 0) * 100)}">
          </div>
        </div>
        <div>
          <label>لون النص</label>
          <div class="color-row"><input type="color" id="btnTextColor" value="${s.textColor || '#1e3a8a'}"></div>
        </div>
        <div>
          <label>حجم الخط</label>
          <input type="number" id="btnFontSize" min="10" max="48" value="${s.fontSize || 18}">
        </div>
      </div>
      <div class="btn-form-grid three">
        <div><label>العرض (px)</label><input type="number" id="btnW" min="40" max="600" value="${parseFloat(s.w) || 130}"></div>
        <div><label>الارتفاع (px)</label><input type="number" id="btnH" min="24" max="300" value="${parseFloat(s.h) || 46}"></div>
        <div><label>زوايا (px)</label><input type="number" id="btnRadius" min="0" max="60" value="${s.borderRadius != null ? s.borderRadius : 12}"></div>
      </div>
      <div class="btn-form-row">
        <label>معاينة</label>
        <div class="btn-preview-wrap"><div id="btnPreviewHost"></div></div>
      </div>
      <div class="dialog-actions">
        <button type="button" class="btn-secondary" data-action="cancel">إلغاء</button>
        <button type="button" class="btn-primary" data-action="ok">${isEdit ? 'تطبيق' : 'إضافة'}</button>
      </div>
    </div>`;
  document.body.appendChild(b);

  function readSpec() {
    const fill = b.querySelector('#btnFill').value;
    const fillOp = parseInt(b.querySelector('#btnFillOp').value, 10) / 100;
    const border = b.querySelector('#btnBorder').value;
    const borderOp = parseInt(b.querySelector('#btnBorderOp').value, 10) / 100;
    const textColor = b.querySelector('#btnTextColor').value;
    const fontSize = parseInt(b.querySelector('#btnFontSize').value, 10) || 18;
    const w = parseInt(b.querySelector('#btnW').value, 10) || 130;
    const h = parseInt(b.querySelector('#btnH').value, 10) || 46;
    const radius = parseInt(b.querySelector('#btnRadius').value, 10);
    const text = b.querySelector('#btnText').value || '';
    const typeRad = b.querySelector('input[name="btnType"]:checked').value;
    const isLtr = b.querySelector('#btnLtr').checked;
    return {
      text,
      fillColor: fill, fillOpacity: fillOp,
      borderColor: border, borderOpacity: borderOp,
      textColor, fontSize,
      w: w + 'px', h: h + 'px',
      borderRadius: isNaN(radius) ? 12 : radius,
      isCorrect: typeRad === 'correct',
      isLtr,
    };
  }

  function updatePreview() {
    const spec = readSpec();
    const host = b.querySelector('#btnPreviewHost');
    host.innerHTML = '';
    const prev = document.createElement('div');
    prev.style.cssText =
      'display:inline-flex;align-items:center;justify-content:center;' +
      'padding:6px 14px;font-family:inherit;font-weight:600;text-align:center;' +
      'line-height:1.25;pointer-events:none;user-select:none;white-space:nowrap;' +
      'box-sizing:border-box;overflow:hidden;' +
      `width:${spec.w};height:${spec.h};` +
      `background:${hexToRgba(spec.fillColor, spec.fillOpacity)};` +
      `border:1.5px solid ${hexToRgba(spec.borderColor, spec.borderOpacity)};` +
      `color:${spec.textColor};font-size:${spec.fontSize}px;` +
      `border-radius:${spec.borderRadius}px;` +
      (spec.isLtr ? 'direction:ltr;' : '');
    renderTextWithMath(prev, spec.text || 'خيار');
    host.appendChild(prev);
  }

  b.addEventListener('input', updatePreview);
  b.addEventListener('change', updatePreview);
  updatePreview();

  function close() { b.remove(); }

  function submit() {
    const spec = readSpec();
    if (existingEl) {
      const pre = snapshot();
      existingEl.dataset.text = spec.text;
      existingEl.dataset.fillColor = spec.fillColor;
      existingEl.dataset.fillOpacity = String(spec.fillOpacity);
      existingEl.dataset.borderColor = spec.borderColor;
      existingEl.dataset.borderOpacity = String(spec.borderOpacity);
      existingEl.dataset.textColor = spec.textColor;
      existingEl.dataset.fontSize = String(spec.fontSize);
      existingEl.dataset.borderRadius = String(spec.borderRadius);
      existingEl.dataset.isCorrect = spec.isCorrect ? 'true' : 'false';
      existingEl.dataset.isLtr = spec.isLtr ? 'true' : 'false';
      existingEl.style.width = spec.w;
      existingEl.style.height = spec.h;
      const span = existingEl.querySelector('.pdf-interactive-btn-text');
      if (span) renderTextWithMath(span, spec.text);
      applyButtonStyles(existingEl);
      commitChange(pre);
    } else {
      const pre = snapshot();
      addButtonElement(spec, false);
      commitChange(pre);
      import('./toolbar.js').then(m => m.setTool('select'));
    }
    close();
  }

  b.querySelector('[data-action="cancel"]').addEventListener('click', close);
  b.querySelector('[data-action="ok"]').addEventListener('click', submit);
  b.addEventListener('click', e => { if (e.target === b) close(); });
  setTimeout(() => {
    try { const t = b.querySelector('#btnText'); t.focus(); t.select(); } catch (_) {}
  }, 60);
}

/* ============================================================
   §5. MEDIA PICKER
   ============================================================ */
export function openMediaPicker() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'video/*,image/*,.gif';
  input.multiple = true;
  input.style.display = 'none';
  document.body.appendChild(input);

  input.addEventListener('change', async e => {
    const files = Array.from(e.target.files || []);
    if (!files.length) { input.remove(); return; }

    const pre = snapshot();
    let placed = 0;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isVideo = /^video\//i.test(file.type);
        const isImage = /^image\//i.test(file.type) || /\.gif$/i.test(file.name || '');
        if (!isVideo && !isImage) continue;

        try {
          const mediaId = uid();
          mediaBlobs.set(mediaId, file);
          const blobUrl = URL.createObjectURL(file);
          const mediaType = isVideo ? 'video' : 'image';
          const dims = isVideo
            ? await getVideoDimensions(blobUrl)
            : await getImageDimensions(blobUrl);

          const targetW = state.pdfW * 0.5;
          const ratio = dims.h / dims.w;
          let wPct = (targetW / state.pdfW) * 100;
          let hPct = (targetW * ratio / state.pdfH) * 100;
          if (hPct > 65) {
            hPct = 65;
            wPct = (hPct / 100 * state.pdfH) / (ratio * state.pdfW) * 100;
          }

          addMediaElement(
            mediaId, blobUrl, file.name || (isVideo ? 'فيديو' : 'صورة'),
            mediaType,
            (22 + (i % 3) * 4) + '%', (18 + (i % 3) * 4) + '%',
            wPct + '%', hPct + '%', false
          );
          placed++;
        } catch (err) { console.warn(err); }
      }

      if (placed > 0) {
        commitChange(pre);
        toast(`تمت إضافة ${placed} عنصر ✅`, 'ok');
        import('./toolbar.js').then(m => m.setTool('select'));
      } else {
        toast('لم يتم اختيار أي ملف صالح', 'warn');
      }
    } finally {
      input.remove();
    }
  });

  input.click();
}

/* ============================================================
   §6. EMBED DIALOG
   ============================================================ */
export function openEmbedDialog() {
  const b = document.createElement('div');
  b.className = 'dialog-backdrop';
  b.innerHTML = `
    <div class="dialog">
      <h3>🔗 تضمين وسائط تفاعلية</h3>
      <input type="url" id="embedUrlInput" placeholder="https://example.com/game" autofocus>
      <div class="dialog-actions">
        <button type="button" class="btn-secondary" data-action="cancel">إلغاء</button>
        <button type="button" class="btn-primary" data-action="ok">تضمين</button>
      </div>
    </div>`;
  document.body.appendChild(b);

  const input = b.querySelector('#embedUrlInput');
  setTimeout(() => { try { input.focus(); } catch (_) {} }, 50);

  function close() { b.remove(); }
  function submit() {
    let url = (input.value || '').trim();
    if (!url) { close(); return; }
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    const pre = snapshot();
    addEmbedElement(url);
    commitChange(pre);
    close();
    import('./toolbar.js').then(m => m.setTool('select'));
  }

  b.querySelector('[data-action="cancel"]').addEventListener('click', close);
  b.querySelector('[data-action="ok"]').addEventListener('click', submit);
  b.addEventListener('click', e => { if (e.target === b) close(); });
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') submit();
    if (e.key === 'Escape') close();
  });
}

/* ============================================================
   §7. HOOKS — تُعيّنها interaction.js لكسر الاعتماد الدائري
   ============================================================ */
export function installElementHooks(hooks) {
  /* hooks: { selectEmbed, startEmbedDrag, selectMedia, startMediaDrag, selectButton, startButtonDrag } */
  if (hooks.selectEmbed)    window.__selectEmbed    = hooks.selectEmbed;
  if (hooks.startEmbedDrag) window.__startEmbedDrag = hooks.startEmbedDrag;
  if (hooks.selectMedia)    window.__selectMedia    = hooks.selectMedia;
  if (hooks.startMediaDrag) window.__startMediaDrag = hooks.startMediaDrag;
  if (hooks.selectButton)   window.__selectButton   = hooks.selectButton;
  if (hooks.startButtonDrag) window.__startButtonDrag = hooks.startButtonDrag;

  /* حقن على النماذج الأولية */
  const attach = (proto, api) => {
    proto.__selectEmbed    = api.selectEmbed;
    proto.__startEmbedDrag = api.startEmbedDrag;
    proto.__selectMedia    = api.selectMedia;
    proto.__startMediaDrag = api.startMediaDrag;
    proto.__selectButton   = api.selectButton;
    proto.__startButtonDrag= api.startButtonDrag;
  };
  /* لا حاجة لعمل شيء هنا — الدوال في addXXX تستدعي عبر el.__xxx
     التي نمررها من interaction.js. في Part 3 سنمرر hooks. */
}