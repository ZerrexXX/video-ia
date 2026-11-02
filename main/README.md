# « Pourquoi c'est l'enfer d'être la main »

Vidéo verticale (1080x1920, ~1 min 51) dans le format « la vie d'une partie du corps » :
de la naissance au paradis, racontée du point de vue de la main.

- `la_main.mp4` : la vidéo finale
- `script_fr.py` : le texte de la voix off (modifiable)
- `scenes.py` : les 18 scènes animées ; `draw.py` : personnages, main, décors
- `sfx.py` : bruitages et musique synthétisés ; `tts.py` : voix off (Piper)

## Regénérer

```bash
pip install piper-tts onnx skia-python numpy
# voix française Piper « Tom » (fr_FR-tom-medium) dans main/voice/
curl -L https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-fr_FR-tom-medium.tar.bz2 | tar xj
cp vits-piper-fr_FR-tom-medium/fr_FR-tom-medium.onnx* voice/
python3 tts.py       # -> build/narration.wav + build/timeline.json
python3 render.py    # -> build/la_main.mp4  (--preview 3.0,10.5 pour des PNG)
```

La voix lit chaque scène d'une traite (prosodie continue) ; les sous-titres sont
calés sur l'alignement des phonèmes renvoyé par Piper. Débit : `length_scale`
dans `tts.py` (plus petit = plus rapide).
