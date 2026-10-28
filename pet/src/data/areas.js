// Home backgrounds that double as adventure areas. levels = [min, max]
// enemy level; the area unlocks when the pet reaches levels[0].

export const AREAS = [
  {
    id: 'cafe', name: 'ร้านกาแฟ', icon: '☕', levels: [1, 2],
    desc: 'ร้านกาแฟไม้แสนอบอุ่น มีหนูมาขโมยขนมบ่อยๆ',
    foes: [
      { id: 'mouse', name: 'หนูขโมยขนม', emoji: '🐭', element: 'earth' },
      { id: 'roach', name: 'แมลงสาบบิน', emoji: '🪳', element: 'shadow' },
    ],
    boss: { id: 'ratking', name: 'ราชาหนู', emoji: '🐀', element: 'neutral' },
  },
  {
    id: 'field', name: 'ทุ่งนา', icon: '🌾', levels: [2, 4],
    desc: 'นาข้าวเขียวขจี ลมเย็นสบาย ระวังปูนาหนีบ',
    foes: [
      { id: 'crab', name: 'ปูนา', emoji: '🦀', element: 'water' },
      { id: 'frog', name: 'กบนา', emoji: '🐸', element: 'water' },
    ],
    boss: { id: 'rooster', name: 'ไก่ชนเจ้าทุ่ง', emoji: '🐓', element: 'light' },
  },
  {
    id: 'forest', name: 'ป่าไม้', icon: '🌳', levels: [4, 6],
    desc: 'ป่าลึกมีหิ่งห้อยและลำธาร ลิงซนชอบแกล้ง',
    foes: [
      { id: 'monkey', name: 'ลิงจอมซน', emoji: '🐒', element: 'wind' },
      { id: 'snake', name: 'งูเขียวหางไหม้', emoji: '🐍', element: 'shadow' },
    ],
    boss: { id: 'tiger', name: 'เสือโคร่งเจ้าป่า', emoji: '🐯', element: 'earth' },
  },
  {
    id: 'beach', name: 'ชายทะเล', icon: '🏖️', levels: [6, 8],
    desc: 'หาดทรายขาว คลื่นซัด มะพร้าวเอนไกว',
    foes: [
      { id: 'lobster', name: 'กุ้งมังกร', emoji: '🦞', element: 'water' },
      { id: 'gull', name: 'นกนางนวล', emoji: '🐦', element: 'wind' },
    ],
    boss: { id: 'octopus', name: 'ปลาหมึกยักษ์', emoji: '🐙', element: 'water' },
  },
  {
    id: 'palace', name: 'บ้านวัง', icon: '🏯', levels: [8, 10],
    desc: 'เรือนไทยไม้สักขลิบทอง สระบัวสงบ มีผู้พิทักษ์เฝ้าอยู่',
    foes: [
      { id: 'naga', name: 'นาคเฝ้าวัง', emoji: '🐉', element: 'water' },
      { id: 'squirrel', name: 'กระรอกทอง', emoji: '🐿️', element: 'light' },
    ],
    boss: { id: 'giant', name: 'ยักษ์ทวารบาล', emoji: '👹', element: 'shadow' },
  },
];

export const AREA_IDS = AREAS.map((a) => a.id);

export function areaById(id) {
  return AREAS.find((a) => a.id === id);
}

// Wins needed in an area before its boss appears.
export const WINS_FOR_BOSS = 3;

// Arena ladder: rank i (0-based) is a trainer whose pet is level i+1.
export const ARENA_TRAINERS = [
  'น้องมิว', 'พี่ต้น', 'ครูแพร', 'ลุงหมี', 'เจ๊ส้ม', 'โค้ชบอย', 'คุณหญิงแก้ว', 'จ่าเหล็ก', 'อาจารย์ดาว', 'แชมป์ไฟ',
];
