# « Vivre à -50°C » — version 3D (three.js)

Même vidéo que `../moins50/` (60 s, 1080x1920, 30 i/s, 19 plans de
`../prompts/vivre-a-moins-50.md`), mais en **vraie 3D temps réel** : scènes
three.js modélisées procéduralement (aucun asset externe), rendues image par
image dans Chromium headless (WebGL logiciel SwiftShader), puis encodées par ffmpeg.

- `vivre_a_moins_50_3d.mp4` : la vidéo finale (H.264 + AAC, faststart)
- `render.js` : serveur local + Playwright + ffmpeg (rendu déterministe, T = image / 30)
- `web/main.js` : post-traitement (bloom, ACES, étalonnage froid/chaud, vignette, grain,
  fondus blanc/noir, glitch, flou de filé) et sous-titres 2D (Lilita One, mots-clés cyan)
- `web/lib.js` : briques procédurales (immeubles sur pilotis, lampadaires au sodium,
  vapeur, neige, givre, Aïsen, Lada, thermomètre, poissons gelés)
- `web/shots_a.js`, `web/shots_b.js` : les 19 plans ; `web/shots.js` : bornes des plans

La bande son (`../moins50/build/mix.wav`) et les mots horodatés des sous-titres
(`../moins50/build/timeline.json`) viennent de la version 2D : les bornes des plans
sont identiques à `SHOTS` dans `../moins50/scenes.py`.

## Regénérer

```bash
npm install                      # three@0.170.0
# Playwright + Chromium doivent être disponibles (require('playwright'))
node render.js                   # rendu complet, 3 processus -> vivre_a_moins_50_3d.mp4
node render.js --preview 1,14.5,46 --scale 0.5   # images fixes dans build/
node render.js --jobs 2 --crf 21 --resume        # options : parallélisme, qualité, reprise
```

Le rendu brut (CRF 19, ~390 Mo à cause du grain) est ensuite ramené sous 50 Mo :

```bash
mv vivre_a_moins_50_3d.mp4 build/master.mp4
ffmpeg -i build/master.mp4 -c:v libx264 -preset slow -b:v 5900k -maxrate 9000k -bufsize 18000k \
  -pix_fmt yuv420p -c:a copy -movflags +faststart vivre_a_moins_50_3d.mp4
```

Compter environ 2 à 3 s par image (38 min pour les 1800 images avec 3 processus) en 1080x1920 sur 4 CPU sans GPU.

## Écarts par rapport au découpage

- Personnages et décors stylisés (low-poly lissé), pas photoréalistes.
- Plan 1 : la bascule de mise au point est suggérée par les bokeh qui se resserrent
  (pas de profondeur de champ optique).
- Plan 6 : le givre pousse sur les cils, les sourcils et la fourrure ; la peau rougie est un simple dégradé.
- Plan 9 : on ne voit que le bras d'Aïsen qui gratte la vitre.
- Plan 12 : étiquettes ajoutées dans la coupe (neige, sol gelé, permafrost).
- Plan 17 : les gouttelettes des cils qui dégèlent ne sont pas représentées.
- Ralentis simulés par la vitesse des animations (pas de changement de cadence).
