// First launch: choose a pet, name it, get a random home. Or restore a backup.
import { SPECIES, SPECIES_IDS, ELEMENT_INFO } from '../data/species.js';
import { areaById, AREA_IDS } from '../data/areas.js';
import { newSave, adopt, decodeBackup, saveGame } from '../state.js';
import { drawScene } from '../render/scenes.js';
import { timeOfDay } from '../sim/time.js';
import { sfx } from '../audio.js';
import { h, btn, modal, petCanvas, toast } from './ui.js';
import { iosHint, needsIosHint } from './overlays.js';

const STRENGTH = {
  yogurt: 'เร็ว หลบเก่ง',
  phidam: 'ตีคริติคอลแรง',
  pongfu: 'ทน ป้องกันเก่ง',
  fuji: 'ฉลาด เวทแรง',
  chako: 'แรงที่สุด แต่ช้า',
};

export function startScreen(app) {
  let pick = 'yogurt';
  const name = h('input', { type: 'text', maxlength: 16, value: SPECIES[pick].name, 'aria-label': 'ชื่อสัตว์เลี้ยง' });
  let named = false;
  name.addEventListener('input', () => (named = true));

  const tiles = SPECIES_IDS.map((id) => {
    const sp = SPECIES[id];
    const el = ELEMENT_INFO[sp.element];
    const t = h(
      'button',
      {
        class: `tile${id === pick ? ' on' : ''}`,
        type: 'button',
        onclick: () => {
          sfx.voice(id);
          pick = id;
          tiles.forEach((x) => x.classList.toggle('on', x === t));
          if (!named) name.value = sp.name;
        },
      },
      petCanvas({ species: id, level: 3, branch: null }, 120, { mood: () => (id === pick ? 'happy' : 'idle') }),
      h('div', { class: 'name' }, sp.name),
      h('div', { class: 'muted' }, sp.kind),
      h('span', { class: 'chip' }, `${el.icon} ธาตุ${el.name}`),
      h('div', { class: 'muted' }, STRENGTH[id]),
    );
    return t;
  });

  const start = () => {
    const now = app.now();
    const S = app.S && !app.S.pets.length ? app.S : newSave(now, app.rng);
    const pet = adopt(S, pick, now, name.value.trim() || SPECIES[pick].name);
    app.S = S;
    saveGame(S);
    sfx.levelUp();
    const area = areaById(S.home);
    const m = modal(
      [
        h('h2', {}, `ยินดีต้อนรับ ${pet.name}! 🎉`),
        petCanvas(pet, 180, { mood: 'happy' }),
        h('p', { class: 'center' }, `บ้านที่สุ่มได้คือ`),
        h('h2', {}, `${area.icon} ${area.name}`),
        h('p', { class: 'center muted' }, area.desc),
        h('p', { class: 'center' }, 'ดูแลให้อิ่ม สะอาด มีความสุข แล้วจะโตไปจนถึง Lv10 ใน 2 วัน! ตอนกลางคืน (20:00–07:00) สัตว์จะนอนหลับ'),
        needsIosHint() ? iosHint() : null,
        btn('ไปที่บ้านกัน! 🏠', () => m.close(), 'big mint'),
      ],
      { dismiss: false, onClose: () => app.go('home') },
    );
  };

  const restore = () => {
    const ta = h('textarea', { placeholder: 'วางรหัสสำรองเซฟ (ขึ้นต้นด้วย YH1.)' });
    const m = modal([
      h('h2', {}, '🔑 กู้คืนเซฟ'),
      h('p', { class: 'muted center' }, 'วางรหัสที่เคยกด "สำรองเซฟ" ไว้'),
      ta,
      h(
        'div',
        { class: 'row', style: 'justify-content:center' },
        btn('ยกเลิก', () => m.close(), 'ghost back'),
        btn('กู้คืน', () => {
          try {
            const S = decodeBackup(ta.value);
            app.S = S;
            saveGame(S);
            m.close();
            toast('กู้คืนเซฟสำเร็จ! 🎉', 'good');
            app.go('home');
          } catch (e) {
            sfx.no();
            toast(e.message, 'bad');
          }
        }, 'mint'),
      ),
    ]);
  };

  const el = h(
    'div',
    { class: 'screen', style: 'background:rgba(255,247,236,0.82)' },
    h('div', { class: 'center' }, h('div', { style: 'font-size:3rem' }, '🏠'), h('h2', { style: 'margin:0;font-size:2rem' }, 'บ้านโยเกิร์ต'), h('div', { class: 'muted' }, "Yogurt's House · เลือกสัตว์เลี้ยงตัวแรก")),
    h('div', { class: 'grid', style: 'grid-template-columns:repeat(auto-fill,minmax(min(10rem,30%),1fr))' }, tiles),
    h('div', { class: 'panel row' }, h('b', {}, 'ตั้งชื่อ:'), h('div', { class: 'grow' }, name)),
    h('p', { class: 'muted center' }, 'อีกตัวจะได้มาจาก 🥚 ไข่ปริศนา เมื่อเลี้ยงถึง Lv5 และ Lv10'),
    h('div', { class: 'row', style: 'justify-content:center' }, btn('เริ่มเลี้ยง! 🐾', start, 'big coral'), btn('🔑 กู้คืนเซฟ', restore, 'ghost small')),
  );

  // background: the five areas slowly taking turns
  const view = {
    draw(ctx, W, H, t) {
      const area = AREA_IDS[Math.floor(t / 6) % AREA_IDS.length];
      drawScene(ctx, area, W, H, { tod: timeOfDay(app.now()), t });
    },
  };
  return { el, view, music: 'home' };
}
