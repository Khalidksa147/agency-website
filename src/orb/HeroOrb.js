import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
import { EffectComposer } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/ShaderPass.js';
import gsap from '/node_modules/gsap/index.js';
import { ScrollTrigger } from '/node_modules/gsap/ScrollTrigger.js';
import {
  shellVertex,
  shellFragment,
  coreVertex,
  coreFragment,
  filamentVertex,
  filamentFragment,
  pearlVertex,
  pearlFragment,
  sparkVertex,
  sparkFragment,
  fullscreenVertex,
  gradeFragment,
  alphaRestoreFragment,
} from './shaders.js';

gsap.registerPlugin(ScrollTrigger);

// Raw display-space colours. Colour management is disabled below so what the
// shaders write is what the screen shows, with no sRGB round trip.
const LIME = [0.843, 1.0, 0.302];
const MINT = [0.392, 0.941, 0.867];
const BLUE = [0.467, 0.812, 1.0];
const VIOLET = [0.596, 0.467, 1.0];
const DARK_GREEN = [0.063, 0.165, 0.133];
const DEEP_TEAL = [0.027, 0.243, 0.22];
const CORE_DARK = [0.024, 0.098, 0.086];

const v3 = (c) => new THREE.Vector3(c[0], c[1], c[2]);

// Outer silhouette sits at radius 1; every other layer is expressed as a
// fraction of it so the sculpture stays proportional at any canvas size.
const SHELLS = [
  {
    radius: 1.0,
    amp: 0.035,
    freq: 0.75,
    offset: [0.0, 0.0, 0.0],
    edge: [9.0, 0.75],
    squash: [1.0, 0.94, 1.02],
    tint: DEEP_TEAL,
    hue: 0.02,
    spread: -0.22,
    fresnel: 2.3,
    band: 3.0,
    intensity: 0.58,
    bias: [DEEP_TEAL, 0.25],
    key: [-0.3, 0.5, 0.8],
    flow: 0.22,
    spin: [0.006, 0.013, -0.004],
    pulse: [0.17, 0.0],
  },
  {
    radius: 0.95,
    amp: 0.07,
    freq: 0.95,
    offset: [-0.24, 0.15, 0.09],
    edge: [11.0, 1.15],
    squash: [0.96, 1.06, 0.93],
    tint: DARK_GREEN,
    hue: 0.03,
    spread: -0.12,
    fresnel: 2.0,
    band: 4.5,
    intensity: 1.1,
    // Violet iridescence catching the upper-left shell edges.
    bias: [VIOLET, 0.5],
    key: [-0.82, 0.52, 0.24],
    flow: 0.3,
    spin: [-0.009, 0.017, 0.006],
    pulse: [0.21, 1.7],
  },
  {
    radius: 0.87,
    amp: 0.085,
    freq: 1.1,
    offset: [0.19, -0.23, -0.08],
    edge: [12.0, 0.85],
    squash: [1.05, 0.9, 1.0],
    tint: DEEP_TEAL,
    hue: 0.22,
    spread: 0.18,
    fresnel: 1.9,
    band: 5.0,
    intensity: 0.85,
    bias: [BLUE, 0.32],
    key: [0.18, -0.72, 0.66],
    flow: 0.36,
    spin: [0.011, -0.021, -0.008],
    pulse: [0.25, 3.1],
  },
  {
    radius: 0.8,
    amp: 0.095,
    freq: 1.25,
    offset: [0.26, 0.12, 0.15],
    edge: [13.0, 0.95],
    squash: [0.92, 1.04, 1.06],
    tint: DEEP_TEAL,
    hue: 0.44,
    spread: -0.18,
    fresnel: 1.8,
    band: 6.0,
    intensity: 0.95,
    bias: [MINT, 0.36],
    key: [0.76, 0.28, 0.55],
    flow: 0.42,
    spin: [-0.014, 0.024, 0.009],
    pulse: [0.29, 4.4],
  },
  {
    // The bright lime crescent. It sits just outside the core so its narrow
    // edge wraps the core's boundary, and its broad body is kept low: the
    // highlight has to read as a sharp arc, not a lime blob.
    radius: 0.58,
    amp: 0.10,
    freq: 1.35,
    offset: [0.15, 0.21, -0.12],
    edge: [16.0, 4.2],
    squash: [1.04, 0.95, 0.92],
    tint: DARK_GREEN,
    hue: 0.62,
    spread: 0.3,
    fresnel: 1.6,
    band: 4.0,
    intensity: 1.2,
    bias: [LIME, 0.55],
    key: [0.64, 0.62, 0.45],
    flow: 0.48,
    spin: [0.016, -0.028, 0.011],
    pulse: [0.33, 5.6],
  },
  {
    radius: 0.70,
    amp: 0.09,
    freq: 1.55,
    offset: [-0.17, -0.14, 0.18],
    edge: [14.0, 0.8],
    squash: [0.95, 1.03, 1.04],
    tint: DEEP_TEAL,
    hue: 0.36,
    spread: -0.25,
    fresnel: 2.1,
    band: 7.0,
    intensity: 0.64,
    bias: [MINT, 0.25],
    key: [-0.5, -0.62, 0.6],
    flow: 0.55,
    spin: [-0.019, 0.031, -0.013],
    pulse: [0.37, 2.3],
  },
  {
    // Second lime crescent, keyed low-left. The reference carries the
    // yellow-green highlight on two opposing faces of the core, which is what
    // stops the lime from looking like a single pasted-on arc.
    radius: 0.64,
    amp: 0.08,
    freq: 1.15,
    offset: [-0.21, -0.18, 0.08],
    edge: [18.0, 3.1],
    squash: [0.98, 1.02, 0.96],
    tint: DARK_GREEN,
    hue: 0.66,
    spread: 0.24,
    fresnel: 1.7,
    band: 5.0,
    intensity: 0.8,
    bias: [LIME, 0.48],
    key: [-0.62, -0.55, 0.56],
    flow: 0.4,
    spin: [0.013, 0.022, -0.01],
    pulse: [0.27, 0.8],
  },
];

const FILAMENTS = [
  { radius: 1.02, wobble: 0.3, lift: 0.62, seed: 0.4, tilt: [0.5, 0.2, -0.3], a: LIME, b: MINT, intensity: 0.85, speed: 0.035, tail: 0.4, floor: 0.1 },
  { radius: 0.9, wobble: 0.36, lift: 0.52, seed: 2.1, tilt: [-0.7, 1.1, 0.4], a: MINT, b: BLUE, intensity: 0.72, speed: -0.028, tail: 0.34, floor: 0.09 },
  { radius: 1.1, wobble: 0.24, lift: 0.7, seed: 3.7, tilt: [1.2, -0.5, 0.8], a: LIME, b: MINT, intensity: 0.78, speed: 0.022, tail: 0.46, floor: 0.08 },
  { radius: 0.78, wobble: 0.42, lift: 0.44, seed: 5.2, tilt: [0.2, 0.9, 1.3], a: BLUE, b: VIOLET, intensity: 0.62, speed: -0.034, tail: 0.3, floor: 0.08 },
  { radius: 0.96, wobble: 0.33, lift: 0.58, seed: 6.6, tilt: [-0.4, -1.0, -0.6], a: MINT, b: LIME, intensity: 0.7, speed: 0.03, tail: 0.38, floor: 0.09 },
];

const ORBITS = [
  { rx: 1.66, rz: 1.2, tilt: [0.2, 0.1, -0.36], tint: LIME, intensity: 1.55, speed: 0.012, dash: 0, pearls: 2 },
  { rx: 1.48, rz: 1.52, tilt: [-1.18, 0.55, 0.2], tint: MINT, intensity: 1.15, speed: -0.009, dash: 0, pearls: 1 },
  { rx: 1.58, rz: 1.02, tilt: [0.78, -0.86, 0.55], tint: LIME, intensity: 1.3, speed: 0.015, dash: 0, pearls: 1 },
  { rx: 1.36, rz: 1.4, tilt: [-0.35, 1.25, -0.72], tint: BLUE, intensity: 0.95, speed: -0.011, dash: 118, pearls: 1 },
  { rx: 1.7, rz: 0.9, tilt: [1.34, 0.3, 0.15], tint: VIOLET, intensity: 0.8, speed: 0.008, dash: 0, pearls: 1 },
  { rx: 1.28, rz: 1.3, tilt: [0.45, -0.3, 1.1], tint: MINT, intensity: 0.9, speed: -0.014, dash: 136, pearls: 1 },
  { rx: 1.62, rz: 1.44, tilt: [-0.62, -1.05, -0.25], tint: LIME, intensity: 0.85, speed: 0.01, dash: 0, pearls: 1 },
];

function organicCurve({ radius, wobble, lift, seed }) {
  const pts = [];
  const n = 16;
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2;
    const r = radius * (1 + Math.sin(a * 1.7 + seed) * wobble + Math.cos(a * 2.6 - seed * 1.4) * wobble * 0.4);
    pts.push(new THREE.Vector3(
      Math.cos(a) * r,
      Math.sin(a * 0.8 + seed * 1.3) * radius * lift * 0.55,
      Math.sin(a) * r * (0.82 + Math.cos(a * 1.3 + seed) * 0.16),
    ));
  }
  return new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.5);
}

function ellipseCurve(rx, rz) {
  const pts = [];
  const n = 48;
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * rx, 0, Math.sin(a) * rz));
  }
  return new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.5);
}

function atmosphereTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(128, 128, 4, 128, 128, 128);
  g.addColorStop(0.0, 'rgba(120, 210, 175, 0.30)');
  g.addColorStop(0.22, 'rgba(70, 160, 140, 0.16)');
  g.addColorStop(0.48, 'rgba(40, 90, 90, 0.06)');
  g.addColorStop(0.74, 'rgba(20, 40, 45, 0.018)');
  g.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(canvas);
}

// Four-point flare, drawn once into a texture. The reference has a handful of
// these where an orbit crosses a bright highlight.
function flareTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const c = size / 2;

  const core = ctx.createRadialGradient(c, c, 0, c, c, size * 0.1);
  core.addColorStop(0, 'rgba(255, 255, 235, 1)');
  core.addColorStop(1, 'rgba(255, 255, 200, 0)');
  ctx.fillStyle = core;
  ctx.fillRect(0, 0, size, size);

  ctx.translate(c, c);
  for (let i = 0; i < 4; i += 1) {
    const spike = ctx.createLinearGradient(0, 0, c, 0);
    spike.addColorStop(0, 'rgba(255, 255, 220, 0.9)');
    spike.addColorStop(0.35, 'rgba(230, 255, 150, 0.16)');
    spike.addColorStop(1, 'rgba(215, 255, 77, 0)');
    ctx.fillStyle = spike;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(c, -size * 0.022);
    ctx.lineTo(c, size * 0.022);
    ctx.closePath();
    ctx.fill();
    ctx.rotate(Math.PI / 2);
  }
  return new THREE.CanvasTexture(canvas);
}

const FLARES = [
  { at: [-1.02, 0.02, 0.35], scale: 0.34 },
  { at: [0.62, 0.66, 0.2], scale: 0.26 },
  { at: [0.28, -0.92, 0.3], scale: 0.22 },
  { at: [1.04, -0.34, -0.2], scale: 0.2 },
];

export class HeroOrb {
  constructor(canvas, { hero } = {}) {
    THREE.ColorManagement.enabled = false;

    this.canvas = canvas;
    this.hero = hero;

    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.mobile = window.matchMedia('(max-width: 720px)').matches;
    this.lowPower = this.mobile
      || (navigator.hardwareConcurrency || 8) <= 4
      || Boolean(navigator.connection?.saveData);

    this.clock = new THREE.Clock();
    this.time = 0;
    this.running = true;

    this.pointer = new THREE.Vector2(0, 0);
    this.damped = new THREE.Vector2(0, 0);
    this.scroll = { lift: 0, spin: 0, scale: 1, speed: 1 };

    this.shells = [];
    this.filaments = [];
    this.orbits = [];
    this.pearls = [];
    this.disposables = [];

    this.initRenderer();
    this.initScene();
    this.initShells();
    this.initCore();
    this.initFilaments();
    this.initOrbits();
    this.initFlares();
    this.initPost();
    this.initEvents();
    this.initScroll();
    this.setSize();
    this.start();
  }

  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: !this.lowPower,
      powerPreference: this.lowPower ? 'low-power' : 'high-performance',
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

    this.pixelRatio = Math.min(window.devicePixelRatio || 1, this.lowPower ? 1.25 : 1.6);
    this.renderer.setPixelRatio(this.pixelRatio);
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 40);

    // Nested groups keep the responsibilities separate: root carries scroll
    // and breathing, tilt carries the pointer, spin carries the slow drift.
    this.root = new THREE.Group();
    this.tilt = new THREE.Group();
    this.spin = new THREE.Group();
    this.root.add(this.tilt);
    this.tilt.add(this.spin);
    this.scene.add(this.root);

    const tex = atmosphereTexture();
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.85,
    }));
    glow.scale.set(3.4, 3.4, 1);
    glow.renderOrder = -1;
    this.root.add(glow);
    this.glow = glow;
    this.disposables.push(tex, glow.material);
  }

  shellGeometry() {
    if (!this._shellGeo) {
      this._shellGeo = new THREE.IcosahedronGeometry(1, this.lowPower ? 4 : 5);
      this.disposables.push(this._shellGeo);
    }
    return this._shellGeo;
  }

  initShells() {
    SHELLS.forEach((cfg, i) => {
      const uniforms = {
        uTime: { value: 0 },
        uAmp: { value: cfg.amp },
        uFreq: { value: cfg.freq },
        uSeed: { value: i * 3.77 + 0.4 },
        uFlow: { value: cfg.flow },
        uSquash: { value: new THREE.Vector3(...cfg.squash) },
        uPointer: { value: new THREE.Vector2(0, 0) },
        uTintDeep: { value: v3(cfg.tint) },
        uIntensity: { value: cfg.intensity },
        uFresnelPower: { value: cfg.fresnel },
        uBandFreq: { value: cfg.band },
        uHueShift: { value: cfg.hue },
        uHueSpread: { value: cfg.spread },
        uBiasColor: { value: v3(cfg.bias[0]) },
        uBias: { value: cfg.bias[1] },
        uKeyDir: { value: new THREE.Vector3(...cfg.key).normalize() },
        uEdgePower: { value: cfg.edge[0] },
        uEdgeGain: { value: cfg.edge[1] * 1.6 },
        uPulse: { value: 1 },
      };

      const mesh = new THREE.Mesh(this.shellGeometry(), new THREE.ShaderMaterial({
        uniforms,
        vertexShader: shellVertex,
        fragmentShader: shellFragment,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: true,
        side: THREE.DoubleSide,
      }));
      mesh.scale.setScalar(cfg.radius);
      // Off-centre so the shell silhouettes cross each other instead of
      // nesting as concentric rings.
      mesh.position.set(...cfg.offset).multiplyScalar(cfg.radius);
      mesh.renderOrder = 2 + i;

      const group = new THREE.Group();
      group.rotation.set(i * 0.5, i * 0.9, i * 0.35);
      group.add(mesh);
      this.spin.add(group);

      this.shells.push({
        group,
        mesh,
        uniforms,
        spin: cfg.spin,
        pulseRate: cfg.pulse[0],
        pulsePhase: cfg.pulse[1],
      });
      this.disposables.push(mesh.material);
    });
  }

  initCore() {
    this.coreUniforms = {
      uTime: { value: 0 },
      uAmp: { value: 0.07 },
      uFreq: { value: 1.9 },
      uSeed: { value: 11.3 },
      uFlow: { value: 0.26 },
      uSquash: { value: new THREE.Vector3(1.0, 0.97, 1.0) },
      uPointer: { value: new THREE.Vector2(0, 0) },
      uCoreDark: { value: v3(CORE_DARK) },
      uPulse: { value: 1 },
    };

    const geo = new THREE.IcosahedronGeometry(1, this.lowPower ? 4 : 5);
    const core = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      uniforms: this.coreUniforms,
      vertexShader: coreVertex,
      fragmentShader: coreFragment,
      transparent: true,
      depthWrite: true,
      depthTest: true,
    }));
    // Just under half the outer diameter, and the only layer writing depth so
    // shells behind it are occluded and shells in front still add on top.
    core.scale.setScalar(0.5);
    core.renderOrder = 0;

    this.coreGroup = new THREE.Group();
    this.coreGroup.add(core);
    this.spin.add(this.coreGroup);
    this.core = core;
    this.disposables.push(geo, core.material);
  }

  initFilaments() {
    FILAMENTS.forEach((cfg, i) => {
      const curve = organicCurve(cfg);
      const geo = new THREE.TubeGeometry(curve, this.lowPower ? 120 : 220, 0.0034, 5, true);
      const uniforms = {
        uTime: { value: 0 },
        uColorA: { value: v3(cfg.a) },
        uColorB: { value: v3(cfg.b) },
        uIntensity: { value: cfg.intensity },
        uFlowSpeed: { value: cfg.speed },
        uTail: { value: cfg.tail },
        uFloor: { value: cfg.floor },
        uPulse: { value: 1 },
        uDashCount: { value: 0 },
      };

      const mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({
        uniforms,
        vertexShader: filamentVertex,
        fragmentShader: filamentFragment,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: true,
        side: THREE.DoubleSide,
      }));
      mesh.renderOrder = 20 + i;

      const group = new THREE.Group();
      group.rotation.set(...cfg.tilt);
      group.add(mesh);
      this.spin.add(group);

      this.filaments.push({ group, uniforms, drift: 0.008 + i * 0.003 });
      this.disposables.push(geo, mesh.material);
    });
  }

  initOrbits() {
    const pearlGeo = new THREE.SphereGeometry(1, 20, 16);
    this.disposables.push(pearlGeo);

    const sparkPositions = [];
    const sparkSizes = [];
    const sparkPhases = [];
    const sparkTints = [];

    ORBITS.forEach((cfg, i) => {
      const curve = ellipseCurve(cfg.rx, cfg.rz);
      const geo = new THREE.TubeGeometry(curve, this.lowPower ? 140 : 260, 0.0016, 4, true);
      const uniforms = {
        uTime: { value: 0 },
        uColorA: { value: v3(cfg.tint) },
        uColorB: { value: v3(cfg.tint) },
        uIntensity: { value: cfg.intensity },
        uFlowSpeed: { value: cfg.speed * 1.6 },
        uTail: { value: 0.5 },
        uFloor: { value: 0.42 },
        uPulse: { value: 1 },
        uDashCount: { value: cfg.dash },
      };

      const mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({
        uniforms,
        vertexShader: filamentVertex,
        fragmentShader: filamentFragment,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: true,
        side: THREE.DoubleSide,
      }));
      mesh.renderOrder = 30 + i;

      const group = new THREE.Group();
      group.rotation.set(...cfg.tilt);
      group.add(mesh);
      this.spin.add(group);
      this.orbits.push({ group, uniforms, speed: cfg.speed });
      this.disposables.push(geo, mesh.material);

      for (let p = 0; p < cfg.pearls; p += 1) {
        const tint = p % 2 === 0 ? cfg.tint : MINT;
        const pearl = new THREE.Mesh(pearlGeo, new THREE.ShaderMaterial({
          uniforms: {
            uColor: { value: v3(tint) },
            uIntensity: { value: 1.35 },
          },
          vertexShader: pearlVertex,
          fragmentShader: pearlFragment,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          depthTest: true,
        }));
        pearl.scale.setScalar(0.022 + (i % 3) * 0.008);
        pearl.renderOrder = 40;
        group.add(pearl);
        this.pearls.push({
          mesh: pearl,
          rx: cfg.rx,
          rz: cfg.rz,
          t: (p / cfg.pearls) + i * 0.17,
          speed: 0.018 + i * 0.004,
        });
        this.disposables.push(pearl.material);
      }

      // Tiny sparkles sitting on the same paths, in the orbit's own space so
      // they inherit its tilt and drift.
      const count = this.lowPower ? 3 : 6;
      const euler = new THREE.Euler(...cfg.tilt);
      for (let s = 0; s < count; s += 1) {
        const a = ((s + 0.5) / count) * Math.PI * 2 + i;
        // Bake the orbit tilt in, since all sparks share one Points object.
        const at = new THREE.Vector3(Math.cos(a) * cfg.rx, 0, Math.sin(a) * cfg.rz)
          .applyEuler(euler);
        sparkPositions.push(at.x, at.y, at.z);
        sparkSizes.push(1.3 + Math.random() * 2.0);
        sparkPhases.push(Math.random());
        sparkTints.push(...(s % 3 === 0 ? LIME : s % 3 === 1 ? MINT : BLUE));
      }
    });

    const sparkGeo = new THREE.BufferGeometry();
    sparkGeo.setAttribute('position', new THREE.Float32BufferAttribute(sparkPositions, 3));
    sparkGeo.setAttribute('aSize', new THREE.Float32BufferAttribute(sparkSizes, 1));
    sparkGeo.setAttribute('aPhase', new THREE.Float32BufferAttribute(sparkPhases, 1));
    sparkGeo.setAttribute('aTint', new THREE.Float32BufferAttribute(sparkTints, 3));

    this.sparkUniforms = {
      uTime: { value: 0 },
      uPixelRatio: { value: this.pixelRatio },
    };

    const sparks = new THREE.Points(sparkGeo, new THREE.ShaderMaterial({
      uniforms: this.sparkUniforms,
      vertexShader: sparkVertex,
      fragmentShader: sparkFragment,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
    }));
    sparks.renderOrder = 50;
    this.spin.add(sparks);
    this.sparks = sparks;
    this.disposables.push(sparkGeo, sparks.material);
  }

  initFlares() {
    const tex = flareTexture();
    this.flares = FLARES.map((cfg, i) => {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.5,
      }));
      sprite.position.set(...cfg.at);
      sprite.scale.setScalar(cfg.scale);
      sprite.renderOrder = 60;
      this.spin.add(sprite);
      this.disposables.push(sprite.material);
      return { sprite, base: cfg.scale, phase: i * 1.9 };
    });
    this.disposables.push(tex);
  }

  initPost() {
    this.composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.camera);
    renderPass.clearAlpha = 0;
    this.composer.addPass(renderPass);

    this.gradePass = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uKnee: { value: 0.64 },
      },
      vertexShader: fullscreenVertex,
      fragmentShader: gradeFragment,
    });
    this.composer.addPass(this.gradePass);

    // High threshold on purpose: only the lime crescent, cyan rims and
    // filaments should bloom. Blooming everything erases the depth.
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.45, 0.6, 0.62);
    this.composer.addPass(this.bloom);

    this.alphaPass = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uGain: { value: 2.2 },
      },
      vertexShader: fullscreenVertex,
      fragmentShader: alphaRestoreFragment,
    });
    this.composer.addPass(this.alphaPass);
  }

  initEvents() {
    this.onPointerMove = (event) => {
      if (this.reducedMotion) return;
      const rect = this.canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      this.pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        ((event.clientY - rect.top) / rect.height) * 2 - 1,
      );
    };
    window.addEventListener('pointermove', this.onPointerMove, { passive: true });

    this.resizeObserver = new ResizeObserver(() => this.setSize());
    this.resizeObserver.observe(this.canvas.parentElement);

    this.onVisibility = () => {
      if (document.visibilityState === 'hidden') this.stop();
      else this.start();
    };
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  initScroll() {
    if (!this.hero) return;
    this.scrollTween = gsap.to(this.scroll, {
      lift: 0.34,
      spin: 0.55,
      scale: 0.9,
      speed: 1.75,
      ease: 'none',
      scrollTrigger: {
        trigger: this.hero,
        start: 'top top',
        end: 'bottom top',
        scrub: 1.1,
      },
    });
  }

  setSize() {
    const parent = this.canvas.parentElement;
    const width = Math.max(parent.clientWidth, 1);
    const height = Math.max(parent.clientHeight, 1);

    this.renderer.setSize(width, height, false);
    this.composer.setSize(width, height);
    this.bloom.setSize(width * this.pixelRatio, height * this.pixelRatio);

    this.camera.aspect = width / height;

    // Frame to whichever axis is tighter so the orbital paths never clip,
    // and the sculpture fills the canvas on both portrait and landscape.
    const vFov = THREE.MathUtils.degToRad(this.camera.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * this.camera.aspect);
    this.camera.position.z = 1.72 / Math.tan(Math.min(vFov, hFov) / 2);
    this.camera.updateProjectionMatrix();
  }

  tick = () => {
    if (!this.running) return;
    this.frame = requestAnimationFrame(this.tick);

    const delta = Math.min(this.clock.getDelta(), 0.05);
    const motion = this.reducedMotion ? 0 : 1;
    const rate = this.scroll.speed;

    // Reduced motion freezes the clock, but we still redraw every frame: the
    // drawing buffer is not preserved across composites, so a render-once
    // approach leaves the canvas blank.
    if (motion) this.time += delta * rate;

    this.damped.x += (this.pointer.x - this.damped.x) * 0.045;
    this.damped.y += (this.pointer.y - this.damped.y) * 0.045;

    const t = this.time;

    this.shells.forEach((s) => {
      s.group.rotation.x += delta * s.spin[0] * motion * rate;
      s.group.rotation.y += delta * s.spin[1] * motion * rate;
      s.group.rotation.z += delta * s.spin[2] * motion * rate;
      s.uniforms.uTime.value = t;
      s.uniforms.uPulse.value = 1 + Math.sin(t * s.pulseRate + s.pulsePhase) * 0.18;
      s.uniforms.uPointer.value.set(this.damped.x, this.damped.y);
    });

    this.coreUniforms.uTime.value = t;
    this.coreUniforms.uPulse.value = 1 + Math.sin(t * 0.23 + 0.9) * 0.14;
    this.coreUniforms.uPointer.value.set(this.damped.x, this.damped.y);
    this.coreGroup.rotation.y += delta * 0.012 * motion * rate;
    this.coreGroup.rotation.x = Math.sin(t * 0.09) * 0.08 + this.damped.y * 0.05;

    this.filaments.forEach((f) => {
      f.uniforms.uTime.value = t;
      f.uniforms.uPulse.value = 1 + Math.sin(t * 0.31 + f.drift * 40) * 0.16;
      f.group.rotation.y += delta * f.drift * motion * rate;
      f.group.rotation.z += delta * f.drift * 0.4 * motion * rate;
    });

    this.orbits.forEach((o) => {
      o.uniforms.uTime.value = t;
      o.group.rotation.y += delta * o.speed * motion * rate;
    });

    this.pearls.forEach((p) => {
      p.t = (p.t + delta * p.speed * motion * rate) % 1;
      const a = p.t * Math.PI * 2;
      p.mesh.position.set(Math.cos(a) * p.rx, 0, Math.sin(a) * p.rz);
    });

    this.sparkUniforms.uTime.value = t;

    this.flares.forEach((f) => {
      const beat = 1 + Math.sin(t * 0.34 + f.phase) * 0.22;
      f.sprite.scale.setScalar(f.base * beat);
      f.sprite.material.opacity = 0.5 * beat;
    });

    // Pointer tilt, slow drift, scroll lift and a very shallow breathing
    // scale. All deliberately small so nothing reads as mechanical.
    this.tilt.rotation.y = this.damped.x * 0.26;
    this.tilt.rotation.x = this.damped.y * 0.18;
    // ~2 minutes per revolution: perceptible within a few seconds of looking
    // at it, without ever reading as spinning.
    this.spin.rotation.y = t * 0.052 + this.scroll.spin;
    this.spin.rotation.x = Math.sin(t * 0.055) * 0.09;

    const breathe = 1 + Math.sin(t * 0.16) * 0.014;
    this.root.scale.setScalar(breathe * this.scroll.scale);
    this.root.position.y = Math.sin(t * 0.12) * 0.02 + this.scroll.lift;
    this.glow.material.opacity = 0.85 * (1 + Math.sin(t * 0.19) * 0.12);

    this.composer.render();
  };

  start() {
    if (this.running && this.frame) return;
    this.running = true;
    this.clock.getDelta();
    this.frame = requestAnimationFrame(this.tick);
  }

  stop() {
    this.running = false;
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = null;
  }

  dispose() {
    this.stop();
    window.removeEventListener('pointermove', this.onPointerMove);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.resizeObserver?.disconnect();
    this.scrollTween?.scrollTrigger?.kill();
    this.scrollTween?.kill();
    this.disposables.forEach((d) => d.dispose?.());
    this.composer?.dispose();
    this.renderer.dispose();
  }
}
