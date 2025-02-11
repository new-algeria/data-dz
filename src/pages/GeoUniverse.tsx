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
import { motion } from "framer-motion";
import { HeroHighlight, Highlight } from "@/components/ui/hero-highlight";
import ReactCountryFlag from "react-country-flag";
import { WorldMapConnection } from "@/components/api/WorldMapConnection";
import ScrollDownArrow from "@/components/ScrollDownArrow";
import { ThemeLanguageToggle } from "@/components/ThemeLanguageToggle";
import { useTranslation } from "react-i18next";
import { CustomMetaTags } from "@/components/MetaTags";
import axios from "axios";
import { MapCard } from "@/components/geo/MapCard";

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
  const [mapCards, setMapCards] = useState<JSX.Element[]>([]);

  useEffect(() => {
    const fetchMaps = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/maps/info`
        );
        const maps = response.data.maps;
        setMapCards(
          maps.map((map: any) => (
            <MapCard key={map} folderPath={map} />
          ))
        );
      } catch (error) {
        console.error("Error fetching maps:", error);
      }
    };

    fetchMaps();
  }, []);

  return (
    <div className="min-h-screen">
      <CustomMetaTags
        title="Geo-dz - Vizualize Algeria's Data"
        description="Explore and integrate with Data DZ's powerful Maps. Access real-time data about Algeria for your applications and services."
        path="/geo"
        logo="geo-dz-logo.png"
      />
      <Navbar />

      <ScrollDownArrow color="primary" />
      <div className="relative">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
        <div className="relative w-full h-screen">
          <video
            autoPlay
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          >
            <source
              src={`${
                import.meta.env.VITE_R2_BUCKET_URI
              }/videos/zoom_algerie_droit_sans_texte.mp4`}
              type="video/mp4"
            />
            Your browser does not support the video tag.
          </video>
          <motion.div
            initial={{ opacity: 0.0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.3,
              duration: 0.8,
              ease: "easeInOut",
            }}
            className="relative flex flex-col gap-4 items-center justify-center px-4 h-full"
          >
            <div
              className="text-3xl md:text-7xl font-bold text-center text-white"
              style={{ textShadow: "0 0 1px black" }}
            >
              {t("cartography.title")} <ReactCountryFlag countryCode="DZ" svg />
            </div>
            <div
              className="font-bold text-base md:text-4xl py-4 text-center text-primary"
              style={{ textShadow: "0 0 1px white" }}
            >
              {t("cartography.subtitle")}
            </div>
            {/*     <button
              className="bg-black dark:bg-white rounded-full w-fit text-white dark:text-black px-4 py-2 z-10"
              onClick={() =>
                window.scrollTo({ top: window.innerHeight, behavior: "smooth" })
              }
            >
              {t("cartography.cta")}
            </button> */}
          </motion.div>
        </div>
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

          <div className="container mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 justify-items-center">
            {mapCards}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default GeoUniverse;
