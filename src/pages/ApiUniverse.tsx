import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ThemeLanguageToggle } from "@/components/ThemeLanguageToggle";
import ApiSearch from "@/components/api/ApiSearch";
import WorldMapConnection from "@/components/api/WorldMapConnection";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollDownArrow from "@/components/ScrollDownArrow";

export default function ApiUniverse() {
  const { t } = useTranslation();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <ThemeLanguageToggle />
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            {t("api.title")}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t("api.description")}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoaded ? 1 : 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-16"
        >
          <ApiSearch />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoaded ? 1 : 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mb-16"
        >
          <WorldMapConnection />
        </motion.div>

        <ScrollDownArrow />
      </div>
      <Footer />
    </div>
  );
}