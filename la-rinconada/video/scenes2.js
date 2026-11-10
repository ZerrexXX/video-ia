// Scènes retravaillées (images 2, 3, 5, 6 et 10)
import * as THREE from 'three';
import {
  clamp, lerp, smooth, ease, rng, fbm, height, makeRocks, makeParticles, updateParticles, softTexture,
  corrugated, noiseTexture, makePerson2, stripeTexture, tinTextures
} from './lib.js';
import { townScene } from './scenes.js';

const ASPECT = 16 / 9;
const cam = (fov = 45) => new THREE.PerspectiveCamera(fov, ASPECT, 0.05, 2000);
const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, ...o });
const hdr = (c, k) => new THREE.Color(c).multiplyScalar(k);

// ---------- Éléments partagés ----------
// Linge étendu et paraboles sur les toits
function addTownExtras(s, seed = 51) {
  const r = rng(seed), g = new THREE.Group();
  const cloth = new THREE.PlaneGeometry(0.5, 0.7, 4, 4);
  const cols = [0xd81b60, 0x1e88e5, 0xfdd835, 0x43a047, 0xffffff, 0xf4511e, 0x8e24aa, 0x6d4c41];
  const clothes = [];
  for (let i = 0; i < 70; i++) {
    const x = (r() * 2 - 1) * 55, z = r() * 55 - 18, y = height(x, z) + 2.4 + r() * 0.8, a = r() * Math.PI, L = 3 + r() * 3;
    const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const p0 = new THREE.Vector3(x, y, z), p1 = p0.clone().addScaledVector(dir, L);
    const pts = []; for (let k = 0; k <= 10; k++) { const t = k / 10; const p = p0.clone().lerp(p1, t); p.y -= Math.sin(t * Math.PI) * 0.25; pts.push(p); }
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x222222 })));
    const n = 3 + ((r() * 4) | 0);
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n, p = p0.clone().lerp(p1, t); p.y -= Math.sin(t * Math.PI) * 0.25 + 0.33;
      const m = new THREE.Mesh(cloth, std(cols[(r() * cols.length) | 0], { side: THREE.DoubleSide, map: r() < 0.4 ? stripeTexture((r() * 50) | 0) : null }));
      m.position.copy(p); m.rotation.y = -a; m.scale.set(0.7 + r() * 0.8, 0.7 + r() * 0.6, 1); m.castShadow = true; m.userData.ph = r() * 6; g.add(m); clothes.push(m);
    }
  }
  const dish = new THREE.SphereGeometry(0.45, 18, 8, 0, Math.PI * 2, 0, 0.9);
  for (let i = 0; i < 45; i++) {
    const x = (r() * 2 - 1) * 55, z = r() * 55 - 18, y = height(x, z) + 2.8 + r() * 0.6;
    const m = new THREE.Mesh(dish, std(0xdadada, { side: THREE.DoubleSide, metalness: 0.3, roughness: 0.5 })); m.position.set(x, y, z); m.rotation.set(-1.1, r() * 6, 0); m.castShadow = true; g.add(m);
  }
  s.add(g);
  return (t) => clothes.forEach((m) => { m.rotation.x = Math.sin(t * 2.2 + m.userData.ph) * 0.25; });
}

// Entrées de mine au pied du glacier, rails, wagonnets, déblais, lueurs d'or
export function addMines(s, { seed = 61, gold = true } = {}) {
  const r = rng(seed), g = new THREE.Group();
  const wood = std(0x5b3a1e, { roughness: 1, map: noiseTexture(3, 4) });
  const glows = [], lights = [];
  const spots = [[-26, -38], [-12, -41], [3, -39], [17, -42], [31, -38], [-40, -36]];
  spots.forEach(([x, z], i) => {
    const y = height(x, z), gr = new THREE.Group(); gr.position.set(x, y, z); gr.rotation.y = (r() - 0.5) * 0.4;
    const hole = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.4, 3), new THREE.MeshBasicMaterial({ color: 0x050403 })); hole.position.set(0, 1.0, -0.6); gr.add(hole);
    const pA = new THREE.Mesh(new THREE.BoxGeometry(0.28, 2.7, 0.28), wood); pA.position.set(-1.25, 1.2, 0.95); const pB = pA.clone(); pB.position.x = 1.25;
    const lin = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.32, 0.35), wood); lin.position.set(0, 2.6, 0.95);
    gr.add(pA, pB, lin);
    // talus rocheux autour de l'entrée
    const rk = makeRocks({ count: 140, seed: 70 + i, spread: 3.2, pile: 1.6, color: 0x6a625a }); rk.position.set(0, 0, 0.5); rk.scale.set(1, 1.1, 0.6); gr.add(rk);
    // rails + wagonnet
    const rail = std(0x4a4440, { metalness: 0.8, roughness: 0.4 });
    const tr = new THREE.Group(); tr.rotation.x = Math.atan2(y - height(x, z + 8), 8); gr.add(tr);
    for (const sx of [-0.4, 0.4]) { const rl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 9), rail); rl.position.set(sx, 0.05, 4.5); tr.add(rl); }
    for (let k = 0; k < 14; k++) { const sl = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 0.18), wood); sl.position.set(0, 0.02, 0.6 + k * 0.62); tr.add(sl); }
    if (i % 2 === 0) {
      const cart = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.6, 1.4), std(0x7a4a2a, { metalness: 0.6, roughness: 0.5, map: tinTextures().map })); cart.position.set(0, 0.55, 3 + r() * 3); cart.castShadow = true; tr.add(cart);
      const ore = makeRocks({ count: 40, seed: 90 + i, spread: 0.45, pile: 0.25 }); ore.position.copy(cart.position).add(new THREE.Vector3(0, 0.3, 0)); tr.add(ore);
    }
    if (gold) {
      const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTexture(), color: 0xffb830, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
      gl.position.set(0, 1.1, 0.6); gl.scale.set(3.2, 3.2, 1); gr.add(gl); glows.push(gl);
      const pl = new THREE.PointLight(0xffaa30, 0, 12, 1.6); pl.position.set(0, 1.1, 1.2); gr.add(pl); lights.push(pl);
    }
    g.add(gr);
  });
  // veines dorées dans la roche sous la glace
  const veinMat = new THREE.MeshBasicMaterial({ color: hdr(0xffb020, 0), transparent: true });
  for (let i = 0; i < 90; i++) {
    const x = (r() * 2 - 1) * 45, z = -44 - r() * 6, y = height(x, z) + 0.15;
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 1 + r() * 3), veinMat); m.position.set(x, y, z); m.rotation.set(0.6, r() * 3, r()); g.add(m);
  }
  s.add(g);
  return (k) => {
    glows.forEach((gl, i) => { gl.material.opacity = k * (0.75 + 0.25 * Math.sin(i * 2.3)); });
    lights.forEach((pl) => { pl.intensity = k * 60; });
    veinMat.color.copy(hdr(0xffb020, k * 3));
  };
}

// File de mineurs qui montent vers les mines
function addMinerLine(s, { n = 9, seed = 81, x0 = -10, z0 = -27, z1 = -38 } = {}) {
  const r = rng(seed), ms = [];
  for (let i = 0; i < n; i++) { const m = makePerson2({ type: 'miner', seed: 200 + i }); m.userData.o = { off: i / n, dx: (r() - 0.5) * 2, sp: 0.9 + r() * 0.2 }; s.add(m); ms.push(m); }
  return (t) => ms.forEach((m) => {
    const o = m.userData.o, u = (o.off + t * 0.018 * o.sp) % 1;
    const z = lerp(z0, z1, u), x = x0 + o.dx + Math.sin(u * 9) * 1.5;
    m.position.set(x, height(x, z), z); m.rotation.y = Math.PI + Math.sin(u * 9) * 0.3;
    const ph = t * 5 * o.sp + o.off * 10, { legs, arms, torso } = m.userData;
    legs[0].rotation.x = Math.sin(ph) * 0.5; legs[1].rotation.x = -Math.sin(ph) * 0.5;
    arms[0].rotation.x = -Math.sin(ph) * 0.4; arms[1].rotation.x = Math.sin(ph) * 0.4; torso.rotation.x = 0.22;
  });
}

function addSun(s, pos, color = 0xffd2a0, size = 70) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTexture(), color: hdr(color, 4), transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
  sp.position.copy(pos); sp.scale.set(size, size, 1); s.add(sp);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTexture(), color: hdr(color, 0.6), transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
  halo.position.copy(pos); halo.scale.set(size * 6, size * 6, 1); s.add(halo);
}

// ---------- 2. Titre : grue depuis les toits jusqu'au glacier à l'aube ----------
export function sTitle2() {
  const { s, tick, sun } = townScene({ mood: 'dawn' });
  sun.position.set(220, 30, 40); sun.intensity = 3.2;
  const pink = new THREE.DirectionalLight(0xff9a8a, 1.4); pink.position.set(120, 60, 120); s.add(pink);
  const wave = addTownExtras(s);
  addMines(s, { gold: false });
  const line = addMinerLine(s, { n: 12, x0: 6, z0: -20, z1: -38 });
  addSun(s, new THREE.Vector3(700, 40, 120));
  const c = cam(40);
  return {
    scene: s, camera: c, update(t, d) {
      const k = ease(t / d);
      const x = lerp(-6, 2, k), z = lerp(34, 46, k);
      c.position.set(x, height(x, z) + lerp(4.5, 22, k), z);
      c.lookAt(lerp(-2, 2, k), lerp(height(0, 10) + 3, 30, k), lerp(10, -60, k));
      tick(t + 10); wave(t); line(t);
    }, post: { bloom: [0.55, 0.7, 0.85], grade: [1.12, 1.0, 0.92] }
  };
}

// ---------- 3. Réveil : intérieur de cabane, dormeur sous les couvertures ----------
export function sWake2() {
  const s = new THREE.Scene(); s.background = new THREE.Color(0x05070b);
  s.fog = new THREE.Fog(0x0b1220, 5, 16);
  const W = 4.2, D = 3.6, H = 2.3;
  // murs en tôle + fenêtre
  const back = corrugated(W, H, 0x8a9096); back.position.set(0, H / 2, -D / 2); s.add(back);
  const left = corrugated(D, H, 0x7d848a); left.rotation.y = Math.PI / 2; left.position.set(-W / 2, H / 2, 0); s.add(left);
  const right = corrugated(D, H, 0x7d848a); right.rotation.y = -Math.PI / 2; right.position.set(W / 2, H / 2, 0); s.add(right);
  const roof = corrugated(W, D, 0x6a7076); roof.rotation.x = Math.PI / 2; roof.position.set(0, H, 0); s.add(roof);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), std(0x4a3a2c, { roughness: 1, map: noiseTexture(6, 2), bumpMap: noiseTexture(12, 6), bumpScale: 3 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; s.add(floor);
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.9), std(0xffffff, { map: stripeTexture(21) })); rug.rotation.x = -Math.PI / 2; rug.position.set(0.5, 0.005, 0.6); rug.receiveShadow = true; s.add(rug);
  // fenêtre givrée
  const frost = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); const gr = x.createRadialGradient(128, 128, 30, 128, 128, 180); gr.addColorStop(0, '#9fc3ff'); gr.addColorStop(0.6, '#d8e8ff'); gr.addColorStop(1, '#ffffff'); x.fillStyle = gr; x.fillRect(0, 0, 256, 256); const r = rng(3); x.strokeStyle = 'rgba(255,255,255,0.8)'; for (let i = 0; i < 160; i++) { let px = r() < 0.5 ? (r() < 0.5 ? 0 : 256) : r() * 256, py = r() < 0.5 ? r() * 256 : (r() < 0.5 ? 0 : 256); x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 6; k++) { px += (128 - px) * 0.12 + (r() - 0.5) * 30; py += (128 - py) * 0.12 + (r() - 0.5) * 30; x.lineTo(px, py); } x.lineWidth = 0.5 + r() * 1.5; x.stroke(); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const win = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.6), new THREE.MeshBasicMaterial({ map: frost, color: hdr(0xffffff, 1.6) })); win.position.set(0.9, 1.5, -D / 2 + 0.05); s.add(win);
  const wf = std(0x5b3a1e, { roughness: 1 });
  [[0, 0.33, 0.95, 0.06], [0, -0.33, 0.95, 0.06], [-0.45, 0, 0.06, 0.72], [0.45, 0, 0.06, 0.72], [0, 0, 0.04, 0.6]].forEach(([x, y, w, h]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.06), wf); m.position.set(0.9 + x, 1.5 + y, -D / 2 + 0.07); s.add(m); });
  const winLight = new THREE.SpotLight(0xa8c4ff, 28, 9, 0.8, 0.7, 1.2); winLight.position.set(0.9, 1.6, -D / 2 + 0.2); winLight.target.position.set(-0.6, 0.4, 0.6); winLight.castShadow = true; winLight.shadow.mapSize.set(1024, 1024); s.add(winLight, winLight.target);
  s.add(new THREE.HemisphereLight(0x8090b0, 0x3a2a1f, 1.6));
  const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.14, 12), std(0xf3ead8)); candle.position.set(1.15, 0.72, -1.2); s.add(candle);
  const flm = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 8), new THREE.MeshBasicMaterial({ color: hdr(0xffb050, 6) })); flm.scale.y = 1.8; flm.position.set(1.15, 0.82, -1.2); s.add(flm);
  const cl = new THREE.PointLight(0xff9a40, 4, 5, 1.4); cl.position.set(1.15, 0.9, -1.2); cl.castShadow = true; s.add(cl);
  // lit
  const bedX = -0.9, bedZ = -0.2, bw = 1.5, bl = 2.1, bh = 0.45;
  const frame = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.1, 0.25, bl + 0.1), std(0x4a2f1a, { roughness: 1, map: noiseTexture(2, 3) })); frame.position.set(bedX, 0.25, bedZ); frame.castShadow = frame.receiveShadow = true; s.add(frame);
  const head = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.1, 0.9, 0.08), std(0x4a2f1a, { roughness: 1 })); head.position.set(bedX, 0.6, bedZ - bl / 2 - 0.05); s.add(head);
  const mattress = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.12, bl), std(0xd9cdb5)); mattress.position.set(bedX, bh - 0.06, bedZ); s.add(mattress);
  const pillow = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 12), std(0xe8e0d0)); pillow.scale.set(1.3, 0.35, 0.7); pillow.position.set(bedX - 0.15, bh + 0.08, bedZ - bl / 2 + 0.3); s.add(pillow);
  // couverture drapée sur un corps
  const body = (x, z) => { const u = (x - bedX + 0.15) / 0.32, v = (z - bedZ - 0.15) / 0.85; const e = 1 - u * u - v * v; return e > 0 ? Math.sqrt(e) * 0.26 : 0; };
  const drape = (w, l, lift, seed, mat) => {
    const g = new THREE.PlaneGeometry(w, l, 60, 70); g.rotateX(-Math.PI / 2); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i) + bedX, z = p.getZ(i) + bedZ + 0.2;
      let y = bh + 0.02 + lift + body(x, z) + Math.sin(x * 9 + z * 3 + seed) * 0.012 + (fbm(x * 3 + seed, z * 3) - 0.5) * 0.04;
      const over = Math.abs(x - bedX) - bw / 2;
      if (over > 0) { y -= over * 3.2; p.setX(i, bedX + Math.sign(x - bedX) * (bw / 2 + over * 0.25) - bedX); }
      p.setY(i, Math.max(y, 0.06)); p.setZ(i, z - bedZ);
    }
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat); m.position.set(bedX, 0, bedZ); m.castShadow = m.receiveShadow = true; s.add(m); return m;
  };
  drape(bw + 0.9, 1.7, 0.0, 1, std(0x7a2a24, { roughness: 1, side: THREE.DoubleSide, bumpMap: noiseTexture(20, 3), bumpScale: 2 }));
  drape(bw + 0.7, 1.45, 0.03, 4, std(0xffffff, { roughness: 0.95, side: THREE.DoubleSide, map: (() => { const t = stripeTexture(8); t.repeat.set(1, 2); return t; })() }));
  drape(bw + 0.5, 1.2, 0.06, 7, std(0x6d5a48, { roughness: 1, side: THREE.DoubleSide, bumpMap: noiseTexture(30, 9), bumpScale: 3 }));
  // dormeur : visage + bonnet chullo
  const skin = std(0x8a5636, { roughness: 0.6 });
  const hd = new THREE.Group(); hd.position.set(bedX - 0.15, bh + 0.27, bedZ - bl / 2 + 0.36); hd.rotation.set(-1.25, 0.25, 0); s.add(hd);
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.13, 24, 18), skin); face.scale.set(0.95, 1.08, 1); hd.add(face);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.05, 8), skin); nose.rotation.x = Math.PI / 2; nose.position.set(0, -0.01, 0.13); hd.add(nose);
  [-0.045, 0.045].forEach((x) => { const e = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.006, 0.01), std(0x111111)); e.position.set(x, 0.025, 0.122); hd.add(e); });
  const chullo = new THREE.Mesh(new THREE.SphereGeometry(0.142, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.6), std(0xffffff, { map: stripeTexture(33) })); chullo.position.y = 0.02; hd.add(chullo);
  const pom = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), std(0xd81b60)); pom.position.y = 0.17; hd.add(pom);
  [-1, 1].forEach((sx) => { const f = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 10), std(0xffffff, { map: stripeTexture(33) })); f.position.set(sx * 0.12, -0.08, -0.01); f.rotation.z = Math.PI - sx * 0.2; hd.add(f); });
  // accessoires
  const nail = (x, y, obj) => { obj.position.set(x, y, D / 2 - 0.08); s.add(obj); };
  const jacket = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.75, 0.08), std(0xe65100)); nail(1.2, 1.4, jacket); jacket.rotation.y = Math.PI;
  [0.2, 0.0].forEach((y) => { const st = new THREE.Mesh(new THREE.BoxGeometry(0.61, 0.04, 0.085), std(0xd7dde2, { metalness: 0.6, roughness: 0.3 })); nail(1.2, 1.4 + y - 0.1, st); });
  const helm = new THREE.Mesh(new THREE.LatheGeometry([[0, 0.22], [0.1, 0.2], [0.16, 0.12], [0.17, 0.02], [0.22, 0], [0.22, -0.02], [0, -0.02]].map(([x, y]) => new THREE.Vector2(x * 1.4, y * 1.4)), 28), std(0xf9c000, { roughness: 0.35 })); helm.rotation.x = -Math.PI / 2 + 0.3; nail(0.4, 1.6, helm);
  // réchaud, casserole, bidons, étagère
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.04, 0.3), wf); shelf.position.set(1.4, 1.05, -D / 2 + 0.17); s.add(shelf);
  const r = rng(12);
  for (let i = 0; i < 7; i++) { const can = new THREE.Mesh(new THREE.CylinderGeometry(0.05 + r() * 0.03, 0.05 + r() * 0.03, 0.12 + r() * 0.12, 14), std([0xc62828, 0xf9a825, 0x1565c0, 0xeeeeee, 0x2e7d32][i % 5], { metalness: 0.5, roughness: 0.4 })); can.position.set(0.9 + i * 0.15, 1.13, -D / 2 + 0.17); s.add(can); }
  const table = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.55), wf); table.position.set(1.45, 0.62, -1.3); s.add(table);
  [[-0.4, -0.22], [0.4, -0.22], [-0.4, 0.22], [0.4, 0.22]].forEach(([x, z]) => { const l = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.6, 0.05), wf); l.position.set(1.45 + x, 0.3, -1.3 + z); s.add(l); });
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.14, 18), std(0x9e1b1b, { metalness: 0.6, roughness: 0.4 })); tank.position.set(1.3, 0.72, -1.3); s.add(tank);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.16, 22, 1, true), std(0xb0b4b8, { metalness: 0.9, roughness: 0.35, side: THREE.DoubleSide })); pot.position.set(1.3, 0.9, -1.3); s.add(pot);
  const iceTop = new THREE.Mesh(new THREE.CircleGeometry(0.13, 22), std(0xcfe8ff, { roughness: 0.05, metalness: 0.1 })); iceTop.rotation.x = -Math.PI / 2; iceTop.position.set(1.3, 0.95, -1.3); s.add(iceTop);
  const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.1, 14), std(0x1565c0, { roughness: 0.3 })); mug.position.set(1.65, 0.7, -1.2); s.add(mug);
  [[1.75, 0.95], [1.5, 1.25], [1.8, 1.4]].forEach(([x, z], i) => { const j = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.42, 0.2), std([0x1565c0, 0xeeeeee, 0x2e7d32][i], { roughness: 0.4 })); j.position.set(x, 0.21, z - 1.9); j.rotation.y = r(); j.castShadow = true; s.add(j); });
  const boots = new THREE.Group(); [-0.08, 0.08].forEach((x) => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.28, 0.28), std(0x1b1b1b, { roughness: 0.5 })); b.position.set(x, 0.14, 0); boots.add(b); }); boots.position.set(0.1, 0, 0.9); boots.rotation.y = 0.4; s.add(boots);
  // image pieuse et calendrier
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.34), new THREE.MeshStandardMaterial({ map: stripeTexture(44) })); pic.position.set(-0.4, 1.55, -D / 2 + 0.06); s.add(pic);
  const cal = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.4), std(0xf4f1ea)); cal.position.set(-W / 2 + 0.05, 1.4, 0.8); cal.rotation.y = Math.PI / 2; s.add(cal);
  // givre, poussière, buée
  const dust = makeParticles({ count: 600, color: 0xcfe3ff, size: 0.012, opacity: 0.9, box: [4, 2.3, 3.6] }); dust.position.y = 1.15; s.add(dust);
  const breath = []; for (let i = 0; i < 10; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTexture(), color: 0xe6f0ff, transparent: true, opacity: 0, depthWrite: false })); s.add(sp); breath.push(sp); }
  const mouth = new THREE.Vector3(bedX - 0.1, bh + 0.33, bedZ - bl / 2 + 0.5);
  const c = cam(42);
  return {
    scene: s, camera: c, update(t, d, g) {
      const k = ease(t / d);
      c.position.set(lerp(1.35, 0.85, k), lerp(1.55, 1.35, k), lerp(1.6, 1.15, k));
      c.lookAt(lerp(-0.6, -0.9, k), lerp(0.75, 0.65, k), lerp(-0.6, -0.9, k));
      c.userData.focus = c.position.distanceTo(mouth);
      const heart = smooth(16.1, 16.6, g), period = 2.6 - heart * 1.2;
      breath.forEach((sp, i) => {
        const life = ((t + i * period / breath.length) % period);
        const u = life / period;
        sp.position.copy(mouth).add(new THREE.Vector3(0.05 + u * 0.25, u * 0.25, 0.1 + u * 0.35));
        const sc = 0.05 + u * 0.35; sp.scale.set(sc, sc, 1); sp.material.opacity = Math.sin(u * Math.PI) * 0.18;
      });
      updateParticles(dust, t, (i, t, a, b, cc) => [a * t * 0.05, b * t * 0.03 - t * 0.02, cc * t * 0.05]);
    }, post: { bloom: [0.45, 0.5, 0.95], grade: [1.05, 1.05, 1.15], dof: { aperture: 0.003, maxblur: 0.005 } }
  };
}

// ---------- 3/5. La ville de jour puis le glacier, les mines et l'or ----------
export function sCity2() {
  const { s, glow, glowSprite, tick } = townScene({ mood: 'day' });
  const wave = addTownExtras(s);
  const mines = addMines(s);
  const line = addMinerLine(s, { n: 14, x0: 2, z0: -22, z1: -39 });
  const c = cam(45);
  return {
    scene: s, camera: c, update(t, d, g) {
      const k1 = ease(clamp(t / 6)), k2 = ease(clamp((g - 28.4) / 3.0));
      const A = new THREE.Vector3(lerp(-30, 10, k1), height(lerp(-30, 10, k1), 30) + 11, lerp(30, 24, k1));
      const B = new THREE.Vector3(-4, height(-4, -22) + 7, -22);
      c.position.copy(A).lerp(B, k2);
      const look = new THREE.Vector3(lerp(-10, 15, k1), height(0, 0) + 1, -5).lerp(new THREE.Vector3(3, height(3, -40) + 4, -44), k2);
      c.lookAt(look);
      const gk = smooth(29.8, 31.3, g);
      mines(gk); glow.intensity = gk * 500; glowSprite.material.opacity = gk * 0.5;
      tick(t + 20); wave(t); line(t);
    }, post: { bloom: [0.45, 0.6, 0.95], grade: [1.2, 1.18, 1.14] }
  };
}

// ---------- 6. La coca : plan de profil, chuspa, file de mineurs vers le glacier ----------
export function sCoca2() {
  const { s, tick, sun } = townScene({ mood: 'day' });
  sun.position.set(-60, 70, 40); sun.intensity = 3.2;
  addMines(s, { gold: false });
  const line = addMinerLine(s, { n: 8, x0: -16, z0: -24, z1: -38 });
  const miner = makePerson2({ type: 'miner', seed: 3 }); s.add(miner);
  const lsh = new THREE.Shape(); lsh.moveTo(0, -0.5); lsh.quadraticCurveTo(0.34, -0.05, 0, 0.5); lsh.quadraticCurveTo(-0.34, -0.05, 0, -0.5);
  const leafGeo = new THREE.ShapeGeometry(lsh, 10);
  { const p = leafGeo.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, -Math.abs(p.getX(i)) * 0.35); leafGeo.computeVertexNormals(); }
  const lr = rng(66);
  const leafMat = () => std(new THREE.Color(0x4f9a32).multiplyScalar(0.75 + lr() * 0.45), { side: THREE.DoubleSide, roughness: 0.45, emissive: 0x0d2a08, emissiveIntensity: 0.6 });
  // chuspa (bourse à coca) ouverte, côté caméra, avec des feuilles qui dépassent
  const chuspa = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 0.08), std(0xffffff, { map: stripeTexture(17) })); miner.userData.torso.add(chuspa); chuspa.position.set(-0.3, 0.0, 0.08);
  for (let i = 0; i < 9; i++) { const l = new THREE.Mesh(leafGeo, leafMat()); l.scale.setScalar(0.09); l.position.set(-0.3 + (lr() - 0.5) * 0.15, 0.13 + lr() * 0.03, 0.08 + (lr() - 0.5) * 0.04); l.rotation.set((lr() - 0.5) * 0.6, lr() * 3, (lr() - 0.5) * 0.8); miner.userData.torso.add(l); }
  const strap = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.012, 6, 30), std(0xd81b60)); strap.rotation.set(0, 0, -0.7); strap.position.set(-0.05, 0.3, 0); strap.scale.set(1, 1.2, 0.8); miner.userData.torso.add(strap);
  // poignée de feuilles dans la main côté caméra, en éventail
  const hand = new THREE.Group(); hand.position.y = -0.32; { const arm = miner.userData.arms[0]; const kids = arm.children.slice(1); kids.forEach((k) => { k.position.y += 0.32; hand.add(k); }); arm.add(hand); }
  const held = new THREE.Group();
  for (let i = 0; i < 14; i++) { const l = new THREE.Mesh(leafGeo, leafMat()); const a = (i / 13 - 0.5) * 2.2; l.scale.setScalar(0.19 + lr() * 0.05); l.position.set(Math.sin(a) * 0.06, -0.06 - Math.cos(a) * 0.03, 0.04 + i * 0.002); l.rotation.set((lr() - 0.5) * 0.3, (lr() - 0.5) * 0.4, a + Math.PI); held.add(l); }
  held.position.set(0.02, -0.33, 0.12); held.rotation.set(0.9, 0, 0); hand.add(held);
  // joue gonflée (boule de coca)
  const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), std(0x8a5636, { roughness: 0.6 })); cheek.position.set(-0.09, -0.04, 0.07); miner.userData.head.add(cheek);
  const c = cam(38);
  return {
    scene: s, camera: c, update(t, d) {
      const mz = -31 - t * 0.5, mx = -8;
      miner.position.set(mx, height(mx, mz), mz); miner.rotation.y = Math.PI;
      const ph = t * 4.2, { legs, arms, torso, head } = miner.userData;
      legs[0].rotation.x = Math.sin(ph) * 0.4; legs[1].rotation.x = -Math.sin(ph) * 0.4;
      arms[1].rotation.x = Math.sin(ph) * 0.3; torso.rotation.x = 0.12;
      // la main côté caméra remonte la poignée de feuilles vers la bouche
      const lift = smooth(0.2, 1.2, t);
      arms[0].rotation.x = lerp(-Math.sin(ph) * 0.3, -1.05, lift); arms[0].rotation.z = lerp(0, 0.35, lift);
      hand.rotation.x = lerp(0, -2.1 + Math.sin(t * 1.5) * 0.08, lift); hand.rotation.z = lerp(0, -0.4, lift);
      head.rotation.y = 0.3; head.rotation.x = -0.1;
      const cx = mx + 1.9, cz = mz - 2.1;
      c.position.set(cx, height(mx, mz) + 1.6, cz);
      c.lookAt(mx + 0.1, height(mx, mz) + 1.5, mz);
      c.userData.focus = c.position.distanceTo(miner.position.clone().add(new THREE.Vector3(0, 1.5, 0)));
      tick(t + 30); line(t);
    }, post: { bloom: [0.35, 0.5, 0.95], grade: [1.15, 1.12, 1.06], dof: { aperture: 0.0025, maxblur: 0.008 } }
  };
}

// ---------- 10. Le verdict : un mineur trie ses pierres sous la lampe ----------
export function sVerdict2() {
  const s = new THREE.Scene(); s.background = new THREE.Color(0x030303);
  s.fog = new THREE.Fog(0x050403, 4, 12);
  const back = corrugated(7, 3, 0x5a5048); back.position.set(0, 1.5, -1.6); s.add(back);
  const side = corrugated(5, 3, 0x4f463f); side.rotation.y = Math.PI / 2; side.position.set(-2.5, 1.5, 0.5); s.add(side);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), std(0x2e241c, { roughness: 1, map: noiseTexture(8, 2) })); floor.rotation.x = -Math.PI / 2; floor.position.y = -0.85; s.add(floor);
  // table en planches
  const wood = std(0x6b4a2e, { roughness: 1, map: noiseTexture(5, 7), bumpMap: noiseTexture(10, 9), bumpScale: 4 });
  for (let i = 0; i < 6; i++) { const pl = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.08, 0.36), wood); pl.position.set(0, -0.04, -0.9 + i * 0.37); pl.rotation.y = (i % 2 - 0.5) * 0.01; pl.castShadow = pl.receiveShadow = true; s.add(pl); }
  [[-1.45, -0.8], [1.45, -0.8], [-1.45, 0.9], [1.45, 0.9]].forEach(([x, z]) => { const l = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 0.1), wood); l.position.set(x, -0.45, z); s.add(l); });
  // tissu, batea, tas de pierres, paillettes d'or
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.7, 20, 20), std(0xffffff, { map: stripeTexture(5), side: THREE.DoubleSide }));
  { const p = cloth.geometry.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, (fbm(p.getX(i) * 4, p.getY(i) * 4) - 0.5) * 0.04); cloth.geometry.computeVertexNormals(); }
  cloth.rotation.x = -Math.PI / 2; cloth.position.set(0.85, 0.01, 0.45); cloth.receiveShadow = true; s.add(cloth);
  const batea = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.25, 0.01], [0.38, 0.06], [0.42, 0.1], [0.43, 0.11]].map(([x, y]) => new THREE.Vector2(x, y)), 40), std(0x8a5a32, { side: THREE.DoubleSide, roughness: 0.8, map: noiseTexture(3, 5) })); batea.position.set(-0.35, 0.0, -0.2); batea.castShadow = true; s.add(batea);
  const sand = new THREE.Mesh(new THREE.CircleGeometry(0.28, 30), std(0x5a5048, { roughness: 1, bumpMap: noiseTexture(8, 3), bumpScale: 5 })); sand.rotation.x = -Math.PI / 2; sand.position.set(-0.35, 0.025, -0.2); s.add(sand);
  const rocks = makeRocks({ count: 260, seed: 9, spread: 1.3, pile: 0.7, color: 0x6f665c }); rocks.position.set(0.75, 0, -0.45); rocks.scale.setScalar(0.45); s.add(rocks);
  const goldM = std(0xffc23d, { metalness: 1, roughness: 0.2, emissive: 0x6a4000, emissiveIntensity: 0.6 });
  const specks = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.008, 0), goldM, 25);
  const so = new THREE.Object3D(), sr = rng(14); for (let i = 0; i < 25; i++) { so.position.set(-0.35 + (sr() - 0.5) * 0.25, 0.035, -0.2 + (sr() - 0.5) * 0.25); so.scale.setScalar(0.6 + sr()); so.updateMatrix(); specks.setMatrixAt(i, so.matrix); } s.add(specks);
  const lsh = new THREE.Shape(); lsh.moveTo(0, -0.5); lsh.quadraticCurveTo(0.32, 0, 0, 0.5); lsh.quadraticCurveTo(-0.32, 0, 0, -0.5);
  const lr = rng(4); for (let i = 0; i < 16; i++) { const l = new THREE.Mesh(new THREE.ShapeGeometry(lsh, 6), std(new THREE.Color(0x4a7d2a).multiplyScalar(0.7 + lr() * 0.4), { side: THREE.DoubleSide })); l.rotation.set(-Math.PI / 2, 0, lr() * 6); l.scale.setScalar(0.08 + lr() * 0.03); l.position.set(0.85 + (lr() - 0.5) * 0.4, 0.015 + i * 0.001, 0.45 + (lr() - 0.5) * 0.3); s.add(l); }
  const helm = new THREE.Mesh(new THREE.LatheGeometry([[0, 0.22], [0.1, 0.2], [0.16, 0.12], [0.17, 0.02], [0.22, 0], [0.22, -0.02], [0, -0.02]].map(([x, y]) => new THREE.Vector2(x * 1.5, y * 1.5)), 28), std(0xf9c000, { roughness: 0.4 })); helm.position.set(1.25, 0.03, -0.55); s.add(helm);
  const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.28, 14), new THREE.MeshPhysicalMaterial({ color: 0x3a6a3a, roughness: 0.1, transmission: 0.6, thickness: 0.05 })); bottle.position.set(-1.25, 0.14, -0.5); s.add(bottle);
  // le mineur assis, penché sur la batea
  const miner = makePerson2({ type: 'miner', seed: 8 }); miner.position.set(-0.35, -1.25, -0.95); s.add(miner);
  miner.userData.legs.forEach((l) => { l.rotation.x = -1.4; });
  miner.traverse((o) => { if (o.isMesh && o.material.isMeshBasicMaterial) o.material = std(0x333333, { roughness: 0.3 }); });
  const fill = new THREE.PointLight(0xffb27a, 1.4, 3, 1.5); fill.position.set(-0.2, 0.9, 0.3); s.add(fill);
  miner.userData.torso.rotation.x = 0.35;
  miner.userData.arms[0].rotation.set(-0.9, 0, 0.3); miner.userData.arms[1].rotation.set(-1.0, 0, -0.2);
  const stool = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 0.45), wood); stool.position.set(-0.35, -0.62, -1.05); s.add(stool);
  // lampe suspendue
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.18, 24, 1, true), std(0x2e3b2e, { metalness: 0.6, roughness: 0.4, side: THREE.DoubleSide })); shade.position.set(0.1, 2.05, -0.1); s.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), new THREE.MeshBasicMaterial({ color: hdr(0xffd9a0, 2.5) })); bulb.position.set(0.1, 1.97, -0.1); s.add(bulb);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 2, 6), std(0x111111)); cord.position.set(0.1, 3.1, -0.1); s.add(cord);
  const lamp = new THREE.SpotLight(0xffc98a, 16, 8, 0.95, 0.55, 1.5); lamp.position.copy(bulb.position); lamp.target.position.set(0, 0, 0); lamp.castShadow = true; lamp.shadow.mapSize.set(2048, 2048); s.add(lamp, lamp.target);
  s.add(new THREE.AmbientLight(0x3a2c20, 0.9));
  const glint = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTexture(), color: 0xffd34d, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); glint.position.set(-0.32, 0.06, -0.18); s.add(glint);
  const c = cam(36);
  return {
    scene: s, camera: c, update(t, d, g) {
      const k = ease(t / d);
      c.position.set(lerp(1.6, 1.1, k), lerp(1.25, 1.0, k), lerp(2.3, 1.7, k)); c.lookAt(lerp(-0.2, -0.3, k), 0.3, lerp(-0.6, -0.55, k));
      c.userData.focus = c.position.distanceTo(new THREE.Vector3(-0.35, 0.3, -0.6));
      const fl = (g > 69.3 && g < 70.6) ? (Math.sin(g * 53) > 0.2 ? 1 : 0.35) : 1;
      const dim = 1 - smooth(70.6, 73.2, g) * 0.55;
      lamp.intensity = 16 * fl * dim; bulb.material.color.copy(hdr(0xffd9a0, 2.5 * fl * dim));
      const gv = Math.pow(Math.max(0, Math.sin(g * 2.2)), 30) * (1 - smooth(69.2, 69.8, g));
      glint.material.opacity = gv; glint.scale.setScalar(0.08 + gv * 0.2);
      goldM.emissiveIntensity = 0.6 * (1 - smooth(69.2, 70.2, g));
      miner.userData.arms[1].rotation.x = -1.0 + Math.sin(t * 2.5) * 0.12;
      miner.userData.torso.rotation.y = Math.sin(t * 0.8) * 0.06;
    }, post: { bloom: [0.7, 0.55, 0.8], grade: [1.12, 0.97, 0.85], dof: { aperture: 0.008, maxblur: 0.008 } }
  };
}
