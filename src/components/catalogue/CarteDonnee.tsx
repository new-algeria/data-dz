import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Check, ChartLine, Download, Map as IconeCarte, Package, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BadgeCategorie } from "@/components/BadgeCategorie";
import { BorderBeam } from "@/components/ui/border-beam";
import { BoutonFavori } from "@/components/communaute/BoutonFavori";
import { DialogueTelechargement } from "@/components/fiche/DialogueTelechargement";
import { chargerLicencesApi } from "@/lib/admin-donnees";
import { useSeuilNouveautes } from "@/hooks/use-nouveautes";
import { actionVisuelle, chiffreCarte, estLibre, estNouvelle, estRestreinte, ilYA, JOURS_NOUVEAU, sourceCourte } from "@/lib/carte-catalogue";
import { urlIllustration } from "@/lib/illustrations";
import { texteTraduit } from "@/lib/traduction";
import { formaterNombre } from "@/lib/fichiers";
import { useLangue } from "@/hooks/use-langue";
import type { Categorie, ResumeDonnee } from "@/lib/types";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

interface CarteDonneeProps {
  donnee: ResumeDonnee;
  categorie?: Categorie;
}

/**
 * Carte d'une donnée, version grand public : illustration en grand, titre et résumé, un chiffre en vraies unités,
 * licence / source / fraîcheur, puis « Voir la carte » ou « Graphique » et « Télécharger ».
 * Toute la carte mène à la fiche (lien du titre étendu) ; l'étoile et les boutons passent au-dessus.
 */
export function CarteDonnee({ donnee, categorie }: CarteDonneeProps) {
  const { t } = useTranslation();
  const langue = useLangue();
  const titre = texteTraduit(donnee.titre, langue);
  const description = texteTraduit(donnee.description, langue);
  const { data: licences = [] } = useQuery({ queryKey: ["licences-api"], queryFn: chargerLicencesApi, staleTime: 60 * 60 * 1000 });
  const libre = estLibre(licences.find((licence) => licence.code === donnee.licence_code));
  const chiffre = chiffreCarte(donnee, titre, langue === "ar" || langue === "en" ? langue : "fr");
  const action = actionVisuelle(donnee);
  const ressources = donnee.ressources ?? [];
  const principal = (ressources.find((ressource) => ressource.principal) ?? ressources[0])?.nom;
  const fraicheur = ilYA(donnee.mis_a_jour_le, langue);
  const seuilNouveautes = useSeuilNouveautes();
  const nouvelle = estNouvelle(donnee, seuilNouveautes);

  return (
    // Le lien du titre couvre toute la carte (after:inset-0) ; l'étoile et les boutons passent au-dessus (z-10).
    <div className="relative h-full w-full">
      <Card className="group relative isolate flex h-full flex-col overflow-hidden bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-900/10 focus-within:ring-2 focus-within:ring-emerald-500 dark:bg-gray-800">
        <BorderBeam size={300} duration={20} colorFrom="#1a365d" colorTo="#10b981" className="opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {/* 1. Illustration en grand, badges et étoile par-dessus */}
        <div className="relative h-[150px] w-full shrink-0 overflow-hidden bg-muted">
          <img
            src={urlIllustration(donnee, "petite")}
            alt=""
            aria-hidden
            loading="lazy"
            decoding="async"
            onError={(e) => (e.currentTarget.style.display = "none")}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/35 to-transparent" aria-hidden />
          {/* Place laissée à l'étoile, plus large quand elle affiche le nombre de favoris (à partir de 2). */}
          <div className={`absolute inset-x-3 top-3 flex items-start gap-2 ${donnee.nb_favoris > 1 ? "pe-[4.5rem]" : "pe-11"}`}>
            {categorie && (
              <BadgeCategorie nom={categorie.nom} icone={categorie.icone} className="shadow-sm dark:bg-gray-900/85" />
            )}
            {nouvelle && (
              <span
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 shadow-sm dark:bg-amber-400 dark:text-amber-950"
                title={t("catalogue.carte.nouveauAide", { count: JOURS_NOUVEAU })}
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                {t("catalogue.carte.nouveau")}
              </span>
            )}
          </div>
          <BoutonFavori donnee={donnee} taille="icone" className="absolute end-3 top-3 z-10" />
        </div>

        <div className="flex flex-1 flex-col gap-3 p-5">
          {/* 2. Titre et résumé */}
          <div className="space-y-1.5">
            <h3 className="line-clamp-2 text-lg font-semibold leading-snug">
              <Link to={routes.donnee(donnee.slug)} className="after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none">
                {titre}
              </Link>
            </h3>
            {description && <p className="line-clamp-2 text-sm text-gray-600 dark:text-gray-400">{description}</p>}
          </div>

          {/* 3. Le chiffre, en vraies unités */}
          {chiffre && (
            <p className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-3xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">{formaterNombre(chiffre.nombre, langue)}</span>
              <span className="text-gray-600 dark:text-gray-300">
                {chiffre.genre === "compte" ? (
                  chiffre.unite
                ) : (
                  <>
                    {t("catalogue.carte.indicateurs", { count: chiffre.nombre })}
                    {chiffre.debut !== null && chiffre.fin !== null && (
                      <>
                        {t("catalogue.carte.separateurPeriode")}
                        {/* bdi : les années gardent leur ordre gauche → droite, même en arabe */}
                        <bdi dir="ltr">
                          {chiffre.debut} → {chiffre.fin}
                        </bdi>
                      </>
                    )}
                  </>
                )}
              </span>
            </p>
          )}

          {/* 4. Licence, source, fraîcheur */}
          <div className="mt-auto space-y-1 text-xs text-muted-foreground">
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {libre && (
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                  <Check className="h-3.5 w-3.5" aria-hidden />
                  {t("catalogue.carte.libre")}
                </span>
              )}
              {donnee.sources?.nom && <span className="truncate">{t("catalogue.carte.source", { nom: sourceCourte(donnee.sources.nom) })}</span>}
            </p>
            {fraicheur && <p>{t("catalogue.carte.misAJour", { quand: fraicheur })}</p>}
          </div>

          {/* 5. Actions (données non redistribuables : lien vers le paquet de la source à la place) */}
          {estRestreinte(donnee) && donnee.lien_paquet && (
            <div className="relative z-10 pt-1">
              <Button asChild variant="outline" className="w-full gap-2 dark:border-white/15 dark:bg-transparent dark:hover:bg-white/10">
                <a href={donnee.lien_paquet} target="_blank" rel="noopener noreferrer">
                  <Package className="h-4 w-4" aria-hidden />
                  {t("fiche.restreinte.bouton")}
                </a>
              </Button>
            </div>
          )}
          {(action || principal) && (
            <div className={cn("relative z-10 grid gap-2 pt-1", action && principal ? "grid-cols-2" : "grid-cols-1")}>
              {action && (
                <Button asChild className="gap-2 bg-emerald-700 text-white hover:bg-emerald-800">
                  <Link to={routes.donnee(donnee.slug)}>
                    {action === "carte" ? <IconeCarte className="h-4 w-4" aria-hidden /> : <ChartLine className="h-4 w-4" aria-hidden />}
                    {t(action === "carte" ? "catalogue.carte.voirCarte" : "catalogue.carte.graphique")}
                  </Link>
                </Button>
              )}
              {principal && (
                <DialogueTelechargement
                  ressources={ressources}
                  nomInitial={principal}
                  declencheur={
                    <Button variant="outline" className="gap-2 dark:border-white/15 dark:bg-transparent dark:hover:bg-white/10" aria-label={t("catalogue.carte.telechargerDonnee", { titre })}>
                      <Download className="h-4 w-4" aria-hidden />
                      {t("fiche.telecharger")}
                    </Button>
                  }
                />
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

export function CarteDonneeSquelette() {
  return (
    <Card className="h-full overflow-hidden bg-white dark:bg-gray-800">
      <div className="h-[150px] animate-pulse bg-muted" />
      <div className="space-y-3 p-5">
        <div className="h-6 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-8 w-1/3 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-2 gap-2 pt-2">
          <div className="h-10 animate-pulse rounded-md bg-muted" />
          <div className="h-10 animate-pulse rounded-md bg-muted" />
        </div>
      </div>
    </Card>
  );
}
