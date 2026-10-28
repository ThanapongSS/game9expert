// Adventure foes are big emoji standing on an element-coloured platform.
// Bosses get a pulsing aura and a crown.
import { ellipse } from '../../../src/render/draw.js';
import { ELEMENT_INFO } from '../data/species.js';
import { star } from './pets.js';

const TAU = Math.PI * 2;

/**
 * look: { emoji, boss }, element: element id for the platform colour.
 * o: { t, mood: 'idle' | 'attack' | 'hurt', facing: 1 right / -1 left, alpha }
 */
export function drawFoe(ctx, look, element, x, y, size, o = {}) {
  const t = o.t || 0;
  const mood = o.mood || 'idle';
  const facing = o.facing || -1;
  const col = ELEMENT_INFO[element]?.color || '#9a9aa8';
  const s = size * (look.boss ? 1.3 : 1);
  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
  // platform
  ellipse(ctx, x, y, s * 0.5, s * 0.12, 0, 'rgba(0,0,0,0.2)');
  ellipse(ctx, x, y - s * 0.02, s * 0.42, s * 0.09, 0, null, col, Math.max(2, s * 0.03));
  if (look.boss) {
    const pulse = 0.5 + 0.5 * Math.sin(t * 3);
    const g = ctx.createRadialGradient(x, y - s * 0.5, s * 0.1, x, y - s * 0.5, s * 0.8);
    g.addColorStop(0, `rgba(255,60,90,${0.25 + pulse * 0.2})`);
    g.addColorStop(1, 'rgba(255,60,90,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y - s * 0.5, s * 0.8, 0, TAU);
    ctx.fill();
  }
  let bob = -Math.abs(Math.sin(t * 3)) * s * 0.04;
  let dx = 0;
  if (mood === 'hurt') dx = Math.sin(t * 60) * s * 0.05;
  if (mood === 'attack') bob -= s * 0.06;
  ctx.translate(x + dx, y - s * 0.06 + bob);
  ctx.scale(facing === 1 ? -1 : 1, 1 + 0.03 * Math.sin(t * 3));
  ctx.font = `${s * 0.82}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#5a3d2b'; // only used if the device lacks this emoji
  ctx.shadowColor = 'rgba(40,20,40,0.45)';
  ctx.shadowBlur = s * 0.06;
  ctx.shadowOffsetY = s * 0.03;
  ctx.fillText(look.emoji, 0, -s * 0.08);
  ctx.restore();
  if (look.boss) {
    // crown floating above
    ctx.save();
    const cy = y - s * 1.0 + Math.sin(t * 2.5) * s * 0.03;
    ctx.translate(x, cy);
    const w = s * 0.18;
    ctx.beginPath();
    ctx.moveTo(-w, w * 0.5);
    ctx.lineTo(-w, -w * 0.3);
    ctx.lineTo(-w * 0.5, w * 0.1);
    ctx.lineTo(0, -w * 0.6);
    ctx.lineTo(w * 0.5, w * 0.1);
    ctx.lineTo(w, -w * 0.3);
    ctx.lineTo(w, w * 0.5);
    ctx.closePath();
    ctx.fillStyle = '#ffd34d';
    ctx.fill();
    ctx.strokeStyle = '#c98a12';
    ctx.lineWidth = Math.max(1.5, s * 0.015);
    ctx.stroke();
    star(ctx, 0, w * 0.1, w * 0.25, '#ff4f6d');
    ctx.restore();
  }
}
