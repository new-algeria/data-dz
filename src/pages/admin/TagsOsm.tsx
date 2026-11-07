import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useLangue } from "@/hooks/use-langue";
import { cleErreur } from "@/lib/erreurs";
import { formaterNombre } from "@/lib/fichiers";
import { routes } from "@/lib/routes";
import {
  chargerFluxOsm,
  chargerTagsOsm,
  classerTagOsm,
  compterTagOsm,
  enregistrerFluxOsm,
  lireTagSaisi,
  modifierFluxOsm,
  nomsProposes,
  supprimerFluxOsm,
  tagLisible,
  type EtatTag,
  type FluxOsm,
  type TagOsm,
} from "@/lib/synchros";
import { cn } from "@/lib/utils";

const CLE_FLUX = ["admin", "osm", "flux"];
const CLE_TAGS = ["admin", "osm", "tags"];
const PAR_PAGE = 60;

type Onglet = EtatTag | "pris";
const ONGLETS: Onglet[] = ["nouveau", "a_etudier", "ecarte", "pris"];

/** Formulaire « ajouter un tag » : tag, donnée cible, test du nombre d'objets. */
const AjoutFlux = ({ flux, tagInitial, onFini }: { flux: FluxOsm[]; tagInitial: string; onFini: () => void }) => {
  const { t } = useTranslation();
  const langue = useLangue();
  const clientRequetes = useQueryClient();
  const [tag, setTag] = useState(tagInitial);
  const [donnee, setDonnee] = useState("");
  const [fichier, setFichier] = useState("");
  const [comptage, setComptage] = useState<{ nb: number; source: string } | null>(null);
  const lu = lireTagSaisi(tag);
  const donneesConnues = useMemo(() => [...new Set(flux.map((f) => f.dataset_slug))].sort(), [flux]);
  const complement = donnee !== "" && !flux.some((f) => f.dataset_slug === donnee && !f.fichier.endsWith("-osm"));
  const noms = lu ? nomsProposes(lu.valeurs, complement) : null;
  const fichierFinal = fichier.trim() || noms?.fichier || "";
  const codeFinal = noms ? (flux.some((f) => f.code === noms.code) ? `${noms.code}-2` : noms.code) : "";

  const tester = useMutation({
    mutationFn: () => compterTagOsm(lu!.cle, lu!.valeurs),
    onSuccess: (resultat) => setComptage(resultat),
    onError: (e) => toast.error(t("synchros.osm.testErreur"), { description: t(cleErreur(e)) }),
  });
  const ajouter = useMutation({
    mutationFn: () => enregistrerFluxOsm(codeFinal, { dataset_slug: donnee.trim(), fichier: fichierFinal, cle: lu!.cle, valeurs: lu!.valeurs }),
    onSuccess: () => {
      clientRequetes.invalidateQueries({ queryKey: ["admin", "osm"] });
      toast.success(t("synchros.osm.ajoute"));
      onFini();
    },
    onError: (e) => toast.error(t("synchros.osm.ajoutErreur"), { description: t(cleErreur(e)) }),
  });

  return (
    <form
      id="osm-ajout"
      className="grid gap-3 rounded-xl bg-gray-50 p-4 sm:grid-cols-2 lg:grid-cols-4 dark:bg-white/5"
      onSubmit={(e) => {
        e.preventDefault();
        if (lu && donnee.trim() && fichierFinal) ajouter.mutate();
      }}
    >
      <div className="space-y-1">
        <Label htmlFor="osm-tag">{t("synchros.osm.tag")}</Label>
        <Input
          id="osm-tag"
          dir="ltr"
          placeholder="amenity=cafe"
          value={tag}
          onChange={(e) => {
            setTag(e.target.value);
            setComptage(null);
          }}
          className="bg-white font-mono dark:bg-gray-900"
        />
        {tag && !lu && <p className="text-xs text-red-700 dark:text-red-300">{t("synchros.osm.tagInvalide")}</p>}
      </div>
      <div className="space-y-1">
        <Label htmlFor="osm-donnee">{t("synchros.osm.donnee")}</Label>
        <Input id="osm-donnee" dir="ltr" list="osm-donnees" placeholder="tourisme" value={donnee} onChange={(e) => setDonnee(e.target.value.toLowerCase())} className="bg-white dark:bg-gray-900" />
        <datalist id="osm-donnees">
          {donneesConnues.map((slug) => (
            <option key={slug} value={slug} />
          ))}
        </datalist>
      </div>
      <div className="space-y-1">
        <Label htmlFor="osm-fichier">{t("synchros.osm.fichier")}</Label>
        <Input id="osm-fichier" dir="ltr" placeholder={noms?.fichier ?? "cafes-osm"} value={fichier} onChange={(e) => setFichier(e.target.value)} className="bg-white dark:bg-gray-900" />
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <Button type="button" variant="outline" size="sm" disabled={!lu || tester.isPending} onClick={() => tester.mutate()} className="gap-2">
          {tester.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Search className="h-4 w-4" aria-hidden />}
          {t("synchros.osm.tester")}
        </Button>
        <Button type="submit" size="sm" disabled={!lu || !donnee.trim() || !fichierFinal || ajouter.isPending} className="gap-2">
          <Plus className="h-4 w-4" aria-hidden />
          {t("synchros.osm.ajouter")}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground sm:col-span-2 lg:col-span-4">
        {comptage
          ? t(comptage.nb === 0 ? "synchros.osm.testVide" : "synchros.osm.testResultat", {
              nb: formaterNombre(comptage.nb, langue),
              source: t(`synchros.osm.sources.${comptage.source}`),
            })
          : t("synchros.osm.aideAjout")}
      </p>
    </form>
  );
};

/** Section OpenStreetMap de /admin/sync : tags extraits (flux) et inventaire des tags de l'Algérie. */
const TagsOsm = () => {
  const { t } = useTranslation();
  const langue = useLangue();
  const clientRequetes = useQueryClient();
  const requeteFlux = useQuery({ queryKey: CLE_FLUX, queryFn: chargerFluxOsm });
  const requeteTags = useQuery({ queryKey: CLE_TAGS, queryFn: chargerTagsOsm });
  const [onglet, setOnglet] = useState<Onglet>("nouveau");
  const [terme, setTerme] = useState("");
  const [limite, setLimite] = useState(PAR_PAGE);
  const [ajout, setAjout] = useState<{ tag: string; cle: number } | null>(null);
  const [aSupprimer, setASupprimer] = useState<string | null>(null);
  const nombre = (valeur: number) => formaterNombre(valeur, langue);

  const invalider = () => clientRequetes.invalidateQueries({ queryKey: ["admin", "osm"] });
  const basculer = useMutation({
    mutationFn: ({ code, actif }: { code: string; actif: boolean }) => modifierFluxOsm(code, { actif }),
    onSuccess: invalider,
    onError: (e) => toast.error(t("synchros.erreur"), { description: t(cleErreur(e)) }),
  });
  const supprimer = useMutation({
    mutationFn: supprimerFluxOsm,
    onSuccess: () => {
      setASupprimer(null);
      invalider();
      toast.success(t("synchros.osm.supprime"));
    },
    onError: (e) => toast.error(t("synchros.erreur"), { description: t(cleErreur(e)) }),
  });
  const classer = useMutation({
    mutationFn: ({ tag, etat }: { tag: TagOsm; etat: EtatTag }) => classerTagOsm(tag.cle, tag.valeur, etat),
    onMutate: ({ tag, etat }) => {
      clientRequetes.setQueryData<Awaited<ReturnType<typeof chargerTagsOsm>>>(CLE_TAGS, (ancien) =>
        ancien && { ...ancien, data: ancien.data.map((ligne) => (ligne.cle === tag.cle && ligne.valeur === tag.valeur ? { ...ligne, etat } : ligne)) }
      );
    },
    onError: (e) => {
      invalider();
      toast.error(t("synchros.erreur"), { description: t(cleErreur(e)) });
    },
  });

  const tags = requeteTags.data?.data ?? [];
  const parOnglet = (o: Onglet) => tags.filter((tag) => (o === "pris" ? tag.flux !== null : tag.flux === null && tag.etat === o));
  const motif = terme.trim().toLowerCase();
  const visibles = parOnglet(onglet).filter((tag) => !motif || `${tag.cle}=${tag.valeur}`.includes(motif));

  if (requeteFlux.isPending || requeteTags.isPending) return <Skeleton className="h-48 rounded-xl" />;
  if (requeteFlux.isError || requeteTags.isError) {
    return <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-400/10 dark:text-amber-200">{t(cleErreur(requeteFlux.error ?? requeteTags.error))}</p>;
  }
  const flux = requeteFlux.data;

  return (
    <div className="space-y-4">
      <details className="rounded-xl border" open>
        <summary className="cursor-pointer select-none p-3 text-sm font-medium">{t("synchros.osm.fluxTitre", { count: flux.length })}</summary>
        <div className="space-y-3 border-t p-3">
          <p className="text-xs text-muted-foreground">{t("synchros.osm.fluxAide")}</p>
          {ajout ? (
            <AjoutFlux key={ajout.cle} flux={flux} tagInitial={ajout.tag} onFini={() => setAjout(null)} />
          ) : (
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setAjout({ tag: "", cle: Date.now() })}>
              <Plus className="h-4 w-4" aria-hidden />
              {t("synchros.osm.ajouterTag")}
            </Button>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th scope="col" className="px-2 py-2 text-start">{t("synchros.osm.tag")}</th>
                  <th scope="col" className="px-2 py-2 text-start">{t("synchros.osm.donnee")}</th>
                  <th scope="col" className="px-2 py-2 text-end">{t("synchros.osm.objets")}</th>
                  <th scope="col" className="px-2 py-2 text-end">
                    <span className="sr-only">{t("synchros.osm.actions")}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {flux.map((f) => (
                  <tr key={f.code} className={cn("align-top", !f.actif && "opacity-60")}>
                    <td className="px-2 py-2 font-mono text-xs" dir="ltr">
                      {f.filtres.map(tagLisible).join(" · ")}
                      {Object.keys(f.exige ?? {}).length > 0 && (
                        <span className="block text-muted-foreground">
                          + {Object.entries(f.exige).map(([cle, valeurs]) => `${cle}=${valeurs.join("|")}`).join(", ")}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-xs" dir="ltr">
                      <Link to={routes.donnee(f.dataset_slug)} className="font-medium hover:underline">
                        {f.dataset_slug}
                      </Link>
                      <span className="block text-muted-foreground">{f.fichier}</span>
                    </td>
                    <td className="px-2 py-2 text-end text-xs tabular-nums">{f.dernier_compte === null ? "—" : nombre(f.dernier_compte)}</td>
                    <td className="px-2 py-2">
                      <div className="flex items-center justify-end gap-2">
                        <Switch
                          checked={f.actif}
                          aria-label={f.actif ? t("synchros.active") : t("synchros.inactive")}
                          disabled={basculer.isPending}
                          onCheckedChange={(actif) => basculer.mutate({ code: f.code, actif })}
                        />
                        {aSupprimer === f.code ? (
                          <Button variant="destructive" size="sm" disabled={supprimer.isPending} onClick={() => supprimer.mutate(f.code)}>
                            {t("synchros.osm.confirmer")}
                          </Button>
                        ) : (
                          <Button variant="ghost" size="icon" aria-label={t("synchros.osm.retirer")} onClick={() => setASupprimer(f.code)}>
                            <Trash2 className="h-4 w-4" aria-hidden />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </details>

      <details className="rounded-xl border" open={parOnglet("nouveau").length > 0}>
        <summary className="cursor-pointer select-none p-3 text-sm font-medium">
          {t("synchros.osm.inventaireTitre", { count: tags.length })}
          {parOnglet("nouveau").length > 0 && (
            <span className="ms-2 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-800 dark:bg-violet-400/15 dark:text-violet-200">
              {t("synchros.osm.nouveaux", { count: parOnglet("nouveau").length })}
            </span>
          )}
        </summary>
        <div className="space-y-3 border-t p-3">
          <p className="text-xs text-muted-foreground">{t("synchros.osm.inventaireAide")}</p>
          <div className="flex flex-wrap items-center gap-2">
            {ONGLETS.map((o) => (
              <Button
                key={o}
                size="sm"
                variant={onglet === o ? "secondary" : "ghost"}
                onClick={() => {
                  setOnglet(o);
                  setLimite(PAR_PAGE);
                }}
              >
                {t(`synchros.osm.onglets.${o}`)} ({nombre(parOnglet(o).length)})
              </Button>
            ))}
            <Input
              type="search"
              dir="ltr"
              placeholder={t("synchros.osm.filtrer")}
              value={terme}
              onChange={(e) => setTerme(e.target.value)}
              className="h-9 w-full sm:ms-auto sm:w-56"
            />
          </div>
          {visibles.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("synchros.osm.aucunTag")}</p>
          ) : (
            <ul className="divide-y rounded-xl border text-sm">
              {visibles.slice(0, limite).map((tag) => {
                const evolution = tag.nb_precedent === null ? null : tag.nb - tag.nb_precedent;
                return (
                  <li key={`${tag.cle}=${tag.valeur}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
                    <a
                      href={`https://wiki.openstreetmap.org/wiki/Tag:${encodeURIComponent(`${tag.cle}=${tag.valeur}`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="min-w-0 flex-1 truncate font-mono text-xs hover:underline"
                      dir="ltr"
                    >
                      {tag.cle}={tag.valeur}
                    </a>
                    <span className="text-xs tabular-nums text-muted-foreground" dir="ltr">
                      {nombre(tag.nb)}
                      {evolution ? ` (${evolution > 0 ? "+" : ""}${nombre(evolution)})` : ""}
                    </span>
                    {tag.flux ? (
                      <span className="text-xs text-emerald-700 dark:text-emerald-300">{t("synchros.osm.prisPar", { flux: tag.flux })}</span>
                    ) : (
                      <span className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => {
                            setAjout({ tag: `${tag.cle}=${tag.valeur}`, cle: Date.now() });
                            requestAnimationFrame(() => document.getElementById("osm-ajout")?.scrollIntoView({ behavior: "smooth", block: "center" }));
                          }}
                        >
                          {t("synchros.osm.recuperer")}
                        </Button>
                        {tag.etat !== "a_etudier" && (
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => classer.mutate({ tag, etat: "a_etudier" })}>
                            {t("synchros.osm.aEtudier")}
                          </Button>
                        )}
                        {tag.etat !== "ecarte" && (
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => classer.mutate({ tag, etat: "ecarte" })}>
                            {t("synchros.osm.ecarter")}
                          </Button>
                        )}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {visibles.length > limite && (
            <Button variant="outline" size="sm" onClick={() => setLimite((l) => l + PAR_PAGE)}>
              {t("synchros.osm.voirPlus", { count: visibles.length - limite })}
            </Button>
          )}
        </div>
      </details>
    </div>
  );
};

export default TagsOsm;
