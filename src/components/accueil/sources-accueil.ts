import { Barcode, CloudSun, Globe, MapPinned, Rocket, ScrollText, Search, Waves, type LucideIcon } from "lucide-react";

export interface SourceBandeau {
  /** Clé du nom traduit (`accueil.sources.noms.<cle>`). */
  cle: string;
  url: string;
  icone: LucideIcon;
  /** Logo officiel dans public/sources/ (OpenStreetMap et Wikidata : simple-icons, CC0 ; NASA et ASAL : détourés, WebP). Remplace l'icône s'il est donné. */
  logo?: string;
}

/** Sources affichées sur l'accueil, reprises par la page DjazAI. */
export const SOURCES_ACCUEIL: SourceBandeau[] = [
  { cle: "geoalgeria", url: "https://geoalgeria.com", icone: MapPinned },
  { cle: "banqueMondiale", url: "https://data.worldbank.org", icone: Globe },
  { cle: "ecmwf", url: "https://www.ecmwf.int", icone: Waves },
  { cle: "openMeteo", url: "https://open-meteo.com", icone: CloudSun },
  { cle: "openStreetMap", url: "https://www.openstreetmap.org", icone: Search, logo: "/sources/openstreetmap.svg" },
  { cle: "wikidata", url: "https://www.wikidata.org", icone: Barcode, logo: "/sources/wikidata.svg" },
  { cle: "nasa", url: "https://firms.modaps.eosdis.nasa.gov", icone: Rocket, logo: "/sources/nasa.webp" },
  { cle: "asal", url: "https://asal.dz", icone: Rocket, logo: "/sources/asal.webp" },
  { cle: "journalOfficiel", url: "https://www.joradp.dz", icone: ScrollText },
];
