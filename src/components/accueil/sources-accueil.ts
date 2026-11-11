import { Barcode, CloudSun, Globe, MapPinned, Rocket, ScrollText, Search, Waves, type LucideIcon } from "lucide-react";

export interface SourceBandeau {
  /** Clé du nom traduit (`accueil.sources.noms.<cle>`). */
  cle: string;
  url: string;
  icone: LucideIcon;
  /** Logo officiel dans public/sources/ (ex. « /sources/openstreetmap.svg », tirés de simple-icons, CC0). Remplace l'icône s'il est donné. */
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
  { cle: "asal", url: "https://asal.dz", icone: Rocket },
  { cle: "journalOfficiel", url: "https://www.joradp.dz", icone: ScrollText },
];
