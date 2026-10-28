// 🍣 Catch the treats: drag the pet left/right to catch falling food.
// Chocolate and onion are dangerous for pets, so they cost a heart.
import { SPECIES } from '../data/species.js';
import { ITEMS } from '../data/items.js';
import { drawScene } from '../render/scenes.js';
import { drawPet } from '../render/pets.js';
import { timeOfDay } from '../sim/time.js';
import { sfx } from '../audio.js';
import { h, btn } from '../ui/ui.js';
import { intro, result, EMOJI_FONT } from './common.js';

const DURATION = 40;
const GOOD = ['🐟', '🦴', '🍓', '🥛', '🍚'];
const BAD = ['🍫', '🧅'];
export const CATCH_TARGET = 30; // points for a perfect score

// arg: { back, finish(score01) → { lines } }
export function catchGame(app, arg) {
  const pet = app.pet();
  const fav = ITEMS[SPECIES[pet.species].fav].icon;
  let running = false;
  let over = false;
  let time = DURATION;
  let points = 0;
  let lives = 3;
  let px = 0.5; // pet x as a fraction of width
  let target = 0.5;
  let items = [];
  let spawn = 0;
  let flash = 0;
  let pops = [];
  app.busy = 1;

  const stat = h('div', { class: 'mg-top' });
  const el = h('div', { class: 'layer' }, stat);
  const draw = () => stat.replaceChildren(h('div', { class: 'mg-stat' }, `⏱ ${Math.ceil(time)}`), h('div', { class: 'mg-stat' }, `⭐ ${points}`), h('div', { class: 'mg-stat' }, '❤️'.repeat(lives) + '🤍'.repeat(3 - lives)), btn('✕', () => end(true), 'round ghost back'));
  draw();

  function end(quit) {
    if (over) return;
    over = true;
    running = false;
    if (quit) {
      app.busy = 0;
      app.go(arg.back);
      return;
    }
    const score = Math.min(1, points / CATCH_TARGET);
    const r = arg.finish(score);
    result(app, lives > 0 ? 'หมดเวลา! 🎉' : 'โอ๊ะ! หัวใจหมด', { ...r, lines: [`ได้ ${points} คะแนน`, ...(r.lines || [])] }, arg.back);
  }

  const view = {
    draw(ctx, W, H, t, dt) {
      drawScene(ctx, app.S.home, W, H, { tod: timeOfDay(app.now()), t });
      const size = Math.min(W * 0.32, H * 0.22);
      const ground = H - size * 0.25;
      if (running) {
        time -= dt;
        px += (target - px) * Math.min(1, dt * 12);
        spawn -= dt;
        const rate = 0.75 - (1 - time / DURATION) * 0.4;
        if (spawn <= 0) {
          spawn = rate;
          const r = Math.random();
          const e = r < 0.22 ? BAD[Math.floor(Math.random() * BAD.length)] : r < 0.37 ? fav : GOOD[Math.floor(Math.random() * GOOD.length)];
          items.push({ e, x: 0.08 + Math.random() * 0.84, y: -0.05, v: 0.22 + Math.random() * 0.12 + (1 - time / DURATION) * 0.18 });
        }
        for (const it of items) it.y += it.v * dt;
        const mouthY = ground - size * 0.75;
        items = items.filter((it) => {
          const ix = it.x * W;
          const iy = it.y * H;
          if (Math.abs(iy - mouthY) < size * 0.3 && Math.abs(ix - px * W) < size * 0.42) {
            if (BAD.includes(it.e)) {
              lives--;
              flash = 0.4;
              sfx.no();
              pops.push({ text: '💔', x: ix, y: iy, age: 0 });
            } else {
              const p = it.e === fav ? 3 : 1;
              points += p;
              sfx.coin();
              pops.push({ text: `+${p}`, x: ix, y: iy, age: 0 });
            }
            draw();
            return false;
          }
          return it.y < 1.05;
        });
        if (time <= 0 || lives <= 0) {
          time = Math.max(0, time);
          draw();
          end(false);
        } else if (Math.floor(time + dt) !== Math.floor(time)) draw();
      }
      ctx.font = `${size * 0.32}px ${EMOJI_FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const it of items) ctx.fillText(it.e, it.x * W, it.y * H);
      drawPet(ctx, pet, px * W, ground, size, { mood: flash > 0 ? 'hurt' : 'happy', t });
      flash -= dt;
      ctx.font = `600 ${size * 0.2}px Mitr, sans-serif`;
      pops = pops.filter((p) => (p.age += dt) < 0.8);
      for (const p of pops) {
        ctx.globalAlpha = 1 - p.age / 0.8;
        ctx.fillStyle = '#ff7a59';
        ctx.fillText(p.text, p.x, p.y - p.age * 60);
      }
      ctx.globalAlpha = 1;
    },
    down(x) {
      target = x / window.innerWidth;
    },
    move(x, y, e) {
      if (e.buttons || e.pointerType === 'touch') target = x / window.innerWidth;
    },
  };

  intro(
    app,
    '🍣 รับขนม',
    ['แตะแล้วลากซ้าย-ขวา ให้สัตว์เลี้ยงรับขนมที่ตกลงมา', `${fav} ของโปรดได้ 3 คะแนน!`, '⚠️ ระวัง 🍫 ช็อกโกแลต และ 🧅 หัวหอม เป็นอันตรายต่อสัตว์ อย่ารับนะ!'],
    () => {
      running = true;
      draw();
    },
    arg.back,
  );
  return { el, view, music: 'game', leave: () => (app.busy = 0) };
}
