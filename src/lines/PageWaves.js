/**
 * Floating line background — lightweight SVG waves (no WebGL).
 */

export function initPageWaves(root = document.querySelector('.page-lines')) {
  if (!root) return null;
  if (root.dataset.wavesReady === '2') return { destroy() {} };
  root.dataset.wavesReady = '2';
  root.innerHTML = `
    <svg class="page-waves" viewBox="0 0 1440 900" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="wave-stroke-a" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="rgba(100,240,221,0)"/>
          <stop offset="25%" stop-color="rgba(100,240,221,0.65)"/>
          <stop offset="50%" stop-color="rgba(215,255,77,0.45)"/>
          <stop offset="75%" stop-color="rgba(100,240,221,0.55)"/>
          <stop offset="100%" stop-color="rgba(100,240,221,0)"/>
        </linearGradient>
        <linearGradient id="wave-stroke-b" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="rgba(152,119,255,0)"/>
          <stop offset="30%" stop-color="rgba(100,240,221,0.5)"/>
          <stop offset="60%" stop-color="rgba(152,119,255,0.4)"/>
          <stop offset="100%" stop-color="rgba(100,240,221,0)"/>
        </linearGradient>
      </defs>
      <g class="page-waves__shade" aria-hidden="true">
        <ellipse class="page-waves__blob page-waves__blob--a" cx="1080" cy="360" rx="320" ry="220"/>
        <ellipse class="page-waves__blob page-waves__blob--b" cx="380" cy="540" rx="280" ry="200"/>
      </g>
      <g class="page-waves__layer page-waves__layer--a" stroke="url(#wave-stroke-a)">
        <path d="M-480 240 C -200 120, 80 360, 360 240 S 840 120, 1120 240 S 1680 360, 1960 240"/>
        <path d="M-480 320 C -200 200, 80 440, 360 320 S 840 200, 1120 320 S 1680 440, 1960 320"/>
        <path d="M-480 400 C -200 280, 80 520, 360 400 S 840 280, 1120 400 S 1680 520, 1960 400"/>
        <path d="M-480 480 C -200 360, 80 600, 360 480 S 840 360, 1120 480 S 1680 600, 1960 480"/>
        <path d="M-480 560 C -200 440, 80 680, 360 560 S 840 440, 1120 560 S 1680 680, 1960 560"/>
      </g>
      <g class="page-waves__layer page-waves__layer--b" stroke="url(#wave-stroke-b)">
        <path d="M-480 280 C -120 180, 200 400, 520 280 S 1000 180, 1320 280 S 1880 400, 2200 280"/>
        <path d="M-480 360 C -120 260, 200 480, 520 360 S 1000 260, 1320 360 S 1880 480, 2200 360"/>
        <path d="M-480 440 C -120 340, 200 560, 520 440 S 1000 340, 1320 440 S 1880 560, 2200 440"/>
        <path d="M-480 520 C -120 420, 200 640, 520 520 S 1000 420, 1320 520 S 1880 640, 2200 520"/>
      </g>
    </svg>`;
  return {
    destroy() {
      root.replaceChildren();
      delete root.dataset.wavesReady;
    },
  };
}
