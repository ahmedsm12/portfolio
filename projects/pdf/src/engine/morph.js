/**
 * SVG Shape Morphing Engine using flubber
 */
import * as flubber from 'flubber';
import gsap from 'gsap';

export function morphSvgPath(pathEl, targetPathD, options = {}) {
  if (!pathEl || !targetPathD) return null;
  const currentD = pathEl.getAttribute('d') || '';
  if (!currentD) return null;

  try {
    const interpolator = (flubber.interpolate || flubber.default?.interpolate)(currentD, targetPathD, {
      maxSegmentLength: 2,
    });

    const duration = options.duration || 2.0;
    const ease = options.ease || 'power2.inOut';

    const tweenObj = { progress: 0 };
    return gsap.to(tweenObj, {
      progress: 1,
      duration,
      ease,
      onUpdate: () => {
        const d = interpolator(tweenObj.progress);
        pathEl.setAttribute('d', d);
      },
      onComplete: () => {
        pathEl.setAttribute('d', targetPathD);
        if (options.onComplete) options.onComplete();
      },
    });
  } catch (err) {
    console.warn('Morph failed:', err);
    return null;
  }
}
