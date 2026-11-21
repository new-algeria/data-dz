/**
 * Balade : galerie 3D en anneau où les illustrations des données sont accrochées aux deux murs d'un couloir courbe.
 * Fonctions pures (géométrie, poses de la caméra, répartition des données, courbes d'animation), testées dans
 * `balade.test.ts`. La scène three.js est dans `src/components/balade/SceneBalade.ts`.
 *
 * Repère : le centre de l'anneau est l'origine, unités en mètres. Avancer dans le couloir = l'angle `th` diminue ;
 * le pilier central est toujours à gauche.
 */

/** Rayon du mur extérieur (à droite) et du pilier intérieur (à gauche), hauteur des murs. */
export const RAYON_EXT = 18;
export const RAYON_INT = 12.2;
export const HAUTEUR_MUR = 6.2;

/** Emplacements sur chaque mur : 36 à droite, 24 à gauche (60 au total). */
export const EMPLACEMENTS_EXT = 36;
export const EMPLACEMENTS_INT = 24;
/** Pas entre deux tableaux du mur extérieur : celui des flèches et du clavier. */
export const PAS = (2 * Math.PI) / EMPLACEMENTS_EXT;

/** Tableau : illustrations en 5/3 (1200 × 720), centre à 1,95 m du sol. */
export const LARGEUR_TABLEAU = 1.9;
export const HAUTEUR_TABLEAU = (LARGEUR_TABLEAU * 3) / 5;
export const HAUTEUR_CENTRE = 1.95;

/** Durées (ms) et constante de lissage de la marche (s). */
export const DUREE_GLISSEMENT = 950;
export const DUREE_ENTREE = 1400;
export const LISSAGE_MARCHE = 0.36;

/** Pose de la caméra : angle sur l'anneau, rayon, lacet (0 = dans l'axe du couloir), hauteur, tangage. */
export interface Pose {
  th: number;
  r: number;
  yaw: number;
  y: number;
  pitch: number;
}

export type Mur = "ext" | "int";

/** Un tableau accroché : mur, angle, et indice de la donnée affichée (dans la liste passée à la scène). */
export interface Emplacement {
  mur: Mur;
  angle: number;
  indice: number;
}

/**
 * Répartit `nombre` données sur les 60 emplacements : d'abord le mur extérieur, puis le pilier, dans l'ordre de la
 * liste ; s'il y a moins de 60 données, la liste recommence. Le pilier est décalé d'un demi-pas pour que deux
 * tableaux ne se fassent jamais face.
 */
export function repartirEmplacements(nombre: number): Emplacement[] {
  if (nombre <= 0) return [];
  const emplacements: Emplacement[] = [];
  for (let s = 0; s < EMPLACEMENTS_EXT; s++) {
    emplacements.push({ mur: "ext", angle: (s * 2 * Math.PI) / EMPLACEMENTS_EXT, indice: s % nombre });
  }
  for (let k = 0; k < EMPLACEMENTS_INT; k++) {
    emplacements.push({
      mur: "int",
      angle: ((k + 0.5) * 2 * Math.PI) / EMPLACEMENTS_INT,
      indice: (EMPLACEMENTS_EXT + k) % nombre,
    });
  }
  return emplacements;
}

/** Réglages qui changent sur téléphone en portrait (caméra plus large, plus de recul). */
export interface Format {
  portrait: boolean;
}

/** Décalage de l'angle de marche : le tableau visé est juste devant, à droite. */
export const decalageMarche = ({ portrait }: Format) => (portrait ? 0.14 + 0.9 * PAS : 0.14);

/** Pose de marche, à l'angle `th`. */
export function poseMarche(th: number, { portrait }: Format): Pose {
  return portrait ? { th, r: 15.4, yaw: -0.42, y: 1.9, pitch: -0.1 } : { th, r: 15.6, yaw: -0.3, y: 1.92, pitch: -0.12 };
}

/** Pose face à un tableau : recul de 4,3 m (5,2 m en portrait), à hauteur d'yeux un peu sous le centre. */
export function poseFocus(mur: Mur, angle: number, { portrait }: Format): Pose {
  const recul = portrait ? 5.2 : 4.3;
  const y = HAUTEUR_CENTRE - (portrait ? 0.95 : 0.45);
  return mur === "ext"
    ? { th: angle, r: RAYON_EXT - recul, yaw: Math.PI / 2, y, pitch: 0 }
    : { th: angle, r: RAYON_INT + recul, yaw: -Math.PI / 2, y, pitch: 0 };
}

/** Copie de `angle` la plus proche de `reference` (à ±π près) : la caméra prend le chemin le plus court. */
export function angleLePlusProche(angle: number, reference: number): number {
  const tour = 2 * Math.PI;
  return angle + Math.round((reference - angle) / tour) * tour;
}

/** Cible après une flèche : emplacement suivant (`sens` = 1) ou précédent (-1) du mur extérieur. */
export function cibleVoisine(cible: number, sens: 1 | -1, decalage: number): number {
  return (Math.round((cible - decalage) / PAS) - sens) * PAS + decalage;
}

/** Suivi exponentiel : part du chemin restant parcourue pendant `dt` secondes. */
export const facteurLissage = (dt: number, constante = LISSAGE_MARCHE) => 1 - Math.exp(-dt / constante);

/** Courbes d'animation. */
export const sortieQuartique = (t: number) => 1 - (1 - t) ** 4;
export const sortieCubique = (t: number) => 1 - (1 - t) ** 3;
export const sortieQuadratique = (t: number) => 1 - (1 - t) ** 2;
export const sortieExpo = (t: number) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t));

/**
 * Pose intermédiaire d'un glissement : le déplacement mène (quartique), la rotation suit (quadratique), rayon,
 * hauteur et tangage en cubique. Le tableau visé glisse depuis le côté et se pose bien de face.
 */
export function interpolerPose(depart: Pose, arrivee: Pose, t: number): Pose {
  const u = Math.min(1, Math.max(0, t));
  const melange = (a: number, b: number, k: number) => a + (b - a) * k;
  const c = sortieCubique(u);
  return {
    th: melange(depart.th, arrivee.th, sortieQuartique(u)),
    r: melange(depart.r, arrivee.r, c),
    yaw: melange(depart.yaw, arrivee.yaw, sortieQuadratique(u)),
    y: melange(depart.y, arrivee.y, c),
    pitch: melange(depart.pitch, arrivee.pitch, c),
  };
}

/** Position de la caméra et point visé pour une pose. */
export function regardDepuisPose(pose: Pose): { position: [number, number, number]; cible: [number, number, number] } {
  const { th, r, yaw, y, pitch } = pose;
  const position: [number, number, number] = [r * Math.cos(th), y, r * Math.sin(th)];
  // Tangente (sens de la marche) et normale sortante.
  const tx = Math.sin(th);
  const tz = -Math.cos(th);
  const nx = Math.cos(th);
  const nz = Math.sin(th);
  const dx = Math.cos(yaw) * tx + Math.sin(yaw) * nx;
  const dz = Math.cos(yaw) * tz + Math.sin(yaw) * nz;
  return { position, cible: [position[0] + dx, y + pitch, position[2] + dz] };
}

/** Molette en angle : vers le bas = avancer. Les deltas en lignes sont convertis en pixels (× 33). */
export function angleMolette(deltaY: number, modeLignes: boolean): number {
  return -(modeLignes ? deltaY * 33 : deltaY) * 0.0016;
}

/** Glisser en angle : le plus grand des deux déplacements ; vers la gauche ou vers le haut = avancer. */
export function angleGlisser(dx: number, dy: number, telephone: boolean): number {
  const delta = Math.abs(dx) > Math.abs(dy) ? dx : dy;
  return delta * (telephone ? 0.0042 : 0.0022);
}

/** Ordre d'accrochage : les données les plus téléchargées d'abord (puis les plus vues), au plus 60. */
export function ordreBalade<T extends { nb_telechargements?: number | null; nb_vues?: number | null }>(donnees: T[]): T[] {
  return [...donnees]
    .sort((a, b) => (b.nb_telechargements ?? 0) - (a.nb_telechargements ?? 0) || (b.nb_vues ?? 0) - (a.nb_vues ?? 0))
    .slice(0, EMPLACEMENTS_EXT + EMPLACEMENTS_INT);
}
