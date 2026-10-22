/**
 * AI Design Engine for Interactive Slide Studio
 * Uses Google Gemini API (gemini-3.8-flash) to automatically design slides,
 * insert styled typography, shapes, diagrams, visual effects, and synchronized animations.
 */
import { GoogleGenAI } from 'https://cdn.jsdelivr.net/npm/@google/genai@2.4.0/+esm';

export async function generateAiSlideDesign(prompt, options = {}) {
  const apiKey = process.env.GEMINI_API_KEY || (typeof window !== 'undefined' && window.__GEMINI_KEY__);
  if (!apiKey) {
    throw new Error('مفتاح Google Gemini API غير متوفر. يرجى توفير المفتاح في متغيرات البيئة.');
  }

  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `
You are an expert presentation and motion design director for interactive visual slides (similar to Apple Keynote and high-end PowerPoint).
Generate a rich, cohesive visual slide layout for the user's prompt.
Respond ONLY with a valid JSON object (no markdown code fence, pure JSON) containing:
{
  "theme": "dark-glass" | "modern-tech" | "vibrant-warm" | "minimal-clean",
  "slideTitle": "عنوان الشريحة",
  "elements": [
    {
      "kind": "text" | "shape",
      "shapeType": "rect" | "circle" | "rounded-rect" | "card" | "arrow-right",
      "text": "نص العنصر إن وجد",
      "x": 100, // stage x position in px (canvas is 960x540 or 1200x675)
      "y": 100, // stage y position in px
      "w": 300, // width in px
      "h": 120, // height in px
      "color": "#ffffff", // text color
      "fontSize": 28,
      "fontWeight": "bold" | "normal",
      "bg": "#1e293b", // background color
      "stroke": "#3b82f6", // border color
      "strokeWidth": 2,
      "radius": 14,
      "effects": {
        "glow": { "active": true, "blur": 15, "color": "#3b82f6" },
        "shadow": { "active": true, "x": 0, "y": 10, "blur": 25, "color": "rgba(0,0,0,0.5)" }
      },
      "animation": {
        "type": "fadeIn" | "slideIn" | "zoomIn" | "pulse" | "bounce" | "drawPath" | "moveDraw",
        "direction": "top" | "bottom" | "left" | "right",
        "duration": 1.8,
        "delay": 0.2,
        "trigger": "onClick" | "withPrev" | "afterPrev",
        "pathD": "M 100 200 Q 300 100 500 200" // if moveDraw
      }
    }
  ]
}
Design high quality layouts with good spacing, contrast, Arabic typography, elegant cards, and modern animations.
`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: `User Prompt: ${prompt}. Theme preference: ${options.theme || 'modern-tech'}. Slide purpose: Presentation infographic with animations.`,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
    },
  });

  const rawText = response.text || '';
  try {
    return JSON.parse(rawText);
  } catch (err) {
    const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  }
}

/**
 * Apply generated AI design to the current slide canvas
 */
export async function applyAiDesignToStage(designData) {
  if (!designData || !Array.isArray(designData.elements)) return;

  const core = await import('../core.js');
  const inter = await import('../interaction.js');
  const anim = await import('./animation.js');

  const pre = core.snapshot();

  for (const item of designData.elements) {
    if (item.kind === 'text') {
      const textId = 'txt_' + Math.random().toString(36).slice(2, 7);
      inter.addTextBox({
        textId,
        text: item.text || 'نص توضيحي',
        x: item.x + 'px',
        y: item.y + 'px',
        w: (item.w || 280) + 'px',
        h: (item.h || 80) + 'px',
        fontSize: item.fontSize || 22,
        fontFamily: 'Cairo, sans-serif',
        fontWeight: item.fontWeight || 'normal',
        color: item.color || '#ffffff',
        bg: item.bg || 'rgba(30, 41, 59, 0.75)',
        align: 'right',
        dir: 'rtl',
      }, false);

      // Find the newly created element
      const el = document.querySelector(`[data-text-id="${textId}"]`);
      if (el) {
        if (item.animation) {
          anim.setElementAnimation(el, item.animation);
        }
      }
    } else {
      // Shape
      const shapeType = item.shapeType || 'rounded-rect';
      const shapeId = 'sh_' + Math.random().toString(36).slice(2, 7);
      const stroke = item.stroke || '#3b82f6';
      const fill = item.bg || item.fill || 'rgba(59, 130, 246, 0.15)';
      const sw = item.strokeWidth || 2;
      const x = item.x || 100;
      const y = item.y || 100;
      const w = item.w || 180;
      const h = item.h || 120;

      let svgHtml = '';
      if (shapeType === 'circle') {
        const r = Math.min(w, h) / 2;
        svgHtml = `<circle cx="${x + r}" cy="${y + r}" r="${r}" stroke="${stroke}" stroke-width="${sw}" fill="${fill}" data-annot="true" data-type="circle" />`;
      } else {
        const rad = item.radius || 12;
        svgHtml = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rad}" ry="${rad}" stroke="${stroke}" stroke-width="${sw}" fill="${fill}" data-annot="true" data-type="rect" />`;
      }

      const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      tempSvg.innerHTML = svgHtml;
      const shapeEl = tempSvg.firstElementChild;

      if (shapeEl) {
        const wrap = inter.createAnnotWrapper(shapeEl);
        const svgLayer = document.getElementById('svgLayer');
        if (svgLayer) svgLayer.appendChild(wrap);

        if (item.animation) {
          anim.setElementAnimation(shapeEl, item.animation);
        }
      }
    }
  }

  core.commitChange(pre);
  core.toast('تم إنشاء وتطبيق التصميم بالذكاء الاصطناعي بنجاح ✨', 'ok');

  // Trigger preview of the slide timeline
  setTimeout(() => {
    anim.playTimeline();
  }, 400);
}
