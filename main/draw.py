"""Primitives de dessin (skia) : décors, personnage, main, effets, textes.

Repère logique 540 x 960 (mis à l'échelle x2 pour une sortie 1080x1920).
"""
import math
import os

import skia

W, H = 540, 960
HERE = os.path.dirname(os.path.abspath(__file__))
FONT = skia.Typeface.MakeFromFile(os.path.join(HERE, "assets", "fonts", "LilitaOne.ttf"))

INK = 0xFF2B1E16
SKIN = 0xFFFFD2B0
SKIN_D = 0xFFF0B48E
NAIL = 0xFFFFEDE6
YELLOW = 0xFFFFD43B
WHITE = 0xFFFFFFFF
BLACK = 0xFF000000


# ---------------------------------------------------------------- utilitaires
def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def lerp(a, b, t):
    return a + (b - a) * t


def ease_out(t):
    t = clamp(t)
    return 1 - (1 - t) ** 3


def ease_in_out(t):
    t = clamp(t)
    return t * t * (3 - 2 * t)


def back_out(t, s=1.9):
    t = clamp(t) - 1
    return t * t * ((s + 1) * t + s) + 1


def prog(t, a, b):
    return clamp((t - a) / max(1e-6, b - a))


def mixc(c1, c2, t):
    t = clamp(t)
    out = 0
    for sh in (24, 16, 8, 0):
        a = (c1 >> sh) & 255
        b = (c2 >> sh) & 255
        out |= int(round(a + (b - a) * t)) << sh
    return out


def alpha(c, a):
    return (int(clamp(a) * 255) << 24) | (c & 0xFFFFFF)


def P(color, stroke=None, cap="round"):
    p = skia.Paint(AntiAlias=True, Color=color)
    if stroke:
        p.setStyle(skia.Paint.kStroke_Style)
        p.setStrokeWidth(stroke)
        p.setStrokeJoin(skia.Paint.kRound_Join)
        p.setStrokeCap(skia.Paint.kRound_Cap if cap == "round" else skia.Paint.kButt_Cap)
    return p


def rrect(x, y, w, h, r):
    return skia.RRect.MakeRectXY(skia.Rect.MakeXYWH(x, y, w, h), r, r)


def shape(c, path_or_rrect, fill, outline=INK, width=4):
    draw = c.drawRRect if isinstance(path_or_rrect, skia.RRect) else c.drawPath
    if outline:
        draw(path_or_rrect, P(outline, width))
    draw(path_or_rrect, P(fill))
    if outline:
        draw(path_or_rrect, P(outline, width))


def circle(c, x, y, r, fill, outline=INK, width=4):
    if fill is not None:
        c.drawCircle(x, y, r, P(fill))
    if outline:
        c.drawCircle(x, y, r, P(outline, width))


def ellipse(c, x, y, rx, ry, fill, outline=INK, width=4):
    rect = skia.Rect.MakeLTRB(x - rx, y - ry, x + rx, y + ry)
    if fill is not None:
        c.drawOval(rect, P(fill))
    if outline:
        c.drawOval(rect, P(outline, width))


def line(c, x1, y1, x2, y2, color=INK, width=4):
    c.drawLine(x1, y1, x2, y2, P(color, width))


def arc(c, x, y, rx, ry, start, sweep, color=INK, width=4):
    path = skia.Path()
    path.addArc(skia.Rect.MakeLTRB(x - rx, y - ry, x + rx, y + ry), start, sweep)
    c.drawPath(path, P(color, width))


def poly(pts, close=True):
    path = skia.Path()
    path.moveTo(*pts[0])
    for p in pts[1:]:
        path.lineTo(*p)
    if close:
        path.close()
    return path


class Save:
    def __init__(self, c, x=0, y=0, rot=0, s=1, sy=None):
        self.c, self.x, self.y, self.rot, self.s, self.sy = c, x, y, rot, s, sy

    def __enter__(self):
        self.c.save()
        self.c.translate(self.x, self.y)
        if self.rot:
            self.c.rotate(self.rot)
        self.c.scale(self.s, self.s if self.sy is None else self.sy)
        return self.c

    def __exit__(self, *a):
        self.c.restore()


# ---------------------------------------------------------------- textes
def text_w(s, size):
    return skia.Font(FONT, size).measureText(s)


def outlined_text(c, s, x, y, size, fill=WHITE, stroke=BLACK, sw=None, align="center", shadow=True):
    font = skia.Font(FONT, size)
    w = font.measureText(s)
    if align == "center":
        x -= w / 2
    sw = sw or size * 0.22
    if shadow:
        c.drawString(s, x + size * 0.05, y + size * 0.08, font, P(alpha(BLACK, 0.45), sw))
    c.drawString(s, x, y, font, P(stroke, sw))
    c.drawString(s, x, y, font, P(fill))
    return w


# ---------------------------------------------------------------- effets
def starburst(c, x, y, r, t=0.0, color=YELLOW, inner=WHITE, n=14):
    pts = []
    for i in range(n * 2):
        a = i * math.pi / n + t * 0.6
        rr = r if i % 2 == 0 else r * (0.55 + 0.08 * math.sin(i * 7.3))
        pts.append((x + rr * math.cos(a), y + rr * math.sin(a)))
    shape(c, poly(pts), color, INK, 4)
    pts2 = []
    for i in range(n * 2):
        a = i * math.pi / n + t * 0.6 + 0.1
        rr = r * 0.62 if i % 2 == 0 else r * 0.38
        pts2.append((x + rr * math.cos(a), y + rr * math.sin(a)))
    c.drawPath(poly(pts2), P(inner))


def sweat(c, x, y, s=1.0, a=1.0):
    path = skia.Path()
    path.moveTo(x, y - 12 * s)
    path.cubicTo(x + 8 * s, y, x + 8 * s, y + 8 * s, x, y + 8 * s)
    path.cubicTo(x - 8 * s, y + 8 * s, x - 8 * s, y, x, y - 12 * s)
    c.drawPath(path, P(alpha(0xFF7FD3FF, a)))
    c.drawPath(path, P(alpha(INK, a), 2.5))


def heart(c, x, y, s=1.0, color=0xFFFF4F6D):
    path = skia.Path()
    path.moveTo(x, y + 10 * s)
    path.cubicTo(x - 18 * s, y - 2 * s, x - 10 * s, y - 16 * s, x, y - 6 * s)
    path.cubicTo(x + 10 * s, y - 16 * s, x + 18 * s, y - 2 * s, x, y + 10 * s)
    shape(c, path, color, INK, 2.5)


def sparkle(c, x, y, s=1.0, color=YELLOW):
    pts = []
    for i in range(8):
        a = i * math.pi / 4
        rr = 12 * s if i % 2 == 0 else 3.5 * s
        pts.append((x + rr * math.cos(a), y + rr * math.sin(a)))
    c.drawPath(poly(pts), P(color))


def bolt(c, x, y, s=1.0, rot=0):
    with Save(c, x, y, rot, s):
        pts = [(0, -24), (12, -24), (4, -4), (14, -4), (-6, 26), (0, 4), (-10, 4)]
        shape(c, poly(pts), YELLOW, INK, 2.5)


def zzz(c, x, y, t, s=1.0):
    for i in range(3):
        k = (t * 0.6 + i / 3) % 1
        a = math.sin(k * math.pi)
        outlined_text(c, "z", x + k * 30 * s, y - k * 60 * s, (16 + 10 * i) * s, WHITE, INK, sw=4, shadow=False) if a > 0.05 else None


def steam(c, x, y, t, h=60, color=0xCCFFFFFF):
    for i in range(3):
        path = skia.Path()
        ox = x + (i - 1) * 16
        path.moveTo(ox, y)
        for k in range(1, 7):
            yy = y - k * h / 6
            xx = ox + 7 * math.sin(k * 1.4 + t * 6 + i)
            path.lineTo(xx, yy)
        c.drawPath(path, P(color, 5))


def germ(c, x, y, s, t, color=0xFF7DCB4F):
    with Save(c, x, y, 0, s):
        for i in range(8):
            a = i * math.pi / 4 + t
            line(c, 0, 0, 22 * math.cos(a), 22 * math.sin(a), INK, 3)
            circle(c, 22 * math.cos(a), 22 * math.sin(a), 3.5, color, INK, 2)
        circle(c, 0, 0, 15, color, INK, 3)
        circle(c, -5, -3, 3.5, WHITE, INK, 1.5)
        circle(c, 5, -3, 3.5, WHITE, INK, 1.5)
        circle(c, -5, -3, 1.5, BLACK, None)
        circle(c, 5, -3, 1.5, BLACK, None)
        arc(c, 0, 4, 6, 4, 0, 180, INK, 2)


def speech_bubble(c, x, y, w, h, text, size=26, tail=(0, 30)):
    path = skia.Path()
    path.addRRect(rrect(x - w / 2, y - h / 2, w, h, 20))
    tp = poly([(x - 14, y + h / 2 - 4), (x + 14, y + h / 2 - 4), (x + tail[0], y + h / 2 + tail[1])])
    shape(c, tp, WHITE, INK, 4)
    shape(c, path, WHITE, INK, 4)
    c.drawRect(skia.Rect.MakeLTRB(x - 12, y + h / 2 - 8, x + 12, y + h / 2 - 1), P(WHITE))
    font = skia.Font(FONT, size)
    c.drawString(text, x - font.measureText(text) / 2, y + size * 0.35, font, P(INK))


# ---------------------------------------------------------------- visages
def face(c, x, y, s=1.0, expr="happy", look=(0, 0), blink=False, t=0.0):
    """Visage générique (yeux + bouche) centré en (x, y)."""
    with Save(c, x, y, 0, s):
        ex = 16
        if expr in ("sleep", "rest"):
            for sx in (-ex, ex):
                arc(c, sx, -4, 9, 6, 20, 140, INK, 3.5)
        elif expr == "pain":
            for sx, d in ((-ex, 1), (ex, -1)):
                line(c, sx - 8, -12, sx + 8, -4 * 1, INK, 4) if d == 1 else line(c, sx + 8, -12, sx - 8, -4, INK, 4)
                line(c, sx - 8, 4, sx + 8, -4, INK, 4) if d == 1 else line(c, sx + 8, 4, sx - 8, -4, INK, 4)
        elif expr == "dead":
            for sx in (-ex, ex):
                line(c, sx - 7, -11, sx + 7, 3, INK, 4)
                line(c, sx + 7, -11, sx - 7, 3, INK, 4)
        else:
            big = 1.35 if expr in ("shock", "scared") else 1.0
            for sx in (-ex, ex):
                ellipse(c, sx, -4, 10 * big, 12 * big, WHITE, INK, 3)
                if blink:
                    line(c, sx - 10, -4, sx + 10, -4, INK, 3)
                else:
                    pr = 4.5 if expr not in ("shock", "scared") else 3.5
                    circle(c, sx + look[0] * 4, -3 + look[1] * 4, pr, BLACK, None)
                    circle(c, sx + look[0] * 4 + 1.5, -5 + look[1] * 4, 1.4, WHITE, None)
            if expr == "tired":
                for sx in (-ex, ex):
                    c.drawRect(skia.Rect.MakeLTRB(sx - 11, -17, sx + 11, -5), P(SKIN))
                    line(c, sx - 10, -5, sx + 10, -5, INK, 3)
            if expr == "angry":
                line(c, -26, -20, -8, -13, INK, 4)
                line(c, 26, -20, 8, -13, INK, 4)
            if expr in ("sad", "cry", "scared"):
                line(c, -26, -14, -8, -20, INK, 3.5)
                line(c, 26, -14, 8, -20, INK, 3.5)
        # bouche
        if expr in ("happy", "proud", "rest"):
            path = skia.Path()
            path.moveTo(-12, 12)
            path.quadTo(0, 26, 12, 12)
            c.drawPath(path, P(INK, 3.5))
        elif expr == "laugh":
            path = skia.Path()
            path.moveTo(-15, 10)
            path.quadTo(0, 36, 15, 10)
            path.close()
            shape(c, path, 0xFF8A2B2B, INK, 3)
        elif expr in ("sad", "tired"):
            path = skia.Path()
            path.moveTo(-10, 20)
            path.quadTo(0, 10, 10, 20)
            c.drawPath(path, P(INK, 3.5))
        elif expr in ("shock", "scared"):
            ellipse(c, 0, 18, 7, 9 + 2 * math.sin(t * 20), 0xFF8A2B2B, INK, 3)
        elif expr in ("pain", "cry"):
            path = skia.Path()
            path.addRRect(rrect(-14, 8, 28, 16, 6))
            shape(c, path, WHITE, INK, 3)
            line(c, -14, 16, 14, 16, INK, 2)
        elif expr == "angry":
            line(c, -10, 18, 10, 18, INK, 4)
        elif expr == "dead":
            path = skia.Path()
            path.moveTo(-10, 16)
            path.quadTo(0, 10, 10, 16)
            c.drawPath(path, P(INK, 3))
            ellipse(c, 6, 21, 4, 6, 0xFFFF7A90, INK, 2)
        elif expr == "sleep":
            ellipse(c, 0, 16, 4, 5, 0xFF8A2B2B, INK, 2.5)
        if expr == "cry":
            for sx in (-ex, ex):
                k = (t * 1.5) % 1
                sweat(c, sx, 10 + k * 26, 0.7, 1 - k)


# ---------------------------------------------------------------- la main
FINGERS = [  # x, longueur, largeur
    (-39, 78, 25),
    (-13, 90, 26),
    (13, 84, 26),
    (38, 64, 23),
]


def hand(c, x, y, s=1.0, rot=0.0, expr="happy", curl=(0, 0, 0, 0), thumb=0.0,
         spread=1.0, color=SKIN, look=(0, 0), blink=False, t=0.0, mirror=False,
         ring=False, wrinkles=0.0, swell=None, face_on=True, sleeve=None,
         finger_faces=False, thumb_face=None, shake=0.0, sleeve_len=140):
    """Main cartoon vue de dos (ongles visibles), visage sur le dos de la main.

    curl : 0 = doigt tendu, 1 = replié. thumb : 0 écarté, 1 replié.
    swell : index du doigt gonflé (rouge) ou None.
    """
    if shake:
        x += shake * math.sin(t * 70)
        y += shake * math.cos(t * 63)
    dark = mixc(color, INK, 0.18)
    with Save(c, x, y, rot, s * (-1 if mirror else 1), s):
        # manche
        if sleeve:
            shape(c, rrect(-48, 70, 96, sleeve_len, 12), sleeve, INK, 4)
            line(c, -48, 84, 48, 84, mixc(sleeve, INK, 0.3), 3)
        # poignet
        shape(c, rrect(-34, 40, 68, 50, 14), color, INK, 4)
        paths = []
        # doigts
        for i, (fx, fl, fw) in enumerate(FINGERS):
            k = clamp(curl[i])
            L = fl * (1 - 0.62 * k)
            if swell == i:
                fw *= 1.55
                L *= 1.08
            ang = (fx / 39) * 7 * spread
            p = skia.Path()
            p.addRRect(rrect(-fw / 2, -L, fw, L + 20, fw / 2))
            m = skia.Matrix()
            m.setRotate(ang)
            m.postTranslate(fx, -26)
            p.transform(m)
            paths.append(("f", i, p, ang, L, fw, fx))
        # pouce
        th = clamp(thumb)
        tp = skia.Path()
        tp.addRRect(rrect(-13, -58, 27, 70, 13))
        m = skia.Matrix()
        m.setRotate(-58 + 40 * th)
        m.postTranslate(-44 + 10 * th, 18)
        tp.transform(m)
        paths.append(("t", -1, tp, -58 + 40 * th, 58, 27, -44))
        palm = skia.Path()
        palm.addRRect(rrect(-56, -42, 112, 104, 40))
        # contour commun puis remplissage
        for _, i, p, *_ in paths:
            c.drawPath(p, P(INK, 8))
        c.drawPath(palm, P(INK, 8))
        for kind, i, p, *_ in paths:
            col = 0xFFE8473F if (swell is not None and swell == i) else color
            c.drawPath(p, P(col))
        c.drawPath(palm, P(color))
        # ongles + plis
        for kind, i, p, ang, L, fw, fx in paths:
            with Save(c, fx if kind == "f" else -44 + 10 * th, -26 if kind == "f" else 18, ang):
                if kind == "f":
                    if L > 40:
                        nl = 22 if fw < 30 else 26
                        shape(c, rrect(-fw / 2 + 5, -L + 5, fw - 10, nl, (fw - 10) / 2), NAIL, dark, 2)
                        for k in range(2 if wrinkles < 0.5 else 3):
                            yy = -L * (0.45 + 0.15 * k) + 6
                            arc(c, 0, yy, fw * 0.25, 3, 200, 140, dark, 2)
                    else:
                        arc(c, 0, -L + 10, fw * 0.3, 4, 200, 140, dark, 2)
                    if ring and i == 2 and L > 40:
                        shape(c, rrect(-fw / 2 - 3, -L * 0.42, fw + 6, 11, 5), 0xFFFFC928, INK, 3)
                        sparkle(c, fw / 2 + 2, -L * 0.42, 0.7 + 0.3 * math.sin(t * 8), WHITE)
                    if finger_faces and L > 40:
                        ex = 0
                        with Save(c, 0, -L * 0.55, 0, 0.42):
                            face(c, 0, 0, 1, expr, look, blink, t)
                else:
                    shape(c, rrect(-8, -52, 16, 18, 8), NAIL, dark, 2)
                    if thumb_face:
                        with Save(c, 0, -22, -ang, 0.42):
                            face(c, 0, 0, 1, thumb_face, look, blink, t)
        # plis jointures
        for fx in (-39, -13, 13, 38):
            arc(c, fx * 0.95, -30, 6, 3, 200, 140, dark, 2)
        if wrinkles > 0:
            for k in range(3):
                arc(c, -30 + k * 4, 30 + k * 7, 14, 4, 190, 160, alpha(dark, wrinkles), 2)
            arc(c, 30, 20, 10, 3, 190, 160, alpha(dark, wrinkles), 2)
            # taches de vieillesse
            circle(c, 34, -10, 4, alpha(0xFFC48A62, wrinkles), None)
            circle(c, -22, 44, 3, alpha(0xFFC48A62, wrinkles), None)
        if face_on:
            with Save(c, 0, 10, 0, 1.0 * (-1 if mirror else 1), 1.0):
                face(c, 0, 0, 1.0, expr, look, blink, t)
                if expr in ("happy", "laugh", "proud"):
                    ellipse(c, -27, 12, 7, 4, alpha(0xFFFF8F8F, 0.6), None)
                    ellipse(c, 27, 12, 7, 4, alpha(0xFFFF8F8F, 0.6), None)


# ---------------------------------------------------------------- personnage
HAIR = 0xFF6B3A1F
SHIRT = 0xFF2FB39F


def person(c, x, y, s=1.0, expr="happy", age="adult", arms=(20, -20), t=0.0,
           shirt=SHIRT, look=(0, 0), blink=False, legs_walk=0.0, suit=False,
           hide_right_arm=False, mouth_open=None):
    """Personnage : pieds en (x, y). arms = angles bras gauche/droit (0 = le long du corps, 90 = horizontal, 160 = en l'air)."""
    with Save(c, x, y, 0, s):
        if age == "baby":
            hr, bw, bh, leg = 34, 56, 46, 14
        elif age == "kid":
            hr, bw, bh, leg = 36, 60, 70, 34
        else:
            hr, bw, bh, leg = 40, 68, 96, 58
        top = -leg - bh
        # jambes
        if age != "baby":
            for sx, ph in ((-14, 0), (14, math.pi)):
                sw = 12 * legs_walk * math.sin(t * 10 + ph)
                line(c, sx, -leg - 4, sx + sw, -6, 0xFF2C3E66 if not suit else 0xFF222222, 12)
                ellipse(c, sx + sw + (4 if sx > 0 else -4), -4, 13, 7, 0xFF3B2A22, INK, 3)
        else:
            for sx in (-14, 14):
                ellipse(c, sx, -6, 12, 9, 0xFFBEE3F8, INK, 3)
        # bras
        col = shirt if not suit else 0xFF2B2B33
        shoulder_y = top + 16
        for side, ang in ((-1, arms[0]), (1, arms[1])):
            if side == 1 and hide_right_arm:
                continue
            a = math.radians(ang)
            L = 0.85 * bh if age != "baby" else 30
            hx = side * (bw / 2 - 4) + side * L * math.sin(a)
            hy = shoulder_y + L * math.cos(a)
            line(c, side * (bw / 2 - 6), shoulder_y, hx, hy, INK, 15)
            line(c, side * (bw / 2 - 6), shoulder_y, hx, hy, col, 9)
            circle(c, hx, hy, 9, SKIN, INK, 3)
        # corps
        shape(c, rrect(-bw / 2, top, bw, bh + 4, 18), col if age != "baby" else 0xFFBEE3F8, INK, 4)
        if suit:
            c.drawPath(poly([(-10, top + 2), (10, top + 2), (0, top + 26)]), P(WHITE))
            c.drawPath(poly([(-4, top + 6), (4, top + 6), (5, top + 40), (0, top + 48), (-5, top + 40)]), P(0xFFD62B3B))
        # tête
        hy = top - hr + 8
        if age == "old":
            pass
        circle(c, 0, hy, hr, SKIN, INK, 4)
        # cheveux
        if age == "baby":
            path = skia.Path()
            path.moveTo(-4, hy - hr + 2)
            path.quadTo(2, hy - hr - 18, 12, hy - hr - 8)
            c.drawPath(path, P(HAIR, 4))
        elif age == "old":
            for sx in (-1, 1):
                ellipse(c, sx * (hr - 6), hy - 6, 12, 16, 0xFFE9E9E9, INK, 3)
        else:
            path = skia.Path()
            path.moveTo(-hr - 2, hy - 2)
            path.cubicTo(-hr, hy - hr - 18, hr * 0.4, hy - hr - 26, hr + 4, hy - 10)
            path.cubicTo(hr * 0.6, hy - hr * 0.55, 0, hy - hr * 0.6, -hr * 0.5, hy - hr * 0.35)
            path.cubicTo(-hr * 0.7, hy - hr * 0.2, -hr * 0.8, hy - 8, -hr - 2, hy - 2)
            shape(c, path, HAIR, INK, 4)
        face(c, 0, hy + 6, 0.95 if age != "baby" else 0.85, expr, look, blink, t)
        if age == "old":
            for sx in (-16, 16):
                circle(c, sx, hy + 2, 12, None, INK, 3)
            line(c, -4, hy + 2, 4, hy + 2, INK, 3)
        if expr in ("happy", "laugh", "proud"):
            ellipse(c, -26, hy + 18, 7, 4, alpha(0xFFFF8F8F, 0.6), None)
            ellipse(c, 26, hy + 18, 7, 4, alpha(0xFFFF8F8F, 0.6), None)
        return hy


# ---------------------------------------------------------------- décors
def floor_wood(c, y0, color=0xFFD9A066):
    c.drawRect(skia.Rect.MakeLTRB(0, y0, W, H), P(color))
    dark = mixc(color, INK, 0.18)
    for i in range(-8, 16):
        x = W / 2 + i * 60
        line(c, W / 2 + (x - W / 2) * 0.35, y0, x * 1.0 + (x - W / 2) * 0.6, H, dark, 2)
    for k, yy in enumerate([y0 + 40, y0 + 110, y0 + 210, y0 + 350]):
        line(c, 0, yy, W, yy, alpha(dark, 0.5), 2)


def floor_tiles(c, y0, a=0xFFEDEDE6, b=0xFFD9D9CF):
    c.drawRect(skia.Rect.MakeLTRB(0, y0, W, H), P(a))
    rows = 6
    for r in range(rows):
        yy0 = y0 + (H - y0) * (r / rows) ** 1.4
        yy1 = y0 + (H - y0) * ((r + 1) / rows) ** 1.4
        for k in range(-6, 12):
            if (r + k) % 2:
                continue
            def X(xx, yy):
                return W / 2 + (xx - W / 2) * (0.5 + 0.9 * (yy - y0) / (H - y0))
            x0 = k * 80
            c.drawPath(poly([(X(x0, yy0), yy0), (X(x0 + 80, yy0), yy0), (X(x0 + 80, yy1), yy1), (X(x0, yy1), yy1)]), P(b))


def wall(c, y1, color, stripe=None):
    c.drawRect(skia.Rect.MakeLTRB(0, 0, W, y1), P(color))
    if stripe:
        for x in range(0, W + 40, 36):
            c.drawRect(skia.Rect.MakeLTRB(x, 0, x + 14, y1), P(stripe))
    c.drawRect(skia.Rect.MakeLTRB(0, y1 - 14, W, y1), P(mixc(color, WHITE, 0.6)))
    line(c, 0, y1 - 14, W, y1 - 14, INK, 3)
    line(c, 0, y1, W, y1, INK, 3)


def window(c, x, y, w, h, night=False, t=0.0, curtains=0xFFC0392B):
    shape(c, rrect(x - 8, y - 8, w + 16, h + 16, 6), 0xFFFFFFFF, INK, 4)
    sky = 0xFF2C3E7A if night else 0xFF8FD3FF
    c.drawRect(skia.Rect.MakeXYWH(x, y, w, h), P(sky))
    if night:
        circle(c, x + w * 0.7, y + h * 0.3, 14, 0xFFFFF3B0, None)
        circle(c, x + w * 0.7 + 7, y + h * 0.3 - 4, 12, sky, None)
        for i in range(5):
            sparkle(c, x + (i * 37 % w), y + (i * 53 % h), 0.4, WHITE)
    else:
        circle(c, x + w * 0.72, y + h * 0.3, 18, 0xFFFFD43B, None)
        for cx in (0.25, 0.45):
            ellipse(c, x + w * cx + 8 * math.sin(t * 0.5), y + h * 0.62, 26, 10, WHITE, None)
    line(c, x + w / 2, y, x + w / 2, y + h, WHITE, 6)
    line(c, x, y + h / 2, x + w, y + h / 2, WHITE, 6)
    c.drawRect(skia.Rect.MakeXYWH(x, y, w, h), P(INK, 4))
    if curtains:
        for sx in (x - 20, x + w - 6):
            shape(c, rrect(sx, y - 18, 26, h + 40, 8), curtains, INK, 3)
        shape(c, rrect(x - 30, y - 24, w + 60, 12, 6), 0xFF8B5A2B, INK, 3)


def frame_pic(c, x, y, w, h, kind="cat"):
    shape(c, rrect(x, y, w, h, 4), 0xFFB07A3C, INK, 3)
    c.drawRect(skia.Rect.MakeXYWH(x + 6, y + 6, w - 12, h - 12), P(0xFFFFF4D6))
    if kind == "cat":
        circle(c, x + w / 2, y + h / 2 + 4, w * 0.22, 0xFFF4A340, INK, 2)
        c.drawPath(poly([(x + w / 2 - 10, y + h / 2 - 4), (x + w / 2 - 6, y + h / 2 - 16), (x + w / 2 - 1, y + h / 2 - 6)]), P(0xFFF4A340))
        c.drawPath(poly([(x + w / 2 + 10, y + h / 2 - 4), (x + w / 2 + 6, y + h / 2 - 16), (x + w / 2 + 1, y + h / 2 - 6)]), P(0xFFF4A340))
    else:
        c.drawPath(poly([(x + 8, y + h - 8), (x + w / 2, y + 14), (x + w - 8, y + h - 8)]), P(0xFF6CC27A))


def plant(c, x, y, s=1.0):
    with Save(c, x, y, 0, s):
        for a in (-40, -15, 10, 35):
            with Save(c, 0, -40, a):
                shape(c, rrect(-9, -70, 18, 70, 9), 0xFF4CAF50, INK, 3)
        c.drawPath(poly([(-26, -44), (26, -44), (18, 0), (-18, 0)]), P(0xFFE07A3E))
        c.drawPath(poly([(-26, -44), (26, -44), (18, 0), (-18, 0)]), P(INK, 3))


def clock(c, x, y, t):
    circle(c, x, y, 18, WHITE, INK, 3)
    a = t * 2
    line(c, x, y, x + 10 * math.sin(a), y - 10 * math.cos(a), INK, 2.5)
    line(c, x, y, x, y - 13, 0xFFD62B3B, 2)


def room(c, t, night=False, wallc=0xFFF3E3C3, stripe=0xFFEBD7B1, floor=0xFFD9A066, y1=600):
    wall(c, y1, wallc, stripe)
    window(c, 300, 170, 150, 170, night, t)
    frame_pic(c, 90, 200, 70, 80)
    clock(c, 230, 160, t)
    floor_wood(c, y1, floor)


def radial_bg(c, t, a=0xFFD7302B, b=0xFFE84A3F, n=18):
    c.drawRect(skia.Rect.MakeWH(W, H), P(a))
    cx, cy = W / 2, H * 0.42
    for i in range(n):
        a0 = i * 2 * math.pi / n + t * 0.15
        a1 = a0 + math.pi / n
        R = 1400
        c.drawPath(poly([(cx, cy), (cx + R * math.cos(a0), cy + R * math.sin(a0)), (cx + R * math.cos(a1), cy + R * math.sin(a1))]), P(b))


def vignette(c):
    shader = skia.GradientShader.MakeRadial(
        (W / 2, H / 2), H * 0.75, [0x00000000, 0x00000000, 0x55000000], [0, 0.6, 1])
    p = skia.Paint(Shader=shader)
    c.drawRect(skia.Rect.MakeWH(W, H), p)
