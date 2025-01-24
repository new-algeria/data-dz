import React from "react";
import { HeroParallax } from "@/components/ui/hero-parallax";
import { useTranslation } from "react-i18next";
import {
  faAddressBook,
  faBriefcase,
  faBuilding,
  faBus,
  faCloudSun,
  faFootballBall,
  faHospital,
  faLocation,
  faMapLocation,
  faMedkit,
  faPalette,
  faSchool,
  faShoppingCart,
  faUniversity,
  faUtensils,
} from "@fortawesome/free-solid-svg-icons";

export const products = [
  {
    title: "pharmaciesOnDuty",
    link: "/api/pharmacies",
    thumbnail: "/pharmacy.svg",
    icon: faMedkit,
  },
  {
    title: "wilayas",
    link: "/api/wilayas",
    thumbnail: "/wilaya.svg",
    icon: faMapLocation,
  },
  {
    title: "postalCodes",
    link: "/api/codes-postaux",
    thumbnail: "/postal-code.svg",
    icon: faLocation,
  },
  {
    title: "communes",
    link: "/api/communes",
    thumbnail: "/commune.svg",
    icon: faAddressBook,
  },
  {
    title: "hospitals",
    link: "/api/hopitaux",
    thumbnail: "/hospital.svg",
    icon: faHospital,
  },
  {
    title: "universities",
    link: "/api/universites",
    thumbnail: "/university.svg",
    icon: faSchool,
  },
  {
    title: "restaurants",
    link: "/api/restaurants",
    thumbnail: "/restaurant.svg",
    icon: faUtensils,
  },
  {
    title: "banks",
    link: "/api/banques",
    thumbnail: "/bank.svg",
    icon: faUniversity,
  },
  {
    title: "administrations",
    link: "/api/administrations",
    thumbnail: "/administration.svg",
    icon: faBuilding,
  },
  {
    title: "transport",
    link: "/api/transport",
    thumbnail: "/transport.svg",
    icon: faBus,
  },
  {
    title: "weather",
    link: "/api/meteo",
    thumbnail: "/weather.svg",
    icon: faCloudSun,
  },
  {
    title: "enterprises",
    link: "/api/entreprises",
    thumbnail: "/enterprise.svg",
    icon: faBriefcase,
  },
  {
    title: "markets",
    link: "/api/marches",
    thumbnail: "/market.svg",
    icon: faShoppingCart,
  },
  {
    title: "sports",
    link: "/api/sports",
    thumbnail: "/sports.svg",
    icon: faFootballBall,
  },
  {
    title: "culture",
    link: "/api/culture",
    thumbnail: "/culture.svg",
    icon: faPalette,
  },
];

export function HeroParallaxDemo() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen w-full ">
      <div className="absolute top-0 left-0 w-full ">
        <HeroParallax
          products={products.map((product) => ({
            ...product,
            title: t(`products.${product.title}`),
          }))}
        />
      </div>
    </div>
  );
}
