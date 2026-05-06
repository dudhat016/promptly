import { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
}

export function useSEO(props: SEOProps | string) {
  useEffect(() => {
    // 0. Handle String Input (Route name fallback)
    const data: SEOProps = typeof props === 'string' 
      ? { title: props.charAt(0).toUpperCase() + props.slice(1) } 
      : props;

    const { title, description, image, url } = data;

    // 1. Update Title
    const siteName = "Promptly AI";
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
    if (description) updateMeta('description', description);

    // 4. OpenGraph (Facebook/LinkedIn/WhatsApp)
    updateMeta('og:title', fullTitle, true);
    if (description) updateMeta('og:description', description, true);
    if (image) updateMeta('og:image', image, true);
    if (url || window.location.href) updateMeta('og:url', url || window.location.href, true);
    updateMeta('og:type', 'website', true);

    // 5. Twitter
    updateMeta('twitter:card', 'summary_large_image');
    updateMeta('twitter:title', fullTitle);
    if (description) updateMeta('twitter:description', description);
    if (image) updateMeta('twitter:image', image);

  }, [props]);
}
