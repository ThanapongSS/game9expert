// A pet: needs, growth (real age AND EXP), vaccines, branch points,
// evolution, skills and battle stats. Pure data + functions, no DOM.
import { SPECIES, formId } from '../data/species.js';
import { SKILLS, ELEMENT_SKILL, BRANCH_SKILL, ULTIMATE, SCHOOL_SKILLS } from '../data/skills.js';

export const HOUR = 3600000;
export const MAX_LEVEL = 10;
// A level is reached when real age (hours) AND cumulative EXP both meet it.
export const LEVEL_HOURS = [0, 0, 1, 3, 6, 10, 15, 21, 28, 37, 48];
export const LEVEL_EXP = [0, 0, 20, 50, 90, 140, 200, 270, 350, 440, 540];
// Vaccine dose n opens at VACCINE_LEVELS[n-1] and is required before VACCINE_GATE level.
export const VACCINE_LEVELS = [2, 5, 8];
export const VACCINE_GATE = { 3: 1, 6: 2, 9: 3 };
export const EGG_LEVELS = [5, 10];

export const NEED_KEYS = ['hunger', 'thirst', 'clean', 'fun', 'energy'];
export const STAT_KEYS = ['hp', 'atk', 'def', 'spd', 'int'];
export const BRANCH_IDS = ['fighter', 'sage', 'charm'];
export const MAX_EQUIP = 4;
export const MAX_UPGRADE = 5;

// Tie-break when branch points are equal: each pet's natural lean.
const LEAN = { yogurt: 'charm', phidam: 'fighter', pongfu: 'fighter', fuji: 'sage', chako: 'fighter' };

// School skills open as the pet grows.
export const SCHOOL_LEVEL = { guard: 1, focus: 2, growl: 3, quickJab: 4, yawn: 5 };

const zeroStats = () => ({ hp: 0, atk: 0, def: 0, spd: 0, int: 0 });
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

let seq = 0;
export function createPet(species, now, opts = {}) {
  if (!SPECIES[species]) throw new Error(`unknown species ${species}`);
  const pet = {
    id: opts.id ?? `p${now.toString(36)}${(seq++).toString(36)}`,
    species,
    name: opts.name || SPECIES[species].name,
    born: now,
    ageMs: 0, // only grows while this pet is the active one
    boostMs: 0, // growth time saved with grow milk
    level: 1,
    exp: 0,
    branch: null,
    bp: { fighter: 0, sage: 0, charm: 0 },
    needs: { hunger: 80, thirst: 80, clean: 90, fun: 70, energy: 90 },
    hpPct: 1,
    poop: 0,
    poopMs: 0,
    badHours: 0,
    sick: false,
    nap: false,
    wakeUntil: 0,
    vaccines: 0,
    train: zeroStats(),
    up: zeroStats(),
    skills: [],
    equip: [],
    lastPat: 0,
  };
  learnSkill(pet, ELEMENT_SKILL[SPECIES[species].element], true);
  return pet;
}

// ---------------- needs & mood ----------------

export function addNeeds(pet, delta) {
  for (const k of NEED_KEYS) {
    if (delta[k]) pet.needs[k] = clamp(pet.needs[k] + delta[k], 0, 100);
  }
}

export function vaccineAvailable(pet) {
  const n = pet.vaccines;
  return n < VACCINE_LEVELS.length && pet.level >= VACCINE_LEVELS[n];
}

export function lowNeeds(pet) {
  const n = pet.needs;
  return n.hunger < 25 || n.thirst < 25 || n.energy < 15;
}

export function mood(pet, asleep) {
  const n = pet.needs;
  if (pet.sick) return 'sick';
  if (asleep) return 'sleep';
  if (n.clean < 30 || pet.poop >= 2) return 'dirty';
  if (Math.min(n.hunger, n.thirst, n.fun) < 30 || n.energy < 15) return 'sad';
  if ((n.hunger + n.thirst + n.clean + n.fun) / 4 > 72) return 'happy';
  return 'idle';
}

// ---------------- growth ----------------

export function addBranch(pet, branch, n) {
  pet.bp[branch] = (pet.bp[branch] || 0) + n;
}

export function leaningBranch(pet) {
  let best = LEAN[pet.species];
  for (const b of BRANCH_IDS) if (pet.bp[b] > pet.bp[best]) best = b;
  return best;
}

// Why the pet can't grow right now (null = it can).
export function levelBlock(pet) {
  if (pet.level >= MAX_LEVEL) return { kind: 'max' };
  const next = pet.level + 1;
  const dose = VACCINE_GATE[next];
  if (dose && pet.vaccines < dose) return { kind: 'vaccine', dose };
  if (pet.exp < LEVEL_EXP[next]) return { kind: 'exp', need: LEVEL_EXP[next] - pet.exp };
  const wait = LEVEL_HOURS[next] * HOUR - (pet.ageMs + pet.boostMs);
  if (wait > 0) return { kind: 'time', ms: wait };
  return null;
}

export function checkLevelUp(pet, events = []) {
  while (!levelBlock(pet)) {
    const before = formId(pet.species, pet.level, pet.branch);
    pet.level++;
    const learned = onLevel(pet);
    const form = formId(pet.species, pet.level, pet.branch);
    events.push({
      type: 'level',
      petId: pet.id,
      level: pet.level,
      form,
      evolved: form !== before,
      branch: pet.branch,
      learned,
      egg: EGG_LEVELS.includes(pet.level),
    });
  }
  return events;
}

function onLevel(pet) {
  const sp = SPECIES[pet.species];
  const learned = [];
  const learn = (id) => {
    if (learnSkill(pet, id, true)) learned.push(id);
  };
  switch (pet.level) {
    case 4:
      pet.branch = leaningBranch(pet);
      learn(BRANCH_SKILL[pet.branch]);
      // halve the points so the Lv8 decision can still change course
      for (const b of BRANCH_IDS) pet.bp[b] = Math.floor(pet.bp[b] / 2);
      break;
    case 6:
      learn(sp.signature);
      break;
    case 8: {
      const old = pet.branch;
      pet.branch = leaningBranch(pet);
      if (old && old !== pet.branch) {
        replaceSkill(pet, BRANCH_SKILL[old], BRANCH_SKILL[pet.branch]);
        learned.push(BRANCH_SKILL[pet.branch]);
      }
      learn(ULTIMATE[pet.branch]);
      break;
    }
    default:
      break;
  }
  return learned;
}

// ---------------- skills ----------------

// Level skills push out school skills when the 4 slots are full;
// school skills only fill free slots (the player can swap later).
export function learnSkill(pet, id, levelSkill = false) {
  if (!SKILLS[id] || pet.skills.includes(id)) return false;
  pet.skills.push(id);
  if (pet.equip.length < MAX_EQUIP) pet.equip.push(id);
  else if (levelSkill) {
    const i = pet.equip.findIndex((s) => SCHOOL_SKILLS.includes(s));
    if (i >= 0) pet.equip[i] = id;
  }
  return true;
}

function replaceSkill(pet, oldId, newId) {
  pet.skills = pet.skills.filter((s) => s !== oldId);
  if (!pet.skills.includes(newId)) pet.skills.push(newId);
  const i = pet.equip.indexOf(oldId);
  if (i >= 0) pet.equip[i] = newId;
  else if (pet.equip.length < MAX_EQUIP) pet.equip.push(newId);
}

export function toggleEquip(pet, id) {
  const i = pet.equip.indexOf(id);
  if (i >= 0) {
    pet.equip.splice(i, 1);
    return true;
  }
  if (!pet.skills.includes(id) || pet.equip.length >= MAX_EQUIP) return false;
  pet.equip.push(id);
  return true;
}

export function schoolSkillsFor(pet) {
  return SCHOOL_SKILLS.filter((id) => pet.level >= SCHOOL_LEVEL[id]);
}

// ---------------- stats ----------------

export function trainCap(pet) {
  return 2 + 2 * pet.level;
}

// Battle stats. withMods=false gives the pet's "true" strength (for pet codes).
export function petStats(pet, withMods = true) {
  const sp = SPECIES[pet.species];
  const mul = 1 + 0.18 * (pet.level - 1);
  const s = {};
  for (const k of STAT_KEYS) {
    s[k] = sp.base[k] * mul + (pet.train[k] || 0) + (pet.up[k] || 0) * (k === 'hp' ? 6 : 2);
  }
  if (pet.branch === 'fighter') s.atk *= 1.15;
  else if (pet.branch === 'sage') s.int *= 1.15;
  else if (pet.branch === 'charm') {
    s.spd *= 1.1;
    s.hp *= 1.1;
  }
  let m = pet.level >= MAX_LEVEL ? 1.08 : 1;
  if (withMods) {
    if (pet.sick) m *= 0.8;
    else if (lowNeeds(pet)) m *= 0.9;
  }
  for (const k of STAT_KEYS) s[k] = Math.max(1, Math.round(s[k] * m));
  return s;
}

export function addTraining(pet, stat, n) {
  const before = pet.train[stat] || 0;
  pet.train[stat] = Math.min(trainCap(pet), before + n);
  return pet.train[stat] - before;
}
