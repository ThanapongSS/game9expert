#!/usr/bin/env python3
"""Synthesize the 30 s soundtrack for film/index.html (music + SFX), numpy only.

    python3 tools/film-soundtrack.py            -> film/soundtrack.m4a

Every cue time below mirrors the timeline object `T` in film/index.html. Change both together.
Instruments and the master chain live in tools/filmsynth.py.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import filmsynth as fs

fs.init(30.0, seed=20261115)
from filmsynth import *  # noqa: E402,F401,F403  (OUT, N, rng and instruments, bound after init)

# ── timeline (sync with film/index.html `T`)
T = dict(aWalk0=2.5, aArrive=11.9, aX0=-14.5, aStop=-2.8, bWalk0=5.0, bArrive=12.3, bX0=14.5, bStop=2.8,
         cuA=12.2, cuB=12.85, draw=13.5, summon0=13.7, summon1=14.45, hop0=14.6, hop1=15.2,
         fire=[15.6, 16.05, 16.5, 16.92, 17.3], travel=[.26, .26, .24, .24, .7],
         dashA0=18.1, dashB0=18.45, dash1=18.9, clash=[18.95, 19.6, 20.25, 20.95],
         leap0=21.5, leap1=22.3, charge0=22.3, charge1=25.45, beam0=25.5, boom=27.0, after=27.6, title=28.0)


# ═══════════════════════════════ AMBIENCE
wind = fft_filter(noise(DUR), lo=80, hi=420)
tm = tt(DUR)
storm = np.clip((tm - 21.4) / 1.4, 0, 1) * (tm < T['boom'])
wind *= (.07 + .05 * np.sin(2 * np.pi * .13 * tm)) * (1 - np.clip((tm - 13.5) / 2, 0, .6)) + storm * .12
place(wind / np.abs(wind).max() * .9, 0, .55)
for i in range(26):  # birds 0.5–12.5
    t0 = .5 + rng.random() * 12
    for k in range(rng.integers(2, 5)):
        d = .07
        tb = tt(d)
        f = 2600 + 1600 * rng.random() + 1400 * np.sin(np.pi * tb / d)
        place(sine(f, d) * np.sin(np.pi * tb / d) ** 2, t0 + k * .11, .05, pan=rng.uniform(-.8, .8), rev=.3)

# ═══════════════════════════════ MUSIC
# 0–11: misty D minor pad + harp
place(pad([50, 57, 64, 65, 72], 11.6, cutoff=1100, a=3, r=1.2), 0, .55, rev=.5)
harp = [62, 65, 69, 72, 74, 77, 81, 77, 74, 72, 69, 65]
for i, t0 in enumerate(np.arange(3.0, 10.9, .25)):
    m = harp[i % len(harp)] + (0 if t0 < 7 else (2 if (i // 12) % 2 else 0))
    place(bell(m, 1.4, .8), t0, .1 + .03 * (i % 4 == 0), pan=.4 * math.sin(i), rev=.45)
# 10.8–13.5: tension tremolo + taiko
d = 2.75
trem = pad([50, 57, 62, 63], d, cutoff=2200, a=1.6, r=.15) * (.6 + .4 * np.sin(2 * np.pi * 11 * tt(d)))
place(trem, 10.8, .75, rev=.4)
for t0, g in [(11.0, .6), (12.2, .9), (12.85, .9)]:
    place(taiko(g), t0, .7, rev=.5)
# 13.5 BRAAAM
place(brass([26, 33, 38], 2.0, peak=1800, base=200), 13.5, .9, rev=.6)
place(kick(1.2, 38), 13.5, .8)
place(crash(), 13.5, .35, rev=.3)

# 13.5–21.5 action groove (140 bpm)
beat = 60 / 140
chords = [([38, 45, 50, 53, 57], 38), ([34, 41, 46, 50, 53], 34), ([36, 43, 48, 52, 55], 36), ([33, 40, 45, 49, 52], 33)]
t0 = 13.5 + 4 * beat * .5
b = 0
while t0 < T['leap0'] - .01:
    slowmo = 17.35 < t0 < 18.05
    bar = int(b // 4)
    notes, root = chords[bar % 4]
    if not slowmo:
        place(kick(.9), t0, .55)
        if b % 2 == 1:
            place(snare(), t0, .35, rev=.15)
        for h in (0, .5):
            place(hat(open_=(b % 4 == 3 and h)), t0 + h * beat, .22, pan=.3)
        for h in (0, .5):
            m = root + (12 if (b % 2 == 1 and h) else 0)
            place(bass(m + 12, beat * .48), t0 + h * beat, .42)
        if b % 4 == 0:
            place(brass(notes[1:], beat * 1.4), t0, .32, rev=.25)
        if b % 4 == 1:
            place(brass(notes[1:], beat * .7), t0 + beat * .5, .22, rev=.25)
    t0 += beat
    b += 1
# slow-motion drone during last bolt
d = .9
place(pad([26, 33], d, cutoff=500, a=.1, r=.3) * 1.5, 17.25, .6, rev=.6)
place(crash(), 18.1, .3, rev=.3)
for t0 in (17.75, 17.85, 17.95):
    place(tom(160 - (t0 - 17.75) * 200), t0, .5)

# 21.5–25.45 charge: choir + tom roll + riser
place(choir([46, 53, 58, 62], 1.75, a=.5, r=.3), 21.5, .5, rev=.6)
place(choir([48, 55, 60, 64], 1.0, a=.2, r=.2), 23.2, .55, rev=.6)
place(choir([50, 57, 62, 67, 69], 1.3, a=.2, r=.05), 24.2, .6, rev=.6)
place(pad([34, 41, 46], 1.75, cutoff=800, a=.3, r=.3), 21.5, .5, rev=.4)
place(pad([36, 43, 48], 1.0, cutoff=900, a=.1, r=.2), 23.2, .5, rev=.4)
place(pad([38, 45, 50, 55], 1.3, cutoff=1100, a=.1, r=.05), 24.2, .55, rev=.4)
t0, gap = T['leap1'], .3
while t0 < T['charge1']:
    place(tom(110 + 60 * (t0 - T['leap1']) / 3), t0, .35 + .25 * (t0 - T['leap1']) / 3, pan=math.sin(t0 * 7) * .3)
    t0 += gap
    gap = max(.07, gap * .93)
d = T['charge1'] - T['charge0']
tr = tt(d)
riser = lp_var(noise(d), 200 + 6000 * (tr / d) ** 2) * (tr / d) ** 1.5
place(riser / np.abs(riser).max(), T['charge0'], .35, rev=.3)
place(sine(110 * 2 ** (2 * tr / d), d) * (tr / d) ** 2 * .5, T['charge0'], .25)

# 25.5–27.0 beam: fortissimo D minor + driving 8ths
d = T['boom'] - T['beam0']
place(brass([38, 45, 50, 53, 57, 62], d, peak=2800, base=900), T['beam0'], .75, rev=.4)
place(choir([62, 65, 69, 74], d, a=.05, r=.02, vowel=(700, 1220, 2600)), T['beam0'], .45, rev=.5)
t0 = T['beam0']
while t0 < T['boom'] - .05:
    place(kick(.8), t0, .6)
    place(snare(), t0 + beat / 4, .18 + .25 * (t0 - T['beam0']) / d)
    t0 += beat / 2

# 27.6–30 resolution: D major, title hit
place(pad([50, 54, 57, 62, 66], 2.6, cutoff=1500, a=.5, r=1.3), 27.45, .5, rev=.6)
place(choir([62, 66, 69, 74], 2.4, a=.8, r=1.2), 27.6, .35, rev=.7)
for i, m in enumerate([62, 66, 69, 74, 78, 81, 86]):
    place(bell(m, 1.8, .7), 27.7 + i * .06, .1, pan=-.5 + i * .16, rev=.6)
place(brass([38, 50, 54, 57, 62], 2.0, peak=2200, base=500), T['title'], .55, rev=.6)
place(taiko(1.2), T['title'], .8, rev=.6)
place(crash(3.0), T['title'], .35, rev=.4)

# ═══════════════════════════════ SFX
for t0 in step_times(T['aWalk0'], T['aArrive'], T['aX0'], T['aStop'], .6):
    g = .5 if t0 < 7 else (.15 if t0 < 11 else .3)
    place(step_sfx(), t0, g * .5, pan=-.2)
for t0 in step_times(T['bWalk0'], T['bArrive'], T['bX0'], T['bStop'], .55):
    g = .1 if t0 < 7 else (.5 if t0 < 11 else .3)
    place(step_sfx(), t0, g * .55, pan=.2)
for t0, g in [(2.95, .15), (3.95, .4), (6.95, .15), (7.65, .4), (10.95, .2), (12.15, .25), (12.8, .25), (13.45, .3)]:
    place(whoosh(.55), t0, g, pan=rng.uniform(-.3, .3), rev=.2)
for t0, m in [(12.42, 93), (13.02, 98)]:  # eye glint
    place(bell(m, .7, 1.4), t0, .2, rev=.5)
    place(bell(m + 7, .5, 1.2), t0, .1, rev=.5)
# summon sword
for i, m in enumerate([81, 85, 88, 93, 97]):
    place(bell(m, .8, 1.2), T['summon0'] + i * .07, .14, pan=-.3, rev=.5)
place(whoosh(.5, 400, 6000, 2000), T['summon0'], .3, pan=-.3)
place(clang(1320, 1.6, .9), T['summon0'] + .38, .5, pan=-.3, rev=.6)
# hop + gun cock + whine
place(whoosh(.5, 300, 2200, 400), T['hop0'], .4, pan=.4)
for t0 in (15.02, 15.12):
    d = .03
    place(fft_filter(noise(d), lo=2000) * np.exp(-tt(d) / .006), t0, .5, pan=.4)
d = .4
place(sine(600 + 1600 * tt(d) / d, d) * np.sin(np.pi * tt(d) / d) * .3, 15.15, .3, pan=.4)
# bolts
for i, (f0, trv) in enumerate(zip(T['fire'], T['travel'])):
    slow = i == 4
    place(pew(1400 if slow else 2400 + i * 150, 120 if slow else 260, .55 if slow else .22), f0, .45, pan=.45, rev=.25)
    hit = f0 + trv
    place(clang(560 if slow else 1000 + 90 * i, 2.2 if slow else .9, 1.0), hit, .6 if slow else .45, pan=-.35, rev=.5 if slow else .25)
    if slow:
        place(taiko(.8), hit, .5, rev=.5)
# dash, blade extend
place(whoosh(.45, 500, 4000, 600), T['dashA0'], .45, pan=-.3)
place(whoosh(.45, 500, 4000, 600), T['dashB0'], .45, pan=.3)
d = .5
tb = tt(d)
saber = lp_var(saw(110 + 120 * tb / d, d) + saw(112 + 121 * tb / d, d), 300 + 3000 * tb / d) * np.minimum(1, (d - tb) / .1)
place(saber * .6, 18.25, .5, pan=.3, rev=.3)
# clashes
for i, c in enumerate(T['clash']):
    big = i == 3
    place(clang(720 + 60 * i, 1.8 if big else 1.0, 1.0), c, .6 if big else .5, rev=.6 if big else .3)
    place(kick(1.0, 40), c, .6 if big else .35)
    if big:
        place(crash(2.6), c, .45, rev=.4)
        place(taiko(1.2), c, .7, rev=.6)
place(whoosh(.6, 300, 2500, 500), 20.75, .3, rev=.3)
# leap + wing flaps + rocks
place(whoosh(.7, 200, 1800, 300), T['leap0'], .55, rev=.3)
for t0 in np.arange(21.75, 25.4, .45):
    place(whoosh(.3, 150, 700, 200), t0, .12, pan=math.sin(t0 * 3) * .6)
d = T['charge1'] - T['charge0']
rumble = fft_filter(noise(d), lo=25, hi=110) * np.linspace(.2, 1, int(d * SR))
place(rumble / np.abs(rumble).max(), T['charge0'], .5)
# Rainbolt crackle + Solara shimmer
t0 = T['charge0'] + .1
while t0 < T['charge1']:
    place(zap_crackle(.05 + .05 * rng.random()), t0, .25 + .2 * (t0 - T['charge0']) / d, pan=.5, rev=.15)
    t0 += .05 + .18 * rng.random() * (1 - (t0 - T['charge0']) / d * .7)
ts = tt(d)
shim = sum(np.sin(2 * np.pi * mtof(m) * ts) for m in (86, 90, 93, 98)) * (.5 + .5 * np.sin(2 * np.pi * 9 * ts)) * (ts / d)
place(shim * .05, T['charge0'], 1, pan=-.5, rev=.5)
# sky thunder (sync with JS sky lightning)
for st in (22.6, 23.97, 24.7, 26.07, 26.8):
    if st < T['boom']:
        place(thunder(2.0), st + .08, .45, pan=rng.uniform(-.5, .5), rev=.4)
# beams
place(kick(1.4, 35), T['beam0'], .8)
place(whoosh(.5, 800, 8000, 3000), T['beam0'], .5, rev=.4)
d = T['boom'] - T['beam0']
tb = tt(d)
hum = (saw(55, d) + saw(55.7, d) + saw(110.4, d) * .5) * (1 + .3 * np.sin(2 * np.pi * 13 * tb))
hum = fft_filter(hum, hi=900) + fft_filter(noise(d), lo=400, hi=3000) * .5
place(hum / np.abs(hum).max() * np.minimum(1, tb / .1) * (.6 + .4 * tb / d), T['beam0'], .8, rev=.2)
# explosion
d = 4.0
tb = tt(d)
boom = sine(70 * np.exp(-tb / .5) + 22, d) * np.exp(-tb / 1.0) * 1.2
boom += fft_filter(noise(d), hi=1200) * np.exp(-tb / .55) * 1.4
boom += fft_filter(noise(d), lo=2000) * np.exp(-tb / .08) * .6
place(boom / np.abs(boom).max(), T['boom'], 2.4, rev=.8)
# falling sparkles
for i in range(14):
    place(bell(96 + int(rng.integers(0, 12)), .9, 1.0), 27.7 + rng.random() * 1.8, .04, pan=rng.uniform(-.7, .7), rev=.6)


fs.master(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'film', 'soundtrack.m4a'), fade_in=.6, fade_out_at=29.1)
