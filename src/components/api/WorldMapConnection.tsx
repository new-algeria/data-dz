"use client";
import { WorldMap } from "@/components/ui/world-map";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

export function WorldMapConnection() {
  const { t } = useTranslation();

  return (
    <div className="py-40 w-full">
      <div className="max-w-7xl mx-auto text-center">
        <p className="font-bold text-xl md:text-4xl dark:text-white text-black">
          {t('api.connectivity')}{" "}
        </p>
        <p className="text-sm md:text-lg text-neutral-500 max-w-2xl mx-auto py-4">
          {t('api.subtitle')}
        </p>
      </div>
      <WorldMap
        lineColor="#3BAC86FF"
        dots={[
          {
            start: {
              lat: 28.0339,
              lng: 1.6596,
            }, // Algeria
            end: {
              lat: 23.0522,
              lng: -118.2437,
            }, // Los Angeles
          },
          {
            end: { lat: 20.0339, lng: 2.6596 }, // Algeria
            start: { lat: -18.7975, lng: -47.8919 }, // Brazil (Brasília)
          },
          {
            start: { lat: 20.0339, lng: 2.6596 }, // Algeria
            end: { lat: 43.7223, lng: -2.1393 }, // Londres
          },
          {
            end: { lat: 20.0339, lng: 2.6596 }, // Algeria
            // moscou
            start: { lat: 55.7558, lng: 37.6176 },
          },
          {
            start: { lat: 20.0339, lng: 2.6596 }, // Algeria
            end: { lat: 28.6139, lng: 77.209 }, // New Delhi
          },
          {
            end: { lat: 20.0339, lng: 2.6596 }, // Algeria
            start: { lat: -1.2921, lng: 36.8219 }, // Nairobi
          },

          {
            start: { lat: 20.0339, lng: 2.6596 }, // Algeria
            end: { lat: -40.8688, lng: 130.2093 }, // sydney
          },
        ]}
      />
    </div>
  );
}
