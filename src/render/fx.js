// Particles, screen shake and flashes. Time-based so it works the same for
// the host, the CPU match and an online guest that only sees snapshots.
import { GROUND } from '../config.js';
import { circle } from './draw.js';

const MATERIAL = {
  plush: { kind: 'fluff', colors: ['#fffaf0', '#f3e6cf', '#ffffff'] },
  metal: { kind: 'spark', colors: ['#ffe066', '#ffb020', '#ffffff'] },
  wood: { kind: 'chip', colors: ['#e6c873', '#b8892a', '#f2c94c'] },
  clay: { kind: 'chip', colors: ['#c9733d', '#9e5428', '#eaa772'] },
};

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export class Effects {
  constructor() {
    this.parts = [];
    this.trauma = 0;
    this.flash = 0;
    this.dim = 0;
  }

  add(p) {
    if (this.parts.length < 260) this.parts.push({ life: 0.5, age: 0, vx: 0, vy: 0, g: 0, r: 3, rot: 0, vr: 0, ...p });
  }

  burst(x, y, n, opts) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      const s = rand(opts.speed * 0.4, opts.speed);
      this.add({ ...opts, x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - (opts.up || 0), color: pick(opts.colors), r: rand(opts.r * 0.6, opts.r), rot: rand(0, 6), vr: rand(-12, 12) });
    }
  }

  dust(x, n, spread = 30, big = false) {
    for (let i = 0; i < n; i++) {
      this.add({ kind: 'dust', x: x + rand(-spread, spread), y: GROUND - rand(0, 8), vx: rand(-90, 90), vy: rand(-50, -10), r: big ? rand(10, 18) : rand(6, 10), life: rand(0.4, 0.7), color: 'rgba(240, 225, 200, 0.7)' });
    }
  }

  handle(events, view) {
    for (const e of events) {
      switch (e.type) {
        case 'hit': {
          const mat = MATERIAL[e.mat] || MATERIAL.plush;
          this.add({ kind: 'impact', x: e.x, y: e.y, r: e.heavy ? 46 : 30, life: 0.18 });
          this.burst(e.x, e.y, e.heavy ? 14 : 7, { kind: mat.kind, colors: mat.colors, speed: mat.kind === 'spark' ? 520 : 300, r: mat.kind === 'fluff' ? 7 : 4, g: mat.kind === 'fluff' ? 120 : 900, life: mat.kind === 'fluff' ? 0.9 : 0.5, up: 80 });
          this.trauma = Math.min(1, this.trauma + (e.ko ? 0.9 : e.heavy ? 0.55 : 0.28));
          if (e.ko) this.flash = 1;
          break;
        }
        case 'block':
          this.add({ kind: 'ring', x: e.x, y: e.y, r: 34, life: 0.22, color: '#7fd6ff' });
          this.burst(e.x, e.y, 4, { kind: 'spark', colors: ['#bfefff', '#ffffff'], speed: 260, r: 3, g: 600, life: 0.25 });
          this.trauma = Math.min(1, this.trauma + 0.12);
          break;
        case 'land':
          this.dust(e.x, 3, 18);
          break;
        case 'thud':
          this.dust(e.x, 9, 50, true);
          this.trauma = Math.min(1, this.trauma + 0.35);
          break;
        case 'slam':
          this.dust(e.x, 18, 120, true);
          this.add({ kind: 'ring', x: e.x, y: GROUND - 6, r: 130, life: 0.35, color: '#ffe9b0', flat: true });
          this.trauma = Math.min(1, this.trauma + 0.8);
          break;
        case 'shoot': {
          const f = view.f[e.idx];
          this.burst(f.x + f.facing * 50, f.y - (e.kind === 'curse' ? 96 : 118), 8, { kind: 'dust', colors: e.kind === 'curse' ? ['rgba(120,40,160,0.7)'] : ['rgba(230,230,230,0.8)'], speed: 120, r: 9, g: -40, life: 0.45 });
          break;
        }
        case 'clash':
          this.add({ kind: 'impact', x: e.x, y: e.y, r: 54, life: 0.22 });
          this.burst(e.x, e.y, 14, { kind: 'spark', colors: ['#ffe066', '#ffffff', '#c08aff'], speed: 520, r: 4, g: 700, life: 0.5 });
          this.trauma = Math.min(1, this.trauma + 0.5);
          break;
        case 'special':
          this.dim = 1;
          break;
        default:
          break;
      }
    }
  }

  update(dt) {
    this.trauma = Math.max(0, this.trauma - dt * 1.8);
    this.flash = Math.max(0, this.flash - dt * 3);
    this.dim = Math.max(0, this.dim - dt * 1.4);
    for (const p of this.parts) {
      p.age += dt;
      p.vy += p.g * dt;
      if (p.kind === 'fluff') {
        p.vx *= 0.96;
        p.vy = Math.min(p.vy, 60);
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      if (p.y > GROUND + 6 && p.kind !== 'dust') {
        p.y = GROUND + 6;
        p.vy *= -0.3;
        p.vx *= 0.6;
      }
    }
    this.parts = this.parts.filter((p) => p.age < p.life);
  }

  shakeOffset(t) {
    const s = this.trauma * this.trauma * 14;
    return { x: Math.sin(t * 91) * s, y: Math.cos(t * 77) * s };
  }

  draw(ctx) {
    for (const p of this.parts) {
      const k = p.age / p.life;
      ctx.globalAlpha = Math.max(0, 1 - k);
      switch (p.kind) {
        case 'impact': {
          const r = p.r * (0.5 + k);
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.beginPath();
          for (let i = 0; i < 16; i++) {
            const a = (i / 16) * Math.PI * 2;
            const rr = i % 2 ? r * 0.4 : r;
            ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
          }
          ctx.closePath();
          ctx.fillStyle = '#fff7c2';
          ctx.fill();
          ctx.strokeStyle = '#ff9a3c';
          ctx.lineWidth = 3;
          ctx.stroke();
          ctx.restore();
          break;
        }
        case 'ring':
          ctx.beginPath();
          if (p.flat) ctx.ellipse(p.x, p.y, p.r * (0.3 + k), p.r * 0.18 * (0.3 + k), 0, 0, Math.PI * 2);
          else ctx.arc(p.x, p.y, p.r * (0.4 + k * 0.8), 0, Math.PI * 2);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 5 * (1 - k) + 1;
          ctx.stroke();
          break;
        case 'spark':
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.r * 0.8;
          ctx.lineCap = 'round';
          ctx.stroke();
          break;
        case 'chip':
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.r, -p.r * 0.6, p.r * 2, p.r * 1.2);
          ctx.restore();
          break;
        case 'fluff':
          circle(ctx, p.x, p.y, p.r, p.color);
          circle(ctx, p.x + p.r * 0.6, p.y - p.r * 0.3, p.r * 0.7, p.color);
          break;
        case 'dust':
          circle(ctx, p.x, p.y, p.r * (0.6 + k), p.color);
          break;
        default:
          break;
      }
    }
    ctx.globalAlpha = 1;
  }
}
