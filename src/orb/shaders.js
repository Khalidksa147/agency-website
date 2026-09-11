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

float fbm(vec3 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 5; i++) {
    sum += amp * snoise(p);
    p = p * 2.03 + vec3(0.17, 0.31, 0.11);
    amp *= 0.5;
  }
  return sum;
}

float fbm3(vec3 p) {
  float sum = 0.0;
  float amp = 0.5;
  sum += amp * snoise(p); p = p * 2.04 + vec3(0.17, 0.31, 0.11); amp *= 0.5;
  sum += amp * snoise(p); p = p * 2.04 + vec3(0.11, 0.27, 0.19); amp *= 0.5;
  sum += amp * snoise(p);
  return sum;
}

vec3 domainWarp(vec3 p, float t) {
  vec3 q = vec3(
    fbm3(p + vec3(0.0, t, 1.4)),
    fbm3(p + vec3(5.2, 1.3, -t * 0.65)),
    fbm3(p + vec3(-2.1, t * 0.4, 3.7))
  );
  return p + q * 0.55;
}
`;

export const energyVertex = /* glsl */ `
${NOISE}

uniform float uTime;
uniform float uAmp;

varying vec3 vNormal;
varying vec3 vViewDir;
varying vec3 vObjPos;
varying float vNoise;

vec3 displace(vec3 pos) {
  float n = snoise(pos * 1.7 + vec3(0.0, uTime * 0.18, 0.0));
  float n2 = snoise(pos * 3.4 + vec3(uTime * 0.12, 0.0, -uTime * 0.08));
  return pos + normalize(pos) * (n * 0.62 + n2 * 0.38) * uAmp;
}

void main() {
  vec3 p = displace(position);
  vec4 world = modelMatrix * vec4(p, 1.0);
  vec4 mv = viewMatrix * world;
  gl_Position = projectionMatrix * mv;

  vObjPos = p;
  vNoise = snoise(p * 1.6 + vec3(0.0, uTime * 0.16, 0.0));
  vNormal = normalize(normalMatrix * normalize(position));
  vViewDir = normalize(cameraPosition - world.xyz);
}
`;

export const energyFragment = /* glsl */ `
${NOISE}

uniform float uTime;
uniform vec3 uDeep;
uniform vec3 uMid;
uniform vec3 uLime;
uniform vec3 uCyan;

varying vec3 vNormal;
varying vec3 vViewDir;
varying vec3 vObjPos;
varying float vNoise;

void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(vViewDir);
  float fresnel = pow(1.0 - abs(dot(n, v)), 2.2);

  float n1 = snoise(vObjPos * 2.1 + vec3(0.0, uTime * 0.16, 0.0));
  float n2 = snoise(vObjPos * 3.6 + vec3(uTime * 0.12, 0.2, -uTime * 0.09));
  float n3 = snoise(vObjPos * 6.2 - vec3(0.0, uTime * 0.2, 0.1));
  float swirl = 0.5 + 0.5 * n1;
  float veins = smoothstep(0.15, 0.72, swirl + n2 * 0.35);

  vec3 col = mix(uDeep, uMid, swirl * 0.72);
  col = mix(col, uLime, veins * 0.58);
  col = mix(col, uCyan, smoothstep(0.25, 0.9, n2) * 0.3);
  col += max(n3, 0.0) * uLime * 0.2;
  col += fresnel * mix(uCyan, uLime, 0.4) * 0.36;

  float alpha = 0.88 + fresnel * 0.1;
  gl_FragColor = vec4(col, alpha);
}
`;

export const mistVertex = /* glsl */ `
${NOISE}

uniform float uTime;
varying vec3 vNormal;
varying vec3 vViewDir;

void main() {
  float n = fbm(position * 1.2 + uTime * 0.08);
  vec3 p = position + normal * n * 0.045;
  vec4 world = modelMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * viewMatrix * world;
  vNormal = normalize(normalMatrix * normal);
  vViewDir = normalize(cameraPosition - world.xyz);
}
`;

export const mistFragment = /* glsl */ `
uniform vec3 uColor;
varying vec3 vNormal;
varying vec3 vViewDir;

void main() {
  float fresnel = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewDir))), 3.2);
  float alpha = fresnel * 0.38;
  gl_FragColor = vec4(uColor * (0.55 + fresnel), alpha);
}
`;

export const glassVertex = /* glsl */ `
varying vec3 vNormal;
varying vec3 vViewDir;
varying vec3 vWorldPos;

void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * viewMatrix * world;
  vWorldPos = world.xyz;
  vNormal = normalize(normalMatrix * normal);
  vViewDir = normalize(cameraPosition - world.xyz);
}
`;

export const glassFragment = /* glsl */ `
uniform vec3 uTint;
uniform vec3 uRim;
varying vec3 vNormal;
varying vec3 vViewDir;
varying vec3 vWorldPos;

void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(vViewDir);
  float ndv = abs(dot(n, v));
  float fresnel = pow(1.0 - ndv, 2.8);
  float spec = pow(max(dot(n, normalize(v + vec3(-0.35, 0.7, 0.45))), 0.0), 48.0);
  float spec2 = pow(max(dot(n, normalize(v + vec3(0.6, -0.2, 0.3))), 0.0), 24.0);

  vec3 col = uTint * 0.22;
  col += uRim * fresnel * 0.85;
  col += vec3(0.92, 0.98, 0.88) * spec * 0.85;
  col += vec3(0.55, 0.86, 1.0) * spec2 * 0.18;

  float alpha = 0.05 + fresnel * 0.42 + spec * 0.2;
  gl_FragColor = vec4(col, alpha);
}
`;

export const dustVertex = /* glsl */ `
attribute float aSize;
attribute float aAlpha;
uniform float uPixelRatio;
varying float vAlpha;

void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uPixelRatio * (1.15 / max(-mv.z, 0.4));
  vAlpha = aAlpha;
}
`;

export const dustFragment = /* glsl */ `
uniform vec3 uColor;
varying float vAlpha;

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  if (d > 0.5) discard;
  float glow = smoothstep(0.5, 0.08, d);
  gl_FragColor = vec4(uColor, glow * vAlpha);
}
`;
