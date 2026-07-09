import { cldImage } from '../../utils/cloudinary'

const SITE_NAME = 'Ralphy'
const DEFAULT_TITLE = 'Ralphy — Travel Stories from Occidental Mindoro'
const DEFAULT_DESCRIPTION =
  'Travel blog and vlog by Ralph Alcaide (@lakbayOksi). Adventures across ' +
  'Occidental Mindoro and the Philippines, captured by drone and phone.'

export const SITE_URL = (
  import.meta.env.VITE_SITE_URL || window.location.origin
).replace(/\/$/, '')

/**
 * Per-page SEO tags. React 19 hoists <title>, <meta> and <link> rendered
 * anywhere in the tree into <head> (and removes them on unmount), so this
 * component just renders them. JSON-LD stays inline in the body — crawlers
 * read it from anywhere in the document.
 */
export default function Seo({
  title,
  description = DEFAULT_DESCRIPTION,
  image,
  type = 'website',
  path,
  jsonLd,
}) {
  const fullTitle = title ? `${title} · ${SITE_NAME}` : DEFAULT_TITLE
  const url = `${SITE_URL}${path ?? window.location.pathname}`
  const ogImage = image ? cldImage(image, 1200) : `${SITE_URL}/hero.jpg`

  return (
    <>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />

      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={ogImage} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
    </>
  )
}

/** JSON-LD helper: breadcrumb trail from [{ name, path }]. */
export function breadcrumbLd(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  }
}

export const AUTHOR_LD = {
  '@type': 'Person',
  name: 'Ralph Alcaide',
  alternateName: 'lakbayOksi',
  url: `${SITE_URL}/about`,
}
