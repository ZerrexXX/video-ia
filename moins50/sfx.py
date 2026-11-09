"""Musique et bruitages synthétisés (numpy), sans fichier externe.

Musique (cf. notes de production) : nappe ambient froide 0-34 s, cloches légères,
montée de percussions 40-44 s, silence 44-46.5 s (seul le sifflement de la vapeur),
piano chaleureux 50-60 s.
"""
import numpy as np

SR = 44100
rng = np.random.default_rng(7)


def _t(d):
    return np.arange(int(d * SR)) / SR


def noise(d):
    return rng.uniform(-1, 1, int(d * SR))


def onepole(x, a):
    """Passe-bas 1 pôle vectorisé (via filtre IIR approx. par convolution exponentielle)."""
    n = int(min(len(x), max(8, 5 / a)))
    k = a * (1 - a) ** np.arange(n)
    return np.convolve(x, k)[:len(x)]


def hp(x, a):
    return x - onepole(x, a)


def env(n, att=0.01, rel=None, d=None):
    e = np.ones(n)
    na = max(1, int(att * SR))
    e[:na] = np.linspace(0, 1, na)
    if rel:
        nr = min(n, int(rel * SR))
        e[-nr:] *= np.linspace(1, 0, nr)
    return e


def whoosh():
    d = 0.6
    n = onepole(noise(d), 0.08)
    return 1.6 * n * np.sin(np.linspace(0, np.pi, len(n))) ** 2


def frost():
    """Craquements cristallins du givre."""
    d = 1.8
    out = np.zeros(int(d * SR))
    for _ in range(70):
        i = int(rng.uniform(0, d - 0.03) * SR)
        t = _t(0.02)
        f = rng.uniform(3000, 8000)
        out[i:i + len(t)] += np.sin(2 * np.pi * f * t) * np.exp(-300 * t) * rng.uniform(0.1, 0.4)
    out += 0.08 * hp(noise(d), 0.5) * np.linspace(0, 1, len(out))
    return out


def tick():
    t = _t(0.05)
    return 0.6 * hp(noise(0.05), 0.3) * np.exp(-200 * t) + 0.3 * np.sin(2 * np.pi * 2200 * t) * np.exp(-150 * t)


def cloth():
    d = 0.35
    return 0.5 * onepole(noise(d), 0.25) * np.sin(np.linspace(0, np.pi, int(d * SR)))


def steam():
    d = 2.5
    n = hp(noise(d), 0.3)
    e = np.minimum(1, _t(d) * 6) * np.exp(-1.0 * _t(d))
    return 0.5 * n * e + 0.4 * onepole(noise(d), 0.02) * e


def glitch():
    out = []
    for _ in range(10):
        d = rng.uniform(0.02, 0.06)
        t = _t(d)
        out.append(np.sign(np.sin(2 * np.pi * rng.uniform(200, 2000) * t)) * 0.25)
        out.append(np.zeros(int(rng.uniform(0.0, 0.03) * SR)))
    return np.concatenate(out)


def engine():
    d = 3.0
    t = _t(d)
    f = 34 + 3 * np.sin(2 * np.pi * 0.7 * t)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sign(np.sin(ph)) * 0.5 + np.sin(2 * ph) * 0.3
    s = onepole(s, 0.05) + 0.2 * onepole(noise(d), 0.03)
    return 1.6 * s * env(len(t), 0.15, 0.8)


def scrape():
    d = 1.8
    t = _t(d)
    g = (np.sin(2 * np.pi * 3.5 * t) > 0) * 1.0
    return 0.35 * hp(noise(d), 0.4) * onepole(g, 0.01) * env(len(t), 0.02, 0.2)


def crunch():
    """Neige qui crisse comme du polystyrène."""
    d = 1.2
    out = np.zeros(int(d * SR))
    for _ in range(140):
        i = int(rng.uniform(0, d - 0.01) * SR)
        t = _t(0.008)
        out[i:i + len(t)] += rng.uniform(-1, 1, len(t)) * np.exp(-500 * t) * rng.uniform(0.2, 0.8)
    return 0.8 * hp(out, 0.2) * env(len(out), 0.05, 0.4)


def knock():
    """Poissons gelés qui s'entrechoquent comme du bois."""
    out = np.zeros(int(0.5 * SR))
    for o in (0.0, 0.18):
        t = _t(0.12)
        s = (np.sin(2 * np.pi * 620 * t) + 0.6 * np.sin(2 * np.pi * 1180 * t)) * np.exp(-45 * t)
        i = int(o * SR)
        out[i:i + len(t)] += 0.6 * s
    return out


def knife():
    d = 0.3
    t = _t(d)
    return 0.4 * hp(noise(d), 0.6) * np.sin(np.linspace(0, np.pi, len(t))) ** 3


def hiss():
    """Sifflement de l'eau qui se cristallise (long, ralenti)."""
    d = 5.5
    t = _t(d)
    n = hp(noise(d), 0.35)
    e = np.minimum(1, t * 8) * np.exp(-0.45 * t)
    crackle = np.zeros(len(t))
    for _ in range(400):
        i = int(rng.uniform(0, d * 0.8) * SR)
        tt = _t(0.01)
        crackle[i:i + len(tt)] += np.sin(2 * np.pi * rng.uniform(4000, 9000) * tt) * np.exp(-400 * tt) * 0.2
    return 0.7 * n * e + crackle * e + 0.4 * onepole(noise(d), 0.01) * e


SFX = dict(whoosh=whoosh, frost=frost, tick=tick, cloth=cloth, steam=steam, glitch=glitch,
           engine=engine, scrape=scrape, crunch=crunch, knock=knock, knife=knife, hiss=hiss)


def tone(f, d, harm=((1, 1), (2, 0.3), (3, 0.12)), dec=2.0, att=0.01):
    t = _t(d)
    s = sum(a * np.sin(2 * np.pi * f * h * t) for h, a in harm)
    return s * np.exp(-dec * t) * np.minimum(1, t / att)


def music(duration):
    n = int(duration * SR)
    out = np.zeros(n + SR * 4)
    t = _t(duration)
    # nappe froide : drones Ré mineur, lents battements
    pad_end = 46.5
    for f, a in [(73.4, 0.5), (110.0, 0.35), (146.8, 0.25), (174.6, 0.18), (220.0, 0.12)]:
        s = np.sin(2 * np.pi * f * t + 0.3 * np.sin(2 * np.pi * 0.07 * t)) + 0.5 * np.sin(2 * np.pi * f * 1.003 * t)
        out[:n] += a * s * (0.6 + 0.4 * np.sin(2 * np.pi * 0.05 * t + f))
    pad_env = np.clip(t / 2.0, 0, 1) * np.clip((44.0 - t) / 0.4, 0, 1)
    pad_env = np.maximum(pad_env, 0) + np.clip((t - 46.5) / 1.5, 0, 1) * np.clip((52 - t) / 2, 0, 1) * 0.6
    out[:n] *= pad_env * 0.25
    # cloches légères
    for tb, f in [(1.0, 880), (6.0, 1174.7), (11.0, 987.8), (17.0, 880), (22.5, 1318.5), (28.0, 1174.7),
                  (33.0, 987.8), (37.0, 880), (41.0, 1174.7)]:
        s = tone(f, 4, harm=((1, 1), (2.76, 0.4), (5.4, 0.2)), dec=1.2) * 0.12
        i = int(tb * SR)
        out[i:i + len(s)] += s
    # montée de percussions 38-44 s
    tt = 38.0
    while tt < 44.0:
        k = (tt - 38) / 6
        d = 0.25
        x = _t(d)
        kick = np.sin(2 * np.pi * (50 + 80 * np.exp(-30 * x)) * x) * np.exp(-12 * x) * (0.4 + 0.5 * k)
        i = int(tt * SR)
        out[i:i + len(kick)] += kick
        if k > 0.4:
            sn = hp(noise(0.12), 0.4) * np.exp(-30 * _t(0.12)) * 0.25 * k
            j = int((tt + 0.25) * SR)
            out[j:j + len(sn)] += sn
        tt += 0.5 - 0.25 * k
    # piano chaleureux 50-60 s (Ré majeur)
    piano = [(50.2, [146.8, 220.0, 293.7, 370.0]), (52.6, [123.5, 185.0, 246.9, 293.7]),
             (55.0, [98.0, 196.0, 246.9, 293.7]), (57.4, [110.0, 220.0, 277.2, 329.6]), (59.4, [146.8, 293.7])]
    for tb, chord in piano:
        for j, f in enumerate(chord):
            s = tone(f, 3.5, harm=((1, 1), (2, 0.45), (3, 0.2), (4, 0.08)), dec=1.1, att=0.004) * 0.13
            i = int((tb + j * 0.11) * SR)
            out[i:i + len(s)] += s
    for tb, f in [(51.4, 587.3), (52.0, 659.3), (53.8, 740.0), (56.2, 587.3), (58.6, 554.4)]:
        s = tone(f, 2.5, harm=((1, 1), (2, 0.3)), dec=1.6, att=0.004) * 0.1
        i = int(tb * SR)
        out[i:i + len(s)] += s
    out = out[:n]
    out[int(44.0 * SR):int(46.5 * SR)] *= 0.0   # silence total au moment du lancer
    return out


def mix(duration, events, narration, narr_sr, duck):
    n = int(duration * SR)
    out = np.zeros(n)
    cache = {}
    for t, name, g in events:
        if name not in cache:
            cache[name] = SFX[name]()
        s = cache[name] * g
        i = int(t * SR)
        s = s[:n - i]
        out[i:i + len(s)] += s
    m = music(duration)
    g = np.ones(n)
    for a, b in duck:
        g[int(a * SR):int(b * SR)] = 0.55
    g = np.convolve(g, np.ones(4000) / 4000, mode="same")
    out += m * g
    idx = np.arange(n) * narr_sr / SR
    out += np.interp(idx, np.arange(len(narration)), narration, right=0) * 1.0
    peak = np.max(np.abs(out))
    return out * (0.95 / peak) if peak > 0.95 else out
