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
const LIME = [0.843, 1.0, 0.302];       // #D7FF4D
const MINT = [0.392, 0.941, 0.867];     // #64F0DD
const BLUE = [0.475, 0.812, 1.0];       // #79CFFF
const VIOLET = [0.596, 0.467, 1.0];     // #9877FF
const WHITE = [0.953, 1.0, 0.945];      // #F3FFF1
const DARK_GREEN = [0.063, 0.137, 0.114]; // #10231D
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
    // [specPower, specGain, streakGain, refractGain] — the outer shell is the
    // most polished, so it takes the tightest specular and the most refraction.
    glass: [240.0, 0.26, 0.18, 0.26],
    // Silhouette segments. Shells whose rims use a high uEdgePower need the
    // denser mesh, since a narrow rim on a coarse outline reads as facets.
    segs: 144,
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
    glass: [190.0, 0.36, 0.2, 0.24],
    segs: 168,
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
    glass: [150.0, 0.3, 0.16, 0.2],
    segs: 168,
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
    glass: [130.0, 0.32, 0.13, 0.2],
    segs: 200,
    squash: [0.92, 1.04, 1.06],
    tint: DEEP_TEAL,
    hue: 0.44,
    spread: -0.18,
    fresnel: 1.8,
    band: 6.0,
    intensity: 0.68,
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
    glass: [95.0, 0.5, 0.11, 0.16],
    segs: 232,
    squash: [1.04, 0.95, 0.92],
    tint: DARK_GREEN,
    hue: 0.62,
    spread: 0.3,
    fresnel: 1.6,
    band: 4.0,
    intensity: 1.55,
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
    glass: [115.0, 0.24, 0.12, 0.18],
    segs: 200,
    squash: [0.95, 1.03, 1.04],
    tint: DEEP_TEAL,
    hue: 0.36,
    spread: -0.25,
    fresnel: 2.1,
    band: 7.0,
    intensity: 0.44,
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
    glass: [85.0, 0.4, 0.1, 0.15],
    segs: 232,
    squash: [0.98, 1.02, 0.96],
    tint: DARK_GREEN,
    hue: 0.66,
    spread: 0.24,
    fresnel: 1.7,
    band: 5.0,
    intensity: 1.05,
    bias: [LIME, 0.48],
    key: [-0.62, -0.55, 0.56],
    flow: 0.4,
    spin: [0.013, 0.022, -0.01],
    pulse: [0.27, 0.8],
  },
];

// Trail geometry. The core tube is intentionally ~5 device pixels across and
// the shader concentrates its brightness into the middle ~1.5; a genuinely
// sub-pixel tube cannot be filtered and disintegrates into a dotted line.
// The intensity numbers in the tables below are relative weights within their
// own system; these set the level the grade shoulder actually sees. Keeping
// them separate means rebalancing overall exposure does not mean touching
// nineteen individual values.
const SHELL_LEVEL = 1.8;
const TRAIL_LEVEL = 1.4;

const TRAIL = {
  segments: 440,
  segmentsLow: 180,
  // Sized and shaped together. The core lands near three CSS pixels across and
  // corePower spreads the falloff over most of that width, leaving about a
  // pixel of gradient on each side. A much higher exponent looks superb at
  // device pixel ratio 2 but collapses to a single hard-edged pixel at ratio 1,
  // where there are half as many samples to spend on the gradient.
  coreScale: 1.3,
  corePower: 4.0,
  glowScale: 3.4,
  glowPower: 1.3,
  glowGain: 0.075,
  radialCore: 14,
  radialGlow: 10,
  radialCoreLow: 8,
  radialGlowLow: 6,
};

const FILAMENTS = [
  { radius: 1.02, wobble: 0.3, lift: 0.62, seed: 0.4, tilt: [0.5, 0.2, -0.3], colors: [LIME, WHITE, MINT], intensity: 1.05, speed: 0.035, tail: 0.4, floor: 0.1, white: 0.55, width: 0.0058 },
  { radius: 0.9, wobble: 0.36, lift: 0.52, seed: 2.1, tilt: [-0.7, 1.1, 0.4], colors: [MINT, BLUE, MINT], intensity: 0.88, speed: -0.028, tail: 0.34, floor: 0.09, white: 0.35, width: 0.0052 },
  { radius: 1.1, wobble: 0.24, lift: 0.7, seed: 3.7, tilt: [1.2, -0.5, 0.8], colors: [LIME, LIME, MINT], intensity: 0.95, speed: 0.022, tail: 0.46, floor: 0.08, white: 0.5, width: 0.0055 },
  { radius: 0.78, wobble: 0.42, lift: 0.44, seed: 5.2, tilt: [0.2, 0.9, 1.3], colors: [BLUE, VIOLET, BLUE], intensity: 0.72, speed: -0.034, tail: 0.3, floor: 0.08, white: 0.22, width: 0.0046 },
  { radius: 0.96, wobble: 0.33, lift: 0.58, seed: 6.6, tilt: [-0.4, -1.0, -0.6], colors: [MINT, WHITE, LIME], intensity: 0.85, speed: 0.03, tail: 0.38, floor: 0.09, white: 0.45, width: 0.005 },
];

const ORBITS = [
  { rx: 1.66, rz: 1.2, tilt: [0.2, 0.1, -0.36], colors: [LIME, WHITE, LIME], intensity: 1.5, speed: 0.012, dash: 0, pearls: 1, white: 0.6, width: 0.0048 },
  { rx: 1.48, rz: 1.52, tilt: [-1.18, 0.55, 0.2], colors: [MINT, MINT, BLUE], intensity: 1.15, speed: -0.009, dash: 0, pearls: 1, white: 0.4, width: 0.0044 },
  { rx: 1.58, rz: 1.02, tilt: [0.78, -0.86, 0.55], colors: [LIME, LIME, WHITE], intensity: 1.3, speed: 0.015, dash: 0, pearls: 1, white: 0.5, width: 0.0046 },
  { rx: 1.36, rz: 1.4, tilt: [-0.35, 1.25, -0.72], colors: [BLUE, MINT, BLUE], intensity: 0.62, speed: -0.011, dash: 118, pearls: 1, white: 0.3, width: 0.0042 },
  { rx: 1.7, rz: 0.9, tilt: [1.34, 0.3, 0.15], colors: [VIOLET, BLUE, VIOLET], intensity: 0.82, speed: 0.008, dash: 0, pearls: 0, white: 0.2, width: 0.004 },
  { rx: 1.28, rz: 1.3, tilt: [0.45, -0.3, 1.1], colors: [MINT, BLUE, MINT], intensity: 0.58, speed: -0.014, dash: 136, pearls: 1, white: 0.25, width: 0.004 },
  { rx: 1.62, rz: 1.44, tilt: [-0.62, -1.05, -0.25], colors: [LIME, MINT, LIME], intensity: 0.88, speed: 0.01, dash: 0, pearls: 1, white: 0.35, width: 0.0042 },
];

// Both path types are analytic rather than splines fitted through sampled
// points. A CatmullRom through 16-48 controls carries small curvature ripples
// between knots, and TubeGeometry bakes those in as visible kinks along an
// otherwise smooth trail. Evaluating the closed form at every tube segment
// gives a mathematically exact path with no angular transitions at all.
class OrganicCurve extends THREE.Curve {
  constructor({ radius, wobble, lift, seed }) {
    super();
    this.radius = radius;
    this.wobble = wobble;
    this.lift = lift;
    this.seed = seed;
  }

  getPoint(t, target = new THREE.Vector3()) {
    const { radius, wobble, lift, seed } = this;
    const a = t * Math.PI * 2;
    const r = radius * (1 + Math.sin(a * 1.7 + seed) * wobble + Math.cos(a * 2.6 - seed * 1.4) * wobble * 0.4);
    return target.set(
      Math.cos(a) * r,
      Math.sin(a * 0.8 + seed * 1.3) * radius * lift * 0.55,
      Math.sin(a) * r * (0.82 + Math.cos(a * 1.3 + seed) * 0.16),
    );
  }
}

class EllipsePath extends THREE.Curve {
  constructor(rx, rz) {
    super();
    this.rx = rx;
    this.rz = rz;
  }

  getPoint(t, target = new THREE.Vector3()) {
    const a = t * Math.PI * 2;
    return target.set(Math.cos(a) * this.rx, 0, Math.sin(a) * this.rz);
  }
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

// Placed on the upper-left edge, upper centre, right edge and the lower cyan
// region, so the glare sits in a few concentrated spots rather than lighting
// the sphere evenly.
const FLARES = [
  { at: [-0.78, 0.58, 0.3], scale: 0.36 },
  { at: [0.05, 0.98, 0.15], scale: 0.24 },
  { at: [1.0, 0.12, -0.1], scale: 0.26 },
  { at: [-0.35, -0.85, 0.25], scale: 0.2 },
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

    // Note the floor, not just the cap. On a ratio-1 display a three-pixel
    // trail has only three samples to spend, so its shoulders step abruptly
    // however the shader shapes the falloff; rendering above CSS resolution and
    // letting the browser downscale supersamples that edge properly. Retina
    // displays already have the samples and just take the 2.0 cap.
    this.pixelRatio = this.lowPower
      ? Math.min(window.devicePixelRatio || 1, 1.5)
      : Math.min(Math.max(window.devicePixelRatio || 1, 1.6), 2);
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
      opacity: 0.42,
    }));
    glow.scale.set(3.4, 3.4, 1);
    glow.renderOrder = -1;
    this.root.add(glow);
    this.glow = glow;
    this.disposables.push(tex, glow.material);
  }

  // Segment counts, not an icosahedron detail level. IcosahedronGeometry
  // subdivides each of its 20 faces into (detail+1)^2 triangles, so even
  // detail 6 is only 980 triangles -- roughly a 32-sided silhouette, which is
  // precisely the faceting that showed along the bright crescents. It is also
  // non-indexed, so every vertex is duplicated about six times and pays for
  // its noise lookups six times over. An indexed sphere gives a directly
  // controllable silhouette resolution for a fraction of the vertex work.
  shellGeometry(segs) {
    const w = this.lowPower ? Math.round(segs * 0.5) : segs;
    const h = Math.round(w * 0.7);
    this._shellGeo = this._shellGeo || new Map();
    if (!this._shellGeo.has(w)) {
      const geo = new THREE.SphereGeometry(1, w, h);
      this._shellGeo.set(w, geo);
      this.disposables.push(geo);
    }
    return this._shellGeo.get(w);
  }

  // Two concentric tubes per path: a crisp core and a much wider, much dimmer
  // glow underneath it. That pairing is what gives a sharp centreline with a
  // soft halo, instead of a single tube that is either thin and aliased or
  // thick and blurry.
  buildTrail(curve, cfg, parent, order) {
    const segments = this.lowPower ? TRAIL.segmentsLow : TRAIL.segments;
    const layers = [
      {
        radius: cfg.width * TRAIL.glowScale,
        radial: this.lowPower ? TRAIL.radialGlowLow : TRAIL.radialGlow,
        power: TRAIL.glowPower,
        gain: TRAIL.glowGain,
        order: order,
      },
      {
        radius: cfg.width * TRAIL.coreScale,
        radial: this.lowPower ? TRAIL.radialCoreLow : TRAIL.radialCore,
        power: TRAIL.corePower,
        gain: 1.0,
        order: order + 1,
      },
    ];

    return layers.map((layer) => {
      const geo = new THREE.TubeGeometry(curve, segments, layer.radius, layer.radial, true);
      const uniforms = {
        uTime: { value: 0 },
        uColorA: { value: v3(cfg.colors[0]) },
        uColorB: { value: v3(cfg.colors[1]) },
        uColorC: { value: v3(cfg.colors[2]) },
        uIntensity: { value: cfg.intensity * layer.gain * TRAIL_LEVEL },
        uFlowSpeed: { value: cfg.speed },
        uTail: { value: cfg.tail ?? 0.5 },
        uFloor: { value: cfg.floor ?? 0.58 },
        uPulse: { value: 1 },
        uDashCount: { value: cfg.dash ?? 0 },
        uCorePower: { value: layer.power },
        uWhiteMix: { value: cfg.white * layer.gain },
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
      mesh.renderOrder = layer.order;
      parent.add(mesh);
      this.disposables.push(geo, mesh.material);
      return uniforms;
    });
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
        uIntensity: { value: cfg.intensity * SHELL_LEVEL },
        uFresnelPower: { value: cfg.fresnel * 2.1 },
        uBandFreq: { value: cfg.band },
        uHueShift: { value: cfg.hue },
        uHueSpread: { value: cfg.spread },
        uBiasColor: { value: v3(cfg.bias[0]) },
        uBias: { value: cfg.bias[1] },
        uKeyDir: { value: new THREE.Vector3(...cfg.key).normalize() },
        uEdgePower: { value: cfg.edge[0] },
        uEdgeGain: { value: cfg.edge[1] * 2.2 },
        uSpecPower: { value: cfg.glass[0] },
        uSpecGain: { value: cfg.glass[1] },
        uStreakGain: { value: cfg.glass[2] * 3.2 },
        uRefractGain: { value: cfg.glass[3] },
        uPulse: { value: 1 },
      };

      const mesh = new THREE.Mesh(this.shellGeometry(cfg.segs), new THREE.ShaderMaterial({
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
      uKeyDir: { value: new THREE.Vector3(0.62, 0.6, 0.5).normalize() },
      uRimGain: { value: 3.2 },
      uSpecGain: { value: 1.0 },
      uPulse: { value: 1 },
    };

    const core = new THREE.Mesh(this.shellGeometry(200), new THREE.ShaderMaterial({
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
    this.disposables.push(core.material);
  }

  initFilaments() {
    FILAMENTS.forEach((cfg, i) => {
      const group = new THREE.Group();
      group.rotation.set(...cfg.tilt);
      this.spin.add(group);

      const layers = this.buildTrail(new OrganicCurve(cfg), cfg, group, 20 + i * 2);
      this.filaments.push({ group, layers, drift: 0.008 + i * 0.003 });
    });
  }

  initOrbits() {
    const pearlGeo = new THREE.SphereGeometry(1, 20, 16);
    this.disposables.push(pearlGeo);

    const sparkPositions = [];
    const sparkSizes = [];
    const sparkPhases = [];
    const sparkTints = [];

    // Mostly cyan, pale green and white, with lime kept rare so it stays a
    // highlight rather than becoming the particle colour.
    const PEARL_TINTS = [MINT, WHITE, MINT, BLUE, LIME, MINT];

    ORBITS.forEach((cfg, i) => {
      const group = new THREE.Group();
      group.rotation.set(...cfg.tilt);
      this.spin.add(group);

      const layers = this.buildTrail(
        new EllipsePath(cfg.rx, cfg.rz),
        { ...cfg, speed: cfg.speed * 1.6 },
        group,
        30 + i * 2,
      );
      this.orbits.push({ group, layers, speed: cfg.speed });

      for (let p = 0; p < cfg.pearls; p += 1) {
        const tint = PEARL_TINTS[(i + p) % PEARL_TINTS.length];
        const pearl = new THREE.Mesh(pearlGeo, new THREE.ShaderMaterial({
          uniforms: {
            uColor: { value: v3(tint) },
            uIntensity: { value: 1.5 },
          },
          vertexShader: pearlVertex,
          fragmentShader: pearlFragment,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          depthTest: true,
        }));
        pearl.scale.setScalar(0.013 + (i % 3) * 0.004);
        pearl.renderOrder = 48;
        group.add(pearl);
        this.pearls.push({
          mesh: pearl,
          rx: cfg.rx,
          rz: cfg.rz,
          t: (p / Math.max(cfg.pearls, 1)) + i * 0.17,
          speed: 0.018 + i * 0.004,
        });
        this.disposables.push(pearl.material);
      }

      // Tiny sparkles sitting on the same paths, in the orbit's own space so
      // they inherit its tilt and drift.
      const count = this.lowPower ? 2 : 3;
      const euler = new THREE.Euler(...cfg.tilt);
      for (let s = 0; s < count; s += 1) {
        const a = ((s + 0.5) / count) * Math.PI * 2 + i;
        // Bake the orbit tilt in, since all sparks share one Points object.
        const at = new THREE.Vector3(Math.cos(a) * cfg.rx, 0, Math.sin(a) * cfg.rz)
          .applyEuler(euler);
        sparkPositions.push(at.x, at.y, at.z);
        sparkSizes.push(1.0 + Math.random() * 1.3);
        sparkPhases.push(Math.random());
        sparkTints.push(...(s % 3 === 0 ? WHITE : s % 3 === 1 ? MINT : BLUE));
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
    sparks.renderOrder = 52;
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
        opacity: 0.58,
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

    // Bloom runs on the raw HDR buffer, before any compression. EffectComposer
    // targets are half-float, so a rim accumulating to 4.0 is still 4.0 here
    // and the threshold can pick out genuinely bright features instead of
    // whatever survived a grade. High threshold on purpose: only the filament
    // cores, the lime crescents and the core rim cross it, since blooming
    // everything is what erases the internal depth.
    // Small radius on purpose. A wide bloom smears the thin membrane edges and
    // filament cores into the fuzz this pass exists to avoid; a tight one
    // leaves the crisp detail intact and only wraps it in a halo.
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.45, 0.22, 0.88);
    this.composer.addPass(this.bloom);

    // Grading last, so the shoulder sees the scene and its bloom together and
    // the guarantee of never clipping actually holds. With the old ordering
    // bloom added on top of already-compressed highlights and drove them
    // straight to flat white.
    this.gradePass = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uKnee: { value: 0.5 },
      },
      vertexShader: fullscreenVertex,
      fragmentShader: gradeFragment,
    });
    this.composer.addPass(this.gradePass);

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
      const pulse = 1 + Math.sin(t * 0.31 + f.drift * 40) * 0.16;
      f.layers.forEach((u) => {
        u.uTime.value = t;
        u.uPulse.value = pulse;
      });
      f.group.rotation.y += delta * f.drift * motion * rate;
      f.group.rotation.z += delta * f.drift * 0.4 * motion * rate;
    });

    this.orbits.forEach((o) => {
      o.layers.forEach((u) => { u.uTime.value = t; });
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
      f.sprite.material.opacity = 0.58 * beat;
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
    this.glow.material.opacity = 0.42 * (1 + Math.sin(t * 0.19) * 0.12);

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
