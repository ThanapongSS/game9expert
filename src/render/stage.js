// Stage backgrounds. The static part is pre-rendered once into an offscreen
// canvas that extends past the 960x540 arena so wide and tall phones never
// see black bars.
import { W, H, GROUND } from '../config.js';
import { circle, ellipse, roundRect, line, FONT } from './draw.js';

export const MX = 260;
export const MY = 180;
const cache = new Map();

// Re-paint once web fonts arrive (the toy blocks have letters on them).
export function clearStageCache() {
  cache.clear();
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export function drawStage(ctx, stage, q, t) {
  q = Math.max(1, Math.min(2, Math.round(q * 4) / 4));
  const key = stage + '@' + q;
  let bg = cache.get(key);
  if (!bg) {
    if (cache.size >= 4) cache.delete(cache.keys().next().value);
    bg = makeCanvas(Math.ceil((W + MX * 2) * q), Math.ceil((H + MY * 2) * q));
    const c = bg.getContext('2d');
    c.scale(q, q);
    c.translate(MX, MY);
    (stage === 'sala' ? paintSala : paintToyRoom)(c);
    cache.set(key, bg);
  }
  ctx.drawImage(bg, -MX, -MY, W + MX * 2, H + MY * 2);
  (stage === 'sala' ? animateSala : animateToyRoom)(ctx, t);
}

// ---------------- Toy room ----------------

function star(c, x, y, r, color) {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  c.closePath();
  c.fillStyle = color;
  c.fill();
}

function block(c, x, y, s, color, letter) {
  roundRect(c, x, y, s, s, 6, color, '#5b3a1e', 3);
  roundRect(c, x + 6, y + 6, s - 12, s - 12, 4, 'rgba(255,255,255,0.85)');
  c.font = `700 ${s * 0.5}px ${FONT}`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillStyle = color;
  c.fillText(letter, x + s / 2, y + s / 2 + 2);
}

function paintToyRoom(c) {
  const top = -MY;
  const floorY = GROUND - 44;
  c.fillStyle = '#f7e6c4';
  c.fillRect(-MX, top, W + MX * 2, floorY - top);
  c.fillStyle = 'rgba(240, 205, 150, 0.45)';
  for (let x = -MX; x < W + MX; x += 56) c.fillRect(x, top, 22, floorY - top);
  for (let y = top + 30, row = 0; y < floorY - 160; y += 70, row++) {
    for (let x = -MX + (row % 2) * 40; x < W + MX; x += 80) star(c, x, y, 6, 'rgba(255, 190, 110, 0.55)');
  }

  // window
  const wx = 110;
  const wy = 70;
  roundRect(c, wx - 14, wy - 14, 248, 218, 10, '#fffaf0', '#c9965a', 4);
  const sky = c.createLinearGradient(0, wy, 0, wy + 190);
  sky.addColorStop(0, '#7cc6f2');
  sky.addColorStop(1, '#d8f1ff');
  c.fillStyle = sky;
  c.fillRect(wx, wy, 220, 190);
  for (const [x, y, s] of [[wx + 50, wy + 50, 1], [wx + 160, wy + 100, 0.8]]) {
    ellipse(c, x, y, 30 * s, 14 * s, 0, '#fff');
    ellipse(c, x + 22 * s, y - 8 * s, 20 * s, 14 * s, 0, '#fff');
    ellipse(c, x - 20 * s, y - 4 * s, 16 * s, 10 * s, 0, '#fff');
  }
  circle(c, wx + 190, wy + 34, 18, '#ffe27a');
  line(c, [wx + 110, wy, wx + 110, wy + 190], '#fffaf0', 8, 'butt');
  line(c, [wx, wy + 95, wx + 220, wy + 95], '#fffaf0', 8, 'butt');
  for (const side of [-1, 1]) {
    const cx = side < 0 ? wx - 30 : wx + 250;
    c.beginPath();
    c.moveTo(cx - 24, wy - 24);
    c.quadraticCurveTo(cx - 34 * side, wy + 120, cx - 6, wy + 214);
    c.lineTo(cx + 18, wy + 214);
    c.quadraticCurveTo(cx + 4, wy + 110, cx + 24, wy - 24);
    c.closePath();
    c.fillStyle = '#f19cae';
    c.fill();
    c.strokeStyle = '#c96a80';
    c.lineWidth = 3;
    c.stroke();
  }
  roundRect(c, wx - 60, wy - 30, 340, 14, 7, '#c9965a');

  // kid's crayon drawing
  roundRect(c, 430, 96, 130, 100, 4, '#fff', '#e0a050', 6);
  circle(c, 530, 122, 12, '#ffcf3a');
  c.beginPath();
  c.moveTo(452, 170);
  c.lineTo(482, 140);
  c.lineTo(512, 170);
  c.closePath();
  c.fillStyle = '#e8563f';
  c.fill();
  c.fillStyle = '#5aa0e0';
  c.fillRect(458, 170, 48, 20);
  line(c, [440, 190, 550, 190], '#4cb050', 4);

  // shelf with toys
  const sy = 214;
  roundRect(c, 640, sy, 260, 14, 4, '#b97a43', '#7a4a20', 3);
  for (const x of [660, 880]) roundRect(c, x - 6, sy + 12, 12, 26, 3, '#9c6534');
  block(c, 660, sy - 46, 46, '#e8563f', 'A');
  block(c, 710, sy - 46, 46, '#3f8fe8', 'ก');
  block(c, 686, sy - 92, 46, '#4cb050', 'B');
  circle(c, 790, sy - 24, 24, '#ffcf3a', '#b08010', 3);
  line(c, [770, sy - 32, 810, sy - 16], '#e8563f', 6);
  for (let i = 0; i < 4; i++) roundRect(c, 830 + i * 14, sy - 58 + (i % 2) * 6, 12, 58 - (i % 2) * 6, 2, ['#8e5bd8', '#e8563f', '#3f8fe8', '#4cb050'][i], '#4a2a12', 2);

  // wainscot + baseboard
  c.fillStyle = '#e8c690';
  c.fillRect(-MX, floorY - 120, W + MX * 2, 120);
  c.fillStyle = 'rgba(160, 110, 60, 0.25)';
  for (let x = -MX; x < W + MX; x += 60) c.fillRect(x, floorY - 120, 3, 120);
  c.fillStyle = '#c9965a';
  c.fillRect(-MX, floorY - 126, W + MX * 2, 10);
  c.fillStyle = '#fff2dc';
  c.fillRect(-MX, floorY - 12, W + MX * 2, 12);

  // wooden floor
  const floor = c.createLinearGradient(0, floorY, 0, H + MY);
  floor.addColorStop(0, '#c98a50');
  floor.addColorStop(1, '#a86a38');
  c.fillStyle = floor;
  c.fillRect(-MX, floorY, W + MX * 2, H + MY - floorY);
  let y = floorY;
  for (let i = 0; y < H + MY; i++) {
    const h = 10 + i * 6;
    line(c, [-MX, y, W + MX, y], 'rgba(90, 50, 20, 0.35)', 2);
    for (let x = -MX + ((i * 97) % 160); x < W + MX; x += 160 + i * 20) line(c, [x, y, x, y + h], 'rgba(90, 50, 20, 0.3)', 2);
    y += h;
  }

  // rug under the fighters
  ellipse(c, W / 2, GROUND + 14, 400, 50, 0, '#e86f6f');
  ellipse(c, W / 2, GROUND + 14, 370, 42, 0, '#f6d06f');
  ellipse(c, W / 2, GROUND + 14, 330, 34, 0, '#5fa8d3');
  ellipse(c, W / 2, GROUND + 14, 280, 26, 0, '#f6d06f');

  // big toys out in the margins (visible on wide screens)
  block(c, -200, GROUND - 90, 80, '#3f8fe8', 'ข');
  block(c, -150, GROUND - 160, 70, '#e8563f', 'C');
  block(c, W + 90, GROUND - 80, 76, '#4cb050', 'D');
  circle(c, W + 210, GROUND - 40, 40, '#e8563f', '#8a2a1a', 4);
  line(c, [W + 175, GROUND - 60, W + 245, GROUND - 20], '#fff', 8);
}

const motes = Array.from({ length: 14 }, (_, i) => ({ x: (i * 173) % W, y: 80 + ((i * 91) % 300), s: 1 + (i % 3) }));

function animateToyRoom(ctx, t) {
  ctx.fillStyle = 'rgba(255, 245, 210, 0.6)';
  for (const m of motes) {
    const x = (m.x + t * 8 * m.s) % (W + 100) - 50;
    const y = m.y + Math.sin(t * 0.8 + m.x) * 12;
    ctx.beginPath();
    ctx.arc(x, y, m.s, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ---------------- Thai riverside sala ----------------

const HORIZON = 300;
const DECK = GROUND - 48;

function chedi(c, x, base, s, color) {
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(x - 50 * s, base);
  c.lineTo(x - 40 * s, base - 20 * s);
  c.quadraticCurveTo(x - 38 * s, base - 70 * s, x, base - 80 * s);
  c.quadraticCurveTo(x + 38 * s, base - 70 * s, x + 40 * s, base - 20 * s);
  c.lineTo(x + 50 * s, base);
  c.closePath();
  c.fill();
  c.beginPath();
  c.moveTo(x - 10 * s, base - 76 * s);
  c.lineTo(x, base - 170 * s);
  c.lineTo(x + 10 * s, base - 76 * s);
  c.closePath();
  c.fill();
}

function templeRoof(c, x, base, w, color) {
  c.fillStyle = color;
  c.fillRect(x - w / 2, base - 40, w, 40);
  for (let i = 0; i < 3; i++) {
    const ww = w * (1.1 - i * 0.22);
    const y = base - 40 - i * 22;
    c.beginPath();
    c.moveTo(x - ww / 2, y);
    c.lineTo(x, y - 46);
    c.lineTo(x + ww / 2, y);
    c.closePath();
    c.fill();
    // chofa finials
    c.beginPath();
    c.moveTo(x, y - 46);
    c.quadraticCurveTo(x + 4, y - 62, x + 12, y - 60);
    c.lineWidth = 3;
    c.strokeStyle = color;
    c.stroke();
  }
}

function palm(c, x, base, h, color) {
  c.strokeStyle = color;
  c.lineWidth = 6;
  c.beginPath();
  c.moveTo(x, base);
  c.quadraticCurveTo(x + 10, base - h / 2, x + 4, base - h);
  c.stroke();
  c.fillStyle = color;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    c.beginPath();
    c.ellipse(x + 4 + Math.cos(a) * 22, base - h + Math.sin(a) * 8, 26, 6, a, 0, Math.PI * 2);
    c.fill();
  }
}

function paintSala(c) {
  const sky = c.createLinearGradient(0, -MY, 0, HORIZON);
  sky.addColorStop(0, '#2d2160');
  sky.addColorStop(0.45, '#c85a8c');
  sky.addColorStop(0.8, '#ff9a6a');
  sky.addColorStop(1, '#ffd48a');
  c.fillStyle = sky;
  c.fillRect(-MX, -MY, W + MX * 2, HORIZON + MY);
  const glow = c.createRadialGradient(640, 270, 10, 640, 270, 160);
  glow.addColorStop(0, 'rgba(255, 240, 180, 0.95)');
  glow.addColorStop(0.35, 'rgba(255, 210, 130, 0.5)');
  glow.addColorStop(1, 'rgba(255, 180, 120, 0)');
  c.fillStyle = glow;
  c.fillRect(440, 100, 400, 220);
  circle(c, 640, 268, 46, '#fff1b8');

  // far bank silhouettes
  const sil = '#4a2a5e';
  c.fillStyle = sil;
  c.fillRect(-MX, HORIZON - 14, W + MX * 2, 18);
  chedi(c, 210, HORIZON - 10, 1.1, sil);
  templeRoof(c, 380, HORIZON - 10, 150, sil);
  chedi(c, 800, HORIZON - 10, 0.8, sil);
  for (const [x, h] of [[-140, 120], [40, 100], [520, 90], [960, 130], [1100, 110]]) palm(c, x, HORIZON - 4, h, sil);

  // river
  const river = c.createLinearGradient(0, HORIZON, 0, DECK);
  river.addColorStop(0, '#f4a978');
  river.addColorStop(0.5, '#9a6aa8');
  river.addColorStop(1, '#4b3a7a');
  c.fillStyle = river;
  c.fillRect(-MX, HORIZON + 4, W + MX * 2, DECK - HORIZON);
  c.fillStyle = 'rgba(255, 236, 170, 0.5)';
  for (let i = 0; i < 9; i++) c.fillRect(620 - (i % 3) * 8, HORIZON + 10 + i * 14, 40 + (i % 3) * 16, 4);

  // deck
  const deck = c.createLinearGradient(0, DECK, 0, H + MY);
  deck.addColorStop(0, '#a86a3c');
  deck.addColorStop(1, '#6e4020');
  c.fillStyle = deck;
  c.fillRect(-MX, DECK, W + MX * 2, H + MY - DECK);
  c.fillStyle = '#c88a54';
  c.fillRect(-MX, DECK, W + MX * 2, 8);
  let y = DECK + 8;
  for (let i = 0; y < H + MY; i++) {
    const h = 12 + i * 7;
    line(c, [-MX, y, W + MX, y], 'rgba(60, 30, 10, 0.4)', 2);
    for (let x = -MX + ((i * 131) % 190); x < W + MX; x += 190) line(c, [x, y, x, y + h], 'rgba(60, 30, 10, 0.3)', 2);
    y += h;
  }

  // pillars
  for (const x of [-30, W + 30]) {
    c.fillStyle = '#7d1a2a';
    c.fillRect(x - 22, 40, 44, DECK - 40);
    c.fillStyle = '#5a1020';
    c.fillRect(x + 10, 40, 12, DECK - 40);
    for (const by of [70, DECK - 30]) roundRect(c, x - 28, by, 56, 16, 4, '#e8b83c', '#9a7015', 2);
    for (let k = 0; k < 4; k++) {
      c.save();
      c.translate(x, 120 + k * 60);
      c.rotate(Math.PI / 4);
      c.fillStyle = '#e8b83c';
      c.fillRect(-5, -5, 10, 10);
      c.restore();
    }
  }

  // roof eaves with scalloped fretwork valance
  c.fillStyle = '#5a1020';
  c.fillRect(-MX, -MY, W + MX * 2, 30 + MY);
  c.fillStyle = '#b8302a';
  c.fillRect(-MX, -MY, W + MX * 2, MY - 10);
  for (let x = -MX; x < W + MX; x += 24) {
    c.fillStyle = (x / 24) % 2 ? '#c7442c' : '#a02822';
    c.fillRect(x, -MY, 22, MY - 14);
  }
  c.fillStyle = '#e8b83c';
  c.fillRect(-MX, 10, W + MX * 2, 8);
  c.fillStyle = '#e8b83c';
  for (let x = -MX; x < W + MX; x += 32) {
    c.beginPath();
    c.moveTo(x, 18);
    c.lineTo(x + 32, 18);
    c.lineTo(x + 32, 30);
    c.quadraticCurveTo(x + 16, 54, x, 30);
    c.closePath();
    c.fill();
    circle(c, x + 16, 34, 3, '#7d1a2a');
  }

  // lotus pots on the deck edges
  for (const x of [-140, 60, W - 60, W + 140]) {
    roundRect(c, x - 26, DECK - 30, 52, 34, 10, '#3d6a8a', '#22405a', 3);
    for (let k = -1; k <= 1; k++) ellipse(c, x + k * 16, DECK - 36, 14, 7, k * 0.5, '#4c9a52');
    ellipse(c, x, DECK - 54, 9, 14, 0, '#f6a0c0', '#c05080', 2);
    ellipse(c, x - 8, DECK - 50, 7, 11, -0.5, '#f6a0c0', '#c05080', 2);
    ellipse(c, x + 8, DECK - 50, 7, 11, 0.5, '#f6a0c0', '#c05080', 2);
  }
}

function animateSala(ctx, t) {
  ctx.strokeStyle = 'rgba(255, 230, 200, 0.35)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 10; i++) {
    const y = HORIZON + 26 + i * 12;
    const off = (t * (18 + i * 3) + i * 70) % 200;
    ctx.beginPath();
    for (let x = -MX + off - 200; x < W + MX; x += 200) {
      ctx.moveTo(x, y);
      ctx.lineTo(x + 40 + (i % 3) * 10, y);
    }
    ctx.stroke();
  }
  // a long-tail boat drifting across the river
  const bx = ((t * 22) % (W + MX * 2 + 200)) - MX - 100;
  const by = HORIZON + 46 + Math.sin(t * 2) * 1.5;
  ctx.fillStyle = '#3a2048';
  ctx.beginPath();
  ctx.moveTo(bx - 60, by);
  ctx.quadraticCurveTo(bx, by + 14, bx + 60, by - 4);
  ctx.lineTo(bx + 70, by - 12);
  ctx.lineTo(bx + 50, by - 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(bx - 10, by - 18, 4, 16);
  ctx.beginPath();
  ctx.arc(bx - 8, by - 22, 7, 0, Math.PI * 2);
  ctx.fill();
}
