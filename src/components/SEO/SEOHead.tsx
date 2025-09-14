import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
  noindex?: boolean;
}

export function SEOHead({
  title = "InstantNums - Virtual Phone Numbers for SMS Verification",
  description = "Get instant virtual phone numbers for SMS verification. Secure, affordable, and reliable with 100+ countries available. Perfect for social media, apps, and online services.",
  keywords = "virtual phone numbers, SMS verification, temporary numbers, phone verification, virtual SMS, instant numbers, online verification",
  image = "https://instantnums.com/og-image.png",
  url = "https://instantnums.com/",
  type = "website",
  noindex = false
}: SEOHeadProps) {
  const fullTitle = title.includes('InstantNums') ? title : `${title} | InstantNums`;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content="InstantNums" />
      
      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={url} />
      <meta property="twitter:title" content={fullTitle} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={image} />
      
      {/* Canonical URL */}
      <link rel="canonical" href={url} />
    </Helmet>
  );
}

export default SEOHead;
