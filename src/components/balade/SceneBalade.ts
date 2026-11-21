import * as THREE from "three";
import {
  angleGlisser,
  angleLePlusProche,
  angleMolette,
  cibleVoisine,
  decalageMarche,
  DUREE_ENTREE,
  DUREE_GLISSEMENT,
  facteurLissage,
  HAUTEUR_CENTRE,
  HAUTEUR_MUR,
  HAUTEUR_TABLEAU,
  interpolerPose,
  LARGEUR_TABLEAU,
  poseFocus,
  poseMarche,
  RAYON_EXT,
  RAYON_INT,
  regardDepuisPose,
  repartirEmplacements,
  sortieExpo,
  type Emplacement,
  type Format,
  type Pose,
} from "@/lib/balade";

/** Un tableau à accrocher : la donnée, son illustration et les trois lignes de son cartel. */
export interface TableauBalade {
  slug: string;
  image: string;
  titre: string;
  source: string;
  chiffre: string;
}

export type EtatBalade = "marche" | "focus";

export interface OptionsSceneBalade {
  conteneur: HTMLElement;
  tableaux: TableauBalade[];
  rtl: boolean;
  /** Famille de police du site, pour les cartels dessinés sur canvas. */
  police: string;
  reduireAnimations: boolean;
  /** Téléphone (même requête que le CSS de la page) et portrait. */
  telephone: () => boolean;
  portrait: () => boolean;
  surEtat: (etat: EtatBalade) => void;
  /** Bulle « Ouvrir la donnée » : position à l'écran (px dans le conteneur), ou null pour la cacher. */
  surBulle: (position: { x: number; y: number } | null) => void;
  surOuvrir: (slug: string) => void;
  /** La scène est prête (illustrations des tableaux proches chargées ou délai dépassé). */
  surPret: () => void;
  /** La caméra se déplace (marche, glissement) ou un tableau est visé : la page masque son titre. */
  surMouvement: (enMouvement: boolean) => void;
}

type Glissement = { depart: Pose; arrivee: Pose; debut: number; duree: number; courbe: "pose" | "expo"; ensuite: EtatBalade };

const COULEUR_FOND = 0xfff9ec;
const SEUIL_GLISSER = 6;

/** Texture verticale ou radiale dessinée sur canvas (les murs ne sont pas éclairés : tout le relief vient de là). */
function textureDegrade(arrets: [number, string][], radial?: { interieur: number }): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = radial ? 1024 : 4;
  canvas.height = radial ? 1024 : 256;
  const ctx = canvas.getContext("2d")!;
  const degrade = radial
    ? ctx.createRadialGradient(512, 512, 512 * radial.interieur, 512, 512, 512)
    : ctx.createLinearGradient(0, 256, 0, 0);
  for (const [position, couleur] of arrets) degrade.addColorStop(position, couleur);
  ctx.fillStyle = degrade;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Halo ou ombre douce : dégradé radial d'une couleur vers la transparence. */
function textureTache(couleur: string, plein: number): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const degrade = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  degrade.addColorStop(0, couleur);
  degrade.addColorStop(plein, couleur);
  degrade.addColorStop(1, couleur.replace(/[\d.]+\)$/, "0)"));
  ctx.fillStyle = degrade;
  ctx.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * URL d'une illustration pour WebGL. Une image déjà affichée par une balise <img> (cartes du catalogue) peut rester
 * en cache sans en-têtes CORS (Safari) : la texture serait refusée. Un paramètre propre à la balade force une
 * requête CORS distincte ; R2 ignore la chaîne de requête.
 */
export const urlTexture = (url: string, essai: number) => `${url}${url.includes("?") ? "&" : "?"}balade=${essai}`;

/** Drapeau de l'Algérie sur canvas (vert #006233, blanc, croissant et étoile #D21034), mêmes proportions que `DrapeauAlgerie`. */
function textureDrapeau(): THREE.Texture {
  const L = 900;
  const H = 600;
  const canvas = document.createElement("canvas");
  canvas.width = L;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#006233";
  ctx.fillRect(0, 0, L / 2, H);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(L / 2, 0, L / 2, H);
  // Croissant : disque de rayon H/4, moins un disque de rayon H/5 décalé vers le battant.
  const croissant = document.createElement("canvas");
  croissant.width = L;
  croissant.height = H;
  const c = croissant.getContext("2d")!;
  c.fillStyle = "#D21034";
  c.beginPath();
  c.arc(L / 2, H / 2, H / 4, 0, 2 * Math.PI);
  c.fill();
  c.globalCompositeOperation = "destination-out";
  c.beginPath();
  c.arc(L / 2 + H / 16, H / 2, H / 5, 0, 2 * Math.PI);
  c.fill();
  ctx.drawImage(croissant, 0, 0);
  // Étoile à cinq branches de rayon H/8, une pointe vers la hampe.
  ctx.fillStyle = "#D21034";
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rayon = i % 2 === 0 ? H / 8 : (H / 8) * 0.382;
    const angle = Math.PI + (i * Math.PI) / 5;
    const x = 490 + rayon * Math.cos(angle);
    const y = H / 2 + rayon * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Coupe un texte trop long pour la largeur donnée, avec « … ». */
function ajuster(ctx: CanvasRenderingContext2D, texte: string, largeur: number): string {
  if (ctx.measureText(texte).width <= largeur) return texte;
  let court = texte;
  while (court.length > 1 && ctx.measureText(`${court}…`).width > largeur) court = court.slice(0, -1);
  return `${court.trimEnd()}…`;
}

/** Cartel sous le tableau : titre, source, chiffre clé. */
function textureCartel(tableau: TableauBalade, police: string, rtl: boolean): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 260;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#3A3550";
  ctx.direction = rtl ? "rtl" : "ltr";
  ctx.textAlign = rtl ? "right" : "left";
  const x = rtl ? 870 : 30;
  const largeur = 840;
  ctx.font = `600 56px ${police}`;
  ctx.fillText(ajuster(ctx, tableau.titre, largeur), x, 80);
  ctx.font = `400 42px ${police}`;
  ctx.globalAlpha = 0.85;
  ctx.fillText(ajuster(ctx, tableau.source, largeur), x, 148);
  ctx.font = `500 34px ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.globalAlpha = 0.7;
  ctx.fillText(ajuster(ctx, tableau.chiffre.toUpperCase(), largeur), x, 212);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** Illustration absente : le titre sur fond crème, pour ne jamais laisser un cadre vide. */
function textureSecours(titre: string, police: string): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 600;
  canvas.height = 360;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#F3EAD9";
  ctx.fillRect(0, 0, 600, 360);
  ctx.fillStyle = "#059669";
  ctx.font = `700 40px ${police}`;
  ctx.textAlign = "center";
  ctx.fillText(ajuster(ctx, titre, 540), 300, 190);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Galerie 3D en anneau. La caméra seule se déplace : marche lissée à la molette, au glisser, aux flèches et au
 * clavier ; un clic sur un tableau glisse jusqu'à lui, un second clic l'ouvre (`surOuvrir`).
 */
export class SceneBalade {
  private readonly options: OptionsSceneBalade;
  private readonly rendu: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly rayon = new THREE.Raycaster();
  private readonly emplacements: Emplacement[];
  private readonly tableaux: THREE.Mesh[] = [];
  private readonly aLiberer: { dispose: () => void }[] = [];
  private readonly observateur: ResizeObserver;
  private image = 0;
  private dernierTemps = 0;
  private etat: EtatBalade = "marche";
  private th: number;
  private thCible: number;
  private pose: Pose;
  private glissement: Glissement | null = null;
  private focus: number | null = null;
  private appui: { x: number; y: number; th: number; glisse: boolean; id: number } | null = null;
  private survol: { x: number; y: number } | null = null;
  private detruite = false;
  private drapeaux: { geometrie: THREE.PlaneGeometry; base: Float32Array }[] = [];
  private enMouvement = false;

  constructor(options: OptionsSceneBalade) {
    this.options = options;
    const { conteneur } = options;
    this.rendu = new THREE.WebGLRenderer({ antialias: true });
    this.rendu.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.rendu.outputColorSpace = THREE.SRGBColorSpace;
    this.rendu.toneMapping = THREE.NoToneMapping;
    this.rendu.domElement.style.display = "block";
    conteneur.appendChild(this.rendu.domElement);

    this.scene.background = new THREE.Color(COULEUR_FOND);
    this.scene.fog = new THREE.Fog(COULEUR_FOND, 10, 46);
    this.camera = new THREE.PerspectiveCamera(56, 1, 0.05, 100);

    this.th = decalageMarche(this.format());
    this.thCible = this.th;
    this.pose = poseMarche(this.th, this.format());

    this.construirePiece();
    this.emplacements = repartirEmplacements(options.tableaux.length);
    this.accrocherTableaux();
    this.planterDrapeaux();

    this.observateur = new ResizeObserver(() => this.redimensionner());
    this.observateur.observe(conteneur);
    this.redimensionner();
    this.brancherEvenements();
    this.image = requestAnimationFrame(this.boucle);
  }

  private format(): Format {
    return { portrait: this.options.telephone() && this.options.portrait() };
  }

  private get decalage() {
    return decalageMarche(this.format());
  }

  private duree(ms: number) {
    return this.options.reduireAnimations ? 0 : ms;
  }

  private ajouter<T extends { dispose: () => void }>(objet: T): T {
    this.aLiberer.push(objet);
    return objet;
  }

  private construirePiece() {
    const murExt = this.ajouter(
      textureDegrade([[0, "#F5EBD8"], [0.2, "#FBF3E3"], [0.6, "#FBF3E3"], [0.86, "#F8EDD9"], [1, "#EFDFC4"]])
    );
    const pilier = this.ajouter(textureDegrade([[0, "#F7EEDD"], [0.3, "#FFFAF0"], [0.8, "#FDF5E6"], [1, "#F1E1C6"]]));
    const sol = this.ajouter(
      textureDegrade([[0, "#EDD6B0"], [0.55, "#F3E1C3"], [1, "#EFDAB8"]], { interieur: RAYON_INT / RAYON_EXT })
    );
    const ajouterMesh = (geometrie: THREE.BufferGeometry, materiau: THREE.Material) => {
      this.ajouter(geometrie);
      this.ajouter(materiau);
      const mesh = new THREE.Mesh(geometrie, materiau);
      this.scene.add(mesh);
      return mesh;
    };
    ajouterMesh(
      new THREE.CylinderGeometry(RAYON_EXT, RAYON_EXT, HAUTEUR_MUR, 160, 1, true),
      new THREE.MeshBasicMaterial({ map: murExt, side: THREE.BackSide })
    ).position.y = HAUTEUR_MUR / 2;
    ajouterMesh(
      new THREE.CylinderGeometry(RAYON_INT, RAYON_INT, HAUTEUR_MUR, 120, 1, true),
      new THREE.MeshBasicMaterial({ map: pilier, side: THREE.FrontSide })
    ).position.y = HAUTEUR_MUR / 2;
    ajouterMesh(new THREE.CircleGeometry(RAYON_EXT, 160), new THREE.MeshBasicMaterial({ map: sol })).rotation.x =
      -Math.PI / 2;
    const plafond = ajouterMesh(
      new THREE.CircleGeometry(RAYON_EXT, 160),
      new THREE.MeshBasicMaterial({ color: 0xfaf1e0, side: THREE.BackSide })
    );
    plafond.rotation.x = -Math.PI / 2;
    plafond.position.y = HAUTEUR_MUR;
  }

  private accrocherTableaux() {
    const { tableaux, police, rtl } = this.options;
    const L = LARGEUR_TABLEAU;
    const H = HAUTEUR_TABLEAU;
    const Y = HAUTEUR_CENTRE;
    const geoHalo = this.ajouter(new THREE.PlaneGeometry(1.9 * L, 1.75 * H));
    const geoOmbre = this.ajouter(new THREE.PlaneGeometry(1.2 * L, 1.22 * H));
    const geoCadre = this.ajouter(new THREE.BoxGeometry(L + 0.09, H + 0.09, 0.06));
    const geoTableau = this.ajouter(new THREE.PlaneGeometry(L, H));
    const largeurCartel = 1.5;
    const geoCartel = this.ajouter(new THREE.PlaneGeometry(largeurCartel, (largeurCartel * 260) / 900));
    const matHalo = this.ajouter(
      new THREE.MeshBasicMaterial({ map: this.ajouter(textureTache("rgba(255,255,255,0.95)", 0.35)), transparent: true, depthWrite: false })
    );
    const matOmbre = this.ajouter(
      new THREE.MeshBasicMaterial({ map: this.ajouter(textureTache("rgba(120,90,50,0.28)", 0.25)), transparent: true, depthWrite: false })
    );
    const matCadre = this.ajouter(new THREE.MeshBasicMaterial({ color: 0xd3aa72 }));
    // Passe-partout blanc : les illustrations ont souvent un fond transparent (vague), sinon il paraîtrait noir.
    const matFond = this.ajouter(new THREE.MeshBasicMaterial({ color: 0xffffff }));

    // Une texture par illustration (plusieurs données partagent la même image) et un cartel par donnée.
    const chargeur = new THREE.TextureLoader();
    chargeur.setCrossOrigin("anonymous");
    const anisotropie = this.rendu.capabilities.getMaxAnisotropy();
    const materiauxImage = new Map<string, THREE.MeshBasicMaterial>();
    const cartels = new Map<number, THREE.MeshBasicMaterial>();
    let restantes = 0;
    let pretSignale = false;
    const signalerPret = () => {
      if (pretSignale || this.detruite) return;
      pretSignale = true;
      this.options.surPret();
    };
    window.setTimeout(signalerPret, 4000);

    const materiauImage = (tableau: TableauBalade) => {
      const existant = materiauxImage.get(tableau.image);
      if (existant) return existant;
      const materiau = this.ajouter(new THREE.MeshBasicMaterial({ color: 0xefe6d6, transparent: true }));
      materiauxImage.set(tableau.image, materiau);
      restantes++;
      const fin = () => {
        restantes--;
        if (restantes === 0) signalerPret();
      };
      const appliquer = (texture: THREE.Texture) => {
        if (this.detruite) return texture.dispose();
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = anisotropie;
        this.ajouter(texture);
        materiau.map = texture;
        materiau.color.set(0xffffff);
        materiau.needsUpdate = true;
        fin();
      };
      const secours = () => {
        if (!this.detruite) {
          materiau.map = this.ajouter(textureSecours(tableau.titre, police));
          materiau.color.set(0xffffff);
          materiau.needsUpdate = true;
        }
        fin();
      };
      // Second essai avec une autre URL avant le panneau de secours (réseau capricieux, image en cache sans CORS).
      chargeur.load(urlTexture(tableau.image, 1), appliquer, undefined, () =>
        chargeur.load(urlTexture(tableau.image, 2), appliquer, undefined, secours)
      );
      return materiau;
    };

    this.emplacements.forEach((emplacement, position) => {
      const tableau = tableaux[emplacement.indice];
      const groupe = new THREE.Group();
      const rayon = emplacement.mur === "ext" ? RAYON_EXT - 0.02 : RAYON_INT + 0.02;
      groupe.position.set(rayon * Math.cos(emplacement.angle), 0, rayon * Math.sin(emplacement.angle));
      if (emplacement.mur === "ext") groupe.lookAt(0, 0, 0);
      else groupe.lookAt(groupe.position.x * 2, 0, groupe.position.z * 2);

      const halo = new THREE.Mesh(geoHalo, matHalo);
      halo.position.set(0, Y + 0.05, 0.005);
      const ombre = new THREE.Mesh(geoOmbre, matOmbre);
      ombre.position.set(0.05, Y - 0.06, 0.01);
      const cadre = new THREE.Mesh(geoCadre, matCadre);
      cadre.position.set(0, Y, 0.045);
      const fond = new THREE.Mesh(geoTableau, matFond);
      fond.position.set(0, Y, 0.076);
      const image = new THREE.Mesh(geoTableau, materiauImage(tableau));
      image.position.set(0, Y, 0.077);
      image.userData.position = position;
      this.tableaux.push(image);

      let matCartel = cartels.get(emplacement.indice);
      if (!matCartel) {
        matCartel = this.ajouter(
          new THREE.MeshBasicMaterial({ map: this.ajouter(textureCartel(tableau, police, rtl)), transparent: true, depthWrite: false })
        );
        cartels.set(emplacement.indice, matCartel);
      }
      const cartel = new THREE.Mesh(geoCartel, matCartel);
      const bord = largeurCartel / 2 - L / 2;
      cartel.position.set(rtl ? -bord : bord, Y - H / 2 - 0.36, 0.02);

      groupe.add(halo, ombre, cadre, fond, image, cartel);
      this.scene.add(groupe);
    });
    if (restantes === 0) signalerPret();
  }

  /** Trois drapeaux de l'Algérie sur leur mât, le long du pilier, dont un juste devant au départ. */
  private planterDrapeaux() {
    const texture = this.ajouter(textureDrapeau());
    const matDrapeau = this.ajouter(new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }));
    const matMat = this.ajouter(new THREE.MeshBasicMaterial({ color: 0xc9b08a }));
    const matPommeau = this.ajouter(new THREE.MeshBasicMaterial({ color: 0xd8b56a }));
    const geoMat = this.ajouter(new THREE.CylinderGeometry(0.035, 0.045, 4.2, 12));
    const geoPommeau = this.ajouter(new THREE.SphereGeometry(0.08, 16, 12));
    const geoSocle = this.ajouter(new THREE.CylinderGeometry(0.22, 0.26, 0.12, 24));
    const rayon = RAYON_INT + 0.75;
    const depart = decalageMarche(this.format());
    for (const angle of [0, 1, 2].map((k) => depart - 0.8 + (k * 2 * Math.PI) / 3)) {
      const groupe = new THREE.Group();
      groupe.position.set(rayon * Math.cos(angle), 0, rayon * Math.sin(angle));
      // Repère du mât : x vers l'extérieur de l'anneau. Le drapeau flotte en travers du couloir, face au visiteur.
      groupe.rotation.y = -angle;
      const mat = new THREE.Mesh(geoMat, matMat);
      mat.position.y = 2.1;
      const pommeau = new THREE.Mesh(geoPommeau, matPommeau);
      pommeau.position.y = 4.24;
      const socle = new THREE.Mesh(geoSocle, matMat);
      socle.position.y = 0.06;
      const geometrie = this.ajouter(new THREE.PlaneGeometry(1.65, 1.1, 24, 8));
      geometrie.translate(0.825 + 0.04, 0, 0);
      const drapeau = new THREE.Mesh(geometrie, matDrapeau);
      drapeau.position.y = 3.6;
      groupe.add(mat, pommeau, socle, drapeau);
      this.scene.add(groupe);
      this.drapeaux.push({ geometrie, base: Float32Array.from(geometrie.attributes.position.array as Float32Array) });
    }
  }

  /** Ondulation des drapeaux : l'amplitude grandit vers le battant, la hampe reste fixe. */
  private onduler(temps: number) {
    if (this.options.reduireAnimations) return;
    const t = temps / 1000;
    for (const { geometrie, base } of this.drapeaux) {
      const positions = geometrie.attributes.position.array as Float32Array;
      for (let i = 0; i < positions.length; i += 3) {
        const x = base[i];
        const y = base[i + 1];
        const amplitude = Math.min(1, x / 1.65) * 0.16;
        positions[i + 2] = amplitude * Math.sin(x * 3.2 - t * 3.1 + y * 0.6) + amplitude * 0.35 * Math.sin(x * 6.5 - t * 4.7);
        positions[i + 1] = y - Math.min(1, x / 1.65) * 0.05 * (1 + Math.sin(x * 2.4 - t * 2.2));
      }
      geometrie.attributes.position.needsUpdate = true;
    }
  }

  /** Entrée : un pas en avant dans le couloir. */
  entrer() {
    const arrivee = poseMarche(this.th, this.format());
    const depart = { ...arrivee, th: arrivee.th + 0.16, r: arrivee.r - 0.35 };
    this.pose = depart;
    this.glissement = { depart, arrivee, debut: performance.now(), duree: this.duree(DUREE_ENTREE), courbe: "expo", ensuite: "marche" };
  }

  suivant() {
    this.pas(1);
  }

  precedent() {
    this.pas(-1);
  }

  private pas(sens: 1 | -1) {
    if (this.etat === "focus" || this.focus !== null) return this.reculer();
    this.thCible = cibleVoisine(this.thCible, sens, this.decalage);
  }

  private changerEtat(etat: EtatBalade) {
    if (this.etat === etat) return;
    this.etat = etat;
    this.options.surEtat(etat);
  }

  private glisserVers(arrivee: Pose, ensuite: EtatBalade) {
    this.glissement = { depart: { ...this.pose }, arrivee, debut: performance.now(), duree: this.duree(DUREE_GLISSEMENT), courbe: "pose", ensuite };
  }

  private viser(position: number) {
    const emplacement = this.emplacements[position];
    const angle = angleLePlusProche(emplacement.angle, this.pose.th);
    this.focus = position;
    this.changerEtat("focus");
    this.glisserVers(poseFocus(emplacement.mur, angle, this.format()), "focus");
  }

  /** Retour à la marche, à l'angle du tableau visé. */
  reculer() {
    if (this.focus === null) return;
    this.focus = null;
    this.options.surBulle(null);
    this.th = this.pose.th + this.decalage;
    this.thCible = this.th;
    this.changerEtat("marche");
    this.glisserVers(poseMarche(this.th, this.format()), "marche");
  }

  private tableauSous(x: number, y: number): number | null {
    const rect = this.rendu.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1);
    this.rayon.setFromCamera(ndc, this.camera);
    const touche = this.rayon.intersectObjects(this.tableaux, false)[0];
    return touche && touche.distance < 30 ? (touche.object.userData.position as number) : null;
  }

  private clic(x: number, y: number) {
    const position = this.tableauSous(x, y);
    if (position === null) return this.reculer();
    if (this.focus === position && !this.glissement) {
      this.options.surOuvrir(this.options.tableaux[this.emplacements[position].indice].slug);
      return;
    }
    this.viser(position);
  }

  private readonly surMolette = (evenement: WheelEvent) => {
    evenement.preventDefault();
    if (this.focus !== null) return this.reculer();
    if (this.glissement) return;
    this.thCible += angleMolette(evenement.deltaY, evenement.deltaMode === 1);
    if (this.options.reduireAnimations) this.th = this.thCible;
  };

  private readonly surAppui = (evenement: PointerEvent) => {
    if (evenement.button !== 0) return;
    this.appui = { x: evenement.clientX, y: evenement.clientY, th: this.thCible, glisse: false, id: evenement.pointerId };
  };

  private readonly surDeplacement = (evenement: PointerEvent) => {
    const canvas = this.rendu.domElement;
    if (this.appui && this.appui.id === evenement.pointerId) {
      const dx = evenement.clientX - this.appui.x;
      const dy = evenement.clientY - this.appui.y;
      if (!this.appui.glisse && Math.hypot(dx, dy) > SEUIL_GLISSER) {
        this.appui.glisse = true;
        canvas.setPointerCapture(evenement.pointerId);
        canvas.style.cursor = "grabbing";
        if (this.focus !== null) {
          this.reculer();
          this.appui.th = this.th;
          this.appui.x = evenement.clientX;
          this.appui.y = evenement.clientY;
          return;
        }
      }
      if (this.appui.glisse && !this.glissement) {
        this.thCible = this.appui.th + angleGlisser(dx, dy, this.options.telephone());
        if (this.options.reduireAnimations) this.th = this.thCible;
      }
      return;
    }
    if (evenement.pointerType !== "mouse") return;
    const position = this.tableauSous(evenement.clientX, evenement.clientY);
    canvas.style.cursor = position === null ? "grab" : "pointer";
    if (position !== null && position === this.focus && !this.glissement) {
      const rect = canvas.getBoundingClientRect();
      this.survol = { x: evenement.clientX - rect.left, y: evenement.clientY - rect.top };
    } else this.survol = null;
    this.options.surBulle(this.survol);
  };

  private readonly surRelache = (evenement: PointerEvent) => {
    const appui = this.appui;
    if (!appui || appui.id !== evenement.pointerId) return;
    this.appui = null;
    this.rendu.domElement.style.cursor = "grab";
    if (!appui.glisse) this.clic(evenement.clientX, evenement.clientY);
  };

  private readonly surQuitter = () => {
    this.survol = null;
    this.options.surBulle(null);
  };

  private readonly surClavier = (evenement: KeyboardEvent) => {
    const cible = evenement.target as HTMLElement | null;
    if (cible && (cible.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(cible.tagName))) return;
    if (document.querySelector("[role='dialog']")) return;
    const avant = this.options.rtl ? "ArrowLeft" : "ArrowRight";
    const arriere = this.options.rtl ? "ArrowRight" : "ArrowLeft";
    if (evenement.key === avant || evenement.key === "ArrowDown") this.suivant();
    else if (evenement.key === arriere || evenement.key === "ArrowUp") this.precedent();
    else if (evenement.key === "Escape") this.reculer();
    else if (evenement.key === "Enter" && this.focus !== null && !this.glissement)
      this.options.surOuvrir(this.options.tableaux[this.emplacements[this.focus].indice].slug);
    else return;
    evenement.preventDefault();
  };

  private brancherEvenements() {
    const canvas = this.rendu.domElement;
    canvas.style.cursor = "grab";
    canvas.style.touchAction = "none";
    canvas.addEventListener("wheel", this.surMolette, { passive: false });
    canvas.addEventListener("pointerdown", this.surAppui);
    canvas.addEventListener("pointermove", this.surDeplacement);
    canvas.addEventListener("pointerup", this.surRelache);
    canvas.addEventListener("pointercancel", this.surRelache);
    canvas.addEventListener("pointerleave", this.surQuitter);
    window.addEventListener("keydown", this.surClavier);
  }

  private redimensionner() {
    const { clientWidth: largeur, clientHeight: hauteur } = this.options.conteneur;
    if (!largeur || !hauteur) return;
    this.rendu.setSize(largeur, hauteur);
    this.camera.aspect = largeur / hauteur;
    this.camera.fov = largeur >= hauteur ? 56 : 70;
    this.camera.updateProjectionMatrix();
  }

  /** Centre du tableau visé à l'écran (téléphone : la bulle s'y affiche sans survol). */
  private centreFocus(): { x: number; y: number } | null {
    if (this.focus === null) return null;
    const mesh = this.tableaux[this.focus];
    const point = new THREE.Vector3();
    mesh.getWorldPosition(point);
    point.project(this.camera);
    const { clientWidth: largeur, clientHeight: hauteur } = this.options.conteneur;
    return { x: ((point.x + 1) / 2) * largeur, y: ((1 - point.y) / 2) * hauteur };
  }

  private readonly boucle = (temps: number) => {
    if (this.detruite) return;
    const dt = this.dernierTemps ? Math.min(0.1, (temps - this.dernierTemps) / 1000) : 0;
    this.dernierTemps = temps;

    if (this.glissement) {
      const g = this.glissement;
      const t = g.duree === 0 ? 1 : Math.min(1, (performance.now() - g.debut) / g.duree);
      if (g.courbe === "expo") {
        const k = sortieExpo(t);
        const m = (a: number, b: number) => a + (b - a) * k;
        this.pose = { th: m(g.depart.th, g.arrivee.th), r: m(g.depart.r, g.arrivee.r), yaw: m(g.depart.yaw, g.arrivee.yaw), y: m(g.depart.y, g.arrivee.y), pitch: m(g.depart.pitch, g.arrivee.pitch) };
      } else this.pose = interpolerPose(g.depart, g.arrivee, t);
      if (t >= 1) {
        this.glissement = null;
        if (g.ensuite === "focus" && this.options.telephone()) this.options.surBulle(this.centreFocus());
      }
    } else if (this.focus === null) {
      this.th += (this.thCible - this.th) * facteurLissage(dt);
      this.pose = poseMarche(this.th, this.format());
    }

    const bouge = this.focus !== null || (this.glissement !== null && this.glissement.courbe === "pose") || Math.abs(this.thCible - this.th) > 0.01;
    if (bouge !== this.enMouvement) {
      this.enMouvement = bouge;
      this.options.surMouvement(bouge);
    }

    this.onduler(temps);
    const { position, cible } = regardDepuisPose(this.pose);
    this.camera.position.set(...position);
    this.camera.lookAt(...cible);
    this.rendu.render(this.scene, this.camera);
    this.image = requestAnimationFrame(this.boucle);
  };

  detruire() {
    this.detruite = true;
    cancelAnimationFrame(this.image);
    this.observateur.disconnect();
    const canvas = this.rendu.domElement;
    canvas.removeEventListener("wheel", this.surMolette);
    canvas.removeEventListener("pointerdown", this.surAppui);
    canvas.removeEventListener("pointermove", this.surDeplacement);
    canvas.removeEventListener("pointerup", this.surRelache);
    canvas.removeEventListener("pointercancel", this.surRelache);
    canvas.removeEventListener("pointerleave", this.surQuitter);
    window.removeEventListener("keydown", this.surClavier);
    for (const objet of this.aLiberer) objet.dispose();
    this.rendu.dispose();
    canvas.remove();
  }
}
