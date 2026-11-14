import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexte/ContexteAuth";
import { LANGUES } from "@/lib/langues";
import { routes } from "@/lib/routes";
import logoViolet from "@/assets/img/data-dz-logo-api-violet.png";
import "./hero-api.css";

// Vidéo du globe (hébergée à l'extérieur) et sa première image, affichée avant la lecture et avec « réduire les animations ».
const URL_VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260912_104036_bd6924f6-3c8e-417e-8465-6d03c8c2e9e6.mp4";
const URL_POSTER =
  "https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/82e7eb75-c65f-490a-99b5-f3d1cad54200.webp";

/** Durée du fondu entre les deux lecteurs, qui masque la coupure de la boucle (identique à la transition CSS). */
const FONDU_S = 0.9;
/** Attente maximale des polices avant de lancer l'entrée, puis délai de sécurité pour retirer les classes. */
const ATTENTE_POLICES_MS = 900;
const SECURITE_ENTREE_MS = 2600;

const mouvementReduit = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

const Fleche = () => (
  <svg className="ha-arw" viewBox="0 0 12 10" fill="none" aria-hidden>
    <path d="M1 5h9.5M6.5 1l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

type Props = { urlDocs: string };

/**
 * Hero plein écran de la page /api : vidéo en boucle (deux lecteurs en fondu), barre de navigation propre à la page,
 * titre en deux lignes révélées, sous-titre et deux boutons. Mesures et animations : hero-api.css.
 */
export const HeroApi = ({ urlDocs }: Props) => {
  const { t, i18n } = useTranslation();
  const { session } = useAuth();
  const racine = useRef<HTMLElement>(null);
  const videoA = useRef<HTMLVideoElement>(null);
  const videoB = useRef<HTMLVideoElement>(null);
  const boutonMenu = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [menuOuvert, setMenuOuvert] = useState(false);
  // Lu une seule fois, avant le premier dessin : avec « réduire les animations », aucune classe d'entrée n'est posée.
  const [entree] = useState(() => !mouvementReduit());

  // Entrée : « go » une fois les polices prêtes (900 ms au plus), puis retrait des classes à la fin du dernier bouton.
  useLayoutEffect(() => {
    const element = racine.current;
    if (!element || !entree) return;
    let fini = false;
    const terminer = () => {
      if (fini) return;
      fini = true;
      element.classList.remove("anim", "go");
    };
    const lancer = () => {
      if (fini || element.classList.contains("go")) return;
      // Force un recalcul pour que l'état de départ soit bien dessiné avant les animations.
      void element.offsetWidth;
      element.classList.add("go");
    };
    const attente = window.setTimeout(lancer, ATTENTE_POLICES_MS);
    document.fonts?.ready.then(lancer).catch(lancer);
    const securite = window.setTimeout(terminer, SECURITE_ENTREE_MS);
    const finAnimation = (evenement: AnimationEvent) => {
      const cible = evenement.target as HTMLElement;
      if (evenement.animationName === "ha-pillIn" && cible.classList.contains("ha-btn-ghost") && cible.closest(".ha-ctas")) terminer();
    };
    element.addEventListener("animationend", finAnimation);
    return () => {
      window.clearTimeout(attente);
      window.clearTimeout(securite);
      element.removeEventListener("animationend", finAnimation);
    };
  }, [entree]);

  // Boucle sans coupure : un peu avant la fin, l'autre lecteur repart de zéro et le remplace en fondu.
  useEffect(() => {
    const a = videoA.current;
    const b = videoB.current;
    if (!a || !b) return;
    if (mouvementReduit()) {
      // Première image fixe, rien ne se lit.
      a.classList.add("is-active");
      a.pause();
      return;
    }
    let actif = a;
    let enAttente = b;
    let bascule = false;
    let image = 0;
    let minuteur = 0;

    const lire = (video: HTMLVideoElement) => {
      video.play()?.catch(() => {
        /* lecture automatique refusée : le poster reste affiché */
      });
    };
    const surveiller = () => {
      const duree = actif.duration;
      if (!bascule && Number.isFinite(duree) && duree > FONDU_S * 2 && actif.currentTime >= duree - FONDU_S) {
        bascule = true;
        const ancien = actif;
        enAttente.currentTime = 0;
        lire(enAttente);
        enAttente.classList.add("is-active");
        ancien.classList.remove("is-active");
        actif = enAttente;
        enAttente = ancien;
        minuteur = window.setTimeout(() => {
          ancien.pause();
          ancien.currentTime = 0;
          bascule = false;
        }, FONDU_S * 1000 + 50);
      }
      image = requestAnimationFrame(surveiller);
    };

    a.classList.add("is-active");
    lire(a);
    image = requestAnimationFrame(surveiller);
    return () => {
      cancelAnimationFrame(image);
      window.clearTimeout(minuteur);
      a.pause();
      b.pause();
    };
  }, []);

  // Menu mobile : fermeture au clic à l'extérieur, avec Échap, et si l'écran repasse en grand.
  useEffect(() => {
    if (!menuOuvert) return;
    const clic = (evenement: PointerEvent) => {
      const cible = evenement.target as Node;
      if (!menu.current?.contains(cible) && !boutonMenu.current?.contains(cible)) setMenuOuvert(false);
    };
    const touche = (evenement: KeyboardEvent) => {
      if (evenement.key === "Escape") {
        setMenuOuvert(false);
        boutonMenu.current?.focus();
      }
    };
    const largeur = window.matchMedia("(min-width: 1161px)");
    const redimension = () => largeur.matches && setMenuOuvert(false);
    document.addEventListener("pointerdown", clic);
    document.addEventListener("keydown", touche);
    largeur.addEventListener("change", redimension);
    return () => {
      document.removeEventListener("pointerdown", clic);
      document.removeEventListener("keydown", touche);
      largeur.removeEventListener("change", redimension);
    };
  }, [menuOuvert]);

  const fermer = () => setMenuOuvert(false);
  const lienCompte = session ? routes.profil : `${routes.connexion}?next=${encodeURIComponent(routes.api)}`;
  const texteCompte = session ? t("auth.monProfil") : t("auth.seConnecter");
  const langueActive = i18n.resolvedLanguage ?? i18n.language;

  const liens = [
    { href: "#demarrer", texte: t("pageApi.hero.nav.demarrer") },
    { href: "#routes", texte: t("pageApi.hero.nav.routes") },
    { href: "#donnees", texte: t("pageApi.hero.nav.donnees") },
    { href: urlDocs, texte: t("pageApi.hero.nav.docs"), externe: true },
  ];

  return (
    <section ref={racine} className={entree ? "ha anim" : "ha"} aria-labelledby="titre-hero-api">
      <div className="ha-bg" aria-hidden>
        <video ref={videoA} className="ha-video" src={URL_VIDEO} poster={URL_POSTER} muted playsInline preload="auto" tabIndex={-1} />
        <video ref={videoB} className="ha-video" src={URL_VIDEO} muted playsInline preload="auto" tabIndex={-1} />
      </div>

      <nav className="ha-nav" aria-label={t("pageApi.hero.nav.libelle")}>
        <Link to={routes.accueil} className="ha-logo" aria-label={t("pageApi.hero.nav.accueil")}>
          <img src={logoViolet} alt="" />
          <span>
            data-dz<span className="ha-logo-api">/api</span>
          </span>
        </Link>

        <div className="ha-links">
          {liens.map((lien) =>
            lien.externe ? (
              <a key={lien.href} href={lien.href} target="_blank" rel="noopener noreferrer">
                {lien.texte}
              </a>
            ) : (
              <a key={lien.href} href={lien.href}>
                {lien.texte}
              </a>
            )
          )}
          <Link to={routes.accueil}>{t("pageApi.hero.nav.catalogue")}</Link>
        </div>

        <div className="ha-actions">
          <Link to={lienCompte} className="ha-btn ha-btn-login">
            {texteCompte}
          </Link>
          <a href="#demarrer" className="ha-btn ha-btn-start">
            {t("pageApi.hero.commencer")}
            <Fleche />
          </a>
        </div>

        <button
          ref={boutonMenu}
          type="button"
          className="ha-burger"
          aria-label={menuOuvert ? t("pageApi.hero.nav.fermerMenu") : t("pageApi.hero.nav.ouvrirMenu")}
          aria-expanded={menuOuvert}
          aria-controls="menu-hero-api"
          onClick={() => setMenuOuvert((ouvert) => !ouvert)}
        >
          <span />
        </button>
      </nav>

      <div ref={menu} id="menu-hero-api" className={menuOuvert ? "ha-menu open" : "ha-menu"} hidden={!menuOuvert}>
        {liens.map((lien) =>
          lien.externe ? (
            <a key={lien.href} href={lien.href} target="_blank" rel="noopener noreferrer" onClick={fermer}>
              {lien.texte}
            </a>
          ) : (
            <a key={lien.href} href={lien.href} onClick={fermer}>
              {lien.texte}
            </a>
          )
        )}
        <Link to={routes.accueil} onClick={fermer}>
          {t("pageApi.hero.nav.catalogue")}
        </Link>
        <div className="ha-divider" />
        <div className="ha-menu-langue" role="group" aria-label={t("pageApi.hero.nav.langue")}>
          {LANGUES.map((langue) => (
            <button
              key={langue.code}
              type="button"
              lang={langue.code}
              aria-pressed={langueActive === langue.code}
              aria-label={langue.nom}
              onClick={() => i18n.changeLanguage(langue.code)}
            >
              {langue.court}
            </button>
          ))}
        </div>
        <Link to={lienCompte} onClick={fermer}>
          {texteCompte}
        </Link>
        <a href="#demarrer" className="ha-m-start" onClick={fermer}>
          {t("pageApi.hero.commencer")}
          <Fleche />
        </a>
      </div>

      <div className="ha-inner">
        <h1 id="titre-hero-api">
          <span className="ha-ln">
            <span className="ha-ln-i">{t("pageApi.hero.titre1")}</span>
          </span>
          <span className="ha-ln">
            <span className="ha-ln-i">{t("pageApi.hero.titre2")}</span>
          </span>
        </h1>
        <p className="ha-sub">
          {t("pageApi.hero.sous1")}
          <br />
          {t("pageApi.hero.sous2")}
          <br />
          {t("pageApi.hero.sous3")}
        </p>
        <div className="ha-ctas">
          <a href="#demarrer" className="ha-btn ha-btn-lg ha-btn-primary">
            {t("pageApi.hero.commencer")}
            <Fleche />
          </a>
          <a href={urlDocs} target="_blank" rel="noopener noreferrer" className="ha-btn ha-btn-lg ha-btn-ghost">
            {t("pageApi.hero.documentation")}
          </a>
        </div>
      </div>

      {/* Le fennec de New Algeria en version codeur, assis devant le globe (décoratif) */}
      <img
        className="ha-fennec"
        src="/mascotte/fennec-codeur.webp"
        width={544}
        height={520}
        alt=""
        aria-hidden="true"
        decoding="async"
        draggable={false}
      />
    </section>
  );
};
