import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPet, checkLevelUp, levelBlock, petStats, LEVEL_EXP, LEVEL_HOURS, HOUR } from '../pet/src/sim/pet.js';
import { advancePet, isNight, MINUTE } from '../pet/src/sim/time.js';
import { makeRng, petFighter, makeFoe, createBattle, aiChoose, resolveRound } from '../pet/src/sim/battle.js';
import { buy, hatchEgg } from '../pet/src/sim/economy.js';
import * as care from '../pet/src/sim/care.js';
import { newSave, adopt, tick, activePet } from '../pet/src/state.js';
import { AREAS } from '../pet/src/data/areas.js';
import { SPECIES } from '../pet/src/data/species.js';

process.env.TZ = 'Asia/Bangkok';
const at = (d, h, m = 0) => new Date(2026, 0, d, h, m).getTime();

test('needs decay while awake, barely at night', () => {
  const day = createPet('yogurt', 0);
  advancePet(day, at(5, 9), at(5, 12));
  assert.ok(Math.abs(day.needs.hunger - (80 - 24)) < 0.01, `hunger ${day.needs.hunger}`);
  assert.ok(Math.abs(day.needs.thirst - (80 - 30)) < 0.01);

  const night = createPet('yogurt', 0);
  advancePet(night, at(5, 21), at(5, 24));
  assert.ok(Math.abs(night.needs.hunger - (80 - 24 * 0.2)) < 0.01, `night hunger ${night.needs.hunger}`);
  assert.ok(isNight(at(5, 21)) && isNight(at(6, 6)) && !isNight(at(6, 7)));
});

test('poop every 150 awake minutes, max 3, and it dirties faster', () => {
  const p = createPet('pongfu', 0);
  advancePet(p, at(5, 8), at(5, 8) + 150 * MINUTE);
  assert.equal(p.poop, 1);
  advancePet(p, at(5, 10, 30), at(5, 19, 30));
  assert.equal(p.poop, 3);
});

test('neglect makes a pet sick but never kills it; medicine cures', () => {
  const S = newSave(at(5, 8), makeRng(1));
  const pet = adopt(S, 'fuji', at(5, 8));
  tick(S, at(8, 8), makeRng(2));
  assert.ok(pet.sick);
  for (const v of Object.values(pet.needs)) assert.ok(v >= 0 && v <= 100);
  assert.ok(petStats(pet).atk < petStats({ ...pet, sick: false }).atk);
  assert.equal(care.blocked(pet, at(8, 9), 'battle'), 'sick');
  S.inv.medicine = 1;
  assert.ok(care.useMedicine(S, pet, 'medicine').ok);
  assert.equal(pet.sick, false);
});

test('growth needs age AND exp, and vaccines gate Lv3/6/9', () => {
  const p = createPet('chako', 0);
  p.exp = 10_000;
  p.ageMs = 2 * HOUR;
  checkLevelUp(p);
  assert.equal(p.level, 2);
  assert.equal(levelBlock(p).kind, 'vaccine');
  p.vaccines = 1;
  checkLevelUp(p);
  assert.equal(p.level, 2); // still too young for Lv3
  assert.equal(levelBlock(p).kind, 'time');
  p.ageMs = 48 * HOUR;
  checkLevelUp(p);
  assert.equal(p.level, 5);
  p.vaccines = 3;
  checkLevelUp(p);
  assert.equal(p.level, 10);

  const young = createPet('chako', 0);
  young.ageMs = 48 * HOUR;
  young.vaccines = 3;
  young.exp = LEVEL_EXP[6];
  checkLevelUp(young);
  assert.equal(young.level, 6);
  assert.equal(levelBlock(young).kind, 'exp');
});

test('branch follows how the pet was raised; Lv8 can change it', () => {
  const p = createPet('yogurt', 0);
  p.vaccines = 3;
  p.ageMs = LEVEL_HOURS[10] * HOUR;
  p.bp.fighter = 30;
  p.exp = LEVEL_EXP[4];
  checkLevelUp(p);
  assert.equal(p.branch, 'fighter');
  assert.ok(p.equip.includes('powerStrike'));
  p.bp.sage += 40;
  p.exp = LEVEL_EXP[8];
  checkLevelUp(p);
  assert.equal(p.branch, 'sage');
  assert.ok(p.equip.includes('mindBeam') && !p.equip.includes('powerStrike'));
  assert.ok(p.equip.includes('starfall') && p.equip.includes('fluffRoll'));
  assert.ok(p.equip.length <= 4);
  // ties fall back to the species' natural lean
  const q = createPet('fuji', 0);
  q.vaccines = 1;
  q.ageMs = 10 * HOUR;
  q.exp = LEVEL_EXP[4];
  checkLevelUp(q);
  assert.equal(q.branch, 'sage');
});

test('eggs at Lv5 and Lv10 hatch into new species', () => {
  const S = newSave(0, makeRng(3));
  const pet = adopt(S, 'yogurt', at(5, 8));
  pet.vaccines = 3;
  pet.exp = 10_000;
  tick(S, at(7, 9), makeRng(4));
  assert.equal(pet.level, 10);
  assert.equal(S.eggs, 2);
  const r1 = hatchEgg(S, at(7, 9), makeRng(5));
  const r2 = hatchEgg(S, at(7, 9), makeRng(6));
  assert.ok(r1.pet && r2.pet && r1.pet.species !== 'yogurt' && r2.pet.species !== r1.pet.species);
  assert.equal(S.pets.length, 3);
  assert.equal(S.eggs, 0);
});

test('inactive pets are paused', () => {
  const S = newSave(at(5, 8), makeRng(1));
  const a = adopt(S, 'yogurt', at(5, 8));
  const b = adopt(S, 'phidam', at(5, 8));
  assert.equal(activePet(S), b);
  tick(S, at(5, 12), makeRng(1));
  assert.equal(a.ageMs, 0);
  assert.equal(a.needs.hunger, 80);
  assert.equal(b.ageMs, 4 * HOUR);
});

// ---- a realistic 48h of play: 4–5 visits a day doing everyday things ----

function playSession(S, now, rng, log) {
  tick(S, now, rng);
  const pet = activePet(S);
  if (care.blocked(pet, now, 'care') === 'asleep') return;
  if (pet.sick) care.hospitalCure(S, pet);
  if (care.vaccinate(S, pet).ok) log.push(`vaccine ${pet.vaccines} @${pet.level}`);
  while (pet.poop) care.scoop(S, pet);
  const food = SPECIES[pet.species].fav;
  for (let i = 0; i < 3 && pet.needs.hunger < 80; i++) {
    if (!S.inv[food]) buy(S, food, 1);
    care.feed(S, pet, food, now);
  }
  for (let i = 0; i < 3 && pet.needs.thirst < 80; i++) care.feed(S, pet, 'water', now);
  if (pet.needs.clean < 60) care.bath(S, pet, now);
  for (let i = 0; i < 3; i++) care.pat(S, pet, now + i * 3 * MINUTE);
  care.hospitalHeal(pet);
  care.quizDone(S, pet, 3 + Math.floor(rng() * 3), now);
  care.gameDone(S, pet, 0.4 + rng() * 0.5, now);
  for (const stat of ['atk', 'def']) care.trainDone(S, pet, stat, 1 + Math.floor(rng() * 2), now);
  const area = [...AREAS].reverse().find((a) => pet.level >= a.levels[0]);
  for (let i = 0; i < 3; i++) {
    if (care.blocked(pet, now, 'battle')) break;
    const lvl = Math.max(area.levels[0], Math.min(area.levels[1], pet.level));
    const b = createBattle(petFighter(pet), makeFoe(area.foes[i % 2], lvl), Math.floor(rng() * 1e9));
    while (!b.over) resolveRound(b, [aiChoose(b, 0), aiChoose(b, 1)]);
    care.battleDone(S, pet, { kind: 'wild', area: area.id, level: lvl }, b, rng);
    log.push(`${b.winner === 0 ? 'W' : 'L'}`);
    care.hospitalHeal(pet);
  }
}

test('typical play reaches Lv10 at about 48 hours', () => {
  const rng = makeRng(42);
  const start = at(5, 10);
  const S = newSave(start, rng);
  const pet = adopt(S, 'yogurt', start);
  const visits = [
    [5, 10], [5, 12], [5, 16], [5, 19],
    [6, 8], [6, 12], [6, 16], [6, 19],
    [7, 8], [7, 10], [7, 12], [7, 16],
  ];
  const log = [];
  let reached = null;
  const levels = [];
  for (const [d, h] of visits) {
    const now = at(d, h);
    playSession(S, now, rng, log);
    levels.push(`${(now - start) / HOUR}h:Lv${pet.level}`);
    if (pet.level === 10 && reached === null) reached = (now - start) / HOUR;
  }
  const wins = log.filter((x) => x === 'W').length;
  const losses = log.filter((x) => x === 'L').length;
  console.log(levels.join(' '), `exp=${pet.exp} wins=${wins} losses=${losses} coins=${S.coins}`);
  assert.ok(reached !== null, `never reached Lv10: ${levels.join(' ')}`);
  assert.ok(reached >= 48 * 0.9 && reached <= 48 * 1.1, `Lv10 at ${reached}h`);
  assert.equal(pet.vaccines, 3);
  assert.ok(wins > losses, `wins ${wins} vs losses ${losses}`);
});
