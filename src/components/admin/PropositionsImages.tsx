import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ExternalLink, Loader2, RefreshCw, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  NB_PROPOSITIONS,
  chercherAvecRepli,
  chercherImagesLibres,
  telechargerImage,
  termesRecherche,
  type ImageCommons,
} from "@/lib/images-commons";
import { cn } from "@/lib/utils";

interface PropositionsImagesProps {
  /** Titre de la donnée (fr / en / ar) : sert à composer la première recherche. */
  titre: { fr?: string; en?: string };
  /** Image choisie : à recadrer et à garder comme illustration. Rejette si l'image est illisible. */
  onChoisir: (image: Blob) => Promise<void>;
  desactive?: boolean;
}

/**
 * « Proposer des images » : photos libres de Wikimedia Commons (CC0 ou domaine public, sans attribution à afficher)
 * cherchées à partir du titre ; un clic en fait l'illustration. Les termes restent modifiables.
 */
export const PropositionsImages = ({ titre, onChoisir, desactive }: PropositionsImagesProps) => {
  const { t } = useTranslation();
  const [ouvert, setOuvert] = useState(false);
  const [termes, setTermes] = useState("");
  const [images, setImages] = useState<ImageCommons[]>([]);
  const [debut, setDebut] = useState(0);
  const [suite, setSuite] = useState<{ termes: string; decalage: number } | null>(null);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(false);
  const [choisie, setChoisie] = useState<string | null>(null);
  const [enCoursChoix, setEnCoursChoix] = useState<string | null>(null);
  // Vignettes qui ne se chargent pas (fichier absent, limite de Commons) : retirées de la grille.
  const [cassees, setCassees] = useState<Set<string>>(() => new Set());
  const requete = useRef(0);

  const chercher = async (recherche: string) => {
    const numero = ++requete.current;
    setChargement(true);
    setErreur(false);
    setImages([]);
    setDebut(0);
    setSuite(null);
    try {
      const resultat = await chercherAvecRepli(recherche);
      if (numero !== requete.current) return;
      setImages(resultat.images);
      setSuite(resultat.suite === null ? null : { termes: resultat.termes, decalage: resultat.suite });
      if (resultat.termes !== recherche.trim()) setTermes(resultat.termes);
    } catch {
      if (numero === requete.current) setErreur(true);
    } finally {
      if (numero === requete.current) setChargement(false);
    }
  };

  // Première ouverture : recherche à partir du titre.
  useEffect(() => {
    if (!ouvert || termes) return;
    const depart = termesRecherche(titre);
    setTermes(depart);
    if (depart) void chercher(depart);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ouvert]);

  /** « Autres images » : la suite du lot déjà chargé, puis le lot suivant de Commons. */
  const autres = async () => {
    if (debut + NB_PROPOSITIONS < utilisables.length) {
      setDebut(debut + NB_PROPOSITIONS);
      return;
    }
    if (!suite) {
      setDebut(0);
      return;
    }
    const numero = ++requete.current;
    setChargement(true);
    setErreur(false);
    try {
      const resultat = await chercherImagesLibres(suite.termes, suite.decalage);
      if (numero !== requete.current) return;
      if (resultat.images.length > 0) {
        setImages(resultat.images);
        setDebut(0);
      }
      setSuite(resultat.suite === null ? null : { termes: suite.termes, decalage: resultat.suite });
    } catch {
      if (numero === requete.current) setErreur(true);
    } finally {
      if (numero === requete.current) setChargement(false);
    }
  };

  const choisir = async (image: ImageCommons) => {
    setEnCoursChoix(image.image);
    setErreur(false);
    try {
      await onChoisir(await telechargerImage(image));
      setChoisie(image.image);
    } catch {
      setErreur(true);
    } finally {
      setEnCoursChoix(null);
    }
  };

  const utilisables = images.filter((image) => !cassees.has(image.image));
  const visibles = utilisables.slice(debut, debut + NB_PROPOSITIONS);
  const plus = debut + NB_PROPOSITIONS < utilisables.length || suite !== null || debut > 0;

  if (!ouvert) {
    return (
      <Button type="button" size="sm" variant="outline" className="w-fit gap-1.5" disabled={desactive} onClick={() => setOuvert(true)}>
        <Sparkles className="h-4 w-4" aria-hidden />
        {t("adminDonnees.propositionsImages.bouton")}
      </Button>
    );
  }

  return (
    <div className="grid gap-3 rounded-xl border bg-muted/40 p-3">
      <form
        className="flex gap-2"
        onSubmit={(evenement) => {
          evenement.preventDefault();
          if (termes.trim()) void chercher(termes);
        }}
      >
        <Input
          value={termes}
          onChange={(evenement) => setTermes(evenement.target.value)}
          placeholder={t("adminDonnees.propositionsImages.placeholder")}
          aria-label={t("adminDonnees.propositionsImages.placeholder")}
          className="text-base"
        />
        <Button type="submit" size="sm" variant="secondary" className="shrink-0 gap-1.5" disabled={chargement || !termes.trim()}>
          <Search className="h-4 w-4" aria-hidden />
          {t("adminDonnees.propositionsImages.chercher")}
        </Button>
      </form>

      {chargement ? (
        <div className="grid grid-cols-3 gap-2" aria-busy>
          {Array.from({ length: NB_PROPOSITIONS }, (_, index) => (
            <div key={index} className="aspect-[5/3] animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : visibles.length > 0 ? (
        <ul className="grid grid-cols-3 gap-2">
          {visibles.map((image) => (
            <li key={image.image} className="group relative">
              <button
                type="button"
                onClick={() => choisir(image)}
                disabled={desactive || enCoursChoix !== null}
                title={image.titre}
                aria-label={t("adminDonnees.propositionsImages.choisir", { titre: image.titre })}
                className={cn(
                  "relative block aspect-[5/3] w-full overflow-hidden rounded-lg border-2 border-transparent bg-muted transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  choisie === image.image ? "border-emerald-500" : "hover:border-emerald-400"
                )}
              >
                <img
                  src={image.vignette}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover"
                  onError={() => setCassees((actuelles) => new Set(actuelles).add(image.image))}
                />
                {enCoursChoix === image.image && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <Loader2 className="h-5 w-5 animate-spin text-white" aria-hidden />
                  </span>
                )}
                {choisie === image.image && (
                  <span className="absolute end-1 top-1 rounded-full bg-emerald-500 p-0.5 text-white">
                    <Check className="h-3.5 w-3.5" aria-hidden />
                  </span>
                )}
              </button>
              <a
                href={image.page}
                target="_blank"
                rel="noreferrer"
                className="absolute bottom-1 start-1 hidden rounded bg-black/60 p-1 text-white group-hover:block focus-visible:block"
                aria-label={t("adminDonnees.propositionsImages.voirPage")}
              >
                <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-4 text-center text-sm text-muted-foreground">
          {erreur ? t("adminDonnees.propositionsImages.erreur") : t("adminDonnees.propositionsImages.aucune")}
        </p>
      )}

      {erreur && visibles.length > 0 && <p className="text-sm text-destructive">{t("adminDonnees.propositionsImages.erreur")}</p>}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{t("adminDonnees.propositionsImages.aide")}</p>
        {plus && !chargement && (
          <Button type="button" size="sm" variant="ghost" className="gap-1.5" onClick={autres}>
            <RefreshCw className="h-4 w-4" aria-hidden />
            {t("adminDonnees.propositionsImages.autres")}
          </Button>
        )}
      </div>
    </div>
  );
};
