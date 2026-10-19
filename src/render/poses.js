import { getMove } from '../sim/moves.js';

// Angles in degrees, facing right.
// Limbs: 0 = hanging down, 90 = pointing forward, 180 = up. a2/l2 are the
// elbow / knee bend relative to the upper segment.
// lean: torso tilt forward. rot: whole-body rotation around the feet.
// lift: raise the hip off the ground (used in the air).
const BASE = {
  lean: 6, head: 0, rot: 0, lift: 0, flip: 1,
  aF1: 35, aF2: 95, aB1: 20, aB2: 100,
  lF1: 22, lF2: -38, lB1: -18, lB2: -22,
};

const pose = (o) => ({ ...BASE, ...o });

export const POSES = {
  idle: pose({}),
  idle2: pose({ lean: 9, aF1: 40, aF2: 100, aB1: 25, aB2: 104, lF1: 26, lF2: -48, lB1: -20, lB2: -30 }),
  walkA: pose({ lean: 10, lF1: 40, lF2: -30, lB1: -30, lB2: -20, aF1: 45, aB1: 10 }),
  walkB: pose({ lean: 10, lF1: -10, lF2: -50, lB1: 10, lB2: -50, aF1: 25, aB1: 30 }),
  jumpUp: pose({ lean: 0, aF1: 140, aF2: 30, aB1: 120, aB2: 40, lF1: 70, lF2: -100, lB1: 20, lB2: -70 }),
  jumpFall: pose({ lean: 4, aF1: 100, aF2: 25, aB1: 70, aB2: 30, lF1: 35, lF2: -45, lB1: -10, lB2: -30 }),
  punchWind: pose({ lean: 2, aF1: 25, aF2: 125, aB1: 55, aB2: 90, lF1: 26, lF2: -42, lB1: -22, lB2: -20 }),
  punchHit: pose({ lean: 18, head: 4, aF1: 90, aF2: 0, aB1: 15, aB2: 110, lF1: 32, lF2: -46, lB1: -32, lB2: -8 }),
  kickWind: pose({ lean: -10, aF1: 60, aF2: 70, aB1: -30, aB2: 60, lF1: 70, lF2: -110, lB1: -5, lB2: -10 }),
  kickHit: pose({ lean: -22, aF1: 55, aF2: 40, aB1: -45, aB2: 50, lF1: 98, lF2: -4, lB1: -8, lB2: -5 }),
  jpunch: pose({ lean: 20, aF1: 112, aF2: -8, aB1: 60, aB2: 60, lF1: 60, lF2: -90, lB1: 10, lB2: -60 }),
  jkick: pose({ lean: -16, aF1: 120, aF2: 30, aB1: 60, aB2: 40, lF1: 104, lF2: -8, lB1: 20, lB2: -90 }),
  block: pose({ lean: -6, head: -8, aF1: 70, aF2: 122, aB1: 55, aB2: 125, lF1: 30, lF2: -62, lB1: -26, lB2: -42 }),
  hit: pose({ lean: -22, head: -18, aF1: -20, aF2: 40, aB1: -40, aB2: 30, lF1: 15, lF2: -30, lB1: -25, lB2: -15 }),
  launch: pose({ lean: -28, head: -20, aF1: 160, aF2: 10, aB1: 130, aB2: 20, lF1: 40, lF2: -30, lB1: 10, lB2: -20, rot: -40 }),
  down: pose({ lean: 0, head: 6, aF1: 170, aF2: 4, aB1: 160, aB2: 4, lF1: 8, lF2: -4, lB1: -6, lB2: 0, rot: -90 }),
  win: pose({ lean: 0, head: -10, aF1: 165, aF2: 10, aB1: 150, aB2: 20, lF1: 15, lF2: -10, lB1: -15, lB2: -10 }),
  win2: pose({ lean: 4, head: -4, aF1: 175, aF2: -10, aB1: 160, aB2: 10, lF1: 20, lF2: -30, lB1: -20, lB2: -30 }),
  lose: pose({ lean: 22, head: 25, aF1: 5, aF2: 5, aB1: 0, aB2: 5, lF1: 15, lF2: -40, lB1: -10, lB2: -40 }),

  // Specials
  slamCrouch: pose({ lean: 28, aF1: 30, aF2: 60, aB1: 30, aB2: 60, lF1: 64, lF2: -115, lB1: 0, lB2: -95 }),
  slamAir: pose({ lean: 50, head: -15, aF1: 150, aF2: 0, aB1: 140, aB2: 0, lF1: 10, lF2: -20, lB1: -40, lB2: -10, lift: 10 }),
  slamLand: pose({ lean: 35, head: 10, aF1: 100, aF2: -50, aB1: 90, aB2: -40, lF1: 72, lF2: -125, lB1: -5, lB2: -100 }),
  rocketCharge: pose({ lean: -4, aF1: 20, aF2: 145, aB1: 45, aB2: 100, lF1: 30, lF2: -55, lB1: -26, lB2: -24 }),
  rocketFire: pose({ lean: 16, aF1: 92, aF2: 0, aB1: 10, aB2: 100, lF1: 34, lF2: -50, lB1: -34, lB2: -10 }),
  spinWind: pose({ lean: 10, aF1: 20, aF2: 60, aB1: 160, aB2: 20, lF1: 40, lF2: -70, lB1: -20, lB2: -40 }),
  spin: pose({ lean: 0, aF1: 95, aF2: 0, aB1: 95, aB2: 0, lF1: 20, lF2: -20, lB1: -20, lB2: -20 }),
  curseCharge: pose({ lean: -6, head: -10, aF1: 150, aF2: 30, aB1: 140, aB2: 40, lF1: 30, lF2: -55, lB1: -26, lB2: -30 }),
  curseCast: pose({ lean: 14, head: 6, aF1: 100, aF2: 15, aB1: 105, aB2: 10, lF1: 34, lF2: -50, lB1: -30, lB2: -14 }),
  waiKhru: pose({ lean: 14, head: 12, aF1: 62, aF2: 118, aB1: 58, aB2: 124, lF1: 46, lF2: -88, lB1: -10, lB2: -54 }),
  giantPunch: pose({ lean: 28, head: 4, aF1: 92, aF2: -4, aB1: -10, aB2: 90, lF1: 52, lF2: -62, lB1: -46, lB2: -4 }),
  screamCharge: pose({ lean: -8, head: -18, aF1: 125, aF2: 40, aB1: 115, aB2: 40, lift: 6 }),
  screamCast: pose({ lean: 12, head: 10, aF1: 98, aF2: -8, aB1: 92, aB2: -4, lF1: 30, lF2: -40, lB1: -20, lB2: -30, lift: 8 }),
  breathCharge: pose({ lean: -14, head: -24, aF1: 40, aF2: 60, aB1: 30, aB2: 70 }),
  breathFire: pose({ lean: 35, head: 16, aF1: 60, aF2: 50, aB1: 50, aB2: 60 }),
  curl: pose({ lean: 40, head: 30, aF1: 60, aF2: 120, aB1: 50, aB2: 120, lF1: 80, lF2: -140, lB1: 50, lB2: -140 }),
};

export function mix(a, b, t) {
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const out = {};
  for (const k in a) out[k] = a[k] + (b[k] - a[k]) * t;
  out.flip = t < 0.5 ? a.flip : b.flip;
  return out;
}

const ease = (t) => (t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t));

function attackPose(f) {
  const mv = getMove(f.charId, f.move);
  const P = POSES;
  const [wind, strike] = {
    punch: [P.punchWind, P.punchHit],
    kick: [P.kickWind, P.kickHit],
    jpunch: [P.jumpUp, P.jpunch],
    jkick: [P.jumpUp, P.jkick],
  }[f.move];
  const rest = mv.air ? P.jumpFall : P.idle;
  if (f.sf < mv.startup) return mix(rest, wind, ease(f.sf / mv.startup) * 0.6 + 0.4 * (f.sf / mv.startup));
  if (f.sf < mv.startup + mv.active) return strike;
  return mix(strike, rest, ease((f.sf - mv.startup - mv.active) / mv.recovery));
}

function specialPose(f) {
  const P = POSES;
  switch (f.move) {
    case 'bearSlam':
      if (f.sp === 0) return mix(P.idle, P.slamCrouch, ease(f.sf / 10));
      if (f.sp === 1) return mix(P.jumpUp, P.slamAir, ease(f.sf / 12));
      return mix(P.slamLand, P.idle, ease((f.sf - 8) / 18));
    case 'rocketPunch':
      if (f.sf < 12) return mix(P.idle, P.rocketCharge, ease(f.sf / 10));
      return mix(P.rocketFire, P.idle, ease((f.sf - 24) / 12));
    case 'cyclone': {
      if (f.sf < 8) return mix(P.idle, P.spinWind, ease(f.sf / 7));
      if (f.sf < 38) return { ...P.spin, flip: Math.floor(f.sf / 3) % 2 ? -1 : 1, lift: 4 };
      return mix(P.spin, P.idle, ease((f.sf - 38) / 18));
    }
    case 'curse':
      if (f.sf < 16) return mix(P.idle, P.curseCharge, ease(f.sf / 12));
      return mix(P.curseCast, P.idle, ease((f.sf - 22) / 16));
    case 'giantFist':
      if (f.sp === 0) return mix(P.idle, P.waiKhru, ease(f.sf / 8));
      if (f.sp === 1) return P.giantPunch;
      return mix(P.giantPunch, P.idle, ease(f.sf / 20));
    case 'hauntingCall':
      if (f.sf < 18) return mix(P.idle, P.screamCharge, ease(f.sf / 12));
      return mix(P.screamCast, P.idle, ease((f.sf - 28) / 16));
    case 'flameBeam':
      if (f.sp === 0) return mix(P.idle, P.breathCharge, ease(f.sf / 14));
      if (f.sp === 1) return P.breathFire;
      return mix(P.breathFire, P.idle, ease(f.sf / 18));
    case 'fluffRoll':
      if (f.sp === 0) return mix(P.idle, P.curl, ease(f.sf / 8));
      if (f.sp === 3) return mix(P.curl, P.idle, ease(f.sf / 14));
      return P.curl;
    default:
      return P.idle;
  }
}

// t: render time in seconds, used for idle breathing.
export function getPose(f, t) {
  const P = POSES;
  switch (f.state) {
    case 'idle':
      return mix(P.idle, P.idle2, (Math.sin(t * 4.2 + f.idx * 1.7) + 1) / 2);
    case 'walk': {
      const s = Math.sin(f.x / 13);
      return mix(P.walkA, P.walkB, (s + 1) / 2);
    }
    case 'jump':
      return mix(P.jumpUp, P.jumpFall, (f.vy + 8) / 14);
    case 'attack':
      return attackPose(f);
    case 'special':
      return specialPose(f);
    case 'block':
      return P.block;
    case 'blockstun':
      return mix(P.block, { ...P.block, lean: -16 }, f.sf < 4 ? 1 : 0.4);
    case 'hitstun':
      return mix(P.hit, P.idle, f.sf / (f.sf + f.stun + 6));
    case 'launch':
      return mix(P.launch, { ...P.launch, rot: -80 }, f.sf / 30);
    case 'ko':
      return f.air ? mix(P.launch, { ...P.launch, rot: -85 }, f.sf / 30) : P.down;
    case 'down':
      return P.down;
    case 'getup':
      return mix(P.down, P.idle, ease(f.sf / 20));
    case 'win':
      return mix(P.win, P.win2, (Math.sin(t * 8) + 1) / 2);
    case 'lose':
      return P.lose;
    default:
      return P.idle;
  }
}

export function expressionFor(f) {
  switch (f.state) {
    case 'hitstun':
    case 'launch':
    case 'down':
    case 'ko':
    case 'blockstun':
      return f.state === 'blockstun' ? 'strain' : 'hurt';
    case 'attack':
    case 'special':
      return 'angry';
    case 'win':
      return 'happy';
    case 'lose':
      return 'sad';
    default:
      return 'normal';
  }
}
