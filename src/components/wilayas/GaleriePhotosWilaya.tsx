import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Camera, ExternalLink } from "lucide-react";
import { chargerPhotosWilaya, fichiersWilaya, type PhotoWilaya } from "@/lib/photos-wilayas";
import { cn } from "@/lib/utils";

/**
 * « {Wilaya} en images » : photos Wikimedia Commons de la wilaya et de son chef-lieu, en bande qui défile au doigt,
 * avec auteur et licence sur chaque photo (lien vers sa page Commons). Rien n'est affiché si la wilaya n'a pas de photo.
 */
export const GaleriePhotosWilaya = ({ code, nom }: { code: string; nom: string }) => {
  const { t } = useTranslation();
  const aDesPhotos = fichiersWilaya(code).length > 0;
  // Photos qui n'ont pas pu se charger : si aucune ne reste, la section disparaît (pas de titre sur du vide).
  const [enEchec, setEnEchec] = useState<Set<string>>(() => new Set());
  const { data: photos } = useQuery({
    queryKey: ["photos-wilaya", code],
    queryFn: () => chargerPhotosWilaya(code),
    enabled: aDesPhotos,
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
  });

  if (!aDesPhotos || (photos && photos.every((photo) => enEchec.has(photo.fichier)))) return null;

  return (
    <section className="mt-10" aria-labelledby="titre-photos">
      <div className="flex items-end justify-between gap-3">
        <h2 id="titre-photos" className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Camera className="h-6 w-6 text-emerald-600" aria-hidden />
          {t("wilayas.photos.titre", { nom })}
        </h2>
        <p className="hidden text-xs text-muted-foreground sm:block">{t("wilayas.photos.source")}</p>
      </div>
      <ul className="-mx-4 mt-4 flex snap-x snap-mandatory gap-3 scroll-px-4 overflow-x-auto px-4 pb-3 md:mx-0 md:scroll-px-0 md:px-0 [scrollbar-width:thin]">
        {photos
          ? photos.map((photo, indice) => (
              <li key={photo.fichier} className="shrink-0 snap-start">
                <CartePhoto photo={photo} nom={nom} premiere={indice === 0} onEchec={() => setEnEchec((avant) => new Set(avant).add(photo.fichier))} />
              </li>
            ))
          : fichiersWilaya(code).map((fichier) => (
              <li key={fichier} className="h-56 w-72 shrink-0 animate-pulse rounded-2xl bg-gray-200 md:h-72 md:w-96 dark:bg-white/10" aria-hidden />
            ))}
      </ul>
      <p className="mt-1 text-xs text-muted-foreground sm:hidden">{t("wilayas.photos.source")}</p>
    </section>
  );
};

const CartePhoto = ({ photo, nom, premiere, onEchec }: { photo: PhotoWilaya; nom: string; premiere: boolean; onEchec: () => void }) => {
  const { t } = useTranslation();
  const [chargee, setChargee] = useState(false);
  const [erreur, setErreur] = useState(false);
  if (erreur) return null;
  // Largeur suivant le format de la photo (bannières panoramiques plus larges), bornée pour l'écran.
  const rapport = photo.largeur && photo.hauteur ? photo.largeur / photo.hauteur : 4 / 3;
  const panoramique = rapport > 2.2;

  return (
    <figure
      className={cn(
        "relative h-56 overflow-hidden rounded-2xl bg-gray-200 shadow-sm md:h-72 dark:bg-white/10",
        panoramique ? "w-[85vw] max-w-[640px] md:w-[640px]" : "w-72 md:w-96"
      )}
    >
      <a href={photo.page} target="_blank" rel="noopener noreferrer" className="group block h-full" aria-label={t("wilayas.photos.voir", { nom })}>
        <img
          src={photo.vignette}
          alt={t("wilayas.photos.alt", { nom })}
          loading={premiere ? "eager" : "lazy"}
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setChargee(true)}
          onError={() => {
            setErreur(true);
            onEchec();
          }}
          className={cn("h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]", chargee ? "opacity-100" : "opacity-0")}
        />
        <figcaption className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-8 text-[11px] text-white/90">
          <span className="min-w-0 truncate">
            {photo.auteur ? `© ${photo.auteur}` : t("wilayas.photos.commons")}
            {photo.licence && ` · ${photo.licence}`}
          </span>
          <ExternalLink className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
        </figcaption>
      </a>
    </figure>
  );
};
