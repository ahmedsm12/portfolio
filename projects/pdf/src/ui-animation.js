/**
 * Animation Panel & Timeline UI Controller
 * Integrates 12 animations, Draw Path, Move+Draw, Morph, Keyframes,
 * Triggers (onClick, withPrev, afterPrev), and interactive preview.
 */
import {
  ANIMATION_TYPES,
  PRESET_PATHS,
  getElementAnimation,
  setElementAnimation,
  runSingleAnimation,
  playTimeline,
  pauseTimeline,
  seekTimeline,
  resetTimeline,
  isPlaying,
  buildSlideTimeline,
} from './engine/animation.js';
import { startInteractivePathDrawing } from './engine/path-editor.js';

export async function renderAnimationPanel() {
  const panel = document.getElementById('animationPanel');
  if (!panel) return;

  const core = await import('./core.js');
  const inter = await import('./interaction.js');

  const sel = (core.state.selectedList && core.state.selectedList.length > 0)
    ? core.state.selectedList[0]
    : core.state.selected;

  if (!sel || !sel.el) {
    panel.innerHTML = `
      <div class="effects-empty">
        <div class="effects-empty-icon">🎬</div>
        <div class="effects-empty-title">لوحة الحركات والمسارات الحية</div>
        <div class="effects-empty-desc">
          حدد عنصراً في الشريحة (شكلاً، نصاً، صورة، زراً) لتطبيق إحدى الحركات الـ 12 المتطورة أو رسم مسار حركة متزامن.
        </div>
        <div class="effects-features-list">
          <div class="fx-feature-item">⭐ رسم المسار التدريجي (Draw Path)</div>
          <div class="fx-feature-item">⭐⭐ حركة مع رسم مسار متزامن (Move + Draw)</div>
          <div class="fx-feature-item">🔮 تحول شكلي انسيابي (SVG Morph)</div>
          <div class="fx-feature-item">🏀 ارتداد ونبض مرن (Bounce & Pulse)</div>
          <div class="fx-feature-item">⏱ جدول زمني كامل مع Keyframes</div>
        </div>
      </div>
    `;
    return;
  }

  const el = sel.el;
  const currentAnim = getElementAnimation(el) || {
    type: 'fadeIn',
    duration: 2.0,
    delay: 0.0,
    trigger: 'onClick',
    ease: 'power2.out',
    direction: 'from-start',
    pathD: PRESET_PATHS[0].d,
  };

  const isPathType = currentAnim.type === 'drawPath' || currentAnim.type === 'moveDraw';
  const isMorph = currentAnim.type === 'morph';

  panel.innerHTML = `
    <div class="anim-panel-wrap">
      <div class="anim-header-title">
        <span>🎬 حركة العنصر</span>
        <span class="anim-badge">${currentAnim.type}</span>
      </div>

      <div class="prop-section">
        <div class="prop-title">نوع الحركة (12 نوع حركة)</div>
        <select class="prop-input" id="animTypeSelect" style="width:100%;cursor:pointer;font-size:12px;padding:6px 8px">
          ${ANIMATION_TYPES.map(a => `
            <option value="${a.id}" ${currentAnim.type === a.id ? 'selected' : ''}>${a.label}</option>
          `).join('')}
        </select>
      </div>

      ${isPathType ? `
        <div class="prop-section anim-path-section">
          <div class="prop-title">مسار الحركة (Motion Path)</div>
          <div style="display:flex;gap:6px;margin-bottom:6px">
            <select class="prop-input" id="animPathPresetSelect" style="flex:1;cursor:pointer;font-size:11.5px">
              ${PRESET_PATHS.map(p => `
                <option value="${p.id}" ${currentAnim.pathPreset === p.id ? 'selected' : ''}>${p.label}</option>
              `).join('')}
              <option value="custom" ${currentAnim.pathPreset === 'custom' ? 'selected' : ''}>مسار مخصص</option>
            </select>
            <button type="button" class="prop-input" id="btnDrawNewPath" style="cursor:pointer;padding:0 10px;font-size:11px;background:rgba(59,130,246,0.15);border-color:#3b82f6;color:#60a5fa;white-space:nowrap">
              ✏️ رسم مسار
            </button>
          </div>

          <div class="prop-row">
            <div class="prop-field">
              <label>اتجاه الحركة</label>
              <select class="prop-input" id="animDirectionSelect" style="cursor:pointer;font-size:11.5px">
                <option value="from-start" ${currentAnim.direction === 'from-start' ? 'selected' : ''}>من البداية ⇥</option>
                <option value="reverse" ${currentAnim.direction === 'reverse' ? 'selected' : ''}>من النهاية ⇤</option>
              </select>
            </div>
            <div class="prop-field">
              <label>لون الخط</label>
              <input type="color" class="prop-input" id="animPathColor" value="${currentAnim.pathColor || '#3b82f6'}" style="padding:2px;height:28px" />
            </div>
          </div>
        </div>
      ` : ''}

      ${isMorph ? `
        <div class="prop-section">
          <div class="prop-title">الشكل الهدف للتحول (Morph Target)</div>
          <select class="prop-input" id="animMorphTargetSelect" style="width:100%;cursor:pointer;font-size:11.5px">
            ${PRESET_PATHS.map(p => `
              <option value="${p.d}">${p.label}</option>
            `).join('')}
          </select>
        </div>
      ` : ''}

      <div class="prop-section">
        <div class="prop-title">التوقيت والانسيابية</div>
        <div class="prop-row">
          <div class="prop-field">
            <label>المدة (ثواني)</label>
            <input type="number" class="prop-input" id="animDurationInput" min="0.1" max="60" step="0.1" value="${currentAnim.duration || 2.0}" />
          </div>
          <div class="prop-field">
            <label>التأخير (ثواني)</label>
            <input type="number" class="prop-input" id="animDelayInput" min="0" max="60" step="0.1" value="${currentAnim.delay || 0.0}" />
          </div>
        </div>

        <div class="prop-row" style="margin-top:6px">
          <div class="prop-field">
            <label>مشغّل الحركة (Trigger)</label>
            <select class="prop-input" id="animTriggerSelect" style="cursor:pointer;font-size:11px">
              <option value="onClick" ${currentAnim.trigger === 'onClick' ? 'selected' : ''}>عند النقر (onClick)</option>
              <option value="withPrev" ${currentAnim.trigger === 'withPrev' ? 'selected' : ''}>مع السابق (withPrev)</option>
              <option value="afterPrev" ${currentAnim.trigger === 'afterPrev' ? 'selected' : ''}>بعد السابق (afterPrev)</option>
            </select>
          </div>
          <div class="prop-field">
            <label>الانسيابية (Easing)</label>
            <select class="prop-input" id="animEaseSelect" style="cursor:pointer;font-size:11px">
              <option value="power2.out" ${currentAnim.ease === 'power2.out' ? 'selected' : ''}>Power2 Out</option>
              <option value="power1.inOut" ${currentAnim.ease === 'power1.inOut' ? 'selected' : ''}>Smooth InOut</option>
              <option value="linear" ${currentAnim.ease === 'linear' ? 'selected' : ''}>خطي (Linear)</option>
              <option value="bounce.out" ${currentAnim.ease === 'bounce.out' ? 'selected' : ''}>ارتدادي (Bounce)</option>
              <option value="elastic.out(1, 0.3)" ${currentAnim.ease?.includes('elastic') ? 'selected' : ''}>مرن (Elastic)</option>
              <option value="back.out(1.7)" ${currentAnim.ease?.includes('back') ? 'selected' : ''}>تراجع (Back)</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="prop-section" style="margin-top:12px">
        <button type="button" class="anim-preview-btn" id="btnPreviewSingleAnim">
          <span>▶</span><span>معاينة الحركة الآن</span>
        </button>
        <button type="button" class="prop-input" id="btnRemoveAnim" style="margin-top:6px;cursor:pointer;font-size:11px;color:#ef4444;background:rgba(239,68,68,0.1);border-color:#ef4444;width:100%">
          🗑️ إزالة الحركة من العنصر
        </button>
      </div>
    </div>
  `;

  // Bind UI Events
  const typeSelect = document.getElementById('animTypeSelect');
  const durInput = document.getElementById('animDurationInput');
  const delayInput = document.getElementById('animDelayInput');
  const triggerSelect = document.getElementById('animTriggerSelect');
  const easeSelect = document.getElementById('animEaseSelect');
  const previewBtn = document.getElementById('btnPreviewSingleAnim');
  const removeBtn = document.getElementById('btnRemoveAnim');
  const drawNewPathBtn = document.getElementById('btnDrawNewPath');
  const pathPresetSelect = document.getElementById('animPathPresetSelect');
  const dirSelect = document.getElementById('animDirectionSelect');
  const pathColorInp = document.getElementById('animPathColor');
  const morphSelect = document.getElementById('animMorphTargetSelect');

  function saveCurrentAnim() {
    const updated = {
      type: typeSelect ? typeSelect.value : currentAnim.type,
      duration: durInput ? parseFloat(durInput.value) || 2.0 : 2.0,
      delay: delayInput ? parseFloat(delayInput.value) || 0.0 : 0.0,
      trigger: triggerSelect ? triggerSelect.value : 'onClick',
      ease: easeSelect ? easeSelect.value : 'power2.out',
      direction: dirSelect ? dirSelect.value : currentAnim.direction || 'from-start',
      pathPreset: pathPresetSelect ? pathPresetSelect.value : currentAnim.pathPreset || 'arc',
      pathD: currentAnim.pathD || PRESET_PATHS[0].d,
      pathColor: pathColorInp ? pathColorInp.value : '#3b82f6',
      targetD: morphSelect ? morphSelect.value : currentAnim.targetD || PRESET_PATHS[1].d,
    };

    if (pathPresetSelect && pathPresetSelect.value !== 'custom') {
      const match = PRESET_PATHS.find(p => p.id === pathPresetSelect.value);
      if (match) updated.pathD = match.d;
    }

    setElementAnimation(el, updated);
    core.commitChange();
    buildSlideTimeline();
    renderTimelineTracks();
  }

  if (typeSelect) {
    typeSelect.addEventListener('change', () => {
      saveCurrentAnim();
      renderAnimationPanel();
    });
  }
  if (durInput) durInput.addEventListener('change', saveCurrentAnim);
  if (delayInput) delayInput.addEventListener('change', saveCurrentAnim);
  if (triggerSelect) triggerSelect.addEventListener('change', saveCurrentAnim);
  if (easeSelect) easeSelect.addEventListener('change', saveCurrentAnim);
  if (dirSelect) dirSelect.addEventListener('change', saveCurrentAnim);
  if (pathColorInp) pathColorInp.addEventListener('input', saveCurrentAnim);

  if (pathPresetSelect) {
    pathPresetSelect.addEventListener('change', () => {
      if (pathPresetSelect.value !== 'custom') {
        const found = PRESET_PATHS.find(p => p.id === pathPresetSelect.value);
        if (found) currentAnim.pathD = found.d;
      }
      saveCurrentAnim();
    });
  }

  if (drawNewPathBtn) {
    drawNewPathBtn.addEventListener('click', () => {
      startInteractivePathDrawing((newPathD) => {
        currentAnim.pathD = newPathD;
        currentAnim.pathPreset = 'custom';
        saveCurrentAnim();
        core.toast('تم حفظ مسار الحركة بنجاح! اضغط معاينة لتجربته ✨', 'ok');
        runSingleAnimation(el, currentAnim);
      });
    });
  }

  if (previewBtn) {
    previewBtn.addEventListener('click', () => {
      saveCurrentAnim();
      const cfg = getElementAnimation(el) || currentAnim;
      runSingleAnimation(el, cfg);
    });
  }

  if (removeBtn) {
    removeBtn.addEventListener('click', () => {
      setElementAnimation(el, null);
      core.commitChange();
      buildSlideTimeline();
      renderAnimationPanel();
      renderTimelineTracks();
      core.toast('تمت إزالة الحركة', 'info');
    });
  }
}

/**
 * Initialize Timeline Bottom Editor
 */
export function initTimelineEditor() {
  const playBtn = document.getElementById('tlBtnPlay');
  const rewindBtn = document.getElementById('tlBtnRewind');
  const addKfBtn = document.getElementById('tlBtnAddKeyframe');
  const scrubber = document.getElementById('tlScrubber');
  const currentText = document.getElementById('tlCurrentTimeText');
  const totalText = document.getElementById('tlTotalDurationText');

  if (playBtn) {
    playBtn.addEventListener('click', () => {
      if (isPlaying()) {
        pauseTimeline();
      } else {
        playTimeline();
      }
    });
  }

  if (rewindBtn) {
    rewindBtn.addEventListener('click', () => {
      resetTimeline();
      if (scrubber) scrubber.value = '0';
      if (currentText) currentText.textContent = '0.00s';
    });
  }

  if (scrubber) {
    scrubber.addEventListener('input', () => {
      const t = parseFloat(scrubber.value) || 0;
      seekTimeline(t);
      if (currentText) currentText.textContent = t.toFixed(2) + 's';
    });
  }

  if (addKfBtn) {
    addKfBtn.addEventListener('click', async () => {
      const core = await import('./core.js');
      const sel = core.state.selected;
      if (!sel || !sel.el) {
        core.toast('حدد عنصراً أولاً لإضافة نقطة حركة له', 'warn');
        return;
      }
      const anim = getElementAnimation(sel.el) || {
        type: 'fadeIn',
        duration: 2.0,
        delay: parseFloat(scrubber ? scrubber.value : 0),
        trigger: 'onClick',
      };
      setElementAnimation(sel.el, anim);
      core.commitChange();
      buildSlideTimeline();
      renderTimelineTracks();
      core.toast('تمت إضافة نقطة الحركة في الجدول الزمني ✨', 'ok');
    });
  }

  document.addEventListener('ipb:timelineUpdate', (e) => {
    const { time, duration } = e.detail;
    if (scrubber && !scrubber.matches(':active')) {
      scrubber.value = String(time);
      scrubber.max = String(Math.max(5, duration));
    }
    if (currentText) currentText.textContent = time.toFixed(2) + 's';
    if (totalText) totalText.textContent = Math.max(5, duration).toFixed(2) + 's';
  });

  document.addEventListener('ipb:timelinePlayState', (e) => {
    if (playBtn) {
      playBtn.textContent = e.detail.isPlaying ? '⏸ إيقاف' : '▶ تشغيل';
    }
  });

  document.addEventListener('ipb:pageChanged', () => {
    buildSlideTimeline();
    renderTimelineTracks();
  });

  renderTimelineTracks();
}

/**
 * Render visual tracks for all animated elements in the timeline
 */
export function renderTimelineTracks() {
  const container = document.getElementById('timelineTracksContainer');
  if (!container) return;

  const stage = document.getElementById('stage') || document.body;
  const elements = stage.querySelectorAll('[data-animation]');

  if (elements.length === 0) {
    container.innerHTML = `
      <div class="bp-empty" style="padding:24px 10px;text-align:center;color:var(--sh-text-muted);font-size:12px">
        لا توجد عناصر متحركة في هذه الشريحة حالياً. اختر عنصراً وافتح تبويب "الحركة 🎬" لإضافة حركة له.
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="tl-tracks-list">
      ${Array.from(elements).map((el, i) => {
        const data = getElementAnimation(el);
        const name = el.dataset.textId || el.dataset.id || `عنصر ${i + 1}`;
        const delay = parseFloat(data?.delay || 0);
        const dur = parseFloat(data?.duration || 2.0);
        const leftPct = (delay / 5.0) * 100;
        const widthPct = Math.min(100 - leftPct, (dur / 5.0) * 100);

        return `
          <div class="tl-track-row" data-el-idx="${i}">
            <div class="tl-track-label">
              <span class="tl-track-icon">🎬</span>
              <span class="tl-track-name">${name} (${data?.type})</span>
            </div>
            <div class="tl-track-bar-area">
              <div class="tl-keyframe-bar" style="left:${leftPct}%;width:${widthPct}%" title="${data?.type} [${dur}s]">
                <span class="tl-kf-node start">◆</span>
                <span class="tl-kf-title">${data?.type}</span>
                <span class="tl-kf-node end">◆</span>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}
