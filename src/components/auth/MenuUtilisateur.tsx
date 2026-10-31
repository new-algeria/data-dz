import type { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, Database, FilePlus2, Inbox, LogOut, ShieldCheck, Star, UserRound, UsersRound, type LucideIcon } from "lucide-react";
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
import { useEstModerateur, useNbEnAttente } from "@/hooks/use-moderateur";
import { deconnecter } from "@/lib/auth";
import { avecSuite, routes } from "@/lib/routes";

/** Ligne du menu du compte. */
const Element = ({ vers, icone: Icone, children, fin }: { vers: string; icone: LucideIcon; children: string; fin?: ReactNode }) => (
  <DropdownMenuItem asChild>
    <Link to={vers} className="cursor-pointer gap-2.5 py-2">
      <Icone className="h-4 w-4 text-muted-foreground" />
      <span className="flex-1">{children}</span>
      {fin}
    </Link>
  </DropdownMenuItem>
);

/** Visiteur : bouton vert « Se connecter ». Membre : avatar + nom ▾, menu du compte (identité, rôle, pages, déconnexion). */
export const MenuUtilisateur = () => {
  const { t } = useTranslation();
  const { session, utilisateur, profil, chargement } = useAuth();
  const { data: moderateur } = useEstModerateur();
  const { data: enAttente = 0 } = useNbEnAttente(Boolean(moderateur));
  const emplacement = useLocation();
  const naviguer = useNavigate();

  if (chargement) return <Skeleton className="h-9 w-28 rounded-full" />;

  if (!session) {
    const suite = `${emplacement.pathname}${emplacement.search}`;
    return (
      <Button asChild size="sm" className="h-9 rounded-full bg-emerald-700 px-4 text-white shadow-sm hover:bg-emerald-800">
        <Link to={avecSuite(routes.connexion, suite)}>{t("auth.seConnecter")}</Link>
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
  const nom = profil ? profil.nom_affiche || profil.pseudo : "";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 rounded-full py-0.5 pe-2 ps-0.5 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:hover:bg-white/10"
          aria-label={t("auth.menuCompte")}
        >
          {profil ? <AvatarMembre profil={profil} className="h-8 w-8" /> : <Skeleton className="h-8 w-8 rounded-full" />}
          <span className="hidden max-w-[9rem] truncate text-sm font-medium lg:inline" dir="auto">
            {nom}
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {profil && (
          <>
            <DropdownMenuLabel className="flex items-center gap-3 py-2 font-normal">
              <AvatarMembre profil={profil} className="h-10 w-10" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold" dir="auto">
                  {nom}
                </span>
                {utilisateur?.email && (
                  <span className="block truncate text-xs text-muted-foreground" dir="ltr">
                    {utilisateur.email}
                  </span>
                )}
                <span className="mt-1 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">
                  {t(`admin.roles.${profil.role}`)}
                </span>
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        )}
        <Element vers={routes.profil} icone={UserRound}>
          {t("auth.monProfil")}
        </Element>
        <Element vers={routes.mesPropositions} icone={Inbox}>
          {t("propositions.mesTitre")}
        </Element>
        <Element vers={routes.favoris} icone={Star}>
          {t("favoris.titre")}
        </Element>
        <Element vers={routes.proposer} icone={FilePlus2}>
          {t("navbar.proposer")}
        </Element>
        {(moderateur || profil?.role === "admin") && <DropdownMenuSeparator />}
        {moderateur && (
          <Element
            vers={routes.moderation}
            icone={ShieldCheck}
            fin={
              enAttente > 0 && (
                <span className="rounded-full bg-amber-500 px-1.5 text-[11px] font-bold leading-5 text-white tabular-nums">{enAttente > 99 ? "99+" : enAttente}</span>
              )
            }
          >
            {t("navbar.moderation")}
          </Element>
        )}
        {profil?.role === "admin" && (
          <>
            <Element vers={routes.adminMembres} icone={UsersRound}>
              {t("admin.titre")}
            </Element>
            <Element vers={routes.adminDonnees} icone={Database}>
              {t("adminDonnees.titre")}
            </Element>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={quitter} className="cursor-pointer gap-2.5 py-2 text-red-600 focus:text-red-600 dark:text-red-400">
          <LogOut className="h-4 w-4" />
          {t("auth.deconnexion")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
