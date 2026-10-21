/**
 * AI Design Panel Controller
 * Allows natural language generation of slides, layouts, diagrams,
 * visual styles, and synchronized animations using Google Gemini API.
 */
import { generateAiSlideDesign, applyAiDesignToStage } from './engine/ai-design.js';

export function renderAiDesignPanel() {
  const panel = document.getElementById('aiDesignPanel');
  if (!panel) return;

  panel.innerHTML = `
    <div class="ai-panel-container">
      <div class="ai-header">
        <div class="ai-title-row">
          <span class="ai-sparkle-icon">✦</span>
          <div>
            <div class="ai-main-title">التصميم بالذكاء الاصطناعي</div>
            <div class="ai-sub-title">توليد نصوص، أشكال، وتأثيرات حركية تلقائياً عبر Google Gemini</div>
          </div>
        </div>
      </div>

      <div class="prop-section" style="margin-top:12px">
        <label style="font-size:11px;color:var(--sh-text-muted);display:block;margin-bottom:6px">اكتب وصفاً للشريحة التي تريد تصميمها:</label>
        <textarea id="aiPromptInput" class="ai-prompt-area" rows="4" placeholder="مثال: شريحة تعليمية عن الطاقة الشمسية مع رسم توضيحي لحركة الأشعة، عنوان رئيسي وبطاقات فوائد مع حركة انسيابية..."></textarea>
      </div>

      <!-- Quick Prompt Chips -->
      <div class="prop-section">
        <div class="prop-title">أفكار جاهزة سريعة:</div>
        <div class="ai-chips-list">
          <button type="button" class="ai-chip-btn" data-p="شريحة كواكب المجموعة الشمسية مع مدارات دائرية وحركة Move+Draw للكواكب">🪐 كواكب ومدارات (Move+Draw)</button>
          <button type="button" class="ai-chip-btn" data-p="مخطط مقارنة احترافي بين الذكاء الاصطناعي والتعلم الآلي في 3 بطاقات">📊 بطاقات مقارنة ذكية</button>
          <button type="button" class="ai-chip-btn" data-p="رسم بياني لخط زمني 4 مراحل مع مسار Draw Path وتأثير نبض">📈 جدول زمني ومسار</button>
          <button type="button" class="ai-chip-btn" data-p="شريحة فكرة إبداعية مع بطاقة زجاجية وتوهج نيون أزرق">💡 بطاقة ابتكار مع Glow</button>
        </div>
      </div>

      <!-- Theme Selector -->
      <div class="prop-section">
        <div class="prop-title">نمط الألوان والتصميم:</div>
        <div class="ai-theme-grid">
          <label class="ai-theme-opt">
            <input type="radio" name="aiTheme" value="modern-tech" checked />
            <span>🌐 تقني حديث</span>
          </label>
          <label class="ai-theme-opt">
            <input type="radio" name="aiTheme" value="dark-glass" />
            <span>💎 زجاجي داكن</span>
          </label>
          <label class="ai-theme-opt">
            <input type="radio" name="aiTheme" value="vibrant-warm" />
            <span>🔥 دافئ وجذاب</span>
          </label>
          <label class="ai-theme-opt">
            <input type="radio" name="aiTheme" value="minimal-clean" />
            <span>⚪ أنيق وموجز</span>
          </label>
        </div>
      </div>

      <!-- Generate Button -->
      <div class="prop-section" style="margin-top:14px">
        <button type="button" class="ai-generate-btn" id="btnRunAiDesign">
          <span class="ai-btn-icon">✨</span>
          <span>توليد وتصميم الشريحة تلقائياً</span>
        </button>
        <div id="aiLoadingIndicator" class="ai-loading" style="display:none">
          <div class="ai-spinner"></div>
          <div class="ai-loading-text">جارٍ تحليل الفكرة وتوليد الأشكال والنصوص والحركات...</div>
        </div>
      </div>
    </div>
  `;

  // Bind Events
  const promptInput = document.getElementById('aiPromptInput');
  const runBtn = document.getElementById('btnRunAiDesign');
  const loading = document.getElementById('aiLoadingIndicator');

  // Chips click handler
  panel.querySelectorAll('.ai-chip-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (promptInput) {
        promptInput.value = btn.dataset.p || '';
        promptInput.focus();
      }
    });
  });

  if (runBtn) {
    runBtn.addEventListener('click', async () => {
      const prompt = promptInput ? promptInput.value.trim() : '';
      if (!prompt) {
        const core = await import('./core.js');
        core.toast('يرجى كتابة وصف للشريحة أولاً أو اختيار أحد النماذج الجاهزة', 'warn');
        if (promptInput) promptInput.focus();
        return;
      }

      const selectedTheme = panel.querySelector('input[name="aiTheme"]:checked')?.value || 'modern-tech';

      runBtn.disabled = true;
      if (loading) loading.style.display = 'flex';

      try {
        const design = await generateAiSlideDesign(prompt, { theme: selectedTheme });
        await applyAiDesignToStage(design);
      } catch (err) {
        console.error('AI Design error:', err);
        const core = await import('./core.js');
        core.toast('تعذر إكمال التوليد بالذكاء الاصطناعي: ' + (err.message || 'خطأ غير معروف'), 'warn');
      } finally {
        runBtn.disabled = false;
        if (loading) loading.style.display = 'none';
      }
    });
  }
}
