// Pet sounds and music, synthesized with the shared Web Audio engine.
import { initAudio, getAudioSettings, setAudio, tone, noise, seq, playMusic, stopMusic } from '../../src/audio/audio.js';

export { initAudio, getAudioSettings, setAudio, stopMusic };

const voices = {
  // a rising-then-falling "mew"
  cat: () => {
    tone({ type: 'sine', f0: 700, f1: 1100, dur: 0.12, vol: 0.18, attack: 0.02 });
    tone({ type: 'sine', f0: 1100, f1: 650, dur: 0.22, vol: 0.16, at: 0.11, attack: 0.02 });
  },
  dog: () => {
    tone({ type: 'square', f0: 420, f1: 260, dur: 0.09, vol: 0.12 });
    noise({ dur: 0.08, vol: 0.12, f0: 900, q: 2 });
    tone({ type: 'square', f0: 460, f1: 280, dur: 0.09, vol: 0.12, at: 0.16 });
  },
  bird: () => {
    for (let i = 0; i < 3; i++) tone({ type: 'triangle', f0: 1700 + i * 200, f1: 2300, dur: 0.06, vol: 0.12, at: i * 0.08 });
  },
  buffalo: () => {
    tone({ type: 'sawtooth', f0: 130, f1: 110, dur: 0.6, vol: 0.12, attack: 0.08 });
    tone({ type: 'sine', f0: 260, f1: 220, dur: 0.6, vol: 0.1, attack: 0.08 });
  },
};
const VOICE = { yogurt: 'cat', phidam: 'cat', pongfu: 'dog', fuji: 'bird', chako: 'buffalo' };

export const sfx = {
  voice: (species) => voices[VOICE[species] || 'cat'](),
  tap: () => tone({ type: 'triangle', f0: 880, f1: 1320, dur: 0.06, vol: 0.1 }),
  back: () => tone({ type: 'triangle', f0: 700, f1: 480, dur: 0.07, vol: 0.1 }),
  coin: () => {
    tone({ type: 'square', f0: 988, dur: 0.06, vol: 0.08 });
    tone({ type: 'square', f0: 1319, dur: 0.14, vol: 0.08, at: 0.06 });
  },
  eat: () => {
    for (let i = 0; i < 3; i++) noise({ dur: 0.05, vol: 0.18, f0: 1400, q: 1.5, at: i * 0.12 });
  },
  drink: () => {
    for (let i = 0; i < 3; i++) tone({ type: 'sine', f0: 500 + i * 80, f1: 900 + i * 80, dur: 0.07, vol: 0.12, at: i * 0.12 });
  },
  bubble: () => tone({ type: 'sine', f0: 600 + Math.random() * 600, f1: 1400, dur: 0.05, vol: 0.06 }),
  splash: () => noise({ dur: 0.45, vol: 0.3, type: 'lowpass', f0: 2500, f1: 400 }),
  scoop: () => {
    noise({ dur: 0.08, vol: 0.15, f0: 700, q: 1 });
    tone({ type: 'triangle', f0: 1200, f1: 1800, dur: 0.1, vol: 0.08, at: 0.08 });
  },
  happy: () => [659, 784, 1047].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.12, vol: 0.12, at: i * 0.08 })),
  sad: () => [523, 466, 392].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.18, vol: 0.12, at: i * 0.14 })),
  no: () => tone({ type: 'square', f0: 220, f1: 180, dur: 0.15, vol: 0.08 }),
  sparkle: () => [1568, 2093, 2637].forEach((f, i) => tone({ type: 'sine', f0: f, dur: 0.1, vol: 0.07, at: i * 0.05 })),
  levelUp: () => {
    [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone({ type: 'square', f0: f, dur: 0.16, vol: 0.09, at: i * 0.09 }));
    tone({ type: 'triangle', f0: 1047, dur: 0.6, vol: 0.12, at: 0.55 });
  },
  hit: (strong) => {
    tone({ type: 'sine', f0: strong ? 180 : 240, f1: 50, dur: 0.18, vol: 0.5 });
    noise({ dur: 0.12, vol: 0.35, type: 'lowpass', f0: 1200, f1: 200 });
  },
  miss: () => noise({ dur: 0.25, vol: 0.2, f0: 400, f1: 1800, q: 1.4 }),
  heal: () => [784, 988, 1175, 1568].forEach((f, i) => tone({ type: 'sine', f0: f, dur: 0.14, vol: 0.09, at: i * 0.07 })),
  shield: () => {
    tone({ type: 'square', f0: 1200, f1: 900, dur: 0.12, vol: 0.08 });
    tone({ type: 'triangle', f0: 600, dur: 0.25, vol: 0.1 });
  },
  magic: () => {
    tone({ type: 'sawtooth', f0: 300, f1: 1500, dur: 0.35, vol: 0.08 });
    noise({ dur: 0.3, vol: 0.15, f0: 3000, f1: 800, q: 3 });
  },
  sleep: () => tone({ type: 'sine', f0: 600, f1: 300, dur: 0.6, vol: 0.12, attack: 0.1 }),
  win: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone({ type: 'square', f0: f, dur: 0.14, vol: 0.1, at: i * 0.11 })),
  lose: () => [392, 370, 349, 262].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.3, vol: 0.15, at: i * 0.22 })),
  tick: () => tone({ type: 'square', f0: 1500, dur: 0.03, vol: 0.05 }),
  pad: (i) => tone({ type: 'triangle', f0: [392, 523, 659, 784][i], dur: 0.3, vol: 0.18 }),
  shot: () => {
    noise({ dur: 0.06, vol: 0.12, type: 'highpass', f0: 3000 });
    tone({ type: 'sine', f0: 1800, f1: 1200, dur: 0.08, vol: 0.06 });
  },
  hatch: () => {
    noise({ dur: 0.15, vol: 0.25, f0: 2000, q: 2 });
    [784, 1047, 1319].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.2, vol: 0.12, at: 0.15 + i * 0.1 }));
  },
};

const SONGS = {
  home: {
    bpm: 92,
    lead: seq(`
      E5 . G5 . A5 . G5 . E5 . D5 . C5 . . .
      D5 . E5 . G5 . E5 . D5 . . . . . . .
      E5 . G5 . A5 . C6 . A5 . G5 . E5 . . .
      D5 . C5 . D5 . E5 . C5 . . . . . . .`),
    bass: seq(`
      C3 . . . G3 . . . A2 . . . E3 . . .
      F2 . . . C3 . . . G2 . . . D3 . . .
      C3 . . . G3 . . . A2 . . . E3 . . .
      F2 . . . G2 . . . C3 . . . . . . .`),
    drums: 'k...h...k.k.h...',
  },
  night: {
    bpm: 70,
    lead: seq(`
      G5 . . . E5 . . . C5 . . . E5 . . .
      F5 . . . D5 . . . B4 . . . . . . .
      E5 . . . C5 . . . A4 . . . C5 . . .
      D5 . . . B4 . . . C5 . . . . . . .`),
    bass: seq(`
      C3 . . . . . . . A2 . . . . . . .
      F2 . . . . . . . G2 . . . . . . .
      A2 . . . . . . . F2 . . . . . . .
      G2 . . . . . . . C3 . . . . . . .`),
    drums: '................',
  },
  battle: {
    bpm: 138,
    lead: seq(`
      E5 . E5 G5 A5 . G5 E5 D5 . E5 . G5 . . .
      E5 . E5 G5 A5 . C6 . B5 . A5 . G5 . . .
      A5 . G5 . E5 . D5 . C5 . D5 . E5 . . .
      G5 . A5 . G5 E5 D5 . E5 . . . . . . .`),
    bass: seq(`
      A2 . A3 . A2 . A3 . F2 . F3 . F2 . F3 .
      C3 . C4 . C3 . C4 . G2 . G3 . G2 . G3 .
      A2 . A3 . A2 . A3 . F2 . F3 . F2 . F3 .
      G2 . G3 . G2 . G3 . E2 . E3 . E2 . E3 .`),
    drums: 'k.h.s.h.k.k.s.hh',
  },
  game: {
    bpm: 128,
    lead: seq(`
      C5 E5 G5 E5 C5 E5 G5 C6 A5 . G5 . E5 . . .
      D5 F5 A5 F5 D5 F5 A5 D6 B5 . A5 . G5 . . .`),
    bass: seq(`
      C3 . G3 . C3 . G3 . F2 . C3 . F2 . C3 .
      D3 . A3 . D3 . A3 . G2 . D3 . G2 . D3 .`),
    drums: 'k.h.s.h.k.h.s.h.',
  },
};

export function music(name) {
  playMusic(name ? SONGS[name] : null);
}
