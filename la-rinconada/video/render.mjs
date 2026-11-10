// Rendu image par image : node render.mjs [preview t1,t2,...] | node render.mjs full [fps]
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { spawn } from 'child_process';
import http from 'http'; import fs from 'fs'; import path from 'path';
const root = path.dirname(new URL(import.meta.url).pathname);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); }).listen(0);
const port = srv.address().port;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.text()); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
const STILL = process.argv[2] === 'still';
if (STILL) await page.setViewportSize({ width: 1920, height: 1080 });
await page.goto(`http://localhost:${port}/index.html${STILL ? '?still=1' : ''}`);
await page.waitForFunction('window.ready === true', null, { timeout: 120000 });
const mode = process.argv[2] || 'preview';
if (mode === 'preview' || mode === 'still') {
  const ts = (process.argv[3] || '2,8,15,20,27,31,35,39,43,48,52,55,59,64,68,72,76,83').split(',').map(Number);
  fs.mkdirSync(path.join(root, 'preview'), { recursive: true }); fs.mkdirSync(path.join(root, 'images'), { recursive: true });
  for (const t of ts) { const t0 = Date.now(); await page.evaluate((t) => window.renderAt(t), t); await page.screenshot({ path: path.join(root, mode === 'still' ? 'images' : 'preview', `t${String(t).padStart(5, '0')}.${mode === 'still' ? 'png' : 'jpg'}`), ...(mode === 'still' ? { type: 'png' } : { type: 'jpeg', quality: 80 }) }); console.log('t', t, Date.now() - t0, 'ms'); }
} else {
  const fps = Number(process.argv[3] || 30), dur = await page.evaluate('window.DUR');
  const n = Math.ceil(dur * fps);
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-', '-i', path.join(root, 'voix.mp3'),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', path.join(root, process.argv[4] || 'la-rinconada.mp4')], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let f = 0; f < n; f++) {
    await page.evaluate((t) => window.renderAt(t), f / fps);
    const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (f % 150 === 0) console.log(`frame ${f}/${n} — ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
  ff.stdin.end(); await new Promise((r) => ff.on('close', r));
  console.log('done', ((Date.now() - t0) / 1000).toFixed(0), 's');
}
await browser.close(); srv.close();
