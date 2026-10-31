import { Barcode, CloudSun, Globe, MapPinned, Rocket, ScrollText, Search, Waves, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

interface SourceBandeau {
  /** Clé du nom traduit (`accueil.sources.noms.<cle>`). */
  cle: string;
  url: string;
  icone: LucideIcon;
  /** Logo à venir : chemin dans public/, ex. « /sources/banque-mondiale.svg ». Remplace l'icône s'il est donné. */
  logo?: string;
}

const SOURCES: SourceBandeau[] = [
  { cle: "geoalgeria", url: "https://geoalgeria.com", icone: MapPinned },
  { cle: "banqueMondiale", url: "https://data.worldbank.org", icone: Globe },
  { cle: "ecmwf", url: "https://www.ecmwf.int", icone: Waves },
  { cle: "openMeteo", url: "https://open-meteo.com", icone: CloudSun },
  { cle: "openStreetMap", url: "https://www.openstreetmap.org", icone: Search },
  { cle: "wikidata", url: "https://www.wikidata.org", icone: Barcode },
  { cle: "asal", url: "https://asal.dz", icone: Rocket },
  { cle: "journalOfficiel", url: "https://www.joradp.dz", icone: ScrollText },
];

const ElementSource = ({ source, copie }: { source: SourceBandeau; copie: boolean }) => {
  const { t } = useTranslation();
  const Icone = source.icone;
  return (
    <li className="shrink-0">
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        // La copie qui sert à boucler n'est pas atteignable au clavier (elle est aussi masquée aux lecteurs d'écran).
        tabIndex={copie ? -1 : undefined}
        className="inline-flex items-center gap-2 whitespace-nowrap rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:text-emerald-400"
      >
        {source.logo ? (
          <img src={source.logo} alt="" className="h-5 w-auto opacity-70 grayscale transition hover:opacity-100 hover:grayscale-0" loading="lazy" />
        ) : (
          <Icone className="h-4 w-4 shrink-0" aria-hidden />
        )}
        {t(`accueil.sources.noms.${source.cle}`)}
      </a>
    </li>
  );
};

/**
 * Bandeau « Données issues de » : les sources défilent en boucle (deux copies identiques), vers la gauche,
 * ou vers la droite en arabe. Pause au survol. Avec « réduire les animations », grille centrée sans copie.
 */
export const BandeauSources = () => {
  const { t } = useTranslation();

  return (
    <section aria-labelledby="titre-sources" className="w-full">
      <p id="titre-sources" className="mb-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:text-start">
        {t("accueil.sources.titre")}
      </p>
      <div className="group flex overflow-hidden [--duration:45s] [--gap:2rem] gap-[var(--gap)] [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)] motion-reduce:[mask-image:none]">
        {[false, true].map((copie) => (
          <ul
            key={String(copie)}
            aria-hidden={copie || undefined}
            className={`flex shrink-0 items-center gap-[var(--gap)] animate-marquee rtl:animate-marquee-rtl group-hover:[animation-play-state:paused] motion-reduce:animate-none motion-reduce:w-full motion-reduce:shrink motion-reduce:flex-wrap motion-reduce:justify-center motion-reduce:gap-x-6 motion-reduce:gap-y-3 ${
              copie ? "motion-reduce:hidden" : ""
            }`}
          >
            {SOURCES.map((source) => (
              <ElementSource key={source.cle} source={source} copie={copie} />
            ))}
          </ul>
        ))}
      </div>
    </section>
  );
};
