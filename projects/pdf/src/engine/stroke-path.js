/**
 * Stroke Path & Move+Draw Engine
 * Implements Draw Path (stroke-dashoffset) and synchronized Move+Draw
 * using GSAP and MotionPathPlugin
 */
import gsap from 'https://cdn.jsdelivr.net/npm/gsap@3.13.0/index.js';
import { MotionPathPlugin } from 'https://cdn.jsdelivr.net/npm/gsap@3.13.0/MotionPathPlugin.js';

gsap.registerPlugin(MotionPathPlugin);

/**
 * Creates or gets the motion paths SVG layer on the stage
 */
export function getMotionPathLayer() {
  let layer = document.getElementById('motionPathsSvgLayer');
  if (!layer) {
    const stage = document.getElementById('stage') || document.querySelector('.stage') || document.body;
    layer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    layer.id = 'motionPathsSvgLayer';
    layer.setAttribute('class', 'motion-paths-layer');
    layer.style.position = 'absolute';
    layer.style.inset = '0';
    layer.style.width = '100%';
    layer.style.height = '100%';
    layer.style.pointerEvents = 'none';
    layer.style.zIndex = '35';
    layer.style.overflow = 'visible';
    stage.appendChild(layer);
  }
  return layer;
}

/**
 * Animate drawing an SVG path using stroke-dashoffset
 */
export function animateDrawPath(pathEl, options = {}) {
  if (!pathEl) return null;
  const length = pathEl.getTotalLength ? pathEl.getTotalLength() : 1000;
  const duration = options.duration || 2.0;
  const ease = options.ease || 'power2.inOut';
  const delay = options.delay || 0;
  const reverse = options.direction === 'reverse' || options.direction === 'end';

  pathEl.style.strokeDasharray = `${length}`;
  pathEl.style.strokeDashoffset = reverse ? `-${length}` : `${length}`;

  return gsap.to(pathEl, {
    strokeDashoffset: 0,
    duration,
    delay,
    ease,
    onComplete: () => {
      if (options.onComplete) options.onComplete();
    },
  });
}

/**
 * Move+Draw: Synchronized MotionPath movement of an element with trailing line drawing
 */
export function animateMoveDraw(el, pathD, options = {}) {
  if (!el || !pathD) return null;

  const layer = getMotionPathLayer();
  const duration = options.duration || 2.5;
  const delay = options.delay || 0;
  const ease = options.ease || 'power1.inOut';
  const strokeColor = options.strokeColor || '#3b82f6';
  const strokeWidth = options.strokeWidth || 3;
  const autoRotate = options.autoRotate !== false;
  const reverse = options.direction === 'reverse' || options.direction === 'end';

  // Create the trailing path in the layer
  const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  pathEl.setAttribute('d', pathD);
  pathEl.setAttribute('fill', 'none');
  pathEl.setAttribute('stroke', strokeColor);
  pathEl.setAttribute('stroke-width', String(strokeWidth));
  pathEl.setAttribute('stroke-linecap', 'round');
  pathEl.setAttribute('stroke-linejoin', 'round');
  layer.appendChild(pathEl);

  const length = pathEl.getTotalLength();
  pathEl.style.strokeDasharray = `${length}`;
  pathEl.style.strokeDashoffset = reverse ? `-${length}` : `${length}`;

  const tl = gsap.timeline({
    delay,
    onComplete: () => {
      if (options.keepTrail === false) {
        gsap.to(pathEl, {
          opacity: 0,
          duration: 0.5,
          onComplete: () => pathEl.remove(),
        });
      }
      if (options.onComplete) options.onComplete();
    },
  });

  // Synchronize element motion along path with line drawing
  tl.to(
    pathEl,
    {
      strokeDashoffset: 0,
      duration,
      ease,
    },
    0
  );

  tl.to(
    el,
    {
      motionPath: {
        path: pathEl,
        align: pathEl,
        autoRotate,
        alignOrigin: [0.5, 0.5],
      },
      duration,
      ease,
    },
    0
  );

  return tl;
}
