// Yogurt's House: boot, game loop, real-time ticking, saving and the
// screen router. Screens live in ui/*.js and get this `app` object.
import { loadGame, saveGame, tick, activePet, store } from './state.js';
import { initAudio, music, sfx } from './audio.js';
import { REASONS } from './sim/care.js';
import { MISSIONS } from './sim/economy.js';
import { isNight } from './sim/time.js';
import { h, toast } from './ui/ui.js';
import { startScreen } from './ui/start.js';
import { homeScreen } from './ui/home.js';
import { townScreen, shopScreen, hospitalScreen, schoolScreen, activityScreen, arenaScreen, adventureScreen, hotelScreen } from './ui/town.js';
import { battleScreen } from './ui/battle.js';
import { catchGame } from './minigames/catch.js';
import { memoryGame } from './minigames/memory.js';
import { trainingGame } from './minigames/training.js';
import { calmGame } from './minigames/calm.js';
import { simonGame, quizGame } from './minigames/school.js';
import { welcomeBack, levelUpOverlay } from './ui/overlays.js';

const SCREENS = {
  start: startScreen,
  home: homeScreen,
  town: townScreen,
  shop: shopScreen,
  hospital: hospitalScreen,
  school: schoolScreen,
  activities: activityScreen,
  arena: arenaScreen,
  adventure: adventureScreen,
  hotel: hotelScreen,
  battle: battleScreen,
  catch: catchGame,
  memory: memoryGame,
  training: trainingGame,
  calm: calmGame,
  simon: simonGame,
  quiz: quizGame,
};

const params = new URLSearchParams(location.search);
const DEV = params.has('dev');

export const app = {
  S: null,
  dev: DEV,
  devOffset: DEV ? store.get('devOffset', 0) : 0,
  rng: Math.random,
  view: null,
  cur: null,
  queue: [],
  busy: 0, // >0 while a battle/minigame is running (cutscenes wait)
  now() {
    return Date.now() + this.devOffset;
  },
  pet() {
    return activePet(this.S);
  },

  go(name, arg) {
    this.cur?.leave?.();
    const ui = document.getElementById('ui');
    ui.replaceChildren();
    const scr = SCREENS[name](this, arg) || {};
    this.cur = { name, ...scr };
    if (scr.el) ui.append(scr.el);
    this.view = scr.view || this.view;
    if (scr.music !== undefined) music(scr.music);
    this.flush();
  },

  // Run the clock and react to whatever happened.
  tick() {
    if (!this.S) return;
    const events = tick(this.S, this.now(), this.rng);
    if (events.length) this.handle(events);
    this.cur?.refresh?.();
  },

  // Result of a care action: { ok, reason, events }.
  done(r, okMsg, kind = 'good') {
    if (!r.ok) {
      sfx.no();
      toast(REASONS[r.reason] || 'ทำไม่ได้ตอนนี้', 'bad');
      return false;
    }
    if (okMsg) toast(okMsg, kind);
    this.handle(r.events);
    this.save();
    this.cur?.refresh?.();
    return true;
  },

  handle(events) {
    for (const e of events) {
      switch (e.type) {
        case 'level':
          this.queue.push(e);
          break;
        case 'sick':
          sfx.sad();
          toast(`😷 ${this.pet()?.name || 'สัตว์เลี้ยง'}ไม่สบาย! พาไปโรงพยาบาลนะ`, 'bad');
          break;
        case 'mission':
          sfx.coin();
          toast(`✅ ภารกิจ "${MISSIONS[e.id].name}" สำเร็จ! +${e.coins}🪙 +${e.exp}⭐`, 'good');
          break;
        case 'missionsAll':
          sfx.sparkle();
          toast(`🎉 ทำภารกิจครบวันนี้! +${e.crystals}💎`, 'good');
          break;
        case 'login':
          if (this.started) toast(`☀️ วันใหม่! โบนัสเข้าเกม +${e.coins}🪙`, 'good');
          break;
        default:
          break;
      }
    }
    this.flush();
  },

  // Show queued level-ups once nothing else is in the way.
  flush() {
    if (this.busy || !this.queue.length || document.querySelector('.modal-wrap')) return;
    const evs = this.queue.splice(0);
    levelUpOverlay(this, evs, () => this.flush());
  },

  save() {
    if (this.S) saveGame(this.S);
  },

  blocked(reason) {
    sfx.no();
    toast(REASONS[reason] || reason, 'bad');
  },
};

// ---------------- canvas & loop ----------------

const canvas = document.getElementById('scene');
const ctx = canvas.getContext('2d');
let W = 0;
let H = 0;

function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

let last = performance.now();
let tickAcc = 0;
let saveAcc = 0;
function frame(ms) {
  const dt = Math.min(0.1, (ms - last) / 1000);
  last = ms;
  tickAcc += dt;
  saveAcc += dt;
  if (tickAcc >= 1) {
    tickAcc = 0;
    app.tick();
  }
  if (saveAcc >= 10) {
    saveAcc = 0;
    app.save();
  }
  if (app.view) {
    ctx.save();
    app.view.draw(ctx, W, H, ms / 1000, dt);
    ctx.restore();
  } else {
    ctx.fillStyle = '#fff7ec';
    ctx.fillRect(0, 0, W, H);
  }
  requestAnimationFrame(frame);
}

function pointer(kind) {
  return (e) => {
    const fn = app.view?.[kind];
    if (!fn) return;
    if (kind === 'down') canvas.setPointerCapture?.(e.pointerId);
    fn.call(app.view, e.clientX, e.clientY, e);
  };
}
canvas.addEventListener('pointerdown', pointer('down'));
canvas.addEventListener('pointermove', pointer('move'));
canvas.addEventListener('pointerup', pointer('up'));
canvas.addEventListener('pointercancel', pointer('up'));

// Audio can only start after a user gesture (iOS).
window.addEventListener('pointerdown', () => initAudio(), { capture: true });

document.addEventListener('visibilitychange', () => {
  if (document.hidden) app.save();
  else app.tick();
});
window.addEventListener('pagehide', () => app.save());

// ---------------- dev time skip ----------------

function devBar() {
  const skip = (min) => () => {
    app.devOffset += min * 60000;
    store.set('devOffset', app.devOffset);
    app.tick();
    toast(`⏩ +${min >= 60 ? `${min / 60} ชม.` : `${min} นาที`}`);
  };
  document.body.append(
    h(
      'div',
      { class: 'dev' },
      h('button', { class: 'btn small ghost', onclick: skip(10) }, '+10น.'),
      h('button', { class: 'btn small ghost', onclick: skip(60) }, '+1ชม.'),
      h('button', { class: 'btn small ghost', onclick: skip(360) }, '+6ชม.'),
    ),
  );
}

// ---------------- boot ----------------

function boot() {
  const S = loadGame();
  if (DEV) devBar();
  if (!S || !S.pets.length) {
    app.S = S && !S.pets.length ? S : null;
    app.go('start');
  } else {
    app.S = S;
    const away = app.now() - S.lastTs;
    const before = snapshot(S);
    const events = tick(S, app.now(), app.rng);
    app.go('home');
    app.started = true;
    if (away > 20 * 60000 || events.some((e) => e.type === 'login')) {
      welcomeBack(app, away, before, events, () => app.handle(events));
    } else {
      app.handle(events);
    }
    app.save();
  }
  app.started = true;
  requestAnimationFrame(frame);
}

function snapshot(S) {
  const p = activePet(S);
  return p ? { level: p.level, poop: p.poop, sick: p.sick, night: isNight(S.lastTs) } : {};
}

// ---------------- service worker ----------------

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

window.__app = app;
boot();
