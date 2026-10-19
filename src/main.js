import { W, H, FPS, ENERGY_MAX } from './config.js';
import { ROSTER, STAGES } from './characters/index.js';
import { t, setLang, onLangChange, getLang } from './i18n.js';
import { storage } from './storage.js';
import { InputSource, attachKeyboard } from './input/input.js';
import { TouchControls } from './input/touch.js';
import { Renderer } from './render/renderer.js';
import { clearStageCache } from './render/stage.js';
import { initAudio, playEvents, playMusic, setAudio, sfx } from './audio/audio.js';
import { AttractSession, CpuSession } from './modes/sessions.js';
import { OnlineFlow } from './modes/online.js';
import {
  titleScreen, menuScreen, selectScreen, setupScreen, vsScreen, resultScreen, pauseScreen, settingsScreen,
} from './ui/screens.js';

const STEP = 1 / FPS;
const pickOne = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => arr.map((v) => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);

class App {
  constructor() {
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    this.uiRoot = document.getElementById('ui');
    this.controlsRoot = document.getElementById('controls');
    this.isTouch = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
    document.body.classList.toggle('touch', this.isTouch);

    this.prefs = { p1: 'teddy', p2: 'robo', level: 'normal', stage: 'random', ...storage.get('prefs', {}) };
    this.input = new InputSource();
    attachKeyboard(this.input, { onPause: () => this.pause() });
    this.touch = new TouchControls(this.controlsRoot, this.input, { onPause: () => this.pause() });
    this.renderer = new Renderer();
    this.online = new OnlineFlow(this);
    this.screen = null;
    this.screenDef = null;
    this.paused = false;
    this.acc = 0;
    this.last = 0;

    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 200));
    onLangChange(() => {
      this.applyStaticText();
      this.rerender();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.pause(true);
    });
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    document.getElementById('rotate-skip')?.addEventListener('click', () => document.body.classList.add('portrait-ok'));
    this.applyStaticText();

    this.setSession(new AttractSession());
    this.goTitle();
    requestAnimationFrame((ts) => this.loop(ts));
  }

  savePrefs() {
    storage.set('prefs', this.prefs);
  }

  applyStaticText() {
    document.documentElement.lang = getLang();
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = t(el.dataset.i18n);
    });
  }

  // ---------- screens ----------

  show(builder, props = {}) {
    this.screen?.cleanup?.();
    const s = builder(props);
    this.uiRoot.replaceChildren(s.el);
    this.screen = s;
    this.screenDef = { builder, props };
    this.controlsRoot.hidden = true;
    this.input.clear();
    this.touch.reset();
  }

  rerender() {
    if (this.screenDef) this.show(this.screenDef.builder, this.screenDef.props);
  }

  hideUI() {
    this.screen?.cleanup?.();
    this.uiRoot.replaceChildren();
    this.screen = null;
    this.screenDef = null;
    if (this.session?.localIdx >= 0) this.controlsRoot.hidden = !this.isTouch;
  }

  showResult(props) {
    this.show(resultScreen, props);
  }

  // ---------- sessions ----------

  setSession(s, { fight = false } = {}) {
    this.session = s;
    this.renderer.reset();
    this.acc = 0;
    this.paused = false;
    this.input.clear();
    this.touch.reset();
    this.controlsRoot.hidden = !(fight && this.isTouch);
    playMusic(fight ? 'fight' : 'menu');
  }

  attract() {
    if (!this.session?.attract) this.setSession(new AttractSession());
  }

  pause(auto = false) {
    const s = this.session;
    if (!s || s.attract || this.screen) return;
    if (s.online) {
      if (auto) return;
      this.show(pauseScreen, { onResume: () => this.hideUI(), onQuit: () => this.online.leave() });
      return;
    }
    if (s.match.phase === 'result') return;
    this.paused = true;
    this.show(pauseScreen, {
      onResume: () => {
        this.paused = false;
        this.hideUI();
      },
      onQuit: () => this.goMenu(),
    });
  }

  // ---------- flow ----------

  goTitle() {
    this.show(titleScreen, { onStart: () => this.start() });
  }

  start() {
    initAudio();
    this.tryFullscreen();
    playMusic('menu');
    const room = new URLSearchParams(location.search).get('room');
    if (room) {
      history.replaceState(null, '', location.pathname);
      this.online.join(room);
    } else {
      this.goMenu();
    }
  }

  goMenu() {
    if (this.online.active) this.online.cleanup();
    this.attract();
    this.show(menuScreen, {
      onQuick: () => this.quickSelect(),
      onArcade: () => this.arcadeSelect(),
      onOnline: () => this.online.home(),
      onSettings: () => this.goSettings(),
    });
  }

  goSettings() {
    const el = document.documentElement;
    const canFs = !!el.requestFullscreen && !matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches;
    this.show(settingsScreen, {
      onLang: (l) => setLang(l),
      onAudio: (k, v) => setAudio(k, v),
      onFullscreen: canFs ? () => (document.fullscreenElement ? document.exitFullscreen() : this.tryFullscreen(true)) : null,
      onBack: () => this.goMenu(),
    });
  }

  tryFullscreen(force = false) {
    const el = document.documentElement;
    if (document.fullscreenElement || !el.requestFullscreen) return;
    if (!force && (!this.isTouch || matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches)) return;
    el.requestFullscreen({ navigationUI: 'hide' })
      .then(() => screen.orientation?.lock?.('landscape'))
      .catch(() => {});
  }

  // Quick match: you → opponent → difficulty & stage → fight
  quickSelect() {
    this.attract();
    this.show(selectScreen, {
      title: t('select.you'),
      initial: this.prefs.p1,
      onBack: () => this.goMenu(),
      onConfirm: (id) => {
        this.prefs.p1 = id;
        this.quickOpponent();
      },
    });
  }

  quickOpponent() {
    this.show(selectScreen, {
      title: t('select.opp'),
      initial: this.prefs.p2,
      allowRandom: true,
      onBack: () => this.quickSelect(),
      onConfirm: (id) => {
        this.prefs.p2 = id;
        this.quickSetup();
      },
    });
  }

  quickSetup() {
    this.show(setupScreen, {
      level: this.prefs.level,
      stage: this.prefs.stage,
      onBack: () => this.quickOpponent(),
      onFight: ({ level, stage }) => {
        Object.assign(this.prefs, { level, stage });
        this.savePrefs();
        this.startQuick();
      },
    });
  }

  startQuick() {
    const { p1, p2, level } = this.prefs;
    const stage = this.prefs.stage === 'random' ? pickOne(STAGES) : this.prefs.stage;
    this.fight({
      p1, p2, stage, level,
      subtitle: t('level.' + level),
      onResult: (outcome) => this.showResult({
        title: t('result.' + outcome),
        tone: outcome,
        buttons: [
          { label: '🔁 ' + t('result.rematch'), cls: 'green', onClick: () => this.startQuick() },
          { label: t('result.change'), cls: 'ghost', onClick: () => this.quickSelect() },
          { label: t('result.menu'), cls: 'ghost', onClick: () => this.goMenu() },
        ],
      }),
    });
  }

  fight({ p1, p2, stage, level, subtitle, onResult }) {
    this.show(vsScreen, {
      p1, p2, alt2: p1 === p2, subtitle,
      onDone: () => {
        const s = new CpuSession({ p1, p2, stage, level, input: this.input });
        s.onResult = (winner) => {
          const outcome = winner === 'draw' ? 'draw' : winner === 0 ? 'win' : 'lose';
          (outcome === 'lose' ? sfx.lose : sfx.win)();
          onResult(outcome);
        };
        this.setSession(s, { fight: true });
        this.hideUI();
      },
    });
  }

  // Arcade: beat the other three dolls, Easy → Normal → Hard.
  arcadeSelect() {
    this.attract();
    this.show(selectScreen, {
      title: t('select.you') + ' · ' + t('menu.arcade'),
      initial: this.prefs.p1,
      trophies: storage.get('trophies', {}),
      onBack: () => this.goMenu(),
      onConfirm: (id) => {
        this.prefs.p1 = id;
        this.savePrefs();
        this.arcade = { p1: id, opps: shuffle(ROSTER.filter((c) => c !== id)), i: 0 };
        this.arcadeFight();
      },
    });
  }

  arcadeFight() {
    const a = this.arcade;
    const total = a.opps.length;
    const level = ['easy', 'normal', 'hard'][Math.min(2, a.i)];
    this.fight({
      p1: a.p1,
      p2: a.opps[a.i],
      stage: STAGES[a.i % STAGES.length],
      level,
      subtitle: t('arcade.stage', { n: a.i + 1, total }) + ' · ' + t('level.' + level),
      onResult: (outcome) => {
        if (outcome === 'win' && a.i + 1 >= total) {
          const trophies = storage.get('trophies', {});
          trophies[a.p1] = true;
          storage.set('trophies', trophies);
          sfx.win();
          this.showResult({
            title: '🏆 ' + t('arcade.champion'),
            subtitle: t('arcade.champion.d', { name: t('char.' + a.p1) }),
            tone: 'win champion',
            buttons: [
              { label: t('menu.arcade') + ' 🔁', cls: 'green', onClick: () => this.arcadeSelect() },
              { label: t('result.menu'), cls: 'ghost', onClick: () => this.goMenu() },
            ],
          });
        } else if (outcome === 'win') {
          a.i++;
          this.showResult({
            title: t('result.win'),
            subtitle: t('arcade.stage', { n: a.i, total }) + ' ✔',
            tone: 'win',
            buttons: [
              { label: t('result.next') + ' ➜', cls: 'green', onClick: () => this.arcadeFight() },
              { label: t('result.menu'), cls: 'ghost', onClick: () => this.goMenu() },
            ],
          });
        } else {
          this.showResult({
            title: t('result.' + outcome),
            subtitle: t('arcade.stage', { n: a.i + 1, total }),
            tone: outcome,
            buttons: [
              { label: '🔁 ' + t('result.continue'), cls: 'green', onClick: () => this.arcadeFight() },
              { label: t('result.giveup'), cls: 'ghost', onClick: () => this.goMenu() },
            ],
          });
        }
      },
    });
  }

  // ---------- frame loop ----------

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    const scale = Math.min(w / W, h / H);
    const ox = (w - W * scale) / 2;
    // In portrait the arena sits near the top, leaving room for the thumbs below.
    const oy = h > w ? Math.min((h - H * scale) / 2, h * 0.1) : (h - H * scale) / 2;
    this.vp = { dpr, scale, ox, oy, x0: -ox / scale, y0: -oy / scale, x1: (w - ox) / scale, y1: (h - oy) / scale, q: scale * dpr };
  }

  loop(ts) {
    requestAnimationFrame((n) => this.loop(n));
    const dt = Math.min(0.1, this.last ? (ts - this.last) / 1000 : STEP);
    this.last = ts;
    const s = this.session;

    if (!this.paused) {
      this.acc += dt;
      let steps = 0;
      while (this.acc >= STEP && steps < 5) {
        s.step();
        this.acc -= STEP;
        steps++;
      }
      if (steps === 5) this.acc = 0;
    }

    if (s.attract && s.match.phase === 'result' && s.match.pf > 120) this.setSession(new AttractSession());

    const view = s.view();
    const { ctx, vp } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#1b1030';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    if (view) {
      const ev = s.takeEvents();
      this.renderer.events(ev, view);
      if (!s.attract) playEvents(ev);
      if (!this.paused) this.renderer.update(dt, view);
      ctx.setTransform(vp.dpr * vp.scale, 0, 0, vp.dpr * vp.scale, vp.dpr * vp.ox, vp.dpr * vp.oy);
      this.renderer.draw(ctx, view, vp, s.hudOptions());
      if (s.localIdx >= 0) this.touch.setSpecialReady(view.f[s.localIdx].energy >= ENERGY_MAX);
    }
    this.screen?.tick?.(ts / 1000);
  }
}

const app = new App();
// Handy for debugging and for the automated smoke test.
window.__app = app;
document.fonts?.ready.then(() => clearStageCache());

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
