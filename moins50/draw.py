"""Primitives de dessin (skia) : lumière, brouillard, neige, givre, personnage.

Repère logique 540 x 960, mis à l'échelle x2 (sortie 1080x1920).
"""
import math
import os
import random

import numpy as np
import skia

W, H = 540, 960
HERE = os.path.dirname(os.path.abspath(__file__))
FONT = skia.Typeface.MakeFromFile(os.path.join(HERE, "assets", "fonts", "LilitaOne.ttf"))
SANS = skia.Typeface("DejaVu Sans", skia.FontStyle.Bold())

WHITE = 0xFFFFFFFF
BLACK = 0xFF000000
ICE = 0xFF7FE8FF          # cyan glacé des mots-clés
SODIUM = 0xFFFFA347       # lampadaires
NIGHT = 0xFF070D1A
DEEP = 0xFF0E1B30
STEEL = 0xFF233650
FOG = 0xFF9DB3C8
SNOW = 0xFFDCE6F0
PARKA = 0xFF1A2742        # parka bleu nuit
PARKA_L = 0xFF2A3A5C
FUR = 0xFF8C8F94          # chapka grise
FUR_D = 0xFF63666C
SCARF = 0xFFB8262E        # écharpe rouge
SKIN = 0xFFC99272
SKIN_D = 0xFF9E6B50


# ---------------------------------------------------------------- maths
def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def lerp(a, b, t):
    return a + (b - a) * t


def prog(t, a, b):
    return clamp((t - a) / max(1e-6, b - a))


def ease(t):
    t = clamp(t)
    return t * t * (3 - 2 * t)


def ease_out(t):
    t = clamp(t)
    return 1 - (1 - t) ** 3


def ease_in(t):
    t = clamp(t)
    return t ** 3


def mixc(c1, c2, t):
    t = clamp(t)
    out = 0
    for sh in (24, 16, 8, 0):
        a, b = (c1 >> sh) & 255, (c2 >> sh) & 255
        out |= int(round(a + (b - a) * t)) << sh
    return out


def alpha(c, a):
    return (int(clamp(a) * 255) << 24) | (c & 0xFFFFFF)


# ---------------------------------------------------------------- peinture
def P(color, stroke=None, blur=0, cap=True):
    p = skia.Paint(AntiAlias=True, Color=color)
    if stroke:
        p.setStyle(skia.Paint.kStroke_Style)
        p.setStrokeWidth(stroke)
        p.setStrokeCap(skia.Paint.kRound_Cap if cap else skia.Paint.kButt_Cap)
        p.setStrokeJoin(skia.Paint.kRound_Join)
    if blur:
        p.setMaskFilter(skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, blur))
    return p


def lin(x0, y0, x1, y1, colors, pos=None):
    p = skia.Paint(AntiAlias=True)
    p.setShader(skia.GradientShader.MakeLinear([skia.Point(x0, y0), skia.Point(x1, y1)], colors, pos))
    return p


def rad(x, y, r, colors, pos=None):
    p = skia.Paint(AntiAlias=True)
    p.setShader(skia.GradientShader.MakeRadial(skia.Point(x, y), max(1, r), colors, pos))
    return p


def R(x, y, w, h):
    return skia.Rect.MakeXYWH(x, y, w, h)


def rrect(x, y, w, h, r):
    return skia.RRect.MakeRectXY(R(x, y, w, h), r, r)


def poly(pts, close=True):
    path = skia.Path()
    path.moveTo(*pts[0])
    for p in pts[1:]:
        path.lineTo(*p)
    if close:
        path.close()
    return path


def oval(c, x, y, rx, ry, paint):
    c.drawOval(skia.Rect.MakeLTRB(x - rx, y - ry, x + rx, y + ry), paint)


class Save:
    def __init__(self, c, x=0, y=0, rot=0, s=1, sy=None):
        self.c, self.a = c, (x, y, rot, s, sy)

    def __enter__(self):
        x, y, rot, s, sy = self.a
        self.c.save()
        self.c.translate(x, y)
        if rot:
            self.c.rotate(rot)
        self.c.scale(s, s if sy is None else sy)
        return self.c

    def __exit__(self, *a):
        self.c.restore()


class Blur:
    """Calque flouté (mise au point, profondeur de champ)."""

    def __init__(self, c, sigma, a=1.0):
        self.c, self.s, self.a = c, sigma, a

    def __enter__(self):
        p = skia.Paint(Color=alpha(WHITE, self.a))
        if self.s > 0.3:
            p.setImageFilter(skia.ImageFilters.Blur(self.s, self.s))
        self.c.saveLayer(None, p)
        return self.c

    def __exit__(self, *a):
        self.c.restore()


def zoom(c, s, cx=W / 2, cy=H / 2):
    c.translate(cx, cy)
    c.scale(s, s)
    c.translate(-cx, -cy)


def sky(c, top, bottom, y0=0, y1=H):
    c.drawRect(R(-W, -H, 3 * W, 3 * H), lin(0, y0, 0, y1, [top, bottom]))


def glow(c, x, y, r, color, a=1.0):
    c.drawCircle(x, y, r, rad(x, y, r, [alpha(color, a), alpha(color, a * 0.35), alpha(color, 0)], [0, 0.35, 1]))


def lamp(c, x, y, h, t=0, a=1.0, side=1):
    """Lampadaire au sodium avec halo dans le brouillard."""
    c.drawRect(R(x - 2, y - h, 4, h), P(alpha(0xFF0B1220, a)))
    c.drawLine(x, y - h, x + 18 * side, y - h - 6, P(alpha(0xFF0B1220, a), 3))
    lx, ly = x + 20 * side, y - h - 3
    flick = 1 + 0.03 * math.sin(t * 13 + x)
    glow(c, lx, ly + 10, 70 * flick, SODIUM, 0.45 * a)
    glow(c, lx, ly, 14, 0xFFFFE2B0, 0.95 * a)
    # cône de lumière
    c.drawPath(poly([(lx - 4, ly), (lx + 4, ly), (lx + 45, y), (lx - 45, y)]),
               lin(0, ly, 0, y, [alpha(SODIUM, 0.22 * a), alpha(SODIUM, 0.0)]))


def fog(c, y, h, a, t, color=FOG, speed=6, seed=0):
    """Nappes de brouillard qui dérivent."""
    rnd = random.Random(seed)
    c.drawRect(R(-50, y - h * 0.5, W + 100, h), lin(0, y - h * 0.5, 0, y + h * 0.5,
                                                     [alpha(color, 0), alpha(color, a), alpha(color, a * 0.8)]))
    for i in range(9):
        x = (rnd.uniform(-100, W + 100) + t * speed * rnd.uniform(0.5, 1.5)) % (W + 300) - 150
        yy = y + rnd.uniform(-0.3, 0.3) * h
        oval(c, x, yy, rnd.uniform(90, 200), rnd.uniform(18, 45), P(alpha(color, a * 0.5), blur=22))


def snow(c, t, n=80, seed=1, speed=40, size=1.6, a=0.8, wind=8, area=(0, 0, W, H)):
    rnd = random.Random(seed)
    x0, y0, w, h = area
    for i in range(n):
        z = rnd.uniform(0.3, 1.0)
        x = x0 + (rnd.uniform(0, w) + wind * t * z + 6 * math.sin(t * 1.3 + i)) % w
        y = y0 + (rnd.uniform(0, h) + speed * t * z) % h
        c.drawCircle(x, y, size * z, P(alpha(SNOW, a * z), blur=0.6 if z > 0.7 else 0))


def sparkles(c, t, n, area, seed=3, a=0.9, color=WHITE):
    rnd = random.Random(seed)
    x0, y0, w, h = area
    for i in range(n):
        x, y = x0 + rnd.uniform(0, w), y0 + rnd.uniform(0, h)
        k = max(0.0, math.sin(t * rnd.uniform(2, 5) + i)) ** 6
        if k > 0.05:
            s = 1 + 3 * k
            p = P(alpha(color, a * k), 1)
            c.drawLine(x - s, y, x + s, y, p)
            c.drawLine(x, y - s, x, y + s, p)


def puff(c, x, y, r, a, color=0xFFE8EEF4, seed=0, t=0, spread=1.0):
    """Nuage de vapeur (amas de disques flous)."""
    rnd = random.Random(seed)
    for i in range(14):
        dx = rnd.uniform(-1, 1) * r * 0.8 * spread
        dy = rnd.uniform(-1, 1) * r * 0.5 * spread
        rr = r * rnd.uniform(0.35, 0.7)
        c.drawCircle(x + dx + math.sin(t * 0.7 + i) * 4, y + dy, rr,
                     P(alpha(color, a * rnd.uniform(0.35, 0.7)), blur=rr * 0.45))


def smoke_column(c, x, y, h, t, a=0.7, seed=0):
    rnd = random.Random(seed)
    for i in range(12):
        k = ((i / 12) + t * 0.08) % 1.0
        yy = y - k * h
        rr = 6 + 26 * k
        c.drawCircle(x + math.sin(k * 5 + seed) * 3 * k, yy, rr,
                     P(alpha(0xFFDDE5EE, a * (1 - k) * rnd.uniform(0.6, 1)), blur=rr * 0.5))


def building(c, x, y, w, h, floors=9, seed=0, lit=0.35, col=0xFF18243A, win=SODIUM, a=1.0):
    """Barre d'immeuble soviétique (bas à y)."""
    rnd = random.Random(seed)
    c.drawRect(R(x, y - h, w, h), P(alpha(col, a)))
    c.drawRect(R(x, y - h, w, 3), P(alpha(mixc(col, WHITE, 0.25), a)))
    cols = max(2, int(w / 16))
    fh = h / floors
    ww = w / cols
    for f in range(floors):
        for k in range(cols):
            on = rnd.random() < lit
            colw = mixc(win, 0xFFFFE6BF, rnd.random() * 0.5) if on else mixc(col, BLACK, 0.35)
            rx, ry = x + k * ww + ww * 0.25, y - h + f * fh + fh * 0.3
            c.drawRect(R(rx, ry, ww * 0.5, fh * 0.45), P(alpha(colw, a * (0.95 if on else 0.8))))
            if on and rnd.random() < 0.3:
                glow(c, rx + ww * 0.25, ry + fh * 0.2, ww * 0.9, win, 0.18 * a)


# ---------------------------------------------------------------- givre
_FERNS = {}


def _fern_segments(seed, x, y, ang, length, depth):
    rnd = random.Random(seed)
    segs = []

    def grow(x, y, ang, L, d, t0):
        if d == 0 or L < 3:
            return
        steps = 4
        for s in range(steps):
            a = math.radians(ang + rnd.uniform(-8, 8))
            nx, ny = x + math.cos(a) * L / steps, y + math.sin(a) * L / steps
            tt = t0 + (s + 1) / steps * 0.25
            segs.append((x, y, nx, ny, tt, d))
            if d > 1 and s % 2 == 1:
                for side in (-1, 1):
                    grow(nx, ny, ang + side * rnd.uniform(45, 70), L * 0.45, d - 1, tt)
            x, y = nx, ny

    grow(x, y, ang, length, depth, 0.0)
    return segs


def frost(c, k, seed=0, a=0.9, width=W, height=H):
    """Fougères de givre qui poussent depuis les bords (k de 0 à 1)."""
    if seed not in _FERNS:
        rnd = random.Random(seed)
        segs = []
        for i in range(22):
            side = i % 4
            if side == 0:
                x, y, ang = rnd.uniform(0, width), 0, 90
            elif side == 1:
                x, y, ang = rnd.uniform(0, width), height, -90
            elif side == 2:
                x, y, ang = 0, rnd.uniform(0, height), 0
            else:
                x, y, ang = width, rnd.uniform(0, height), 180
            segs += _fern_segments(seed * 100 + i, x, y, ang + rnd.uniform(-35, 35), rnd.uniform(180, 330), 3)
        _FERNS[seed] = segs
    tmax = 0.25 * 4 + 0.01
    p_glow = P(alpha(0xFFBFE6FF, a * 0.25), 5, blur=3)
    for x0, y0, x1, y1, tt, d in _FERNS[seed]:
        if tt / tmax <= k:
            w = 0.6 + d * 0.5
            c.drawLine(x0, y0, x1, y1, p_glow)
            c.drawLine(x0, y0, x1, y1, P(alpha(0xFFF2FAFF, a * (0.55 + 0.15 * d)), w))
    # voile laiteux
    c.drawRect(R(0, 0, width, height), P(alpha(0xFFDDEBF5, a * 0.25 * k)))


# ---------------------------------------------------------------- texte
def outlined_text(c, s, x, y, size, fill, outline=BLACK, ow=None, align="center", face=None):
    font = skia.Font(face or FONT, size)
    w = font.measureText(s)
    if align == "center":
        x -= w / 2
    ow = size * 0.2 if ow is None else ow
    if ow:
        c.drawString(s, x, y, font, P(outline, ow))
    c.drawString(s, x, y, font, P(fill))
    return w


def wrap_text(c, s, x, y, size, fill, maxw, face=None, lh=1.15):
    font = skia.Font(face or FONT, size)
    lines, cur = [], ""
    for wd in s.split():
        test = (cur + " " + wd).strip()
        if font.measureText(test) > maxw and cur:
            lines.append(cur)
            cur = wd
        else:
            cur = test
    lines.append(cur)
    for i, ln in enumerate(lines):
        outlined_text(c, ln, x, y + i * size * lh, size, fill, face=face)


# ---------------------------------------------------------------- Aïsen
def chapka(c, s=1.0, frost_k=0.0):
    """Chapka en fourrure grise, centrée sur le haut de la tête (0,0 = centre du visage)."""
    c.drawPath(poly([(-62, -40), (-58, -95), (0, -118), (58, -95), (62, -40)]), P(FUR_D))
    oval(c, 0, -88, 64, 36, P(FUR))
    for i in range(30):
        a = i / 30 * math.pi
        x, y = -64 * math.cos(a), -88 - 34 * math.sin(a)
        c.drawLine(x, y, x * 1.06, y - 5, P(mixc(FUR, WHITE, 0.2 + frost_k * 0.7), 2))
    # rabats
    for sx in (-1, 1):
        c.drawPath(poly([(sx * 52, -60), (sx * 70, -60), (sx * 68, 10), (sx * 50, 18)]), P(FUR))
    oval(c, 0, -62, 66, 14, P(mixc(FUR, WHITE, 0.15 + frost_k * 0.6)))
    if frost_k > 0:
        rnd = random.Random(5)
        for i in range(int(90 * frost_k)):
            x, y = rnd.uniform(-66, 66), rnd.uniform(-115, -50)
            c.drawCircle(x, y, rnd.uniform(0.8, 2.2), P(alpha(WHITE, 0.85)))


def head(c, smile=0.0, look=(0, 0), frost_k=0.0, hat=True, scarf_up=True, blink=0.0, steam=0.0, t=0.0):
    """Tête d'Aïsen, plan rapproché (centre du visage en 0,0, ~120 px de large)."""
    # cou / col
    oval(c, 0, 10, 50, 64, P(SKIN_D))
    oval(c, 0, 0, 48, 60, rad(-12, -14, 80, [mixc(SKIN, WHITE, 0.12), SKIN, SKIN_D]))
    # joues rougies
    for sx in (-1, 1):
        oval(c, sx * 26, 14, 14, 9, P(alpha(0xFFD0585A, 0.35 + 0.25 * frost_k), blur=6))
    # cheveux / sourcils
    for sx in (-1, 1):
        c.drawPath(poly([(sx * 8, -18), (sx * 34, -22), (sx * 36, -17), (sx * 10, -13)]),
                   P(mixc(0xFF1B1410, WHITE, frost_k * 0.8)))
    # yeux (bridés, sombres)
    lx, ly = look
    for sx in (-1, 1):
        ex, ey = sx * 20, -4
        o = 1 - blink
        c.save()
        c.clipRect(R(ex - 15, ey - 6 * o - 0.5, 30, 12 * o + 1))
        oval(c, ex, ey, 14, 5.5, P(0xFFF0EBE6))
        c.drawCircle(ex + lx * 3, ey + ly * 2, 4.6, P(0xFF1E140E))
        c.drawCircle(ex + lx * 3 + 1.4, ey + ly * 2 - 1.5, 1.2, P(WHITE))
        c.restore()
        c.drawLine(ex - 14, ey - 4 * o, ex + 14, ey - 5 * o, P(mixc(0xFF140E0A, WHITE, frost_k), 2.2))
        if frost_k > 0:
            for j in range(7):
                c.drawCircle(ex - 12 + j * 4, ey - 5 * o - 1, 1.3 * frost_k + 0.4, P(alpha(WHITE, 0.95)))
    # nez, bouche
    c.drawPath(poly([(-1, -2), (-7, 20), (6, 21)]), P(alpha(SKIN_D, 0.8)))
    if not scarf_up:
        path = skia.Path()
        path.moveTo(-15, 36)
        path.quadTo(0, 38 + 10 * smile, 16, 33 - 4 * smile)
        c.drawPath(path, P(0xFF6E3A2E, 2.6))
    # écharpe
    if scarf_up:
        c.drawPath(poly([(-52, 20), (52, 20), (58, 70), (-58, 70)]), P(SCARF))
        for k in range(4):
            c.drawLine(-50, 32 + k * 10, 50, 32 + k * 10, P(alpha(0xFF7E1218, 0.6), 1.5))
        if frost_k > 0:
            rnd = random.Random(9)
            for i in range(int(60 * frost_k)):
                c.drawCircle(rnd.uniform(-48, 48), rnd.uniform(20, 32), 1.2, P(alpha(WHITE, 0.8)))
    else:
        c.drawPath(poly([(-56, 58), (56, 58), (60, 86), (-60, 86)]), P(SCARF))
    if hat:
        chapka(c, 1, frost_k)
    else:  # cheveux noirs courts
        path = skia.Path()
        path.moveTo(-50, -12)
        path.quadTo(-56, -72, 0, -74)
        path.quadTo(56, -72, 50, -12)
        path.quadTo(40, -42, 0, -44)
        path.quadTo(-40, -42, -50, -12)
        c.drawPath(path, P(0xFF141010))
    if steam > 0:
        puff(c, 0, 40 + (t * 30) % 20, 30, steam * 0.5, seed=int(t * 2))


def body(c, layers=4, frost_k=0.0, smile=0.0, look=(0, 0), hat=True, scarf_up=True, blink=0.0,
         arm=0.0, t=0.0, steam=0.0):
    """Aïsen en plan poitrine : centre du visage en (0,0). layers : 0 collant,1 pull,2 parka,3 bottes,4 chapka+écharpe."""
    if layers <= 0:
        c.drawPath(poly([(-110, 210), (-92, 70), (-35, 55), (35, 55), (92, 70), (110, 210)]), P(0xFF2A2A2E))
    elif layers == 1:
        c.drawPath(poly([(-118, 210), (-98, 66), (-35, 52), (35, 52), (98, 66), (118, 210)]), P(0xFF6B5444))
        for i in range(6):
            c.drawLine(-80 + i * 32, 90, -80 + i * 32, 210, P(alpha(0xFF4E3B2F, 0.7), 3))
    else:
        c.drawPath(poly([(-135, 230), (-112, 70), (-40, 48), (40, 48), (112, 70), (135, 230)]),
                   lin(0, 50, 0, 230, [PARKA_L, PARKA]))
        c.drawLine(0, 70, 0, 230, P(0xFF0D1426, 3))
        # col fourrure
        for i in range(24):
            a = math.pi * i / 23
            x = -70 * math.cos(a)
            c.drawLine(x, 62, x * 1.1, 46 - 12 * math.sin(a), P(mixc(FUR, WHITE, frost_k * 0.6), 5))
        if arm:
            c.drawPath(poly([(110, 80), (140, 70), (190 + 30 * arm, -20 - 60 * arm), (165 + 30 * arm, -35 - 60 * arm), (100, 120)]),
                       P(PARKA_L))
    head(c, smile, look, frost_k, hat and layers >= 3, scarf_up and layers >= 4, blink, steam, t)


def figure(c, x, y, s=1.0, a=1.0, silhouette=False, frost_k=0.0, walk=0.0, kettle=0.0, throw=0.0):
    """Aïsen en pied, de face (pieds en x,y), ~260 px de haut à s=1."""
    col = (lambda k: alpha(0xFF05080F, a)) if silhouette else (lambda k: alpha(k, a))
    with Save(c, x, y, 0, s):
        st = math.sin(walk * 6) * 6 if walk else 0
        # jambes + unty
        c.drawRect(R(-26 + st * 0.3, -95, 22, 70), P(col(0xFF15161C)))
        c.drawRect(R(4 - st * 0.3, -95, 22, 70), P(col(0xFF15161C)))
        c.drawRRect(rrect(-32 + st * 0.3, -40, 30, 40, 8), P(col(0xFFB9A58C)))
        c.drawRRect(rrect(2 - st * 0.3, -40, 30, 40, 8), P(col(0xFFB9A58C)))
        # parka
        c.drawPath(poly([(-48, -88), (-40, -200), (40, -200), (48, -88)]), P(col(PARKA)))
        oval(c, 0, -200, 44, 12, P(col(FUR)))
        # bras
        ang = -20 - 120 * throw
        with Save(c, 38, -192, ang if throw else -8):
            c.drawRRect(rrect(-6, 0, 20, 90, 9), P(col(PARKA_L)))
            if kettle or throw:
                with Save(c, 4, 96, -ang if throw else 8):
                    c.drawRRect(rrect(-16, -4, 32, 28, 8), P(col(0xFF8A9198)))
                    c.drawLine(-10, -6, 10, -6, P(col(0xFF2C3036), 3))
                    c.drawLine(14, 6, 26, -2, P(col(0xFF8A9198), 5))
        c.drawRRect(rrect(-56, -192, 20, 90, 9), P(col(PARKA_L)))
        # tête
        c.drawRect(R(-30, -226, 60, 20), P(col(SCARF)))
        oval(c, 0, -240, 20, 22, P(col(SKIN)))
        oval(c, 0, -258, 30, 18, P(col(mixc(FUR, WHITE, frost_k * 0.5))))


# ---------------------------------------------------------------- étalonnage
def grade_filter(warm=0.0, sat=0.78):
    """Matrice couleur : bleus froids désaturés (warm=0) -> ambré (warm=1)."""
    s = sat + (1 - sat) * warm * 0.6
    lr, lg, lb = 0.299, 0.587, 0.114
    m = [lr * (1 - s) + s, lg * (1 - s), lb * (1 - s), 0, 0,
         lr * (1 - s), lg * (1 - s) + s, lb * (1 - s), 0, 0,
         lr * (1 - s), lg * (1 - s), lb * (1 - s) + s, 0, 0,
         0, 0, 0, 1, 0]
    cool = [0.93, 1.0, 1.10]
    hot = [1.12, 1.0, 0.80]
    tint = [lerp(a, b, warm) for a, b in zip(cool, hot)]
    lift = [lerp(0.0, 0.03, warm), lerp(0.01, 0.015, warm), lerp(0.035, 0.0, warm)]
    for r in range(3):
        for k in range(3):
            m[r * 5 + k] *= tint[r]
        m[r * 5 + 4] = lift[r]
    return skia.ColorFilters.Matrix(m)


_GRAIN = []


def grain(c, frame, a=0.10):
    if not _GRAIN:
        rng = np.random.default_rng(11)
        for _ in range(6):
            n = rng.normal(128, 40, (H, W)).clip(0, 255).astype(np.uint8)
            arr = np.dstack([n, n, n, np.full_like(n, 255)])
            _GRAIN.append(skia.Image.fromarray(arr))
    p = skia.Paint(Alphaf=a, BlendMode=skia.BlendMode.kOverlay)
    c.drawImage(_GRAIN[frame % len(_GRAIN)], 0, 0, skia.SamplingOptions(), p)


def vignette(c, a=0.65):
    c.drawRect(R(0, 0, W, H), rad(W / 2, H * 0.48, H * 0.75, [alpha(BLACK, 0), alpha(BLACK, 0), alpha(BLACK, a)], [0, 0.55, 1]))
