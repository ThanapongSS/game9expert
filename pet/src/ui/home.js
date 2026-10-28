// Home: the pet in its area with needs, growth, and care actions.
// Tap the pet to pat it, tap poop to scoop it, scrub with a finger to bathe.
import { ITEMS } from '../data/items.js';
import { SPECIES, BRANCHES, formName } from '../data/species.js';
import { areaById } from '../data/areas.js';
import { LEVEL_EXP, LEVEL_HOURS, HOUR, levelBlock, mood as petMood, vaccineAvailable, lowNeeds } from '../sim/pet.js';
import { isAsleep, timeOfDay, isNight } from '../sim/time.js';
import * as care from '../sim/care.js';
import { count } from '../sim/economy.js';
import { drawScene } from '../render/scenes.js';
import { drawPet, petAnchor } from '../render/pets.js';
import { roundRect } from '../../../src/render/draw.js';
import { sfx } from '../audio.js';
import { h, btn, bar, sheet, toast, fmtDuration } from './ui.js';
import { missionsSheet, albumModal, settingsModal, hatchOverlay } from './overlays.js';

const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
const POOP_SPOTS = [
  [-1.05, 0.02],
  [1.0, -0.04],
  [-0.62, 0.12],
];

const VOICE_LINE = {
  yogurt: ['เมี๊ยว~', 'ขอลูบหน่อย~', 'ปลาทู! ปลาทู!'],
  phidam: ['เมี้ยว…', 'หึ่ม', 'ปลาหมึกย่างอยู่ไหน?'],
  pongfu: ['โฮ่ง! โฮ่ง!', 'ไปเดินเล่นกัน!', 'กระดูก~'],
  fuji: ['ฟูจิ! ฟูจิ!', 'สวัสดีค่า~', 'หนูเก่งที่สุด!'],
  chako: ['มอออ~', 'หญ้าอร่อย', 'ใจเย็นๆ นะ'],
};

// What the pet wants most, as a speech line.
function wishLine(pet, asleep, rng) {
  const n = pet.needs;
  if (asleep) return 'ZZZ…';
  if (pet.sick) return 'ไม่สบาย… 🤒';
  if (pet.hpPct < 0.3) return 'เจ็บจัง… 🏥';
  if (n.hunger < 30) return 'หิวจัง~ 🍚';
  if (n.thirst < 30) return 'หิวน้ำ 💧';
  if (pet.poop > 0 && rng() < 0.5) return 'เก็บอึให้หน่อย 💩';
  if (n.clean < 35) return 'อยากอาบน้ำ 🛁';
  if (n.energy < 20) return 'ง่วงแล้ว… 💤';
  if (vaccineAvailable(pet) && rng() < 0.5) return 'ไปหาหมอฉีดวัคซีนกัน 💉';
  if (n.fun < 35) return 'เบื่อจัง เล่นกันไหม 🎾';
  const lines = VOICE_LINE[pet.species];
  return rng() < 0.5 ? lines[Math.floor(rng() * lines.length)] : ['รักนะ 💕', 'วันนี้สนุกจัง!', 'ไปผจญภัยกัน!', 'เก่งมาก!'][Math.floor(rng() * 4)];
}

export function homeScreen(app) {
  const S = app.S;
  let overrideMood = null;
  let overrideUntil = 0;
  let parts = [];
  let say = null; // { text, until }
  let nextTalk = 4;
  let bath = null; // { progress, bubbles: [] }
  let geom = { x: 0, y: 0, size: 100 };
  let tNow = 0;
  let rem = 16;
  let remAt = 0;

  const setMood = (m, secs) => {
    overrideMood = m;
    overrideUntil = tNow + secs;
  };
  const talk = (text, secs = 3) => {
    say = { text, until: tNow + secs };
  };
  const emoji = (e, x, y, opts = {}) => parts.push({ e, x, y, vx: opts.vx || 0, vy: opts.vy ?? -40, life: opts.life || 1.4, age: 0, size: opts.size || 28, grav: opts.grav || 0, tx: opts.tx, ty: opts.ty });

  // ---------------- HUD ----------------
  const hud = h('div', { class: 'hud' });
  const sideBtns = h('div', { class: 'row', style: 'gap:0.4rem' });
  const actionbar = h('div', { class: 'actionbar' });
  const bathBar = h('div', { class: 'panel center', style: 'align-self:center;margin-top:auto;display:none;min-width:min(90%,24rem)' });
  const layer = h('div', { class: 'layer' }, hud, bathBar, actionbar);

  function renderHud() {
    const pet = app.pet();
    if (!pet) return;
    const now = app.now();
    const asleep = isAsleep(pet, now);
    const blockInfo = levelBlock(pet);
    const lv = pet.level;
    const expLo = LEVEL_EXP[lv];
    const expHi = LEVEL_EXP[Math.min(10, lv + 1)];
    const expPct = lv >= 10 ? 100 : ((pet.exp - expLo) / Math.max(1, expHi - expLo)) * 100;
    const ageLo = LEVEL_HOURS[lv] * HOUR;
    const ageHi = LEVEL_HOURS[Math.min(10, lv + 1)] * HOUR;
    const agePct = lv >= 10 ? 100 : ((pet.ageMs + pet.boostMs - ageLo) / Math.max(1, ageHi - ageLo)) * 100;
    let growth;
    if (!blockInfo) growth = h('span', { class: 'chip good' }, '✨ กำลังโต!');
    else if (blockInfo.kind === 'max') growth = h('span', { class: 'chip good' }, '👑 โตเต็มที่แล้ว');
    else if (blockInfo.kind === 'vaccine') growth = h('span', { class: 'chip warn' }, `💉 ต้องฉีดวัคซีนเข็ม ${blockInfo.dose} ก่อนโตต่อ`);
    else if (blockInfo.kind === 'exp') growth = h('span', { class: 'chip' }, `⭐ ต้องการ EXP อีก ${blockInfo.need}`);
    else growth = h('span', { class: 'chip' }, `⏳ โตได้ในอีก ${fmtDuration(blockInfo.ms)}`);
    const chips = [growth];
    if (pet.sick) chips.push(h('span', { class: 'chip bad' }, '🤒 ป่วย'));
    if (asleep) chips.push(h('span', { class: 'chip' }, '💤 หลับอยู่'));
    else if (lowNeeds(pet)) chips.push(h('span', { class: 'chip warn' }, '😣 อ่อนแรง'));
    if (vaccineAvailable(pet) && blockInfo?.kind !== 'vaccine') chips.push(h('span', { class: 'chip warn' }, '💉 ฉีดวัคซีนได้แล้ว'));
    const n = pet.needs;
    const need = (icon, label, v) => h('div', { class: 'need', title: label }, h('span', {}, icon), bar(v));
    const br = pet.branch ? BRANCHES[pet.branch] : null;
    hud.replaceChildren(
      h(
        'div',
        { class: 'card who' },
        h('div', { class: 'row', style: 'gap:0.4rem;flex-wrap:nowrap' }, h('span', { class: 'chip', style: 'background:#ffefe0' }, `Lv${lv}`), h('div', { class: 'who-name grow' }, pet.name), br ? h('span', { class: 'chip' }, `${br.icon} ${br.name}`) : null),
        h('div', { class: 'muted' }, formName(pet.species, lv, pet.branch)),
        h('div', { class: 'row', style: 'gap:0.4rem;margin-top:0.2rem;flex-wrap:nowrap' }, h('span', { class: 'muted' }, '⭐'), bar(expPct, 'exp'), h('span', { class: 'muted' }, '⏳'), bar(agePct, 'age')),
        h('div', { class: 'needs' }, need('🍚', 'อิ่ม', n.hunger), need('💧', 'น้ำ', n.thirst), need('🛁', 'สะอาด', n.clean), need('🎈', 'สนุก', n.fun), need('⚡', 'พลังงาน', n.energy), need('❤️', 'พลังชีวิต', pet.hpPct * 100)),
        h('div', { class: 'status' }, chips),
      ),
      h(
        'div',
        { class: 'money' },
        h('div', { class: 'card row', style: 'gap:0.8rem;font-weight:600;font-size:1.1rem' }, h('span', {}, `🪙 ${S.coins}`), h('span', {}, `💎 ${S.crystals}`)),
        sideBtns,
      ),
    );
    const todo = (S.daily.missions || []).filter((m) => !m.done).length;
    sideBtns.replaceChildren(
      h('div', { class: 'rel' }, btn('📋', () => missionsSheet(app), 'round ghost', { 'aria-label': 'ภารกิจ' }), todo ? h('span', { class: 'badge-dot' }, todo) : null),
      btn('📖', () => albumModal(app), 'round ghost', { 'aria-label': 'สมุดสะสม' }),
      btn('⚙️', () => settingsModal(app), 'round ghost', { 'aria-label': 'ตั้งค่า' }),
      S.eggs > 0 ? h('div', { class: 'rel' }, btn('🥚', () => hatchOverlay(app), 'round lemon wiggle', { 'aria-label': 'ฟักไข่' }), h('span', { class: 'badge-dot' }, S.eggs)) : '',
    );
    renderActions(pet, asleep);
  }

  const act = (e, l, fn, cls = '') => h('button', { class: `act ${cls}`, type: 'button', onclick: () => (sfx.tap(), fn()) }, h('span', { class: 'e' }, e), h('span', { class: 'l' }, l));
  let lastActKey = '';
  function renderActions(pet, asleep) {
    const n = pet.needs;
    const key = [asleep, n.hunger < 30, n.thirst < 30, n.clean < 35, n.fun < 35, pet.poop, !!bath].join();
    if (key === lastActKey) return;
    lastActKey = key;
    if (bath) {
      actionbar.replaceChildren();
      return;
    }
    actionbar.replaceChildren(
      act('🍚', 'อาหาร', () => foodTray('food'), n.hunger < 30 && !asleep ? 'alert' : ''),
      act('💧', 'น้ำ', () => foodTray('drink'), n.thirst < 30 && !asleep ? 'alert' : ''),
      act('🛁', 'อาบน้ำ', startBath, n.clean < 35 && !asleep ? 'alert' : ''),
      act('🎾', 'เล่น', playTray, n.fun < 35 && !asleep ? 'alert' : ''),
      asleep ? act('☀️', 'ปลุก', wake) : act('💤', 'นอน', sleep),
      act('🏘️', 'ไปเมือง', () => app.go('town'), 'go'),
    );
  }

  // ---------------- care actions ----------------
  function foodTray(cat) {
    const pet = app.pet();
    const why = care.blocked(pet, app.now(), 'care');
    if (why) return app.blocked(why);
    const fav = SPECIES[pet.species].fav;
    const ids = Object.keys(ITEMS).filter((id) => ITEMS[id].cat === cat && count(S, id) > 0);
    const desc = (it) =>
      [it.hunger && `อิ่ม +${it.hunger}`, it.thirst && `น้ำ +${it.thirst}`, it.fun && `สนุก +${it.fun}`, it.energy && `พลังงาน +${it.energy}`].filter(Boolean).join(' · ');
    const sh = sheet([
      h('h3', {}, cat === 'food' ? '🍚 เลือกอาหาร' : '💧 เลือกเครื่องดื่ม'),
      ids.length
        ? h(
            'div',
            { class: 'grid wide' },
            ids.map((id) => {
              const it = ITEMS[id];
              const c = count(S, id);
              return h(
                'div',
                { class: 'item-row' },
                h('span', { class: 'e' }, it.icon),
                h('div', { class: 'info' }, h('b', {}, it.name, id === fav ? ' ❤️' : ''), h('span', { class: 'muted' }, `${desc(it)}${c === Infinity ? ' · ฟรี' : ` · มี ${c}`}`)),
                btn('ให้', () => {
                  sh.close();
                  feed(id);
                }, 'small mint'),
              );
            }),
          )
        : h('p', { class: 'muted' }, 'ยังไม่มีของเลย'),
      h('div', { class: 'row end' }, h('span', { class: 'muted grow' }, `ของโปรดของ${pet.name}: ${ITEMS[fav].icon} ${ITEMS[fav].name}`), btn('🛒 ไปร้านค้า', () => (sh.close(), app.go('shop', { tab: cat, back: 'home' })), 'small sky')),
    ]);
  }

  function feed(id) {
    const pet = app.pet();
    const r = care.feed(S, pet, id, app.now());
    if (!app.done(r)) return;
    const it = ITEMS[id];
    it.cat === 'drink' ? sfx.drink() : sfx.eat();
    emoji(it.icon, geom.x - geom.size * 0.6, geom.y - geom.size * 1.4, { vx: 0, vy: 0, tx: geom.head.x, ty: geom.head.y + geom.head.r * 0.4, life: 0.7, size: 40 });
    setMood('eat', 2.2);
    if (r.fav) {
      setTimeout(() => {
        sfx.happy();
        talk('ของโปรด! 😋💕');
        for (let i = 0; i < 4; i++) emoji('💕', geom.head.x + (i - 1.5) * 18, geom.head.y - geom.head.r, { vy: -50 - i * 10, life: 1.4 });
      }, 700);
    }
  }

  function playTray() {
    const pet = app.pet();
    const why = care.blocked(pet, app.now(), 'care');
    if (why) return app.blocked(why);
    const toys = S.toys;
    const sh = sheet([
      h('h3', {}, '🎾 เล่นกับ' + pet.name),
      h(
        'div',
        { class: 'grid wide' },
        h('div', { class: 'item-row' }, h('span', { class: 'e' }, '🤚'), h('div', { class: 'info' }, h('b', {}, 'ลูบหัว'), h('span', { class: 'muted' }, 'แตะที่ตัวสัตว์ได้ตลอดเลย')), btn('ลูบ', () => (sh.close(), patPet()), 'small mint')),
        toys.map((id) =>
          h('div', { class: 'item-row' }, h('span', { class: 'e' }, ITEMS[id].icon), h('div', { class: 'info' }, h('b', {}, ITEMS[id].name), h('span', { class: 'muted' }, 'สนุก +20 · ใช้พลังงาน')), btn('เล่น', () => (sh.close(), playToy(id)), 'small mint')),
        ),
        h('div', { class: 'item-row' }, h('span', { class: 'e' }, '🎡'), h('div', { class: 'info' }, h('b', {}, 'ลานกิจกรรม'), h('span', { class: 'muted' }, 'มินิเกมได้เหรียญ')), btn('ไป', () => (sh.close(), app.go('activities')), 'small sky')),
      ),
      toys.length ? null : h('div', { class: 'row end' }, h('span', { class: 'muted grow' }, 'ซื้อของเล่นได้ที่ร้านค้า'), btn('🛒 ไปร้านค้า', () => (sh.close(), app.go('shop', { tab: 'toy', back: 'home' })), 'small sky')),
    ]);
  }

  function playToy(id) {
    const pet = app.pet();
    if (!app.done(care.play(S, pet, id, app.now()))) return;
    sfx.happy();
    sfx.voice(pet.species);
    setMood('happy', 3);
    for (let i = 0; i < 3; i++) emoji(ITEMS[id].icon, geom.x + geom.size * 0.5, geom.y - 20, { vx: -60 + i * 50, vy: -260, grav: 500, life: 1.4, size: 34 });
  }

  function patPet() {
    const pet = app.pet();
    const now = app.now();
    if (isAsleep(pet, now)) {
      talk('ชู่ว์… หลับอยู่ 💤');
      return;
    }
    const r = care.pat(S, pet, now);
    if (!r.ok) return;
    app.done(r);
    sfx.voice(pet.species);
    setMood('happy', 1.6);
    emoji('💕', geom.head.x + (Math.random() - 0.5) * 30, geom.head.y - geom.head.r, { vy: -70, life: 1.2 });
    if (Math.random() < 0.4) talk(wishLine(pet, false, Math.random));
  }

  function sleep() {
    const pet = app.pet();
    if (!app.done(care.goToBed(pet, app.now()))) return;
    sfx.sleep();
    toast(isNight(app.now()) ? 'ฝันดีนะ 🌙' : `${pet.name}งีบหลับ จะตื่นเองเมื่อพลังงานเต็ม 💤`);
    lastActKey = '';
    renderHud();
  }

  function wake() {
    const pet = app.pet();
    care.wakeUp(pet, app.now());
    sfx.voice(pet.species);
    if (isNight(app.now())) toast('ตื่นมาเล่นได้ 1 ชั่วโมง แล้วจะง่วงอีกนะ 🌙');
    app.save();
    lastActKey = '';
    renderHud();
  }

  // ---------------- bath: scrub to make bubbles ----------------
  function startBath() {
    const pet = app.pet();
    const why = care.blocked(pet, app.now(), 'care');
    if (why) return app.blocked(why);
    if (pet.needs.clean >= 90) return app.blocked('clean');
    bath = { progress: 0, bubbles: [], rinse: 0 };
    bathBar.style.display = '';
    bathBar.replaceChildren(h('b', {}, '🧽 ใช้นิ้วถูตัวให้ฟองเยอะๆ!'), h('div', { style: 'margin:0.4rem 0' }, bar(0, 'age')), btn('ยกเลิก', endBath, 'small ghost back'));
    lastActKey = '';
    renderActions(pet, false);
  }

  function endBath() {
    bath = null;
    bathBar.style.display = 'none';
    lastActKey = '';
    renderHud();
  }

  function scrub(x, y) {
    if (!bath || bath.rinse) return;
    const a = geom;
    const dx = (x - a.body.x) / (a.body.rx * 1.4);
    const dy = (y - a.body.y) / (a.body.ry * 1.6);
    const onHead = Math.hypot(x - a.head.x, y - a.head.y) < a.head.r * 1.2;
    if (dx * dx + dy * dy > 1 && !onHead) return;
    if (bath.lastX !== undefined) bath.progress += Math.min(6, Math.hypot(x - bath.lastX, y - bath.lastY) / (a.size * 0.08));
    bath.lastX = x;
    bath.lastY = y;
    if (bath.bubbles.length < 60 && Math.random() < 0.5) {
      bath.bubbles.push({ x: x - a.x, y: y - a.y, r: 6 + Math.random() * 12, p: Math.random() * 6 });
      sfx.bubble();
    }
    bathBar.querySelector('.bar > i').style.width = `${Math.min(100, bath.progress)}%`;
    if (bath.progress >= 100) {
      bath.rinse = tNow;
      sfx.splash();
      setTimeout(() => {
        const r = care.bath(S, app.pet(), app.now());
        endBath();
        if (app.done(r, 'สะอาดเอี่ยม ✨')) {
          sfx.sparkle();
          setMood('happy', 2);
        }
      }, 1200);
    }
  }

  // ---------------- canvas view ----------------
  const view = {
    draw(ctx, W, H, t, dt) {
      tNow = t;
      const pet = app.pet();
      const now = app.now();
      const s = drawScene(ctx, S.home, W, H, { tod: timeOfDay(now), t });
      if (!pet) return;
      const asleep = isAsleep(pet, now);
      const size = Math.min(W * 0.5, H * 0.34);
      const x = W / 2;
      if (t > remAt) {
        rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
        remAt = t + 1;
      }
      const y = Math.min(s.stage, H - 7.5 * rem); // keep the feet above the action bar
      const anchor = petAnchor(pet, x, y, size);
      geom = { x, y, size, ...anchor };
      // poop
      ctx.font = `${size * 0.2}px ${EMOJI_FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      for (let i = 0; i < pet.poop; i++) {
        const [px, py] = POOP_SPOTS[i];
        ctx.fillText('💩', x + px * size * 0.75, y + py * size * 0.5);
      }
      let m = overrideMood && t < overrideUntil ? overrideMood : petMood(pet, asleep);
      if (bath?.rinse) m = 'happy';
      drawPet(ctx, pet, x, y, size, { mood: m, t, seed: 1 });
      // bath bubbles + rinse water
      if (bath) {
        for (const b of bath.bubbles) {
          const r = b.r * (1 + 0.08 * Math.sin(t * 4 + b.p));
          ctx.fillStyle = 'rgba(255,255,255,0.75)';
          ctx.strokeStyle = 'rgba(150,200,255,0.9)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x + b.x, y + b.y, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        if (bath.rinse) {
          const k = (t - bath.rinse) / 1.2;
          bath.bubbles = bath.bubbles.filter(() => Math.random() > 0.04);
          ctx.fillStyle = 'rgba(120,190,255,0.7)';
          for (let i = 0; i < 30; i++) {
            const dx = ((i * 37) % 100) / 100 - 0.5;
            const dy = ((i * 53 + k * 400) % 120) / 100;
            ctx.fillRect(x + dx * size, y - size * 1.3 + dy * size, 3, 10);
          }
        }
      }
      // particles
      ctx.font = `28px ${EMOJI_FONT}`;
      parts = parts.filter((p) => (p.age += dt) < p.life);
      for (const p of parts) {
        if (p.tx !== undefined) {
          const k = Math.min(1, p.age / p.life);
          p.x += (p.tx - p.x) * k;
          p.y += (p.ty - p.y) * k;
        } else {
          p.vy += p.grav * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
        }
        ctx.globalAlpha = Math.min(1, (p.life - p.age) * 2);
        ctx.font = `${p.size}px ${EMOJI_FONT}`;
        ctx.fillText(p.e, p.x, p.y);
      }
      ctx.globalAlpha = 1;
      // speech bubble
      if (!bath && t > nextTalk) {
        nextTalk = t + 14 + Math.random() * 10;
        talk(wishLine(pet, asleep, Math.random), 3.5);
      }
      if (say && t < say.until) bubble(ctx, anchor.head.x + anchor.head.r * 0.6, anchor.top - 8, say.text);
    },
    down(px, py) {
      if (bath) {
        bath.lastX = undefined;
        scrub(px, py);
        return;
      }
      const pet = app.pet();
      // poop first
      for (let i = pet.poop - 1; i >= 0; i--) {
        const [ox, oy] = POOP_SPOTS[i];
        const cx = geom.x + ox * geom.size * 0.75;
        const cy = geom.y + oy * geom.size * 0.5 - geom.size * 0.07;
        if (Math.hypot(px - cx, py - cy) < geom.size * 0.16) {
          if (app.done(care.scoop(S, pet))) {
            sfx.scoop();
            emoji('✨', cx, cy, { vy: -60, life: 0.9 });
          }
          return;
        }
      }
      const a = geom;
      const dx = (px - a.body.x) / (a.body.rx * 1.3);
      const dy = (py - a.body.y) / (a.body.ry * 1.5);
      if (dx * dx + dy * dy < 1 || Math.hypot(px - a.head.x, py - a.head.y) < a.head.r * 1.25) patPet();
    },
    move(px, py, e) {
      if (bath && e.buttons) scrub(px, py);
    },
  };

  renderHud();
  const area = areaById(S.home);
  return {
    el: layer,
    view,
    music: isNight(app.now()) ? 'night' : 'home',
    refresh: renderHud,
    area,
  };
}

function bubble(ctx, x, y, text) {
  ctx.font = '500 18px Mitr, system-ui, sans-serif';
  const w = ctx.measureText(text).width + 24;
  const bx = Math.max(8, Math.min(x - w / 2, ctx.canvas.clientWidth - w - 8));
  roundRect(ctx, bx, y - 40, w, 34, 14, '#ffffff', '#f0d9bf', 3);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(x - 8, y - 7);
  ctx.lineTo(x, y + 4);
  ctx.lineTo(x + 6, y - 7);
  ctx.fill();
  ctx.fillStyle = '#5a3d2b';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, bx + w / 2, y - 23);
}
