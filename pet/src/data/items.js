// Shop items. Effects add to needs (0–100). currency 'coin' unless noted.

export const ITEMS = {
  // food
  kibble: { cat: 'food', name: 'ข้าวเม็ด', icon: '🍚', price: 5, hunger: 25 },
  mackerel: { cat: 'food', name: 'ปลาทู', icon: '🐟', price: 12, hunger: 30, fun: 5 },
  squid: { cat: 'food', name: 'ปลาหมึกย่าง', icon: '🦑', price: 14, hunger: 30, fun: 5 },
  bone: { cat: 'food', name: 'กระดูก', icon: '🦴', price: 12, hunger: 25, fun: 8 },
  fruit: { cat: 'food', name: 'ผลไม้รวม', icon: '🍓', price: 12, hunger: 25, thirst: 5 },
  grass: { cat: 'food', name: 'หญ้าสด', icon: '🌿', price: 8, hunger: 30 },
  cake: { cat: 'food', name: 'เค้กวันเกิด', icon: '🍰', price: 30, hunger: 20, fun: 30 },

  // drinks
  water: { cat: 'drink', name: 'น้ำเปล่า', icon: '💧', price: 0, thirst: 30 },
  milk: { cat: 'drink', name: 'นม', icon: '🥛', price: 6, thirst: 30, hunger: 5 },
  coconut: { cat: 'drink', name: 'น้ำมะพร้าว', icon: '🥥', price: 10, thirst: 40, energy: 10 },
  bubbletea: { cat: 'drink', name: 'ชานมไข่มุก', icon: '🧋', price: 15, thirst: 25, fun: 15 },

  // medicine & battle items
  medicine: { cat: 'med', name: 'ยาสามัญ', icon: '💊', price: 20, cure: true },
  potion: { cat: 'med', name: 'ยาฟื้นพลัง', icon: '🧪', price: 15, heal: 0.4, battle: true },
  bigPotion: { cat: 'med', name: 'ยาฟื้นพลังใหญ่', icon: '⚗️', price: 28, heal: 0.8, battle: true },

  // toys (kept forever, make play more fun)
  ball: { cat: 'toy', name: 'ลูกบอล', icon: '⚽', price: 25, toy: true },
  feather: { cat: 'toy', name: 'ไม้ล่อขนนก', icon: '🪶', price: 25, toy: true },

  // special
  growMilk: { cat: 'special', name: 'นมโตไว', icon: '🍼', price: 3, currency: 'crystal', boostMin: 30 },
};

export const SHOP_TABS = [
  { id: 'food', name: 'อาหาร', icon: '🍚' },
  { id: 'drink', name: 'เครื่องดื่ม', icon: '🥤' },
  { id: 'med', name: 'ยา', icon: '💊' },
  { id: 'toy', name: 'ของเล่น', icon: '🧸' },
  { id: 'special', name: 'พิเศษ', icon: '💎' },
];

// Grow milk can shave at most this much off the total growth wait.
export const MAX_BOOST_MIN = 240;
