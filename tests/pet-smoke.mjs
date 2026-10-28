// End-to-end smoke test of Yogurt's House in iPad-sized headless Chromium.
// usage: node tests/pet-smoke.mjs [screenshotDir]
// Walks a new player through: choose Yogurt → care → shop → vaccine →
// quiz → minigame → adventure battle → time skip to Lv4 → backup/restore,
// in portrait and landscape, and fails on any page error.
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
const outDir = path.resolve(process.argv[2] || path.join(root, 'tests', 'screenshots', 'pet'));
mkdirSync(outDir, { recursive: true });
const PORT = 8000 + Math.floor(Math.random() * 1000);
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const errors = [];
let step = 0;
async function shot(page, name) {
  step++;
  if (process.env.VERBOSE) console.log('shot', step, name);
  await page.waitForTimeout(350);
  await page.screenshot({ path: path.join(outDir, `${String(step).padStart(2, '0')}-${name}.png`) });
}
function check(cond, msg) {
  if (!cond) throw new Error(`check failed: ${msg}`);
}
const clickText = (page, text, opts = {}) => page.getByText(text, { exact: false }).first().click(opts);
const closeModals = async (page) => {
  for (let i = 0; i < 6; i++) {
    const b = page.locator('.modal .btn.mint, .modal .btn.big').last();
    if (!(await b.count())) return;
    await b.click();
    await page.waitForTimeout(250);
  }
};

async function run(viewport, label) {
  const browser = await chromium.launch();
  try {
    await flow(browser, viewport, label);
  } catch (e) {
    const pages = browser.contexts().flatMap((c) => c.pages());
    if (pages[0]) await pages[0].screenshot({ path: path.join(outDir, `FAIL-${label}.png`) });
    throw e;
  } finally {
    await browser.close();
  }
}

async function flow(browser, viewport, label) {
  const ctx = await browser.newContext({ viewport, hasTouch: true, timezoneId: 'Asia/Bangkok', deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror', (e) => errors.push(`[${label}] ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/fonts\.g|net::ERR|Failed to load resource/.test(m.text())) errors.push(`[${label}] console: ${m.text()}`);
  });
  // 10:00 in Bangkok so the pet is awake
  await page.clock.setFixedTime(new Date('2026-10-28T03:00:00Z'));
  await page.goto(`http://127.0.0.1:${PORT}/pet/?dev=1`);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('.tile');
  await shot(page, `${label}-start`);

  // choose Yogurt and start
  await page.locator('.tile').first().click();
  await clickText(page, 'เริ่มเลี้ยง');
  await page.waitForSelector('.modal');
  await shot(page, `${label}-welcome`);
  await clickText(page, 'ไปที่บ้านกัน');
  await page.waitForSelector('.actionbar .act');
  await shot(page, `${label}-home`);
  const app = () => page.evaluate(() => ({ coins: window.__app.S.coins, level: window.__app.pet().level, exp: window.__app.pet().exp, hunger: window.__app.pet().needs.hunger, screen: window.__app.cur.name }));

  // feed
  await page.locator('.act', { hasText: 'อาหาร' }).click();
  await page.waitForSelector('.sheet');
  await shot(page, `${label}-food-tray`);
  await page.locator('.sheet .btn.mint').first().click();
  await page.waitForTimeout(800);
  await shot(page, `${label}-eating`);
  check((await app()).exp > 0, 'feeding gave EXP');

  // pat the pet (tap the middle of the canvas around the pet)
  const box = await page.evaluate(() => ({ w: innerWidth, h: innerHeight }));
  await page.mouse.click(box.w / 2, box.h * 0.7);

  // town → shop → buy mackerel
  await page.locator('.act', { hasText: 'ไปเมือง' }).click();
  await page.waitForSelector('.tile');
  await shot(page, `${label}-town`);
  await clickText(page, 'ร้านค้า');
  await page.waitForSelector('.tabs');
  const before = (await app()).coins;
  await page.locator('.item-row', { hasText: 'ปลาทู' }).locator('.btn').click();
  check((await app()).coins === before - 12, 'bought mackerel');
  await shot(page, `${label}-shop`);
  await page.locator('.title-row .btn.back').click();

  // time skip past Lv2 (1h, with enough EXP) then vaccine at the hospital
  await page.evaluate(() => (window.__app.pet().exp += 30));
  await page.locator('.dev .btn', { hasText: '+1ชม.' }).click();
  await page.waitForTimeout(1300);
  await closeModals(page);
  check((await app()).level >= 2, `level 2 after 1h (got ${(await app()).level})`);
  await page.locator('.title-row .btn.back').click().catch(() => {});
  if ((await app()).screen !== 'town') await page.locator('.act', { hasText: 'ไปเมือง' }).click();
  await clickText(page, 'โรงพยาบาล');
  await page.waitForSelector('.item-row');
  await shot(page, `${label}-hospital`);
  await page.locator('.item-row', { hasText: 'ฉีดวัคซีน' }).locator('.btn').click();
  await clickText(page, 'เริ่ม').catch(() => {});
  await page.waitForTimeout(400);
  // stroke the pet until calm
  for (let i = 0; i < 30; i++) await page.mouse.click(box.w / 2, box.h * 0.66);
  await shot(page, `${label}-vaccine-calm`);
  await clickText(page, 'ฉีดวัคซีน');
  await page.waitForSelector('.modal', { timeout: 5000 });
  await page.waitForTimeout(400);
  await shot(page, `${label}-vaccine-done`);
  await closeModals(page);
  check((await page.evaluate(() => window.__app.pet().vaccines)) === 1, 'vaccinated');

  // school quiz
  if ((await app()).screen !== 'town') await page.locator('.title-row .btn.back').click();
  await clickText(page, 'โรงเรียน');
  await page.locator('.item-row', { hasText: 'ห้องสมุด' }).locator('.btn').click();
  for (let q = 0; q < 5; q++) {
    await page.waitForFunction((n) => document.querySelector('.mg-stat')?.textContent.includes(`ข้อ ${n}/5`) && document.querySelector('.quiz-a .btn.ghost'), q + 1);
    if (q === 0) await shot(page, `${label}-quiz`);
    await page.locator('.quiz-a .btn').first().click();
    await page.waitForTimeout(300);
  }
  await page.waitForSelector('.modal');
  await shot(page, `${label}-quiz-result`);
  await closeModals(page);

  // memory minigame (just open and close), catch minigame for a few seconds
  await page.locator('.title-row .btn.back').click();
  await clickText(page, 'ลานกิจกรรม');
  await clickText(page, 'รับขนม');
  await clickText(page, 'เริ่ม');
  for (let i = 0; i < 10; i++) {
    await page.mouse.move(box.w * (0.3 + 0.04 * i), box.h * 0.8);
    await page.waitForTimeout(120);
  }
  await shot(page, `${label}-catch`);
  await page.locator('.mg-top .btn.back').click();

  // adventure battle in the café
  await page.waitForSelector('.tile');
  await page.locator('.title-row .btn.back').click();
  await clickText(page, 'ผจญภัย');
  await page.waitForSelector('.tile canvas');
  await shot(page, `${label}-adventure`);
  await page.locator('.tile', { hasText: 'ร้านกาแฟ' }).locator('.btn', { hasText: 'สู้' }).click();
  await page.waitForSelector('.move');
  await shot(page, `${label}-battle`);
  for (let r = 0; r < 30; r++) {
    if (await page.locator('.modal').count()) break;
    const mv = page.locator('.move:not([disabled])').first();
    if (await mv.count()) await mv.click();
    await page.waitForTimeout(1600);
  }
  await page.waitForSelector('.modal', { timeout: 8000 });
  await shot(page, `${label}-battle-result`);
  await closeModals(page);

  // jump 6h ahead → Lv4 evolution
  await page.evaluate(() => window.__app.go('home'));
  for (let i = 0; i < 2; i++) {
    await page.locator('.dev .btn', { hasText: '+6ชม.' }).click();
    await page.waitForTimeout(1200);
  }
  await closeModals(page);
  await page.evaluate(() => (window.__app.pet().exp += 200));
  await page.locator('.dev .btn', { hasText: '+10น.' }).click();
  await page.waitForTimeout(1800);
  await shot(page, `${label}-evolution`);
  await closeModals(page);
  const lv = (await app()).level;
  check(lv >= 4, `evolved to Lv4+ (got ${lv})`);
  await shot(page, `${label}-home-lv${lv}`);

  // backup and restore
  await page.locator('[aria-label="ตั้งค่า"]').click();
  await clickText(page, 'สำรองเซฟ');
  const code = await page.locator('.modal textarea').last().inputValue();
  check(code.startsWith('YH1.'), 'backup code');
  await shot(page, `${label}-backup`);
  await page.evaluate(() => document.querySelectorAll('.modal-wrap').forEach((m) => m.remove()));
  await page.evaluate(() => window.__app.go('start'));
  await clickText(page, 'กู้คืนเซฟ');
  await page.locator('.modal textarea').fill(code);
  await page.locator('.modal .btn.mint').click();
  await page.waitForSelector('.actionbar');
  check((await app()).level === lv, 'restored save');

  // album
  await page.locator('[aria-label="สมุดสะสม"]').click();
  await page.waitForSelector('.album canvas');
  await shot(page, `${label}-album`);
  await page.locator('.modal .btn.back').click();
  if (label === 'portrait') await extras(page, box, app);
}

// The rest of the game, once: bath, minigames, arena, friend code, eggs, hotel.
async function extras(page, box, app) {
  // daytime again, healthy and rested
  await page.evaluate(() => {
    const a = window.__app;
    a.devOffset += 12 * 3600000;
    a.tick();
    const p = a.pet();
    Object.assign(p.needs, { hunger: 90, thirst: 90, clean: 20, fun: 60, energy: 100 });
    p.sick = false;
    p.nap = false;
    a.S.coins = 500;
    a.S.crystals = 20;
    a.go('home');
  });
  await closeModals(page);
  await page.locator('[aria-label="ภารกิจ"]').click();
  await page.waitForSelector('.sheet');
  await shot(page, 'missions');
  await page.mouse.click(10, 10);

  // bath: scrub the pet with a finger
  await page.locator('.act', { hasText: 'อาบน้ำ' }).click();
  const g = await page.evaluate(() => ({ w: innerWidth, h: innerHeight }));
  await page.mouse.move(g.w / 2 - 60, g.h * 0.72);
  await page.mouse.down();
  for (let i = 0; i < 80; i++) await page.mouse.move(g.w / 2 + (i % 2 ? 70 : -70), g.h * (0.66 + (i % 5) * 0.02), { steps: 3 });
  await shot(page, 'bath-bubbles');
  await page.mouse.up();
  await page.waitForTimeout(1600);
  check((await page.evaluate(() => window.__app.pet().needs.clean)) === 100, 'bath cleaned the pet');

  // memory game: solve it through the DOM
  await page.locator('.act', { hasText: 'ไปเมือง' }).click();
  await clickText(page, 'ลานกิจกรรม');
  await clickText(page, 'จับคู่การ์ด');
  await clickText(page, 'เริ่ม');
  const faces = await page.evaluate(() => {
    // peek at the deck order by flipping each card's emoji from the module state is not possible,
    // so brute force: open pairs until all are done
    return document.querySelectorAll('.mcard').length;
  });
  check(faces === 16, '16 memory cards');
  const seen = {};
  for (let i = 0; i < 16; i++) {
    if (await page.locator('.mcard').nth(i).evaluate((e) => e.classList.contains('done'))) continue;
    await page.locator('.mcard').nth(i).click();
    const e = await page.locator('.mcard').nth(i).textContent();
    const j = seen[e];
    if (j !== undefined && j !== i) {
      await page.waitForTimeout(800);
    }
    seen[e] = i;
    // match it with a known card
    if (j !== undefined && j !== i) {
      await page.locator('.mcard').nth(j).click();
      await page.waitForTimeout(200);
      await page.locator('.mcard').nth(i).click();
    } else {
      await page.waitForTimeout(850);
    }
  }
  for (let k = 0; k < 40 && !(await page.locator('.modal').count()); k++) {
    // finish any leftovers by trying all unmatched pairs
    const open = await page.locator('.mcard:not(.done)').count();
    if (!open) break;
    await page.locator('.mcard:not(.done)').nth(0).click();
    await page.locator('.mcard:not(.done)').nth(k % Math.max(1, open - 1) + 1).click();
    await page.waitForTimeout(800);
  }
  await page.waitForSelector('.modal');
  await shot(page, 'memory-done');
  await closeModals(page);

  // school: simon (fail on purpose) and equip
  await page.locator('.title-row .btn.back').click();
  await clickText(page, 'โรงเรียน');
  await page.locator('.item-row', { hasText: 'ตั้งการ์ด' }).locator('.btn').click();
  await clickText(page, 'เริ่ม');
  await page.waitForSelector('.pad');
  await shot(page, 'simon');
  await page.locator('.mg-top .btn.back').click();
  await page.locator('.item-row', { hasText: 'จัดท่า' }).locator('.btn').click();
  await page.waitForSelector('.modal .item-row');
  await shot(page, 'equip');
  await closeModals(page);

  // arena: training, upgrade, ladder battle, friend code battle
  await page.locator('.title-row .btn.back').click();
  await clickText(page, 'ลานประลอง');
  await page.locator('.item-row', { hasText: 'ATK' }).locator('.btn').click();
  await clickText(page, 'เริ่ม');
  for (let r = 0; r < 3; r++) {
    await page.waitForTimeout(500);
    await page.mouse.click(g.w / 2, g.h / 2);
    await page.waitForTimeout(1000);
  }
  await page.waitForSelector('.modal');
  await shot(page, 'training-done');
  await closeModals(page);
  await page.locator('.tab', { hasText: 'อัปพลัง' }).click();
  await page.locator('.item-row', { hasText: 'ATK' }).locator('.btn').click();
  check((await page.evaluate(() => window.__app.pet().up.atk)) === 1, 'crystal upgrade');
  await shot(page, 'upgrade');
  await page.locator('.tab', { hasText: 'ไต่อันดับ' }).click();
  await page.locator('.item-row', { hasText: 'อันดับ 10' }).locator('.btn').click();
  await page.waitForSelector('.move');
  await shot(page, 'arena-battle');
  for (let r = 0; r < 30 && !(await page.locator('.modal').count()); r++) {
    const mv = page.locator('.move:not([disabled])').first();
    if (await mv.count()) await mv.click();
    await page.waitForTimeout(1500);
  }
  await page.waitForSelector('.modal');
  await closeModals(page);
  await page.locator('.tab', { hasText: 'สู้กับเพื่อน' }).click();
  const myCode = await page.locator('textarea').first().inputValue();
  check(myCode.startsWith('YHP1.'), 'pet code');
  await page.locator('textarea').nth(1).fill(myCode);
  await clickText(page, 'ดูสัตว์ของเพื่อน');
  await page.waitForSelector('.modal canvas');
  await shot(page, 'friend-preview');
  await clickText(page, 'สู้เลย');
  await page.waitForSelector('.move');
  await page.locator('.subbar .btn', { hasText: 'ยอมแพ้' }).click();
  await page.locator('.modal .btn', { hasText: 'ใช่' }).click();

  // boss in the café
  await page.evaluate(() => {
    window.__app.S.areaWins.cafe = 3;
    window.__app.pet().hpPct = 1;
    window.__app.go('adventure');
  });
  await page.locator('.tile', { hasText: 'ร้านกาแฟ' }).locator('.btn', { hasText: 'บอส' }).click();
  await page.waitForSelector('.move');
  await shot(page, 'boss-battle');
  await page.locator('.subbar .btn', { hasText: 'หนี' }).click();
  await page.locator('.modal .btn', { hasText: 'ใช่' }).click();

  // hatch the egg, then switch pets at the hotel
  await page.evaluate(() => window.__app.go('hotel'));
  await clickText(page, 'ฟักไข่');
  for (let i = 0; i < 3; i++) await page.locator('.modal canvas').first().click();
  await page.waitForTimeout(500);
  await shot(page, 'hatched');
  await page.locator('.modal .btn.mint').click();
  await page.waitForSelector('.actionbar');
  check((await page.evaluate(() => window.__app.S.pets.length)) === 2, 'two pets after hatching');
  await shot(page, 'new-pet-home');
}

try {
  await sleep(800);
  await run({ width: 820, height: 1180 }, 'portrait');
  await run({ width: 1180, height: 820 }, 'landscape');
  if (errors.length) {
    console.error('Page errors:\n' + errors.join('\n'));
    process.exitCode = 1;
  } else console.log(`OK · screenshots in ${outDir}`);
} catch (e) {
  console.error(e);
  if (errors.length) console.error('Page errors:\n' + errors.join('\n'));
  process.exitCode = 1;
} finally {
  server.kill();
}
