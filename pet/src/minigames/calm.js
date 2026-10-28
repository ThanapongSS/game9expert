// 💉 Vaccine day: the pet is scared. Stroke it until it calms down,
// then give the shot and get a sticker.
import { drawPet, petAnchor, heart } from '../render/pets.js';
import { roundRect } from '../../../src/render/draw.js';
import { sfx } from '../audio.js';
import { h, btn, bar } from '../ui/ui.js';
import { result, EMOJI_FONT } from './common.js';

export const STICKERS = ['🦄', '🌈', '⭐', '🍀', '🐬', '🌸', '🍩', '🎈', '🚀', '🧸'];

function clinic(ctx, W, H) {
  ctx.fillStyle = '#e4f6ef';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#d2eee3';
  for (let x = 0; x < W; x += 40) ctx.fillRect(x, 0, 20, H * 0.65);
  ctx.fillStyle = '#f7f3ee';
  ctx.fillRect(0, H * 0.65, W, H * 0.35);
  roundRect(ctx, W * 0.08, H * 0.12, Math.min(140, W * 0.2), Math.min(140, W * 0.2), 20, '#ffffff', '#c6e6da', 4);
  const cx = W * 0.08 + Math.min(70, W * 0.1);
  const cy = H * 0.12 + Math.min(70, W * 0.1);
  const s = Math.min(70, W * 0.1) * 0.6;
  ctx.fillStyle = '#ff6b6b';
  ctx.fillRect(cx - s / 3, cy - s, (s * 2) / 3, s * 2);
  ctx.fillRect(cx - s, cy - s / 3, s * 2, (s * 2) / 3);
  roundRect(ctx, W * 0.2, H * 0.72, W * 0.6, H * 0.12, 20, '#ffffff', '#c6e6da', 4);
}

// arg: { back, finish() → { lines } }
export function calmGame(app, arg) {
  app.busy = 1;
  const pet = app.pet();
  let calm = 0;
  let stage = 'calm'; // calm → ready → shot → done
  let shotT = 0;
  let geom = null;
  let hearts = [];
  let last = null;
  const meter = h('div', { style: 'margin:0.4rem 0' }, bar(0, 'age'));
  const info = h('b', {}, `${pet.name}กลัวเข็ม! 😰 ลูบตัวให้หายกลัวก่อนนะ`);
  const actions = h('div', { class: 'row', style: 'justify-content:center' }, btn('กลับ', () => (app.busy = 0, app.go(arg.back)), 'small ghost back'));
  const panel = h('div', { class: 'panel center', style: 'align-self:center;min-width:min(92%,26rem)' }, info, meter, actions);
  const el = h('div', { class: 'layer' }, panel);

  function addCalm(n, x, y) {
    if (stage !== 'calm') return;
    calm = Math.min(100, calm + n);
    meter.querySelector('i').style.width = `${calm}%`;
    if (Math.random() < 0.35) hearts.push({ x, y, age: 0 });
    if (calm >= 100) {
      stage = 'ready';
      sfx.happy();
      info.textContent = `${pet.name}หายกลัวแล้ว เก่งมาก! 💪`;
      actions.replaceChildren(btn('💉 ฉีดวัคซีน', shot, 'big mint'));
    }
  }

  function shot() {
    stage = 'shot';
    shotT = 0;
    actions.replaceChildren();
    sfx.tap();
    setTimeout(() => {
      sfx.voice(pet.species);
      setTimeout(() => {
        stage = 'done';
        const sticker = STICKERS[Math.floor(Math.random() * STICKERS.length)];
        const r = arg.finish();
        result(app, 'ฉีดวัคซีนเสร็จแล้ว! 🎉', { ...r, lines: [`ได้สติกเกอร์ความกล้า ${sticker}`, ...(r.lines || [])] }, arg.back);
      }, 900);
    }, 900);
  }

  const inside = (x, y) => geom && (Math.hypot(x - geom.head.x, y - geom.head.y) < geom.head.r * 1.3 || (Math.abs(x - geom.body.x) < geom.body.rx * 1.4 && Math.abs(y - geom.body.y) < geom.body.ry * 1.5));

  const view = {
    draw(ctx, W, H, t, dt) {
      clinic(ctx, W, H);
      const size = Math.min(W * 0.5, H * 0.36);
      const x = W / 2;
      const y = H * 0.8;
      geom = petAnchor(pet, x, y, size);
      const scared = stage === 'calm' && calm < 100;
      const shake = scared ? Math.sin(t * 40) * (1 - calm / 100) * 4 : 0;
      const mood = stage === 'shot' && shotT > 0.9 && shotT < 1.4 ? 'hurt' : stage === 'calm' ? (calm > 60 ? 'idle' : 'sad') : 'happy';
      drawPet(ctx, pet, x + shake, y, size, { mood, t });
      if (stage === 'shot') {
        shotT += dt;
        const k = Math.min(1, shotT / 0.9);
        ctx.font = `${size * 0.3}px ${EMOJI_FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText('💉', W * 0.85 - (W * 0.85 - geom.body.x - geom.body.rx * 0.6) * k, geom.body.y);
      }
      hearts = hearts.filter((h0) => (h0.age += dt) < 1);
      for (const h0 of hearts) {
        ctx.globalAlpha = 1 - h0.age;
        heart(ctx, h0.x, h0.y - h0.age * 60, 10, '#ff7fb0', '#fff');
      }
      ctx.globalAlpha = 1;
    },
    down(x, y) {
      if (inside(x, y)) {
        addCalm(6, x, y);
        last = { x, y };
      }
    },
    move(x, y, e) {
      if (!e.buttons && e.pointerType !== 'touch') return;
      if (inside(x, y) && last) addCalm(Math.min(4, Math.hypot(x - last.x, y - last.y) / 12), x, y);
      last = { x, y };
    },
    up() {
      last = null;
    },
  };
  return { el, view, music: 'home', leave: () => (app.busy = 0) };
}
