import { useTranslation } from "react-i18next";
import { Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { faGithub, faLinkedin, faXTwitter } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { routes } from "@/lib/routes";

const Footer = () => {
  const { t } = useTranslation();
  const annee = new Date().getFullYear();

  return (
    <footer className="mt-auto w-full pb-16 pt-10 text-gray-500 flex flex-col items-center text-center gap-6 bg-accent/90 dark:bg-black/25">
      <p>
        {t("footer.projet")}{" "}
        <a
          href="https://newalgeria.org"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-foreground hover:underline"
        >
          New Algeria
        </a>
      </p>

      <div className="flex items-center gap-5">
        <a
          href="https://github.com/new-algeria/data-dz"
          className="hover:text-foreground"
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t("footer.codeSource")}
        >
          <FontAwesomeIcon icon={faGithub} className="text-2xl" />
        </a>
        <a
          href="https://x.com/newalgeria_org"
          className="hover:text-foreground"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="X"
        >
          <FontAwesomeIcon icon={faXTwitter} className="text-2xl" />
        </a>
        <a
          href="https://www.linkedin.com/company/106182021/"
          className="hover:text-foreground"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="LinkedIn"
        >
          <FontAwesomeIcon icon={faLinkedin} className="text-2xl" />
        </a>
      </div>

      <a
        href={`mailto:admin@newalgeria.org?subject=${encodeURIComponent(t("contact.sujet"))}&body=${encodeURIComponent(t("contact.corps"))}`}
        className="inline-flex items-center gap-2 text-sm hover:text-foreground"
      >
        <Mail className="h-4 w-4" aria-hidden />
        {t("footer.contact")}
      </a>

      <nav aria-label={t("legal.lienConditions")} className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm">
        <Link to={routes.confidentialite} className="hover:text-foreground hover:underline">
          {t("legal.lienConfidentialite")}
        </Link>
        <span aria-hidden>·</span>
        <Link to={routes.conditions} className="hover:text-foreground hover:underline">
          {t("legal.lienConditions")}
        </Link>
      </nav>

      <hr className="w-1/4 border-primary/10 dark:border-primary-foreground/10" />

      <div className="text-muted-foreground">
        ©{annee} {t("footer.copyright")}
      </div>
    </footer>
  );
};

export default Footer;
