// 🃏 Memory match: find the 8 pairs in as few moves as possible.
import { drawScene } from '../render/scenes.js';
import { timeOfDay } from '../sim/time.js';
import { sfx } from '../audio.js';
import { h, btn, shuffle } from '../ui/ui.js';
import { intro, result } from './common.js';

const FACES = ['🐱', '🐶', '🦜', '🐃', '🐟', '🦴', '🍓', '🌿'];

export function memoryScore(moves) {
  return Math.max(0.2, Math.min(1, 1 - (moves - 8) / 16));
}

export function memoryGame(app, arg) {
  app.busy = 1;
  const deck = shuffle([...FACES, ...FACES]).map((e) => ({ e, open: false, done: false }));
  let moves = 0;
  let first = null;
  let lock = false;
  let pairs = 0;
  const stat = h('div', { class: 'mg-top' });
  const grid = h('div', { class: 'cards' });
  const el = h('div', { class: 'layer' }, stat, grid);

  function render() {
    stat.replaceChildren(h('div', { class: 'mg-stat' }, `🃏 ${pairs}/8`), h('div', { class: 'mg-stat' }, `👆 ${moves} ครั้ง`), btn('✕', () => (app.busy = 0, app.go(arg.back)), 'round ghost back'));
    grid.replaceChildren(
      ...deck.map((c, i) =>
        h(
          'button',
          {
            class: `mcard${c.open ? ' open' : ''}${c.done ? ' done' : ''}`,
            type: 'button',
            onclick: () => flip(i),
          },
          c.open || c.done ? c.e : '❔',
        ),
      ),
    );
  }

  function flip(i) {
    const c = deck[i];
    if (lock || c.open || c.done) return;
    sfx.tap();
    c.open = true;
    if (first === null) {
      first = i;
      render();
      return;
    }
    moves++;
    const a = deck[first];
    first = null;
    if (a.e === c.e) {
      a.done = c.done = true;
      a.open = c.open = false;
      pairs++;
      sfx.coin();
      render();
      if (pairs === 8) {
        const r = arg.finish(memoryScore(moves));
        setTimeout(() => result(app, 'จับคู่ครบแล้ว! 🎉', { ...r, lines: [`ใช้ ${moves} ครั้ง`, ...(r.lines || [])] }, arg.back), 500);
      }
      return;
    }
    render();
    lock = true;
    setTimeout(() => {
      a.open = c.open = false;
      lock = false;
      render();
    }, 750);
  }

  render();
  intro(app, '🃏 จับคู่การ์ด', ['เปิดการ์ดทีละ 2 ใบ หาคู่ที่เหมือนกัน', 'ยิ่งใช้น้อยครั้ง ยิ่งได้รางวัลเยอะ!'], () => {}, arg.back);
  const view = {
    draw(ctx, W, H, t) {
      drawScene(ctx, app.S.home, W, H, { tod: timeOfDay(app.now()), t });
      ctx.fillStyle = 'rgba(255,247,236,0.55)';
      ctx.fillRect(0, 0, W, H);
    },
  };
  return { el, view, music: 'game', leave: () => (app.busy = 0) };
}
