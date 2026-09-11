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
const vec3 C_BLUE   = vec3(0.475, 0.812, 1.000);
const vec3 C_MINT   = vec3(0.392, 0.941, 0.867);
const vec3 C_LIME   = vec3(0.843, 1.000, 0.302);
const vec3 C_WHITE  = vec3(0.953, 1.000, 0.945);

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

  // Tight finite-difference stencil. A wide one quantises the normal into
  // flat patches, and the narrow edge term below raises that to a high power,
  // so a coarse epsilon shows up directly as facets along the bright rims.
  vec3 t1 = normalize(cross(dir, vec3(0.0, 1.0, 0.17)));
  vec3 t2 = normalize(cross(dir, t1));
  float e = 0.022;
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
uniform float uSpecPower;
uniform float uSpecGain;
uniform float uStreakGain;
uniform float uRefractGain;
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

  // Split into a broad translucent body and a narrow bright rim. A single
  // low-exponent fresnel spreads the rim into a wide fuzzy band, because near
  // a sphere's silhouette ndv changes slowly across the screen; pushing the
  // exponent up tightens that band to a crisp edge, and the raised base keeps
  // the interior present so the shell still reads as glass you see through
  // rather than an empty outline.
  float fres = 0.115 + 0.885 * pow(1.0 - ndv, uFresnelPower);

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

  // Clearcoat-style specular. A tight Blinn lobe puts small concentrated
  // glints on the curvature, which is how polished glass catches a light
  // source; a broad diffuse term just washes the whole shell out.
  vec3 hv = normalize(key + v);
  float spec = pow(max(dot(n, hv), 0.0), uSpecPower);

  // A second, far broader lobe from the same light. The tight one alone gives
  // pinpoint glints on an otherwise dark membrane; this one lays a soft sheen
  // gradient across the face of the shell, which is what makes a curved glass
  // surface read as a surface rather than as an outline with a dark hole.
  float sheen = pow(max(dot(n, hv), 0.0), 14.0);

  // The refracted ray lands on a different part of the colour wheel than the
  // reflection does, so the two layers disagree slightly. That disagreement
  // is what reads as looking *through* the shell rather than at it.
  vec3 rd = refract(-v, n, 0.72);
  float rhue = uHueShift + 0.42 + rd.y * 0.30 + rd.x * 0.17;
  vec3 refr = iridescence(rhue);

  // Caustic-like streaks. High frequency on one axis only, so they stretch
  // across the surface as light bands instead of tiling as isotropic noise.
  float streak = 0.5 + 0.5 * sin(vPos.y * 13.0 + vDisp * 5.5 + uTime * 0.05);
  streak = pow(streak, 4.0);

  vec3 col = mix(uTintDeep, irid, 0.78);
  col *= fres * shimmer * keyed * uIntensity * uPulse;

  col += refr * fres * uRefractGain * kd * uPulse;
  col += irid * edge * uEdgeGain * edgeKey * uPulse;
  col += C_WHITE * spec * uSpecGain * uPulse;
  col += mix(irid, C_WHITE, 0.4) * sheen * uSpecGain * 0.5 * uPulse;
  col += C_WHITE * streak * fres * uStreakGain * kd * uPulse;

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
uniform vec3 uKeyDir;
uniform float uTime;
uniform float uPulse;
uniform float uRimGain;
uniform float uSpecGain;
uniform vec2 uPointer;

varying vec3 vNormal;
varying vec3 vView;
varying vec3 vPos;
varying float vDisp;

void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(vView);
  float ndv = clamp(abs(dot(n, v)), 0.0, 1.0);

  // Three rim widths rather than one. The broad term is atmosphere, the mid
  // term is the glass wall's apparent thickness, and the tight term is the
  // luminous boundary itself. Together they give the core a readable shell
  // instead of a single soft gradient.
  float halo = pow(1.0 - ndv, 1.7);
  float wall = pow(1.0 - ndv, 4.5);
  float edge = pow(1.0 - ndv, 13.0);

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

  vec3 key = normalize(uKeyDir + vec3(uPointer.x * 0.25, uPointer.y * 0.2, 0.0));
  float kd = max(dot(n, key), 0.0);
  vec3 hv = normalize(key + v);
  float spec = pow(max(dot(n, hv), 0.0), 90.0);

  // Deliberately near-black through the middle. The core is the darkest part
  // of the sculpture; almost all of its colour lives in the rim.
  vec3 col = uCoreDark * (0.16 + swirl * 0.52 + spiral * 0.20);

  // Interior scatter: the far side of the glass shell glowing faintly through
  // the volume, brightest where the key light enters.
  col += rimCol * halo * 0.13 * (0.35 + 0.65 * kd) * uPulse;
  col += rimCol * wall * 0.42 * uRimGain * uPulse;
  col += rimCol * edge * 1.85 * uRimGain * uPulse;
  col += C_WHITE * spec * uSpecGain * uPulse;

  // Opaque enough to occlude the shells behind it, translucent enough that
  // the interior still reads as glass rather than a solid ball.
  float alpha = clamp(0.72 + wall * 0.24, 0.0, 1.0);
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

// One shader drives both trail layers. The crisp core pass uses the higher
// uCorePower on a narrow tube; the glow pass uses a low one on a much wider
// tube at a fraction of the intensity.
export const filamentFragment = /* glsl */ `
${PALETTE}

uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;
uniform float uTime;
uniform float uIntensity;
uniform float uFlowSpeed;
uniform float uTail;
uniform float uFloor;
uniform float uPulse;
uniform float uDashCount;
uniform float uCorePower;
uniform float uWhiteMix;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vView;

void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(vView);
  float ndv = clamp(abs(dot(n, v)), 0.0, 1.0);

  // The tube is deliberately several pixels across and the brightness is
  // concentrated into its centreline by this exponent. That yields a sharp
  // core with a smoothly falling edge, which resolves far better than a
  // sub-pixel tube -- that just breaks up into a dotted, aliased line.
  float body = pow(ndv, uCorePower);

  // Travelling luminance so each curve brightens and fades along its path
  // instead of sitting there as a uniform wire.
  float head = fract(vUv.x - uTime * uFlowSpeed);
  float pulse = smoothstep(0.0, uTail, head) * smoothstep(1.0, 1.0 - uTail, head);
  float lum = mix(uFloor, 1.0, pulse);

  // Some paths are beaded rather than solid, which keeps a set of
  // overlapping ellipses from reading as a wireframe cage.
  if (uDashCount > 0.5) {
    float phase = abs(fract(vUv.x * uDashCount) - 0.5);
    lum *= 1.0 - smoothstep(0.09, 0.20, phase);
  }

  // Three stops, so the hue drifts along the curve instead of blending two
  // colours linearly from end to end.
  float t = vUv.x;
  vec3 tint = t < 0.5 ? mix(uColorA, uColorB, t * 2.0) : mix(uColorB, uColorC, (t - 0.5) * 2.0);

  // Only the very peak of the travelling head goes white-hot.
  tint = mix(tint, C_WHITE, uWhiteMix * pow(pulse, 4.0));

  vec3 col = tint * uIntensity * lum * body * uPulse;
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

// Seven additive shells stack well past 1.0 wherever their rims overlap.
// Clamping per channel would drag saturated lime and violet toward white, so
// instead scale all three by a shared filmic shoulder: hue and saturation
// survive, only intensity compresses, and mid-tones below the knee stay
// completely untouched so fine detail keeps its contrast. Runs last, after
// bloom, so the scene and its glow are compressed together.
export const gradeFragment = /* glsl */ `
uniform sampler2D tDiffuse;
uniform float uKnee;

varying vec2 vUv;

void main() {
  vec4 c = texture2D(tDiffuse, vUv);
  float peak = max(max(c.r, c.g), c.b);
  if (peak > uKnee) {
    // The shoulder asymptotes to exactly 1.0, so no accumulation however
    // bright ever clips: a rim at 5.0 and a rim at 2.0 still land on
    // different values instead of both flattening to white. That headroom is
    // what lets the bright features be genuinely bright while the glass body
    // below the knee keeps its full contrast.
    float range = 1.0 - uKnee;
    float over = peak - uKnee;
    float rolled = uKnee + range * over / (over + range);
    c.rgb *= rolled / peak;
  }
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

// Glass bead rather than a glowing ball: dark through the middle, bright at
// the rim, with one tight specular dot.
export const pearlFragment = /* glsl */ `
${PALETTE}

uniform vec3 uColor;
uniform float uIntensity;

varying vec3 vNormal;
varying vec3 vView;

void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(vView);
  float ndv = clamp(abs(dot(n, v)), 0.0, 1.0);

  vec3 key = normalize(vec3(-0.4, 0.8, 0.7));
  float rim = pow(1.0 - ndv, 2.4);
  vec3 hv = normalize(key + v);
  float spec = pow(max(dot(n, hv), 0.0), 48.0);

  vec3 col = uColor * (0.10 + rim * 1.5) * uIntensity;
  col += C_WHITE * spec * 1.1 * uIntensity;
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
  // Tight centre with a wide faint skirt, so each spark reads as a pinpoint
  // with a halo rather than a soft dot.
  float core = pow(smoothstep(0.5, 0.0, d), 5.0);
  float halo = pow(smoothstep(0.5, 0.0, d), 1.6);
  vec3 col = vTint * (core * 1.5 + halo * 0.22) * vAlpha;
  gl_FragColor = vec4(col, clamp(max(max(col.r, col.g), col.b), 0.0, 1.0));
}
`;
