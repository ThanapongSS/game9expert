// 🥊 Training: tap when the needle is in the green zone. 3 rounds.
// Quality 0 miss · 1 good · 2 perfect (averaged over the rounds).
import { drawScene } from '../render/scenes.js';
import { drawPet } from '../render/pets.js';
import { roundRect } from '../../../src/render/draw.js';
import { timeOfDay } from '../sim/time.js';
import { sfx } from '../audio.js';
import { h, btn } from '../ui/ui.js';
import { intro, result, EMOJI_FONT } from './common.js';

export const STAT_INFO = {
  atk: { icon: '🥊', name: 'พลังโจมตี (ATK)', prop: '🎯' },
  def: { icon: '🛡️', name: 'พลังป้องกัน (DEF)', prop: '🛡️' },
  spd: { icon: '👟', name: 'ความเร็ว (SPD)', prop: '🏁' },
};

export function trainingGame(app, arg) {
  app.busy = 1;
  const pet = app.pet();
  const info = STAT_INFO[arg.stat];
  const ROUNDS = 3;
  let round = 0;
  let scores = [];
  let running = false;
  let phase = 0;
  let pos = 0;
  let stopAt = -1;
  let label = '';
  let labelT = 0;
  let zone = 0.5;
  const speed = 1.3 + pet.level * 0.12;
  const goodW = 0.24;
  const perfectW = 0.07;

  const stat = h('div', { class: 'mg-top' });
  const el = h('div', { class: 'layer' }, stat);
  const render = () => stat.replaceChildren(h('div', { class: 'mg-stat' }, `${info.icon} ${info.name}`), h('div', { class: 'mg-stat' }, `รอบ ${Math.min(ROUNDS, round + 1)}/${ROUNDS}`), btn('✕', () => (app.busy = 0, app.go(arg.back)), 'round ghost back'));
  render();

  const newRound = () => {
    zone = 0.2 + Math.random() * 0.6;
    stopAt = -1;
    running = true;
  };

  function hit() {
    if (!running || stopAt >= 0) return;
    stopAt = pos;
    const d = Math.abs(pos - zone);
    const q = d < perfectW / 2 ? 2 : d < goodW / 2 ? 1 : 0;
    scores.push(q);
    label = ['พลาด 😅', 'ดีมาก! 👍', 'เพอร์เฟกต์! 🌟'][q];
    labelT = 1;
    if (q) sfx.hit(q === 2);
    else sfx.miss();
    setTimeout(() => {
      round++;
      render();
      if (round >= ROUNDS) {
        running = false;
        const quality = Math.round(scores.reduce((a, b) => a + b, 0) / ROUNDS);
        const r = arg.finish(quality);
        result(app, quality === 2 ? 'ฝึกได้สุดยอด! 🌟' : quality === 1 ? 'ฝึกเสร็จแล้ว! 💪' : 'พยายามอีกนิดนะ!', r, arg.back);
      } else newRound();
    }, 900);
  }

  const view = {
    draw(ctx, W, H, t, dt) {
      drawScene(ctx, app.S.home, W, H, { tod: timeOfDay(app.now()), t });
      ctx.fillStyle = 'rgba(255,247,236,0.35)';
      ctx.fillRect(0, 0, W, H);
      if (running && stopAt < 0) {
        phase += dt * speed;
        pos = 0.5 + 0.5 * Math.sin(phase);
      }
      const size = Math.min(W * 0.42, H * 0.3);
      const ground = H * 0.82;
      const hitting = stopAt >= 0 && labelT > 0.5 && scores[scores.length - 1] > 0;
      drawPet(ctx, pet, W * 0.38 + (hitting ? size * 0.12 : 0), ground, size, { mood: hitting ? 'attack' : 'idle', t });
      ctx.font = `${size * 0.42}px ${EMOJI_FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(info.prop, W * 0.72 + (hitting ? Math.sin(t * 50) * 6 : 0), ground - size * 0.1);
      // the meter
      const bw = Math.min(W * 0.8, 640);
      const bx = (W - bw) / 2;
      const by = H * 0.36;
      const bh = Math.max(34, H * 0.045);
      roundRect(ctx, bx - 6, by - 6, bw + 12, bh + 12, bh / 2 + 6, '#ffffff', '#f0d9bf', 4);
      roundRect(ctx, bx, by, bw, bh, bh / 2, '#ffd9cf');
      roundRect(ctx, bx + (zone - goodW / 2) * bw, by, goodW * bw, bh, 8, '#7fd6a8');
      roundRect(ctx, bx + (zone - perfectW / 2) * bw, by, perfectW * bw, bh, 6, '#239a6b');
      const nx = bx + (stopAt >= 0 ? stopAt : pos) * bw;
      roundRect(ctx, nx - 5, by - 14, 10, bh + 28, 5, '#5a3d2b');
      if (labelT > 0) {
        labelT -= dt;
        ctx.globalAlpha = Math.min(1, labelT * 2);
        ctx.font = `600 ${Math.max(28, H * 0.045)}px Mitr, sans-serif`;
        ctx.fillStyle = '#ff7a59';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 6;
        ctx.strokeText(label, W / 2, by - 30);
        ctx.fillText(label, W / 2, by - 30);
        ctx.globalAlpha = 1;
      } else if (running) {
        ctx.font = `500 ${Math.max(18, H * 0.026)}px Mitr, sans-serif`;
        ctx.fillStyle = '#5a3d2b';
        ctx.fillText('แตะหน้าจอเมื่อเข็มอยู่ในโซนเขียว!', W / 2, by - 24);
      }
    },
    down: hit,
  };

  intro(app, `${info.icon} ฝึก${info.name}`, ['แตะหน้าจอตอนเข็มอยู่ในโซนสีเขียว', 'โซนเขียวเข้ม = เพอร์เฟกต์! ได้พลังเพิ่ม 2 เท่า', 'ฝึก 3 รอบ'], newRound, arg.back);
  return { el, view, music: 'game', leave: () => (app.busy = 0) };
}
