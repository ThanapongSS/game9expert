import { CHARACTERS } from '../characters/index.js';

// Frame data at 60fps. Box x is measured from the body centre in the facing
// direction, y from the feet (negative is up).
export const BASE_MOVES = {
  punch: {
    startup: 5, active: 3, recovery: 10,
    dmg: 45, hitstun: 18, blockstun: 11, push: 5, energy: 9, hitstop: 5,
    box: { x: 18, y: -128, w: 58, h: 30 },
  },
  kick: {
    startup: 9, active: 4, recovery: 15,
    dmg: 70, hitstun: 20, blockstun: 13, push: 8, energy: 12, hitstop: 7,
    box: { x: 18, y: -82, w: 80, h: 34 },
  },
  jpunch: {
    startup: 4, active: 10, recovery: 4, air: true,
    dmg: 50, hitstun: 18, blockstun: 11, push: 4, energy: 10, hitstop: 5,
    box: { x: 10, y: -122, w: 60, h: 42 },
  },
  jkick: {
    startup: 6, active: 12, recovery: 4, air: true,
    dmg: 65, hitstun: 20, blockstun: 12, push: 6, energy: 11, hitstop: 6,
    box: { x: 6, y: -72, w: 76, h: 42 },
  },
};

const cache = new Map();

export function getMove(charId, moveId) {
  const key = charId + ':' + moveId;
  let m = cache.get(key);
  if (m) return m;
  const c = CHARACTERS[charId];
  const b = BASE_MOVES[moveId];
  m = {
    ...b,
    startup: Math.max(2, b.startup + c.frameAdj),
    recovery: Math.max(3, b.recovery + c.frameAdj),
    dmg: Math.round(b.dmg * c.dmgMul),
    box: { ...b.box, w: b.box.w + c.reach },
  };
  cache.set(key, m);
  return m;
}

export function moveLength(mv) {
  return mv.startup + mv.active + mv.recovery;
}
