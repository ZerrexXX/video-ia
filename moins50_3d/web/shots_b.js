// Plans 11 à 18 (pilotis, coupe du sol, marché, lancer d'eau bouillante, retour au chaud).
import {
  THREE, V, rng, clamp, prog, ease, easeOut, easeIn, lerp, cv, std, emis, box, cyl, sph, shadows, shadowLight, camera, look,
  sky, snowGround, halo, pool, lamp, building, emitter, fogBank, points, snowfall, person, textSprite,
  frostMaterial, woodTex, noiseTex, glowTex, puffTex, fishGeometry, fishMat, SODIUM, NAVY, RED, FUR,
} from './lib.js';
import { night } from './shots_a.js';

const Y = V(0, 1, 0);

// ---------- plan 11 : sous l'immeuble, grue en remontée ----------
function s11() {
  const scene = night(0.016, 0x1b2a44);
  const moon = shadowLight(new THREE.DirectionalLight(0x8fb0ff, 0.6), 30, 90, 2048); moon.position.set(10, 30, 20); scene.add(moon);
  scene.add(snowGround(400, 0xdde6f0, 120));
  const b = building({ w: 48, d: 14, px: 112, lift: 1.9, pipes: true, balconies: true, pileStep: 2.4, pileRows: 5, seed: 12, lit: 0.6, glow: 1.8 });
  b.position.set(0, 0, -7); shadows(b); scene.add(b);
  const back = new THREE.PointLight(SODIUM, 55, 50, 1.4); back.position.set(-5, 0.9, -17); scene.add(back);
  const hb = halo(SODIUM, 9, 0.9); hb.position.set(-5, 1.0, -17.5); scene.add(hb);
  const hb2 = halo(SODIUM, 7, 0.7); hb2.position.set(9, 1.0, -18); scene.add(hb2);
  const l = lamp({ light: 320 }); l.position.set(9, 0, 5); l.rotation.y = Math.PI * 0.75; scene.add(l);
  const bank = fogBank({ n: 34, box: [-20, 20, 0.2, 1.4, -15, 3], size: 5, opacity: 0.055, color: 0x8f9fb8 }); scene.add(bank);
  const snow = snowfall(700, { box: [18, 26, 14], size: 0.04, speed: 0.4 }); scene.add(snow);
  const cam = camera(50, 0.1, 2500);
  return { scene, camera: cam, update(t, d, fx) {
    const k = ease(prog(t, 0.5, 4.2)), y = 0.8 + 21 * k * k;
    look(cam, 3 - 2 * k, y, 5.5 + 6.5 * k, -3 + 3 * k, y + lerp(0.1, 11, k), -7 + 7 * k);
    bank.update(t); snow.update(t, [1, Math.max(0, y - 8), 4]);
    fx.bloom = 0.7; fx.threshold = 0.75;
  } };
}

// ---------- plan 12 : coupe géologique ----------
function s12() {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x070c18); scene.fog = new THREE.FogExp2(0x101a2c, 0.012);
  scene.add(sky(0x060b18, 0x1b2a44));
  scene.add(new THREE.HemisphereLight(0x7f9fe0, 0x0c1424, 0.5));
  const top = shadowLight(new THREE.DirectionalLight(0xbcd4ff, 2.0), 16, 60, 2048); top.position.set(3, 14, 9); top.target.position.set(0, -4, 0); scene.add(top, top.target);
  const PXM = 44, SW = 24, SH = 30, R = rng(77), shards = [];
  for (let i = 0; i < 420; i++) { const x = R() * SW * PXM, y = (3.3 + Math.pow(R(), 0.8) * (SH - 3.3)) * PXM, n = 3 + ((R() * 3) | 0), pts = []; for (let j = 0; j < n; j++) { const a = (j / n) * 6.28 + R(), r = 20 + R() * 70; pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r * 0.7]); } shards.push({ pts, a: R() }); }
  const lenses = []; for (let i = 0; i < 40; i++) lenses.push([R() * SW * PXM, (3.5 + R() * (SH - 4)) * PXM, 16 + R() * 50, 2 + R() * 4]);
  const draw = (g, em) => {
    const w = SW * PXM, h = SH * PXM;
    if (em) { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); } else {
      let gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, '#eef4fa'); gr.addColorStop(0.7 / SH, '#cfdcea'); gr.addColorStop(0.72 / SH, '#7a6350'); gr.addColorStop(3.1 / SH, '#54483f');
      gr.addColorStop(3.4 / SH, '#2d5f93'); gr.addColorStop(0.45, '#184779'); gr.addColorStop(1, '#081a36');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      const R2 = rng(3);
      for (let i = 0; i < 500; i++) { const x = R2() * w, y = (0.8 + R2() * 2.4) * PXM; g.fillStyle = `rgba(${120 + R2() * 50},${110 + R2() * 40},${100 + R2() * 30},0.6)`; g.beginPath(); g.ellipse(x, y, 3 + R2() * 10, 2 + R2() * 6, R2() * 3, 0, 7); g.fill(); }
      for (let i = 0; i < 90; i++) { const x = R2() * w, y = (0.8 + R2() * 2.3) * PXM; g.strokeStyle = 'rgba(220,235,250,0.5)'; g.lineWidth = 1 + R2() * 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (R2() - 0.5) * 80, y + R2() * 40); g.stroke(); }
      g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 3; g.beginPath(); for (let x = 0; x <= w; x += 16) g.lineTo(x, 0.7 * PXM + Math.sin(x * 0.02) * 5); g.stroke();
    }
    for (const s of shards) {
      g.beginPath(); s.pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath();
      g.fillStyle = em ? `rgba(60,150,255,${0.04 + s.a * 0.1})` : `rgba(140,200,255,${0.03 + s.a * 0.12})`; g.fill();
      g.strokeStyle = em ? `rgba(120,200,255,${0.1 + s.a * 0.3})` : `rgba(190,230,255,${0.1 + s.a * 0.3})`; g.lineWidth = 1.5; g.stroke();
    }
    for (const l of lenses) { g.fillStyle = em ? 'rgba(140,210,255,0.45)' : 'rgba(215,240,255,0.7)'; g.beginPath(); g.ellipse(l[0], l[1], l[2], l[3], 0, 0, 7); g.fill(); }
  };
  const map = cv(SW * PXM, SH * PXM, (g) => draw(g, false)), emap = cv(SW * PXM, SH * PXM, (g) => draw(g, true));
  const sec = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), std(0xffffff, 0.75, 0, { map, emissiveMap: emap, emissive: 0xffffff, emissiveIntensity: 0.9, bumpMap: noiseTex(), bumpScale: 2 }));
  sec.position.set(0, -SH / 2, 0); sec.receiveShadow = true; scene.add(sec);
  const g0 = box(SW, 0.1, 30, std(0xe6eef6, 0.95), 0, -0.05, -15); g0.receiveShadow = true; scene.add(g0);
  const b = building({ w: 20, d: 10, lift: 1.9, seed: 3, px: 96, pipes: true, piles: false, lit: 0.6 }); b.position.set(0, 0, -5.4); shadows(b); scene.add(b);
  const pm = std(0x9a9da0, 0.95, 0, { bumpMap: noiseTex(), bumpScale: 3 });
  for (let x = -8.4; x <= 8.4; x += 1.68) { const p = box(0.44, 12.4, 0.44, pm, x, 1.9 - 6.2, -0.05); p.castShadow = true; scene.add(p); }
  for (let x = -8.4; x <= 8.4; x += 1.68) scene.add(box(0.44, 2, 0.44, pm, x, 0.9, -4));
  const lab = (txt, y, o = {}) => { const s = textSprite(txt, o), sc = (o.scale ?? 0.5) * 2.1; s.position.set(-2.95 + 4 * sc, y, 0.5); s.scale.setScalar(sc); scene.add(s); return s; };
  lab('NEIGE', 0.75, { size: 70, scale: 0.4 }); lab('SOL GELÉ', -1.95, { size: 70, scale: 0.42, color: '#f0d9b8' });
  lab('PERMAFROST', -6.0, { size: 84, scale: 0.62, color: '#7FE8FF' }); lab('gelé toute l\'année', -7.25, { size: 60, scale: 0.44 });
  lab('↓ des centaines de mètres', -12.6, { size: 56, scale: 0.42, color: '#bfe6ff' });
  const sp = points(260, { color: 0x9fdcff, sparkle: 1, seed: 6 });
  { const u = sp.userData; for (let i = 0; i < 260; i++) { u.pos.set([(R() - 0.5) * 8, -3.4 - R() * 16, 0.05], i * 3); u.size[i] = 0.03 + R() * 0.04; u.alpha[i] = 0.9; } sp.flush(); }
  scene.add(sp);
  const hl = halo(SODIUM, 8, 0.7); hl.position.set(-3, 1.0, -11); scene.add(hl);
  const snow = snowfall(300, { box: [12, 9, 6], size: 0.05, speed: 0.4, y0: 0.2 }); scene.add(snow);
  const cam = camera(40, 0.1, 2500);
  return { scene, camera: cam, update(t, d, fx) {
    const y = lerp(4.6, -9.6, ease(prog(t, 0.1, 3.9)));
    look(cam, 0, y, 16, 0, y - 0.4, 0);
    sp.material.uniforms.uTime.value = t; snow.update(t, [0, 0, 3]);
    fx.black = prog(t, d - 4 / 30, d); fx.bloom = 0.6; fx.sat = 0.95;
  } };
}

// ---------- plan 13 : le marché ----------
function dayScene(fogD = 0.03) {
  const scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(0xb9c7da, fogD);
  const sunDir = V(0.12, 0.13, -1).normalize();
  scene.add(sky(0x5f8ccc, 0xd9dce4, { sunDir, sunCol: 0xffb070, sunPow: 1.2, exp: 0.5 }));
  scene.add(new THREE.HemisphereLight(0xcfdcf6, 0x9aa5b8, 1.25));
  const ff = new THREE.DirectionalLight(0xe6ecff, 0.9); ff.position.set(-2, 5, 8); scene.add(ff);
  const sun = new THREE.DirectionalLight(0xffc48c, 2.6); sun.position.copy(sunDir).multiplyScalar(40); scene.add(sun, sun.target);
  return { scene, sun, sunDir };
}
function s13() {
  const { scene, sun, sunDir } = dayScene(0.034);
  shadowLight(sun, 12, 90, 2048); sun.target.position.set(0, 0, 2);
  scene.add(snowGround(300, 0xd5dee9, 120));
  const sh = halo(0xffc080, 60, 0.9); sh.position.copy(sunDir).multiplyScalar(300); sh.material.fog = false; scene.add(sh);
  const wood = std(0xffffff, 0.8, 0, { map: woodTex() }), snowM = std(0xeef4fa, 0.95), R = rng(13);
  const fg = fishGeometry(), fm = fishMat(), tarps = [0x2a5a9a, 0xa83228, 0x2f7a5a, 0xc8922a];
  const fishes = new THREE.InstancedMesh(fg, fm, 400); let nf = 0; const D = new THREE.Object3D();
  const crate = (x, y, z, ry) => {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry;
    g.add(box(0.62, 0.02, 0.44, wood, 0, 0.01, 0));
    for (const s of [-1, 1]) { g.add(box(0.62, 0.26, 0.02, wood, 0, 0.14, s * 0.21)); g.add(box(0.02, 0.26, 0.44, wood, s * 0.3, 0.14, 0)); }
    scene.add(g);
    for (let i = 0; i < 13; i++) {
      D.position.set(x + (R() - 0.5) * 0.46, y + 0.1, z + (R() - 0.5) * 0.3); D.rotation.set((R() - 0.5) * 0.35, R() * 6.28, (R() - 0.5) * 0.35); D.scale.setScalar(0.95 + R() * 0.5); D.updateMatrix();
      fishes.setMatrixAt(nf++, D.matrix);
    }
  };
  for (const side of [-1, 1]) for (let i = 0; i < 5; i++) {
    const z = 5 - i * 3.3, x = side * 1.3, g = new THREE.Group(); scene.add(g);
    g.add(box(1.0, 0.06, 2.6, wood, x, 0.84, z));
    for (const [dx, dz] of [[-0.42, -1.2], [0.42, -1.2], [-0.42, 1.2], [0.42, 1.2]]) g.add(box(0.07, 0.84, 0.07, wood, x + dx, 0.42, z + dz));
    for (const [dx, dz] of [[-0.55, -1.4], [0.6, -1.4], [-0.55, 1.4], [0.6, 1.4]]) g.add(cyl(0.03, 0.03, 2.5, std(0x6a707a, 0.5, 0.6), x + dx * 1.0, 1.25, z + dz, 6));
    const tp = box(1.5, 0.05, 3.0, std(tarps[(i + (side > 0 ? 2 : 0)) % 4], 0.8), x, 2.52, z); tp.rotation.z = -side * 0.12; g.add(tp);
    const ts = box(1.4, 0.09, 2.9, snowM, x, 2.6, z); ts.rotation.z = -side * 0.12; g.add(ts);
    const kind = (i + (side > 0 ? 1 : 0)) % 3;
    if (kind !== 1) { crate(x, 0.87, z - 0.7, 0.1); crate(x, 0.87, z + 0.1, -0.08); }
    if (kind === 1) for (let k = 0; k < 9; k++) { const m = box(0.34, 0.16, 0.24, std(k % 3 ? 0x6e2420 : 0x8a3a30, 0.6), x + (R() - 0.5) * 0.2, 0.95 + ((k / 3) | 0) * 0.165, z - 0.8 + (k % 3) * 0.36); m.rotation.y = (R() - 0.5) * 0.3; g.add(m); }
    if (kind !== 0) for (let k = 0; k < 2; k++) {
      const bx = x + (k ? 0.2 : -0.15), bz = z + 0.75 + k * 0.38;
      g.add(cyl(0.15, 0.12, 0.26, std(k ? 0x3a5a8a : 0x8a9098, 0.7, 0), bx, 1.0, bz, 14));
      g.add(sph(0.14, std(k ? 0x8a1428 : 0xb82a2a, 0.6), bx, 1.12, bz, 1, 0.45, 1));
    } else crate(x, 0.87, z + 0.9, 0.05);
    shadows(g);
  }
  fishes.count = nf; fishes.castShadow = true; fishes.receiveShadow = true; scene.add(fishes);
  // vendeuse
  const v = person({ coat: 0x6a2a3a, hatColor: 0xd9d0c2, scarfColor: 0x2a6a5a, scarf: 'up', boots: 0x5a4a3a, fur: 0xd9d0c2 });
  v.position.set(0.78, 0, 4.3); v.rotation.y = -0.75; scene.add(v);
  const mkFish = (hand) => { const f = new THREE.Mesh(fg, fm); f.scale.setScalar(1.25); f.position.set(0, -0.12, 0.02); f.castShadow = true; hand.add(f); };
  mkFish(v.parts.armL.hand); mkFish(v.parts.armR.hand);
  const walkers = [
    [person({ coat: 0x3a3f4a, hatColor: 0x2a2420, scarfColor: 0x8a7a5a, fur: 0x4a4038 }), -0.3, 1.5, -1, 0.9],
    [person({ coat: 0x5a4a2a, hatColor: 0x8a6a48, scarfColor: 0x39507a, fur: 0x8a6a48 }), 0.45, -4.5, 1, 0.8],
    [person({ coat: 0x2f4a3a, hatColor: 0xb8b0a0, scarfColor: 0x9a3a2a, fur: 0xb8b0a0 }), -0.35, -9, -1, 0.7],
  ];
  walkers.forEach(([p]) => scene.add(p));
  const breaths = [[0.62, 1.6, 4.5], ...walkers.map(() => [0, 0, 0])].map((o, i) => { const e = emitter({ n: 6, origin: [0, 0, 0], vel: [0, 0.25, 0], velRand: [0.25, 0.1, 0.25], life: 1.8, size0: 0.1, size1: 0.55, opacity: 0.14, color: 0xdfe6f0, seed: i + 2 }); e.position.set(...o); scene.add(e); return e; });
  const far = building({ w: 50, seed: 4, px: 32, glow: 0.4 }); far.position.set(6, 0, -42); scene.add(far);
  const bank = fogBank({ n: 26, box: [-8, 8, 0.5, 3, -30, -8], size: 7, opacity: 0.18, color: 0xe8e0dc }); scene.add(bank);
  const dust = snowfall(700, { box: [8, 5, 14], size: 0.02, speed: 0.12, sparkle: 0.9, color: 0xfff0d8, opacity: 0.9 }); scene.add(dust);
  const cam = camera(62, 0.1, 2500);
  const knocks = [0.3, 1.3, 2.3];
  return { scene, camera: cam, update(t, d, fx) {
    let kn = 0; for (const k of knocks) kn = Math.max(kn, Math.exp(-Math.pow((t - k) / 0.09, 2)));
    const open = 1 - kn;
    for (const [h, s] of [[v.parts.armL, 1], [v.parts.armR, -1]]) { h.a.rotation.x = -0.95; h.el.rotation.x = -1.15; h.a.rotation.z = s * (0.1 + open * 0.28) - s * 0.42; h.hand.rotation.z = s * 0.5; }
    v.parts.head.rotation.y = 0.3;
    walkers.forEach(([p, x, z0, dir, sp], i) => { const z = z0 + dir * sp * t; p.position.set(x, 0, z); p.rotation.y = dir > 0 ? 0 : Math.PI; p.walk(z * 4, 0.45); breaths[i + 1].position.set(x, 1.6, z + dir * 0.2); });
    breaths.forEach((e) => e.update(t + 4)); bank.update(t);
    const z = 9.6 - 0.85 * t;
    look(cam, 0.12 * Math.sin(t * 1.1) + 0.1, 1.55 + 0.025 * Math.sin(t * 3.4), z, 0.3, 1.25, z - 8, 0.01 * Math.sin(t * 1.7));
    dust.update(t, [0, 0.3, z - 5]);
    fx.black = 1 - prog(t, 0, 4 / 30); fx.bloom = 0.45; fx.exposure = 0.95; fx.warm = 0.08;
  } };
}

// ---------- plan 14 : stroganina ----------
function s14() {
  const { scene, sun, sunDir } = dayScene(0.1);
  shadowLight(sun, 0.9, 20, 2048); sun.position.set(-2.2, 2.4, -5); sun.target.position.set(0, 0.1, 0);
  const fillL = new THREE.DirectionalLight(0xcfe0ff, 0.9); fillL.position.set(1, 2, 3); scene.add(fillL);
  const wood = std(0xffffff, 0.75, 0, { map: woodTex() }), light = std(0xc9a678, 0.7, 0, { map: woodTex() });
  const tb = box(3, 0.06, 1.6, wood, 0, -0.03, -0.1); tb.receiveShadow = true; scene.add(tb);
  const bd = box(0.56, 0.03, 0.36, light, 0.04, 0.015, 0); bd.receiveShadow = true; bd.castShadow = true; scene.add(bd);
  // arrière-plan flou du marché
  for (const [x, c] of [[-1.6, 0x2a5a9a], [0.2, 0xa83228], [1.9, 0x2f7a5a]]) { scene.add(box(1.5, 0.08, 1, std(c, 0.8), x, 1.5, -3.2)); scene.add(box(1.3, 0.9, 0.8, std(0x5a4a3a, 0.9), x, 0.2, -3.2)); }
  const fishG = new THREE.Group(); fishG.position.set(0.16, 0.035, 0); fishG.rotation.z = 0.78; scene.add(fishG);
  const fish = new THREE.Mesh(fishGeometry(), fishMat()); fish.scale.set(1.5, 1.15, 1.5); fish.rotation.z = Math.PI; fish.position.y = 0.575; fishG.add(fish);
  fishG.add(sph(0.012, std(0x0a0a0a, 0.2), 0.02, 0.07, 0.036)); fishG.add(sph(0.012, std(0x4a5560, 0.5), 0, 0.3, -0.03, 2.2, 22, 1));
  const flesh = std(0xf0c4b0, 0.5), cut = box(0.045, 0.36, 0.02, flesh, 0, 0.3, 0.036); fishG.add(cut);
  const fur = std(0x7a6a58, 1, 0, { bumpMap: noiseTex(), bumpScale: 6 });
  fishG.add(sph(0.075, fur, 0.0, 0.6, 0.0, 1, 1.2, 0.9)); fishG.add(cyl(0.07, 0.085, 0.5, std(0x6a2a3a, 0.8), -0.12, 0.84, -0.02, 12).rotateZ(0.5));
  // couteau
  const knife = new THREE.Group(); knife.rotation.z = 0.78; scene.add(knife);
  knife.add(box(0.24, 0.05, 0.004, std(0xd8dde2, 0.3, 0.55), 0.03, 0, 0)); knife.add(cyl(0.016, 0.018, 0.13, std(0x3a2416, 0.6), 0.215, 0, 0, 10).rotateZ(Math.PI / 2));
  knife.add(sph(0.075, fur, 0.26, -0.01, 0.01, 1.2, 1, 0.9)); knife.add(cyl(0.07, 0.09, 0.6, std(0x6a2a3a, 0.8), 0.6, -0.02, 0.05, 12).rotateZ(Math.PI / 2));
  // copeaux enroulés
  const curlGeo = (() => {
    const N = 48, pos = [], idx = [];
    for (let j = 0; j <= N; j++) { const u = j / N, a = u * 3.6 * Math.PI, r = 0.019 * (1 - 0.45 * u); for (const s of [-1, 1]) pos.push(s * 0.026, r * Math.cos(a) - 0.019, r * Math.sin(a)); }
    for (let j = 0; j < N; j++) { const a = j * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
  })();
  const curlM = std(0xf6d8c8, 0.45, 0, { side: THREE.DoubleSide });
  const plate = new THREE.Group(); plate.position.set(-0.17, 0, 0.2); scene.add(plate);
  plate.add(cyl(0.135, 0.1, 0.02, std(0xf2f2ee, 0.3), 0, 0.012, 0, 32)); plate.add(new THREE.Mesh(new THREE.TorusGeometry(0.134, 0.005, 6, 40), std(0x2a4a8a, 0.4)).rotateX(Math.PI / 2).translateZ(-0.022));
  plate.add(new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.02, 12), std(0xffffff, 0.9)).translateX(-0.06).translateY(0.032).translateZ(-0.06));
  plate.add(new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.015, 12), std(0x2a2420, 0.9)).translateX(0.0).translateY(0.03).translateZ(-0.085));
  const R = rng(3), strokes = [0.2, 0.8, 1.5, 2.1, 2.9, 3.5], curls = [];
  for (let i = -3; i < strokes.length; i++) {
    const m = new THREE.Mesh(curlGeo, curlM); m.castShadow = true; scene.add(m);
    curls.push({ m, ts: i < 0 ? -9 : strokes[i], rest: V(-0.17 + (R() - 0.5) * 0.12, 0.045 + R() * 0.02, 0.2 + (R() - 0.5) * 0.1), rot: R() * 6 });
  }
  shadows(fishG); shadows(knife); shadows(plate);
  const breath = emitter({ n: 9, origin: [0.3, 0.12, 0.42], spread: [0.2, 0.1, 0.1], vel: [-0.22, 0.14, -0.05], velRand: [0.1, 0.08, 0.08], life: 2.4, size0: 0.12, size1: 0.5, opacity: 0.22, fog: false }); scene.add(breath);
  const dust = snowfall(120, { box: [1.4, 0.9, 1.2], size: 0.004, speed: 0.03, sparkle: 0.9, color: 0xfff0d8 }); scene.add(dust);
  const cam = camera(35, 0.02, 4000);
  const gnd = snowGround(200, 0xd5dee9, 60); gnd.position.y = -0.86; scene.add(gnd);
  const ax = V(-Math.sin(0.78), Math.cos(0.78), 0), nose = V(0.16, 0.035, 0);
  const kpos = (s) => nose.clone().addScaledVector(ax, s * 0.6).add(V(0, 0, 0.052));
  const DUR = 0.5;
  return { scene, camera: cam, update(t, d, fx) {
    let s = 0.86;
    for (const ts of strokes) { if (t >= ts && t < ts + DUR) s = lerp(0.86, 0.26, ease((t - ts) / DUR)); else if (t >= ts + DUR && t < ts + DUR + 0.2) s = lerp(0.26, 0.86, ease((t - ts - DUR) / 0.2)); }
    const lift = strokes.some((ts) => t >= ts && t < ts + DUR) ? 0 : 0.012;
    knife.position.copy(kpos(s)).add(V(0, 0, lift));
    for (const c of curls) {
      const u = t - c.ts, m = c.m;
      if (u < 0) { m.visible = false; continue; }
      m.visible = true;
      if (u < DUR) {
        const k = ease(u / DUR); m.geometry = curlGeo; m.scale.setScalar(0.25 + 0.95 * k);
        m.position.copy(kpos(lerp(0.86, 0.26, k))).addScaledVector(ax, -0.035).add(V(0, 0, 0.012)); m.rotation.set(0, 0, 0.78);
      } else {
        const f = Math.min(1, (u - DUR) / 0.75), p0 = kpos(0.26).addScaledVector(ax, -0.035);
        m.scale.setScalar(1.2); m.position.lerpVectors(p0, c.rest, f); m.position.y += Math.sin(Math.PI * f) * 0.05; m.rotation.set(f * 1.2, c.rot * f, 0.78 + f * c.rot * 0.4);
      }
    }
    breath.update(t + 2); dust.update(t, [0, 0, 0]);
    look(cam, 0.03 + 0.012 * Math.sin(t), 0.78, lerp(1.08, 1.0, t / d), -0.04, 0.2, 0.04);
    fx.bloom = 0.4; fx.exposure = 0.95; fx.warm = 0.1;
  } };
}

// ---------- plans 15 et 16 : la bouilloire, puis l'eau qui devient neige ----------
function wasteland() {
  const scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(0xd3bdb0, 0.0075);
  const sunDir = V(0.0, 0.17, -1).normalize();
  scene.add(sky(0x35629f, 0xf0b888, { sunDir, sunCol: 0xff9440, sunPow: 0.7, exp: 0.5 }));
  scene.add(new THREE.HemisphereLight(0x9fc0f4, 0x8f96a4, 0.8));
  const sun = shadowLight(new THREE.DirectionalLight(0xffb070, 3.4), 7, 120, 2048); sun.position.copy(sunDir).multiplyScalar(50); scene.add(sun, sun.target);
  const front = new THREE.DirectionalLight(0xbcd4ff, 0.5); front.position.set(2, 2, 6); scene.add(front);
  scene.add(snowGround(2400, 0xe4eaf2, 400));
  const s1 = halo(0xffa858, 300, 0.45); s1.position.copy(sunDir).multiplyScalar(1200); s1.material.fog = false; scene.add(s1);
  const s2 = halo(0xffe6c0, 60, 0.9); s2.position.copy(sunDir).multiplyScalar(1190); s2.material.fog = false; scene.add(s2);
  const R = rng(61), em = [];
  for (let i = 0; i < 9; i++) {
    const b = building({ w: 36 + R() * 20, floors: R() < 0.3 ? 5 : 9, seed: 200 + i, px: 16, glow: 0.5, lit: 0.3, piles: false }); b.position.set(-260 + i * 62 + R() * 20, 0, -230 - R() * 80); scene.add(b);
  }
  for (const [x, z, h] of [[-120, -330, 60], [70, -360, 75], [150, -300, 50]]) {
    scene.add(cyl(2.5, 3.5, h, std(0x7a7f86, 0.9), x, h / 2, z, 10));
    const e = emitter({ n: 22, origin: [x, h, z], vel: [0, 8, 0], velRand: [0.4, 1.5, 0.4], life: 16, size0: 8, size1: 46, opacity: 0.5, turb: 0.1, seed: x | 0, color: 0xf2dcc8 }); scene.add(e); em.push(e);
  }
  for (let i = 0; i < 9; i++) { scene.add(cyl(0.12, 0.14, 8, std(0x3a3028, 0.9), -60 + i * 22, 4, -46, 6)); scene.add(box(2.2, 0.12, 0.12, std(0x3a3028, 0.9), -60 + i * 22, 7.4, -46)); }
  for (let i = 0; i < 14; i++) scene.add(sph(1 + R() * 1.5, std(0xe4eaf2, 0.95), -30 + R() * 60, -0.3, -8 - R() * 30, 2, 0.5, 1.5, 10));
  const a = person(); a.rotation.y = Math.PI / 2 - 0.45; scene.add(a);
  const steel = std(0xb8bec5, 0.28, 0.9), k = new THREE.Group();
  k.add(sph(0.095, steel, 0, 0, 0, 1, 0.82, 1)); k.add(cyl(0.05, 0.05, 0.012, steel, 0, 0.078, 0)); k.add(sph(0.014, std(0x15110f, 0.5), 0, 0.094, 0));
  const spout = cyl(0.012, 0.022, 0.11, steel, 0, 0.03, 0.12, 8); spout.rotation.x = 0.9; k.add(spout);
  const hd = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.008, 6, 16, Math.PI), std(0x15110f, 0.6)); hd.position.y = 0.07; hd.rotation.y = Math.PI / 2; k.add(hd);
  k.position.set(0, -0.19, 0); a.parts.armR.hand.add(k); shadows(k);
  const steam = emitter({ n: 12, origin: [0, 0, 0], vel: [0.1, 0.5, 0], velRand: [0.15, 0.2, 0.15], life: 1.6, size0: 0.08, size1: 0.7, opacity: 0.5, color: 0xfff0dc }); scene.add(steam);
  const dust = snowfall(500, { box: [12, 7, 10], size: 0.016, speed: 0.08, sparkle: 0.9, color: 0xffe8c0, opacity: 0.9 }); scene.add(dust);
  const kp = V();
  const pose = (ang, el, lean = 0) => {
    const r = a.parts.armR; r.a.rotation.set(ang, 0, -0.12); r.el.rotation.x = el;
    a.parts.armL.a.rotation.set(-ang * 0.25, 0, 0.2); a.parts.armL.el.rotation.x = -0.3;
    a.rotation.order = 'YXZ'; a.rotation.x = lean; a.parts.head.rotation.x = -0.1;
    a.updateMatrixWorld(true); k.getWorldPosition(kp); return kp;
  };
  return { scene, a, k, steam, dust, em, sunDir, pose };
}
function s15() {
  const S = wasteland(), cam = camera(40, 0.1, 4000);
  return { scene: S.scene, camera: cam, update(t, d, fx) {
    const k = ease(prog(t, 0.75, 1.9));
    const p = S.pose(lerp(-0.55, 0.9, k), lerp(-0.7, -0.15, k), lerp(0, -0.1, k));
    S.a.rotation.y = Math.PI / 2 - 0.45 - 0.2 * k;
    S.steam.position.copy(p).add(V(0.05, 0.1, 0)); S.steam.update(t + 2);
    S.em.forEach((e) => e.update(t + 20)); S.dust.update(t, [0.5, 0, 1]);
    look(cam, 1.15 - 0.1 * t, 1.25, 3.4 - 0.2 * t, 0.12, 1.22, 0);
    fx.bloom = 0.5; fx.threshold = 0.9; fx.exposure = 0.82; fx.warm = 0.4; fx.sat = 0.95;
  } };
}
function s16() {
  const S = wasteland(), cam = camera(60, 0.1, 4000), scene = S.scene;
  S.a.rotation.y = Math.PI / 2 - 0.65;
  const armAt = (te) => { const k = ease(prog(te, 0.1, 1.5)); return [lerp(0.9, -2.75, k), lerp(-0.15, -0.05, k), lerp(-0.1, 0.12, k)]; };
  // trajectoire de la bouilloire échantillonnée sur le geste
  const NS = 60, path = [];
  for (let i = 0; i <= NS; i++) { const te = (i / NS) * 1.6; path.push(S.pose(...armAt(te)).clone()); }
  const at = (te, out) => { const f = clamp(te / 1.6) * NS, i = Math.min(NS - 1, Math.floor(f)); return out.lerpVectors(path[i], path[i + 1], f - i); };
  const vel = (te, out) => { const a = V(), b = V(); at(te - 0.03, a); at(te + 0.03, b); return out.subVectors(b, a).multiplyScalar(1 / 0.06); };
  const T0 = 0.42, T1 = 1.28, R = rng(99), N = 8000, PS = [], p0 = V(), v0 = V();
  const mk = (spread, boost) => {
    const te = T0 + (T1 - T0) * Math.pow(R(), 0.9); at(te, p0); vel(te, v0);
    const sp = spread * (0.4 + R());
    return { te, p: p0.clone(), v: v0.clone().multiplyScalar(boost * (0.55 + R() * 0.9)).add(V((R() - 0.5) * sp + 0.5, (R() - 0.3) * sp + 0.9, (R() - 0.5) * sp)), k: 0.8 + R() * 0.9, r: R(), r2: R(), dr: V((R() - 0.5) * 0.25 + 0.14, 0.05 + R() * 0.16, (R() - 0.5) * 0.2) };
  };
  for (let i = 0; i < N; i++) PS.push(mk(1.6, 2.3));
  const cry = points(N, { color: 0xffe6bc, color2: 0xffb458, sparkle: 0.55, seed: 2, gain: 1.15 }); scene.add(cry);
  const NV = 120, VS = [], white = new THREE.Color(0xb4b4c4), gold = new THREE.Color(0xffd69a), tmpC = new THREE.Color();
  for (let i = 0; i < NV; i++) {
    const q = mk(1.0, 1.9), s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex(i % 3), transparent: true, opacity: 0, depthWrite: false, rotation: R() * 6.28, fog: false }));
    scene.add(s); VS.push({ ...q, s });
  }
  const glow = halo(0xffd8a0, 6, 0); glow.material.fog = false; scene.add(glow);
  const fill = []; for (let i = 0; i < 14; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex(i % 3), color: 0xfff6ea, transparent: true, opacity: 0, depthWrite: false, depthTest: false, rotation: R() * 6.28, fog: false })); s.renderOrder = 5; scene.add(s); fill.push({ s, r: [R() - 0.5, R() - 0.5, R()] }); }
  const pos = V(), dir = V(), cp = V();
  const kin = (q, t, out) => { const tau = t - q.te, dd = (1 - Math.exp(-q.k * tau)) / q.k; return out.copy(q.p).addScaledVector(q.v, dd).addScaledVector(q.dr, tau).add(V(Math.sin(q.r * 40 + tau * 1.3) * 0.05 * tau, 0, Math.cos(q.r2 * 40 + tau * 1.1) * 0.05 * tau)); };
  return { scene, camera: cam, update(t, d, fx) {
    const [ang, el, lean] = armAt(t); S.pose(ang, el, lean);
    S.em.forEach((e) => e.update(t * 0.15 + 22)); S.dust.update(t * 0.2, [0.5, 0, 1]);
    S.steam.update(0, 0);
    look(cam, 1.15 + 0.07 * t, 0.42, 4.3 - 0.03 * t, 0.75 + 0.05 * t, 2.25, 0);
    cp.copy(cam.position);
    const u = cry.userData;
    for (let i = 0; i < N; i++) {
      const q = PS[i], tau = t - q.te;
      if (tau < 0) { u.alpha[i] = 0; continue; }
      kin(q, t, pos); u.pos[i * 3] = pos.x; u.pos[i * 3 + 1] = pos.y; u.pos[i * 3 + 2] = pos.z;
      u.size[i] = (0.018 + q.r * 0.035) * (1 + Math.min(tau, 2) * 0.35);
      u.alpha[i] = Math.min(1, tau * 9) * Math.exp(-tau * 0.22) * (0.5 + q.r2 * 0.5);
    }
    cry.material.uniforms.uTime.value = t; cry.flush();
    let cx = 0, cy = 0, cz = 0, cn = 0;
    for (const q of VS) {
      const tau = t - q.te, s = q.s;
      if (tau < 0) { s.material.opacity = 0; continue; }
      kin(q, t, pos); s.position.copy(pos); cx += pos.x; cy += pos.y; cz += pos.z; cn++;
      s.scale.setScalar(0.25 + (0.9 + q.r * 2.6) * (1 - Math.exp(-tau * 0.75)) + tau * 0.12);
      const prox = Math.pow(Math.max(0, dir.subVectors(pos, cp).normalize().dot(S.sunDir)), 10);
      s.material.color.copy(tmpC.copy(white).lerp(gold, clamp(prox * 1.8 + 0.25)));
      s.material.opacity = Math.min(1, tau * 5) * (0.2 + 0.25 * prox) * Math.exp(-tau * 0.12);
    }
    if (cn) { glow.position.set(cx / cn, cy / cn, cz / cn - 0.5); glow.material.opacity = 0.35 * Math.min(1, cn / 40) * Math.exp(-t * 0.1); glow.scale.setScalar(4 + t * 1.2); }
    const e = easeIn(prog(t, 4.3, 6));
    cam.getWorldDirection(dir);
    for (const f of fill) { f.s.position.copy(cp).addScaledVector(dir, 2.2 + f.r[2]).add(V(f.r[0] * 2.2, f.r[1] * 3.6 + 0.4, 0)); f.s.scale.setScalar(1.5 + e * 4); f.s.material.opacity = e * 0.75; }
    fx.white = ease(prog(t, 5.15, 5.95)); fx.bloom = 0.6; fx.threshold = 0.88; fx.exposure = 0.8; fx.warm = 0.5; fx.sat = 1;
  } };
}

// ---------- plans 17 et 18 : retour au chaud ----------
function room(o = {}) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0a0705);
  const wp = cv(256, 256, (g) => {
    g.fillStyle = '#9a7a52'; g.fillRect(0, 0, 256, 256);
    for (let x = 0; x < 256; x += 64) { g.fillStyle = 'rgba(70,45,22,0.3)'; g.fillRect(x, 0, 22, 256); }
    for (let y = 20; y < 256; y += 64) for (let x = 43; x < 256; x += 64) { g.fillStyle = 'rgba(235,205,150,0.35)'; g.beginPath(); g.moveTo(x, y - 10); g.lineTo(x + 8, y); g.lineTo(x, y + 10); g.lineTo(x - 8, y); g.fill(); }
  }); wp.wrapS = wp.wrapT = THREE.RepeatWrapping; wp.repeat.set(7, 4);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(7, 4), std(0xffffff, 0.95, 0, { map: wp })); wall.position.set(0, 1.6, -2.4); wall.receiveShadow = true; scene.add(wall);
  const wood = std(0xffffff, 0.65, 0, { map: woodTex() });
  const fl = box(7, 0.1, 6, wood, 0, -0.05, 0); fl.receiveShadow = true; scene.add(fl);
  // fenêtre givrée
  const win = new THREE.Group(); win.position.set(-0.62, 1.58, -2.38); scene.add(win);
  const gm = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x4f86d8).multiplyScalar(0.9) }); win.add(new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.2), gm));
  const fr = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.2), frostMaterial({ grow: 0.95, haze: 0.5, bright: 1.5, rep: 1 })); fr.position.z = 0.01; win.add(fr);
  const wf = std(0xe8e2d4, 0.6);
  for (const s of [-1, 1]) { win.add(box(0.07, 1.34, 0.08, wf, s * 0.48, 0, 0.03)); win.add(box(1.03, 0.07, 0.08, wf, 0, s * 0.63, 0.03)); win.add(box(0.26, 1.6, 0.05, std(0xa8482a, 0.95), s * 0.68, 0.05, 0.09)); }
  win.add(box(0.045, 1.2, 0.06, wf, 0, 0, 0.03)); win.add(box(1.2, 0.04, 0.22, wf, 0, -0.68, 0.1));
  // tapis mural à motifs
  const rug = cv(256, 384, (g) => {
    g.fillStyle = '#7a1c1c'; g.fillRect(0, 0, 256, 384); g.strokeStyle = '#e8d8b0'; g.lineWidth = 6; g.strokeRect(14, 14, 228, 356);
    for (let y = 60; y < 384; y += 88) for (let x = 64; x < 256; x += 128) { g.fillStyle = '#e8d8b0'; g.beginPath(); g.moveTo(x, y - 34); g.lineTo(x + 34, y); g.lineTo(x, y + 34); g.lineTo(x - 34, y); g.fill(); g.fillStyle = '#1c2a4a'; g.beginPath(); g.moveTo(x, y - 18); g.lineTo(x + 18, y); g.lineTo(x, y + 18); g.lineTo(x - 18, y); g.fill(); }
  });
  const rg = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.5), std(0xffffff, 0.95, 0, { map: rug })); rg.position.set(0.95, 1.6, -2.38); scene.add(rg);
  // suspension
  const lampG = new THREE.Group(); lampG.position.set(0.95, 2.25, -1.5); scene.add(lampG);
  lampG.add(cyl(0.005, 0.005, 1, std(0x111111, 0.5), 0, 0.6, 0));
  lampG.add(new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.16, 20, 1, true), new THREE.MeshStandardMaterial({ color: 0x8a3a1a, emissive: 0xff9a40, emissiveIntensity: 1.6, side: THREE.DoubleSide, roughness: 0.8 })));
  lampG.add(sph(0.04, new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffd9a0).multiplyScalar(4) }), 0, -0.06, 0));
  const lh = halo(0xffb060, 1.0, 0.45); lh.position.y = -0.06; lampG.add(lh);
  const pl = shadowLight(new THREE.PointLight(0xffb468, 9, 12, 1.5), 1, 12); pl.position.set(0.95, 2.1, -1.5); scene.add(pl);
  const key = new THREE.PointLight(0xffc48c, 5.5, 10, 1.5); key.position.set(-0.9, 1.9, 0.9); scene.add(key);
  const cold = new THREE.PointLight(0x7fa8ff, 1.4, 6, 1.5); cold.position.set(-0.62, 1.6, -1.9); scene.add(cold);
  const hemi = new THREE.HemisphereLight(0xffd0a0, 0x40281a, 0.3); scene.add(hemi);
  // table + thé
  const tbl = new THREE.Group(); scene.add(tbl);
  tbl.add(box(1.7, 0.05, 0.85, wood, 0, 0.76, 0.3)); tbl.add(box(1.72, 0.012, 0.5, std(0xe8dcc0, 0.9), 0, 0.79, 0.3));
  const mug = new THREE.Group(); mug.position.set(-0.3, 0.8, 0.38); tbl.add(mug);
  mug.add(cyl(0.046, 0.04, 0.095, std(0xf2f0ea, 0.3), 0, 0.0475, 0, 20)); mug.add(cyl(0.04, 0.04, 0.004, std(0x7a3a12, 0.15), 0, 0.09, 0, 20));
  mug.add(new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.007, 6, 14), std(0xf2f0ea, 0.3)).translateX(0.05).translateY(0.05));
  mug.add(cyl(0.047, 0.047, 0.012, std(RED, 0.4), 0, 0.03, 0, 20));
  tbl.add(cyl(0.09, 0.07, 0.012, std(0xf2f0ea, 0.3), -0.3, 0.8, 0.38, 20));
  tbl.add(sph(0.07, std(0xb8842a, 0.7), 0.42, 0.83, 0.2, 1, 0.45, 1)); tbl.add(cyl(0.11, 0.09, 0.014, std(0xf2f0ea, 0.3), 0.42, 0.8, 0.2, 20));
  shadows(tbl);
  const steam = emitter({ n: 12, origin: [-0.3, 0.92, 0.38], vel: [0.02, 0.2, 0], velRand: [0.05, 0.08, 0.05], life: 2.6, size0: 0.05, size1: 0.32, opacity: 0.32, turb: 0.025, color: 0xfff0dc, fog: false }); scene.add(steam);
  const a = person({ hat: true, scarf: 'neck', mitts: false }); a.position.set(0.12, 0, -0.75); scene.add(a);
  return { scene, a, steam, pl, key, cold, gm };
}
function s17() {
  const S = room(), a = S.a, cam = camera(40, 0.1, 60), r = a.parts.armR;
  // la main droite attrape la chapka, qui suit ensuite la main
  r.a.rotation.set(0, 0, -2.5); r.el.rotation.set(0, 0, -1.74);
  a.updateMatrixWorld(true); r.hand.attach(a.parts.hat); a.parts.hair.visible = true;
  return { scene: S.scene, camera: cam, update(t, d, fx) {
    const k = ease(prog(t, 1.0, 2.5)), w = ease(prog(t, 0.5, 1.5));
    r.a.rotation.set(lerp(0, -0.55, k), 0, lerp(-2.5, -0.3, k)); r.el.rotation.set(lerp(0, -1.1, k), 0, lerp(-1.74, 0.1, k));
    a.parts.armL.el.rotation.x = -0.25;
    a.parts.head.rotation.x = 0.18 * Math.sin(Math.PI * prog(t, 0.8, 2.2)); a.parts.head.rotation.y = lerp(0.2, -0.05, ease(prog(t, 2.2, 3.6)));
    a.setSmile(ease(prog(t, 2.4, 3.6)) * 0.5);
    S.steam.update(t + 3);
    S.pl.intensity = lerp(3, 10, w); S.key.intensity = lerp(1.5, 6, w); S.cold.intensity = lerp(4, 1.2, w);
    look(cam, -0.2 + 0.04 * t, 1.42, lerp(1.85, 1.6, ease(t / d)), 0.02, 1.3, -0.75);
    fx.white = 1 - ease(prog(t, 0, 0.7)); fx.warm = w; fx.bloom = 0.5; fx.sat = lerp(0.8, 1, w);
  } };
}
function s18() {
  const S = room(), a = S.a, cam = camera(33, 0.1, 60);
  a.parts.hat.visible = false; a.parts.hair.visible = true;
  S.steam.position.set(0.25, 0.42, -0.72);
  return { scene: S.scene, camera: cam, update(t, d, fx) {
    a.setSmile(ease(prog(t, 0.9, 2.4)) * 1.15);
    const bl = Math.max(Math.exp(-Math.pow((t - 2.9) / 0.07, 2)), Math.exp(-Math.pow((t - 0.5) / 0.07, 2)));
    a.parts.eyes.forEach((e) => (e.scale.y = 0.5 * (1 - 0.85 * bl)));
    a.parts.head.rotation.set(0.03 * Math.sin(t * 1.3), 0.06 * Math.sin(t * 0.7), 0.05 * ease(prog(t, 1, 2.5)));
    a.parts.armL.el.rotation.x = -0.25; a.parts.armR.el.rotation.x = -0.25;
    a.parts.torso.scale.y = 1 + 0.006 * Math.sin(t * 2);
    S.steam.update(t + 3);
    const dist = lerp(1.38, 1.22, t / d);
    look(cam, 0.12, 1.62, -0.75 + dist, 0.12, 1.6, -0.75);
    fx.warm = 1; fx.bloom = 0.5; fx.sat = 1;
  } };
}

export const B = [s11, s12, s13, s14, s15, s16, s17, s18];
