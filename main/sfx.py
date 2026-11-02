"""Bruitages et musique synthétisés (numpy), sans fichier externe."""
import numpy as np

SR = 44100
rng = np.random.default_rng(7)


def _t(d):
    return np.arange(int(d * SR)) / SR


def env(n, a=0.005, r=None):
    e = np.ones(n)
    na = max(1, int(a * SR))
    e[:na] = np.linspace(0, 1, na)
    if r is None:
        e *= np.linspace(1, 0, n) ** 2
    return e


def sweep(f0, f1, d, wave="sine"):
    t = _t(d)
    f = np.geomspace(f0, f1, len(t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    if wave == "square":
        return np.sign(np.sin(ph))
    if wave == "tri":
        return 2 / np.pi * np.arcsin(np.sin(ph))
    return np.sin(ph)


def noise(d):
    return rng.uniform(-1, 1, int(d * SR))


def lowpass(x, a):
    y = np.empty_like(x)
    s = 0.0
    for i, v in enumerate(x):
        s += a * (v - s)
        y[i] = s
    return y


def whoosh():
    d = 0.35
    n = noise(d)
    n = lowpass(n, 0.18)
    e = np.sin(np.linspace(0, np.pi, len(n))) ** 2
    return 0.9 * n * e


def pop():
    s = sweep(300, 1200, 0.09)
    return 0.6 * s * env(len(s))


def boing():
    d = 0.5
    t = _t(d)
    f = 180 + 120 * np.sin(2 * np.pi * 9 * t) * np.exp(-4 * t)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR)
    return 0.6 * s * np.exp(-5 * t)


def bonk():
    d = 0.35
    t = _t(d)
    s = np.sin(2 * np.pi * np.cumsum(np.geomspace(220, 60, len(t))) / SR)
    n = lowpass(noise(d), 0.3) * np.exp(-30 * t)
    return 0.9 * (s * np.exp(-9 * t) + 0.8 * n)


def slam():
    d = 0.6
    t = _t(d)
    n = lowpass(noise(d), 0.12) * np.exp(-8 * t)
    s = np.sin(2 * np.pi * 55 * t) * np.exp(-6 * t)
    return 1.0 * (n * 1.4 + s)


def zap():
    d = 0.7
    t = _t(d)
    buzz = np.sign(np.sin(2 * np.pi * (90 + 40 * np.sin(2 * np.pi * 13 * t)) * t))
    crack = noise(d) * (rng.uniform(0, 1, len(t)) > 0.7)
    return 0.45 * (buzz * 0.6 + crack * 0.5) * np.exp(-2.5 * t)


def sizzle():
    d = 1.4
    t = _t(d)
    n = noise(d) - lowpass(noise(d), 0.5)
    crackle = (rng.uniform(0, 1, len(t)) > 0.995) * rng.uniform(-1, 1, len(t))
    return 0.35 * (n + crackle * 2) * np.minimum(1, 6 * t) * np.exp(-1.2 * t)


def crickets():
    d = 2.2
    t = _t(d)
    chirp = np.sin(2 * np.pi * 4300 * t) * (np.sin(2 * np.pi * 30 * t) > 0.3)
    gate = (np.sin(2 * np.pi * 1.6 * t) > 0.2)
    return 0.12 * chirp * gate


def ding():
    t = _t(1.2)
    s = sum(np.sin(2 * np.pi * f * t) * a for f, a in [(1320, 1), (2640, 0.4), (3960, 0.2)])
    return 0.35 * s * np.exp(-3 * t)


def sparkle():
    out = np.zeros(int(0.9 * SR))
    for i, f in enumerate([1568, 2093, 2637, 3136, 4186]):
        t = _t(0.4)
        tone = np.sin(2 * np.pi * f * t) * np.exp(-9 * t) * 0.25
        o = int(i * 0.08 * SR)
        out[o:o + len(tone)] += tone
    return out


def crack():
    out = np.zeros(int(0.5 * SR))
    for o in [0.0, 0.11, 0.19]:
        t = _t(0.05)
        c = noise(0.05) * np.exp(-90 * t)
        k = int(o * SR)
        out[k:k + len(c)] += c
    return 0.8 * out


def splat():
    d = 0.4
    t = _t(d)
    s = lowpass(noise(d), 0.25) * np.exp(-12 * t)
    b = sweep(400, 90, d) * np.exp(-10 * t)
    return 0.8 * (s + 0.6 * b)


def chomp():
    out = np.zeros(int(0.6 * SR))
    for o in [0.0, 0.22]:
        t = _t(0.12)
        c = lowpass(noise(0.12), 0.4) * np.exp(-30 * t) + np.sin(2 * np.pi * 140 * t) * np.exp(-25 * t)
        k = int(o * SR)
        out[k:k + len(c)] += c
    return 0.8 * out


def clap():
    out = np.zeros(int(1.4 * SR))
    for k in range(9):
        o = k * 0.14 + rng.uniform(0, 0.02)
        t = _t(0.06)
        c = (noise(0.06) - lowpass(noise(0.06), 0.3)) * np.exp(-60 * t)
        i = int(o * SR)
        out[i:i + len(c)] += c
    return 0.7 * out


def drum_roll_hit():
    t = _t(0.8)
    return 0.5 * lowpass(noise(0.8), 0.3) * np.exp(-5 * t)


def sad_trombone():
    out = []
    for f, d in [(392, 0.35), (370, 0.35), (349, 0.35), (330, 1.0)]:
        t = _t(d)
        vib = 1 + 0.01 * np.sin(2 * np.pi * 6 * t) * (d > 0.5)
        s = sweep(f, f, d, "tri") * 0.6 + 0.4 * np.sin(2 * np.pi * f * 2 * vib * t)
        out.append(s * np.minimum(1, 30 * t) * np.minimum(1, 8 * (d - t)))
    return 0.25 * np.concatenate(out)


def harp():
    notes = [261.6, 329.6, 392.0, 523.3, 659.3, 784.0, 1046.5, 1318.5]
    out = np.zeros(int(2.2 * SR))
    for i, f in enumerate(notes):
        tone = pluck(f, 1.2) * 0.5
        o = int(i * 0.07 * SR)
        out[o:o + len(tone)] += tone
    return out


def gong():
    t = _t(2.5)
    s = sum(np.sin(2 * np.pi * f * t) * a for f, a in [(110, 1), (163, .6), (231, .4), (317, .3)])
    return 0.35 * s * np.exp(-1.6 * t) * np.minimum(1, 80 * t)


def heartbeat():
    out = np.zeros(int(1.0 * SR))
    for o in (0, 0.22):
        t = _t(0.15)
        b = np.sin(2 * np.pi * 55 * t) * np.exp(-25 * t)
        i = int(o * SR)
        out[i:i + len(b)] += b
    return 0.9 * out


def pluck(f, d):
    """Karplus-Strong."""
    n = int(d * SR)
    p = max(2, int(SR / f))
    buf = rng.uniform(-1, 1, p)
    out = np.empty(n)
    for i in range(n):
        out[i] = buf[i % p]
        buf[i % p] = 0.5 * (buf[i % p] + buf[(i + 1) % p]) * 0.996
    return out


SFX = dict(whoosh=whoosh, pop=pop, boing=boing, bonk=bonk, slam=slam, zap=zap,
           sizzle=sizzle, crickets=crickets, ding=ding, sparkle=sparkle,
           crack=crack, splat=splat, chomp=chomp, clap=clap, hit=drum_roll_hit,
           sad=sad_trombone, harp=harp, gong=gong, heart=heartbeat)


def music(duration, bpm=112):
    """Petite boucle légère type ukulélé + basse, volume bas."""
    beat = 60 / bpm
    prog = [(261.6, [261.6, 329.6, 392.0]), (220.0, [220.0, 261.6, 329.6]),
            (174.6, [174.6, 220.0, 261.6]), (196.0, [196.0, 246.9, 293.7])]
    out = np.zeros(int((duration + 2) * SR))
    cache = {}
    t = 0.0
    bar = 0
    while t < duration:
        root, chord = prog[bar % 4]
        for b in range(4):
            # basse
            key = ("b", root)
            if key not in cache:
                tt = _t(beat * 0.9)
                cache[key] = np.sin(2 * np.pi * root / 2 * tt) * np.exp(-3 * tt) * 0.5
            i = int((t + b * beat) * SR)
            out[i:i + len(cache[key])] += cache[key] * (1 if b % 2 == 0 else 0.6)
            # accords en croches
            for h in range(2):
                f = chord[(b * 2 + h) % 3] * 2
                key = ("p", f)
                if key not in cache:
                    cache[key] = pluck(f, 0.35) * 0.35
                i = int((t + b * beat + h * beat / 2) * SR)
                out[i:i + len(cache[key])] += cache[key]
        t += 4 * beat
        bar += 1
    return out[:int(duration * SR)]


def mix(duration, events, narration, narr_sr, music_gain=0.12, duck=None):
    """events: liste de (temps, nom, gain). duck: liste de (start, end, gain) pour la musique."""
    n = int(duration * SR)
    out = np.zeros(n)
    cache = {}
    for t, name, g in events:
        if name not in cache:
            cache[name] = SFX[name]()
        s = cache[name] * g
        i = int(t * SR)
        if i >= n:
            continue
        s = s[:n - i]
        out[i:i + len(s)] += s
    m = music(duration) * music_gain
    if duck:
        g = np.ones(n)
        for a, b, gg in duck:
            g[int(a * SR):int(b * SR)] = gg
        g = lowpass(g, 0.0005) if n < 0 else np.convolve(g, np.ones(2000) / 2000, mode="same")
        m *= g
    out += m
    # voix
    idx = np.arange(n) * narr_sr / SR
    v = np.interp(idx, np.arange(len(narration)), narration, right=0)
    out += v * 0.95
    peak = np.max(np.abs(out))
    if peak > 0.98:
        out *= 0.98 / peak
    return out
