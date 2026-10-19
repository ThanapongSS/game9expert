// Messages are JSON with a `t` type field:
//   guest → host  hello{v} · pick{c} · in{b,p} · ping{ts,rtt} · rematch · bye
//   host → guest  welcome{v} · pick{c} · start{p1,p2,stage} · s{m,e} · pong{ts} · rematch · bye
// Numbers are rounded to 2 decimals to keep snapshots small.

const round = (k, v) => (typeof v === 'number' && !Number.isInteger(v) ? Math.round(v * 100) / 100 : v);

export function encode(msg) {
  return JSON.stringify(msg, round);
}

export function decode(data) {
  try {
    return typeof data === 'string' ? JSON.parse(data) : data;
  } catch {
    return null;
  }
}

export const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
