const coarse =
  typeof window !== 'undefined' &&
  window.matchMedia('(pointer: coarse)').matches;

const isMobile =
  typeof window !== 'undefined' &&
  (window.matchMedia('(max-width: 650px)').matches || coarse);

const reducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const cores =
  typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 8 : 8;
const saveData =
  typeof navigator !== 'undefined' && Boolean(navigator.connection?.saveData);

// Don't treat Windows "reduce motion" as low-power — it was freezing hero lines & service SVGs.
const lowPower = (isMobile && coarse) || saveData || cores <= 2;

if (typeof document !== 'undefined') {
  document.documentElement.classList.toggle('is-mobile', isMobile);
  document.documentElement.classList.toggle('is-low-power', lowPower);
  document.documentElement.classList.toggle('is-reduced-motion', reducedMotion);
}

export { isMobile, reducedMotion, lowPower };
