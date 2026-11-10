#!/usr/bin/env node
// Rendu image par image dans Chromium headless (WebGL logiciel) -> ffmpeg.
//   node render.js                      rendu complet (3 processus en parallèle) -> vivre_a_moins_50_3d.mp4
//   node render.js --preview 1,12.5,46  images fixes dans build/ (option --scale 0.5)
//   node render.js --jobs 2 --crf 20
const http = require('http'), fs = require('fs'), path = require('path'), { spawn, spawnSync } = require('child_process');
const { chromium } = require('playwright');

const HERE = __dirname, BUILD = path.join(HERE, 'build'), SRC = path.join(HERE, '..', 'moins50');
const FPS = 30, DURATION = 60, NFRAMES = FPS * DURATION;
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : d; };
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.ttf': 'font/ttf' };
const ASSETS = { '/assets/LilitaOne.ttf': path.join(SRC, 'assets/fonts/LilitaOne.ttf'), '/assets/timeline.json': path.join(SRC, 'build/timeline.json') };

function serve() {
  return new Promise((res) => {
    const srv = http.createServer((req, rsp) => {
      const u = decodeURIComponent(req.url.split('?')[0]);
      let f = ASSETS[u] || (u.startsWith('/node_modules/') ? path.join(HERE, u) : path.join(HERE, 'web', u === '/' ? 'index.html' : u));
      if (!f.startsWith(HERE) && !ASSETS[u]) { rsp.writeHead(403); return rsp.end(); }
      fs.readFile(f, (e, b) => {
        if (e) { rsp.writeHead(404); return rsp.end(); }
        rsp.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); rsp.end(b);
      });
    }).listen(0, '127.0.0.1', () => res(srv));
  });
}

async function openPage(scale) {
  const srv = await serve();
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-vsync'] });
  const page = await browser.newPage({ viewport: { width: 400, height: 300 } });
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.error('[page]', m.text().slice(0, 600)); });
  page.on('pageerror', (e) => console.error('[pageerror]', e.message));
  await page.goto(`http://127.0.0.1:${srv.address().port}/?scale=${scale}&aa=${arg('aa', '4')}`);
  await page.waitForFunction('window.ready || window.initError', null, { timeout: 120000 });
  const err = await page.evaluate('window.initError');
  if (err) throw new Error(err);
  return { page, close: async () => { await browser.close(); srv.close(); } };
}

const toBuf = (d) => Buffer.from(d.slice(d.indexOf(',') + 1), 'base64');

async function preview(times, scale) {
  fs.mkdirSync(BUILD, { recursive: true });
  const { page, close } = await openPage(scale);
  for (const T of times) {
    const t0 = Date.now();
    const d = await page.evaluate((i) => window.renderFrame(i, 'image/jpeg', 0.9), Math.round(T * FPS));
    const f = path.join(BUILD, `preview_${T.toFixed(2).padStart(5, '0')}.jpg`);
    fs.writeFileSync(f, toBuf(d));
    console.log(f, Date.now() - t0, 'ms');
  }
  await close();
}

async function segment(a, b, outFile, scale, crf) {
  const { page, close } = await openPage(scale);
  const vf = scale === 1 ? [] : ['-vf', 'scale=1080:1920:flags=lanczos'];
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(FPS), '-i', '-', ...vf,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', String(crf), '-pix_fmt', 'yuv420p', '-g', '60', '-threads', '2', outFile], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let i = a; i < b; i++) {
    const d = await page.evaluate((k) => window.renderFrame(k), i);
    if (!ff.stdin.write(toBuf(d))) await new Promise((r) => ff.stdin.once('drain', r));
    if ((i - a) % 30 === 0) console.log(`[${a}-${b}] image ${i} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  await close();
}

async function main() {
  const scale = parseFloat(arg('scale', '1')), crf = arg('crf', '19');
  if (arg('preview')) return preview(arg('preview').split(',').map(Number), scale);
  if (arg('range')) { const [a, b] = arg('range').split(',').map(Number); return segment(a, b, arg('seg'), scale, crf); }
  fs.mkdirSync(BUILD, { recursive: true });
  const jobs = parseInt(arg('jobs', '3')), t0 = Date.now();
  const [fa, fb] = arg('frames', `0,${NFRAMES}`).split(',').map(Number);
  // découpage en petits lots répartis entre les processus (les plans n'ont pas tous le même coût)
  const lot = 60, lots = [];
  for (let a = fa; a < fb; a += lot) lots.push([a, Math.min(fb, a + lot)]);
  const segs = lots.map(([a]) => path.join(BUILD, `seg_${String(a).padStart(5, '0')}.mp4`));
  let next = 0;
  await Promise.all(Array.from({ length: jobs }, async () => {
    while (next < lots.length) {
      const k = next++;
      if (process.argv.includes('--resume') && fs.existsSync(segs[k]) && fs.statSync(segs[k]).size > 1000) continue;
      const tmp = segs[k] + '.part.mp4';
      await new Promise((res, rej) => {
        const c = spawn(process.execPath, [__filename, '--range', lots[k].join(','), '--seg', tmp, '--scale', String(scale), '--crf', crf, '--aa', arg('aa', '4')], { stdio: 'inherit' });
        c.on('close', (code) => (code ? rej(new Error('lot ' + k + ' en échec')) : res()));
      });
      fs.renameSync(tmp, segs[k]);
    }
  }));
  const list = path.join(BUILD, 'segs.txt');
  fs.writeFileSync(list, segs.map((s) => `file '${s}'`).join('\n'));
  const out = arg('out', path.join(HERE, 'vivre_a_moins_50_3d.mp4'));
  const r = spawnSync('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-i', path.join(SRC, 'build/mix.wav'),
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-t', String((fb - fa) / FPS), '-movflags', '+faststart', out], { stdio: 'inherit' });
  if (r.status) process.exit(r.status);
  console.log(`ok -> ${out} (${((Date.now() - t0) / 60000).toFixed(1)} min)`);
}
main().catch((e) => { console.error(e); process.exit(1); });
