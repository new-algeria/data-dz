import React from "react";
import { useTranslation } from "react-i18next";
import {
  faGithub,
  faLinkedin,
  faTwitter,
  faXTwitter,
} from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const Footer = () => {
  const { t } = useTranslation();

  const year = new Date().getFullYear();

  return (
    <footer className="container mx-auto pb-16 pt-10 text-gray-500 flex flex-col items-center text-center gap-6 bg-accent/90 dark:bg-black/25">
      <img
        src={`${import.meta.env.VITE_R2_BUCKET_URI}/logo/logo_horizontal-small.png`}
        alt="New Algeria"
        className="w-64 h-15 -mb-6"
      />

      <div className="flex items-center gap-5">
        <a
          href="https://github.com/new-algeria"
          className="hover:text-foreground"
          target="_blank"
        >
          <FontAwesomeIcon icon={faGithub} className="text-2xl" />
        </a>
        <a
          href="https://x.com/newalgeria_org"
          className="hover:text-foreground"
          target="_blank"
        >
          <FontAwesomeIcon icon={faXTwitter} className="text-2xl" />
        </a>
        <a
          href="https://www.linkedin.com/company/106182021/"
          className="hover:text-foreground"
          target="_blank"
        >
          <FontAwesomeIcon icon={faLinkedin} className="text-2xl" />
        </a>
      </div>

      {/*   <div className="flex flex-col gap-2">
        <h3 className="font-semibold text-white">{t("footer.product")}</h3>
        <a
          href="https://www.data-dz.com"
          className="text-sm hover:text-foreground"
        >
          Data-dz
        </a>
        <a
          href="https://www.data-dz.com/api"
          className="text-sm hover:text-foreground"
        >
          Api-dz
        </a>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="font-semibold text-white">{t("footer.resources")}</h3>
        <a
          href="https://github.com/new-algeria"
          className="text-sm hover:text-foreground"
        >
          {t("footer.community")}
        </a>
        <a
          href="mailto:admin@newalgeria.org"
          className="text-sm hover:text-foreground"
        >
          {t("footer.contact")}
        </a>
      </div> */}

      <hr className="w-1/4 border-primary/10 dark:border-primary-foreground/10" />

      <div className="text-muted-foreground">
        ©{year} {t("footer.copyright")}
      </div>
    </footer>
  );
};

export default Footer;
