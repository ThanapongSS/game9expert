// Screen builders. Each returns { el, tick? } — tick(time) runs every frame
// while the screen is visible (for animated previews).
import { CHARACTERS, ROSTER, COMING_SOON, STAGES } from '../characters/index.js';
import { W, H, VERSION } from '../config.js';
import { t, getLang } from '../i18n.js';
import { drawPortrait, drawPreview } from '../render/puppet.js';
import { drawSilhouette } from '../render/dolls.js';
import { drawStage } from '../render/stage.js';
import { getAudioSettings } from '../audio/audio.js';
import { h, button, segmented } from './dom.js';

const STAT_KEYS = ['power', 'speed', 'defense', 'range'];

function portraitCanvas(id, size = 96, { alt = false, facing = 1, expr = 'normal' } = {}) {
  const c = h('canvas', { width: size, height: size, class: 'portrait' });
  const ctx = c.getContext('2d');
  if (CHARACTERS[id]) drawPortrait(ctx, id, size / 2, size / 2, size * 0.92, { alt, facing, expr });
  else drawSilhouette(ctx, size / 2, size * 0.98, size / 175, 'rgba(60,30,90,0.55)');
  return c;
}

function header(title, onBack) {
  return h('div', { class: 'head' },
    onBack ? button('‹ ' + t('back'), onBack, 'back small') : h('span'),
    h('h2', null, title),
    h('span'));
}

export function titleScreen({ onStart }) {
  const el = h('div', { class: 'screen title', onpointerup: onStart },
    h('div', { class: 'logo' },
      h('div', { class: 'logo-main' }, t('game.title')),
      h('div', { class: 'logo-sub' }, t('game.sub'))),
    h('div', { class: 'tap blink' }, t('title.tap')),
    h('div', { class: 'ver' }, 'v' + VERSION));
  return { el };
}

export function menuScreen({ onQuick, onArcade, onOnline, onSettings }) {
  const el = h('div', { class: 'screen menu' },
    h('div', { class: 'logo small' },
      h('div', { class: 'logo-main' }, t('game.title')),
      h('div', { class: 'logo-sub' }, t('game.sub'))),
    h('div', { class: 'menu-list' },
      button([h('b', null, '🥊 ' + t('menu.quick')), h('small', null, t('menu.quick.d'))], onQuick, 'big orange'),
      button([h('b', null, '🏆 ' + t('menu.arcade')), h('small', null, t('menu.arcade.d'))], onArcade, 'big purple'),
      button([h('b', null, '🌐 ' + t('menu.online')), h('small', null, t('menu.online.d'))], onOnline, 'big blue'),
      h('div', { class: 'row' },
        button('⚙️ ' + t('menu.settings'), onSettings, 'small ghost'),
        button('🏠 ' + t('menu.pet'), () => (location.href = 'pet/'), 'small ghost'))));
  return { el };
}

export function selectScreen({ title, initial = 'teddy', onConfirm, onBack, allowRandom = false, trophies = {}, confirmLabel }) {
  let sel = initial;
  const preview = h('canvas', { class: 'preview', width: 300, height: 300 });
  const pctx = preview.getContext('2d');
  const info = h('div', { class: 'info' });

  const renderInfo = () => {
    const c = CHARACTERS[sel];
    info.replaceChildren(
      h('div', { class: 'name' }, t('char.' + sel), trophies[sel] ? ' 🏆' : ''),
      h('div', { class: 'role' }, t('char.' + sel + '.role')),
      h('div', { class: 'stats' }, STAT_KEYS.map((k) => h('div', { class: 'stat' },
        h('span', null, t('stat.' + k)),
        h('i', null, [1, 2, 3, 4, 5].map((n) => h('b', { class: n <= c.ui[k] ? 'on' : '' })))))),
      h('div', { class: 'sp' }, '⭐ ' + t('special') + ': ', h('b', null, t('char.' + sel + '.sp'))));
  };

  const cards = h('div', { class: 'cards' },
    ROSTER.map((id) => {
      const card = h('button', {
        type: 'button',
        class: 'card' + (id === sel ? ' on' : ''),
        'data-char': id,
        onclick: () => {
          sel = id;
          cards.querySelectorAll('.card').forEach((x) => x.classList.toggle('on', x.dataset.char === id));
          renderInfo();
        },
      }, portraitCanvas(id, 96), h('span', null, t('char.' + id)), trophies[id] ? h('em', null, '🏆') : null);
      return card;
    }),
    COMING_SOON.map((id) => h('div', { class: 'card locked' }, portraitCanvas(id, 96), h('span', null, t('char.' + id)), h('em', { class: 'soon' }, t('select.soon')))));

  renderInfo();
  const el = h('div', { class: 'screen select' },
    header(title, onBack),
    h('div', { class: 'select-body' },
      h('div', { class: 'left' }, preview, info),
      h('div', { class: 'right' }, cards,
        h('div', { class: 'row' },
          allowRandom ? button('🎲 ' + t('select.random'), () => onConfirm(ROSTER[Math.floor(Math.random() * ROSTER.length)]), 'ghost') : null,
          button(confirmLabel || t('select.confirm') + ' ✔', () => onConfirm(sel), 'green confirm')))));

  const tick = (time) => {
    pctx.clearRect(0, 0, 300, 300);
    pctx.fillStyle = 'rgba(255,255,255,0.18)';
    pctx.beginPath();
    pctx.ellipse(150, 272, 90, 16, 0, 0, Math.PI * 2);
    pctx.fill();
    drawPreview(pctx, sel, 150, 270, 1.25, { time });
  };
  return { el, tick };
}

function stageThumb(stage) {
  const c = h('canvas', { width: 192, height: 108, class: 'thumb' });
  const ctx = c.getContext('2d');
  if (stage === 'random') {
    ctx.fillStyle = '#6a4a9a';
    ctx.fillRect(0, 0, 192, 108);
    ctx.font = '48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎲', 96, 56);
  } else {
    ctx.scale(192 / W, 108 / H);
    drawStage(ctx, stage, 1, 0);
  }
  return c;
}

export function setupScreen({ level, stage, onFight, onBack }) {
  let lv = level;
  let st = stage;
  const stages = h('div', { class: 'stages' });
  const renderStages = () => stages.replaceChildren(...[...STAGES, 'random'].map((s) => h('button', {
    type: 'button',
    class: 'stage-card' + (s === st ? ' on' : ''),
    onclick: () => {
      st = s;
      renderStages();
    },
  }, stageThumb(s), h('span', null, t('stage.' + s)))));
  renderStages();
  const el = h('div', { class: 'screen setup' },
    header(t('setup.title'), onBack),
    h('div', { class: 'panel' },
      h('label', null, t('setup.level')),
      segmented(['easy', 'normal', 'hard'].map((v) => ({ value: v, label: t('level.' + v) })), lv, (v) => (lv = v)),
      h('label', null, t('setup.stage')),
      stages,
      button(t('setup.fight') + ' 🥊', () => onFight({ level: lv, stage: st }), 'green big-ish')));
  return { el };
}

export function vsScreen({ p1, p2, alt2 = false, subtitle, onDone }) {
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    onDone();
  };
  const c1 = h('canvas', { width: 300, height: 300 });
  const c2 = h('canvas', { width: 300, height: 300 });
  const el = h('div', { class: 'screen vs', onpointerup: finish },
    h('div', { class: 'vs-side l' }, c1, h('div', { class: 'vs-name' }, t('char.' + p1))),
    h('div', { class: 'vs-mid' }, h('div', { class: 'vs-text' }, 'VS'), subtitle ? h('div', { class: 'vs-sub' }, subtitle) : null),
    h('div', { class: 'vs-side r' }, c2, h('div', { class: 'vs-name' }, t('char.' + p2))));
  const timer = setTimeout(finish, 1900);
  const tick = (time) => {
    for (const [c, id, facing, alt] of [[c1, p1, 1, false], [c2, p2, -1, alt2]]) {
      const ctx = c.getContext('2d');
      ctx.clearRect(0, 0, 300, 300);
      drawPreview(ctx, id, 150, 288, 1.3, { time, facing, alt });
    }
  };
  return { el, tick, cleanup: () => clearTimeout(timer) };
}

export function resultScreen({ title, subtitle, tone = 'win', buttons }) {
  const el = h('div', { class: 'screen result ' + tone },
    h('div', { class: 'result-panel' },
      h('div', { class: 'result-title' }, title),
      subtitle ? h('div', { class: 'result-sub' }, subtitle) : null,
      h('div', { class: 'row' }, buttons.map((b) => button(b.label, b.onClick, b.cls || '')))));
  return { el };
}

function howto() {
  return h('ul', { class: 'howto' }, ['move', 'attack', 'special', 'rules', 'keys'].map((k) => h('li', null, t('howto.' + k))));
}

export function pauseScreen({ onResume, onQuit }) {
  const el = h('div', { class: 'screen pause' },
    h('div', { class: 'panel' },
      h('h2', null, t('pause.title')),
      howto(),
      h('div', { class: 'row' }, button('▶ ' + t('pause.resume'), onResume, 'green'), button(t('pause.quit'), onQuit, 'ghost'))));
  return { el };
}

export function settingsScreen({ onLang, onAudio, onFullscreen, onBack }) {
  const audio = getAudioSettings();
  const onOff = () => [{ value: true, label: t('on') }, { value: false, label: t('off') }];
  const el = h('div', { class: 'screen settings' },
    header(t('menu.settings'), onBack),
    h('div', { class: 'panel' },
      h('div', { class: 'set-row' }, h('label', null, '🌐 ' + t('settings.lang')), segmented([{ value: 'th', label: 'ไทย' }, { value: 'en', label: 'English' }], getLang(), onLang)),
      h('div', { class: 'set-row' }, h('label', null, '🎵 ' + t('settings.music')), segmented(onOff(), audio.music, (v) => onAudio('music', v))),
      h('div', { class: 'set-row' }, h('label', null, '🔊 ' + t('settings.sfx')), segmented(onOff(), audio.sfx, (v) => onAudio('sfx', v))),
      onFullscreen ? h('div', { class: 'set-row' }, h('label', null, '⛶ ' + t('settings.fullscreen')), button(t('settings.fullscreen'), onFullscreen, 'small ghost')) : null,
      h('h3', null, '📖 ' + t('settings.howto')),
      howto(),
      h('div', { class: 'ver' }, 'v' + VERSION)));
  return { el };
}

// ---------- online ----------

export function onlineHomeScreen({ code = '', onCreate, onJoin, onBack, error }) {
  const input = h('input', {
    class: 'code-input', maxlength: 5, value: code, placeholder: 'ABCDE', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', inputmode: 'text',
    'aria-label': t('online.enter'),
    oninput: (e) => {
      e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
    },
    onkeydown: (e) => e.key === 'Enter' && onJoin(input.value),
  });
  const el = h('div', { class: 'screen online' },
    header(t('online.title'), onBack),
    error ? h('div', { class: 'error' }, '⚠️ ' + error) : null,
    h('div', { class: 'online-body' },
      h('div', { class: 'panel' },
        h('div', { class: 'big-emoji' }, '🏠'),
        button(t('online.create'), onCreate, 'big orange')),
      h('div', { class: 'panel' },
        h('label', null, t('online.enter')),
        input,
        button(t('online.join') + ' ➜', () => onJoin(input.value), 'big blue'))),
    h('div', { class: 'note' }, t('online.note')));
  return { el };
}

export function onlineHostScreen({ code, link, onCancel }) {
  const copyBtn = button('📋 ' + t('online.copy'), async () => {
    try {
      await navigator.clipboard.writeText(code);
      copyBtn.textContent = '✅ ' + t('online.copied');
    } catch {
      copyBtn.textContent = code;
    }
  }, 'ghost');
  const canShare = !!navigator.share;
  const el = h('div', { class: 'screen online' },
    header(t('online.title'), onCancel),
    h('div', { class: 'panel center' },
      h('label', null, t('online.code')),
      h('div', { class: 'code' }, code),
      h('div', { class: 'row' },
        copyBtn,
        canShare ? button('🔗 ' + t('online.share'), () => navigator.share({ title: t('game.title'), text: `${t('game.title')} — ${t('online.code')}: ${code}`, url: link }).catch(() => {}), 'ghost') : null),
      h('div', { class: 'hint' }, t('online.hint')),
      h('div', { class: 'waiting' }, h('span', { class: 'spinner' }), t('online.waiting'))));
  return { el };
}

export function statusScreen({ message, onCancel, cancelLabel }) {
  const el = h('div', { class: 'screen status' },
    h('div', { class: 'panel center' },
      h('div', { class: 'waiting' }, h('span', { class: 'spinner' }), message),
      onCancel ? button(cancelLabel || t('online.leave'), onCancel, 'ghost back') : null));
  return { el };
}
