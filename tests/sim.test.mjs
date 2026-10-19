import { test } from 'node:test';
import assert from 'node:assert/strict';
import { IN, INTRO_FRAMES, END_FRAMES, ROUND_TIME, FPS, ENERGY_MAX, GROUND } from '../src/config.js';
import { createMatch, stepMatch } from '../src/sim/match.js';
import { getMove } from '../src/sim/moves.js';
import { ROSTER } from '../src/characters/index.js';

function fightReady(p1 = 'teddy', p2 = 'robo') {
  const m = createMatch({ p1, p2 });
  for (let i = 0; i < INTRO_FRAMES; i++) stepMatch(m, [0, 0]);
  assert.equal(m.phase, 'fight');
  return m;
}

function placeClose(m, gap = 80) {
  m.f[0].x = 400;
  m.f[1].x = 400 + gap;
}

function run(m, frames, inputs = [0, 0]) {
  const all = [];
  for (let i = 0; i < frames; i++) all.push(...stepMatch(m, typeof inputs === 'function' ? inputs(i) : inputs));
  return all;
}

// P1 presses for one frame, then releases.
const tap = (bits) => (i) => [i === 0 ? bits : 0, 0];

test('intro locks inputs until FIGHT', () => {
  const m = createMatch({ p1: 'teddy', p2: 'robo' });
  const x0 = m.f[0].x;
  run(m, INTRO_FRAMES - 1, [IN.R, 0]);
  assert.equal(m.phase, 'intro');
  assert.equal(m.f[0].x, x0);
  run(m, 1);
  assert.equal(m.phase, 'fight');
});

test('walking moves the fighter and faces the opponent', () => {
  const m = fightReady();
  const x0 = m.f[0].x;
  run(m, 20, [IN.R, 0]);
  assert.ok(m.f[0].x > x0 + 50);
  assert.equal(m.f[0].facing, 1);
  assert.equal(m.f[1].facing, -1);
});

test('a punch in range deals damage and puts the opponent in hitstun', () => {
  const m = fightReady();
  placeClose(m);
  const hp0 = m.f[1].hp;
  const ev = run(m, 12, tap(IN.P));
  assert.ok(ev.some((e) => e.type === 'hit'), 'expected a hit event');
  assert.equal(m.f[1].hp, hp0 - getMove('teddy', 'punch').dmg);
  assert.equal(m.f[1].state, 'hitstun');
});

test('a punch out of range whiffs', () => {
  const m = fightReady();
  placeClose(m, 260);
  const hp0 = m.f[1].hp;
  run(m, 25, tap(IN.P));
  assert.equal(m.f[1].hp, hp0);
});

test('blocking reduces damage to chip and builds energy for both', () => {
  const m = fightReady();
  placeClose(m);
  const hp0 = m.f[1].hp;
  const ev = run(m, 14, (i) => [i === 0 ? IN.P : 0, IN.B]);
  assert.ok(ev.some((e) => e.type === 'block'));
  const chip = Math.round(getMove('teddy', 'punch').dmg * 0.15);
  assert.equal(m.f[1].hp, hp0 - chip);
  assert.ok(m.f[0].energy > 0 && m.f[1].energy > 0);
});

test('jumping goes up and lands back on the ground', () => {
  const m = fightReady();
  run(m, 1, [IN.U, 0]);
  assert.equal(m.f[0].state, 'jump');
  run(m, 10);
  assert.ok(m.f[0].y < GROUND - 50);
  run(m, 60);
  assert.equal(m.f[0].y, GROUND);
  assert.equal(m.f[0].state, 'idle');
});

test('hitting an airborne opponent knocks them down', () => {
  const m = fightReady();
  placeClose(m);
  run(m, 1, [0, IN.U]);
  run(m, 3);
  run(m, 14, tap(IN.P));
  assert.ok(['launch', 'down', 'getup'].includes(m.f[1].state), `state was ${m.f[1].state}`);
});

test('special needs full energy, then fires and resets energy', () => {
  for (const id of ROSTER) {
    const m = fightReady(id, 'teddy');
    placeClose(m, 90);
    run(m, 30, tap(IN.S));
    assert.notEqual(m.f[0].state, 'special', `${id}: special without energy`);
    m.f[0].energy = ENERGY_MAX;
    const hp0 = m.f[1].hp;
    const ev = run(m, 140, tap(IN.S));
    assert.ok(ev.some((e) => e.type === 'special'), `${id}: no special event`);
    assert.equal(m.f[0].energy < ENERGY_MAX, true);
    assert.ok(m.f[1].hp < hp0, `${id}: special did no damage`);
  }
});

test('Robo rocket punch travels as a projectile and hits from far away', () => {
  const m = fightReady('robo', 'siakabal');
  m.f[0].x = 150;
  m.f[1].x = 800;
  m.f[0].energy = ENERGY_MAX;
  run(m, 1, [IN.S, 0]);
  run(m, 40);
  assert.equal(m.proj.length, 1);
  const hp0 = m.f[1].hp;
  run(m, 80);
  assert.ok(m.f[1].hp < hp0);
  assert.equal(m.proj.length, 0);
});

test('curse slows the victim', () => {
  const m = fightReady('siakabal', 'teddy');
  placeClose(m, 300);
  m.f[0].energy = ENERGY_MAX;
  run(m, 120, tap(IN.S));
  assert.ok(m.f[1].slow > 0);
});

test('KO ends the round and the winner celebrates', () => {
  const m = fightReady();
  placeClose(m);
  m.f[1].hp = 10;
  const ev = run(m, 40, tap(IN.P));
  assert.equal(m.phase, 'ko');
  assert.equal(m.winner, 0);
  assert.ok(ev.some((e) => e.type === 'ko'));
  run(m, END_FRAMES + 10);
  assert.equal(m.phase, 'result');
  assert.equal(m.f[0].state, 'win');
});

test('time up: higher HP ratio wins, equal ratio is a draw', () => {
  const m = fightReady('teddy', 'siakabal');
  m.f[0].hp = 500; // 50%
  m.f[1].hp = 690; // 60%
  run(m, ROUND_TIME * FPS);
  assert.equal(m.phase, 'timeup');
  assert.equal(m.winner, 1);

  const d = fightReady('teddy', 'teddy');
  run(d, ROUND_TIME * FPS);
  assert.equal(d.winner, 'draw');
});

test('fighters never overlap or leave the arena during random play', () => {
  for (const p1 of ROSTER) {
    for (const p2 of ROSTER) {
      const m = fightReady(p1, p2);
      let seed = 7;
      const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      for (let i = 0; i < 1500 && m.phase === 'fight'; i++) {
        const r = () => Math.floor(rnd() * 128);
        stepMatch(m, [r(), r()]);
        for (const f of m.f) {
          assert.ok(f.x >= 30 && f.x <= 930, `${p1} vs ${p2}: x out of arena ${f.x}`);
          assert.ok(f.y <= GROUND, 'below ground');
          assert.ok(f.hp >= 0 && f.hp <= f.maxHp);
          assert.ok(Number.isFinite(f.x) && Number.isFinite(f.y));
        }
      }
    }
  }
});

test('match state survives a JSON round trip (needed for online play)', () => {
  const m = fightReady();
  placeClose(m);
  run(m, 5, tap(IN.P));
  const copy = JSON.parse(JSON.stringify(m));
  run(m, 20);
  run(copy, 20);
  assert.deepEqual(copy, JSON.parse(JSON.stringify(m)));
});

test('lethal chip damage K.O.s a blocking doll', () => {
  const m = fightReady();
  placeClose(m);
  m.f[1].hp = 3;
  run(m, 14, (i) => [i === 0 ? IN.P : 0, IN.B]);
  assert.equal(m.f[1].hp, 0);
  assert.equal(m.phase, 'ko');
});

test("Mae Nak's haunting call can't be blocked and freezes the victim", () => {
  const m = fightReady('maenak', 'teddy');
  placeClose(m, 250);
  m.f[0].energy = ENERGY_MAX;
  const hp0 = m.f[1].hp;
  const ev = run(m, 70, (i) => [i === 0 ? IN.S : 0, IN.B]);
  assert.ok(ev.some((e) => e.type === 'hit' && e.att === 0), 'call should hit through block');
  assert.ok(m.f[1].hp < hp0);
  assert.ok(m.f[1].scared > 0, 'victim should be scared');
});

test("a well-timed jump clears Mae Nak's call", () => {
  // Some jump timing must clear the wave for every doll (it's unblockable).
  for (const id of ROSTER) {
    let dodged = false;
    for (let jumpAt = 30; jumpAt < 80 && !dodged; jumpAt++) {
      const m = fightReady('maenak', id);
      placeClose(m, 320);
      m.f[0].energy = ENERGY_MAX;
      const hp0 = m.f[1].hp;
      run(m, 130, (i) => [i === 0 ? IN.S : 0, i === jumpAt ? IN.U | IN.L : 0]);
      if (m.f[1].hp === hp0 && m.proj.length === 0) dodged = true;
    }
    assert.ok(dodged, `${id} can never jump over the call`);
  }
});

test("Naga's flame beam hits five times and knocks down", () => {
  const m = fightReady('naga', 'robo');
  placeClose(m, 400);
  m.f[0].energy = ENERGY_MAX;
  const ev = run(m, 90, tap(IN.S));
  const hits = ev.filter((e) => e.type === 'hit' && e.att === 0);
  assert.equal(hits.length, 5);
  assert.ok(['launch', 'down', 'getup'].includes(m.f[1].state), `state ${m.f[1].state}`);
});

test("Yogurt's fluff roll hits and bounces back", () => {
  const m = fightReady('yogurt', 'siakabal');
  placeClose(m, 300);
  m.f[0].energy = ENERGY_MAX;
  let bounced = false;
  for (let i = 0; i < 120; i++) {
    stepMatch(m, [i === 0 ? IN.S : 0, 0]);
    if (m.f[0].state === 'special' && m.f[0].sp === 2 && m.f[0].vx * m.f[0].facing < 0) bounced = true;
  }
  assert.ok(m.f[1].hp < m.f[1].maxHp);
  assert.ok(bounced, 'should bounce back after the hit');
});

test("Muay Thai's giant fist dash stops on contact", () => {
  const m = fightReady('muaythai', 'naga');
  placeClose(m, 250);
  m.f[0].energy = ENERGY_MAX;
  const ev = run(m, 90, tap(IN.S));
  const hit = ev.find((e) => e.type === 'hit' && e.att === 0);
  assert.ok(hit && hit.dmg === 145 && hit.heavy);
  assert.ok(m.f[0].x < m.f[1].x, 'muay thai should not pass through');
});
