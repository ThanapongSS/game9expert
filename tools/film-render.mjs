// Render a film page to MP4 (or a few preview stills) with headless Chromium.
//   node tools/film-render.mjs                         -> film/rainbow-forest-battle.mp4 (1280x720, 30 fps, with soundtrack)
//   node tools/film-render.mjs --page film/chase       -> film/chase/<FILM.slug>.mp4
//   node tools/film-render.mjs --stills 3,12.5 [--out dir] -> PNG stills (default <page>/stills)
// The page must expose window.FILM = { renderAt(t), DUR, ready } and support ?capture=1.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const PAGE = opt('--page', 'film').replace(/\/+$/, '');
const stills = opt('--stills', null);
const outDir = opt('--out', path.join(ROOT, PAGE, 'stills'));
const FPS = +opt('--fps', 30), FROM = +opt('--from', 0);

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.m4a': 'audio/mp4', '.css': 'text/css', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) {
    const idx = path.join(p, 'index.html');
    if (fs.existsSync(idx)) { res.writeHead(200, { 'content-type': 'text/html' }); return fs.createReadStream(idx).pipe(res); }
    res.writeHead(404); return res.end();
  }
  res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise(r => server.listen(0, r));
const port = server.address().port;

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.type(), m.text()); });
page.on('pageerror', e => console.log('[pageerror]', e.message));
await page.goto(`http://localhost:${port}/${PAGE}/index.html?capture=1`);
await page.waitForFunction(() => window.FILM && window.FILM.ready, null, { timeout: 120000 });
await page.evaluate(() => document.fonts.ready);
const clip = { x: 0, y: 0, width: 1280, height: 720 };
const info = await page.evaluate(() => ({ dur: window.FILM.DUR, slug: window.FILM.slug }));
const TO = +opt('--to', info.dur);
const outMp4 = opt('--mp4', path.join(ROOT, PAGE, `${info.slug || 'rainbow-forest-battle'}.mp4`));

if (stills) {
  fs.mkdirSync(outDir, { recursive: true });
  for (const s of stills.split(',').map(Number)) {
    await page.evaluate(t => window.FILM.renderAt(t), s);
    const f = path.join(outDir, `still-${s.toFixed(2).padStart(5, '0')}.png`);
    await page.screenshot({ path: f, clip });
    console.log(f);
  }
} else {
  const audioPath = path.join(ROOT, PAGE, 'soundtrack.m4a');
  const ff = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-'];
  if (fs.existsSync(audioPath)) ff.push('-ss', String(FROM), '-i', audioPath, '-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '160k', '-shortest');
  ff.push('-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', outMp4);
  const proc = spawn('ffmpeg', ff, { stdio: ['pipe', 'inherit', 'inherit'] });
  const n = Math.round((TO - FROM) * FPS), t0 = Date.now();
  for (let i = 0; i < n; i++) {
    // warm the trail history for the first frame of a partial render
    if (i === 0 && FROM > 0) for (let k = 4; k > 0; k--) await page.evaluate(t => window.FILM.renderAt(t), FROM - k / FPS);
    await page.evaluate(t => window.FILM.renderAt(t), FROM + i / FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: 93, clip });
    if (!proc.stdin.write(buf)) await new Promise(r => proc.stdin.once('drain', r));
    if (i % 30 === 0) console.log(`frame ${i}/${n}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  proc.stdin.end();
  await new Promise(r => proc.on('close', r));
  console.log('wrote', outMp4, `${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
await browser.close();
server.close();
