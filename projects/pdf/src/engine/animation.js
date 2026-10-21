/**
 * Master Animation Engine for Interactive Slide Studio
 * Supports 12 animation types, Draw Path, Move+Draw, Morphing,
 * Keyframe Timeline, Triggers (onClick, withPrev, afterPrev), and Live Previews.
 */
import gsap from 'gsap';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { animateDrawPath, animateMoveDraw } from './stroke-path.js';
import { morphSvgPath } from './morph.js';

gsap.registerPlugin(MotionPathPlugin);

// Global active animations & timeline state
let currentSlideTimeline = null;
let isTimelinePlaying = false;
let timelineDuration = 5.0; // Default 5 seconds
let activeTimelineTime = 0;

export const ANIMATION_TYPES = [
  { id: 'fadeIn', label: '✨ ظهور تدريجي (Fade In)', cat: 'entrance' },
  { id: 'slideIn', label: '➡️ انزلاق للداخل (Slide In)', cat: 'entrance' },
  { id: 'zoomIn', label: '🔍 تكبير للداخل (Zoom In)', cat: 'entrance' },
  { id: 'appear', label: '⚡ ظهور فوري (Appear)', cat: 'entrance' },
  { id: 'pulse', label: '💓 نبض (Pulse)', cat: 'emphasis' },
  { id: 'bounce', label: '🏀 ارتداد مرن (Bounce)', cat: 'emphasis' },
  { id: 'colorChange', label: '🎨 تغيير لوني (Color Change)', cat: 'emphasis' },
  { id: 'drawPath', label: '⭐ رسم المسار (Draw Path)', cat: 'special' },
  { id: 'moveDraw', label: '⭐⭐ حركة مع رسم مسار (Move + Draw)', cat: 'special' },
  { id: 'morph', label: '🔮 تحول شكلي (Shape Morph)', cat: 'special' },
  { id: 'fadeOut', label: '🌫️ تلاشي للخارج (Fade Out)', cat: 'exit' },
  { id: 'slideOut', label: '⬅️ انزلاق للخارج (Slide Out)', cat: 'exit' },
  { id: 'zoomOut', label: '🔎 تصغير للخارج (Zoom Out)', cat: 'exit' },
];

export const PRESET_PATHS = [
  { id: 'arc', label: 'قوس انسيابي (Arc)', d: 'M 100 300 Q 300 100 500 300' },
  { id: 'sCurve', label: 'منحنى S (S-Curve)', d: 'M 100 400 C 250 150 350 550 500 250' },
  { id: 'orbit', label: 'مدار دائري (Circle Orbit)', d: 'M 400 300 m -150, 0 a 150,150 0 1,0 300,0 a 150,150 0 1,0 -300,0' },
  { id: 'wave', label: 'موجة ترددية (Sine Wave)', d: 'M 100 300 Q 200 180 300 300 T 500 300' },
  { id: 'straight', label: 'خط مستقيم (Straight Line)', d: 'M 100 300 L 500 300' },
];

/**
 * Retrieve animation configuration from an element
 */
export function getElementAnimation(el) {
  if (!el) return null;
  try {
    const raw = el.dataset.animation;
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return null;
}

/**
 * Save animation configuration onto an element
 */
export function setElementAnimation(el, animData) {
  if (!el) return;
  if (!animData) {
    delete el.dataset.animation;
  } else {
    el.dataset.animation = JSON.stringify(animData);
  }
}

/**
 * Set up transform origin on element for pivot rotation & scaling
 */
export function setElementOrigin(el, originX = 0.5, originY = 0.5) {
  if (!el) return;
  el.dataset.originX = String(originX);
  el.dataset.originY = String(originY);
  const px = Math.round(originX * 100);
  const py = Math.round(originY * 100);
  el.style.transformOrigin = `${px}% ${py}%`;

  // For SVG inner elements
  const inner = el.querySelector('[data-annot]') || el;
  if (inner && inner.style) {
    inner.style.transformOrigin = `${px}% ${py}%`;
  }
}

export function getElementOrigin(el) {
  if (!el) return { x: 0.5, y: 0.5 };
  const ox = parseFloat(el.dataset.originX);
  const oy = parseFloat(el.dataset.originY);
  return {
    x: isNaN(ox) ? 0.5 : ox,
    y: isNaN(oy) ? 0.5 : oy,
  };
}

/**
 * Run a single animation on an element (used for instant preview or playback)
 */
export function runSingleAnimation(el, animConfig = {}, options = {}) {
  if (!el) return null;

  const type = animConfig.type || 'fadeIn';
  const duration = parseFloat(animConfig.duration) || 1.5;
  const delay = parseFloat(animConfig.delay) || 0;
  const ease = animConfig.ease || 'power2.out';
  const direction = animConfig.direction || 'from-start'; // or top, bottom, left, right

  // Kill existing tweens on this element
  gsap.killTweensOf(el);

  // Apply origin
  const origin = getElementOrigin(el);
  setElementOrigin(el, origin.x, origin.y);

  switch (type) {
    case 'fadeIn':
      gsap.set(el, { opacity: 0 });
      return gsap.to(el, { opacity: 1, duration, delay, ease, onComplete: options.onComplete });

    case 'fadeOut':
      return gsap.to(el, { opacity: 0, duration, delay, ease, onComplete: options.onComplete });

    case 'appear':
      gsap.set(el, { opacity: 0 });
      return gsap.to(el, { opacity: 1, duration: 0.05, delay, onComplete: options.onComplete });

    case 'slideIn': {
      let dx = 0, dy = 0;
      if (direction === 'top') dy = -120;
      else if (direction === 'bottom') dy = 120;
      else if (direction === 'left') dx = -160;
      else dx = 160; // right default

      gsap.set(el, { x: dx, y: dy, opacity: 0 });
      return gsap.to(el, { x: 0, y: 0, opacity: 1, duration, delay, ease, onComplete: options.onComplete });
    }

    case 'slideOut': {
      let dx = 0, dy = 0;
      if (direction === 'top') dy = -120;
      else if (direction === 'bottom') dy = 120;
      else if (direction === 'left') dx = -160;
      else dx = 160;

      return gsap.to(el, { x: dx, y: dy, opacity: 0, duration, delay, ease, onComplete: options.onComplete });
    }

    case 'zoomIn':
      gsap.set(el, { scale: 0.7, opacity: 0 });
      return gsap.to(el, { scale: 1, opacity: 1, duration, delay, ease: 'back.out(1.5)', onComplete: options.onComplete });

    case 'zoomOut':
      return gsap.to(el, { scale: 0.4, opacity: 0, duration, delay, ease: 'back.in(1.5)', onComplete: options.onComplete });

    case 'pulse':
      return gsap.to(el, {
        scale: 1.15,
        duration: duration / 2,
        delay,
        yoyo: true,
        repeat: 1,
        ease: 'power1.inOut',
        onComplete: options.onComplete,
      });

    case 'bounce':
      gsap.set(el, { y: -140, opacity: 0 });
      return gsap.to(el, { y: 0, opacity: 1, duration, delay, ease: 'bounce.out', onComplete: options.onComplete });

    case 'colorChange': {
      const targetColor = animConfig.targetColor || '#f59e0b';
      if (el.tagName && el.tagName.toLowerCase() === 'svg') {
        const inner = el.querySelector('[data-annot]') || el;
        return gsap.to(inner, { fill: targetColor, stroke: targetColor, duration, delay, ease, onComplete: options.onComplete });
      }
      return gsap.to(el, { backgroundColor: targetColor, color: '#ffffff', duration, delay, ease, onComplete: options.onComplete });
    }

    case 'drawPath': {
      const innerPath = el.querySelector('path') || el;
      return animateDrawPath(innerPath, {
        duration,
        delay,
        ease,
        direction,
        onComplete: options.onComplete,
      });
    }

    case 'moveDraw': {
      const pathD = animConfig.pathD || PRESET_PATHS[0].d;
      return animateMoveDraw(el, pathD, {
        duration,
        delay,
        ease,
        strokeColor: animConfig.pathColor || '#3b82f6',
        strokeWidth: animConfig.pathWidth || 3,
        direction,
        onComplete: options.onComplete,
      });
    }

    case 'morph': {
      const innerPath = el.querySelector('path') || el;
      const targetD = animConfig.targetD || PRESET_PATHS[1].d;
      return morphSvgPath(innerPath, targetD, {
        duration,
        ease,
        onComplete: options.onComplete,
      });
    }

    default:
      return gsap.to(el, { opacity: 1, duration, delay, onComplete: options.onComplete });
  }
}

/**
 * Build a full GSAP timeline for all animations in the current slide
 */
export function buildSlideTimeline() {
  if (currentSlideTimeline) {
    currentSlideTimeline.kill();
  }

  const tl = gsap.timeline({
    paused: true,
    onUpdate: () => {
      activeTimelineTime = tl.time();
      document.dispatchEvent(new CustomEvent('ipb:timelineUpdate', {
        detail: {
          time: activeTimelineTime,
          duration: tl.duration(),
          progress: tl.progress(),
        },
      }));
    },
    onComplete: () => {
      isTimelinePlaying = false;
      document.dispatchEvent(new CustomEvent('ipb:timelinePlayState', {
        detail: { isPlaying: false },
      }));
    },
  });

  // Collect all elements with animation on stage
  const stage = document.getElementById('stage') || document.body;
  const elements = stage.querySelectorAll('[data-animation]');

  const animList = [];
  elements.forEach((el, index) => {
    const data = getElementAnimation(el);
    if (data) {
      animList.push({
        el,
        order: data.order ?? index,
        config: data,
      });
    }
  });

  // Sort by execution order
  animList.sort((a, b) => a.order - b.order);

  let prevEndTime = 0;
  animList.forEach((item, idx) => {
    const cfg = item.config;
    const trigger = cfg.trigger || 'onClick';
    const delay = parseFloat(cfg.delay) || 0;
    const duration = parseFloat(cfg.duration) || 1.5;

    let startTime = prevEndTime + delay;
    if (trigger === 'withPrev' && idx > 0) {
      startTime = Math.max(0, prevEndTime - duration + delay);
    } else if (trigger === 'afterPrev') {
      startTime = prevEndTime + delay;
    }

    // Attach animation to master timeline
    const subTween = runSingleAnimation(item.el, cfg);
    if (subTween) {
      tl.add(subTween, startTime);
      prevEndTime = Math.max(prevEndTime, startTime + duration);
    }
  });

  timelineDuration = Math.max(5.0, tl.duration());
  currentSlideTimeline = tl;
  return tl;
}

/**
 * Play / Resume Timeline
 */
export function playTimeline() {
  if (!currentSlideTimeline) {
    buildSlideTimeline();
  }
  if (currentSlideTimeline) {
    if (currentSlideTimeline.progress() >= 1) {
      currentSlideTimeline.restart();
    } else {
      currentSlideTimeline.play();
    }
    isTimelinePlaying = true;
    document.dispatchEvent(new CustomEvent('ipb:timelinePlayState', {
      detail: { isPlaying: true },
    }));
  }
}

/**
 * Pause Timeline
 */
export function pauseTimeline() {
  if (currentSlideTimeline) {
    currentSlideTimeline.pause();
    isTimelinePlaying = false;
    document.dispatchEvent(new CustomEvent('ipb:timelinePlayState', {
      detail: { isPlaying: false },
    }));
  }
}

/**
 * Seek to specific time (0s to total duration)
 */
export function seekTimeline(seconds) {
  if (!currentSlideTimeline) {
    buildSlideTimeline();
  }
  if (currentSlideTimeline) {
    currentSlideTimeline.seek(seconds);
    activeTimelineTime = seconds;
    document.dispatchEvent(new CustomEvent('ipb:timelineUpdate', {
      detail: {
        time: seconds,
        duration: currentSlideTimeline.duration(),
        progress: currentSlideTimeline.progress(),
      },
    }));
  }
}

/**
 * Reset all elements to initial state
 */
export function resetTimeline() {
  if (currentSlideTimeline) {
    currentSlideTimeline.pause();
    currentSlideTimeline.seek(0);
  }
  isTimelinePlaying = false;
  activeTimelineTime = 0;
  document.dispatchEvent(new CustomEvent('ipb:timelinePlayState', {
    detail: { isPlaying: false },
  }));
}

export function isPlaying() {
  return isTimelinePlaying;
}

export function getTimelineDuration() {
  return timelineDuration;
}

export function getActiveTimelineTime() {
  return activeTimelineTime;
}
