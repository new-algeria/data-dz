import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { chargerCatalogue } from "@/lib/catalogue";
import { routes } from "@/lib/routes";
import { texteTraduit } from "@/lib/traduction";
import { useLangue } from "@/hooks/use-langue";
import { urlIllustration } from "@/lib/illustrations";
import type { Donnee, ResumeDonnee } from "@/lib/types";

function scoreSimilarite(candidat: ResumeDonnee, donnee: Donnee): number {
  const mots = new Set((donnee.mots_cles ?? []).map((mot) => mot.toLocaleLowerCase()));
  const communs = (candidat.mots_cles ?? []).filter((mot) => mots.has(mot.toLocaleLowerCase())).length;
  return communs * 3 + (candidat.categorie_slug && candidat.categorie_slug === donnee.categorie_slug ? 2 : 0);
}

/** Données associées à la même catégorie et aux mots-clés communs. */
export const DonneesSimilaires = ({ donnee }: { donnee: Donnee }) => {
  const { t } = useTranslation();
  const langue = useLangue();
  const mots = (donnee.mots_cles ?? []).slice(0, 2).join(" ");
  const { data = [] } = useQuery({
    queryKey: ["donnees-similaires", donnee.slug, donnee.categorie_slug, donnee.mots_cles],
    enabled: Boolean(donnee.categorie_slug || mots),
    queryFn: async () => {
      const [parCategorie, parMots] = await Promise.all([
        donnee.categorie_slug ? chargerCatalogue({ terme: "", categorie: donnee.categorie_slug }) : Promise.resolve([]),
        mots ? chargerCatalogue({ terme: mots, categorie: null }) : Promise.resolve([]),
      ]);
      const uniques = new Map([...parCategorie, ...parMots].map((candidat) => [candidat.slug, candidat]));
      return [...uniques.values()]
        .filter((candidat) => candidat.slug !== donnee.slug && scoreSimilarite(candidat, donnee) > 0)
        .sort((a, b) => scoreSimilarite(b, donnee) - scoreSimilarite(a, donnee) || b.nb_favoris - a.nb_favoris)
        .slice(0, 8);
    },
    staleTime: 10 * 60 * 1000,
  });

  if (data.length === 0) return null;

  return (
    <section aria-labelledby="titre-donnees-similaires" className="mt-8 space-y-4">
      <h2 id="titre-donnees-similaires" className="text-xl font-bold">{t("fiche.donneesSimilaires.titre")}</h2>
      <Carousel opts={{ align: "start", containScroll: "trimSnaps" }} className="px-1">
        <CarouselContent>
          {data.map((candidat) => {
            const titre = texteTraduit(candidat.titre, langue);
            const description = texteTraduit(candidat.description, langue);
            return (
              <CarouselItem key={candidat.slug} className="basis-[85%] sm:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                <article className="h-full overflow-hidden rounded-2xl border bg-white shadow-sm transition-shadow hover:shadow-md dark:bg-gray-800">
                  <Link to={routes.donnee(candidat.slug)} className="group block h-full">
                    <div className="h-36 overflow-hidden bg-muted">
                      <img src={urlIllustration(candidat, "petite")} alt="" loading="lazy" decoding="async" onError={(e) => (e.currentTarget.style.display = "none")} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    </div>
                    <div className="space-y-2 p-4">
                      <h3 className="line-clamp-2 font-semibold group-hover:text-emerald-700 dark:group-hover:text-emerald-300">{titre}</h3>
                      {description && <p className="line-clamp-2 text-sm text-muted-foreground">{description}</p>}
                    </div>
                  </Link>
                </article>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        <CarouselPrevious className="right-10 left-auto top-[-2.8rem] translate-y-0" />
        <CarouselNext className="right-0 top-[-2.8rem] translate-y-0" />
      </Carousel>
    </section>
  );
};
