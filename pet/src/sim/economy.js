// Coins, crystals, shop, upgrades, daily missions, eggs and rewards.
// These work on the whole save S (see state.js).
import { ITEMS } from '../data/items.js';
import { SPECIES_IDS, formId } from '../data/species.js';
import { createPet, checkLevelUp, MAX_UPGRADE, STAT_KEYS } from './pet.js';
import { dayKey } from './time.js';

export const START_COINS = 60;
export const START_INV = { kibble: 3, milk: 1, potion: 1 };

// ---------------- events & EXP ----------------

// Book-keeping for events coming out of the sim: eggs and the form album.
export function applyEvents(S, events) {
  for (const e of events) {
    if (e.type !== 'level') continue;
    if (e.egg) S.eggs++;
    if (!S.album.includes(e.form)) {
      S.album.push(e.form);
      e.newForm = true;
    }
  }
  return events;
}

export function gainExp(S, pet, n, events = []) {
  pet.exp += n;
  return applyEvents(S, checkLevelUp(pet, events));
}

export function grant(S, pet, r, events = []) {
  S.coins += r.coins || 0;
  S.crystals += r.crystals || 0;
  if (r.exp) gainExp(S, pet, r.exp, events);
  return events;
}

// ---------------- shop & inventory ----------------

export function currencyOf(id) {
  return ITEMS[id].currency === 'crystal' ? 'crystals' : 'coins';
}

export function buy(S, id, qty = 1) {
  const it = ITEMS[id];
  if (!it) return { ok: false, reason: 'unknown' };
  if (it.toy && S.toys.includes(id)) return { ok: false, reason: 'owned' };
  const cur = currencyOf(id);
  const cost = it.price * qty;
  if (S[cur] < cost) return { ok: false, reason: cur === 'crystals' ? 'noCrystals' : 'noCoins' };
  S[cur] -= cost;
  if (it.toy) S.toys.push(id);
  else S.inv[id] = (S.inv[id] || 0) + qty;
  return { ok: true };
}

export function count(S, id) {
  return ITEMS[id]?.price === 0 ? Infinity : S.inv[id] || 0;
}

export function consume(S, id) {
  if (ITEMS[id]?.price === 0) return true;
  if (!S.inv[id]) return false;
  if (--S.inv[id] === 0) delete S.inv[id];
  return true;
}

// ---------------- crystal upgrades ----------------

export function upgradeCost(lvl) {
  return 3 + 2 * lvl;
}

export function upgrade(S, pet, stat) {
  if (!STAT_KEYS.includes(stat)) return { ok: false, reason: 'unknown' };
  const lvl = pet.up[stat] || 0;
  if (lvl >= MAX_UPGRADE) return { ok: false, reason: 'max' };
  const cost = upgradeCost(lvl);
  if (S.crystals < cost) return { ok: false, reason: 'noCrystals' };
  S.crystals -= cost;
  pet.up[stat] = lvl + 1;
  return { ok: true };
}

// ---------------- daily missions & login bonus ----------------

export const MISSIONS = {
  feed: { name: 'ป้อนอาหาร', icon: '🍚', goal: 3 },
  drink: { name: 'ให้น้ำ/เครื่องดื่ม', icon: '💧', goal: 2 },
  bath: { name: 'อาบน้ำ', icon: '🛁', goal: 1 },
  poop: { name: 'เก็บอึ', icon: '💩', goal: 2 },
  pat: { name: 'ลูบหัว', icon: '🤚', goal: 5 },
  quiz: { name: 'ตอบควิซถูก', icon: '📚', goal: 4 },
  game: { name: 'เล่นมินิเกม', icon: '🎡', goal: 1 },
  train: { name: 'ฝึกซ้อม', icon: '🥊', goal: 2 },
  win: { name: 'ชนะการต่อสู้', icon: '⚔️', goal: 2 },
};
export const MISSION_REWARD = { coins: 15, exp: 8 };
export const ALL_DONE_REWARD = { crystals: 2 };

function prevDay(key) {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d - 1, 12).getTime());
}

// Once per local day: new missions + login bonus.
export function rollDaily(S, now, rng, events = []) {
  const today = dayKey(now);
  if (S.daily.day === today) return events;
  const streak = S.daily.day && S.daily.day === prevDay(today) ? S.daily.streak + 1 : 1;
  const ids = Object.keys(MISSIONS);
  const pick = [];
  while (pick.length < 3) {
    const id = ids[Math.floor(rng() * ids.length)];
    if (!pick.includes(id)) pick.push(id);
  }
  S.daily = { day: today, streak, missions: pick.map((id) => ({ id, prog: 0, done: false })), bonus: false };
  const coins = 20 + 5 * (Math.min(streak, 7) - 1);
  S.coins += coins;
  events.push({ type: 'login', coins, streak });
  return events;
}

export function progress(S, pet, kind, n = 1, events = []) {
  for (const m of S.daily.missions || []) {
    if (m.id !== kind || m.done) continue;
    m.prog = Math.min(MISSIONS[kind].goal, m.prog + n);
    if (m.prog >= MISSIONS[kind].goal) {
      m.done = true;
      events.push({ type: 'mission', id: kind, ...MISSION_REWARD });
      grant(S, pet, MISSION_REWARD, events);
    }
  }
  const ms = S.daily.missions || [];
  if (ms.length && !S.daily.bonus && ms.every((m) => m.done)) {
    S.daily.bonus = true;
    events.push({ type: 'missionsAll', ...ALL_DONE_REWARD });
    grant(S, pet, ALL_DONE_REWARD, events);
  }
  return events;
}

// ---------------- eggs ----------------

export function lockedSpecies(S) {
  return SPECIES_IDS.filter((id) => !S.pets.some((p) => p.species === id));
}

export function addPet(S, species, now, name) {
  const pet = createPet(species, now, { name });
  S.pets.push(pet);
  const baby = formId(species, 1, null);
  if (!S.album.includes(baby)) S.album.push(baby);
  return pet;
}

// A mystery egg hatches into a pet you don't have yet (or a treasure).
export function hatchEgg(S, now, rng) {
  if (S.eggs <= 0) return null;
  S.eggs--;
  const locked = lockedSpecies(S);
  if (!locked.length) {
    S.coins += 100;
    S.crystals += 5;
    return { treasure: { coins: 100, crystals: 5 } };
  }
  return { pet: addPet(S, locked[Math.floor(rng() * locked.length)], now) };
}

// ---------------- battle rewards ----------------

export function battleReward(kind, level, win, rng, firstClear = false) {
  if (!win) return { coins: 2, exp: 3, crystals: 0 };
  switch (kind) {
    case 'boss':
      return { coins: 15 + 4 * level, exp: 20 + 3 * level, crystals: 3 };
    case 'arena':
      return { coins: 8 + 3 * level, exp: 10 + 2 * level, crystals: firstClear ? 2 : 0 };
    case 'friend':
      return { coins: 10, exp: 10, crystals: 0 };
    default:
      return { coins: 4 + 2 * level, exp: 8 + 2 * level, crystals: rng() < 0.35 ? 1 : 0 };
  }
}
