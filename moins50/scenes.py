"""Les 19 plans de la vidéo (cf. prompts/vivre-a-moins-50.md, section 1).

Chaque plan : fonction draw(c, t, d) avec t le temps local et d la durée.
SHOTS : liste (début, fin, fonction, réchauffement de l'étalonnage).
"""
import math
import random

import skia

from draw import *  # noqa: F401,F403
from draw import W, H


def white(c, a):
    if a > 0:
        c.drawRect(R(-10, -10, W + 20, H + 20), P(alpha(0xFFF4F8FB, a)))


def black(c, a):
    if a > 0:
        c.drawRect(R(-10, -10, W + 20, H + 20), P(alpha(BLACK, a)))


def street_bokeh(c, t, a=1.0):
    sky(c, 0xFF0B1424, 0xFF1D2B40)
    for i, (x, y, r) in enumerate([(90, 520, 40), (250, 470, 30), (410, 540, 46), (470, 420, 22),
                                   (160, 380, 18), (330, 360, 16), (40, 640, 30)]):
        glow(c, x + math.sin(t + i) * 2, y, r * 2.2, SODIUM, 0.55 * a)
        c.drawCircle(x, y, r * 0.55, P(alpha(0xFFFFC27A, 0.55 * a), blur=4))
    c.drawRect(R(0, 600, W, 360), lin(0, 600, 0, 960, [alpha(FOG, 0.0), alpha(FOG, 0.35)]))


def thermometer(c, value, t, sharp=1.0):
    """Thermomètre à aiguille vissé sur un cadre de fenêtre (centre écran)."""
    cx, cy, r = W / 2, 430, 150
    # cadre en bois
    c.drawRect(R(-20, 600, W + 40, 420), lin(0, 600, 0, 960, [0xFF4A3121, 0xFF24160E]))
    for i in range(9):
        c.drawLine(-20, 620 + i * 34, W + 20, 628 + i * 34, P(alpha(0xFF1A0F08, 0.45), 2))
    c.drawCircle(cx + 4, cy + 10, r + 16, P(alpha(BLACK, 0.6), blur=14))
    c.drawCircle(cx, cy, r + 14, lin(cx - r, cy - r, cx + r, cy + r, [0xFFD7DDE3, 0xFF6C7580]))
    c.drawCircle(cx, cy, r, rad(cx - 40, cy - 50, r * 1.4, [0xFFF7F4EC, 0xFFD9D3C4]))
    # graduations -60..+40, -60 en bas à gauche, arc de 270°
    def ang(v):
        return math.radians(135 + (v + 60) / 100 * 270)
    font = skia.Font(SANS, 17)
    for v in range(-60, 41, 5):
        a = ang(v)
        big = v % 10 == 0
        r0 = r - (24 if big else 14)
        col = 0xFF2266CC if v < 0 else 0xFFC0392B
        c.drawLine(cx + math.cos(a) * r0, cy + math.sin(a) * r0, cx + math.cos(a) * (r - 6), cy + math.sin(a) * (r - 6),
                   P(col, 3 if big else 1.5))
        if big and v % 20 == 0:
            s = f"{v}"
            w = font.measureText(s)
            c.drawString(s, cx + math.cos(a) * (r - 44) - w / 2, cy + math.sin(a) * (r - 44) + 6, font, P(0xFF1B2330))
    c.drawString("°C", cx - 12, cy + 62, skia.Font(SANS, 20), P(0xFF1B2330))
    # aiguille
    a = ang(value) + math.sin(t * 9) * 0.004
    c.drawLine(cx - math.cos(a) * 20, cy - math.sin(a) * 20, cx + math.cos(a) * (r - 18), cy + math.sin(a) * (r - 18),
               P(0xFFB3141C, 4))
    c.drawCircle(cx, cy, 10, P(0xFF222222))
    # reflet du verre
    path = skia.Path()
    path.addArc(skia.Rect.MakeLTRB(cx - r + 14, cy - r + 14, cx + r - 14, cy + r - 14), 200, 70)
    c.drawPath(path, P(alpha(WHITE, 0.5), 8))
    # givre sur le verre du thermomètre
    for i in range(18):
        rnd = random.Random(i)
        x, y = cx + rnd.uniform(-r, r) * 0.8, cy + rnd.uniform(-r, r) * 0.8
        if (x - cx) ** 2 + (y - cy) ** 2 < (r * 0.95) ** 2 and rnd.random() < 0.5:
            c.drawCircle(x, y, rnd.uniform(1, 2.5), P(alpha(WHITE, 0.6)))


# ===================================================================== BLOC A
def s01_thermo(c, t, d):
    k_focus = ease(prog(t, 0.6, 1.4))
    k_push = ease_in(prog(t, 1.35, d))
    with Save(c):
        zoom(c, 1 + 0.06 * t / d + 1.8 * k_push, W / 2, 470)
        with Blur(c, lerp(9, 0.5, k_focus)):
            street_bokeh(c, t)
        with Blur(c, lerp(0, 5, k_focus)):
            thermometer(c, -50, t)
        frost(c, ease_out(prog(t, 0.0, 1.9)), seed=1, a=0.85)
    white(c, ease_in(prog(t, 1.55, d)))


def city(c, t, cam_y=0.0, drift=0.0, a_fog=0.8):
    sky(c, 0xFF2B4466, 0xFF8BA3BC, 0, 600)
    glow(c, W * 0.75, 260, 300, 0xFFFFB37A, 0.18)
    rows = [(520, 0.45, 0xFF33496A, 3), (600, 0.65, 0xFF263955, 5), (700, 0.85, 0xFF1B2B44, 7), (830, 1.15, 0xFF142034, 9)]
    for i, (by, sc, col, seed) in enumerate(rows):
        par = 1 + i * 0.35
        oy = cam_y * par
        x = -60 + drift * par
        rnd = random.Random(seed)
        while x < W + 60:
            w, h = rnd.uniform(90, 170) * sc, rnd.uniform(120, 200) * sc
            building(c, x, by + oy, w, h, 9, seed=int(x) + seed, lit=0.3, col=col)
            if rnd.random() < 0.7:
                smoke_column(c, x + w * 0.5, by + oy - h, 160 * sc, t + i, 0.55, seed=int(x))
            x += w + rnd.uniform(10, 40) * sc
        fog(c, by + oy + 10, 90 * sc, a_fog * 0.55, t, seed=i)
        for lx in range(20, W, 120):
            glow(c, lx + (i * 37) % 60, by + oy + 6, 34 * sc, SODIUM, 0.5)


def s02_city(c, t, d):
    k = t / d
    with Save(c):
        zoom(c, 1.08 - 0.03 * k)
        city(c, t + 3, cam_y=-40 * k, drift=0)
    snow(c, t, 60, speed=30, size=1.3, a=0.6)
    white(c, 1 - ease_out(prog(t, 0, 0.7)))


def s03_clock(c, t, d):
    sky(c, 0xFF0A0E16, 0xFF141B26)
    # fenêtre noire
    c.drawRect(R(300, 120, 200, 300), P(0xFF020306))
    c.drawRect(R(300, 120, 200, 300), P(0xFF2A2420, 10))
    with Save(c, 300, 120):
        c.clipRect(R(0, 0, 200, 300))
        frost(c, 0.8, seed=4, a=0.35, width=200, height=300)
    cx, cy, r = 200, 520, 130
    c.drawCircle(cx, cy, r + 12, P(0xFF2E2620))
    c.drawCircle(cx, cy, r, P(0xFFB9B2A4))
    for i in range(60):
        a = math.radians(i * 6 - 90)
        r0 = r - (16 if i % 5 == 0 else 8)
        c.drawLine(cx + math.cos(a) * r0, cy + math.sin(a) * r0, cx + math.cos(a) * (r - 4), cy + math.sin(a) * (r - 4),
                   P(0xFF1B1A18, 3 if i % 5 == 0 else 1))
    font = skia.Font(SANS, 22)
    for hnum in range(1, 13):
        a = math.radians(hnum * 30 - 90)
        s = str(hnum)
        w = font.measureText(s)
        c.drawString(s, cx + math.cos(a) * (r - 34) - w / 2, cy + math.sin(a) * (r - 34) + 8, font, P(0xFF1B1A18))
    def hand(a_deg, L, w, col):
        a = math.radians(a_deg - 90)
        c.drawLine(cx, cy, cx + math.cos(a) * L, cy + math.sin(a) * L, P(col, w))
    hand((9 + 2 / 60) * 30, 60, 7, 0xFF111111)
    hand(2 * 6 + 0.1 * t, 95, 5, 0xFF111111)
    sec = 14 + math.floor(t) + ease_out(prog(t % 1, 0, 0.12))
    hand(sec * 6, 108, 1.8, 0xFFB3141C)
    c.drawCircle(cx, cy, 6, P(0xFF111111))
    glow(c, cx - 30, cy - 40, 160, 0xFF6F86A6, 0.08)


def room_bg(c, warm=0.0):
    sky(c, mixc(0xFF1A2232, 0xFF3A2414, warm), mixc(0xFF0D121C, 0xFF1C110A, warm))
    c.drawRect(R(360, 90, 160, 260), P(mixc(0xFF0A1220, 0xFF2A3E58, warm)))
    c.drawRect(R(360, 90, 160, 260), P(0xFF2A2018, 8))
    glow(c, 120, 200, 260, mixc(0xFF7F95B8, 0xFFFFB066, warm), 0.25 + 0.2 * warm)


def s04_dress(c, t, d):
    i = min(3, int(t / d * 4))
    tt = t - i * d / 4
    room_bg(c)
    with Save(c, W / 2 + [0, -14, 10, -6][i], 420 + 10 * math.sin(t * 3), [0, 1.5, -1, 0.5][i], 1.55 * (1.05 ** i)):
        if i != 2:  # (i == 2 : plan bas sur les bottes, dessiné plus bas)
            body(c, layers=[0, 1, 2, 4][i], look=(0.6, 0.6) if i < 3 else (0, 0), t=t)
    if i == 2:
        c.drawRect(R(0, 760, W, 200), P(0xFF2A2018))
        with Save(c, W / 2, 900, 0, 2.6):
            for sx in (-1, 1):
                c.drawRRect(rrect(sx * 60 - 30, -90, 60, 90, 14), P(0xFFB9A58C))
                for k in range(6):
                    c.drawLine(sx * 60 - 26, -80 + k * 13, sx * 60 + 26, -80 + k * 13, P(alpha(0xFF6D5A44, 0.6), 2))
    white(c, 0.25 * (1 - prog(tt, 0, 0.08)))
    # porte qui s'ouvre : vapeur
    k = prog(t, d - 0.6, d)
    if k > 0:
        puff(c, W / 2, H / 2, 200 + 300 * k, ease(k) * 1.4, seed=2, spread=2)
        white(c, ease_in(k) * 0.8)


# ===================================================================== BLOC B
def entrance(c, t):
    sky(c, 0xFF0A1220, 0xFF1A2638)
    building(c, -40, 760, 620, 760, 9, seed=8, lit=0.25, col=0xFF141E30)
    c.drawRect(R(190, 470, 160, 290), P(0xFF0B0F18))
    c.drawRect(R(205, 480, 130, 280), lin(0, 480, 0, 760, [0xFFFFD7A0, 0xFFE8A060]))
    glow(c, 270, 520, 220, 0xFFFFC27A, 0.5)
    c.drawRect(R(0, 760, W, 200), lin(0, 760, 0, 960, [0xFF5D7088, 0xFF2A3446]))
    lamp(c, 470, 780, 340, t)


def s05_door(c, t, d):
    entrance(c, t)
    k = t / d
    # nuage qui roule hors de la porte
    for j in range(5):
        kk = clamp(k * 1.3 - j * 0.12)
        puff(c, 270 + (j - 2) * 30 * kk, 640 - 80 * kk, 70 + 180 * kk, (1 - kk * 0.6) * 0.9, seed=j + 10, t=t)
    figure(c, 270, 760, lerp(1.0, 1.15, ease(k)), a=ease(prog(t, 0.6, 1.6)), silhouette=True)
    for j in range(2):
        puff(c, 270 + (j - 0.5) * 120, 700, 90, 0.35 * (1 - k), seed=j + 30, t=t)
    snow(c, t, 50, speed=20, size=1.2)
    white(c, 0.8 * (1 - ease_out(prog(t, 0, 0.6))))


def s06_eye(c, t, d):
    fk = ease_out(prog(t, 0.1, 2.2))
    bl = 0.0
    if 2.2 < t < 2.9:
        bl = math.sin((t - 2.2) / 0.7 * math.pi)
    sky(c, 0xFF1B2638, 0xFF0D1422)
    glow(c, 420, 150, 300, SODIUM, 0.15)
    with Save(c, W / 2 + 40, 470, -4, 6.4):
        head(c, look=(0, 0.3 + 0.5 * prog(t, 2.6, 3.0)), frost_k=fk, blink=bl)
    # cristaux macro sur les cils (premier plan)
    rnd = random.Random(2)
    for i in range(int(140 * fk)):
        x, y = rnd.uniform(80, 520), rnd.uniform(330, 470)
        L = rnd.uniform(3, 9)
        p = P(alpha(0xFFF4FBFF, 0.9), 1.4)
        c.drawLine(x - L, y, x + L, y, p)
        c.drawLine(x - L * 0.5, y - L * 0.86, x + L * 0.5, y + L * 0.86, p)
        c.drawLine(x - L * 0.5, y + L * 0.86, x + L * 0.5, y - L * 0.86, p)
    puff(c, 260, 860 - 40 * (t % 1.4), 160, 0.3 + 0.15 * math.sin(t * 2), seed=int(t / 1.4) + 40)
    sparkles(c, t, 40, (60, 300, 440, 260), seed=4, a=fk)


def s07_phone(c, t, d):
    with Blur(c, 6):
        street_bokeh(c, t)
    sh = 0
    with Save(c, W / 2, 520, -6):
        # gant fourré
        oval(c, 0, 150, 150, 120, P(0xFF5A4636))
        for i in range(40):
            a = i / 40 * 2 * math.pi
            c.drawLine(math.cos(a) * 140, 150 + math.sin(a) * 110, math.cos(a) * 158, 150 + math.sin(a) * 124,
                       P(0xFF8A7058, 4))
        c.drawRRect(rrect(-110, -230, 220, 440, 28), P(0xFF101114))
        on = t < 1.25 or (1.25 <= t < 1.45 and int(t * 30) % 2 == 0)
        if on:
            c.drawRRect(rrect(-100, -218, 200, 416, 20), lin(0, -218, 0, 198, [0xFF2B4C7E, 0xFF13223C]))
            pct = 41 if t < 0.6 else 12
            col = 0xFF59D17A if pct > 20 else 0xFFE74C3C
            c.drawRRect(rrect(-48, -40, 90, 44, 8), P(WHITE, 4))
            c.drawRect(R(42, -28, 8, 20), P(WHITE))
            c.drawRect(R(-42, -34, 78 * pct / 100, 32), P(col))
            outlined_text(c, f"{pct} %", 0, 60, 46, WHITE, ow=0, face=SANS)
            outlined_text(c, "09:14", 0, -140, 40, WHITE, ow=0, face=SANS)
            if t > 0.9:  # glitch
                rnd = random.Random(int(t * 30))
                for _ in range(6):
                    y = rnd.uniform(-210, 190)
                    c.drawRect(R(-100 + rnd.uniform(-20, 20), y, 200, rnd.uniform(3, 14)),
                               P(alpha(rnd.choice([0xFFFF2D55, 0xFF2DE1FF, WHITE]), 0.6)))
        # reflet du lampadaire qui glisse
        k = prog(t, 1.2, d)
        c.save()
        c.clipRRect(rrect(-100, -218, 200, 416, 20))
        c.drawRect(R(-200 + 300 * k, -260, 60, 520), P(alpha(0xFFFFC27A, 0.25 * (1 if not on else 0.3)), blur=12))
        c.restore()
    frost(c, 0.3, seed=7, a=0.25)


# ===================================================================== BLOC C
def lada(c, x, y, s=1.0, col=0xFF6E7F73, seed=0, t=0, running=True, blanket=False):
    with Save(c, x, y, 0, s):
        c.drawRRect(rrect(-150, -90, 300, 70, 14), P(col))
        c.drawPath(poly([(-100, -90), (-70, -150), (75, -150), (110, -90)]), P(col))
        c.drawPath(poly([(-88, -94), (-64, -142), (0, -142), (0, -94)]), P(0xFF9FB3C6))
        c.drawPath(poly([(8, -94), (8, -142), (70, -142), (96, -94)]), P(0xFF9FB3C6))
        c.drawRect(R(-150, -60, 300, 6), P(mixc(col, WHITE, 0.3)))
        if blanket:
            c.drawRRect(rrect(105, -88, 50, 60, 6), P(0xFF7A4B2E))
        glow(c, 145, -60, 28, 0xFFFFE6A0, 0.7)
        glow(c, -148, -60, 18, 0xFFFF3B30, 0.6)
        for wx in (-90, 90):
            c.drawCircle(wx, -20, 30, P(0xFF111214))
            c.drawCircle(wx, -20, 12, P(0xFF6A6E74))
        # neige sur le toit
        c.drawPath(poly([(-70, -150), (75, -150), (70, -160), (-64, -158)]), P(SNOW))
    if running:
        for j in range(4):
            k = ((t * 0.5 + j / 4 + seed * 0.13) % 1)
            puff(c, x - 160 * s - 70 * k * s, y - 30 * s, (30 + 60 * k) * s, 0.55 * (1 - k), seed=seed * 10 + j)


def s08_parking(c, t, d):
    sky(c, 0xFF101A2C, 0xFF2D3E56)
    building(c, -30, 600, 600, 420, 9, seed=21, lit=0.35, col=0xFF17233A)
    c.drawRect(R(0, 600, W, 360), lin(0, 600, 0, 960, [0xFF5F7088, 0xFF333E52]))
    lamp(c, 90, 640, 300, t)
    off = -30 * t  # travelling droite -> gauche (la scène défile vers la droite)
    for i in range(6):
        x = 60 + i * 190 + (off % 190) - 190 + 30 * t * 0
        x = (60 + i * 190 - off) % (6 * 190) - 150
        lada(c, x, 790, 0.95, col=[0xFF6E7F73, 0xFF7A3B34, 0xFF3E4C66, 0xFFB8B09A, 0xFF4A5A40, 0xFF8C8C90][i],
             seed=i, t=t, blanket=i % 2 == 0)
    fog(c, 820, 160, 0.55, t, color=0xFFDCE4EC, seed=8)
    snow(c, t, 50, speed=15, size=1.2)
    # whip pan final
    k = prog(t, d - 0.3, d)
    if k > 0:
        img = None
        for j in range(8):
            c.drawRect(R(-W + j * 140 * k * 4, 0, W * 1.5, H), P(alpha(0xFF6E7F93, 0.12 * k)))


def s09_scrape(c, t, d):
    k = t / d
    sky(c, 0xFF1A2536, 0xFF263448)
    # vitre givrée en très gros plan
    c.drawRect(R(30, 120, 480, 620), P(0xFF3A4C62))
    with Save(c):
        c.clipRect(R(30, 120, 480, 620))
        frost(c, 1.0, seed=12, a=0.95)
        c.drawRect(R(30, 120, 480, 620), P(alpha(0xFFE6F0F7, 0.55)))
        # zone dégagée par la carte
        clear_h = 60 + 260 * ease(k)
        c.drawRRect(rrect(150, 300, 240, clear_h, 30), P(0xFF22334A))
        building(c, 150, 300 + clear_h + 60, 240, 260, 9, seed=3, lit=0.4, col=0xFF1A2840)
    c.drawRect(R(30, 120, 480, 620), P(0xFF1E2A3A, 14))
    c.drawRect(R(44, 134, 452, 592), P(0xFF2C3A4E, 4))  # double vitrage
    # carte qui gratte
    cy = 300 + 260 * ease(k) + 50 + math.sin(t * 22) * 6
    with Save(c, 270 + math.sin(t * 22) * 40, cy, -12):
        c.drawRRect(rrect(-80, -10, 160, 100, 10), P(0xFF2E7DD1))
        c.drawRect(R(-80, 10, 160, 16), P(0xFF1B4C88))
        oval(c, 30, 140, 90, 70, P(0xFF5A4636))
    rnd = random.Random(int(t * 12))
    for i in range(18):
        x, y = 270 + rnd.uniform(-120, 120), cy - 10 + rnd.uniform(-20, 10)
        vy = rnd.uniform(20, 70)
        c.drawCircle(x + rnd.uniform(-30, 30), y + vy * ((t * 3) % 1), rnd.uniform(1.5, 3.5), P(alpha(WHITE, 0.9)))
    k_in = prog(t, 0, 0.25)
    if k_in < 1:
        c.drawRect(R(0, 0, W, H), P(alpha(0xFF6E7F93, 0.6 * (1 - k_in))))


def stilt_building(c, x, y, w, h, t, a=1.0, seed=31):
    pile_h = 70
    n = int(w / 34)
    for i in range(n + 1):
        px = x + i * w / n
        c.drawRect(R(px - 6, y - pile_h, 12, pile_h), P(alpha(0xFF8C939C, a)))
        c.drawRect(R(px - 6, y - pile_h, 4, pile_h), P(alpha(0xFFB8BEC6, a)))
    # tuyaux alu
    c.drawRRect(rrect(x - 40, y - 34, w + 80, 16, 8), P(alpha(0xFFC8CED6, a)))
    c.drawRRect(rrect(x - 40, y - 54, w + 80, 12, 6), P(alpha(0xFFAEB5BE, a)))
    building(c, x, y - pile_h, w, h, 9, seed=seed, lit=0.4, a=a)


def s10_tire(c, t, d):
    k = ease_in(prog(t, 0.8, d))
    sky(c, 0xFF15213A, 0xFF3A4C66)
    stilt_building(c, 60, 690, 420, 420, t, a=0.9)
    fog(c, 700, 120, 0.5, t, seed=3)
    c.drawRect(R(0, 690, W, 270), lin(0, 690, 0, 960, [0xFFB4C2D0, 0xFF7C8A9C]))
    for i in range(30):
        rnd = random.Random(i)
        c.drawCircle(rnd.uniform(0, W), rnd.uniform(700, 960), rnd.uniform(4, 12), P(alpha(WHITE, 0.25), blur=2))
    vib = (math.sin(t * 70) * 2.5) * prog(t, 0.4, 0.8) * (1 - k)
    with Save(c, -700 * k + vib, vib * 0.5):
        with Save(c, 430, 900, 0, 3.0):
            lada(c, 0, 0, 1.0, col=0xFF6E7F73, seed=5, t=t, running=t > 0.5)
    # neige soulevée
    if t > 0.5:
        rnd = random.Random(int(t * 15))
        for i in range(25):
            c.drawCircle(rnd.uniform(0, 400) - 700 * k + 200, 900 + rnd.uniform(-60, 40), rnd.uniform(2, 5),
                         P(alpha(SNOW, 0.7)))


# ===================================================================== BLOC D
def s11_stilts(c, t, d):
    k = ease(t / d)
    with Save(c, 0, lerp(-260, 1150, k)):
        sky(c, 0xFF1A2A44, 0xFF3D5270, -1400, 0)
        building(c, -20, 640, W + 40, 2000, 30, seed=41, lit=0.45, col=0xFF18243A)
        c.drawRect(R(-20, 600, W + 40, 50), P(0xFF101A2C))           # dalle
        # forêt de pieux sous l'immeuble (6 rangées en profondeur)
        for j in range(6):
            z = j / 5
            for i in range(9):
                x = -20 + i * 68 + (j % 2) * 34
                w = lerp(8, 22, z)
                top, bot = 650, lerp(740, 860, z)
                c.drawRect(R(x, top, w, bot - top), P(mixc(0xFF2A3346, 0xFF9AA2AC, z)))
                c.drawRect(R(x, top, w * 0.3, bot - top), P(alpha(WHITE, 0.15 * z)))
        c.drawRRect(rrect(-20, 760, W + 40, 22, 11), P(0xFFC8CED6))   # tuyaux alu
        c.drawRRect(rrect(-20, 792, W + 40, 16, 8), P(0xFFAEB5BE))
        c.drawRect(R(-20, 850, W + 40, 200), lin(0, 850, 0, 1050, [0xFFC6D2DE, 0xFF8D9AAA]))
        glow(c, W / 2, 800, 260, 0xFFFFC27A, 0.12)
        fog(c, 860, 100, 0.4, t, seed=5)
    snow(c, t, 60, speed=25)


def s12_section(c, t, d):
    k = ease(prog(t, 0, d - 0.3))
    with Save(c, 0, -620 * k):
        sky(c, 0xFF1A2A44, 0xFF3D5270, -400, 300)
        stilt_building(c, 100, 300, 340, 520, t, seed=51)
        # coupe du sol
        c.drawRect(R(-20, 300, W + 40, 50), P(0xFFE8EEF4))
        c.drawRect(R(-20, 350, W + 40, 160), lin(0, 350, 0, 510, [0xFF5A4636, 0xFF3A2C22]))
        c.drawRect(R(-20, 510, W + 40, 1200), lin(0, 510, 0, 1700, [0xFF6FA6C8, 0xFF1E4A70, 0xFF0B2038]))
        rnd = random.Random(7)
        for i in range(160):
            x, y = rnd.uniform(0, W), rnd.uniform(520, 1700)
            L = rnd.uniform(4, 14)
            c.drawLine(x, y, x + L, y + L * rnd.uniform(-0.6, 0.6), P(alpha(0xFFDDF3FF, rnd.uniform(0.2, 0.6)), 1.4))
        for i in range(5):
            px = 100 + i * 85
            c.drawRect(R(px - 7, 300, 14, 620), lin(px - 7, 0, px + 7, 0, [0xFFB8BEC6, 0xFF6C737C]))
        c.drawLine(-20, 350, W + 20, 350, P(alpha(WHITE, 0.6), 2))
        # étiquettes
        for y, s in [(330, "NEIGE"), (440, "TERRE GELÉE"), (700, "PERMAFROST")]:
            outlined_text(c, s, W / 2, y + 8, 26, WHITE, ow=5, face=SANS)
        outlined_text(c, "jusqu'à plusieurs centaines de mètres", W / 2, 1180, 20, 0xFFCDEBFF, ow=4, face=SANS)
        c.drawLine(W / 2, 1200, W / 2, 1600, P(alpha(WHITE, 0.4), 2))
    # coupe « au couteau »
    kc = prog(t, 0.4, 0.9)
    if 0 < kc < 1:
        c.drawLine(0, 300 - 620 * k, W * kc, 300 - 620 * k, P(alpha(WHITE, 0.9 * (1 - kc)), 3))
    black(c, prog(t, d - 0.14, d))


# ===================================================================== BLOC E
def fish(c, x, y, s, rot, col=0xFFB9C4CC, frostk=0.7):
    with Save(c, x, y, rot, s):
        path = skia.Path()
        path.moveTo(0, -80)
        path.quadTo(18, -40, 14, 30)
        path.lineTo(26, 70)
        path.lineTo(-26, 70)
        path.lineTo(-14, 30)
        path.quadTo(-18, -40, 0, -80)
        c.drawPath(path, lin(-18, 0, 18, 0, [mixc(col, BLACK, 0.3), col, mixc(col, WHITE, 0.4)]))
        c.drawCircle(-5, -60, 3, P(0xFF1A1E22))
        for i in range(6):
            c.drawLine(-12, -30 + i * 10, 12, -26 + i * 10, P(alpha(0xFF6C7A86, 0.4), 1))
        c.drawPath(path, P(alpha(WHITE, frostk * 0.35)))


def crate(c, x, y, w, h):
    c.drawRect(R(x, y, w, h), P(0xFF6B4A2E))
    for i in range(3):
        c.drawLine(x, y + h * (i + 0.5) / 3, x + w, y + h * (i + 0.5) / 3, P(0xFF4A321E, 3))
    c.drawRect(R(x, y - 4, w, 6), P(SNOW))


def s13_market(c, t, d):
    k = t / d
    sky(c, 0xFF22324A, 0xFF5B6E86)
    with Save(c):
        zoom(c, 1 + 0.12 * k, W / 2, 520)
        building(c, -20, 520, 580, 260, 6, seed=61, lit=0.2, col=0xFF2A3A54)
        c.drawRect(R(0, 520, W, 440), lin(0, 520, 0, 960, [0xFFB4C2D0, 0xFF8C9AAC]))
        # étals de gauche et de droite
        for side in (-1, 1):
            for row in range(3):
                sc = 1.0 - row * 0.25
                cx = W / 2 + side * (150 + row * -40)
                cy = 760 - row * 110
                crate(c, cx - 70 * sc, cy, 140 * sc, 70 * sc)
                for j in range(6):
                    fish(c, cx - 55 * sc + j * 22 * sc, cy - 10 * sc, 0.55 * sc, (j - 2.5) * 4,
                         col=[0xFFB9C4CC, 0xFFA8B4A0, 0xFFC4C0B8][j % 3])
        # viande en blocs + baies
        c.drawRect(R(20, 860, 120, 60), P(0xFF7A2E2A))
        c.drawRect(R(20, 860, 120, 60), P(alpha(WHITE, 0.25)))
        c.drawRRect(rrect(410, 860, 100, 60, 10), P(0xFF4A5560))
        rnd = random.Random(2)
        for i in range(40):
            c.drawCircle(420 + rnd.uniform(0, 80), 865 + rnd.uniform(0, 15), 4, P(0xFFB3203A))
        # vendeuse qui tape les poissons
        hit = abs(math.sin(t * 3.2))
        with Save(c, 120, 650, 0, 1.1):
            figure(c, 0, 0, 0.8)
            with Save(c, 40, -150, -40 + 40 * hit):
                fish(c, 0, -40, 0.5, 0)
    fog(c, 560, 140, 0.35, t, seed=9)
    puff(c, W / 2 + 80, 560, 50, 0.3, seed=int(t), t=t)
    snow(c, t, 70, speed=30)


def s14_stroganina(c, t, d):
    sky(c, 0xFF2A2C34, 0xFF15161C)
    c.drawRect(R(0, 520, W, 440), lin(0, 520, 0, 960, [0xFF6B4A2E, 0xFF3A2818]))
    oval(c, 300, 720, 190, 70, P(0xFFE8E4DC))
    oval(c, 300, 712, 160, 52, P(0xFFF4F1EA))
    # copeaux déjà tombés
    n = int(t * 3.2)
    rnd = random.Random(1)
    for i in range(n):
        x, y = 230 + rnd.uniform(0, 140), 690 + rnd.uniform(0, 35)
        oval(c, x, y, 22, 8, P(0xFFF0E2DA))
        c.drawCircle(x, y, 6, P(0xFFE2C8BE, 2))
    for i in range(60):
        c.drawCircle(220 + rnd.uniform(0, 160), 680 + rnd.uniform(0, 50), 1.2, P(0xFF222222 if i % 2 else WHITE))
    # poisson gelé
    with Save(c, 220, 470, -70, 1.9):
        fish(c, 0, 0, 1.0, 0, frostk=0.9)
    # couteau
    ph = (t * 1.6) % 1
    kx = 300 + 120 * math.sin(ph * math.pi)
    with Save(c, kx, 430 + 30 * ph, 20):
        c.drawRect(R(-10, -10, 160, 26), lin(0, -10, 0, 16, [0xFFE6EBF0, 0xFF8C949E]))
        c.drawRRect(rrect(150, -14, 110, 34, 10), P(0xFF3A2416))
    # copeau qui s'enroule et tombe
    yk = ease_in(ph)
    with Save(c, 300 + 40 * ph, 470 + 230 * yk, ph * 300):
        path = skia.Path()
        path.addArc(skia.Rect.MakeLTRB(-20, -10, 20, 10), 0, 300 * (0.4 + ph))
        c.drawPath(path, P(0xFFF2E6DE, 6))
    puff(c, 120, 300 + 20 * math.sin(t), 130, 0.18, seed=3)
    glow(c, 420, 160, 300, SODIUM, 0.15)


def wasteland(c, t, sun=1.0):
    sky(c, 0xFF2C4468, 0xFFF0A866, 0, 760)
    glow(c, 330, 700, 420, 0xFFFFB06A, 0.55 * sun)
    glow(c, 330, 700, 70, 0xFFFFF0D0, 0.95 * sun)
    for i, (x, h) in enumerate([(-20, 160), (110, 120), (360, 180), (470, 140)]):
        building(c, x, 720, 120, h, 6, seed=70 + i, lit=0.1, col=0xFF2A3246, a=0.8)
    c.drawRect(R(0, 720, W, 240), lin(0, 720, 0, 960, [0xFFE8C8B0, 0xFF8090A8]))
    fog(c, 720, 80, 0.4, t, color=0xFFF4D2B8, seed=11)


def s15_kettle(c, t, d):
    wasteland(c, t)
    k = ease(prog(t, 0.6, d))
    figure(c, 230, 900, 2.2, silhouette=True, kettle=1, throw=0.25 * k)
    puff(c, 300 + 70 * 0.25 * k * 2, 560 - 40 * k, 30, 0.6, seed=int(t * 4), t=t)


def s16_throw(c, t, d):
    wasteland(c, t, 1.0)
    T = t * 0.35  # super ralenti
    with Save(c, -30 + 10 * t, 0):
        figure(c, 150, 960, 2.0, silhouette=True, throw=min(1.0, 0.25 + T * 1.6))
        # arc d'eau qui explose en cristaux
        rnd = random.Random(5)
        ox, oy = 300, 560
        n = 260
        for i in range(n):
            u = rnd.random()
            ang = math.radians(-110 + u * 80 + rnd.uniform(-8, 8))
            v = rnd.uniform(160, 420)
            tt = max(0.0, T - u * 0.25)
            if tt <= 0:
                continue
            x = ox + math.cos(ang) * v * tt * 2.2 + rnd.uniform(-1, 1) * 40 * tt
            y = oy + math.sin(ang) * v * tt * 2.2 - 30 * tt + rnd.uniform(-1, 1) * 30 * tt
            r = 1.0 + rnd.uniform(0, 2.4) * (1 - min(1, tt))
            c.drawCircle(x, y, r, P(alpha(0xFFFFF4E0, 0.9)))
        # nuage de vapeur qui grandit et dérive
        for j in range(7):
            kk = clamp(T * 1.8 - j * 0.07)
            if kk > 0:
                cx = ox + (10 + j * 22) * kk + 8 * t
                cy = oy - (60 + j * 45) * kk
                puff(c, cx, cy, 40 + 95 * kk, 0.55 * (1 - 0.4 * kk), color=0xFFFFF2E4, seed=j * 3, t=t)
    glow(c, 330, 700, 260, 0xFFFFD49A, 0.35)
    sparkles(c, t, 120, (100, 150, 440, 500), seed=8, a=clamp(T * 3), color=0xFFFFF6D8)
    # flare horizontal
    c.drawRect(R(0, 696, W, 8), P(alpha(0xFFFFE2B0, 0.35), blur=6))
    white(c, ease_in(prog(t, d - 0.7, d)))


# ===================================================================== BLOC F
def s17_warm(c, t, d):
    w = ease(prog(t, 0.5, 1.5))
    room_bg(c, w)
    with Save(c, 360, 90):
        c.clipRect(R(0, 0, 160, 260))
        frost(c, 1.0, seed=17, a=0.5, width=160, height=260)
    hat_off = prog(t, 1.2, 2.4)
    with Save(c, 230, 420, 0, 1.55):
        body(c, layers=4, frost_k=0.6 * (1 - prog(t, 1.5, d)), hat=False, scarf_up=False, smile=0.2, look=(0.4, 0), t=t)
        with Save(c, 0 + 140 * ease(hat_off), -40 * ease(hat_off) + 140 * ease(hat_off) ** 2, 30 * hat_off):
            chapka(c, 1, 0.5 * (1 - hat_off))
    # gouttelettes de dégel
    rnd = random.Random(int(t * 4))
    for i in range(6):
        c.drawCircle(230 + rnd.uniform(-40, 40), 410 + rnd.uniform(0, 40) + (t * 40) % 30, 1.6, P(alpha(0xFFBFE6FF, 0.6 * w)))
    # thé
    c.drawRect(R(0, 760, W, 200), P(mixc(0xFF20202A, 0xFF4A2A16, w)))
    c.drawRRect(rrect(390, 690, 80, 80, 12), P(0xFFE9E2D4))
    oval(c, 430, 692, 40, 9, P(0xFF7A3A12))
    c.drawCircle(480, 725, 18, P(0xFFE9E2D4, 7))
    for j in range(3):
        k = ((t * 0.4 + j / 3) % 1)
        c.drawCircle(430 + math.sin(k * 6 + j) * 10, 670 - k * 160, 10 + 18 * k, P(alpha(WHITE, 0.35 * (1 - k)), blur=10))
    white(c, 1 - ease_out(prog(t, 0, 0.6)))


def s18_look(c, t, d):
    room_bg(c, 1.0)
    with Save(c, 360, 90):
        c.clipRect(R(0, 0, 160, 260))
        frost(c, 1.0, seed=17, a=0.5, width=160, height=260)
    with Save(c, W / 2, 470, 0, 2.1 + 0.25 * ease(t / d)):
        body(c, layers=4, hat=False, scarf_up=False, smile=ease(prog(t, 1.5, 3.0)), look=(0, 0),
             blink=1.0 if 0.8 < t < 0.92 else 0.0, t=t)
    glow(c, 120, 300, 300, 0xFFFFB066, 0.15)


def s19_loop(c, t, d):
    v = -50 - 2 * ease(prog(t, 0.2, 1.4))
    with Blur(c, 5):
        street_bokeh(c, t)
    thermometer(c, v, t)
    frost(c, 1.0, seed=1, a=0.85)
    wrap_text(c, "Et toi, tu tiendrais combien de temps ?", W / 2, 140, 44, WHITE, 470)


SHOTS = [
    (0.0, 2.0, s01_thermo, 0), (2.0, 5.0, s02_city, 0), (5.0, 7.0, s03_clock, 0), (7.0, 10.0, s04_dress, 0),
    (10.0, 13.0, s05_door, 0), (13.0, 16.0, s06_eye, 0), (16.0, 18.0, s07_phone, 0),
    (18.0, 21.0, s08_parking, 0), (21.0, 23.0, s09_scrape, 0), (23.0, 26.0, s10_tire, 0),
    (26.0, 30.0, s11_stilts, 0), (30.0, 34.0, s12_section, 0),
    (34.0, 38.0, s13_market, 0), (38.0, 42.0, s14_stroganina, 0), (42.0, 44.0, s15_kettle, 0.15),
    (44.0, 50.0, s16_throw, 0.25),
    (50.0, 54.0, s17_warm, None), (54.0, 58.0, s18_look, 1), (58.0, 60.0, s19_loop, 0),
]

# bruitages : (temps absolu, nom, gain)
SFX = [
    (0.0, "frost", 0.5), (1.6, "whoosh", 0.5), (5.0, "tick", 0.5), (6.0, "tick", 0.5),
    (7.0, "cloth", 0.5), (7.75, "cloth", 0.5), (8.5, "cloth", 0.5), (9.25, "cloth", 0.5),
    (9.5, "steam", 0.6), (13.0, "frost", 0.6), (17.0, "glitch", 0.5), (18.0, "engine", 0.6),
    (20.7, "whoosh", 0.6), (21.0, "scrape", 0.5), (23.4, "engine", 0.8), (23.6, "crunch", 0.7),
    (26.0, "crunch", 0.4), (30.4, "whoosh", 0.4), (34.3, "knock", 0.6), (35.3, "knock", 0.6),
    (36.3, "knock", 0.6), (38.2, "knife", 0.5), (38.8, "knife", 0.5), (39.5, "knife", 0.5),
    (40.1, "knife", 0.5), (44.3, "hiss", 0.9), (49.3, "whoosh", 0.4), (58.0, "frost", 0.5),
]
