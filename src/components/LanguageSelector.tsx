import { Modal, ModalBody, ModalHeader } from "flowbite-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";
import { useLangue } from "@/hooks/use-langue";

// Noms des langues écrits dans leur propre langue : ils ne se traduisent pas.
const langues = [
  { code: "fr", nom: "Français" },
  { code: "en", nom: "English" },
  { code: "ar", nom: "العربية" },
];

export const LanguageSelector = () => {
  const { t, i18n } = useTranslation();
  const langueCourante = useLangue();
  const [ouvert, setOuvert] = useState(false);

  return (
    <>
      <button
        onClick={() => setOuvert(true)}
        className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
        aria-label={t("langue.choisir")}
      >
        <Languages className="h-5 w-5" />
      </button>
      <Modal show={ouvert} onClose={() => setOuvert(false)}>
        <ModalHeader>{t("langue.choisir")}</ModalHeader>
        <ModalBody>
          {langues.map((langue) => (
            <button
              key={langue.code}
              lang={langue.code}
              onClick={() => {
                i18n.changeLanguage(langue.code);
                setOuvert(false);
              }}
              className={`w-full p-2 my-1 rounded ${
                langueCourante === langue.code
                  ? "bg-accent text-accent-foreground"
                  : "bg-white text-black dark:bg-gray-800 dark:text-white"
              }`}
            >
              {langue.nom}
            </button>
          ))}
        </ModalBody>
      </Modal>
    </>
  );
};
