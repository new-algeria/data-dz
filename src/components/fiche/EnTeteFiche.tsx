import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BadgeCheck, ChartLine, ChevronDown, ChevronRight, Download, Loader2, Map as IconeCarte, Share2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BadgeCategorie } from "@/components/BadgeCategorie";
import { BoutonFavori } from "@/components/communaute/BoutonFavori";
import { ErreurApi } from "@/lib/api";
import { actionVisuelle, chiffreCarte } from "@/lib/carte-catalogue";
import { verifierLien } from "@/lib/telechargement";
import { deuxPhrases, formatsBouton, ressourcePrincipale, wilayasCouvertes } from "@/lib/fiche";
import { formaterNombre } from "@/lib/fichiers";
import { urlIllustration } from "@/lib/illustrations";
import { texteTraduit } from "@/lib/traduction";
import { useLangue } from "@/hooks/use-langue";
import type { Donnee, Ressource } from "@/lib/types";
import { catalogueParCategorie, routes } from "@/lib/routes";
import { DialogueTelechargement } from "./DialogueTelechargement";

/** « il y a 2 j » : forme courte, pour le chiffre clé de fraîcheur. */
function ilYACourt(date: string | undefined, langue: string): string | null {
  const instant = date ? Date.parse(date) : Number.NaN;
  if (Number.isNaN(instant)) return null;
  const jours = Math.max(0, Math.floor((Date.now() - instant) / 86_400_000));
  // Arabe en forme longue : la forme courte donne « خلال » (futur) pour certains mois passés.
  const format = new Intl.RelativeTimeFormat(langue, { numeric: "always", style: langue === "ar" ? "long" : "short" });
  if (jours < 30) return format.format(-jours, "day");
  if (jours < 365) return format.format(-Math.floor(jours / 30), "month");
  return format.format(-Math.floor(jours / 365), "year");
}

const ChiffreCle = ({ valeur, libelle }: { valeur: string; libelle: string }) => (
  <div className="min-w-0">
    <p className="text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400 md:text-3xl">{valeur}</p>
    <p className="text-sm text-muted-foreground">{libelle}</p>
  </div>
);

/** « Télécharger (Excel) ▾ » : Excel en un clic, CSV / JSON / GeoJSON dans le menu, les autres fichiers dans le dialogue. */
const BoutonTelecharger = ({ ressources }: { ressources: Ressource[] }) => {
  const { t } = useTranslation();
  const [enCours, setEnCours] = useState<string | null>(null);
  const [dialogue, setDialogue] = useState(false);
  const formats = formatsBouton(ressourcePrincipale(ressources));
  if (!formats) return null;
  const nomFormat = (format: string) => t(`telechargement.formatsCourts.${format}`, { defaultValue: format.toUpperCase() });

  const telecharger = async (url: string, format: string) => {
    setEnCours(format);
    try {
      await verifierLien(url);
      window.location.assign(url);
    } catch (erreur) {
      toast.error(erreur instanceof ErreurApi && erreur.statut === 422 ? t("telechargement.indisponible") : t("telechargement.erreur"));
    } finally {
      setEnCours(null);
    }
  };

  return (
    <div className="inline-flex rounded-lg shadow-lg shadow-emerald-700/20">
      <Button
        size="lg"
        onClick={() => void telecharger(formats.principal.url, formats.principal.format)}
        disabled={enCours !== null}
        className="gap-2 rounded-e-none bg-emerald-700 text-white hover:bg-emerald-800"
      >
        {enCours === formats.principal.format ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Download className="h-5 w-5" aria-hidden />}
        {t("fiche.telecharger")}
        <span className="rounded bg-white/20 px-1.5 py-0.5 text-xs font-semibold" dir="ltr">
          {nomFormat(formats.principal.format)}
        </span>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="lg"
            disabled={enCours !== null}
            className="rounded-s-none border-s border-white/25 bg-emerald-700 px-3 text-white hover:bg-emerald-800"
            aria-label={t("fiche.entete.autresFormats")}
          >
            {enCours && enCours !== formats.principal.format ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ChevronDown className="h-4 w-4" aria-hidden />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          <DropdownMenuLabel>{t("fiche.entete.autresFormats")}</DropdownMenuLabel>
          {formats.autres.map((element) => (
            <DropdownMenuItem key={element.format} onSelect={() => void telecharger(element.url, element.format)} className="gap-2">
              <Download className="h-4 w-4" aria-hidden />
              <span dir="ltr">{nomFormat(element.format)}</span>
            </DropdownMenuItem>
          ))}
          {ressources.length > 1 && (
            <>
              <DropdownMenuSeparator />
              {/* Les autres fichiers et toutes les conversions : le dialogue complet, ouvert hors du menu. */}
              <DropdownMenuItem onSelect={() => setDialogue(true)}>{t("fiche.entete.autresFichiers", { count: ressources.length })}</DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {ressources.length > 1 && <DialogueTelechargement ressources={ressources} declencheur={null} ouvert={dialogue} onOuvertChange={setDialogue} />}
    </div>
  );
};

const BoutonPartager = ({ titre }: { titre: string }) => {
  const { t } = useTranslation();
  const partager = async () => {
    const url = window.location.href.split("#")[0];
    try {
      if (navigator.share) await navigator.share({ title: titre, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success(t("fiche.entete.lienCopie"));
      }
    } catch {
      // Partage annulé par l'utilisateur : rien à faire.
    }
  };
  return (
    <button
      type="button"
      onClick={() => void partager()}
      title={t("fiche.entete.partager")}
      aria-label={t("fiche.entete.partager")}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white/90 text-gray-700 shadow-sm transition-colors hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-white/10 dark:bg-gray-900/80 dark:text-gray-200"
    >
      <Share2 className="h-4 w-4" aria-hidden />
    </button>
  );
};

/**
 * En-tête de la fiche, en deux colonnes (une seule sur mobile, illustration d'abord) : à gauche badges, titre,
 * résumé, source, trois chiffres clés et actions ; à droite l'illustration, posée sans carte ni bordure.
 * Le texte ne passe jamais sur l'illustration.
 */
export const EnTeteFiche = ({ donnee }: { donnee: Donnee }) => {
  const { t } = useTranslation();
  const langue = useLangue();
  const titre = texteTraduit(donnee.titre, langue);
  const resume = deuxPhrases(texteTraduit(donnee.description, langue));
  const nomCategorie = donnee.categories ? texteTraduit(donnee.categories.nom, langue) : null;
  const chiffre = chiffreCarte(donnee, titre, langue === "ar" || langue === "en" ? langue : "fr");
  const wilayas = wilayasCouvertes(donnee);
  const fraicheur = ilYACourt(donnee.mis_a_jour_le ?? donnee.versions?.publie_le ?? undefined, langue);
  const action = actionVisuelle(donnee);

  return (
    <section className="border-b border-emerald-900/5 bg-gradient-to-b from-emerald-50 via-white to-gray-50 pt-16 dark:border-white/5 dark:from-[#03140f] dark:via-gray-900 dark:to-gray-900">
      <div className="container mx-auto px-4 pb-10 pt-6 md:pb-12">
        <nav aria-label={t("fiche.filAriane")} className="mb-5 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link to={routes.catalogue} className="hover:text-foreground">
            {t("fiche.catalogue")}
          </Link>
          {donnee.categories && nomCategorie && (
            <>
              <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden />
              <Link to={catalogueParCategorie(donnee.categories.slug)} className="hover:text-foreground">
                {nomCategorie}
              </Link>
            </>
          )}
        </nav>

        {/* minmax(0,1fr) : un titre ou un lien long n'élargit jamais la grille au-delà de l'écran. */}
        <div className="grid grid-cols-[minmax(0,1fr)] items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:gap-12">
          {/* Illustration : en premier sur mobile, à droite sur grand écran */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            // Téléphone : toute la largeur de l'écran (on annule la marge du conteneur).
            className="-mx-4 sm:mx-0 lg:order-last"
          >
            {/* Les illustrations ont un fond blanc (souvent en vague) : pas de carte, de bordure ni d'ombre autour.
                En clair, « multiply » fond ce blanc dans le dégradé de l'en-tête ; en sombre, simples coins arrondis.
                Format d'origine (1200 × 720, 5/3) : rien n'est rogné. */}
            <div className="relative aspect-[5/3]">
              <img
                src={urlIllustration(donnee)}
                alt=""
                decoding="async"
                onError={(e) => (e.currentTarget.style.display = "none")}
                className="h-full w-full object-contain mix-blend-multiply dark:mix-blend-normal dark:sm:rounded-2xl"
              />
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {donnee.categories && (
                <Link to={catalogueParCategorie(donnee.categories.slug)} className="transition-opacity hover:opacity-80">
                  <BadgeCategorie nom={donnee.categories.nom} icone={donnee.categories.icone} taille="md" />
                </Link>
              )}
              {donnee.sources?.verifiee && (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-600/30 bg-white/70 px-3 py-1 text-xs font-medium text-emerald-800 dark:bg-white/5 dark:text-emerald-300">
                  <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                  {t("fiche.sourceVerifiee")}
                </span>
              )}
            </div>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white md:text-5xl">{titre}</h1>
            {resume && <p className="mt-4 max-w-2xl text-lg text-gray-600 dark:text-gray-400">{resume}</p>}
            {donnee.sources && <p className="mt-3 text-sm text-muted-foreground">{t("fiche.sourceNom", { nom: donnee.sources.nom })}</p>}

            {/* Trois chiffres clés */}
            <div className="mt-6 grid max-w-xl grid-cols-3 gap-4 border-y border-gray-200/80 py-4 dark:border-white/10">
              {chiffre && (
                <ChiffreCle
                  valeur={formaterNombre(chiffre.nombre, langue)}
                  libelle={chiffre.genre === "compte" ? chiffre.unite : t("catalogue.carte.indicateurs", { count: chiffre.nombre })}
                />
              )}
              {wilayas !== null && <ChiffreCle valeur={formaterNombre(wilayas, langue)} libelle={t("fiche.entete.wilayas", { count: wilayas })} />}
              {fraicheur && <ChiffreCle valeur={fraicheur} libelle={t("fiche.entete.miseAJour")} />}
            </div>

            {/* Actions */}
            <div className="mt-6 flex flex-wrap items-center gap-2">
              {donnee.ressources.length > 0 && <BoutonTelecharger ressources={donnee.ressources} />}
              {action && (
                <Button asChild size="lg" variant="outline" className="gap-2 bg-white/80 dark:bg-white/5">
                  <a href="#visuel">
                    {action === "carte" ? <IconeCarte className="h-5 w-5" aria-hidden /> : <ChartLine className="h-5 w-5" aria-hidden />}
                    {t(action === "carte" ? "fiche.entete.voirCarte" : "fiche.entete.voirGraphique")}
                  </a>
                </Button>
              )}
              <div className="flex items-center gap-2">
                <BoutonFavori donnee={donnee} taille="icone" className="border-gray-200 dark:border-white/10" />
                <BoutonPartager titre={titre} />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
