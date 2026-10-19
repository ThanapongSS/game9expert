import { encode, decode } from './protocol.js';

// In-memory transport pair for tests. Messages are JSON round-tripped like
// the real connection; deliver() flushes the queued messages.
export function createLoopbackPair() {
  const queues = [[], []]; // queues[i]: messages waiting for end i
  const ends = [0, 1].map((me) => ({
    onmessage: null,
    onclose: null,
    closed: false,
    send(msg) {
      if (!this.closed) queues[1 - me].push(encode(msg));
    },
    close() {
      if (this.closed) return;
      this.closed = true;
      const other = ends[1 - me];
      if (!other.closed) {
        other.closed = true;
        other.onclose?.();
      }
    },
  }));
  const deliver = () => {
    for (const i of [0, 1]) {
      for (const raw of queues[i].splice(0)) ends[i].onmessage?.(decode(raw));
    }
  };
  return { a: ends[0], b: ends[1], deliver };
}
