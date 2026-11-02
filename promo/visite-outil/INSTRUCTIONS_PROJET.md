# Instructions de projet : vidéos « visite de site » (style data-dz)

> À coller dans les instructions d'un projet Claude. Claude doit tout faire lui-même, de bout en bout,
> sans enregistrement d'écran manuel ni extension (Cursorful, Screen Studio…).

## 1. Ce que Claude livre à chaque fois
1. **La vidéo finale** en MP4 1920×1080, 30 i/s, H.264 (`-crf 17`, `yuv420p`, `+faststart`), avec la voix off mixée et **sans musique**.
2. **La même vidéo sans son**, pour pouvoir la remonter.
3. **Le script de la voix off** : un tableau avec, pour chaque phrase, le timecode, le texte exact et ce qu'on voit à l'écran.
4. **Le texte du post LinkedIn** : une version longue et une version courte avec le lien en commentaire.
5. Les fichiers sont déposés dans le dossier `promo/` du dépôt, et la vidéo est aussi envoyée dans la conversation.

## 2. Ordre de travail (ne pas l'inverser)
1. **Explorer le site.** Faire des captures 1600×900 des pages du parcours et relever les sélecteurs. Repérer ce qui charge par le réseau (données, tuiles de carte, images, polices, traductions) et les animations d'apparition au défilement.
2. **Écrire le script de la voix off d'abord.** Une scène = une phrase ou deux, et une action visible. Ton : podcasteur, présent de narration, phrases de 6 à 20 mots. Le script peut en dire plus que les sous-titres à l'écran.
3. **Générer la voix** avec le connecteur gemini-tts du Mac (cf. §5), mesurer la durée de chaque fichier et retirer les silences de début et de fin.
4. **Enregistrer le parcours** en le calant sur la voix (cf. §3) : chaque scène dure au moins la durée de sa phrase + 0,25 s d'entrée + 0,55 s d'air.
5. **Composer** l'habillage (cf. §4), puis **mixer** la voix (cf. §6).
6. **Contrôler la qualité** (cf. §7) **avant** d'envoyer quoi que ce soit.

## 3. Enregistrement du site (Playwright, Chrome headless, temps virtuel)
- Viewport 1600×900, `deviceScaleFactor: 1.5`, soit des images 2400×1350 (marge pour les zooms). Thème clair et langue fixés au départ.
- **Temps virtuel CDP.** Mettre `Emulation.setVirtualTimePolicy` en `pause`, puis pour chaque image : `advance` avec un budget de 33,33 ms, attendre `virtualTimeBudgetExpired`, puis `Page.captureScreenshot` (jpeg 93). Résultat : 30 i/s parfaitement régulières, quelle que soit la vitesse de la machine.
- **Pièges connus :**
  - En temps virtuel, `page.evaluate` et `page.click` de Playwright peuvent bloquer. Utiliser uniquement CDP : `Runtime.evaluate` et `Input.dispatchMouseEvent`, `insertText`, `dispatchKeyEvent`.
  - Le `clip` de `captureScreenshot` est relatif au **document**. Il faut donc `clip = {x: scrollX, y: scrollY, w: 1600, h: 900, scale: 1.5}`.
  - En temps virtuel, les requêtes réseau ne se terminent pas. Après une action qui charge (navigation, carte, langue), passer brièvement en temps réel (`policy: advance` sans budget), attendre la condition (sélecteur présent), puis remettre en pause. Ces instants ne sont pas filmés.
  - `pauseIfNetworkFetchesPending` bloque indéfiniment sur les sites qui gardent une requête ouverte : ne pas l'utiliser.
- **Une seule page chargée.** `page.goto` une seule fois, puis navigation SPA uniquement : `history.pushState` + `popstate`, ou de vrais clics.
- **Préchauffage dans la même session**, avant de mettre le temps en pause : défiler toute la page d'accueil, ouvrir la fiche du parcours (données, tuiles, illustration), passer dans chaque langue utilisée, puis revenir à l'état de départ avec `history.back()`.
- **Pas de blocs à moitié vides.** Neutraliser les apparitions au défilement (framer-motion) avec du CSS injecté : `main section[style*="opacity"], #catalog [style*="opacity"]{opacity:1!important;transform:none!important}`. Masquer les barres de défilement.
- **Curseur.** Il n'est pas filmé. Sa trajectoire est enregistrée à chaque image (`log.json`) et dessinée au montage. Chaque déplacement va **directement du point A au point B** sur un arc très léger (au plus 8 % de la distance, 60 px maximum), avec un easing cubique, en 1,0 à 1,5 s. Jamais de zigzag, jamais de déplacement inutile. Le vrai `mouseMoved` est envoyé à chaque image pour que les survols fonctionnent.
- **Clics, saisie, défilement.** Clic = appui puis relâche espacés de 0,12 s. Saisie à 6 caractères par seconde. Défilement avec `scrollTo` progressif en 1,6 à 2 s, jamais de saut.
- Supprimer au montage les quelques images de squelette de chargement juste après une navigation.

## 4. Habillage (canvas, `render(t)` pur, exporté image par image vers ffmpeg)
- **Style clair data-dz.**
  - Fond `#effaf5` → `#f8fafc`, avec des halos flous : vert `rgba(140,232,190,.55)` en haut à gauche, rose en bas, cyan à droite. Ils dérivent très lentement.
  - Grille de 64 px très légère.
  - Police Cairo (700 à 900). Encre `#0f172a`, vert `#0e9f6e`.
- **Structure :**
  1. Intro : le logo apparaît avec un léger rebond, puis « data-dz » et le sous-titre, avec le drapeau dessiné (jamais l'emoji).
  2. Accroche en 3 lignes, avec le mot-clé en très gros et en vert.
  3. Fenêtre de navigateur : coins arrondis 18 px, ombre douce, trois pastilles, barre d'URL qui suit les pages.
  4. Sous-titre en pilule blanche en bas, avec une pastille verte cochée, ≤ 8 mots.
  5. Fin : logo, « data-dz.com », phrase, bouton CTA et ligne « Gratuit · Open source · … ».
- **Caméra (le point le plus important).**
  - Zoom **maximum 1,25**, la plupart du temps entre 1,12 et 1,2.
  - Transitions de **1,8 à 2,2 s** en **easeInOutSine**.
  - On passe d'une zone à l'autre par un **panoramique**, sans dézoomer puis rezoomer.
  - On revient à 1,0 seulement pour les grands changements : défilement, changement de page.
  - Le point visé est ramené au plus à 60 % vers le centre, et l'image ne sort jamais de la fenêtre.
- **Clic visible.** Le curseur rétrécit de 16 %, et un anneau vert s'élargit en 0,55 s.
- Les entrées de texte durent 0,4 à 0,45 s (fondu, montée de 26 px, flou), les sorties 0,3 s. Un seul point d'attention à la fois.

## 5. Voix off (connecteur gemini-tts du Mac)
- Modèle `gemini-3.8-flash-tts`, voix **Charon**.
- `style` = « Podcasteur français, ton conversationnel, chaleureux et dynamique, débit naturel, sourire dans la voix » (+ « conclusion enthousiaste » pour la fin).
- **Un fichier WAV par phrase** (`voix-visite/vNN.wav`), écrit dans un dossier connecté du projet.
- Quota : **10 requêtes par minute**. Faire des lots de 9, puis attendre 60 s.
- **Écrire le texte pour l'oreille :**
  - nombres en toutes lettres ou arrondis (« près de sept cents ») ;
  - « data-dz » s'écrit « data-dé-zèd », « .com » s'écrit « point com » ;
  - pause avec `<short pause>` ;
  - points de suspension pour les respirations.
- Retirer les silences : `silenceremove` au début, puis `areverse`, `silenceremove` et `areverse` pour la fin.

## 6. Mixage
- Chaque phrase est posée à son timecode : marque de la scène + 0,25 s d'entrée, avec `adelay`. On assemble avec `amix` (`normalize=0`), puis `loudnorm I=-16:TP=-1.5`.
- La vidéo est copiée sans réencodage (`-c:v copy`), le son en AAC 192k.
- Les phrases ne doivent jamais se chevaucher : vérifier que chaque scène est plus longue que sa phrase.

## 7. Contrôle qualité (obligatoire avant livraison)
- Planche contact : une image toutes les 1,5 s. Vérifier ensuite chaque transition de page à 8 i/s.
- Aucun bloc vide, aucun squelette, aucune page « non chargée ». Aucun texte coupé (mesurer les textes avant de dessiner les boutons).
- Les zooms restent doux. Le curseur va toujours droit à sa cible.
- La voix tombe sur l'action dont elle parle (± 0,3 s), sans chevauchement.
- Les mots difficiles (nom du site, sigles) se prononcent bien. Si on ne peut pas écouter, le dire à l'utilisateur.

## 8. Règles de contenu
- Montrer le **vrai site** : aucun chiffre, partenaire ou logo inventé. Les chiffres dits à l'oral viennent du site le jour de l'enregistrement.
- Citer les sources de données quand le site l'exige (ex. « GeoAlgeria par Yasser's studio » dans le post).
- Montrer le mode clair **et** le mode sombre, et les langues si le site en a plusieurs.
