import { test } from 'node:test';
import assert from 'node:assert/strict';
import { elementMul, ELEMENTS, SPECIES_IDS, ELEMENT_STRONG, ELEMENT_WEAK } from '../pet/src/data/species.js';
import { AREAS, ARENA_TRAINERS } from '../pet/src/data/areas.js';
import {
  makeRng, makeFighter, createBattle, resolveRound, aiChoose, autoBattle, buildPet, petFighter, makeFoe, makeTrainer, SP_START, SP_MAX,
} from '../pet/src/sim/battle.js';

const dummy = (o = {}) =>
  makeFighter({ name: 'd', element: 'light', level: 1, stats: { hp: 100, atk: 20, def: 10, spd: 10, int: 20 }, evade: 0, crit: 0, ...o });

test('element ring: each beats the next', () => {
  for (let i = 0; i < ELEMENTS.length; i++) {
    const a = ELEMENTS[i];
    const b = ELEMENTS[(i + 1) % ELEMENTS.length];
    assert.equal(elementMul(a, b), ELEMENT_STRONG, `${a} > ${b}`);
    assert.equal(elementMul(b, a), ELEMENT_WEAK, `${b} < ${a}`);
  }
  assert.equal(elementMul('light', 'wind'), 1);
  assert.equal(elementMul('neutral', 'water'), 1);
});

test('element advantage changes damage', () => {
  const hit = (el) => {
    const b = createBattle(dummy(), dummy({ element: el }), 5);
    const ev = resolveRound(b, [{ type: 'skill', id: 'sparkle' }, { type: 'skill', id: 'guard' }]);
    return ev.find((e) => e.t === 'hit' && e.who === 1);
  };
  const strong = hit('shadow');
  const weak = hit('water');
  assert.equal(strong.eff, 'strong');
  assert.equal(weak.eff, 'weak');
  assert.ok(strong.dmg > weak.dmg);
});

test('SP: skills cost SP, regen +1 per round up to max; fall back to basic attack', () => {
  const b = createBattle(dummy({ skills: ['hornCharge'] }), dummy({ stats: { hp: 999, atk: 1, def: 10, spd: 1, int: 1 } }), 1);
  assert.equal(b.f[0].sp, SP_START);
  const ev = resolveRound(b, [{ type: 'skill', id: 'hornCharge' }, { type: 'skill', id: 'tackle' }]);
  assert.equal(ev.find((e) => e.t === 'use' && e.who === 0).id, 'tackle'); // cost 5 > 2 SP
  for (let i = 0; i < 10; i++) resolveRound(b, [{ type: 'skill', id: 'tackle' }, { type: 'skill', id: 'tackle' }]);
  assert.equal(b.f[0].sp, SP_MAX);
});

test('shield halves the next hit; sleep skips a turn; priority goes first', () => {
  const b = createBattle(dummy({ stats: { hp: 500, atk: 20, def: 10, spd: 1, int: 20 } }), dummy({ stats: { hp: 500, atk: 20, def: 10, spd: 50, int: 20 } }), 3);
  let ev = resolveRound(b, [{ type: 'skill', id: 'guard' }, { type: 'skill', id: 'tackle' }]);
  // the faster foe hit before the guard went up
  assert.equal(ev.find((e) => e.t === 'hit').shield, false);
  ev = resolveRound(b, [{ type: 'skill', id: 'tackle' }, { type: 'skill', id: 'tackle' }]);
  assert.equal(ev.find((e) => e.t === 'hit' && e.who === 0).shield, true);

  const s = createBattle(dummy({ stats: { hp: 500, atk: 20, def: 10, spd: 50, int: 20 } }), dummy(), 3);
  s.f[0].sp = 6;
  ev = resolveRound(s, [{ type: 'skill', id: 'lullaby' }, { type: 'skill', id: 'tackle' }]);
  assert.ok(ev.some((e) => e.t === 'asleep' && e.who === 1));

  const q = createBattle(dummy({ stats: { hp: 500, atk: 20, def: 10, spd: 1, int: 20 } }), dummy({ stats: { hp: 500, atk: 20, def: 10, spd: 50, int: 20 } }), 3);
  ev = resolveRound(q, [{ type: 'skill', id: 'quickJab' }, { type: 'skill', id: 'tackle' }]);
  assert.equal(ev.find((e) => e.t === 'use').who, 0);
});

test('items heal and come first', () => {
  const b = createBattle(dummy({ items: 1, stats: { hp: 100, atk: 20, def: 10, spd: 1, int: 20 } }), dummy({ stats: { hp: 100, atk: 20, def: 10, spd: 50, int: 20 } }), 2);
  b.f[0].hp = 30;
  const ev = resolveRound(b, [{ type: 'item', id: 'potion', heal: 0.4 }, { type: 'skill', id: 'tackle' }]);
  assert.equal(ev[0].t, 'item');
  assert.equal(b.f[0].items, 0);
});

test('battles are deterministic for a seed', () => {
  const run = () => autoBattle(petFighter(buildPet('fuji', 6, makeRng(1))), petFighter(buildPet('chako', 6, makeRng(2))), 99);
  const a = run();
  const b = run();
  assert.equal(a.winner, b.winner);
  assert.equal(a.round, b.round);
  assert.equal(a.f[0].hp, b.f[0].hp);
});

test('every matchup ends with a winner; no species dominates', () => {
  const rng = makeRng(11);
  for (const a of SPECIES_IDS) {
    for (const c of SPECIES_IDS) {
      let w = 0;
      for (let i = 0; i < 60; i++) {
        const bt = autoBattle(petFighter(buildPet(a, 10, rng)), petFighter(buildPet(c, 10, rng)), i + 1);
        assert.ok(bt.over && (bt.winner === 0 || bt.winner === 1));
        if (bt.winner === 0) w++;
      }
      assert.ok(w >= 6 && w <= 54, `${a} vs ${c}: ${w}/60`);
    }
  }
});

test('adventure: wild foes are beatable at the area level; bosses with potions too', () => {
  const rng = makeRng(12);
  for (const [ai, area] of AREAS.entries()) {
    for (const sp of SPECIES_IDS) {
      let wild = 0;
      let boss = 0;
      for (let i = 0; i < 40; i++) {
        const lv = area.levels[0];
        if (autoBattle(petFighter(buildPet(sp, lv, rng)), makeFoe(area.foes[i % 2], lv), i + 1).winner === 0) wild++;
        const pet = buildPet(sp, Math.min(10, area.levels[1] + 1), rng);
        if (autoBattle(petFighter(pet, { items: 2 }), makeFoe(area.boss, area.levels[1], ai + 1), i + 1).winner === 0) boss++;
      }
      assert.ok(wild >= 28, `${sp} wild ${area.id}: ${wild}/40`);
      assert.ok(boss >= 16, `${sp} boss ${area.id}: ${boss}/40`);
    }
  }
});

test('AI picks the finishing blow and heals when low', () => {
  const b = createBattle(dummy({ smart: 1, skills: ['sparkle', 'healingHug'] }), dummy({ element: 'shadow' }), 4);
  b.f[0].sp = 3;
  b.f[1].hp = 5;
  assert.deepEqual(aiChoose(b, 0), { type: 'skill', id: 'sparkle' });
  b.f[1].hp = 100;
  b.f[0].hp = 10;
  assert.equal(aiChoose(b, 0).id, 'healingHug');
});

test('arena trainers scale with rank', () => {
  const rng = makeRng(13);
  const t0 = makeTrainer(0, ARENA_TRAINERS[0], rng);
  const t9 = makeTrainer(9, ARENA_TRAINERS[9], rng);
  assert.equal(t0.level, 1);
  assert.equal(t9.level, 10);
  assert.ok(t9.maxHp > t0.maxHp * 2);
  assert.ok(t9.skills.length >= 3);
});
