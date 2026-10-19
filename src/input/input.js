import { IN } from '../config.js';

// Collects held buttons plus presses that happened since the last sample,
// so a tap shorter than one frame is never lost.
export class InputSource {
  constructor() {
    this.held = 0;
    this.latched = 0;
  }

  press(bit) {
    this.held |= bit;
    this.latched |= bit;
  }

  release(bit) {
    this.held &= ~bit;
  }

  set(bits) {
    this.latched |= bits & ~this.held;
    this.held = bits;
  }

  sample() {
    const v = this.held | this.latched;
    this.latched = 0;
    return v;
  }

  clear() {
    this.held = 0;
    this.latched = 0;
  }
}

const KEYMAP = {
  KeyA: IN.L, ArrowLeft: IN.L,
  KeyD: IN.R, ArrowRight: IN.R,
  KeyW: IN.U, ArrowUp: IN.U, Space: IN.U,
  KeyJ: IN.P, KeyZ: IN.P,
  KeyK: IN.K, KeyX: IN.K,
  KeyL: IN.B, KeyC: IN.B, KeyS: IN.B, ArrowDown: IN.B,
  KeyI: IN.S, KeyV: IN.S,
};

export function attachKeyboard(src, { onPause } = {}) {
  window.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement) return;
    const bit = KEYMAP[e.code];
    if (bit) {
      src.press(bit);
      e.preventDefault();
    } else if (e.code === 'Escape' || e.code === 'KeyP') {
      onPause?.();
    }
  });
  window.addEventListener('keyup', (e) => {
    const bit = KEYMAP[e.code];
    if (bit) src.release(bit);
  });
  window.addEventListener('blur', () => src.clear());
}
