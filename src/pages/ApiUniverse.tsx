import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Marquee } from "@/components/ui/marquee";
import { Lock, Unlock } from "lucide-react";
import { Link } from "react-router-dom";
import { Footer } from "@/components/Footer";
import { ApiSearch } from "@/components/api/ApiSearch";
import { AuroraBackground } from "@/components/ui/aurora-bg";
import { motion } from "framer-motion";
import { HeroHighlight, Highlight } from "@/components/ui/hero-highlight";
import ReactCountryFlag from "react-country-flag";
import { WorldMapConnection } from "@/components/api/WorldMapConnection";
import ScrollDownArrow from "@/components/ScrollDownArrow";
import { ThemeLanguageToggle } from "@/components/ThemeLanguageToggle";
import { useTranslation } from "react-i18next";

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

const ApiUniverse = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const { t } = useTranslation();

  return (
    <div className="min-h-screen">
      <Navbar />
      <ThemeLanguageToggle />
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
              {t("api.universe.title")}{" "}
              <ReactCountryFlag countryCode="DZ" svg />
            </div>
            <div className="font-extralight text-base md:text-4xl dark:text-neutral-200 py-4">
              {t("api.universe.subtitle")}
            </div>
            <button
              className="bg-black dark:bg-white rounded-full w-fit text-white dark:text-black px-4 py-2"
              onClick={() =>
                window.scrollTo({ top: window.innerHeight, behavior: "smooth" })
              }
            >
              {t("api.universe.get_started")}
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
                {t("api.universe.best_apis")}{" "}
              </Highlight>
            </motion.h1>
          </HeroHighlight>

          <div className="-mt-36">
            <ApiSearch />
            <div className="mt-8 text-right">
              <a
                href={`mailto:new-algeria.org@gmail.com?subject=Proposition%20d%27API&body=Bonjour%2C%0A%0AJe%20souhaite%20proposer%20une%20API%20pour%20votre%20plateforme.%20Voici%20les%20d%C3%A9tails%20%3A%0A%0ANom%20de%20l%27API%20%3A%20%0A%0ADescription%20%3A%20%0A%0AURL%20de%20l%27API%20%3A%20%0A%0ACordialement%2C%0AVotre%20Nom`}
              >
                <Button
                  variant="outline"
                  size="lg"
                  className="mx-auto text-slate-900 dark:text-white dark:hover:bg-gray-800"
                >
                  {t("api.universe.propose_api")}
                </Button>
              </a>
            </div>
            <div className="mt-20">
              <h2 className="text-xl font-semibold mb-4">
                {t("api.universe.supported_technologies")}
              </h2>
              <Marquee className="py-4">
                {technologies.map((tech) => (
                  <span
                    key={tech}
                    className="mx-8 dark:text-primary-foreground text-black"
                  >
                    {tech}
                  </span>
                ))}
              </Marquee>
            </div>
          </div>

          <WorldMapConnection />
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ApiUniverse;
