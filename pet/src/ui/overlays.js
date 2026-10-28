// Pop-ups: welcome back, level up / evolution, egg hatching, missions,
// the form album, and settings (sound, backup, move home, reset).
import { SPECIES, SPECIES_IDS, BRANCHES, formName } from '../data/species.js';
import { SKILLS } from '../data/skills.js';
import { AREAS, areaById } from '../data/areas.js';
import { levelBlock } from '../sim/pet.js';
import { isAsleep } from '../sim/time.js';
import { MISSIONS, MISSION_REWARD, ALL_DONE_REWARD, hatchEgg } from '../sim/economy.js';
import { encodeBackup, decodeBackup, saveGame, switchPet, moveHome, store } from '../state.js';
import { drawPet } from '../render/pets.js';
import { getAudioSettings, setAudio, sfx, music } from '../audio.js';
import { h, btn, modal, sheet, toast, petCanvas, bar, confirmBox, fmtDuration } from './ui.js';

// ---------------- iPad install hint ----------------

export function needsIosHint() {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = navigator.standalone || window.matchMedia?.('(display-mode: standalone)').matches;
  return ios && !standalone;
}

export function iosHint() {
  return h(
    'div',
    { class: 'hint-ios' },
    h('b', {}, '📱 ติดตั้งเป็นแอปบน iPad (แนะนำ!)'),
    h('div', {}, '1. ใน Safari กดปุ่มแชร์ ⬆️ (มุมขวาบน)'),
    h('div', {}, '2. เลือก "เพิ่มไปยังหน้าจอโฮม" (Add to Home Screen)'),
    h('div', {}, '3. เปิดเกมจากไอคอน 🏠 บ้านโยเกิร์ต ที่หน้าจอโฮม'),
    h('div', { class: 'muted' }, 'เปิดแบบนี้เซฟจะไม่หายง่าย และเล่นเต็มจอเหมือนแอปจริง'),
  );
}

// ---------------- welcome back ----------------

export function welcomeBack(app, away, before, events, onClose) {
  const S = app.S;
  const pet = app.pet();
  const n = pet.needs;
  const lines = [];
  if (pet.level > (before.level || pet.level)) lines.push(`⬆️ ${pet.name}โตจาก Lv${before.level} เป็น Lv${pet.level}!`);
  const poops = events.filter((e) => e.type === 'poop').length;
  if (poops) lines.push(`💩 อึไว้ ${poops} ก้อน เก็บให้หน่อยนะ`);
  if (pet.sick) lines.push('🤒 ไม่สบาย พาไปโรงพยาบาลนะ');
  const wants = [n.hunger < 40 && 'หิวข้าว 🍚', n.thirst < 40 && 'หิวน้ำ 💧', n.clean < 40 && 'อยากอาบน้ำ 🛁', n.fun < 40 && 'อยากเล่น 🎾'].filter(Boolean);
  if (wants.length) lines.push(`ตอนนี้${pet.name}${wants.join(' ')}`);
  else lines.push(`${pet.name}สบายดี คิดถึงนะ 💕`);
  const blk = levelBlock(pet);
  if (blk?.kind === 'vaccine') lines.push(`💉 ต้องฉีดวัคซีนเข็ม ${blk.dose} ก่อนถึงจะโตต่อได้`);
  const login = events.find((e) => e.type === 'login');
  if (login) lines.push(`☀️ โบนัสเข้าเกมวันนี้ +${login.coins}🪙${login.streak > 1 ? ` (ต่อเนื่อง ${login.streak} วัน 🔥)` : ''}`, '📋 มีภารกิจใหม่ 3 อย่างรออยู่');
  if (isAsleep(pet, app.now())) lines.push('💤 ตอนนี้กำลังหลับ (กลางคืน 20:00–07:00) กด ☀️ ปลุกได้นะ');
  if (S.eggs) lines.push(`🥚 มีไข่ปริศนา ${S.eggs} ใบรอฟักอยู่!`);
  sfx.voice(pet.species);
  const m = modal(
    [
      h('h2', {}, away > 20 * 60000 ? `กลับมาแล้ว! (หายไป ${fmtDuration(away)})` : 'สวัสดีวันใหม่! ☀️'),
      petCanvas(pet, 170, { mood: pet.sick ? 'sick' : isAsleep(pet, app.now()) ? 'sleep' : wants.length ? 'sad' : 'happy' }),
      ...lines.map((l) => h('p', { class: 'center' }, l)),
      btn('ไปดูกัน! 🐾', () => m.close(), 'big mint'),
    ],
    { dismiss: false, onClose },
  );
}

// ---------------- level up & evolution ----------------

export function levelUpOverlay(app, evs, onDone) {
  const pet = app.pet();
  const from = evs[0].level - 1;
  const to = evs[evs.length - 1].level;
  const evolved = evs.some((e) => e.evolved);
  const learned = [...new Set(evs.flatMap((e) => e.learned || []))];
  const eggs = evs.filter((e) => e.egg).length;
  const branchSet = evs.find((e) => e.level === 4 || e.level === 8);
  const oldPet = { species: pet.species, level: from, branch: from < 4 ? null : pet.branch };
  const newPet = { species: pet.species, level: to, branch: pet.branch };
  sfx.levelUp();
  music(null);

  const size = 230;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const c = h('canvas', { class: 'portrait', width: size * dpr, height: size * dpr, style: `width:${size}px;height:${size}px` });
  const ctx = c.getContext('2d');
  const t0 = performance.now();
  const swapAt = evolved ? 1.6 : 0.6;
  const loop = (ms) => {
    if (!c.isConnected && ms - t0 > 500) return;
    const t = (ms - t0) / 1000;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    const before = t < swapAt;
    const p = before ? oldPet : newPet;
    const wobble = before && evolved ? 1 + 0.06 * Math.sin(t * 22) * Math.min(1, t) : 1;
    ctx.save();
    ctx.translate(size / 2, size * 0.9);
    ctx.scale(wobble, wobble);
    drawPet(ctx, p, p.species === 'chako' ? -size * 0.06 : 0, 0, size * (p.species === 'chako' ? 0.68 : 0.85), { t, mood: before ? 'idle' : 'cheer' });
    ctx.restore();
    const flash = 1 - Math.abs(t - swapAt) * 3;
    if (flash > 0) {
      ctx.fillStyle = `rgba(255,255,240,${flash})`;
      ctx.fillRect(0, 0, size, size);
    }
    if (!before) {
      for (let i = 0; i < 8; i++) {
        const a = t * 1.5 + (i * Math.PI) / 4;
        const r = size * 0.38 + Math.sin(t * 3 + i) * 8;
        ctx.fillStyle = i % 2 ? '#ffd34d' : '#ff9ac1';
        ctx.beginPath();
        ctx.arc(size / 2 + Math.cos(a) * r, size * 0.5 + Math.sin(a) * r * 0.7, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  const lines = [h('p', { class: 'center', style: 'font-size:1.3rem;font-weight:600' }, `Lv${from} ➜ Lv${to}`), h('p', { class: 'center' }, formName(pet.species, to, pet.branch))];
  if (branchSet && pet.branch) lines.push(h('p', { class: 'center' }, `แตกสายเป็น ${BRANCHES[pet.branch].icon} สาย${BRANCHES[pet.branch].name}! (ตามวิธีเลี้ยง)`));
  for (const id of learned) lines.push(h('p', { class: 'center' }, `✨ ได้ท่าใหม่: ${SKILLS[id].icon} ${SKILLS[id].name}`));
  if (evs.some((e) => e.newForm)) lines.push(h('p', { class: 'center muted' }, '📖 บันทึกร่างใหม่ลงสมุดสะสมแล้ว'));
  if (to >= 10) lines.push(h('p', { class: 'center' }, '👑 ถึงร่างตำนานแล้ว! สุดยอดไปเลย'));
  const blk = levelBlock(pet);
  if (blk?.kind === 'vaccine') lines.push(h('p', { class: 'center' }, `💉 ไปโรงพยาบาลฉีดวัคซีนเข็ม ${blk.dose} เพื่อโตต่อนะ`));
  if (eggs) lines.push(h('p', { class: 'center', style: 'font-weight:600' }, `🥚 ได้ไข่ปริศนา ${eggs} ใบ! ฟักแล้วจะได้สัตว์เลี้ยงตัวใหม่`));

  const m = modal(
    [
      h('h2', {}, evolved ? '✨ วิวัฒนาการ! ✨' : '🎉 เลเวลอัป!'),
      c,
      ...lines,
      h('div', { class: 'row', style: 'justify-content:center' }, eggs ? btn('🥚 ฟักไข่เลย', () => (m.close(), hatchOverlay(app)), 'lemon') : null, btn('เยี่ยมเลย!', () => m.close(), 'big mint')),
    ],
    {
      dismiss: false,
      onClose: () => {
        app.cur?.refresh?.();
        if (app.cur?.music !== undefined) music(app.cur.music);
        onDone?.();
      },
    },
  );
  setTimeout(() => sfx.voice(pet.species), swapAt * 1000);
}

// ---------------- eggs ----------------

export function hatchOverlay(app) {
  const S = app.S;
  if (!S.eggs) return;
  let taps = 0;
  const size = 200;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const c = h('canvas', { class: 'portrait', width: size * dpr, height: size * dpr, style: `width:${size}px;height:${size}px;cursor:pointer` });
  const ctx = c.getContext('2d');
  const info = h('p', { class: 'center' }, 'แตะไข่ 3 ครั้งเพื่อฟัก!');
  let shake = 0;
  const t0 = performance.now();
  const draw = (ms) => {
    if (!c.isConnected && ms - t0 > 500) return;
    const t = (ms - t0) / 1000;
    shake = Math.max(0, shake - 0.05);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.translate(size / 2, size * 0.55);
    ctx.rotate(Math.sin(t * 30) * shake * 0.3 + Math.sin(t * 2) * 0.05);
    const g = ctx.createRadialGradient(-15, -25, 5, 0, 0, 70);
    g.addColorStop(0, '#fffdf5');
    g.addColorStop(1, '#f3dcb8');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, 52, 66, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c9a26a';
    ctx.lineWidth = 3;
    ctx.stroke();
    for (const [x, y, r, col] of [
      [-20, -20, 9, '#ff9ac1'],
      [18, 5, 11, '#8fd3ff'],
      [-8, 30, 8, '#ffd34d'],
      [22, -35, 6, '#7fd6a8'],
    ]) {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    if (taps > 0) {
      ctx.strokeStyle = '#8a6a52';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-40, -5);
      ctx.lineTo(-25, -15);
      ctx.lineTo(-12, 0);
      if (taps > 1) {
        ctx.lineTo(4, -14);
        ctx.lineTo(18, 2);
        ctx.lineTo(34, -12);
      }
      ctx.stroke();
    }
    ctx.restore();
    requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);
  const m = modal([h('h2', {}, '🥚 ไข่ปริศนา'), c, info, btn('ไว้ทีหลัง', () => m.close(), 'ghost back small')]);
  c.addEventListener('click', () => {
    taps++;
    shake = 1;
    sfx.tap();
    if (taps < 3) return;
    const r = hatchEgg(S, app.now(), app.rng);
    sfx.hatch();
    saveGame(S);
    m.close();
    if (r.treasure) {
      modal([h('h2', {}, '💰 สมบัติ!'), h('p', { class: 'center' }, 'มีสัตว์ครบทุกตัวแล้ว ในไข่เลยมีสมบัติ'), h('p', { class: 'center', style: 'font-size:1.3rem' }, `+${r.treasure.coins}🪙  +${r.treasure.crystals}💎`)]);
      app.cur?.refresh?.();
      return;
    }
    const p = r.pet;
    const sp = SPECIES[p.species];
    const done = modal(
      [
        h('h2', {}, `🎉 ได้${sp.name}!`),
        petCanvas(p, 200, { mood: 'happy' }),
        h('p', { class: 'center' }, `${sp.kind} · ${sp.desc}`),
        h(
          'div',
          { class: 'row', style: 'justify-content:center' },
          btn('ไว้ที่บ้านพักก่อน', () => done.close(), 'ghost'),
          btn(`เลี้ยง${sp.name}เลย!`, () => {
            switchPet(S, p.id, app.now(), app.rng);
            saveGame(S);
            done.close();
            app.go('home');
          }, 'mint'),
        ),
      ],
      { dismiss: false, onClose: () => app.cur?.refresh?.() },
    );
    setTimeout(() => sfx.voice(p.species), 300);
  });
}

// ---------------- missions ----------------

export function missionsSheet(app) {
  const S = app.S;
  const d = S.daily;
  sheet([
    h('h3', {}, `📋 ภารกิจวันนี้ ${d.streak > 1 ? `· เข้าเกมต่อเนื่อง ${d.streak} วัน 🔥` : ''}`),
    h(
      'div',
      { style: 'display:flex;flex-direction:column;gap:0.5rem' },
      (d.missions || []).map((m) => {
        const M = MISSIONS[m.id];
        return h('div', { class: 'item-row' }, h('span', { class: 'e' }, m.done ? '✅' : M.icon), h('div', { class: 'info' }, h('b', {}, `${M.name} ${m.prog}/${M.goal}`), bar((m.prog / M.goal) * 100, m.done ? '' : 'exp')), h('span', { class: 'chip' }, `+${MISSION_REWARD.coins}🪙 +${MISSION_REWARD.exp}⭐`));
      }),
    ),
    h('p', { class: 'muted center' }, `ทำครบ 3 อย่างได้โบนัส +${ALL_DONE_REWARD.crystals}💎 ${d.bonus ? '✅ ได้แล้ว!' : ''} · ภารกิจใหม่ทุกวัน`),
  ]);
}

// ---------------- album ----------------

const FORMS = [
  [1, null],
  [4, 'fighter'],
  [4, 'sage'],
  [4, 'charm'],
  [8, 'fighter'],
  [8, 'sage'],
  [8, 'charm'],
];

function albumCanvas(form, seen) {
  const size = 110;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const c = h('canvas', { width: size * dpr, height: size * dpr });
  const ctx = c.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const wide = form.species === 'chako';
  drawPet(ctx, form, size * (wide ? 0.44 : 0.5), size * 0.92, size * (wide ? 0.62 : 0.8), { t: 0.4, shadow: seen });
  if (!seen) {
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = '#d9cbbb';
    ctx.fillRect(0, 0, size, size);
  }
  return c;
}

export function albumModal(app) {
  const S = app.S;
  const total = SPECIES_IDS.length * FORMS.length;
  const seenCount = S.album.length;
  const slots = SPECIES_IDS.flatMap((sp) =>
    FORMS.map(([lv, br]) => {
      const id = br ? `${sp}-${lv < 8 ? 1 : 2}-${br}` : `${sp}-baby`;
      const seen = S.album.includes(id);
      return h('div', { class: 'slot' }, albumCanvas({ species: sp, level: lv, branch: br }, seen), seen ? formName(sp, lv, br) : '???');
    }),
  );
  const badges = AREAS.map((a) => h('span', { class: `chip ${S.badges.includes(a.id) ? 'good' : ''}` }, S.badges.includes(a.id) ? `🏅 ${a.name}` : `🔒 ${a.name}`));
  const m = modal([
    h('h2', {}, '📖 สมุดสะสม'),
    h('p', { class: 'center' }, `ร่างที่เคยเห็น ${seenCount}/${total} · 🏆 อันดับ ${S.arenaRank}/10 · ⚔️ ชนะ ${S.record.wins} แพ้ ${S.record.losses} · 💉 สติกเกอร์ ${S.stickers}`),
    h('div', { class: 'row', style: 'justify-content:center' }, badges),
    h('div', { class: 'album' }, slots),
    btn('ปิด', () => m.close(), 'ghost back'),
  ]);
  m.el.style.width = 'min(100%, 52rem)';
}

// ---------------- settings ----------------

export function settingsModal(app) {
  const S = app.S;
  const toggle = (kind, label) =>
    btn(`${label}: ${getAudioSettings()[kind] ? 'เปิด' : 'ปิด'}`, (e) => {
      setAudio(kind, !getAudioSettings()[kind]);
      e.currentTarget.textContent = `${label}: ${getAudioSettings()[kind] ? 'เปิด' : 'ปิด'}`;
    }, 'small ghost');

  const backup = () => {
    const code = encodeBackup(S);
    const ta = h('textarea', { readonly: true }, code);
    const mm = modal([
      h('h2', {}, '💾 รหัสสำรองเซฟ'),
      h('p', { class: 'center muted' }, 'คัดลอกรหัสนี้ไปเก็บไว้ (เช่น LINE Keep หรือโน้ต) ถ้าเซฟหายหรือเปลี่ยนเครื่อง ใช้รหัสนี้กู้คืนได้'),
      ta,
      h(
        'div',
        { class: 'row', style: 'justify-content:center' },
        btn('📋 คัดลอก', () => {
          const ok = () => toast('คัดลอกแล้ว!', 'good');
          if (navigator.clipboard?.writeText) navigator.clipboard.writeText(code).then(ok, () => (ta.select(), document.execCommand?.('copy'), ok()));
          else {
            ta.select();
            document.execCommand?.('copy');
            ok();
          }
        }, 'sky'),
        navigator.share ? btn('📨 แชร์', () => navigator.share({ text: code }).catch(() => {}), 'mint') : null,
        btn('ปิด', () => mm.close(), 'ghost back'),
      ),
    ]);
    store.set('lastBackup', app.now());
  };

  const restore = () => {
    const ta = h('textarea', { placeholder: 'วางรหัสสำรองเซฟ (YH1.…)' });
    const mm = modal([
      h('h2', {}, '🔑 กู้คืนเซฟ'),
      h('p', { class: 'center muted' }, 'เซฟปัจจุบันจะถูกแทนที่ด้วยเซฟจากรหัส'),
      ta,
      h('div', { class: 'row', style: 'justify-content:center' }, btn('ยกเลิก', () => mm.close(), 'ghost back'), btn('กู้คืน', () => {
        try {
          const NS = decodeBackup(ta.value);
          Object.keys(S).forEach((k) => delete S[k]);
          Object.assign(S, NS);
          saveGame(S);
          mm.close();
          toast('กู้คืนเซฟสำเร็จ! 🎉', 'good');
          app.go('home');
        } catch (e) {
          sfx.no();
          toast(e.message, 'bad');
        }
      }, 'mint')),
    ]);
  };

  const moveTiles = AREAS.map((ar) =>
    h('button', { class: `tile${ar.id === S.home ? ' on' : ''}`, type: 'button', onclick: () => {
      moveHome(S, ar.id);
      saveGame(S);
      sfx.sparkle();
      toast(`ย้ายบ้านไป ${ar.icon} ${ar.name} แล้ว!`, 'good');
      m.close();
    } }, h('div', { class: 'big-emoji' }, ar.icon), h('div', { class: 'name' }, ar.name)),
  );

  const reset = () =>
    confirmBox('เริ่มเกมใหม่ทั้งหมด? สัตว์เลี้ยงและของทั้งหมดจะหายไป (สำรองเซฟก่อนนะ)', 'ลบและเริ่มใหม่', () =>
      confirmBox('แน่ใจจริงๆ ใช่ไหม? 🥺', 'ใช่ เริ่มใหม่', () => {
        store.set('save', null);
        location.reload();
      }),
    );

  const m = modal([
    h('h2', {}, '⚙️ ตั้งค่า'),
    h('div', { class: 'row', style: 'justify-content:center' }, toggle('sfx', '🔊 เสียง'), toggle('music', '🎵 เพลง')),
    h('h3', {}, '💾 เซฟเกม'),
    h('p', { class: 'muted' }, 'เซฟอยู่ในเครื่องนี้อัตโนมัติ · กดสำรองไว้เป็นระยะ กันเซฟหาย'),
    h('div', { class: 'row' }, btn('💾 สำรองเซฟ', backup, 'sky small'), btn('🔑 กู้คืนเซฟ', restore, 'ghost small')),
    h('h3', {}, `🏡 ย้ายบ้าน (ตอนนี้: ${areaById(S.home).icon} ${areaById(S.home).name})`),
    h('div', { class: 'grid', style: 'grid-template-columns:repeat(5,1fr)' }, moveTiles),
    needsIosHint() ? iosHint() : null,
    h('div', { class: 'row spread' }, btn('🗑️ เริ่มใหม่', reset, 'ghost small'), btn('ปิด', () => m.close(), 'mint')),
    h('p', { class: 'muted center' }, "บ้านโยเกิร์ต · Yogurt's House v1"),
  ]);
}
