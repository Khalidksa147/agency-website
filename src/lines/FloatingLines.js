/**
 * Floating line background — WebGL2 (no Three.js).
 * Visual language matches React Bits Floating Lines:
 * https://reactbits.dev/backgrounds/floating-lines
 */

const VERTEX = `#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const FRAGMENT = `#version 300 es
precision highp float;

uniform float iTime;
uniform vec2 iResolution;
uniform float uSpeed;
uniform float uIntensity;
uniform float uLineDistance;
uniform vec3 uTopPos;
uniform vec3 uMidPos;
uniform vec3 uGradient[8];
uniform int uGradientCount;
uniform float uOpacity;

out vec4 outColor;

mat2 rotate(float r) {
  float c = cos(r);
  float s = sin(r);
  return mat2(c, s, -s, c);
}

vec3 getLineColor(float t) {
  if (uGradientCount <= 1) return uGradient[0];
  float clampedT = clamp(t, 0.0, 0.9999);
  float scaled = clampedT * float(uGradientCount - 1);
  int idx = int(floor(scaled));
  float f = fract(scaled);
  int idx2 = min(idx + 1, uGradientCount - 1);
  return mix(uGradient[idx], uGradient[idx2], f);
}

float wave(vec2 uv, float offset, float time) {
  float amp = sin(offset + time * 0.2) * 0.3;
  float y = sin(uv.x + offset + time * 0.1) * amp;
  float m = uv.y - y;
  return 0.014 / max(abs(m) + 0.014, 1e-3) + 0.004;
}

vec3 band(vec2 uv, vec3 pos, float flip, float light, float time, int count) {
  vec3 col = vec3(0.0);
  float angle = pos.z * log(length(uv) + 1.0);
  vec2 ruv = uv * rotate(angle);
  if (flip > 0.5) ruv.x = -ruv.x;
  for (int i = 0; i < 10; ++i) {
    if (i >= count) break;
    float fi = float(i);
    float t = count > 1 ? fi / float(count - 1) : 0.0;
    vec3 lineCol = getLineColor(t) * 0.55;
    float offset = 1.0 + 0.2 * fi;
    col += lineCol * wave(
      ruv + vec2(uLineDistance * fi + pos.x, pos.y),
      offset,
      time
    ) * light;
  }
  return col;
}

void main() {
  vec2 uv = (2.0 * gl_FragCoord.xy - iResolution) / iResolution.y;
  uv.y *= -1.0;
  float time = iTime * uSpeed;

  vec3 col = vec3(0.0);
  col += band(uv, uTopPos, 1.0, 0.2, time, 6);
  col += band(uv, uMidPos, 0.0, 0.28, time, 6);
  col *= uIntensity;

  float edge = smoothstep(0.0, 0.1, gl_FragCoord.x / iResolution.x)
    * smoothstep(0.0, 0.1, 1.0 - gl_FragCoord.x / iResolution.x);
  col *= edge * uOpacity;

  float alpha = clamp(max(col.r, max(col.g, col.b)), 0.0, 1.0);
  outColor = vec4(col, alpha);
}`;

function themeStops() {
  const css = getComputedStyle(document.documentElement);
  const read = (name, fallback) => css.getPropertyValue(name).trim() || fallback;
  return [read('--cyan', '#64f0dd'), read('--lime', '#d7ff4d'), read('--violet', '#9877ff')];
}

function hexToRgb(hex) {
  let value = String(hex).trim();
  if (value.startsWith('#')) value = value.slice(1);
  if (value.length === 3) {
    value = value[0] + value[0] + value[1] + value[1] + value[2] + value[2];
  }
  const n = parseInt(value, 16);
  if (Number.isNaN(n)) return [1, 1, 1];
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  console.warn('[FloatingLines] shader compile failed', gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
  return null;
}

function link(gl) {
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.bindAttribLocation(program, 0, 'aPosition');
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn('[FloatingLines] link failed', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  const uniforms = {};
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < count; i += 1) {
    const info = gl.getActiveUniform(program, i);
    if (info) uniforms[info.name.replace('[0]', '')] = gl.getUniformLocation(program, info.name);
  }
  return { program, uniforms };
}

/**
 * @param {HTMLElement | null} root
 * @param {Record<string, unknown>} [options]
 */
export function initFloatingLines(root, options = {}) {
  if (!root) return null;
  if (root.dataset.floatingLinesReady === '1') return { destroy() {} };
  root.dataset.floatingLinesReady = '1';

  const colors = (options.linesGradient || themeStops()).slice(0, 8);
  const speed = options.animationSpeed ?? 0.55;
  const intensity = options.brightness ?? options.intensity ?? 1.45;
  const lineDistance = ((options.lineDistance ?? 7) * 0.01);
  const opacity = options.opacity ?? 1;
  const mixBlendMode = options.mixBlendMode ?? 'screen';

  root.classList.add('floating-lines-container');
  root.style.mixBlendMode = mixBlendMode;
  root.replaceChildren();

  const canvas = document.createElement('canvas');
  canvas.className = 'floating-lines-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  root.appendChild(canvas);

  const gl = canvas.getContext('webgl2', {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'low-power',
  });
  if (!gl) {
    delete root.dataset.floatingLinesReady;
    root.replaceChildren();
    return null;
  }

  const linked = link(gl);
  if (!linked) {
    delete root.dataset.floatingLinesReady;
    root.replaceChildren();
    return null;
  }
  const { program, uniforms: u } = linked;

  const buffer = gl.createBuffer();
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);

  const gradient = new Float32Array(8 * 3);
  for (let i = 0; i < 8; i += 1) {
    const rgb = hexToRgb(colors[Math.min(i, colors.length - 1)] || '#ffffff');
    gradient.set(rgb, i * 3);
  }

  const mqMobile = window.matchMedia('(max-width: 767px)');
  const mqTablet = window.matchMedia('(max-width: 1024px)');

  const topY = () => (mqMobile.matches ? 0.3 : mqTablet.matches ? 0.34 : 0.55);

  let raf = 0;
  let start = performance.now();
  let last = 0;
  let destroyed = false;
  let sizeW = 0;
  let sizeH = 0;

  const render = (now) => {
    const t = (now - start) / 1000;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.bindVertexArray(vao);
    gl.uniform1f(u.iTime, t);
    gl.uniform2f(u.iResolution, canvas.width, canvas.height);
    gl.uniform1f(u.uSpeed, speed);
    gl.uniform1f(u.uIntensity, intensity);
    gl.uniform1f(u.uLineDistance, lineDistance);
    gl.uniform3f(u.uTopPos, 10, topY(), -0.4);
    gl.uniform3f(u.uMidPos, 5, 0.05, 0.2);
    gl.uniform3fv(u.uGradient, gradient);
    gl.uniform1i(u.uGradientCount, colors.length);
    gl.uniform1f(u.uOpacity, opacity);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const frame = (now) => {
    raf = 0;
    if (destroyed || document.hidden) return;
    // Cap dt so tab-resume doesn't jump
    if (last && now - last > 100) start += now - last - 16;
    last = now;
    try {
      render(now);
    } catch (err) {
      console.warn('[FloatingLines] frame error', err);
      return;
    }
    if (!destroyed && !document.hidden) raf = requestAnimationFrame(frame);
  };

  const wake = () => {
    if (!destroyed && !raf && !document.hidden) raf = requestAnimationFrame(frame);
  };

  const resize = () => {
    const width = Math.max(1, Math.round(root.clientWidth || 1));
    const height = Math.max(1, Math.round(root.clientHeight || 1));
    // Ignore mobile URL-bar height jitter
    if (mqMobile.matches && sizeW && Math.abs(width - sizeW) <= 24) {
      if (Math.abs(height - sizeH) > 0 && Math.abs(width - sizeW) <= 24) return;
    }
    sizeW = width;
    sizeH = height;
    const dpr = Math.min(window.devicePixelRatio || 1, mqMobile.matches ? 1.25 : 1.75);
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    render(performance.now());
    wake();
  };

  const onVisibility = () => {
    last = 0;
    wake();
  };

  const ro = new ResizeObserver(resize);
  ro.observe(root);
  mqMobile.addEventListener('change', resize);
  mqTablet.addEventListener('change', resize);
  document.addEventListener('visibilitychange', onVisibility);
  resize();

  return {
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      mqMobile.removeEventListener('change', resize);
      mqTablet.removeEventListener('change', resize);
      document.removeEventListener('visibilitychange', onVisibility);
      gl.deleteProgram(program);
      gl.deleteBuffer(buffer);
      gl.deleteVertexArray(vao);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      root.replaceChildren();
      delete root.dataset.floatingLinesReady;
      root.classList.remove('floating-lines-container');
      root.style.mixBlendMode = '';
    },
  };
}
