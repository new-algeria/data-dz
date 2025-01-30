import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Marquee } from "@/components/ui/marquee";
import { Lock, Unlock } from "lucide-react";
import { Link } from "react-router-dom";
import Footer from "@/components/Footer";
import { ApiSearch } from "@/components/api/ApiSearch";
import { AuroraBackground } from "@/components/ui/aurora-bg";
import { motion } from "framer-motion";
import { HeroHighlight, Highlight } from "@/components/ui/hero-highlight";
import ReactCountryFlag from "react-country-flag";
import { WorldMapConnection } from "@/components/api/WorldMapConnection";
import ScrollDownArrow from "@/components/ScrollDownArrow";
import { ThemeLanguageToggle } from "@/components/ThemeLanguageToggle";
import { useTranslation } from "react-i18next";
import { CustomMetaTags } from "@/components/MetaTags";
import axios from "axios";

const technologies = [
  "REST API",
  "GraphQL",
  "WebSocket",
  "gRPC",
  "OAuth 2.0",
  "JWT",
  "OpenAPI",
  "Swagger",
];

const GeoUniverse = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const { t } = useTranslation();

  const filePath = "./maps/test_carte_barcelone.html";

  return (
    <div className="min-h-screen">
      <CustomMetaTags
        title="Geo-dz - Vizualize Algeria's Data"
        description="Explore and integrate with Data DZ's powerful Maps. Access real-time data about Algeria for your applications and services."
        path="/geo"
      />
      <Navbar />

      <ScrollDownArrow color="primary" />
      <div className="relative">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
        <AuroraBackground>
          <motion.div
            initial={{ opacity: 0.0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.3,
              duration: 0.8,
              ease: "easeInOut",
            }}
            className="relative flex flex-col gap-4 items-center justify-center px-4"
          >
            <div className="text-3xl md:text-7xl font-bold dark:text-white text-center">
              {t("cartography.title")} <ReactCountryFlag countryCode="DZ" svg />
            </div>
            <div className="font-extralight text-base md:text-4xl dark:text-neutral-200 py-4">
              {t("cartography.subtitle")}
            </div>
            <button
              className="bg-black dark:bg-white rounded-full w-fit text-white dark:text-black px-4 py-2 z-50"
              onClick={() =>
                window.scrollTo({ top: window.innerHeight, behavior: "smooth" })
              }
            >
              {t("cartography.cta")}
            </button>
          </motion.div>
        </AuroraBackground>
        <div className="container relative pb-16 -mt-32 ">
          <HeroHighlight className="">
            <motion.h1
              initial={{
                opacity: 0,
                y: 20,
              }}
              animate={{
                opacity: 1,
                y: [20, -5, 0],
              }}
              transition={{
                duration: 0.5,
                ease: [0.4, 0.0, 0.2, 1],
              }}
              className="text-4xl px-4 md:text-4xl lg:text-5xl font-bold text-neutral-700 dark:text-white max-w-4xl leading-relaxed lg:leading-snug text-center mx-auto "
            >
              {t("api.universe.hi")}{" "}
              <Highlight className="text-black dark:text-white">
                {t("cartography.best_maps")}{" "}
              </Highlight>
            </motion.h1>
          </HeroHighlight>

          <div className="border rounded-lg shadow-md p-4 bg-white">
            <iframe
              src={"./maps/test_carte_barcelone.html"}
              className="w-full h-96 border-none"
            />
          </div>

          <div className="-mt-36">
            <WorldMapConnection />
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default GeoUniverse;
