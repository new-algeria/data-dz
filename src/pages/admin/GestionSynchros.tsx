import { Suspense, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, CircleDashed, Clock, FlaskConical, Loader2, RefreshCw, XCircle, type LucideIcon } from "lucide-react";
import { MiseEnPage } from "@/components/MiseEnPage";
import { EtatErreur } from "@/components/EtatErreur";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useLangue } from "@/hooks/use-langue";
import { cleErreur } from "@/lib/erreurs";
import { formaterNombre, localeNombres } from "@/lib/fichiers";
import { routes } from "@/lib/routes";
import { chargerSynchros, modifierSynchro, totauxRapport, type StatutExecution, type Synchro } from "@/lib/synchros";
import { texteTraduit } from "@/lib/traduction";
import { cn } from "@/lib/utils";
import { lazyAvecRechargement } from "@/lib/rechargement";

const TagsOsm = lazyAvecRechargement(() => import("./TagsOsm"));

const APPARENCE_STATUT: Record<StatutExecution, { icone: LucideIcon; classes: string }> = {
  reussie: { icone: CheckCircle2, classes: "bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300" },
  partielle: { icone: AlertTriangle, classes: "bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300" },
  echec: { icone: XCircle, classes: "bg-red-100 text-red-800 dark:bg-red-400/15 dark:text-red-300" },
  essai: { icone: FlaskConical, classes: "bg-sky-100 text-sky-800 dark:bg-sky-400/15 dark:text-sky-300" },
};

const BadgeStatut = ({ statut }: { statut: StatutExecution | null }) => {
  const { t } = useTranslation();
  if (!statut) return <span className="text-xs text-muted-foreground">{t("synchros.jamais")}</span>;
  const { icone: Icone, classes } = APPARENCE_STATUT[statut];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", classes)}>
      <Icone className="h-3.5 w-3.5" aria-hidden />
      {t(`synchros.statuts.${statut}`)}
    </span>
  );
};

/** Réglages d'une synchronisation interne : active, intervalle, forcer au prochain passage. */
const Reglages = ({ synchro }: { synchro: Synchro }) => {
  const { t } = useTranslation();
  const clientRequetes = useQueryClient();
  const [intervalle, setIntervalle] = useState(String(synchro.intervalle_jours));
  useEffect(() => setIntervalle(String(synchro.intervalle_jours)), [synchro.intervalle_jours]);

  const mutation = useMutation({
    mutationFn: (champs: Parameters<typeof modifierSynchro>[1]) => modifierSynchro(synchro.code, champs),
    onSuccess: () => {
      clientRequetes.invalidateQueries({ queryKey: ["admin", "synchros"] });
      toast.success(t("synchros.enregistre"));
    },
    onError: (e) => toast.error(t("synchros.erreur"), { description: t(cleErreur(e)) }),
  });
  const valeur = Number(intervalle);
  const intervalleValide = Number.isInteger(valeur) && valeur >= 1 && valeur <= 365;

  return (
    <div className="grid gap-4 rounded-xl bg-gray-50 p-4 sm:grid-cols-3 dark:bg-white/5">
      <div className="flex items-center gap-3">
        <Switch
          id={`actif-${synchro.code}`}
          checked={synchro.actif}
          disabled={mutation.isPending}
          onCheckedChange={(actif) => mutation.mutate({ actif })}
        />
        <Label htmlFor={`actif-${synchro.code}`}>{synchro.actif ? t("synchros.active") : t("synchros.inactive")}</Label>
      </div>
      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (intervalleValide) mutation.mutate({ intervalle_jours: valeur });
        }}
      >
        <div className="space-y-1">
          <Label htmlFor={`intervalle-${synchro.code}`}>{t("synchros.intervalle")}</Label>
          <Input
            id={`intervalle-${synchro.code}`}
            type="number"
            min={1}
            max={365}
            value={intervalle}
            onChange={(e) => setIntervalle(e.target.value)}
            className="w-24 bg-white dark:bg-gray-900"
          />
        </div>
        <Button type="submit" variant="outline" size="sm" disabled={!intervalleValide || valeur === synchro.intervalle_jours || mutation.isPending}>
          {t("synchros.enregistrer")}
        </Button>
      </form>
      <div className="flex items-end">
        <Button
          variant={synchro.forcer ? "secondary" : "outline"}
          size="sm"
          className="gap-2"
          disabled={mutation.isPending || !synchro.actif}
          onClick={() => mutation.mutate({ forcer: !synchro.forcer })}
        >
          {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RefreshCw className="h-4 w-4" aria-hidden />}
          {synchro.forcer ? t("synchros.annulerForcer") : t("synchros.forcer")}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground sm:col-span-3">{synchro.forcer ? t("synchros.forceeAide") : t("synchros.aideReglages")}</p>
    </div>
  );
};

/** /admin/sync : sources renouvelées automatiquement, réglages, derniers rapports. Permission synchro.gerer. */
const GestionSynchros = () => {
  const { t } = useTranslation();
  const langue = useLangue();
  const requete = useQuery({ queryKey: ["admin", "synchros"], queryFn: chargerSynchros });
  const formatDate = new Intl.DateTimeFormat(localeNombres(langue), { dateStyle: "medium", timeStyle: "short" });
  const date = (valeur: string | null | undefined) => (valeur ? formatDate.format(new Date(valeur)) : "—");
  const nombre = (valeur: number) => formaterNombre(valeur, langue);

  return (
    <MiseEnPage titre={t("synchros.titre")} sousTitre={t("synchros.sousTitre")} chemin={routes.adminSynchros} largeur="large">
      <p className="mb-4 rounded-xl bg-violet-50 p-3 text-sm text-violet-900 dark:bg-violet-500/10 dark:text-violet-100">{t("synchros.aide")}</p>

      {requete.isPending ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : requete.isError ? (
        <EtatErreur message={t(cleErreur(requete.error))} onReessayer={() => requete.refetch()} />
      ) : (
        <div className="space-y-6">
          {requete.data.map((synchro) => {
            const totaux = totauxRapport(synchro.dernier_rapport);
            const donnees = Object.entries(synchro.dernier_rapport?.donnees ?? {});
            return (
              <section key={synchro.code} className="space-y-4 rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-gray-800">
                <header className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="flex flex-wrap items-center gap-2 text-lg font-bold">
                      {synchro.nom}
                      <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-700 dark:bg-white/10 dark:text-gray-300">
                        {t(`synchros.modes.${synchro.mode}`)}
                      </span>
                    </h2>
                    {synchro.description && <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{synchro.description}</p>}
                  </div>
                  <BadgeStatut statut={synchro.dernier_statut} />
                </header>

                <dl className="grid gap-3 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">{t("synchros.derniere")}</dt>
                    <dd className="font-medium">{date(synchro.derniere_execution)}</dd>
                  </div>
                  {synchro.mode === "interne" && (
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{t("synchros.prochaine")}</dt>
                      <dd className="flex items-center gap-1.5 font-medium">
                        <Clock className="h-4 w-4 text-muted-foreground" aria-hidden />
                        {!synchro.actif ? t("synchros.inactive") : synchro.a_faire ? t("synchros.prochainPassage") : date(synchro.prochaine_execution)}
                      </dd>
                    </div>
                  )}
                  {synchro.dernier_rapport?.extrait_du && (
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{t("synchros.extraitDu")}</dt>
                      <dd className="font-medium">{date(synchro.dernier_rapport.extrait_du)}</dd>
                    </div>
                  )}
                </dl>

                {synchro.mode === "interne" && <Reglages synchro={synchro} />}

                {synchro.code === "openstreetmap" && (
                  <Suspense fallback={<Skeleton className="h-48 rounded-xl" />}>
                    <TagsOsm />
                  </Suspense>
                )}

                {donnees.length > 0 && (
                  <details className="group rounded-xl border">
                    <summary className="cursor-pointer select-none p-3 text-sm font-medium">
                      {t("synchros.dernierRapport", {
                        donnees: nombre(totaux.donnees),
                        publiees: nombre(totaux.publiees),
                        objets: nombre(totaux.objets),
                        ajoutes: nombre(totaux.ajoutes),
                        absents: nombre(totaux.absents),
                      })}
                      {totaux.problemes > 0 && <span className="ms-2 text-amber-700 dark:text-amber-300">⚠ {t("synchros.problemes", { count: totaux.problemes })}</span>}
                    </summary>
                    <div className="overflow-x-auto border-t">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs uppercase tracking-wide text-muted-foreground dark:bg-white/5">
                          <tr>
                            <th scope="col" className="px-3 py-2 text-start">{t("synchros.colonnes.donnee")}</th>
                            <th scope="col" className="px-3 py-2 text-start">{t("synchros.colonnes.fichiers")}</th>
                            <th scope="col" className="px-3 py-2 text-start">{t("synchros.colonnes.resultat")}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {donnees.map(([slug, donnee]) => (
                            <tr key={slug} className="align-top">
                              <td className="px-3 py-2">
                                <Link to={routes.donnee(slug)} className="font-medium hover:underline" dir="ltr">
                                  {slug}
                                </Link>
                                <span className="block text-xs text-muted-foreground">
                                  {donnee.creee ? t("synchros.nouvelleDonnee") : donnee.complement ? t("synchros.complement") : t("synchros.donneeSource")}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-xs">
                                {Object.entries(donnee.fichiers ?? {}).map(([nom, fichier]) => (
                                  <p key={nom} dir="ltr" className="tabular-nums">
                                    <span className="font-medium">{nom}</span> · {nombre(fichier.total ?? 0)} (+{nombre(fichier.ajoutes ?? 0)}, ~{nombre(fichier.mis_a_jour ?? 0)}, −
                                    {nombre(fichier.absents ?? 0)})
                                    {fichier.geoalgeria !== undefined && <span className="text-muted-foreground"> · GeoAlgeria {nombre(fichier.geoalgeria)}</span>}
                                  </p>
                                ))}
                              </td>
                              <td className="px-3 py-2 text-xs">
                                {donnee.erreur ? (
                                  <span className="text-red-700 dark:text-red-300">{donnee.erreur}</span>
                                ) : donnee.anomalie ? (
                                  <span className="text-amber-700 dark:text-amber-300">{donnee.anomalie}</span>
                                ) : donnee.publiee ? (
                                  <span className="text-emerald-700 dark:text-emerald-300">{t("synchros.publiee", { version: donnee.version })}</span>
                                ) : (
                                  <span className="text-muted-foreground">{t("synchros.inchangee")}</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="border-t p-3 text-xs text-muted-foreground">{t("synchros.legende")}</p>
                  </details>
                )}

                {synchro.executions.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold">{t("synchros.historique")}</h3>
                    <ul className="divide-y rounded-xl border text-sm">
                      {synchro.executions.map((execution) => (
                        <li key={execution.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
                          <BadgeStatut statut={execution.statut} />
                          <time dateTime={execution.debut} className="tabular-nums text-muted-foreground">
                            {date(execution.debut)}
                          </time>
                          <span className="text-xs text-muted-foreground">{t(`synchros.declencheurs.${execution.declencheur}`)}</span>
                          {execution.resume && <span className="min-w-0 flex-1 basis-full text-xs sm:basis-auto">{execution.resume}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {synchro.mode === "externe" && (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold">{t("synchros.dernieresVersions")}</h3>
                    {synchro.dernieres_versions.length === 0 ? (
                      <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CircleDashed className="h-4 w-4" aria-hidden />
                        {t("synchros.aucuneVersion")}
                      </p>
                    ) : (
                      <ul className="divide-y rounded-xl border text-sm">
                        {synchro.dernieres_versions.map((donnee) => (
                          <li key={donnee.slug} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                            <Link to={routes.donnee(donnee.slug)} className="min-w-0 truncate font-medium hover:underline" dir="auto">
                              {texteTraduit(donnee.titre, langue)}
                            </Link>
                            <span className="text-xs tabular-nums text-muted-foreground">
                              {donnee.version ? `${donnee.version.numero} · ${date(donnee.version.publie_le)}` : "—"}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

              </section>
            );
          })}
        </div>
      )}
    </MiseEnPage>
  );
};

export default GestionSynchros;
