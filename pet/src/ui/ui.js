// Small DOM helpers for the pet game: buttons, sheets, modals, toasts,
// bars and canvas pet portraits.
import { h } from '../../../src/ui/dom.js';
import { sfx } from '../audio.js';
import { drawPet } from '../render/pets.js';

export { h };

export function btn(label, onClick, cls = '', extra = {}) {
  return h(
    'button',
    {
      class: `btn ${cls}`,
      type: 'button',
      ...extra,
      onclick: (e) => {
        if (cls.includes('back')) sfx.back();
        else sfx.tap();
        onClick(e);
      },
    },
    label,
  );
}

export function titleRow(title, onBack, ...extra) {
  return h('div', { class: 'title-row' }, onBack ? btn('←', onBack, 'round ghost back', { 'aria-label': 'กลับ' }) : null, h('h2', {}, title), ...extra);
}

export function bar(value, cls = '') {
  const v = Math.max(0, Math.min(100, value));
  const tone = cls ? cls : v < 25 ? 'low' : v < 50 ? 'mid' : '';
  return h('div', { class: `bar ${tone}` }, h('i', { style: `width:${v}%` }));
}

export function toast(msg, kind = '') {
  const box = document.getElementById('toasts');
  const el = h('div', { class: `toast ${kind}` }, msg);
  box.append(el);
  while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => el.remove(), 2700);
}

// Modal dialog. Returns { el, close }.
export function modal(content, { onClose, dismiss = true } = {}) {
  const ui = document.getElementById('ui');
  const box = h('div', { class: 'modal' }, content);
  const wrap = h('div', { class: 'modal-wrap' }, box);
  const close = () => {
    wrap.remove();
    onClose?.();
  };
  if (dismiss) {
    wrap.addEventListener('click', (e) => {
      if (e.target === wrap) close();
    });
  }
  ui.append(wrap);
  return { el: box, close };
}

export function sheet(content, { onClose } = {}) {
  const ui = document.getElementById('ui');
  const box = h('div', { class: 'sheet' }, content);
  const wrap = h('div', { class: 'sheet-wrap' }, box);
  const close = () => {
    wrap.remove();
    onClose?.();
  };
  wrap.addEventListener('click', (e) => {
    if (e.target === wrap) close();
  });
  ui.append(wrap);
  return { el: box, close };
}

export function confirmBox(text, yesLabel, onYes, cls = 'coral') {
  const m = modal([
    h('p', { class: 'center', style: 'font-size:1.15rem' }, text),
    h('div', { class: 'row', style: 'justify-content:center' }, btn('ยกเลิก', () => m.close(), 'ghost back'), btn(yesLabel, () => {
      m.close();
      onYes();
    }, cls)),
  ]);
  return m;
}

// A canvas with a pet drawn on it (static or animated while attached).
export function petCanvas(pet, size, { mood = 'idle', animate = true, bg = null, scale = 0.9 } = {}) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const c = h('canvas', { class: 'portrait', width: Math.round(size * dpr), height: Math.round(size * dpr), style: `width:${size}px;height:${size}px` });
  const ctx = c.getContext('2d');
  const t0 = performance.now();
  const draw = (t) => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    if (bg) {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, size, size);
    }
    const wide = pet.species === 'chako' ? 0.78 : 1;
    drawPet(ctx, pet, size * (pet.species === 'chako' ? 0.44 : 0.5), size * 0.9, size * scale * wide, { t, mood: typeof mood === 'function' ? mood() : mood });
  };
  draw(0.3);
  if (animate) {
    const loop = (ms) => {
      if (!c.isConnected && performance.now() - t0 > 1000) return;
      draw((ms - t0) / 1000);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
  return c;
}

export function fmtDuration(ms) {
  const m = Math.max(1, Math.ceil(ms / 60000));
  if (m < 60) return `${m} นาที`;
  const hrs = Math.floor(m / 60);
  const mm = m % 60;
  return mm ? `${hrs} ชม. ${mm} นาที` : `${hrs} ชม.`;
}

export function shuffle(arr, rng = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
