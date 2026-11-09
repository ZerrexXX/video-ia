# « Ça fait quoi de vivre dans une ville à -50°C ? » — Yakoutsk

Vidéo verticale TikTok (1080x1920, 60 s, 30 i/s) réalisée d'après
`prompts/vivre-a-moins-50.md` : les 19 plans du découpage, la voix off à la première
personne (Aïsen), les sous-titres en gros avec les mots-clés en cyan glacé
(**-50, nuit, gèlent, jamais, pilotis, debout, bouillante**) et la boucle finale sur le thermomètre.

Rendu 100 % local et procédural (pas de générateur vidéo IA) : illustration animée
dans un style cinéma (bleus froids désaturés, halos de lampadaires au sodium,
brouillard, grain argentique, vignettage, bascule chaude de l'étalonnage à la fin).

- `vivre_a_moins_50.mp4` : la vidéo finale
- `script_fr.py` : le texte de la voix off et ses créneaux (modifiable)
- `scenes.py` : les 19 plans et les bruitages ; `draw.py` : décors, givre, personnage, étalonnage
- `sfx.py` : musique (nappe froide, percussions, silence au lancer, piano final) et bruitages synthétisés
- `tts.py` : voix off (Piper, voix « Tom »)

## Regénérer

```bash
pip install "piper-tts[alignment]" skia-python numpy   # + apt install libegl1 si besoin
# voix française Piper « Tom » dans moins50/voice/
curl -L https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-fr_FR-tom-medium.tar.bz2 | tar xj
cp vits-piper-fr_FR-tom-medium/fr_FR-tom-medium.onnx* voice/
python3 tts.py       # -> build/narration.wav + build/timeline.json
python3 render.py    # -> build/vivre_a_moins_50.mp4  (--preview 1.0,44.5 pour des PNG)
```

Écarts par rapport au prompt : la première réplique dure ~4 s (au lieu de 3 s) pour
garder un débit naturel, les répliques suivantes sont décalées d'autant à l'intérieur
de leur bloc ; la montée de percussions est placée sur 38-44 s pour laisser le silence
total au moment du lancer (44-46,5 s).
