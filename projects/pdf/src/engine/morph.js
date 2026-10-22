/**
 * SVG Shape Morphing Engine using flubber
 *
 * ★ Preloads flubber dynamically so failures don't break other animations.
 * ★ If flubber is unavailable, morphSvgPath returns null gracefully.
 * ★ Morph only works on SVG <path> elements (not rect, circle, etc.).
 */
import gsap from 'https://cdn.jsdelivr.net/npm/gsap@3.13.0/index.js';

let _flubber = null;
let _flubberTried = false;

// Preload in background (fire-and-forget)
(function preloadFlubber() {
  if (_flubberTried) return;
  _flubberTried = true;

  import('https://cdn.jsdelivr.net/npm/flubber@0.4.2/+esm')
    .then(mod => {
      const f = mod && (mod.default || mod);
      if (f && typeof f.interpolate === 'function') {
        _flubber = f;
        console.log('[morph] flubber loaded');
      } else {
        console.warn('[morph] flubber: unexpected module shape', f);
      }
    })
    .catch(err => {
      console.warn('[morph] flubber load failed — morph animation unavailable:', err && err.message);
    });
})();

export function morphSvgPath(pathEl, targetPathD, options = {}) {
  if (!pathEl || !targetPathD) return null;

  const currentD = pathEl.getAttribute('d') || '';
  if (!currentD) {
    console.warn('[morph] element has no "d" attribute — not an SVG path');
    if (options.onComplete) options.onComplete();
    return null;
  }

  if (!_flubber) {
    console.warn('[morph] flubber not loaded — skipping morph animation');
    if (options.onComplete) options.onComplete();
    return null;
  }

  try {
    const interpolator = _flubber.interpolate(currentD, targetPathD, { maxSegmentLength: 2 });
    const duration = options.duration || 2.0;
    const ease = options.ease || 'power2.inOut';
    const tweenObj = { progress: 0 };

    return gsap.to(tweenObj, {
      progress: 1,
      duration,
      ease,
      onUpdate: () => {
        try { pathEl.setAttribute('d', interpolator(tweenObj.progress)); } catch (_) {}
      },
      onComplete: () => {
        try { pathEl.setAttribute('d', targetPathD); } catch (_) {}
        if (options.onComplete) options.onComplete();
      },
    });
  } catch (err) {
    console.warn('[morph] interpolation failed:', err);
    if (options.onComplete) options.onComplete();
    return null;
  }
}
