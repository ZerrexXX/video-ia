// Plans 1 à 10 (nuit polaire, bleus froids + sodium).
import {
  THREE, V, rng, clamp, prog, ease, easeOut, easeIn, lerp, cv, std, emis, box, cyl, sph, shadows, shadowLight, camera, look,
  sky, snowGround, halo, pool, lamp, building, emitter, fogBank, points, snowfall, person, lada, thermometer,
  frostMaterial, woodTex, noiseTex, bokehTex, glowTex, SODIUM, NAVY, RED, FUR,
} from './lib.js';

const Y = V(0, 1, 0);
export function night(fogD = 0.02, fogC = 0x1b2a44, top = 0x060b18) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(fogC, fogD);
  scene.add(sky(top, fogC));
  scene.add(new THREE.HemisphereLight(0x5878b8, 0x1a2030, 0.4));
  return scene;
}
export function bokehField(scene, n, seed, box6, size = 3) {
  const R = rng(seed), list = [];
  for (let i = 0; i < n; i++) {
    const p = [lerp(box6[0], box6[1], R()), lerp(box6[2], box6[3], R()), lerp(box6[4], box6[5], R())];
    const b = halo(R() < 0.8 ? SODIUM : 0xbfd8ff, size * (0.6 + R() * 0.8), 0.5, bokehTex()); b.position.set(...p); b.material.fog = false;
    const g = halo(SODIUM, size * 1.6, 0, glowTex()); g.position.set(...p); g.material.fog = false;
    scene.add(b, g); list.push({ b, g, s: b.scale.x });
  }
  return (focus) => { for (const o of list) { o.b.scale.setScalar(o.s * lerp(1, 0.35, focus)); o.b.material.opacity = lerp(0.45, 0.15, focus); o.g.material.opacity = focus * 0.9; } };
}

// ---------- plans 1 et 19 : thermomètre sur le cadre de fenêtre ----------
export function thermoSet() {
  const scene = night(0.012, 0x1b2a44);
  const wood = std(0xffffff, 0.7, 0, { map: woodTex() }), wall = std(0x2c3038, 0.95);
  const g = new THREE.Group(); scene.add(g);
  g.add(box(1.7, 0.42, 0.1, wood, 0, 0.97, 0));
  g.add(box(1.8, 0.04, 0.3, wood, 0, 0.75, 0.1));
  g.add(box(4, 1.0, 0.12, wall, 0, 0.24, -0.02));
  for (const sx of [-1, 1]) { g.add(box(0.16, 2.2, 0.1, wood, sx * 0.66, 2.2, 0)); g.add(box(2, 3.4, 0.12, wall, sx * 1.74, 1.8, -0.02)); }
  g.add(box(1.7, 0.16, 0.1, wood, 0, 3.2, 0));
  const frost = frostMaterial({ grow: 0, haze: 0.35, bright: 1.1, rep: 1 });
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.0), frost); glass.position.set(0, 2.18, 0); scene.add(glass);
  // givre posé sur le bois
  const fr2 = frostMaterial({ grow: 0, haze: 0.1, bright: 0.9, rep: 2 });
  const fw = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.42), fr2); fw.position.set(0, 0.97, 0.052); scene.add(fw);
  const th = thermometer(); th.position.set(0, 1.03, 0.05); scene.add(th);
  shadows(g);
  const key = shadowLight(new THREE.SpotLight(0xcfe0ff, 9, 8, 0.5, 0.7, 1.5), 1, 6); key.position.set(0.7, 1.9, 1.5); key.target.position.set(0, 1.0, 0); scene.add(key, key.target);
  const warm = new THREE.PointLight(0xffa860, 1.6, 6, 1.6); warm.position.set(-0.8, 1.2, 0.9); scene.add(warm);
  // la rue derrière la vitre
  const focus = bokehField(scene, 16, 3, [-9, 9, 1.5, 12, -40, -14], 3.2);
  const b = building({ w: 40, seed: 2, piles: false, px: 32 }); b.position.set(-6, 0, -60); scene.add(b);
  const gr = snowGround(300); gr.position.y = -6; scene.add(gr);
  const cam = camera(35, 0.05, 2500);
  return { scene, camera: cam, th, frost, fr2, focus };
}

function s01() {
  const S = thermoSet();
  S.update = (t, d, fx) => {
    S.frost.uniforms.grow.value = ease(prog(t, 0.05, 1.7)) * 1.05;
    S.fr2.uniforms.grow.value = ease(prog(t, 0.1, 1.9)) * 0.75;
    S.th.setValue(-50 + Math.sin(t * 9) * 0.25 * Math.exp(-t * 2.5));
    S.focus(ease(prog(t, 0.7, 1.5)));
    const k = easeIn(prog(t, 1.05, 2.0)), d0 = lerp(1.3, 1.16, easeOut(prog(t, 0, 1.1)));
    look(S.camera, 0.03 * (1 - k), lerp(1.045, 1.95, k), lerp(d0, 0.1, k), 0, lerp(1.045, 2.05, k), lerp(0, -2, k));
    fx.white = ease(prog(t, 1.55, 1.98)); fx.bloom = 0.6;
  };
  return S;
}
function s19() {
  const S = thermoSet();
  S.frost.uniforms.grow.value = 1.05; S.fr2.uniforms.grow.value = 0.8; S.focus(0.3);
  S.update = (t, d, fx) => {
    const k = easeOut(prog(t, 0.25, 0.9));
    S.th.setValue(-50 - 2 * k + Math.sin(t * 14) * 0.5 * Math.exp(-Math.max(0, t - 0.25) * 4) * (t > 0.25 ? 1 : 0));
    look(S.camera, 0.03, 1.045, lerp(1.2, 1.12, t / 2), 0, 1.045, 0);
    fx.endText = easeOut(prog(t, 0.15, 0.5)); fx.bloom = 0.6;
  };
  return S;
}

// ---------- plan 2 : Yakoutsk vue du ciel ----------
function s02() {
  const fogC = 0x5a79a6;
  const scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(fogC, 0.0034);
  scene.add(sky(0x0b1834, 0x7d9cc6, { sunDir: V(0.3, 0.03, -1), sunCol: 0xff9a80, sunPow: 0.45, exp: 0.55 }));
  scene.add(new THREE.HemisphereLight(0x86a6dc, 0x2a3448, 0.55));
  const moon = shadowLight(new THREE.DirectionalLight(0xa8c0f0, 0.9), 170, 500, 2048); moon.position.set(-90, 150, 60); moon.target.position.set(0, 0, -110); scene.add(moon, moon.target);
  scene.add(snowGround(3000, 0xdde6f0, 300));
  const R = rng(42), road = std(0xa9b5c4, 0.95);
  for (let r = 0; r < 7; r++) { const m = box(900, 0.04, 9, road, 0, 0.02, -8 - r * 46); m.receiveShadow = true; scene.add(m); }
  for (let c = -4; c <= 4; c++) { const m = box(9, 0.04, 500, road, c * 64 + 31, 0.025, -150); m.receiveShadow = true; scene.add(m); }
  const vents = [];
  for (let r = 0; r < 7; r++) for (let c = -4; c <= 4; c++) {
    if (R() < 0.12) continue;
    const w = 40 + R() * 12, x = c * 64 + (R() - 0.5) * 4, z = -31 - r * 46;
    const b = building({ w, d: 12, seed: r * 20 + c + 100, px: 24, floors: R() < 0.2 ? 5 : 9, lit: 0.55, pileStep: 6, pileRows: 2, glow: 2.2 });
    b.position.set(x, 0, z); shadows(b); scene.add(b);
    if (R() < 0.55) vents.push([x + (R() - 0.5) * w * 0.6, (b.children[0].geometry.parameters.height) + 3, z]);
  }
  for (const [x, y, z] of vents) {
    const e = emitter({ n: 7, origin: [x, y, z], vel: [0, 3.2, 0], velRand: [0.2, 0.6, 0.2], life: 9, size0: 2, size1: 13, opacity: 0.4, turb: 0.05, seed: (x * 7 + z) | 0, color: 0xdbe6f5 });
    scene.add(e); (scene.userData.em ??= []).push(e);
  }
  // cheminées de la centrale
  for (const [x, z, h] of [[-150, -360, 80], [-40, -400, 95], [110, -380, 85], [190, -420, 70]]) {
    scene.add(cyl(3, 4.5, h, std(0x8a8f96, 0.9), x, h / 2, z, 12));
    for (let k = 0; k < 3; k++) scene.add(cyl(3.3, 3.4, 4, std(0xa03a30, 0.9), x, h - 6 - k * 12, z, 12));
    const e = emitter({ n: 34, origin: [x, h, z], vel: [0, 11, 0], velRand: [0.5, 2, 0.5], life: 16, size0: 9, size1: 60, opacity: 0.55, turb: 0.12, seed: x | 0, color: 0xe8eef8, grow: 0.8 });
    scene.add(e); scene.userData.em.push(e);
  }
  // lampadaires
  const pole = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.16, 9, 6), std(0x3a4048, 0.6, 0.5), 400); let k = 0; const M = new THREE.Matrix4();
  for (let r = 0; r < 7; r++) for (let x = -250; x <= 250; x += 23) {
    const z = -3 - r * 46 + (k % 2 ? 0 : -10), xx = x + (r % 2) * 11;
    pole.setMatrixAt(k++, M.makeTranslation(xx, 4.5, z));
    const h = halo(SODIUM, 15, 0.95); h.position.set(xx, 9, z); scene.add(h);
    const p = pool(SODIUM, 15, 0.6); p.position.set(xx, 0.08, z); scene.add(p);
  }
  pole.count = k; scene.add(pole);
  // quelques phares
  for (let i = 0; i < 16; i++) { const h = halo(0xfff0d0, 4, 0.9); h.position.set((R() - 0.5) * 380, 0.8, -8 - ((R() * 7) | 0) * 46 + (R() - 0.5) * 4); scene.add(h); }
  const bank = fogBank({ n: 110, box: [-330, 330, 2, 9, -420, 40], size: 46, opacity: 0.2, color: 0xc2d2ea, seed: 2 }); scene.add(bank);
  const snow = snowfall(1500, { box: [90, 60, 90], size: 0.22, speed: 1.2, opacity: 0.55 }); scene.add(snow);
  const cam = camera(50, 1, 4000);
  return { scene, camera: cam, update(t, d, fx) {
    for (const e of scene.userData.em) e.update(t + 30);
    bank.update(t);
    const y = lerp(84, 71, ease(t / d));
    look(cam, 0, y, 78, 0, y - 62, -105);
    snow.update(t, [0, y - 45, 30]);
    fx.white = 1 - ease(prog(t, 0, 0.75)); fx.bloom = 0.75; fx.threshold = 0.7;
  } };
}

// ---------- plan 3 : l'horloge, 9:02 ----------
function s03() {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x04060a);
  const wp = cv(256, 256, (g) => {
    g.fillStyle = '#56606a'; g.fillRect(0, 0, 256, 256);
    for (let x = 0; x < 256; x += 32) { g.fillStyle = 'rgba(30,36,44,0.35)'; g.fillRect(x, 0, 12, 256); }
    for (let y = 16; y < 256; y += 64) for (let x = 22; x < 256; x += 32) { g.fillStyle = 'rgba(200,190,160,0.25)'; g.beginPath(); g.arc(x, y + (x % 64 ? 32 : 0), 4, 0, 7); g.fill(); }
  }); wp.wrapS = wp.wrapT = THREE.RepeatWrapping; wp.repeat.set(8, 5);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(8, 5), std(0xffffff, 0.95, 0, { map: wp })); wall.position.set(0, 2, 0); wall.receiveShadow = true; scene.add(wall);
  const clock = new THREE.Group(); clock.position.set(-0.1, 2.02, 0.02); scene.add(clock);
  const face = cv(512, 512, (g) => {
    g.fillStyle = '#efe9d8'; g.beginPath(); g.arc(256, 256, 256, 0, 7); g.fill();
    g.fillStyle = '#1b1b1b'; g.strokeStyle = '#1b1b1b'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = 'bold 62px sans-serif';
    for (let i = 1; i <= 60; i++) {
      const a = (i / 60) * 6.2832, big = i % 5 === 0; g.lineWidth = big ? 8 : 3;
      g.beginPath(); g.moveTo(256 + Math.sin(a) * 240, 256 - Math.cos(a) * 240); g.lineTo(256 + Math.sin(a) * (big ? 212 : 226), 256 - Math.cos(a) * (big ? 212 : 226)); g.stroke();
      if (big) g.fillText(String(i / 5), 256 + Math.sin(a) * 170, 256 - Math.cos(a) * 170 + 4);
    }
  });
  const dark = std(0x16161a, 0.5, 0.3);
  clock.add(cyl(0.235, 0.235, 0.05, std(0x3a2a1e, 0.6), 0, 0, 0.025, 48).rotateX(Math.PI / 2));
  const dial = new THREE.Mesh(new THREE.CircleGeometry(0.205, 48), std(0xffffff, 0.7, 0, { map: face })); dial.position.z = 0.052; clock.add(dial);
  const hand = (len, w, mat) => { const g = new THREE.Group(); g.add(box(w, len, 0.004, mat, 0, len / 2 - 0.02, 0)); g.position.z = 0.058; clock.add(g); return g; };
  const hh = hand(0.11, 0.016, dark), mh = hand(0.165, 0.011, dark), sh = hand(0.18, 0.004, std(0xc81f26, 0.5));
  sh.position.z = 0.062; clock.add(cyl(0.012, 0.012, 0.01, dark, 0, 0, 0.062).rotateX(Math.PI / 2));
  hh.rotation.z = -((9 + 2 / 60) / 12) * 6.2832; mh.rotation.z = -(2.2 / 60) * 6.2832;
  // fenêtre noire
  const wf = std(0xb9bfc4, 0.7), win = new THREE.Group(); win.position.set(0.47, 1.33, 0); scene.add(win);
  win.add(box(0.74, 0.96, 0.02, std(0x010307, 0.08, 0.7), 0, 0, 0.0));
  for (const sx of [-1, 1]) win.add(box(0.06, 1.06, 0.07, wf, sx * 0.38, 0, 0.03));
  for (const sy of [-1, 1]) win.add(box(0.82, 0.06, 0.07, wf, 0, sy * 0.5, 0.03));
  win.add(box(0.04, 0.96, 0.05, wf, -0.05, 0, 0.03)); win.add(box(0.9, 0.035, 0.2, wf, 0, -0.545, 0.1));
  const fr = new THREE.Mesh(new THREE.PlaneGeometry(0.74, 0.96), frostMaterial({ grow: 0.5, haze: 0.2, bright: 0.28, rep: 1 })); fr.position.z = 0.012; win.add(fr);
  for (const [x, y, s] of [[-0.2, 0.2, 0.2], [0.14, 0.02, 0.13], [-0.25, -0.2, 0.1]]) { const h = halo(SODIUM, s, 0.55); h.position.set(x, y, 0.015); win.add(h); }
  shadows(clock); shadows(win);
  scene.add(new THREE.AmbientLight(0x6f86b0, 0.1));
  const cold = new THREE.PointLight(0x6f92d8, 1.3, 8, 1.5); cold.position.set(0.9, 1.3, 1.0); scene.add(cold);
  const warm = shadowLight(new THREE.SpotLight(0xffb070, 5, 8, 0.7, 0.9, 1.5), 1, 8); warm.position.set(-1.5, 1.2, 1.8); warm.target.position.set(0, 1.9, 0); scene.add(warm, warm.target);
  const cam = camera(40, 0.1, 50);
  return { scene, camera: cam, update(t, d, fx) {
    const s = Math.floor(t), u = t - s, sec = 17 + s + (u < 0.12 ? -1 + easeOut(u / 0.12) + Math.sin(u * 60) * 0.08 * (1 - u / 0.12) : 0);
    sh.rotation.z = -(sec / 60) * 6.2832;
    look(cam, 0.05, 1.72, lerp(2.02, 1.96, t / d), 0.05, 1.72, 0);
    fx.bloom = 0.4; fx.vig = 0.85; fx.sat = 0.7;
  } };
}

// ---------- plan 4 : il s'habille (4 micro-plans) ----------
function s04() {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0c0907);
  const wp = cv(256, 256, (g) => { g.fillStyle = '#8a7558'; g.fillRect(0, 0, 256, 256); for (let x = 0; x < 256; x += 42) { g.fillStyle = 'rgba(60,44,28,0.35)'; g.fillRect(x, 0, 14, 256); } });
  wp.wrapS = wp.wrapT = THREE.RepeatWrapping; wp.repeat.set(5, 3);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(6, 4), std(0xffffff, 0.95, 0, { map: wp })); wall.position.set(0, 1.6, -0.95); wall.receiveShadow = true; scene.add(wall);
  const wood = std(0xffffff, 0.7, 0, { map: woodTex() });
  scene.add(box(0.95, 2.1, 0.06, wood, 0.92, 1.05, -0.9)); scene.add(sph(0.03, std(0xc8b070, 0.3, 0.9), 0.56, 1.05, -0.84));
  scene.add(box(0.9, 0.09, 0.04, wood, -0.75, 1.82, -0.92));
  for (let i = 0; i < 3; i++) scene.add(cyl(0.012, 0.012, 0.09, std(0x8a8f96, 0.4, 0.8), -1.05 + i * 0.3, 1.8, -0.87).rotateX(Math.PI / 2));
  scene.add(sph(0.2, std(0x3a2f28, 0.95), -0.75, 1.42, -0.82, 0.9, 1.9, 0.35));
  scene.add(new THREE.HemisphereLight(0xa8b0c8, 0x40281a, 0.35));
  const key = shadowLight(new THREE.SpotLight(0xffbe84, 22, 10, 0.8, 0.8, 1.4), 1, 10); key.position.set(-0.9, 2.5, 1.6); key.target.position.set(0, 1.3, 0); scene.add(key, key.target);
  const door = new THREE.PointLight(0xbcd4ff, 0, 8, 1.4); door.position.set(1.3, 1.6, 0.4); scene.add(door);
  const P = [
    person({ outfit: 'thermal', hat: false, scarf: 'none', mitts: false }),
    person({ outfit: 'sweater', hat: false, scarf: 'none', mitts: false }),
    person({ outfit: 'parka', hat: false, scarf: 'neck', mitts: false }),
    person({ outfit: 'parka', hat: true, scarf: 'up', mitts: true }),
  ];
  P.forEach((p) => scene.add(p));
  const vap = emitter({ n: 26, origin: [1.2, 1.4, 0.9], spread: [0.4, 1, 0.4], vel: [-1.6, 0.1, 0.3], velRand: [0.6, 0.5, 0.5], life: 1.6, size0: 0.5, size1: 2.4, opacity: 0.6, drag: 0.8 }); scene.add(vap);
  const cam = camera(30, 0.1, 50);
  const pose = (p, ax, ex, az = 0, side = 0) => { for (const [h, s] of [[p.parts.armL, 1], [p.parts.armR, -1]]) if (!side || side === s) { h.a.rotation.x = ax; h.el.rotation.x = ex; h.a.rotation.z = s * 0.1 - s * az; } };
  return { scene, camera: cam, update(t, d, fx) {
    const k = Math.min(3, Math.floor(t / 0.75)), u = t - k * 0.75, e = easeOut(clamp(u / 0.6));
    P.forEach((p, i) => (p.visible = i === k));
    const p = P[k];
    if (k === 0) { pose(p, -0.9, lerp(-1.9, -1.3, e), 0.25, -1); pose(p, -0.5, lerp(-0.9, -1.3, e), 0.2, 1); p.rotation.y = -0.25; }
    if (k === 1) { pose(p, lerp(-2.7, -0.5, e), lerp(-1.6, -0.7, e), 0.1); p.parts.head.rotation.x = lerp(0.45, 0, e); p.rotation.y = 0.2; }
    if (k === 2) { pose(p, -0.45, lerp(-0.9, -2.0, e), 0.42, -1); pose(p, -0.3, -0.9, 0.3, 1); p.parts.head.rotation.x = lerp(0.3, 0.05, e); p.rotation.y = -0.15; }
    if (k === 3) { pose(p, lerp(-1.3, -0.5, ease(prog(u, 0.25, 0.7))), lerp(-2.1, -0.6, ease(prog(u, 0.25, 0.7))), 0.3); p.rotation.y = lerp(0.1, 0.55, ease(prog(u, 0.3, 0.75))); p.parts.head.rotation.y = 0.2; }
    const pulse = 0.06 * Math.exp(-u * 9);
    cam.fov = 30 / ((1 + 0.05 * k) * (1 + pulse));
    look(cam, 0.02 * Math.sin(t * 5), 1.47 + 0.008 * Math.sin(t * 7), 1.9, 0, 1.45, 0, 0.006 * Math.sin(t * 6));
    const o = ease(prog(t, 2.45, 3)); door.intensity = o * 60; vap.update(t, o, 2.3);
    fx.white = ease(prog(t, 2.62, 2.98)); fx.warm = 0.35 * (1 - o); fx.bloom = 0.35;
  } };
}

// ---------- plan 5 : la porte s'ouvre ----------
function s05() {
  const scene = night(0.03, 0x17243c);
  const g = snowGround(200); scene.add(g);
  const b = building({ w: 32, d: 9, floors: 5, px: 96, lift: 0.6, piles: false, seed: 31, lit: 0.35, glow: 1.2 }); b.position.set(2, 0, -4.5); scene.add(b);
  const conc = std(0x6a707a, 0.95), metal = std(0x4a3a30, 0.6, 0.4);
  scene.add(box(2.6, 0.6, 1.8, conc, 0, 0.3, 0.9)); scene.add(box(3.0, 0.3, 0.5, conc, 0, 0.15, 2.0));
  scene.add(box(3.2, 0.2, 2.0, conc, 0, 3.05, 1.0)); scene.add(box(3.3, 0.12, 2.1, std(0xe6eef6, 0.95), 0, 3.2, 1.0));
  for (const sx of [-1, 1]) scene.add(box(0.14, 2.4, 0.14, conc, sx * 1.4, 1.8, 1.85));
  scene.add(box(1.5, 2.5, 0.1, std(0x30343a, 0.9), 0, 1.85, 0.03));
  const hall = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2.1), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffc27a).multiplyScalar(3.2) })); hall.position.set(0, 1.65, 0.09); scene.add(hall);
  const leaf = new THREE.Group(); leaf.position.set(0.56, 1.65, 0.1); leaf.add(box(1.08, 2.1, 0.06, metal, 0.54, 0, 0)); leaf.rotation.y = -1.95; scene.add(leaf);
  const hb = halo(0xffb870, 7, 0.9); hb.position.set(0, 2.0, 0.3); scene.add(hb);
  const spot = shadowLight(new THREE.SpotLight(0xffb468, 420, 30, 0.62, 0.9, 1.6), 1, 30, 2048); spot.position.set(0, 2.3, -0.4); spot.target.position.set(0, 0.2, 9); scene.add(spot, spot.target);
  const l = lamp({ light: 160 }); l.position.set(-6.2, 0, 3.5); scene.add(l);
  const fill = new THREE.DirectionalLight(0x86a6e8, 0.55); fill.position.set(3, 4, 10); scene.add(fill);
  const a = person(); scene.add(a);
  const vapA = emitter({ n: 30, origin: [0, 1.5, 0.5], spread: [1.0, 1.8, 0.4], vel: [0, 0.35, 1.3], velRand: [1.6, 0.6, 1.0], life: 4.5, size0: 0.8, size1: 4.0, opacity: 0.2, drag: 0.45, color: 0xd9bc98, seed: 5 });
  const vapB = emitter({ n: 30, origin: [0, 0.5, 1.2], spread: [2.4, 0.5, 1], vel: [0, 0.1, 1.3], velRand: [2.5, 0.2, 1], life: 5, size0: 1, size1: 4, opacity: 0.1, drag: 0.4, color: 0x8f9fb8, seed: 9 });
  scene.add(vapA, vapB);
  const snow = snowfall(500, { box: [16, 9, 14], size: 0.04, speed: 0.35 }); scene.add(snow);
  const cam = camera(36, 0.1, 2500);
  return { scene, camera: cam, update(t, d, fx) {
    const z = lerp(0.7, 5.2, t / d);
    a.position.set(0.05, 0, z); a.walk(z * 4.2, 0.42);
    a.position.y += 0.6 * (1 - ease(prog(z, 1.5, 2.5)));
    vapA.update(t + 6); vapB.update(t + 6);
    snow.update(t, [0, 0, 6]);
    look(cam, 0.5, 1.3, 11.8 - 0.25 * t, 0, 2.05, 0);
    fx.white = 1 - ease(prog(t, 0, 0.9)); fx.bloom = 0.8; fx.threshold = 0.75;
  } };
}

// ---------- plan 6 : les cils gèlent (macro) ----------
function s06() {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0a1220);
  scene.add(new THREE.HemisphereLight(0x7f9fe0, 0x283048, 0.75));
  const key = new THREE.PointLight(SODIUM, 55, 30, 1.5); key.position.set(-5, 1.5, 6); scene.add(key);
  const rim = shadowLight(new THREE.DirectionalLight(0xa8c4ff, 1.3), 4, 30); rim.position.set(5, 6, 8); scene.add(rim);
  const skinM = std(0xc78a66, 0.6), R = rng(8);
  const skin = sph(14, skinM, 0, 0, -13.95, 1, 1, 1, 64); skin.receiveShadow = true; scene.add(skin);
  const red = new THREE.Mesh(new THREE.CircleGeometry(3.4, 40), new THREE.MeshBasicMaterial({ map: glowTex(), color: 0xb03a2a, transparent: true, opacity: 0.28, depthWrite: false })); red.position.set(0, -0.3, 0.05); scene.add(red);
  const eye = new THREE.Group(); eye.position.set(0, 0, -0.68); scene.add(eye);
  const ball = new THREE.Group(); eye.add(ball);
  ball.add(sph(1, std(0xf1ebe2, 0.2), 0, 0, 0, 1, 1, 1, 40));
  const irisT = cv(256, 256, (g) => {
    g.fillStyle = '#3a1f10'; g.fillRect(0, 0, 256, 256);
    for (let x = 0; x < 256; x += 2) { g.fillStyle = `rgba(${150 + R() * 60},${80 + R() * 40},${30 + R() * 20},${0.3 + R() * 0.5})`; g.fillRect(x, 80, 2, 150); }
    g.fillStyle = '#050505'; g.fillRect(0, 0, 256, 98); g.fillStyle = '#1a0d06'; g.fillRect(0, 238, 256, 18);
  });
  const iris = new THREE.Mesh(new THREE.SphereGeometry(1.008, 40, 12, 0, 6.2832, 0, 0.54), std(0xffffff, 0.15, 0, { map: irisT })); iris.rotation.x = Math.PI / 2; ball.add(iris);
  ball.add(sph(0.07, new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffffff).multiplyScalar(2.5) }), -0.2, 0.26, 0.955));
  ball.add(sph(0.035, new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffb060).multiplyScalar(2) }), 0.22, -0.12, 0.975));
  const lidM = std(0xbf8060, 0.6, 0, { side: THREE.DoubleSide });
  const TU = 1.72, AU = 0.45, TL = 1.66, AL = 0.3;
  const lidU = new THREE.Group(), lidL = new THREE.Group(); eye.add(lidU, lidL);
  lidU.add(new THREE.Mesh(new THREE.SphereGeometry(1.06, 48, 20, 0, 6.2832, 0, TU), lidM));
  lidL.add(new THREE.Mesh(new THREE.SphereGeometry(1.06, 48, 20, 0, 6.2832, 0, TL), lidM));
  lidL.rotation.x = Math.PI + AL;
  // cils + givre
  const lashM = std(0x0d0a09, 0.5), iceM = std(0xf4f9ff, 0.35, 0, { emissive: 0x9fc4ff, emissiveIntensity: 0.25 });
  const dummy = new THREE.Object3D(), frostSets = [];
  const hairs = (parent, list, len, rad, mat) => {
    const cone = new THREE.ConeGeometry(rad, len, 5); cone.translate(0, len / 2, 0);
    const im = new THREE.InstancedMesh(cone, mat, list.length);
    const ice = new THREE.InstancedMesh(cone.clone(), iceM, list.length);
    const beads = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), iceM, list.length * 3);
    list.forEach((h, i) => {
      dummy.position.copy(h.p); dummy.quaternion.setFromUnitVectors(Y, h.d); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix);
      h.q = dummy.quaternion.clone(); h.len = len; h.rad = rad; h.t0 = 0.35 + R() * 1.5; h.r = [R(), R(), R()];
    });
    im.castShadow = true; parent.add(im, ice, beads); frostSets.push({ list, ice, beads });
  };
  const rimPt = (th, ph, r = 1.065) => V(-Math.cos(ph) * Math.sin(th) * r, Math.cos(th) * r, Math.sin(ph) * Math.sin(th) * r);
  const up = [], low = [];
  for (let i = 0; i < 30; i++) { const ph = Math.PI / 2 + (i / 29 - 0.5) * 2.1 + (R() - 0.5) * 0.03, p = rimPt(TU - 0.02, ph); up.push({ p, d: p.clone().normalize().multiplyScalar(0.55).add(V(-Math.cos(ph) * 0.35, 0.75, 0.25)).normalize() }); }
  for (let i = 0; i < 18; i++) { const ph = Math.PI / 2 + (i / 17 - 0.5) * 1.8, p = rimPt(TL - 0.02, ph); low.push({ p, d: p.clone().normalize().multiplyScalar(0.6).add(V(-Math.cos(ph) * 0.3, 0.55, 0.2)).normalize() }); }
  hairs(lidU, up, 0.5, 0.022, lashM); hairs(lidL, low, 0.24, 0.016, lashM);
  const brow = [];
  for (let i = 0; i < 170; i++) { const x = -1.35 + R() * 2.9, y = 1.5 + Math.sin((x + 1.3) * 0.9) * 0.28 + (R() - 0.5) * 0.3; brow.push({ p: V(x, y, 0.02 - (x * x + y * y) / 28), d: V(0.75 + R() * 0.2, 0.3 + (R() - 0.5) * 0.3, 0.38).normalize() }); }
  hairs(scene, brow, 0.36, 0.02, lashM);
  const furM = std(FUR, 1), fur = [];
  for (let i = 0; i < 420; i++) { const x = -2.6 + R() * 5.2, y = 2.35 + R() * 1.6; fur.push({ p: V(x, y + 0.5, 0.25 + R() * 0.7), d: V((R() - 0.5) * 0.5, -0.85, 0.4 + R() * 0.3).normalize() }); }
  hairs(scene, fur, 0.85, 0.045, furM);
  scene.add(sph(3.2, furM, 0, 5.6, -0.6, 1.6, 1, 0.6));
  scene.add(sph(3.2, std(RED, 0.95, 0, { bumpMap: noiseTex(), bumpScale: 6 }), 0, -5.0, 0.2, 1.6, 1, 0.5));
  const scarfIce = points(260, { color: 0xeaf4ff, sparkle: 0.5, seed: 5 });
  { const u = scarfIce.userData; for (let i = 0; i < 260; i++) { const x = -2.5 + R() * 5, y = -1.75 - R() * 0.6 - x * x * 0.05; u.pos.set([x, y, 1.75 - R() * 0.2], i * 3); u.seed[i] = 0.2 + R() * 0.8; } }
  scene.add(scarfIce);
  const breath = emitter({ n: 16, origin: [0.4, -2.6, 2.2], spread: [1.6, 0.4, 0.8], vel: [0.25, 1.5, 0.3], velRand: [0.6, 0.5, 0.3], life: 2.2, size0: 1.2, size1: 4.2, opacity: 0.2, color: 0xdbe8ff, fog: false }); scene.add(breath);
  const dust = snowfall(160, { box: [5, 5, 3], size: 0.03, speed: -0.5, sparkle: 0.8, opacity: 0.9, seed: 3 }); scene.add(dust);
  const cam = camera(30, 0.1, 100);
  const m4 = new THREE.Matrix4();
  return { scene, camera: cam, update(t, d, fx) {
    const blink = Math.pow(Math.sin(Math.PI * prog(t, 1.35, 2.25)), 2), down = ease(prog(t, 2.5, 2.95));
    lidU.rotation.x = -AU + blink * 0.98 + down * 0.42; ball.rotation.x = down * 0.42; ball.rotation.y = Math.sin(t * 0.8) * 0.03;
    for (const S of frostSets) {
      S.list.forEach((h, i) => {
        const k = ease(prog(t, h.t0, h.t0 + 1.1));
        dummy.position.copy(h.p); dummy.quaternion.copy(h.q); dummy.scale.set(1 + k * 0.7, k > 0 ? 0.3 + k * 0.72 : 0, 1 + k * 0.7); if (k <= 0) dummy.scale.setScalar(0); dummy.updateMatrix(); S.ice.setMatrixAt(i, dummy.matrix);
        for (let j = 0; j < 3; j++) {
          const f = [0.5, 0.78, 1.0][j], kk = ease(prog(t, h.t0 + j * 0.15, h.t0 + 0.9 + j * 0.15));
          dummy.position.copy(h.p).addScaledVector(V(0, 1, 0).applyQuaternion(h.q), h.len * f); dummy.scale.setScalar(kk * h.rad * (0.9 + h.r[j] * 1.5) * (h.r[(j + 1) % 3] < 0.35 ? 0 : 1)); dummy.updateMatrix(); S.beads.setMatrixAt(i * 3 + j, dummy.matrix);
        }
      });
      S.ice.instanceMatrix.needsUpdate = true; S.beads.instanceMatrix.needsUpdate = true;
    }
    { const u = scarfIce.userData, g = ease(prog(t, 0.2, 2.2)); for (let i = 0; i < u.n; i++) { u.size[i] = 0.09 * u.seed[i]; u.alpha[i] = clamp(g * 1.6 - (1 - u.seed[i])); } scarfIce.material.uniforms.uTime.value = t; scarfIce.flush(); }
    breath.update(t + 3); dust.update(t, [0, -2, 2.5]);
    look(cam, 0.2, 0.38, lerp(7.2, 6.5, ease(t / d)), 0, 0.38, 0);
    fx.bloom = 0.45; fx.vig = 0.7;
  } };
}

// ---------- plan 7 : le téléphone meurt ----------
function s07() {
  const scene = night(0.02, 0x1b2a44);
  const focus = bokehField(scene, 14, 6, [-5, 5, -1.5, 5, -16, -6], 2.4); focus(0);
  const gr = snowGround(100); gr.position.y = -1.5; scene.add(gr);
  const p0 = pool(SODIUM, 5, 0.5); p0.position.set(-1, -1.48, -3); scene.add(p0);
  const key = new THREE.PointLight(SODIUM, 1.6, 6, 1.5); key.position.set(-0.6, 0.6, 0.5); scene.add(key);
  const fill = new THREE.DirectionalLight(0x9fbcff, 0.9); fill.position.set(1, 1, 2); scene.add(fill);
  const hand = new THREE.Group(); scene.add(hand);
  const canvas = document.createElement('canvas'); canvas.width = 360; canvas.height = 780; const g = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
  const scr = std(0xffffff, 0.12, 0.2, { map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 1.6 });
  hand.add(box(0.077, 0.16, 0.009, std(0x0c0d10, 0.3, 0.7)));
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.152), scr); screen.position.z = 0.0048; hand.add(screen);
  const fur = std(0x7a6a58, 1, 0, { bumpMap: noiseTex(), bumpScale: 6 });
  hand.add(sph(0.062, fur, 0.004, -0.085, -0.04, 1.25, 1.35, 0.7)); hand.add(sph(0.021, fur, -0.047, -0.045, 0.008, 0.9, 1.9, 0.8));
  hand.add(sph(0.024, fur, 0.047, -0.03, -0.012, 0.8, 2.2, 1));
  hand.add(cyl(0.075, 0.075, 0.05, std(0xd9d2c4, 1), 0.006, -0.18, -0.05, 14)); hand.add(cyl(0.066, 0.08, 0.36, std(NAVY, 0.7), 0.01, -0.38, -0.06, 14));
  const glint = halo(0xffc080, 0.07, 0); glint.scale.set(0.035, 0.13, 1); glint.material.rotation = 0.5; hand.add(glint);
  hand.rotation.x = -0.42; shadows(hand);
  const draw = (pct, on) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, 360, 780); if (!on) { tex.needsUpdate = true; return; }
    const gr2 = g.createLinearGradient(0, 0, 0, 780); gr2.addColorStop(0, '#16345e'); gr2.addColorStop(1, '#3a6ea8'); g.fillStyle = gr2; g.fillRect(0, 0, 360, 780);
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = 'bold 96px sans-serif'; g.fillText('09:14', 180, 190);
    g.font = '28px sans-serif'; g.fillText('Yakoutsk  −50 °C', 180, 240);
    const low = pct < 20; g.strokeStyle = '#fff'; g.lineWidth = 8; g.strokeRect(80, 380, 180, 90); g.fillRect(262, 405, 16, 40);
    g.fillStyle = low ? '#ff3b30' : '#4cd964'; g.fillRect(90, 390, 160 * pct / 100, 70);
    g.fillStyle = low ? '#ff6b60' : '#fff'; g.font = 'bold 110px sans-serif'; g.fillText(pct + ' %', 180, 610);
    if (low) { g.font = 'bold 34px sans-serif'; g.fillText('Batterie faible', 180, 680); }
    tex.needsUpdate = true;
  };
  const snow = snowfall(200, { box: [3, 3, 3], size: 0.008, speed: 0.15 }); scene.add(snow);
  const cam = camera(30, 0.05, 2500);
  return { scene, camera: cam, update(t, d, fx) {
    const pct = t < 0.75 ? 41 : 12, fl = t > 1.2 && t < 1.5, on = t < 1.2 || (fl && Math.floor(t * 30) % 3 !== 0);
    draw(pct, on); scr.emissiveIntensity = on ? (fl ? 0.9 : 1.6) : 0;
    const k = prog(t, 1.45, 2.0); glint.position.set(lerp(-0.03, 0.025, k), lerp(0.06, -0.04, k), 0.006); glint.material.opacity = Math.sin(Math.PI * k) * 0.9;
    hand.rotation.z = Math.sin(t * 2.1) * 0.02; hand.position.y = Math.sin(t * 3) * 0.002 - 0.015 * ease(prog(t, 1.5, 2));
    snow.update(t, [0, -1.5, 0]);
    look(cam, 0, 0.03, lerp(0.66, 0.6, t / d), 0, 0.0, 0);
    fx.glitch = fl ? 0.9 : t > 0.72 && t < 0.8 ? 0.4 : 0; fx.bloom = 0.5;
  } };
}

// ---------- plan 8 : le parking au ralenti ----------
const CARS = [0x8a2a22, 0xd8d3c4, 0x2a4a6a, 0x5a6a3a, 0xc8a23a, 0x7a7f86, 0x8a2a22, 0xd8d3c4];
function s08() {
  const scene = night(0.026, 0x1b2a44);
  const moon = shadowLight(new THREE.DirectionalLight(0x8fb0ff, 0.5), 22, 80, 2048); moon.position.set(8, 25, 12); moon.target.position.set(-8, 0, 0); scene.add(moon, moon.target);
  scene.add(snowGround(400));
  const em = [];
  for (let i = 0; i < 8; i++) {
    const front = i % 3 !== 1, c = lada({ color: CARS[i], cardboard: i % 2 === 0 });
    c.position.set(4.5 - i * 4.3, 0, 0); c.rotation.y = front ? -Math.PI / 2 : Math.PI / 2; scene.add(c);
    const zr = front ? -2.2 : 2.2;
    const e = emitter({ n: 9, origin: [c.position.x + 0.45, 0.3, zr], vel: [0.15, 0.3, front ? -0.5 : 0.7], velRand: [0.5, 0.2, 0.4], life: 3.6, size0: 0.35, size1: 2.6, opacity: 0.24, color: 0xa4b0c4, seed: i + 3 });
    scene.add(e); em.push(e);
  }
  const bank = fogBank({ n: 46, box: [-34, 10, 0.2, 0.8, -5, 5], size: 4.5, opacity: 0.07, color: 0x8f9fb8, seed: 4 }); scene.add(bank);
  for (const [x, li] of [[1, 150], [-11, 130], [-23, 0], [-35, 0]]) { const l = lamp({ light: li }); l.position.set(x, 0, -4.2); l.rotation.y = -Math.PI / 2; scene.add(l); }
  const b1 = building({ w: 60, seed: 5, px: 48 }); b1.position.set(-14, 0, -30); scene.add(b1);
  const b2 = building({ w: 44, seed: 6, px: 32 }); b2.position.set(-74, 0, -44); scene.add(b2);
  const snow = snowfall(500, { box: [16, 9, 14], size: 0.035, speed: 0.3 }); scene.add(snow);
  const cam = camera(48, 0.1, 2500);
  return { scene, camera: cam, update(t, d, fx) {
    em.forEach((e) => e.update(t + 5)); bank.update(t);
    const x = 9.5 - 1.1 * t, w = easeIn(prog(t, 2.68, 3.0));
    look(cam, x, 1.5, 5.0, x - 10, 0.75, -0.9);
    cam.rotateOnWorldAxis(Y, -w * 1.5); cam.updateMatrixWorld();
    snow.update(t, [x - 4, 0, 1]);
    fx.hblur = w * 0.3; fx.bloom = 0.7; fx.threshold = 0.75;
  } };
}

// ---------- plan 9 : gratter le givre ----------
function s09() {
  const scene = night(0.03, 0x1b2a44);
  scene.add(snowGround(200));
  const c = lada({ color: 0x8a2a22 }); scene.add(c);
  const l = lamp({ light: 200 }); l.position.set(-3.5, 0, -3); scene.add(l);
  const key = shadowLight(new THREE.SpotLight(SODIUM, 60, 20, 0.6, 0.8, 1.5), 1, 20); key.position.set(-2.5, 3.5, 4); key.target.position.set(0.2, 1, 0.8); scene.add(key, key.target);
  const fill = new THREE.DirectionalLight(0x9fbcff, 0.8); fill.position.set(3, 3, 5); scene.add(fill);
  const fm = frostMaterial({ grow: 1, haze: 0.85, bright: 1.0, rep: 1.5 });
  const fr = new THREE.Mesh(new THREE.PlaneGeometry(0.98, 0.37), fm); fr.position.set(0.3, 1.13, 0.815); scene.add(fr);
  const fm2 = frostMaterial({ grow: 1, haze: 0.9, bright: 1.0, rep: 1.2 });
  const fr2 = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.37), fm2); fr2.position.set(-0.68, 1.13, 0.815); scene.add(fr2);
  const body = new THREE.Mesh(new THREE.PlaneGeometry(4.1, 0.6), frostMaterial({ grow: 0.75, haze: 0.2, bright: 0.8, rep: 3 })); body.position.set(0, 0.62, 0.812); scene.add(body);
  // bras d'Aïsen + carte
  const arm = new THREE.Group(); scene.add(arm);
  const fur = std(0x7a6a58, 1, 0, { bumpMap: noiseTex(), bumpScale: 6 });
  arm.add(sph(0.07, fur, 0, -0.04, 0, 1, 1.3, 0.8)); arm.add(cyl(0.075, 0.075, 0.05, std(0xd9d2c4, 1), 0, -0.14, 0, 12));
  arm.add(cyl(0.07, 0.09, 0.9, std(NAVY, 0.7), 0, -0.6, 0, 12));
  const card = box(0.086, 0.056, 0.003, std(0xe8c860, 0.4), 0, 0.06, -0.045); card.rotation.x = 0.5; arm.add(card);
  arm.quaternion.setFromUnitVectors(V(0, -1, 0), V(0.45, -0.62, 0.64).normalize()); shadows(arm);
  const chips = points(320, { color: 0xeaf4ff, sparkle: 0.3, seed: 12 }), R = rng(5), CH = [];
  for (let i = 0; i < 320; i++) CH.push([R() * 2.2 - 0.2, (R() - 0.3) * 0.7, R() * 0.5 + 0.1, 0.25 + R() * 0.6, R()]);
  scene.add(chips);
  const hp = (t) => [0.3 + Math.sin(t * 7.5) * 0.085, 1.13 + Math.cos(t * 15) * 0.02 + Math.sin(t * 7.5) * 0.03, 0.9];
  const snow = snowfall(200, { box: [6, 4, 5], size: 0.02, speed: 0.2 }); scene.add(snow);
  const cam = camera(32, 0.1, 2500);
  return { scene, camera: cam, update(t, d, fx) {
    const h = hp(t); arm.position.set(h[0], h[1] - 0.06, h[2]);
    fm.uniforms.hole.value.set(0.5, 0.5, lerp(0.2, 0.36, ease(t / d)), 0.98 / 0.37);
    const u = chips.userData;
    CH.forEach((c, i) => {
      const tau = t - c[0], p = hp(c[0]);
      u.pos[i * 3] = p[0] + c[1] * tau * 0.5; u.pos[i * 3 + 1] = p[1] + 0.05 + c[2] * tau * 0.25 - 0.35 * tau * tau; u.pos[i * 3 + 2] = 0.84 + c[3] * tau * 0.3;
      u.size[i] = 0.012 + c[4] * 0.014; u.alpha[i] = tau < 0 ? 0 : clamp(1.4 - tau) * 0.95;
    });
    chips.material.uniforms.uTime.value = t; chips.flush();
    snow.update(t, [0, 0.5, 2]);
    const w = 1 - easeOut(prog(t, 0, 0.28));
    look(cam, 0.85, 1.3, lerp(3.5, 3.25, t / d), 0.2, 1.02, 0.8);
    cam.rotateOnWorldAxis(Y, w * 1.2); cam.updateMatrixWorld();
    fx.hblur = w * 0.3; fx.bloom = 0.5;
  } };
}

// ---------- plan 10 : le pneu figé ----------
function s10() {
  const scene = night(0.02, 0x1b2a44);
  const moon = shadowLight(new THREE.DirectionalLight(0x8fb0ff, 0.6), 12, 60, 2048); moon.position.set(6, 14, 8); scene.add(moon);
  scene.add(snowGround(400, 0xdde6f0, 160));
  const c = lada({ color: 0x8a2a22 }); c.rotation.y = Math.PI; scene.add(c);
  const ex = emitter({ n: 16, origin: [-2.25, 0.3, -0.45], vel: [-0.9, 0.3, 0], velRand: [0.5, 0.3, 0.5], life: 2.2, size0: 0.2, size1: 1.8, opacity: 0.28, color: 0xa4b0c4 }); c.add(ex);
  const b = building({ w: 46, seed: 9, px: 64, pipes: true, lit: 0.6, pileStep: 2.6 }); b.position.set(-4, 0, -27); scene.add(b);
  const under = new THREE.PointLight(SODIUM, 90, 40, 1.5); under.position.set(-6, 1, -38); scene.add(under);
  for (const x of [-16, 6]) { const l = lamp({ light: 240 }); l.position.set(x, 0, -17); l.rotation.y = -Math.PI / 2; scene.add(l); }
  const l2 = lamp({ light: 120 }); l2.position.set(4.5, 0, -2.5); l2.rotation.y = Math.PI; scene.add(l2);
  const bank = fogBank({ n: 30, box: [-30, 22, 0.3, 1.6, -24, -6], size: 7, opacity: 0.06, color: 0x8f9fb8 }); scene.add(bank);
  const fillL = new THREE.DirectionalLight(0x9fbcff, 1.1); fillL.position.set(4, 2.5, 6); scene.add(fillL);
  const spray = points(260, { color: 0xeaf4ff, seed: 4, sparkle: 0.2 }), R = rng(14), SP = [];
  for (let i = 0; i < 260; i++) SP.push([0.7 + R() * 1.6, R() * 1.5 + 0.3, R() * 1.2 + 0.2, (R() - 0.5) * 0.8, R()]);
  scene.add(spray);
  const snow = snowfall(400, { box: [14, 8, 12], size: 0.03, speed: 0.3 }); scene.add(snow);
  const cam = camera(42, 0.05, 2500);
  return { scene, camera: cam, update(t, d, fx) {
    const dist = 0.5 * 3.2 * Math.pow(Math.max(0, t - 0.75), 2);
    c.position.x = -dist; c.parts.wheels.forEach((w) => (w.rotation.z = -dist / 0.31));
    c.position.y = Math.sin(t * 38) * 0.004 * (t < 0.75 ? 1 : 0.4); c.rotation.z = 0.012 * Math.sin(Math.PI * prog(t, 0.7, 1.4));
    ex.update(t + 3, 1 + 1.2 * prog(t, 0.4, 1)); bank.update(t);
    const u = spray.userData;
    SP.forEach((s, i) => {
      const tau = t - s[0], x0 = 1.25 - 0.5 * 3.2 * Math.pow(Math.max(0, s[0] - 0.75), 2) + 0.3;
      u.pos[i * 3] = x0 + s[1] * tau * 0.8; u.pos[i * 3 + 1] = 0.05 + s[2] * tau - 1.6 * tau * tau; u.pos[i * 3 + 2] = 0.72 + s[3] * tau;
      u.size[i] = 0.02 + s[4] * 0.02; u.alpha[i] = tau < 0 || u.pos[i * 3 + 1] < 0 ? 0 : 0.9;
    });
    spray.material.uniforms.uTime.value = t; spray.flush();
    const sh = 0.014 * Math.sin(Math.PI * prog(t, 0.45, 1.5)), k = ease(prog(t, 1.4, 2.8));
    look(cam, 2.05 + Math.sin(t * 47) * sh, 0.17 + Math.sin(t * 61) * sh, 2.75, 1.0 - k * 1.2, 0.45 + k * 0.95, 0.6);
    snow.update(t, [0, 0, -2]);
    fx.bloom = 0.7; fx.threshold = 0.75;
  } };
}

export const A = [s01, s02, s03, s04, s05, s06, s07, s08, s09, s10];
export { s19 };
