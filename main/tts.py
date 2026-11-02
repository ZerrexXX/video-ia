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
VOICE = os.environ.get("PIPER_VOICE", os.path.join(HERE, "voice", "fr-siwis-medium.onnx"))

SR = 22050
LEAD_IN = 0.25        # silence au début de la vidéo
GAP_LINE = 0.16       # pause entre deux phrases
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


def trim(audio, thr=0.02):
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


def main():
    os.makedirs(BUILD, exist_ok=True)
    voice = PiperVoice.load(VOICE)
    cfg = SynthesisConfig(length_scale=0.86, noise_scale=0.6, noise_w_scale=0.7)

    chunks = [np.zeros(int(LEAD_IN * SR), dtype=np.float32)]
    t = LEAD_IN
    timeline = []
    for sc in SCENES:
        scene = dict(id=sc["id"], label=sc["label"], start=t, lines=[])
        for i, line in enumerate(sc["lines"]):
            spoken, words = parse(line)
            audio = np.concatenate([c.audio_float_array for c in voice.synthesize(spoken, syn_config=cfg)])
            audio = trim(audio.astype(np.float32))
            dur = len(audio) / SR
            ws = [weight(voice, w[2]) for w in words]
            tot = sum(ws)
            wt = []
            acc = t
            for (disp, hl, _), w in zip(words, ws):
                d = dur * w / tot
                wt.append(dict(w=disp, hl=hl, start=round(acc, 3), end=round(acc + d, 3)))
                acc += d
            scene["lines"].append(dict(start=t, end=t + dur, words=wt))
            chunks.append(audio)
            t += dur
            gap = GAP_LINE if i < len(sc["lines"]) - 1 else GAP_SCENE
            chunks.append(np.zeros(int(gap * SR), dtype=np.float32))
            t += gap
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
