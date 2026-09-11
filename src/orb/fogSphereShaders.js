export const MAX_STEPS = 32;
export const MAX_TURB = 10;

export const fullscreenVertex = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const fogFragment = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform vec2 uResolution;
uniform float uPhase;
uniform float uRotation;
uniform float uRadius;
uniform float uCamDist;
uniform float uFov;
uniform vec2 uOffset;
uniform float uZoom;
uniform float uOpacity;

uniform int uSteps;
uniform int uTurbIters;
uniform float uTurbAmplitude;
uniform float uTurbFrequency;
uniform float uTurbExponent;

uniform float uDensity;
uniform float uAbsorption;
uniform float uPassthrough;
uniform float uBrightness;
uniform float uColorMix;

uniform vec3 uPrimary;
uniform vec3 uSecondary;
uniform vec3 uCool;
uniform vec3 uViolet;
uniform vec3 uLime;

const int MAX_STEPS = ${MAX_STEPS};
const int MAX_TURB = ${MAX_TURB};

float hash13(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.zyx + 31.32);
  return fract((p.x + p.y) * p.z);
}

float vnoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);

  float n000 = hash13(i + vec3(0.0, 0.0, 0.0));
  float n100 = hash13(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash13(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash13(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash13(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash13(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash13(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash13(i + vec3(1.0, 1.0, 1.0));

  return mix(
    mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
    mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
    f.z
  );
}

// Cheap sin-based domain warp. This is what gives the volume its
// smoke-like filaments without needing many noise octaves.
vec3 turbulence(vec3 p) {
  vec3 q = p;
  float freq = uTurbFrequency * 0.34;
  float amp = uTurbAmplitude * 0.34;

  for (int i = 0; i < MAX_TURB; i++) {
    if (i >= uTurbIters) break;
    q += amp * sin(q.yzx * freq + uPhase * (0.45 + 0.08 * float(i))) / freq;
    freq *= uTurbExponent;
    amp *= 0.88;
  }

  return q;
}

float fogDensity(vec3 p, out float shaped) {
  float invR = 1.0 / uRadius;
  float r = length(p) * invR;
  shaped = 0.0;
  if (r > 1.0) return 0.0;

  // Continuous falloff rather than a plateau: density thins out across the
  // whole outer half so the silhouette never reads as a hard edge.
  float shell = pow(smoothstep(1.0, 0.08, r), 1.15);
  float hollow = smoothstep(0.0, 0.50, r);
  float envelope = shell * mix(0.30, 1.0, hollow);

  // Shear the domain around Y by an amount that falls off with radius. The
  // noise formations get dragged into slow vortex bands instead of sitting
  // as isotropic blobs.
  float swirl = (1.0 - r) * 1.25 + uPhase * 0.10;
  float cs = cos(swirl);
  float ss = sin(swirl);
  vec3 sp = vec3(cs * p.x - ss * p.z, p.y, ss * p.x + cs * p.z);

  vec3 q = turbulence(sp * 0.45 + vec3(1.7, -0.6, 2.3));

  // Low frequency carries the main body; the second octave is detail only.
  // Anything finer than this averages out along the ray and reads as mush.
  float n1 = vnoise(q * 1.20 + vec3(0.0, uPhase * 0.14, 0.0));
  float n2 = vnoise(q * 2.60 - vec3(uPhase * 0.09, 0.0, uPhase * 0.05));
  float field = n1 * 0.74 + n2 * 0.26;

  shaped = smoothstep(0.34, 0.64, field);

  // A narrow band plus a low floor gives distinct banks of fog with real
  // voids between them. A high floor here collapses the whole volume into
  // a uniform radial gradient.
  float body = mix(0.14, 1.0, shaped);
  return envelope * body * uDensity;
}

// Single internal light, upper-left and toward the camera.
vec3 lightPosition() {
  return vec3(-0.55, 0.62, 1.15) * uRadius;
}

vec3 fogColor(vec3 p, float shaped, float shadow) {
  float invR = 1.0 / uRadius;
  vec3 n = p * invR;
  float r = length(n);

  float up = clamp(n.y * 0.5 + 0.5, 0.0, 1.0);
  float side = clamp(n.x * 0.5 + 0.5, 0.0, 1.0);
  float depth = clamp(n.z * 0.5 + 0.5, 0.0, 1.0);

  float glow = exp(-length(p - lightPosition()) * 0.38);

  vec3 col = mix(uSecondary, uPrimary, smoothstep(0.15, 0.85, up));
  col = mix(col, uCool, smoothstep(0.45, 1.0, up) * uColorMix * 1.05);
  col = mix(col, uViolet, smoothstep(0.38, 0.0, up) * smoothstep(0.62, 0.0, side) * uColorMix * 1.25);
  col = mix(col, uLime, smoothstep(0.42, 0.92, glow) * smoothstep(0.55, 1.0, shaped) * 0.28);

  float lum = 0.22 + 2.1 * glow;
  lum *= mix(0.55, 1.55, shaped);
  lum *= mix(1.0, 1.3, depth);
  // Self-shadowing is what separates lit banks of fog from the voids
  // behind them; without it the march integrates to a flat average.
  lum *= mix(0.32, 1.0, shadow);
  // Translucent, unlit core.
  lum *= mix(0.42, 1.0, smoothstep(0.06, 0.52, r));
  col *= lum * uBrightness;

  // Cool illumination where the volume thins out against the background.
  col += uCool * smoothstep(0.68, 0.98, r) * shaped * 0.22;

  // Hue-preserving soft knee. Clamping per channel would desaturate bright
  // wisps toward grey and shift the violet into lavender; this leaves the
  // mid-tones untouched and only compresses what would overflow.
  float peak = max(max(col.r, col.g), col.b);
  col /= 1.0 + max(peak - 0.78, 0.0);

  return col;
}

void main() {
  vec2 frag = vUv * uResolution;
  float m = min(uResolution.x, uResolution.y);
  vec2 uv = (frag - 0.5 * uResolution) / m;
  uv = uv * uZoom + uOffset;

  vec3 ro = vec3(0.0, 0.0, uCamDist);
  vec3 rd = normalize(vec3(uv * 2.0 * uFov, -1.0));

  float b = dot(ro, rd);
  float c = dot(ro, ro) - uRadius * uRadius;
  float h = b * b - c;

  if (h < 0.0) {
    gl_FragColor = vec4(0.0);
    return;
  }

  h = sqrt(h);
  float t0 = max(-b - h, 0.0);
  float t1 = -b + h;
  if (t1 <= t0) {
    gl_FragColor = vec4(0.0);
    return;
  }

  float ca = cos(uRotation);
  float sa = sin(uRotation);
  mat3 spin = mat3(ca, 0.0, -sa, 0.0, 1.0, 0.0, sa, 0.0, ca);
  float tiltC = cos(0.24);
  float tiltS = sin(0.24);
  mat3 tilt = mat3(1.0, 0.0, 0.0, 0.0, tiltC, tiltS, 0.0, -tiltS, tiltC);
  mat3 volume = tilt * spin;

  float steps = float(uSteps);
  float stepSize = (t1 - t0) / steps;

  // Static per-pixel jitter breaks up ray-march banding without
  // introducing frame-to-frame flicker.
  float jitter = hash13(vec3(frag, 7.13));
  float t = t0 + jitter * stepSize;

  vec3 acc = vec3(0.0);
  float alpha = 0.0;

  for (int i = 0; i < MAX_STEPS; i++) {
    if (i >= uSteps || alpha > 0.985) break;

    vec3 p = volume * (ro + rd * t);
    float shaped;
    float d = fogDensity(p, shaped);

    if (d > 0.0015) {
      float occluder;
      vec3 ldir = normalize(lightPosition() - p);
      float dl = fogDensity(p + ldir * 1.4, occluder);
      float shadow = exp(-dl * 4.0);

      float a = 1.0 - exp(-d * stepSize * uAbsorption);
      vec3 col = fogColor(p, shaped, shadow);
      acc += (1.0 - alpha) * a * col;
      alpha += (1.0 - alpha) * a;
    }

    t += stepSize;
  }

  // Clip the faintest haze so the canvas dissolves completely into the page
  // background instead of leaving a visible rectangle. Colour is stored
  // premultiplied, so it has to be rescaled by the same factor as alpha.
  float clipped = max(alpha - uPassthrough, 0.0) / max(1.0 - uPassthrough, 0.0001);
  acc *= alpha > 0.0 ? clipped / alpha : 0.0;
  alpha = clipped;

  gl_FragColor = vec4(acc * uOpacity, alpha * uOpacity);
}
`;

export const blurFragment = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform sampler2D uTexture;
uniform vec2 uTexel;
uniform vec2 uDirection;
uniform float uRadius;

void main() {
  vec2 step = uTexel * uDirection * uRadius;

  vec4 sum = texture2D(uTexture, vUv) * 0.2270270270;
  sum += texture2D(uTexture, vUv + step * 1.3846153846) * 0.3162162162;
  sum += texture2D(uTexture, vUv - step * 1.3846153846) * 0.3162162162;
  sum += texture2D(uTexture, vUv + step * 3.2307692308) * 0.0702702703;
  sum += texture2D(uTexture, vUv - step * 3.2307692308) * 0.0702702703;

  gl_FragColor = sum;
}
`;