import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, Loader2, Volume2, VolumeX } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { CustomMetaTags, URL_SITE_PUBLIC } from "@/components/MetaTags";
import type { EtatBalade, SceneBalade, TableauBalade } from "@/components/balade/SceneBalade";
import { chargerCatalogue } from "@/lib/catalogue";
import { chiffreCarte, sourceCourte } from "@/lib/carte-catalogue";
import { formaterNombre } from "@/lib/fichiers";
import { urlIllustration } from "@/lib/illustrations";
import { ordreBalade } from "@/lib/balade";
import { useMusiqueBalade } from "@/hooks/use-musique-balade";
import { routes } from "@/lib/routes";
import { texteTraduit } from "@/lib/traduction";
import { cn } from "@/lib/utils";
import "./balade.css";

/** Même découpage que le CSS (`balade.css`) : téléphone, tablette en portrait, téléphone à l'horizontale. */
const REQUETE_TELEPHONE =
  "(max-width: 819px), (orientation: portrait) and (max-width: 1100px), (orientation: landscape) and (max-height: 500px)";

const reduireAnimations = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Balade : une galerie 3D en anneau où les illustrations des données sont accrochées aux murs.
 * Molette, glisser, flèches ou clavier pour avancer ; un clic sur un tableau s'en approche, un second ouvre sa fiche.
 */
export default function PageBalade() {
  const { t, i18n } = useTranslation();
  const langue = i18n.language;
  const navigate = useNavigate();
  const conteneur = useRef<HTMLDivElement>(null);
  const scene = useRef<SceneBalade | null>(null);
  const [etat, setEtat] = useState<EtatBalade>("marche");
  const [bulle, setBulle] = useState<{ x: number; y: number } | null>(null);
  const [pret, setPret] = useState(false);
  const [sortie, setSortie] = useState(false);
  const [webglAbsent, setWebglAbsent] = useState(false);
  const [enMouvement, setEnMouvement] = useState(false);
  const musique = useMusiqueBalade();
  const arreterMusique = useRef(musique.arreter);
  arreterMusique.current = musique.arreter;

  const catalogue = useQuery({ queryKey: ["catalogue", "", null], queryFn: () => chargerCatalogue({ terme: "", categorie: null }) });

  const tableaux = useMemo<TableauBalade[]>(() => {
    const lang = langue === "ar" || langue === "en" ? langue : "fr";
    return ordreBalade(catalogue.data ?? []).map((donnee) => {
      const titre = texteTraduit(donnee.titre, langue);
      const chiffre = chiffreCarte(donnee, titre, lang);
      const texteChiffre = !chiffre
        ? ""
        : chiffre.genre === "compte"
          ? `${formaterNombre(chiffre.nombre, langue)} ${chiffre.unite}`
          : `${t("catalogue.carte.indicateurs", { count: chiffre.nombre })}${chiffre.debut !== null && chiffre.fin !== null ? ` · ${chiffre.debut}–${chiffre.fin}` : ""}`;
      return {
        slug: donnee.slug,
        image: urlIllustration(donnee, "petite"),
        titre,
        source: donnee.sources?.nom ? sourceCourte(donnee.sources.nom) : "data-dz",
        chiffre: texteChiffre,
      };
    });
  }, [catalogue.data, langue, t]);

  useEffect(() => {
    const element = conteneur.current;
    if (!element || tableaux.length === 0) return;
    let annule = false;
    let instance: SceneBalade | null = null;
    const telephone = window.matchMedia(REQUETE_TELEPHONE);
    const portrait = window.matchMedia("(orientation: portrait)");
    // three.js n'est chargé que sur cette page.
    import("@/components/balade/SceneBalade").then(({ SceneBalade }) => {
      if (annule) return;
      try {
        instance = new SceneBalade({
          conteneur: element,
          tableaux,
          rtl: i18n.dir() === "rtl",
          police: getComputedStyle(document.body).fontFamily || "sans-serif",
          reduireAnimations: reduireAnimations(),
          telephone: () => telephone.matches,
          portrait: () => portrait.matches,
          surEtat: setEtat,
          surMouvement: setEnMouvement,
          surBulle: setBulle,
          surOuvrir: (slug) => {
            setSortie(true);
            arreterMusique.current();
            window.setTimeout(() => navigate(routes.donnee(slug)), reduireAnimations() ? 0 : 300);
          },
          surPret: () => {
            setPret(true);
            instance?.entrer();
          },
        });
        scene.current = instance;
      } catch {
        setWebglAbsent(true);
      }
    });
    return () => {
      annule = true;
      instance?.detruire();
      scene.current = null;
    };
  }, [tableaux, i18n, navigate]);

  const enCours = !pret && !webglAbsent && !catalogue.isError;
  const IconePrecedent = i18n.dir() === "rtl" ? ArrowRight : ArrowLeft;
  const IconeSuivant = i18n.dir() === "rtl" ? ArrowLeft : ArrowRight;

  return (
    <div className="balade">
      <CustomMetaTags title={`${t("balade.titre")} - data-dz`} description={t("balade.metaDescription")} path={routes.balade} image={`${URL_SITE_PUBLIC}/og-balade.jpg`} />
      <Navbar />

      <main className="balade-scene" ref={conteneur} aria-label={t("balade.titre")}>
        <div className={cn("balade-voile", pret && "balade-voile-parti")} aria-hidden />
      </main>

      {enCours && (
        <div className="balade-chargement" role="status">
          <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
          <span className="sr-only">{t("balade.chargement")}</span>
        </div>
      )}

      {(webglAbsent || catalogue.isError) && (
        <div className="balade-erreur" role="alert">
          <p>{webglAbsent ? t("balade.sansWebgl") : t("balade.erreur")}</p>
          <Link to={routes.catalogue}>{t("balade.voirCatalogue")} →</Link>
        </div>
      )}

      <div className={cn("balade-ui", pret && "balade-ui-entree")}>
        <div className="balade-fleches">
          <button type="button" onClick={() => scene.current?.precedent()} aria-label={t("balade.precedent")}>
            <IconePrecedent aria-hidden />
          </button>
          <button type="button" onClick={() => scene.current?.suivant()} aria-label={t("balade.suivant")}>
            <IconeSuivant aria-hidden />
          </button>
        </div>

        <p className="balade-aide" aria-live="polite">
          <span className="balade-masque"><span>{etat === "focus" ? t("balade.aideFocus1") : t("balade.aideMarche1")}</span></span>
          <span className="balade-masque"><span>{etat === "focus" ? t("balade.aideFocus2") : t("balade.aideMarche2")}</span></span>
        </p>

        {musique.disponible && (
          <button
            type="button"
            className="balade-son"
            onClick={musique.basculer}
            aria-pressed={!musique.coupe}
            aria-label={musique.coupe ? t("balade.sonActiver") : t("balade.sonCouper")}
            title={musique.coupe ? t("balade.sonActiver") : t("balade.sonCouper")}
          >
            {musique.coupe ? <VolumeX aria-hidden /> : <Volume2 aria-hidden />}
          </button>
        )}

        <div className="balade-bascule" role="group" aria-label={t("balade.vue")}>
          <span className="balade-bascule-actif" aria-current="page">{t("balade.vueBalade")}</span>
          <Link to={routes.catalogue}>{t("balade.vueListe")}</Link>
        </div>

        <div className={cn("balade-legende", enMouvement && "balade-legende-cachee")}>
          <p className="balade-surtitre balade-masque"><span>{t("balade.surtitre")}</span></p>
          <div className="balade-titre-ligne">
            <h1 className="balade-titre">
              <span className="balade-masque"><span>{t("balade.titreLigne1")}</span></span>
              <span className="balade-masque">
                <span>
                  {t("balade.titreLigne2")}
                  <span className="balade-surligne">
                    {t("balade.titreSurligne")}
                    <svg viewBox="0 0 300 20" preserveAspectRatio="none" aria-hidden>
                      <path d="M4 14 C 80 4, 200 2, 296 10" />
                    </svg>
                  </span>
                </span>
              </span>
            </h1>
            <div className="balade-cote">
              <p className="balade-sous-titre balade-masque"><span>{t("balade.sousTitre")}</span></p>
              <Link to={routes.catalogue} className="balade-lien balade-masque">
                <span>{t("balade.voirCatalogue")} {i18n.dir() === "rtl" ? "←" : "→"}</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div
        className={cn("balade-bulle", bulle && "balade-bulle-visible")}
        style={bulle ? { left: bulle.x, top: bulle.y } : undefined}
        aria-hidden
      >
        {t("balade.ouvrir")}
      </div>

      <div className={cn("balade-sortie", sortie && "balade-sortie-active")} aria-hidden />
    </div>
  );
}
