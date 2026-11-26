import { Helmet } from "react-helmet-async";
import { URL_SITE } from "@/lib/donnees-structurees";

interface MetaTagsProps {
  title: string;
  description: string;
  path?: string;
  /** Image d'aperçu (1200 × 630) ; par défaut celle du site. */
  image?: string;
  /** Données structurées schema.org (JSON-LD), ex. le bloc `Dataset` d'une fiche. */
  donneesStructurees?: Record<string, unknown>;
}

export const URL_SITE_PUBLIC = URL_SITE;
const urlSite = URL_SITE_PUBLIC;

export const CustomMetaTags = ({ title, description, path = "", image, donneesStructurees }: MetaTagsProps) => {
  const urlComplete = `${urlSite}${path}`;
  const urlImage = image ?? `${urlSite}/og-data-dz-v2.jpg`;

  return (
    <Helmet>
      <title>{title}</title>
      <link rel="canonical" href={urlComplete} />
      <meta name="description" content={description} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:site_name" content="data-dz" />
      <meta property="og:image" content={urlImage} />
      <meta property="og:url" content={urlComplete} />
      <meta property="og:type" content="website" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={urlImage} />

      {donneesStructurees && (
        // « < » échappé : un titre contenant « </script> » ne peut pas fermer la balise.
        <script type="application/ld+json">{JSON.stringify(donneesStructurees).replace(/</g, "\\u003c")}</script>
      )}
    </Helmet>
  );
};
