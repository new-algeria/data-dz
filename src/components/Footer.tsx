import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { faGithub, faLinkedin, faXTwitter, type IconDefinition } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useSection } from "@/hooks/use-section";
import { routes } from "@/lib/routes";
import { DrapeauAlgerie } from "./DrapeauAlgerie";
import { MascottePied } from "./MascottePied";

const URL_DEPOT = "https://github.com/new-algeria/data-dz";

const RESEAUX: { nom: string; url: string; icone: IconDefinition }[] = [
  { nom: "GitHub", url: URL_DEPOT, icone: faGithub },
  { nom: "X", url: "https://x.com/newalgeria_org", icone: faXTwitter },
  { nom: "LinkedIn", url: "https://www.linkedin.com/company/106182021/", icone: faLinkedin },
];

const TitreColonne = ({ children }: { children: ReactNode }) => (
  <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground">{children}</h2>
);

const classeLien = "text-sm text-muted-foreground transition-colors hover:text-emerald-700 dark:hover:text-emerald-400";

const LienInterne = ({ vers, children }: { vers: string; children: ReactNode }) => (
  <li>
    <Link to={vers} className={classeLien}>{children}</Link>
  </li>
);

/**
 * Pied de page : le fennec assis sur la bordure haute (MascottePied), présentation du projet et réseaux, colonnes de liens
 * (Explorer, Contribuer), puis copyright et pages légales.
 */
const Footer = () => {
  const { t } = useTranslation();
  const section = useSection();
  const annee = new Date().getFullYear();
  const lienContact = `mailto:admin@newalgeria.org?subject=${encodeURIComponent(t("contact.sujet"))}&body=${encodeURIComponent(t("contact.corps"))}`;

  return (
    <footer className="mt-auto w-full border-t border-border bg-muted/40 dark:bg-black/25">
      <MascottePied />

      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-10 px-4 pb-8 pt-12 sm:px-8 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <div className="col-span-2 max-w-sm md:col-span-1">
          <Link to={routes.accueil} className="inline-flex items-center gap-2">
            <img src={section.logo} alt="" className="h-9 w-9" />
            <span className="text-xl font-bold tracking-tight text-foreground">
              data<span className="text-emerald-600">-dz</span>
            </span>
          </Link>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t("footer.tagline")}</p>
          <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <DrapeauAlgerie className="h-4 w-6" titre={t("drapeau")} />
            {t("footer.projet")}
            <a href="https://newalgeria.org" target="_blank" rel="noopener noreferrer" className="font-semibold text-foreground hover:underline">
              New Algeria
            </a>
          </p>
          <ul className="mt-5 flex items-center gap-2">
            {RESEAUX.map((reseau) => (
              <li key={reseau.nom}>
                <a
                  href={reseau.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={reseau.nom === "GitHub" ? t("footer.codeSource") : reseau.nom}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:border-emerald-600/50 hover:text-emerald-700 dark:hover:text-emerald-400"
                >
                  <FontAwesomeIcon icon={reseau.icone} className="text-lg" />
                </a>
              </li>
            ))}
          </ul>
        </div>

        <nav aria-labelledby="pied-explorer" className="space-y-3">
          <TitreColonne><span id="pied-explorer">{t("navbar.explorer")}</span></TitreColonne>
          <ul className="space-y-2">
            <LienInterne vers={routes.catalogue}>{t("navbar.catalogue")}</LienInterne>
            <LienInterne vers={routes.thematiques}>{t("thematiques.titre")}</LienInterne>
            <LienInterne vers={routes.djazai}>DjazAI</LienInterne>
            <LienInterne vers={routes.api}>{t("navbar.apiLong")}</LienInterne>
          </ul>
        </nav>

        <nav aria-labelledby="pied-contribuer" className="space-y-3">
          <TitreColonne><span id="pied-contribuer">{t("footer.contribuer")}</span></TitreColonne>
          <ul className="space-y-2">
            <LienInterne vers={routes.proposer}>{t("navbar.proposer")}</LienInterne>
            <li>
              <a href={URL_DEPOT} target="_blank" rel="noopener noreferrer" className={classeLien}>{t("footer.codeSource")}</a>
            </li>
            <li>
              <a href={lienContact} className={classeLien}>{t("footer.contact")}</a>
            </li>
          </ul>
        </nav>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 pb-20 pt-5 text-xs text-muted-foreground sm:flex-row sm:justify-between sm:px-8">
          <p>©{annee} {t("footer.copyright")}</p>
          <nav aria-label={t("footer.legal")} className="flex items-center gap-4">
            <Link to={routes.confidentialite} className="hover:text-foreground hover:underline">{t("legal.lienConfidentialite")}</Link>
            <Link to={routes.conditions} className="hover:text-foreground hover:underline">{t("legal.lienConditions")}</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
