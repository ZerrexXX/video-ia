// Briques procédurales communes : textures canvas, matériaux, décors, personnage, particules.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const W = 1080, H = 1920;
export const SODIUM = 0xff9a3c, NAVY = 0x1d3068, RED = 0xc81f26, FUR = 0x8f959c, SKIN = 0xc9916c;

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const prog = (t, a, b) => clamp((t - a) / (b - a));
export const ease = (x) => x * x * (3 - 2 * x);
export const easeOut = (x) => 1 - Math.pow(1 - x, 3);
export const easeIn = (x) => x * x * x;
export const lerp = (a, b, k) => a + (b - a) * k;
export const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------- textures ----------
export function cv(w, h, fn, srgb = true) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  fn(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
const cache = {};
const memo = (k, f) => cache[k] || (cache[k] = f());

export const glowTex = () => memo('glow', () => cv(256, 256, (g) => {
  const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.08, 'rgba(255,255,255,0.75)');
  r.addColorStop(0.25, 'rgba(255,255,255,0.28)'); r.addColorStop(0.55, 'rgba(255,255,255,0.07)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 256, 256);
}));
export const dotTex = () => memo('dot', () => cv(64, 64, (g) => {
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,0.8)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
}));
export const bokehTex = () => memo('bokeh', () => cv(128, 128, (g) => {
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 62);
  r.addColorStop(0, 'rgba(255,255,255,0.55)'); r.addColorStop(0.8, 'rgba(255,255,255,0.65)');
  r.addColorStop(0.92, 'rgba(255,255,255,0.95)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
}));
export const puffTex = (k = 0) => memo('puff' + k, () => cv(256, 256, (g) => {
  const R = rng(77 + k * 13);
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 26; i++) {
    const a = R() * 6.28, d = R() * 62, rr = 30 + R() * 46;
    const x = 128 + Math.cos(a) * d, y = 128 + Math.sin(a) * d;
    const r = g.createRadialGradient(x, y, 0, x, y, rr);
    r.addColorStop(0, 'rgba(255,255,255,0.22)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, 256, 256);
  }
}));
export const noiseTex = () => memo('noise', () => {
  const t = cv(256, 256, (g) => {
    const R = rng(5);
    g.fillStyle = '#808080'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 9000; i++) {
      const v = (R() * 255) | 0;
      g.fillStyle = `rgba(${v},${v},${v},0.5)`;
      g.fillRect(R() * 256, R() * 256, 1 + R() * 3, 1 + R() * 3);
    }
  }, false);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
});
export const woodTex = () => memo('wood', () => {
  const t = cv(512, 256, (g) => {
    const R = rng(9);
    g.fillStyle = '#5a3c26'; g.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 260; i++) {
      const y = R() * 256, v = R();
      g.strokeStyle = v > 0.5 ? 'rgba(120,84,52,0.35)' : 'rgba(30,16,8,0.4)';
      g.lineWidth = 0.5 + R() * 2;
      g.beginPath(); g.moveTo(0, y);
      g.bezierCurveTo(150, y + R() * 8 - 4, 350, y + R() * 8 - 4, 512, y + R() * 6 - 3); g.stroke();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
});

// givre : R = cristaux en fougère, G = bruit doux (ordre d'arrivée du givre)
export const frostTex = () => memo('frost', () => {
  const t = cv(1024, 1024, (g) => {
    const R = rng(21);
    g.fillStyle = '#000'; g.fillRect(0, 0, 1024, 1024);
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 60; i++) {
      const x = R() * 1024, y = R() * 1024, rr = 60 + R() * 160;
      const r = g.createRadialGradient(x, y, 0, x, y, rr);
      r.addColorStop(0, 'rgba(0,255,0,0.3)'); r.addColorStop(1, 'rgba(0,255,0,0)');
      g.fillStyle = r; g.fillRect(0, 0, 1024, 1024);
    }
    const fern = (x, y, a, len, w, depth) => {
      if (depth <= 0 || len < 5) return;
      const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
      g.strokeStyle = `rgba(255,0,0,${0.35 + 0.2 * depth})`; g.lineWidth = w;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke();
      const n = 3 + depth * 2;
      for (let i = 1; i <= n; i++) {
        const k = i / (n + 1), bx = x + (x2 - x) * k, by = y + (y2 - y) * k;
        const l = len * (0.5 - 0.3 * k) * (0.7 + R() * 0.5);
        fern(bx, by, a + 0.95 + R() * 0.2, l, w * 0.6, depth - 1);
        fern(bx, by, a - 0.95 - R() * 0.2, l, w * 0.6, depth - 1);
      }
      fern(x2, y2, a + (R() - 0.5) * 0.5, len * 0.72, w * 0.8, depth - 1);
    };
    for (let i = 0; i < 46; i++) {
      const side = i % 4, p = R() * 1024;
      const [x, y, a] = side === 0 ? [p, 0, 1.57] : side === 1 ? [p, 1024, -1.57] : side === 2 ? [0, p, 0] : [1024, p, 3.14];
      fern(x, y, a + (R() - 0.5) * 1.2, 110 + R() * 150, 5, 3);
    }
    for (let i = 0; i < 26; i++) fern(R() * 1024, R() * 1024, R() * 6.28, 70 + R() * 90, 4, 3);
    for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(255,0,0,${R() * 0.5})`; g.fillRect(R() * 1024, R() * 1024, 2, 2); }
  }, false);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
});

export function frostMaterial(o = {}) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: {
      map: { value: frostTex() }, grow: { value: o.grow ?? 1 }, haze: { value: o.haze ?? 0.25 },
      color: { value: new THREE.Color(o.color ?? 0xdcecff) }, bright: { value: o.bright ?? 1 },
      hole: { value: new THREE.Vector4(0.5, 0.5, 0, 1) }, rep: { value: o.rep ?? 1 },
    },
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `
      uniform sampler2D map; uniform float grow, haze, bright, rep; uniform vec3 color; uniform vec4 hole; varying vec2 vUv;
      void main(){
        vec4 t = texture2D(map, vUv*rep);
        float n = texture2D(map, vUv*0.41+0.13).g;
        float edge = min(min(vUv.x,1.-vUv.x), min(vUv.y,1.-vUv.y))*2.;
        float arrive = edge*0.85 + n*0.3;
        float m = smoothstep(arrive-0.02, arrive+0.12, grow*1.3);
        float a = m*clamp(t.r*1.5 + haze*(0.6+n) + (1.-smoothstep(0.,0.25,edge))*0.6, 0., 1.);
        vec2 d = (vUv-hole.xy)*vec2(hole.w,1.);
        float dh = length(d)/max(hole.z,1e-4) + (n-0.3)*0.35;
        a *= smoothstep(0.85,1.05,dh);
        gl_FragColor = vec4(color*bright*(0.75+0.5*t.r), a);
      }`,
  });
}

export function facadeTex(seed, cols, floors, px = 64, lit = 0.5) {
  const R = rng(seed), cw = px, ch = Math.round(px * 1.4);
  const wins = [];
  for (let f = 0; f < floors; f++) for (let c = 0; c < cols; c++) {
    const on = R() < lit;
    const col = on ? ['#ffcf7a', '#ffb65a', '#ffd9a0', '#ffc46a', '#bfe0ff', '#ffa94a'][(R() * 6) | 0] : null;
    wins.push({ f, c, on, col, cur: R(), bal: R() < 0.3 });
  }
  const draw = (g, emissive) => {
    g.fillStyle = emissive ? '#000' : '#7d8590'; g.fillRect(0, 0, cols * cw, floors * ch);
    if (!emissive) {
      const R2 = rng(seed + 1);
      for (let i = 0; i < cols * floors * 6; i++) {
        g.fillStyle = `rgba(${R2() > 0.5 ? '255,255,255' : '20,26,36'},${R2() * 0.07})`;
        g.fillRect(R2() * cols * cw, R2() * floors * ch, 6 + R2() * 30, 6 + R2() * 40);
      }
      g.strokeStyle = 'rgba(30,36,46,0.75)'; g.lineWidth = Math.max(1, px / 40);
      for (let f = 0; f <= floors; f++) { g.beginPath(); g.moveTo(0, f * ch); g.lineTo(cols * cw, f * ch); g.stroke(); }
      for (let c = 0; c <= cols; c++) { g.beginPath(); g.moveTo(c * cw, 0); g.lineTo(c * cw, floors * ch); g.stroke(); }
    }
    for (const w of wins) {
      const x = w.c * cw + cw * 0.22, y = w.f * ch + ch * 0.2, ww = cw * 0.56, hh = ch * 0.5;
      if (emissive) {
        if (w.on) {
          g.fillStyle = w.col; g.fillRect(x, y, ww, hh);
          g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x, y, ww * (0.15 + w.cur * 0.3), hh);
          g.fillStyle = 'rgba(0,0,0,0.9)'; g.fillRect(x + ww * 0.48, y, ww * 0.05, hh);
        }
      } else {
        g.fillStyle = '#d5dbe2'; g.fillRect(x - px * 0.04, y - px * 0.04, ww + px * 0.08, hh + px * 0.08);
        g.fillStyle = w.on ? w.col : '#131c2b'; g.fillRect(x, y, ww, hh);
        if (w.on) { g.fillStyle = 'rgba(90,50,20,0.35)'; g.fillRect(x, y, ww * (0.15 + w.cur * 0.3), hh); }
        g.fillStyle = '#c3cad2'; g.fillRect(x + ww * 0.48, y, ww * 0.05, hh);
        g.fillStyle = 'rgba(235,243,250,0.85)'; g.fillRect(x, y + hh * 0.86, ww, hh * 0.14);
        g.fillStyle = 'rgba(240,246,252,0.9)'; g.fillRect(x - px * 0.06, y + hh + px * 0.04, ww + px * 0.12, px * 0.07);
        if (w.bal) { g.fillStyle = 'rgba(95,104,116,0.95)'; g.fillRect(x - px * 0.1, y + hh * 0.62, ww + px * 0.2, hh * 0.55); }
      }
    }
  };
  const map = cv(cols * cw, floors * ch, (g) => draw(g, false));
  const emissiveMap = cv(cols * cw, floors * ch, (g) => draw(g, true));
  return { map, emissiveMap };
}

export function textSprite(text, o = {}) {
  const size = o.size ?? 64;
  const tex = cv(1024, 128, (g) => {
    g.font = `${size}px Lilita`; g.textBaseline = 'middle'; g.textAlign = o.align ?? 'left';
    const x = o.align === 'center' ? 512 : 16;
    g.lineJoin = 'round'; g.lineWidth = size * 0.2; g.strokeStyle = 'rgba(0,0,0,0.85)'; g.strokeText(text, x, 64);
    g.fillStyle = o.color ?? '#fff'; g.fillText(text, x, 64);
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(8, 1), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, fog: false, toneMapped: false }));
  m.scale.setScalar(o.scale ?? 1);
  return m;
}

// ---------- matériaux / maillages ----------
export const std = (color, rough = 0.85, metal = 0, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra });
export const emis = (color, intensity = 2, extra = {}) => new THREE.MeshStandardMaterial({ color: 0x000000, emissive: color, emissiveIntensity: intensity, ...extra });
export function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); return m;
}
export function cyl(r1, r2, h, mat, x = 0, y = 0, z = 0, seg = 16) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), mat); m.position.set(x, y, z); return m;
}
export function sph(r, mat, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, seg = 20) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.max(8, seg * 0.7 | 0)), mat);
  m.position.set(x, y, z); m.scale.set(sx, sy, sz); return m;
}
export function shadows(o, cast = true, recv = true) {
  o.traverse((m) => { if (m.isMesh && !m.material.transparent) { m.castShadow = cast; m.receiveShadow = recv; } });
  return o;
}
export function shadowLight(l, size = 20, far = 80, res = 1024) {
  l.castShadow = true; l.shadow.mapSize.set(res, res);
  const c = l.shadow.camera;
  if (c.isOrthographicCamera) { c.left = -size; c.right = size; c.top = size; c.bottom = -size; }
  c.near = 0.5; c.far = far; l.shadow.bias = -0.0015; l.shadow.normalBias = 0.03;
  c.updateProjectionMatrix();
  return l;
}
export function camera(fov = 45, near = 0.1, far = 2500) { return new THREE.PerspectiveCamera(fov, W / H, near, far); }
export function look(cam, px, py, pz, tx, ty, tz, roll = 0) {
  cam.position.set(px, py, pz); cam.lookAt(tx, ty, tz); if (roll) cam.rotateZ(roll); cam.updateMatrixWorld();
}

export function sky(top, horizon, o = {}) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      top: { value: new THREE.Color(top) }, hor: { value: new THREE.Color(horizon) },
      sunDir: { value: (o.sunDir ?? V(0, -1, 0)).clone().normalize() }, sunCol: { value: new THREE.Color(o.sunCol ?? 0x000000) },
      ex: { value: o.exp ?? 0.6 }, sunPow: { value: o.sunPow ?? 1 },
    },
    vertexShader: 'varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `uniform vec3 top,hor,sunDir,sunCol; uniform float ex,sunPow; varying vec3 vP;
      void main(){ vec3 d=normalize(vP); float h=pow(clamp(d.y,0.,1.),ex);
        vec3 c=mix(hor,top,h); float s=max(dot(d,sunDir),0.);
        c+=sunCol*sunPow*(pow(s,6.)*0.35+pow(s,40.)*0.9+pow(s,600.)*6.);
        gl_FragColor=vec4(c,1.); }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(1800, 32, 16), mat);
  m.renderOrder = -10;
  return m;
}

export function snowGround(size = 600, color = 0xdde6f0, rep = 60) {
  const bump = noiseTex().clone(); bump.wrapS = bump.wrapT = THREE.RepeatWrapping; bump.repeat.set(rep, rep); bump.needsUpdate = true;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), std(color, 0.92, 0, { bumpMap: bump, bumpScale: 1.2 }));
  m.rotation.x = -Math.PI / 2; m.receiveShadow = true;
  return m;
}

export function halo(color, size, opacity = 1, tex) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex ?? glowTex(), color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
  s.scale.setScalar(size);
  return s;
}
export function pool(color, r, opacity = 0.5) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(r, 24), new THREE.MeshBasicMaterial({ map: glowTex(), color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.03;
  return m;
}

// lampadaire au sodium : mât + tête émissive + halo + flaque de lumière ; light=true ajoute un PointLight
export function lamp(o = {}) {
  const h = o.h ?? 8, g = new THREE.Group(), metal = std(0x3a4048, 0.6, 0.6);
  g.add(cyl(0.07, 0.11, h, metal, 0, h / 2, 0, 8));
  const arm = box(1.5, 0.08, 0.08, metal, 0.7, h, 0); g.add(arm);
  g.add(box(0.6, 0.12, 0.25, emis(SODIUM, 6), 1.3, h - 0.08, 0));
  const hl = halo(SODIUM, o.halo ?? 9, o.haloOp ?? 0.9); hl.position.set(1.3, h - 0.15, 0); g.add(hl);
  const p = pool(SODIUM, o.pool ?? 9, o.poolOp ?? 0.55); p.position.x = 1.3; g.add(p);
  if (o.light) {
    const l = new THREE.PointLight(SODIUM, o.light, o.dist ?? 40, 1.6); l.position.set(1.3, h - 0.4, 0); g.add(l); g.userData.light = l;
  }
  return g;
}

// immeuble soviétique en panneaux, 9 étages, sur pilotis avec tuyaux alu
export function building(o = {}) {
  const w = o.w ?? 48, d = o.d ?? 13, floors = o.floors ?? 9, fh = 3, lift = o.lift ?? 1.6, px = o.px ?? 48;
  const g = new THREE.Group(), hgt = floors * fh, seed = o.seed ?? 1;
  const cols = Math.round(w / 3.2), cols2 = Math.max(2, Math.round(d / 3.2));
  const A = facadeTex(seed, cols, floors, px, o.lit ?? 0.5), B = facadeTex(seed + 7, cols2, floors, px, (o.lit ?? 0.5) * 0.6);
  const fm = (T) => std(0xffffff, 0.9, 0, { map: T.map, emissiveMap: T.emissiveMap, emissive: 0xffffff, emissiveIntensity: o.glow ?? 1.6 });
  const roof = std(0xdfe7ef, 0.95), under = std(0x3a3f47, 0.95);
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, hgt, d), [fm(B), fm(B), roof, under, fm(A), fm(A)]);
  body.position.y = lift + hgt / 2; g.add(body);
  g.add(box(w + 0.4, 0.5, d + 0.4, std(0x6c737d, 0.9), 0, lift + hgt + 0.25, 0));
  g.add(box(w - 1, 0.25, d - 1, roof, 0, lift + hgt + 0.6, 0));
  g.add(box(w + 0.1, 0.35, d + 0.1, std(0x59606a, 0.9), 0, lift + 0.05, 0));
  if (o.piles !== false) {
    const nx = Math.round(w / (o.pileStep ?? 3)), nz = o.pileRows ?? 4;
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.4, lift + 0.3, 0.4), std(0x8a8d90, 0.95), (nx + 1) * nz);
    const M = new THREE.Matrix4(); let k = 0;
    for (let i = 0; i <= nx; i++) for (let j = 0; j < nz; j++)
      im.setMatrixAt(k++, M.makeTranslation(-w / 2 + 0.4 + (i * (w - 0.8)) / nx, lift / 2 - 0.15, -d / 2 + 0.4 + (j * (d - 0.8)) / (nz - 1)));
    g.add(im);
  }
  if (o.pipes) {
    const alu = std(0xcfd4d9, 0.32, 0.9);
    for (const [z, y, r] of [[d / 2 - 1.4, 0.75, 0.24], [d / 2 - 2.1, 0.75, 0.24], [-d / 2 + 1.5, 1.0, 0.18]]) {
      const p = cyl(r, r, w + 6, alu, 0, y, z, 14); p.rotation.z = Math.PI / 2; g.add(p);
      for (let x = -w / 2; x <= w / 2; x += 2.4) { const b = cyl(r + 0.02, r + 0.02, 0.08, std(0x8d949b, 0.4, 0.8), x, y, z, 14); b.rotation.z = Math.PI / 2; g.add(b); }
      for (let x = -w / 2 + 5; x < w / 2; x += 12) g.add(cyl(r * 0.8, r * 0.8, lift - y, alu, x, (lift + y) / 2, z, 10));
    }
  }
  if (o.balconies) {
    const bm = std(0x7a828d, 0.9), sn = std(0xe6eef6, 0.95);
    const R = rng(seed + 3);
    for (let f = 1; f < floors; f++) for (let c = 1; c < cols; c += 1) if (R() < 0.3) {
      const x = -w / 2 + (c + 0.5) * (w / cols), y = lift + f * fh + 0.55;
      g.add(box(2.6, 1.1, 0.9, bm, x, y, d / 2 + 0.45)); g.add(box(2.7, 0.1, 1.0, sn, x, y + 0.6, d / 2 + 0.45));
    }
  }
  return g;
}

// ---------- vapeur (sprites) ----------
export function emitter(o) {
  const g = new THREE.Group(), R = rng(o.seed ?? 3), n = o.n, P = [];
  for (let i = 0; i < n; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: puffTex(i % 3), color: o.color ?? 0xffffff, transparent: true, opacity: 0, depthWrite: false,
      blending: o.add ? THREE.AdditiveBlending : THREE.NormalBlending, rotation: R() * 6.28, fog: o.fog ?? true,
    }));
    g.add(s);
    P.push({ s, off: R(), r: [R() - 0.5, R() - 0.5, R() - 0.5], k: 0.7 + R() * 0.6, ph: R() * 6.28 });
  }
  const life = o.life ?? 3, sp = o.spread ?? [0.1, 0.1, 0.1], v = o.vel ?? [0, 1, 0], vr = o.velRand ?? [0.2, 0.2, 0.2];
  g.update = (t, gain = 1, start = -1e9) => {
    for (const p of P) {
      const u = t / life + p.off, age = u - Math.floor(u), T = age * life;
      const born = t - T;
      const s = p.s, d = o.drag ? (1 - Math.exp(-o.drag * T)) / o.drag : T;
      s.position.set(
        (o.origin?.[0] ?? 0) + p.r[0] * sp[0] + (v[0] + p.r[1] * vr[0]) * d + Math.sin(p.ph + T * 0.7) * (o.turb ?? 0.1) * T,
        (o.origin?.[1] ?? 0) + p.r[1] * sp[1] + (v[1] + p.r[2] * vr[1]) * d + (o.rise ?? 0) * T,
        (o.origin?.[2] ?? 0) + p.r[2] * sp[2] + (v[2] + p.r[0] * vr[2]) * d + Math.cos(p.ph + T * 0.6) * (o.turb ?? 0.1) * T);
      s.scale.setScalar(lerp(o.size0 ?? 0.3, o.size1 ?? 2, Math.pow(age, o.grow ?? 0.7)) * p.k);
      s.material.opacity = born < start ? 0 : (o.opacity ?? 0.4) * gain * Math.min(1, age * (o.fadeIn ?? 8)) * Math.pow(1 - age, o.fadeOut ?? 1);
    }
  };
  g.update(0);
  return g;
}

// nappe de brouillard : gros sprites quasi statiques
export function fogBank(o) {
  const g = new THREE.Group(), R = rng(o.seed ?? 8), P = [];
  for (let i = 0; i < o.n; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex(i % 3), color: o.color ?? 0xbfd0e6, transparent: true, opacity: (o.opacity ?? 0.2) * (0.5 + R() * 0.8), depthWrite: false, rotation: R() * 6.28, fog: o.fog ?? true }));
    const x = o.box[0] + R() * (o.box[1] - o.box[0]), y = o.box[2] + R() * (o.box[3] - o.box[2]), z = o.box[4] + R() * (o.box[5] - o.box[4]);
    const sz = (o.size ?? 10) * (0.6 + R() * 0.9);
    s.scale.set(sz * 1.6, sz, 1); s.position.set(x, y, z); g.add(s); P.push({ s, x, ph: R() * 6.28, v: (R() - 0.5) });
  }
  g.update = (t) => { for (const p of P) p.s.position.x = p.x + (o.drift ?? 0.4) * t * p.v + Math.sin(p.ph + t * 0.3) * 0.3; };
  return g;
}

// ---------- particules ponctuelles (neige, cristaux) ----------
export function points(n, o = {}) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 3), size = new Float32Array(n), alpha = new Float32Array(n), seed = new Float32Array(n);
  const R = rng(o.seed ?? 11);
  for (let i = 0; i < n; i++) { seed[i] = R(); size[i] = 1; alpha[i] = 1; }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  geo.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: o.add === false ? THREE.NormalBlending : THREE.AdditiveBlending,
    uniforms: {
      map: { value: dotTex() }, uTime: { value: 0 }, uColor: { value: new THREE.Color(o.color ?? 0xffffff) },
      uColor2: { value: new THREE.Color(o.color2 ?? o.color ?? 0xffffff) },
      uScale: { value: 1000 }, uSparkle: { value: o.sparkle ?? 0 }, uFog: { value: o.fog ?? 0 }, uGain: { value: o.gain ?? 1 },
    },
    vertexShader: `attribute float aSize,aAlpha,aSeed; uniform float uScale,uTime,uSparkle,uFog; varying float vA; varying float vS;
      void main(){ vec4 mv=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv;
        gl_PointSize=clamp(aSize*uScale/max(-mv.z,0.05),0.,300.);
        float sp=pow(abs(sin(aSeed*91.7+uTime*(3.+aSeed*9.))),10.)*5.;
        vA=aAlpha*mix(1.,0.25+sp,uSparkle)*exp(-uFog*uFog*mv.z*mv.z); vS=aSeed; }`,
    fragmentShader: `uniform sampler2D map; uniform vec3 uColor,uColor2; uniform float uGain; varying float vA; varying float vS;
      void main(){ float a=texture2D(map,gl_PointCoord).a*vA; if(a<0.003) discard; gl_FragColor=vec4(mix(uColor,uColor2,fract(vS*7.3))*uGain,a); }`,
  });
  const p = new THREE.Points(geo, mat);
  p.frustumCulled = false;
  p.userData = { pos, size, alpha, seed, n };
  p.onBeforeRender = (r, s, cam) => { mat.uniforms.uScale.value = r.getDrawingBufferSize(new THREE.Vector2()).y / (2 * Math.tan((cam.fov * Math.PI) / 360)); };
  p.flush = () => { geo.attributes.position.needsUpdate = true; geo.attributes.aSize.needsUpdate = true; geo.attributes.aAlpha.needsUpdate = true; };
  return p;
}

// neige / poussière de diamant qui tombe lentement dans une boîte autour d'un centre
export function snowfall(n, o = {}) {
  const p = points(n, { color: o.color ?? 0xdfeaff, sparkle: o.sparkle ?? 0.3, seed: o.seed ?? 31, fog: o.fog ?? 0, gain: o.gain ?? 1 });
  const R = rng(o.seed ?? 31), b = o.box ?? [20, 14, 20], base = [];
  for (let i = 0; i < n; i++) base.push([R() * b[0], R() * b[1], R() * b[2], 0.3 + R() * 0.7, R() * 6.28]);
  const u = p.userData;
  p.update = (t, c = [0, 0, 0]) => {
    for (let i = 0; i < n; i++) {
      const q = base[i], fall = (o.speed ?? 0.5) * q[3];
      const y = (((q[1] - fall * t) % b[1]) + b[1]) % b[1];
      u.pos[i * 3] = c[0] - b[0] / 2 + ((((q[0] + Math.sin(q[4] + t * 0.6) * 0.3 + (o.wind ?? 0.1) * t) % b[0]) + b[0]) % b[0]);
      u.pos[i * 3 + 1] = c[1] + y + (o.y0 ?? 0);
      u.pos[i * 3 + 2] = c[2] - b[2] / 2 + q[2];
      u.size[i] = (o.size ?? 0.035) * (0.5 + q[3]);
      u.alpha[i] = (o.opacity ?? 0.8) * Math.min(1, y * 2, (b[1] - y) * 2);
    }
    p.material.uniforms.uTime.value = t; p.flush();
  };
  p.update(0);
  return p;
}

// ---------- personnage ----------
export function person(o = {}) {
  const outfit = o.outfit ?? 'parka';
  const coatC = o.coat ?? (outfit === 'parka' ? NAVY : outfit === 'sweater' ? 0xd9cfba : 0x3b4048);
  const g = new THREE.Group(), R = rng(o.seed ?? 4);
  const coat = std(coatC, outfit === 'parka' ? 0.7 : 0.95), pants = std(o.pants ?? 0x20242c, 0.9), skin = std(o.skin ?? SKIN, 0.65);
  const furM = std(o.fur ?? FUR, 1, 0, { bumpMap: noiseTex(), bumpScale: 3 }), dark = std(0x15110f, 0.6);
  const bootM = std(o.boots ?? 0x8b6a48, 1, 0, { bumpMap: noiseTex(), bumpScale: 3 });
  const fat = outfit === 'parka' ? 1 : outfit === 'sweater' ? 0.86 : 0.78;
  if (outfit === 'sweater') {
    coat.map = cv(256, 256, (c) => {
      c.fillStyle = '#d9cfba'; c.fillRect(0, 0, 256, 256);
      for (let y = 0; y < 256; y += 8) { c.strokeStyle = 'rgba(120,100,80,0.25)'; c.beginPath(); c.moveTo(0, y); c.lineTo(256, y); c.stroke(); }
      for (const [y, col] of [[70, '#a3262c'], [110, '#2c4a7c'], [150, '#a3262c']]) {
        c.strokeStyle = col; c.lineWidth = 7; c.beginPath();
        for (let x = 0; x <= 256; x += 16) c.lineTo(x, y + ((x / 16) % 2 ? 12 : -12)); c.stroke();
      }
    });
    coat.color.set(0xffffff);
  }
  // jambes + unty
  const legs = [];
  for (const sx of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(sx * 0.1, 0.88, 0);
    const th = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.4, 4, 10), pants); th.position.y = -0.27; leg.add(th);
    if (o.boots !== null) {
      leg.add(cyl(0.105, 0.095, 0.36, bootM, 0, -0.66, 0, 12));
      leg.add(cyl(0.11, 0.11, 0.05, std(0xd9d2c4, 1), 0, -0.5, 0, 12));
      leg.add(cyl(0.108, 0.108, 0.03, std(RED, 0.9), 0, -0.56, 0, 12));
      leg.add(sph(0.1, bootM, 0, -0.83, 0.05, 1, 0.55, 1.5));
    }
    g.add(leg); legs.push(leg);
  }
  // torse
  const torso = new THREE.Group(); torso.position.y = 0.72; g.add(torso);
  const tb = cyl(0.2 * fat, 0.25 * fat, 0.76, coat, 0, 0.38, 0, 16); tb.scale.z = 0.72; torso.add(tb);
  torso.add(sph(0.2 * fat, coat, 0, 0.74, 0, 1.18, 0.5, 0.75));
  if (outfit === 'parka') {
    torso.add(box(0.025, 0.7, 0.02, std(0x0e1630, 0.5, 0.4), 0, 0.4, 0.168));
    torso.add(box(0.13, 0.11, 0.02, std(0x182654, 0.7), -0.11, 0.2, 0.165)); torso.add(box(0.13, 0.11, 0.02, std(0x182654, 0.7), 0.11, 0.2, 0.165));
    const hood = new THREE.Mesh(new THREE.TorusGeometry(0.135, 0.042, 8, 18), furM);
    hood.rotation.x = Math.PI / 2; hood.position.set(0, 0.765, -0.03); hood.scale.set(1.12, 0.9, 1); torso.add(hood);
    const hem = cyl(0.255, 0.255, 0.05, std(0x152252, 0.8), 0, 0.02, 0, 16); hem.scale.z = 0.72; torso.add(hem);
  }
  // bras
  const arm = (sx) => {
    const a = new THREE.Group(); a.position.set(sx * 0.25 * fat, 1.4, 0);
    const up = new THREE.Mesh(new THREE.CapsuleGeometry(0.072 * fat, 0.22, 4, 10), coat); up.position.y = -0.15; a.add(up);
    const el = new THREE.Group(); el.position.y = -0.3; a.add(el);
    const fo = new THREE.Mesh(new THREE.CapsuleGeometry(0.066 * fat, 0.2, 4, 10), coat); fo.position.y = -0.13; el.add(fo);
    const hand = new THREE.Group(); hand.position.y = -0.31; el.add(hand);
    if (o.mitts === false) hand.add(sph(0.05, skin, 0, 0, 0, 0.9, 1.2, 0.7));
    else { hand.add(sph(0.068, furM, 0, -0.01, 0, 1, 1.3, 0.85)); hand.add(cyl(0.072, 0.072, 0.04, std(0xd9d2c4, 1), 0, 0.07, 0, 10)); }
    g.add(a); a.rotation.z = sx * 0.1;
    return { a, el, hand };
  };
  const L = arm(1), Rr = arm(-1);
  // tête
  const head = new THREE.Group(); head.position.y = 1.5; g.add(head);
  head.add(cyl(0.055, 0.06, 0.1, skin, 0, 0.02, 0, 10));
  const skull = sph(0.13, skin, 0, 0.17, 0, 1, 1.12, 1.02, 24); head.add(skull);
  const cheek = std(0xc47a5e, 0.7), eyes = [];
  for (const sx of [-1, 1]) {
    const eye = sph(0.025, dark, sx * 0.05, 0.19, 0.11, 1.4, 0.5, 0.5); head.add(eye); eyes.push(eye);
    head.add(sph(0.005, std(0xffffff, 0.2, 0, { emissive: 0xffffff, emissiveIntensity: 0.5 }), sx * 0.05 + 0.008, 0.196, 0.1235));
    const br = box(0.055, 0.013, 0.012, dark, sx * 0.052, 0.224, 0.116); br.rotation.z = -sx * 0.12; head.add(br);
    head.add(sph(0.03, cheek, sx * 0.078, 0.13, 0.083, 1, 0.8, 0.5));
    head.add(sph(0.025, skin, sx * 0.132, 0.17, 0, 0.5, 1, 0.8));
  }
  const nose = sph(0.017, skin, 0, 0.148, 0.131, 1, 1.1, 0.9); head.add(nose);
  let mouth = null;
  const mouthM = std(0x5a2a22, 0.6);
  g.setSmile = (k) => {
    if (mouth) { head.remove(mouth); mouth.geometry.dispose(); }
    const c = new THREE.QuadraticBezierCurve3(V(-0.034, 0.098 + k * 0.012, 0.118), V(0.002, 0.094 - k * 0.016, 0.137), V(0.036, 0.098 + k * 0.02, 0.117));
    mouth = new THREE.Mesh(new THREE.TubeGeometry(c, 10, 0.0055, 6), mouthM); head.add(mouth);
  };
  g.setSmile(0);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.137, 20, 10, 0, 6.283, 0, 1.45), std(0x0c0c10, 0.5));
  hair.position.set(0, 0.185, -0.012); hair.scale.set(1, 1.1, 1.05); hair.rotation.x = -0.35; head.add(hair);
  // chapka
  const hat = new THREE.Group(); hat.position.y = 0.17; head.add(hat);
  const hatM = std(o.hatColor ?? o.fur ?? FUR, 1, 0, { bumpMap: noiseTex(), bumpScale: 4 });
  const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.158, 2), hatM);
  { const p = crown.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const k = 1 + (R() - 0.5) * 0.07; p.setXYZ(i, p.getX(i) * k, Math.max(p.getY(i), -0.02) * k, p.getZ(i) * k); } crown.geometry.computeVertexNormals(); }
  crown.position.y = 0.06; crown.scale.set(1, 0.85, 1.02); hat.add(crown);
  const band = cyl(0.166, 0.162, 0.085, hatM, 0, 0.075, 0.004, 14); hat.add(band);
  for (const sx of [-1, 1]) { const f = sph(0.07, hatM, sx * 0.14, -0.03, -0.01, 0.42, 1.45, 0.95, 10); hat.add(f); }
  hat.add(sph(0.1, hatM, 0, 0.0, -0.1, 1.3, 1.2, 0.6, 10));
  hat.visible = o.hat !== false;
  hair.visible = !hat.visible;
  // écharpe rouge
  const scarfM = std(o.scarfColor ?? RED, 0.95, 0, { bumpMap: noiseTex(), bumpScale: 2 });
  const scarf = new THREE.Group(); g.add(scarf);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.055, 10, 18), scarfM); ring.rotation.x = Math.PI / 2; ring.position.y = 1.5; ring.scale.set(1, 1, 0.9); scarf.add(ring);
  const tail = box(0.085, 0.25, 0.03, scarfM, 0.085, 1.35, 0.175); tail.rotation.z = -0.08; scarf.add(tail);
  const up = new THREE.Mesh(new THREE.SphereGeometry(0.139, 20, 8, 0.25, Math.PI - 0.5, 1.72, 0.95), scarfM);
  up.position.set(0, 1.67, 0.004); up.scale.set(1.03, 1.12, 1.08); scarf.add(up);
  const sc = o.scarf ?? 'up';
  scarf.visible = sc !== 'none'; up.visible = sc === 'up';
  g.parts = { eyes, legs, torso, armL: L, armR: Rr, head, hat, hair, scarf, scarfUp: up, hatM, furM };
  // marche : phase en radians
  g.walk = (ph, amp = 0.5) => {
    legs[0].rotation.x = Math.sin(ph) * amp; legs[1].rotation.x = -Math.sin(ph) * amp;
    L.a.rotation.x = Math.sin(ph) * amp * 0.7; Rr.a.rotation.x = -Math.sin(ph) * amp * 0.7;
    L.el.rotation.x = -0.25; Rr.el.rotation.x = -0.25;
    g.position.y = Math.abs(Math.cos(ph)) * 0.025;
  };
  shadows(g);
  return g;
}

// ---------- voiture type Lada ----------
export function lada(o = {}) {
  const g = new THREE.Group(), col = o.color ?? 0x8a2a22;
  const paint = std(col, 0.45, 0.3), chrome = std(0xaeb4ba, 0.3, 0.9), black = std(0x101214, 0.7), glass = std(0x0c1622, 0.15, 0.6);
  const s = new THREE.Shape();
  // profil (x = longueur, avant vers +x), y hauteur
  s.moveTo(-2.05, 0.32); s.lineTo(-2.05, 0.85); s.lineTo(-1.25, 0.92); s.lineTo(-0.95, 1.38); s.lineTo(0.45, 1.38);
  s.lineTo(0.95, 0.92); s.lineTo(2.05, 0.84); s.lineTo(2.05, 0.32); s.lineTo(-2.05, 0.32);
  const body = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 1.5, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 2 }), paint);
  body.position.z = -0.75; g.add(body);
  // vitres
  for (const sz of [-1, 1]) {
    const w = new THREE.Shape(); w.moveTo(-1.12, 0.95); w.lineTo(-0.9, 1.31); w.lineTo(0.4, 1.31); w.lineTo(0.8, 0.95); w.lineTo(-1.12, 0.95);
    const m = new THREE.Mesh(new THREE.ShapeGeometry(w), glass); m.position.z = sz * 0.806; if (sz < 0) m.rotation.y = Math.PI, m.scale.x = -1; g.add(m);
    g.add(box(0.05, 0.38, 0.02, paint, -0.2, 1.13, sz * 0.81));
    g.add(box(0.12, 0.03, 0.03, chrome, -0.35, 0.86, sz * 0.82)); g.add(box(0.12, 0.03, 0.03, chrome, 0.45, 0.86, sz * 0.82));
    g.add(box(3.9, 0.04, 0.02, chrome, 0, 0.62, sz * 0.805));
  }
  const ws = box(0.02, 0.5, 1.36, glass, 0.72, 1.14, 0); ws.rotation.z = -0.83; g.add(ws);
  const rw = box(0.02, 0.5, 1.36, glass, -1.12, 1.14, 0); rw.rotation.z = 0.58; g.add(rw);
  g.add(box(0.14, 0.14, 1.7, chrome, 2.1, 0.4, 0)); g.add(box(0.14, 0.14, 1.7, chrome, -2.1, 0.4, 0));
  g.add(box(0.03, 0.2, 0.9, black, 2.11, 0.68, 0));
  const hl = [], tl = [];
  for (const sz of [-1, 1]) {
    const h = box(0.04, 0.17, 0.26, emis(0xfff0c8, o.lights === false ? 0 : 5), 2.11, 0.68, sz * 0.58); g.add(h); hl.push(h);
    const t = box(0.04, 0.15, 0.3, emis(0xff2010, o.lights === false ? 0 : 4), -2.11, 0.68, sz * 0.55); g.add(t); tl.push(t);
    if (o.lights !== false) {
      const a = halo(0xffe6b0, 2.2, 0.8); a.position.set(2.2, 0.68, sz * 0.58); g.add(a);
      const b = halo(0xff3018, 1.4, 0.7); b.position.set(-2.2, 0.68, sz * 0.55); g.add(b);
    }
  }
  if (o.cardboard) { const c = box(0.03, 0.34, 1.0, std(0x9a7a4e, 0.95), 2.14, 0.62, 0); g.add(c); }
  if (o.snow !== false) { g.add(box(1.4, 0.07, 1.4, std(0xe8f0f8, 0.95), -0.25, 1.46, 0)); g.add(box(1.0, 0.05, 1.4, std(0xe8f0f8, 0.95), 1.5, 0.92, 0)); g.add(box(0.7, 0.05, 1.4, std(0xe8f0f8, 0.95), -1.65, 0.93, 0)); }
  const wheels = [];
  for (const [x, z] of [[1.3, 0.72], [1.3, -0.72], [-1.25, 0.72], [-1.25, -0.72]]) {
    const wg = new THREE.Group(); wg.position.set(x, 0.31, z);
    const t = cyl(0.31, 0.31, 0.2, black, 0, 0, 0, 20); t.rotation.x = Math.PI / 2; wg.add(t);
    const hb = cyl(0.17, 0.17, 0.22, chrome, 0, 0, 0, 12); hb.rotation.x = Math.PI / 2; wg.add(hb);
    for (let i = 0; i < 4; i++) { const b = box(0.05, 0.3, 0.225, black, 0, 0, 0); b.rotation.z = (i * Math.PI) / 4; wg.add(b); }
    g.add(wg); wheels.push(wg);
  }
  g.add(cyl(0.03, 0.03, 0.3, chrome, -2.1, 0.27, 0.45).rotateZ(Math.PI / 2));
  g.parts = { wheels, body, hl, tl };
  shadows(g);
  return g;
}

// ---------- thermomètre à aiguille ----------
export const thermoAngle = (v) => ((225 - ((v + 60) / 100) * 270) * Math.PI) / 180;
export function thermometer() {
  const g = new THREE.Group();
  const face = cv(512, 512, (c) => {
    const gr = c.createRadialGradient(200, 180, 0, 256, 256, 300); gr.addColorStop(0, '#fbf8ee'); gr.addColorStop(1, '#d8d1bf');
    c.fillStyle = gr; c.beginPath(); c.arc(256, 256, 256, 0, 6.3); c.fill();
    const P = (v, r) => { const a = thermoAngle(v); return [256 + Math.cos(a) * r, 256 - Math.sin(a) * r]; };
    for (const [a, b, col] of [[-60, 0, '#2f6fc0'], [0, 40, '#c03a2f']]) {
      c.strokeStyle = col; c.lineWidth = 14; c.beginPath();
      for (let v = a; v <= b; v += 1) c.lineTo(...P(v, 232)); c.stroke();
    }
    c.strokeStyle = '#1a1a1a'; c.fillStyle = '#1a1a1a'; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (let v = -60; v <= 40; v += 2) {
      const big = v % 10 === 0; c.lineWidth = big ? 5 : 2;
      c.beginPath(); c.moveTo(...P(v, 222)); c.lineTo(...P(v, big ? 188 : 204)); c.stroke();
      if (big) { c.font = 'bold 34px sans-serif'; const [x, y] = P(v, 158); c.fillText(String(v), x, y); }
    }
    c.font = 'bold 44px sans-serif'; c.fillText('°C', 256, 345);
    c.font = '20px sans-serif'; c.fillStyle = '#555'; c.fillText('ЯКУТСК', 256, 390);
  });
  const metal = std(0xb8bec5, 0.3, 0.9);
  const housing = cyl(0.095, 0.1, 0.03, metal, 0, 0, 0.015, 40); housing.rotation.x = Math.PI / 2; g.add(housing);
  const dial = new THREE.Mesh(new THREE.CircleGeometry(0.086, 48), std(0xffffff, 0.6, 0, { map: face })); dial.position.z = 0.031; g.add(dial);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.007, 10, 48), metal); rim.position.z = 0.034; g.add(rim);
  const frost = new THREE.Mesh(new THREE.TorusGeometry(0.094, 0.008, 6, 48, 4.2), std(0xf2f8ff, 1, 0, { bumpMap: noiseTex(), bumpScale: 5 })); frost.position.z = 0.03; frost.rotation.z = 3.6; g.add(frost);
  const needle = new THREE.Group(); needle.position.z = 0.036; g.add(needle);
  needle.add(box(0.085, 0.005, 0.002, std(0xc81f26, 0.5), 0.03, 0, 0));
  needle.add(cyl(0.009, 0.009, 0.006, std(0x222222, 0.4, 0.6), 0, 0, 0).rotateX(Math.PI / 2));
  for (const [x, y] of [[-0.075, 0.075], [0.075, 0.075], [-0.075, -0.075], [0.075, -0.075]]) g.add(cyl(0.006, 0.006, 0.034, std(0x555a60, 0.4, 0.8), x * 1.05, y * 1.05, 0.01).rotateX(Math.PI / 2));
  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.088, 40), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, roughness: 0.05, metalness: 0.9 })); glass.position.z = 0.04; g.add(glass);
  g.setValue = (v) => { needle.rotation.z = thermoAngle(v); };
  g.setValue(-50);
  shadows(g);
  return g;
}

// ---------- poisson gelé ----------
export function fishGeometry() {
  const pts = [];
  for (let i = 0; i <= 12; i++) { const u = i / 12; pts.push(new THREE.Vector2(Math.max(0.002, Math.sin(Math.pow(u, 0.75) * Math.PI) * 0.055 + (u < 0.15 ? 0.012 : 0)), u * 0.5)); }
  const b = new THREE.LatheGeometry(pts, 10); b.scale(0.55, 1, 1);
  const tail = new THREE.ConeGeometry(0.07, 0.12, 4); tail.scale(0.15, 1, 1); tail.rotateX(Math.PI); tail.translate(0, -0.03, 0);
  const fin = new THREE.ConeGeometry(0.03, 0.08, 4); fin.scale(0.15, 1, 1); fin.translate(0, 0.3, 0.06);
  return mergeGeometries([b.toNonIndexed(), tail.toNonIndexed(), fin.toNonIndexed()].map((x) => { x.deleteAttribute('uv'); x.computeVertexNormals(); return x; }));
}
export const fishMat = () => std(0xa9b7c4, 0.42, 0.35);

export { THREE, mergeGeometries };
