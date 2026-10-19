import { IN, ENERGY_MAX } from '../config.js';
import { CHARACTERS } from '../characters/index.js';
import { getMove, moveLength } from '../sim/moves.js';

// Difficulty = how often the CPU re-thinks, and how likely it is to make
// the right call (block, punish, use the special).
export const LEVELS = {
  easy: { think: 26, block: 0.12, special: 0.25, punish: 0.05, aggro: 0.45, jump: 0.05, jumpOver: 0.1, airAtk: 0.3 },
  normal: { think: 14, block: 0.38, special: 0.55, punish: 0.35, aggro: 0.65, jump: 0.08, jumpOver: 0.3, airAtk: 0.6 },
  hard: { think: 7, block: 0.65, special: 0.85, punish: 0.75, aggro: 0.8, jump: 0.1, jumpOver: 0.55, airAtk: 0.9 },
};

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class AIController {
  constructor(level = 'normal', seed = Date.now()) {
    this.cfg = LEVELS[level] || LEVELS.normal;
    this.rnd = mulberry32(seed);
    this.held = 0;
    this.hold = 0;
    this.wait = 0;
    this.tap = 0;
    this.lastTap = -10;
  }

  press(bit, m) {
    // Attack buttons need a release between presses to register again.
    if (m.frame - this.lastTap < 2) return;
    this.tap = bit;
    this.lastTap = m.frame;
  }

  sample(m, idx) {
    if (m.phase !== 'fight') {
      this.held = 0;
      return 0;
    }
    const me = m.f[idx];
    const op = m.f[1 - idx];
    if (me.state === 'jump' && !me.airAtk && Math.abs(op.x - me.x) < 120 && this.rnd() < this.cfg.airAtk * 0.2) {
      this.press(this.rnd() < 0.6 ? IN.K : IN.P, m);
    }
    if (this.hold > 0) this.hold--;
    else if (--this.wait <= 0) {
      this.wait = this.cfg.think + Math.floor(this.rnd() * this.cfg.think * 0.6);
      this.decide(me, op, m);
    }
    const out = this.held | this.tap;
    this.tap = 0;
    return out;
  }

  decide(me, op, m) {
    const c = this.cfg;
    const r = this.rnd;
    const toward = op.x > me.x ? IN.R : IN.L;
    const away = toward === IN.R ? IN.L : IN.R;
    const gap = Math.abs(op.x - me.x) - (CHARACTERS[me.charId].body.w + CHARACTERS[op.charId].body.w) / 2;
    const reach = CHARACTERS[me.charId].reach;
    this.held = 0;

    const incoming = m.proj.find((p) => p.owner !== me.idx && Math.sign(me.x - p.x) === Math.sign(p.vx) && Math.abs(me.x - p.x) < 280);
    const threat = (op.state === 'attack' || op.state === 'special') && gap < 150;

    if ((incoming || threat) && r() < c.block) {
      this.held = IN.B;
      this.hold = 14 + Math.floor(r() * 12);
      return;
    }
    if (incoming && r() < c.jumpOver) {
      this.held = IN.U | toward;
      this.hold = 4;
      return;
    }
    if (me.energy >= ENERGY_MAX && gap < CHARACTERS[me.charId].specialRange && r() < c.special) {
      this.press(IN.S, m);
      return;
    }
    if (op.state === 'attack' && gap < 70 && r() < c.punish) {
      const mv = getMove(op.charId, op.move);
      if (op.sf > mv.startup + mv.active && op.sf < moveLength(mv)) {
        this.press(r() < 0.5 ? IN.K : IN.P, m);
        return;
      }
    }
    if (gap < 30 + reach) {
      const roll = r();
      if (roll < 0.5) this.press(IN.P, m);
      else if (roll < 0.8) this.press(IN.K, m);
      else if (roll < 0.9) {
        this.held = IN.B;
        this.hold = 10;
      } else {
        this.held = away;
        this.hold = 12;
      }
      return;
    }
    if (gap < 70 + reach) {
      if (r() < c.aggro) this.press(IN.K, m);
      else this.held = toward;
      return;
    }
    if (r() < c.jump) {
      this.held = IN.U | toward;
      this.hold = 3;
      return;
    }
    if (r() < c.aggro) this.held = toward;
    else if (r() < 0.3) this.held = away;
  }
}
