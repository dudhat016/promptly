import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useConfig } from './useConfig';

interface SEOMetadata {
  title: string;
  description: string;
  keywords?: string;
  ogImage?: string;
  canonical?: string;
  author?: string;
  tags?: string[];
}

export function useSEO(pageIdOrData: string | SEOMetadata) {
  const { config } = useConfig();
  const [meta, setMeta] = useState<SEOMetadata | null>(
    typeof pageIdOrData === 'object' ? pageIdOrData : null
  );

  useEffect(() => {
    const applyMeta = (data: SEOMetadata) => {
      const siteTitle = data.title || `${config.siteName} | ${config.siteTagline}`;
      document.title = siteTitle;
      
      const updateOrCreateMeta = (name: string, content: string, isProperty = false) => {
        const selector = isProperty ? `meta[property="${name}"]` : `meta[name="${name}"]`;
        let element = document.querySelector(selector);
        if (!element) {
          element = document.createElement('meta');
          if (isProperty) element.setAttribute('property', name);
          else element.setAttribute('name', name);
          document.head.appendChild(element);
        }
        element.setAttribute('content', content);
      };

      updateOrCreateMeta('description', data.description);
      if (data.keywords) updateOrCreateMeta('keywords', data.keywords);
      if (data.author) updateOrCreateMeta('author', data.author);
      
      // Open Graph
      updateOrCreateMeta('og:title', data.title, true);
      updateOrCreateMeta('og:description', data.description, true);
      if (data.ogImage) updateOrCreateMeta('og:image', data.ogImage, true);
      updateOrCreateMeta('og:type', 'website', true);
      updateOrCreateMeta('og:url', window.location.href, true);
      if (data.author) updateOrCreateMeta('article:author', data.author, true);
      if (data.tags) updateOrCreateMeta('article:tag', data.tags.join(','), true);
      
      // Twitter
      updateOrCreateMeta('twitter:card', 'summary_large_image');
      updateOrCreateMeta('twitter:title', data.title);
      updateOrCreateMeta('twitter:description', data.description);
      if (data.ogImage) updateOrCreateMeta('twitter:image', data.ogImage);

      // Canonical
      let link: HTMLLinkElement | null = document.querySelector('link[rel="canonical"]');
      if (data.canonical || true) {
        const href = data.canonical || window.location.href;
        if (!link) {
          link = document.createElement('link');
          link.setAttribute('rel', 'canonical');
          document.head.appendChild(link);
        }
        link.setAttribute('href', href);
      }
    };

    if (typeof pageIdOrData === 'object' && pageIdOrData !== null) {
      applyMeta(pageIdOrData);
    } else if (typeof pageIdOrData === 'string') {
      const pageId = pageIdOrData;
      async function fetchMeta() {
        try {
          const docSnap = await getDoc(doc(db, 'site_pages', pageId));
          if (docSnap.exists()) {
            const data = docSnap.data() as SEOMetadata;
            setMeta(data);
            applyMeta(data);
          }
        } catch (err) {
          console.error("Error fetching SEO meta:", err);
        }
      }
      fetchMeta();
    }
  }, [pageIdOrData]);

  return meta;
}
