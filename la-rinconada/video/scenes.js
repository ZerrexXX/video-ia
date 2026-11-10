import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  clamp, lerp, smooth, ease, rng, fbm, height, makeTerrain, makeSky, makeStars, makeTown, makeTrash,
  makePerson, makeRocks, makeParticles, updateParticles, softTexture, corrugated, makePoles, makeSmoke, noiseTexture, makePerson2, makeGlacier
} from './lib.js';

const ASPECT = 16 / 9;
const cam = (fov = 45) => new THREE.PerspectiveCamera(fov, ASPECT, 0.05, 2000);

// ---------- Ville (partagée par plusieurs scènes, avec éclairage variable) ----------
function townScene({ mood }) {
  const s = new THREE.Scene();
  const moods = {
    night: { top: 0x060b1a, hor: 0x24365a, fog: 0x15223a, fogD: 0.0035, amb: 0x5a6f99, ambI: 1.1, sun: 0xa8c0f0, sunI: 1.1, sunPos: [-80, 120, -40], win: 1 },
    dawn: { top: 0x2b3f6b, hor: 0xf0a067, fog: 0xc89a85, fogD: 0.004, amb: 0x8090b0, ambI: 0.6, sun: 0xffc48a, sunI: 2.2, sunPos: [150, 40, 60], win: 0.6 },
    day: { top: 0x5f84b0, hor: 0xd3dde4, fog: 0xc4ccd3, fogD: 0.0045, amb: 0xc8d0d8, ambI: 1.6, sun: 0xfff4e6, sunI: 3.0, sunPos: [60, 120, 80], win: 0 },
  };
  const M = moods[mood];
  s.add(makeSky(M.top, M.hor, M.fog));
  if (mood === 'night') s.add(makeStars());
  s.fog = new THREE.FogExp2(M.fog, M.fogD);
  s.add(new THREE.HemisphereLight(M.amb, 0x2a2018, M.ambI));
  const sun = new THREE.DirectionalLight(M.sun, M.sunI); sun.position.set(...M.sunPos);
  sun.castShadow = mood !== 'night'; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -80, right: 80, top: 80, bottom: -80, near: 1, far: 400 });
  s.add(sun);
  s.add(makeTerrain());
  const town = makeTown({ night: mood === 'night' });
  town.userData.wins.material.opacity = M.win; town.userData.wins.material.fog = false; if (mood === 'night') town.userData.wins.scale.setScalar(1); town.userData.wins.visible = M.win > 0;
  s.add(town);
  s.add(makeTrash());
  s.add(makePoles());
  s.add(makeGlacier());
  const smoke = makeSmoke({ color: mood === 'night' ? 0x4a5670 : 0xb8b4ae, opacity: mood === 'night' ? 0.25 : 0.18 }); s.add(smoke.group);
  if (mood !== 'night') {
    const cr = rng(31);
    for (let i = 0; i < 14; i++) { const cl = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTexture(), color: mood === 'dawn' ? 0xffc2a0 : 0xe8ecef, transparent: true, opacity: 0.35 + cr() * 0.3, depthWrite: false, fog: false })); cl.position.set((cr() - 0.5) * 700, 90 + cr() * 80, -300 - cr() * 300); cl.scale.set(160 + cr() * 200, 30 + cr() * 30, 1); s.add(cl); }
  }
  const walkers = [];
  const wr = rng(44);
  for (let i = 0; i < 24; i++) { const w = makePerson2({ type: wr() < 0.5 ? 'miner' : 'woman', skirt: [0xc2185b, 0x6a1b9a, 0x2e7d32, 0xd84315][i % 4], shawl: [0x1565c0, 0xef6c00, 0xad1457][i % 3], seed: 100 + i }); w.scale.setScalar(1.6); w.userData.p = { x: Math.round((wr() * 2 - 1) * 4) * 13 - 6.5 + (wr() - 0.5), z: wr() * 50 - 10, sp: (0.6 + wr() * 0.6) * (wr() < 0.5 ? 1 : -1) }; s.add(w); walkers.push(w); }
  const animWalk = (t) => walkers.forEach((w) => { const p = w.userData.p, z = p.z + t * p.sp; w.position.set(p.x, height(p.x, z), z); w.rotation.y = p.sp > 0 ? 0 : Math.PI; const ph = t * 5; if (w.userData.legs) { w.userData.legs[0].rotation.x = Math.sin(ph) * 0.5; w.userData.legs[1].rotation.x = -Math.sin(ph) * 0.5; } w.userData.arms[0].rotation.x = -Math.sin(ph) * 0.4; w.userData.arms[1].rotation.x = Math.sin(ph) * 0.4; });
  // lueur d'or sous le glacier
  const glow = new THREE.PointLight(0xffc040, 0, 60, 1.5); glow.position.set(5, height(5, -70) - 1, -70); s.add(glow);
  const glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTexture(), color: 0xffcc55, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  glowSprite.position.copy(glow.position).add(new THREE.Vector3(0, 2, 6)); glowSprite.scale.set(30, 18, 1); s.add(glowSprite);
  return { s, glow, glowSprite, town, sun, tick: (t) => { smoke.update(t); animWalk(t); } };
}

// 0. Accroche — la ville la nuit, descente lente
export function sHook() {
  const { s, tick } = townScene({ mood: 'night' });
  const snow = makeParticles({ count: 900, color: 0xffffff, size: 0.18, opacity: 0.7, box: [40, 30, 40] }); s.add(snow);
  const c = cam(40);
  return {
    scene: s, camera: c, update(t, d) {
      const k = ease(t / d);
      c.position.set(lerp(-70, -45, k), lerp(55, 30, k), lerp(90, 62, k));
      c.lookAt(lerp(0, 5, k), lerp(5, 3, k), lerp(0, 5, k));
      snow.position.copy(c.position);
      updateParticles(snow, t, (i, t, a, b, cc) => [a * t * 2, -t * (1.5 + b), cc * t]); tick(t);
    }, post: { bloom: [0.9, 0.6, 0.6], grade: [0.85, 0.95, 1.15] }
  };
}

// 1. Titre — aube, la caméra s'élève et révèle le glacier
export function sTitle() {
  const { s, tick } = townScene({ mood: 'dawn' });
  const c = cam(42);
  return {
    scene: s, camera: c, update(t, d) {
      const k = ease(t / d);
      c.position.set(lerp(30, -10, k), lerp(6, 34, k), lerp(70, 85, k));
      c.lookAt(lerp(0, 0, k), lerp(4, 25, k), lerp(0, -60, k)); tick(t + 10);
    }, post: { bloom: [0.5, 0.7, 0.8], grade: [1.1, 0.98, 0.88] }
  };
}

// 2. Réveil — intérieur d'une cabane en tôle gelée
export function sWake() {
  const s = new THREE.Scene();
  s.background = new THREE.Color(0x05080d);
  s.fog = new THREE.Fog(0x0a1220, 6, 18);
  s.add(new THREE.AmbientLight(0x6a7a9a, 1.4));
  const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.14, 12), new THREE.MeshStandardMaterial({ color: 0xf3ead8 })); candle.position.set(0.2, 0.62, -1.55); s.add(candle);
  const stool = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 0.5), new THREE.MeshStandardMaterial({ color: 0x5b3a1e, roughness: 1 })); stool.position.set(0.2, 0.275, -1.55); s.add(stool);
  const flameW = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffb050).multiplyScalar(6) })); flameW.position.set(0.2, 0.72, -1.55); flameW.scale.y = 1.8; s.add(flameW);
  const cl = new THREE.PointLight(0xff9a40, 2.5, 4, 1.6); cl.position.set(0.2, 0.78, -1.55); cl.castShadow = true; s.add(cl); const fill = new THREE.PointLight(0xffb070, 3, 6, 1.5); fill.position.set(-0.2, 1.8, 0.8); s.add(fill);
  const W = 4, D = 4, H = 2.4;
  const back = corrugated(W, H, 0x7d858c); back.position.set(0, H / 2, -D / 2); s.add(back);
  const left = corrugated(D, H, 0x6f777e); left.rotation.y = Math.PI / 2; left.position.set(-W / 2, H / 2, 0); s.add(left);
  const right = corrugated(D, H, 0x6f777e); right.rotation.y = -Math.PI / 2; right.position.set(W / 2, H / 2, 0); s.add(right);
  const roof = corrugated(W, D, 0x5d646a); roof.rotation.x = Math.PI / 2; roof.position.set(0, H, 0); s.add(roof);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ color: 0x3a2e24, roughness: 1 })); floor.rotation.x = -Math.PI / 2; s.add(floor);
  // lit + couvertures
  const bed = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.35, 2.1), new THREE.MeshStandardMaterial({ color: 0x4a3a2c })); bed.position.set(-1.1, 0.18, -0.6); s.add(bed);
  const rr = rng(4); const blCols = [0xb3261e, 0x1e5bb3, 0xd98f1e, 0x2e7d32];
  for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.08, 1.6), new THREE.MeshStandardMaterial({ color: blCols[i], roughness: 1 })); b.position.set(-1.1 + (rr() - 0.5) * 0.08, 0.4 + i * 0.07, -0.45); b.rotation.y = (rr() - 0.5) * 0.1; s.add(b); }
  // bidons d'eau gelée, réchaud éteint
  for (let i = 0; i < 3; i++) { const j = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.5, 14), new THREE.MeshStandardMaterial({ color: [0x1565c0, 0xe0e0e0, 0x2e7d32][i], roughness: 0.4 })); j.position.set(1.2 + i * 0.25, 0.25, -1.5 + (i % 2) * 0.3); s.add(j); }
  const ice = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.02, 14), new THREE.MeshStandardMaterial({ color: 0xcfe8ff, roughness: 0.1, metalness: 0.2 })); ice.position.set(1.2, 0.5, -1.5); s.add(ice);
  // lumière froide par les interstices de la tôle
  const beam = new THREE.SpotLight(0x9cc4ff, 10, 10, 0.25, 0.6, 1.2); beam.position.set(1.6, 2.3, -1.9); beam.target.position.set(-0.6, 0, 0.6); s.add(beam, beam.target);
  const beamMesh = new THREE.Mesh(new THREE.ConeGeometry(0.7, 3.4, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0x9cc4ff, transparent: true, opacity: 0.012, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  
  const frost = makeParticles({ count: 500, color: 0xcfe3ff, size: 0.02, opacity: 0.8, box: [4, 2.4, 4] }); frost.position.y = 1.2; s.add(frost);
  // souffle (buée) devant la caméra
  const breath = [];
  for (let i = 0; i < 14; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTexture(), color: 0xe6f0ff, transparent: true, opacity: 0, depthWrite: false })); s.add(sp); breath.push(sp); }
  const c = cam(55);
  return {
    scene: s, camera: c, update(t, d, g) {
      // g = temps global (pour caler le cœur sur la voix)
      const k = ease(t / d);
      const heart = smooth(16.1, 16.6, g);
      const beat = heart * Math.pow(Math.max(0, Math.sin(g * Math.PI * 2 * 1.9)), 12);
      const shake = heart * 0.006;
      c.position.set(lerp(0.9, 0.2, k) + Math.sin(g * 37) * shake, lerp(1.25, 1.1, k) + beat * 0.01, lerp(1.6, 1.0, k));
      c.lookAt(lerp(-0.6, -1.2, k), lerp(0.7, 0.55, k), lerp(-0.8, -0.9, k)); c.userData.focus = c.position.distanceTo(new THREE.Vector3(-1.1, 0.6, -0.5));
      beam.intensity = 10 + Math.sin(g * 1.3) * 1.5;
      updateParticles(frost, t, (i, t, a, b, cc) => [a * t * 0.08, b * t * 0.05 - t * 0.03, cc * t * 0.08]);
      const fwd = new THREE.Vector3(); c.getWorldDirection(fwd);
      breath.forEach((sp, i) => {
        const period = 2.4 - heart * 1.1, ph = ((t + i * 0.17) % period) / period;
        const puff = Math.floor((t + i * 0.17) / period);
        const life = ph * period;
        const op = life < 1.2 ? Math.sin((life / 1.2) * Math.PI) * 0.06 : 0;
        const rr2 = rng(i * 31 + puff * 7);
        sp.material.opacity = op;
        sp.position.copy(c.position).addScaledVector(fwd, 0.35 + life * 0.5).add(new THREE.Vector3((rr2() - 0.5) * 0.2, -0.12 + life * 0.12, (rr2() - 0.5) * 0.2));
        const sc = 0.08 + life * 0.25; sp.scale.set(sc, sc, 1);
      });
    }, post: { bloom: [0.45, 0.4, 0.95], grade: [0.9, 1.0, 1.15], dof: { aperture: 0.012, maxblur: 0.008 } }
  };
}

// 3. La ville de jour — survol bas des cabanes, puis le glacier et l'or
export function sCity() {
  const { s, glow, glowSprite, tick } = townScene({ mood: 'day' });
  const c = cam(45);
  return {
    scene: s, camera: c, update(t, d, g) {
      const k1 = ease(clamp(t / 6)), k2 = ease(clamp((g - 28.4) / 3.2));
      const p = new THREE.Vector3(lerp(-30, 10, k1), height(lerp(-30, 10, k1), 30) + 11 + k2 * 10, lerp(30, 24, k1) + k2 * 6);
      c.position.copy(p);
      const look = new THREE.Vector3(lerp(-10, 15, k1), height(0, 0) + 1, lerp(-5, -5, k1)).lerp(new THREE.Vector3(5, 45, -70), k2);
      c.lookAt(look);
      const gk = smooth(29.8, 31.5, g);
      glow.intensity = gk * 900; glowSprite.material.opacity = gk * 0.95; tick(t + 20);
    }, post: { bloom: [0.5, 0.6, 0.9], grade: [1.12, 1.1, 1.06] }
  };
}

// 4. La montée et la coca — un mineur grimpe, feuilles de coca au premier plan
export function sCoca() {
  const s = new THREE.Scene();
  s.add(makeSky(0x5f84b0, 0xc7d3dd, 0xc7d3dd));
  s.fog = new THREE.FogExp2(0xc7d3dd, 0.009);
  s.add(new THREE.HemisphereLight(0xc0c8d0, 0x3a3028, 0.9));
  const sun = new THREE.DirectionalLight(0xffe2b8, 2); sun.position.set(40, 60, 30); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20 }); s.add(sun);
  const terr = makeTerrain(); s.add(terr);
  const base = new THREE.Vector3(-8, 0, -18);
  const miner = makePerson2({ type: 'miner', seed: 3 }); s.add(miner);
  // feuilles de coca
  const leafShape = new THREE.Shape(); leafShape.moveTo(0, -0.5); leafShape.quadraticCurveTo(0.32, 0, 0, 0.5); leafShape.quadraticCurveTo(-0.32, 0, 0, -0.5);
  const leafGeo = new THREE.ShapeGeometry(leafShape, 8);
  const leaves = [], lr = rng(9);
  for (let i = 0; i < 26; i++) {
    const m = new THREE.Mesh(leafGeo, new THREE.MeshStandardMaterial({ color: new THREE.Color(0x3f7d2a).multiplyScalar(0.8 + lr() * 0.4), side: THREE.DoubleSide, roughness: 0.6 }));
    m.userData = { x: (lr() - 0.5) * 3.2, y: lr() * 2.2, z: -lr() * 1.5, sp: 0.2 + lr() * 0.3, rot: lr() * 6, rs: (lr() - 0.5) * 2, sc: 0.12 + lr() * 0.12 };
    s.add(m); leaves.push(m);
  }
  const c = cam(40);
  return {
    scene: s, camera: c, update(t, d) {
      const walk = t * 0.9;
      const mx = base.x + walk * 0.25, mz = base.z - walk;
      miner.position.set(mx, height(mx, mz), mz);
      miner.rotation.y = Math.PI + 0.25; miner.userData.head.rotation.y = 0.3;
      const ph = t * 6;
      const { legs, arms, torso } = miner.userData;
      legs[0].rotation.x = Math.sin(ph) * 0.5; legs[1].rotation.x = -Math.sin(ph) * 0.5;
      arms[0].rotation.x = -Math.sin(ph) * 0.4; arms[1].rotation.x = Math.sin(ph) * 0.4;
      torso.rotation.x = 0.18; torso.position.y = 1.0 + Math.abs(Math.sin(ph)) * 0.04;
      const cx = mx + 2.2 - t * 0.05, cz = mz - 4.2;
      c.position.set(cx, height(cx, cz) + 1.5, cz);
      c.lookAt(mx - 0.3, height(mx, mz) + 1.1, mz); c.userData.focus = c.position.distanceTo(miner.position);
      const fwd = new THREE.Vector3(); c.getWorldDirection(fwd);
      const right = new THREE.Vector3().crossVectors(fwd, c.up).normalize(); const up = new THREE.Vector3().crossVectors(right, fwd);
      leaves.forEach((l) => {
        const u = l.userData, y = ((u.y - t * u.sp) % 2.2 + 2.2) % 2.2 - 1.1;
        l.position.copy(c.position).addScaledVector(fwd, 1.6 - u.z).addScaledVector(right, u.x + Math.sin(t + u.rot) * 0.15).addScaledVector(up, y);
        l.rotation.set(u.rot + t * u.rs, u.rot * 0.7 + t * 0.5, t * u.rs * 0.5); l.scale.setScalar(u.sc);
      });
    }, post: { bloom: [0.35, 0.5, 0.9], grade: [1.2, 1.14, 1.04], dof: { aperture: 0.004, maxblur: 0.01 } }
  };
}

// 5. La mine — galerie, cachorreo, veines d'or
export function sMine() {
  const s = new THREE.Scene(); s.background = new THREE.Color(0x020202);
  s.fog = new THREE.FogExp2(0x050403, 0.09);
  const amb = new THREE.AmbientLight(0x4a3a2a, 0.12); s.add(amb);
  const pts = []; const r = rng(21);
  for (let i = 0; i < 30; i++) pts.push(new THREE.Vector3(Math.sin(i * 0.5) * 1.5 + (r() - 0.5), Math.sin(i * 0.3) * 0.3, -i * 4));
  const curve = new THREE.CatmullRomCurve3(pts);
  const tube = new THREE.TubeGeometry(curve, 500, 1.6, 28, false);
  const p = tube.attributes.position, nrm = tube.attributes.normal;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n = fbm(x * 0.9 + z * 0.3, y * 0.9 + z * 0.5) - 0.5;
    p.setXYZ(i, x - nrm.getX(i) * n * 0.7, y - nrm.getY(i) * n * 0.7 + (nrm.getY(i) > 0.6 ? 0.3 : 0), z - nrm.getZ(i) * n * 0.7);
  }
  tube.computeVertexNormals();
  s.add(new THREE.Mesh(tube, new THREE.MeshStandardMaterial({ color: 0x6a5a4a, roughness: 1, flatShading: true, side: THREE.BackSide, map: (() => { const t = noiseTexture(1, 3).clone(); t.repeat.set(60, 3); t.needsUpdate = true; return t; })(), bumpMap: (() => { const t = noiseTexture(2, 6).clone(); t.repeat.set(90, 4); t.needsUpdate = true; return t; })(), bumpScale: 6 })));
  // étais en bois
  const wood = new THREE.MeshStandardMaterial({ color: 0x5b3a1e, roughness: 1 });
  for (let u = 0.02; u < 0.98; u += 0.025) {
    const P = curve.getPointAt(u), T = curve.getTangentAt(u);
    const gr = new THREE.Group(); gr.position.copy(P); gr.lookAt(P.clone().add(T));
    const post = new THREE.BoxGeometry(0.16, 2.4, 0.16);
    const a = new THREE.Mesh(post, wood); a.position.set(-1.05, -0.3, 0); const b = a.clone(); b.position.x = 1.05;
    const top = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.18, 0.2), wood); top.position.y = 0.9;
    gr.add(a, b, top); s.add(gr);
  }
  // veines d'or
  const veinMat = new THREE.MeshStandardMaterial({ color: 0x6b5a2a, emissive: 0xffb300, emissiveIntensity: 0, metalness: 1, roughness: 0.35 });
  for (let i = 0; i < 70; i++) {
    const u = 0.25 + r() * 0.5, P = curve.getPointAt(u), ang = r() * Math.PI * 2;
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.25 + r() * 0.5), veinMat);
    m.position.set(P.x + Math.cos(ang) * 1.55, P.y + Math.sin(ang) * 1.4, P.z); m.lookAt(P.x + Math.cos(ang) * 1.55 + (r()-0.5), P.y + Math.sin(ang) * 1.4 + (r()-0.5), P.z - 1); s.add(m);
  }
  const sparks = makeParticles({ count: 300, color: 0xffd34d, size: 0.04, opacity: 0, additive: true, box: [2.5, 2, 6] }); s.add(sparks);
  const c = cam(60); s.add(c);
  const lamp = new THREE.SpotLight(0xfff0d0, 25, 18, 0.55, 0.5, 1.4); lamp.position.set(0.15, 0.1, 0); c.add(lamp); lamp.target.position.set(0, -0.2, -3); c.add(lamp.target);
  const warm = new THREE.PointLight(0xffa040, 0, 8, 1.5); c.add(warm); warm.position.set(0, 0, -2);
  const dust = makeParticles({ count: 400, color: 0xd8c8b0, size: 0.015, opacity: 0.5, box: [3, 2.5, 6] }); s.add(dust);
  return {
    scene: s, camera: c, update(t, d, g) {
      const u = 0.03 + (t / d) * 0.6;
      const P = curve.getPointAt(u), A = curve.getPointAt(Math.min(1, u + 0.04));
      c.position.set(P.x + Math.sin(t * 2.1) * 0.03, P.y - 0.1 + Math.abs(Math.sin(t * 3.4)) * 0.04, P.z);
      c.lookAt(A.x, A.y - 0.15, A.z);
      const gold = smooth(46.3, 48, g), warmK = smooth(44.7, 46.2, g);
      veinMat.emissiveIntensity = gold * 2.2; warm.intensity = warmK * 6 + gold * 10;
      sparks.material.opacity = gold * 0.9; sparks.position.copy(c.position).add(new THREE.Vector3(0, 0, -3));
      updateParticles(sparks, t, (i, t, a, b, cc) => [Math.sin(t + i) * 0.1, b * t * 0.2, cc * t * 0.2]);
      dust.position.copy(c.position).add(new THREE.Vector3(0, 0, -2));
      updateParticles(dust, t, (i, t, a, b, cc) => [a * t * 0.15, b * t * 0.1, cc * t * 0.15]);
    }, post: { bloom: [0.7, 0.5, 0.7], grade: [1.08, 0.97, 0.85] }
  };
}

// 6. Les pallaqueras — femmes qui fouillent les pierres rejetées
export function sPalla() {
  const s = new THREE.Scene();
  s.add(makeSky(0x7c93ab, 0xd6d9d6)); s.fog = new THREE.FogExp2(0xc8c8c2, 0.03);
  s.add(new THREE.HemisphereLight(0xd0d6dc, 0x3a3028, 0.9));
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.2); sun.position.set(20, 30, 15); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15 }); s.add(sun);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200, 60, 60), new THREE.MeshStandardMaterial({ color: 0x5e5751, roughness: 1, flatShading: true }));
  ground.rotation.x = -Math.PI / 2; const gp = ground.geometry.attributes.position; for (let i = 0; i < gp.count; i++) gp.setZ(i, fbm(gp.getX(i) * 0.2, gp.getY(i) * 0.2) * 1.2); ground.geometry.computeVertexNormals(); ground.receiveShadow = true; s.add(ground);
  [[0, 0, 7, 3], [-12, -8, 9, 4.5], [10, -10, 8, 4], [-5, 12, 6, 2.5], [14, 6, 6, 2.2]].forEach(([x, z, sp, pl], i) => { const r = makeRocks({ count: 900, seed: 40 + i, spread: sp, pile: pl }); r.position.set(x, 0.3, z); s.add(r); });
  // montagne/terril au fond
  const far = makeTerrain(); far.position.set(0, -6, -40); s.add(far);
  const cols = [[0xc2185b, 0x1565c0], [0x6a1b9a, 0xef6c00], [0x2e7d32, 0xad1457], [0xd84315, 0x283593], [0x00838f, 0x8e24aa]];
  const women = cols.map(([sk, sh], i) => { const w = makePerson2({ type: 'woman', skirt: sk, shawl: sh, seed: 60 + i }); s.add(w); return w; });
  const spots = [[1.5, 3.2, 2.6], [-2.4, 2.4, 0.4], [3.6, 0.6, -1.2], [-4.6, -1.2, 1.9], [0.4, -2.6, 3.4]];
  women.forEach((w, i) => { const [x, z, ry] = spots[i]; w.position.set(x, 0.6 + Math.max(0, 3 * (1 - Math.hypot(x, z) / 7)) * 0.5, z); w.rotation.y = ry; });
  const glints = []; const gr = rng(77);
  for (let i = 0; i < 10; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTexture(), color: 0xffd34d, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); sp.position.set((gr() - 0.5) * 10, 0.8 + gr() * 1.2, (gr() - 0.5) * 8); sp.userData.ph = gr() * 10; s.add(sp); glints.push(sp); }
  const dust = makeParticles({ count: 700, color: 0xcfc6b8, size: 0.6, opacity: 0.12, box: [30, 6, 30] }); dust.position.y = 2; s.add(dust);
  const c = cam(38);
  return {
    scene: s, camera: c, update(t, d) {
      const a = 0.4 + t * 0.06;
      c.position.set(Math.sin(a) * 11, 3.2 - t * 0.05, Math.cos(a) * 11); c.lookAt(0, 1.2, 0); c.userData.focus = 10;
      women.forEach((w, i) => {
        const ph = t * 1.4 + i * 1.7, bend = 0.75 + Math.sin(ph) * 0.18;
        const { torso, arms } = w.userData; torso.rotation.x = bend;
        arms[0].rotation.x = -0.6 + Math.sin(ph * 2) * 0.5; arms[1].rotation.x = -0.4 - Math.sin(ph * 2 + 1) * 0.5;
      });
      glints.forEach((g) => { const v = Math.sin(t * 2 + g.userData.ph); g.material.opacity = Math.pow(Math.max(0, v), 20) * 0.9; g.scale.setScalar(0.3 + 0.3 * Math.max(0, v)); });
      updateParticles(dust, t, (i, t, a, b, cc) => [t * (0.8 + a), b * t * 0.2, cc * t * 0.4]);
    }, post: { bloom: [0.6, 0.5, 0.8], grade: [1.0, 0.98, 0.95], dof: { aperture: 0.0015, maxblur: 0.006 } }
  };
}

// 7. Le mercure — bol, chalumeau, vapeurs toxiques, il reste l'or
export function sMercury(renderer) {
  const s = new THREE.Scene(); s.background = new THREE.Color(0x07080a);
  const pm = new THREE.PMREMGenerator(renderer); s.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; s.environmentIntensity = 0.35;
  s.add(new THREE.AmbientLight(0x223040, 0.3));
  const key = new THREE.SpotLight(0xffd9a8, 30, 12, 0.5, 0.6, 1.5); key.position.set(2, 4, 2); key.castShadow = true; s.add(key);
  const table = new THREE.Mesh(new THREE.BoxGeometry(8, 0.3, 5), new THREE.MeshStandardMaterial({ color: 0x3b2c22, roughness: 0.95 })); table.position.y = -0.15; table.receiveShadow = true; s.add(table);
  const prof = [[0, 0], [0.9, 0.02], [1.15, 0.25], [1.25, 0.55], [1.3, 0.6]].map(([x, y]) => new THREE.Vector2(x, y));
  const bowl = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), new THREE.MeshStandardMaterial({ color: 0x55585c, metalness: 0.8, roughness: 0.45, side: THREE.DoubleSide })); bowl.castShadow = true; s.add(bowl);
  const merc = new THREE.Mesh(new THREE.SphereGeometry(0.55, 48, 24), new THREE.MeshStandardMaterial({ color: 0xd8dde2, metalness: 1, roughness: 0.06 })); merc.scale.set(1, 0.35, 1); merc.position.y = 0.2; s.add(merc);
  const nug = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 1), new THREE.MeshStandardMaterial({ color: 0xffc23d, metalness: 1, roughness: 0.25, emissive: 0x4a2c00, emissiveIntensity: 0 }));
  const np = nug.geometry.attributes.position; const nr = rng(5); for (let i = 0; i < np.count; i++) { const f = 0.75 + nr() * 0.4; np.setXYZ(i, np.getX(i) * f, np.getY(i) * f * 0.7, np.getZ(i) * f); } nug.geometry.computeVertexNormals();
  nug.position.y = 0.16; s.add(nug);
  // chalumeau
  const torch = new THREE.Group(); s.add(torch);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 1.2, 16), new THREE.MeshStandardMaterial({ color: 0xc62828, roughness: 0.4 })); handle.rotation.z = Math.PI / 2; handle.position.x = 0.9; torch.add(handle);
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.6, 12), new THREE.MeshStandardMaterial({ color: 0xb08d57, metalness: 1, roughness: 0.3 })); nozzle.rotation.z = Math.PI / 2; nozzle.position.x = 0.1; torch.add(nozzle);
  torch.position.set(1.6, 1.0, 0.2); torch.rotation.z = -0.6;
  const flame = makeParticles({ count: 400, color: 0x4fa3ff, size: 0.09, opacity: 0, additive: true, box: [50, 50, 50] }); s.add(flame);
  const flameLight = new THREE.PointLight(0x6fb6ff, 0, 6, 1.5); flameLight.position.set(0.6, 0.6, 0.2); s.add(flameLight);
  const vapor = []; const vr = rng(12);
  for (let i = 0; i < 40; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTexture(), color: new THREE.Color(0x9fb8a0).lerp(new THREE.Color(0xc8d0c8), vr()), transparent: true, opacity: 0, depthWrite: false })); sp.userData = { ph: vr(), x: (vr() - 0.5) * 0.6, z: (vr() - 0.5) * 0.6, sp: 0.4 + vr() * 0.5 }; s.add(sp); vapor.push(sp); }
  const c = cam(35);
  return {
    scene: s, camera: c, update(t, d, g) {
      const k = ease(t / d);
      c.position.set(lerp(3.2, 1.9, k), lerp(2.6, 1.6, k), lerp(4.2, 2.6, k)); c.lookAt(0, 0.25, 0); c.userData.focus = c.position.distanceTo(new THREE.Vector3(0, 0.25, 0));
      const fire = smooth(58.8, 59.3, g) * (1 - smooth(65.5, 66.3, g));
      const evap = smooth(61.2, 64.2, g);
      merc.scale.set(1 - evap * 0.97, 0.35 * (1 - evap * 0.97), 1 - evap * 0.97);
      nug.material.emissiveIntensity = evap * 0.8;
      flame.material.opacity = fire * 0.9; flameLight.intensity = fire * (4 + Math.sin(g * 40) * 0.6);
      flame.position.set(1.43, 1.11, 0.2);
      updateParticles(flame, t, (i, t, a, b, cc) => { const l = ((t * 3 + i * 0.013) % 1); return [-l * 0.75 + a * 0.06 * l, -l * 0.47 + b * 0.06 * l, cc * 0.06 * l]; });
      const vk = smooth(61.0, 63.0, g);
      vapor.forEach((v, i) => {
        const u = v.userData, life = ((t * u.sp * 0.25 + u.ph) % 1);
        v.position.set(u.x + Math.sin(t + i) * 0.3 * life, 0.3 + life * 3.2, u.z + Math.cos(t * 0.7 + i) * 0.3 * life);
        const sc = 0.4 + life * 2.4; v.scale.set(sc, sc, 1);
        v.material.opacity = vk * Math.sin(life * Math.PI) * (0.25 + smooth(63.8, 66, g) * 0.2);
      });
    }, post: { bloom: [1.1, 0.5, 0.6], grade: [0.95, 1.0, 1.05], dof: { aperture: 0.01, maxblur: 0.008 } }
  };
}

// 8. Le verdict — une lampe, un tas de pierres, peut-être rien
export function sVerdict() {
  const s = new THREE.Scene(); s.background = new THREE.Color(0x030303);
  const table = new THREE.Mesh(new THREE.BoxGeometry(6, 0.3, 4), new THREE.MeshStandardMaterial({ color: 0x3a2a1e, roughness: 1 })); table.position.y = -0.15; table.receiveShadow = true; s.add(table);
  const rocks = makeRocks({ count: 160, seed: 9, spread: 0.9, pile: 0.6 }); s.add(rocks);
  table.material.map = noiseTexture(4, 7); table.material.bumpMap = noiseTexture(8, 9); table.material.bumpScale = 3;
  const helm = new THREE.Mesh(new THREE.LatheGeometry([[0.0, 0.22], [0.1, 0.2], [0.16, 0.12], [0.17, 0.02], [0.22, 0.0], [0.22, -0.02], [0.0, -0.02]].map(([x, y]) => new THREE.Vector2(x * 1.6, y * 1.6)), 28), new THREE.MeshStandardMaterial({ color: 0xf9c000, roughness: 0.35 }));
  helm.position.set(-1.35, 0.03, 0.4); helm.rotation.z = 0.15; helm.castShadow = true; s.add(helm);
  const lsh = new THREE.Shape(); lsh.moveTo(0, -0.5); lsh.quadraticCurveTo(0.32, 0, 0, 0.5); lsh.quadraticCurveTo(-0.32, 0, 0, -0.5);
  const lr2 = rng(4); for (let i = 0; i < 14; i++) { const l = new THREE.Mesh(new THREE.ShapeGeometry(lsh, 6), new THREE.MeshStandardMaterial({ color: new THREE.Color(0x4a7d2a).multiplyScalar(0.7 + lr2() * 0.4), side: THREE.DoubleSide })); l.rotation.set(-Math.PI / 2, 0, lr2() * 6); l.scale.setScalar(0.1 + lr2() * 0.04); l.position.set(1.1 + (lr2() - 0.5) * 0.5, 0.005 + i * 0.002, 0.5 + (lr2() - 0.5) * 0.4); s.add(l); }
  const specks = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.012, 0), new THREE.MeshStandardMaterial({ color: 0xffc23d, metalness: 1, roughness: 0.2, emissive: 0x553300 }), 40);
  const so = new THREE.Object3D(), sr = rng(12); for (let i = 0; i < 40; i++) { const a = sr() * 6.28, d = sr() * 0.8; so.position.set(Math.cos(a) * d, 0.05 + Math.max(0, 0.6 * (1 - d / 0.9)) * sr(), Math.sin(a) * d); so.updateMatrix(); specks.setMatrixAt(i, so.matrix); } s.add(specks);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffd9a0 })); bulb.position.set(0, 2.4, 0); s.add(bulb);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 3, 6), new THREE.MeshBasicMaterial({ color: 0x111111 })); cord.position.set(0, 3.9, 0); s.add(cord);
  const lamp = new THREE.PointLight(0xffc98a, 22, 9, 1.4); lamp.position.copy(bulb.position); lamp.castShadow = true; lamp.shadow.mapSize.set(1024, 1024); s.add(lamp);
  const glint = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTexture(), color: 0xffd34d, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); glint.position.set(0.15, 0.62, 0.3); s.add(glint);
  const c = cam(38);
  return {
    scene: s, camera: c, update(t, d, g) {
      const k = ease(t / d);
      c.position.set(lerp(2.6, 1.2, k), lerp(2.0, 1.25, k), lerp(3.6, 1.9, k)); c.lookAt(0, 0.3, 0); c.userData.focus = c.position.distanceTo(new THREE.Vector3(0, 0.3, 0));
      const fl = (g > 69.3 && g < 70.6) ? (Math.sin(g * 53) > 0.2 ? 1 : 0.35) : 1;
      const dim = 1 - smooth(70.6, 73.2, g) * 0.55;
      lamp.intensity = 22 * fl * dim; bulb.material.color.setScalar(fl * dim).multiply(new THREE.Color(0xffd9a0));
      const gv = Math.pow(Math.max(0, Math.sin(g * 2.2)), 30) * (1 - smooth(69.2, 69.8, g));
      glint.material.opacity = gv; glint.scale.setScalar(0.15 + gv * 0.25);
      bulb.position.x = lamp.position.x = Math.sin(t * 0.8) * 0.05;
    }, post: { bloom: [0.9, 0.6, 0.6], grade: [1.12, 0.95, 0.82], dof: { aperture: 0.012, maxblur: 0.008 } }
  };
}

// 9. La chute — la ville la nuit, recul lent vers les étoiles
export function sEnd() {
  const { s, tick } = townScene({ mood: 'night' });
  const c = cam(42);
  return {
    scene: s, camera: c, update(t, d) {
      const k = ease(t / d);
      c.position.set(lerp(10, -30, k), lerp(14, 80, k), lerp(55, 150, k));
      c.lookAt(lerp(0, 0, k), lerp(4, 20, k), lerp(0, -40, k)); tick(t + 40);
    }, post: { bloom: [1.0, 0.7, 0.55], grade: [0.85, 0.95, 1.15] }
  };
}

export const SCENES = [sHook, sTitle, sWake, sCity, sCoca, sMine, sPalla, sMercury, sVerdict, sEnd];
