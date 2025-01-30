import MetaTags from "react-meta-tags";

interface MetaTagsProps {
  title: string;
  description: string;
  path?: string;
}

export const CustomMetaTags = ({
  title,
  description,
  path = "",
}: MetaTagsProps) => {
  const logoURL = "https://storage.berachem.dev/branding/data-dz-logo.png";
  const baseUrl = "https://www.data-dz.com";
  const fullUrl = `${baseUrl}${path}`;

  return (
    <MetaTags>
      <link rel="icon" type="image/svg+xml" href="/data_dz_logo_icon.png" />
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:site_name" content="Data DZ" />
      <meta property="og:image" content={logoURL} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:type" content="website" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={logoURL} />
    </MetaTags>
  );
};
