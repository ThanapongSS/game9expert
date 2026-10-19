import { IN } from '../config.js';

const BUTTONS = [
  { bit: IN.K, cls: 'kick', icon: '🦶' },
  { bit: IN.S, cls: 'special', icon: '⭐' },
  { bit: IN.B, cls: 'block', icon: '🛡️' },
  { bit: IN.P, cls: 'punch', icon: '👊' },
];

// On-screen controls: a slide-able d-pad on the left (8-way, so the thumb
// can jump forward) and four attack buttons on the right. Fingers may slide
// between buttons without lifting.
export class TouchControls {
  constructor(root, src, { onPause } = {}) {
    this.root = root;
    this.src = src;
    this.pointers = new Map();
    root.innerHTML = `
      <div class="dpad" data-zone="dpad">
        <span class="arrow up">▲</span><span class="arrow left">◀</span><span class="arrow right">▶</span>
        <div class="knob"></div>
      </div>
      <div class="btns">${BUTTONS.map((b) => `<div class="tb ${b.cls}" data-bit="${b.bit}"><span>${b.icon}</span></div>`).join('')}</div>
      <button class="pause" type="button" aria-label="pause">❚❚</button>`;
    this.dpad = root.querySelector('.dpad');
    this.knob = root.querySelector('.knob');
    this.btnEls = [...root.querySelectorAll('.tb')];
    this.specialEl = root.querySelector('.special');
    root.querySelector('.pause').addEventListener('click', () => onPause?.());

    root.addEventListener('pointerdown', (e) => this.down(e));
    root.addEventListener('pointermove', (e) => this.move(e));
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) root.addEventListener(type, (e) => this.up(e));
    root.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  target(e) {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || !this.root.contains(el)) return null;
    if (el.closest('.dpad')) return 'dpad';
    const btn = el.closest('.tb');
    return btn ? +btn.dataset.bit : null;
  }

  dpadBits(e) {
    const r = this.dpad.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const rad = r.width / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    let bits = 0;
    if (dx > rad * 0.22) bits |= IN.R;
    if (dx < -rad * 0.22) bits |= IN.L;
    if (dy < -rad * 0.42) bits |= IN.U;
    const k = Math.min(1, rad * 0.55 / (Math.hypot(dx, dy) || 1));
    this.knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
    return bits;
  }

  down(e) {
    if (e.target.closest('.pause')) return;
    e.preventDefault();
    const tgt = this.target(e);
    if (tgt === null) return;
    if (tgt === 'dpad') this.pointers.set(e.pointerId, { dpad: true, bits: this.dpadBits(e) });
    else this.pointers.set(e.pointerId, { dpad: false, bits: tgt });
    this.sync();
  }

  move(e) {
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    if (p.dpad) {
      p.bits = this.dpadBits(e);
    } else {
      const tgt = this.target(e);
      if (typeof tgt === 'number') p.bits = tgt;
    }
    this.sync();
  }

  up(e) {
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    this.pointers.delete(e.pointerId);
    if (p.dpad) this.knob.style.transform = '';
    this.sync();
  }

  sync() {
    let bits = 0;
    for (const p of this.pointers.values()) bits |= p.bits;
    this.src.set(bits);
    for (const el of this.btnEls) el.classList.toggle('on', (bits & +el.dataset.bit) !== 0);
    this.dpad.querySelector('.left').classList.toggle('on', (bits & IN.L) !== 0);
    this.dpad.querySelector('.right').classList.toggle('on', (bits & IN.R) !== 0);
    this.dpad.querySelector('.up').classList.toggle('on', (bits & IN.U) !== 0);
  }

  reset() {
    this.pointers.clear();
    this.knob.style.transform = '';
    this.sync();
  }

  setSpecialReady(ready) {
    this.specialEl.classList.toggle('ready', ready);
  }
}
