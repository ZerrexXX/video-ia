"""Rendu : python3 render.py [--preview t1,t2,...] [--out fichier.mp4]"""
import argparse
import json
import os
import subprocess
import wave

import numpy as np
import skia

import draw as D
import sfx as A
from scenes import SFX, SHOTS

HERE = os.path.dirname(os.path.abspath(__file__))
BUILD = os.path.join(HERE, "build")
FPS = 30
SCALE = 2
CAP_Y = 735


def build_chunks(lines):
    chunks = []
    for ln in lines:
        cur = []
        for w in ln["words"]:
            cur.append(w)
            txt = " ".join(x["w"] for x in cur)
            if len(cur) >= 3 or len(txt) >= 14 or w["w"][-1] in ".,?!:…":
                chunks.append(cur)
                cur = []
        if cur:
            chunks.append(cur)
    out = []
    for i, ch in enumerate(chunks):
        end = ch[-1]["end"] + 0.3
        if i + 1 < len(chunks):
            end = min(end, chunks[i + 1][0]["start"])
        out.append(dict(words=ch, start=ch[0]["start"], end=end))
    return out


def clean(w):
    w = w.strip()
    return "" if w in ("...", ":", "?", "!") else w.upper().rstrip(",:").replace("...", "…")


def draw_caption(c, ch, T):
    words = [(clean(w["w"]), w["hl"], w["start"]) for w in ch["words"]]
    words = [x for x in words if x[0]]
    if not words:
        return
    size = 50
    font = skia.Font(D.FONT, size)
    sp = size * 0.28
    total = sum(font.measureText(w) for w, _, _ in words) + sp * (len(words) - 1)
    if total > 480:
        size *= 480 / total
        font = skia.Font(D.FONT, size)
        sp = size * 0.28
        total = 480
    k = D.ease_out(D.prog(T, ch["start"], ch["start"] + 0.12))
    with D.Save(c, D.W / 2, CAP_Y, 0, 0.85 + 0.15 * k):
        x = -total / 2
        for w, hl, ws in words:
            ww = font.measureText(w)
            s = 1.0
            if hl:
                s = 1 + 0.18 * (1 - D.ease_out(D.prog(T, ws, ws + 0.25)))
            with D.Save(c, x + ww / 2, 0, 0, s):
                if hl:
                    c.drawString(w, -ww / 2, 0, font, D.P(D.alpha(D.ICE, 0.6), size * 0.2, blur=8))
                D.outlined_text(c, w, -ww / 2, 0, size, D.ICE if hl else D.WHITE, D.BLACK, size * 0.22, align="left")
            x += ww + sp


def render_frame(c, T, chunks, frame):
    i = next((k for k, s in enumerate(SHOTS) if s[0] <= T < s[1]), len(SHOTS) - 1)
    t0, t1, fn, warm = SHOTS[i]
    t = T - t0
    if warm is None:
        warm = D.ease(D.prog(t, 0.5, 1.5))
    c.clear(D.BLACK)
    c.save()
    c.scale(SCALE, SCALE)
    gp = skia.Paint()
    gp.setColorFilter(D.grade_filter(warm))
    c.saveLayer(None, gp)
    c.save()
    fn(c, t, t1 - t0)
    c.restore()
    D.vignette(c, 0.6 - 0.2 * warm)
    D.grain(c, frame, 0.12)
    c.restore()
    for ch in chunks:
        if ch["start"] <= T < ch["end"]:
            draw_caption(c, ch, T)
    c.restore()


def make_audio(duration, lines):
    with wave.open(os.path.join(BUILD, "narration.wav")) as w:
        sr = w.getframerate()
        narr = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32767
    out = A.mix(duration, SFX, narr, sr, [(l["start"], l["end"]) for l in lines])
    path = os.path.join(BUILD, "mix.wav")
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(A.SR)
        w.writeframes((np.clip(out, -1, 1) * 32767).astype(np.int16).tobytes())
    return path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--preview")
    ap.add_argument("--out", default=os.path.join(BUILD, "vivre_a_moins_50.mp4"))
    args = ap.parse_args()
    with open(os.path.join(BUILD, "timeline.json")) as f:
        tl = json.load(f)
    duration, chunks = tl["duration"], build_chunks(tl["lines"])
    surf = skia.Surface(D.W * SCALE, D.H * SCALE)
    c = surf.getCanvas()
    if args.preview:
        for T in [float(x) for x in args.preview.split(",")]:
            render_frame(c, T, chunks, int(T * FPS))
            surf.makeImageSnapshot().save(os.path.join(BUILD, f"preview_{T:05.2f}.png"), skia.kPNG)
        return
    audio = make_audio(duration, tl["lines"])
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
        render_frame(c, i / FPS, chunks, i)
        surf.readPixels(info, buf)
        proc.stdin.write(buf.tobytes())
        if i % 300 == 0:
            print(f"frame {i}/{n}", flush=True)
    proc.stdin.close()
    proc.wait()
    print("ok ->", args.out)


if __name__ == "__main__":
    main()
