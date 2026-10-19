import { FPS, ROUND_TIME, INTRO_FRAMES, END_FRAMES } from '../config.js';
import {
  createFighter, control, physics, transferWallPush, separate, faceOpponent, setState, isActionable,
} from './fighter.js';
import { resolveMelee, updateProjectiles } from './combat.js';

// One-round match. Phases: intro → fight → ko | timeup → result.
export function createMatch({ p1, p2, stage = 'toyroom' }) {
  return {
    frame: 0,
    phase: 'intro',
    pf: 0,
    timer: ROUND_TIME * FPS,
    hitstop: 0,
    winner: null,
    stage,
    f: [createFighter(0, p1), createFighter(1, p2)],
    proj: [],
  };
}

export function stepMatch(m, inputs) {
  const ev = [];
  m.frame++;
  if (m.hitstop > 0) {
    m.hitstop--;
    return ev;
  }
  const live = m.phase === 'fight';
  const [a, b] = m.f;
  control(a, live ? inputs[0] | 0 : 0, b, m, ev);
  control(b, live ? inputs[1] | 0 : 0, a, m, ev);
  physics(a, ev);
  physics(b, ev);
  transferWallPush(a, b);
  separate(a, b);
  faceOpponent(a, b);
  faceOpponent(b, a);
  updateProjectiles(m, ev);
  resolveMelee(m, ev);
  updatePhase(m, ev);
  return ev;
}

function hpRatio(f) {
  return f.hp / f.maxHp;
}

function updatePhase(m, ev) {
  m.pf++;
  const [a, b] = m.f;
  switch (m.phase) {
    case 'intro':
      if (m.pf === 1) ev.push({ type: 'ready' });
      if (m.pf === 70) ev.push({ type: 'fight' });
      if (m.pf >= INTRO_FRAMES) {
        m.phase = 'fight';
        m.pf = 0;
      }
      break;
    case 'fight': {
      const koA = a.hp <= 0;
      const koB = b.hp <= 0;
      if (koA || koB) {
        m.phase = 'ko';
        m.pf = 0;
        m.winner = koA && koB ? 'draw' : koA ? 1 : 0;
        ev.push({ type: 'ko', winner: m.winner });
        break;
      }
      if (--m.timer <= 0) {
        m.timer = 0;
        m.phase = 'timeup';
        m.pf = 0;
        const ra = hpRatio(a);
        const rb = hpRatio(b);
        m.winner = ra === rb ? 'draw' : ra > rb ? 0 : 1;
        ev.push({ type: 'timeup', winner: m.winner });
      }
      break;
    }
    case 'ko':
    case 'timeup':
      for (const f of m.f) {
        if (f.air || !isActionable(f)) continue;
        if (m.winner === f.idx) {
          setState(f, 'win');
          f.vx = 0;
        } else if (m.phase === 'timeup') {
          setState(f, 'lose');
          f.vx = 0;
        }
      }
      if (m.pf >= END_FRAMES) {
        m.phase = 'result';
        m.pf = 0;
        ev.push({ type: 'result', winner: m.winner });
      }
      break;
    default:
      break;
  }
}

export function timerSeconds(m) {
  return Math.ceil(m.timer / FPS);
}
