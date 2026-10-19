import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMatch, stepMatch } from '../src/sim/match.js';
import { AIController } from '../src/ai/aiController.js';
import { ROSTER } from '../src/characters/index.js';

function play(p1, p2, l1, l2, seed) {
  const m = createMatch({ p1, p2 });
  const a = new AIController(l1, seed);
  const b = new AIController(l2, seed * 7 + 3);
  let specials = 0;
  for (let i = 0; i < 60 * 100 && m.phase !== 'result'; i++) {
    const ev = stepMatch(m, [a.sample(m, 0), b.sample(m, 1)]);
    specials += ev.filter((e) => e.type === 'special').length;
  }
  return { m, specials };
}

test('CPU vs CPU matches always finish for every pairing', () => {
  for (const p1 of ROSTER) {
    for (const p2 of ROSTER) {
      const { m } = play(p1, p2, 'normal', 'normal', 11);
      assert.equal(m.phase, 'result', `${p1} vs ${p2} did not finish`);
      const dealt = m.f.some((f) => f.hp < f.maxHp);
      assert.ok(dealt, `${p1} vs ${p2}: nobody took damage`);
    }
  }
});

test('Hard CPU beats Easy CPU most of the time', () => {
  let hardWins = 0;
  const games = 16;
  for (let i = 0; i < games; i++) {
    const p1 = ROSTER[i % ROSTER.length];
    const p2 = ROSTER[(i + 3) % ROSTER.length];
    const { m } = play(p1, p2, 'hard', 'easy', 100 + i);
    if (m.winner === 0) hardWins++;
  }
  assert.ok(hardWins >= games * 0.7, `hard won only ${hardWins}/${games}`);
});

test('CPUs use their specials', () => {
  let total = 0;
  for (const id of ROSTER) total += play(id, 'teddy', 'hard', 'normal', 5).specials;
  assert.ok(total >= 4, `only ${total} specials used`);
});
