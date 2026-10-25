import {
  Antenna,
  Braces,
  Brackets,
  Briefcase,
  Bus,
  Calendar,
  Castle,
  ChartLine,
  CircleOff,
  Columns3,
  Earth,
  File,
  FileArchive,
  FileCode,
  FileSpreadsheet,
  Hash,
  HeartPulse,
  Landmark,
  Leaf,
  School,
  Shield,
  Sheet,
  Sprout,
  Store,
  Tag,
  ToggleLeft,
  Trophy,
  Type,
  type LucideIcon,
} from "lucide-react";

export interface Apparence {
  icone: LucideIcon;
  /** Classes Tailwind du badge (fond + texte), en clair et en sombre. */
  couleurs: string;
}

// Icônes des catégories : la clé est la colonne `categories.icone` (noms façon Tabler Icons).
const apparencesCategories: Record<string, Apparence> = {
  landmark: { icone: Landmark, couleurs: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300" },
  "heart-pulse": { icone: HeartPulse, couleurs: "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300" },
  bus: { icone: Bus, couleurs: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300" },
  school: { icone: School, couleurs: "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-300" },
  "chart-line": { icone: ChartLine, couleurs: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300" },
  briefcase: { icone: Briefcase, couleurs: "bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300" },
  antenna: { icone: Antenna, couleurs: "bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300" },
  "building-store": { icone: Store, couleurs: "bg-cyan-100 text-cyan-800 dark:bg-cyan-500/15 dark:text-cyan-300" },
  "building-arch": { icone: Castle, couleurs: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-500/15 dark:text-fuchsia-300" },
  "ball-football": { icone: Trophy, couleurs: "bg-lime-100 text-lime-800 dark:bg-lime-500/15 dark:text-lime-300" },
  shield: { icone: Shield, couleurs: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300" },
  plant: { icone: Sprout, couleurs: "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300" },
  leaf: { icone: Leaf, couleurs: "bg-teal-100 text-teal-800 dark:bg-teal-500/15 dark:text-teal-300" },
};

const apparenceParDefaut: Apparence = {
  icone: Tag,
  couleurs: "bg-gray-100 text-gray-800 dark:bg-white/10 dark:text-gray-200",
};

export function apparenceCategorie(icone: string | null | undefined): Apparence {
  return (icone && apparencesCategories[icone]) || apparenceParDefaut;
}

// Formats de fichiers : JSON en jaune (couleur habituelle du format), GeoJSON en vert, etc.
const apparencesFormats: Record<string, Apparence> = {
  json: { icone: Braces, couleurs: "bg-yellow-100 text-yellow-800 dark:bg-yellow-400/15 dark:text-yellow-300" },
  geojson: { icone: Earth, couleurs: "bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300" },
  csv: { icone: FileSpreadsheet, couleurs: "bg-sky-100 text-sky-800 dark:bg-sky-400/15 dark:text-sky-300" },
  xlsx: { icone: Sheet, couleurs: "bg-green-100 text-green-800 dark:bg-green-400/15 dark:text-green-300" },
  xml: { icone: FileCode, couleurs: "bg-orange-100 text-orange-800 dark:bg-orange-400/15 dark:text-orange-300" },
  zip: { icone: FileArchive, couleurs: "bg-slate-200 text-slate-800 dark:bg-slate-400/15 dark:text-slate-300" },
  parquet: { icone: Columns3, couleurs: "bg-indigo-100 text-indigo-800 dark:bg-indigo-400/15 dark:text-indigo-300" },
};

export function apparenceFormat(format: string): Apparence {
  return apparencesFormats[format.toLowerCase()] ?? { ...apparenceParDefaut, icone: File };
}

export type GenreType = "texte" | "entier" | "decimal" | "booleen" | "date" | "liste" | "objet" | "vide";

// Types de colonnes : le script de synchronisation écrit des noms Python (str, int, NoneType…),
// d'autres sources pourront écrire des noms JSON Schema ou SQL.
const genresParType: Record<string, GenreType> = {
  str: "texte",
  string: "texte",
  text: "texte",
  varchar: "texte",
  int: "entier",
  integer: "entier",
  bigint: "entier",
  float: "decimal",
  number: "decimal",
  double: "decimal",
  numeric: "decimal",
  decimal: "decimal",
  bool: "booleen",
  boolean: "booleen",
  date: "date",
  datetime: "date",
  timestamp: "date",
  timestamptz: "date",
  list: "liste",
  array: "liste",
  tuple: "liste",
  dict: "objet",
  object: "objet",
  json: "objet",
  jsonb: "objet",
  nonetype: "vide",
  none: "vide",
  null: "vide",
};

const apparencesGenres: Record<GenreType, Apparence> = {
  texte: { icone: Type, couleurs: "bg-sky-100 text-sky-800 dark:bg-sky-400/15 dark:text-sky-300" },
  entier: { icone: Hash, couleurs: "bg-violet-100 text-violet-800 dark:bg-violet-400/15 dark:text-violet-300" },
  decimal: { icone: Hash, couleurs: "bg-purple-100 text-purple-800 dark:bg-purple-400/15 dark:text-purple-300" },
  booleen: { icone: ToggleLeft, couleurs: "bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300" },
  date: { icone: Calendar, couleurs: "bg-teal-100 text-teal-800 dark:bg-teal-400/15 dark:text-teal-300" },
  liste: { icone: Brackets, couleurs: "bg-pink-100 text-pink-800 dark:bg-pink-400/15 dark:text-pink-300" },
  objet: { icone: Braces, couleurs: "bg-orange-100 text-orange-800 dark:bg-orange-400/15 dark:text-orange-300" },
  vide: { icone: CircleOff, couleurs: "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400" },
};

export function genreDuType(type: string | undefined): GenreType | null {
  if (!type) return null;
  return genresParType[type.trim().toLowerCase()] ?? null;
}

export function apparenceGenre(genre: GenreType | null): Apparence {
  return genre ? apparencesGenres[genre] : apparenceParDefaut;
}
