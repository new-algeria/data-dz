import { useState } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Check, ExternalLink, Globe2, GraduationCap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ConnexionTelechargement } from "@/components/fiche/ConnexionTelechargement";
import { useAuth } from "@/contexte/ContexteAuth";
import { DOMAINES_IA, estCleLicence, imageRessource, type RessourceIA } from "@/lib/ressources-ia";
import { cn } from "@/lib/utils";

interface CarteRessourceIAProps {
  ressource: RessourceIA;
}

/**
 * Carte d'une ressource mondiale pour l'IA, au gabarit des cartes du catalogue mais avec sa propre identité
 * (cadre indigo en pointillés, badge « Ressource mondiale », « Hébergé par… »). Rien n'est hébergé par data-dz :
 * la carte ouvre la source officielle dans un nouvel onglet, après connexion (comme les téléchargements).
 */
export function CarteRessourceIA({ ressource }: CarteRessourceIAProps) {
  const { t } = useTranslation();
  const { session } = useAuth();
  const location = useLocation();
  const [connexion, setConnexion] = useState(false);
  const cle = `ressourcesIA.ressources.${ressource.id}`;
  const domaine = DOMAINES_IA.find((element) => element.code === ressource.domaine);

  const ouvrir = () => {
    if (!session) {
      setConnexion(true);
      return;
    }
    window.open(ressource.url, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <Card className="group relative isolate flex h-full flex-col overflow-hidden border-[1.5px] border-dashed border-indigo-300 bg-gradient-to-b from-indigo-50/70 to-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-900/10 focus-within:ring-2 focus-within:ring-indigo-500 dark:border-indigo-500/50 dark:from-indigo-950/40 dark:to-gray-800">
        <div className="relative h-[150px] w-full shrink-0 overflow-hidden bg-indigo-100 dark:bg-indigo-950">
          <img
            src={imageRessource(ressource)}
            alt=""
            aria-hidden
            loading="lazy"
            decoding="async"
            onError={(e) => (e.currentTarget.style.display = "none")}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none"
          />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/45 to-transparent" aria-hidden />
          <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-2.5 py-0.5 text-xs font-semibold text-white shadow-sm">
              <Globe2 className="h-3.5 w-3.5" aria-hidden />
              {t("ressourcesIA.badge")}
            </span>
            {domaine && (
              <span className="truncate rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-semibold text-gray-900 shadow-sm dark:bg-gray-900/85 dark:text-white">
                {domaine.icone} {t(`ressourcesIA.domaines.${domaine.code}.nom`)}
              </span>
            )}
          </div>
          {ressource.credit.page && (
            <a
              href={ressource.credit.page}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-1.5 end-2 z-10 max-w-[85%] truncate rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white/90 hover:bg-black/70"
              title={t("ressourcesIA.creditImage", { auteur: ressource.credit.auteur, licence: ressource.credit.licence })}
            >
              {t("ressourcesIA.creditImage", { auteur: ressource.credit.auteur, licence: ressource.credit.licence })}
            </a>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-3 p-5">
          <div className="space-y-1.5">
            <h3 className="line-clamp-2 text-lg font-semibold leading-snug">
              {/* Le bouton du titre couvre toute la carte (after:inset-0) ; le crédit de l'image passe au-dessus. */}
              <button type="button" onClick={ouvrir} className="text-start after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none">
                {ressource.nom}
              </button>
            </h3>
            <p className="line-clamp-2 text-sm text-gray-600 dark:text-gray-400">{t(`${cle}.description`)}</p>
          </div>

          {ressource.chiffre && (
            <p className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-3xl font-bold tabular-nums text-indigo-700 dark:text-indigo-300" dir="ltr">{ressource.chiffre}</span>
              <span className="text-gray-600 dark:text-gray-300">{t(`${cle}.chiffre`)}</span>
            </p>
          )}

          <p className="flex items-start gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-900 dark:bg-indigo-500/10 dark:text-indigo-100">
            <GraduationCap className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{t(`${cle}.idee`)}</span>
          </p>

          <div className="flex flex-wrap gap-1.5">
            {ressource.types.map((type) => (
              <span key={type} className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                {t(`ressourcesIA.types.${type}`)}
              </span>
            ))}
          </div>

          <div className="mt-auto space-y-1 text-xs text-muted-foreground">
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span
                className={cn(
                  "inline-flex items-center gap-1 font-semibold",
                  ressource.licenceRestreinte ? "text-amber-700 dark:text-amber-400" : "text-indigo-700 dark:text-indigo-300"
                )}
              >
                <Check className="h-3.5 w-3.5" aria-hidden />
                {estCleLicence(ressource.licence) ? t(`ressourcesIA.licences.${ressource.licence}`) : ressource.licence}
              </span>
              <span>{t(`ressourcesIA.acces.${ressource.acces}`)}</span>
            </p>
            <p className="truncate">{t("ressourcesIA.hebergePar", { nom: ressource.hebergeur })}</p>
          </div>

          <span className="relative inline-flex h-10 items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 text-sm font-semibold text-white transition-colors group-hover:bg-indigo-700" aria-hidden>
            {t("ressourcesIA.voirSource")}
            <ExternalLink className="h-4 w-4" />
          </span>
        </div>
      </Card>

      <Dialog open={connexion} onOpenChange={setConnexion}>
        <DialogContent className="sm:max-w-md">
          <ConnexionTelechargement
            suite={`${location.pathname}${location.search}${location.hash}`}
            titre={t("ressourcesIA.connexion.titre")}
            description={t("ressourcesIA.connexion.description", { nom: ressource.nom })}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
