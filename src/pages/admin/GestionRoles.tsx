import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { KeyRound, Loader2, Lock, Pencil, Plus, Trash2, UsersRound } from "lucide-react";
import { MiseEnPage } from "@/components/MiseEnPage";
import { EtatErreur } from "@/components/EtatErreur";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
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
import { useRoles } from "@/hooks/use-roles";
import { cleErreur } from "@/lib/erreurs";
import {
  CLASSES_COULEUR,
  codeDepuisNom,
  COULEURS_ROLE,
  descriptionRole,
  enregistrerRole,
  FORMAT_CODE_ROLE,
  NIVEAUX_BASE,
  nomRole,
  PERMISSIONS,
  supprimerRole,
  type ChampsRole,
  type Role,
} from "@/lib/roles";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

const LANGUES = ["fr", "en", "ar"] as const;

const formulaireVide = (): ChampsRole => ({
  code: "",
  nom: { fr: "", en: "", ar: "" },
  description: { fr: "", en: "", ar: "" },
  role_base: "membre",
  permissions: [],
  couleur: "vert",
});

/** /admin/roles : rôles système (noms, descriptions, permissions) et rôles personnalisés (création, suppression). Admin seulement. */
const GestionRoles = () => {
  const { t } = useTranslation();
  const langue = useLangue();
  const traduire = (cle: string) => t(cle);
  const clientRequetes = useQueryClient();
  const requete = useRoles();
  const [edition, setEdition] = useState<{ creation: boolean; champs: ChampsRole; systeme: boolean } | null>(null);
  const [suppression, setSuppression] = useState<Role | null>(null);
  const [codeModifie, setCodeModifie] = useState(false);

  const rafraichir = async () => {
    await clientRequetes.invalidateQueries({ queryKey: ["roles"] });
    clientRequetes.invalidateQueries({ queryKey: ["admin", "membres"] });
    clientRequetes.invalidateQueries({ queryKey: ["membre"] });
  };

  const enregistrement = useMutation({
    mutationFn: (champs: ChampsRole) => enregistrerRole(champs),
    onSuccess: async (role) => {
      setEdition(null);
      await rafraichir();
      toast.success(t("roles.enregistre", { nom: nomRole(role, role.code, langue, traduire) }));
    },
    onError: (e) => toast.error(t("roles.erreur"), { description: t(cleErreur(e)) }),
  });

  const effacement = useMutation({
    mutationFn: (code: string) => supprimerRole(code),
    onSuccess: async () => {
      setSuppression(null);
      await rafraichir();
      toast.success(t("roles.supprime"));
    },
    onError: (e) => toast.error(t("roles.erreur"), { description: t(cleErreur(e)) }),
  });

  const ouvrir = (role?: Role) => {
    setCodeModifie(false);
    setEdition(
      role
        ? {
            creation: false,
            systeme: role.systeme,
            champs: {
              code: role.code,
              nom: { en: "", ar: "", ...role.nom },
              description: { fr: "", en: "", ar: "", ...role.description },
              role_base: role.role_base,
              permissions: [...role.permissions],
              couleur: role.couleur,
            },
          }
        : { creation: true, systeme: false, champs: formulaireVide() }
    );
  };

  const modifier = (champs: Partial<ChampsRole>) => setEdition((actuelle) => (actuelle ? { ...actuelle, champs: { ...actuelle.champs, ...champs } } : actuelle));
  const champs = edition?.champs;
  const codeValide = Boolean(champs && FORMAT_CODE_ROLE.test(champs.code));
  const codePris = Boolean(edition?.creation && champs && requete.data?.some((role) => role.code === champs.code));
  const valide = Boolean(champs?.nom.fr.trim()) && codeValide && !codePris;

  return (
    <MiseEnPage titre={t("roles.titre")} sousTitre={t("roles.sousTitre")} chemin={routes.adminRoles} largeur="large">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="outline" className="gap-2">
          <Link to={routes.adminMembres}>
            <UsersRound className="h-4 w-4" aria-hidden />
            {t("admin.titre")}
          </Link>
        </Button>
        <Button onClick={() => ouvrir()} className="gap-2 bg-emerald-700 text-white hover:bg-emerald-800">
          <Plus className="h-4 w-4" aria-hidden />
          {t("roles.nouveau")}
        </Button>
      </div>

      <p className="mb-4 rounded-xl bg-violet-50 p-3 text-sm text-violet-900 dark:bg-violet-500/10 dark:text-violet-100">{t("roles.aide")}</p>

      {requete.isPending ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : requete.isError ? (
        <EtatErreur message={t(cleErreur(requete.error))} onReessayer={() => requete.refetch()} />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {requete.data.map((role) => (
            <li key={role.code} className="flex flex-col gap-3 rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-gray-800">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold", CLASSES_COULEUR[role.couleur])}>
                    {role.systeme && <Lock className="h-3 w-3" aria-hidden />}
                    {nomRole(role, role.code, langue, traduire)}
                  </span>
                  <p className="mt-2 text-sm text-muted-foreground">{descriptionRole(role, role.code, langue, traduire)}</p>
                </div>
                {role.code !== "admin" && (
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="icon" onClick={() => ouvrir(role)} aria-label={t("roles.modifier", { nom: nomRole(role, role.code, langue, traduire) })}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {!role.systeme && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => setSuppression(role)}
                        aria-label={t("roles.supprimer", { nom: nomRole(role, role.code, langue, traduire) })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 text-xs">
                <span className="rounded-md bg-gray-100 px-2 py-0.5 dark:bg-white/10">
                  {t("roles.niveau")} : {t(`admin.roles.${role.role_base}`)}
                </span>
                {(role.code === "admin" ? PERMISSIONS : role.permissions).map((permission) => (
                  <span key={permission} className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
                    <KeyRound className="h-3 w-3" aria-hidden />
                    {t(`roles.permissions.${permission}.nom`)}
                  </span>
                ))}
                <code className="ms-auto text-muted-foreground" dir="ltr">
                  {role.code}
                </code>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={edition !== null} onOpenChange={(ouvert) => !ouvert && !enregistrement.isPending && setEdition(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{edition?.creation ? t("roles.nouveau") : t("roles.modifierTitre")}</DialogTitle>
            <DialogDescription>{edition?.systeme ? t("roles.aideSysteme") : t("roles.aideDialogue")}</DialogDescription>
          </DialogHeader>
          {champs && edition && (
            <form
              className="space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
                if (valide) enregistrement.mutate(champs);
              }}
            >
              <div className="grid gap-3 sm:grid-cols-3">
                {LANGUES.map((code) => (
                  <div key={code} className="space-y-1.5">
                    <Label htmlFor={`role-nom-${code}`}>
                      {t("roles.champs.nom")} ({code.toUpperCase()}){code === "fr" && " *"}
                    </Label>
                    <Input
                      id={`role-nom-${code}`}
                      dir={code === "ar" ? "rtl" : "ltr"}
                      maxLength={60}
                      value={champs.nom[code] ?? ""}
                      required={code === "fr"}
                      disabled={edition.systeme}
                      onChange={(e) => {
                        const nom = { ...champs.nom, [code]: e.target.value };
                        modifier(edition.creation && code === "fr" && !codeModifie ? { nom, code: codeDepuisNom(e.target.value) } : { nom });
                      }}
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="role-code">{t("roles.champs.code")}</Label>
                <Input
                  id="role-code"
                  dir="ltr"
                  value={champs.code}
                  disabled={!edition.creation}
                  maxLength={40}
                  onChange={(e) => {
                    setCodeModifie(true);
                    modifier({ code: e.target.value.toLowerCase() });
                  }}
                  aria-invalid={edition.creation && (!codeValide || codePris)}
                />
                <p className={cn("text-xs", edition.creation && champs.code && (!codeValide || codePris) ? "text-red-600" : "text-muted-foreground")}>
                  {codePris ? t("roles.codePris") : t("roles.aideCode")}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {LANGUES.map((code) => (
                  <div key={code} className="space-y-1.5">
                    <Label htmlFor={`role-description-${code}`}>
                      {t("roles.champs.description")} ({code.toUpperCase()})
                    </Label>
                    <Textarea
                      id={`role-description-${code}`}
                      dir={code === "ar" ? "rtl" : "ltr"}
                      rows={3}
                      maxLength={300}
                      value={champs.description[code] ?? ""}
                      disabled={edition.systeme}
                      onChange={(e) => modifier({ description: { ...champs.description, [code]: e.target.value } })}
                    />
                  </div>
                ))}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="role-niveau">{t("roles.niveau")}</Label>
                  <Select value={champs.role_base} onValueChange={(valeur) => modifier({ role_base: valeur as ChampsRole["role_base"] })} disabled={edition.systeme}>
                    <SelectTrigger id="role-niveau">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {NIVEAUX_BASE.map((niveau) => (
                        <SelectItem key={niveau} value={niveau}>
                          {t(`admin.roles.${niveau}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">{t(`admin.descriptions.${champs.role_base}`)}</p>
                </div>
                <fieldset className="space-y-1.5">
                  <legend className="text-sm font-medium">{t("roles.champs.couleur")}</legend>
                  <div className="flex flex-wrap gap-2">
                    {COULEURS_ROLE.map((couleur) => (
                      <button
                        key={couleur}
                        type="button"
                        onClick={() => modifier({ couleur })}
                        aria-pressed={champs.couleur === couleur}
                        aria-label={t(`roles.couleurs.${couleur}`)}
                        className={cn(
                          "rounded-full px-3 py-1 text-xs font-semibold ring-offset-2 transition",
                          CLASSES_COULEUR[couleur],
                          champs.couleur === couleur && "ring-2 ring-emerald-600 dark:ring-offset-gray-900"
                        )}
                      >
                        {t(`roles.couleurs.${couleur}`)}
                      </button>
                    ))}
                  </div>
                </fieldset>
              </div>

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">{t("roles.champs.permissions")}</legend>
                {PERMISSIONS.map((permission) => (
                  <label key={permission} className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 hover:bg-gray-50 dark:hover:bg-white/5">
                    <Checkbox
                      checked={champs.permissions.includes(permission)}
                      onCheckedChange={(coche) =>
                        modifier({ permissions: coche ? [...champs.permissions, permission] : champs.permissions.filter((p) => p !== permission) })
                      }
                      className="mt-0.5"
                    />
                    <span>
                      <span className="block text-sm font-medium">{t(`roles.permissions.${permission}.nom`)}</span>
                      <span className="block text-xs text-muted-foreground">{t(`roles.permissions.${permission}.description`)}</span>
                    </span>
                  </label>
                ))}
              </fieldset>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEdition(null)} disabled={enregistrement.isPending}>
                  {t("propositions.detail.annuler")}
                </Button>
                <Button type="submit" disabled={!valide || enregistrement.isPending} className="gap-2 bg-emerald-700 text-white hover:bg-emerald-800">
                  {enregistrement.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                  {t("roles.enregistrer")}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={suppression !== null} onOpenChange={(ouvert) => !ouvert && setSuppression(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("roles.confirmerSuppression", { nom: suppression ? nomRole(suppression, suppression.code, langue, traduire) : "" })}</AlertDialogTitle>
            <AlertDialogDescription>
              {suppression && t("roles.texteSuppression", { niveau: t(`admin.roles.${suppression.role_base}`) })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("propositions.detail.annuler")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => suppression && effacement.mutate(suppression.code)} className="bg-red-600 text-white hover:bg-red-700">
              {t("roles.supprimerBouton")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MiseEnPage>
  );
};

export default GestionRoles;
