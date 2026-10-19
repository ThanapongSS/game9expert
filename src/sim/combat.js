import { W } from '../config.js';
import { CHARACTERS } from '../characters/index.js';
import { getMove } from './moves.js';
import { SPECIALS } from './specials.js';
import { hurtbox, vulnerable, gainEnergy } from './fighter.js';

export function worldBox(f, box) {
  const x = f.facing === 1 ? f.x + box.x : f.x - box.x - box.w;
  return { x, y: f.y + box.y, w: box.w, h: box.h };
}

export function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function centerOfOverlap(a, b) {
  const x0 = Math.max(a.x, b.x);
  const x1 = Math.min(a.x + a.w, b.x + b.w);
  const y0 = Math.max(a.y, b.y);
  const y1 = Math.min(a.y + a.h, b.y + b.h);
  return { x: (x0 + x1) / 2, y: (y0 + y1) / 2 };
}

// The hit (if any) this fighter is currently trying to land.
export function activeAttack(f, opp, m) {
  if (f.state === 'attack') {
    const mv = getMove(f.charId, f.move);
    if (f.hits === 0 && f.sf >= mv.startup && f.sf < mv.startup + mv.active) {
      return { ...mv, box: worldBox(f, mv.box) };
    }
  } else if (f.state === 'special') {
    const h = SPECIALS[CHARACTERS[f.charId].special].hitbox?.(f, opp, m);
    if (h) return { ...h, box: worldBox(f, h.box) };
  }
  return null;
}

// dir: +1 pushes the defender to the right.
export function applyHit(m, att, def, h, dir, ev) {
  const at = centerOfOverlap(h.box, hurtbox(def));
  const guarding = (def.state === 'block' || def.state === 'blockstun') && !def.air && def.facing === -dir;
  const chip = Math.round(h.dmg * 0.15);

  // Lethal chip damage is not blocked, so a turtling doll at 1 HP can still be K.O.'d.
  if (guarding && def.hp > chip) {
    def.hp -= chip;
    def.state = 'blockstun';
    def.sf = 0;
    def.stun = h.blockstun;
    def.push = dir * h.push * 1.2;
    def.vx = 0;
    gainEnergy(att, 4);
    gainEnergy(def, 3);
    m.hitstop = Math.max(m.hitstop, 4);
    ev.push({ type: 'block', x: at.x, y: at.y, att: att.idx, def: def.idx });
    return;
  }

  def.combo = def.state === 'hitstun' ? def.combo + 1 : 1;
  const scale = Math.max(0.4, 1 - 0.15 * (def.combo - 1));
  const dmg = Math.max(1, Math.round(h.dmg * scale));
  def.hp = Math.max(0, def.hp - dmg);
  gainEnergy(att, h.energy ?? 8);
  gainEnergy(def, 6);
  def.flash = 8;
  def.move = null;
  if (h.slow) def.slow = h.slow;

  if (def.hp === 0) {
    def.state = 'ko';
    def.sf = 0;
    def.air = true;
    def.vy = -10;
    def.vx = dir * 4.5;
    def.push = 0;
  } else if (h.knockdown || def.air) {
    def.state = 'launch';
    def.sf = 0;
    def.air = true;
    def.vy = -8.5;
    def.vx = dir * 4;
    def.push = 0;
  } else {
    def.state = 'hitstun';
    def.sf = 0;
    def.stun = h.hitstun;
    def.push = dir * h.push;
    def.vx = 0;
  }
  m.hitstop = Math.max(m.hitstop, def.hp === 0 ? 24 : h.hitstop || 5);
  ev.push({
    type: 'hit', x: at.x, y: at.y, dmg, combo: def.combo,
    heavy: !!h.knockdown || dmg >= 90, ko: def.hp === 0,
    mat: CHARACTERS[def.charId].material, att: att.idx, def: def.idx,
  });
}

// Melee hits are collected first and then applied so simultaneous hits trade.
export function resolveMelee(m, ev) {
  const [a, b] = m.f;
  const hits = [];
  for (const [att, def] of [[a, b], [b, a]]) {
    const h = activeAttack(att, def, m);
    if (!h || !vulnerable(def)) continue;
    if (h.groundOnly && def.air) continue;
    if (!overlaps(h.box, hurtbox(def))) continue;
    hits.push([att, def, h]);
  }
  for (const [att, def, h] of hits) {
    att.hits++;
    if (h.win !== undefined) att.hw = h.win;
    applyHit(m, att, def, h, att.facing, ev);
  }
}

export function projectileBox(p) {
  return { x: p.x - p.w / 2, y: p.y - p.h / 2, w: p.w, h: p.h };
}

export function updateProjectiles(m, ev) {
  for (const p of m.proj) {
    p.x += p.vx;
    p.t++;
    p.life--;
  }
  for (let i = 0; i < m.proj.length; i++) {
    for (let j = i + 1; j < m.proj.length; j++) {
      const p = m.proj[i];
      const q = m.proj[j];
      if (p.owner !== q.owner && !p.dead && !q.dead && overlaps(projectileBox(p), projectileBox(q))) {
        p.dead = q.dead = true;
        ev.push({ type: 'clash', x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });
      }
    }
  }
  for (const p of m.proj) {
    if (p.dead) continue;
    const def = m.f[1 - p.owner];
    const box = projectileBox(p);
    if (vulnerable(def) && overlaps(box, hurtbox(def))) {
      p.dead = true;
      applyHit(m, m.f[p.owner], def, { ...p, box }, Math.sign(p.vx), ev);
    }
  }
  m.proj = m.proj.filter((p) => !p.dead && p.life > 0 && p.x > -80 && p.x < W + 80);
}
