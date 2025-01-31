import { Helmet } from "react-helmet";

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
  const logoURL = `${import.meta.env.VITE_R2_BUCKET_URI}/branding/data-dz-logo.png`;
  const baseUrl = "https://www.data-dz.com";
  const fullUrl = `${baseUrl}${path}`;

  return (
    <Helmet>
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
    </Helmet>
  );
};
