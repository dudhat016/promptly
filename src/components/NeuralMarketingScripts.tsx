import { useEffect } from 'react';
import { useConfig } from '../hooks/useConfig';

/**
 * Dynamic Scripts Injection
 * Dynamically injects GA, FB Pixel, and Custom scripts based on Global Configuration.
 */
export default function NeuralMarketingScripts() {
  const { config } = useConfig();

  useEffect(() => {
    // 1. Inject Google Analytics
    if (config.googleAnalyticsId) {
      const gaScript = document.createElement('script');
      gaScript.async = true;
      gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${config.googleAnalyticsId}`;
      gaScript.id = 'ga-script';
      document.head.appendChild(gaScript);

      const gaInit = document.createElement('script');
      gaInit.id = 'ga-init-script';
      gaInit.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${config.googleAnalyticsId}');
      `;
      document.head.appendChild(gaInit);
    }

    // 2. Inject Facebook Pixel
    if (config.facebookPixelId) {
      const fbScript = document.createElement('script');
      fbScript.id = 'fb-pixel-script';
      fbScript.innerHTML = `
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${config.facebookPixelId}');
        fbq('track', 'PageView');
      `;
      document.head.appendChild(fbScript);
    }

    // 3. Inject Custom Head Scripts
    if (config.customHeadScripts) {
      const headContainer = document.createElement('div');
      headContainer.id = 'custom-head-scripts';
      headContainer.innerHTML = config.customHeadScripts;
      // Extract and execute scripts manually since innerHTML doesn't execute them
      const scripts = headContainer.querySelectorAll('script');
      scripts.forEach(oldScript => {
        const newScript = document.createElement('script');
        Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
        newScript.appendChild(document.createTextNode(oldScript.innerHTML));
        document.head.appendChild(newScript);
      });
    }

    // 4. Inject Custom Footer Scripts
    if (config.customFooterScripts) {
      const footerContainer = document.createElement('div');
      footerContainer.id = 'custom-footer-scripts';
      footerContainer.innerHTML = config.customFooterScripts;
      const scripts = footerContainer.querySelectorAll('script');
      scripts.forEach(oldScript => {
        const newScript = document.createElement('script');
        Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
        newScript.appendChild(document.createTextNode(oldScript.innerHTML));
        document.body.appendChild(newScript);
      });
    }

    return () => {
      // Optional: Cleanup scripts on unmount if needed
      const ids = ['ga-script', 'ga-init-script', 'fb-pixel-script', 'custom-head-scripts', 'custom-footer-scripts'];
      ids.forEach(id => document.getElementById(id)?.remove());
    };
  }, [config.googleAnalyticsId, config.facebookPixelId, config.customHeadScripts, config.customFooterScripts]);

  return null;
}
