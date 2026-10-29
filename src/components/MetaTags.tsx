import { Helmet } from "react-helmet-async";

interface MetaTagsProps {
  title: string;
  description: string;
  path?: string;
  /** Image de partage (chemin du site) ; par défaut, l'image générale. */
  image?: string;
}

const urlSite = "https://www.data-dz.com";

export const CustomMetaTags = ({ title, description, path = "", image = "/og-image.png" }: MetaTagsProps) => {
  const urlComplete = `${urlSite}${path}`;
  const urlImage = `${urlSite}${image}`;

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
    </Helmet>
  );
};
