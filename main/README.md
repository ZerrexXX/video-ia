# « Pourquoi c'est l'enfer d'être la main »

Vidéo verticale (1080x1920, ~1 min 44) dans le format « la vie d'une partie du corps » :
de la naissance au paradis, racontée du point de vue de la main.

- `la_main.mp4` : la vidéo finale
- `script_fr.py` : le texte de la voix off (modifiable)
- `scenes.py` : les 18 scènes animées ; `draw.py` : personnages, main, décors
- `sfx.py` : bruitages et musique synthétisés ; `tts.py` : voix off (Piper)

## Regénérer

```bash
pip install piper-tts skia-python numpy
# voix française Piper (fr-siwis-medium) dans main/voice/
curl -L https://github.com/rhasspy/piper/releases/download/v0.0.2/voice-fr-siwis-medium.tar.gz | tar xz -C voice
python3 tts.py       # -> build/narration.wav + build/timeline.json
python3 render.py    # -> build/la_main.mp4  (--preview 3.0,10.5 pour des PNG)
```
