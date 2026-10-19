// All sound is synthesized with Web Audio — no audio files to download.
import { storage } from '../storage.js';

let ac = null;
let master;
let sfxBus;
let musicBus;
let noiseBuf;
const settings = { music: storage.get('music', true), sfx: storage.get('sfx', true) };

export function initAudio() {
  if (ac) {
    if (ac.state === 'suspended') ac.resume();
    return;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ac = new AC();
  master = ac.createGain();
  master.gain.value = 0.9;
  master.connect(ac.destination);
  sfxBus = ac.createGain();
  sfxBus.gain.value = settings.sfx ? 0.7 : 0;
  sfxBus.connect(master);
  musicBus = ac.createGain();
  musicBus.gain.value = settings.music ? 0.22 : 0;
  musicBus.connect(master);
  noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) ac.suspend();
    else ac.resume();
  });
  if (song) {
    nextTime = ac.currentTime + 0.05;
    timer ??= setInterval(schedule, 25);
  }
}

export function getAudioSettings() {
  return { ...settings };
}

export function setAudio(kind, on) {
  settings[kind] = on;
  storage.set(kind, on);
  if (!ac) return;
  const bus = kind === 'music' ? musicBus : sfxBus;
  bus.gain.setTargetAtTime(on ? (kind === 'music' ? 0.22 : 0.7) : 0, ac.currentTime, 0.05);
}

function tone({ type = 'square', f0, f1 = f0, dur = 0.1, vol = 0.3, at = 0, bus = sfxBus, attack = 0.005 }) {
  if (!ac) return;
  const t = ac.currentTime + at;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(bus);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise({ dur = 0.1, vol = 0.3, type = 'bandpass', f0 = 1000, f1 = f0, q = 1, at = 0, bus = sfxBus }) {
  if (!ac) return;
  const t = ac.currentTime + at;
  const src = ac.createBufferSource();
  src.buffer = noiseBuf;
  const filt = ac.createBiquadFilter();
  filt.type = type;
  filt.Q.value = q;
  filt.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) filt.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = ac.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filt).connect(g).connect(bus);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.02);
}

export const sfx = {
  swing: () => noise({ dur: 0.09, vol: 0.18, f0: 600, f1: 2200, q: 2 }),
  hit(mat, heavy) {
    const v = heavy ? 1 : 0.7;
    mat = { fur: 'plush', ghost: 'plush', scale: 'wood' }[mat] || mat;
    tone({ type: 'sine', f0: heavy ? 160 : 220, f1: 50, dur: heavy ? 0.25 : 0.14, vol: 0.6 * v });
    switch (mat) {
      case 'metal':
        tone({ type: 'square', f0: 1180, f1: 880, dur: 0.18, vol: 0.12 * v });
        tone({ type: 'triangle', f0: 1760, f1: 1500, dur: 0.25, vol: 0.08 * v });
        break;
      case 'wood':
        tone({ type: 'triangle', f0: 520, f1: 380, dur: 0.08, vol: 0.3 * v });
        noise({ dur: 0.05, vol: 0.2 * v, f0: 2500, q: 3 });
        break;
      case 'clay':
        noise({ dur: 0.16, vol: 0.4 * v, f0: 380, f1: 200, q: 1.2 });
        tone({ type: 'triangle', f0: 300, f1: 140, dur: 0.1, vol: 0.2 * v });
        break;
      default:
        noise({ dur: 0.14, vol: 0.45 * v, type: 'lowpass', f0: 900, f1: 200 });
    }
  },
  block() {
    tone({ type: 'square', f0: 1300, f1: 950, dur: 0.07, vol: 0.12 });
    noise({ dur: 0.05, vol: 0.2, type: 'highpass', f0: 3000 });
  },
  jump: () => tone({ type: 'square', f0: 280, f1: 620, dur: 0.1, vol: 0.08 }),
  land: () => noise({ dur: 0.06, vol: 0.2, type: 'lowpass', f0: 300 }),
  thud() {
    tone({ type: 'sine', f0: 120, f1: 40, dur: 0.3, vol: 0.6 });
    noise({ dur: 0.2, vol: 0.35, type: 'lowpass', f0: 500, f1: 120 });
  },
  special() {
    tone({ type: 'sawtooth', f0: 180, f1: 1400, dur: 0.45, vol: 0.12 });
    [0, 0.08, 0.16, 0.24].forEach((at, i) => tone({ type: 'square', f0: [523, 659, 784, 1047][i], dur: 0.12, vol: 0.1, at }));
  },
  shoot(kind) {
    if (kind === 'scream') {
      // a wavering, descending ghostly wail
      tone({ type: 'sine', f0: 880, f1: 330, dur: 1.1, vol: 0.14, attack: 0.08 });
      tone({ type: 'sine', f0: 905, f1: 340, dur: 1.1, vol: 0.12, attack: 0.08 });
      tone({ type: 'triangle', f0: 440, f1: 220, dur: 1.0, vol: 0.08, at: 0.15, attack: 0.1 });
    } else if (kind === 'curse') {
      tone({ type: 'sawtooth', f0: 300, f1: 90, dur: 0.5, vol: 0.12 });
      tone({ type: 'sine', f0: 600, f1: 300, dur: 0.5, vol: 0.1 });
    } else {
      noise({ dur: 0.35, vol: 0.35, f0: 400, f1: 2400, q: 0.8 });
      tone({ type: 'square', f0: 600, f1: 200, dur: 0.2, vol: 0.1 });
    }
  },
  whoosh: () => noise({ dur: 0.4, vol: 0.3, f0: 300, f1: 1800, q: 1.5 }),
  beam() {
    noise({ dur: 0.6, vol: 0.45, type: 'lowpass', f0: 1800, f1: 400 });
    tone({ type: 'sawtooth', f0: 110, f1: 70, dur: 0.6, vol: 0.18 });
  },
  slam() {
    tone({ type: 'sine', f0: 90, f1: 30, dur: 0.5, vol: 0.8 });
    noise({ dur: 0.4, vol: 0.5, type: 'lowpass', f0: 800, f1: 100 });
  },
  clash() {
    tone({ type: 'square', f0: 900, f1: 300, dur: 0.3, vol: 0.15 });
    noise({ dur: 0.3, vol: 0.3, f0: 2000, f1: 500 });
  },
  ready: () => [0, 0.12].forEach((at) => tone({ type: 'square', f0: 660, dur: 0.08, vol: 0.12, at })),
  fight() {
    [392, 523, 659, 784].forEach((f, i) => tone({ type: 'square', f0: f, dur: 0.18, vol: 0.12, at: i * 0.05 }));
    noise({ dur: 0.3, vol: 0.2, f0: 1500, f1: 400 });
  },
  ko() {
    tone({ type: 'sawtooth', f0: 700, f1: 60, dur: 1.1, vol: 0.2 });
    tone({ type: 'sine', f0: 140, f1: 30, dur: 0.8, vol: 0.6 });
  },
  timeup: () => [0, 0.15, 0.3].forEach((at) => tone({ type: 'square', f0: 880, dur: 0.1, vol: 0.12, at })),
  win: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone({ type: 'square', f0: f, dur: 0.14, vol: 0.12, at: i * 0.11 })),
  lose: () => [392, 370, 349, 262].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.3, vol: 0.18, at: i * 0.22 })),
  select: () => tone({ type: 'square', f0: 880, f1: 1320, dur: 0.06, vol: 0.08 }),
  back: () => tone({ type: 'square', f0: 660, f1: 440, dur: 0.06, vol: 0.08 }),
};

// Map sim events to sounds.
export function playEvents(events) {
  if (!ac || !settings.sfx) return;
  for (const e of events) {
    switch (e.type) {
      case 'swing':
        sfx.swing();
        break;
      case 'hit':
        sfx.hit(e.mat, e.heavy);
        break;
      case 'block':
      case 'jump':
      case 'land':
      case 'thud':
      case 'special':
      case 'whoosh':
      case 'beam':
      case 'slam':
      case 'clash':
      case 'ready':
      case 'fight':
      case 'ko':
      case 'timeup':
        sfx[e.type]();
        break;
      case 'leap':
        sfx.jump();
        break;
      case 'shoot':
        sfx.shoot(e.kind);
        break;
      default:
        break;
    }
  }
}

// ---------------- music ----------------

const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function freq(n) {
  const m = /^([A-G])(#?)(\d)$/.exec(n);
  if (!m) return 0;
  const midi = 12 * (+m[3] + 1) + NOTE[m[1]] + (m[2] ? 1 : 0);
  return 440 * Math.pow(2, (midi - 69) / 12);
}
const seq = (s) => s.trim().split(/\s+/).map((x) => (x === '.' ? 0 : freq(x)));

const SONGS = {
  menu: {
    bpm: 112,
    lead: seq(`
      C5 . E5 . G5 . E5 . A5 . G5 . E5 . . .
      D5 . E5 . G5 . A5 . G5 . E5 . D5 . . .
      C5 . E5 . G5 . C6 . A5 . G5 . E5 . G5 .
      A5 . G5 . E5 . D5 . C5 . . . . . . .`),
    bass: seq(`
      C3 . . . G3 . . . C3 . . . G3 . . .
      G2 . . . D3 . . . G2 . . . D3 . . .
      A2 . . . E3 . . . A2 . . . E3 . . .
      F2 . . . C3 . . . G2 . . . G2 . . .`),
    drums: 'k.h.s.h.k.h.s.hh',
  },
  fight: {
    bpm: 150,
    lead: seq(`
      A4 . . C5 D5 . E5 . G5 . E5 . D5 C5 A4 .
      G4 . A4 . C5 . D5 . E5 . D5 C5 D5 . . .
      A5 . G5 . E5 . D5 . E5 . G5 . A5 . . .
      G5 E5 D5 C5 D5 . C5 A4 G4 . A4 . . . . .`),
    bass: seq(`
      A2 . A2 . A3 . A2 . A2 . A2 . A3 . A2 .
      G2 . G2 . G3 . G2 . G2 . G2 . G3 . G2 .
      F2 . F2 . F3 . F2 . F2 . F2 . F3 . F2 .
      E2 . E2 . G2 . E2 . E2 . G2 . A2 . E2 .`),
    drums: 'k.hsk.hsk.hsk.hs',
  },
};

let song = null;
let step = 0;
let nextTime = 0;
let timer = null;

export function playMusic(name) {
  if (song === SONGS[name]) return;
  song = SONGS[name] || null;
  step = 0;
  if (!ac) return;
  nextTime = ac.currentTime + 0.05;
  if (!timer) timer = setInterval(schedule, 25);
}

export function stopMusic() {
  song = null;
}

function schedule() {
  if (!ac || !song || ac.state !== 'running') return;
  const stepDur = 60 / song.bpm / 4;
  while (nextTime < ac.currentTime + 0.12) {
    const at = nextTime - ac.currentTime;
    const n = song.lead.length;
    const lf = song.lead[step % n];
    if (lf) tone({ type: 'square', f0: lf, dur: stepDur * 1.6, vol: 0.16, at, bus: musicBus, attack: 0.01 });
    const bf = song.bass[step % song.bass.length];
    if (bf) tone({ type: 'triangle', f0: bf, dur: stepDur * 1.8, vol: 0.32, at, bus: musicBus, attack: 0.01 });
    const d = song.drums[step % song.drums.length];
    if (d === 'k') tone({ type: 'sine', f0: 150, f1: 45, dur: 0.12, vol: 0.5, at, bus: musicBus });
    else if (d === 's') noise({ dur: 0.1, vol: 0.25, f0: 1800, q: 0.7, at, bus: musicBus });
    else if (d === 'h') noise({ dur: 0.03, vol: 0.12, type: 'highpass', f0: 7000, at, bus: musicBus });
    nextTime += stepDur;
    step++;
  }
}
