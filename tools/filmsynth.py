"""Shared numpy-only synth kit for the film soundtracks (tools/film-*-soundtrack.py).

Usage from a soundtrack script:

    import filmsynth as fs
    fs.init(30.0, seed=1234)       # length in seconds, RNG seed
    from filmsynth import *        # bind OUT/N/rng/instruments after init
    place(kick(), 1.0, .8)          # ... cue sounds ...
    fs.master('film/soundtrack.m4a', fade_out_at=29.1)

Everything is generated from oscillators and noise, so there is nothing to license.
"""
import math, os, subprocess, wave
import numpy as np

SR = 44100
DUR = 0.0
N = 0
rng = None
OUT = None
REV = None


def init(dur, seed):
    """Allocate the mix bus for a film of `dur` seconds and seed the shared RNG."""
    global DUR, N, rng, OUT, REV
    DUR = float(dur)
    N = int(SR * DUR)
    rng = np.random.default_rng(seed)
    OUT = np.zeros((2, N))
    REV = np.zeros((2, N))


def tt(d):
    return np.arange(int(d * SR)) / SR


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def place(sig, t0, gain=1.0, pan=0.0, rev=0.0):
    if sig.ndim == 1:
        a = (pan + 1) * math.pi / 4
        s2 = np.stack([sig * math.cos(a), sig * math.sin(a)]) * math.sqrt(2)
    else:
        s2 = sig
    s2 = s2 * gain
    i0 = int(round(t0 * SR))
    if i0 < 0:
        s2 = s2[:, -i0:]
        i0 = 0
    n = min(s2.shape[1], N - i0)
    if n <= 0:
        return
    OUT[:, i0:i0 + n] += s2[:, :n]
    if rev:
        REV[:, i0:i0 + n] += s2[:, :n] * rev


def fft_filter(x, lo=None, hi=None, order=2):
    """Zero-phase Butterworth-shaped band filter in the frequency domain."""
    n = len(x)
    nfft = 1 << (n + 1024).bit_length()
    X = np.fft.rfft(x, nfft)
    f = np.fft.rfftfreq(nfft, 1 / SR)
    H = np.ones_like(f)
    if hi:
        H /= np.sqrt(1 + (f / hi) ** (2 * order))
    if lo:
        H *= 1 - 1 / np.sqrt(1 + (f / max(lo, 1e-3)) ** (2 * order))
    return np.fft.irfft(X * H, nfft)[:n]


def lp_var(x, fc):
    """Two-pole time-varying lowpass (loop; keep for short sounds)."""
    fc = np.broadcast_to(np.asarray(fc, dtype=float), x.shape)
    a = 1 - np.exp(-2 * np.pi * fc / SR)
    y1 = y2 = 0.0
    out = np.empty_like(x)
    for i in range(len(x)):
        y1 += a[i] * (x[i] - y1)
        y2 += a[i] * (y1 - y2)
        out[i] = y2
    return out


def sine(f, d, ph=0.0):
    f = np.broadcast_to(np.asarray(f, dtype=float), (int(d * SR),))
    return np.sin(2 * np.pi * np.cumsum(f) / SR + ph)


def saw(f, d):
    f = np.broadcast_to(np.asarray(f, dtype=float), (int(d * SR),))
    p = np.cumsum(f) / SR + rng.random()
    return 2 * (p % 1) - 1


def noise(d):
    return rng.standard_normal(int(d * SR))


def env_ad(d, a, tau, hold=0.0):
    t = tt(d)
    e = np.where(t < a, t / max(a, 1e-4), np.exp(-np.maximum(0, t - a - hold) / tau))
    return e


def env_asr(d, a, r):
    t = tt(d)
    return np.clip(t / max(a, 1e-4), 0, 1) * np.clip((d - t) / max(r, 1e-4), 0, 1)


def fade_edges(x, ms=5):
    k = min(len(x) // 2, int(SR * ms / 1000))
    if k:
        w = np.linspace(0, 1, k)
        x[:k] *= w
        x[-k:] *= w[::-1]
    return x


# ── instruments
def pad(notes, d, cutoff=1400, a=1.5, r=1.5, detune=.004):
    s = np.zeros(int(d * SR))
    for m in notes:
        f = mtof(m)
        for k in (-1, 0, 1):
            s += saw(f * (1 + k * detune), d) * (.7 if k else 1)
    s = fft_filter(s, lo=50, hi=cutoff)
    return s / (len(notes) * 2.4) * env_asr(d, a, r)


def choir(notes, d, a=1.2, r=1.2, vowel=(800, 1150, 2900)):
    t = tt(d)
    s = np.zeros_like(t)
    for m in notes:
        f0 = mtof(m)
        vib = 1 + .006 * np.sin(2 * np.pi * (5.1 + rng.random()) * t + rng.random() * 6)
        for h in range(1, int(3500 / f0) + 1):
            fh = f0 * h
            w = sum(math.exp(-((fh - F) / 160) ** 2) * g for F, g in zip(vowel, (1, .6, .25))) + .06 / h
            s += w * np.sin(2 * np.pi * np.cumsum(fh * vib) / SR + rng.random() * 6)
    return s / max(1e-9, np.abs(s).max()) * .5 * env_asr(d, a, r)


def bell(m, d=1.6, bright=1.0):
    f = mtof(m)
    t = tt(d)
    s = (np.sin(2 * np.pi * f * t) * np.exp(-t / (.55 * d))
         + .45 * bright * np.sin(2 * np.pi * f * 2.0 * t) * np.exp(-t / (.25 * d))
         + .2 * bright * np.sin(2 * np.pi * f * 3.01 * t) * np.exp(-t / (.12 * d)))
    return fade_edges(s * np.minimum(1, t / .003))


def brass(notes, d, peak=2600, base=380):
    s = np.zeros(int(d * SR))
    for m in notes:
        f = mtof(m)
        s += saw(f, d) + .6 * saw(f * 1.003, d)
    t = tt(d)
    fc = base + (peak - base) * np.exp(-t / .18) * np.minimum(1, t / .03)
    s = lp_var(s / len(notes), fc)
    return s * env_ad(d, .015, d * .6)


def bass(m, d):
    f = mtof(m)
    s = saw(f, d) * .6 + sine(f / 2 if m > 40 else f, d) * .6
    t = tt(d)
    s = lp_var(s, 220 + 900 * np.exp(-t / .07))
    return s * env_ad(d, .005, .16)


def kick(gain=1.0, low=45):
    d = .45
    t = tt(d)
    f = low + 90 * np.exp(-t / .035)
    s = sine(f, d) * np.exp(-t / .22) + .3 * noise(d) * np.exp(-t / .004)
    return s * gain


def snare():
    d = .25
    t = tt(d)
    n = fft_filter(noise(d), lo=1200, hi=9000) * np.exp(-t / .07)
    tone = sine(190, d) * np.exp(-t / .05)
    return (n * .8 + tone * .5)


def hat(open_=False):
    d = .25 if open_ else .06
    t = tt(d)
    return fft_filter(noise(d), lo=7000) * np.exp(-t / (.08 if open_ else .015)) * .5


def taiko(gain=1.0):
    d = 1.2
    t = tt(d)
    s = sine(58 + 40 * np.exp(-t / .05), d) * np.exp(-t / .38) + fft_filter(noise(d), hi=700) * np.exp(-t / .05) * .4
    return s * gain


def tom(f0=140):
    d = .4
    t = tt(d)
    return sine(f0 * (.65 + .35 * np.exp(-t / .06)), d) * np.exp(-t / .16)


def crash(d=2.2):
    t = tt(d)
    return fft_filter(noise(d), lo=3500, hi=14000) * np.exp(-t / (d * .3)) * np.minimum(1, t / .002) * .6


def whoosh(d=.6, f0=300, f1=3000, f2=500):
    t = tt(d)
    u = t / d
    fc = np.where(u < .55, f0 + (f1 - f0) * (u / .55) ** 2, f1 + (f2 - f1) * ((u - .55) / .45))
    s = lp_var(noise(d), fc) * np.sin(np.pi * u) ** 1.5
    return s / (np.abs(s).max() + 1e-9)


def clang(f0=880, d=1.2, gain=1.0):
    t = tt(d)
    parts = [(1, 1), (2.76, .6), (5.4, .45), (8.93, .3), (13.3, .18)]
    s = sum(g * np.sin(2 * np.pi * f0 * r * t + rng.random() * 6) * np.exp(-t / (d * .35 / r ** .5)) for r, g in parts)
    s += fft_filter(noise(d), lo=2500) * np.exp(-t / .02) * 1.2
    return fade_edges(s * gain * .5)


def pew(f_hi=2400, f_lo=260, d=.22):
    t = tt(d)
    f = f_lo + (f_hi - f_lo) * np.exp(-t / (d * .25))
    s = np.sign(sine(f, d)) * .35 + sine(f * 1.5, d) * .5
    s = lp_var(s, 5000) * np.exp(-t / (d * .45))
    return fade_edges(s)


def zap_crackle(d=.08):
    t = tt(d)
    return fft_filter(noise(d), lo=1500, hi=9000) * np.exp(-t / .015) * (rng.random(len(t)) > .6)


def thunder(d=2.5):
    t = tt(d)
    s = fft_filter(noise(d), hi=180) * np.exp(-t / .8) * (1 + .6 * np.sin(2 * np.pi * 3 * t))
    s += fft_filter(noise(d), lo=1500, hi=6000) * np.exp(-t / .03) * .5
    return s


def walk_x(t, t0, t1, x0, x1):
    u = min(1, max(0, (t - t0) / (t1 - t0)))
    return x0 + (x1 - x0) * (1 - (1 - u) ** 1.25)


def step_times(t0, t1, x0, x1, stride):
    out, prev = [], 0
    for t in np.arange(t0, t1, .002):
        k = int(abs(walk_x(t, t0, t1, x0, x1) - x0) / stride)
        if k > prev and t < t1 - .25:
            out.append(t)
        prev = k
    return out


def step_sfx():
    d = .14
    t = tt(d)
    return fft_filter(noise(d), lo=60, hi=900) * np.exp(-t / .03) + sine(90, d) * np.exp(-t / .04) * .4


def master(m4a_path, fade_in=.6, fade_out_at=None, ir_d=2.6, ir_tau=.55, wet_gain=.5, drive=1.6):
    """Reverb send + low cut + fades + soft clip, then write an AAC .m4a."""
    ti = tt(ir_d)
    ir = np.stack([fft_filter(rng.standard_normal(len(ti)), hi=5000) * np.exp(-ti / ir_tau) for _ in range(2)])
    ir[:, :int(.012 * SR)] = 0
    ir /= np.sqrt((ir ** 2).sum(axis=1, keepdims=True))
    nfft = 1 << (N + len(ti)).bit_length()
    wet = np.stack([np.fft.irfft(np.fft.rfft(REV[c], nfft) * np.fft.rfft(ir[c], nfft), nfft)[:N] for c in range(2)])
    mix = OUT + wet * wet_gain
    mix = fft_filter(mix[0], lo=28), fft_filter(mix[1], lo=28)
    mix = np.stack(mix)
    fade = np.ones(N)
    fi = int(fade_in * SR)
    fade[:fi] = np.linspace(0, 1, fi) ** 2
    fo0 = int((fade_out_at if fade_out_at is not None else DUR - .9) * SR)
    fade[fo0:N] = np.linspace(1, 0, N - fo0) ** 1.5
    mix *= fade
    mix /= np.abs(mix).max() + 1e-9
    mix = np.tanh(mix * drive) / np.tanh(drive) * .93
    wav = os.path.splitext(m4a_path)[0] + '.wav'
    with wave.open(wav, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((mix.T * 32767).astype('<i2').tobytes())
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-c:a', 'aac', '-b:a', '128k', m4a_path], check=True)
    os.remove(wav)
    print('wrote', os.path.normpath(m4a_path))
    return mix
