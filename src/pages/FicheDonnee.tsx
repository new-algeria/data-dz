import { lazy, Suspense, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ExternalLink, Loader2, SearchX } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CustomMetaTags } from "@/components/MetaTags";
import CustomMarkdown from "@/components/CustomMarkdown";
import { EtatErreur } from "@/components/EtatErreur";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TableauColonnes } from "@/components/fiche/TableauColonnes";
import { ApercuDonnees } from "@/components/fiche/ApercuDonnees";
import { ListeFichiers } from "@/components/fiche/ListeFichiers";
import { BlocAttribution } from "@/components/fiche/BlocAttribution";
import { InfosSource } from "@/components/fiche/InfosSource";
import { chargerFicheDonnee } from "@/lib/catalogue";
import { texteTraduit } from "@/lib/traduction";
import { formaterNombre, localeNombres, trierFichiers } from "@/lib/fichiers";
import { useLangue } from "@/hooks/use-langue";
import type { Donnee } from "@/lib/types";

// Leaflet n'est chargé que sur les fiches qui affichent une carte.
const CarteGeoJSON = lazy(() => import("@/components/fiche/CarteGeoJSON"));

const Section = ({ id, titre, children }: { id: string; titre: string; children: ReactNode }) => (
  <section aria-labelledby={id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 md:p-6">
    <h2 id={id} className="text-xl font-semibold mb-4">
      {titre}
    </h2>
    {children}
  </section>
);

const Information = ({ libelle, children }: { libelle: string; children: ReactNode }) => (
  <div>
    <dt className="text-xs uppercase tracking-wide text-muted-foreground">{libelle}</dt>
    <dd className="mt-0.5">{children}</dd>
  </div>
);

const ChargementCarte = () => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-center gap-2 h-72 rounded-md border bg-muted/40" role="status">
      <Loader2 className="h-6 w-6 animate-spin text-green-600" aria-hidden />
      <span className="text-sm">{t("fiche.carteChargement")}</span>
    </div>
  );
};

const ContenuFiche = ({ donnee }: { donnee: Donnee }) => {
  const { t } = useTranslation();
  const langue = useLangue();

  const titre = texteTraduit(donnee.titre, langue);
  const description = texteTraduit(donnee.description, langue);
  const version = donnee.versions;
  const fichiers = trierFichiers(version?.fichiers ?? []);
  const fichierPrincipal = fichiers.find((fichier) => fichier.principal) ?? fichiers[0];
  const geojsonPrincipal = fichierPrincipal?.format === "geojson" ? fichierPrincipal : undefined;
  const colonnes = Array.isArray(version?.colonnes) ? version.colonnes : [];
  const publieLe = version?.publie_le
    ? new Intl.DateTimeFormat(localeNombres(langue), { dateStyle: "long" }).format(new Date(version.publie_le))
    : null;

  return (
    <>
      <CustomMetaTags title={`${titre} - data-dz`} description={description || titre} path={`/donnees/${donnee.slug}`} />

      <header className="space-y-4">
        {donnee.categories && (
          <Link to={`/?categorie=${donnee.categories.slug}`}>
            <Badge variant="secondary">{texteTraduit(donnee.categories.nom, langue)}</Badge>
          </Link>
        )}
        <h1 className="text-3xl md:text-4xl font-bold">{titre}</h1>
        {description && <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl">{description}</p>}
        {donnee.mots_cles && donnee.mots_cles.length > 0 && (
          <div className="flex flex-wrap gap-2" aria-label={t("fiche.motsCles")}>
            {donnee.mots_cles.map((motCle) => (
              <Badge key={motCle} variant="outline">
                {motCle}
              </Badge>
            ))}
          </div>
        )}
      </header>

      {/* Attribution visible dès le haut de la fiche sur mobile, dans la colonne latérale sur grand écran. */}
      <div className="lg:hidden mt-6">
        <BlocAttribution donnee={donnee} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <div className="lg:col-span-2 space-y-6 min-w-0">
          {geojsonPrincipal && (
            <Section id="titre-carte" titre={t("fiche.carte")}>
              <Suspense fallback={<ChargementCarte />}>
                <CarteGeoJSON fichier={geojsonPrincipal} />
              </Suspense>
            </Section>
          )}

          <Section id="titre-fichiers" titre={t("fiche.fichiers")}>
            <ListeFichiers fichiers={fichiers} />
          </Section>

          <Section id="titre-colonnes" titre={t("fiche.colonnes")}>
            <TableauColonnes colonnes={colonnes} />
          </Section>

          <Section id="titre-apercu" titre={t("fiche.apercu")}>
            <ApercuDonnees apercu={version?.apercu} colonnes={colonnes} />
          </Section>

          {donnee.readme && (
            <Section id="titre-readme" titre={t("fiche.readme")}>
              <div className="prose dark:prose-invert max-w-none" dir="auto">
                <CustomMarkdown content={donnee.readme} />
              </div>
            </Section>
          )}
        </div>

        <aside className="space-y-6 min-w-0">
          <div className="hidden lg:block">
            <BlocAttribution donnee={donnee} />
          </div>

          <Section id="titre-informations" titre={t("fiche.informations")}>
            <dl className="space-y-3 text-sm">
              {donnee.categories && (
                <Information libelle={t("fiche.categorie")}>{texteTraduit(donnee.categories.nom, langue)}</Information>
              )}
              {donnee.sources && (
                <Information libelle={t("fiche.source")}>
                  {donnee.sources.url ? (
                    <a href={donnee.sources.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                      {donnee.sources.nom}
                    </a>
                  ) : (
                    donnee.sources.nom
                  )}
                </Information>
              )}
              {(donnee.licence_code || donnee.licence_details) && (
                <Information libelle={t("fiche.licence")}>
                  {donnee.licence_code && (
                    <span className="font-medium" dir="ltr">
                      {donnee.licences?.url ? (
                        <a href={donnee.licences.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                          {donnee.licence_code}
                        </a>
                      ) : (
                        donnee.licence_code
                      )}
                    </span>
                  )}
                  {donnee.licences?.nom && <span className="block text-muted-foreground">{donnee.licences.nom}</span>}
                  {donnee.licence_details && (
                    <span className="block text-muted-foreground mt-1" dir="auto">
                      {donnee.licence_details}
                    </span>
                  )}
                </Information>
              )}
              {version && (
                <Information libelle={t("fiche.version")}>
                  <span dir="ltr">{version.numero}</span>
                </Information>
              )}
              {publieLe && <Information libelle={t("fiche.publieLe")}>{publieLe}</Information>}
              {version?.nb_lignes !== null && version?.nb_lignes !== undefined && (
                <Information libelle={t("fiche.lignes")}>{formaterNombre(version.nb_lignes, langue)}</Information>
              )}
            </dl>
            {donnee.url_source && (
              <Button asChild variant="outline" size="sm" className="mt-4 w-full">
                <a href={donnee.url_source} target="_blank" rel="noopener noreferrer">
                  <ExternalLink />
                  {t("fiche.voirSource")}
                </a>
              </Button>
            )}
          </Section>

          {donnee.infos_source && Object.keys(donnee.infos_source).length > 0 && (
            <Section id="titre-couverture" titre={t("fiche.couverture")}>
              <InfosSource infos={donnee.infos_source} />
            </Section>
          )}
        </aside>
      </div>
    </>
  );
};

const SqueletteFiche = () => {
  const { t } = useTranslation();
  return (
    <div className="space-y-4" aria-busy="true">
      <span className="sr-only" role="status">
        {t("fiche.chargement")}
      </span>
      <Skeleton className="h-5 w-28" />
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-5 w-full max-w-2xl" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-6">
        <Skeleton className="h-72 lg:col-span-2" />
        <Skeleton className="h-72" />
      </div>
    </div>
  );
};

const FicheDonnee = () => {
  const { t } = useTranslation();
  const { slug = "" } = useParams();

  const requete = useQuery({
    queryKey: ["fiche", slug],
    queryFn: () => chargerFicheDonnee(slug),
    enabled: Boolean(slug),
  });

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8 mt-16">
        <Button variant="outline" asChild className="mb-6">
          <Link to="/">
            <ArrowLeft className="rtl:rotate-180" />
            {t("fiche.retour")}
          </Link>
        </Button>

        {requete.isPending ? (
          <SqueletteFiche />
        ) : requete.isError ? (
          <EtatErreur message={t("fiche.erreur")} onReessayer={() => requete.refetch()} />
        ) : !requete.data ? (
          <div className="flex flex-col items-center text-center gap-3 py-20">
            <SearchX className="h-10 w-10 text-muted-foreground" aria-hidden />
            <p className="font-mono text-lg" dir="ltr">
              {slug}
            </p>
            <p className="text-lg">{t("fiche.introuvable")}</p>
          </div>
        ) : (
          <ContenuFiche donnee={requete.data} />
        )}
      </main>
      <Footer />
    </div>
  );
};

export default FicheDonnee;
