import * as THREE from 'three';

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const ease = (t) => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };

export function rng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(x, z) { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); }
export function noise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}
export function fbm(x, z, oct = 5) {
  let s = 0, a = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { s += a * noise(x * f, z * f); f *= 2.03; a *= 0.5; }
  return s;
}

// Relief : cuvette où se trouve la ville, glacier et sommets derrière (z négatif).
export function height(x, z) {
  let h = 1.6 * fbm(x * 0.08, z * 0.08) - z * 0.07;
  const back = smooth(-20, -85, z);
  h += back * (40 + 30 * fbm(x * 0.02 + 3, z * 0.02 + 1));
  const side = smooth(55, 120, Math.abs(x));
  h += side * (22 + 25 * fbm(x * 0.03 + 7, z * 0.03));
  h += 3 * fbm(x * 0.2, z * 0.2) * (back + side);
  return h;
}

export function makeTerrain({ size = 420, seg = 220, snow = 30, mud = 0x4a3a2c } = {}) {
  const g = new THREE.PlaneGeometry(size, size, seg, seg);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position; const col = [];
  const cRock = new THREE.Color(0x5b5048), cRock2 = new THREE.Color(0x6e665e), cSnow = new THREE.Color(0xe9f1f7),
    cIce = new THREE.Color(0xa8c8dc), cMud = new THREE.Color(mud), cGrass = new THREE.Color(0x6b6544), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), y = height(x, z);
    p.setY(i, y);
    const n = fbm(x * 0.1 + 9, z * 0.1);
    if (y > snow + n * 8) c.copy(cSnow).lerp(cIce, clamp(fbm(x * 0.05, z * 0.05) * 1.4 - 0.4));
    else if (y > 6 + n * 4) c.copy(cRock).lerp(cRock2, n);
    else c.copy(cMud).lerp(cGrass, clamp(n - 0.35) * 0.6);
    col.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95, map: noiseTexture(70, 2), bumpMap: noiseTexture(140, 5), bumpScale: 2.5 }));
  m.receiveShadow = true;
  return m;
}

export function makeSky(top, horizon, bottom = horizon) {
  const g = new THREE.SphereGeometry(900, 32, 16);
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(top) }, hor: { value: new THREE.Color(horizon) }, bot: { value: new THREE.Color(bottom) } },
    vertexShader: 'varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: 'uniform vec3 top,hor,bot; varying vec3 vp; void main(){ float h=vp.y; vec3 c = h>0.0 ? mix(hor,top,pow(clamp(h*1.6,0.0,1.0),0.6)) : mix(hor,bot,clamp(-h*4.0,0.0,1.0)); gl_FragColor=vec4(c,1.0);}'
  });
  return new THREE.Mesh(g, m);
}

export function makeStars(n = 2500, seed = 3) {
  const r = rng(seed), pos = [];
  for (let i = 0; i < n; i++) {
    const th = r() * Math.PI * 2, ph = Math.acos(r() * 0.95);
    pos.push(800 * Math.sin(ph) * Math.cos(th), 800 * Math.cos(ph), 800 * Math.sin(ph) * Math.sin(th));
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.9 }));
}

let _soft;
export function softTexture() {
  if (_soft) return _soft;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d'); const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
  _soft = new THREE.CanvasTexture(c); return _soft;
}

// Bidonville : cabanes en tôle (instanciées) posées sur le relief.
export function makeTown({ count = 1600, seed = 7, xr = 70, z0 = -24, z1 = 45, night = 0, windows = true } = {}) {
  const r = rng(seed), grp = new THREE.Group();
  const box = new THREE.BoxGeometry(1, 1, 1);
  const tin = tinTextures();
  const walls = new THREE.InstancedMesh(box, new THREE.MeshStandardMaterial({ roughness: 0.75, metalness: 0.35, map: tin.map, bumpMap: tin.bump, bumpScale: 3 }), count);
  const roofs = new THREE.InstancedMesh(box, new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.75, map: tin.map, bumpMap: tin.bump, bumpScale: 3 }), count);
  const winGeo = new THREE.PlaneGeometry(0.7, 0.6);
  const wins = new THREE.InstancedMesh(winGeo, new THREE.MeshBasicMaterial({ color: 0xffb35c, transparent: true, opacity: 1 }), count);
  const wallCols = [0x8a8f94, 0x7d8288, 0x8b5a3c, 0x6e4a35, 0x2f5f9e, 0x9c7a5b, 0x5d6b73, 0xa04a32];
  const roofCols = [0xb8bdc2, 0xa7adb3, 0x8e7766, 0x9aa1a8, 0x7c5a44];
  const o = new THREE.Object3D(), c = new THREE.Color(); let n = 0, nw = 0;
  for (let i = 0; i < count * 3 && n < count; i++) {
    const x = (r() * 2 - 1) * xr * (0.6 + 0.4 * r()), z = lerp(z0, z1, r());
    if (Math.abs(((x + 1000) % 13) - 6.5) < 0.9 && r() < 0.85) continue; // ruelles
    const w = 1.8 + r() * 2.6, d = 1.8 + r() * 2.4, h = 1.7 + r() * 1.1 + (r() < 0.12 ? 1.6 : 0);
    const y = height(x, z), rot = (r() - 0.5) * 0.5;
    o.position.set(x, y + h / 2 - 0.2, z); o.rotation.set(0, rot, 0); o.scale.set(w, h, d); o.updateMatrix();
    walls.setMatrixAt(n, o.matrix); walls.setColorAt(n, c.setHex(wallCols[(r() * wallCols.length) | 0]).multiplyScalar(0.8 + r() * 0.4));
    const tilt = (r() - 0.5) * 0.25;
    o.position.set(x, y + h - 0.15, z); o.rotation.set(tilt, rot, (r() - 0.5) * 0.15); o.scale.set(w * 1.12, 0.12, d * 1.15); o.updateMatrix();
    roofs.setMatrixAt(n, o.matrix); roofs.setColorAt(n, c.setHex(roofCols[(r() * roofCols.length) | 0]));
    if (windows && r() < 0.55) {
      const dx = Math.sin(rot) * (d / 2 + 0.02), dz = Math.cos(rot) * (d / 2 + 0.02);
      o.position.set(x + dx + (r() - 0.5) * w * 0.4, y + h * 0.55, z + dz); o.rotation.set(0, rot, 0); o.scale.set(1, 1, 1); o.updateMatrix();
      wins.setMatrixAt(nw, o.matrix); wins.setColorAt(nw, c.setHex(r() < 0.8 ? 0xffb35c : 0xcfe3ff).multiplyScalar(2.5 + r() * 2)); nw++;
    }
    n++;
  }
  walls.count = roofs.count = n; wins.count = nw;
  walls.castShadow = roofs.castShadow = true; walls.receiveShadow = roofs.receiveShadow = true;
  grp.add(walls, roofs); if (windows) grp.add(wins);
  grp.userData.wins = wins;
  return grp;
}

export function makeTrash({ count = 1800, seed = 11, xr = 60, z0 = -15, z1 = 40 } = {}) {
  const r = rng(seed);
  const m = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.7 }), count);
  const cols = [0x2a6fdb, 0xe03c31, 0xf2f2f2, 0x1f9d55, 0xf5c518, 0x333333, 0x8a5a3c];
  const o = new THREE.Object3D(), c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const x = (r() * 2 - 1) * xr, z = lerp(z0, z1, r()), s = 0.15 + r() * 0.45;
    o.position.set(x, height(x, z) + s * 0.2, z); o.rotation.set(r() * 3, r() * 3, r() * 3); o.scale.set(s, s * 0.4, s * (0.5 + r())); o.updateMatrix();
    m.setMatrixAt(i, o.matrix); m.setColorAt(i, c.setHex(cols[(r() * cols.length) | 0]));
  }
  return m;
}

// Personnage stylisé. type : 'miner' | 'woman'
export function makePerson({ type = 'miner', skirt = 0xc2185b, shawl = 0x1565c0, seed = 1 } = {}) {
  const r = rng(seed), g = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0x8d5a3b, roughness: 0.7 });
  const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, ...o });
  const torso = new THREE.Group(); g.add(torso); torso.position.y = 1.0;
  let legs;
  if (type === 'woman') {
    const sk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.48, 0.9, 14), mat(skirt)); sk.position.y = 0.45; g.add(sk);
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.4, 4, 10), mat(shawl)); body.position.y = 0.3; torso.add(body);
    const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.34, 0.3, 14), mat(shawl)); sh.position.y = 0.42; torso.add(sh);
  } else {
    legs = [-0.11, 0.11].map((x) => { const l = new THREE.Group(); l.position.set(x, 0.85, 0); const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.62, 4, 8), mat(0x2b3a4a)); m.position.y = -0.4; l.add(m); g.add(l); return l; });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.42, 4, 10), mat(0x7a4b2a)); body.position.y = 0.3; torso.add(body);
  }
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), skin); head.position.y = 0.82; torso.add(head);
  if (type === 'woman') {
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 18), mat(0x3b2a20)); brim.position.y = 0.93; torso.add(brim);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x3b2a20)); crown.position.y = 0.94; crown.scale.y = 1.3; torso.add(crown);
    const braid = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.35, 3, 6), mat(0x111111)); braid.position.set(0, 0.6, -0.14); torso.add(braid);
  } else {
    const helm = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xf2b705, { roughness: 0.5 })); helm.position.y = 0.88; torso.add(helm);
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 10), new THREE.MeshBasicMaterial({ color: 0xfff2c0 })); lamp.rotation.x = Math.PI / 2; lamp.position.set(0, 0.95, 0.17); torso.add(lamp);
    g.userData.lampPos = lamp;
  }
  const arms = [-1, 1].map((s) => {
    const a = new THREE.Group(); a.position.set(s * 0.27, 0.55, 0); torso.add(a);
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.48, 4, 8), type === 'woman' ? mat(shawl) : mat(0x7a4b2a)); m.position.y = -0.3; a.add(m);
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), skin); h.position.y = -0.6; a.add(h);
    return a;
  });
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  g.userData = { ...g.userData, torso, arms, legs, head };
  return g;
}

export function makeRocks({ count = 400, seed = 5, spread = 6, pile = 2.5, color = 0x6f6a64 } = {}) {
  const r = rng(seed);
  const m = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true, bumpMap: noiseTexture(3, 8), bumpScale: 4 }), count);
  const o = new THREE.Object3D(), c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const a = r() * Math.PI * 2, d = Math.pow(r(), 0.7) * spread, s = 0.08 + r() * 0.3;
    o.position.set(Math.cos(a) * d, Math.max(0, pile * (1 - d / spread)) * (0.6 + 0.4 * r()) + s * 0.5, Math.sin(a) * d);
    o.rotation.set(r() * 6, r() * 6, r() * 6); o.scale.set(s, s * (0.6 + r() * 0.5), s); o.updateMatrix();
    m.setMatrixAt(i, o.matrix); m.setColorAt(i, c.setHex(color).multiplyScalar(0.7 + r() * 0.5));
  }
  m.castShadow = m.receiveShadow = true;
  return m;
}

// Système de particules déterministe (fonction du temps).
export function makeParticles({ count = 300, seed = 2, color = 0xffffff, size = 0.2, opacity = 0.6, additive = false, tex = true, box = [10, 10, 10] } = {}) {
  const r = rng(seed), g = new THREE.BufferGeometry();
  const base = new Float32Array(count * 3), vel = new Float32Array(count * 3), pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) { for (let k = 0; k < 3; k++) { base[i * 3 + k] = (r() - 0.5) * box[k]; vel[i * 3 + k] = r() - 0.5; } }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({ color, size, transparent: true, opacity, depthWrite: false, map: tex ? softTexture() : null, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending });
  const pts = new THREE.Points(g, m);
  pts.userData = { base, vel, box, count, r };
  pts.frustumCulled = false;
  return pts;
}
export function updateParticles(pts, t, fn) {
  const { base, vel, box, count } = pts.userData, p = pts.geometry.attributes.position.array;
  const wrap = (v, s) => ((((v + s / 2) % s) + s) % s) - s / 2;
  for (let i = 0; i < count; i++) {
    const o = fn(i, t, vel[i * 3], vel[i * 3 + 1], vel[i * 3 + 2]);
    p[i * 3] = wrap(base[i * 3] + o[0], box[0]); p[i * 3 + 1] = wrap(base[i * 3 + 1] + o[1], box[1]); p[i * 3 + 2] = wrap(base[i * 3 + 2] + o[2], box[2]);
  }
  pts.geometry.attributes.position.needsUpdate = true;
}

export function corrugated(w, h, color, waves = 30) {
  const g = new THREE.PlaneGeometry(w, h, waves * 4, 2); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin((p.getX(i) / w) * waves * Math.PI * 2) * 0.04);
  g.computeVertexNormals();
  const tin = tinTextures(); const map = tin.map.clone(); map.repeat.set(w / 2.5, 1); map.needsUpdate = true;
  return new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color, map, metalness: 0.55, roughness: 0.55, side: THREE.DoubleSide }));
}

// ---------- Textures procédurales ----------
function canvasTex(w, h, draw, repeat = [1, 1], srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
const _tex = {};
export function tinTextures() {
  if (_tex.tin) return _tex.tin;
  const r = rng(99);
  const draw = (bump) => (x, w, h) => {
    for (let i = 0; i < w; i++) { const v = 0.5 + 0.5 * Math.sin((i / w) * Math.PI * 2 * 16); const g = bump ? v * 255 : 150 + v * 70; x.fillStyle = `rgb(${g},${g},${g})`; x.fillRect(i, 0, 1, h); }
    if (!bump) {
      for (let k = 0; k < 140; k++) { const rx = r() * w, ry = r() * h, rr = 4 + r() * 30; const gr = x.createRadialGradient(rx, ry, 0, rx, ry, rr); gr.addColorStop(0, `rgba(${120 + r() * 50},${60 + r() * 30},${30},${0.5 + r() * 0.4})`); gr.addColorStop(1, 'rgba(120,60,30,0)'); x.fillStyle = gr; x.fillRect(rx - rr, ry - rr, rr * 2, rr * 2); }
      for (let k = 0; k < 60; k++) { x.fillStyle = `rgba(40,30,25,${0.15 + r() * 0.25})`; x.fillRect(r() * w, r() * h, 1 + r() * 2, 10 + r() * 60); }
    }
  };
  _tex.tin = { map: canvasTex(256, 256, draw(false)), bump: canvasTex(256, 256, draw(true), [1, 1], false) };
  return _tex.tin;
}
export function noiseTexture(repeat = 40, seed = 1) {
  const key = 'n' + repeat + '_' + seed; if (_tex[key]) return _tex[key];
  _tex[key] = canvasTex(256, 256, (x, w, h) => {
    const img = x.createImageData(w, h);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      // bruit périodique (tuilable)
      const u = i / w, v = j / h; let s = 0, a = 0.5, f = 4;
      for (let o = 0; o < 5; o++) { s += a * (0.5 + 0.25 * (Math.sin((u * f + seed) * Math.PI * 2 + Math.sin(v * f * 6.283) * 1.7) + Math.sin((v * f + seed * 0.7) * Math.PI * 2 + Math.cos(u * f * 6.283) * 1.3))); a *= 0.5; f *= 2; }
      const g = 255 * clamp(0.35 + s * 0.75); const k = (j * w + i) * 4; img.data[k] = img.data[k + 1] = img.data[k + 2] = g; img.data[k + 3] = 255;
    }
    x.putImageData(img, 0, 0);
  }, [repeat, repeat], false);
  return _tex[key];
}

// Poteaux électriques et câbles
export function makePoles({ count = 40, seed = 13, xr = 60, z0 = -15, z1 = 40 } = {}) {
  const r = rng(seed), g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x3d2f24, roughness: 1 });
  const tops = [];
  for (let i = 0; i < count; i++) {
    const x = (r() * 2 - 1) * xr, z = lerp(z0, z1, r()), y = height(x, z), h = 6 + r() * 2;
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, h, 6), wood); p.position.set(x, y + h / 2, z); p.castShadow = true; g.add(p);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 0.08), wood); bar.position.set(x, y + h - 0.3, z); g.add(bar);
    tops.push(new THREE.Vector3(x, y + h - 0.3, z));
  }
  const pos = [];
  tops.forEach((a, i) => {
    let best = null, bd = 1e9; tops.forEach((b, j) => { if (j === i) return; const d = a.distanceTo(b); if (d < bd && d > 4) { bd = d; best = b; } });
    if (!best || bd > 35) return;
    for (const off of [-0.6, 0.6]) {
      let prev = null;
      for (let k = 0; k <= 12; k++) { const t = k / 12; const p = new THREE.Vector3().lerpVectors(a, best, t); p.x += off; p.y -= Math.sin(t * Math.PI) * bd * 0.04; if (prev) pos.push(prev.x, prev.y, prev.z, p.x, p.y, p.z); prev = p; }
    }
  });
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.7 })));
  return g;
}

// Fumées (sprites) : renvoie {group, update(t)}
export function makeSmoke({ count = 12, seed = 17, xr = 55, z0 = -10, z1 = 35, color = 0xb8b4ae, opacity = 0.35 } = {}) {
  const r = rng(seed), g = new THREE.Group(), puffs = [];
  for (let i = 0; i < count; i++) {
    const x = (r() * 2 - 1) * xr, z = lerp(z0, z1, r()), y = height(x, z) + 3;
    for (let k = 0; k < 10; k++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTexture(), color, transparent: true, opacity: 0, depthWrite: false })); sp.userData = { x, y, z, ph: k / 10 + r() * 0.05, w: (r() - 0.5) }; g.add(sp); puffs.push(sp); }
  }
  return { group: g, update(t) {
    puffs.forEach((p) => { const u = p.userData, l = (t * 0.12 + u.ph) % 1; p.position.set(u.x + l * 6 + u.w, u.y + l * 9, u.z + l * 2); const s = 1 + l * 6; p.scale.set(s, s, 1); p.material.opacity = Math.sin(l * Math.PI) * opacity; });
  } };
}

// ---------- Personnages détaillés ----------
export function stripeTexture(seed = 1, vertical = false) {
  const r = rng(seed), pal = [0xd81b60, 0xf4511e, 0xfdd835, 0x43a047, 0x1e88e5, 0x8e24aa, 0x00897b, 0xffffff, 0x212121];
  return canvasTex(128, 256, (x, w, h) => {
    let y = 0;
    while (y < h) {
      const bh = 3 + Math.floor(r() * 16), col = pal[(r() * pal.length) | 0];
      x.fillStyle = '#' + col.toString(16).padStart(6, '0'); x.fillRect(0, y, w, bh);
      if (bh > 10 && r() < 0.6) { x.fillStyle = '#' + pal[(r() * pal.length) | 0].toString(16).padStart(6, '0'); for (let i = 0; i < w; i += 8) { x.beginPath(); x.moveTo(i, y + bh / 2); x.lineTo(i + 4, y + 2); x.lineTo(i + 8, y + bh / 2); x.lineTo(i + 4, y + bh - 2); x.fill(); } }
      y += bh;
    }
  }, vertical ? [1, 1] : [1, 1]);
}

export function makePerson2({ type = 'miner', skirt = 0xc2185b, shawl = 0x1565c0, seed = 1 } = {}) {
  const r = rng(seed), g = new THREE.Group();
  const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, ...o });
  const skin = M(0x8a5636, { roughness: 0.6 });
  const torso = new THREE.Group(); torso.position.y = 0.95; g.add(torso);
  let legs = null;
  const lathe = (pts, mat, seg = 28) => new THREE.Mesh(new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg), mat);
  if (type === 'woman') {
    // pollera : plusieurs jupons évasés
    const sk = lathe([[0.2, 0.98], [0.26, 0.8], [0.4, 0.45], [0.5, 0.12], [0.52, 0.05], [0.0, 0.05]], M(skirt)); g.add(sk);
    const band = lathe([[0.505, 0.2], [0.52, 0.12], [0.525, 0.08]], M(new THREE.Color(skirt).offsetHSL(0.1, 0, 0.15).getHex())); g.add(band);
    const pet = lathe([[0.46, 0.08], [0.5, 0.02], [0.0, 0.02]], M(0xf5f5f5)); g.add(pet);
    [-0.1, 0.1].forEach((x) => { const sh = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), M(0x222222)); sh.position.set(x, 0.04, 0.12); sh.scale.set(1, 0.6, 1.5); g.add(sh); });
    const body = lathe([[0.0, 0.0], [0.2, 0.02], [0.23, 0.2], [0.21, 0.45], [0.12, 0.58], [0.0, 0.6]], M(0xece3d0)); torso.add(body);
    const manta = lathe([[0.0, 0.62], [0.13, 0.6], [0.27, 0.48], [0.3, 0.3], [0.29, 0.22]], M(shawl, { side: THREE.DoubleSide })); torso.add(manta);
    // aguayo (baluchon coloré) sur le dos
    const ag = new THREE.Mesh(new THREE.SphereGeometry(0.26, 20, 14), M(0xffffff, { map: stripeTexture(seed * 3 + 1) })); ag.position.set(0, 0.3, -0.24); ag.scale.set(1, 0.9, 0.65); torso.add(ag);
    const knot = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.025, 8, 14), M(0xffffff, { map: stripeTexture(seed * 3 + 1) })); knot.position.set(0, 0.5, 0.12); torso.add(knot);
  } else {
    legs = [-0.1, 0.1].map((x) => {
      const l = new THREE.Group(); l.position.set(x, 0.9, 0);
      const th = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.36, 4, 12), M(0x2d3e50)); th.position.y = -0.22; l.add(th);
      const sh = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.34, 4, 12), M(0x2d3e50)); sh.position.y = -0.62; l.add(sh);
      const boot = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.12, 0.26), M(0x1b1b1b, { roughness: 0.5 })); boot.position.set(0, -0.86, 0.04); l.add(boot);
      g.add(l); return l;
    });
    const jacket = lathe([[0.0, -0.05], [0.2, -0.04], [0.24, 0.12], [0.25, 0.4], [0.2, 0.56], [0.08, 0.62], [0.0, 0.62]], M(0xe65100)); torso.add(jacket);
    [0.1, 0.3].forEach((y) => { const st = lathe([[0.245, y], [0.25, y + 0.04]], M(0xd7dde2, { metalness: 0.6, roughness: 0.3, emissive: 0x222222 })); torso.add(st); });
    const sack = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), M(0x7a6040, { roughness: 1, bumpMap: noiseTexture(6, 4), bumpScale: 3 })); sack.position.set(0.05, 0.33, -0.24); sack.scale.set(1.05, 1.1, 0.6); torso.add(sack);
  }
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.1, 12), skin); neck.position.y = 0.66; torso.add(neck);
  const head = new THREE.Group(); head.position.y = 0.82; torso.add(head);
  const sk2 = new THREE.Mesh(new THREE.SphereGeometry(0.14, 24, 18), skin); sk2.scale.set(0.95, 1.08, 1); head.add(sk2);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.06, 8), skin); nose.rotation.x = Math.PI / 2; nose.position.set(0, -0.01, 0.145); head.add(nose);
  [-0.05, 0.05].forEach((x) => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 6), M(0x111111, { roughness: 0.2 })); e.position.set(x, 0.03, 0.125); head.add(e); });
  if (type === 'woman') {
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.146, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), M(0x111111, { roughness: 0.5 })); hair.rotation.x = -0.25; head.add(hair);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 28), M(0x3a2a1f)); brim.position.y = 0.11; head.add(brim);
    const crown = lathe([[0.0, 0.3], [0.08, 0.29], [0.11, 0.22], [0.12, 0.12], [0.0, 0.12]], M(0x3a2a1f)); head.add(crown);
    const rib = lathe([[0.121, 0.13], [0.118, 0.16]], M(0x111111)); head.add(rib);
    [-0.07, 0.07].forEach((x) => { const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.4, 4, 8), M(0x111111)); b.position.set(x, -0.3, -0.1); b.rotation.x = 0.1; head.add(b); });
  } else {
    const helm = lathe([[0.0, 0.22], [0.1, 0.2], [0.16, 0.12], [0.17, 0.02], [0.22, 0.0], [0.22, -0.02], [0.0, -0.02]], M(0xf9c000, { roughness: 0.35 })); helm.position.y = 0.04; head.add(helm);
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.06, 14), M(0x222222)); lamp.rotation.x = Math.PI / 2; lamp.position.set(0, 0.12, 0.16); head.add(lamp);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.04, 14), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff2c0).multiplyScalar(4) })); lens.position.set(0, 0.12, 0.192); head.add(lens);
    // joue gonflée par la coca
    const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), skin); cheek.position.set(0.09, -0.04, 0.07); head.add(cheek);
  }
  const arms = [-1, 1].map((s) => {
    const a = new THREE.Group(); a.position.set(s * 0.25, 0.55, 0); torso.add(a);
    const up = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.26, 4, 10), M(type === 'woman' ? shawl : 0xe65100)); up.position.y = -0.17; a.add(up);
    const fo = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.24, 4, 10), type === 'woman' ? M(0xece3d0) : M(0xe65100)); fo.position.y = -0.45; a.add(fo);
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 10), type === 'woman' ? skin : M(0x5d4037)); h.position.y = -0.63; a.add(h);
    return a;
  });
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.userData = { torso, arms, legs, head };
  return g;
}

// Langue de glacier avec séracs et crevasses
export function makeGlacier({ x = 5, z = -62, w = 120, d = 50, seed = 3 } = {}) {
  const g = new THREE.PlaneGeometry(w, d, 160, 70); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position, col = [], c = new THREE.Color(), cA = new THREE.Color(0xf2f7fb), cB = new THREE.Color(0x8fc1e0), cC = new THREE.Color(0x3f7fae);
  for (let i = 0; i < p.count; i++) {
    const lx = p.getX(i), lz = p.getZ(i), X = lx + x, Z = lz + z;
    const rr = Math.hypot(lx / (w / 2), lz / (d / 2)) + (fbm(X * 0.06, Z * 0.06) - 0.5) * 0.7;
    const edge = smooth(1.0, 0.75, rr);
    const crev = Math.pow(Math.abs(Math.sin(Z * 0.9 + fbm(X * 0.04, Z * 0.04) * 5)), 10) * smooth(0.3, 0.7, fbm(X * 0.1, Z * 0.1));
    const y = height(X, Z) + (edge * 2.0 - (1 - edge) * 4) + fbm(X * 0.2, Z * 0.2) * 1.2 * edge - crev * 0.6 * edge;
    p.setY(i, y);
    c.copy(cA).lerp(cB, clamp(fbm(X * 0.08 + 4, Z * 0.08) * 1.3 - 0.35)).lerp(cC, crev * 0.8);
    col.push(c.r, c.g, c.b);
  }
  g.translate(x, 0, z);
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.25, metalness: 0.05, flatShading: true }));
  m.receiveShadow = true; m.castShadow = true;
  return m;
}
