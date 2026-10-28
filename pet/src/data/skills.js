// Battle skills. kind: physical (uses ATK) · magic (uses INT) · shield ·
// heal · sleep · focus · debuff. power is a percentage-ish base value.
// element 'self' means "the user's own element".

export const SKILLS = {
  tackle: { name: 'พุ่งชน', icon: '💥', kind: 'physical', element: 'neutral', power: 40, cost: 0, desc: 'ท่าพื้นฐาน ไม่ใช้ SP' },

  // element skills (known from birth)
  sparkle: { name: 'ประกายแสง', icon: '✨', kind: 'magic', element: 'light', power: 58, cost: 2, desc: 'ยิงแสงระยิบ' },
  shadowBite: { name: 'งับเงามืด', icon: '🌑', kind: 'physical', element: 'shadow', power: 58, cost: 2, desc: 'กัดจากเงามืด' },
  gust: { name: 'ลมหมุน', icon: '🌀', kind: 'magic', element: 'wind', power: 58, cost: 2, desc: 'พายุลมหมุนเล็กๆ' },
  rockThrow: { name: 'ปาหิน', icon: '🪨', kind: 'physical', element: 'earth', power: 58, cost: 2, desc: 'ขว้างก้อนหิน' },
  aquaJet: { name: 'พ่นน้ำ', icon: '💦', kind: 'magic', element: 'water', power: 58, cost: 2, desc: 'พ่นน้ำแรงดันสูง' },

  // branch skills (Lv4)
  powerStrike: { name: 'หมัดพลัง', icon: '👊', kind: 'physical', element: 'neutral', power: 78, cost: 3, desc: 'ท่าสายนักสู้' },
  mindBeam: { name: 'ลำแสงปัญญา', icon: '🔮', kind: 'magic', element: 'neutral', power: 78, cost: 3, desc: 'ท่าสายนักปราชญ์' },
  healingHug: { name: 'กอดฟื้นใจ', icon: '🤗', kind: 'heal', element: 'neutral', power: 35, cost: 3, desc: 'ฟื้นเลือด 35% (สายน่ารัก)' },

  // signatures (Lv6)
  fluffRoll: { name: 'ก้อนขนฟูกลิ้งชน', icon: '☁️', kind: 'physical', element: 'light', power: 92, cost: 4, desc: 'ท่าประจำตัวโยเกิร์ต' },
  shadowClaw: { name: 'กรงเล็บเงา', icon: '🐾', kind: 'physical', element: 'shadow', power: 80, cost: 4, crit: 0.35, desc: 'ท่าประจำตัวพี่ดำ คริติคอลง่าย' },
  stoneWall: { name: 'กำแพงหิน', icon: '🧱', kind: 'shield', element: 'earth', power: 0, cost: 3, turns: 2, desc: 'ท่าประจำตัวผงฟู ลดดาเมจครึ่งหนึ่ง 2 เทิร์น' },
  featherStorm: { name: 'พายุขนนก', icon: '🪶', kind: 'magic', element: 'wind', power: 34, hits: 3, cost: 4, desc: 'ท่าประจำตัวฟูจิ โจมตี 3 ครั้ง' },
  hornCharge: { name: 'ขวิดสะเทือนทุ่ง', icon: '🐃', kind: 'physical', element: 'water', power: 108, cost: 5, desc: 'ท่าประจำตัวชาโค แรงมาก' },

  // ultimates (Lv8)
  finalBurst: { name: 'หมัดสุดท้าย', icon: '🔥', kind: 'physical', element: 'self', power: 125, cost: 6, desc: 'ท่าไม้ตายสายนักสู้' },
  starfall: { name: 'ฝนดาวตก', icon: '🌠', kind: 'magic', element: 'self', power: 125, cost: 6, desc: 'ท่าไม้ตายสายนักปราชญ์' },
  lullaby: { name: 'เพลงกล่อมนิทรา', icon: '🎵', kind: 'sleep', element: 'neutral', power: 20, cost: 5, desc: 'ทำให้คู่ต่อสู้หลับ 1 เทิร์น + ฟื้นเลือด 20%' },

  // learned at school
  guard: { name: 'ตั้งการ์ด', icon: '🛡️', kind: 'shield', element: 'neutral', power: 0, cost: 1, turns: 1, desc: 'ลดดาเมจครึ่งหนึ่ง 1 เทิร์น' },
  focus: { name: 'รวมสมาธิ', icon: '🎯', kind: 'focus', element: 'neutral', power: 0, cost: 1, desc: 'ท่าโจมตีถัดไปแรงขึ้น ×1.5' },
  growl: { name: 'ขู่คำราม', icon: '😾', kind: 'debuff', element: 'neutral', power: 0, cost: 1, turns: 2, desc: 'ลดป้องกันคู่ต่อสู้ 2 เทิร์น' },
  quickJab: { name: 'จิ้มสายฟ้า', icon: '⚡', kind: 'physical', element: 'neutral', power: 32, cost: 1, priority: true, desc: 'ได้ตีก่อนเสมอ' },
  yawn: { name: 'หาวชวนง่วง', icon: '🥱', kind: 'sleep', element: 'neutral', power: 0, cost: 3, chance: 0.5, desc: '50% ให้คู่ต่อสู้หลับ 1 เทิร์น' },

  // enemies only
  bossSlam: { name: 'ทุบสะท้าน', icon: '💢', kind: 'physical', element: 'self', power: 90, cost: 3, desc: 'ท่าของบอส' },
};

export const ELEMENT_SKILL = { light: 'sparkle', shadow: 'shadowBite', wind: 'gust', earth: 'rockThrow', water: 'aquaJet' };
export const BRANCH_SKILL = { fighter: 'powerStrike', sage: 'mindBeam', charm: 'healingHug' };
export const ULTIMATE = { fighter: 'finalBurst', sage: 'starfall', charm: 'lullaby' };
export const SCHOOL_SKILLS = ['guard', 'focus', 'growl', 'quickJab', 'yawn'];
