// Gameplay data for each doll. Names and descriptions live in i18n.js,
// drawing lives in render/dolls.js — this file stays DOM-free for the sim.

export const CHARACTERS = {
  teddy: {
    id: 'teddy',
    hp: 1000,
    walk: 3.6,
    jumpV: -14.5,
    jumpX: 3.8,
    body: { w: 74, h: 150 },
    material: 'plush',
    dmgMul: 1.15,
    reach: 4,
    frameAdj: 1,
    special: 'bearSlam',
    specialRange: 260,
    ui: { power: 5, speed: 3, defense: 4, range: 2 },
  },
  robo: {
    id: 'robo',
    hp: 950,
    walk: 3.5,
    jumpV: -15,
    jumpX: 3.8,
    body: { w: 66, h: 160 },
    material: 'metal',
    dmgMul: 1.0,
    reach: 8,
    frameAdj: 0,
    special: 'rocketPunch',
    specialRange: 900,
    ui: { power: 3, speed: 3, defense: 3, range: 5 },
  },
  hunkrabok: {
    id: 'hunkrabok',
    hp: 900,
    walk: 4.6,
    jumpV: -16,
    jumpX: 4.6,
    body: { w: 60, h: 156 },
    material: 'wood',
    dmgMul: 0.85,
    reach: 14,
    frameAdj: -1,
    special: 'cyclone',
    specialRange: 230,
    ui: { power: 2, speed: 5, defense: 2, range: 3 },
  },
  siakabal: {
    id: 'siakabal',
    hp: 1150,
    walk: 2.8,
    jumpV: -13.5,
    jumpX: 3.2,
    body: { w: 80, h: 140 },
    material: 'clay',
    dmgMul: 1.1,
    reach: 0,
    frameAdj: 1,
    special: 'curse',
    specialRange: 900,
    ui: { power: 4, speed: 1, defense: 5, range: 4 },
  },
};

export const ROSTER = ['teddy', 'robo', 'hunkrabok', 'siakabal'];

// Phase 2 dolls, shown as "coming soon" on the select screen.
export const COMING_SOON = ['voodoo', 'kokeshi', 'chaowang', 'nangkwak'];

export const STAGES = ['toyroom', 'sala'];
