"""Génère la voix off (Piper, voix fr-siwis) + la timeline des mots.

Sortie : build/narration.wav et build/timeline.json
"""
import json
import os
import re
import sys
import wave

import numpy as np
from piper import PiperVoice, SynthesisConfig

from script_fr import SCENES

HERE = os.path.dirname(os.path.abspath(__file__))
BUILD = os.path.join(HERE, "build")
VOICE = os.environ.get("PIPER_VOICE", os.path.join(HERE, "voice", "fr_FR-tom-medium.onnx"))

SR = 22050
LEAD_IN = 0.25        # silence au début de la vidéo
GAP_SENT = 0.10       # pause entre deux phrases d'une même scène
GAP_SCENE = 0.30      # pause en fin de scène
TAIL = 1.6            # fin de vidéo


def parse(line):
    """Retourne (texte_dit, [(mot_affiché, surligné, mot_dit), ...])."""
    words = []
    spoken_parts = []
    # remplace {a|b} par un token unique
    tokens = re.findall(r"\{[^}]*\}|\S+", line)
    for tok in tokens:
        if tok.startswith("{"):
            disp, said = tok[1:-1].split("|")
        else:
            disp, said = tok, tok
        hl = "*" in disp
        disp = disp.replace("*", "")
        said = said.replace("*", "")
        spoken_parts.append(said)
        words.append((disp, hl, said))
    return " ".join(spoken_parts), words


def trim(audio, thr=0.02):  # (non utilisé en lecture continue)
    idx = np.where(np.abs(audio) > thr)[0]
    if len(idx) == 0:
        return audio
    a = max(0, idx[0] - int(0.02 * SR))
    b = min(len(audio), idx[-1] + int(0.06 * SR))
    return audio[a:b]


def weight(voice, word):
    clean = re.sub(r"[^\wÀ-ÿ'-]", "", word)
    if not clean:
        return 0.15
    try:
        ph = voice.phonemize(clean)
        n = sum(len([p for p in s if p not in "ˈˌ "]) for s in ph)
    except Exception:
        n = len(clean)
    return max(1.0, n)


def synth_scene(voice, cfg, lines):
    """Lit toute la scène d'une traite (prosodie continue) et renvoie
    (audio, [(mot_affiché, surligné, début, fin), ...] par ligne)."""
    parsed = [parse(l) for l in lines]
    text = " ".join(sp for sp, _ in parsed)
    words = [w for _, ws in parsed for w in ws]
    audio, times = [], []          # times : (temps, index de phonème cumulé)
    n_ph = 0
    t = 0.0
    for i, ch in enumerate(voice.synthesize(text, syn_config=cfg, include_alignments=True)):
        a = ch.audio_float_array.astype(np.float32)
        if i:
            gap = np.zeros(int(GAP_SENT * SR), dtype=np.float32)
            audio.append(gap)
            t += len(gap) / SR
        al = ch.phoneme_alignments or []
        tot = sum(int(x.num_samples) for x in al) or len(a)
        k = len(a) / tot
        # raccourcit les silences de début (^) et de fin ($) de phrase
        head = int(al[0].num_samples * k) if al and al[0].phoneme == "^" else 0
        tail = int(al[-1].num_samples * k) if al and al[-1].phoneme == "$" else 0
        cut_h = max(0, head - int(0.03 * SR))
        cut_t = max(0, tail - int(0.06 * SR))
        a = a[cut_h:len(a) - cut_t] if cut_t else a[cut_h:]
        acc = -cut_h
        for x in al:
            dur = int(x.num_samples) * k
            if x.phoneme not in "^$ -,.:;!?" and x.phoneme not in "ˈˌ":
                times.append((t + acc / SR, t + (acc + dur) / SR))
            acc += dur
        audio.append(a)
        t += len(a) / SR
    audio = np.concatenate(audio)
    # répartit les mots sur les phonèmes réels au prorata de leur longueur attendue
    exp = [weight(voice, w[2]) for w in words]
    for j, w in enumerate(words):
        if not any(ch.isalnum() for ch in w[2]):
            exp[j] = 0.0
    tot = sum(exp)
    N = len(times)
    out, acc = [], 0.0
    for (disp, hl, _), e in zip(words, exp):
        a = min(N - 1, int(round(acc / tot * N)))
        b = min(N - 1, max(a, int(round((acc + e) / tot * N)) - 1))
        out.append((disp, hl, times[a][0], times[b][1] if e else times[a][0]))
        acc += e
    per_line, k = [], 0
    for _, ws in parsed:
        per_line.append(out[k:k + len(ws)])
        k += len(ws)
    return audio, per_line


def main():
    global SR
    os.makedirs(BUILD, exist_ok=True)
    voice = PiperVoice.load(VOICE, include_alignments=True)
    SR = voice.config.sample_rate
    cfg = SynthesisConfig(length_scale=0.86, noise_scale=0.667, noise_w_scale=0.8)

    chunks = [np.zeros(int(LEAD_IN * SR), dtype=np.float32)]
    t = LEAD_IN
    timeline = []
    for sc in SCENES:
        audio, lines = synth_scene(voice, cfg, sc["lines"])
        scene = dict(id=sc["id"], label=sc["label"], start=t, lines=[])
        for ws in lines:
            wt = [dict(w=d, hl=h, start=round(t + a, 3), end=round(t + b, 3)) for d, h, a, b in ws]
            scene["lines"].append(dict(start=wt[0]["start"], end=wt[-1]["end"], words=wt))
        scene["lines"][0]["start"] = t
        chunks.append(audio)
        t += len(audio) / SR
        chunks.append(np.zeros(int(GAP_SCENE * SR), dtype=np.float32))
        t += GAP_SCENE
        scene["end"] = t
        timeline.append(scene)
        print(f"{sc['id']:10s} {scene['start']:6.2f} -> {t:6.2f}", file=sys.stderr)

    chunks.append(np.zeros(int(TAIL * SR), dtype=np.float32))
    timeline[-1]["end"] = t + TAIL
    audio = np.concatenate(chunks)
    pcm = (np.clip(audio, -1, 1) * 32767).astype(np.int16)
    with wave.open(os.path.join(BUILD, "narration.wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    with open(os.path.join(BUILD, "timeline.json"), "w") as f:
        json.dump(dict(duration=len(audio) / SR, scenes=timeline), f, ensure_ascii=False, indent=1)
    print(f"total {len(audio)/SR:.1f}s", file=sys.stderr)


if __name__ == "__main__":
    main()
