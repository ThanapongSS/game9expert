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

function flashPalette(p) {
  const out = {};
  for (const k in p) out[k] = '#ffffff';
  out.out = '#ff8f8f';
  return out;
}

export const DOLLS = { teddy, robo, hunkrabok, siakabal };
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
