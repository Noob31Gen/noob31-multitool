import { useEffect } from "react";
interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  url?: string;
  image?: string;
  robots?: string;
  canonical?: string;
  jsonLd?: string;
}
export function SEO({ title, description, keywords, url, image, robots, canonical, jsonLd }: SEOProps) {
  useEffect(() => {
    const siteTitle = "Noob31's MultiTools";
    const fullTitle = title ? `${title} | ${siteTitle}` : siteTitle;
    if (title || !document.title) {
      document.title = fullTitle;
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute("content", fullTitle);
      const twitterTitle = document.querySelector('meta[property="twitter:title"]');
      if (twitterTitle) twitterTitle.setAttribute("content", fullTitle);
    }
    if (description) {
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute("content", description);
      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) ogDesc.setAttribute("content", description);
      const twitterDesc = document.querySelector('meta[property="twitter:description"]');
      if (twitterDesc) twitterDesc.setAttribute("content", description);
    }
    if (keywords) {
      const metaKeywords = document.querySelector('meta[name="keywords"]');
      if (metaKeywords) metaKeywords.setAttribute("content", keywords);
    }
    if (url) {
      const ogUrl = document.querySelector('meta[property="og:url"]');
      if (ogUrl) ogUrl.setAttribute("content", url);
      const twitterUrl = document.querySelector('meta[property="twitter:url"]');
      if (twitterUrl) twitterUrl.setAttribute("content", url);
    }
    if (image) {
      const ogImage = document.querySelector('meta[property="og:image"]');
      if (ogImage) ogImage.setAttribute("content", image);
      const twitterImage = document.querySelector('meta[property="twitter:image"]');
      if (twitterImage) twitterImage.setAttribute("content", image);
    }
    if (robots) {
      const metaRobots = document.querySelector('meta[name="robots"]');
      if (metaRobots) metaRobots.setAttribute("content", robots);
    }
    if (canonical) {
      let linkCanonical = document.querySelector('link[rel="canonical"]');
      if (!linkCanonical) {
        linkCanonical = document.createElement('link');
        linkCanonical.setAttribute('rel', 'canonical');
        document.head.appendChild(linkCanonical);
      }
      linkCanonical.setAttribute("href", canonical);
    }
    let scriptTag = document.querySelector('script[type="application/ld+json"]');
    if (jsonLd) {
      if (!scriptTag) {
        scriptTag = document.createElement('script');
        scriptTag.setAttribute('type', 'application/ld+json');
        document.head.appendChild(scriptTag);
      }
      scriptTag.textContent = jsonLd;
    } else if (scriptTag) {
      scriptTag.remove();
    }
  }, [title, description, keywords, url, image, robots, canonical, jsonLd]);
  return null;
}