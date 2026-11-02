"""Rendu de la vidéo : python3 render.py [--preview t1,t2,...] [--out fichier.mp4]"""
import argparse
import json
import os
import subprocess
import wave

import numpy as np
import skia

import draw as D
import sfx as A
from scenes import SCENES, SFX

HERE = os.path.dirname(os.path.abspath(__file__))
BUILD = os.path.join(HERE, "build")
FPS = 30
SCALE = 2  # 540x960 -> 1080x1920


class SceneInfo:
    def __init__(self, sc):
        self.id = sc["id"]
        self.label = sc["label"]
        self.start = sc["start"]
        self.end = sc["end"]
        self.d = self.end - self.start
        self.L = [ln["start"] - self.start for ln in sc["lines"]]
        self.lines = sc["lines"]


def build_chunks(scenes):
    chunks = []
    for S in scenes:
        for ln in S.lines:
            cur = []
            for w in ln["words"]:
                cur.append(w)
                txt = " ".join(x["w"] for x in cur)
                if len(cur) >= 3 or len(txt) >= 13 or w["w"][-1] in ".,?!:…" or w["w"] in ("...",):
                    chunks.append(cur)
                    cur = []
            if cur:
                chunks.append(cur)
    out = []
    for i, ch in enumerate(chunks):
        start = ch[0]["start"]
        end = ch[-1]["end"] + 0.25
        if i + 1 < len(chunks):
            end = min(end, chunks[i + 1][0]["start"])
        out.append(dict(words=ch, start=start, end=end))
    return out


def clean_word(w):
    w = w.replace("«", "").replace("»", "").strip()
    if w in ("...", ":", "?", "!"):
        return ""
    return w.upper().rstrip(".,:").replace("...", "")


def draw_caption(c, ch, t):
    words = [(clean_word(w["w"]), w["hl"]) for w in ch["words"]]
    words = [(w, h) for w, h in words if w]
    if not words:
        return
    size = 52
    font = skia.Font(D.FONT, size)
    space = size * 0.28
    total = sum(font.measureText(w) for w, _ in words) + space * (len(words) - 1)
    if total > 480:
        size = size * 480 / total
        font = skia.Font(D.FONT, size)
        space = size * 0.28
        total = 480
    k = D.back_out(D.prog(t, ch["start"], ch["start"] + 0.14), 2.5)
    with D.Save(c, D.W / 2, 770, 0, 0.6 + 0.4 * k):
        x = -total / 2
        for w, hl in words:
            ww = font.measureText(w)
            D.outlined_text(c, w, x, 0, size, D.YELLOW if hl else D.WHITE, D.BLACK, size * 0.24, align="left")
            x += ww + space


def draw_label(c, S, t):
    if not S.label:
        return
    k = D.back_out(D.prog(t, 0.05, 0.35))
    with D.Save(c, D.W / 2, 112, -3, k):
        D.outlined_text(c, S.label, 0, 0, 70, D.YELLOW)


def render_frame(c, T, scenes, chunks):
    S = next((s for s in scenes if s.start <= T < s.end), scenes[-1])
    t = T - S.start
    c.clear(D.WHITE)
    c.save()
    c.scale(SCALE, SCALE)
    c.save()
    z = 1 + 0.07 * (1 - D.ease_out(D.prog(t, 0, 0.3)))
    c.translate(D.W / 2, D.H / 2)
    c.scale(z, z)
    c.translate(-D.W / 2, -D.H / 2)
    SCENES[S.id](c, t, S)
    c.restore()
    draw_label(c, S, t)
    for ch in chunks:
        if ch["start"] <= T < ch["end"]:
            draw_caption(c, ch, T)
    c.restore()


def load():
    with open(os.path.join(BUILD, "timeline.json")) as f:
        tl = json.load(f)
    scenes = [SceneInfo(s) for s in tl["scenes"]]
    return tl["duration"], scenes, build_chunks(scenes)


def make_audio(duration, scenes):
    with wave.open(os.path.join(BUILD, "narration.wav")) as w:
        sr = w.getframerate()
        narr = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32767
    events = []
    for S in scenes:
        events.append((S.start, "whoosh", 0.25))
        if S.id in SFX:
            for (tt, name, g) in SFX[S.id](S):
                events.append((S.start + tt, name, g))
    duck = []
    for S in scenes:
        for ln in S.lines:
            duck.append((ln["start"], ln["end"], 0.55))
    out = A.mix(duration, events, narr, sr, music_gain=0.10, duck=duck)
    pcm = (np.clip(out, -1, 1) * 32767).astype(np.int16)
    path = os.path.join(BUILD, "mix.wav")
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(A.SR)
        w.writeframes(pcm.tobytes())
    return path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--preview", help="temps séparés par des virgules -> PNG")
    ap.add_argument("--out", default=os.path.join(BUILD, "la_main.mp4"))
    args = ap.parse_args()
    duration, scenes, chunks = load()
    surf = skia.Surface(D.W * SCALE, D.H * SCALE)
    c = surf.getCanvas()
    if args.preview:
        for T in [float(x) for x in args.preview.split(",")]:
            render_frame(c, T, scenes, chunks)
            surf.makeImageSnapshot().save(os.path.join(BUILD, f"preview_{T:06.2f}.png"), skia.kPNG)
        return
    audio = make_audio(duration, scenes)
    n = int(duration * FPS)
    cmd = ["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgba",
           "-s", f"{D.W * SCALE}x{D.H * SCALE}", "-r", str(FPS), "-i", "-",
           "-i", audio, "-c:v", "libx264", "-preset", "medium", "-crf", "20",
           "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-shortest",
           "-movflags", "+faststart", args.out]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    info = skia.ImageInfo.Make(D.W * SCALE, D.H * SCALE, skia.kRGBA_8888_ColorType, skia.kPremul_AlphaType)
    buf = np.empty((D.H * SCALE, D.W * SCALE, 4), dtype=np.uint8)
    for i in range(n):
        render_frame(c, i / FPS, scenes, chunks)
        surf.readPixels(info, buf)
        proc.stdin.write(buf.tobytes())
        if i % 300 == 0:
            print(f"frame {i}/{n}", flush=True)
    proc.stdin.close()
    proc.wait()
    print("ok ->", args.out)


if __name__ == "__main__":
    main()
