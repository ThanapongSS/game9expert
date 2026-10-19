// End-to-end smoke test in a phone-sized headless Chromium.
// usage: node tests/smoke.mjs [screenshotDir]
// Needs Playwright (set PLAYWRIGHT_PATH if it isn't resolvable).
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
function loadPlaywright() {
  for (const p of [process.env.PLAYWRIGHT_PATH, 'playwright', '/opt/node22/lib/node_modules/playwright']) {
    if (!p) continue;
    try {
      return require(p);
    } catch {
      // try next
    }
  }
  throw new Error('Playwright not found; set PLAYWRIGHT_PATH');
}
const { chromium } = loadPlaywright();

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.resolve(process.argv[2] || path.join(root, 'tests', 'screenshots'));
mkdirSync(outDir, { recursive: true });
const PORT = 8000 + Math.floor(Math.random() * 1000);
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const errors = [];
let failed = false;
function check(cond, msg) {
  console.log((cond ? '  ✔ ' : '  ✘ ') + msg);
  if (!cond) failed = true;
}

try {
  await sleep(800);
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  page.on('console', (m) => m.type() === 'error' && !/fonts\.(googleapis|gstatic)/.test(m.text()) && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  const shot = (name) => page.screenshot({ path: path.join(outDir, name + '.png') });
  const state = () => page.evaluate(() => {
    const s = window.__app.session;
    const m = s.match;
    return m && { phase: m.phase, hp: m.f.map((f) => f.hp), maxHp: m.f.map((f) => f.maxHp), x: m.f.map((f) => f.x), attract: !!s.attract };
  });

  await page.goto(`http://127.0.0.1:${PORT}/index.html`);
  await page.waitForSelector('.screen.title');
  await sleep(600);
  await shot('01-title');
  await page.tap('.screen.title');
  await page.waitForSelector('.screen.menu');
  await sleep(300);
  await shot('02-menu');
  check(true, 'title → menu');

  await page.tap('.menu-list .btn.orange');
  await page.waitForSelector('.screen.select');
  check((await page.$$('.card:not(.locked)')).length === 8, '8 playable dolls on the select screen');
  await page.tap('.card[data-char="yogurt"]');
  await sleep(400);
  await shot('03-select');
  await page.tap('.btn.confirm');
  await page.waitForSelector('.screen.select');
  await page.tap('.card[data-char="siakabal"]');
  await page.tap('.btn.confirm');
  await page.waitForSelector('.screen.setup');
  await page.tap('.seg-item >> nth=0');
  await sleep(200);
  await shot('04-setup');
  await page.tap('.setup .btn.green');
  await page.waitForSelector('.screen.vs');
  await sleep(500);
  await shot('05-vs');
  await page.waitForSelector('.screen.vs', { state: 'detached', timeout: 5000 });
  check(await page.isVisible('#controls .dpad'), 'touch controls visible in fight');
  await sleep(2200);
  let s = await state();
  check(s.phase === 'fight' && !s.attract, `fight started (phase ${s.phase})`);

  // Walk right with the d-pad, then tap punch/kick.
  const dpad = await page.locator('.dpad').boundingBox();
  const startX = s.x[0];
  await page.evaluate(({ x, y }) => {
    const el = document.querySelector('.dpad');
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 7, clientX: x, clientY: y, pointerType: 'touch' }));
  }, { x: dpad.x + dpad.width * 0.9, y: dpad.y + dpad.height / 2 });
  await sleep(1500);
  await page.evaluate(() => document.querySelector('.dpad').dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 7, pointerType: 'touch' })));
  s = await state();
  check(s.x[0] > startX + 40, `d-pad walks right (${Math.round(startX)} → ${Math.round(s.x[0])})`);
  const punch = await page.locator('.tb.punch').boundingBox();
  const kick = await page.locator('.tb.kick').boundingBox();
  for (let i = 0; i < 14; i++) {
    const b = i % 3 === 2 ? kick : punch;
    await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
    await sleep(160);
  }
  await shot('06-fight');
  s = await state();
  check(s.hp[1] < s.maxHp[1] || s.hp[0] < s.maxHp[0], `damage was dealt (hp ${s.hp.join(' / ')})`);

  // Pause and resume
  await page.tap('#controls .pause');
  await page.waitForSelector('.screen.pause');
  await shot('07-pause');
  await page.tap('.pause .btn.green');
  await page.waitForSelector('.screen.pause', { state: 'detached' });

  // Force a K.O. and check the result screen
  await page.evaluate(() => {
    const s = window.__app.session;
    s.ai.sample = () => 0; // keep the CPU still so the test is deterministic
    s.match.f[0].x = 400;
    s.match.f[1].x = 470;
    s.match.f[1].hp = 1;
  });
  for (let i = 0; i < 6; i++) {
    await page.touchscreen.tap(punch.x + punch.width / 2, punch.y + punch.height / 2);
    await sleep(120);
  }
  await sleep(1200);
  await shot('08-ko');
  await page.waitForSelector('.screen.result', { timeout: 8000 });
  await sleep(400);
  await shot('09-result');
  check(await page.isVisible('.result.win'), 'K.O. leads to the win screen');

  // Settings + language switch
  await page.tap('.result .btn >> nth=2');
  await page.waitForSelector('.screen.menu');
  await page.tap('.menu-list .btn.ghost');
  await page.waitForSelector('.screen.settings');
  await page.tap('.set-row .seg-item >> nth=1');
  await sleep(300);
  await shot('10-settings-en');
  check((await page.textContent('.settings h2')).includes('Settings'), 'language switches to English');
  await page.tap('.set-row .seg-item >> nth=0');

  // Arcade select shows
  await page.tap('.head .btn');
  await page.tap('.menu-list .btn.purple');
  await page.waitForSelector('.screen.select');
  await page.tap('.head .btn');

  // Online lobby screen (no real connection in CI)
  await page.tap('.menu-list .btn.blue');
  await page.waitForSelector('.screen.online');
  await page.fill('.code-input', 'abc12');
  await sleep(200);
  await shot('11-online');
  check((await page.inputValue('.code-input')) === 'ABC12', 'room code input normalizes to upper case');

  // Portrait shows the rotate hint
  await page.setViewportSize({ width: 390, height: 844 });
  await sleep(300);
  await shot('12-portrait');
  check(await page.isVisible('#rotate'), 'portrait shows rotate overlay');
  await page.tap('#rotate-skip');
  check(!(await page.isVisible('#rotate')), '"play in portrait" dismisses the overlay');
  await page.tap('.head .btn');
  await page.waitForSelector('.screen.menu');
  await page.tap('.menu-list .btn.orange');
  await page.waitForSelector('.screen.select');
  await page.tap('.btn.confirm');
  await page.waitForSelector('.screen.select');
  await page.tap('.btn.confirm');
  await page.waitForSelector('.screen.setup');
  await page.tap('.setup .btn.green');
  await page.waitForSelector('.screen.vs', { state: 'detached', timeout: 6000 });
  await sleep(2500);
  await shot('13-portrait-fight');
  s = await state();
  check(s.phase === 'fight', 'portrait fight runs');

  await browser.close();
} catch (e) {
  failed = true;
  console.error(e);
} finally {
  server.kill();
}

check(errors.length === 0, 'no console errors' + (errors.length ? ':\n    ' + errors.join('\n    ') : ''));
console.log(failed ? '\nSMOKE FAILED' : `\nSMOKE OK — screenshots in ${outDir}`);
process.exit(failed ? 1 : 0);
