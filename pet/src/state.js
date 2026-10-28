// The save: create, tick (offline catch-up), persist, and share as codes.
import { createStorage } from '../../src/storage.js';
import { AREA_IDS } from './data/areas.js';
import { SPECIES } from './data/species.js';
import { SKILLS } from './data/skills.js';
import { advancePet } from './sim/time.js';
import { applyEvents, addPet, rollDaily, START_COINS, START_INV } from './sim/economy.js';
import { petStats, BRANCH_IDS, STAT_KEYS, MAX_EQUIP } from './sim/pet.js';
import { makeFighter } from './sim/battle.js';

export const SAVE_VERSION = 1;
export const store = createStorage('yogurthouse.');

export function newSave(now, rng) {
  return {
    v: SAVE_VERSION,
    created: now,
    lastTs: now,
    home: AREA_IDS[Math.floor(rng() * AREA_IDS.length)],
    coins: START_COINS,
    crystals: 0,
    inv: { ...START_INV },
    toys: [],
    pets: [],
    activeId: null,
    eggs: 0,
    album: [],
    badges: [],
    areaWins: {},
    arenaRank: 0,
    stickers: 0,
    record: { wins: 0, losses: 0 },
    daily: { day: null, streak: 0, missions: [], bonus: false },
    tutorial: {},
  };
}

export function activePet(S) {
  return S.pets.find((p) => p.id === S.activeId) || null;
}

export function adopt(S, species, now, name) {
  const pet = addPet(S, species, now, name);
  S.activeId = pet.id;
  return pet;
}

// Bring the save up to `now`. Only the active pet lives through the time;
// the others rest at the pet hotel with their clocks paused.
export function tick(S, now, rng) {
  const events = [];
  const pet = activePet(S);
  if (pet && now > S.lastTs) advancePet(pet, S.lastTs, now, events);
  S.lastTs = Math.max(S.lastTs, now);
  applyEvents(S, events);
  rollDaily(S, now, rng, events);
  return events;
}

export function switchPet(S, id, now, rng) {
  const events = tick(S, now, rng);
  if (S.pets.some((p) => p.id === id)) S.activeId = id;
  return events;
}

export function moveHome(S, areaId) {
  if (AREA_IDS.includes(areaId)) S.home = areaId;
}

// ---------------- persistence ----------------

export function saveGame(S) {
  return store.set('save', S);
}

export function loadGame() {
  const S = store.get('save');
  return S && validSave(S) ? migrate(S) : null;
}

export function migrate(S) {
  // v1 is the first format; future versions upgrade here.
  S.v = SAVE_VERSION;
  return S;
}

function validSave(S) {
  return (
    S &&
    typeof S === 'object' &&
    Array.isArray(S.pets) &&
    S.pets.every((p) => SPECIES[p?.species] && p.level >= 1 && p.level <= 10 && p.needs) &&
    Number.isFinite(S.coins) &&
    Number.isFinite(S.lastTs)
  );
}

// ---------------- codes ----------------

const BACKUP_TAG = 'YH1';
const PET_TAG = 'YHP1';

function fnv(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

function b64encode(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64decode(s) {
  let b = s.replace(/-/g, '+').replace(/_/g, '/');
  while (b.length % 4) b += '=';
  const bin = atob(b);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function encode(tag, obj) {
  const body = b64encode(JSON.stringify(obj));
  return `${tag}.${body}.${fnv(tag + body)}`;
}

function decode(tag, code) {
  const clean = String(code).replace(/\s+/g, '');
  const parts = clean.split('.');
  if (parts.length !== 3 || parts[0] !== tag) throw new Error('รหัสไม่ถูกต้อง');
  if (fnv(tag + parts[1]) !== parts[2]) throw new Error('รหัสไม่ครบหรือถูกแก้ไข ลองคัดลอกใหม่อีกครั้ง');
  try {
    return JSON.parse(b64decode(parts[1]));
  } catch {
    throw new Error('รหัสเสียหาย');
  }
}

export function encodeBackup(S) {
  return encode(BACKUP_TAG, S);
}

export function decodeBackup(code) {
  const S = decode(BACKUP_TAG, code);
  if (!validSave(S)) throw new Error('รหัสนี้ไม่ใช่เซฟของบ้านโยเกิร์ต');
  return migrate(S);
}

// A pet code is a battle snapshot a friend can fight against.
export function encodePet(pet, owner = '') {
  const st = petStats(pet, false);
  return encode(PET_TAG, {
    n: pet.name.slice(0, 24),
    o: String(owner).slice(0, 24),
    s: pet.species,
    l: pet.level,
    b: pet.branch,
    st: STAT_KEYS.map((k) => st[k]),
    e: pet.equip.slice(0, MAX_EQUIP),
  });
}

// Generous upper bounds: anything above was edited by hand.
const STAT_CAP = { hp: 400, atk: 150, def: 150, spd: 150, int: 150 };

export function decodePet(code) {
  const d = decode(PET_TAG, code);
  const ok =
    d &&
    SPECIES[d.s] &&
    Number.isInteger(d.l) &&
    d.l >= 1 &&
    d.l <= 10 &&
    (d.b === null || BRANCH_IDS.includes(d.b)) &&
    Array.isArray(d.st) &&
    d.st.length === STAT_KEYS.length &&
    STAT_KEYS.every((k, i) => Number.isFinite(d.st[i]) && d.st[i] >= 1 && d.st[i] <= STAT_CAP[k]) &&
    Array.isArray(d.e) &&
    d.e.length <= MAX_EQUIP &&
    d.e.every((id) => SKILLS[id] && id !== 'bossSlam');
  if (!ok) throw new Error('ข้อมูลสัตว์ในรหัสไม่ถูกต้อง');
  return {
    name: String(d.n || SPECIES[d.s].name).slice(0, 24),
    owner: String(d.o || '').slice(0, 24),
    species: d.s,
    level: d.l,
    branch: d.b,
    stats: Object.fromEntries(STAT_KEYS.map((k, i) => [k, Math.round(d.st[i])])),
    equip: d.e,
  };
}

export function friendFighter(snap) {
  const sp = SPECIES[snap.species];
  return makeFighter({
    name: snap.name,
    element: sp.element,
    level: snap.level,
    stats: snap.stats,
    crit: sp.crit,
    evade: sp.evade,
    skills: snap.equip,
    smart: 0.75,
    look: { pet: { species: snap.species, level: snap.level, branch: snap.branch } },
  });
}

