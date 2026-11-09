"""Voix off (Piper, voix « Tom ») calée sur les créneaux du script.

Sortie : build/narration.wav et build/timeline.json (mots horodatés).
"""
import json
import os
import re
import sys
import wave

import numpy as np
from piper import PiperVoice, SynthesisConfig

from script_fr import DURATION, LINES

HERE = os.path.dirname(os.path.abspath(__file__))
BUILD = os.path.join(HERE, "build")
VOICE = os.environ.get("PIPER_VOICE", os.path.join(HERE, "voice", "fr_FR-tom-medium.onnx"))
GAP_SENT = 0.18
BASE_SCALE = 1.0      # débit calme ; accéléré seulement si la réplique déborde du créneau


def parse(line):
    words, spoken = [], []
    for tok in re.findall(r"\{[^}]*\}|\S+", line):
        disp, said = tok[1:-1].split("|") if tok.startswith("{") else (tok, tok)
        hl = "*" in disp
        disp, said = disp.replace("*", ""), said.replace("*", "")
        spoken.append(said)
        words.append((disp, hl, said))
    return " ".join(spoken), words


def weight(voice, word):
    clean = re.sub(r"[^\wÀ-ÿ'-]", "", word)
    if not clean:
        return 0.0
    try:
        n = sum(len([p for p in s if p not in "ˈˌ "]) for s in voice.phonemize(clean))
    except Exception:
        n = len(clean)
    return max(1.0, n)


def synth(voice, cfg, line):
    text, words = parse(line)
    audio, times, t, sr = [], [], 0.0, voice.config.sample_rate
    for i, ch in enumerate(voice.synthesize(text, syn_config=cfg, include_alignments=True)):
        a = ch.audio_float_array.astype(np.float32)
        if i:
            audio.append(np.zeros(int(GAP_SENT * sr), np.float32))
            t += GAP_SENT
        al = ch.phoneme_alignments or []
        tot = sum(int(x.num_samples) for x in al) or len(a)
        k = len(a) / tot
        head = int(al[0].num_samples * k) if al and al[0].phoneme == "^" else 0
        tail = int(al[-1].num_samples * k) if al and al[-1].phoneme == "$" else 0
        ch_h, ch_t = max(0, head - int(0.03 * sr)), max(0, tail - int(0.08 * sr))
        a = a[ch_h:len(a) - ch_t] if ch_t else a[ch_h:]
        acc = -ch_h
        for x in al:
            d = int(x.num_samples) * k
            if x.phoneme not in "^$ -,.:;!?ˈˌ":
                times.append((t + acc / sr, t + (acc + d) / sr))
            acc += d
        audio.append(a)
        t += len(a) / sr
    audio = np.concatenate(audio)
    exp = [weight(voice, w[2]) for w in words]
    tot, N, acc, out = sum(exp), len(times), 0.0, []
    for (disp, hl, _), e in zip(words, exp):
        a = min(N - 1, int(round(acc / tot * N)))
        b = min(N - 1, max(a, int(round((acc + e) / tot * N)) - 1))
        out.append((disp, hl, times[a][0], times[b][1] if e else times[a][0]))
        acc += e
    return audio, out


def main():
    os.makedirs(BUILD, exist_ok=True)
    voice = PiperVoice.load(VOICE, include_alignments=True)
    sr = voice.config.sample_rate
    track = np.zeros(int((DURATION + 1) * sr), np.float32)
    lines = []
    for t0, t1, txt in LINES:
        room = t1 - t0 - 0.25
        scale = BASE_SCALE
        for _ in range(6):
            cfg = SynthesisConfig(length_scale=scale, noise_scale=0.6, noise_w_scale=0.75)
            audio, words = synth(voice, cfg, txt)
            d = len(audio) / sr
            if d <= room:
                break
            scale = max(0.85, scale * room / d * 0.99)
        i = int(t0 * sr)
        track[i:i + len(audio)] += audio[:len(track) - i]
        lines.append(dict(start=t0, end=t0 + d, words=[
            dict(w=w, hl=h, start=round(t0 + a, 3), end=round(t0 + b, 3)) for w, h, a, b in words]))
        print(f"{t0:5.1f}-{t1:5.1f}  voix {d:4.1f}s  (échelle {scale:.2f})", file=sys.stderr)
    track = track[:int(DURATION * sr)]
    pcm = (np.clip(track, -1, 1) * 32767).astype(np.int16)
    with wave.open(os.path.join(BUILD, "narration.wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(pcm.tobytes())
    with open(os.path.join(BUILD, "timeline.json"), "w") as f:
        json.dump(dict(duration=DURATION, lines=lines), f, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
