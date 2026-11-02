# Vidéo « visite de data-dz.com » : comment la regénérer

Pipeline 100 % automatique, sans enregistrement d'écran à la main :

1. `record.js` (Playwright + Chrome headless, temps virtuel) joue un parcours scripté sur https://www.data-dz.com
   et capture **chaque image** (30 i/s, 2400 × 1350). Le curseur n'est pas filmé : sa trajectoire
   (courbes douces, sans zigzag), les clics et les zooms de caméra sont écrits dans `rec/log.json`.
   `node record.js rec fr` (≈ 20 min pour 1 100 images).
2. `comp.js` (canvas, `render(t)` pur) compose la vidéo : intro, accroche, fenêtre de navigateur,
   zooms au clic façon Cursorful / Screen Studio, curseur et ondes de clic, sous-titres, écran de fin.
   Les textes sont dans `CAPTIONS` et dans `intro()`, `hook()`, `outro()`.
3. `export.js` envoie les images à ffmpeg : `node export.js sortie.mp4` (≈ 3 min).
   `index.html` = `comp.js` + polices Cairo et logo embarqués (à reconstruire si on change de police).

Pour changer le parcours : modifier la partie « TOUR » de `record.js` (`moveTo`, `click`, `type`, `scrollTo`, `cam`).
Musique de la version « musique » : la piste chaâbi de `data-dz-promo-ar-horizontal-clair.mp4`, remontée sur les mesures (120 BPM) à la longueur de la vidéo.
