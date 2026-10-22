import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogIn, LogOut, UserRound, UserRoundPen } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { AvatarMembre } from "@/components/AvatarMembre";
import { useAuth } from "@/contexte/ContexteAuth";
import { deconnecter } from "@/lib/auth";
import { avecSuite, routes } from "@/lib/routes";

/** Bouton « Se connecter », ou menu du membre connecté (avatar, profil, page publique, déconnexion). */
export const MenuUtilisateur = () => {
  const { t } = useTranslation();
  const { session, profil, chargement } = useAuth();
  const emplacement = useLocation();
  const naviguer = useNavigate();

  if (chargement) return <Skeleton className="h-9 w-9 rounded-full" />;

  if (!session) {
    const suite = `${emplacement.pathname}${emplacement.search}`;
    return (
      <Button asChild size="sm" variant="outline" className="gap-2 bg-white/70 dark:bg-white/5">
        <Link to={avecSuite(routes.connexion, suite)} aria-label={t("auth.seConnecter")}>
          <LogIn className="h-4 w-4" />
          <span className="hidden sm:inline">{t("auth.seConnecter")}</span>
        </Link>
      </Button>
    );
  }

  const quitter = async () => {
    try {
      await deconnecter();
    } finally {
      naviguer("/");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="rounded-full ring-offset-background transition-shadow hover:ring-2 hover:ring-emerald-500/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          aria-label={t("auth.menuCompte")}
        >
          {profil ? <AvatarMembre profil={profil} /> : <Skeleton className="h-9 w-9 rounded-full" />}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {profil && (
          <>
            <DropdownMenuLabel className="font-normal">
              <p className="truncate text-sm font-semibold">{profil.nom_affiche || profil.pseudo}</p>
              <p className="truncate text-xs text-muted-foreground" dir="ltr">
                @{profil.pseudo}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem asChild>
          <Link to={routes.profil} className="cursor-pointer gap-2">
            <UserRoundPen className="h-4 w-4" />
            {t("auth.monProfil")}
          </Link>
        </DropdownMenuItem>
        {profil && (
          <DropdownMenuItem asChild>
            <Link to={routes.membre(profil.pseudo)} className="cursor-pointer gap-2">
              <UserRound className="h-4 w-4" />
              {t("auth.maPagePublique")}
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={quitter} className="cursor-pointer gap-2 text-red-600 focus:text-red-600 dark:text-red-400">
          <LogOut className="h-4 w-4" />
          {t("auth.deconnexion")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
