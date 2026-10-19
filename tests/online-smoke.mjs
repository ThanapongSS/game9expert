// Two-page online smoke test. The real PeerJS cloud isn't needed: a tiny
// stand-in `window.Peer` relays messages between the pages over a
// BroadcastChannel, so the whole lobby → fight → rematch → leave flow runs.
// usage: node tests/online-smoke.mjs [screenshotDir]
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

const FAKE_PEER = () => {
  const bc = new BroadcastChannel('fake-peerjs');
  const peers = {};
  class Emitter {
    constructor() {
      this.h = {};
    }
    on(e, f) {
      (this.h[e] ??= []).push(f);
      return this;
    }
    once(e, f) {
      const g = (...a) => {
        this.h[e] = this.h[e].filter((x) => x !== g);
        f(...a);
      };
      return this.on(e, g);
    }
    emit(e, ...a) {
      (this.h[e] || []).slice().forEach((f) => f(...a));
    }
  }
  class Conn extends Emitter {
    constructor(peer, remote, cid) {
      super();
      Object.assign(this, { peer, remote, cid, open: false });
    }
    send(d) {
      bc.postMessage({ type: 'data', to: this.remote, cid: this.cid, d });
    }
    close() {
      if (!this.open) return;
      this.open = false;
      bc.postMessage({ type: 'close', to: this.remote, cid: this.cid });
      this.emit('close');
    }
  }
  class Peer extends Emitter {
    constructor(id) {
      super();
      this.id = typeof id === 'string' ? id : 'guest-' + Math.random().toString(36).slice(2);
      this.conns = {};
      setTimeout(() => {
        peers[this.id] = this;
        this.emit('open', this.id);
      }, 30);
    }
    connect(remote) {
      const cid = Math.random().toString(36).slice(2);
      const c = new Conn(this, remote, cid);
      this.conns[cid] = c;
      bc.postMessage({ type: 'connect', to: remote, from: this.id, cid });
      setTimeout(() => !c.open && this.emit('error', { type: 'peer-unavailable' }), 3000);
      return c;
    }
    destroy() {
      Object.values(this.conns).forEach((c) => c.close());
      delete peers[this.id];
    }
  }
  bc.onmessage = ({ data: m }) => {
    const p = peers[m.to];
    if (!p) return;
    const c = p.conns[m.cid];
    if (m.type === 'connect') {
      const nc = new Conn(p, m.from, m.cid);
      p.conns[m.cid] = nc;
      p.emit('connection', nc);
      setTimeout(() => {
        nc.open = true;
        nc.emit('open');
        bc.postMessage({ type: 'accept', to: m.from, cid: m.cid });
      }, 20);
    } else if (m.type === 'accept' && c) {
      c.open = true;
      c.emit('open');
    } else if (m.type === 'data' && c) {
      c.emit('data', m.d);
    } else if (m.type === 'close' && c && c.open) {
      c.open = false;
      c.emit('close');
    }
  };
  window.Peer = Peer;
};

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.resolve(process.argv[2] || path.join(root, 'tests', 'screenshots'));
mkdirSync(outDir, { recursive: true });
const PORT = 9000 + Math.floor(Math.random() * 900);
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = [];
let failed = false;
const check = (cond, msg) => {
  console.log((cond ? '  ✔ ' : '  ✘ ') + msg);
  if (!cond) failed = true;
};

try {
  await sleep(800);
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await context.addInitScript(FAKE_PEER);
  const [host, guest] = [await context.newPage(), await context.newPage()];
  for (const [name, p] of [['host', host], ['guest', guest]]) {
    p.on('console', (m) => m.type() === 'error' && !/fonts\.(googleapis|gstatic)/.test(m.text()) && errors.push(`${name}: ${m.text()}`));
    p.on('pageerror', (e) => errors.push(`${name}: ${e}`));
    await p.goto(`http://127.0.0.1:${PORT}/index.html`);
    await p.waitForSelector('.screen.title');
    await p.tap('.screen.title');
    await p.waitForSelector('.screen.menu');
    await p.tap('.menu-list .btn.blue');
    await p.waitForSelector('.screen.online');
  }

  await host.tap('.online-body .btn.orange');
  await host.waitForSelector('.code');
  const code = (await host.textContent('.code')).trim();
  check(/^[A-Z2-9]{5}$/.test(code), `host got room code ${code}`);
  await host.screenshot({ path: path.join(outDir, 'online-1-host-code.png') });

  await guest.fill('.code-input', code.toLowerCase());
  await guest.tap('.online-body .btn.blue');
  await host.waitForSelector('.screen.select');
  await guest.waitForSelector('.screen.select');
  check(true, 'guest joined, both on doll select');

  await host.tap('.card[data-char="robo"]');
  await host.tap('.btn.confirm');
  await host.waitForSelector('.screen.status');
  check((await host.textContent('.screen.status')).length > 0, 'host waits for guest pick');
  await guest.tap('.card[data-char="teddy"]');
  await guest.tap('.btn.confirm');
  await Promise.all([host.waitForSelector('.screen.vs'), guest.waitForSelector('.screen.vs')]);
  await guest.screenshot({ path: path.join(outDir, 'online-2-vs.png') });
  await Promise.all([host.waitForSelector('.screen.vs', { state: 'detached' }), guest.waitForSelector('.screen.vs', { state: 'detached' })]);
  await sleep(2300);

  const hostMatch = () => host.evaluate(() => {
    const m = window.__app.session.match;
    return { phase: m.phase, x: m.f.map((f) => f.x), hp: m.f.map((f) => f.hp), chars: m.f.map((f) => f.charId) };
  });
  const guestView = () => guest.evaluate(() => {
    const v = window.__app.session.view();
    return v && { phase: v.phase, x: v.f.map((f) => f.x), hp: v.f.map((f) => f.hp) };
  });
  let hm = await hostMatch();
  check(hm.phase === 'fight' && hm.chars.join() === 'robo,teddy', `host simulates robo vs teddy (${hm.phase})`);
  let gv = await guestView();
  check(gv && gv.phase === 'fight', 'guest renders host snapshots');

  // Guest walks left with the d-pad: host must see P2 move.
  const x0 = hm.x[1];
  const dpad = await guest.locator('.dpad').boundingBox();
  await guest.evaluate(({ x, y }) => document.querySelector('.dpad').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 3, clientX: x, clientY: y, pointerType: 'touch' })), { x: dpad.x + dpad.width * 0.1, y: dpad.y + dpad.height / 2 });
  await sleep(1400);
  await guest.evaluate(() => document.querySelector('.dpad').dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 3, pointerType: 'touch' })));
  hm = await hostMatch();
  check(hm.x[1] < x0 - 60, `guest input moves P2 on host (${Math.round(x0)} → ${Math.round(hm.x[1])})`);

  // Guest punches the host's doll.
  const hp0 = hm.hp[0];
  const punch = await guest.locator('.tb.punch').boundingBox();
  await host.evaluate(() => {
    const m = window.__app.session.match;
    m.f[0].x = 400;
    m.f[1].x = 470;
  });
  for (let i = 0; i < 6; i++) {
    await guest.touchscreen.tap(punch.x + punch.width / 2, punch.y + punch.height / 2);
    await sleep(150);
  }
  hm = await hostMatch();
  check(hm.hp[0] < hp0, `guest punches land on host (${hp0} → ${hm.hp[0]})`);
  await sleep(200);
  gv = await guestView();
  check(Math.abs(gv.hp[0] - hm.hp[0]) < 100, 'guest view HP matches host');
  await guest.screenshot({ path: path.join(outDir, 'online-3-guest-fight.png') });

  // Host K.O.s the guest's doll → both see results → rematch.
  await host.evaluate(() => {
    const m = window.__app.session.match;
    m.f[1].hp = 1;
    m.f[0].x = 400;
    m.f[1].x = 470;
    m.f[1].state = 'idle';
  });
  await host.keyboard.press('j');
  await sleep(250);
  await host.keyboard.press('j');
  await Promise.all([host.waitForSelector('.screen.result', { timeout: 9000 }), guest.waitForSelector('.screen.result', { timeout: 9000 })]);
  check(await host.isVisible('.result.win'), 'host sees win');
  check(await guest.isVisible('.result.lose'), 'guest sees lose');
  await guest.screenshot({ path: path.join(outDir, 'online-4-guest-result.png') });
  await guest.tap('.result .btn.green');
  await guest.waitForSelector('.screen.status');
  await host.tap('.result .btn.green');
  await Promise.all([host.waitForSelector('.screen.vs'), guest.waitForSelector('.screen.vs')]);
  check(true, 'rematch starts on both');
  await sleep(2400);
  hm = await hostMatch();
  check(hm.hp[1] === 1000 && hm.phase !== 'result', 'rematch resets the match');

  // Guest leaves → host is told.
  await guest.tap('#controls .pause');
  await guest.waitForSelector('.screen.pause');
  await guest.tap('.pause .btn.ghost');
  await guest.waitForSelector('.screen.menu');
  await host.waitForSelector('.screen.online .error', { timeout: 5000 });
  check(true, 'host is notified when the guest leaves');
  await host.screenshot({ path: path.join(outDir, 'online-5-host-left.png') });

  await browser.close();
} catch (e) {
  failed = true;
  console.error(e);
} finally {
  server.kill();
}

check(errors.length === 0, 'no console errors' + (errors.length ? ':\n    ' + errors.join('\n    ') : ''));
console.log(failed ? '\nONLINE SMOKE FAILED' : '\nONLINE SMOKE OK');
process.exit(failed ? 1 : 0);
