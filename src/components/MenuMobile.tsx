import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Database,
  FilePlus2,
  Inbox,
  LogIn,
  LogOut,
  Menu,
  Moon,
  ShieldCheck,
  Star,
  Sun,
  UserPlus,
  UserRound,
  UserRoundPen,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { AvatarMembre } from "@/components/AvatarMembre";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/contexte/ContexteAuth";
import { useLangue } from "@/hooks/use-langue";
import { useEstModerateur, useNbEnAttente } from "@/hooks/use-moderateur";
import { deconnecter } from "@/lib/auth";
import { LANGUES } from "@/lib/langues";
import { avecSuite, routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

const Lien = ({ vers, icone: Icone, children, fin }: { vers: string; icone: LucideIcon; children: ReactNode; fin?: ReactNode }) => (
  <Link
    to={vers}
    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-white/10"
  >
    <Icone className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
    <span className="flex-1">{children}</span>
    {fin}
  </Link>
);

const Titre = ({ children }: { children: ReactNode }) => (
  <p className="px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{children}</p>
);

/** Menu hamburger des petits écrans : navigation, compte, langue et thème. */
export const MenuMobile = ({ theme, basculerTheme }: { theme: "light" | "dark"; basculerTheme: () => void }) => {
  const { t, i18n } = useTranslation();
  const langue = useLangue();
  const naviguer = useNavigate();
  const emplacement = useLocation();
  const { session, profil } = useAuth();
  const { data: moderateur } = useEstModerateur();
  const { data: enAttente = 0 } = useNbEnAttente(Boolean(moderateur));
  const [ouvert, setOuvert] = useState(false);

  // Le panneau se referme dès qu'on change de page (ou d'ancre).
  useEffect(() => setOuvert(false), [emplacement.pathname, emplacement.search, emplacement.hash]);

  const suite = `${emplacement.pathname}${emplacement.search}`;
  const quitter = async () => {
    setOuvert(false);
    try {
      await deconnecter();
    } finally {
      naviguer(routes.accueil);
    }
  };

  return (
    <Sheet open={ouvert} onOpenChange={setOuvert}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative md:hidden" aria-label={t("navbar.ouvrirMenu")}>
          <Menu className="h-6 w-6" />
          {moderateur && enAttente > 0 && <span className="absolute end-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-500" aria-hidden />}
        </Button>
      </SheetTrigger>
      <SheetContent
        side={i18n.dir() === "rtl" ? "left" : "right"}
        libelleFermer={t("navbar.fermerMenu")}
        className="flex w-[85vw] max-w-sm flex-col gap-0 overflow-y-auto p-0"
      >
        <div className="border-b px-5 pb-4 pt-5">
          <SheetTitle className="text-base">{t("navbar.menu")}</SheetTitle>
          <SheetDescription className="sr-only">{t("navbar.menuDescription")}</SheetDescription>
          {session && profil ? (
            <Link to={routes.profil} className="mt-4 flex items-center gap-3 rounded-xl bg-gray-50 p-3 dark:bg-white/5">
              <AvatarMembre profil={profil} className="h-11 w-11" />
              <span className="min-w-0">
                <span className="block truncate font-semibold" dir="auto">
                  {profil.nom_affiche || profil.pseudo}
                </span>
                <span className="block truncate text-xs text-muted-foreground" dir="ltr">
                  @{profil.pseudo}
                </span>
              </span>
            </Link>
          ) : (
            !session && (
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button asChild variant="outline" className="gap-2">
                  <Link to={avecSuite(routes.connexion, suite)}>
                    <LogIn className="h-4 w-4" />
                    {t("auth.seConnecter")}
                  </Link>
                </Button>
                <Button asChild variant="outline" className="gap-2">
                  <Link to={avecSuite(routes.inscription, suite)}>
                    <UserPlus className="h-4 w-4" />
                    {t("navbar.inscription")}
                  </Link>
                </Button>
              </div>
            )
          )}
          <Button asChild className="mt-3 w-full gap-2 bg-emerald-700 text-white hover:bg-emerald-800">
            <Link to={routes.proposer}>
              <FilePlus2 className="h-4 w-4" />
              {t("navbar.proposer")}
            </Link>
          </Button>
        </div>

        <nav className="flex-1 px-2 pb-4" aria-label={t("navbar.menu")}>
          <Titre>{t("navbar.explorer")}</Titre>
          <Lien vers={routes.catalogue} icone={Database}>
            {t("navbar.catalogue")}
          </Lien>

          {session && (
            <>
              <Titre>{t("navbar.monEspace")}</Titre>
              <Lien vers={routes.favoris} icone={Star}>
                {t("favoris.titre")}
              </Lien>
              <Lien vers={routes.mesPropositions} icone={Inbox}>
                {t("propositions.mesTitre")}
              </Lien>
              <Lien vers={routes.profil} icone={UserRoundPen}>
                {t("auth.monProfil")}
              </Lien>
              {profil && (
                <Lien vers={routes.membre(profil.pseudo)} icone={UserRound}>
                  {t("auth.maPagePublique")}
                </Lien>
              )}
            </>
          )}

          {(moderateur || profil?.role === "admin") && (
            <>
              <Titre>{t("navbar.administration")}</Titre>
              {moderateur && (
                <Lien
                  vers={routes.moderation}
                  icone={ShieldCheck}
                  fin={
                    enAttente > 0 && (
                      <span className="rounded-full bg-amber-500 px-2 text-xs font-bold leading-5 text-white tabular-nums">
                        {enAttente > 99 ? "99+" : enAttente}
                      </span>
                    )
                  }
                >
                  {t("navbar.moderation")}
                </Lien>
              )}
              {profil?.role === "admin" && (
                <Lien vers={routes.adminMembres} icone={UsersRound}>
                  {t("admin.titre")}
                </Lien>
              )}
            </>
          )}

          <Titre>{t("navbar.preferences")}</Titre>
          <div className="space-y-3 px-3 pt-1">
            <div role="group" aria-label={t("langue.choisir")} className="grid grid-cols-3 gap-1 rounded-lg bg-gray-100 p-1 dark:bg-white/5">
              {LANGUES.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  lang={l.code}
                  onClick={() => i18n.changeLanguage(l.code)}
                  aria-pressed={langue === l.code}
                  className={cn(
                    "rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
                    langue === l.code ? "bg-white text-emerald-800 shadow-sm dark:bg-gray-800 dark:text-emerald-300" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {l.nom}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={basculerTheme}
              className="flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" aria-hidden /> : <Moon className="h-4 w-4" aria-hidden />}
              {theme === "dark" ? t("theme.passerClair") : t("theme.passerSombre")}
            </button>
          </div>
        </nav>

        {session && (
          <div className="border-t p-3">
            <button
              type="button"
              onClick={quitter}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              {t("auth.deconnexion")}
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
