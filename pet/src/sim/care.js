// Things the player does with the active pet: care, hospital, school,
// activities, training and battles. Each returns { ok, reason?, events }.
import { ITEMS, MAX_BOOST_MIN } from '../data/items.js';
import { SPECIES } from '../data/species.js';
import { areaById, WINS_FOR_BOSS } from '../data/areas.js';
import { addNeeds, addBranch, addTraining, learnSkill, checkLevelUp, vaccineAvailable, SCHOOL_LEVEL } from './pet.js';
import { isAsleep, isNight, NIGHT_WAKE, MINUTE } from './time.js';
import { applyEvents, consume, count, gainExp, grant, progress, battleReward } from './economy.js';

export const ENERGY_COST = { battle: 5, train: 4, game: 4, quiz: 2, play: 3, learn: 2 };
export const CURE_PRICE = 25;
export const MIN_BATTLE_HP = 0.25;
const PAT_COOLDOWN = 2 * MINUTE;

export const REASONS = {
  asleep: 'หลับอยู่ ชู่ว์… 💤',
  tired: 'เหนื่อยแล้ว ให้นอนพักหรือดื่มน้ำมะพร้าวก่อนนะ',
  sick: 'ไม่สบายอยู่ พาไปโรงพยาบาลก่อนนะ',
  hurt: 'บาดเจ็บอยู่ ไปโรงพยาบาลฟื้นพลังฟรีได้เลย',
  full: 'อิ่มแล้ว!',
  notThirsty: 'ยังไม่หิวน้ำ',
  clean: 'สะอาดแล้ว ✨',
  none: 'ไม่มีของชิ้นนี้ ไปซื้อที่ร้านก่อนนะ',
  noCoins: 'เหรียญไม่พอ',
  noCrystals: 'คริสตัลไม่พอ',
  notSick: 'ไม่ได้ป่วย สบายดี',
  noVaccine: 'ยังไม่ถึงเวลาฉีดวัคซีน',
  maxBoost: 'ใช้นมโตไวครบแล้ว',
  maxLevel: 'โตเต็มที่แล้ว',
  noPoop: 'ไม่มีอึให้เก็บ',
  locked: 'ยังไม่ปลดล็อก',
  known: 'รู้ท่านี้แล้ว',
  owned: 'มีแล้ว',
  noBoss: 'ต้องชนะอีกก่อนถึงจะเจอบอส',
};

const fail = (reason) => ({ ok: false, reason, events: [] });
const ok = (events = [], extra = {}) => ({ ok: true, events, ...extra });

// null when the pet can do it, else a REASONS key.
export function blocked(pet, now, what) {
  if (isAsleep(pet, now)) return 'asleep';
  if ((what === 'battle' || what === 'train') && pet.sick) return 'sick';
  if (ENERGY_COST[what] && pet.needs.energy < ENERGY_COST[what]) return 'tired';
  if (what === 'battle' && pet.hpPct < MIN_BATTLE_HP) return 'hurt';
  return null;
}

function spend(pet, what) {
  addNeeds(pet, { energy: -(ENERGY_COST[what] || 0) });
}

// ---------------- home ----------------

export function feed(S, pet, id, now) {
  const it = ITEMS[id];
  if (!it || (it.cat !== 'food' && it.cat !== 'drink')) return fail('none');
  const why = blocked(pet, now, 'care');
  if (why) return fail(why);
  if (it.cat === 'food' && pet.needs.hunger >= 95) return fail('full');
  if (it.cat === 'drink' && pet.needs.thirst >= 95) return fail('notThirsty');
  if (!count(S, id) || !consume(S, id)) return fail('none');
  const fav = SPECIES[pet.species].fav === id;
  addNeeds(pet, { hunger: it.hunger, thirst: it.thirst, fun: (it.fun || 0) + (fav ? 10 : 0), energy: it.energy });
  addBranch(pet, 'charm', 1);
  const events = gainExp(S, pet, fav ? 3 : 2);
  progress(S, pet, it.cat === 'food' ? 'feed' : 'drink', 1, events);
  return ok(events, { fav });
}

export function bath(S, pet, now) {
  const why = blocked(pet, now, 'care');
  if (why) return fail(why);
  if (pet.needs.clean >= 90) return fail('clean');
  addNeeds(pet, { clean: 100, fun: pet.species === 'pongfu' || pet.species === 'chako' ? 8 : 2 });
  addBranch(pet, 'charm', 1);
  const events = gainExp(S, pet, 3);
  progress(S, pet, 'bath', 1, events);
  return ok(events);
}

export function scoop(S, pet) {
  if (pet.poop <= 0) return fail('noPoop');
  pet.poop--;
  addNeeds(pet, { clean: 3 });
  const events = gainExp(S, pet, 1);
  progress(S, pet, 'poop', 1, events);
  return ok(events);
}

export function pat(S, pet, now) {
  const why = blocked(pet, now, 'care');
  if (why) return fail(why);
  const fresh = now - pet.lastPat >= PAT_COOLDOWN;
  pet.lastPat = now;
  addNeeds(pet, { fun: fresh ? 6 : 2 });
  const events = [];
  if (fresh) {
    addBranch(pet, 'charm', 1);
    gainExp(S, pet, 1, events);
  }
  progress(S, pet, 'pat', 1, events);
  return ok(events);
}

export function play(S, pet, toy, now) {
  if (!S.toys.includes(toy)) return fail('none');
  const why = blocked(pet, now, 'play');
  if (why) return fail(why);
  spend(pet, 'play');
  addNeeds(pet, { fun: 20 });
  addBranch(pet, 'charm', 2);
  return ok(gainExp(S, pet, 3));
}

export function goToBed(pet, now) {
  if (isAsleep(pet, now)) return fail('asleep');
  if (isNight(now)) pet.wakeUntil = 0;
  else pet.nap = true;
  return ok();
}

export function wakeUp(pet, now) {
  pet.nap = false;
  if (isNight(now)) pet.wakeUntil = now + NIGHT_WAKE;
  return ok();
}

export function useMedicine(S, pet, id) {
  const it = ITEMS[id];
  if (!it || it.cat !== 'med' || !count(S, id)) return fail('none');
  if (it.cure && !pet.sick) return fail('notSick');
  consume(S, id);
  if (it.cure) {
    pet.sick = false;
    pet.badHours = 0;
  }
  if (it.heal) pet.hpPct = Math.min(1, pet.hpPct + it.heal);
  return ok();
}

export function useGrowMilk(S, pet) {
  if (pet.level >= 10) return fail('maxLevel');
  if (pet.boostMs >= MAX_BOOST_MIN * MINUTE) return fail('maxBoost');
  if (!count(S, 'growMilk')) return fail('none');
  consume(S, 'growMilk');
  pet.boostMs = Math.min(MAX_BOOST_MIN * MINUTE, pet.boostMs + ITEMS.growMilk.boostMin * MINUTE);
  return ok(applyEvents(S, checkLevelUp(pet)));
}

// ---------------- hospital ----------------

export function vaccinate(S, pet) {
  if (!vaccineAvailable(pet)) return fail('noVaccine');
  pet.vaccines++;
  S.stickers++;
  addBranch(pet, 'charm', 2);
  return ok(gainExp(S, pet, 10), { dose: pet.vaccines });
}

export function hospitalCure(S, pet) {
  if (!pet.sick) return fail('notSick');
  if (S.coins < CURE_PRICE) return fail('noCoins');
  S.coins -= CURE_PRICE;
  pet.sick = false;
  pet.badHours = 0;
  pet.hpPct = 1;
  return ok();
}

export function hospitalHeal(pet) {
  pet.hpPct = 1;
  return ok();
}

// ---------------- school ----------------

export function quizDone(S, pet, correct, now) {
  const why = blocked(pet, now, 'quiz');
  if (why) return fail(why);
  spend(pet, 'quiz');
  addBranch(pet, 'sage', 2 * correct);
  const events = [];
  let int = 0;
  if (correct >= 4) int = addTraining(pet, 'int', correct === 5 ? 2 : 1);
  grant(S, pet, { coins: 2 * correct, exp: 3 * correct }, events);
  progress(S, pet, 'quiz', correct, events);
  return ok(events, { int });
}

export function learnSchool(S, pet, id, now) {
  if (!(id in SCHOOL_LEVEL) || pet.level < SCHOOL_LEVEL[id]) return fail('locked');
  if (pet.skills.includes(id)) return fail('known');
  const why = blocked(pet, now, 'learn');
  if (why) return fail(why);
  spend(pet, 'learn');
  learnSkill(pet, id);
  addBranch(pet, 'sage', 3);
  return ok(gainExp(S, pet, 5));
}

// ---------------- activities & arena training ----------------

// score: 0..1
export function gameDone(S, pet, score, now) {
  const why = blocked(pet, now, 'game');
  if (why) return fail(why);
  spend(pet, 'game');
  const s = Math.max(0, Math.min(1, score));
  addNeeds(pet, { fun: 15 });
  addBranch(pet, 'charm', 2);
  const r = { coins: 5 + Math.round(20 * s), exp: 4 + Math.round(8 * s) };
  const events = grant(S, pet, r);
  progress(S, pet, 'game', 1, events);
  return ok(events, { reward: r });
}

// quality: 0 miss · 1 good · 2 perfect
export function trainDone(S, pet, stat, quality, now) {
  const why = blocked(pet, now, 'train');
  if (why) return fail(why);
  spend(pet, 'train');
  const gained = addTraining(pet, stat, quality);
  addBranch(pet, 'fighter', 2);
  const events = gainExp(S, pet, 3 + 2 * quality);
  progress(S, pet, 'train', 1, events);
  return ok(events, { gained });
}

// ---------------- battles ----------------

export function bossReady(S, areaId) {
  return (S.areaWins[areaId] || 0) >= WINS_FOR_BOSS;
}

// ctx: { kind: 'wild'|'boss'|'arena'|'friend', area?, rank?, level }
export function battleDone(S, pet, ctx, battle, rng) {
  const me = battle.f[0];
  const win = battle.winner === 0;
  pet.hpPct = Math.max(0, me.hp / me.maxHp);
  spend(pet, 'battle');
  addBranch(pet, 'fighter', win ? 3 : 1);
  const firstClear = ctx.kind === 'arena' && win && ctx.rank === S.arenaRank;
  const reward = battleReward(ctx.kind, ctx.level, win, rng, firstClear);
  const events = grant(S, pet, reward);
  S.record[win ? 'wins' : 'losses']++;
  let badge = false;
  if (win) {
    if (ctx.kind === 'wild') S.areaWins[ctx.area] = (S.areaWins[ctx.area] || 0) + 1;
    if (ctx.kind === 'boss' && !S.badges.includes(ctx.area)) {
      S.badges.push(ctx.area);
      badge = true;
    }
    if (firstClear) S.arenaRank++;
    progress(S, pet, 'win', 1, events);
  }
  return ok(events, { win, reward, badge, firstClear, area: ctx.area && areaById(ctx.area) });
}
