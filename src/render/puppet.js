import { GROUND } from '../config.js';
import { DOLLS } from './dolls.js';
import { getPose, expressionFor } from './poses.js';
import { D2R, ellipse, local } from './draw.js';

// Turn pose angles into joint positions. Feet rest at (0,0).
export function solveRig(rig, p) {
  const leg = (a1, a2) => {
    const r1 = a1 * D2R;
    const r2 = (a1 + a2) * D2R;
    const kx = Math.sin(r1) * rig.thigh;
    const ky = Math.cos(r1) * rig.thigh;
    return { kx, ky, fx: kx + Math.sin(r2) * rig.shin, fy: ky + Math.cos(r2) * rig.shin };
  };
  const LF = leg(p.lF1, p.lF2);
  const LB = leg(p.lB1, p.lB2);
  const hip = { x: 0, y: -Math.max(LF.fy, LB.fy, rig.thigh * 0.5) - p.lift };
  const lr = p.lean * D2R;
  const ls = Math.sin(lr);
  const lc = Math.cos(lr);
  const along = (d) => ({ x: hip.x + ls * d, y: hip.y - lc * d });
  const neck = along(rig.torso);
  const sh = along(rig.torso * rig.shoulderAt);
  const shF = { x: sh.x + lc * rig.shoulderOff, y: sh.y + ls * rig.shoulderOff };
  const shB = { x: sh.x - lc * rig.shoulderOff, y: sh.y - ls * rig.shoulderOff };
  const arm = (s, a1, a2) => {
    const r1 = (a1 + p.lean) * D2R;
    const r2 = (a1 + a2 + p.lean) * D2R;
    const el = { x: s.x + Math.sin(r1) * rig.uarm, y: s.y + Math.cos(r1) * rig.uarm };
    return { el, ha: { x: el.x + Math.sin(r2) * rig.farm, y: el.y + Math.cos(r2) * rig.farm } };
  };
  const AF = arm(shF, p.aF1, p.aF2);
  const AB = arm(shB, p.aB1, p.aB2);
  const headRot = p.lean + p.head;
  const hd = rig.neck + rig.headR;
  const head = { x: neck.x + Math.sin(headRot * D2R) * hd, y: neck.y - Math.cos(headRot * D2R) * hd };
  return {
    hip, neck, head, headRot, lean: p.lean,
    kneeF: { x: hip.x + LF.kx, y: hip.y + LF.ky }, footF: { x: hip.x + LF.fx, y: hip.y + LF.fy },
    kneeB: { x: hip.x + LB.kx, y: hip.y + LB.ky }, footB: { x: hip.x + LB.fx, y: hip.y + LB.fy },
    shF, shB, elF: AF.el, haF: AF.ha, elB: AB.el, haB: AB.ha,
  };
}

function isBlinking(t, idx) {
  return (t + idx * 1.3) % 3.2 < 0.12;
}

// f: a fighter (or any object with the same fields), opts.alt picks palette 2.
export function drawDoll(ctx, f, opts = {}) {
  const { time = 0, alt = false, hideForearm = false } = opts;
  const doll = DOLLS[f.charId];
  const pose = getPose(f, time);
  const J = solveRig(doll.rig, pose);
  const flashing = f.flash > 0 && f.flash % 4 < 2;
  const pal = flashing ? doll.flashPal : doll.pal[alt ? 1 : 0];
  const headless = doll.detachHeadOnKO && f.state === 'ko' && !f.air;
  const o = { time, expr: expressionFor(f), blink: isBlinking(time, f.idx || 0), hideForearm, headless };

  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.scale(f.facing * (pose.flip || 1), 1);
  if (pose.rot) {
    const lie = Math.min(1, Math.abs(pose.rot) / 90);
    ctx.translate(0, -doll.rig.torsoW * 0.4 * lie);
    ctx.rotate(pose.rot * D2R);
  }
  doll.draw(ctx, J, pal, o);
  ctx.restore();

  if (headless) {
    // Sia Kabal's head pops off and rolls away on K.O.
    const k = Math.min(f.sf, 45);
    const r = doll.rig.headR;
    const hx = f.x - f.facing * (40 + k * 2.2);
    local(ctx, { x: hx, y: GROUND - r * 0.92 + Math.abs(Math.sin(k * 0.25)) * -10 * (1 - k / 45) }, -f.facing * k * 9, () => {
      ctx.scale(f.facing, 1);
      doll.head(ctx, pal, { ...o, expr: 'hurt' });
    });
  }
}

export function drawShadow(ctx, f) {
  const h = Math.max(0, GROUND - f.y);
  const s = Math.max(0.35, 1 - h / 260);
  const w = f.state === 'down' || f.state === 'ko' ? 80 : 44;
  ellipse(ctx, f.x, GROUND + 2, w * s, 9 * s, 0, `rgba(30,15,40,${0.32 * s})`);
}

// Head only, centred on (x, y); used for HUD portraits and menus.
export function drawPortrait(ctx, charId, x, y, size, { alt = false, expr = 'normal', time = 0, facing = 1 } = {}) {
  const doll = DOLLS[charId];
  const s = size / (doll.rig.headR * 2.4);
  ctx.save();
  ctx.translate(x, y + (charId === 'hunkrabok' ? size * 0.25 : 0));
  ctx.scale(s * facing, s);
  doll.head(ctx, doll.pal[alt ? 1 : 0], { time, expr, blink: false });
  ctx.restore();
}

// Full-body idle preview for menus.
export function drawPreview(ctx, charId, x, y, scale, { alt = false, time = 0, facing = 1, state = 'idle' } = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  const fake = { charId, x: 0, y: 0, facing, state, sf: Math.floor(time * 60) % 40, flash: 0, idx: 0, air: false, vy: 0, stun: 0, move: null };
  drawDoll(ctx, fake, { time, alt });
  ctx.restore();
}
