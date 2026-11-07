import { Suspense, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/use-roles";
import { chargerDonneeAdmin, type DonneeAdmin } from "@/lib/admin-donnees";
import { lazyAvecRechargement } from "@/lib/rechargement";
import { routes } from "@/lib/routes";

// Le dialogue d'administration n'est téléchargé que par ceux qui cliquent sur « Modifier ».
const DialogueDonnee = lazyAvecRechargement(() => import("@/components/admin/DialogueDonnee").then((module) => ({ default: module.DialogueDonnee })));

/**
 * « Modifier » sur la fiche, pour un admin ou un membre dont le rôle porte `donnees.gerer` : ouvre le même dialogue
 * que /admin/datasets. Simple confort d'affichage : l'API vérifie les droits à chaque enregistrement.
 */
export const BoutonModifierDonnee = ({ slug }: { slug: string }) => {
  const { t } = useTranslation();
  const { a } = usePermissions();
  const naviguer = useNavigate();
  const clientRequetes = useQueryClient();
  const [donnee, setDonnee] = useState<DonneeAdmin | null>(null);
  const [chargement, setChargement] = useState(false);
  if (!a("donnees.gerer")) return null;

  const ouvrir = async () => {
    setChargement(true);
    try {
      setDonnee(await chargerDonneeAdmin(slug));
    } catch {
      toast.error(t("fiche.modifierErreur"));
    } finally {
      setChargement(false);
    }
  };

  return (
    <>
      <Button type="button" size="lg" variant="outline" onClick={() => void ouvrir()} disabled={chargement} className="gap-2 bg-white/80 dark:bg-white/5">
        {chargement ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Pencil className="h-5 w-5" aria-hidden />}
        {t("fiche.modifier")}
      </Button>
      {donnee && (
        <Suspense fallback={null}>
          <DialogueDonnee
            ouvert
            donnee={donnee}
            onFermer={() => setDonnee(null)}
            onEnregistre={(nouveauSlug) => {
              setDonnee(null);
              // Comme après une action dans /admin/datasets : fiche, catalogue, statistiques et listes d'admin.
              for (const cle of ["fiche", "catalogue", "statistiques", "moderation", "admin"]) void clientRequetes.invalidateQueries({ queryKey: [cle] });
              if (nouveauSlug !== slug) naviguer(routes.donnee(nouveauSlug), { replace: true });
            }}
          />
        </Suspense>
      )}
    </>
  );
};
