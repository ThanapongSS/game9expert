import { now } from './protocol.js';

// Host-authoritative netcode. The host runs the only simulation; the guest
// sends inputs and renders snapshots.

class Peer {
  constructor(transport) {
    this.tr = transport;
    this.handlers = {};
    this.rtt = null;
    transport.onmessage = (msg) => msg && this.onMessage(msg);
  }

  on(type, fn) {
    this.handlers[type] = fn;
    return this;
  }

  send(msg) {
    this.tr.send(msg);
  }

  emit(msg) {
    this.handlers[msg.t]?.(msg);
  }
}

export class HostSync extends Peer {
  constructor(transport) {
    super(transport);
    this.match = null;
    this.remoteHeld = 0;
    this.remoteLatch = 0;
    this.pending = [];
  }

  onMessage(msg) {
    switch (msg.t) {
      case 'in':
        this.remoteHeld = msg.b | 0;
        this.remoteLatch |= msg.p | 0;
        break;
      case 'ping':
        this.send({ t: 'pong', ts: msg.ts });
        if (msg.rtt) this.rtt = msg.rtt;
        break;
      default:
        this.emit(msg);
    }
  }

  start(match) {
    this.match = match;
    this.pending = [];
    this.remoteHeld = 0;
    this.remoteLatch = 0;
  }

  remoteInput() {
    const v = this.remoteHeld | this.remoteLatch;
    this.remoteLatch = 0;
    return v;
  }

  // Call after every stepMatch; snapshots go out at 30Hz.
  afterStep(events) {
    this.pending.push(...events);
    if (this.match.frame % 2 === 0) this.flush();
  }

  flush() {
    this.send({ t: 's', m: this.match, e: this.pending });
    this.pending = [];
  }
}

const SNAP_MS = 1000 / 30;
const lerp = (a, b, k) => a + (b - a) * k;

export class GuestSync extends Peer {
  constructor(transport) {
    super(transport);
    this.snap = null;
    this.prev = null;
    this.recvAt = 0;
    this.events = [];
    this.lastB = -1;
    this.idle = 0;
  }

  onMessage(msg) {
    switch (msg.t) {
      case 's':
        if (this.snap && msg.m.frame < this.snap.frame) return;
        this.prev = this.snap;
        this.snap = msg.m;
        this.recvAt = now();
        if (msg.e.length) this.events.push(...msg.e);
        break;
      case 'pong':
        this.rtt = now() - msg.ts;
        break;
      default:
        this.emit(msg);
    }
  }

  reset() {
    this.snap = null;
    this.prev = null;
    this.events = [];
    this.lastB = -1;
  }

  // bits: this frame's sampled input (held | quick taps).
  sendInput(bits) {
    this.idle++;
    if (bits !== this.lastB || this.idle >= 10) {
      const p = this.lastB < 0 ? bits : bits & ~this.lastB;
      this.send({ t: 'in', b: bits, p });
      this.lastB = bits;
      this.idle = 0;
    }
  }

  ping() {
    this.send({ t: 'ping', ts: now(), rtt: this.rtt });
  }

  takeEvents() {
    const e = this.events;
    this.events = [];
    return e;
  }

  // Snapshot smoothed between the last two updates.
  view() {
    const s = this.snap;
    const p = this.prev;
    if (!s) return null;
    if (!p || p.frame > s.frame || s.frame - p.frame > 8) return s;
    const k = Math.min(1, (now() - this.recvAt) / SNAP_MS);
    return {
      ...s,
      f: s.f.map((f, i) => ({ ...f, x: lerp(p.f[i].x, f.x, k), y: lerp(p.f[i].y, f.y, k) })),
      proj: s.proj.map((q) => {
        const old = p.proj.find((o) => o.owner === q.owner && o.kind === q.kind);
        return old ? { ...q, x: lerp(old.x, q.x, k) } : q;
      }),
    };
  }
}
