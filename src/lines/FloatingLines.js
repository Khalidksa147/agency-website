import * as THREE from 'three';
import { MQ } from '../breakpoints.js';

const vertexShader = `
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const fragmentShader = `
precision highp float;

uniform float iTime;
uniform vec3 iResolution;
uniform float animationSpeed;
uniform float intensity;
uniform int topLineCount;
uniform float topLineDistance;
uniform vec3 topWavePosition;
uniform int bottomLineCount;
uniform float bottomLineDistance;
uniform vec3 bottomWavePosition;
uniform vec3 lineGradient[8];
uniform int lineGradientCount;

mat2 rotate(float r) {
  return mat2(cos(r), sin(r), -sin(r), cos(r));
}

vec3 getLineColor(float t) {
  if (lineGradientCount <= 1) {
    return lineGradient[0];
  }
  float clampedT = clamp(t, 0.0, 0.9999);
  float scaled = clampedT * float(lineGradientCount - 1);
  int idx = int(floor(scaled));
  float f = fract(scaled);
  int idx2 = min(idx + 1, lineGradientCount - 1);
  return mix(lineGradient[idx], lineGradient[idx2], f);
}

float wave(vec2 uv, float offset) {
  float time = iTime * animationSpeed;
  float amp = sin(offset + time * 0.2) * 0.3;
  float y = sin(uv.x + offset + time * 0.1) * amp;
  float m = uv.y - y;
  return 0.016 / max(abs(m) + 0.012, 1e-3) + 0.008;
}

void main() {
  vec2 uv = (2.0 * gl_FragCoord.xy - iResolution.xy) / iResolution.y;
  uv.y *= -1.0;

  vec3 col = vec3(0.0);

  for (int i = 0; i < 6; ++i) {
    float fi = float(i);
    float t = fi / 5.0;
    vec3 lineCol = getLineColor(t) * 0.55;
    float angle = topWavePosition.z * log(length(uv) + 1.0);
    vec2 ruv = uv * rotate(angle);
    ruv.x *= -1.0;
    col += lineCol * wave(
      ruv + vec2(topLineDistance * fi + topWavePosition.x, topWavePosition.y),
      1.0 + 0.2 * fi
    ) * 0.2;
  }

  for (int i = 0; i < 6; ++i) {
    float fi = float(i);
    float t = fi / 5.0;
    vec3 lineCol = getLineColor(t) * 0.55;
    float angle = bottomWavePosition.z * log(length(uv) + 1.0);
    vec2 ruv = uv * rotate(angle);
    col += lineCol * wave(
      ruv + vec2(bottomLineDistance * fi + bottomWavePosition.x, bottomWavePosition.y),
      1.5 + 0.2 * fi
    ) * 0.2;
  }

  col *= intensity;
  gl_FragColor = vec4(col, 1.0);
}
`;

function hexToVec3(hex) {
  let value = String(hex).trim();
  if (value.startsWith('#')) value = value.slice(1);
  if (value.length === 3) {
    value = value[0] + value[0] + value[1] + value[1] + value[2] + value[2];
  }
  const n = parseInt(value, 16);
  return new THREE.Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

function themeColors() {
  const css = getComputedStyle(document.documentElement);
  const read = (name, fallback) => css.getPropertyValue(name).trim() || fallback;
  return [read('--lime', '#d7ff4d'), read('--cyan', '#64f0dd'), read('--violet', '#9877ff')];
}

export class FloatingLines {
  constructor(el, options = {}) {
    this.el = el;
    this.raf = 0;
    this.running = false;
    this.inView = true;
    this.ready = new Promise((resolve) => {
      this._resolveReady = resolve;
    });

    const colors = (options.colors || themeColors()).slice(0, 8);
    const gradient = Array.from({ length: 8 }, () => new THREE.Vector3(1, 1, 1));
    colors.forEach((hex, i) => gradient[i].copy(hexToVec3(hex)));

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
      powerPreference: 'low-power',
    });
    this.renderer.setPixelRatio(1);
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    el.appendChild(this.renderer.domElement);

    this.uniforms = {
      iTime: { value: 0 },
      iResolution: { value: new THREE.Vector3(1, 1, 1) },
      animationSpeed: { value: options.speed ?? 0.48 },
      intensity: { value: options.intensity ?? 1.25 },
      topLineCount: { value: options.lineCount ?? 6 },
      topLineDistance: { value: (options.lineDistance ?? 9) * 0.01 },
      topWavePosition: {
        value: new THREE.Vector3(
          options.position?.x ?? 10,
          options.position?.y ?? 0.62,
          options.position?.rotate ?? -0.4
        ),
      },
      bottomLineCount: { value: options.bottomLineCount ?? options.lineCount ?? 6 },
      bottomLineDistance: {
        value: (options.bottomLineDistance ?? options.lineDistance ?? 9) * 0.01,
      },
      bottomWavePosition: {
        value: new THREE.Vector3(
          options.bottomPosition?.x ?? 2,
          options.bottomPosition?.y ?? -0.7,
          options.bottomPosition?.rotate ?? 0.4
        ),
      },
      lineGradient: { value: gradient },
      lineGradientCount: { value: colors.length },
    };

    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader,
      fragmentShader,
      depthTest: false,
      depthWrite: false,
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.scene.add(this.mesh);

    this.clock = new THREE.Clock();
    this.resize = this.resize.bind(this);
    this.tick = this.tick.bind(this);
    this.onVisibility = this.onVisibility.bind(this);

    this.mqTablet = window.matchMedia(MQ.tablet);
    this.mqMobile = window.matchMedia(MQ.mobile);
    // Phone-sized layouts only — used to ignore browser-chrome height toggles.
    this.mqPhoneViewport = window.matchMedia('(max-width: 767px)');
    this._sizeW = 0;
    this._sizeH = 0;
    this.onBreakpoint = this.resize.bind(this);
    this.mqTablet.addEventListener('change', this.onBreakpoint);
    this.mqMobile.addEventListener('change', this.onBreakpoint);
    this.ro = new ResizeObserver(this.resize);
    this.ro.observe(el);
    this.resize();

    document.addEventListener('visibilitychange', this.onVisibility);
    this.viewObserver = new IntersectionObserver(
      (entries) => {
        this.inView = entries.some((entry) => entry.isIntersecting);
        if (document.visibilityState === 'hidden') return;
        if (this.inView) this.start();
        else this.stop();
      },
      { rootMargin: '10% 0px', threshold: 0.01 },
    );
    this.viewObserver.observe(el);
  }

  waveY() {
    if (this.mqMobile.matches) return 0.3;
    if (this.mqTablet.matches) return 0.34;
    return 0.62;
  }

  bottomWaveY() {
    if (this.mqMobile.matches) return -0.3;
    if (this.mqTablet.matches) return -0.34;
    return -0.7;
  }

  /**
   * Real-phone URL bar show/hide changes visual viewport height (and sometimes
   * jitters width by a few px). That remeshes iResolution.y and snaps the waves.
   * Lock composition size until a real width/orientation change.
   */
  isMobileChromeViewport() {
    return this.mqPhoneViewport.matches;
  }

  shouldIgnoreMobileChromeResize(width, height) {
    if (!this.isMobileChromeViewport()) return false;
    if (!this._sizeW || !this._sizeH) return false;
    // Orientation / genuine layout change — allow resize.
    if (Math.abs(width - this._sizeW) > 24) return false;
    // Same layout width: ignore height (and tiny width) chrome toggles.
    return (
      Math.abs(height - this._sizeH) > 0 || Math.abs(width - this._sizeW) > 0
    );
  }

  resize() {
    const width = Math.max(1, Math.round(this.el.clientWidth || 1));
    const height = Math.max(1, Math.round(this.el.clientHeight || 1));

    if (this.shouldIgnoreMobileChromeResize(width, height)) {
      return;
    }

    this._sizeW = width;
    this._sizeH = height;
    this.renderer.setSize(width, height, false);
    this.uniforms.iResolution.value.set(
      this.renderer.domElement.width,
      this.renderer.domElement.height,
      1
    );
    this.uniforms.topWavePosition.value.y = this.waveY();
    this.uniforms.bottomWavePosition.value.y = this.bottomWaveY();
  }

  whenReady() {
    return this.ready;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.clock.start();
    this.tick();
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  onVisibility() {
    if (document.visibilityState === 'hidden') this.stop();
    else if (this.inView) this.start();
  }

  tick() {
    if (!this.running) return;
    this.uniforms.iTime.value = this.clock.getElapsedTime();
    this.renderer.render(this.scene, this.camera);
    if (this._resolveReady) {
      const done = this._resolveReady;
      this._resolveReady = null;
      done();
    }
    this.raf = requestAnimationFrame(this.tick);
  }

  dispose() {
    this.stop();
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.viewObserver?.disconnect();
    this.mqTablet.removeEventListener('change', this.onBreakpoint);
    this.mqMobile.removeEventListener('change', this.onBreakpoint);
    this.ro.disconnect();
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
