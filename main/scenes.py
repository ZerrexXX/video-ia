"""Les scènes de la vidéo. Chaque scène : fonction draw(c, t, S) + bruitages.

t : temps (s) depuis le début de la scène
S : objet avec S.d (durée) et S.L (débuts des phrases, relatifs à la scène)
"""
import math

import skia

from draw import *  # noqa: F401,F403
from draw import W, H

SFX = {}


def sfx(name):
    def deco(f):
        SFX[name] = f
        return f
    return deco


def shake(c, t, t0, dur=0.35, amp=10):
    k = prog(t, t0, t0 + dur)
    if 0 < k < 1:
        a = amp * (1 - k)
        c.translate(a * math.sin(t * 90), a * math.cos(t * 77))


def flash(c, t, t0, dur=0.25, color=WHITE):
    k = prog(t, t0, t0 + dur)
    if 0 < k < 1:
        c.drawRect(skia.Rect.MakeWH(W, H), P(alpha(color, 0.85 * (1 - k))))


def blink_at(t, period=3.1, off=0.0):
    return ((t + off) % period) < 0.12


def bob(t, f=2.0, a=4.0, ph=0.0):
    return a * math.sin(t * f * math.pi + ph)


def brain(c, x, y, s=1.0, expr="proud", t=0.0, crown=False):
    with Save(c, x, y, 0, s):
        path = skia.Path()
        pts = []
        for i in range(16):
            a = i * 2 * math.pi / 16
            r = 70 + 9 * (1 if i % 2 else -1)
            pts.append((r * 1.15 * math.cos(a), r * 0.85 * math.sin(a)))
        path.moveTo(*pts[0])
        for i in range(1, 17):
            p0 = pts[(i - 1) % 16]
            p1 = pts[i % 16]
            mx, my = (p0[0] + p1[0]) / 2 * 1.12, (p0[1] + p1[1]) / 2 * 1.12
            path.quadTo(mx, my, *p1)
        path.close()
        shape(c, path, 0xFFFF9EB8, INK, 4)
        for (ax, ay, r, s0, sw) in [(-40, -25, 22, 180, 160), (30, -30, 20, 200, 150), (-50, 20, 18, 270, 140), (45, 15, 20, 250, 160), (0, -50, 15, 10, 150)]:
            arc(c, ax, ay, r, r * 0.7, s0, sw, 0xFFD45C80, 3)
        line(c, 0, -60, 0, -35, 0xFFD45C80, 3)
        face(c, 0, 10, 1.0, expr, (0, 0), False, t)
        if crown:
            pts = [(-34, -62), (-34, -100), (-17, -80), (0, -108), (17, -80), (34, -100), (34, -62)]
            shape(c, poly(pts), YELLOW, INK, 4)
            for px in (-34, 0, 34):
                circle(c, px, -100 if px else -108, 5, 0xFFE8473F, INK, 2)


def car(c, x, y, s=1.0):
    with Save(c, x, y, 0, s):
        shape(c, rrect(-260, -170, 520, 260, 50), 0xFFE84A3F, INK, 5)
        shape(c, rrect(-200, -300, 360, 160, 50), 0xFFE84A3F, INK, 5)
        shape(c, rrect(-170, -275, 140, 110, 20), 0xFFBFE9FF, INK, 4)
        shape(c, rrect(-10, -275, 140, 110, 20), 0xFFBFE9FF, INK, 4)
        for wx in (-160, 160):
            circle(c, wx, 95, 55, 0xFF333333, INK, 5)
            circle(c, wx, 95, 24, 0xFFBBBBBB, INK, 3)


def socket_plate(c, x, y, t, glow=0.0):
    shape(c, rrect(x - 55, y - 70, 110, 140, 18), 0xFFF7F7F2, INK, 4)
    circle(c, x, y, 38, 0xFFE9E9E2, INK, 3)
    ellipse(c, x - 14, y, 6, 10, INK, None)
    ellipse(c, x + 14, y, 6, 10, INK, None)
    if glow > 0:
        for i in range(4):
            a = t * 9 + i * 1.6
            sparkle(c, x + 50 * math.cos(a), y + 50 * math.sin(a), 0.8 * glow, YELLOW)


def pencil(c, x, y, rot, s=1.0):
    with Save(c, x, y, rot, s):
        shape(c, rrect(-8, -120, 16, 110, 3), 0xFFFFC72C, INK, 3)
        shape(c, poly([(-8, -10), (8, -10), (0, 14)]), 0xFFF5D7A8, INK, 3)
        c.drawPath(poly([(-3, 6), (3, 6), (0, 14)]), P(INK))
        shape(c, rrect(-8, -132, 16, 14, 4), 0xFFFF8FA3, INK, 3)


def paper(c, x, y, w, h, lines_k, title=None, rot=0):
    with Save(c, x, y, rot):
        shape(c, rrect(-w / 2, -h / 2, w, h, 6), WHITE, INK, 4)
        if title:
            font = skia.Font(FONT, 26)
            c.drawString(title, -font.measureText(title) / 2, -h / 2 + 36, font, P(0xFFD62B3B))
        n = 9
        for i in range(n):
            yy = -h / 2 + 60 + i * (h - 80) / n
            kk = clamp(lines_k * n - i)
            if kk > 0:
                xs = -w / 2 + 20
                path = skia.Path()
                path.moveTo(xs, yy)
                L = (w - 40) * kk
                for j in range(1, 30):
                    xx = xs + L * j / 29
                    path.lineTo(xx, yy + 3 * math.sin(j * 2.1 + i))
                c.drawPath(path, P(0xFF3A5BA0, 2.5))


def phone_dev(c, x, y, t, s=1.0, scroll=0.0):
    with Save(c, x, y, 0, s):
        shape(c, rrect(-70, -140, 140, 280, 22), 0xFF222831, INK, 4)
        c.save()
        c.clipRRect(rrect(-60, -126, 120, 252, 14))
        c.drawRect(skia.Rect.MakeLTRB(-60, -126, 60, 126), P(0xFFF2F2F2))
        cols = [0xFFFF6B6B, 0xFF4ECDC4, 0xFFFFD93D, 0xFF6C5CE7, 0xFFFF9FF3, 0xFF54A0FF]
        off = (scroll * 90) % 90
        for i in range(-1, 5):
            k = int(scroll) + i
            yy = -126 + i * 90 - off
            shape(c, rrect(-52, yy + 8, 104, 74, 10), cols[k % len(cols)], None)
            circle(c, -36, yy + 22, 7, WHITE, None)
            heart(c, 36, yy + 70, 0.4)
        c.restore()


def puddle(c, x, y, w, k):
    if k <= 0:
        return
    ellipse(c, x, y, w * k, 14 * k, 0xFF8FD8FF, INK, 3)


def jar(c, x, y, s=1.0, t=0.0, lid_rot=0.0):
    with Save(c, x, y, 0, s):
        shape(c, rrect(-60, -80, 120, 170, 26), alpha(0xFFBFE9C8, 0.95), INK, 4)
        for i, (px, py) in enumerate([(-25, 0), (20, 30), (-10, 50), (25, -20), (-30, -40)]):
            with Save(c, px, py, 25 * i):
                shape(c, rrect(-10, -26, 20, 52, 10), 0xFF6BA539, INK, 2.5)
        with Save(c, 0, -90, lid_rot):
            shape(c, rrect(-66, -18, 132, 30, 8), 0xFFD62B3B, INK, 4)
            for i in range(8):
                line(c, -56 + i * 16, -12, -56 + i * 16, 6, 0xFF9C1A25, 2)


def olympic(c, x, y, s=1.0):
    cols = [0xFF0081C8, BLACK, 0xFFEE334E, 0xFFFCB131, 0xFF00A651]
    pos = [(-50, 0), (0, 0), (50, 0), (-25, 22), (25, 22)]
    for col, (px, py) in zip(cols, pos):
        circle(c, x + px * s, y + py * s, 22 * s, None, col, 6 * s)


def cloud(c, x, y, s=1.0, col=WHITE):
    with Save(c, x, y, 0, s):
        for (cx, cy, r) in [(-40, 6, 30), (-8, -14, 38), (32, 0, 32), (0, 14, 30)]:
            circle(c, cx, cy, r + 3, INK, None)
        for (cx, cy, r) in [(-40, 6, 30), (-8, -14, 38), (32, 0, 32), (0, 14, 30)]:
            circle(c, cx, cy, r, col, None)


def harp_inst(c, x, y, s=1.0, t=0.0, play=0.0):
    with Save(c, x, y, 0, s):
        path = skia.Path()
        path.moveTo(-80, 140)
        path.lineTo(-80, -120)
        path.cubicTo(-20, -170, 40, -60, 90, -90)
        path.lineTo(90, -60)
        path.lineTo(-50, 140)
        path.close()
        shape(c, path, 0xFFFFC928, INK, 5)
        for i in range(9):
            xx = -66 + i * 15
            top = -110 + i * 4 + (i * i) * 0.4
            bot = 130 - i * 22
            vib = play * 3 * math.sin(t * 60 + i)
            line(c, xx, top, xx + vib, bot, 0xFFFFF4D6, 2.5)
        circle(c, -80, -126, 14, 0xFFFFC928, INK, 4)


def wings(c, x, y, s=1.0, t=0.0):
    flap = 10 * math.sin(t * 6)
    for side in (-1, 1):
        with Save(c, x + side * 30 * s, y, side * (20 + flap), s):
            path = skia.Path()
            path.moveTo(0, 0)
            path.cubicTo(side * 60, -60, side * 110, -20, side * 100, 30)
            path.cubicTo(side * 70, 20, side * 60, 50, side * 30, 40)
            path.cubicTo(side * 20, 30, side * 10, 20, 0, 0)
            shape(c, path, WHITE, INK, 4)


def halo(c, x, y, s=1.0):
    ellipse(c, x, y, 34 * s, 10 * s, None, YELLOW, 6 * s)


def lily(c, x, y, s=1.0, rot=0):
    with Save(c, x, y, rot, s):
        line(c, 0, 0, 0, 60, 0xFF4CAF50, 5)
        for a in range(0, 360, 72):
            with Save(c, 0, 0, a):
                shape(c, rrect(-9, -38, 18, 38, 9), WHITE, INK, 2.5)
        circle(c, 0, 0, 7, YELLOW, INK, 2)


def candle(c, x, y, t):
    shape(c, rrect(x - 12, y - 70, 24, 80, 4), 0xFFFFF4D6, INK, 3)
    f = 1 + 0.12 * math.sin(t * 17)
    path = skia.Path()
    path.moveTo(x, y - 100 * f + 6)
    path.quadTo(x + 12, y - 78, x, y - 70)
    path.quadTo(x - 12, y - 78, x, y - 100 * f + 6)
    shape(c, path, 0xFFFFB627, INK, 2)


# =================================================================== SCÈNES
def scene_title(c, t, S):
    radial_bg(c, t, 0xFF1F2A44, 0xFF26345A)
    # table
    c.drawRect(skia.Rect.MakeLTRB(0, 600, W, H), P(0xFF8B5A2B))
    line(c, 0, 600, W, 600, INK, 4)
    hit = 0.55
    k = prog(t, 0.0, hit)
    yy = lerp(-150, 520, ease_in_out(k) ** 2)
    c.save()
    shake(c, t, hit, 0.4, 14)
    sq = 1.0 if t < hit else 1 + 0.15 * math.exp(-(t - hit) * 10) * math.sin((t - hit) * 40)
    expr = "happy" if t < hit else "pain"
    hand(c, W / 2, yy, 1.5, 0, expr, sleeve=SHIRT, sleeve_len=400, t=t, blink=blink_at(t))
    if t > hit:
        starburst(c, W / 2 + 90, 600, 70 * back_out(prog(t, hit, hit + 0.2)), t * 3)
    c.restore()
    # titre
    s = back_out(prog(t, 0.05, 0.4))
    with Save(c, W / 2, 140, -3, s):
        outlined_text(c, "POURQUOI C'EST", 0, 0, 46, WHITE)
        outlined_text(c, "L'ENFER D'ÊTRE", 0, 56, 46, WHITE)
        outlined_text(c, "LA MAIN", 0, 128, 76, YELLOW)


@sfx("title")
def _(S):
    return [(0.0, "whoosh", 0.6), (0.55, "slam", 0.9)]


def scene_birth(c, t, S):
    wall(c, 640, 0xFFCDEBE3, 0xFFC1E3DA)
    shape(c, rrect(170, 190, 200, 40, 10), 0xFF2FB39F, INK, 3)
    outlined_text(c, "MATERNITÉ", 270, 220, 26, WHITE, INK, 5, shadow=False)
    floor_tiles(c, 640)
    L1, L2 = S.L[1], S.L[2]
    # gros bébé
    with Save(c, 0, bob(t, 0.8, 3)):
        mouth = "laugh" if (L1 - 0.3 < t < L2) else ("happy" if t < L1 else "laugh")
        if L1 <= t < L2 and int(t * 6) % 2:
            mouth = "happy"
        person(c, 270, 900, 3.0, mouth, "baby", arms=(0, 0), t=t, blink=blink_at(t))
    # bavoir étiquette
    shape(c, rrect(225, 880, 90, 34, 10), 0xFFBEE3F8, INK, 3)
    outlined_text(c, "BÉBÉ", 270, 906, 22, WHITE, INK, 4, shadow=False)
    # la main
    mouth_xy = (270, 690)
    if t < L1 - 0.4:
        hx, hy, rot, expr = 420, 520 + bob(t, 1.5, 8), -15 + bob(t, 2, 6), "happy"
        if t > 0.2:
            sparkle(c, 470, 400, 1 + 0.3 * math.sin(t * 9))
    elif t < L2:
        k = ease_in_out(prog(t, L1 - 0.4, L1 + 0.2))
        hx, hy = lerp(420, mouth_xy[0] + 30, k), lerp(520, mouth_xy[1] - 60, k)
        rot, expr = lerp(-15, -150, k), "scared" if k < 0.95 else "pain"
    else:
        k = ease_out(prog(t, L2, L2 + 0.4))
        hx, hy, rot, expr = lerp(300, 400, k), lerp(630, 450, k), lerp(-150, -10, k), "sad"
    in_mouth = L1 + 0.15 < t < L2
    hand(c, hx, hy, 0.95, rot, expr, curl=(0.2, 0.2, 0.2, 0.2) if in_mouth else (0, 0, 0, 0),
         color=SKIN if t < L2 else mixc(SKIN, 0xFF9EDCF0, 0.35), t=t, blink=blink_at(t),
         shake=3 if in_mouth else 0)
    if t >= L2:
        for i in range(6):
            k = ((t - L2) * 0.9 + i / 6) % 1
            sweat(c, 350 + i * 18, 470 + k * 140, 0.9, 1 - k)


@sfx("birth")
def _(S):
    return [(0.1, "sparkle", 0.4), (S.L[1] + 0.1, "chomp", 0.7), (S.L[1] + 0.5, "chomp", 0.6), (S.L[2], "splat", 0.6)]


def scene_clap(c, t, S):
    L1, L2 = S.L[1], S.L[2]
    if t < L2:
        room(c, t)
        plant(c, 470, 620, 1.0)
        cl = math.sin(t * 22) > 0
        # bébé qui applaudit
        arms = (60, -60) if cl else (95, -95)
        person(c, 270, 820, 1.7, "laugh", "baby", arms=arms, t=t)
        # famille
        if t > L1 - 0.3:
            k = back_out(prog(t, L1 - 0.3, L1 + 0.1))
            person(c, 90, 860 + (1 - k) * 300, 1.0, "laugh", "adult", arms=(150 + bob(t, 4, 15), -150 + bob(t, 4, 15, 1)), t=t, shirt=0xFFE77FAE)
            person(c, 450, 860 + (1 - k) * 300, 1.0, "laugh", "adult", arms=(150 + bob(t, 4, 15, 2), -150 + bob(t, 4, 15, 3)), t=t, shirt=0xFF6C8CD5)
            for i in range(5):
                kk = ((t - L1) * 0.6 + i / 5) % 1
                heart(c, 200 + i * 35, 560 - kk * 160, 1.0)
    else:
        tt = t - L2
        c.drawRect(skia.Rect.MakeWH(W, H), P(0xFF1C1C28))
        # projecteur
        shader = skia.GradientShader.MakeRadial((W / 2, 470), 260, [0x66FFF3B0, 0x00FFF3B0], [0, 1])
        c.drawRect(skia.Rect.MakeWH(W, H), skia.Paint(Shader=shader))
        ellipse(c, W / 2, 660, 140, 26, 0xFF2C2C3C, None)
        hand(c, W / 2, 470 + bob(tt, 0.6, 4), 1.6, 0, "sad", t=t, look=(0, 0.6), blink=blink_at(tt, 2.2))


@sfx("clap")
def _(S):
    return [(0.1, "clap", 0.6), (S.L[1] - 0.2, "clap", 0.8), (S.L[1] + 1.2, "clap", 0.7), (S.L[2], "crickets", 0.8)]


def scene_socket(c, t, S):
    L1, L2 = S.L[1], S.L[2]
    zap_t = L2 + 0.05
    c.save()
    shake(c, t, zap_t, 1.0, 12)
    wall(c, 760, 0xFFF3E3C3, 0xFFEBD7B1)
    floor_wood(c, 760)
    socket_plate(c, 380, 470, t, glow=1.0 if t < L1 else 0.0)
    # bras qui pousse la main
    if t < L1:
        hx, hy, expr = 120, 560 + bob(t, 1.2, 6), "happy"
        look = (1, -0.3)
    else:
        k = ease_in_out(prog(t, L1, zap_t))
        hx, hy, expr, look = lerp(120, 270, k), lerp(560, 520, k), "scared", (1, 0)
    rot = 90
    zapped = t >= zap_t
    col = SKIN
    if zapped:
        col = YELLOW if int(t * 16) % 2 else 0xFF4A4A4A
        expr = "shock"
    hand(c, hx, hy, 1.0, rot, expr, curl=(0, 1, 1, 1), thumb=1, sleeve=SHIRT, sleeve_len=420,
         color=col, t=t, look=look, blink=blink_at(t), shake=6 if zapped else 0)
    if zapped:
        for i in range(6):
            a = i * 1.05 + t * 3
            bolt(c, 300 + 130 * math.cos(a), 500 + 130 * math.sin(a), 1.2, a * 50)
    c.restore()
    flash(c, t, zap_t, 0.3, 0xFFFFF7AE)


@sfx("socket")
def _(S):
    return [(0.1, "sparkle", 0.4), (S.L[1], "whoosh", 0.4), (S.L[2] + 0.05, "zap", 1.0)]


def scene_door(c, t, S):
    L1, L2 = S.L[1], S.L[2]
    hit = L1 - 0.05
    c.save()
    shake(c, t, hit, 0.6, 16)
    c.drawRect(skia.Rect.MakeWH(W, H), P(0xFF9ED9F5))
    for x in (60, 380):
        cloud(c, x + 6 * math.sin(t * 0.4), 140, 0.9)
    c.drawRect(skia.Rect.MakeLTRB(0, 700, W, H), P(0xFF8A8A8A))
    line(c, 0, 700, W, 700, INK, 4)
    car(c, 230, 640, 0.95)
    # encadrement de porte (ouverture sombre)
    shape(c, rrect(250, 310, 180, 360, 14), 0xFF3A2A2A, INK, 4)
    # la main posée sur le bord
    swollen = t > hit
    hand(c, 400, 470, 0.85, 90, "pain" if swollen else ("happy" if t < L1 - 0.6 else "scared"),
         curl=(0.3, 0.3, 0.3, 0.3), thumb=0.6, swell=1 if swollen else None,
         t=t, blink=blink_at(t), look=(1, 0), shake=3 if swollen else 0)
    # portière qui se ferme
    k = ease_in_out(prog(t, L1 - 0.6, hit)) ** 2
    dx = lerp(560, 400, k)
    shape(c, rrect(dx, 300, 210, 380, 16), 0xFFE84A3F, INK, 5)
    shape(c, rrect(dx + 30, 330, 150, 120, 14), 0xFFBFE9FF, INK, 4)
    shape(c, rrect(dx + 30, 480, 46, 14, 7), 0xFF555555, INK, 3)
    if t > hit:
        starburst(c, 420, 400, 60 * back_out(prog(t, hit, hit + 0.2)), t * 3)
    c.restore()
    if t > L2 - 0.2:
        k = back_out(prog(t, L2 - 0.2, L2 + 0.2))
        person(c, 100, 930 + (1 - k) * 300, 1.1, "cry", "kid", arms=(30, -30), t=t)
        # saucisse
        with Save(c, 430, 830 + (1 - k) * 300, -20):
            shape(c, rrect(-70, -22, 140, 44, 22), 0xFFC0603A, INK, 4)
            arc(c, -30, 0, 10, 14, 300, 120, 0xFF8E3B1F, 3)
            arc(c, 10, 0, 10, 14, 300, 120, 0xFF8E3B1F, 3)


@sfx("door")
def _(S):
    return [(S.L[1] - 0.6, "whoosh", 0.6), (S.L[1] - 0.05, "slam", 1.0), (S.L[2] + 0.2, "boing", 0.6)]


def scene_school(c, t, S):
    L1, L2 = S.L[1], S.L[2]
    wall(c, 560, 0xFFF6E8C8)
    shape(c, rrect(40, 150, 460, 230, 8), 0xFF2F5D50, 0xFF8B5A2B, 12)
    font = skia.Font(FONT, 40)
    c.drawString("12 x 7 = ?", 90, 250, font, P(0xEEFFFFFF))
    c.drawString("Dictée", 300, 330, skia.Font(FONT, 32), P(0xEEFFFFFF))
    c.drawRect(skia.Rect.MakeLTRB(0, 560, W, H), P(0xFFB98352))
    line(c, 0, 560, W, 560, INK, 4)
    exam = t >= L2
    c.save()
    if exam:
        shake(c, t, L2, 9, 3)
    paper(c, 270, 700, 300, 360, (t * 0.18) % 1 if not exam else ease_out(prog(t, L2, S.d)),
          "CONTRÔLE" if exam else None, -4)
    k = t * 7
    px = 210 + 70 * ((t * 0.18 % 1 * 9) % 1) + 4 * math.sin(k)
    py = 590 + 320 * ((t * 0.18) % 1) if not exam else 620 + 300 * prog(t, L2, S.d)
    hx, hy = px + 60, py + 30
    sweating = exam
    hand(c, hx, hy, 0.85, -35, "pain" if exam else "tired", curl=(0.5, 0.5, 0.75, 0.75), thumb=0.6,
         t=t, blink=blink_at(t), sleeve=SHIRT, sleeve_len=300, shake=4 if exam else 1)
    pencil(c, px, py, 25, 1.0)
    if sweating:
        for i in range(3):
            kk = ((t - L2) * 1.2 + i / 3) % 1
            sweat(c, hx - 60 + i * 50, hy - 90 + kk * 50, 1.0, 1 - kk)
        bolt(c, hx + 80, hy - 60, 1.3 + 0.2 * math.sin(t * 20), 20)
        bolt(c, hx - 90, hy - 30, 1.1, -20)
    c.restore()
    # bulle de pensée du cerveau
    if L1 - 0.2 < t < L2:
        k = back_out(prog(t, L1 - 0.2, L1 + 0.2))
        with Save(c, 270, 280, 0, k):
            cloud(c, 0, 0, 2.6, WHITE)
            for (cx, cy) in [(-60, -10), (40, 10)]:
                cloud(c, cx + 8 * math.sin(t + cx), cy, 0.5, 0xFFDFF1FF)
            brain(c, 0, 20, 0.6, "happy", t)
            circle(c, -110, 140, 14, WHITE, INK, 3)
            circle(c, -130, 175, 8, WHITE, INK, 3)


@sfx("school")
def _(S):
    return [(S.L[1] - 0.2, "pop", 0.6), (S.L[2], "hit", 0.7), (S.L[2] + 0.3, "crack", 0.6)]


def scene_nails(c, t, S):
    L1 = S.L[1]
    room(c, t, wallc=0xFFDCE8F7, stripe=0xFFD0DFF2, floor=0xFFC98E58)
    nerv = t > 0.4
    # ado gros plan
    with Save(c, 0, 0):
        chew = t > L1 - 0.2 and int(t * 7) % 2
        person(c, 270, 1050, 2.8, "laugh" if chew else ("scared" if nerv else "happy"), "adult",
               arms=(0, 0), t=t, look=(0.6, -0.4), blink=blink_at(t))
    mouth = (270, 770)
    if t < L1 - 0.4:
        k = ease_in_out(prog(t, 0.3, L1 - 0.4))
        hx, hy, rot = lerp(470, 335, k), lerp(330, 525, k), lerp(-10, -40, k)
        expr = "happy" if k < 0.3 else "scared"
    else:
        hx, hy, rot = 325 + 6 * math.sin(t * 25), 535, -40
        expr = "pain"
    hand(c, hx, hy, 0.9, rot, expr, curl=(0.15, 0.7, 0.75, 0.8), thumb=0.7, t=t,
         blink=blink_at(t), look=(-1, 0.3), shake=2 if t > L1 else 0)
    if t > L1 - 0.2:
        for i in range(8):
            kk = ((t - L1) * 1.4 + i / 8) % 1
            a = i * 0.8
            x = 290 + math.cos(a) * 160 * kk
            y = 560 - 120 * kk + 260 * kk * kk
            with Save(c, x, y, i * 50 + t * 300):
                shape(c, rrect(-8, -3, 16, 6, 3), NAIL, INK, 2)
    if nerv:
        sweat(c, 190, 330 + 20 * ((t * 1.3) % 1), 1.2)


@sfx("nails")
def _(S):
    return [(S.L[1] - 0.2, "chomp", 0.8), (S.L[1] + 0.35, "chomp", 0.8), (S.L[1] + 0.9, "chomp", 0.8)]


def scene_highfive(c, t, S):
    L1, L2 = S.L[1], S.L[2]
    room(c, t)
    plant(c, 70, 620, 1.1)
    # copain qui passe sans voir
    if t < L2 + 1:
        k = prog(t, L1 - 0.3, L1 + 2.2)
        fx = lerp(380, -120, k)
        person(c, fx, 900, 1.05, "happy" if k <= 0 else "proud", "adult", arms=(10, -10), t=t,
               shirt=0xFFF4A340, legs_walk=1.0 if 0 < k < 1 else 0, look=(-1, 0))
    person(c, 400, 900, 1.05, "happy" if t < L1 else "sad", "adult", arms=(10, -165), t=t, blink=blink_at(t),
           hide_right_arm=True)
    # bras + main levée gros plan
    sad = t > L1 + 0.5
    hand(c, 400, 320 + bob(t, 0.7, 3), 1.25, 8, "sad" if sad else "happy", t=t,
         sleeve=SHIRT, sleeve_len=420, blink=blink_at(t), look=(-1, 0) if t > L1 else (0, 0))
    if t > L2:
        n = min(5, int((t - L2) / max(0.4, (S.d - L2) / 5)) + 1)
        with Save(c, 130, 230, -6, back_out(prog(t, L2, L2 + 0.25))):
            shape(c, rrect(-70, -46, 140, 92, 18), WHITE, INK, 4)
            outlined_text(c, f"{n} s", 0, 22, 54, 0xFFFF6B6B, INK, 9, shadow=False)
        for i in range(3):
            kk = ((t - L2) * 0.9 + i / 3) % 1
            sweat(c, 330 + i * 60, 200 + kk * 40, 0.9, 1 - kk)


@sfx("highfive")
def _(S):
    return [(S.L[1], "crickets", 0.9), (S.L[2] + 0.4, "crickets", 0.7), (S.L[2] + 0.2, "pop", 0.5)]


def scene_holding(c, t, S):
    L1, L2 = S.L[1], S.L[2]
    c.drawRect(skia.Rect.MakeWH(W, H), P(0xFFFFD6E3))
    for i in range(10):
        kk = (t * 0.15 + i / 10) % 1
        heart(c, (i * 97) % W, H - kk * (H + 80), 1.3 + 0.3 * (i % 3), alpha(0xFFFF7FA7, 0.7))
    beat = 1 + 0.06 * max(0, math.sin(t * 7)) if t > L1 else 1
    wet = prog(t, L1, S.d)
    with Save(c, W / 2, 470, 0, beat):
        # main de l'autre (vernis rouge), en miroir
        hand(c, 70, 0, 1.05, -25, "happy", curl=(0.4, 0.4, 0.4, 0.4), thumb=0.5, mirror=True, t=t,
             sleeve=0xFFB06BD6, sleeve_len=300, color=0xFFF7C6A3, blink=blink_at(t, 2.7, 1))
        hand(c, -70, 0, 1.05, 25, "tired" if t > L2 else ("scared" if t > L1 else "happy"),
             curl=(0.4, 0.4, 0.4, 0.4), thumb=0.5, t=t, sleeve=SHIRT, sleeve_len=300,
             color=mixc(SKIN, 0xFFBFE9FF, 0.4 * wet), blink=blink_at(t))
    if t > L1:
        n = int(3 + 9 * wet)
        for i in range(n):
            kk = ((t - L1) * 1.5 + i / n) % 1
            sweat(c, 180 + (i * 37) % 120, 380 + kk * 260, 1.0, 1 - kk)
    puddle(c, 230, 690, 150, ease_out(prog(t, L2, L2 + 0.6)))


@sfx("holding")
def _(S):
    return [(0.1, "sparkle", 0.4), (S.L[1], "heart", 0.9), (S.L[1] + 0.8, "heart", 0.9), (S.L[1] + 1.6, "heart", 0.9), (S.L[2], "splat", 0.6)]


def scene_phone(c, t, S):
    L1, L2 = S.L[1], S.L[2]
    room(c, t, night=True, wallc=0xFF3B4A6B, stripe=0xFF36445F, floor=0xFF8E6440)
    glow = skia.GradientShader.MakeRadial((W / 2, 440), 330, [0x66BDE3FF, 0x00BDE3FF], [0, 1])
    c.drawRect(skia.Rect.MakeWH(W, H), skia.Paint(Shader=glow))
    swipe = (t * 2.3) % 1
    phone_dev(c, 280, 420, t, 1.4, scroll=t * 2.3)
    # main qui tient le téléphone (pouce devant)
    tired = t > L1
    hand(c, 280, 610, 1.15, 0, "tired" if tired else "happy", curl=(0.35, 0.35, 0.35, 0.35), thumb=1,
         t=t, sleeve=SHIRT, sleeve_len=300, face_on=False, blink=blink_at(t))
    # pouce qui scrolle
    ty = 560 - 90 * ease_in_out(swipe if swipe < 0.6 else (1 - swipe) / 0.4 * 0.6)
    with Save(c, 230, ty, 25):
        shape(c, rrect(-20, -70, 40, 110, 20), SKIN, INK, 4)
        shape(c, rrect(-12, -64, 24, 26, 12), NAIL, mixc(SKIN, INK, 0.2), 2)
        with Save(c, 0, -10, 0, 0.55):
            face(c, 0, 0, 1, "tired" if tired else "happy", (0, 0), blink_at(t), t)
    if t > L1:
        with Save(c, 410, 210, 8, back_out(prog(t, L1, L1 + 0.3))):
            shape(c, rrect(-90, -40, 180, 80, 14), YELLOW, INK, 4)
            km = min(3.0, (t - L1) * 1.6)
            outlined_text(c, f"{km:.1f} KM", 0, 16, 44, WHITE, INK, 8, shadow=False)
    if t > L2:
        k = back_out(prog(t, L2, L2 + 0.3))
        with Save(c, 150, 260, -6, k):
            speech_bubble(c, 0, 0, 220, 70, "RETRAITE !", 34, (40, 40))
        for i in range(3):
            kk = ((t - L2) + i / 3) % 1
            sweat(c, 200 + i * 20, 420 + 30 * kk, 0.8, 1 - kk)


@sfx("phone")
def _(S):
    ev = [(0.1, "pop", 0.3)]
    t = 0.2
    while t < S.L[1]:
        ev.append((t, "whoosh", 0.18))
        t += 1 / 2.3
    ev += [(S.L[1], "ding", 0.5), (S.L[2], "pop", 0.6)]
    return ev


def scene_ring(c, t, S):
    L1, L2 = S.L[1], S.L[2]
    c.drawRect(skia.Rect.MakeWH(W, H), P(0xFFFFF1F5))
    for i in range(12):
        a = i * math.pi / 6 + t * 0.2
        sparkle(c, W / 2 + 230 * math.cos(a), 470 + 300 * math.sin(a), 1.2, 0xFFFFC7D9)
    # arche de fleurs
    for i in range(14):
        a = math.pi + i * math.pi / 13
        circle(c, W / 2 + 240 * math.cos(a), 520 + 300 * math.sin(a), 22, 0xFFFF9EB8 if i % 2 else WHITE, INK, 3)
    years = t > L2
    k = prog(t, L2 + 0.3, S.d - 0.2)
    swell = 2 if k > 0.4 else None
    expr = "laugh" if t < L2 else ("pain" if k > 0.4 else "scared")
    hand(c, W / 2, 500, 1.6, 0, expr, ring=True, t=t, sleeve=0xFFFFFFFF, sleeve_len=300,
         wrinkles=k, swell=swell, blink=blink_at(t), shake=3 if swell is not None else 0)
    if t < L2 and t > 0.1:
        for i in range(4):
            sparkle(c, 290 + 60 * math.cos(t * 3 + i * 1.6), 240 + 40 * math.sin(t * 3 + i * 1.6), 1.0 + 0.3 * math.sin(t * 8 + i))
    if years:
        yr = int(lerp(2030, 2080, k))
        with Save(c, W / 2, 880, 0, back_out(prog(t, L2, L2 + 0.25))):
            shape(c, rrect(-110, -45, 220, 90, 16), WHITE, INK, 4)
            outlined_text(c, str(yr), 0, 22, 60, INK, WHITE, 2, shadow=False)


@sfx("ring")
def _(S):
    return [(0.2, "ding", 0.7), (S.L[1], "sparkle", 0.7), (S.L[2] + 0.3, "whoosh", 0.4), (S.L[2] + 1.8, "boing", 0.5)]


def scene_stove(c, t, S):
    L1 = S.L[1]
    touch = L1 - 0.25
    c.save()
    shake(c, t, touch, 0.7, 14)
    # cuisine
    c.drawRect(skia.Rect.MakeWH(W, 560), P(0xFFF9F3E8))
    for y in range(0, 560, 54):
        for x in range(0, W, 54):
            c.drawRect(skia.Rect.MakeXYWH(x + 2, y + 2, 50, 50), P(0xFFE3F1F1))
    c.drawRect(skia.Rect.MakeLTRB(0, 560, W, H), P(0xFF56565E))
    shape(c, rrect(-10, 540, W + 20, 40, 6), 0xFF8B8F99, INK, 4)
    # flamme + poêle
    for i in range(5):
        f = 1 + 0.2 * math.sin(t * 15 + i)
        path = skia.Path()
        x0 = 230 + i * 22
        path.moveTo(x0, 540)
        path.quadTo(x0 - 12, 520, x0, 500 - 14 * f)
        path.quadTo(x0 + 12, 520, x0, 540)
        shape(c, path, 0xFF4FA3FF, INK, 2)
    shape(c, rrect(170, 470, 220, 36, 16), 0xFF333333, INK, 4)
    shape(c, rrect(380, 478, 150, 18, 9), 0xFF5C4033, INK, 4)
    steam(c, 280, 460, t, 70)
    burned = t > touch
    if not burned:
        k = ease_in_out(prog(t, 0.3, touch))
        hx, hy, expr = lerp(120, 250, k), lerp(200, 330, k), "happy" if k < 0.6 else "proud"
    else:
        k = ease_out(prog(t, touch, touch + 0.35))
        hx, hy, expr = lerp(250, 150, k), lerp(330, 200, k), "pain"
    hand(c, hx, hy, 1.0, 160, expr, curl=(0, 1, 1, 1), thumb=1, t=t, sleeve=SHIRT, sleeve_len=300,
         color=0xFFE8473F if burned else SKIN, blink=blink_at(t), shake=5 if burned else 0)
    if burned:
        starburst(c, 260, 440, 55 * back_out(prog(t, touch, touch + 0.2)), t * 3, 0xFFFF8A3D)
        steam(c, hx, hy - 60, t, 90, 0xAA888888)
    c.restore()


@sfx("stove")
def _(S):
    return [(0.0, "sizzle", 0.25), (S.L[1] - 0.25, "sizzle", 1.0), (S.L[1] - 0.25, "bonk", 0.6)]


def scene_handshake(c, t, S):
    L1 = S.L[1]
    wall(c, 640, 0xFFDDE3EA, 0xFFD3DAE3)
    shape(c, rrect(150, 150, 240, 60, 8), 0xFF3B4A6B, INK, 4)
    outlined_text(c, "DIRECTEUR", 270, 192, 32, YELLOW, INK, 6, shadow=False)
    c.drawRect(skia.Rect.MakeLTRB(0, 640, W, H), P(0xFF7A6A5A))
    # file de mains qui arrivent
    period = 0.55
    n = int(t / period)
    ph = (t % period) / period
    shake_v = 10 * math.sin(ph * math.pi * 4) if ph < 0.6 else 0
    skins = [0xFFF7C6A3, 0xFFC68A5E, 0xFF8D5A3B, 0xFFFFE0C7, 0xFFE0A980]
    sleeves = [0xFF555555, 0xFF2B2B33, 0xFF6C5CE7, 0xFF8B5A2B, 0xFF4A6FA5]
    ox = lerp(520, 330, ease_out(ph * 2)) if ph < 0.5 else lerp(330, 760, ease_in_out((ph - 0.5) * 2))
    sick = prog(t, L1, L1 + 1.2)
    hand(c, 200, 470 + shake_v, 1.05, 90, "laugh" if t < L1 else "tired", curl=(0.5, 0.5, 0.5, 0.5), thumb=0.3,
         t=t, sleeve=0xFF2B2B33, sleeve_len=360, color=mixc(SKIN, 0xFFB5E08A, 0.6 * sick), blink=blink_at(t))
    hand(c, ox, 470 + shake_v, 1.05, -90, "happy", curl=(0.5, 0.5, 0.5, 0.5), thumb=0.3, mirror=True,
         t=t, sleeve=sleeves[n % 5], sleeve_len=360, color=skins[n % 5], face_on=False)
    count = min(300, int(t * 300 / max(1, L1)))
    with Save(c, 120, 300, -8, 1 + 0.08 * math.sin(t * 12)):
        outlined_text(c, f"x {count}", 0, 0, 52, YELLOW)
    if t > L1:
        for i in range(6):
            a = i * 1.05 + t
            germ(c, 230 + 120 * math.cos(a), 470 + 100 * math.sin(a), back_out(prog(t, L1 + i * 0.12, L1 + i * 0.12 + 0.3)) * 0.9, t * 2)


@sfx("handshake")
def _(S):
    ev = []
    t = 0.12
    while t < S.L[1]:
        ev.append((t, "pop", 0.35))
        t += 0.55
    ev.append((S.L[1] + 0.1, "splat", 0.5))
    return ev


def scene_brain(c, t, S):
    L1, L2 = S.L[1], S.L[2]
    radial_bg(c, t)
    # podium
    shape(c, rrect(160, 560, 220, 200, 8), 0xFFFFC928, INK, 5)
    outlined_text(c, "1", 270, 690, 90, WHITE, INK, 12, shadow=False)
    brain(c, 270, 460 + bob(t, 1.2, 6), 1.3, "proud" if t < L1 else "laugh", t, crown=True)
    for i in range(6):
        a = i * 1.04 + t * 1.5
        k = (t * 2 + i * 0.37) % 1
        if k < 0.15:
            sparkle(c, 270 + 200 * math.cos(a), 420 + 180 * math.sin(a), 2.0, WHITE)
    if L1 - 0.1 < t < L2 + 0.4:
        with Save(c, 390, 250, 6, back_out(prog(t, L1 - 0.1, L1 + 0.2))):
            speech_bubble(c, 0, 0, 230, 70, "QUEL GÉNIE !", 34, (-40, 40))
    if t > L2 - 0.2:
        k = back_out(prog(t, L2 - 0.2, L2 + 0.2))
        hand(c, 110, 860 - 330 * k, 1.05, 12, "angry", curl=(0, 0, 0, 0), t=t, shake=4,
             sleeve=SHIRT, sleeve_len=400, blink=blink_at(t))
        for i in range(3):
            line(c, 40 + i * 18, 330 - i * 4, 30 + i * 22, 300 - i * 8, INK, 4)


@sfx("brain")
def _(S):
    return [(0.1, "clap", 0.6), (S.L[1] - 0.1, "pop", 0.5), (S.L[1] + 0.2, "clap", 0.8), (S.L[2] - 0.2, "boing", 0.6)]


def scene_old(c, t, S):
    L1 = S.L[1]
    room(c, t, wallc=0xFFEDE3D3, stripe=0xFFE3D7C3, floor=0xFFB98352)
    if t < L1 - 0.1:
        hand(c, W / 2, 470, 1.6, 0, "tired", t=t, wrinkles=1.0, shake=4, blink=blink_at(t, 2.0),
             curl=(0.1, 0.15, 0.1, 0.2), sleeve=0xFF9C8BB5, sleeve_len=300)
        for i, tt in enumerate([0.9, 1.6, 2.3]):
            if tt < t < tt + 0.4:
                outlined_text(c, "CRAC", 140 + i * 130, 260 + (i % 2) * 60, 40, WHITE, INK, 8)
    else:
        tt = t - L1
        olympic(c, 130, 300, 0.9)
        jar(c, W / 2, 590, 1.4, t, lid_rot=3 * math.sin(t * 30))
        hand(c, W / 2 + 6 * math.sin(t * 50), 380, 1.1, 180, "pain", curl=(0.55, 0.55, 0.55, 0.55), thumb=0.6,
             t=t, wrinkles=1.0, sleeve=0xFF9C8BB5, sleeve_len=300, face_on=True)
        for i in range(3):
            kk = (tt * 1.2 + i / 3) % 1
            sweat(c, 180 + i * 90, 260 + kk * 40, 1.0, 1 - kk)


@sfx("old")
def _(S):
    return [(0.9, "crack", 0.7), (1.6, "crack", 0.7), (2.3, "crack", 0.7), (S.L[1], "hit", 0.6)]


def scene_sleep(c, t, S):
    L1 = S.L[1]
    dim = prog(t, L1, L1 + 1.0)
    wall(c, 600, 0xFF5A5F8A, 0xFF53587F)
    window(c, 300, 160, 150, 170, True, t, 0xFF2D3A6B)
    frame_pic(c, 80, 190, 80, 70, "mountain")
    floor_wood(c, 600, 0xFF8E6440)
    # lit
    shape(c, rrect(40, 520, 460, 200, 16), 0xFF8B5A2B, INK, 4)
    shape(c, rrect(60, 470, 120, 70, 30), WHITE, INK, 4)
    # tête du vieux
    hy = 470
    circle(c, 130, hy, 42, SKIN, INK, 4)
    for sx in (-1, 1):
        ellipse(c, 130 + sx * 36, hy - 6, 12, 16, 0xFFE9E9E9, INK, 3)
    face(c, 130, hy + 6, 0.95, "sleep", t=t)
    # couverture
    shape(c, rrect(150, 480, 340, 120, 30), 0xFFF2D17A, INK, 4)
    hand(c, 250, 520, 0.6, 100, "sleep", curl=(0.1, 0.1, 0.1, 0.1), t=t, wrinkles=1.0)
    ellipse(c, 270, 830, 150, 40, 0xFFE07A3E, INK, 3)
    if t < L1 + 0.3:
        zzz(c, 160, 400, t, 1.4)
    clock(c, 230, 140, t * 3)
    if dim > 0:
        c.drawRect(skia.Rect.MakeWH(W, H), P(alpha(0xFF0B0B18, 0.55 * dim)))


@sfx("sleep")
def _(S):
    return [(S.L[1] + 0.2, "gong", 0.6)]


def scene_funeral(c, t, S):
    L1, L2 = S.L[1], S.L[2]
    c.drawRect(skia.Rect.MakeWH(W, H), P(0xFFD8D4E8))
    # cercueil vu de dessus, gros plan poitrine
    shape(c, rrect(30, 80, 480, 840, 40), 0xFF6B4226, INK, 5)
    shape(c, rrect(55, 105, 430, 790, 30), 0xFFF4EEF8, INK, 4)
    shape(c, rrect(110, 240, 320, 700, 60), 0xFF2B2B33, INK, 4)
    c.drawPath(poly([(240, 240), (300, 240), (270, 330)]), P(WHITE))
    for (lx, ly, r) in [(90, 160, -20), (450, 170, 20), (85, 700, -40), (455, 720, 35)]:
        lily(c, lx, ly, 1.0, r)
    calm = t > L1
    for side in (-1, 1):
        hand(c, 270 + side * 60, 520 + side * 10, 1.1, side * 55 - 180 * 0, "rest" if calm else "tired",
             curl=(0.25, 0.25, 0.25, 0.25), thumb=0.6, t=t, wrinkles=0.8, mirror=side > 0,
             face_on=side < 0, sleeve=0xFF2B2B33, sleeve_len=200)
    candle(c, 70, 940, t)
    candle(c, 470, 940, t)
    if t > L2:
        for i in range(5):
            kk = ((t - L2) * 0.6 + i / 5) % 1
            sparkle(c, 200 + i * 35, 460 - kk * 120, 1.2 * math.sin(kk * math.pi), WHITE)


@sfx("funeral")
def _(S):
    return [(0.1, "gong", 0.35), (S.L[1] + 0.2, "sparkle", 0.4), (S.L[2], "ding", 0.4)]


def scene_heaven(c, t, S):
    L1, L2 = S.L[1], S.L[2]
    shader = skia.GradientShader.MakeLinear([(0, 0), (0, H)], [0xFF8FD3FF, 0xFFFFF6D6])
    c.drawRect(skia.Rect.MakeWH(W, H), skia.Paint(Shader=shader))
    for i, (x, y, s) in enumerate([(80, 160, 1.2), (440, 120, 1.0), (300, 260, 0.8), (60, 820, 1.6), (460, 860, 1.8), (260, 900, 1.6)]):
        cloud(c, x + 10 * math.sin(t * 0.5 + i), y, s)
    # portail doré
    for x in (90, 450):
        shape(c, rrect(x - 14, 320, 28, 420, 6), 0xFFFFC928, INK, 4)
    arc(c, 270, 330, 180, 90, 180, 180, 0xFFFFC928, 10)
    # ange
    k = ease_out(prog(t, 0.0, L1))
    ax = lerp(640, 400, k)
    wings(c, ax, 540, 1.0, t)
    hy = person(c, ax, 760, 1.0, "happy", "adult", arms=(10, -110), t=t, shirt=WHITE)
    halo(c, ax, 760 + hy * 1.0 - 52, 1.0)
    # main
    expr = "rest" if t < L1 - 0.3 else ("shock" if t < L2 else "cry")
    play = t > L2
    hand(c, 170 + (6 * math.sin(t * 30) if play else 0), 470, 1.05, 10 if not play else 40, expr,
         t=t, curl=(0.0, 0.2, 0.3, 0.4) if play else (0, 0, 0, 0), blink=blink_at(t))
    if t > L1 - 0.3:
        s = back_out(prog(t, L1 - 0.3, L1 + 0.1))
        harp_inst(c, 340, 470, 0.9 * s, t, 1.0 if play else 0.0)
        if t < L2:
            for i in range(4):
                sparkle(c, 340 + 100 * math.cos(t * 3 + i * 1.6), 470 + 140 * math.sin(t * 3 + i * 1.6), 1.2)
    end = S.d - 1.6
    if t > end:
        k = back_out(prog(t, end, end + 0.3))
        c.drawRect(skia.Rect.MakeWH(W, H), P(alpha(BLACK, 0.35 * prog(t, end, end + 0.3))))
        with Save(c, W / 2, 470, -4, k):
            outlined_text(c, "PAUVRE", 0, -10, 84, WHITE)
            outlined_text(c, "MAIN...", 0, 80, 84, YELLOW)


@sfx("heaven")
def _(S):
    return [(0.1, "sparkle", 0.5), (S.L[1] - 0.3, "harp", 0.9), (S.L[2], "harp", 0.7), (S.L[2] + 1.0, "harp", 0.6),
            (S.d - 1.6, "sad", 0.9)]


SCENES = {k[6:]: v for k, v in globals().items() if k.startswith("scene_")}
