// The town and its buildings. Each export is a screen for app.go().
import { ITEMS, SHOP_TABS, MAX_BOOST_MIN } from '../data/items.js';
import { SKILLS, SCHOOL_SKILLS } from '../data/skills.js';
import { SPECIES, ELEMENT_INFO, formName } from '../data/species.js';
import { AREAS, ARENA_TRAINERS, WINS_FOR_BOSS } from '../data/areas.js';
import { petStats, vaccineAvailable, toggleEquip, trainCap, SCHOOL_LEVEL, VACCINE_LEVELS, MAX_UPGRADE, MAX_EQUIP, STAT_KEYS } from '../sim/pet.js';
import { MINUTE, timeOfDay, isAsleep } from '../sim/time.js';
import * as care from '../sim/care.js';
import { buy, count, upgrade, upgradeCost, currencyOf } from '../sim/economy.js';
import { makeFoe, makeTrainer, makeRng } from '../sim/battle.js';
import { encodePet, decodePet, friendFighter, switchPet } from '../state.js';
import { drawScene } from '../render/scenes.js';
import { drawPet } from '../render/pets.js';
import { sfx } from '../audio.js';
import { h, btn, titleRow, modal, toast, petCanvas, bar } from './ui.js';
import { hatchOverlay } from './overlays.js';
import { STAT_INFO } from '../minigames/training.js';

const STAT_NAME = { hp: '❤️ HP', atk: '⚔️ ATK', def: '🛡️ DEF', spd: '👟 SPD', int: '📚 INT' };
const KIND_NAME = { physical: 'กายภาพ', magic: 'เวทมนตร์', shield: 'โล่', heal: 'ฟื้นฟู', sleep: 'ทำให้หลับ', focus: 'เพิ่มพลัง', debuff: 'ลดป้องกัน' };

// The home area with the pet, softly in the background of menus.
export function backdrop(app) {
  return {
    draw(ctx, W, H, t) {
      const pet = app.pet();
      const s = drawScene(ctx, app.S.home, W, H, { tod: timeOfDay(app.now()), t });
      if (pet) drawPet(ctx, pet, W / 2, s.stage, Math.min(W * 0.5, H * 0.34), { t, mood: isAsleep(pet, app.now()) ? 'sleep' : 'idle' });
    },
  };
}

function money(S) {
  return h('div', { class: 'row', style: 'gap:0.4rem' }, h('span', { class: 'chip' }, `🪙 ${S.coins}`), h('span', { class: 'chip' }, `💎 ${S.crystals}`));
}

function screen(app, title, back, body, extra) {
  return h('div', { class: 'screen' }, titleRow(title, () => app.go(back), extra || money(app.S)), body);
}

// Run a pet activity only if the pet is able to.
function guarded(app, what, fn) {
  const why = care.blocked(app.pet(), app.now(), what);
  if (why) return app.blocked(why);
  fn();
}

function rewardLines(r) {
  const parts = [];
  if (r.coins) parts.push(`+${r.coins}🪙`);
  if (r.exp) parts.push(`+${r.exp}⭐`);
  if (r.crystals) parts.push(`+${r.crystals}💎`);
  return parts.length ? [parts.join('  ')] : [];
}

export function skillLine(id) {
  const s = SKILLS[id];
  const el = ELEMENT_INFO[s.element === 'self' ? 'neutral' : s.element];
  const bits = [KIND_NAME[s.kind]];
  if (s.power && (s.kind === 'physical' || s.kind === 'magic')) bits.push(`พลัง ${s.power}${s.hits ? `×${s.hits}` : ''}`);
  bits.push(`SP ${s.cost}`);
  return { title: `${s.icon} ${s.name}`, sub: `${s.element === 'self' ? '🌟 ธาตุตัวเอง' : `${el.icon} ${el.name}`} · ${bits.join(' · ')}`, desc: s.desc };
}

// ---------------- town ----------------

export function townScreen(app) {
  const S = app.S;
  const pet = app.pet();
  const tile = (emoji, name, desc, go, alert) =>
    h('button', { class: 'tile', type: 'button', onclick: () => (sfx.tap(), go()) }, h('div', { class: 'big-emoji' }, emoji), h('div', { class: 'name' }, name), h('div', { class: 'muted' }, desc), alert ? h('span', { class: 'chip warn' }, alert) : null);
  const bossReady = AREAS.some((a) => pet.level >= a.levels[0] && care.bossReady(S, a.id) && !S.badges.includes(a.id));
  const grid = h(
    'div',
    { class: 'grid' },
    tile('🛒', 'ร้านค้า', 'อาหาร น้ำ ยา ของเล่น', () => app.go('shop', { back: 'town' })),
    tile('🏥', 'โรงพยาบาล', 'วัคซีน รักษา ฟื้นพลัง', () => app.go('hospital'), pet.sick ? 'ป่วยอยู่!' : vaccineAvailable(pet) ? 'ฉีดวัคซีนได้!' : pet.hpPct < 0.5 ? 'ฟื้นพลังฟรี' : null),
    tile('🏫', 'โรงเรียน', 'ควิซ เรียนท่าใหม่ จัดท่า', () => app.go('school')),
    tile('🎡', 'ลานกิจกรรม', 'มินิเกม ได้เหรียญ', () => app.go('activities')),
    tile('⚔️', 'ลานประลอง', 'ฝึกซ้อม ไต่อันดับ สู้กับเพื่อน', () => app.go('arena')),
    tile('🗺️', 'ผจญภัย', 'สู้ใน 5 พื้นที่ เก็บพลัง', () => app.go('adventure'), bossReady ? 'บอสรออยู่!' : null),
    tile('🏨', 'บ้านพักสัตว์', `${S.pets.length} ตัว${S.eggs ? ` · 🥚 ${S.eggs}` : ''}`, () => app.go('hotel'), S.eggs ? 'มีไข่!' : null),
    tile('🏠', 'กลับบ้าน', 'ไปหาสัตว์เลี้ยง', () => app.go('home')),
  );
  return { el: screen(app, '🏘️ ในเมือง', 'home', grid), view: backdrop(app), music: 'home' };
}

// ---------------- shop ----------------

export function shopScreen(app, arg = {}) {
  const S = app.S;
  let tab = arg.tab || 'food';
  const back = arg.back || 'town';
  const tabs = h('div', { class: 'tabs' });
  const list = h('div', { class: 'grid wide' });
  const head = h('div', {});
  const fav = SPECIES[app.pet().species].fav;

  const desc = (it) => {
    const d = [it.hunger && `อิ่ม +${it.hunger}`, it.thirst && `น้ำ +${it.thirst}`, it.fun && `สนุก +${it.fun}`, it.energy && `พลังงาน +${it.energy}`, it.cure && 'รักษาอาการป่วย', it.heal && `ฟื้นพลัง ${it.heal * 100}% (ใช้ในการต่อสู้ได้)`, it.toy && 'ของเล่นถาวร สนุก +20', it.boostMin && `ลดเวลารอโต ${it.boostMin} นาที (รวมไม่เกิน ${MAX_BOOST_MIN / 60} ชม.)`];
    return d.filter(Boolean).join(' · ');
  };

  function render() {
    head.replaceChildren(titleRow('🛒 ร้านค้า', () => app.go(back), money(S)));
    tabs.replaceChildren(...SHOP_TABS.map((t) => h('button', { class: `tab${t.id === tab ? ' on' : ''}`, type: 'button', onclick: () => ((tab = t.id), sfx.tap(), render()) }, `${t.icon} ${t.name}`)));
    const ids = Object.keys(ITEMS).filter((id) => ITEMS[id].cat === tab);
    list.replaceChildren(
      ...ids.map((id) => {
        const it = ITEMS[id];
        const cur = currencyOf(id) === 'crystals' ? '💎' : '🪙';
        const owned = it.toy ? S.toys.includes(id) : count(S, id);
        return h(
          'div',
          { class: 'item-row' },
          h('span', { class: 'e' }, it.icon),
          h('div', { class: 'info' }, h('b', {}, it.name, id === fav ? ' ❤️ ของโปรด' : ''), h('span', { class: 'muted' }, desc(it)), h('div', { class: 'muted' }, it.price === 0 ? 'ฟรีไม่จำกัด' : it.toy ? (owned ? '✅ มีแล้ว' : '') : `มี ${owned}`)),
          it.price === 0 || (it.toy && owned)
            ? null
            : btn(`${it.price}${cur}`, () => {
                const r = buy(S, id);
                if (r.ok) {
                  sfx.coin();
                  toast(`ซื้อ ${it.icon} ${it.name} แล้ว`, 'good');
                  app.save();
                } else app.blocked(r.reason);
                render();
              }, currencyOf(id) === 'crystals' ? 'small lilac' : 'small lemon'),
        );
      }),
    );
  }
  render();
  return { el: h('div', { class: 'screen' }, head, tabs, list), view: backdrop(app), music: 'home' };
}

// ---------------- hospital ----------------

export function hospitalScreen(app) {
  const S = app.S;
  const body = h('div', { style: 'display:flex;flex-direction:column;gap:0.8rem' });
  function render() {
    const pet = app.pet();
    const doses = VACCINE_LEVELS.map((lv, i) => h('span', { class: `chip ${pet.vaccines > i ? 'good' : pet.level >= lv ? 'warn' : ''}` }, `${pet.vaccines > i ? '✅' : '💉'} เข็ม ${i + 1} (Lv${lv})`));
    const milk = count(S, 'growMilk');
    body.replaceChildren(
      h('div', { class: 'panel row' }, petCanvas(pet, 130, { mood: pet.sick ? 'sick' : pet.hpPct < 0.5 ? 'sad' : 'idle' }), h('div', { class: 'grow' }, h('h3', {}, pet.name), h('div', {}, pet.sick ? '🤒 ป่วยอยู่' : '😊 สุขภาพดี'), h('div', { class: 'row', style: 'flex-wrap:nowrap' }, '❤️', bar(pet.hpPct * 100)), h('div', { class: 'row', style: 'margin-top:0.3rem' }, doses), h('div', { class: 'muted' }, `🏅 สติกเกอร์ความกล้า ${S.stickers} ดวง`))),
      h(
        'div',
        { class: 'grid wide' },
        h('div', { class: 'item-row' }, h('span', { class: 'e' }, '💉'), h('div', { class: 'info' }, h('b', {}, 'ฉีดวัคซีน'), h('span', { class: 'muted' }, vaccineAvailable(pet) ? `ถึงเวลาฉีดเข็มที่ ${pet.vaccines + 1} แล้ว! (ฟรี)` : pet.vaccines >= 3 ? 'ฉีดครบ 3 เข็มแล้ว' : `เข็มถัดไปตอน Lv${VACCINE_LEVELS[pet.vaccines]}`)), vaccineAvailable(pet) ? btn('ฉีด', () => vaccine(), 'small mint') : null),
        h('div', { class: 'item-row' }, h('span', { class: 'e' }, '🩺'), h('div', { class: 'info' }, h('b', {}, 'รักษาอาการป่วย'), h('span', { class: 'muted' }, `${care.CURE_PRICE}🪙 · หายทันที`)), pet.sick ? btn('รักษา', () => cure(), 'small coral') : null),
        h('div', { class: 'item-row' }, h('span', { class: 'e' }, '❤️'), h('div', { class: 'info' }, h('b', {}, 'ฟื้นพลังชีวิต'), h('span', { class: 'muted' }, 'ฟรี! หลังต่อสู้มาเหนื่อยๆ')), pet.hpPct < 1 ? btn('ฟื้นพลัง', () => heal(), 'small mint') : null),
        h('div', { class: 'item-row' }, h('span', { class: 'e' }, '🍼'), h('div', { class: 'info' }, h('b', {}, 'นมโตไว'), h('span', { class: 'muted' }, `มี ${milk} · ลดเวลารอโต 30 นาที · ใช้ไปแล้ว ${Math.round(pet.boostMs / MINUTE)}/${MAX_BOOST_MIN} นาที`)), milk ? btn('ดื่ม', () => growMilk(), 'small lilac') : btn('ซื้อ', () => app.go('shop', { tab: 'special', back: 'hospital' }), 'small ghost')),
      ),
    );
  }
  function vaccine() {
    guarded(app, 'care', () =>
      app.go('calm', {
        back: 'hospital',
        finish: () => {
          const r = care.vaccinate(S, app.pet());
          app.done(r);
          sfx.sparkle();
          return { lines: [`วัคซีนเข็ม ${r.dose}/3 ✅`, '+10⭐'] };
        },
      }),
    );
  }
  function cure() {
    if (app.done(care.hospitalCure(S, app.pet()), 'หายป่วยแล้ว! 🎉')) sfx.heal();
    render();
  }
  function heal() {
    care.hospitalHeal(app.pet());
    sfx.heal();
    toast('พลังชีวิตเต็มแล้ว ❤️', 'good');
    app.save();
    render();
  }
  function growMilk() {
    if (app.done(care.useGrowMilk(S, app.pet()), 'อึก อึก 🍼 โตไวขึ้น 30 นาที!')) sfx.drink();
    render();
  }
  render();
  return { el: screen(app, '🏥 โรงพยาบาล', 'town', body), view: backdrop(app), music: 'home', refresh: render };
}

// ---------------- school ----------------

export function schoolScreen(app) {
  const S = app.S;
  const body = h('div', { style: 'display:flex;flex-direction:column;gap:0.8rem' });
  function render() {
    const pet = app.pet();
    const learnRows = SCHOOL_SKILLS.map((id) => {
      const L = skillLine(id);
      const known = pet.skills.includes(id);
      const locked = pet.level < SCHOOL_LEVEL[id];
      return h(
        'div',
        { class: 'item-row' },
        h('span', { class: 'e' }, SKILLS[id].icon),
        h('div', { class: 'info' }, h('b', {}, SKILLS[id].name), h('span', { class: 'muted' }, `${L.desc} · SP ${SKILLS[id].cost}`)),
        known ? h('span', { class: 'chip good' }, '✅ เรียนแล้ว') : locked ? h('span', { class: 'chip' }, `🔒 Lv${SCHOOL_LEVEL[id]}`) : btn('เรียน', () => learn(id), 'small sky'),
      );
    });
    body.replaceChildren(
      h('div', { class: 'grid wide' }, h('div', { class: 'item-row' }, h('span', { class: 'e' }, '📚'), h('div', { class: 'info' }, h('b', {}, 'ห้องสมุด: ควิซ 5 ข้อ'), h('span', { class: 'muted' }, 'เรื่องสัตว์และธรรมชาติ · ข้อละ +3⭐ +2🪙 · ถูก 4 ข้อขึ้นไป INT เพิ่ม')), btn('เริ่ม', quiz, 'small mint')), h('div', { class: 'item-row' }, h('span', { class: 'e' }, '🎒'), h('div', { class: 'info' }, h('b', {}, 'จัดท่าต่อสู้'), h('span', { class: 'muted' }, `ใส่ได้ ${MAX_EQUIP} ท่า · ตอนนี้ ${pet.equip.length}/${MAX_EQUIP}`)), btn('จัดท่า', () => equipModal(app, render), 'small lemon'))),
      h('h3', {}, '🎵 เรียนท่าใหม่ (มินิเกมจำลำดับ)'),
      h('div', { class: 'grid wide' }, learnRows),
    );
  }
  function quiz() {
    guarded(app, 'quiz', () =>
      app.go('quiz', {
        back: 'school',
        finish: (correct) => {
          const r = care.quizDone(S, app.pet(), correct, app.now());
          app.done(r);
          const lines = rewardLines({ coins: 2 * correct, exp: 3 * correct });
          if (r.int) lines.push(`📚 INT +${r.int}`);
          if (correct >= 3) lines.push('📚 แต้มสายนักปราชญ์เพิ่มขึ้น');
          return { lines };
        },
      }),
    );
  }
  function learn(id) {
    guarded(app, 'learn', () =>
      app.go('simon', {
        back: 'school',
        length: 3 + SCHOOL_SKILLS.indexOf(id),
        finish: (ok) => {
          if (!ok) return { lines: ['ลองใหม่ได้เสมอนะ 💪'] };
          const pet = app.pet();
          const r = care.learnSchool(S, pet, id, app.now());
          app.done(r);
          const L = skillLine(id);
          return { lines: [`ได้ท่าใหม่ ${L.title}!`, L.desc, pet.equip.includes(id) ? 'ใส่ท่านี้แล้ว ใช้ได้เลย' : 'ช่องท่าเต็ม ไปจัดท่าที่ 🎒 ได้นะ', '+5⭐'] };
        },
      }),
    );
  }
  render();
  return { el: screen(app, '🏫 โรงเรียน', 'town', body), view: backdrop(app), music: 'home' };
}

export function equipModal(app, onClose) {
  const pet = app.pet();
  const box = h('div', { style: 'display:flex;flex-direction:column;gap:0.5rem' });
  const render = () => {
    box.replaceChildren(
      h('p', { class: 'center muted' }, `เลือกได้ ${MAX_EQUIP} ท่า (+ ท่าพุ่งชนใช้ได้เสมอ) · ใส่อยู่ ${pet.equip.length}/${MAX_EQUIP}`),
      ...pet.skills.map((id) => {
        const L = skillLine(id);
        const on = pet.equip.includes(id);
        return h('button', { class: `item-row${on ? ' tile on' : ''}`, type: 'button', style: 'text-align:left;font:inherit;color:inherit;cursor:pointer', onclick: () => {
          if (!toggleEquip(pet, id)) app.blocked(`ใส่ได้สูงสุด ${MAX_EQUIP} ท่า เอาท่าอื่นออกก่อนนะ`);
          else sfx.tap();
          app.save();
          render();
        } }, h('span', { class: 'e' }, SKILLS[id].icon), h('div', { class: 'info' }, h('b', {}, SKILLS[id].name), h('span', { class: 'muted' }, `${L.sub} · ${L.desc}`)), h('span', { class: `chip ${on ? 'good' : ''}` }, on ? '✅ ใส่อยู่' : 'ไม่ได้ใส่'));
      }),
    );
  };
  render();
  const m = modal([h('h2', {}, '🎒 จัดท่าต่อสู้'), box, btn('เสร็จแล้ว', () => m.close(), 'mint')], { onClose });
}

// ---------------- activities ----------------

export function activityScreen(app) {
  const S = app.S;
  const play = (name) =>
    guarded(app, 'game', () =>
      app.go(name, {
        back: 'activities',
        finish: (score) => {
          const r = care.gameDone(S, app.pet(), score, app.now());
          app.done(r);
          return { lines: [...rewardLines(r.reward || {}), '🎈 สนุก +15'] };
        },
      }),
    );
  const body = h(
    'div',
    { class: 'grid wide' },
    h('button', { class: 'tile', type: 'button', onclick: () => play('catch') }, h('div', { class: 'big-emoji' }, '🍣'), h('div', { class: 'name' }, 'รับขนม'), h('div', { class: 'muted' }, 'ลากสัตว์เลี้ยงไปรับขนม ระวังช็อกโกแลตกับหัวหอม!')),
    h('button', { class: 'tile', type: 'button', onclick: () => play('memory') }, h('div', { class: 'big-emoji' }, '🃏'), h('div', { class: 'name' }, 'จับคู่การ์ด'), h('div', { class: 'muted' }, 'หาคู่การ์ดให้ครบ ใช้ครั้งน้อยได้รางวัลเยอะ')),
  );
  return { el: screen(app, '🎡 ลานกิจกรรม', 'town', h('div', {}, h('p', { class: 'muted' }, 'เล่นได้เหรียญ ⭐ EXP และความสนุก (ใช้พลังงาน 4)'), body)), view: backdrop(app), music: 'home' };
}

// ---------------- arena ----------------

export function arenaScreen(app, arg = {}) {
  const S = app.S;
  let tab = arg.tab || 'train';
  const tabs = h('div', { class: 'tabs' });
  const body = h('div', { style: 'display:flex;flex-direction:column;gap:0.7rem' });
  const TABS = [
    ['train', '🥊 ฝึกซ้อม'],
    ['ladder', '🏆 ไต่อันดับ'],
    ['upgrade', '💎 อัปพลัง'],
    ['friend', '🤝 สู้กับเพื่อน'],
  ];
  function render() {
    const pet = app.pet();
    tabs.replaceChildren(...TABS.map(([id, name]) => h('button', { class: `tab${id === tab ? ' on' : ''}`, type: 'button', onclick: () => ((tab = id), sfx.tap(), render()) }, name)));
    const st = petStats(pet);
    if (tab === 'train') {
      body.replaceChildren(
        h('p', { class: 'muted' }, `ฝึกได้สูงสุด +${trainCap(pet)} ต่อค่า (เพิ่มเมื่อเลเวลขึ้น) · ใช้พลังงาน 4 · ได้แต้มสายนักสู้ ⚔️`),
        h(
          'div',
          { class: 'grid wide' },
          ['atk', 'def', 'spd'].map((k) =>
            h('div', { class: 'item-row' }, h('span', { class: 'e' }, STAT_INFO[k].icon), h('div', { class: 'info' }, h('b', {}, STAT_INFO[k].name), h('span', { class: 'muted' }, `ตอนนี้ ${st[k]} · ฝึกแล้ว +${pet.train[k]}/${trainCap(pet)}`)), btn('ฝึก', () => train(k), 'small coral')),
          ),
        ),
      );
    } else if (tab === 'ladder') {
      body.replaceChildren(
        h('p', { class: 'muted' }, `อันดับของเรา: ${S.arenaRank}/10 · ชนะแชมป์ครั้งแรกได้ 💎 2`),
        h(
          'div',
          { class: 'grid wide' },
          ARENA_TRAINERS.map((name, r) => {
            const lv = r + 1;
            const beaten = r < S.arenaRank;
            const can = r <= S.arenaRank && pet.level >= lv;
            return h(
              'div',
              { class: 'item-row' },
              h('span', { class: 'e' }, beaten ? '🏅' : r === S.arenaRank ? '⚔️' : '🔒'),
              h('div', { class: 'info' }, h('b', {}, `อันดับ ${10 - r}: ${name}`), h('span', { class: 'muted' }, `สัตว์ Lv${lv}${beaten ? ' · ชนะแล้ว' : ''}${r > S.arenaRank ? ' · ชนะอันดับก่อนหน้าก่อน' : pet.level < lv ? ` · ต้อง Lv${lv}` : ''}`)),
              can ? btn(beaten ? 'สู้อีก' : 'ท้าสู้!', () => ladder(r), beaten ? 'small ghost' : 'small coral') : null,
            );
          }),
        ),
      );
    } else if (tab === 'upgrade') {
      body.replaceChildren(
        h('p', { class: 'muted' }, `ใช้ 💎 คริสตัลพลังที่ได้จากการผจญภัยและภารกิจ · มี 💎 ${S.crystals}`),
        h(
          'div',
          { class: 'grid wide' },
          STAT_KEYS.map((k) => {
            const lv = pet.up[k] || 0;
            return h('div', { class: 'item-row' }, h('span', { class: 'e' }, STAT_NAME[k].split(' ')[0]), h('div', { class: 'info' }, h('b', {}, `${STAT_NAME[k]} ${st[k]}`), h('span', { class: 'muted' }, `${'★'.repeat(lv)}${'☆'.repeat(MAX_UPGRADE - lv)} · +${k === 'hp' ? 6 : 2} ต่อขั้น`)), lv >= MAX_UPGRADE ? h('span', { class: 'chip good' }, 'สูงสุด') : btn(`${upgradeCost(lv)}💎`, () => up(k), 'small lilac'));
          }),
        ),
      );
    } else {
      const code = encodePet(pet);
      const ta = h('textarea', { readonly: true, style: 'min-height:4rem' }, code);
      const input = h('textarea', { placeholder: 'วางรหัสสัตว์ของเพื่อน (ขึ้นต้นด้วย YHP1.)', style: 'min-height:4rem' });
      body.replaceChildren(
        h('div', { class: 'panel' }, h('h3', {}, `📤 รหัสของ${pet.name}`), h('p', { class: 'muted' }, 'ส่งรหัสนี้ให้เพื่อนทาง LINE เพื่อนจะได้สู้กับสัตว์ของเรา (คอมพิวเตอร์บังคับ)'), ta, h('div', { class: 'row', style: 'margin-top:0.5rem' }, btn('📋 คัดลอก', () => copy(code, ta), 'small sky'), navigator.share ? btn('📨 แชร์', () => navigator.share({ text: `มาสู้กับ ${pet.name} ในเกมบ้านโยเกิร์ตกัน! วางรหัสนี้ที่ ⚔️ ลานประลอง > 🤝 สู้กับเพื่อน\n${code}` }).catch(() => {}), 'small mint') : null)),
        h('div', { class: 'panel' }, h('h3', {}, '📥 สู้กับสัตว์ของเพื่อน'), input, h('div', { class: 'row', style: 'margin-top:0.5rem' }, btn('ดูสัตว์ของเพื่อน', () => friend(input.value), 'small coral'))),
      );
    }
  }
  function train(stat) {
    guarded(app, 'train', () =>
      app.go('training', {
        stat,
        back: 'arena',
        finish: (q) => {
          const pet = app.pet();
          const r = care.trainDone(S, pet, stat, q, app.now());
          app.done(r);
          const lines = [r.gained ? `${STAT_INFO[stat].icon} ${stat.toUpperCase()} +${r.gained}` : q ? 'ฝึกถึงขีดสุดของเลเวลนี้แล้ว โตอีกนิดนะ' : 'ครั้งนี้ยังไม่ได้พลังเพิ่ม', `+${3 + 2 * q}⭐`];
          return { lines };
        },
      }),
    );
  }
  function ladder(rank) {
    guarded(app, 'battle', () => {
      const foe = makeTrainer(rank, ARENA_TRAINERS[rank], makeRng(S.created % 100000 + rank * 7919));
      app.go('battle', { kind: 'arena', rank, level: rank + 1, foe, back: 'arena', backArg: { tab: 'ladder' }, title: `🏆 ${ARENA_TRAINERS[rank]}` });
    });
  }
  function up(stat) {
    const r = upgrade(S, app.pet(), stat);
    if (r.ok) {
      sfx.sparkle();
      toast(`${STAT_NAME[stat]} เพิ่มขึ้น! ✨`, 'good');
      app.save();
    } else app.blocked(r.reason);
    render();
  }
  function friend(code) {
    let snap;
    try {
      snap = decodePet(code);
    } catch (e) {
      return app.blocked(e.message);
    }
    const sp = SPECIES[snap.species];
    const m = modal([
      h('h2', {}, `${snap.name}`),
      petCanvas({ species: snap.species, level: snap.level, branch: snap.branch }, 170, { mood: 'happy' }),
      h('p', { class: 'center' }, `${formName(snap.species, snap.level, snap.branch)} · Lv${snap.level} · ${ELEMENT_INFO[sp.element].icon} ธาตุ${ELEMENT_INFO[sp.element].name}`),
      h('p', { class: 'center muted' }, STAT_KEYS.map((k, i) => `${STAT_NAME[k]} ${snap.stats[k]}`).join(' · ')),
      h('div', { class: 'row', style: 'justify-content:center' }, btn('ยกเลิก', () => m.close(), 'ghost back'), btn('สู้เลย! ⚔️', () => {
        m.close();
        guarded(app, 'battle', () => app.go('battle', { kind: 'friend', level: snap.level, foe: friendFighter(snap), back: 'arena', backArg: { tab: 'friend' }, title: '🤝 สู้กับเพื่อน' }));
      }, 'coral')),
    ]);
  }
  function copy(text, ta) {
    const ok = () => toast('คัดลอกแล้ว! ไปวางใน LINE ได้เลย', 'good');
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(ok, () => fallback());
    else fallback();
    function fallback() {
      ta.removeAttribute('readonly');
      ta.select();
      document.execCommand?.('copy');
      ta.setAttribute('readonly', '');
      ok();
    }
  }
  render();
  return { el: h('div', { class: 'screen' }, titleRow('⚔️ ลานประลอง', () => app.go('town'), money(S)), tabs, body), view: backdrop(app), music: 'home' };
}

// ---------------- adventure ----------------

export function adventureScreen(app) {
  const S = app.S;
  const pet = app.pet();
  const fight = (area, boss) =>
    guarded(app, 'battle', () => {
      const lv = boss ? area.levels[1] : Math.max(area.levels[0], Math.min(area.levels[1], pet.level - (Math.random() < 0.3 ? 1 : 0)));
      const def = boss ? area.boss : area.foes[Math.floor(Math.random() * area.foes.length)];
      const foe = makeFoe(def, lv, boss ? AREAS.indexOf(area) + 1 : 0);
      app.go('battle', { kind: boss ? 'boss' : 'wild', area: area.id, level: lv, foe, back: 'adventure', title: `${area.icon} ${area.name}` });
    });
  const tiles = AREAS.map((a) => {
    const open = pet.level >= a.levels[0];
    const wins = S.areaWins[a.id] || 0;
    const badge = S.badges.includes(a.id);
    const ready = care.bossReady(S, a.id);
    const c = h('canvas', { width: 320, height: 180, style: 'width:100%;border-radius:1rem;display:block' });
    const ctx = c.getContext('2d');
    drawScene(ctx, a.id, 320, 180, { tod: 'day', t: 1 });
    return h(
      'div',
      { class: `tile${open ? '' : ' locked'}` },
      c,
      h('div', { class: 'name' }, `${a.icon} ${a.name} ${badge ? '🏅' : ''}`),
      h('div', { class: 'muted' }, `แนะนำ Lv${a.levels[0]}–${a.levels[1]} · ${a.foes.map((f) => f.emoji).join(' ')} · บอส ${a.boss.emoji}`),
      open
        ? h('div', { class: 'row', style: 'justify-content:center' }, h('span', { class: 'chip' }, ready ? '👑 บอสปรากฏ!' : `ชนะ ${Math.min(wins, WINS_FOR_BOSS)}/${WINS_FOR_BOSS} เพื่อเจอบอส`), btn('⚔️ สู้', () => fight(a, false), 'small coral'), ready ? btn(`${a.boss.emoji} บอส`, () => fight(a, true), 'small lilac') : null)
        : h('span', { class: 'chip' }, `🔒 ปลดล็อกที่ Lv${a.levels[0]}`),
    );
  });
  const body = h('div', {}, h('p', { class: 'muted' }, 'ชนะได้เหรียญ ⭐ EXP และมีโอกาสได้ 💎 คริสตัลพลัง · ชนะบอสได้เหรียญตรา 🏅 และ 💎 3'), h('div', { class: 'grid wide' }, tiles));
  return { el: screen(app, '🗺️ ผจญภัย', 'town', body), view: backdrop(app), music: 'home' };
}

// ---------------- pet hotel ----------------

export function hotelScreen(app) {
  const S = app.S;
  const tiles = S.pets.map((p) => {
    const active = p.id === S.activeId;
    return h(
      'div',
      { class: `tile${active ? ' on' : ''}` },
      petCanvas(p, 130, { mood: active ? 'happy' : 'sleep' }),
      h('div', { class: 'name' }, p.name),
      h('div', { class: 'muted' }, `Lv${p.level} · ${formName(p.species, p.level, p.branch)}`),
      active
        ? h('span', { class: 'chip good' }, '🏠 กำลังเลี้ยง')
        : btn('เลี้ยงตัวนี้', () => {
            switchPet(S, p.id, app.now(), app.rng);
            sfx.voice(p.species);
            toast(`${p.name}กลับบ้านแล้ว! ตัวอื่นพักที่บ้านพัก (ไม่หิว ไม่โต)`, 'good');
            app.save();
            app.go('home');
          }, 'small mint'),
    );
  });
  const body = h(
    'div',
    {},
    h('p', { class: 'muted' }, 'เลี้ยงได้ทีละตัว ตัวที่อยู่บ้านพักจะหยุดเวลา (ไม่หิว ไม่โต) · ได้ไข่ปริศนา 🥚 เมื่อเลี้ยงถึง Lv5 และ Lv10'),
    S.eggs ? h('div', { class: 'row', style: 'margin:0.5rem 0' }, btn(`🥚 ฟักไข่ (${S.eggs})`, () => hatchOverlay(app), 'lemon')) : null,
    h('div', { class: 'grid' }, tiles),
  );
  return { el: screen(app, '🏨 บ้านพักสัตว์', 'town', body), view: backdrop(app), music: 'home' };
}
