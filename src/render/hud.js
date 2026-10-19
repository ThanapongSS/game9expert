import { W, ENERGY_MAX } from '../config.js';
import { t } from '../i18n.js';
import { roundRect, roundRectPath, circle, outlinedText, FONT } from './draw.js';
import { drawPortrait } from './puppet.js';

const BAR_W = 340;
const BAR_H = 22;
const BAR_Y = 20;
const INNER = [422, 538]; // inner (timer-side) edge of P1 / P2 bars

export class Hud {
  constructor() {
    this.ghost = [1, 1];
    this.ghostHold = [0, 0];
    this.combo = [null, null];
    this.banner = null;
  }

  handle(events) {
    for (const e of events) {
      if (e.type === 'hit') {
        this.ghostHold[e.def] = 0.5;
        if (e.combo >= 2) this.combo[e.att] = { n: e.combo, t: 1.2 };
      } else if (e.type === 'special') {
        this.banner = { idx: e.idx, charId: e.charId, t: 0 };
      }
    }
  }

  update(dt, view) {
    view.f.forEach((f, i) => {
      const r = f.hp / f.maxHp;
      if (this.ghostHold[i] > 0) this.ghostHold[i] -= dt;
      else if (this.ghost[i] > r) this.ghost[i] = Math.max(r, this.ghost[i] - dt * 0.5);
      if (this.ghost[i] < r) this.ghost[i] = r;
      const c = this.combo[i];
      if (c && (c.t -= dt) <= 0) this.combo[i] = null;
    });
    if (this.banner && (this.banner.t += dt) > 1.1) this.banner = null;
  }

  draw(ctx, view, opts, time) {
    const { labels = [t('hud.you'), t('hud.cpu')], alt = [false, false], ping = null } = opts;
    view.f.forEach((f, i) => this.drawPlayer(ctx, f, i, labels[i], alt[i], time));
    this.drawTimer(ctx, view, time);
    if (ping !== null) outlinedText(ctx, t('hud.ping', { ms: Math.round(ping) }), W / 2, 84, { size: 13, sw: 4, fill: ping > 150 ? '#ffb0a0' : '#d8ffd0' });
    this.drawCombos(ctx);
    this.drawPhase(ctx, view, opts, time);
    this.drawBanner(ctx, alt);
  }

  drawPlayer(ctx, f, i, label, alt, time) {
    const side = i === 0 ? -1 : 1;
    const inner = INNER[i];
    const outer = inner + side * BAR_W;
    const x0 = Math.min(inner, outer);
    const ratio = f.hp / f.maxHp;
    const fillW = BAR_W * ratio;
    const ghostW = BAR_W * this.ghost[i];

    roundRect(ctx, x0 - 4, BAR_Y - 4, BAR_W + 8, BAR_H + 8, 8, '#2a1840', '#fff', 2);
    ctx.save();
    roundRectPath(ctx, x0, BAR_Y, BAR_W, BAR_H, 5);
    ctx.clip();
    ctx.fillStyle = '#4a2a50';
    ctx.fillRect(x0, BAR_Y, BAR_W, BAR_H);
    ctx.fillStyle = '#ff5a5a';
    ctx.fillRect(i === 0 ? inner - ghostW : inner, BAR_Y, ghostW, BAR_H);
    const low = ratio < 0.25;
    const g = ctx.createLinearGradient(0, BAR_Y, 0, BAR_Y + BAR_H);
    if (low) {
      const pulse = 0.5 + 0.5 * Math.sin(time * 12);
      g.addColorStop(0, `rgb(255,${120 + pulse * 80},80)`);
      g.addColorStop(1, '#d0302a');
    } else {
      g.addColorStop(0, ratio > 0.5 ? '#b6ff6a' : '#ffe45a');
      g.addColorStop(1, ratio > 0.5 ? '#3fae3a' : '#e89a1a');
    }
    ctx.fillStyle = g;
    ctx.fillRect(i === 0 ? inner - fillW : inner, BAR_Y, fillW, BAR_H);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(x0, BAR_Y + 2, BAR_W, 5);
    ctx.restore();

    // energy bar, anchored at the outer edge
    const EW = 210;
    const ey = BAR_Y + BAR_H + 8;
    const ex = i === 0 ? outer : outer - EW;
    const en = f.energy / ENERGY_MAX;
    const full = en >= 1;
    roundRect(ctx, ex - 2, ey - 2, EW + 4, 13, 5, '#2a1840', full ? '#ffe680' : '#cbb8e8', 1.5);
    const efw = EW * en;
    const eg = ctx.createLinearGradient(ex, 0, ex + EW, 0);
    eg.addColorStop(0, '#59c6ff');
    eg.addColorStop(1, '#c47bff');
    roundRect(ctx, i === 0 ? ex : ex + EW - efw, ey, efw, 9, 4, full ? `hsl(${(time * 360) % 360},90%,65%)` : eg);
    if (full) {
      const tx = i === 0 ? ex + EW + 8 : ex - 8;
      outlinedText(ctx, '⭐ ' + t('hud.max'), tx, ey + 5, { size: 12, sw: 4, fill: '#ffe680', align: i === 0 ? 'left' : 'right' });
    }

    // portrait + name
    const px = i === 0 ? 44 : W - 44;
    circle(ctx, px, 42, 31, '#2a1840', '#fff', 3);
    ctx.save();
    ctx.beginPath();
    ctx.arc(px, 42, 29, 0, Math.PI * 2);
    ctx.clip();
    circle(ctx, px, 42, 29, i === 0 ? '#ffd6a0' : '#a0d6ff');
    const expr = f.hp <= 0 ? 'hurt' : f.state === 'win' ? 'happy' : f.state === 'hitstun' ? 'hurt' : 'normal';
    drawPortrait(ctx, f.charId, px, 46, 62, { alt, expr, time, facing: i === 0 ? 1 : -1 });
    ctx.restore();

    const nameX = outer;
    const align = i === 0 ? 'left' : 'right';
    const name = t('char.' + f.charId);
    ctx.font = `600 16px ${FONT}`;
    const nw = ctx.measureText(name).width;
    outlinedText(ctx, name, nameX, 82, { size: 16, sw: 4, align });
    if (label) {
      ctx.font = `700 11px ${FONT}`;
      const lw = ctx.measureText(label).width + 12;
      const lx = i === 0 ? nameX + nw + 8 : nameX - nw - 8 - lw;
      roundRect(ctx, lx, 74, lw, 16, 8, i === 0 ? '#ff7a59' : '#4aa3ff');
      outlinedText(ctx, label, lx + lw / 2, 82.5, { size: 11, sw: 0, weight: 700 });
    }
  }

  drawTimer(ctx, view, time) {
    const s = Math.ceil(view.timer / 60);
    const urgent = s <= 10 && view.phase === 'fight';
    const r = 30 + (urgent ? Math.max(0, Math.sin(time * 10)) * 3 : 0);
    circle(ctx, W / 2, 40, r, '#2a1840', '#fff', 3);
    outlinedText(ctx, String(s), W / 2, 42, { size: 30, sw: 0, fill: urgent ? '#ff6a5a' : '#fff', weight: 700 });
  }

  drawCombos(ctx) {
    this.combo.forEach((c, i) => {
      if (!c) return;
      const a = Math.min(1, c.t * 2);
      ctx.globalAlpha = a;
      const s = 1 + Math.max(0, c.t - 1) * 2;
      outlinedText(ctx, t('hud.hits', { n: c.n }), i === 0 ? 150 : W - 150, 140, { size: 30 * s, fill: '#ffe45a', stroke: '#b0301a', sw: 6, weight: 700 });
      ctx.globalAlpha = 1;
    });
  }

  drawPhase(ctx, view, opts, time) {
    let text = null;
    let size = 84;
    let fill = '#fff';
    const pf = view.pf;
    if (view.phase === 'intro') {
      if (pf < 70) {
        text = t('hud.ready');
        size = 64 + Math.min(1, pf / 12) * 12;
      } else {
        text = t('hud.fight');
        size = 110 - Math.min(1, (pf - 70) / 10) * 20;
        fill = '#ffe45a';
      }
    } else if (view.phase === 'fight' && pf < 25) {
      text = t('hud.fight');
      size = 90;
      fill = '#ffe45a';
      ctx.globalAlpha = 1 - pf / 25;
    } else if (view.phase === 'ko') {
      text = view.winner === 'draw' ? t('hud.draw') : t('hud.ko');
      size = 120 + Math.max(0, 20 - pf) * 3;
      fill = '#ff5a5a';
    } else if (view.phase === 'timeup') {
      text = view.winner === 'draw' ? t('hud.draw') : t('hud.timeup');
      fill = '#ffb84a';
    }
    if (text) outlinedText(ctx, text, W / 2, 250, { size, fill, sw: 12, weight: 700 });
    ctx.globalAlpha = 1;
  }

  drawBanner(ctx, alt) {
    const b = this.banner;
    if (!b) return;
    const k = b.t;
    const slide = Math.min(1, k * 6);
    const fade = k > 0.85 ? 1 - (k - 0.85) / 0.25 : 1;
    ctx.globalAlpha = Math.max(0, fade);
    const y = 300;
    const dir = b.idx === 0 ? 1 : -1;
    const g = ctx.createLinearGradient(0, y - 48, 0, y + 48);
    g.addColorStop(0, 'rgba(40,10,70,0)');
    g.addColorStop(0.2, 'rgba(40,10,70,0.85)');
    g.addColorStop(0.8, 'rgba(40,10,70,0.85)');
    g.addColorStop(1, 'rgba(40,10,70,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, y - 48, W, 96);
    const cx = W / 2 - dir * (1 - slide) * 500;
    drawPortrait(ctx, b.charId, cx - dir * 230, y, 84, { alt: alt[b.idx], expr: 'angry', facing: dir });
    outlinedText(ctx, t('char.' + b.charId + '.sp'), cx + dir * 30, y - 6, { size: 44, fill: '#ffe45a', stroke: '#6a1a8a', sw: 8, weight: 700 });
    outlinedText(ctx, '⭐ ' + t('special') + ' ⭐', cx + dir * 30, y + 32, { size: 16, sw: 4 });
    ctx.globalAlpha = 1;
  }
}
