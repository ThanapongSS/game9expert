# 🧸 ศึกตุ๊กตา · Doll Fighters

เกมต่อสู้ 2D บนมือถือ (Web/PWA) — ตุ๊กตาสากลปะทะตุ๊กตาไทย เล่นผ่าน browser ได้ทันที กด "Add to Home Screen" ให้เป็นแอปได้

## 🎮 เล่นยังไง

| โหมด | รายละเอียด |
|---|---|
| 🥊 สู้ด่วน (Quick Match) | เลือกตัวเรา + คู่ต่อสู้ + ความยาก (ง่าย/ปานกลาง/ยาก) + ฉาก |
| 🏆 อาร์เคด (Arcade) | ไล่สู้อีก 3 ตัว ยากขึ้นเรื่อยๆ ชนะครบได้ถ้วย 🏆 ติดบนการ์ดตัวละคร |
| 🌐 เล่นกับเพื่อน (Online) | สร้างห้อง → ได้รหัส 5 ตัว → ส่งรหัส/ลิงก์ให้เพื่อน → เพื่อนกด "เข้าห้อง" |

**กติกา:** 1 ยก 90 วินาที · HP หมด = K.O. · หมดเวลา ใครเลือดเหลือ (%) มากกว่าชนะ

**ปุ่มบนจอ:** ซ้าย = D-pad (◀ ▶ เดิน, ▲ กระโดด — ปัดเฉียงขึ้นเพื่อกระโดดไปข้างหน้า) · ขวา = 👊 ต่อย · 🦶 เตะ · 🛡️ กดค้างบล็อก · ⭐ ท่าไม้ตาย (ใช้ได้เมื่อเกจเต็ม)

**คีย์บอร์ด (ไว้เทสต์บนคอม):** A/D เดิน · W กระโดด · J ต่อย · K เตะ · L บล็อก · I ท่าไม้ตาย · Esc พัก

## 🧸 ตัวละคร (v1)

| ตัว | สาย | HP | ท่าไม้ตาย |
|---|---|---|---|
| 🧸 เท็ดดี้ (หมีผ้า) | หมัดหนัก | 1000 | **หมีทุ่มพสุธา** — กระโดดทับ + คลื่นกระแทกพื้น |
| 🤖 โรโบ (หุ่นยนต์ของเล่น) | ยิงไกล | 950 | **จรวดหมัดพิฆาต** — ยิงหมัดข้ามจอ |
| 🎭 หุ่นกระบอก | เร็ว | 900 | **ไม้กระบอกพายุหมุน** — พุ่งหมุนตี 4 ฮิต |
| 🗿 เสียกบาล (ตุ๊กตาดินเผา) | ถึก/สาป | 1150 | **สาปส่งเคราะห์** — ลูกพลังสาป ทำให้ช้าลง 3 วิ (แพ้แล้วหัวหลุด 😄) |

ตัวละครวาดด้วยโค้ดทั้งหมด (ไม่มีไฟล์ภาพ) แบบหุ่นแยกชิ้น ส่วนเสียงและเพลงสังเคราะห์ด้วย Web Audio

**Phase 2 (เร็วๆ นี้):** วูดู · โคเคชิ · ตุ๊กตาชาววัง · นางกวัก

## 🚀 Deploy ขึ้น GitHub Pages (ทำครั้งเดียว)

1. ไปที่ repo บน GitHub → **Settings** → **Pages**
2. **Source:** `Deploy from a branch`
3. **Branch:** เลือก branch ที่มีเกม (เช่น `main` หลัง merge หรือ `claude/mobile-fighting-game-uc66hf`) โฟลเดอร์ `/ (root)` → **Save**
4. รอ 1–2 นาที จะได้ลิงก์ `https://thanapongss.github.io/game9expert/`
5. เปิดลิงก์บนมือถือ → แตะ "แตะเพื่อเริ่ม" → (แนะนำ) เมนู Share/⋮ → **Add to Home Screen**

ไม่ต้อง build ไม่ต้องลง Node — เป็นไฟล์ static ล้วน

## 🌐 เรื่อง Online (อ่านก่อนเล่นกับเพื่อน)

- ใช้ **WebRTC แบบ P2P** ผ่าน [PeerJS](https://peerjs.com) (signalling server ฟรีของ PeerJS) — ไม่มีค่าใช้จ่าย ไม่ต้องมี server ของเราเอง
- เครื่อง **เจ้าของห้อง (host)** เป็นคนคำนวณเกม อีกฝั่งส่งปุ่มมา และรับภาพสถานะ 30 ครั้ง/วินาที
- ส่วนใหญ่เชื่อมต่อได้ แต่บางเครือข่าย 4G/5G (CGNAT) อาจต่อไม่ติดเพราะยังไม่มี TURN server → ลองใช้ Wi-Fi
- วิธีเทสต์จริง: เปิดลิงก์บนมือถือ 2 เครื่อง → เครื่องแรก "สร้างห้อง" → เครื่องที่สอง "เข้าห้อง" ใส่รหัส (หรือกดลิงก์ที่แชร์มา)

## 🛠 สำหรับนักพัฒนา

```bash
npm run serve          # เปิด http://localhost:8080
npm test               # unit tests: sim, AI, netcode (node --test, ไม่มี dependency)
npm run smoke          # E2E บน Chromium ขนาดมือถือ (ต้องมี Playwright)
node tests/online-smoke.mjs   # E2E online 2 หน้าจอ (จำลอง PeerJS ด้วย BroadcastChannel)
node tools/make-icons.mjs     # สร้างไอคอนใหม่จาก tools/icon.html
```

หน้า preview สำหรับปรับงานภาพ: `tools/pose-sheet.html` (ท่าทางทุกตัว), `tools/scene.html?stage=sala` (ฉาก + HUD)

### โครงสร้าง

```
index.html · css/style.css · manifest.webmanifest · sw.js (offline cache)
src/
  config.js            ค่าคงที่ (ขนาดจอ 960×540, แรงโน้มถ่วง, เวลา 90 วิ)
  characters/          ค่าพลังตัวละคร
  sim/                 game logic ล้วน (ไม่มี DOM) — fighter, moves, specials, combat, match
  ai/                  CPU 3 ระดับ
  render/              วาดตุ๊กตาแบบหุ่นกระบอก, ฉาก, HUD, effects
  input/               คีย์บอร์ด + ปุ่มสัมผัส
  audio/               SFX + เพลง chiptune
  net/                 PeerJS transport, host/guest sync
  modes/               sessions (CPU / online), online lobby
  ui/                  หน้าเมนูทั้งหมด (DOM)
  i18n.js              ภาษาไทย / English
lib/peerjs.min.js      PeerJS 1.5.5 (MIT)
tests/                 unit + E2E
```

### ปรับบาลานซ์

ค่าพลังอยู่ที่ `src/characters/index.js` (HP, ความเร็ว, ดาเมจ) และ `src/sim/moves.js` / `src/sim/specials.js` (frame data) — ผลจาก CPU vs CPU 300 แมตช์: ทุกตัวชนะอยู่ในช่วง 45–57%
