import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newSave, adopt, tick, encodeBackup, decodeBackup, encodePet, decodePet, friendFighter, activePet } from '../pet/src/state.js';
import { makeRng, buildPet, autoBattle, petFighter } from '../pet/src/sim/battle.js';
import { buy, upgrade, hatchEgg, rollDaily, progress, MISSIONS } from '../pet/src/sim/economy.js';
import * as care from '../pet/src/sim/care.js';

process.env.TZ = 'Asia/Bangkok';
const at = (d, h, m = 0) => new Date(2026, 0, d, h, m).getTime();

function sampleSave() {
  const S = newSave(at(5, 9), makeRng(1));
  const pet = adopt(S, 'yogurt', at(5, 9), 'โยเกิร์ตจัง');
  tick(S, at(5, 15), makeRng(2));
  return { S, pet };
}

test('backup code round-trips the whole save (Thai text included)', () => {
  const { S } = sampleSave();
  const code = encodeBackup(S);
  assert.ok(code.startsWith('YH1.'));
  const back = decodeBackup(code);
  assert.deepEqual(back, S);
  assert.equal(activePet(back).name, 'โยเกิร์ตจัง');
  // pasting with line breaks/spaces (LINE wraps long text) still works
  const wrapped = code.replace(/(.{60})/g, '$1\n ');
  assert.deepEqual(decodeBackup(wrapped), S);
});

test('tampered or truncated codes are rejected', () => {
  const { S, pet } = sampleSave();
  const code = encodeBackup(S);
  assert.throws(() => decodeBackup(code.slice(0, -3)));
  const mid = Math.floor(code.length / 2);
  const flipped = code.slice(0, mid) + (code[mid] === 'A' ? 'B' : 'A') + code.slice(mid + 1);
  assert.throws(() => decodeBackup(flipped));
  assert.throws(() => decodeBackup('hello'));
  assert.throws(() => decodePet(code), /ไม่ถูกต้อง/);
  assert.throws(() => decodeBackup(encodePet(pet)));
});

test('pet code round-trips into a fighter a friend can battle', () => {
  const rng = makeRng(5);
  const pet = buildPet('chako', 7, rng);
  pet.name = 'ชาโคพี่ใหญ่';
  const code = encodePet(pet, 'น้องเฟิร์น');
  const snap = decodePet(code);
  assert.equal(snap.species, 'chako');
  assert.equal(snap.level, 7);
  assert.equal(snap.owner, 'น้องเฟิร์น');
  assert.deepEqual(snap.equip, pet.equip);
  const f = friendFighter(snap);
  assert.equal(f.maxHp, petFighter(pet).maxHp);
  const b = autoBattle(petFighter(buildPet('pongfu', 7, rng)), f, 3);
  assert.ok(b.over);
});

test('pet code with impossible stats is rejected even with a valid checksum', async () => {
  const pet = buildPet('fuji', 3, makeRng(1));
  const code = encodePet(pet);
  const body = JSON.parse(Buffer.from(code.split('.')[1], 'base64url').toString());
  body.st[1] = 9999;
  const tag = 'YHP1';
  const b64 = Buffer.from(JSON.stringify(body)).toString('base64url');
  let h = 0x811c9dc5;
  for (const ch of tag + b64) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193);
  const forged = `${tag}.${b64}.${(h >>> 0).toString(36)}`;
  assert.throws(() => decodePet(forged), /ไม่ถูกต้อง/);
});

test('shop, crystals upgrades and refusals', () => {
  const S = newSave(at(5, 9), makeRng(1));
  const pet = adopt(S, 'phidam', at(5, 9));
  S.coins = 20;
  assert.ok(buy(S, 'squid').ok);
  assert.equal(S.coins, 6);
  assert.equal(buy(S, 'cake').reason, 'noCoins');
  assert.equal(buy(S, 'growMilk').reason, 'noCrystals');
  S.crystals = 3;
  assert.ok(upgrade(S, pet, 'atk').ok);
  assert.equal(pet.up.atk, 1);
  assert.equal(upgrade(S, pet, 'atk').reason, 'noCrystals');
  S.coins = 100;
  assert.ok(buy(S, 'ball').ok);
  assert.equal(buy(S, 'ball').reason, 'owned');
});

test('feeding: favourite food, full tummy, asleep at night', () => {
  const S = newSave(at(5, 9), makeRng(1));
  const pet = adopt(S, 'yogurt', at(5, 9));
  S.inv.mackerel = 5;
  pet.needs.hunger = 40;
  const r = care.feed(S, pet, 'mackerel', at(5, 9));
  assert.ok(r.ok && r.fav);
  pet.needs.hunger = 99;
  assert.equal(care.feed(S, pet, 'mackerel', at(5, 9)).reason, 'full');
  pet.needs.hunger = 40;
  assert.equal(care.feed(S, pet, 'mackerel', at(5, 22)).reason, 'asleep');
  care.wakeUp(pet, at(5, 22));
  assert.ok(care.feed(S, pet, 'mackerel', at(5, 22)).ok);
  assert.equal(care.feed(S, pet, 'cake', at(5, 22)).reason, 'none');
});

test('daily missions roll once a day, track progress and pay out', () => {
  const S = newSave(at(5, 9), makeRng(1));
  const pet = adopt(S, 'yogurt', at(5, 9));
  const ev = rollDaily(S, at(5, 9), makeRng(3));
  assert.equal(ev[0].type, 'login');
  assert.equal(S.daily.missions.length, 3);
  assert.equal(rollDaily(S, at(5, 18), makeRng(3)).length, 0);
  const coins = S.coins;
  for (const m of S.daily.missions) progress(S, pet, m.id, MISSIONS[m.id].goal);
  assert.ok(S.daily.missions.every((m) => m.done));
  assert.ok(S.daily.bonus);
  assert.ok(S.coins >= coins + 45);
  rollDaily(S, at(6, 8), makeRng(3));
  assert.equal(S.daily.streak, 2);
  rollDaily(S, at(9, 8), makeRng(3));
  assert.equal(S.daily.streak, 1);
});

test('eggs give every species, then treasure', () => {
  const S = newSave(at(5, 9), makeRng(1));
  adopt(S, 'yogurt', at(5, 9));
  S.eggs = 5;
  const rng = makeRng(8);
  for (let i = 0; i < 4; i++) assert.ok(hatchEgg(S, at(5, 9), rng).pet);
  assert.equal(new Set(S.pets.map((p) => p.species)).size, 5);
  assert.ok(hatchEgg(S, at(5, 9), rng).treasure);
  assert.equal(hatchEgg(S, at(5, 9), rng), null);
});

test('clock moved backwards does not break anything', () => {
  const { S, pet } = sampleSave();
  const age = pet.ageMs;
  tick(S, at(5, 10), makeRng(1));
  assert.equal(pet.ageMs, age);
  tick(S, at(5, 16), makeRng(1));
  assert.equal(pet.ageMs, age + 3600000);
});
