// The five home/adventure backgrounds, drawn procedurally at any size.
// tod: 'morning' | 'day' | 'evening' | 'night' tints the sky and lights.
import { circle, ellipse, line, roundRect } from '../../../src/render/draw.js';
import { star } from './pets.js';

const TAU = Math.PI * 2;

const SKY = {
  morning: ['#8ecdf0', '#ffe2b8'],
  day: ['#5fb8ef', '#c6ebff'],
  evening: ['#5b4f9e', '#ffa06e'],
  night: ['#0f1736', '#2b3a6e'],
};

function seeded(seed) {
  let a = seed;
  return () => {
    a = (a * 1664525 + 1013904223) >>> 0;
    return a / 4294967296;
  };
}

function sky(ctx, x, y, w, h, tod, t, k, rnd) {
  const [top, bottom] = SKY[tod];
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  if (tod === 'night') {
    for (let i = 0; i < 60; i++) {
      const sx = x + rnd() * w;
      const sy = y + rnd() * h * 0.8;
      const tw = 0.5 + 0.5 * Math.sin(t * 2 + i * 1.7);
      circle(ctx, sx, sy, (0.4 + rnd() * 0.6) * k * 0.35, `rgba(255,255,240,${0.4 + tw * 0.6})`);
    }
    circle(ctx, x + w * 0.8, y + h * 0.22, 5 * k, '#fff6d6');
    circle(ctx, x + w * 0.8 + 2 * k, y + h * 0.22 - 1.2 * k, 4.3 * k, top);
  } else {
    const sunY = tod === 'evening' ? y + h * 0.72 : tod === 'morning' ? y + h * 0.5 : y + h * 0.2;
    const sunX = tod === 'evening' ? x + w * 0.78 : x + w * 0.82;
    const glow = ctx.createRadialGradient(sunX, sunY, k, sunX, sunY, 14 * k);
    glow.addColorStop(0, 'rgba(255,240,180,0.9)');
    glow.addColorStop(1, 'rgba(255,240,180,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(sunX - 14 * k, sunY - 14 * k, 28 * k, 28 * k);
    circle(ctx, sunX, sunY, 5 * k, tod === 'evening' ? '#ffb35c' : '#fff1a8');
    for (let i = 0; i < 3; i++) {
      const cx = x + ((rnd() * w + t * k * (0.6 + i * 0.3)) % (w + 30 * k)) - 15 * k;
      cloud(ctx, cx, y + h * (0.15 + rnd() * 0.35), (3 + rnd() * 2) * k, tod === 'evening' ? '#ffd6c0' : '#ffffff');
    }
  }
}

function cloud(ctx, x, y, s, color) {
  ctx.fillStyle = color;
  ctx.globalAlpha *= 0.92;
  ctx.beginPath();
  ctx.arc(x, y, s, 0, TAU);
  ctx.arc(x + s * 1.2, y - s * 0.5, s * 1.25, 0, TAU);
  ctx.arc(x + s * 2.5, y, s * 1.05, 0, TAU);
  ctx.ellipse(x + s * 1.2, y + s * 0.3, s * 2.4, s * 0.7, 0, 0, TAU);
  ctx.fill();
  ctx.globalAlpha /= 0.92;
}

function nightShade(ctx, W, H, tod, alpha = 0.38) {
  if (tod === 'night') {
    ctx.fillStyle = `rgba(16,24,70,${alpha})`;
    ctx.fillRect(0, 0, W, H);
  } else if (tod === 'evening') {
    ctx.fillStyle = 'rgba(255,120,60,0.08)';
    ctx.fillRect(0, 0, W, H);
  }
}

function glowAt(ctx, x, y, r, color) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(255,200,120,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

function tree(ctx, x, y, s, leaf, trunk = '#7a4f2e') {
  roundRect(ctx, x - s * 0.18, y - s * 1.2, s * 0.36, s * 1.2, s * 0.08, trunk);
  ctx.fillStyle = leaf;
  ctx.beginPath();
  ctx.arc(x, y - s * 1.6, s * 0.75, 0, TAU);
  ctx.arc(x - s * 0.55, y - s * 1.2, s * 0.55, 0, TAU);
  ctx.arc(x + s * 0.55, y - s * 1.2, s * 0.55, 0, TAU);
  ctx.fill();
}

// ---------------- ☕ cafe ----------------

function cafe(ctx, W, H, tod, t, k, gy, rnd) {
  // wall
  ctx.fillStyle = '#f4e4c9';
  ctx.fillRect(0, 0, W, gy);
  ctx.fillStyle = 'rgba(200,160,110,0.12)';
  for (let x = 0; x < W; x += 6 * k) ctx.fillRect(x, 0, 3 * k, gy);
  // big arched window
  const wx = W * 0.06;
  const ww = Math.min(W * 0.36, 48 * k);
  const wy = gy * 0.16;
  const wh = gy * 0.56;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(wx, wy + wh);
  ctx.lineTo(wx, wy + ww / 2);
  ctx.arc(wx + ww / 2, wy + ww / 2, ww / 2, Math.PI, 0);
  ctx.lineTo(wx + ww, wy + wh);
  ctx.closePath();
  ctx.clip();
  sky(ctx, wx, wy, ww, wh, tod, t, k * 0.6, rnd);
  ctx.fillStyle = tod === 'night' ? '#1d3b2a' : '#6fb36a';
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(wx + ww * (0.1 + i * 0.3), wy + wh, ww * 0.22, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  ctx.strokeStyle = '#8a5a34';
  ctx.lineWidth = 2.2 * k;
  ctx.beginPath();
  ctx.moveTo(wx, wy + wh);
  ctx.lineTo(wx, wy + ww / 2);
  ctx.arc(wx + ww / 2, wy + ww / 2, ww / 2, Math.PI, 0);
  ctx.lineTo(wx + ww, wy + wh);
  ctx.closePath();
  ctx.stroke();
  line(ctx, [wx + ww / 2, wy, wx + ww / 2, wy + wh], '#8a5a34', 1.4 * k);
  line(ctx, [wx, wy + wh * 0.55, wx + ww, wy + wh * 0.55], '#8a5a34', 1.4 * k);
  roundRect(ctx, wx - 2 * k, wy + wh - k, ww + 4 * k, 3 * k, k, '#a8713f');
  // potted plants on the sill
  for (const px of [wx + ww * 0.2, wx + ww * 0.75]) {
    roundRect(ctx, px - 2.5 * k, wy + wh - 6 * k, 5 * k, 5 * k, k, '#d8774f');
    for (let i = 0; i < 5; i++) ellipse(ctx, px + (i - 2) * 1.6 * k, wy + wh - 8 * k - Math.abs(i - 2) * -0.8 * k, 1.4 * k, 3 * k, (i - 2) * 0.4, '#4f9a55');
  }
  // chalkboard menu
  const bx = W * 0.5;
  const bw = Math.min(W * 0.2, 26 * k);
  roundRect(ctx, bx, gy * 0.18, bw, gy * 0.3, 1.5 * k, '#2f4a3c', '#8a5a34', 1.6 * k);
  ctx.fillStyle = '#f5f0e0';
  ctx.font = `600 ${3.4 * k}px "Mitr", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('เมนู', bx + bw / 2, gy * 0.24);
  for (let i = 0; i < 3; i++) line(ctx, [bx + bw * 0.18, gy * (0.3 + i * 0.05), bx + bw * (0.55 + (i % 2) * 0.2), gy * (0.3 + i * 0.05)], 'rgba(245,240,224,0.75)', 0.5 * k);
  // coffee cup doodle
  ctx.strokeStyle = 'rgba(245,240,224,0.85)';
  ctx.lineWidth = 0.5 * k;
  ctx.strokeRect(bx + bw * 0.68, gy * 0.37, bw * 0.15, gy * 0.06);
  // shelves with jars and cups
  const sx = W * 0.74;
  const sw = W * 0.24;
  for (let r = 0; r < 2; r++) {
    const sy = gy * (0.28 + r * 0.2);
    roundRect(ctx, sx, sy, sw, 1.4 * k, 0.5 * k, '#8a5a34');
    let x = sx + 2 * k;
    while (x < sx + sw - 5 * k) {
      const kind = rnd();
      const c = ['#e9a55a', '#d8774f', '#7fb6c9', '#f2d16b', '#b58cd9'][Math.floor(rnd() * 5)];
      if (kind < 0.5) {
        roundRect(ctx, x, sy - 6 * k, 4 * k, 6 * k, k, 'rgba(255,255,255,0.55)', '#9b8a76', 0.4 * k);
        roundRect(ctx, x + 0.5 * k, sy - 4 * k, 3 * k, 4 * k, 0.6 * k, c);
        roundRect(ctx, x + 0.3 * k, sy - 7 * k, 3.4 * k, 1.4 * k, 0.4 * k, '#8a5a34');
        x += 6 * k;
      } else {
        roundRect(ctx, x, sy - 3.5 * k, 3.6 * k, 3.5 * k, 0.8 * k, c, '#6b4a30', 0.3 * k);
        x += 5 * k;
      }
    }
  }
  // pendant lamps
  const lit = tod === 'night' || tod === 'evening';
  for (const lx of [W * 0.3, W * 0.55, W * 0.8]) {
    line(ctx, [lx, 0, lx, gy * 0.1], '#3b2a2a', 0.4 * k);
    if (lit) glowAt(ctx, lx, gy * 0.13, 16 * k, 'rgba(255,214,140,0.55)');
    ctx.fillStyle = '#2f3b3a';
    ctx.beginPath();
    ctx.moveTo(lx - 4 * k, gy * 0.13);
    ctx.quadraticCurveTo(lx, gy * 0.07, lx + 4 * k, gy * 0.13);
    ctx.closePath();
    ctx.fill();
    circle(ctx, lx, gy * 0.135, 1.3 * k, lit ? '#fff1b0' : '#f3e2b0');
  }
  // counter with espresso machine
  const cx = W * 0.62;
  const cy = gy - 13 * k;
  roundRect(ctx, cx, cy, W - cx + 2 * k, 13 * k + 2, 0, '#7e5230');
  for (let x = cx + 4 * k; x < W; x += 6 * k) line(ctx, [x, cy + 2 * k, x, gy], 'rgba(60,30,10,0.25)', 0.4 * k);
  roundRect(ctx, cx - k, cy - 1.6 * k, W - cx + 3 * k, 2 * k, 0.6 * k, '#e9dccb');
  const mx = cx + 6 * k;
  roundRect(ctx, mx, cy - 12 * k, 13 * k, 10.5 * k, 1.4 * k, '#c9d0d6', '#7d868e', 0.5 * k);
  roundRect(ctx, mx + 2 * k, cy - 10 * k, 9 * k, 3 * k, 0.6 * k, '#2f3b3a');
  circle(ctx, mx + 4 * k, cy - 8.5 * k, 0.6 * k, '#ff6b5b');
  line(ctx, [mx + 6.5 * k, cy - 6 * k, mx + 6.5 * k, cy - 4 * k], '#3b3b3b', 1.2 * k);
  roundRect(ctx, mx + 5 * k, cy - 3.6 * k, 3 * k, 2 * k, 0.5 * k, '#ffffff', '#9b8a76', 0.3 * k);
  // steam
  for (let i = 0; i < 2; i++) {
    const s = (t * 0.6 + i * 0.5) % 1;
    ctx.globalAlpha = 0.5 * (1 - s);
    line(ctx, [mx + 6.5 * k, cy - 4 * k - s * 5 * k, mx + 7.5 * k, cy - 5 * k - s * 7 * k], '#ffffff', 0.5 * k);
    ctx.globalAlpha = 1;
  }
  // wainscot
  roundRect(ctx, 0, gy - 9 * k, cx, 9 * k, 0, '#b07a4a');
  for (let x = 0; x < cx; x += 5 * k) line(ctx, [x, gy - 9 * k, x, gy], 'rgba(60,30,10,0.2)', 0.4 * k);
  line(ctx, [0, gy - 9 * k, cx, gy - 9 * k], '#8a5a34', 1 * k);
  // wooden floor
  ctx.fillStyle = '#c8915f';
  ctx.fillRect(0, gy, W, H - gy);
  for (let i = 1; i < 8; i++) {
    const y = gy + (H - gy) * Math.pow(i / 8, 1.4);
    line(ctx, [0, y, W, y], 'rgba(90,50,20,0.22)', 0.35 * k);
  }
  for (let i = -6; i <= 6; i++) line(ctx, [W / 2 + i * 9 * k, gy, W / 2 + i * 22 * k, H], 'rgba(90,50,20,0.16)', 0.35 * k);
  // round rug for the pet
  ellipse(ctx, W / 2, gy + (H - gy) * 0.45, Math.min(W * 0.36, 40 * k), (H - gy) * 0.26, 0, '#e2735a');
  ellipse(ctx, W / 2, gy + (H - gy) * 0.45, Math.min(W * 0.3, 33 * k), (H - gy) * 0.2, 0, null, '#f6c56b', 1.2 * k);
  if (tod === 'night') {
    ctx.fillStyle = 'rgba(30,20,60,0.22)';
    ctx.fillRect(0, 0, W, H);
    for (const lx of [W * 0.3, W * 0.55, W * 0.8]) glowAt(ctx, lx, gy * 0.13, 22 * k, 'rgba(255,214,140,0.35)');
  }
}

// ---------------- 🌾 rice field ----------------

function field(ctx, W, H, tod, t, k, gy, rnd) {
  const hz = gy - 16 * k;
  sky(ctx, 0, 0, W, hz, tod, t, k, rnd);
  // mountains
  for (const [col, hgt, off] of [
    ['#8fb7c9', 16, 0],
    ['#6f9fb0', 11, 0.4],
  ]) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(0, hz);
    for (let x = 0; x <= W + 20 * k; x += 20 * k) ctx.lineTo(x, hz - hgt * k * (0.5 + 0.5 * Math.abs(Math.sin(x / (30 * k) + off * 5))));
    ctx.lineTo(W, hz);
    ctx.closePath();
    ctx.fill();
  }
  // paddies: bands that widen toward the viewer
  const bands = 9;
  for (let i = 0; i < bands; i++) {
    const y0 = hz + (H - hz) * Math.pow(i / bands, 1.6);
    const y1 = hz + (H - hz) * Math.pow((i + 1) / bands, 1.6);
    ctx.fillStyle = i % 2 ? '#7cc45a' : '#8fd166';
    ctx.fillRect(0, y0, W, y1 - y0 + 1);
    ctx.strokeStyle = 'rgba(40,110,40,0.35)';
    ctx.lineWidth = Math.max(1, (y1 - y0) * 0.08);
    const step = (4 + i * 2) * k * 0.6;
    ctx.beginPath();
    for (let x = (i * 3) % step; x < W; x += step) {
      const sway = Math.sin(t * 1.5 + x * 0.05) * (y1 - y0) * 0.1;
      ctx.moveTo(x, y1);
      ctx.lineTo(x + sway, y0 + (y1 - y0) * 0.2);
    }
    ctx.stroke();
    line(ctx, [0, y0, W, y0], 'rgba(120,90,50,0.35)', Math.max(1, (y1 - y0) * 0.06));
  }
  // dirt dike path to the front
  ctx.fillStyle = '#d6b07a';
  ctx.beginPath();
  ctx.moveTo(W * 0.47, hz + 2 * k);
  ctx.lineTo(W * 0.53, hz + 2 * k);
  ctx.quadraticCurveTo(W * 0.62, H * 0.85, W * 0.78, H);
  ctx.lineTo(W * 0.22, H);
  ctx.quadraticCurveTo(W * 0.4, H * 0.85, W * 0.47, hz + 2 * k);
  ctx.fill();
  ellipse(ctx, W / 2, gy + (H - gy) * 0.45, Math.min(W * 0.3, 34 * k), (H - gy) * 0.2, 0, '#e2c08c');
  // hut on stilts (thiang na)
  const hx = W * 0.78;
  const hy = hz + 6 * k;
  for (const dx of [-7, -2, 3, 8]) line(ctx, [hx + dx * k, hy, hx + dx * k, hy - 8 * k], '#6b4a2a', 0.9 * k);
  roundRect(ctx, hx - 9 * k, hy - 9 * k, 18 * k, 1.6 * k, 0.4 * k, '#8a5a34');
  ctx.fillStyle = '#d9b25a';
  ctx.beginPath();
  ctx.moveTo(hx - 12 * k, hy - 13 * k);
  ctx.lineTo(hx, hy - 22 * k);
  ctx.lineTo(hx + 12 * k, hy - 13 * k);
  ctx.closePath();
  ctx.fill();
  for (let i = 0; i < 6; i++) line(ctx, [hx - 10 * k + i * 4 * k, hy - 13.4 * k, hx - 2 * k + i * 0.6 * k, hy - 20 * k], 'rgba(140,100,40,0.5)', 0.3 * k);
  line(ctx, [hx - 9 * k, hy - 13 * k, hx - 9 * k, hy - 9 * k], '#6b4a2a', 0.7 * k);
  line(ctx, [hx + 9 * k, hy - 13 * k, hx + 9 * k, hy - 9 * k], '#6b4a2a', 0.7 * k);
  // scarecrow with a ngob hat
  const sx = W * 0.18;
  const sy = hz + 12 * k;
  line(ctx, [sx, sy, sx, sy - 16 * k], '#7a4f2e', 0.9 * k);
  line(ctx, [sx - 7 * k, sy - 11 * k, sx + 7 * k, sy - 11 * k], '#7a4f2e', 0.8 * k);
  roundRect(ctx, sx - 4 * k, sy - 13 * k, 8 * k, 7 * k, k, '#4f7fc9');
  circle(ctx, sx, sy - 16.5 * k, 2.4 * k, '#f2dca5');
  ctx.fillStyle = '#e1b85c';
  ctx.beginPath();
  ctx.moveTo(sx - 5 * k, sy - 17.5 * k);
  ctx.lineTo(sx, sy - 22 * k);
  ctx.lineTo(sx + 5 * k, sy - 17.5 * k);
  ctx.closePath();
  ctx.fill();
  // birds
  if (tod !== 'night') {
    for (let i = 0; i < 3; i++) {
      const bx = (W * 0.3 + i * 6 * k + t * 3 * k) % W;
      const by = hz * (0.3 + i * 0.06);
      const fl = Math.sin(t * 8 + i) * k;
      line(ctx, [bx - 1.6 * k, by - fl, bx, by, bx + 1.6 * k, by - fl], '#3b3b4a', 0.4 * k);
    }
  }
  nightShade(ctx, W, H, tod);
  if (tod === 'night' || tod === 'evening') fireflies(ctx, W, H, hz, t, k, 10);
}

function fireflies(ctx, W, H, top, t, k, n) {
  for (let i = 0; i < n; i++) {
    const x = (W * ((i * 0.618) % 1) + Math.sin(t * 0.7 + i) * 8 * k + W) % W;
    const y = top + (H - top) * (0.1 + ((i * 0.37) % 0.7)) + Math.cos(t * 0.9 + i * 2) * 4 * k;
    const a = 0.5 + 0.5 * Math.sin(t * 3 + i * 1.3);
    glowAt(ctx, x, y, 3 * k, `rgba(220,255,120,${0.5 * a})`);
    circle(ctx, x, y, 0.5 * k, `rgba(240,255,170,${0.4 + 0.6 * a})`);
  }
}

// ---------------- 🏯 Thai palace house ----------------

function thaiRoof(ctx, cx, base, w, h, k) {
  // steep gable with curled finials (chofa) and gold bargeboards
  ctx.fillStyle = '#8c2f22';
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, base);
  ctx.lineTo(cx, base - h);
  ctx.lineTo(cx + w / 2, base);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#a63f2c';
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.36, base);
  ctx.lineTo(cx, base - h * 0.78);
  ctx.lineTo(cx + w * 0.36, base);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#7a4a26';
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.3, base);
  ctx.lineTo(cx, base - h * 0.62);
  ctx.lineTo(cx + w * 0.3, base);
  ctx.closePath();
  ctx.fill();
  for (let i = 1; i < 5; i++) line(ctx, [cx - w * 0.3 * (1 - i / 6), base - h * 0.62 * (i / 6), cx + w * 0.3 * (1 - i / 6), base - h * 0.62 * (i / 6)], 'rgba(255,210,120,0.25)', 0.3 * k);
  line(ctx, [cx - w / 2, base, cx, base - h, cx + w / 2, base], '#e9b443', 1.1 * k);
  // chofa (top) and hang hong (bottom curls)
  ctx.strokeStyle = '#e9b443';
  ctx.lineWidth = 1.1 * k;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx, base - h);
  ctx.quadraticCurveTo(cx + 1 * k, base - h - 5 * k, cx + 4 * k, base - h - 4 * k);
  ctx.stroke();
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + (s * w) / 2, base);
    ctx.quadraticCurveTo(cx + s * (w / 2 + 3 * k), base - 1 * k, cx + s * (w / 2 + 2.5 * k), base - 4 * k);
    ctx.stroke();
  }
}

function palace(ctx, W, H, tod, t, k, gy, rnd) {
  const hz = gy - 6 * k;
  sky(ctx, 0, 0, W, hz, tod, t, k, rnd);
  // distant trees / wall
  ctx.fillStyle = '#5f9a5a';
  for (let x = -5 * k; x < W + 10 * k; x += 9 * k) {
    ctx.beginPath();
    ctx.arc(x, hz - 6 * k, 7 * k, 0, TAU);
    ctx.fill();
  }
  roundRect(ctx, 0, hz - 6 * k, W, 6 * k, 0, '#efe3c8');
  for (let x = 0; x < W; x += 8 * k) roundRect(ctx, x + 1 * k, hz - 8 * k, 6 * k, 2.2 * k, 0.5 * k, '#d9c49b');
  // main house on stilts, centered behind the pet
  const cx = W * 0.5;
  const w = Math.min(W * 0.6, 62 * k);
  const base = hz - 26 * k;
  for (let i = 0; i <= 6; i++) line(ctx, [cx - w * 0.42 + (i * w * 0.84) / 6, hz, cx - w * 0.42 + (i * w * 0.84) / 6, base + 14 * k], '#5e3b20', 1.2 * k);
  roundRect(ctx, cx - w * 0.46, base + 12 * k, w * 0.92, 2.2 * k, 0.4 * k, '#7a4a26');
  roundRect(ctx, cx - w * 0.36, base, w * 0.72, 12.5 * k, 0.4 * k, '#a8713f');
  for (let i = 0; i < 8; i++) line(ctx, [cx - w * 0.36 + (i * w * 0.72) / 8, base, cx - w * 0.36 + (i * w * 0.72) / 8, base + 12.5 * k], 'rgba(70,40,20,0.35)', 0.4 * k);
  const lit = tod === 'night' || tod === 'evening';
  for (const dx of [-0.2, 0, 0.2]) {
    roundRect(ctx, cx + dx * w - 3 * k, base + 3 * k, 6 * k, 7 * k, 0.6 * k, lit ? '#ffd27a' : '#5b3820', '#e9b443', 0.4 * k);
    if (lit) glowAt(ctx, cx + dx * w, base + 6.5 * k, 9 * k, 'rgba(255,200,110,0.45)');
  }
  thaiRoof(ctx, cx, base + 1 * k, w * 0.86, 28 * k, k);
  // side pavilion (sala)
  const px = W * 0.12;
  const pb = hz - 12 * k;
  for (const dx of [-6, 6]) line(ctx, [px + dx * k, hz, px + dx * k, pb], '#efe3c8', 1.2 * k);
  thaiRoof(ctx, px, pb, 22 * k, 14 * k, k);
  // frangipani tree
  const fx = W * 0.88;
  line(ctx, [fx, hz + 4 * k, fx - 2 * k, hz - 14 * k, fx - 6 * k, hz - 20 * k], '#8a6a52', 1.6 * k);
  line(ctx, [fx - 2 * k, hz - 14 * k, fx + 5 * k, hz - 22 * k], '#8a6a52', 1.3 * k);
  for (let i = 0; i < 14; i++) {
    const a = rnd() * TAU;
    const d = rnd() * 9 * k;
    const lx = fx + Math.cos(a) * d;
    const ly = hz - 22 * k + Math.sin(a) * d * 0.6;
    ellipse(ctx, lx, ly, 2.4 * k, 1.1 * k, a, '#4f8f45');
    if (i % 2) {
      circle(ctx, lx + k, ly - k, 0.9 * k, '#fffaf0');
      circle(ctx, lx + k, ly - k, 0.35 * k, '#ffd25a');
    }
  }
  // stone terrace
  ctx.fillStyle = '#e8dcc6';
  ctx.fillRect(0, hz, W, H - hz);
  for (let i = 1; i < 7; i++) {
    const y = hz + (H - hz) * Math.pow(i / 7, 1.4);
    line(ctx, [0, y, W, y], 'rgba(150,120,80,0.3)', 0.3 * k);
  }
  for (let i = -8; i <= 8; i++) line(ctx, [W / 2 + i * 7 * k, hz, W / 2 + i * 18 * k, H], 'rgba(150,120,80,0.22)', 0.3 * k);
  // lotus pond (front left)
  const lx = W * 0.12;
  const ly = gy + (H - gy) * 0.62;
  ellipse(ctx, lx, ly, Math.min(W * 0.2, 24 * k), 7 * k, 0, '#4c8fb0', '#b8a88a', 0.8 * k);
  ellipse(ctx, lx, ly - 0.8 * k, Math.min(W * 0.17, 21 * k), 5 * k, 0, '#5fa6c4');
  for (const [dx, dy] of [
    [-10, 1],
    [4, -1.5],
    [12, 1.5],
  ]) {
    ellipse(ctx, lx + dx * k, ly + dy * k, 3.2 * k, 1.3 * k, 0, '#4f9a55');
  }
  for (const [dx, dy] of [
    [-4, -2],
    [9, -3],
  ]) {
    const bx = lx + dx * k;
    const by = ly + dy * k;
    for (let p = -2; p <= 2; p++) ellipse(ctx, bx + p * 0.9 * k, by - 1.4 * k, 0.9 * k, 2.2 * k, p * 0.35, '#f49ab6', '#d86a8f', 0.2 * k);
  }
  // hanging lantern
  const nx = W * 0.72;
  line(ctx, [nx, base + 14 * k, nx, base + 18 * k], '#5e3b20', 0.3 * k);
  if (lit) glowAt(ctx, nx, base + 20 * k, 10 * k, 'rgba(255,190,90,0.6)');
  ellipse(ctx, nx, base + 20 * k, 1.8 * k, 2.4 * k, 0, lit ? '#ffcf6b' : '#d8574a', '#8c2f22', 0.3 * k);
  ellipse(ctx, W / 2, gy + (H - gy) * 0.45, Math.min(W * 0.32, 36 * k), (H - gy) * 0.2, 0, '#c9a46c');
  ellipse(ctx, W / 2, gy + (H - gy) * 0.45, Math.min(W * 0.27, 30 * k), (H - gy) * 0.15, 0, null, '#e9b443', 0.8 * k);
  nightShade(ctx, W, H, tod, 0.32);
  if (lit) {
    for (const dx of [-0.2, 0, 0.2]) glowAt(ctx, cx + dx * w, base + 6.5 * k, 7 * k, 'rgba(255,200,110,0.35)');
    glowAt(ctx, nx, base + 20 * k, 7 * k, 'rgba(255,190,90,0.5)');
  }
}

// ---------------- 🌳 forest ----------------

function forest(ctx, W, H, tod, t, k, gy, rnd) {
  const hz = gy - 8 * k;
  sky(ctx, 0, 0, W, hz, tod, t, k, rnd);
  const dark = tod === 'night';
  // undergrowth behind the trunks so no sky shows through
  ctx.fillStyle = dark ? '#132a22' : '#3c7a52';
  ctx.fillRect(0, hz - 10 * k, W, 14 * k);
  // two layers of trees, far to near
  const layers = [
    { col: dark ? '#1c3a32' : '#5e9e7a', y: hz, s: 9, gap: 10 },
    { col: dark ? '#173027' : '#3f8458', y: hz + 3 * k, s: 12, gap: 14 },
  ];
  for (const L of layers) {
    for (let x = -10 * k + rnd() * 5 * k; x < W + 10 * k; x += L.gap * k) tree(ctx, x, L.y, L.s * k * (0.85 + rnd() * 0.3), L.col, dark ? '#2a1d14' : '#6b4a2a');
  }
  // light rays by day
  if (tod === 'day' || tod === 'morning') {
    ctx.fillStyle = 'rgba(255,250,210,0.18)';
    for (let i = 0; i < 3; i++) {
      const x = W * (0.2 + i * 0.3);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 6 * k, 0);
      ctx.lineTo(x + 22 * k, gy);
      ctx.lineTo(x + 10 * k, gy);
      ctx.closePath();
      ctx.fill();
    }
  }
  // ground
  ctx.fillStyle = dark ? '#2d5a37' : '#6fb562';
  ctx.fillRect(0, hz + 2 * k, W, H - hz);
  // stream
  ctx.fillStyle = '#5fa8d6';
  ctx.beginPath();
  ctx.moveTo(W, hz + 4 * k);
  ctx.bezierCurveTo(W * 0.6, hz + 6 * k, W * 0.75, gy + 4 * k, W * 0.35, gy + 8 * k);
  ctx.bezierCurveTo(W * 0.1, gy + 10 * k, W * 0.05, gy + 14 * k, -5, gy + 15 * k);
  ctx.lineTo(-5, gy + 22 * k);
  ctx.bezierCurveTo(W * 0.15, gy + 20 * k, W * 0.3, gy + 16 * k, W * 0.45, gy + 13 * k);
  ctx.bezierCurveTo(W * 0.8, gy + 7 * k, W * 0.7, hz + 8 * k, W, hz + 8 * k);
  ctx.closePath();
  ctx.fill();
  for (let i = 0; i < 6; i++) {
    const x = W * ((i * 0.17 + t * 0.03) % 1);
    line(ctx, [x, gy + 10 * k - x * 0.02, x + 3 * k, gy + 9.6 * k - x * 0.02], 'rgba(255,255,255,0.6)', 0.4 * k);
  }
  for (let i = 0; i < 5; i++) ellipse(ctx, W * (0.1 + i * 0.2), gy + 13 * k - i * 1.5 * k, 2.4 * k, 1.3 * k, 0, '#9aa3a8', '#6b7378', 0.3 * k);
  // grass tufts, ferns
  for (let i = 0; i < 26; i++) {
    const x = rnd() * W;
    const y = gy + rnd() * (H - gy);
    const s = (0.6 + ((y - gy) / (H - gy)) * 0.8) * k;
    for (let j = -1; j <= 1; j++) line(ctx, [x, y, x + j * 1.2 * s, y - 2.6 * s], dark ? '#3b7a48' : '#4f9a4f', 0.5 * s);
  }
  // mushrooms
  for (const [mx, my, ms] of [
    [0.12, 0.8, 1.2],
    [0.17, 0.84, 0.8],
    [0.86, 0.78, 1],
  ]) {
    const x = W * mx;
    const y = gy + (H - gy) * my;
    const s = ms * k;
    roundRect(ctx, x - 1.1 * s, y - 4 * s, 2.2 * s, 4 * s, 0.6 * s, '#fff1dc');
    ctx.fillStyle = '#e04a3a';
    ctx.beginPath();
    ctx.ellipse(x, y - 4 * s, 4 * s, 3 * s, 0, Math.PI, 0);
    ctx.fill();
    circle(ctx, x - 1.5 * s, y - 5.2 * s, 0.6 * s, '#fff');
    circle(ctx, x + 1.4 * s, y - 5.6 * s, 0.5 * s, '#fff');
  }
  ellipse(ctx, W / 2, gy + (H - gy) * 0.45, Math.min(W * 0.32, 36 * k), (H - gy) * 0.18, 0, dark ? '#4a6a3a' : '#a7d184');
  nightShade(ctx, W, H, tod, 0.3);
  if (tod !== 'day') fireflies(ctx, W, H, hz - 10 * k, t, k, tod === 'night' ? 16 : 8);
}

// ---------------- 🏖️ beach ----------------

function palm(ctx, x, y, s, lean, t) {
  ctx.strokeStyle = '#9a6a3e';
  ctx.lineWidth = 2.2 * s;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  const tx = x + lean * 14 * s;
  const ty = y - 34 * s;
  ctx.quadraticCurveTo(x + lean * 2 * s, y - 20 * s, tx, ty);
  ctx.stroke();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 1.1 - Math.PI * 1.05 + Math.sin(t * 1.3 + i) * 0.05;
    const ex = tx + Math.cos(a) * 15 * s;
    const ey = ty + Math.sin(a) * 9 * s + 6 * s;
    ctx.strokeStyle = '#3f9a52';
    ctx.lineWidth = 2.4 * s;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo((tx + ex) / 2, ty - 4 * s, ex, ey);
    ctx.stroke();
  }
  for (const dx of [-1, 1]) circle(ctx, tx + dx * 1.5 * s, ty + 2 * s, 1.5 * s, '#7a5a2e');
}

function beach(ctx, W, H, tod, t, k, gy, rnd) {
  const hz = gy - 22 * k;
  sky(ctx, 0, 0, W, hz, tod, t, k, rnd);
  // sea
  const sea = ctx.createLinearGradient(0, hz, 0, gy);
  sea.addColorStop(0, tod === 'night' ? '#1f3d6b' : '#2f9fd0');
  sea.addColorStop(1, tod === 'night' ? '#2a5a7a' : '#62d3d8');
  ctx.fillStyle = sea;
  ctx.fillRect(0, hz, W, gy - hz + 2 * k);
  // island + boat
  ctx.fillStyle = tod === 'night' ? '#203a3a' : '#4f8f6a';
  ctx.beginPath();
  ctx.ellipse(W * 0.22, hz, 14 * k, 4 * k, 0, Math.PI, 0);
  ctx.fill();
  const bx = (W * 0.6 + t * 1.2 * k) % (W + 20 * k);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(bx, hz + 3 * k);
  ctx.lineTo(bx, hz - 5 * k);
  ctx.lineTo(bx + 4 * k, hz + 2 * k);
  ctx.closePath();
  ctx.fill();
  roundRect(ctx, bx - 3 * k, hz + 2.6 * k, 8 * k, 1.4 * k, 0.6 * k, '#c0503e');
  if (tod === 'night') {
    for (let i = 0; i < 6; i++) line(ctx, [W * 0.8 - (3 + i) * k, hz + (2 + i * 2) * k, W * 0.8 + (3 + i) * k, hz + (2 + i * 2) * k], 'rgba(255,246,214,0.45)', 0.4 * k);
  }
  // waves
  for (let i = 0; i < 4; i++) {
    const y = hz + (gy - hz) * (0.25 + i * 0.2);
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 0.5 * k;
    ctx.beginPath();
    for (let x = -10 * k; x < W + 10 * k; x += 8 * k) {
      const xx = x + ((t * 4 * k * (i + 1)) % (8 * k));
      ctx.moveTo(xx, y);
      ctx.quadraticCurveTo(xx + 2 * k, y - 0.8 * k, xx + 4 * k, y);
    }
    ctx.stroke();
  }
  // sand with a wet edge and foam
  ctx.fillStyle = '#f3dca6';
  ctx.fillRect(0, gy, W, H - gy);
  const foam = Math.sin(t * 1.2) * 1.2 * k;
  ctx.fillStyle = '#e2c48a';
  ctx.fillRect(0, gy, W, 3 * k + foam);
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 0.9 * k;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 4 * k) ctx.lineTo(x, gy + 0.5 * k + foam + Math.sin(x * 0.08 + t * 2) * 0.6 * k);
  ctx.stroke();
  for (let i = 0; i < 40; i++) circle(ctx, rnd() * W, gy + 4 * k + rnd() * (H - gy), 0.25 * k, 'rgba(160,120,60,0.35)');
  palm(ctx, W * 0.08, H * 0.95, k * 1.3, 0.5, t);
  palm(ctx, W * 0.93, gy + 6 * k, k, -0.4, t + 1);
  // umbrella + towel
  const ux = W * 0.76;
  const uy = gy + 12 * k;
  roundRect(ctx, ux - 9 * k, uy - 1 * k, 14 * k, 5 * k, 0.8 * k, '#7fc8f0');
  for (let i = 0; i < 3; i++) roundRect(ctx, ux - 9 * k, uy + i * 1.6 * k, 14 * k, 0.6 * k, 0, 'rgba(255,255,255,0.7)');
  line(ctx, [ux, uy + 2 * k, ux - 2 * k, uy - 16 * k], '#8a8a8a', 0.6 * k);
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = i % 2 ? '#ffffff' : '#e8433f';
    ctx.beginPath();
    ctx.moveTo(ux - 2 * k, uy - 17 * k);
    const a0 = Math.PI + (i / 6) * Math.PI;
    const a1 = Math.PI + ((i + 1) / 6) * Math.PI;
    ctx.lineTo(ux - 2 * k + Math.cos(a0) * 12 * k, uy - 12 * k + Math.sin(a0) * 2 * k);
    ctx.lineTo(ux - 2 * k + Math.cos(a1) * 12 * k, uy - 12 * k + Math.sin(a1) * 2 * k);
    ctx.closePath();
    ctx.fill();
  }
  // shells & starfish
  star(ctx, W * 0.25, H * 0.9, 2.2 * k, '#ff9a6b', '#d8674a');
  star(ctx, W * 0.66, H * 0.94, 1.6 * k, '#ffb36b', '#d8874a');
  ellipse(ctx, W * 0.35, H * 0.96, 1.4 * k, 1 * k, 0.4, '#fff0e8', '#e2b8a6', 0.3 * k);
  ellipse(ctx, W / 2, gy + (H - gy) * 0.48, Math.min(W * 0.3, 34 * k), (H - gy) * 0.18, 0, '#ecd09a');
  nightShade(ctx, W, H, tod, 0.32);
}

const SCENES = { cafe, field, palace, forest, beach };

/**
 * Draw an area background filling W×H.
 * Returns { ground, stage } — y of the horizon/ground and the y where the pet's feet go.
 */
export function drawScene(ctx, area, W, H, { tod = 'day', t = 0 } = {}) {
  const k = Math.min(W / 1.2, H) / 100;
  const gy = H * 0.62;
  ctx.save();
  SCENES[area](ctx, W, H, tod, t, k, gy, seeded(area.length * 7919 + area.charCodeAt(0)));
  ctx.restore();
  return { ground: gy, stage: gy + (H - gy) * 0.5, k };
}
