// Boucle de rendu déterministe : window.renderFrame(i) dessine l'image i (T = i/30) et la renvoie en data URL.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { W, H, prog, easeOut } from './lib.js';

const q = new URLSearchParams(location.search);
const SCALE = parseFloat(q.get('scale') ?? '1'), FPS = 30;
const PW = Math.round(W * SCALE), PH = Math.round(H * SCALE);

const FinalShader = {
  uniforms: { tDiffuse: { value: null }, warm: { value: 0 }, white: { value: 0 }, black: { value: 0 }, vig: { value: 0.6 },
    seed: { value: 0 }, glitch: { value: 0 }, hblur: { value: 0 }, grain: { value: 0.055 }, sat: { value: 0.8 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float warm,white,black,vig,seed,glitch,hblur,grain,sat; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233))+seed*3.7)*43758.5453); }
    vec3 samp(vec2 uv){
      if(glitch>0.){ float row=floor(uv.y*38.); float o=(h(vec2(row,floor(seed)))-0.5)*glitch*0.12*step(0.6,h(vec2(row*1.7,3.)));
        uv.x+=o; return vec3(texture2D(tDiffuse,uv+vec2(glitch*0.012,0.)).r, texture2D(tDiffuse,uv).g, texture2D(tDiffuse,uv-vec2(glitch*0.012,0.)).b); }
      return texture2D(tDiffuse,uv).rgb; }
    void main(){
      vec3 c;
      if(hblur>0.){ c=vec3(0.); for(int i=0;i<16;i++){ c+=samp(vUv+vec2((float(i)/15.-0.5)*hblur,0.)); } c/=16.; }
      else c=samp(vUv);
      float l=dot(c,vec3(0.299,0.587,0.114));
      float s=sat+(1.-sat)*warm*0.8;
      c=mix(vec3(l),c,s);
      c*=mix(vec3(0.93,1.0,1.10),vec3(1.10,1.0,0.84),warm);
      c+=mix(vec3(0.0,0.008,0.03),vec3(0.025,0.012,0.0),warm);
      vec2 d=vUv-0.5; float v=smoothstep(0.35,0.95,length(d*vec2(0.85,1.15))*1.35);
      c*=1.-vig*v;
      c+=(h(vUv*vec2(1080.,1920.))-0.5)*grain;
      c=mix(c,vec3(0.955,0.97,0.985),white);
      c*=1.-black;
      gl_FragColor=vec4(clamp(c,0.,1.),1.);
    }`,
};

let renderer, composer, rpass, bloom, fin, out, ctx, chunks = [], SHOTS, cur = -1, shot = null;

function buildChunks(lines) {
  const ch = [];
  for (const ln of lines) {
    let c = [];
    for (const w of ln.words) {
      c.push(w);
      const txt = c.map((x) => x.w).join(' ');
      if (c.length >= 3 || txt.length >= 14 || '.,?!:…'.includes(w.w.slice(-1))) { ch.push(c); c = []; }
    }
    if (c.length) ch.push(c);
  }
  return ch.map((c, i) => {
    let end = c[c.length - 1].end + 0.3;
    if (i + 1 < ch.length) end = Math.min(end, ch[i + 1][0].start);
    return { words: c, start: c[0].start, end };
  });
}
const clean = (w) => { w = w.trim(); return ['...', ':', '?', '!'].includes(w) ? '' : w.toUpperCase().replace(/[,:]+$/, '').replace('...', '…'); };

function outlined(g, s, x, y, size, fill, glow) {
  g.font = `${size}px Lilita`; g.lineJoin = 'round'; g.textBaseline = 'alphabetic'; g.textAlign = 'left';
  if (glow) { g.save(); g.shadowColor = 'rgba(127,232,255,0.8)'; g.shadowBlur = size * 0.35; g.strokeStyle = 'rgba(127,232,255,0.5)'; g.lineWidth = size * 0.3; g.strokeText(s, x, y); g.restore(); }
  g.strokeStyle = '#000'; g.lineWidth = size * 0.22; g.strokeText(s, x, y);
  g.fillStyle = fill; g.fillText(s, x, y);
}
function drawCaption(g, ch, T) {
  const words = ch.words.map((w) => [clean(w.w), w.hl, w.start]).filter((x) => x[0]);
  if (!words.length) return;
  let size = 100; g.font = `${size}px Lilita`;
  let sp = size * 0.28, total = words.reduce((a, w) => a + g.measureText(w[0]).width, 0) + sp * (words.length - 1);
  if (total > 960) { size *= 960 / total; sp = size * 0.28; g.font = `${size}px Lilita`; total = words.reduce((a, w) => a + g.measureText(w[0]).width, 0) + sp * (words.length - 1); }
  const k = easeOut(prog(T, ch.start, ch.start + 0.12)), sc = 0.85 + 0.15 * k;
  g.save(); g.translate(W / 2, 1470); g.scale(sc, sc);
  let x = -total / 2;
  for (const [w, hl, ws] of words) {
    g.font = `${size}px Lilita`;
    const ww = g.measureText(w).width, s = hl ? 1 + 0.18 * (1 - easeOut(prog(T, ws, ws + 0.25))) : 1;
    g.save(); g.translate(x + ww / 2, 0); g.scale(s, s);
    outlined(g, w, -ww / 2, 0, size, hl ? '#7FE8FF' : '#fff', hl);
    g.restore(); x += ww + sp;
  }
  g.restore();
}
function drawEndText(g, a) {
  const lines = ['ET TOI,', 'TU TIENDRAIS', 'COMBIEN DE TEMPS ?'];
  g.save(); g.globalAlpha = a; g.translate(W / 2, 470); const sc = 0.9 + 0.1 * a; g.scale(sc, sc);
  lines.forEach((s, i) => {
    const size = i === 0 ? 96 : 104; g.font = `${size}px Lilita`;
    const ww = g.measureText(s).width;
    outlined(g, s, -ww / 2, i * 124, size, i === 2 ? '#7FE8FF' : '#fff', i === 2);
  });
  g.restore();
}

function dispose(s) {
  if (!s) return;
  s.scene.traverse((o) => {
    o.geometry?.dispose?.();
    const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of ms) { for (const k in m) if (m[k] && m[k].isTexture) m[k].dispose(); m.dispose(); }
  });
  renderer.renderLists.dispose();
}

async function init() {
  const f = new FontFace('Lilita', 'url(/assets/LilitaOne.ttf)'); await f.load(); document.fonts.add(f);
  const tl = await (await fetch('/assets/timeline.json')).json();
  chunks = buildChunks(tl.lines);
  SHOTS = (await import('./shots.js')).SHOTS;
  const gl = document.createElement('canvas'); gl.width = PW; gl.height = PH;
  renderer = new THREE.WebGLRenderer({ canvas: gl, antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1); renderer.setSize(PW, PH, false);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
  const rt = new THREE.WebGLRenderTarget(PW, PH, { type: THREE.HalfFloatType, samples: parseInt(q.get('aa') ?? '4') });
  composer = new EffectComposer(renderer, rt);
  rpass = new RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera());
  bloom = new UnrealBloomPass(new THREE.Vector2(PW, PH), 0.5, 0.7, 0.85);
  fin = new ShaderPass(FinalShader);
  composer.addPass(rpass); composer.addPass(bloom); composer.addPass(new OutputPass()); composer.addPass(fin);
  out = document.getElementById('out'); out.width = PW; out.height = PH; ctx = out.getContext('2d');
  window.ready = true;
}

window.renderFrame = (i, fmt = 'image/jpeg', quality = 0.95) => {
  const T = i / FPS;
  let k = SHOTS.findIndex((s) => s.t0 <= T && T < s.t1); if (k < 0) k = SHOTS.length - 1;
  if (k !== cur) { dispose(shot); shot = SHOTS[k].build(); cur = k; }
  const S = SHOTS[k], t = T - S.t0;
  const fx = { white: 0, black: 0, warm: S.warm ?? 0, glitch: 0, hblur: 0, bloom: 0.5, exposure: 1, vig: 0.6, endText: 0, threshold: 0.85, sat: 0.8 };
  shot.update(t, S.t1 - S.t0, fx);
  shot.camera.updateProjectionMatrix();
  rpass.scene = shot.scene; rpass.camera = shot.camera;
  renderer.toneMappingExposure = fx.exposure;
  bloom.strength = fx.bloom; bloom.threshold = fx.threshold;
  const u = fin.uniforms;
  u.warm.value = fx.warm; u.white.value = fx.white; u.black.value = fx.black; u.vig.value = fx.vig - 0.2 * fx.warm;
  u.seed.value = i % 97; u.glitch.value = fx.glitch; u.hblur.value = fx.hblur; u.sat.value = fx.sat;
  composer.render();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(renderer.domElement, 0, 0);
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  if (fx.endText > 0) drawEndText(ctx, fx.endText);
  for (const ch of chunks) if (ch.start <= T && T < ch.end) drawCaption(ctx, ch, T);
  return out.toDataURL(fmt, quality);
};
init().catch((e) => { window.initError = String(e.stack || e); console.error(e); });
