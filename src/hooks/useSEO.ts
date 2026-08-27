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

const SUPPORTED_LANGS = ['en', 'hi', 'ar', 'es', 'fr'];
const LOCALE_MAP: Record<string, string> = {
  en: 'en_US',
  hi: 'hi_IN',
  ar: 'ar_SA',
  es: 'es_ES',
  fr: 'fr_FR',
};

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
    const updateLink = (rel: string, href: string, key = 'rel') => {
      let el = document.querySelector(`link[${key}="${rel}"]`) as HTMLLinkElement | null;
      if (!el) {
        el = document.createElement('link');
        el.setAttribute('rel', rel);
        document.head.appendChild(el);
      }
      el.setAttribute('href', href);
    };

    // 4. Multi-language Path Parsing
    const rawPath = url || window.location.pathname;
    // Strip any language prefix (/en/, /hi/, /ar/, /es/, /fr/)
    const langPrefixRegex = new RegExp(`^\\/(${SUPPORTED_LANGS.join('|')})(/|$)`);
    const cleanPath = rawPath.startsWith('http')
      ? rawPath
      : rawPath.replace(langPrefixRegex, '/');

    // Extract current lang from URL if present
    const currentLangMatch = rawPath.match(langPrefixRegex);
    const currentLang = currentLangMatch ? currentLangMatch[1] : 'en';

    const canonicalUrl = cleanPath.startsWith('http') ? cleanPath : `${siteUrl}${cleanPath}`;
    updateLink('canonical', canonicalUrl);

    // 5. Multi-language Hreflang Tags (i18n SEO)
    if (!rawPath.startsWith('http')) {
      SUPPORTED_LANGS.forEach(lang => {
        const langUrl = `${siteUrl}/${lang}${cleanPath === '/' ? '' : cleanPath}`;
        let el = document.querySelector(`link[rel="alternate"][hreflang="${lang}"]`) as HTMLLinkElement | null;
        if (!el) {
          el = document.createElement('link');
          el.setAttribute('rel', 'alternate');
          el.setAttribute('hreflang', lang);
          document.head.appendChild(el);
        }
        el.setAttribute('href', langUrl);
      });

      // x-default hreflang
      let xDefault = document.querySelector('link[rel="alternate"][hreflang="x-default"]') as HTMLLinkElement | null;
      if (!xDefault) {
        xDefault = document.createElement('link');
        xDefault.setAttribute('rel', 'alternate');
        xDefault.setAttribute('hreflang', 'x-default');
        document.head.appendChild(xDefault);
      }
      xDefault.setAttribute('href', canonicalUrl);
    }

    // 6. Standard Meta
    const metaDescription = description || config.siteDescription || '';
    if (metaDescription) updateMeta('description', metaDescription);
    updateMeta('robots', noindex ? 'noindex, nofollow' : 'index, follow');

    // 7. Keywords
    const keywordStr = Array.isArray(keywords)
      ? keywords.join(', ')
      : keywords || (tags || []).join(', ');
    if (keywordStr) updateMeta('keywords', keywordStr);

    // 8. Author
    if (author) updateMeta('author', author);

    // 9. OpenGraph
    updateMeta('og:site_name', siteName, true);
    updateMeta('og:locale', LOCALE_MAP[currentLang] || 'en_US', true);
    updateMeta('og:title', fullTitle, true);
    if (metaDescription) updateMeta('og:description', metaDescription, true);
    const ogImage = image || config.ogImage || config.projectIcon || '';
    if (ogImage) updateMeta('og:image', ogImage, true);
    updateMeta('og:url', canonicalUrl, true);
    updateMeta('og:type', type === 'article' ? 'article' : 'website', true);

    // 10. Article-specific OpenGraph (blog posts)
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

    // 11. Twitter Card
    updateMeta('twitter:card', 'summary_large_image');
    updateMeta('twitter:title', fullTitle);
    if (metaDescription) updateMeta('twitter:description', metaDescription);
    if (ogImage) updateMeta('twitter:image', ogImage);

  }, [props, config.siteName, config.siteDescription, config.ogImage, config.projectIcon]);
}
