// 🏫 School games: 🎵 Simon (repeat the sequence to learn a skill) and
// 📚 the library quiz (5 questions about animals and nature).
import { QUIZ } from '../data/quiz.js';
import { sfx } from '../audio.js';
import { h, btn, shuffle } from '../ui/ui.js';
import { intro, result } from './common.js';

const PADS = [
  { e: '🐾', c: '#ff7a59' },
  { e: '🎵', c: '#4fa3f0' },
  { e: '⭐', c: '#ffc93c' },
  { e: '💖', c: '#3fbf8a' },
];

const schoolBg = {
  draw(ctx, W, H) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#fdf0d8');
    g.addColorStop(1, '#f6dcb5');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#2f4a3c';
    ctx.fillRect(W * 0.1, H * 0.06, W * 0.8, H * 0.1);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = `500 ${Math.max(16, H * 0.03)}px Mitr, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('โรงเรียนสัตว์น้อย 🏫', W / 2, H * 0.11);
  },
};

// arg: { back, length, skill, finish(ok) → { lines } }
export function simonGame(app, arg) {
  app.busy = 1;
  const len = arg.length || 4;
  const seq = Array.from({ length: len }, () => Math.floor(Math.random() * 4));
  let shown = 0;
  let input = [];
  let tries = 2;
  let accepting = false;
  const msg = h('div', { class: 'battle-log' }, 'ดูลำดับให้ดีนะ…');
  const pads = PADS.map((p, i) => h('button', { class: 'pad', type: 'button', style: `background:${p.c}`, onclick: () => press(i) }, p.e));
  const el = h('div', { class: 'layer' }, h('div', { class: 'mg-top' }, h('div', { class: 'mg-stat' }, `🎵 จำลำดับ ${len} ตัว`), btn('✕', () => (app.busy = 0, app.go(arg.back)), 'round ghost back')), msg, h('div', { class: 'pads' }, pads));

  const light = (i, ms = 380) => {
    pads[i].classList.add('lit');
    sfx.pad(i);
    setTimeout(() => pads[i].classList.remove('lit'), ms);
  };

  function play() {
    accepting = false;
    input = [];
    shown = 0;
    msg.textContent = 'ดูลำดับให้ดีนะ… 👀';
    const step = () => {
      if (shown >= seq.length) {
        accepting = true;
        msg.textContent = 'ถึงตาเรา! กดตามลำดับ 👆';
        return;
      }
      light(seq[shown++]);
      setTimeout(step, 620);
    };
    setTimeout(step, 700);
  }

  function press(i) {
    if (!accepting) return;
    light(i, 200);
    input.push(i);
    const k = input.length - 1;
    if (input[k] !== seq[k]) {
      accepting = false;
      tries--;
      sfx.no();
      if (tries > 0) {
        msg.textContent = 'ผิดนิดเดียว! ลองดูอีกครั้งนะ 💪';
        setTimeout(play, 900);
      } else {
        const r = arg.finish(false);
        result(app, 'ยังจำไม่ได้ ลองใหม่นะ', { ok: false, ...r }, arg.back);
      }
      return;
    }
    if (input.length === seq.length) {
      accepting = false;
      const r = arg.finish(true);
      setTimeout(() => result(app, 'เรียนสำเร็จ! 🎓', r, arg.back), 400);
    }
  }

  intro(app, '🎵 เรียนท่าใหม่', [`ดูไฟกะพริบ ${len} ครั้ง แล้วกดตามให้ถูกลำดับ`, 'ผิดได้ 1 ครั้ง'], play, arg.back);
  return { el, view: schoolBg, music: null, leave: () => (app.busy = 0) };
}

// arg: { back, finish(correct) → { lines } }
export function quizGame(app, arg) {
  app.busy = 1;
  const qs = shuffle(QUIZ).slice(0, 5);
  let i = 0;
  let correct = 0;
  const box = h('div', { class: 'panel', style: 'width:min(100%,40rem);align-self:center;margin:auto 0' });
  const head = h('div', { class: 'mg-top' });
  const el = h('div', { class: 'layer' }, head, box);

  function show() {
    const q = qs[i];
    head.replaceChildren(h('div', { class: 'mg-stat' }, `📚 ข้อ ${i + 1}/5`), h('div', { class: 'mg-stat' }, `✅ ${correct}`), btn('✕', () => (app.busy = 0, app.go(arg.back)), 'round ghost back'));
    const answers = shuffle(q.a.map((text, k) => ({ text, ok: k === 0 })));
    let done = false;
    const btns = answers.map((a) =>
      h(
        'button',
        {
          class: 'btn ghost block',
          type: 'button',
          onclick: (e) => {
            if (done) return;
            done = true;
            if (a.ok) {
              correct++;
              sfx.coin();
              e.currentTarget.className = 'btn mint block';
            } else {
              sfx.no();
              e.currentTarget.className = 'btn coral block';
              btns[answers.findIndex((x) => x.ok)].className = 'btn mint block';
            }
            setTimeout(next, 1100);
          },
        },
        a.text,
      ),
    );
    box.replaceChildren(h('div', { class: 'quiz-q' }, q.q), h('div', { class: 'quiz-a' }, btns));
  }

  function next() {
    i++;
    if (i < qs.length) show();
    else {
      const r = arg.finish(correct);
      result(app, correct === 5 ? 'เต็ม 5 เลย! 🌟' : `ตอบถูก ${correct}/5`, r, arg.back);
    }
  }

  show();
  return { el, view: schoolBg, music: null, leave: () => (app.busy = 0) };
}
