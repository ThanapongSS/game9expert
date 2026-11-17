#!/usr/bin/env python3
"""Synthesize the 45 s soundtrack for film/chase/index.html (music + SFX), numpy only.

    python3 tools/film-chase-soundtrack.py      -> film/chase/soundtrack.m4a

Every cue time below mirrors the timeline object `T` in film/chase/index.html. Change both together.
Instruments and the master chain live in tools/filmsynth.py.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import filmsynth as fs

fs.init(45.0, seed=20261117)
from filmsynth import *  # noqa: E402,F401,F403  (OUT, REV, N, rng and instruments, bound after init)

T = dict(rustle=4.0, eyesOpen=4.6, rise0=5.4, rise1=6.2, notice=7.0, scream=7.4, run=7.9,
         diveBush=13.45, sniff0=14.4, scope0=15.2, scope1=16.4, sneak=15.6, dig0=16.5, dig1=17.4,
         headTurn=17.6, spot=18.2, plunge=18.8, unplug=20.1, popOut=19.45, launch=20.4,
         edge=23.6, leap=24.0, splash=25.15, crocEyes=26.4, lunge=27.4, snap=27.9, sfDive=28.0, sfSplash=28.3, crocFlee=29.2, surface=31.0,
         enter=32.6, slam=32.85, eye=34.4, creak0=35.4, creak1=36.3, escape=36.4, stump=38.2, relief=39.0, drop0=39.9, drop1=40.3,
         open0=40.55, gulp=41.1, close=41.3, burp=42.3, bowLand=43.8, title=43.2)


# ── film-specific voices and sounds
def musicbox(m, d=1.2, wow=.006):
    t = tt(d)
    f = mtof(m) * (1 + wow * np.sin(2 * np.pi * 4.7 * t))
    s = sine(f, d) * np.exp(-t / .5) + .35 * sine(f * 3.0, d) * np.exp(-t / .12) + .2 * sine(f * 4.2, d) * np.exp(-t / .06)
    return fade_edges(s * np.minimum(1, t / .002))


def squeak(f0=1900, d=.5, up=700):
    """Toy-like mouse squeak (stands in for Bluebell's voice)."""
    t = tt(d)
    f = f0 + up * np.sin(np.pi * t / d) + 120 * np.sin(2 * np.pi * 23 * t)
    s = sine(f, d) + .3 * sine(f * 2, d)
    return fade_edges(s * np.sin(np.pi * t / d) ** .6)


def growl(d=1.0, f0=70):
    """Low formant chuckle for Springfang."""
    t = tt(d)
    pulses = np.maximum(0, np.sin(2 * np.pi * 3.2 * t)) ** 2
    s = saw(f0 * (1 + .05 * np.sin(2 * np.pi * 5 * t)), d) + .5 * saw(f0 * 1.01, d)
    s = fft_filter(s, lo=150, hi=900) * pulses
    return s / (np.abs(s).max() + 1e-9) * np.sin(np.pi * t / d) ** .3


def heartbeat(gain=1.0):
    d = .5
    out = np.zeros(int(d * SR))
    for off, g in ((0, 1.0), (.17, .7)):
        k = kick(g, 38)
        i = int(off * SR)
        n = min(len(k), len(out) - i)
        out[i:i + n] += k[:n]
    return fft_filter(out, hi=180) * gain


def boing(d=.55, f0=180, f1=520):
    t = tt(d)
    f = f0 + (f1 - f0) * (1 - np.exp(-t / .06)) + 60 * np.sin(2 * np.pi * 26 * t) * np.exp(-t / .25)
    return fade_edges((sine(f, d) + .3 * sine(f * 2.01, d)) * np.exp(-t / .22))


def creak(d=.9, f0=90, f1=150):
    t = tt(d)
    f = f0 + (f1 - f0) * t / d + 15 * np.sin(2 * np.pi * 7 * t)
    pulses = (np.sin(2 * np.pi * np.cumsum(f) / SR) > .7).astype(float)
    s = fft_filter(pulses + .2 * noise(d), lo=300, hi=2500)
    return s / (np.abs(s).max() + 1e-9) * np.sin(np.pi * t / d) ** .5


def scratch(d=.12):
    t = tt(d)
    return fft_filter(noise(d), lo=800, hi=4000) * np.exp(-t / .04) * (rng.random(len(t)) > .3)


def splash(d=1.4, big=1.0):
    t = tt(d)
    s = fft_filter(noise(d), lo=400, hi=9000) * np.exp(-t / (.25 * big)) + fft_filter(noise(d), hi=400) * np.exp(-t / .12) * .8
    s += sine(90 * np.exp(-t / .1) + 40, d) * np.exp(-t / .2) * .6
    return s / (np.abs(s).max() + 1e-9)


def bubble(f0=500):
    d = .09
    t = tt(d)
    return sine(f0 * (1 + 2.5 * t / d), d) * np.exp(-t / .03)


def gulp(d=.7):
    t = tt(d)
    f = 320 * np.exp(-t / .12) + 55
    s = sine(f, d) * np.exp(-t / .3) + fft_filter(noise(d), hi=500) * np.exp(-t / .08) * .7
    return s / (np.abs(s).max() + 1e-9)


def burp(d=.55):
    t = tt(d)
    f = 95 + 25 * np.sin(2 * np.pi * 2 * t) + 8 * np.sin(2 * np.pi * 31 * t)
    s = saw(f, d) + .5 * saw(f * 1.02, d)
    s = fft_filter(s, lo=120, hi=1400) * (.5 + .5 * (np.sin(2 * np.pi * 30 * t) > 0))
    return s / (np.abs(s).max() + 1e-9) * np.sin(np.pi * t / d) ** .4


def chomp():
    d = .25
    t = tt(d)
    return fft_filter(noise(d), lo=700, hi=5000) * np.exp(-t / .02) + sine(140, d) * np.exp(-t / .05) * .6


def buzz(d):
    t = tt(d)
    s = saw(120, d) * .5 + saw(240, d) * .3
    on = np.array([1.0 if hash_(math.floor(x * 14)) > .35 else 0.0 for x in (T['enter'] + 1.0 + t)])
    return fft_filter(s, lo=150, hi=3000) * on


def hash_(n):
    v = math.sin(n * 127.1 + 311.7) * 43758.5453
    return v - math.floor(v)


# ═══════════════════════════════ AMBIENCE (night forest)
tm = tt(DUR)
wind = fft_filter(noise(DUR), lo=60, hi=380)
place(wind / np.abs(wind).max() * .9 * (.10 + .04 * np.sin(2 * np.pi * .11 * tm)), 0, .5)
for t0 in np.arange(.3, DUR - 1, .21):  # crickets, quiet in the house and under water
    if T['splash'] < t0 < T['surface'] or 32.9 < t0 < 36.4:
        continue
    d = .05
    tb = tt(d)
    c = sine(4400 + 300 * math.sin(t0), d) * (np.sin(2 * np.pi * 60 * tb) > 0) * np.sin(np.pi * tb / d)
    place(c, t0 + rng.random() * .08, .02 + .015 * rng.random(), pan=rng.uniform(-.8, .8), rev=.3)

# ═══════════════════════════════ MUSIC
# 0–4.6 music-box lullaby (A minor), slows and sags when the bush rustles
mel = [76, 81, 84, 83, 81, 76, 77, 76, 72, 74, 76, 69]
t0, i = .35, 0
while t0 < T['eyesOpen']:
    slow = max(0, t0 - T['rustle'])
    place(musicbox(mel[i % len(mel)] - slow * 3, 1.0, .006 + slow * .03), t0, .22, pan=.15, rev=.5)
    t0 += .36 + slow * .5
    i += 1
place(pad([45, 52, 57, 60, 64], 4.8, cutoff=900, a=1.5, r=.6), 0, .35, rev=.5)
# 4.6 eyes open: low drone + rising strings
d = T['notice'] - T['eyesOpen'] + .3
place(pad([33, 40, 45, 46], d, cutoff=700, a=.6, r=.2), T['eyesOpen'], .7, rev=.4)
tr = tt(d)
place(pad([69, 70, 75], d, cutoff=3500, a=1.2, r=.1) * (.6 + .4 * np.sin(2 * np.pi * 12 * tr)), T['eyesOpen'], .35, rev=.5)
place(taiko(1.0), T['eyesOpen'], .45, rev=.5)
place(brass([33, 40, 45, 48], 1.6, peak=1500, base=180), T['rise1'] - .1, .75, rev=.6)
place(taiko(1.2), T['rise1'] - .1, .7, rev=.6)
# 7.4 scream stinger
place(pad([81, 82, 87, 88], .9, cutoff=6000, a=.02, r=.5) * .9, T['scream'], .45, rev=.6)
place(crash(2.0), T['scream'], .35, rev=.3)


def chase(t_from, t_to, bpm=150, gain=1.0):
    beat = 60 / bpm
    chords = [([45, 52, 57, 60, 64], 33), ([41, 48, 53, 57, 60], 29), ([43, 50, 55, 59, 62], 31), ([40, 47, 52, 56, 59], 28)]
    bassline = [0, 0, 3, 0, 7, 0, 5, 3]
    t0, b = t_from, 0
    while t0 < t_to - .05:
        notes, root = chords[(b // 4) % 4]
        place(kick(.9), t0, .55 * gain)
        if b % 2 == 1:
            place(snare(), t0, .32 * gain, rev=.15)
        for h in (0, .5):
            place(hat(), t0 + h * beat, .18 * gain, pan=.3)
            place(bass(root + 12 + bassline[(b * 2 + int(h * 2)) % 8], beat * .45), t0 + h * beat, .4 * gain)
        if b % 4 == 0:
            place(brass(notes[1:], beat * 1.2), t0, .3 * gain, rev=.25)
            place(pad(notes[2:], beat * 4, cutoff=2600, a=.05, r=.1) * (.6 + .4 * np.sin(2 * np.pi * 12 * tt(beat * 4))), t0, .22 * gain, rev=.3)
        t0 += beat
        b += 1


chase(T['run'], T['diveBush'], 150)
# 13.45–17.6 hiding: heartbeat + thin high drone
for t0 in np.arange(13.6, 17.6, .62):
    place(heartbeat(1.0), t0, .55)
d = 17.6 - 13.45
place(pad([81, 82], d, cutoff=5000, a=1.0, r=.3), 13.45, .18, rev=.5)
# 18.2 spotted: violin screech + growl
place(pad([84, 85, 91], 1.0, cutoff=7000, a=.02, r=.6), T['spot'], .4, rev=.6)
place(growl(1.0, 68), T['spot'], .55, pan=-.2, rev=.3)
place(brass([33, 39, 45], 1.0, peak=1200, base=160), T['spot'], .55, rev=.5)
# 19.45–23.6 canopy chase
chase(T['popOut'], T['edge'], 160, .95)
# 23.6–25.15 edge + leap: riser into splash
d = T['splash'] - T['edge']
tr = tt(d)
riser = lp_var(noise(d), 300 + 7000 * (tr / d) ** 2) * (tr / d) ** 1.4
place(riser / np.abs(riser).max(), T['edge'], .35, rev=.4)
place(pad([45, 52, 57, 64, 69], d, cutoff=1800, a=.3, r=.05), T['edge'], .4, rev=.6)
# 25.15–31 underwater: dark drone, croc stingers
d = T['surface'] - T['splash']
place(pad([33, 40, 45], d, cutoff=500, a=.5, r=.4), T['splash'], .7, rev=.5)
place(brass([28, 34, 40], 1.2, peak=900, base=140), T['crocEyes'], .6, rev=.5)
place(taiko(1.2), T['lunge'], .7, rev=.4)
place(brass([33, 34, 40, 45], .9, peak=2000, base=200), T['lunge'], .6, rev=.4)
place(pad([45, 51, 57], 1.6, cutoff=800, a=.05, r=.5), T['sfDive'], .6, rev=.6)
# 31–32.85 run to the house
chase(T['surface'], T['slam'], 160, .8)
# 33–36.4 house: silence, faint music box, eye sting
for i, (t0, m) in enumerate([(33.6, 76), (34.0, 75), (35.0, 76), (35.4, 70)]):
    place(musicbox(m, 1.0, .03), t0, .12, rev=.6)
place(pad([88, 89], .9, cutoff=7000, a=.02, r=.6), T['eye'], .3, rev=.6)
for t0 in np.arange(33.2, 36.3, .95):
    place(heartbeat(.8), t0, .4)
# 36.4–38.2 escape burst
chase(T['escape'], T['stump'], 165, .8)
# 38.2–39.9 relief: soft music box
for i, m in enumerate([72, 76, 79]):
    place(musicbox(m, 1.4, .004), 38.7 + i * .45, .14, rev=.6)
place(pad([48, 55, 60, 64], 1.8, cutoff=900, a=.6, r=.4), 38.4, .3, rev=.5)
# 40.3–42.3 the catch
place(pad([33, 34, 40], 2.2, cutoff=900, a=.05, r=.5), T['drop1'], .7, rev=.5)
place(brass([33, 36, 39, 45], 1.4, peak=2400, base=200), T['open0'], .75, rev=.6)
place(crash(2.0), T['gulp'], .35, rev=.4)
# 42.4–45 broken lullaby + title hit
for i, t0 in enumerate(np.arange(42.6, 44.6, .42)):
    place(musicbox(mel[i % len(mel)] - 1.5 - i * .3, 1.2, .05), t0, .16, rev=.7)
place(taiko(1.3), T['title'], .8, rev=.7)
place(brass([33, 45, 48, 52], 1.8, peak=1600, base=200), T['title'], .5, rev=.7)

# ═══════════════════════════════ SFX
place(whoosh(.8, 150, 1200, 300), T['rustle'], .35, pan=-.4)                      # bush rustle
for t0 in (T['rustle'] + .2, T['rustle'] + .55, T['rise0'] - .2):
    place(scratch(.2), t0, .25, pan=-.4)
place(boing(.7, 120, 360), T['rise0'] + .2, .55, pan=-.3, rev=.3)                   # spring rises
place(squeak(2100, .9, 900), T['scream'], .45, pan=.1, rev=.4)                      # scream
for t0 in np.arange(8.6, 14.2, .56):                                                # chase bounces
    place(boing(.35, 160, 420), t0 + .02, .2, pan=-.2)
    place(kick(.6, 50), t0 + .5, .2)
place(whoosh(.5, 300, 2600, 400), T['diveBush'] - .1, .4, rev=.2)                    # dive into bush
for t0 in np.arange(T['sniff0'], T['scope0'], .16):                                 # sniffing
    d = .1
    place(fft_filter(noise(d), lo=1500, hi=6000) * np.sin(np.pi * tt(d) / d), t0, .2, pan=-.2)
place(creak(1.2, 140, 260), T['scope0'], .35, pan=-.2, rev=.3)                       # spring stretch up
place(creak(.8, 220, 120), T['scope1'] - .2, .3, pan=-.2, rev=.3)
for t0 in np.arange(T['dig0'], T['dig1'], .09):                                     # digging
    place(scratch(.1), t0, .35 + .1 * rng.random(), pan=.3)
place(creak(.5, 60, 50), T['headTurn'], .5, rev=.2)                                  # head turns 180
place(kick(1.0, 45), T['plunge'] + .1, .5)                                           # plunge into the hole
for t0 in np.arange(T['plunge'] + .2, T['unplug'], .2):
    place(scratch(.12), t0, .25, pan=-.1)
place(scratch(.3), T['popOut'] - .1, .4, pan=.3)                                     # pop out
place(boing(.8, 110, 420), T['launch'], .55, rev=.3)                                 # launch onto the canopy
place(kick(.9, 45), 21.65, .45)
place(boing(.45, 150, 400), 22.0, .3)
place(kick(.8, 45), 22.7, .35)
for t0 in (20.5, 21.28, 22.06, 22.84, 23.62):                                       # leaf hops
    place(whoosh(.25, 400, 1500, 500), t0 - .1, .12, pan=.3)
place(squeak(2300, .5, 600), T['edge'] + .05, .4, pan=.2, rev=.4)                    # "no!"
place(whoosh(1.1, 200, 2000, 300), T['leap'], .4, rev=.4)                            # slow-mo leap
place(splash(1.6, 1.2), T['splash'], .9, rev=.4)
for i in range(40):                                                                  # bubbles
    place(bubble(400 + 600 * rng.random()), T['splash'] + .2 + rng.random() * 5.6, .07, pan=rng.uniform(-.5, .5), rev=.3)
place(growl(1.2, 50), T['crocEyes'] + .2, .4, rev=.3)
place(whoosh(.5, 200, 1500, 300), T['lunge'], .4)
place(chomp(), T['snap'], .8, rev=.3)
place(splash(1.6, 1.4), T['sfSplash'], .7, rev=.4)
place(whoosh(.9, 150, 1200, 200), T['crocFlee'], .45, rev=.3)
place(splash(.8, .6), T['surface'], .5, rev=.3)
for t0 in np.arange(32.1, 32.75, .15):                                              # footsteps on wood
    place(tom(220), t0, .15)
place(kick(1.2, 60), T['slam'], .7, rev=.5)                                      # door slam
place(clang(260, .4, .6), T['slam'], .25, rev=.4)
place(buzz(36.4 - 33.6) * .5, 33.6, .1, pan=.2)                                      # flickering lamp
place(creak(T['creak1'] - T['creak0'], 70, 110), T['creak0'], .55, pan=-.4, rev=.4)   # door creak
place(growl(.8, 60), T['creak1'] - .3, .35, pan=-.4, rev=.3)
place(whoosh(.5, 300, 2600, 400), T['escape'], .4, pan=.4)                           # out of the window
place(kick(.7, 55), 37.0, .3)
d = .9                                                                               # relief breath
place(fft_filter(noise(d), lo=300, hi=2500) * np.sin(np.pi * tt(d) / d) ** 2, T['relief'], .18, rev=.3)
place(creak(.5, 200, 120), T['drop0'], .4, rev=.3)                                   # spring drops
place(boing(.7, 260, 90), T['drop0'] + .2, .5, rev=.4)
place(squeak(2500, .3, 400), T['drop1'] + .05, .45, rev=.4)                           # "ah!"
place(growl(.6, 55), T['open0'], .6, rev=.4)
place(gulp(.8), T['gulp'], 1.0, rev=.5)                                              # GULP
place(kick(1.4, 35), T['gulp'], .9)
place(chomp(), T['close'], .7, rev=.3)
for i in range(3):                                                                   # swallow down the spring
    place(gulp(.35), T['close'] + .2 + i * .27, .35 - i * .07)
place(burp(.6), T['burp'], .75, rev=.3)                                              # burp
for t0 in np.arange(T['burp'] + .1, T['bowLand'], .28):                             # bow flutters
    place(whoosh(.2, 600, 1800, 700), t0, .05, pan=rng.uniform(-.3, .3))

# ═══════════════════════════════ UNDERWATER MUFFLE (25.15–31.0)
a, b = int((T['splash'] + .35) * SR), int(T['surface'] * SR)
pad_ = int(.3 * SR)
for bus in (fs.OUT, fs.REV):
    for c in range(2):
        seg_ = bus[c, a - pad_:b + pad_].copy()
        filt = fft_filter(seg_, hi=650)
        w = np.ones(len(seg_))
        w[:pad_] = np.linspace(0, 1, pad_)
        w[-pad_:] = np.linspace(1, 0, pad_)
        bus[c, a - pad_:b + pad_] = seg_ * (1 - w) + filt * w * 1.3

fs.master(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'film', 'chase', 'soundtrack.m4a'), fade_in=.4, fade_out_at=44.2)
