import { Modal, ModalBody, ModalHeader } from "flowbite-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";

export const LanguageSelector = () => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const languages = [
    { code: "fr", name: "Français" },
    { code: "en", name: "English" },
    { code: "ar", name: "العربية" },
  ];

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
      >
        <Languages className="h-5 w-5" />
      </button>
      <Modal show={isOpen} onClose={() => setIsOpen(false)}>
        <ModalHeader>Choisir la langue</ModalHeader>
        <ModalBody>
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                i18n.changeLanguage(lang.code);
                setIsOpen(false);
              }}
              className={`w-full p-2 my-1 rounded ${
                i18n.language === lang.code
                  ? "bg-accent text-accent-foreground"
                  : "bg-white text-black dark:bg-gray-800 dark:text-white"
              }`}
            >
              {lang.name}
            </button>
          ))}
        </ModalBody>
      </Modal>
    </>
  );
};
