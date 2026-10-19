// Special moves. Each one drives the fighter while state === 'special'.
// update() returns true when the move is finished. f.sp is the sub-phase,
// f.sf counts frames inside the current sub-phase.

export const SPECIALS = {
  // Teddy: leap at the opponent, belly-flop, ground shockwave on landing.
  bearSlam: {
    update(f, opp, m, ev) {
      if (f.sp === 0) {
        if (f.sf >= 12) {
          const dist = Math.abs(opp.x - f.x);
          f.vx = f.facing * Math.min(9, Math.max(2.5, dist / 30));
          f.vy = -13;
          f.air = true;
          f.sp = 1;
          f.sf = 0;
          ev.push({ type: 'leap', idx: f.idx });
        }
        return false;
      }
      if (f.sp === 1) {
        if (!f.air) {
          f.sp = 2;
          f.sf = 0;
          f.vx = 0;
          ev.push({ type: 'slam', idx: f.idx, x: f.x });
        }
        return false;
      }
      return f.sf >= 26;
    },
    hitbox(f) {
      if (f.hits > 0) return null;
      const base = { dmg: 140, knockdown: true, blockstun: 16, push: 9, energy: 0, hitstop: 10 };
      if (f.sp === 1 && f.vy > -4) return { ...base, box: { x: -42, y: -150, w: 84, h: 150 } };
      if (f.sp === 2 && f.sf < 8) return { ...base, groundOnly: true, box: { x: -115, y: -34, w: 230, h: 34 } };
      return null;
    },
  },

  // Robo: fire the forearm across the screen.
  rocketPunch: {
    canStart(f, m) {
      return !m.proj.some((p) => p.owner === f.idx);
    },
    update(f, opp, m, ev) {
      if (f.sf === 12) {
        m.proj.push({
          owner: f.idx, kind: 'rocket', t: 0, life: 140,
          x: f.x + f.facing * 52, y: f.y - 118, vx: f.facing * 10.5, w: 52, h: 28,
          dmg: 115, knockdown: true, hitstun: 0, blockstun: 16, push: 8, energy: 0, hitstop: 9,
        });
        ev.push({ type: 'shoot', idx: f.idx, kind: 'rocket' });
      }
      return f.sf >= 36;
    },
  },

  // Hun Krabok: spinning dash, four stick hits, the last one knocks down.
  cyclone: {
    update(f, opp, m, ev) {
      if (f.sf < 8) {
        f.vx = 0;
        return false;
      }
      if (f.sf === 8) ev.push({ type: 'whoosh', idx: f.idx });
      if (f.sf < 38) {
        f.vx = f.facing * 8.5;
        return false;
      }
      f.vx *= 0.6;
      return f.sf >= 56;
    },
    hitbox(f) {
      if (f.sf < 8 || f.sf >= 38) return null;
      const t = f.sf - 8;
      const win = Math.floor(t / 7);
      if (t % 7 >= 3 || f.hw >= win || win > 3) return null;
      return {
        box: { x: -58, y: -150, w: 116, h: 140 },
        dmg: 38, hitstun: 24, blockstun: 9, push: 3, energy: 0, hitstop: 4,
        knockdown: win === 3, win,
      };
    },
  },

  // Sia Kabal: slow cursed orb that also slows the victim down.
  curse: {
    canStart(f, m) {
      return !m.proj.some((p) => p.owner === f.idx);
    },
    update(f, opp, m, ev) {
      if (f.sf === 16) {
        m.proj.push({
          owner: f.idx, kind: 'curse', t: 0, life: 170,
          x: f.x + f.facing * 48, y: f.y - 96, vx: f.facing * 6.5, w: 46, h: 46,
          dmg: 90, hitstun: 26, blockstun: 16, push: 6, energy: 0, hitstop: 7, slow: 180,
        });
        ev.push({ type: 'shoot', idx: f.idx, kind: 'curse' });
      }
      return f.sf >= 38;
    },
  },
};
