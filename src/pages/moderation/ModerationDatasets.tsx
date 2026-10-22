import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Loader2, Search } from "lucide-react";
import { MiseEnPage } from "@/components/MiseEnPage";
import { EtatErreur } from "@/components/EtatErreur";
import { MessageAuth } from "@/components/auth/MessageAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useLangue } from "@/hooks/use-langue";
import { cleErreur } from "@/lib/erreurs";
import { formaterNombre, localeNombres } from "@/lib/fichiers";
import { changerStatutDataset, chargerDatasetsModeration, STATUTS_DATASET_MODIFIABLES, type StatutDataset } from "@/lib/moderation";
import { routes } from "@/lib/routes";
import { texteTraduit } from "@/lib/traduction";
import { cn } from "@/lib/utils";

const TOUS = "tous";

const couleursStatut: Record<StatutDataset, string> = {
  publie: "bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300",
  brouillon: "bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300",
  en_revue: "bg-sky-100 text-sky-800 dark:bg-sky-400/15 dark:text-sky-300",
  archive: "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300",
};

const ModerationDatasets = () => {
  const { t } = useTranslation();
  const langue = useLangue();
  const clientRequetes = useQueryClient();
  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState<StatutDataset | typeof TOUS>(TOUS);
  const [enCours, setEnCours] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "erreur" | "succes"; texte: string } | null>(null);

  const requete = useQuery({ queryKey: ["moderation", "datasets"], queryFn: chargerDatasetsModeration });
  const formatDate = new Intl.DateTimeFormat(localeNombres(langue), { dateStyle: "medium" });

  const affiches = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    return (requete.data ?? []).filter(
      (d) =>
        (filtre === TOUS || d.statut === filtre) &&
        (!terme || d.slug.includes(terme) || Object.values(d.titre).some((titre) => titre?.toLowerCase().includes(terme)))
    );
  }, [requete.data, recherche, filtre]);

  const changer = async (id: string, titre: string, statut: StatutDataset) => {
    setEnCours(id);
    setMessage(null);
    try {
      await changerStatutDataset(id, statut);
      await requete.refetch();
      // Le catalogue public et les fiches doivent refléter le nouveau statut.
      clientRequetes.invalidateQueries({ queryKey: ["catalogue"] });
      clientRequetes.invalidateQueries({ queryKey: ["statistiques"] });
      clientRequetes.invalidateQueries({ queryKey: ["fiche"] });
      setMessage({ type: "succes", texte: t("moderation.datasets.statutChange", { titre, statut: t(`moderation.datasets.statuts.${statut}`) }) });
    } catch (e) {
      setMessage({ type: "erreur", texte: t(cleErreur(e)) });
    } finally {
      setEnCours(null);
    }
  };

  return (
    <MiseEnPage
      titre={t("moderation.datasets.titre")}
      sousTitre={t("moderation.datasets.sousTitre")}
      chemin={routes.moderationDatasets}
      largeur="large"
      avant={
        <Button asChild variant="ghost" size="sm" className="-ms-2 gap-1.5">
          <Link to={routes.moderation}>
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            {t("moderation.titre")}
          </Link>
        </Button>
      }
    >
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[14rem] flex-1">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder={t("moderation.datasets.rechercher")}
            aria-label={t("moderation.datasets.rechercher")}
            className="ps-9"
          />
        </div>
        <Select value={filtre} onValueChange={(valeur) => setFiltre(valeur as StatutDataset | typeof TOUS)}>
          <SelectTrigger className="w-48" aria-label={t("moderation.filtrerStatut")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TOUS}>{t("moderation.datasets.tousStatuts")}</SelectItem>
            {(["publie", "brouillon", "en_revue", "archive"] as const).map((statut) => (
              <SelectItem key={statut} value={statut}>
                {t(`moderation.datasets.statuts.${statut}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {message && (
        <div className="mb-4">
          <MessageAuth type={message.type}>{message.texte}</MessageAuth>
        </div>
      )}

      {requete.isPending ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : requete.isError ? (
        <EtatErreur message={t(cleErreur(requete.error))} onReessayer={() => requete.refetch()} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-gray-800">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50 text-start text-xs uppercase tracking-wide text-muted-foreground dark:bg-white/5">
              <tr>
                <th scope="col" className="px-4 py-3 text-start font-semibold">{t("moderation.datasets.colonnes.donnee")}</th>
                <th scope="col" className="hidden px-4 py-3 text-start font-semibold md:table-cell">{t("moderation.datasets.colonnes.source")}</th>
                <th scope="col" className="hidden px-4 py-3 text-end font-semibold sm:table-cell">{t("moderation.datasets.colonnes.lignes")}</th>
                <th scope="col" className="hidden px-4 py-3 text-start font-semibold lg:table-cell">{t("moderation.datasets.colonnes.miseAJour")}</th>
                <th scope="col" className="px-4 py-3 text-start font-semibold">{t("moderation.datasets.colonnes.statut")}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {affiches.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    {t("moderation.datasets.aucun")}
                  </td>
                </tr>
              ) : (
                affiches.map((d) => {
                  const titre = texteTraduit(d.titre, langue) || d.slug;
                  const options = STATUTS_DATASET_MODIFIABLES.includes(d.statut) ? STATUTS_DATASET_MODIFIABLES : [d.statut, ...STATUTS_DATASET_MODIFIABLES];
                  return (
                    <tr key={d.id} className="align-middle">
                      <td className="max-w-xs px-4 py-3">
                        {d.statut === "publie" ? (
                          <Link to={routes.donnee(d.slug)} className="font-medium hover:underline">
                            {titre}
                          </Link>
                        ) : (
                          <span className="font-medium">{titre}</span>
                        )}
                        <span className="block truncate font-mono text-xs text-muted-foreground" dir="ltr">
                          {d.slug}
                        </span>
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{d.sources?.nom ?? "—"}</td>
                      <td className="hidden px-4 py-3 text-end tabular-nums sm:table-cell">
                        {d.versions?.nb_lignes != null ? formaterNombre(d.versions.nb_lignes, langue) : "—"}
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                        <time dateTime={d.mis_a_jour_le}>{formatDate.format(new Date(d.mis_a_jour_le))}</time>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Select
                            value={d.statut}
                            onValueChange={(valeur) => valeur !== d.statut && changer(d.id, titre, valeur as StatutDataset)}
                            disabled={enCours !== null}
                          >
                            <SelectTrigger
                              className={cn("h-8 w-36 rounded-full border-0 text-xs font-semibold", couleursStatut[d.statut])}
                              aria-label={t("moderation.datasets.changerStatut", { titre })}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {options.map((statut) => (
                                <SelectItem key={statut} value={statut} disabled={statut === "en_revue"}>
                                  {t(`moderation.datasets.statuts.${statut}`)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {enCours === d.id && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden />}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
      {requete.data && (
        <p className="mt-3 text-xs text-muted-foreground">
          {t("moderation.datasets.compteur", { count: affiches.length, total: requete.data.length })}
        </p>
      )}
    </MiseEnPage>
  );
};

export default ModerationDatasets;
