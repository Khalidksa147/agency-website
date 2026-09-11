const NOISE = /* glsl */ `
vec4 permute(vec4 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod(i, 289.0);
  vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 1.0 / 7.0;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m *= m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
`;

// Thin-film style colour wheel. Shell rims sweep through this rather than
// using a fixed tint, which is what produces the violet -> cyan -> lime
// transitions across a single curved surface.
const PALETTE = /* glsl */ `
const vec3 C_VIOLET = vec3(0.596, 0.467, 1.000);
const vec3 C_BLUE   = vec3(0.467, 0.812, 1.000);
const vec3 C_MINT   = vec3(0.392, 0.941, 0.867);
const vec3 C_LIME   = vec3(0.843, 1.000, 0.302);

vec3 iridescence(float t) {
  float s = fract(t) * 4.0;
  if (s < 1.0) return mix(C_VIOLET, C_BLUE, s);
  if (s < 2.0) return mix(C_BLUE, C_MINT, s - 1.0);
  if (s < 3.0) return mix(C_MINT, C_LIME, s - 2.0);
  return mix(C_LIME, C_VIOLET, s - 3.0);
}
`;

// Shared displacement + recomputed normal. The finite-difference normal is
// what keeps the highlight banding readable; using the undisplaced sphere
// normal flattens every shell into a plain ball.
const SHELL_BODY = /* glsl */ `
uniform float uTime;
uniform float uAmp;
uniform float uFreq;
uniform float uSeed;
uniform float uFlow;
uniform vec3 uSquash;
uniform vec2 uPointer;

varying vec3 vNormal;
varying vec3 vView;
varying vec3 vPos;
varying float vDisp;

float field(vec3 dir) {
  float t = uTime * uFlow;
  vec3 warp = vec3(uPointer.x * 0.18, uPointer.y * 0.18, 0.0);
  float a = snoise(dir * uFreq + vec3(uSeed, t * 0.33, -t * 0.21) + warp);
  float b = snoise(dir * uFreq * 2.13 + vec3(-uSeed * 1.7, t * 0.26, t * 0.17));
  return a * 0.74 + b * 0.26;
}

vec3 solve(vec3 dir) {
  return dir * uSquash * (1.0 + field(dir) * uAmp);
}
`;

export const shellVertex = /* glsl */ `
${NOISE}
${SHELL_BODY}

void main() {
  vec3 dir = normalize(position);
  float d0 = field(dir);
  vec3 p = dir * uSquash * (1.0 + d0 * uAmp);

  vec3 t1 = normalize(cross(dir, vec3(0.0, 1.0, 0.17)));
  vec3 t2 = normalize(cross(dir, t1));
  float e = 0.085;
  vec3 pa = solve(normalize(dir + t1 * e));
  vec3 pb = solve(normalize(dir + t2 * e));

  vec3 nrm = normalize(cross(pa - p, pb - p));
  if (dot(nrm, dir) < 0.0) nrm = -nrm;

  vec4 world = modelMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * viewMatrix * world;

  vPos = p;
  vDisp = d0;
  vNormal = normalize(mat3(modelMatrix) * nrm);
  vView = normalize(cameraPosition - world.xyz);
}
`;

export const shellFragment = /* glsl */ `
${PALETTE}

uniform vec3 uTintDeep;
uniform vec3 uBiasColor;
uniform vec3 uKeyDir;
uniform float uBias;
uniform float uIntensity;
uniform float uEdgePower;
uniform float uEdgeGain;
uniform float uFresnelPower;
uniform float uBandFreq;
uniform float uHueShift;
uniform float uHueSpread;
uniform float uPulse;
uniform float uTime;
uniform vec2 uPointer;

varying vec3 vNormal;
varying vec3 vView;
varying vec3 vPos;
varying float vDisp;

void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(vView);
  float ndv = clamp(abs(dot(n, v)), 0.0, 1.0);

  // Grazing angles carry the shell silhouettes. The small face-on base keeps
  // the surface faintly present so it reads as translucent glass you can see
  // through, rather than disappearing entirely.
  float fres = 0.032 + 0.968 * pow(1.0 - ndv, uFresnelPower);

  // A much narrower second rim right at the silhouette. This is what makes
  // each shell read as a distinct bubble boundary crossing its neighbours
  // instead of the whole stack blurring into one mass.
  float edge = pow(1.0 - ndv, uEdgePower);

  float hue = uHueShift + (1.0 - ndv) * uHueSpread + vDisp * 0.22 + uTime * 0.013;
  vec3 irid = mix(iridescence(hue), uBiasColor, uBias);

  // Interference banding: the striations that make each shell read as a
  // thin curved film instead of a smooth gradient.
  float band = 0.5 + 0.5 * sin((1.0 - ndv) * uBandFreq + vDisp * 2.1 + uHueShift * 6.2831);
  float shimmer = mix(0.48, 1.32, band);

  // Each shell gets its own key direction. With a shared key every shell
  // peaks in the same place and their different hues average to white; spread
  // apart, they read as violet, cyan and lime catching light on separate
  // faces of the sculpture. The pointer nudges where each one lands.
  vec3 key = normalize(uKeyDir + vec3(uPointer.x * 0.3, uPointer.y * 0.25, 0.0));
  float kd = max(dot(n, key), 0.0);
  float keyed = 0.34 + 0.72 * pow(kd, 1.6);

  // The narrow edge gets almost no ambient floor, so a shell boundary lights
  // as a crescent facing its key and fades out around the back. With a floor
  // the boundaries close into full rings and the sculpture looks like an onion.
  float edgeKey = 0.06 + 0.94 * pow(kd, 2.2);

  vec3 col = mix(uTintDeep, irid, 0.78);
  col *= fres * shimmer * keyed * uIntensity * uPulse;

  col += irid * edge * uEdgeGain * edgeKey * uPulse;

  float a = clamp(max(max(col.r, col.g), col.b), 0.0, 1.0);
  gl_FragColor = vec4(col, a);
}
`;

export const coreVertex = /* glsl */ `
${NOISE}
${SHELL_BODY}

void main() {
  vec3 dir = normalize(position);
  float d0 = field(dir);
  vec3 p = dir * uSquash * (1.0 + d0 * uAmp);

  vec4 world = modelMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * viewMatrix * world;

  vPos = p;
  vDisp = d0;
  vNormal = normalize(mat3(modelMatrix) * dir);
  vView = normalize(cameraPosition - world.xyz);
}
`;

// The core is the one layer that writes depth. That occlusion is what gives
// the sculpture a front and a back instead of a flat pile of glows.
export const coreFragment = /* glsl */ `
${NOISE}
${PALETTE}

uniform vec3 uCoreDark;
uniform float uTime;
uniform float uPulse;
uniform vec2 uPointer;

varying vec3 vNormal;
varying vec3 vView;
varying vec3 vPos;
varying float vDisp;

void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(vView);
  float ndv = clamp(abs(dot(n, v)), 0.0, 1.0);

  float rim = pow(1.0 - ndv, 3.2);
  float edge = pow(1.0 - ndv, 11.0);

  // Spiral swirl inside the core. The angular term is what turns the noise
  // into a rotating vortex rather than generic mottling.
  float ang = atan(vPos.z, vPos.x);
  float spiral = 0.5 + 0.5 * sin(ang * 2.0 + length(vPos.xz) * 7.0 - uTime * 0.22);
  float s1 = snoise(vPos * 2.4 + vec3(0.0, uTime * 0.06, uTime * 0.04));
  float s2 = snoise(vPos * 5.1 - vec3(uTime * 0.045, 0.0, uTime * 0.03));
  float swirl = 0.5 + 0.5 * (s1 * 0.66 + s2 * 0.34);

  // Mint low-left, lime high-right, matching the key direction.
  float dir = clamp(vPos.x * 0.9 + vPos.y * 1.1 + 0.5 + uPointer.x * 0.12, 0.0, 1.0);
  vec3 rimCol = mix(C_MINT, C_LIME, smoothstep(0.30, 0.88, dir));
  rimCol = mix(rimCol, C_BLUE, smoothstep(0.45, 0.0, dir) * 0.55);

  // Deliberately near-black through the middle. The core is the darkest part
  // of the sculpture; all of its colour lives in the rim.
  vec3 col = uCoreDark * (0.18 + swirl * 0.55 + spiral * 0.22);
  col += rimCol * rim * 0.34 * uPulse;
  col += rimCol * edge * 1.7 * uPulse;

  // Opaque enough to occlude the shells behind it, translucent enough that
  // the interior still reads as glass rather than a solid ball.
  float alpha = clamp(0.72 + rim * 0.24, 0.0, 1.0);
  gl_FragColor = vec4(col * alpha, alpha);
}
`;

export const filamentVertex = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vView;

void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * viewMatrix * world;
  vUv = uv;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vView = normalize(cameraPosition - world.xyz);
}
`;

export const filamentFragment = /* glsl */ `
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uTime;
uniform float uIntensity;
uniform float uFlowSpeed;
uniform float uTail;
uniform float uFloor;
uniform float uPulse;
uniform float uDashCount;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vView;

void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(vView);
  float ndv = clamp(abs(dot(n, v)), 0.0, 1.0);

  // Camera-facing part of the tube is the bright centreline; the silhouette
  // falls off, so a solid tube reads as a thin glowing curve.
  float body = pow(ndv, 1.35);

  // Travelling luminance so each curve fades in and out along its path
  // instead of sitting there as a uniform wire.
  float head = fract(vUv.x - uTime * uFlowSpeed);
  float pulse = smoothstep(0.0, uTail, head) * smoothstep(1.0, 1.0 - uTail, head);

  float lum = mix(uFloor, 1.0, pulse);

  // Some paths are beaded rather than solid, which is what keeps a set of
  // overlapping ellipses from reading as a wireframe cage.
  if (uDashCount > 0.5) {
    float phase = abs(fract(vUv.x * uDashCount) - 0.5);
    lum *= 1.0 - smoothstep(0.06, 0.17, phase);
  }

  vec3 col = mix(uColorA, uColorB, vUv.x) * uIntensity * lum * body * uPulse;

  gl_FragColor = vec4(col, clamp(max(max(col.r, col.g), col.b), 0.0, 1.0));
}
`;

export const fullscreenVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// Six additive shells stack well past 1.0 wherever their rims overlap.
// Clamping per channel would drag saturated lime and violet toward white, so
// scale all three together above the knee: the hue survives, only the
// intensity compresses. Runs before bloom so the threshold sees real values.
export const gradeFragment = /* glsl */ `
uniform sampler2D tDiffuse;
uniform float uKnee;

varying vec2 vUv;

void main() {
  vec4 c = texture2D(tDiffuse, vUv);
  float peak = max(max(c.r, c.g), c.b);
  c.rgb /= 1.0 + max(peak - uKnee, 0.0);
  gl_FragColor = c;
}
`;

// UnrealBloomPass writes alpha 1 across the whole target, which turns the
// canvas into an opaque rectangle over the page. Everything the orb draws is
// additive glow on black, so luminance is a faithful stand-in for coverage:
// empty pixels go fully transparent again and the hero background shows
// through untouched.
export const alphaRestoreFragment = /* glsl */ `
uniform sampler2D tDiffuse;
uniform float uGain;

varying vec2 vUv;

void main() {
  vec4 c = texture2D(tDiffuse, vUv);
  float lum = max(max(c.r, c.g), c.b);
  gl_FragColor = vec4(c.rgb, clamp(lum * uGain, 0.0, 1.0));
}
`;

export const pearlVertex = /* glsl */ `
varying vec3 vNormal;
varying vec3 vView;

void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * viewMatrix * world;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vView = normalize(cameraPosition - world.xyz);
}
`;

export const pearlFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uIntensity;

varying vec3 vNormal;
varying vec3 vView;

void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(vView);
  float ndv = clamp(abs(dot(n, v)), 0.0, 1.0);

  float rim = pow(1.0 - ndv, 1.8);
  float spec = pow(max(dot(n, normalize(vec3(-0.4, 0.8, 0.7))), 0.0), 18.0);

  vec3 col = uColor * (0.30 + rim * 1.25 + spec * 1.6) * uIntensity;
  gl_FragColor = vec4(col, clamp(max(max(col.r, col.g), col.b), 0.0, 1.0));
}
`;

export const sparkVertex = /* glsl */ `
attribute float aSize;
attribute float aPhase;
attribute vec3 aTint;

uniform float uTime;
uniform float uPixelRatio;

varying float vAlpha;
varying vec3 vTint;

void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float twinkle = 0.45 + 0.55 * sin(uTime * 0.6 + aPhase * 6.2831);
  gl_PointSize = aSize * uPixelRatio * twinkle * (2.2 / max(-mv.z, 0.6));
  vAlpha = twinkle;
  vTint = aTint;
}
`;

export const sparkFragment = /* glsl */ `
varying float vAlpha;
varying vec3 vTint;

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  if (d > 0.5) discard;
  float glow = pow(smoothstep(0.5, 0.0, d), 1.8);
  vec3 col = vTint * glow * vAlpha * 1.15;
  gl_FragColor = vec4(col, clamp(max(max(col.r, col.g), col.b), 0.0, 1.0));
}
`;
