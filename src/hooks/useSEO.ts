import { useEffect } from 'react';
import { useConfig } from './useConfig';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  keywords?: string | string[];
  author?: string;
  publishedTime?: string;
  tags?: string[];
  type?: 'website' | 'article';
  noindex?: boolean;
}

export function useSEO(props: SEOProps | string) {
  const { config } = useConfig();

  useEffect(() => {
    // 0. Handle String Input
    const data: SEOProps = typeof props === 'string'
      ? { title: props.charAt(0).toUpperCase() + props.slice(1) }
      : props;

    const { title, description, image, url, keywords, author, publishedTime, tags, type = 'website', noindex = false } = data;

    // 1. Title
    const siteName = config.siteName || 'Promptly AI';
    const siteUrl = (import.meta.env.VITE_SITE_URL || (config as any)?.siteUrl || window.location.origin).replace(/\/$/, '');
    const fullTitle = title ? `${title} | ${siteName}` : siteName;
    document.title = fullTitle;

    // 2. Helper: upsert meta tags
    const updateMeta = (name: string, content: string, isProperty = false) => {
      const selector = isProperty ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      let el = document.querySelector(selector) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        if (isProperty) el.setAttribute('property', name);
        else el.setAttribute('name', name);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    // 3. Helper: upsert link tags
    const updateLink = (rel: string, href: string) => {
      let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
      if (!el) {
        el = document.createElement('link');
        el.setAttribute('rel', rel);
        document.head.appendChild(el);
      }
      el.setAttribute('href', href);
    };

    // 4. Canonical — strips /en/ prefix to prevent duplicate content penalty
    const rawPath = url || window.location.pathname;
    const cleanPath = rawPath.startsWith('http') ? rawPath : rawPath.replace(/^\/en(\/|$)/, '/');
    const canonicalUrl = cleanPath.startsWith('http') ? cleanPath : `${siteUrl}${cleanPath}`;
    updateLink('canonical', canonicalUrl);

    // 5. Standard meta
    const metaDescription = description || config.siteDescription || '';
    if (metaDescription) updateMeta('description', metaDescription);
    updateMeta('robots', noindex ? 'noindex, nofollow' : 'index, follow');

    // 6. Keywords
    const keywordStr = Array.isArray(keywords)
      ? keywords.join(', ')
      : keywords || (tags || []).join(', ');
    if (keywordStr) updateMeta('keywords', keywordStr);

    // 7. Author
    if (author) updateMeta('author', author);

    // 8. OpenGraph
    updateMeta('og:site_name', siteName, true);
    updateMeta('og:locale', 'en_US', true);
    updateMeta('og:title', fullTitle, true);
    if (metaDescription) updateMeta('og:description', metaDescription, true);
    const ogImage = image || config.ogImage || config.projectIcon || '';
    if (ogImage) updateMeta('og:image', ogImage, true);
    updateMeta('og:url', canonicalUrl, true);
    updateMeta('og:type', type === 'article' ? 'article' : 'website', true);

    // 9. Article-specific OpenGraph (blog posts)
    if (type === 'article') {
      if (publishedTime) updateMeta('article:published_time', publishedTime, true);
      if (author) updateMeta('article:author', author, true);
      (tags || []).slice(0, 5).forEach(tag => {
        if (!document.querySelector(`meta[property="article:tag"][content="${tag}"]`)) {
          const el = document.createElement('meta');
          el.setAttribute('property', 'article:tag');
          el.setAttribute('content', tag);
          document.head.appendChild(el);
        }
      });
    }

    // 10. Twitter Card
    updateMeta('twitter:card', 'summary_large_image');
    updateMeta('twitter:title', fullTitle);
    if (metaDescription) updateMeta('twitter:description', metaDescription);
    if (ogImage) updateMeta('twitter:image', ogImage);

  }, [props, config.siteName, config.siteDescription, config.ogImage, config.projectIcon]);
}
