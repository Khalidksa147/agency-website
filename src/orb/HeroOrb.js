import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
import { EffectComposer } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/environments/RoomEnvironment.js';
import { Line2 } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/lines/LineMaterial.js';
import gsap from '/node_modules/gsap/index.js';
import { ScrollTrigger } from '/node_modules/gsap/ScrollTrigger.js';
import {
  energyVertex,
  energyFragment,
  mistVertex,
  mistFragment,
  glassVertex,
  glassFragment,
  dustVertex,
  dustFragment,
} from './shaders.js';

gsap.registerPlugin(ScrollTrigger);

const LIME = new THREE.Color('#d7ff4d');
const CYAN = new THREE.Color('#64f0dd');
const VIOLET = new THREE.Color('#9877ff');

function detectLowPower() {
  const mobile = window.matchMedia('(max-width: 720px)').matches
    || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  const cores = navigator.hardwareConcurrency || 8;
  const memory = navigator.deviceMemory || 8;
  const saveData = Boolean(navigator.connection?.saveData);
  return mobile || cores <= 4 || memory <= 4 || saveData;
}

function ellipsePoints(rx, rz, segments = 256) {
  const pts = [];
  for (let i = 0; i <= segments; i += 1) {
    const a = (i / segments) * Math.PI * 2;
    pts.push(Math.cos(a) * rx, 0, Math.sin(a) * rz);
  }
  return pts;
}

function createGlowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(256, 256, 12, 256, 256, 256);
  g.addColorStop(0, 'rgba(215,255,77,0.28)');
  g.addColorStop(0.18, 'rgba(140,210,90,0.12)');
  g.addColorStop(0.42, 'rgba(100,240,221,0.05)');
  g.addColorStop(0.7, 'rgba(20,40,28,0.015)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class HeroOrb {
  constructor(canvas, { hero } = {}) {
    this.canvas = canvas;
    this.hero = hero;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.mobile = window.matchMedia('(max-width: 720px)').matches;
    this.lowPower = detectLowPower();
    this.useBloom = !this.lowPower && !this.reducedMotion;
    this.useTransmission = !this.lowPower;

    this.clock = new THREE.Clock();
    this.pointer = new THREE.Vector2(0, 0);
    this.tilt = new THREE.Vector2(0, 0);
    this.scroll = { y: 0, rot: 0, scale: 1 };
    this.running = true;
    this.orbitTravellers = [];
    this.orbitMats = [];
    this.rings = [];
    this.filaments = [];

    this.initRenderer();
    this.initScene();
    this.initCore();
    this.initOrbits();
    this.initDust();
    this.initPost();
    this.initEvents();
    this.initScroll();
    this.setSize();
    this.tick();
  }

  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: !this.lowPower,
      alpha: true,
      powerPreference: this.lowPower ? 'low-power' : 'high-performance',
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.04;
    const cap = this.lowPower ? 1.25 : Math.min(window.devicePixelRatio, 1.75);
    this.pixelRatio = Math.min(Math.max(cap, 1), 2);
    this.renderer.debug.checkShaderErrors = true;
    this.renderer.debug.onShaderError = (gl, program, glVertexShader, glFragmentShader) => {
      window.__shaderError = {
        vs: gl.getShaderInfoLog(glVertexShader),
        fs: gl.getShaderInfoLog(glFragmentShader),
        pr: gl.getProgramInfoLog(program),
      };
    };
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 24);
    this.camera.position.set(0, 0.04, 3.45);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.06).texture;
    this.scene.environmentIntensity = 0.85;
    pmrem.dispose();

    this.root = new THREE.Group();
    this.tiltGroup = new THREE.Group();
    this.spinGroup = new THREE.Group();
    this.root.add(this.tiltGroup);
    this.tiltGroup.add(this.spinGroup);
    this.scene.add(this.root);

    const key = new THREE.DirectionalLight(0xc8ff7a, 2.1);
    key.position.set(-2.6, 2.4, 2.2);
    const fill = new THREE.DirectionalLight(0x8fd4ff, 0.7);
    fill.position.set(2.4, -1.7, 1.4);
    const rim = new THREE.DirectionalLight(0xffffff, 0.38);
    rim.position.set(0.15, 0.8, -2.8);
    const hemi = new THREE.HemisphereLight(0xb7d7c4, 0x050807, 0.35);
    const coreLight = new THREE.PointLight(0xd7ff4d, 1.6, 5, 1.8);
    coreLight.position.set(-0.15, 0.12, 0.35);

    this.spinGroup.add(key, fill, rim, coreLight);
    this.scene.add(hemi);

    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: createGlowTexture(),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.9,
      }),
    );
    glow.scale.set(4.2, 4.2, 1);
    glow.position.z = -0.2;
    this.tiltGroup.add(glow);
    this.glow = glow;
  }

  initCore() {
    this.energyUniforms = {
      uTime: { value: 0 },
      uAmp: { value: this.reducedMotion ? 0.05 : 0.16 },
      uDeep: { value: new THREE.Color('#04160f') },
      uMid: { value: new THREE.Color('#1a5a38') },
      uLime: { value: LIME.clone() },
      uCyan: { value: CYAN.clone() },
    };

    const nucleus = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 32, 32),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#8cff78'),
        transparent: true,
        opacity: 0.28,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.spinGroup.add(nucleus);

    const energy = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.42, this.lowPower ? 24 : 48),
      new THREE.ShaderMaterial({
        uniforms: this.energyUniforms,
        vertexShader: energyVertex,
        fragmentShader: energyFragment,
        transparent: true,
        depthWrite: false,
      }),
    );
    energy.renderOrder = 1;
    this.spinGroup.add(energy);
    this.energy = energy;

    const innerEnergy = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.26, this.lowPower ? 16 : 32),
      new THREE.ShaderMaterial({
        uniforms: {
          ...this.energyUniforms,
          uAmp: { value: this.reducedMotion ? 0.04 : 0.12 },
          uDeep: { value: new THREE.Color('#03221c') },
          uMid: { value: new THREE.Color('#1c6d5a') },
          uLime: { value: CYAN.clone() },
          uCyan: { value: LIME.clone() },
        },
        vertexShader: energyVertex,
        fragmentShader: energyFragment,
        transparent: true,
        depthWrite: false,
      }),
    );
    innerEnergy.renderOrder = 1;
    this.spinGroup.add(innerEnergy);

    const mist = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.44, this.lowPower ? 16 : 32),
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: this.energyUniforms.uTime,
          uColor: { value: new THREE.Color('#d7ff4d') },
        },
        vertexShader: mistVertex,
        fragmentShader: mistFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    );
    mist.renderOrder = 2;
    this.spinGroup.add(mist);

    this.createFilaments();

    const glass = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, this.lowPower ? 48 : 96, this.lowPower ? 48 : 96),
      new THREE.ShaderMaterial({
        uniforms: {
          uTint: { value: new THREE.Color('#173526') },
          uRim: { value: new THREE.Color('#d5f7c8') },
        },
        vertexShader: glassVertex,
        fragmentShader: glassFragment,
        transparent: true,
        depthWrite: false,
      }),
    );
    glass.renderOrder = 4;
    this.spinGroup.add(glass);

    const glassHighlight = new THREE.Mesh(
      new THREE.SphereGeometry(0.505, 48, 48),
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#eff7ee'),
        metalness: 0,
        roughness: 0.04,
        transparent: true,
        opacity: 0.09,
        envMapIntensity: 2.4,
        clearcoat: 1,
        clearcoatRoughness: 0.03,
        specularIntensity: 1,
      }),
    );
    glassHighlight.renderOrder = 5;
    this.spinGroup.add(glassHighlight);
  }

  createFilaments() {
    const specs = [
      { color: LIME, radius: 0.006, turns: 3.2, amp: 0.2 },
      { color: CYAN, radius: 0.0045, turns: 2.4, amp: 0.17 },
    ];

    specs.forEach((spec, index) => {
      const pts = [];
      for (let i = 0; i <= 140; i += 1) {
        const t = i / 140;
        const a = t * Math.PI * 2 * spec.turns + index;
        const r = 0.2 + Math.sin(t * Math.PI * 3 + index) * 0.05;
        pts.push(new THREE.Vector3(
          Math.cos(a) * r,
          Math.sin(t * Math.PI * 2 + index * 0.7) * spec.amp,
          Math.sin(a) * r,
        ));
      }
      const tube = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 140, spec.radius, 6, true),
        new THREE.MeshBasicMaterial({
          color: spec.color,
          transparent: true,
          opacity: 0.72,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      this.spinGroup.add(tube);
      this.filaments.push({ mesh: tube, speed: index === 0 ? 0.08 : -0.06 });
    });
  }

  initOrbits() {
    const configs = [
      { rx: 1.18, rz: 0.4, rot: [0.42, 0.18, 0.12], color: 0xd7ff4d, speed: 0.045, width: 1.15, opacity: 0.55, pearls: 3 },
      { rx: 1.08, rz: 0.52, rot: [-0.58, 0.46, -0.22], color: 0x64f0dd, speed: -0.032, width: 0.95, opacity: 0.5, pearls: 2 },
      { rx: 1.24, rz: 0.36, rot: [1.05, 0.12, 0.48], color: 0x9877ff, speed: 0.028, width: 0.9, opacity: 0.42, pearls: 3 },
      { rx: 0.96, rz: 0.64, rot: [0.18, -0.72, 0.28], color: 0xd7ff4d, speed: -0.04, width: 1.05, opacity: 0.38, pearls: 2 },
      { rx: 1.16, rz: 0.46, rot: [-0.32, 0.95, -0.38], color: 0x64f0dd, speed: 0.036, width: 0.8, opacity: 0.4, pearls: 2 },
      { rx: 1.1, rz: 0.5, rot: [0.68, -0.22, 0.82], color: 0xffffff, speed: -0.018, width: 0.7, opacity: 0.18, pearls: 1 },
    ];

    const pearlGeo = new THREE.SphereGeometry(1, 16, 16);
    const pearlCount = this.mobile ? 8 : configs.reduce((n, c) => n + c.pearls, 0);
    this.pearlMesh = new THREE.InstancedMesh(
      pearlGeo,
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
      pearlCount,
    );
    this.pearlMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    const color = new THREE.Color();
    const palette = [LIME, CYAN, VIOLET, new THREE.Color('#f4ffe8')];
    this.pearlMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(pearlCount * 3), 3);

    let pearlIndex = 0;
    configs.forEach((cfg) => {
      const ring = new THREE.Group();
      ring.rotation.set(...cfg.rot);

      const geo = new LineGeometry();
      geo.setPositions(ellipsePoints(cfg.rx, cfg.rz));
      const mat = new LineMaterial({
        color: cfg.color,
        linewidth: cfg.width,
        transparent: true,
        opacity: cfg.opacity,
        blending: THREE.AdditiveBlending,
        depthTest: true,
        depthWrite: false,
        dashed: false,
      });
      const line = new Line2(geo, mat);
      line.computeLineDistances();
      ring.add(line);
      this.spinGroup.add(ring);
      this.orbitMats.push(mat);
      this.rings.push({ group: ring, speed: this.reducedMotion ? 0 : cfg.speed });

      const count = this.mobile ? Math.min(1, cfg.pearls) : cfg.pearls;
      for (let i = 0; i < count && pearlIndex < pearlCount; i += 1) {
        const tint = palette[pearlIndex % palette.length];
        color.copy(tint);
        this.pearlMesh.setColorAt(pearlIndex, color);
        this.orbitTravellers.push({
          index: pearlIndex,
          rx: cfg.rx,
          rz: cfg.rz,
          ring,
          t: Math.random(),
          speed: (0.035 + Math.random() * 0.04) * (cfg.speed < 0 ? -1 : 1),
          scale: 0.012 + Math.random() * 0.018,
        });
        pearlIndex += 1;
      }
    });

    this.pearlMesh.count = this.orbitTravellers.length;
    this.pearlMesh.frustumCulled = false;
    if (this.pearlMesh.instanceColor) this.pearlMesh.instanceColor.needsUpdate = true;
    this.spinGroup.add(this.pearlMesh);
    this.updatePearls();
  }

  initDust() {
    const count = this.mobile ? 36 : 88;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const alphas = new Float32Array(count);
    this.dustSeeds = [];

    for (let i = 0; i < count; i += 1) {
      const r = 0.7 + Math.random() * 1.8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi) * 0.7;
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      sizes[i] = 1.2 + Math.random() * 3.4;
      alphas[i] = 0.12 + Math.random() * 0.35;
      this.dustSeeds.push({
        x: positions[i * 3],
        y: positions[i * 3 + 1],
        z: positions[i * 3 + 2],
        phase: Math.random() * Math.PI * 2,
      });
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));

    this.dust = new THREE.Points(
      geo,
      new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color('#d8ffc6') },
          uPixelRatio: { value: this.pixelRatio },
        },
        vertexShader: dustVertex,
        fragmentShader: dustFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.tiltGroup.add(this.dust);
  }

  initPost() {
    const size = new THREE.Vector2(1, 1);
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    if (this.useBloom) {
      this.bloomPass = new UnrealBloomPass(size, 0.32, 0.62, 0.68);
      this.composer.addPass(this.bloomPass);
    }
    this.composer.addPass(new OutputPass());
  }

  initEvents() {
    this.onPointer = (event) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
      this.pointer.set(x, y);
    };
    window.addEventListener('pointermove', this.onPointer, { passive: true });

    this.ro = new ResizeObserver(() => this.setSize());
    this.ro.observe(this.canvas.parentElement);

    this.visibility = () => {
      this.running = document.visibilityState !== 'hidden';
      if (this.running) {
        this.clock.getDelta();
        this.tick();
      }
    };
    document.addEventListener('visibilitychange', this.visibility);
  }

  initScroll() {
    if (!this.hero || this.reducedMotion) return;
    this.scrollTween = gsap.to(this.scroll, {
      y: 0.42,
      rot: 0.85,
      scale: 0.72,
      ease: 'none',
      scrollTrigger: {
        trigger: this.hero,
        start: 'top top',
        end: 'bottom top',
        scrub: 1.25,
      },
    });
  }

  setSize() {
    const parent = this.canvas.parentElement;
    const width = Math.max(parent.clientWidth, 1);
    const height = Math.max(parent.clientHeight, 1);
    this.renderer.setSize(width, height, false);
    this.composer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.orbitMats.forEach((mat) => mat.resolution.set(width, height));
    if (this.bloomPass) this.bloomPass.setSize(width, height);
    if (this.dust) this.dust.material.uniforms.uPixelRatio.value = this.pixelRatio;
  }

  tick = () => {
    if (!this.running) return;
    this.frame = requestAnimationFrame(this.tick);

    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = this.clock.elapsedTime;
    const motion = this.reducedMotion ? 0 : 1;

    this.energyUniforms.uTime.value = t;

    const targetX = this.pointer.y * -0.11 * motion;
    const targetY = this.pointer.x * 0.18 * motion;
    this.tilt.x += (targetX - this.tilt.x) * 0.045;
    this.tilt.y += (targetY - this.tilt.y) * 0.045;
    this.tiltGroup.rotation.x = this.tilt.x;
    this.tiltGroup.rotation.y = this.tilt.y;

    this.spinGroup.rotation.y = t * 0.045 * motion + this.scroll.rot;
    this.rings.forEach((ring) => {
      ring.group.rotation.z += ring.speed * dt;
      ring.group.rotation.y += ring.speed * 0.35 * dt;
    });
    this.filaments.forEach((item) => {
      item.mesh.rotation.y += item.speed * dt * motion;
      item.mesh.rotation.x = Math.sin(t * 0.18) * 0.08 * motion;
    });

    this.orbitTravellers.forEach((p) => {
      p.t = ((p.t + p.speed * dt * motion) % 1 + 1) % 1;
    });
    this.updatePearls();

    if (this.dust && !this.reducedMotion) {
      const pos = this.dust.geometry.attributes.position;
      this.dustSeeds.forEach((seed, i) => {
        pos.setY(i, seed.y + Math.sin(t * 0.22 + seed.phase) * 0.045);
        pos.setX(i, seed.x + Math.cos(t * 0.13 + seed.phase) * 0.02);
      });
      pos.needsUpdate = true;
    }

    this.root.position.y = Math.sin(t * 0.32) * 0.038 * motion + this.scroll.y;
    this.root.position.x = Math.cos(t * 0.21) * 0.018 * motion;
    const s = this.scroll.scale;
    this.root.scale.setScalar(s);

    this.composer.render();
  };

  updatePearls() {
    const dummy = new THREE.Object3D();
    const local = new THREE.Vector3();
    this.orbitTravellers.forEach((p) => {
      const a = p.t * Math.PI * 2;
      local.set(Math.cos(a) * p.rx, 0, Math.sin(a) * p.rz);
      p.ring.localToWorld(local);
      this.pearlMesh.parent.worldToLocal(local);
      dummy.position.copy(local);
      dummy.scale.setScalar(p.scale);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      this.pearlMesh.setMatrixAt(p.index, dummy.matrix);
    });
    this.pearlMesh.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    this.running = false;
    cancelAnimationFrame(this.frame);
    window.removeEventListener('pointermove', this.onPointer);
    document.removeEventListener('visibilitychange', this.visibility);
    this.ro?.disconnect();
    this.scrollTween?.scrollTrigger?.kill();
    this.scrollTween?.kill();
    this.composer?.dispose();
    this.renderer?.dispose();
  }
}
