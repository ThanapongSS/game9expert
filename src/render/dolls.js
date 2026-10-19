// Procedural doll art. Every doll is a puppet made of separate parts
// (legs, arms, torso, head) placed by the rig in puppet.js.
// Coordinates are local to the doll: feet at (0,0), facing right.
import { capsule, circle, ellipse, roundRect, line, local } from './draw.js';

// ---------- shared face bits ----------

function eye(ctx, x, y, r, o, color, style = 'button') {
  const { expr, blink } = o;
  ctx.save();
  ctx.translate(x, y);
  if (expr === 'hurt') {
    line(ctx, [-r, -r, r, r], color, r * 0.55);
    line(ctx, [-r, r, r, -r], color, r * 0.55);
  } else if (expr === 'strain') {
    line(ctx, [-r, -r * 0.8, r * 0.6, 0, -r, r * 0.8], color, r * 0.5);
  } else if (expr === 'happy') {
    ctx.beginPath();
    ctx.arc(0, r * 0.4, r, Math.PI * 1.1, Math.PI * 1.9);
    ctx.strokeStyle = color;
    ctx.lineWidth = r * 0.5;
    ctx.lineCap = 'round';
    ctx.stroke();
  } else if (blink && expr === 'normal') {
    line(ctx, [-r, 0, r, 0], color, r * 0.45);
  } else if (style === 'carved') {
    ctx.beginPath();
    ctx.arc(0, -r * 0.3, r, Math.PI * 0.15, Math.PI * 0.85);
    ctx.strokeStyle = color;
    ctx.lineWidth = r * 0.45;
    ctx.lineCap = 'round';
    ctx.stroke();
  } else if (style === 'almond') {
    ellipse(ctx, 0, 0, r * 1.15, r * 0.62, 0, '#fff', color, r * 0.3);
    circle(ctx, r * 0.25, 0, r * 0.5, color);
  } else {
    circle(ctx, 0, 0, r, color);
    circle(ctx, -r * 0.35, -r * 0.35, r * 0.3, 'rgba(255,255,255,0.85)');
  }
  ctx.restore();
  if (expr === 'angry') line(ctx, [x - r * 1.3, y - r * 2, x + r * 1.2, y - r * 1.1], color, r * 0.45);
  if (expr === 'sad') line(ctx, [x - r * 1.2, y - r * 1.2, x + r * 1.2, y - r * 2], color, r * 0.4);
}

function mouth(ctx, x, y, w, o, color, fill = '#7a1f1f') {
  const { expr } = o;
  if (expr === 'hurt' || expr === 'angry') {
    ellipse(ctx, x, y + w * 0.1, w * 0.45, w * (expr === 'hurt' ? 0.5 : 0.3), 0, fill, color, 2);
  } else if (expr === 'happy') {
    ctx.beginPath();
    ctx.arc(x, y - w * 0.2, w * 0.6, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
  } else if (expr === 'sad' || expr === 'strain') {
    ctx.beginPath();
    ctx.arc(x, y + w * 0.5, w * 0.5, 1.2 * Math.PI, 1.8 * Math.PI);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(x - w * 0.22, y, w * 0.24, 0, Math.PI);
    ctx.arc(x + w * 0.26, y, w * 0.24, 0, Math.PI);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.stroke();
  }
}

function stitchX(ctx, x, y, s, color) {
  line(ctx, [x - s, y - s, x + s, y + s], color, 2);
  line(ctx, [x - s, y + s, x + s, y - s], color, 2);
}

function dir(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l = Math.hypot(dx, dy) || 1;
  return { x: dx / l, y: dy / l };
}

// Standard draw order shared by all dolls.
function drawBody(ctx, J, pal, o, d) {
  d.leg(ctx, J.hip, J.kneeB, J.footB, pal, true);
  d.arm(ctx, J.shB, J.elB, J.haB, pal, true, o);
  d.leg(ctx, J.hip, J.kneeF, J.footF, pal, false);
  d.torso(ctx, J, pal, o);
  if (!o.headless) local(ctx, J.head, J.headRot, () => d.head(ctx, pal, o));
  d.arm(ctx, J.shF, J.elF, J.haF, pal, false, o);
}

// ---------- 🧸 Teddy ----------
const teddy = {
  rig: { thigh: 26, shin: 24, torso: 50, neck: 2, headR: 30, uarm: 26, farm: 24, torsoW: 64, shoulderAt: 0.78, shoulderOff: 6 },
  pal: [
    { fur: '#b5773f', furB: '#8f5a2c', light: '#ecc48f', out: '#4a2a12', nose: '#2b1608', eye: '#141414', stitch: '#5c3416', cheek: 'rgba(255,110,110,0.35)', bow: '#e2453c', bowD: '#a82a24' },
    { fur: '#ece6da', furB: '#c9c1b2', light: '#fff8ec', out: '#5a5246', nose: '#3a3028', eye: '#141414', stitch: '#8c8273', cheek: 'rgba(255,120,160,0.4)', bow: '#3c7be2', bowD: '#2753a8' },
  ],
  leg(ctx, hip, knee, foot, pal, back) {
    const c = back ? pal.furB : pal.fur;
    capsule(ctx, hip, knee, 24, c, pal.out);
    capsule(ctx, knee, foot, 22, c, pal.out);
    ellipse(ctx, foot.x + 6, foot.y - 6, 16, 10, 0, c, pal.out);
    if (!back) ellipse(ctx, foot.x + 14, foot.y - 6, 5, 6, 0, pal.light);
  },
  arm(ctx, sh, el, ha, pal, back) {
    const c = back ? pal.furB : pal.fur;
    capsule(ctx, sh, el, 20, c, pal.out);
    capsule(ctx, el, ha, 19, c, pal.out);
    circle(ctx, ha.x, ha.y, 12, c, pal.out);
    circle(ctx, ha.x, ha.y, 6, pal.light);
  },
  torso(ctx, J, pal) {
    const R = this.rig;
    local(ctx, J.hip, J.lean, () => {
      ellipse(ctx, 0, -R.torso / 2 + 2, R.torsoW / 2, R.torso / 2 + 12, 0, pal.fur, pal.out);
      ellipse(ctx, 7, -R.torso / 2 + 4, R.torsoW * 0.3, R.torso * 0.34, 0, pal.light);
      ctx.setLineDash([4, 4]);
      ellipse(ctx, 7, -R.torso / 2 + 4, R.torsoW * 0.3 + 4, R.torso * 0.34 + 4, 0, null, pal.stitch, 1.6);
      ctx.setLineDash([]);
      // bow tie
      const by = -R.torso + 2;
      ctx.beginPath();
      ctx.moveTo(4, by);
      ctx.lineTo(-10, by - 9);
      ctx.lineTo(-10, by + 9);
      ctx.closePath();
      ctx.moveTo(4, by);
      ctx.lineTo(18, by - 9);
      ctx.lineTo(18, by + 9);
      ctx.closePath();
      ctx.fillStyle = pal.bow;
      ctx.fill();
      ctx.strokeStyle = pal.bowD;
      ctx.lineWidth = 2;
      ctx.stroke();
      circle(ctx, 4, by, 4, pal.bowD);
    });
  },
  head(ctx, pal, o) {
    const r = this.rig.headR;
    circle(ctx, -r * 0.55, -r * 0.8, r * 0.36, pal.fur, pal.out);
    circle(ctx, -r * 0.55, -r * 0.8, r * 0.18, pal.light);
    circle(ctx, r * 0.4, -r * 0.88, r * 0.34, pal.fur, pal.out);
    circle(ctx, r * 0.4, -r * 0.88, r * 0.17, pal.light);
    circle(ctx, 0, 0, r, pal.fur, pal.out);
    ellipse(ctx, r * 0.45, r * 0.3, r * 0.44, r * 0.32, 0, pal.light, pal.out, 2);
    ellipse(ctx, r * 0.8, r * 0.16, r * 0.14, r * 0.1, 0, pal.nose);
    mouth(ctx, r * 0.62, r * 0.42, r * 0.36, o, pal.nose);
    eye(ctx, r * 0.36, -r * 0.14, r * 0.13, o, pal.eye);
    eye(ctx, -r * 0.04, -r * 0.16, r * 0.11, o, pal.eye);
    ellipse(ctx, r * 0.2, r * 0.18, r * 0.14, r * 0.08, 0, pal.cheek);
    stitchX(ctx, -r * 0.45, -r * 0.25, 4, pal.stitch);
  },
  draw(ctx, J, pal, o) {
    drawBody(ctx, J, pal, o, this);
  },
};

// ---------- 🤖 Robo ----------
const robo = {
  rig: { thigh: 26, shin: 26, torso: 52, neck: 8, headR: 24, uarm: 25, farm: 25, torsoW: 58, shoulderAt: 0.82, shoulderOff: 5 },
  pal: [
    { metal: '#b9c2cc', metalB: '#8a939d', dark: '#4b535c', body: '#d8413a', bodyB: '#a32e29', out: '#262a30', visor: '#5ff2ff', visorD: '#139bb0', l1: '#ffdc4a', l2: '#4aff7a', l3: '#ff4a6a', ant: '#ff3b3b' },
    { metal: '#c9ccd2', metalB: '#959aa3', dark: '#3f4450', body: '#3a6fd8', bodyB: '#2a4fa0', out: '#1e222b', visor: '#ffb35f', visorD: '#c06a14', l1: '#5ff2ff', l2: '#ffdc4a', l3: '#c08aff', ant: '#ffd23b' },
  ],
  leg(ctx, hip, knee, foot, pal, back) {
    const c = back ? pal.metalB : pal.metal;
    capsule(ctx, hip, knee, 14, c, pal.out);
    capsule(ctx, knee, foot, 16, back ? pal.bodyB : pal.body, pal.out);
    circle(ctx, knee.x, knee.y, 7, pal.dark, pal.out, 2);
    roundRect(ctx, foot.x - 12, foot.y - 13, 32, 13, 4, pal.dark, pal.out, 3);
  },
  arm(ctx, sh, el, ha, pal, back, o) {
    const c = back ? pal.metalB : pal.metal;
    capsule(ctx, sh, el, 13, c, pal.out);
    circle(ctx, sh.x, sh.y, 9, back ? pal.bodyB : pal.body, pal.out, 2);
    if (o.hideForearm && !back) {
      circle(ctx, el.x, el.y, 7, pal.dark, pal.out, 2);
      const t = o.time * 30;
      for (let i = 0; i < 3; i++) circle(ctx, el.x + Math.sin(t + i * 2) * 6, el.y + Math.cos(t * 1.3 + i) * 6, 2, '#ffd84a');
      return;
    }
    capsule(ctx, el, ha, 16, back ? pal.bodyB : pal.body, pal.out);
    circle(ctx, el.x, el.y, 6, pal.dark);
    robo.claw(ctx, el, ha, pal);
  },
  claw(ctx, el, ha, pal) {
    const d = dir(el, ha);
    const n = { x: -d.y, y: d.x };
    circle(ctx, ha.x, ha.y, 8, pal.dark, pal.out, 2);
    for (const s of [-1, 1]) {
      line(ctx, [ha.x + n.x * 5 * s, ha.y + n.y * 5 * s, ha.x + d.x * 11 + n.x * 7 * s, ha.y + d.y * 11 + n.y * 7 * s, ha.x + d.x * 15 + n.x * 2 * s, ha.y + d.y * 15 + n.y * 2 * s], pal.out, 5);
      line(ctx, [ha.x + n.x * 5 * s, ha.y + n.y * 5 * s, ha.x + d.x * 11 + n.x * 7 * s, ha.y + d.y * 11 + n.y * 7 * s, ha.x + d.x * 15 + n.x * 2 * s, ha.y + d.y * 15 + n.y * 2 * s], pal.metal, 2.5);
    }
  },
  torso(ctx, J, pal, o) {
    const R = this.rig;
    local(ctx, J.hip, J.lean, () => {
      roundRect(ctx, -18, -8, 36, 16, 4, pal.dark, pal.out);
      roundRect(ctx, -R.torsoW / 2, -R.torso - 2, R.torsoW, R.torso - 2, 10, pal.body, pal.out);
      roundRect(ctx, -6, -R.torso + 10, 24, 22, 4, pal.dark, pal.out, 2);
      const blink = Math.floor(o.time * 4);
      [pal.l1, pal.l2, pal.l3].forEach((c, i) => circle(ctx, 0 + i * 7, -R.torso + 17, 2.6, (blink + i) % 3 === 0 ? '#fff' : c));
      line(ctx, [-1, -R.torso + 26, 12, -R.torso + 26], pal.l2, 2);
      for (const [x, y] of [[-R.torsoW / 2 + 6, -R.torso + 5], [R.torsoW / 2 - 6, -R.torso + 5], [-R.torsoW / 2 + 6, -10], [R.torsoW / 2 - 6, -10]]) circle(ctx, x, y, 2.2, pal.metal);
      for (let i = 0; i < 3; i++) line(ctx, [-R.torsoW / 2 + 8, -24 - i * 6, -R.torsoW / 2 + 18, -24 - i * 6], pal.bodyB, 2.5);
      roundRect(ctx, -6, -R.torso - 10, 12, 10, 3, pal.metalB, pal.out, 2);
    });
  },
  head(ctx, pal, o) {
    const r = this.rig.headR;
    const blink = Math.floor(o.time * 2) % 2 === 0;
    line(ctx, [-r * 0.2, -r * 0.85, -r * 0.35, -r * 1.55], pal.out, 4);
    line(ctx, [-r * 0.2, -r * 0.85, -r * 0.35, -r * 1.55], pal.metal, 2);
    circle(ctx, -r * 0.35, -r * 1.6, 5.5, blink ? pal.ant : '#fff', pal.out, 2);
    roundRect(ctx, -r, -r * 0.9, r * 2, r * 1.8, 9, pal.metal, pal.out);
    roundRect(ctx, -r * 0.1, -r * 0.48, r * 1.08, r * 0.56, 6, pal.visorD, pal.out, 2);
    // visor "eyes" react to the fight
    const vx = r * 0.44;
    const vy = -r * 0.2;
    ctx.save();
    ctx.shadowColor = pal.visor;
    ctx.shadowBlur = 8;
    if (o.expr === 'hurt') {
      for (const ex of [vx - 8, vx + 12]) {
        line(ctx, [ex - 4, vy - 4, ex + 4, vy + 4], pal.visor, 3);
        line(ctx, [ex - 4, vy + 4, ex + 4, vy - 4], pal.visor, 3);
      }
    } else if (o.expr === 'happy') {
      for (const ex of [vx - 8, vx + 12]) line(ctx, [ex - 5, vy + 3, ex, vy - 3, ex + 5, vy + 3], pal.visor, 3);
    } else if (o.expr === 'angry') {
      for (const ex of [vx - 8, vx + 12]) line(ctx, [ex - 5, vy - 3, ex + 5, vy + 1], pal.visor, 4);
    } else if (o.blink) {
      for (const ex of [vx - 8, vx + 12]) line(ctx, [ex - 4, vy, ex + 4, vy], pal.visor, 3);
    } else {
      for (const ex of [vx - 8, vx + 12]) roundRect(ctx, ex - 4, vy - 5, 8, 10, 3, pal.visor);
    }
    ctx.restore();
    for (let i = 0; i < 4; i++) line(ctx, [r * 0.2 + i * 6, r * 0.35, r * 0.2 + i * 6, r * 0.62], pal.dark, 2.5);
    circle(ctx, -r * 0.55, 0, 6, pal.metalB, pal.out, 2);
    circle(ctx, -r * 0.55, 0, 2, pal.dark);
  },
  draw(ctx, J, pal, o) {
    drawBody(ctx, J, pal, o, this);
  },
};

// ---------- 🎭 Hun Krabok (Thai rod puppet) ----------
const hunkrabok = {
  rig: { thigh: 26, shin: 25, torso: 48, neck: 14, headR: 20, uarm: 25, farm: 23, torsoW: 44, shoulderAt: 0.9, shoulderOff: 4 },
  pal: [
    { robe: '#1f7a4d', robeB: '#165c39', trim: '#f2c94c', trimD: '#a8801e', skin: '#fbf1e1', skinB: '#e0d0b6', out: '#2a1d10', hair: '#1a1410', lip: '#d23a3a', pants: '#f4eee2', pantsB: '#d3c9b4', bamboo: '#d9c27a', bambooD: '#8f7a3a', gem: '#e8364a', cheek: 'rgba(240,110,110,0.4)', eye: '#1a1410' },
    { robe: '#b8322c', robeB: '#8c2420', trim: '#f2c94c', trimD: '#a8801e', skin: '#fbf1e1', skinB: '#e0d0b6', out: '#2a1d10', hair: '#1a1410', lip: '#c2185b', pants: '#f4eee2', pantsB: '#d3c9b4', bamboo: '#d9c27a', bambooD: '#8f7a3a', gem: '#2fb36b', cheek: 'rgba(240,110,110,0.4)', eye: '#1a1410' },
  ],
  leg(ctx, hip, knee, foot, pal, back) {
    const c = back ? pal.pantsB : pal.pants;
    capsule(ctx, hip, knee, 11, c, pal.out, 3);
    capsule(ctx, knee, foot, 10, c, pal.out, 3);
    ellipse(ctx, foot.x + 5, foot.y - 4, 11, 5, 0, pal.hair, pal.out, 2);
  },
  arm(ctx, sh, el, ha, pal, back) {
    const d = dir(el, ha);
    // bamboo fighting stick held in the hand
    const s0 = { x: ha.x - d.x * 8, y: ha.y - d.y * 8 };
    const s1 = { x: ha.x + d.x * 44, y: ha.y + d.y * 44 };
    capsule(ctx, s0, s1, 5, back ? pal.bambooD : pal.bamboo, pal.out, 2.5);
    for (const k of [14, 30]) circle(ctx, ha.x + d.x * k, ha.y + d.y * k, 2.2, pal.bambooD);
    capsule(ctx, sh, el, 13, back ? pal.robeB : pal.robe, pal.out, 3);
    capsule(ctx, el, ha, 7, back ? pal.skinB : pal.skin, pal.out, 3);
    circle(ctx, el.x, el.y, 7, pal.trim, pal.out, 1.5);
    circle(ctx, ha.x, ha.y, 5, back ? pal.skinB : pal.skin, pal.out, 2);
  },
  torso(ctx, J, pal) {
    const R = this.rig;
    // flared robe hanging from the hip, covering the knees
    const hemY = Math.max(J.kneeF.y, J.kneeB.y, J.hip.y + 16) + 8;
    const xs = [J.kneeF.x, J.kneeB.x, J.hip.x];
    const l = Math.min(...xs) - 16;
    const r = Math.max(...xs) + 16;
    ctx.beginPath();
    ctx.moveTo(J.hip.x - R.torsoW * 0.42, J.hip.y - 6);
    ctx.quadraticCurveTo(l - 4, (J.hip.y + hemY) / 2, l, hemY);
    ctx.quadraticCurveTo((l + r) / 2, hemY + 6, r, hemY);
    ctx.quadraticCurveTo(r + 4, (J.hip.y + hemY) / 2, J.hip.x + R.torsoW * 0.42, J.hip.y - 6);
    ctx.closePath();
    ctx.fillStyle = pal.robeB;
    ctx.fill();
    ctx.strokeStyle = pal.out;
    ctx.lineWidth = 3;
    ctx.stroke();
    line(ctx, [l + 3, hemY - 3, (l + r) / 2, hemY + 2, r - 3, hemY - 3], pal.trim, 4);
    for (let i = 1; i < 5; i++) {
      const x = l + ((r - l) * i) / 5;
      ctx.save();
      ctx.translate(x, hemY - 10);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = pal.trim;
      ctx.fillRect(-2.5, -2.5, 5, 5);
      ctx.restore();
    }
    local(ctx, J.hip, J.lean, () => {
      roundRect(ctx, -R.torsoW / 2, -R.torso - 2, R.torsoW, R.torso + 6, 12, pal.robe, pal.out);
      // crossed gold sash (sangwan)
      line(ctx, [-R.torsoW / 2 + 4, -R.torso + 2, R.torsoW / 2 - 4, -6], pal.trim, 4);
      line(ctx, [R.torsoW / 2 - 4, -R.torso + 2, -R.torsoW / 2 + 4, -6], pal.trim, 4);
      circle(ctx, 0, -R.torso / 2 - 2, 5, pal.gem, pal.trimD, 2);
      roundRect(ctx, -R.torsoW / 2, -4, R.torsoW, 8, 3, pal.trim, pal.trimD, 1.5);
      // bamboo tube neck (the "krabok")
      roundRect(ctx, -5, -R.torso - R.neck - 4, 10, R.neck + 6, 3, pal.bamboo, pal.out, 2);
      line(ctx, [-5, -R.torso - R.neck / 2, 5, -R.torso - R.neck / 2], pal.bambooD, 1.5);
    });
  },
  head(ctx, pal, o) {
    const r = this.rig.headR;
    // golden ear ornament (kranchiak)
    ctx.beginPath();
    ctx.moveTo(-r * 0.4, -r * 0.2);
    ctx.quadraticCurveTo(-r * 1.6, -r * 0.6, -r * 1.3, -r * 1.6);
    ctx.quadraticCurveTo(-r * 0.9, -r * 0.8, -r * 0.2, -r * 0.6);
    ctx.closePath();
    ctx.fillStyle = pal.trim;
    ctx.fill();
    ctx.strokeStyle = pal.trimD;
    ctx.lineWidth = 2;
    ctx.stroke();
    ellipse(ctx, 0, 0, r * 0.86, r, 0, pal.skin, pal.out);
    // hair line
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.86, r, 0, Math.PI * 0.95, Math.PI * 1.55);
    ctx.lineTo(-r * 0.2, -r * 0.55);
    ctx.closePath();
    ctx.fillStyle = pal.hair;
    ctx.fill();
    // chada crown: stacked tiers up to a spire
    const tiers = [[-0.95, 1.9, 0.32], [-1.27, 1.55, 0.3], [-1.57, 1.2, 0.28], [-1.85, 0.9, 0.26]];
    ctx.beginPath();
    ctx.moveTo(-r * 0.32, -r * 2.1);
    ctx.lineTo(0, -r * 3.5);
    ctx.lineTo(r * 0.32, -r * 2.1);
    ctx.closePath();
    ctx.fillStyle = pal.trim;
    ctx.fill();
    ctx.strokeStyle = pal.trimD;
    ctx.lineWidth = 2;
    ctx.stroke();
    for (const [y, w, h] of tiers) {
      roundRect(ctx, (-w * r) / 2, y * r - h * r, w * r, h * r + 2, 4, pal.trim, pal.trimD, 2);
      circle(ctx, 0, y * r - (h * r) / 2, 2.6, pal.gem);
    }
    circle(ctx, 0, -r * 3.5, 3, pal.gem);
    eye(ctx, r * 0.38, -r * 0.08, r * 0.17, o, pal.eye, 'almond');
    line(ctx, [r * 0.12, -r * 0.4, r * 0.38, -r * 0.48, r * 0.62, -r * 0.4], pal.hair, 1.8);
    ellipse(ctx, r * 0.3, r * 0.3, r * 0.16, r * 0.09, 0, pal.cheek);
    if (o.expr === 'normal' || o.expr === 'happy') {
      ellipse(ctx, r * 0.55, r * 0.55, r * 0.17, r * 0.08, 0, pal.lip);
    } else {
      mouth(ctx, r * 0.55, r * 0.5, r * 0.3, o, pal.out, pal.lip);
    }
  },
  draw(ctx, J, pal, o) {
    drawBody(ctx, J, pal, o, this);
  },
  portraitDy: 0.25,
};

// ---------- 🗿 Sia Kabal (Thai clay doll) ----------
const siakabal = {
  rig: { thigh: 22, shin: 20, torso: 50, neck: 4, headR: 28, uarm: 23, farm: 22, torsoW: 74, shoulderAt: 0.8, shoulderOff: 7 },
  pal: [
    { clay: '#c9733d', clayB: '#9e5428', light: '#eaa772', out: '#4d260f', crack: '#5e2c10', mark: '#7a3a17', thread: '#f7f1e6', eye: '#3a1a08', cheek: 'rgba(255,110,70,0.3)' },
    { clay: '#7d7770', clayB: '#5d5853', light: '#aaa49c', out: '#2a2724', crack: '#2f2c29', mark: '#46423e', thread: '#e84a4a', eye: '#1e1c1a', cheek: 'rgba(255,140,140,0.25)' },
  ],
  leg(ctx, hip, knee, foot, pal, back) {
    const c = back ? pal.clayB : pal.clay;
    capsule(ctx, hip, knee, 26, c, pal.out);
    capsule(ctx, knee, foot, 24, c, pal.out);
    ellipse(ctx, foot.x + 5, foot.y - 7, 16, 9, 0, c, pal.out);
  },
  arm(ctx, sh, el, ha, pal, back) {
    const c = back ? pal.clayB : pal.clay;
    capsule(ctx, sh, el, 22, c, pal.out);
    capsule(ctx, el, ha, 20, c, pal.out);
    circle(ctx, ha.x, ha.y, 13, c, pal.out);
    if (!back) {
      // sacred white thread around the wrist
      const d = dir(el, ha);
      const p = { x: ha.x - d.x * 12, y: ha.y - d.y * 12 };
      capsule(ctx, { x: p.x - d.y * 10, y: p.y + d.x * 10 }, { x: p.x + d.y * 10, y: p.y - d.x * 10 }, 3, pal.thread);
    }
  },
  torso(ctx, J, pal) {
    const R = this.rig;
    const w = R.torsoW;
    const h = R.torso;
    local(ctx, J.hip, J.lean, () => {
      ctx.beginPath();
      ctx.moveTo(-w * 0.3, 8);
      ctx.bezierCurveTo(-w * 0.62, 0, -w * 0.6, -h * 0.55, -w * 0.4, -h - 2);
      ctx.lineTo(w * 0.4, -h - 2);
      ctx.bezierCurveTo(w * 0.6, -h * 0.55, w * 0.62, 0, w * 0.3, 8);
      ctx.closePath();
      ctx.fillStyle = pal.clay;
      ctx.fill();
      ctx.strokeStyle = pal.out;
      ctx.lineWidth = 3;
      ctx.stroke();
      ellipse(ctx, w * 0.12, -h * 0.45, w * 0.16, h * 0.24, -0.2, pal.light);
      const zy = -h * 0.72;
      const pts = [];
      for (let i = 0; i <= 8; i++) pts.push(-w * 0.4 + (w * 0.8 * i) / 8, zy + (i % 2 ? 5 : -2));
      line(ctx, pts, pal.mark, 2.5);
      circle(ctx, w * 0.1, -h * 0.3, 3, pal.mark);
      line(ctx, [-w * 0.35, -h * 0.4, -w * 0.25, -h * 0.32, -w * 0.28, -h * 0.2, -w * 0.18, -h * 0.12], pal.crack, 2);
    });
  },
  head(ctx, pal, o) {
    const r = this.rig.headR;
    // topknot (juk) tied with a thread
    circle(ctx, -r * 0.1, -r * 1.05, r * 0.34, pal.clay, pal.out);
    line(ctx, [-r * 0.4, -r * 0.82, r * 0.2, -r * 0.82], pal.thread, 4);
    ellipse(ctx, 0, 0, r, r * 0.92, 0, pal.clay, pal.out);
    ellipse(ctx, r * 0.3, -r * 0.35, r * 0.3, r * 0.2, -0.4, pal.light);
    eye(ctx, r * 0.42, -r * 0.05, r * 0.15, o, pal.eye, 'carved');
    eye(ctx, r * 0.02, -r * 0.05, r * 0.13, o, pal.eye, 'carved');
    mouth(ctx, r * 0.4, r * 0.45, r * 0.32, o, pal.eye, pal.crack);
    ellipse(ctx, r * 0.62, r * 0.2, r * 0.13, r * 0.08, 0, pal.cheek);
    line(ctx, [r * 0.85, -r * 0.5, r * 0.55, -r * 0.62, r * 0.45, -r * 0.45, r * 0.2, -r * 0.6], pal.crack, 2);
    // the neck seam: this doll is meant to lose its head
    ctx.setLineDash([3, 3]);
    line(ctx, [-r * 0.5, r * 0.82, r * 0.5, r * 0.82], pal.crack, 2);
    ctx.setLineDash([]);
  },
  draw(ctx, J, pal, o) {
    drawBody(ctx, J, pal, o, this);
  },
  detachHeadOnKO: true,
};

// ---------- 🥊 Muay Thai "Giant Fist" ----------
const muaythai = {
  rig: { thigh: 28, shin: 27, torso: 50, neck: 6, headR: 22, uarm: 26, farm: 24, torsoW: 54, shoulderAt: 0.85, shoulderOff: 6 },
  pal: [
    { skin: '#c98a55', skinB: '#a46c3e', out: '#4a2a12', shorts: '#d6262f', shortsB: '#a51c24', trim: '#f4d03f', glove: '#e02a2a', gloveB: '#a81d1d', cuff: '#ffffff', mong: '#f4f0e6', mong2: '#d6262f', hair: '#1a1410', eye: '#1a1410', wrap: '#f4f0e6', band: '#2a7be0' },
    { skin: '#c98a55', skinB: '#a46c3e', out: '#4a2a12', shorts: '#2a5bd6', shortsB: '#1d3f99', trim: '#f4d03f', glove: '#2a6be0', gloveB: '#1b4aa8', cuff: '#ffffff', mong: '#f4f0e6', mong2: '#2a5bd6', hair: '#1a1410', eye: '#1a1410', wrap: '#f4f0e6', band: '#e0402a' },
  ],
  leg(ctx, hip, knee, foot, pal, back) {
    const s = back ? pal.skinB : pal.skin;
    capsule(ctx, hip, knee, 17, s, pal.out);
    capsule(ctx, knee, foot, 15, s, pal.out);
    const mid = { x: hip.x + (knee.x - hip.x) * 0.62, y: hip.y + (knee.y - hip.y) * 0.62 };
    capsule(ctx, hip, mid, 27, back ? pal.shortsB : pal.shorts, pal.out);
    // ankle wrap
    const d = dir(knee, foot);
    const a = { x: foot.x - d.x * 8, y: foot.y - d.y * 8 };
    capsule(ctx, { x: a.x - d.y * 7, y: a.y + d.x * 7 }, { x: a.x + d.y * 7, y: a.y - d.x * 7 }, 5, pal.wrap);
    ellipse(ctx, foot.x + 6, foot.y - 4, 13, 6, 0, s, pal.out, 2.5);
  },
  arm(ctx, sh, el, ha, pal, back, o) {
    const s = back ? pal.skinB : pal.skin;
    capsule(ctx, sh, el, 15, s, pal.out);
    // prajiad armband
    const d = dir(sh, el);
    const m = { x: (sh.x + el.x) / 2, y: (sh.y + el.y) / 2 };
    capsule(ctx, { x: m.x - d.x * 3, y: m.y - d.y * 3 }, { x: m.x + d.x * 3, y: m.y + d.y * 3 }, 19, pal.band, pal.out, 2);
    capsule(ctx, el, ha, 14, s, pal.out);
    // oversized boxing glove, grows into the giant fist
    const big = back ? 1 : o.fist || 1;
    const g = dir(el, ha);
    capsule(ctx, { x: ha.x - g.x * 9, y: ha.y - g.y * 9 }, { x: ha.x - g.x * 3, y: ha.y - g.y * 3 }, 16 * Math.min(big, 1.5), pal.cuff, pal.out, 2);
    const c = { x: ha.x + g.x * 5 * big, y: ha.y + g.y * 5 * big };
    circle(ctx, c.x, c.y, 15 * big, back ? pal.gloveB : pal.glove, pal.out, 3);
    circle(ctx, c.x - 4 * big, c.y - 5 * big, 5 * big, 'rgba(255,255,255,0.35)');
  },
  torso(ctx, J, pal) {
    const R = this.rig;
    local(ctx, J.hip, J.lean, () => {
      ctx.beginPath();
      ctx.moveTo(-R.torsoW * 0.36, 6);
      ctx.lineTo(-R.torsoW * 0.52, -R.torso + 6);
      ctx.quadraticCurveTo(0, -R.torso - 10, R.torsoW * 0.52, -R.torso + 6);
      ctx.lineTo(R.torsoW * 0.36, 6);
      ctx.closePath();
      ctx.fillStyle = pal.skin;
      ctx.fill();
      ctx.strokeStyle = pal.out;
      ctx.lineWidth = 3;
      ctx.stroke();
      line(ctx, [-2, -R.torso + 16, 9, -R.torso + 22, 20, -R.torso + 15], pal.skinB, 2);
      for (let i = 0; i < 3; i++) line(ctx, [3, -R.torso + 29 + i * 7, 14, -R.torso + 29 + i * 7], pal.skinB, 2);
      roundRect(ctx, -R.torsoW * 0.42, -6, R.torsoW * 0.84, 13, 4, pal.trim, pal.out, 2);
    });
  },
  head(ctx, pal, o) {
    const r = this.rig.headR;
    circle(ctx, 0, 0, r, pal.skin, pal.out);
    ctx.beginPath();
    ctx.arc(0, 0, r, Math.PI * 1.0, Math.PI * 1.85);
    ctx.closePath();
    ctx.fillStyle = pal.hair;
    ctx.fill();
    circle(ctx, -r * 0.18, r * 0.1, r * 0.2, pal.skin, pal.out, 2);
    // mongkhon headband with its tail sticking up behind
    ctx.beginPath();
    ctx.moveTo(-r * 0.85, -r * 0.4);
    ctx.quadraticCurveTo(-r * 1.8, -r * 0.8, -r * 1.45, -r * 1.55);
    ctx.lineCap = 'round';
    ctx.strokeStyle = pal.out;
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.strokeStyle = pal.mong;
    ctx.lineWidth = 5;
    ctx.stroke();
    capsule(ctx, { x: -r, y: -r * 0.32 }, { x: r * 0.98, y: -r * 0.46 }, 7, pal.mong, pal.out, 3);
    for (let i = 0; i < 6; i++) circle(ctx, -r + (i / 5) * 1.98 * r, -r * 0.32 - (i / 5) * 0.14 * r, 2, pal.mong2);
    eye(ctx, r * 0.45, -r * 0.02, r * 0.14, o, pal.eye);
    eye(ctx, r * 0.06, -r * 0.04, r * 0.12, o, pal.eye);
    if (o.expr === 'normal') line(ctx, [r * 0.25, -r * 0.22, r * 0.62, -r * 0.14], pal.hair, 3);
    line(ctx, [r * 0.82, -r * 0.02, r * 0.94, r * 0.18, r * 0.8, r * 0.24], pal.out, 2);
    mouth(ctx, r * 0.55, r * 0.5, r * 0.32, o, pal.out);
  },
  draw(ctx, J, pal, o) {
    const f = o.fighter;
    o.fist = 1;
    if (f && f.state === 'special' && f.move === 'giantFist') {
      if (f.sp === 0) o.fist = 1 + Math.min(1, f.sf / 14) * 1.1;
      else if (f.sp === 1) o.fist = 2.1;
      else o.fist = 2.1 - Math.min(1, f.sf / 12) * 1.1;
    }
    drawBody(ctx, J, pal, o, this);
  },
};

// ---------- 👻 Mae Nak, the long-armed ghost ----------
const maenak = {
  rig: { thigh: 28, shin: 28, torso: 52, neck: 8, headR: 21, uarm: 34, farm: 34, torsoW: 44, shoulderAt: 0.88, shoulderOff: 4 },
  pal: [
    { skin: '#e3eaee', skinB: '#c4cdd4', out: '#2b2433', hair: '#121016', blouse: '#ece2d0', sabai: '#8a1f2e', sabaiD: '#5e1420', skirt: '#3b2a4a', skirtB: '#2a1d36', trim: '#c9a24a', lip: '#8f1b2a', eye: '#121016', shadow: 'rgba(70,60,110,0.45)', aura: 'rgba(170,200,255,0.16)', nail: '#2b2433' },
    { skin: '#e3eaee', skinB: '#c4cdd4', out: '#2b2433', hair: '#121016', blouse: '#f6f3ee', sabai: '#cfc6b8', sabaiD: '#a89f92', skirt: '#ddd6ca', skirtB: '#c2baae', trim: '#8e9aa6', lip: '#8f1b2a', eye: '#121016', shadow: 'rgba(70,60,110,0.45)', aura: 'rgba(255,255,255,0.2)', nail: '#2b2433' },
  ],
  leg(ctx, hip, knee, foot, pal, back) {
    const c = back ? pal.skinB : pal.skin;
    capsule(ctx, hip, knee, 10, c, pal.out, 3);
    capsule(ctx, knee, foot, 9, c, pal.out, 3);
    ellipse(ctx, foot.x + 4, foot.y - 3, 8, 4, 0, c, pal.out, 2);
  },
  arm(ctx, sh, el, ha, pal, back) {
    const c = back ? pal.skinB : pal.skin;
    capsule(ctx, sh, el, 9, c, pal.out, 3);
    capsule(ctx, el, ha, 8, c, pal.out, 3);
    const d = dir(sh, el);
    capsule(ctx, sh, { x: sh.x + d.x * 10, y: sh.y + d.y * 10 }, 14, back ? pal.skirtB : pal.blouse, pal.out, 2);
    // long, dark-nailed fingers
    const fd = dir(el, ha);
    const n = { x: -fd.y, y: fd.x };
    for (const s of [-1, 0, 1]) line(ctx, [ha.x + n.x * 3 * s, ha.y + n.y * 3 * s, ha.x + fd.x * 13 + n.x * 4 * s, ha.y + fd.y * 13 + n.y * 4 * s], pal.nail, 2.5);
    circle(ctx, ha.x, ha.y, 5, c, pal.out, 2);
  },
  torso(ctx, J, pal) {
    const R = this.rig;
    // long pha sin skirt with a ragged, ghostly hem
    const hemY = Math.max(J.kneeF.y, J.kneeB.y) + 26;
    const xs = [J.kneeF.x, J.kneeB.x, J.hip.x];
    const l = Math.min(...xs) - 14;
    const r = Math.max(...xs) + 14;
    ctx.beginPath();
    ctx.moveTo(J.hip.x - R.torsoW * 0.4, J.hip.y - 4);
    ctx.lineTo(l, hemY);
    const n = 6;
    for (let i = 1; i <= n; i++) {
      const x = l + ((r - l) * i) / n;
      ctx.lineTo(x - (r - l) / (2 * n), hemY + (i % 2 ? 9 : 3));
      ctx.lineTo(x, hemY);
    }
    ctx.lineTo(J.hip.x + R.torsoW * 0.4, J.hip.y - 4);
    ctx.closePath();
    ctx.fillStyle = pal.skirtB;
    ctx.fill();
    ctx.strokeStyle = pal.out;
    ctx.lineWidth = 3;
    ctx.stroke();
    line(ctx, [l + 4, hemY - 8, r - 4, hemY - 8], pal.trim, 3);
    line(ctx, [l + 7, hemY - 18, r - 7, hemY - 18], pal.trim, 1.5);
    local(ctx, J.hip, J.lean, () => {
      roundRect(ctx, -R.torsoW / 2, -R.torso, R.torsoW, R.torso + 8, 12, pal.blouse, pal.out);
      // sabai shawl across the chest
      ctx.beginPath();
      ctx.moveTo(-R.torsoW / 2, -R.torso + 4);
      ctx.lineTo(-R.torsoW / 2 + 14, -R.torso - 2);
      ctx.lineTo(R.torsoW / 2, -12);
      ctx.lineTo(R.torsoW / 2 - 4, 4);
      ctx.closePath();
      ctx.fillStyle = pal.sabai;
      ctx.fill();
      ctx.strokeStyle = pal.out;
      ctx.lineWidth = 2;
      ctx.stroke();
      line(ctx, [-R.torsoW / 2 + 10, -R.torso + 4, R.torsoW / 2 - 4, -6], pal.sabaiD, 1.5);
      roundRect(ctx, -R.torsoW / 2, -4, R.torsoW, 9, 3, pal.trim, pal.out, 1.5);
    });
  },
  head(ctx, pal, o) {
    const r = this.rig.headR;
    ellipse(ctx, 0, 0, r * 0.86, r, 0, pal.skin, pal.out);
    ellipse(ctx, r * 0.4, -r * 0.05, r * 0.3, r * 0.24, 0, pal.shadow);
    eye(ctx, r * 0.4, -r * 0.05, r * 0.15, o, pal.eye, 'almond');
    if (o.expr === 'normal' || o.expr === 'happy') ellipse(ctx, r * 0.5, r * 0.55, r * 0.16, r * 0.07, 0, pal.lip);
    else mouth(ctx, r * 0.5, r * 0.5, r * 0.3, o, pal.out, pal.lip);
    // hair: crown plus long bangs hiding the far side of the face
    ctx.beginPath();
    ctx.moveTo(r * 0.75, -r * 0.55);
    ctx.quadraticCurveTo(r * 0.2, -r * 1.35, -r * 0.8, -r * 0.85);
    ctx.quadraticCurveTo(-r * 1.2, 0, -r * 0.9, r * 1.3);
    ctx.lineTo(-r * 0.2, r * 1.1);
    ctx.quadraticCurveTo(-r * 0.05, r * 0.2, r * 0.15, -r * 0.4);
    ctx.quadraticCurveTo(r * 0.45, -r * 0.62, r * 0.75, -r * 0.55);
    ctx.closePath();
    ctx.fillStyle = pal.hair;
    ctx.fill();
    line(ctx, [r * 0.62, -r * 0.6, r * 0.78, r * 0.1, r * 0.64, r * 0.85], pal.hair, 2.5);
  },
  draw(ctx, J, pal, o) {
    const f = o.fighter;
    const lying = f && (f.state === 'down' || f.state === 'ko' || f.state === 'launch');
    ctx.save();
    if (!lying) ctx.translate(0, -6 + Math.sin(o.time * 3 + (f?.idx || 0)) * 3);
    ellipse(ctx, J.hip.x, J.hip.y - 24, 52, 100, 0, pal.aura);
    // long hair falling down her back
    local(ctx, J.head, J.headRot, () => {
      const r = this.rig.headR;
      ctx.beginPath();
      ctx.moveTo(-r * 0.8, -r * 0.6);
      ctx.quadraticCurveTo(-r * 2.0, r * 2, -r * 1.4, r * 4.4);
      ctx.lineTo(-r * 0.2, r * 3.8);
      ctx.quadraticCurveTo(-r * 0.4, r * 1.4, r * 0.2, -r * 0.2);
      ctx.closePath();
      ctx.fillStyle = pal.hair;
      ctx.fill();
    });
    drawBody(ctx, J, pal, o, this);
    ctx.restore();
  },
  portraitDy: 0.05,
};

// ---------- 🐉 Phaya Naga ----------
const naga = {
  rig: { thigh: 26, shin: 26, torso: 66, neck: 6, headR: 25, uarm: 18, farm: 16, torsoW: 46, shoulderAt: 0.72, shoulderOff: 5 },
  pal: [
    { scale: '#1f9e6e', scaleB: '#14714d', belly: '#f2c94c', bellyD: '#c99a22', out: '#0b3b2a', crest: '#e8364a', crestD: '#a51c2c', gold: '#f6d24a', eye: '#ffe14a', pupil: '#111111', mouth: '#7a1020', fang: '#ffffff', dot: 'rgba(255,255,255,0.18)' },
    { scale: '#c0392b', scaleB: '#8e2a20', belly: '#f2c94c', bellyD: '#c99a22', out: '#3b0f0a', crest: '#2fb36b', crestD: '#1d7a48', gold: '#f6d24a', eye: '#9ff2ff', pupil: '#111111', mouth: '#4a0a10', fang: '#ffffff', dot: 'rgba(255,255,255,0.18)' },
  ],
  leg(ctx, hip, knee, foot, pal, back) {
    if (back) {
      // part of the coiled body resting on the floor
      capsule(ctx, hip, knee, 30, pal.scaleB, pal.out);
      capsule(ctx, knee, foot, 28, pal.scaleB, pal.out);
      return;
    }
    // the tail, tapering to a curled tip
    const tip = { x: foot.x + 18, y: foot.y - 10 };
    capsule(ctx, hip, knee, 28, pal.scale, pal.out);
    capsule(ctx, knee, foot, 20, pal.scale, pal.out);
    capsule(ctx, foot, tip, 10, pal.scale, pal.out);
    for (const k of [0.3, 0.6]) circle(ctx, hip.x + (knee.x - hip.x) * k, hip.y + (knee.y - hip.y) * k, 3, pal.dot);
  },
  arm(ctx, sh, el, ha, pal, back) {
    const c = back ? pal.scaleB : pal.scale;
    capsule(ctx, sh, el, 12, c, pal.out, 3);
    capsule(ctx, el, ha, 11, c, pal.out, 3);
    const d = dir(el, ha);
    const n = { x: -d.y, y: d.x };
    for (const s of [-1, 0, 1]) line(ctx, [ha.x + n.x * 3 * s, ha.y + n.y * 3 * s, ha.x + d.x * 10 + n.x * 4 * s, ha.y + d.y * 10 + n.y * 4 * s], pal.gold, 2.5);
    circle(ctx, ha.x, ha.y, 6, c, pal.out, 2);
  },
  torso(ctx, J, pal) {
    const R = this.rig;
    local(ctx, J.hip, J.lean, () => {
      const w = R.torsoW;
      for (let y = -R.torso + 2; y < -4; y += 14) {
        ctx.beginPath();
        ctx.moveTo(-w / 2 + 2, y);
        ctx.lineTo(-w / 2 - 10, y + 6);
        ctx.lineTo(-w / 2 + 2, y + 12);
        ctx.closePath();
        ctx.fillStyle = pal.gold;
        ctx.fill();
        ctx.strokeStyle = pal.out;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      roundRect(ctx, -w / 2, -R.torso - 8, w, R.torso + 20, w / 2, pal.scale, pal.out);
      roundRect(ctx, 2, -R.torso, w * 0.42, R.torso + 6, 10, pal.belly, pal.bellyD, 2);
      for (let y = -R.torso + 9; y < 4; y += 9) line(ctx, [4, y, w * 0.42, y], pal.bellyD, 1.5);
      for (let y = -R.torso + 8; y < 0; y += 12) {
        for (const x of [-w * 0.32, -w * 0.12]) circle(ctx, x + ((y / 12) % 2 ? 4 : 0), y, 3, pal.dot);
      }
    });
  },
  head(ctx, pal, o) {
    const r = this.rig.headR;
    const open = o.expr === 'angry' || o.mouthOpen;
    // flame-like crest (ngon) sweeping back
    for (let i = 3; i >= 0; i--) {
      const bx = r * 0.1 - i * r * 0.38;
      const by = -r * 0.62 + i * r * 0.12;
      const tx = bx - r * 0.6;
      const ty = by - r * 0.95 + i * r * 0.15;
      ctx.beginPath();
      ctx.moveTo(bx + r * 0.22, by);
      ctx.quadraticCurveTo(bx + r * 0.1, by - r * 0.75, tx, ty);
      ctx.quadraticCurveTo(bx - r * 0.05, by - r * 0.3, bx - r * 0.22, by);
      ctx.closePath();
      ctx.fillStyle = pal.crest;
      ctx.fill();
      ctx.strokeStyle = pal.crestD;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    if (open) {
      // lower jaw dropped open, forked tongue out
      ellipse(ctx, r * 0.45, r * 0.55, r * 0.85, r * 0.26, 0.35, pal.scale, pal.out);
      ctx.beginPath();
      ctx.moveTo(r * 0.0, r * 0.22);
      ctx.lineTo(r * 1.32, r * 0.12);
      ctx.lineTo(r * 1.05, r * 0.75);
      ctx.closePath();
      ctx.fillStyle = pal.mouth;
      ctx.fill();
      line(ctx, [r * 0.5, r * 0.42, r * 1.35, r * 0.48, r * 1.55, r * 0.38], pal.crest, 2.5);
      line(ctx, [r * 1.35, r * 0.48, r * 1.55, r * 0.6], pal.crest, 2.5);
    }
    ellipse(ctx, r * 0.25, 0, r * 1.15, r * 0.8, 0, pal.scale, pal.out);
    ellipse(ctx, r * 0.5, r * 0.42, r * 0.75, r * 0.2, 0, pal.belly);
    if (!open) line(ctx, [r * 0.3, r * 0.34, r * 1.32, r * 0.22], pal.out, 2.5);
    for (const fx of [r * 1.0, r * 1.2]) {
      ctx.beginPath();
      ctx.moveTo(fx, r * (open ? 0.14 : 0.24));
      ctx.lineTo(fx + r * 0.06, r * (open ? 0.42 : 0.44));
      ctx.lineTo(fx + r * 0.12, r * (open ? 0.13 : 0.23));
      ctx.closePath();
      ctx.fillStyle = pal.fang;
      ctx.fill();
    }
    circle(ctx, r * 1.22, -r * 0.1, 2.5, pal.out);
    // gold crown
    ctx.beginPath();
    ctx.moveTo(-r * 0.45, -r * 0.68);
    ctx.lineTo(-r * 0.36, -r * 1.12);
    ctx.lineTo(-r * 0.16, -r * 0.84);
    ctx.lineTo(0, -r * 1.25);
    ctx.lineTo(r * 0.16, -r * 0.84);
    ctx.lineTo(r * 0.32, -r * 1.1);
    ctx.lineTo(r * 0.38, -r * 0.68);
    ctx.closePath();
    ctx.fillStyle = pal.gold;
    ctx.fill();
    ctx.strokeStyle = pal.out;
    ctx.lineWidth = 2;
    ctx.stroke();
    // eye with a slit pupil
    const ex = r * 0.38;
    const ey = -r * 0.22;
    if (o.expr === 'hurt' || o.expr === 'happy' || o.expr === 'strain' || (o.blink && o.expr === 'normal')) {
      eye(ctx, ex, ey, r * 0.16, o, pal.pupil);
    } else {
      ellipse(ctx, ex, ey, r * 0.24, r * 0.2, 0, pal.eye, pal.out, 2);
      ellipse(ctx, ex + r * 0.03, ey, r * 0.05, r * 0.17, 0, pal.pupil);
      if (o.expr === 'angry' || o.expr === 'sad') line(ctx, [ex - r * 0.3, ey - r * 0.32, ex + r * 0.3, ey - r * (o.expr === 'sad' ? 0.42 : 0.18)], pal.out, 3);
    }
  },
  draw(ctx, J, pal, o) {
    const f = o.fighter;
    o.mouthOpen = f && f.state === 'special' && f.move === 'flameBeam' && f.sp >= 1;
    this.leg(ctx, J.hip, J.kneeB, J.footB, pal, true);
    const cx = (J.footF.x + J.footB.x) / 2;
    ellipse(ctx, cx, -10, 40, 13, 0, pal.scaleB, pal.out);
    ellipse(ctx, cx + 4, -14, 28, 7, 0, pal.scale);
    this.arm(ctx, J.shB, J.elB, J.haB, pal, true, o);
    this.leg(ctx, J.hip, J.kneeF, J.footF, pal, false);
    this.torso(ctx, J, pal, o);
    if (!o.headless) local(ctx, J.head, J.headRot, () => this.head(ctx, pal, o));
    this.arm(ctx, J.shF, J.elF, J.haF, pal, false, o);
  },
  portraitDy: 0.12,
};

// ---------- 🐱 Yogurt, the white Scottish Fold ----------
function catEye(ctx, x, y, r, o, pal) {
  const { expr, blink } = o;
  if (expr === 'hurt' || expr === 'strain' || expr === 'happy' || (blink && expr === 'normal')) {
    eye(ctx, x, y, r * 0.75, o, pal.pupil);
    return;
  }
  circle(ctx, x, y, r, pal.eye, pal.eyeD, r * 0.22);
  ellipse(ctx, x + r * 0.08, y, r * 0.42, r * 0.62, 0, pal.pupil);
  circle(ctx, x - r * 0.3, y - r * 0.35, r * 0.26, 'rgba(255,255,255,0.9)');
  if (expr === 'angry') line(ctx, [x - r * 1.1, y - r * 1.25, x + r, y - r * 0.75], pal.out, r * 0.3);
  if (expr === 'sad') line(ctx, [x - r, y - r * 0.8, x + r, y - r * 1.3], pal.out, r * 0.28);
}

const yogurt = {
  rig: { thigh: 18, shin: 17, torso: 40, neck: 2, headR: 27, uarm: 18, farm: 17, torsoW: 58, shoulderAt: 0.78, shoulderOff: 6 },
  pal: [
    { fur: '#fbfaf6', furB: '#e2ded6', shade: '#e6e0d6', out: '#7d7570', ear: '#f2b6c4', nose: '#f39ab0', eye: '#f2a23a', eyeD: '#b8661a', pupil: '#1a1410', bean: '#f6a8bb', whisker: '#b9b2ab', mouth: '#9a6f72' },
    { fur: '#d3d7de', furB: '#b2b7c0', shade: '#c4c9d1', out: '#5a5f68', ear: '#e9b3c2', nose: '#e58fa6', eye: '#e8c440', eyeD: '#a8841a', pupil: '#1a1410', bean: '#e9a0b4', whisker: '#8d939c', mouth: '#7a5f66' },
  ],
  leg(ctx, hip, knee, foot, pal, back) {
    const c = back ? pal.furB : pal.fur;
    capsule(ctx, hip, knee, 21, c, pal.out);
    capsule(ctx, knee, foot, 18, c, pal.out);
    ellipse(ctx, foot.x + 5, foot.y - 6, 13, 8, 0, c, pal.out);
  },
  arm(ctx, sh, el, ha, pal, back) {
    const c = back ? pal.furB : pal.fur;
    capsule(ctx, sh, el, 17, c, pal.out);
    capsule(ctx, el, ha, 16, c, pal.out);
    circle(ctx, ha.x, ha.y, 10, c, pal.out);
    if (!back) {
      // pink toe beans
      const d = dir(el, ha);
      const n = { x: -d.y, y: d.x };
      circle(ctx, ha.x + d.x * 1.5, ha.y + d.y * 1.5, 3.6, pal.bean);
      for (const s of [-1, 0, 1]) circle(ctx, ha.x + d.x * 6.5 + n.x * 4.5 * s, ha.y + d.y * 6.5 + n.y * 4.5 * s, 1.9, pal.bean);
    }
  },
  torso(ctx, J, pal) {
    const R = this.rig;
    local(ctx, J.hip, J.lean, () => {
      ellipse(ctx, 0, -R.torso / 2 + 2, R.torsoW / 2, R.torso / 2 + 14, 0, pal.fur, pal.out);
      ctx.strokeStyle = pal.shade;
      ctx.lineWidth = 2;
      for (const [x, y] of [[10, -R.torso + 8], [16, -R.torso + 16], [8, -R.torso + 20]]) {
        ctx.beginPath();
        ctx.arc(x, y, 6, 0.2 * Math.PI, 0.9 * Math.PI);
        ctx.stroke();
      }
    });
  },
  tail(ctx, J, pal, o) {
    const sway = Math.sin(o.time * 2.4) * 8;
    const h = J.hip;
    ctx.beginPath();
    ctx.moveTo(h.x - 14, h.y - 6);
    ctx.bezierCurveTo(h.x - 50, h.y + 4, h.x - 62 + sway, h.y - 40, h.x - 44 + sway, h.y - 80);
    ctx.lineCap = 'round';
    ctx.strokeStyle = pal.out;
    ctx.lineWidth = 30;
    ctx.stroke();
    ctx.strokeStyle = pal.fur;
    ctx.lineWidth = 25;
    ctx.stroke();
    circle(ctx, h.x - 44 + sway, h.y - 84, 14, pal.fur, pal.out, 2.5);
    circle(ctx, h.x - 44 + sway, h.y - 84, 12, pal.fur);
  },
  head(ctx, pal, o) {
    const r = this.rig.headR;
    // folded ears, the Scottish Fold signature
    for (const [x, y, s] of [[-r * 0.5, -r * 0.72, 0.85], [r * 0.35, -r * 0.8, 1]]) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(s, s);
      ctx.beginPath();
      ctx.moveTo(-r * 0.32, r * 0.1);
      ctx.quadraticCurveTo(-r * 0.2, -r * 0.38, r * 0.12, -r * 0.3);
      ctx.quadraticCurveTo(r * 0.36, -r * 0.2, r * 0.3, r * 0.12);
      ctx.closePath();
      ctx.fillStyle = pal.fur;
      ctx.fill();
      ctx.strokeStyle = pal.out;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-r * 0.16, -r * 0.04);
      ctx.quadraticCurveTo(r * 0.05, -r * 0.18, r * 0.2, -r * 0.02);
      ctx.strokeStyle = pal.ear;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }
    // cheek fluff poking out from a round, wide face
    circle(ctx, -r * 0.85, r * 0.45, r * 0.26, pal.fur, pal.out, 2.5);
    circle(ctx, r * 0.9, r * 0.45, r * 0.26, pal.fur, pal.out, 2.5);
    ellipse(ctx, 0, 0, r * 1.08, r * 0.95, 0, pal.fur, pal.out);
    catEye(ctx, r * 0.45, -r * 0.02, r * 0.21, o, pal);
    catEye(ctx, -r * 0.03, -r * 0.04, r * 0.18, o, pal);
    ctx.beginPath();
    ctx.moveTo(r * 0.58, r * 0.2);
    ctx.lineTo(r * 0.75, r * 0.2);
    ctx.lineTo(r * 0.665, r * 0.31);
    ctx.closePath();
    ctx.fillStyle = pal.nose;
    ctx.fill();
    if (o.expr === 'normal' || o.expr === 'happy') {
      ctx.beginPath();
      ctx.arc(r * 0.6, r * 0.33, r * 0.07, 0, Math.PI);
      ctx.arc(r * 0.73, r * 0.33, r * 0.07, 0, Math.PI);
      ctx.strokeStyle = pal.mouth;
      ctx.lineWidth = 1.8;
      ctx.stroke();
    } else {
      mouth(ctx, r * 0.66, r * 0.42, r * 0.22, o, pal.mouth, '#c45a6a');
    }
    for (const [y0, y1] of [[0.3, 0.2], [0.36, 0.38], [0.42, 0.55]]) line(ctx, [r * 0.85, r * y0, r * 1.45, r * y1], pal.whisker, 1.3);
  },
  // Rolled up into a ball of fluff for the special.
  ball(ctx, pal, o) {
    const f = o.fighter;
    const R = 36;
    ctx.save();
    ctx.translate(0, -R);
    ctx.rotate((f.x * f.facing) / R);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      circle(ctx, Math.cos(a) * R * 0.9, Math.sin(a) * R * 0.9, 9, pal.fur, pal.out, 2.5);
    }
    circle(ctx, 0, 0, R * 0.92, pal.fur);
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.6, 0.3, 2.7);
    ctx.strokeStyle = pal.shade;
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.stroke();
    line(ctx, [R * 0.12, -R * 0.3, R * 0.26, -R * 0.2, R * 0.12, -R * 0.1], pal.pupil, 2.5);
    line(ctx, [R * 0.44, -R * 0.3, R * 0.3, -R * 0.2, R * 0.44, -R * 0.1], pal.pupil, 2.5);
    circle(ctx, R * 0.28, R * 0.02, 3, pal.nose);
    circle(ctx, -R * 0.1, -R * 0.62, 6, pal.ear);
    ctx.restore();
  },
  draw(ctx, J, pal, o) {
    const f = o.fighter;
    if (f && f.state === 'special' && f.move === 'fluffRoll' && (f.sp === 1 || f.sp === 2 || (f.sp === 0 && f.sf >= 6))) {
      this.ball(ctx, pal, o);
      return;
    }
    this.tail(ctx, J, pal, o);
    drawBody(ctx, J, pal, o, this);
  },
  portraitDy: 0.06,
};

// Hit flash: solid colours go white, translucent ones (auras, blush) stay.
function flashPalette(p) {
  const out = {};
  for (const k in p) out[k] = p[k].startsWith('rgba') ? p[k] : '#ffffff';
  out.out = '#ff8f8f';
  return out;
}

export const DOLLS = { teddy, robo, hunkrabok, siakabal, muaythai, maenak, naga, yogurt };
for (const d of Object.values(DOLLS)) d.flashPal = flashPalette(d.pal[0]);

// Silhouette used for "coming soon" dolls.
export function drawSilhouette(ctx, x, y, s, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  circle(ctx, 0, -120, 28, color);
  roundRect(ctx, -28, -92, 56, 60, 16, color);
  capsule(ctx, { x: -14, y: -36 }, { x: -18, y: 0 }, 18, color);
  capsule(ctx, { x: 14, y: -36 }, { x: 18, y: 0 }, 18, color);
  capsule(ctx, { x: -28, y: -84 }, { x: -44, y: -48 }, 16, color);
  capsule(ctx, { x: 28, y: -84 }, { x: 44, y: -48 }, 16, color);
  ctx.restore();
}
