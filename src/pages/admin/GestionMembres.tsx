import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Loader2, Lock, Search, UsersRound } from "lucide-react";
import { MiseEnPage } from "@/components/MiseEnPage";
import { AvatarMembre } from "@/components/AvatarMembre";
import { EtatErreur } from "@/components/EtatErreur";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useLangue } from "@/hooks/use-langue";
import { useValeurDifferee } from "@/hooks/use-valeur-differee";
import { changerRole, chargerMembres, MEMBRES_PAR_PAGE, ROLES, ROLES_ATTRIBUABLES, type MembreAdmin } from "@/lib/admin";
import { cleErreur } from "@/lib/erreurs";
import { formaterNombre, localeNombres } from "@/lib/fichiers";
import type { RoleUtilisateur } from "@/lib/profils";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

const TOUS = "tous";

const couleursRole: Record<RoleUtilisateur, string> = {
  membre: "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300",
  contributeur: "bg-sky-100 text-sky-800 dark:bg-sky-400/15 dark:text-sky-300",
  moderateur: "bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300",
  admin: "bg-violet-100 text-violet-800 dark:bg-violet-400/15 dark:text-violet-300",
};

interface ChangementRole {
  membre: MembreAdmin;
  nouveau: RoleUtilisateur;
}

/** /admin/users : liste des membres et changement de rôle (sauf pour les administrateurs). */
const GestionMembres = () => {
  const { t } = useTranslation();
  const langue = useLangue();
  const clientRequetes = useQueryClient();
  const [saisie, setSaisie] = useState("");
  const terme = useValeurDifferee(saisie.trim(), 300);
  const [filtreRole, setFiltreRole] = useState<RoleUtilisateur | typeof TOUS>(TOUS);
  const [page, setPage] = useState(0);
  const [changement, setChangement] = useState<ChangementRole | null>(null);
  const [enCours, setEnCours] = useState<string | null>(null);

  useEffect(() => setPage(0), [terme, filtreRole]);

  const requete = useQuery({
    queryKey: ["admin", "membres", terme, filtreRole, page],
    queryFn: () => chargerMembres({ terme, role: filtreRole === TOUS ? null : filtreRole, page }),
    placeholderData: keepPreviousData,
  });
  const total = requete.data?.total ?? 0;
  const nbPages = Math.max(1, Math.ceil(total / MEMBRES_PAR_PAGE));
  const formatDate = new Intl.DateTimeFormat(localeNombres(langue), { dateStyle: "medium" });
  const nom = (m: MembreAdmin) => m.nom_affiche || m.pseudo;

  const confirmer = async () => {
    if (!changement) return;
    const { membre, nouveau } = changement;
    setChangement(null);
    setEnCours(membre.id);
    try {
      await changerRole(membre.id, nouveau);
      await clientRequetes.invalidateQueries({ queryKey: ["admin", "membres"] });
      // Le rôle change aussi l'affichage de sa page publique et ses droits de modération.
      clientRequetes.invalidateQueries({ queryKey: ["membre"] });
      toast.success(t("admin.roleChange", { nom: nom(membre), role: t(`admin.roles.${nouveau}`) }));
    } catch (e) {
      toast.error(t("admin.erreurRole"), { description: t(cleErreur(e)) });
    } finally {
      setEnCours(null);
    }
  };

  return (
    <MiseEnPage titre={t("admin.titre")} sousTitre={t("admin.sousTitre")} chemin={routes.adminMembres} largeur="large">
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[14rem] flex-1">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
            placeholder={t("admin.rechercher")}
            aria-label={t("admin.rechercher")}
            className="ps-9 bg-white dark:bg-gray-900"
          />
        </div>
        <Select value={filtreRole} onValueChange={(valeur) => setFiltreRole(valeur as RoleUtilisateur | typeof TOUS)}>
          <SelectTrigger className="w-52 bg-white dark:bg-gray-900" aria-label={t("admin.filtrerRole")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TOUS}>{t("admin.tousRoles")}</SelectItem>
            {ROLES.map((role) => (
              <SelectItem key={role} value={role}>
                {t(`admin.roles.${role}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="mb-4 rounded-xl bg-violet-50 p-3 text-sm text-violet-900 dark:bg-violet-500/10 dark:text-violet-100">{t("admin.aide")}</p>

      {requete.isPending ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : requete.isError ? (
        <EtatErreur message={t(cleErreur(requete.error))} onReessayer={() => requete.refetch()} />
      ) : (
        <>
          <div
            className={cn(
              "overflow-x-auto rounded-2xl border border-gray-200/80 bg-white shadow-sm transition-opacity dark:border-white/10 dark:bg-gray-800",
              requete.isPlaceholderData && "opacity-60"
            )}
          >
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50 text-xs uppercase tracking-wide text-muted-foreground dark:bg-white/5">
                <tr>
                  <th scope="col" className="px-4 py-3 text-start font-semibold">{t("admin.colonnes.membre")}</th>
                  <th scope="col" className="hidden px-4 py-3 text-end font-semibold sm:table-cell">{t("admin.colonnes.reputation")}</th>
                  <th scope="col" className="hidden px-4 py-3 text-start font-semibold md:table-cell">{t("admin.colonnes.inscription")}</th>
                  <th scope="col" className="px-4 py-3 text-start font-semibold">{t("admin.colonnes.role")}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {requete.data.membres.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">
                      <UsersRound className="mx-auto mb-2 h-8 w-8 opacity-50" aria-hidden />
                      {t("admin.aucun")}
                    </td>
                  </tr>
                ) : (
                  requete.data.membres.map((membre) => (
                    <tr key={membre.id} className="align-middle">
                      <td className="px-4 py-3">
                        <Link to={routes.membre(membre.pseudo)} className="flex min-w-0 items-center gap-3 hover:underline">
                          <AvatarMembre profil={membre} className="h-9 w-9 text-xs" />
                          <span className="min-w-0">
                            <span className="block truncate font-medium" dir="auto">
                              {nom(membre)}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground" dir="ltr">
                              @{membre.pseudo}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className="hidden px-4 py-3 text-end tabular-nums sm:table-cell">{formaterNombre(membre.reputation ?? 0, langue)}</td>
                      <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                        <time dateTime={membre.cree_le}>{formatDate.format(new Date(membre.cree_le))}</time>
                      </td>
                      <td className="px-4 py-3">
                        {membre.role === "admin" ? (
                          <span
                            className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold", couleursRole.admin)}
                            title={t("admin.adminProtege")}
                          >
                            <Lock className="h-3.5 w-3.5" aria-hidden />
                            {t("admin.roles.admin")}
                            <span className="sr-only">({t("admin.adminProtege")})</span>
                          </span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Select
                              value={membre.role}
                              onValueChange={(valeur) => valeur !== membre.role && setChangement({ membre, nouveau: valeur as RoleUtilisateur })}
                              disabled={enCours !== null}
                            >
                              <SelectTrigger
                                className={cn("h-8 w-40 rounded-full border-0 text-xs font-semibold", couleursRole[membre.role])}
                                aria-label={t("admin.changerRole", { nom: nom(membre) })}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ROLES_ATTRIBUABLES.map((role) => (
                                  <SelectItem key={role} value={role}>
                                    {t(`admin.roles.${role}`)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {enCours === membre.id && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden />}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
            <span>{t("admin.compteur", { count: total, nombre: formaterNombre(total, langue) })}</span>
            {nbPages > 1 && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page === 0} aria-label={t("admin.precedente")}>
                  <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
                </Button>
                <span className="tabular-nums">{t("admin.page", { page: page + 1, total: nbPages })}</span>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page + 1 >= nbPages} aria-label={t("admin.suivante")}>
                  <ChevronRight className="h-4 w-4 rtl:rotate-180" />
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      <AlertDialog open={changement !== null} onOpenChange={(ouvert) => !ouvert && setChangement(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.confirmerTitre")}</AlertDialogTitle>
            <AlertDialogDescription>
              {changement &&
                t("admin.confirmerTexte", {
                  nom: nom(changement.membre),
                  ancien: t(`admin.roles.${changement.membre.role}`),
                  nouveau: t(`admin.roles.${changement.nouveau}`),
                })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {changement && <p className="text-sm text-muted-foreground">{t(`admin.descriptions.${changement.nouveau}`)}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel>{t("propositions.detail.annuler")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmer} className="bg-emerald-700 text-white hover:bg-emerald-800">
              {t("admin.confirmer")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MiseEnPage>
  );
};

export default GestionMembres;
