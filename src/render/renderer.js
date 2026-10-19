import { drawStage } from './stage.js';
import { drawDoll, drawShadow } from './puppet.js';
import { DOLLS } from './dolls.js';
import { Effects } from './fx.js';
import { Hud } from './hud.js';
import { capsule, circle, ellipse, outlinedText } from './draw.js';
import { CHARACTERS } from '../characters/index.js';
import { t as t_ } from '../i18n.js';

// Draws a match "view": either the live match object or an online snapshot.
export class Renderer {
  constructor() {
    this.time = 0;
    this.reset();
  }

  reset() {
    this.fx = new Effects();
    this.hud = new Hud();
  }

  events(ev, view) {
    if (!ev.length) return;
    this.fx.handle(ev, view);
    this.hud.handle(ev, view);
  }

  update(dt, view) {
    this.time += dt;
    this.fx.update(dt);
    this.hud.update(dt, view);
  }

  // vp: { x0, y0, x1, y1 } visible logical area, q: backing-store pixels per unit.
  draw(ctx, view, vp, opts = {}) {
    const alt = sameDollAlt(view);
    const t = this.time;
    const sh = this.fx.shakeOffset(t);
    ctx.save();
    ctx.translate(sh.x, sh.y);
    drawStage(ctx, view.stage, vp.q, t);
    if (this.fx.dim > 0) {
      ctx.fillStyle = `rgba(20, 0, 40, ${this.fx.dim * 0.45})`;
      ctx.fillRect(vp.x0 - 20, vp.y0 - 20, vp.x1 - vp.x0 + 40, vp.y1 - vp.y0 + 40);
    }
    for (const f of view.f) drawShadow(ctx, f);
    const order = [...view.f].sort((a, b) => priority(a) - priority(b));
    for (const f of order) {
      if (f.slow > 0) drawCurseAura(ctx, f, t);
      if (f.state === 'special' && f.move === 'giantFist' && f.sp === 1) drawSpeedLines(ctx, f, t);
      const rocketOut = view.proj.some((p) => p.owner === f.idx && p.kind === 'rocket');
      drawDoll(ctx, f, { time: t, alt: alt[f.idx], hideForearm: rocketOut });
      if (f.scared > 0) drawFright(ctx, f, t);
    }
    for (const f of view.f) {
      if (f.state === 'special' && f.move === 'flameBeam' && f.sp === 1) drawFlameBeam(ctx, f, vp, t);
    }
    for (const p of view.proj) drawProjectile(ctx, p, view, alt, t);
    this.fx.draw(ctx);
    ctx.restore();
    if (opts.hud !== false) this.hud.draw(ctx, view, { ...opts, alt }, t);
    if (this.fx.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${this.fx.flash * 0.8})`;
      ctx.fillRect(vp.x0, vp.y0, vp.x1 - vp.x0, vp.y1 - vp.y0);
    }
  }
}

export function sameDollAlt(view) {
  return [false, view.f[0].charId === view.f[1].charId];
}

function priority(f) {
  if (f.state === 'special') return 3;
  if (f.state === 'attack') return 2;
  if (f.state === 'down' || f.state === 'ko') return 0;
  return 1;
}

function drawCurseAura(ctx, f, t) {
  const g = ctx.createRadialGradient(f.x, f.y - 70, 10, f.x, f.y - 70, 90);
  g.addColorStop(0, 'rgba(150, 60, 200, 0.35)');
  g.addColorStop(1, 'rgba(150, 60, 200, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(f.x - 90, f.y - 160, 180, 170);
  for (let i = 0; i < 4; i++) {
    const a = t * 3 + i * 1.6;
    circle(ctx, f.x + Math.cos(a) * 40, f.y - 60 - ((t * 40 + i * 30) % 100), 3, 'rgba(190,120,255,0.8)');
  }
}

// Muay Thai's dash.
function drawSpeedLines(ctx, f, t) {
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  for (let i = 0; i < 5; i++) {
    const y = f.y - 40 - i * 24;
    const len = 50 + ((t * 600 + i * 37) % 40);
    const x = f.x - f.facing * (30 + (i % 2) * 14);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - f.facing * len, y);
    ctx.stroke();
  }
}

// Little ghosts circling a doll frozen by Mae Nak's call.
function drawFright(ctx, f, t) {
  const h = CHARACTERS[f.charId].body.h;
  for (let i = 0; i < 3; i++) {
    const a = t * 4 + (i * Math.PI * 2) / 3;
    const x = f.x + Math.cos(a) * 34;
    const y = f.y - h - 14 + Math.sin(a) * 8;
    ctx.globalAlpha = 0.85;
    circle(ctx, x, y, 8, '#f4f0ff', '#6a5a8a', 1.5);
    ctx.beginPath();
    ctx.moveTo(x - 8, y);
    ctx.lineTo(x - 8, y + 10);
    ctx.lineTo(x - 3, y + 6);
    ctx.lineTo(x + 2, y + 11);
    ctx.lineTo(x + 8, y + 6);
    ctx.lineTo(x + 8, y);
    ctx.closePath();
    ctx.fillStyle = '#f4f0ff';
    ctx.fill();
    circle(ctx, x - 3, y - 1, 1.4, '#2b2433');
    circle(ctx, x + 3, y - 1, 1.4, '#2b2433');
  }
  ctx.globalAlpha = 1;
}

// Naga's fire beam, from the mouth to the edge of the screen.
function drawFlameBeam(ctx, f, vp, t) {
  const y = f.y - 92;
  const x0 = f.x + f.facing * 75;
  const x1 = f.facing > 0 ? vp.x1 + 20 : vp.x0 - 20;
  const len = Math.abs(x1 - x0);
  const h = (22 + Math.sin(t * 60) * 3) * Math.min(1, (f.sf + 1) / 4);
  const g = ctx.createLinearGradient(0, y - h, 0, y + h);
  g.addColorStop(0, 'rgba(255,80,40,0)');
  g.addColorStop(0.28, 'rgba(255,96,40,0.9)');
  g.addColorStop(0.5, '#fff6b0');
  g.addColorStop(0.72, 'rgba(255,96,40,0.9)');
  g.addColorStop(1, 'rgba(255,80,40,0)');
  ctx.fillStyle = g;
  ctx.fillRect(Math.min(x0, x1), y - h, len, h * 2);
  for (let i = 0; i < 14; i++) {
    const d = (t * 900 + i * 83) % len;
    circle(ctx, x0 + f.facing * d, y + Math.sin(t * 20 + i) * h * 0.45, h * 0.55, i % 2 ? 'rgba(255,200,80,0.7)' : 'rgba(255,120,50,0.6)');
  }
  circle(ctx, x0, y, h * 1.25, 'rgba(255,240,180,0.9)');
}

function drawProjectile(ctx, p, view, alt, t) {
  if (p.kind === 'rocket') {
    const pal = DOLLS.robo.pal[alt[p.owner] ? 1 : 0];
    const d = Math.sign(p.vx);
    for (let i = 0; i < 5; i++) {
      const fx = p.x - d * (26 + i * 12) + Math.sin(t * 50 + i) * 2;
      circle(ctx, fx, p.y + Math.cos(t * 40 + i) * 3, 10 - i * 1.6, i < 2 ? '#fff3a0' : i < 4 ? '#ffb030' : '#ff6a2a');
    }
    capsule(ctx, { x: p.x - d * 22, y: p.y }, { x: p.x + d * 8, y: p.y }, 18, pal.body, pal.out);
    circle(ctx, p.x + d * 14, p.y, 11, pal.dark, pal.out, 2);
    capsule(ctx, { x: p.x + d * 14, y: p.y - 7 }, { x: p.x + d * 26, y: p.y - 4 }, 4, pal.metal, pal.out, 2);
    capsule(ctx, { x: p.x + d * 14, y: p.y + 7 }, { x: p.x + d * 26, y: p.y + 4 }, 4, pal.metal, pal.out, 2);
  } else if (p.kind === 'curse') {
    const d = Math.sign(p.vx);
    for (let i = 1; i < 5; i++) circle(ctx, p.x - d * i * 14, p.y + Math.sin(t * 8 + i) * 6, 14 - i * 2.5, `rgba(110, 30, 150, ${0.5 - i * 0.09})`);
    const g = ctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, 26);
    g.addColorStop(0, '#e2b0ff');
    g.addColorStop(0.45, '#7a2aa8');
    g.addColorStop(1, 'rgba(40, 0, 60, 0.9)');
    circle(ctx, p.x, p.y, 24, g);
    ctx.strokeStyle = 'rgba(230, 180, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 30, t * 6, t * 6 + 2.2);
    ctx.stroke();
    ellipse(ctx, p.x - 7, p.y - 3, 4, 6, 0, '#fff7a0');
    ellipse(ctx, p.x + 7, p.y - 3, 4, 6, 0, '#fff7a0');
    ctx.beginPath();
    ctx.arc(p.x, p.y + 8, 6, 0, Math.PI);
    ctx.strokeStyle = '#fff7a0';
    ctx.stroke();
  } else if (p.kind === 'scream') {
    // Mae Nak's haunting call: ripples rolling along the floor.
    const d = Math.sign(p.vx);
    const start = d > 0 ? -Math.PI / 2 : Math.PI / 2;
    ctx.lineWidth = 4;
    for (let i = 0; i < 4; i++) {
      const k = (t * 3 + i * 0.25) % 1;
      ctx.globalAlpha = 0.85 * (1 - k);
      ctx.strokeStyle = i % 2 ? '#d9c8ff' : '#ffffff';
      ctx.beginPath();
      ctx.ellipse(p.x - d * k * 34, p.y, 12 + k * 18, 34 + k * 8, 0, start, start + Math.PI);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    outlinedText(ctx, t_('fx.phimak'), p.x, p.y - 58 + Math.sin(t * 6) * 3, { size: 18, fill: '#ece2ff', stroke: '#3a1a5a', sw: 4 });
  }
}
