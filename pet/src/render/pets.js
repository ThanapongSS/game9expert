// Procedural pet art. Pets sit in a 3/4 view facing right, feet at (0,0).
// Unit space: a grown (Lv10) pet is about 100 units tall before species size.
// Every level grows the pet and adds a detail; Lv4 and Lv8 change the form
// by branch (fighter / sage / charm), Lv10 adds the legend aura.
import { capsule, circle, ellipse, line, roundRect, D2R } from '../../../src/render/draw.js';
import { ELEMENT_INFO, SPECIES } from '../data/species.js';

const OUT = '#3b2a3a';
const GOLD = '#ffd34d';
const GOLD_DARK = '#c98a12';
const TAU = Math.PI * 2;

export function growth(level) {
  return 0.62 + 0.042 * (level - 1);
}

function headScale(level) {
  if (level < 4) return 1.34 - 0.05 * (level - 1);
  return level < 8 ? 1.12 : 1;
}

// ---------------- geometry ----------------

function sittingGeom(level, headR, headX) {
  const r = headR * headScale(level);
  const head = { x: headX, y: -46 - r * 0.8, r };
  return {
    head,
    body: { x: -6, y: -30, rx: 28, ry: 27 },
    haunch: { x: -17, y: -17, r: 19 },
    legs: [
      [5, -36, 7, -4],
      [19, -36, 21, -4],
    ],
    eyes: [
      { x: head.x - 0.3 * r, y: head.y + 0.04 * r },
      { x: head.x + 0.4 * r, y: head.y + 0.04 * r },
    ],
    eyeR: r * 0.19,
    mouth: { x: head.x + 0.08 * r, y: head.y + 0.44 * r },
    neck: { x: 9, y: -48, w: 30 },
    chest: { x: 10, y: -33 },
    back: { x: -18, y: -52 },
    tail: { x: -32, y: -14 },
  };
}

const GEOM = {
  yogurt: (lv) => sittingGeom(lv, 27, 13),
  phidam: (lv) => sittingGeom(lv, 25, 13),
  pongfu: (lv) => {
    const g = sittingGeom(lv, 26, 12);
    const { x, y, r } = g.head;
    g.body = { x: -6, y: -30, rx: 30, ry: 27 };
    g.eyes = [
      { x: x - 0.4 * r, y: y - 0.06 * r },
      { x: x + 0.2 * r, y: y - 0.08 * r },
    ];
    g.eyeR = r * 0.17;
    g.mouth = { x: g.head.x + 0.55 * g.head.r, y: g.head.y + 0.5 * g.head.r };
    return g;
  },
  fuji: (lv) => {
    const r = 19 * headScale(lv);
    const head = { x: 7, y: -64 - r * 0.85, r };
    return {
      head,
      body: { x: -2, y: -38, rx: 21, ry: 31 },
      legs: [],
      eyes: [{ x: head.x + 0.32 * r, y: head.y - 0.02 * r }],
      eyeR: r * 0.2,
      mouth: { x: head.x + 0.95 * r, y: head.y + 0.25 * r },
      neck: { x: 4, y: -64, w: 24 },
      chest: { x: 6, y: -42 },
      back: { x: -16, y: -58 },
      tail: { x: -12, y: -14 },
    };
  },
  chako: (lv) => {
    const r = 22 * headScale(lv);
    const head = { x: 38, y: -50 - r * 0.55, r };
    return {
      head,
      body: { x: -6, y: -46, rx: 44, ry: 26 },
      legs: [
        [-34, -36, -35, -4],
        [-20, -34, -19, -4],
        [16, -36, 15, -4],
        [30, -36, 31, -4],
      ],
      eyes: [
        { x: head.x - 0.36 * r, y: head.y - 0.08 * r },
        { x: head.x + 0.36 * r, y: head.y - 0.08 * r },
      ],
      eyeR: r * 0.15,
      mouth: { x: head.x, y: head.y + 0.62 * r },
      neck: { x: 30, y: -42, w: 34 },
      chest: { x: 22, y: -38 },
      back: { x: -20, y: -70 },
      tail: { x: -48, y: -52 },
    };
  },
};

// ---------------- faces ----------------

function eyeShape(ctx, x, y, r, f) {
  const { eye, iris = '#3a2a22', pupil = 'round', blink, ink = OUT } = f;
  if (eye === 'sleep' || (blink && eye === 'normal')) {
    ctx.beginPath();
    ctx.arc(x, y - r * 0.3, r * 0.9, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.strokeStyle = ink;
    ctx.lineWidth = r * 0.42;
    ctx.lineCap = 'round';
    ctx.stroke();
    return;
  }
  if (eye === 'happy') {
    ctx.beginPath();
    ctx.arc(x, y + r * 0.45, r * 0.95, 1.12 * Math.PI, 1.88 * Math.PI);
    ctx.strokeStyle = ink;
    ctx.lineWidth = r * 0.45;
    ctx.lineCap = 'round';
    ctx.stroke();
    return;
  }
  if (eye === 'hurt') {
    line(ctx, [x - r * 0.8, y - r * 0.8, x + r * 0.8, y + r * 0.8], ink, r * 0.4);
    line(ctx, [x - r * 0.8, y + r * 0.8, x + r * 0.8, y - r * 0.8], ink, r * 0.4);
    return;
  }
  if (eye === 'dizzy') {
    ctx.beginPath();
    for (let a = 0; a < TAU * 1.6; a += 0.3) {
      const rr = (r * a) / (TAU * 1.6);
      const px = x + Math.cos(a) * rr;
      const py = y + Math.sin(a) * rr;
      if (a === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = ink;
    ctx.lineWidth = r * 0.28;
    ctx.stroke();
    return;
  }
  const h = eye === 'sad' ? 0.8 : 1;
  ellipse(ctx, x, y, r, r * 1.1 * h, 0, iris, OUT, r * 0.22);
  if (pupil === 'slit') ellipse(ctx, x + r * 0.1, y, r * 0.22, r * 0.85 * h, 0, '#14101a');
  else circle(ctx, x + r * 0.12, y + r * 0.1, r * 0.55, '#1a1220');
  circle(ctx, x - r * 0.3, y - r * 0.38, r * 0.32, 'rgba(255,255,255,0.95)');
  circle(ctx, x + r * 0.35, y + r * 0.4, r * 0.14, 'rgba(255,255,255,0.8)');
  if (eye === 'sad') line(ctx, [x - r * 1.1, y - r * 1.2, x + r * 0.9, y - r * 1.75], ink, r * 0.3);
  if (eye === 'angry') line(ctx, [x - r * 1.1, y - r * 1.75, x + r * 1, y - r * 1.05], ink, r * 0.34);
}

function eyes(ctx, g, f) {
  for (const e of g.eyes) eyeShape(ctx, e.x, e.y, g.eyeR, f);
}

function catMouth(ctx, x, y, w, f) {
  const m = f.mouth;
  const ink = f.ink || OUT;
  if (m === 'open' || m === 'chewOpen') {
    ellipse(ctx, x, y + w * 0.25, w * 0.42, w * (m === 'open' ? 0.4 : 0.28), 0, '#b33a4a', OUT, w * 0.14);
    if (m === 'open') ellipse(ctx, x, y + w * 0.42, w * 0.24, w * 0.13, 0, '#ff8fa0');
    return;
  }
  if (m === 'frown') {
    ctx.beginPath();
    ctx.arc(x, y + w * 0.55, w * 0.4, 1.2 * Math.PI, 1.8 * Math.PI);
    ctx.strokeStyle = ink;
    ctx.lineWidth = w * 0.14;
    ctx.lineCap = 'round';
    ctx.stroke();
    return;
  }
  // ":3" smile
  ctx.beginPath();
  ctx.arc(x - w * 0.2, y, w * 0.22, 0.1 * Math.PI, 0.9 * Math.PI);
  ctx.moveTo(x + w * 0.42, y);
  ctx.arc(x + w * 0.2, y, w * 0.22, 0.1 * Math.PI, 0.9 * Math.PI);
  ctx.strokeStyle = ink;
  ctx.lineWidth = w * 0.13;
  ctx.lineCap = 'round';
  ctx.stroke();
}

function blush(ctx, g, alpha = 0.45) {
  const r = g.head.r;
  ctx.fillStyle = `rgba(255,120,150,${alpha})`;
  for (const e of g.eyes) {
    ctx.beginPath();
    ctx.ellipse(e.x + (e.x > g.head.x ? 0.05 : -0.05) * r, e.y + 0.38 * r, 0.16 * r, 0.09 * r, 0, 0, TAU);
    ctx.fill();
  }
}

// ---------------- species bodies ----------------

function sittingBody(ctx, g, c, f) {
  const { t } = f;
  // tail
  const sway = Math.sin(t * (c.curl ? 5 : 2.2)) * (c.curl ? 5 : 8);
  const tip = c.curl ? { x: g.tail.x + 2 + sway, y: g.tail.y - 34 } : { x: g.tail.x - 8 + sway, y: g.tail.y - 44 };
  ctx.beginPath();
  ctx.moveTo(g.tail.x + 6, g.tail.y);
  if (c.curl) ctx.bezierCurveTo(g.tail.x - 20, g.tail.y - 2, g.tail.x - 22 + sway, g.tail.y - 34, tip.x, tip.y);
  else ctx.bezierCurveTo(g.tail.x - 22, g.tail.y + 4, g.tail.x - 26 + sway, g.tail.y - 30, tip.x, tip.y);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = c.tailW + 5;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.strokeStyle = c.fur;
  ctx.lineWidth = c.tailW;
  ctx.stroke();
  if (c.tailTip) circle(ctx, tip.x, tip.y, c.tailW * 0.5, c.tailTip);
  ellipse(ctx, g.body.x, g.body.y, g.body.rx, g.body.ry, -0.12, c.fur, OUT, 3);
  circle(ctx, g.haunch.x, g.haunch.y, g.haunch.r, c.fur, OUT, 3);
  ellipse(ctx, g.haunch.x + 4, -3, 13, 6, 0, c.fur, OUT, 3);
  // belly patch
  if (c.belly) ellipse(ctx, g.chest.x, g.chest.y + 4, 13, 18, -0.1, c.belly);
  for (const [x0, y0, x1, y1] of g.legs) {
    capsule(ctx, { x: x0, y: y0 }, { x: x1, y: y1 }, 12, c.fur, OUT, 5);
    ellipse(ctx, x1 + 2, y1 + 1, 9, 5.5, 0, c.fur, OUT, 2.5);
  }
}

function catHead(ctx, g, c, f) {
  const { head } = g;
  const r = head.r;
  // ears
  if (c.foldEars) {
    for (const s of [-1, 1]) {
      const ex = head.x + s * 0.55 * r + 0.08 * r;
      const ey = head.y - 0.72 * r;
      ellipse(ctx, ex, ey, 0.34 * r, 0.22 * r, s * 0.5 + 0.15, c.fur, OUT, 2.5);
      ellipse(ctx, ex + 0.04 * r, ey + 0.05 * r, 0.18 * r, 0.09 * r, s * 0.5 + 0.15, c.ear);
    }
  } else {
    for (const s of [-1, 1]) {
      const bx = head.x + s * 0.5 * r + 0.1 * r;
      ctx.beginPath();
      ctx.moveTo(bx - 0.32 * r, head.y - 0.62 * r);
      ctx.lineTo(bx + s * 0.22 * r, head.y - 1.28 * r);
      ctx.lineTo(bx + 0.36 * r, head.y - 0.55 * r);
      ctx.closePath();
      ctx.fillStyle = c.fur;
      ctx.fill();
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bx - 0.15 * r, head.y - 0.68 * r);
      ctx.lineTo(bx + s * 0.18 * r, head.y - 1.08 * r);
      ctx.lineTo(bx + 0.2 * r, head.y - 0.64 * r);
      ctx.closePath();
      ctx.fillStyle = c.ear;
      ctx.fill();
      if (c.earTip) circle(ctx, bx + s * 0.22 * r, head.y - 1.26 * r, 0.08 * r, c.earTip);
    }
  }
  // fluffy cheeks
  if (c.fluff) {
    for (const s of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        circle(ctx, head.x + s * (0.82 + i * 0.05) * r + 0.06 * r, head.y + (0.15 + i * 0.22) * r, 0.2 * r, c.fur, OUT, 2.5);
      }
    }
  }
  circle(ctx, head.x, head.y, r, c.fur, OUT, 3);
  if (c.fluff) {
    for (const s of [-1, 1]) {
      for (let i = 0; i < 3; i++) circle(ctx, head.x + s * (0.82 + i * 0.05) * r + 0.06 * r, head.y + (0.15 + i * 0.22) * r, 0.17 * r, c.fur);
    }
  }
  if (c.shade) ellipse(ctx, head.x - 0.35 * r, head.y - 0.45 * r, 0.32 * r, 0.18 * r, -0.5, c.shade);
  eyes(ctx, g, f);
  if (f.blushy) blush(ctx, g);
  // nose & mouth
  const nx = head.x + 0.06 * r;
  const ny = head.y + 0.28 * r;
  ctx.beginPath();
  ctx.moveTo(nx - 0.09 * r, ny - 0.05 * r);
  ctx.lineTo(nx + 0.09 * r, ny - 0.05 * r);
  ctx.lineTo(nx, ny + 0.06 * r);
  ctx.closePath();
  ctx.fillStyle = c.nose;
  ctx.fill();
  catMouth(ctx, nx, ny + 0.12 * r, 0.3 * r, f);
  // whiskers
  for (const s of [-1, 1]) {
    for (let i = -1; i <= 1; i++) {
      const x0 = nx + s * 0.32 * r;
      line(ctx, [x0, ny + 0.08 * r + i * 0.07 * r, x0 + s * 0.42 * r, ny + 0.02 * r + i * 0.14 * r], c.whisker, 1.2);
    }
  }
}

function yogurt(ctx, g, f) {
  const c = { fur: '#fdfbf7', ear: '#f7c3cc', nose: '#f39aa8', whisker: '#c9c2bb', belly: '#ffffff', tailW: 13, foldEars: true, fluff: true, shade: '#efe9e2' };
  c.tailTip = f.level >= 3 ? f.el : null;
  sittingBody(ctx, g, c, f);
  // chest tuft
  ctx.beginPath();
  const cx = g.chest.x;
  const cy = g.chest.y - 8;
  ctx.moveTo(cx - 12, cy);
  for (let i = 0; i <= 4; i++) ctx.lineTo(cx - 12 + i * 6, cy + (i % 2 ? 9 : 3));
  ctx.strokeStyle = '#e4ddd4';
  ctx.lineWidth = 2;
  ctx.stroke();
  catHead(ctx, g, c, { ...f, iris: '#f0a030' });
}

function phidam(ctx, g, f) {
  const c = { fur: '#2e2a38', ear: '#5d4b63', nose: '#7b6878', whisker: '#8d8699', tailW: 10, shade: '#423d50' };
  c.earTip = f.level >= 3 ? f.el : null;
  c.tailTip = f.level >= 3 ? f.el : null;
  sittingBody(ctx, g, c, f);
  catHead(ctx, g, c, { ...f, iris: '#ffd23f', pupil: 'slit', ink: '#d6cce6' });
}

function pongfu(ctx, g, f) {
  const fur = '#fdfaf3';
  const black = '#2a2630';
  const c = { fur, tailW: 11, curl: true, tailTip: f.level >= 3 ? f.el : black };
  sittingBody(ctx, g, c, f);
  const { head } = g;
  const r = head.r;
  // the black stripe along the back, from the crown over the spine to the tail
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(g.body.x, g.body.y, g.body.rx - 1.5, g.body.ry - 1.5, -0.12, 0, TAU);
  ctx.clip();
  ctx.beginPath();
  ctx.moveTo(g.neck.x - 6, g.neck.y - 6);
  ctx.quadraticCurveTo(g.body.x - 8, g.body.y - g.body.ry - 6, g.body.x - g.body.rx + 2, g.body.y + 2);
  ctx.strokeStyle = black;
  ctx.lineWidth = 15;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();
  // far floppy ear
  ellipse(ctx, head.x - 0.86 * r, head.y + 0.08 * r, 0.24 * r, 0.52 * r, 0.3, black, OUT, 2.5);
  ellipse(ctx, head.x, head.y, r * 1.02, r, 0, fur, OUT, 3);
  // stripe starts on the crown
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(head.x, head.y, r * 1.02 - 1.5, r - 1.5, 0, 0, TAU);
  ctx.clip();
  ellipse(ctx, head.x - 0.45 * r, head.y - 0.82 * r, 0.3 * r, 0.6 * r, -0.9, black);
  ctx.restore();
  // muzzle with a big black nose
  const mx = head.x + 0.52 * r;
  const my = head.y + 0.36 * r;
  ellipse(ctx, mx, my, 0.44 * r, 0.3 * r, 0.05, fur, OUT, 2.5);
  ellipse(ctx, mx + 0.32 * r, my - 0.16 * r, 0.15 * r, 0.11 * r, 0, '#1d1a22');
  circle(ctx, mx + 0.28 * r, my - 0.2 * r, 0.04 * r, 'rgba(255,255,255,0.7)');
  const m = f.mouth;
  if (m === 'open' || m === 'chewOpen') {
    ellipse(ctx, mx + 0.08 * r, my + 0.18 * r, 0.2 * r, 0.13 * r, 0, '#b33a4a', OUT, 2);
    if (m === 'open') ellipse(ctx, mx + 0.08 * r, my + 0.32 * r, 0.11 * r, 0.13 * r, 0, '#ff8fa0', OUT, 1.5);
  } else if (m === 'frown') {
    line(ctx, [mx - 0.12 * r, my + 0.2 * r, mx + 0.06 * r, my + 0.13 * r, mx + 0.24 * r, my + 0.2 * r], OUT, 2);
  } else {
    line(ctx, [mx + 0.3 * r, my - 0.05 * r, mx + 0.3 * r, my + 0.06 * r], OUT, 2);
    line(ctx, [mx + 0.02 * r, my + 0.1 * r, mx + 0.3 * r, my + 0.06 * r, mx + 0.42 * r, my], OUT, 2);
  }
  eyes(ctx, g, { ...f, iris: '#4a2f22' });
  if (f.blushy) blush(ctx, g);
  // near floppy ear hangs beside the face
  ellipse(ctx, head.x - 0.12 * r, head.y - 0.62 * r, 0.22 * r, 0.44 * r, 1.1, black, OUT, 2.5);
  if (f.level >= 3) circle(ctx, head.x - 0.42 * r, head.y - 0.7 * r, 0.07 * r, f.el);
}

function fuji(ctx, g, f) {
  const blue = '#2f8fe0';
  const blueDark = '#1f6dbd';
  const yellow = '#ffd23a';
  const { head, body } = g;
  const r = head.r;
  const sway = Math.sin(f.t * 1.8) * 3;
  // long tail
  ctx.beginPath();
  ctx.moveTo(body.x - 10, body.y + 14);
  ctx.lineTo(-40 + sway, 4);
  ctx.lineTo(-28 + sway, 8);
  ctx.closePath();
  ctx.fillStyle = blueDark;
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.stroke();
  if (f.level >= 3) circle(ctx, -36 + sway, 5, 3.2, f.el);
  // feet
  for (const fx of [-6, 6]) {
    capsule(ctx, { x: fx, y: -10 }, { x: fx + 1, y: -2 }, 5, '#7a7a86', OUT, 3);
    line(ctx, [fx - 5, -1, fx + 7, -1], '#5c5c66', 4);
  }
  ellipse(ctx, body.x, body.y, body.rx, body.ry, -0.1, blue, OUT, 3);
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(body.x, body.y, body.rx - 1.5, body.ry - 1.5, -0.1, 0, TAU);
  ctx.clip();
  ellipse(ctx, body.x + 9, body.y + 6, 15, 27, -0.1, yellow);
  ctx.restore();
  // folded wing
  ellipse(ctx, body.x - 7, body.y - 2, 13, 24, 0.12, blueDark, OUT, 2.5);
  for (let i = 0; i < 3; i++) line(ctx, [body.x - 14 + i * 4, body.y + 8 + i * 3, body.x - 9 + i * 4, body.y + 20], '#185aa0', 1.5);
  ellipse(ctx, body.x - 4, body.y - 16, 8, 6, 0, '#3fae6a');
  // head
  circle(ctx, head.x, head.y, r, blue, OUT, 3);
  ellipse(ctx, head.x + 0.12 * r, head.y - 0.62 * r, 0.42 * r, 0.26 * r, 0.2, '#3fae6a');
  // white face patch with fine black lines
  ellipse(ctx, head.x + 0.36 * r, head.y + 0.14 * r, 0.48 * r, 0.44 * r, 0, '#f6f6f2', OUT, 1.5);
  for (let i = 0; i < 3; i++) {
    const yy = head.y + (0.2 + i * 0.12) * r;
    line(ctx, [head.x + 0.08 * r, yy, head.x + 0.26 * r, yy + 0.02 * r], '#2a2630', 1.2);
  }
  // throat stripe
  ellipse(ctx, head.x + 0.18 * r, head.y + 0.82 * r, 0.32 * r, 0.12 * r, 0.1, '#20202a');
  eyes(ctx, g, { ...f, iris: '#f2e66b' });
  if (f.blushy) {
    ctx.fillStyle = 'rgba(255,120,150,0.45)';
    ctx.beginPath();
    ctx.ellipse(head.x + 0.28 * r, head.y + 0.42 * r, 0.14 * r, 0.08 * r, 0, 0, TAU);
    ctx.fill();
  }
  // hooked beak
  const bx = head.x + 0.72 * r;
  const by = head.y + 0.02 * r;
  const open = f.mouth === 'open' || f.mouth === 'chewOpen' ? 0.14 * r : 0;
  ctx.beginPath();
  ctx.moveTo(bx, by - 0.22 * r);
  ctx.quadraticCurveTo(bx + 0.62 * r, by - 0.32 * r, bx + 0.52 * r, by + 0.42 * r);
  ctx.quadraticCurveTo(bx + 0.34 * r, by + 0.12 * r, bx, by + 0.18 * r);
  ctx.closePath();
  ctx.fillStyle = '#2b2b33';
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(bx + 0.02 * r, by + 0.22 * r + open);
  ctx.quadraticCurveTo(bx + 0.3 * r, by + 0.28 * r + open, bx + 0.32 * r, by + 0.46 * r + open);
  ctx.quadraticCurveTo(bx + 0.1 * r, by + 0.46 * r + open, bx + 0.02 * r, by + 0.22 * r + open);
  ctx.fillStyle = '#3a3a44';
  ctx.fill();
  ctx.stroke();
}

function chako(ctx, g, f) {
  const hide = '#3d3844';
  const hideDark = '#2a2630';
  const { head, body } = g;
  const r = head.r;
  // tail
  const sway = Math.sin(f.t * 1.5) * 4;
  line(ctx, [g.tail.x, g.tail.y, g.tail.x - 6 + sway, g.tail.y + 28], OUT, 6);
  line(ctx, [g.tail.x, g.tail.y, g.tail.x - 6 + sway, g.tail.y + 28], hide, 3);
  ellipse(ctx, g.tail.x - 6 + sway, g.tail.y + 32, 4, 6, 0, hideDark, OUT, 2);
  // far legs, body, near legs
  const leg = ([x0, y0, x1, y1], col) => {
    capsule(ctx, { x: x0, y: y0 }, { x: x1, y: y1 }, 13, col, OUT, 5);
    roundRect(ctx, x1 - 7, y1 - 4, 14, 7, 3, '#1e1b22', OUT, 2);
  };
  leg(g.legs[0], hideDark);
  leg(g.legs[2], hideDark);
  ellipse(ctx, body.x, body.y, body.rx, body.ry, 0.03, hide, OUT, 3);
  ellipse(ctx, body.x - 6, body.y - 12, body.rx * 0.6, body.ry * 0.35, 0.05, '#4b4554');
  leg(g.legs[1], hide);
  leg(g.legs[3], hide);
  // neck
  ellipse(ctx, (body.x + body.rx + head.x) / 2 - 8, head.y + r * 0.35, r * 0.8, r * 0.75, 0.3, hide);
  // horns: crescents that grow long with level
  const len = 0.5 + 0.13 * f.level;
  for (const s of [-1, 1]) {
    const bx = head.x + s * 0.55 * r;
    const by = head.y - 0.6 * r;
    const tx = head.x + s * (0.9 + len) * r;
    const ty = head.y - (0.55 + len * 0.75) * r;
    ctx.beginPath();
    ctx.moveTo(bx - s * 0.22 * r, by + 0.12 * r);
    ctx.quadraticCurveTo(head.x + s * (1.2 + len * 0.9) * r, head.y - 0.2 * r, tx, ty);
    ctx.quadraticCurveTo(head.x + s * (0.95 + len * 0.5) * r, head.y - 0.45 * r, bx + s * 0.12 * r, by - 0.16 * r);
    ctx.closePath();
    ctx.fillStyle = '#d9ccb2';
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.stroke();
    if (f.level >= 3) circle(ctx, tx, ty, 0.1 * r, f.el, OUT, 1.5);
  }
  // droopy ears
  for (const s of [-1, 1]) ellipse(ctx, head.x + s * 1.02 * r, head.y - 0.05 * r, 0.38 * r, 0.16 * r, s * 0.35, hide, OUT, 2.5);
  // head + broad muzzle
  ellipse(ctx, head.x, head.y, r * 0.95, r, 0, hide, OUT, 3);
  ellipse(ctx, head.x - 0.3 * r, head.y - 0.55 * r, 0.3 * r, 0.16 * r, -0.4, '#4b4554');
  ellipse(ctx, head.x, head.y + 0.52 * r, 0.62 * r, 0.42 * r, 0, '#6e6672', OUT, 2.5);
  for (const s of [-1, 1]) ellipse(ctx, head.x + s * 0.22 * r, head.y + 0.46 * r, 0.08 * r, 0.11 * r, 0, '#24202a');
  const m = f.mouth;
  if (m === 'open' || m === 'chewOpen') ellipse(ctx, head.x, head.y + 0.74 * r, 0.22 * r, m === 'open' ? 0.12 * r : 0.07 * r, 0, '#b33a4a', OUT, 1.5);
  else if (m === 'frown') {
    ctx.beginPath();
    ctx.arc(head.x, head.y + 0.86 * r, 0.18 * r, 1.2 * Math.PI, 1.8 * Math.PI);
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 2;
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(head.x, head.y + 0.62 * r, 0.2 * r, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  eyes(ctx, g, { ...f, iris: '#5a3a2a', ink: '#d6cce6' });
  if (f.blushy) blush(ctx, g, 0.35);
  // pale chevron on the throat, like Thai buffaloes
  line(ctx, [head.x - 0.55 * r, head.y + 1.05 * r, head.x - 0.1 * r, head.y + 1.32 * r, head.x + 0.3 * r, head.y + 1.0 * r], '#d8d2c8', 4);
}

const BODY = { yogurt, phidam, pongfu, fuji, chako };

// ---------------- accessories ----------------

function star(ctx, x, y, r, fill, outline) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (outline) {
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function heart(ctx, x, y, s, fill, outline) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.35);
  ctx.bezierCurveTo(x - s * 1.1, y - s * 0.35, x - s * 0.45, y - s * 1.05, x, y - s * 0.45);
  ctx.bezierCurveTo(x + s * 0.45, y - s * 1.05, x + s * 1.1, y - s * 0.35, x, y + s * 0.35);
  ctx.fillStyle = fill;
  ctx.fill();
  if (outline) {
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function sparkle(ctx, x, y, s, color) {
  ctx.beginPath();
  ctx.moveTo(x, y - s);
  ctx.quadraticCurveTo(x, y, x + s, y);
  ctx.quadraticCurveTo(x, y, x, y + s);
  ctx.quadraticCurveTo(x, y, x - s, y);
  ctx.quadraticCurveTo(x, y, x, y - s);
  ctx.fillStyle = color;
  ctx.fill();
}

// Behind the pet: legend halo, auras, cape, wings.
function drawBack(ctx, g, f) {
  const { level, branch, t, el } = f;
  const cx = (g.body.x + g.head.x) / 2;
  const cy = (g.body.y + g.head.y) / 2;
  if (level >= 10) {
    const grd = ctx.createRadialGradient(cx, cy, 10, cx, cy, 78);
    grd.addColorStop(0, 'rgba(255,225,120,0.55)');
    grd.addColorStop(1, 'rgba(255,225,120,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(cx, cy, 78, 0, TAU);
    ctx.fill();
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(t * 0.4);
    for (let i = 0; i < 12; i++) {
      ctx.rotate(TAU / 12);
      ctx.fillStyle = 'rgba(255,214,90,0.35)';
      ctx.beginPath();
      ctx.moveTo(0, -40);
      ctx.lineTo(5, -70);
      ctx.lineTo(-5, -70);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
  if (level >= 9 && branch === 'fighter') {
    // a ring of flickering flames behind the pet
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * (0.05 + (i / 8) * 0.9);
      const fl = 0.8 + 0.3 * Math.sin(t * 10 + i * 2.3);
      const px = cx - Math.cos(a) * 44;
      const py = g.body.y + 18 - Math.sin(a) * 58;
      const h = 30 * fl;
      ctx.beginPath();
      ctx.moveTo(px - 9, py);
      ctx.quadraticCurveTo(px - 10, py - h * 0.6, px + Math.sin(t * 7 + i) * 3, py - h);
      ctx.quadraticCurveTo(px + 10, py - h * 0.6, px + 9, py);
      ctx.quadraticCurveTo(px, py + 8, px - 9, py);
      ctx.fillStyle = i % 2 ? 'rgba(255,110,40,0.55)' : 'rgba(255,190,50,0.6)';
      ctx.fill();
    }
  }
  if (level >= 8 && branch === 'sage') {
    // cloak behind the body
    const n = g.neck;
    ctx.beginPath();
    ctx.moveTo(n.x - n.w * 0.5, n.y);
    ctx.quadraticCurveTo(g.body.x - g.body.rx - 18, g.body.y, g.body.x - g.body.rx - 10 + Math.sin(t * 2) * 3, -2);
    ctx.lineTo(g.body.x + 6, -2);
    ctx.lineTo(n.x + n.w * 0.4, n.y);
    ctx.closePath();
    ctx.fillStyle = '#5b3fa8';
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 3;
    ctx.stroke();
    for (let i = 0; i < 3; i++) star(ctx, g.body.x - g.body.rx - 2 + i * 9, -14 - i * 10, 3, GOLD);
  }
  if (level >= 8 && branch === 'charm') {
    const b = g.back;
    const flap = Math.sin(t * 5) * 0.15;
    for (const [dx, sc] of [
      [-6, 1],
      [4, 0.8],
    ]) {
      ctx.save();
      ctx.translate(b.x + dx, b.y);
      ctx.rotate(-0.5 + flap);
      ctx.scale(sc, sc);
      ellipse(ctx, -14, -18, 16, 26, -0.6, 'rgba(255,255,255,0.9)', '#e88fb6', 2.5);
      ellipse(ctx, -6, -6, 10, 16, -0.9, 'rgba(255,230,245,0.9)', '#e88fb6', 2);
      ctx.restore();
    }
  }
}

// In front of the pet: collar, branch gear, element bits.
function drawFront(ctx, g, f) {
  const { level, branch, t, el } = f;
  const { head, neck } = g;
  const r = head.r;
  const tier = level >= 8 ? 2 : level >= 4 ? 1 : 0;
  // Lv2 collar with a tag; Lv5 the tag becomes a star medal
  if (level >= 2) {
    ctx.beginPath();
    ctx.ellipse(neck.x, neck.y, neck.w * 0.5, 5, -0.08, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.strokeStyle = branch === 'charm' ? '#ff7fb0' : '#e8433f';
    ctx.lineWidth = 4;
    ctx.stroke();
    if (level >= 5) star(ctx, neck.x + 2, neck.y + 9, 6, GOLD, GOLD_DARK);
    else circle(ctx, neck.x + 2, neck.y + 8, 4, el, OUT, 1.5);
  }
  // breastplate + shoulder guard (fighter tier 2)
  if (tier === 2 && branch === 'fighter') {
    const c = g.chest;
    const grd = ctx.createLinearGradient(c.x - 12, c.y - 14, c.x + 12, c.y + 12);
    grd.addColorStop(0, '#f2f5f9');
    grd.addColorStop(1, '#9fadbf');
    ctx.beginPath();
    ctx.moveTo(c.x - 13, c.y - 12);
    ctx.quadraticCurveTo(c.x, c.y - 17, c.x + 13, c.y - 12);
    ctx.quadraticCurveTo(c.x + 12, c.y + 4, c.x, c.y + 13);
    ctx.quadraticCurveTo(c.x - 12, c.y + 4, c.x - 13, c.y - 12);
    ctx.closePath();
    ctx.fillStyle = grd;
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(c.x - 11, c.y - 10);
    ctx.quadraticCurveTo(c.x, c.y - 14.5, c.x + 11, c.y - 10);
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    circle(ctx, c.x, c.y - 1, 4.5, el, GOLD_DARK, 1.5);
    ellipse(ctx, c.x + 13, c.y - 12, 8, 6, -0.4, '#d5dde8', OUT, 2.5);
    line(ctx, [c.x + 8, c.y - 13, c.x + 18, c.y - 15], GOLD, 2);
  }
  // wristbands (fighter Lv6+)
  if (branch === 'fighter' && level >= 6) {
    for (const [, , x1, y1] of g.legs.slice(-2)) roundRect(ctx, x1 - 6.5, y1 - 13, 13, 6, 2, '#e8433f', OUT, 2);
  }
  // headgear
  if (tier >= 1 && branch === 'fighter') {
    // headband with tails flowing behind
    const y = head.y - 0.48 * r;
    const wave = Math.sin(t * 6) * 3;
    line(ctx, [head.x - 0.8 * r, y + 0.08 * r, head.x - 1.3 * r, y - 0.05 * r + wave, head.x - 1.75 * r, y + 0.12 * r - wave], OUT, 6);
    line(ctx, [head.x - 0.8 * r, y + 0.08 * r, head.x - 1.3 * r, y - 0.05 * r + wave, head.x - 1.75 * r, y + 0.12 * r - wave], '#e8433f', 3.5);
    ctx.save();
    ctx.beginPath();
    ctx.arc(head.x, head.y, r + 1, 0, TAU);
    ctx.clip();
    ctx.fillStyle = '#e8433f';
    ctx.fillRect(head.x - r - 2, y - 0.1 * r, 2 * r + 4, 0.2 * r);
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(head.x - r - 2, y - 0.1 * r, 2 * r + 4, 0.2 * r);
    ctx.restore();
    if (tier === 2) circle(ctx, head.x + 0.2 * r, y, 0.12 * r, el, OUT, 1.5);
  }
  if (tier >= 1 && branch === 'sage') {
    // round glasses
    const gr = g.eyeR * 1.75;
    for (const e of g.eyes) circle(ctx, e.x, e.y, gr, 'rgba(200,230,255,0.25)', '#4a3a2a', 2);
    if (g.eyes.length === 2) line(ctx, [g.eyes[0].x + gr, g.eyes[0].y, g.eyes[1].x - gr, g.eyes[1].y], '#4a3a2a', 2);
    if (tier === 1) {
      // mortarboard
      const hx = head.x - 0.05 * r;
      const hy = head.y - 0.9 * r;
      roundRect(ctx, hx - 0.38 * r, hy - 0.05 * r, 0.76 * r, 0.25 * r, 2, '#2c2a3a', OUT, 2);
      ctx.beginPath();
      ctx.moveTo(hx - 0.75 * r, hy - 0.1 * r);
      ctx.lineTo(hx, hy - 0.38 * r);
      ctx.lineTo(hx + 0.75 * r, hy - 0.1 * r);
      ctx.lineTo(hx, hy + 0.15 * r);
      ctx.closePath();
      ctx.fillStyle = '#2c2a3a';
      ctx.fill();
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 2;
      ctx.stroke();
      line(ctx, [hx, hy - 0.12 * r, hx + 0.55 * r, hy, hx + 0.6 * r, hy + 0.35 * r], GOLD, 2);
      circle(ctx, hx + 0.6 * r, hy + 0.38 * r, 0.06 * r, GOLD);
    } else {
      // wizard hat
      const hx = head.x - 0.1 * r;
      const hy = head.y - 0.72 * r;
      ellipse(ctx, hx, hy, 0.85 * r, 0.2 * r, -0.1, '#5b3fa8', OUT, 2.5);
      ctx.beginPath();
      ctx.moveTo(hx - 0.55 * r, hy - 0.05 * r);
      ctx.quadraticCurveTo(hx - 0.2 * r, hy - 1.1 * r, hx - 0.6 * r + Math.sin(t * 2) * 2, hy - 1.55 * r);
      ctx.quadraticCurveTo(hx + 0.2 * r, hy - 0.9 * r, hx + 0.55 * r, hy - 0.1 * r);
      ctx.closePath();
      ctx.fillStyle = '#5b3fa8';
      ctx.fill();
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      star(ctx, hx - 0.05 * r, hy - 0.55 * r, 0.16 * r, GOLD);
      line(ctx, [hx - 0.52 * r, hy - 0.12 * r, hx + 0.52 * r, hy - 0.16 * r], el, 3);
    }
  }
  if (tier >= 1 && branch === 'charm') {
    if (tier === 1) {
      // big bow on the head
      const bx = head.x - 0.45 * r;
      const by = head.y - 0.82 * r;
      ellipse(ctx, bx - 0.28 * r, by, 0.3 * r, 0.2 * r, -0.3, '#ff7fb0', OUT, 2);
      ellipse(ctx, bx + 0.28 * r, by, 0.3 * r, 0.2 * r, 0.3, '#ff7fb0', OUT, 2);
      circle(ctx, bx, by, 0.11 * r, '#ff4f93', OUT, 2);
    } else {
      // crown
      const cx = head.x - 0.02 * r;
      const cy = head.y - 0.86 * r;
      const w = 0.55 * r;
      ctx.beginPath();
      ctx.moveTo(cx - w, cy + 0.2 * r);
      ctx.lineTo(cx - w, cy - 0.15 * r);
      ctx.lineTo(cx - w * 0.5, cy + 0.05 * r);
      ctx.lineTo(cx, cy - 0.32 * r);
      ctx.lineTo(cx + w * 0.5, cy + 0.05 * r);
      ctx.lineTo(cx + w, cy - 0.15 * r);
      ctx.lineTo(cx + w, cy + 0.2 * r);
      ctx.closePath();
      ctx.fillStyle = GOLD;
      ctx.fill();
      ctx.strokeStyle = GOLD_DARK;
      ctx.lineWidth = 2;
      ctx.stroke();
      circle(ctx, cx, cy + 0.05 * r, 0.08 * r, '#ff4f93');
    }
  }
  // floating extras: Lv6 tier-1 bonus, Lv7 element orbs, Lv9 tier-2 bonus
  const fx = head.x + r * 1.3;
  const fy = head.y - r * 0.6 + Math.sin(t * 2.5) * 3;
  if (branch === 'sage' && level >= 6 && level < 9) {
    // an open book floating beside the head
    ctx.beginPath();
    ctx.moveTo(fx, fy + 4);
    ctx.lineTo(fx - 12, fy - 1);
    ctx.lineTo(fx - 12, fy - 11);
    ctx.lineTo(fx, fy - 6);
    ctx.lineTo(fx + 12, fy - 11);
    ctx.lineTo(fx + 12, fy - 1);
    ctx.closePath();
    ctx.fillStyle = '#4f7fe0';
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(fx, fy + 1);
    ctx.lineTo(fx - 10, fy - 3);
    ctx.lineTo(fx - 10, fy - 11);
    ctx.lineTo(fx, fy - 7);
    ctx.lineTo(fx + 10, fy - 11);
    ctx.lineTo(fx + 10, fy - 3);
    ctx.closePath();
    ctx.fillStyle = '#fffaf0';
    ctx.fill();
    line(ctx, [fx, fy - 7, fx, fy + 1], '#c9bba5', 1);
    for (const sx of [-1, 1]) line(ctx, [fx + sx * 3, fy - 6.5, fx + sx * 8, fy - 8.5], '#c9bba5', 1);
  }
  if (branch === 'sage' && level >= 9) {
    const grd = ctx.createRadialGradient(fx - 2, fy - 2, 1, fx, fy, 9);
    grd.addColorStop(0, '#ffffff');
    grd.addColorStop(1, el);
    circle(ctx, fx, fy, 8, grd, OUT, 2);
  }
  if (branch === 'charm' && level >= 6) {
    for (let i = 0; i < (level >= 9 ? 5 : 3); i++) {
      const a = t * 1.2 + (i * TAU) / (level >= 9 ? 5 : 3);
      const px = (g.body.x + head.x) / 2 + Math.cos(a) * 46;
      const py = (g.body.y + head.y) / 2 + Math.sin(a) * 30;
      if (i % 2) heart(ctx, px, py, 4, '#ff7fb0');
      else sparkle(ctx, px, py, 5, '#fff3a6');
    }
  }
  if (level >= 7) {
    for (let i = 0; i < 2; i++) {
      const a = -t * 1.6 + i * Math.PI;
      const px = g.body.x + Math.cos(a) * (g.body.rx + 14);
      const py = g.body.y - 6 + Math.sin(a) * 10;
      circle(ctx, px, py, 3.5, el, 'rgba(255,255,255,0.8)', 1.5);
    }
  }
  if (level >= 10) {
    for (let i = 0; i < 4; i++) {
      const a = t * 0.8 + (i * TAU) / 4;
      sparkle(ctx, g.body.x + Math.cos(a) * 60, g.body.y - 20 + Math.sin(a) * 40, 4 + 2 * Math.sin(t * 4 + i), GOLD);
    }
  }
}

// Mood props drawn on top (in pet space).
function drawMoodFx(ctx, g, f) {
  const { mood, t } = f;
  const { head } = g;
  const r = head.r;
  if (mood === 'sad') {
    const e = g.eyes[g.eyes.length - 1];
    const k = (t * 0.8) % 1;
    ellipse(ctx, e.x + 0.1 * r, e.y + g.eyeR * 1.4 + k * 0.5 * r, 0.07 * r, 0.11 * r, 0, '#7cc8ff', OUT, 1);
  }
  if (mood === 'sick') {
    ctx.fillStyle = 'rgba(120,200,90,0.22)';
    ctx.beginPath();
    ctx.arc(head.x, head.y, r, 0, TAU);
    ctx.fill();
    // ice pack
    ctx.save();
    ctx.translate(head.x - 0.2 * r, head.y - 0.88 * r);
    ctx.rotate(-0.25);
    roundRect(ctx, -0.4 * r, -0.14 * r, 0.8 * r, 0.3 * r, 0.1 * r, '#8fd3ff', OUT, 2);
    line(ctx, [-0.25 * r, 0, 0.25 * r, 0], '#ffffff', 2);
    ctx.restore();
    ellipse(ctx, head.x + 0.95 * r, head.y - 0.3 * r, 0.08 * r, 0.12 * r, 0, '#8fd3ff', OUT, 1);
  }
  if (mood === 'dirty') {
    ctx.fillStyle = 'rgba(122,84,48,0.55)';
    for (const [dx, dy, s] of [
      [-10, -28, 6],
      [6, -18, 4.5],
      [-22, -12, 5],
    ]) {
      ctx.beginPath();
      ctx.ellipse(g.body.x + dx, g.body.y + dy + 22, s, s * 0.7, 0.3, 0, TAU);
      ctx.fill();
    }
    ellipse(ctx, head.x - 0.4 * r, head.y + 0.2 * r, 0.15 * r, 0.1 * r, 0.2, 'rgba(122,84,48,0.5)');
    for (let i = 0; i < 3; i++) {
      const a = t * 4 + i * 2.1;
      const fx = head.x + Math.cos(a) * r * 1.3;
      const fy = head.y - r * 0.4 + Math.sin(a * 1.3) * r * 0.5;
      circle(ctx, fx, fy, 2, '#222');
      ellipse(ctx, fx - 1, fy - 2.5, 2, 1.3, 0.5, 'rgba(255,255,255,0.8)');
    }
  }
  if (mood === 'eat') {
    for (let i = 0; i < 3; i++) {
      const k = (t * 1.5 + i / 3) % 1;
      circle(ctx, g.mouth.x + (i - 1) * 4, g.mouth.y + 4 + k * 22, 1.8, '#d9a35b');
    }
  }
}

// Screen-space bits that shouldn't mirror: Zzz and hearts.
function drawOverlay(ctx, hx, hy, s, f) {
  const { mood, t } = f;
  ctx.save();
  if (mood === 'sleep') {
    for (let i = 0; i < 3; i++) {
      const k = (t * 0.45 + i / 3) % 1;
      ctx.globalAlpha = Math.sin(k * Math.PI);
      ctx.font = `700 ${(10 + k * 10) * s}px system-ui, sans-serif`;
      ctx.fillStyle = '#6f7cff';
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3 * s;
      ctx.textAlign = 'center';
      ctx.strokeText('Z', hx + (14 + k * 26) * s, hy - (20 + k * 34) * s);
      ctx.fillText('Z', hx + (14 + k * 26) * s, hy - (20 + k * 34) * s);
    }
    ctx.globalAlpha = 1;
  }
  if (mood === 'happy' || mood === 'cheer') {
    for (let i = 0; i < 2; i++) {
      const k = (t * 0.7 + i / 2) % 1;
      ctx.globalAlpha = Math.sin(k * Math.PI);
      heart(ctx, hx + (i ? 26 : -24) * s, hy - (18 + k * 36) * s, 6 * s, '#ff5c8a', '#fff');
    }
  }
  ctx.restore();
}

// Face settings for each mood.
const MOOD_FACE = {
  idle: { eye: 'normal', mouth: 'smile' },
  happy: { eye: 'happy', mouth: 'open', blushy: true },
  cheer: { eye: 'happy', mouth: 'open', blushy: true },
  sad: { eye: 'sad', mouth: 'frown' },
  sleep: { eye: 'sleep', mouth: 'smile' },
  eat: { eye: 'happy', mouth: 'chew', blushy: true },
  sick: { eye: 'dizzy', mouth: 'frown' },
  dirty: { eye: 'sad', mouth: 'frown' },
  attack: { eye: 'angry', mouth: 'open' },
  hurt: { eye: 'hurt', mouth: 'open' },
};

/**
 * Draw a pet with its feet at (x, y).
 * pet: { species, level, branch }
 * size: on-screen height in px of a full-grown pet (babies are smaller)
 * o: { mood, t (seconds), facing (1 right / -1 left), shadow, alpha, seed (blink offset) }
 */
export function drawPet(ctx, pet, x, y, size, o = {}) {
  const { species, level = 1, branch = null } = pet;
  const sp = SPECIES[species];
  const mood = o.mood || 'idle';
  const t = o.t || 0;
  const facing = o.facing || 1;
  const s = (size / 100) * growth(level) * sp.size;
  const g = GEOM[species](level);
  const face = MOOD_FACE[mood] || MOOD_FACE.idle;
  const blink = mood === 'idle' && (t + (o.seed || 0)) % 3.7 < 0.13;
  const f = {
    ...face,
    mouth: face.mouth === 'chew' ? (Math.floor(t * 6) % 2 ? 'chewOpen' : 'smile') : face.mouth,
    blink,
    level,
    branch,
    mood,
    t,
    el: ELEMENT_INFO[sp.element].color,
  };
  let bob = 0;
  let sy = 1 + 0.02 * Math.sin(t * 2.4);
  if (mood === 'happy' || mood === 'cheer') bob = -Math.abs(Math.sin(t * 6)) * (mood === 'cheer' ? 16 : 7);
  if (mood === 'sleep') sy = 0.95 + 0.03 * Math.sin(t * 1.6);
  if (mood === 'sad' || mood === 'sick') sy = 0.97 + 0.01 * Math.sin(t * 1.5);

  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
  ctx.translate(x, y);
  if (o.shadow !== false) ellipse(ctx, 0, 0, 40 * s * (species === 'chako' ? 1.4 : 1), 8 * s, 0, 'rgba(0,0,0,0.18)');
  ctx.translate(0, bob * s);
  ctx.scale(s * facing, s * sy);
  drawBack(ctx, g, f);
  BODY[species](ctx, g, f);
  drawFront(ctx, g, f);
  drawMoodFx(ctx, g, f);
  ctx.restore();
  drawOverlay(ctx, x + g.head.x * s * facing, y + (g.head.y * sy + bob) * s, s, f);
}

// Where a pet's head is on screen (for speech bubbles, taps, particles).
export function petAnchor(pet, x, y, size, facing = 1) {
  const s = (size / 100) * growth(pet.level) * SPECIES[pet.species].size;
  const g = GEOM[pet.species](pet.level);
  return {
    head: { x: x + g.head.x * s * facing, y: y + g.head.y * s, r: g.head.r * s },
    body: { x: x + g.body.x * s * facing, y: y + g.body.y * s, rx: g.body.rx * s, ry: g.body.ry * s },
    top: y + (g.head.y - g.head.r * 1.3) * s,
    scale: s,
  };
}

export { star, heart, sparkle };
