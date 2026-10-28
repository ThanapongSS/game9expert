// Turn-based battle. Both sides pick an action, then they resolve in
// priority/speed order. Seeded RNG so every battle can be replayed in tests.
import { SKILLS, ELEMENT_SKILL, SCHOOL_SKILLS } from '../data/skills.js';
import { SPECIES, SPECIES_IDS, elementMul } from '../data/species.js';
import { createPet, petStats, learnSkill, checkLevelUp, BRANCH_IDS, LEVEL_EXP, LEVEL_HOURS, HOUR } from './pet.js';

export const SP_START = 2;
export const SP_MAX = 6;
export const MAX_ROUNDS = 30;
export const BASIC = 'tackle'; // always available, costs no SP

export function makeRng(seed) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// look: how the UI draws this fighter, e.g. { pet } or { emoji }.
export function makeFighter({ name, element, level, stats, crit = 0.08, evade = 0.05, skills = [], hpPct = 1, items = 0, smart = 0.7, look = null }) {
  return {
    name,
    element,
    level,
    stats,
    crit,
    evade,
    skills: skills.filter((id) => SKILLS[id] && id !== BASIC),
    maxHp: stats.hp,
    hp: Math.max(1, Math.round(stats.hp * hpPct)),
    sp: SP_START,
    items,
    smart,
    st: { shield: 0, defDown: 0, sleep: 0, focus: false },
    look,
  };
}

export function petFighter(pet, opts = {}) {
  const sp = SPECIES[pet.species];
  return makeFighter({
    name: pet.name,
    element: sp.element,
    level: pet.level,
    stats: petStats(pet),
    crit: sp.crit,
    evade: sp.evade,
    skills: pet.equip,
    hpPct: pet.hpPct,
    look: { pet: { species: pet.species, level: pet.level, branch: pet.branch } },
    ...opts,
  });
}

// ---------------- opponents ----------------

const FOE_BASE = { hp: 56, atk: 11, def: 10, spd: 11, int: 10 };

// Wild foes and bosses in adventure areas. def is an entry from AREAS;
// bossTier is 0 for wild foes, else 1–5 (later areas have tougher bosses).
export function makeFoe(def, level, bossTier = 0) {
  const boss = bossTier > 0;
  const mul = 1 + 0.18 * (level - 1);
  const stats = {};
  for (const k of Object.keys(FOE_BASE)) {
    // foes get a little "training" so they keep up with trained pets
    let v = FOE_BASE[k] * mul + (k === 'hp' ? 3 : 1.2) * (level - 1);
    if (boss) v *= k === 'hp' ? 1.07 + 0.08 * bossTier : 0.97 + 0.03 * bossTier;
    stats[k] = Math.round(v);
  }
  const skills = [];
  skills.push(ELEMENT_SKILL[def.element] || 'quickJab');
  if (level >= 4) skills.push('guard');
  if (level >= 6) skills.push('growl');
  if (boss) skills.push('bossSlam');
  return makeFighter({
    name: def.name,
    element: def.element,
    level,
    stats,
    crit: boss ? 0.1 : 0.06,
    evade: 0.05,
    skills,
    items: boss ? 1 : 0,
    smart: boss ? 0.8 : 0.55,
    look: { emoji: def.emoji, boss },
  });
}

// A synthetic pet as if raised to `level` (arena trainers, tests).
export function buildPet(species, level, rng, { branch = null, train = 1.5, now = 0 } = {}) {
  const pet = createPet(species, now, { id: `npc-${species}-${level}` });
  const br = branch || BRANCH_IDS[Math.floor(rng() * 3)];
  pet.bp[br] = 100;
  pet.vaccines = 3;
  pet.exp = LEVEL_EXP[level];
  pet.ageMs = LEVEL_HOURS[level] * HOUR;
  checkLevelUp(pet);
  for (const k of ['atk', 'def', 'spd', 'int']) pet.train[k] = Math.round(train * level);
  const extra = SCHOOL_SKILLS.filter((id) => rng() < 0.5);
  for (const id of extra) learnSkill(pet, id);
  return pet;
}

export function makeTrainer(rank, name, rng) {
  const species = SPECIES_IDS[Math.floor(rng() * SPECIES_IDS.length)];
  const level = rank + 1;
  const pet = buildPet(species, level, rng, { train: 1.2 + rank * 0.03 });
  pet.name = `${SPECIES[species].name}ของ${name}`;
  return petFighter(pet, { smart: 0.55 + rank * 0.02, items: rank >= 5 ? 1 : 0 });
}

// ---------------- battle ----------------

export function createBattle(a, b, seed = 1) {
  return { f: [a, b], rng: makeRng(seed), round: 1, over: false, winner: -1 };
}

export function canUse(f, id) {
  const s = SKILLS[id];
  return !!s && f.sp >= s.cost;
}

function priority(f, action) {
  if (action.type === 'item') return 2;
  if (action.type === 'skill' && SKILLS[action.id]?.priority && canUse(f, action.id)) return 1;
  return 0;
}

// The basic attack uses whichever of ATK/INT is higher, so magic pets aren't stuck.
function attackStat(me, s) {
  if (s === SKILLS[BASIC]) return Math.max(me.stats.atk, me.stats.int);
  return s.kind === 'magic' ? me.stats.int : me.stats.atk;
}

// Estimated damage of a skill, used by the AI and the UI's hint arrows.
export function estimate(me, foe, id) {
  const s = SKILLS[id];
  if (s.kind !== 'physical' && s.kind !== 'magic') return 0;
  const el = s.element === 'self' ? me.element : s.element;
  const atk = attackStat(me, s);
  const def = foe.stats.def * (foe.st.defDown > 0 ? 0.6 : 1);
  let d = ((s.power * atk) / (def + 20)) * elementMul(el, foe.element) * (s.hits || 1);
  if (foe.st.shield > 0) d *= 0.5;
  if (me.st.focus) d *= 1.5;
  if (s.kind === 'physical') d *= 1 - foe.evade;
  return d;
}

function attack(b, i, s, ev) {
  const me = b.f[i];
  const foe = b.f[1 - i];
  const el = s.element === 'self' ? me.element : s.element;
  const mul = elementMul(el, foe.element);
  const focus = me.st.focus;
  me.st.focus = false;
  for (let h = 0; h < (s.hits || 1) && foe.hp > 0; h++) {
    if (s.kind === 'physical' && b.rng() < foe.evade) {
      ev.push({ t: 'miss', who: 1 - i });
      continue;
    }
    const atk = attackStat(me, s);
    const def = foe.stats.def * (foe.st.defDown > 0 ? 0.6 : 1);
    let dmg = ((s.power * atk) / (def + 20)) * mul * (0.85 + 0.3 * b.rng());
    const crit = b.rng() < (s.crit ?? me.crit);
    if (crit) dmg *= 1.5;
    if (foe.st.shield > 0) dmg *= 0.5;
    if (focus) dmg *= 1.5;
    dmg = Math.max(1, Math.round(dmg));
    foe.hp = Math.max(0, foe.hp - dmg);
    ev.push({ t: 'hit', who: 1 - i, dmg, crit, eff: mul > 1 ? 'strong' : mul < 1 ? 'weak' : null, shield: foe.st.shield > 0 });
  }
}

function heal(f, pct, i, ev) {
  const amt = Math.min(f.maxHp - f.hp, Math.round(f.maxHp * pct));
  f.hp += amt;
  ev.push({ t: 'heal', who: i, amt });
}

function act(b, i, action, ev) {
  const me = b.f[i];
  const foe = b.f[1 - i];
  if (me.hp <= 0 || foe.hp <= 0) return;
  if (me.st.sleep > 0) {
    me.st.sleep--;
    ev.push({ t: 'asleep', who: i });
    return;
  }
  if (action.type === 'item' && me.items > 0) {
    me.items--;
    ev.push({ t: 'item', who: i, id: action.id });
    heal(me, action.heal, i, ev);
    return;
  }
  const id = action.type === 'skill' && canUse(me, action.id) ? action.id : BASIC;
  const s = SKILLS[id];
  me.sp -= s.cost;
  ev.push({ t: 'use', who: i, id });
  if (s.kind === 'physical' || s.kind === 'magic') attack(b, i, s, ev);
  // statuses on the foe count the actions taken against it
  if (foe.st.shield > 0) foe.st.shield--;
  if (foe.st.defDown > 0) foe.st.defDown--;
  switch (s.kind) {
    case 'shield':
      me.st.shield = s.turns;
      ev.push({ t: 'shield', who: i });
      break;
    case 'heal':
      heal(me, s.power / 100, i, ev);
      break;
    case 'sleep':
      if (s.chance && b.rng() > s.chance) ev.push({ t: 'fail', who: 1 - i });
      else {
        foe.st.sleep = 1;
        ev.push({ t: 'sleep', who: 1 - i });
      }
      if (s.power) heal(me, s.power / 100, i, ev);
      break;
    case 'focus':
      me.st.focus = true;
      ev.push({ t: 'focus', who: i });
      break;
    case 'debuff':
      foe.st.defDown = s.turns;
      ev.push({ t: 'debuff', who: 1 - i });
      break;
    default:
      break;
  }
  if (foe.hp <= 0) ev.push({ t: 'faint', who: 1 - i });
}

// Resolve one round. actions: [{ type: 'skill', id } | { type: 'item', id, heal }, ...]
export function resolveRound(b, actions) {
  const ev = [];
  if (b.over) return ev;
  const [a, c] = b.f;
  const pa = priority(a, actions[0]);
  const pc = priority(c, actions[1]);
  let first;
  if (pa !== pc) first = pa > pc ? 0 : 1;
  else if (a.stats.spd !== c.stats.spd) first = a.stats.spd > c.stats.spd ? 0 : 1;
  else first = b.rng() < 0.5 ? 0 : 1;
  act(b, first, actions[first], ev);
  act(b, 1 - first, actions[1 - first], ev);
  if (a.hp <= 0 || c.hp <= 0) {
    b.over = true;
    b.winner = a.hp > 0 ? 0 : 1;
  } else {
    for (const f of b.f) f.sp = Math.min(SP_MAX, f.sp + 1);
    b.round++;
    if (b.round > MAX_ROUNDS) {
      b.over = true;
      b.winner = a.hp / a.maxHp >= c.hp / c.maxHp ? 0 : 1;
      ev.push({ t: 'timeout' });
    }
  }
  if (b.over) ev.push({ t: 'end', winner: b.winner });
  return ev;
}

// ---------------- AI ----------------

function score(me, foe, id) {
  const s = SKILLS[id];
  const hpPct = me.hp / me.maxHp;
  switch (s.kind) {
    case 'physical':
    case 'magic': {
      const d = estimate(me, foe, id);
      return d >= foe.hp ? d + 100 : d; // finishing blows first
    }
    case 'heal':
      return hpPct < 0.5 ? (1 - hpPct) * 60 : 0;
    case 'sleep':
      return foe.st.sleep ? 0 : (s.chance || 1) * 22 + (s.power && hpPct < 0.6 ? 18 : 0);
    case 'shield':
      return me.st.shield ? 0 : foe.sp >= 4 ? 18 : 6;
    case 'focus':
      return me.st.focus ? 0 : me.sp >= 4 ? 16 : 4;
    case 'debuff':
      return foe.st.defDown ? 0 : 14;
    default:
      return 0;
  }
}

export function aiChoose(b, i) {
  const me = b.f[i];
  const foe = b.f[1 - i];
  const rng = b.rng;
  if (me.items > 0 && me.hp < me.maxHp * 0.3 && rng() < 0.7) return { type: 'item', id: 'potion', heal: 0.4 };
  const options = [BASIC, ...me.skills].filter((id) => canUse(me, id));
  if (rng() < me.smart) {
    let best = BASIC;
    let bestScore = -1;
    for (const id of options) {
      const sc = score(me, foe, id);
      if (sc > bestScore) {
        best = id;
        bestScore = sc;
      }
    }
    return { type: 'skill', id: best };
  }
  return { type: 'skill', id: options[Math.floor(rng() * options.length)] };
}

// Let the AI play both sides to the end (tests, balance checks).
export function autoBattle(a, b, seed = 1) {
  const bt = createBattle(a, b, seed);
  while (!bt.over) resolveRound(bt, [aiChoose(bt, 0), aiChoose(bt, 1)]);
  return bt;
}

