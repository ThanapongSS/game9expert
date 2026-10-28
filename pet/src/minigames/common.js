// Shared bits for minigames: intro card and the result card.
import { h, btn, modal, petCanvas } from '../ui/ui.js';
import { sfx } from '../audio.js';

export const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

export function intro(app, title, lines, onStart, back = 'home', backArg) {
  const pet = app.pet();
  const m = modal(
    [
      h('h2', {}, title),
      pet ? petCanvas(pet, 140, { mood: 'happy' }) : null,
      ...lines.map((l) => h('p', { class: 'center' }, l)),
      h('div', { class: 'row', style: 'justify-content:center' }, btn('ยกเลิก', () => (m.close(), (app.busy = 0), app.go(back, backArg)), 'ghost back'), btn('เริ่ม! ▶', () => (m.close(), onStart()), 'big mint')),
    ],
    { dismiss: false },
  );
}

// result: { ok, lines } from the caller's finish(); back: screen name.
export function result(app, title, result, back, backArg) {
  const pet = app.pet();
  if (result.ok === false) sfx.no();
  else sfx.win();
  const m = modal(
    [
      h('h2', {}, title),
      pet ? petCanvas(pet, 140, { mood: result.ok === false ? 'sad' : 'happy' }) : null,
      ...(result.lines || []).map((l) => h('p', { class: 'center', style: 'font-size:1.1rem' }, l)),
      btn('ตกลง', () => m.close(), 'big mint'),
    ],
    {
      dismiss: false,
      onClose: () => {
        app.busy = 0;
        app.go(back, backArg);
      },
    },
  );
}
