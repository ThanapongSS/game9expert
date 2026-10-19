// Small canvas helpers shared by the doll, stage and HUD renderers.
export const D2R = Math.PI / 180;

export function capsule(ctx, a, b, w, fill, outline, ow = 4) {
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  if (outline) {
    ctx.strokeStyle = outline;
    ctx.lineWidth = w + ow;
    ctx.stroke();
  }
  ctx.strokeStyle = fill;
  ctx.lineWidth = w;
  ctx.stroke();
}

export function circle(ctx, x, y, r, fill, outline, ow = 3) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (outline) {
    ctx.strokeStyle = outline;
    ctx.lineWidth = ow;
    ctx.stroke();
  }
}

export function ellipse(ctx, x, y, rx, ry, rot, fill, outline, ow = 3) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (outline) {
    ctx.strokeStyle = outline;
    ctx.lineWidth = ow;
    ctx.stroke();
  }
}

export function roundRectPath(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function roundRect(ctx, x, y, w, h, r, fill, outline, ow = 3) {
  roundRectPath(ctx, x, y, w, h, r);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (outline) {
    ctx.strokeStyle = outline;
    ctx.lineWidth = ow;
    ctx.stroke();
  }
}

export function line(ctx, pts, color, w = 2, cap = 'round') {
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = cap;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

export function local(ctx, origin, angleDeg, fn) {
  ctx.save();
  ctx.translate(origin.x, origin.y);
  if (angleDeg) ctx.rotate(angleDeg * D2R);
  fn();
  ctx.restore();
}

export const FONT = '"Mitr", "Kanit", "Sukhumvit Set", "Noto Sans Thai", system-ui, sans-serif';

export function outlinedText(ctx, text, x, y, { size = 32, fill = '#fff', stroke = '#1b1030', sw = 6, align = 'center', weight = 600, base = 'middle' } = {}) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = base;
  ctx.lineJoin = 'round';
  if (sw) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = sw;
    ctx.strokeText(text, x, y);
  }
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}
