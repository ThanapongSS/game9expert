// The five pets. Elements beat the next one in ELEMENTS (a ring):
// light → shadow → wind → earth → water → light.

export const ELEMENTS = ['light', 'shadow', 'wind', 'earth', 'water'];

export const ELEMENT_INFO = {
  light: { icon: '✨', name: 'แสง', color: '#f5c83a' },
  shadow: { icon: '🌙', name: 'เงา', color: '#7a5cff' },
  wind: { icon: '🌪️', name: 'ลม', color: '#3fc1e8' },
  earth: { icon: '🪨', name: 'ดิน', color: '#b5834a' },
  water: { icon: '💧', name: 'น้ำ', color: '#3a7cf0' },
  neutral: { icon: '⚪', name: 'ปกติ', color: '#9a9aa8' },
};

export const ELEMENT_STRONG = 1.2;
export const ELEMENT_WEAK = 0.85;

export function elementMul(attacker, defender) {
  const i = ELEMENTS.indexOf(attacker);
  const j = ELEMENTS.indexOf(defender);
  if (i < 0 || j < 0) return 1;
  if ((i + 1) % ELEMENTS.length === j) return ELEMENT_STRONG;
  if ((j + 1) % ELEMENTS.length === i) return ELEMENT_WEAK;
  return 1;
}

export const SPECIES = {
  yogurt: {
    id: 'yogurt',
    name: 'โยเกิร์ต',
    kind: 'แมวขาวหูพับ',
    element: 'light',
    base: { hp: 64, atk: 13, def: 10, spd: 15, int: 11 },
    crit: 0.08,
    evade: 0.12,
    fav: 'mackerel',
    signature: 'fluffRoll',
    size: 1,
    desc: 'แมวขาวขนฟู หูพับ ตาสีส้ม เร็วและหลบเก่ง',
  },
  phidam: {
    id: 'phidam',
    name: 'พี่ดำ',
    kind: 'แมวดำ',
    element: 'shadow',
    base: { hp: 62, atk: 14, def: 10, spd: 14, int: 9 },
    crit: 0.22,
    evade: 0.06,
    fav: 'squid',
    signature: 'shadowClaw',
    size: 1,
    desc: 'แมวดำตาเหลือง เงียบแต่โหด ตีคริติคอลบ่อย',
  },
  pongfu: {
    id: 'pongfu',
    name: 'ผงฟู',
    kind: 'หมาขาวแถบดำ',
    element: 'earth',
    base: { hp: 72, atk: 12, def: 14, spd: 8, int: 8 },
    crit: 0.06,
    evade: 0.04,
    fav: 'bone',
    signature: 'stoneWall',
    size: 1.05,
    desc: 'หมาขาวมีแถบดำพาดหลัง ใจดี อึดและปกป้องเพื่อน',
  },
  fuji: {
    id: 'fuji',
    name: 'ฟูจิ',
    kind: 'นกแก้วฟ้า-เหลือง',
    element: 'wind',
    base: { hp: 58, atk: 8, def: 10, spd: 13, int: 15 },
    crit: 0.08,
    evade: 0.1,
    fav: 'fruit',
    signature: 'featherStorm',
    size: 0.92,
    desc: 'นกแก้วสีฟ้าอกเหลือง ฉลาด ชอบพูดเลียนเสียง ใช้เวทลม',
  },
  chako: {
    id: 'chako',
    name: 'ชาโค',
    kind: 'ควายดำเขายาว',
    element: 'water',
    base: { hp: 80, atk: 14, def: 12, spd: 6, int: 7 },
    crit: 0.06,
    evade: 0.02,
    fav: 'grass',
    signature: 'hornCharge',
    size: 1.18,
    desc: 'ควายดำตัวใหญ่ เขายาว ใจเย็น แต่แรงที่สุด',
  },
};

export const SPECIES_IDS = ['yogurt', 'phidam', 'pongfu', 'fuji', 'chako'];

export const BRANCHES = {
  fighter: { icon: '⚔️', name: 'นักสู้' },
  sage: { icon: '📚', name: 'นักปราชญ์' },
  charm: { icon: '💖', name: 'น่ารัก' },
};

const TIER1 = { fighter: 'จอมหมัด', sage: 'นักปราชญ์', charm: 'ไอดอล' };
const TIER2 = { fighter: 'อัศวิน', sage: 'จอมเวท', charm: 'เจ้าหญิง' };

// Display name for a pet's current form.
export function formName(species, level, branch) {
  const n = SPECIES[species].name;
  if (level < 4 || !branch) return level < 2 ? `ลูก${n}` : n;
  const title = level < 8 ? TIER1[branch] : TIER2[branch];
  const base = branch === 'charm' && level >= 8 ? `${title}${n}` : `${n}${title}`;
  return level >= 10 ? `${base} (ตำนาน)` : base;
}

// Collection key: one entry per visual form.
export function formId(species, level, branch) {
  if (level < 4 || !branch) return `${species}-baby`;
  return `${species}-${level < 8 ? 1 : 2}-${branch}`;
}
