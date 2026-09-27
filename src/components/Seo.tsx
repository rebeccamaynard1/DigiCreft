import { Helmet } from "react-helmet-async";

const SITE_URL = "https://becksdigitalpro.org";

type JsonLd = Record<string, unknown>;

interface SeoProps {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article" | "product";
  jsonLd?: JsonLd | JsonLd[];
  image?: string;
  /** Keep private/utility pages out of search results. */
  noindex?: boolean;
}

export default function Seo({
  title,
  description,
  path,
  type = "website",
  jsonLd,
  image,
  noindex = false,
}: SeoProps) {
  const url = `${SITE_URL}${path}`;
  const schemas = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      {image && <meta property="og:image" content={image} />}
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {schemas.map((s, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(s)}</script>
      ))}
    </Helmet>
  );
}
