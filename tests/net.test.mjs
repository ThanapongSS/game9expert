import { test } from 'node:test';
import assert from 'node:assert/strict';
import { IN, INTRO_FRAMES } from '../src/config.js';
import { createMatch, stepMatch } from '../src/sim/match.js';
import { createLoopbackPair } from '../src/net/loopback.js';
import { HostSync, GuestSync } from '../src/net/sync.js';

function setup() {
  const { a, b, deliver } = createLoopbackPair();
  const host = new HostSync(a);
  const guest = new GuestSync(b);
  const match = createMatch({ p1: 'teddy', p2: 'hunkrabok' });
  host.start(match);
  // One host frame: guest input goes out, host simulates, snapshot comes back.
  const frame = (hostBits = 0, guestBits = 0) => {
    guest.sendInput(guestBits);
    deliver();
    const ev = stepMatch(match, [hostBits, host.remoteInput()]);
    host.afterStep(ev);
    deliver();
    return ev;
  };
  return { host, guest, match, frame, a, b, deliver };
}

test('guest receives snapshots that mirror the host match', () => {
  const { guest, match, frame } = setup();
  for (let i = 0; i < INTRO_FRAMES + 40; i++) frame(IN.R, IN.L);
  const snap = guest.snap;
  assert.ok(snap, 'no snapshot received');
  assert.ok(match.frame - snap.frame <= 1);
  assert.equal(snap.phase, 'fight');
  for (const i of [0, 1]) assert.ok(Math.abs(snap.f[i].x - match.f[i].x) < 12);
});

test("a guest's quick tap still lands on the host", () => {
  const { guest, match, frame, deliver, host } = setup();
  for (let i = 0; i < INTRO_FRAMES; i++) frame();
  match.f[0].x = 400;
  match.f[1].x = 480;
  // Tap and release before the host steps: the latch must keep the press.
  guest.sendInput(IN.P);
  guest.sendInput(0);
  deliver();
  const ev = [];
  ev.push(...stepMatch(match, [0, host.remoteInput()]));
  for (let i = 0; i < 15; i++) ev.push(...frame());
  assert.ok(ev.some((e) => e.type === 'hit' && e.att === 1), 'guest punch did not land');
});

test('events reach the guest exactly once', () => {
  const { guest, frame } = setup();
  for (let i = 0; i < INTRO_FRAMES + 2; i++) frame();
  const ev = guest.takeEvents();
  assert.equal(ev.filter((e) => e.type === 'ready').length, 1);
  assert.equal(ev.filter((e) => e.type === 'fight').length, 1);
  assert.equal(guest.takeEvents().length, 0);
});

test('lobby messages and ping/pong are routed to handlers', () => {
  const { host, guest, deliver } = setup();
  let pick = null;
  host.on('pick', (m) => (pick = m.c));
  guest.send({ t: 'pick', c: 'robo' });
  guest.ping();
  deliver();
  deliver();
  assert.equal(pick, 'robo');
  assert.ok(guest.rtt !== null && guest.rtt >= 0);
});

test('closing one end notifies the other', () => {
  const { a, b } = setup();
  let closed = false;
  b.onclose = () => (closed = true);
  a.close();
  assert.ok(closed);
});
