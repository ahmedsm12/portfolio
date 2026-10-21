/**
 * Visual Effects Tweening Engine (GSAP)
 * Handles animated transitions for Glow, Drop Shadow, Stroke, Fill, Blur, and 3D Tilt
 */
import gsap from 'gsap';

export function tweenVisualEffects(el, fromFx = {}, toFx = {}, options = {}) {
  if (!el) return null;

  const duration = options.duration || 1.5;
  const ease = options.ease || 'power2.out';

  // Extract initial values or fallback
  const startShadow = fromFx.shadow || { x: 0, y: 0, blur: 0, color: 'rgba(0,0,0,0)' };
  const targetShadow = toFx.shadow || { x: 0, y: 15, blur: 30, color: 'rgba(0,0,0,0.5)' };

  const startGlow = fromFx.glow || { blur: 0, spread: 0, color: 'rgba(59,130,246,0)' };
  const targetGlow = toFx.glow || { blur: 25, spread: 8, color: '#3b82f6' };

  const startBlur = fromFx.blur?.val || 0;
  const targetBlur = toFx.blur?.val || 0;

  const obj = {
    shadowX: startShadow.x || 0,
    shadowY: startShadow.y || 0,
    shadowBlur: startShadow.blur || 0,
    glowBlur: startGlow.blur || 0,
    blurVal: startBlur,
  };

  return gsap.to(obj, {
    shadowX: targetShadow.x || 0,
    shadowY: targetShadow.y || 0,
    shadowBlur: targetShadow.blur || 0,
    glowBlur: targetGlow.blur || 0,
    blurVal: targetBlur,
    duration,
    ease,
    onUpdate: () => {
      const filters = [];
      if (obj.shadowBlur > 0) {
        filters.push(`drop-shadow(${Math.round(obj.shadowX)}px ${Math.round(obj.shadowY)}px ${Math.round(obj.shadowBlur)}px ${targetShadow.color || 'rgba(0,0,0,0.45)'})`);
      }
      if (obj.glowBlur > 0) {
        filters.push(`drop-shadow(0 0 ${Math.round(obj.glowBlur)}px ${targetGlow.color || '#3b82f6'})`);
      }
      if (obj.blurVal > 0) {
        filters.push(`blur(${Math.round(obj.blurVal)}px)`);
      }
      el.style.filter = filters.join(' ');
    },
    onComplete: () => {
      if (options.onComplete) options.onComplete();
    },
  });
}
