import { useEffect } from 'react';
import { useConfig } from './useConfig';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
}

export function useSEO(props: SEOProps | string) {
  const { config } = useConfig();

  useEffect(() => {
    // 0. Handle String Input (Route name fallback)
    const data: SEOProps = typeof props === 'string' 
      ? { title: props.charAt(0).toUpperCase() + props.slice(1) } 
      : props;

    const { title, description, image, url } = data;

    // 1. Update Title
    const siteName = config.siteName || "Promptly AI";
    const fullTitle = title ? `${title} | ${siteName}` : siteName;
    document.title = fullTitle;

    // 2. Helper to update meta tags
    const updateMeta = (name: string, content: string, isProperty = false) => {
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

    // 3. Standard Meta
    const metaDescription = description || config.siteDescription;
    if (metaDescription) updateMeta('description', metaDescription);

    // 4. OpenGraph (Facebook/LinkedIn/WhatsApp)
    updateMeta('og:title', fullTitle, true);
    if (metaDescription) updateMeta('og:description', metaDescription, true);
    
    const ogImage = image || config.ogImage || config.projectIcon;
    if (ogImage) updateMeta('og:image', ogImage, true);
    
    if (url || window.location.href) updateMeta('og:url', url || window.location.href, true);
    updateMeta('og:type', 'website', true);

    // 5. Twitter
    updateMeta('twitter:card', 'summary_large_image');
    updateMeta('twitter:title', fullTitle);
    if (metaDescription) updateMeta('twitter:description', metaDescription);
    if (ogImage) updateMeta('twitter:image', ogImage);

  }, [props, config.siteName, config.siteDescription, config.ogImage, config.projectIcon]);
}
