import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Download, Eye, Loader2, UsersRound } from "lucide-react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { MiseEnPage } from "@/components/MiseEnPage";
import { EtatErreur } from "@/components/EtatErreur";
import { AvatarMembre } from "@/components/AvatarMembre";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLangue } from "@/hooks/use-langue";
import {
  chargerComptes,
  chargerRepartition,
  chargerSerie,
  chargerTelechargementsCompte,
  chargerTopDonnees,
  estPeriode,
  intervallePeriode,
  libellePeriode,
  MigrationAnalyticsAbsente,
  part,
  PERIODES,
  totauxSerie,
  type CompteTelechargements,
  type Intervalle,
  type Periode,
} from "@/lib/analytics";
import { formaterNombre, localeNombres } from "@/lib/fichiers";
import { routes } from "@/lib/routes";
import { texteTraduit } from "@/lib/traduction";
import { cn } from "@/lib/utils";

const COULEUR_VUES = "#2f80ed";
const COULEUR_TELECHARGEMENTS = "#10b981";

const Carte = ({ titre, children, className }: { titre: string; children: React.ReactNode; className?: string }) => (
  <section className={cn("min-w-0 rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 dark:border-white/10 dark:bg-gray-950", className)}>
    <h2 className="mb-4 text-base font-semibold">{titre}</h2>
    {children}
  </section>
);

const Tuile = ({ icone: Icone, libelle, valeur, couleur }: { icone: typeof Eye; libelle: string; valeur: string; couleur: string }) => (
  <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-gray-950">
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${couleur}1a`, color: couleur }}>
      <Icone className="h-5 w-5" aria-hidden />
    </span>
    <div className="min-w-0">
      <p className="text-sm text-muted-foreground">{libelle}</p>
      <p className="text-2xl font-bold tabular-nums">{valeur}</p>
    </div>
  </div>
);

const Vide = () => {
  const { t } = useTranslation();
  return <p className="py-6 text-center text-sm text-muted-foreground">{t("analytics.vide")}</p>;
};

const messageErreur = (erreur: unknown, t: (cle: string) => string) =>
  erreur instanceof MigrationAnalyticsAbsente ? t("analytics.migration") : t("analytics.erreur");

const DetailCompte = ({ compte, intervalle, onFermer }: { compte: CompteTelechargements | null; intervalle: Intervalle; onFermer: () => void }) => {
  const { t } = useTranslation();
  const langue = useLangue();
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "analytics", "compte", compte?.utilisateur_id, intervalle.debut.toISOString()],
    queryFn: () => chargerTelechargementsCompte(compte!.utilisateur_id, intervalle),
    enabled: !!compte,
  });
  const dates = new Intl.DateTimeFormat(localeNombres(langue), { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Algiers" });
  return (
    <Dialog open={!!compte} onOpenChange={(ouvert) => !ouvert && onFermer()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{compte?.nom_affiche || (compte?.pseudo ? `@${compte.pseudo}` : t("analytics.compteSupprime"))}</DialogTitle>
          <DialogDescription>{t("analytics.detailDescription")}</DialogDescription>
        </DialogHeader>
        {isLoading && <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" aria-hidden />}
        {error && <p className="text-sm text-red-600">{messageErreur(error, t)}</p>}
        {data && data.length === 0 && <Vide />}
        {data && data.length > 0 && (
          <ul className="divide-y divide-gray-100 text-sm dark:divide-white/10">
            {data.map((ligne, i) => (
              <li key={`${ligne.cree_le}-${i}`} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2">
                <div className="min-w-0">
                  <Link to={routes.donnee(ligne.slug)} className="font-medium hover:underline">
                    {texteTraduit(ligne.titre, langue) || ligne.slug}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground" dir="ltr">
                    {[ligne.fichier, ligne.format?.toUpperCase()].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <time className="shrink-0 text-xs tabular-nums text-muted-foreground" dateTime={ligne.cree_le}>
                  {dates.format(new Date(ligne.cree_le))}
                </time>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
};

const PageAnalytics = () => {
  const { t } = useTranslation();
  const langue = useLangue();
  const [params, setParams] = useSearchParams();
  const brut = params.get("period");
  const periode: Periode = estPeriode(brut) ? brut : "30j";
  // Bornes figées à l'ouverture et au changement de période (sinon la clé de cache changerait à chaque rendu).
  const intervalle = useMemo(() => intervallePeriode(periode), [periode]);
  const cle = ["admin", "analytics", periode, intervalle.debut.toISOString()];
  const [compteOuvert, setCompteOuvert] = useState<CompteTelechargements | null>(null);

  const serie = useQuery({ queryKey: [...cle, "serie"], queryFn: () => chargerSerie(intervalle) });
  const top = useQuery({ queryKey: [...cle, "top"], queryFn: () => chargerTopDonnees(intervalle) });
  const repartition = useQuery({ queryKey: [...cle, "repartition"], queryFn: () => chargerRepartition(intervalle) });
  const comptes = useQuery({ queryKey: [...cle, "comptes"], queryFn: () => chargerComptes(intervalle) });

  const nombre = (n: number) => formaterNombre(n, langue);
  const locale = localeNombres(langue);
  const totaux = totauxSerie(serie.data ?? []);
  const points = (serie.data ?? []).map((p) => ({ ...p, libelle: libellePeriode(p.periode, intervalle.pas, locale) }));
  const formats = (repartition.data ?? []).filter((r) => r.dimension === "format");
  const origines = (repartition.data ?? []).filter((r) => r.dimension === "origine");
  const totalRepartition = origines.reduce((s, r) => s + r.nombre, 0);
  const dates = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "Africa/Algiers" });

  if (serie.error) {
    return (
      <MiseEnPage titre={t("analytics.titre")} sousTitre={t("analytics.sousTitre")} chemin={routes.adminAnalytics} largeur="large">
        <EtatErreur message={messageErreur(serie.error, t)} onReessayer={() => void serie.refetch()} />
      </MiseEnPage>
    );
  }

  const choixPeriode = (
    <div role="group" aria-label={t("analytics.periode")} className="inline-flex rounded-lg bg-gray-200/70 p-1 dark:bg-white/10">
      {PERIODES.map((p) => (
        <button
          key={p}
          type="button"
          aria-pressed={p === periode}
          onClick={() => setParams((avant) => { const suite = new URLSearchParams(avant); suite.set("period", p); return suite; }, { replace: true })}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            p === periode ? "bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-white" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {t(`analytics.periodes.${p}`)}
        </button>
      ))}
    </div>
  );

  return (
    <MiseEnPage titre={t("analytics.titre")} sousTitre={t("analytics.sousTitre")} chemin={routes.adminAnalytics} largeur="large" actions={choixPeriode}>
      <div className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-3">
          {serie.isLoading ? (
            [0, 1, 2].map((i) => <Skeleton key={i} className="h-[74px] rounded-2xl" />)
          ) : (
            <>
              <Tuile icone={Eye} libelle={t("analytics.vues")} valeur={nombre(totaux.vues)} couleur={COULEUR_VUES} />
              <Tuile icone={Download} libelle={t("analytics.telechargements")} valeur={nombre(totaux.telechargements)} couleur={COULEUR_TELECHARGEMENTS} />
              <Tuile icone={UsersRound} libelle={t("analytics.comptesActifs")} valeur={nombre(comptes.data?.length ?? 0)} couleur="#8b5cf6" />
            </>
          )}
        </div>

        <Carte titre={t("analytics.evolution")}>
          {serie.isLoading ? (
            <Skeleton className="h-72 w-full" />
          ) : (
            <div className="h-72 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-white/10" vertical={false} />
                  <XAxis dataKey="libelle" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} minTickGap={16} reversed={langue === "ar"} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={44} orientation={langue === "ar" ? "right" : "left"} />
                  <Tooltip
                    formatter={(valeur: number, nom: string) => [nombre(valeur), nom]}
                    contentStyle={{ borderRadius: 12, fontSize: 13, background: "hsl(var(--popover))", color: "hsl(var(--popover-foreground))", border: "1px solid hsl(var(--border))" }}
                  />
                  <Legend wrapperStyle={{ fontSize: 13 }} />
                  <Line type="monotone" dataKey="vues" name={t("analytics.vues")} stroke={COULEUR_VUES} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="telechargements" name={t("analytics.telechargements")} stroke={COULEUR_TELECHARGEMENTS} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          <p className="mt-3 text-xs text-muted-foreground">{t("analytics.note")}</p>
        </Carte>

        <div className="grid gap-4 lg:grid-cols-3">
          <Carte titre={t("analytics.topDonnees")} className="lg:col-span-2">
            {top.isLoading && <Skeleton className="h-48 w-full" />}
            {top.data && top.data.length === 0 && <Vide />}
            {top.data && top.data.length > 0 && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-start text-xs text-muted-foreground">
                    <th className="pb-2 text-start font-medium">{t("analytics.donnee")}</th>
                    <th className="pb-2 text-end font-medium">{t("analytics.vues")}</th>
                    <th className="pb-2 text-end font-medium">{t("analytics.telechargementsCourt")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                  {top.data.map((d) => (
                    <tr key={d.slug}>
                      <td className="max-w-0 truncate py-2 pe-3">
                        <Link to={routes.donnee(d.slug)} className="hover:underline">
                          {texteTraduit(d.titre, langue) || d.slug}
                        </Link>
                      </td>
                      <td className="py-2 text-end tabular-nums">{nombre(d.vues)}</td>
                      <td className="py-2 text-end font-semibold tabular-nums">{nombre(d.telechargements)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Carte>

          <Carte titre={t("analytics.repartition")}>
            {repartition.isLoading && <Skeleton className="h-48 w-full" />}
            {repartition.data && totalRepartition === 0 && <Vide />}
            {repartition.data && totalRepartition > 0 && (
              <div className="grid gap-5">
                {[
                  { titre: t("analytics.origine"), lignes: origines, libelle: (v: string) => t(`analytics.origines.${v}`, { defaultValue: v }) },
                  { titre: t("analytics.format"), lignes: formats, libelle: (v: string) => (v === "inconnu" ? t("analytics.inconnu") : v.toUpperCase()) },
                ].map((bloc) => (
                  <div key={bloc.titre}>
                    <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{bloc.titre}</h3>
                    <ul className="grid gap-2">
                      {bloc.lignes.map((r) => (
                        <li key={r.valeur} className="text-sm">
                          <div className="mb-1 flex justify-between gap-2">
                            <span dir="auto">{bloc.libelle(r.valeur)}</span>
                            <span className="tabular-nums text-muted-foreground">
                              {nombre(r.nombre)} · {part(r.nombre, totalRepartition)} %
                            </span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
                            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${part(r.nombre, totalRepartition)}%` }} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </Carte>
        </div>

        <Carte titre={t("analytics.parCompte")}>
          <p className="-mt-2 mb-4 text-sm text-muted-foreground">{t("analytics.parCompteAide")}</p>
          {comptes.isLoading && <Skeleton className="h-48 w-full" />}
          {comptes.error && <p className="text-sm text-red-600">{messageErreur(comptes.error, t)}</p>}
          {comptes.data && comptes.data.length === 0 && <Vide />}
          {comptes.data && comptes.data.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground">
                    <th className="pb-2 text-start font-medium">{t("analytics.compte")}</th>
                    <th className="pb-2 text-end font-medium">{t("analytics.telechargementsCourt")}</th>
                    <th className="pb-2 text-end font-medium">{t("analytics.donneesDistinctes")}</th>
                    <th className="pb-2 text-end font-medium">{t("analytics.dernier")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                  {comptes.data.map((c) => (
                    <tr key={c.utilisateur_id} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5" onClick={() => setCompteOuvert(c)}>
                      <td className="py-2 pe-3">
                        <button type="button" className="flex items-center gap-2.5 text-start" onClick={(e) => { e.stopPropagation(); setCompteOuvert(c); }}>
                          <AvatarMembre profil={{ pseudo: c.pseudo ?? "?", nom_affiche: c.nom_affiche, avatar_url: c.avatar_url }} className="h-8 w-8" />
                          <span className="min-w-0">
                            <span className="block font-medium">{c.nom_affiche || (c.pseudo ? `@${c.pseudo}` : t("analytics.compteSupprime"))}</span>
                            {c.pseudo && c.nom_affiche && <span className="block text-xs text-muted-foreground">@{c.pseudo}</span>}
                          </span>
                        </button>
                      </td>
                      <td className="py-2 text-end font-semibold tabular-nums">{nombre(c.telechargements)}</td>
                      <td className="py-2 text-end tabular-nums">{nombre(c.donnees)}</td>
                      <td className="py-2 text-end text-muted-foreground">{dates.format(new Date(c.dernier))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Carte>
      </div>
      <DetailCompte compte={compteOuvert} intervalle={intervalle} onFermer={() => setCompteOuvert(null)} />
    </MiseEnPage>
  );
};

export default PageAnalytics;
