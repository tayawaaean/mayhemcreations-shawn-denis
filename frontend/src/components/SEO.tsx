import React from 'react'
import { Helmet } from 'react-helmet-async'

interface SEOProps {
  title?: string
  description?: string
  image?: string
  url?: string
  type?: 'website' | 'product' | 'article'
  structuredData?: object
  canonicalUrl?: string
  noindex?: boolean
  nofollow?: boolean
}

/**
 * SEO Component for dynamic meta tags
 * Handles:
 * - Page titles and descriptions
 * - Open Graph tags for social media
 * - Twitter Card tags
 * - Structured data (JSON-LD)
 * - Canonical URLs
 * - Robots meta tags
 */
const SEO: React.FC<SEOProps> = ({
  title = 'Mayhem Creations - Custom Embroidery & Apparel',
  description = 'Premium custom embroidery services and high-quality apparel. Create unique designs for your business or personal use.',
  image = '/og-image.jpg',
  url,
  type = 'website',
  structuredData,
  canonicalUrl,
  noindex = false,
  nofollow = false
}) => {
  // Default site URL (should be from environment variable in production)
  // Vite uses import.meta.env instead of process.env
  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://mayhemcreation.com'
  const fullUrl = url ? `${siteUrl}${url}` : siteUrl
  const fullImageUrl = image.startsWith('http') ? image : `${siteUrl}${image}`
  const canonical = canonicalUrl ? `${siteUrl}${canonicalUrl}` : fullUrl

  // Build robots meta tag
  const robotsParts: string[] = []
  if (noindex) robotsParts.push('noindex')
  else robotsParts.push('index')
  if (nofollow) robotsParts.push('nofollow')
  else robotsParts.push('follow')
  const robotsContent = robotsParts.join(', ')

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{title}</title>
      <meta name="title" content={title} />
      <meta name="description" content={description} />
      <meta name="robots" content={robotsContent} />
      
      {/* Canonical URL */}
      <link rel="canonical" href={canonical} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullImageUrl} />
      <meta property="og:site_name" content="Mayhem Creations" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={fullUrl} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImageUrl} />

      {/* Structured Data (JSON-LD) */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  )
}

export default SEO

