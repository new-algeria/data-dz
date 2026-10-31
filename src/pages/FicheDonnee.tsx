import { Suspense, type ReactNode } from "react";
import { lazyAvecRechargement } from "@/lib/rechargement";
import { Link, Navigate, useLocation, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { ArrowLeft, Building2, ExternalLink, Globe2, Info, Loader2, MapPinned, SearchX } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CustomMetaTags } from "@/components/MetaTags";
import CustomMarkdown from "@/components/CustomMarkdown";
import { EtatErreur } from "@/components/EtatErreur";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TableauColonnes } from "@/components/fiche/TableauColonnes";
import { ApercuDonnees } from "@/components/fiche/ApercuDonnees";
import { BlocAttribution } from "@/components/fiche/BlocAttribution";
import { BlocLicence } from "@/components/fiche/BlocLicence";
import { InfosSource } from "@/components/fiche/InfosSource";
import { aDesInfosSource } from "@/lib/couverture";
import { EnTeteFiche } from "@/components/fiche/EnTeteFiche";
import { BadgeCategorie } from "@/components/BadgeCategorie";
import { PourDeveloppeurs } from "@/components/fiche/PourDeveloppeurs";
import { DonneesUtiles } from "@/components/fiche/DonneesUtiles";
import { SectionCommentaires } from "@/components/communaute/SectionCommentaires";
import { VisuelDonnee } from "@/components/fiche/visuel/VisuelDonnee";
import { choisirFichierCarte } from "@/lib/detecterVisuel";
import { chargerFicheDonnee } from "@/lib/catalogue";
import { texteTraduit } from "@/lib/traduction";
import { localeNombres, trierFichiers } from "@/lib/fichiers";
import { useLangue } from "@/hooks/use-langue";
import type { Donnee } from "@/lib/types";
import { urlApercu } from "@/lib/api";
import { routes } from "@/lib/routes";

// MapLibre n'est chargé que sur les fiches qui affichent un globe.
const GlobeDonnees = lazyAvecRechargement(() => import("@/components/fiche/GlobeDonnees"));

const Section = ({
  id,
  titre,
  icone: Icone,
  children,
}: {
  id: string;
  titre: string;
  icone: typeof Info;
  children: ReactNode;
}) => (
  <motion.section
    aria-labelledby={id}
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-40px" }}
    transition={{ duration: 0.45, ease: "easeOut" }}
    className="rounded-2xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-gray-800 p-5 md:p-6 shadow-sm"
  >
    <h2 id={id} className="mb-4 flex items-center gap-2 text-lg font-semibold">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
        <Icone className="h-4 w-4" aria-hidden />
      </span>
      {titre}
    </h2>
    {children}
  </motion.section>
);

const Information = ({ libelle, children }: { libelle: string; children: ReactNode }) => (
  <div className="flex items-baseline justify-between gap-4 border-b border-dashed border-gray-200 py-2 last:border-0 dark:border-white/10">
    <dt className="text-muted-foreground">{libelle}</dt>
    <dd className="text-end font-medium">{children}</dd>
  </div>
);

const ChargementCarte = () => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-center gap-2 h-72 rounded-xl border bg-muted/40" role="status">
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
  // Tous les fichiers spatiaux : la carte propose de choisir lequel afficher, ou de les superposer.
  const fichiersGeojson = fichiers.filter((fichier) => fichier.format.toLowerCase() === "geojson");
  // Les GeoJSON de plus de 5 Mo ne passent pas dans le visuel du haut : ils gardent leur carte plus bas (chargée sur demande).
  const globeSepare = fichiersGeojson.length > 0 && !choisirFichierCarte(fichiers);
  const colonnes = Array.isArray(version?.colonnes) ? version.colonnes : [];
  const formatDate = (style: "medium" | "long") =>
    version?.publie_le
      ? new Intl.DateTimeFormat(localeNombres(langue), { dateStyle: style }).format(new Date(version.publie_le))
      : null;

  return (
    <>
      <CustomMetaTags
        title={`${titre} - data-dz`}
        description={description || titre}
        path={routes.donnee(donnee.slug)}
        image={urlApercu(donnee.slug, langue, donnee.mis_a_jour_le)}
      />

      <EnTeteFiche donnee={donnee} />

      <div className="container mx-auto px-4 pb-12">
        {/* Ancre des boutons « Voir la carte » / « Voir le graphique » de l'en-tête */}
        <div id="visuel" className="mt-6 relative scroll-mt-24">
          <VisuelDonnee slug={donnee.slug} titre={titre} source={donnee.sources?.nom ?? null} fichiers={fichiers} />
        </div>


        {/* Attribution visible dès le haut de la fiche sur mobile, dans la colonne latérale sur grand écran. */}
        <div className="lg:hidden mt-6">
          <BlocAttribution donnee={donnee} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <div className="lg:col-span-2 space-y-6 min-w-0">
            {globeSepare && (
              <Section id="titre-carte" titre={t("fiche.globe")} icone={Globe2}>
                <Suspense fallback={<ChargementCarte />}>
                  <GlobeDonnees fichiers={fichiersGeojson} />
                </Suspense>
              </Section>
            )}


            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="rounded-2xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-gray-800 p-5 md:p-6 shadow-sm"
            >
              <Tabs defaultValue="apercu">
                <TabsList className="mb-4 flex h-auto w-full max-w-full justify-start gap-1 overflow-x-auto bg-muted/70 p-1 sm:w-auto [&>*]:shrink-0">
                  <TabsTrigger value="apercu">{t("fiche.ongletApercu")}</TabsTrigger>
                  <TabsTrigger value="colonnes" className="gap-1.5">
                    {t("fiche.colonnes")}
                    <span className="rounded-full bg-emerald-100 px-1.5 text-xs text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
                      {colonnes.length}
                    </span>
                  </TabsTrigger>
                  {donnee.readme && <TabsTrigger value="documentation">{t("fiche.readme")}</TabsTrigger>}
                </TabsList>
                <TabsContent value="apercu">
                  <p className="mb-3 text-sm text-muted-foreground">{t("fiche.apercu")}</p>
                  <ApercuDonnees apercu={version?.apercu} colonnes={colonnes} />
                </TabsContent>
                <TabsContent value="colonnes">
                  <TableauColonnes colonnes={colonnes} />
                </TabsContent>
                {donnee.readme && (
                  <TabsContent value="documentation">
                    <div className="prose dark:prose-invert max-w-none" dir="auto">
                      <CustomMarkdown content={donnee.readme} />
                    </div>
                  </TabsContent>
                )}
              </Tabs>
            </motion.section>

            <PourDeveloppeurs donnee={donnee} fichiers={fichiers} />
            <DonneesUtiles datasetId={donnee.id} />
            <SectionCommentaires datasetId={donnee.id} slug={donnee.slug} />
          </div>

          <aside className="space-y-6 min-w-0">
            <BlocLicence donnee={donnee} />

            <div className="hidden lg:block">
              <BlocAttribution donnee={donnee} />
            </div>

            <Section id="titre-informations" titre={t("fiche.informations")} icone={Info}>
              <dl className="text-sm">
                {donnee.sources && (
                  <Information libelle={t("fiche.source")}>
                    {donnee.sources.url ? (
                      <a href={donnee.sources.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-emerald-700 hover:underline dark:text-emerald-400">
                        <Building2 className="h-3.5 w-3.5" aria-hidden />
                        {donnee.sources.nom}
                      </a>
                    ) : (
                      donnee.sources.nom
                    )}
                  </Information>
                )}
                {donnee.categories && (
                  <Information libelle={t("fiche.categorie")}>
                    <BadgeCategorie nom={donnee.categories.nom} icone={donnee.categories.icone} />
                  </Information>
                )}
                {version && (
                  <Information libelle={t("fiche.version")}>
                    <span dir="ltr" className="font-mono">
                      v{version.numero}
                    </span>
                  </Information>
                )}
                {formatDate("long") && <Information libelle={t("fiche.publieLe")}>{formatDate("long")}</Information>}
                {donnee.mots_cles && donnee.mots_cles.length > 0 && (
                  <Information libelle={t("fiche.motsCles")}>
                    <span className="flex flex-wrap justify-end gap-1">
                      {donnee.mots_cles.slice(0, 5).map((motCle) => (
                        <span key={motCle} className="rounded-md bg-gray-900/5 px-2 py-0.5 text-xs font-normal dark:bg-white/10">
                          {motCle}
                        </span>
                      ))}
                    </span>
                  </Information>
                )}
                {donnee.url_source && (
                  <Information libelle={t("fiche.pageSource")}>
                    <a href={donnee.url_source} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-emerald-700 hover:underline dark:text-emerald-400">
                      {t("fiche.voirSource")}
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    </a>
                  </Information>
                )}
              </dl>
            </Section>

            {donnee.infos_source && aDesInfosSource(donnee.infos_source) && (
              <Section id="titre-couverture" titre={t("fiche.couverture")} icone={MapPinned}>
                <InfosSource infos={donnee.infos_source} />
              </Section>
            )}
          </aside>
        </div>
      </div>
    </>
  );
};

const SqueletteFiche = () => {
  const { t } = useTranslation();
  return (
    <div className="container mx-auto px-4 pt-24 space-y-4" aria-busy="true">
      <span className="sr-only" role="status">
        {t("fiche.chargement")}
      </span>
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-6 w-28 rounded-full" />
      <Skeleton className="h-12 w-2/3" />
      <Skeleton className="h-5 w-full max-w-2xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-6">
        {Array.from({ length: 4 }, (_, indice) => (
          <Skeleton key={indice} className="h-20 rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
        <Skeleton className="h-72 lg:col-span-2 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </div>
  );
};

const FicheDonnee = () => {
  const { t } = useTranslation();
  const { slug = "" } = useParams();
  const emplacement = useLocation();

  const requete = useQuery({
    queryKey: ["fiche", slug],
    queryFn: () => chargerFicheDonnee(slug),
    enabled: Boolean(slug),
  });

  const retour = (
    <Button variant="outline" asChild>
      <Link to="/">
        <ArrowLeft className="rtl:rotate-180" />
        {t("fiche.retour")}
      </Link>
    </Button>
  );

  // Donnée renommée : l'API a suivi la redirection de l'ancien identifiant, l'URL prend le nouveau.
  if (requete.data && requete.data.slug !== slug) {
    return <Navigate to={`${routes.donnee(requete.data.slug)}${emplacement.search}${emplacement.hash}`} replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors">
      <Navbar />
      <main className="flex-grow">
        {requete.isPending ? (
          <SqueletteFiche />
        ) : requete.isError ? (
          <div className="container mx-auto px-4 pt-28 pb-12 space-y-6">
            <EtatErreur message={t("fiche.erreur")} onReessayer={() => requete.refetch()} />
            <div className="text-center">{retour}</div>
          </div>
        ) : !requete.data ? (
          <div className="container mx-auto px-4 pt-28 pb-12 flex flex-col items-center text-center gap-3">
            <SearchX className="h-10 w-10 text-muted-foreground" aria-hidden />
            <p className="font-mono text-lg" dir="ltr">
              {slug}
            </p>
            <p className="text-lg">{t("fiche.introuvable")}</p>
            {retour}
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
