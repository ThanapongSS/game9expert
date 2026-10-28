// Real-time passage: needs decay, sleep, poop, sickness, HP regen and age.
// Everything takes timestamps as arguments so tests can drive the clock.
import { HOUR, checkLevelUp, vaccineAvailable } from './pet.js';

export const MINUTE = 60000;
export const NIGHT_START = 20; // 20:00
export const NIGHT_END = 7; // 07:00
export const DECAY = { hunger: 8, thirst: 10, clean: 5, fun: 6 }; // per awake hour
export const SLEEP_DECAY = 0.2; // decay multiplier while asleep
export const ENERGY_AWAKE = 4; // resting between activities, per hour
export const ENERGY_ASLEEP = 25;
export const POOP_EVERY = 150 * MINUTE; // awake time between poops
export const MAX_POOP = 3;
export const POOP_DIRT = 4; // extra clean loss per hour per poop
export const BAD = 15; // a need below this is "bad"
export const SICK_AFTER = 4; // hours of bad needs before getting sick
export const HP_REGEN = 0.5; // fraction of max HP per hour
export const STEP = 10 * MINUTE;
export const NIGHT_WAKE = 60 * MINUTE; // how long a pet stays up when woken at night
export const MAX_CATCHUP = 30 * 24 * HOUR;

const pad = (n) => String(n).padStart(2, '0');

export function localHour(ts) {
  return new Date(ts).getHours();
}

export function isNight(ts) {
  const h = localHour(ts);
  return h >= NIGHT_START || h < NIGHT_END;
}

export function dayKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// 'morning' | 'day' | 'evening' | 'night' for scene tinting.
export function timeOfDay(ts) {
  const h = localHour(ts);
  if (h >= NIGHT_START || h < 6) return 'night';
  if (h < 9) return 'morning';
  if (h >= 17) return 'evening';
  return 'day';
}

export function isAsleep(pet, ts) {
  return pet.nap || (isNight(ts) && ts >= pet.wakeUntil);
}

// An unvaccinated pet (dose available but not given) catches colds from dirt sooner.
function isBad(pet) {
  const n = pet.needs;
  return n.hunger < BAD || n.thirst < BAD || n.clean < BAD || (vaccineAvailable(pet) && n.clean < 30);
}

const clamp100 = (v) => (v < 0 ? 0 : v > 100 ? 100 : v);

function step(pet, t, dt, events) {
  const h = dt / HOUR;
  const asleep = isAsleep(pet, t);
  const n = pet.needs;
  const mul = asleep ? SLEEP_DECAY : 1;
  n.hunger = clamp100(n.hunger - DECAY.hunger * mul * h);
  n.thirst = clamp100(n.thirst - DECAY.thirst * mul * h);
  n.fun = clamp100(n.fun - DECAY.fun * mul * h);
  n.clean = clamp100(n.clean - (DECAY.clean + pet.poop * POOP_DIRT) * mul * h);
  n.energy = clamp100(n.energy + (asleep ? ENERGY_ASLEEP : ENERGY_AWAKE) * h);
  if (pet.nap && n.energy >= 100) {
    pet.nap = false;
    events.push({ type: 'wake', petId: pet.id, at: t + dt });
  }
  if (!asleep) {
    pet.poopMs += dt;
    while (pet.poopMs >= POOP_EVERY) {
      pet.poopMs -= POOP_EVERY;
      if (pet.poop < MAX_POOP) {
        pet.poop++;
        events.push({ type: 'poop', petId: pet.id, at: t + dt });
      }
    }
  }
  pet.hpPct = Math.min(1, pet.hpPct + HP_REGEN * h);
  if (!pet.sick) {
    if (isBad(pet)) {
      pet.badHours += h;
      if (pet.badHours >= SICK_AFTER) {
        pet.sick = true;
        events.push({ type: 'sick', petId: pet.id, at: t + dt });
      }
    } else {
      pet.badHours = Math.max(0, pet.badHours - h);
    }
  }
  pet.ageMs += dt;
  checkLevelUp(pet, events);
}

// Advance one pet from `from` to `to`. Returns events (level, poop, sick, wake).
export function advancePet(pet, from, to, events = []) {
  if (!(to > from)) return events;
  let t = Math.max(from, to - MAX_CATCHUP);
  while (t < to) {
    const dt = Math.min(STEP, to - t);
    step(pet, t, dt, events);
    t += dt;
  }
  return events;
}
