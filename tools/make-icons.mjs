// Regenerates icons/*.png from tools/icon.html with headless Chromium.
// usage: node tools/make-icons.mjs   (needs Playwright; set PLAYWRIGHT_PATH if needed)
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const pw = [process.env.PLAYWRIGHT_PATH, 'playwright', '/opt/node22/lib/node_modules/playwright'].filter(Boolean);
let chromium;
for (const p of pw) {
  try {
    ({ chromium } = require(p));
    break;
  } catch {
    // try next
  }
}
if (!chromium) throw new Error('Playwright not found; set PLAYWRIGHT_PATH');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
mkdirSync(path.join(root, 'icons'), { recursive: true });
const PORT = 8800 + Math.floor(Math.random() * 100);
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));
const browser = await chromium.launch();
const page = await browser.newPage();
const ICONS = [
  ['icon-192.png', 192, false],
  ['icon-512.png', 512, false],
  ['icon-180.png', 180, true],
  ['maskable-512.png', 512, true],
];
try {
  for (const [file, size, maskable] of ICONS) {
    await page.setViewportSize({ width: size, height: size });
    await page.goto(`http://127.0.0.1:${PORT}/tools/icon.html?size=${size}&maskable=${maskable ? 1 : 0}`);
    await page.waitForFunction(() => document.title === 'done');
    await page.locator('canvas').screenshot({ path: path.join(root, 'icons', file), omitBackground: true });
    console.log('wrote icons/' + file);
  }
} finally {
  await browser.close();
  server.kill();
}
