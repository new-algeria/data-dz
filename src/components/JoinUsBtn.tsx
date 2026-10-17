import { useTranslation } from "react-i18next";

// Lien simple vers l'organisation GitHub : les invitations passeront plus tard par une fonction serveur.
const JoinUsBtn = () => {
  const { t } = useTranslation();

  return (
    <a
      href="https://github.com/new-algeria"
      target="_blank"
      rel="noopener noreferrer"
      className="bg-black text-primary-foreground hover:bg-primary/90 dark:bg-accent dark:hover:bg-accent/90 py-2 px-4 rounded-lg dark:text-black"
      aria-label={t("navbar.rejoindre")}
    >
      <span className="hidden sm:inline">✨ {t("navbar.rejoindre")}</span>
      <span className="sm:hidden">✨</span>
    </a>
  );
};

export default JoinUsBtn;
