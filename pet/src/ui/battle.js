// Turn-based battle screen: pick a move, watch both sides act, repeat.
import { SKILLS } from '../data/skills.js';
import { ELEMENT_INFO, elementMul } from '../data/species.js';
import { ITEMS } from '../data/items.js';
import { createBattle, petFighter, resolveRound, aiChoose, canUse, BASIC, SP_MAX } from '../sim/battle.js';
import { battleDone } from '../sim/care.js';
import { count, consume } from '../sim/economy.js';
import { timeOfDay } from '../sim/time.js';
import { drawScene } from '../render/scenes.js';
import { drawPet } from '../render/pets.js';
import { drawFoe } from '../render/enemies.js';
import { sfx, music } from '../audio.js';
import { h, btn, modal, petCanvas, confirmBox } from './ui.js';
import { skillLine } from './town.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const POTIONS = ['potion', 'bigPotion'];

// arg: { kind, area?, rank?, level, foe, back, backArg, title }
export function battleScreen(app, arg) {
  const S = app.S;
  const pet = app.pet();
  const potions = POTIONS.reduce((n, id) => n + count(S, id), 0);
  const me = petFighter(pet, { items: potions });
  const foe = arg.foe;
  const b = createBattle(me, foe, Math.floor(Math.random() * 1e9));
  const disp = [me.hp, foe.hp];
  const fx = [
    { lunge: 0, hurt: 0, mood: null },
    { lunge: 0, hurt: 0, mood: null },
  ];
  let floats = [];
  let busy = false;
  let ended = false;
  app.busy = 1;

  const boxes = [h('div', { class: 'fbox' }), h('div', { class: 'fbox', style: 'text-align:right' })];
  const log = h('div', { class: 'battle-log' }, `${arg.title || 'ต่อสู้!'} · ${foe.name} ปรากฏตัว!`);
  const moves = h('div', { class: 'moves' });
  const sub = h('div', { class: 'subbar' });
  const el = h('div', { class: 'layer', style: 'gap:0.5rem' }, h('div', { class: 'battle-top' }, boxes), log, moves, sub);

  function renderBoxes() {
    b.f.forEach((f, i) => {
      const el2 = ELEMENT_INFO[f.element] || ELEMENT_INFO.neutral;
      const pct = (disp[i] / f.maxHp) * 100;
      const st = [];
      if (f.st.shield) st.push('🛡️');
      if (f.st.defDown) st.push('⬇️');
      if (f.st.sleep) st.push('💤');
      if (f.st.focus) st.push('🎯');
      boxes[i].replaceChildren(
        h('div', { class: 'nm' }, `${el2.icon} ${f.name}`),
        h('div', { class: 'muted' }, `Lv${f.level} ${st.join('')}`),
        h('div', { class: `hp${pct < 30 ? ' low' : ''}` }, h('i', { style: `width:${Math.max(0, pct)}%` })),
        h('div', { class: 'row spread', style: 'flex-wrap:nowrap' }, h('span', { class: 'muted' }, `${Math.max(0, Math.round(disp[i]))}/${f.maxHp}`), h('span', { class: 'sp' }, 'SP', ...Array.from({ length: SP_MAX }, (_, k) => h('i', { class: k < f.sp ? 'on' : '' })))),
      );
    });
  }

  function renderMoves() {
    const ids = [...me.skills, BASIC];
    moves.replaceChildren(
      ...ids.map((id) => {
        const s = SKILLS[id];
        const el2 = ELEMENT_INFO[s.element === 'self' ? me.element : s.element] || ELEMENT_INFO.neutral;
        const attack = s.kind === 'physical' || s.kind === 'magic';
        const mul = attack ? elementMul(s.element === 'self' ? me.element : s.element, foe.element) : 1;
        const L = skillLine(id);
        return h(
          'button',
          { class: 'move', type: 'button', style: `background:${el2.color}`, disabled: busy || ended || !canUse(me, id), onclick: () => choose({ type: 'skill', id }) },
          h('span', { class: 'ic' }, s.icon),
          h('span', { class: 'tx' }, h('b', {}, s.name), h('small', {}, L.desc)),
          mul > 1 ? h('span', { class: 'hint up' }, '▲ได้เปรียบ') : mul < 1 ? h('span', { class: 'hint down' }, '▼') : null,
          h('span', { class: 'cost' }, s.cost ? `SP ${s.cost}` : 'ฟรี'),
        );
      }),
    );
    const potionBtn = btn(`🧪 ยา (${me.items})`, openItems, 'small sky', { disabled: busy || ended || !me.items });
    sub.replaceChildren(potionBtn, arg.kind === 'wild' || arg.kind === 'boss' ? btn('🏃 หนี', run, 'small ghost', { disabled: busy || ended }) : btn('🏳️ ยอมแพ้', run, 'small ghost', { disabled: busy || ended }));
  }

  function openItems() {
    const m = modal([
      h('h2', {}, '🧪 ใช้ยา'),
      ...POTIONS.filter((id) => count(S, id) > 0).map((id) =>
        h('div', { class: 'item-row' }, h('span', { class: 'e' }, ITEMS[id].icon), h('div', { class: 'info' }, h('b', {}, ITEMS[id].name), h('span', { class: 'muted' }, `ฟื้นพลัง ${ITEMS[id].heal * 100}% · มี ${count(S, id)}`)), btn('ใช้', () => {
          m.close();
          choose({ type: 'item', id, heal: ITEMS[id].heal });
        }, 'small mint')),
      ),
      btn('ปิด', () => m.close(), 'ghost back'),
    ]);
  }

  function run() {
    confirmBox(arg.kind === 'wild' || arg.kind === 'boss' ? 'หนีออกจากการต่อสู้? (ไม่ได้รางวัล)' : 'ยอมแพ้ใช่ไหม?', 'ใช่', () => {
      ended = true;
      pet.hpPct = Math.max(0, me.hp / me.maxHp);
      app.save();
      app.busy = 0;
      app.go(arg.back, arg.backArg);
    }, 'ghost');
  }

  const say = (text) => (log.textContent = text);
  const float = (who, text, color) => floats.push({ who, text, color, age: 0 });

  async function choose(action) {
    if (busy || ended) return;
    busy = true;
    renderMoves();
    const foeAction = aiChoose(b, 1);
    disp[0] = me.hp;
    disp[1] = foe.hp;
    const ev = resolveRound(b, [action, foeAction]);
    // the potion is only used up if the pet actually drank it (not asleep)
    if (action.type === 'item' && ev.some((e) => e.t === 'item' && e.who === 0)) consume(S, action.id);
    await play(ev);
    disp[0] = me.hp;
    disp[1] = foe.hp;
    renderBoxes();
    busy = false;
    if (b.over) finish();
    else renderMoves();
  }

  async function play(ev) {
    for (const e of ev) {
      const who = e.who;
      const f = b.f[who];
      const name = who === undefined ? '' : f.name;
      switch (e.t) {
        case 'use': {
          const s = SKILLS[e.id];
          say(`${name} ใช้ ${s.icon} ${s.name}!`);
          fx[who].lunge = 1;
          fx[who].mood = 'attack';
          if (s.kind === 'magic') sfx.magic();
          await wait(380);
          fx[who].mood = null;
          break;
        }
        case 'hit': {
          disp[who] = Math.max(0, disp[who] - e.dmg);
          fx[who].hurt = 1;
          fx[who].mood = 'hurt';
          sfx.hit(e.crit || e.eff === 'strong');
          float(who, `-${e.dmg}`, e.crit ? '#ff3b3b' : '#ffffff');
          const notes = [e.crit && 'คริติคอล!', e.eff === 'strong' && 'ได้เปรียบธาตุ!', e.eff === 'weak' && 'ไม่ค่อยได้ผล…', e.shield && 'โล่ช่วยกันไว้!'].filter(Boolean);
          if (notes.length) say(notes.join(' '));
          renderBoxes();
          await wait(420);
          fx[who].mood = null;
          break;
        }
        case 'miss':
          sfx.miss();
          float(who, 'หลบได้!', '#4fa3f0');
          say(`${name} หลบได้!`);
          await wait(450);
          break;
        case 'heal':
          disp[who] = Math.min(f.maxHp, disp[who] + e.amt);
          sfx.heal();
          float(who, `+${e.amt}`, '#3fbf8a');
          renderBoxes();
          await wait(450);
          break;
        case 'item':
          say(`${name} ใช้ ${ITEMS[e.id]?.icon || '🧪'} ${ITEMS[e.id]?.name || 'ยา'}`);
          await wait(350);
          break;
        case 'shield':
          sfx.shield();
          say(`${name} ตั้งโล่ป้องกัน! 🛡️`);
          renderBoxes();
          await wait(450);
          break;
        case 'sleep':
          sfx.sleep();
          say(`${name} หลับไปแล้ว 💤`);
          renderBoxes();
          await wait(450);
          break;
        case 'asleep':
          say(`${name} หลับอยู่… 💤`);
          fx[who].mood = 'sleep';
          await wait(650);
          fx[who].mood = null;
          break;
        case 'fail':
          say('แต่ไม่ได้ผล!');
          await wait(400);
          break;
        case 'focus':
          sfx.sparkle();
          say(`${name} รวมสมาธิ! ท่าต่อไปแรงขึ้น 🎯`);
          renderBoxes();
          await wait(450);
          break;
        case 'debuff':
          say(`ป้องกันของ ${name} ลดลง! ⬇️`);
          renderBoxes();
          await wait(450);
          break;
        case 'faint':
          say(`${name} หมดแรงแล้ว!`);
          await wait(600);
          break;
        case 'timeout':
          say('หมดเวลา! ตัดสินจากพลังที่เหลือ');
          await wait(600);
          break;
        default:
          break;
      }
    }
  }

  function finish() {
    ended = true;
    renderMoves();
    const win = b.winner === 0;
    fx[0].mood = win ? 'cheer' : 'sad';
    win ? sfx.win() : sfx.lose();
    music(null);
    const r = battleDone(S, pet, { kind: arg.kind, area: arg.area, rank: arg.rank, level: arg.level }, b, Math.random);
    app.handle(r.events);
    app.save();
    const rw = r.reward;
    const lines = [[rw.coins && `+${rw.coins}🪙`, rw.exp && `+${rw.exp}⭐`, rw.crystals && `+${rw.crystals}💎`].filter(Boolean).join('  ')];
    if (r.badge) lines.push(`🏅 ได้เหรียญตรา ${r.area.icon} ${r.area.name}!`);
    if (r.firstClear) lines.push(`🏆 ชนะ${foe.name}! อันดับลานประลอง ${S.arenaRank}/10${S.arenaRank >= 10 ? ' แชมป์! 👑' : ''}`);
    if (!win) lines.push('ไม่เป็นไรนะ ไปฝึกเพิ่มหรือใช้ยาแล้วลองใหม่!');
    if (pet.hpPct < 0.5) lines.push('🏥 ไปโรงพยาบาลฟื้นพลังฟรีได้นะ');
    setTimeout(() => {
      const m = modal(
        [
          h('h2', {}, win ? 'ชนะแล้ว! 🎉' : 'แพ้แล้ว… 😢'),
          petCanvas(pet, 150, { mood: win ? 'cheer' : 'sad' }),
          ...lines.map((l) => h('p', { class: 'center', style: 'font-size:1.1rem' }, l)),
          btn('ตกลง', () => m.close(), 'big mint'),
        ],
        {
          dismiss: false,
          onClose: () => {
            app.busy = 0;
            app.go(arg.back, arg.backArg);
          },
        },
      );
    }, 900);
  }

  // ---------------- canvas ----------------
  const area = arg.area || S.home;
  const tod = timeOfDay(app.now()) === 'night' ? 'evening' : timeOfDay(app.now());
  const view = {
    draw(ctx, W, H, t, dt) {
      const s = drawScene(ctx, area, W, H, { tod, t });
      const size = Math.min(W * 0.34, H * 0.27);
      const y = Math.min(s.stage, H * 0.66);
      const pos = [
        { x: W * 0.27, y },
        { x: W * 0.73, y: y - size * 0.06 },
      ];
      b.f.forEach((f, i) => {
        const e = fx[i];
        e.lunge = Math.max(0, e.lunge - dt * 2.6);
        e.hurt = Math.max(0, e.hurt - dt * 2.5);
        const dir = i === 0 ? 1 : -1;
        const lx = Math.sin(e.lunge * Math.PI) * size * 0.35 * dir;
        const shake = e.hurt ? Math.sin(t * 70) * size * 0.04 : 0;
        const x = pos[i].x + lx + shake;
        const alpha = e.hurt && Math.floor(t * 20) % 2 ? 0.45 : disp[i] <= 0 && ended ? 0.35 : 1;
        const mood = e.mood || (f.st.sleep ? 'sleep' : disp[i] / f.maxHp < 0.25 ? 'sad' : 'idle');
        if (f.st.shield) {
          ctx.fillStyle = 'rgba(120,190,255,0.25)';
          ctx.strokeStyle = 'rgba(120,190,255,0.8)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.ellipse(pos[i].x, pos[i].y - size * 0.4, size * 0.55, size * 0.55, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        if (f.look?.pet) drawPet(ctx, f.look.pet, x, pos[i].y, size, { mood, t, facing: dir, alpha });
        else drawFoe(ctx, f.look || { emoji: '❓' }, f.element, x, pos[i].y, size * 0.85, { t, mood: e.mood === 'hurt' ? 'hurt' : e.mood === 'attack' ? 'attack' : 'idle', facing: dir, alpha });
      });
      floats = floats.filter((fl) => (fl.age += dt) < 1.1);
      ctx.textAlign = 'center';
      ctx.font = `700 ${Math.max(26, size * 0.17)}px Mitr, sans-serif`;
      for (const fl of floats) {
        const p = pos[fl.who];
        ctx.globalAlpha = Math.min(1, (1.1 - fl.age) * 2);
        ctx.lineWidth = 6;
        ctx.strokeStyle = '#3b2a3a';
        ctx.strokeText(fl.text, p.x, p.y - size * 0.95 - fl.age * 50);
        ctx.fillStyle = fl.color;
        ctx.fillText(fl.text, p.x, p.y - size * 0.95 - fl.age * 50);
      }
      ctx.globalAlpha = 1;
    },
  };

  renderBoxes();
  renderMoves();
  return { el, view, music: 'battle', leave: () => (app.busy = 0) };
}
