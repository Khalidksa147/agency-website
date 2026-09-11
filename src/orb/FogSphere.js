import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
import gsap from '/node_modules/gsap/index.js';
import { ScrollTrigger } from '/node_modules/gsap/ScrollTrigger.js';
import {
  MAX_STEPS,
  MAX_TURB,
  fullscreenVertex,
  fogFragment,
  blurFragment,
} from './fogSphereShaders.js';

gsap.registerPlugin(ScrollTrigger);

const DEFAULTS = {
  speed: 0.28,
  // Radians per second; 0.14 is one revolution every ~45s.
  rotationSpeed: 0.14,
  rayMarchSteps: 26,
  rayMarchStepsMobile: 16,
  turbulenceIters: 8,
  turbulenceItersMobile: 6,
  turbulenceAmplitude: 1.65,
  turbulenceFrequency: 4.5,
  turbulenceExponent: 1.9,
  sphereRadius: 3.0,
  cameraDistance: 9.0,
  fov: 0.416,
  density: 3.0,
  absorption: 3.5,
  passthrough: 0.035,
  brightness: 4.4,
  opacity: 0.78,
  colorMix: 0.45,
  blur: 1.0,
  blurResolution: 0.8,
  parallaxX: 15,
  parallaxY: 12,
  scrollLift: 50,
  scrollScale: 0.94,
  scrollOpacity: 0.62,
  scrollSpin: 0.55,
};

const PALETTE = {
  primary: 0x8faf99,
  secondary: 0x6fa9a0,
  cool: 0xa9c7ff,
  violet: 0x8c7dff,
  lime: 0xd7ff4d,
};

function rgb(hex) {
  return new THREE.Vector3(
    ((hex >> 16) & 255) / 255,
    ((hex >> 8) & 255) / 255,
    (hex & 255) / 255,
  );
}

export class FogSphere {
  constructor(canvas, options = {}) {
    const { hero, ...overrides } = options;

    this.canvas = canvas;
    this.hero = hero;
    this.config = { ...DEFAULTS, ...overrides };

    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.mobile = window.matchMedia('(max-width: 720px)').matches;

    this.clock = new THREE.Clock();
    this.phase = 0;
    this.rotation = 0;
    this.running = true;
    this.dirty = true;

    this.pointer = { x: 0, y: 0 };
    this.parallax = { x: 0, y: 0 };
    this.scroll = { lift: 0, zoom: 1, fade: 1, spin: 0 };

    this.initRenderer();
    this.initPasses();
    this.initEvents();
    this.initScroll();
    this.setSize();
    this.start();
  }

  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: false,
      powerPreference: this.mobile ? 'low-power' : 'high-performance',
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setClearAlpha(0);
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.autoClear = true;

    this.pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    this.renderer.setPixelRatio(this.pixelRatio);
  }

  initPasses() {
    const { config } = this;

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);

    this.fogUniforms = {
      uResolution: { value: new THREE.Vector2(1, 1) },
      uPhase: { value: 0 },
      uRotation: { value: 0 },
      uRadius: { value: config.sphereRadius },
      uCamDist: { value: config.cameraDistance },
      uFov: { value: config.fov },
      uOffset: { value: new THREE.Vector2(0, 0) },
      uZoom: { value: 1 },
      uOpacity: { value: config.opacity },
      uSteps: { value: this.mobile ? config.rayMarchStepsMobile : config.rayMarchSteps },
      uTurbIters: { value: this.mobile ? config.turbulenceItersMobile : config.turbulenceIters },
      uTurbAmplitude: { value: config.turbulenceAmplitude },
      uTurbFrequency: { value: config.turbulenceFrequency },
      uTurbExponent: { value: config.turbulenceExponent },
      uDensity: { value: config.density },
      uAbsorption: { value: config.absorption },
      uPassthrough: { value: config.passthrough },
      uBrightness: { value: config.brightness },
      uColorMix: { value: config.colorMix },
      uPrimary: { value: rgb(PALETTE.primary) },
      uSecondary: { value: rgb(PALETTE.secondary) },
      uCool: { value: rgb(PALETTE.cool) },
      uViolet: { value: rgb(PALETTE.violet) },
      uLime: { value: rgb(PALETTE.lime) },
    };

    this.fogUniforms.uSteps.value = Math.min(this.fogUniforms.uSteps.value, MAX_STEPS);
    this.fogUniforms.uTurbIters.value = Math.min(this.fogUniforms.uTurbIters.value, MAX_TURB);

    this.fogMaterial = new THREE.ShaderMaterial({
      uniforms: this.fogUniforms,
      vertexShader: fullscreenVertex,
      fragmentShader: fogFragment,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    this.blurUniforms = {
      uTexture: { value: null },
      uTexel: { value: new THREE.Vector2(1, 1) },
      uDirection: { value: new THREE.Vector2(1, 0) },
      uRadius: { value: config.blur },
    };

    this.blurMaterial = new THREE.ShaderMaterial({
      uniforms: this.blurUniforms,
      vertexShader: fullscreenVertex,
      fragmentShader: blurFragment,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    const targetOptions = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      depthBuffer: false,
      stencilBuffer: false,
    };

    this.fogTarget = new THREE.WebGLRenderTarget(1, 1, targetOptions);
    this.blurTarget = new THREE.WebGLRenderTarget(1, 1, targetOptions);
  }

  initEvents() {
    this.onPointerMove = (event) => {
      if (this.reducedMotion) return;
      const rect = this.canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    };
    window.addEventListener('pointermove', this.onPointerMove, { passive: true });

    this.resizeObserver = new ResizeObserver(() => this.setSize());
    this.resizeObserver.observe(this.canvas.parentElement);

    this.onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        this.stop();
      } else {
        this.start();
      }
    };
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  initScroll() {
    if (!this.hero) return;

    const { config } = this;
    this.scrollTween = gsap.to(this.scroll, {
      lift: config.scrollLift,
      zoom: 1 / config.scrollScale,
      fade: config.scrollOpacity,
      spin: config.scrollSpin,
      ease: 'none',
      onUpdate: () => {
        this.dirty = true;
      },
      scrollTrigger: {
        trigger: this.hero,
        start: 'top top',
        end: 'bottom top',
        scrub: 1.2,
      },
    });
  }

  setSize() {
    const parent = this.canvas.parentElement;
    const width = Math.max(parent.clientWidth, 1);
    const height = Math.max(parent.clientHeight, 1);

    this.width = width;
    this.height = height;
    this.renderer.setSize(width, height, false);

    const scale = this.config.blurResolution;
    const rtWidth = Math.max(Math.round(width * this.pixelRatio * scale), 1);
    const rtHeight = Math.max(Math.round(height * this.pixelRatio * scale), 1);

    this.fogTarget.setSize(rtWidth, rtHeight);
    this.blurTarget.setSize(rtWidth, rtHeight);

    this.fogUniforms.uResolution.value.set(rtWidth, rtHeight);
    this.blurUniforms.uTexel.value.set(1 / rtWidth, 1 / rtHeight);

    this.minEdge = Math.min(width, height);
    this.dirty = true;
  }

  renderFrame() {
    this.quad.material = this.fogMaterial;
    this.renderer.setRenderTarget(this.fogTarget);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);

    this.quad.material = this.blurMaterial;
    this.blurUniforms.uTexture.value = this.fogTarget.texture;
    this.blurUniforms.uDirection.value.set(1, 0);
    this.renderer.setRenderTarget(this.blurTarget);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);

    this.blurUniforms.uTexture.value = this.blurTarget.texture;
    this.blurUniforms.uDirection.value.set(0, 1);
    this.renderer.setRenderTarget(null);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
  }

  tick = () => {
    if (!this.running) return;
    this.frame = requestAnimationFrame(this.tick);

    const delta = Math.min(this.clock.getDelta(), 0.05);
    const { config } = this;

    if (!this.reducedMotion) {
      this.phase += delta * config.speed;
      this.rotation += delta * config.rotationSpeed;
      this.dirty = true;
    }

    const targetX = this.pointer.x * config.parallaxX;
    const targetY = this.pointer.y * config.parallaxY;
    this.parallax.x += (targetX - this.parallax.x) * 0.035;
    this.parallax.y += (targetY - this.parallax.y) * 0.035;

    if (!this.dirty) return;
    this.dirty = false;

    const edge = this.minEdge || 1;
    const offsetX = -this.parallax.x / edge;
    const offsetY = (this.parallax.y + this.scroll.lift) / edge;

    this.fogUniforms.uPhase.value = this.phase;
    this.fogUniforms.uRotation.value = this.rotation + this.scroll.spin;
    this.fogUniforms.uOffset.value.set(offsetX, offsetY);
    this.fogUniforms.uZoom.value = this.scroll.zoom;
    this.fogUniforms.uOpacity.value = config.opacity * this.scroll.fade;

    this.renderFrame();
  };

  start() {
    if (this.running && this.frame) return;
    this.running = true;
    this.clock.getDelta();
    this.dirty = true;
    this.frame = requestAnimationFrame(this.tick);
  }

  stop() {
    this.running = false;
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = null;
  }

  setOption(key, value) {
    this.config[key] = value;
    const uniformKey = {
      sphereRadius: 'uRadius',
      cameraDistance: 'uCamDist',
      fov: 'uFov',
      density: 'uDensity',
      absorption: 'uAbsorption',
      passthrough: 'uPassthrough',
      brightness: 'uBrightness',
      colorMix: 'uColorMix',
      turbulenceAmplitude: 'uTurbAmplitude',
      turbulenceFrequency: 'uTurbFrequency',
      turbulenceExponent: 'uTurbExponent',
    }[key];

    if (uniformKey) this.fogUniforms[uniformKey].value = value;
    if (key === 'blur') this.blurUniforms.uRadius.value = value;
    if (key === 'rayMarchSteps') this.fogUniforms.uSteps.value = Math.min(value, MAX_STEPS);
    if (key === 'turbulenceIters') this.fogUniforms.uTurbIters.value = Math.min(value, MAX_TURB);
    if (key === 'blurResolution') this.setSize();

    this.dirty = true;
  }

  dispose() {
    this.stop();
    window.removeEventListener('pointermove', this.onPointerMove);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.resizeObserver?.disconnect();
    this.scrollTween?.scrollTrigger?.kill();
    this.scrollTween?.kill();
    this.quad.geometry.dispose();
    this.fogMaterial.dispose();
    this.blurMaterial.dispose();
    this.fogTarget.dispose();
    this.blurTarget.dispose();
    this.renderer.dispose();
  }
}
