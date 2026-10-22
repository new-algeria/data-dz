import { useTranslation } from "react-i18next";
import { Navbar } from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CustomMetaTags } from "@/components/MetaTags";
import { PageIntrouvable } from "@/components/PageIntrouvable";

/** 404 d'une proposition inexistante, ou que la RLS ne laisse pas voir. */
export const PropositionIntrouvable = () => {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900">
      <CustomMetaTags title={`${t("propositions.introuvableTitre")} - data-dz`} description={t("propositions.introuvableTexte")} />
      <Navbar />
      <main className="flex-1 pt-16">
        <PageIntrouvable titre={t("propositions.introuvableTitre")} texte={t("propositions.introuvableTexte")} />
      </main>
      <Footer />
    </div>
  );
};
