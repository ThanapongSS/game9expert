import { GROUND, GRAVITY, WALL_L, WALL_R, IN, ENERGY_MAX } from '../config.js';
import { CHARACTERS } from '../characters/index.js';
import { getMove, moveLength } from './moves.js';
import { SPECIALS } from './specials.js';

const ATTACK_BITS = IN.P | IN.K | IN.S;
const BUFFER_FRAMES = 6;

// Fighters are plain data so a whole match can be sent over the network.
export function createFighter(idx, charId) {
  const c = CHARACTERS[charId];
  return {
    idx, charId,
    x: idx === 0 ? 290 : 670, y: GROUND, vx: 0, vy: 0, push: 0, wallPush: 0,
    facing: idx === 0 ? 1 : -1, air: false,
    hp: c.hp, maxHp: c.hp, energy: 0,
    state: 'idle', sf: 0, move: null, hits: 0, hw: -1, sp: 0, airAtk: false,
    stun: 0, slow: 0, scared: 0, invul: 0, flash: 0, combo: 0,
    prev: 0, buf: 0, bufT: 0, walkDir: 0,
  };
}

export function setState(f, state) {
  f.state = state;
  f.sf = 0;
  if (state !== 'attack' && state !== 'special') f.move = null;
}

export function isActionable(f) {
  return f.state === 'idle' || f.state === 'walk' || f.state === 'block';
}

export function gainEnergy(f, n) {
  f.energy = Math.min(ENERGY_MAX, f.energy + n);
}

function startAttack(f, move, ev) {
  setState(f, 'attack');
  f.move = move;
  f.hits = 0;
  if (!f.air) f.vx = 0;
  ev.push({ type: 'swing', idx: f.idx, move });
}

function canSpecial(f, m) {
  if (f.energy < ENERGY_MAX) return false;
  const sp = SPECIALS[CHARACTERS[f.charId].special];
  return !sp.canStart || sp.canStart(f, m);
}

function startSpecial(f, opp, m, ev) {
  const id = CHARACTERS[f.charId].special;
  setState(f, 'special');
  f.move = id;
  f.hits = 0;
  f.hw = -1;
  f.sp = 0;
  f.vx = 0;
  f.energy = 0;
  // Short "super freeze" so both players can see what is coming.
  m.hitstop = Math.max(m.hitstop, 20);
  ev.push({ type: 'special', idx: f.idx, id, charId: f.charId });
}

function groundControl(f, inp, opp, m, ev, c) {
  if ((f.buf & IN.S) && canSpecial(f, m)) {
    f.buf = 0;
    startSpecial(f, opp, m, ev);
    return;
  }
  if (f.buf & IN.P) {
    f.buf = 0;
    startAttack(f, 'punch', ev);
    return;
  }
  if (f.buf & IN.K) {
    f.buf = 0;
    startAttack(f, 'kick', ev);
    return;
  }
  const slowMul = f.slow > 0 ? 0.55 : 1;
  const dir = ((inp & IN.R) ? 1 : 0) - ((inp & IN.L) ? 1 : 0);
  if (inp & IN.U) {
    setState(f, 'jump');
    f.air = true;
    f.airAtk = false;
    f.vy = c.jumpV;
    f.vx = dir * c.jumpX * slowMul;
    ev.push({ type: 'jump', idx: f.idx });
    return;
  }
  if (inp & IN.B) {
    if (f.state !== 'block') setState(f, 'block');
    f.vx = 0;
    return;
  }
  if (dir) {
    if (f.state !== 'walk') setState(f, 'walk');
    f.walkDir = dir;
    f.vx = dir * c.walk * (dir === f.facing ? 1 : 0.75) * slowMul;
  } else {
    if (f.state !== 'idle') setState(f, 'idle');
    f.vx = 0;
  }
}

// Input + state machine for one frame.
export function control(f, inp, opp, m, ev) {
  const pressed = inp & ~f.prev;
  f.prev = inp;
  if (pressed & ATTACK_BITS) {
    f.buf = pressed & ATTACK_BITS;
    f.bufT = BUFFER_FRAMES;
  } else if (f.bufT > 0 && --f.bufT === 0) {
    f.buf = 0;
  }
  f.sf++;
  if (f.slow > 0) f.slow--;
  if (f.scared > 0) f.scared--;
  if (f.invul > 0) f.invul--;
  if (f.flash > 0) f.flash--;
  const c = CHARACTERS[f.charId];

  switch (f.state) {
    case 'idle':
    case 'walk':
    case 'block':
      groundControl(f, inp, opp, m, ev, c);
      break;
    case 'jump':
      if (!f.airAtk && (f.buf & (IN.P | IN.K))) {
        f.airAtk = true;
        startAttack(f, (f.buf & IN.P) ? 'jpunch' : 'jkick', ev);
        f.buf = 0;
      }
      break;
    case 'attack': {
      const mv = getMove(f.charId, f.move);
      if (!mv.air) f.vx *= 0.6;
      if (f.sf >= moveLength(mv)) setState(f, f.air ? 'jump' : 'idle');
      break;
    }
    case 'special':
      if (SPECIALS[c.special].update(f, opp, m, ev)) setState(f, f.air ? 'jump' : 'idle');
      break;
    case 'hitstun':
    case 'blockstun':
      if (--f.stun <= 0) setState(f, 'idle');
      break;
    case 'down':
      if (f.sf >= 40) {
        setState(f, 'getup');
        f.invul = 30;
      }
      break;
    case 'getup':
      if (f.sf >= 22) setState(f, 'idle');
      break;
    default:
      // launch, ko, win, lose: driven by physics / match phase.
      break;
  }
}

function land(f, ev) {
  switch (f.state) {
    case 'jump':
    case 'attack':
      setState(f, 'idle');
      f.vx = 0;
      ev.push({ type: 'land', idx: f.idx, x: f.x });
      break;
    case 'launch':
      setState(f, 'down');
      f.vx = 0;
      ev.push({ type: 'thud', idx: f.idx, x: f.x });
      break;
    case 'ko':
      f.vx = 0;
      ev.push({ type: 'thud', idx: f.idx, x: f.x });
      break;
    case 'special':
      break;
    default:
      f.vx = 0;
  }
}

export function halfWidth(f) {
  return CHARACTERS[f.charId].body.w / 2;
}

function clampToWalls(f) {
  const half = halfWidth(f);
  if (f.x < WALL_L + half) {
    f.x = WALL_L + half;
    return -1;
  }
  if (f.x > WALL_R - half) {
    f.x = WALL_R - half;
    return 1;
  }
  return 0;
}

export function physics(f, ev) {
  f.x += f.vx + f.push;
  f.push *= 0.82;
  if (Math.abs(f.push) < 0.15) f.push = 0;
  if (f.air) {
    f.vy += GRAVITY;
    f.y += f.vy;
    if (f.y >= GROUND) {
      f.y = GROUND;
      f.vy = 0;
      f.air = false;
      land(f, ev);
    }
  }
  const wall = clampToWalls(f);
  // A fighter pinned at the wall passes its pushback to the attacker,
  // so corner pressure can't loop forever.
  if (wall && f.push && Math.sign(f.push) === wall) {
    f.wallPush = f.push;
    f.push = 0;
  }
}

export function transferWallPush(a, b) {
  if (a.wallPush) {
    b.push = -a.wallPush * 0.9;
    a.wallPush = 0;
  }
  if (b.wallPush) {
    a.push = -b.wallPush * 0.9;
    b.wallPush = 0;
  }
}

const LYING = new Set(['down', 'ko']);

// Keep bodies from overlapping. Airborne fighters can pass over heads.
export function separate(a, b) {
  if ((LYING.has(a.state) && !a.air) || (LYING.has(b.state) && !b.air)) return;
  const ca = CHARACTERS[a.charId].body;
  const cb = CHARACTERS[b.charId].body;
  if (Math.abs(a.y - b.y) >= Math.min(ca.h, cb.h) * 0.75) return;
  const minDist = (ca.w + cb.w) / 2;
  const dx = b.x - a.x;
  if (Math.abs(dx) >= minDist) return;
  const dir = dx !== 0 ? Math.sign(dx) : a.facing;
  const overlap = minDist - Math.abs(dx);
  a.x -= (dir * overlap) / 2;
  b.x += (dir * overlap) / 2;
  if (clampToWalls(a)) b.x = a.x + dir * minDist;
  if (clampToWalls(b)) a.x = b.x - dir * minDist;
}

export function faceOpponent(f, o) {
  if (f.air || !isActionable(f)) return;
  const d = Math.sign(o.x - f.x);
  if (d) f.facing = d;
}

export function hurtbox(f) {
  const b = CHARACTERS[f.charId].body;
  return { x: f.x - b.w / 2, y: f.y - b.h, w: b.w, h: b.h };
}

export function vulnerable(f) {
  return f.invul === 0 && !['down', 'getup', 'ko', 'launch', 'win'].includes(f.state);
}
