import { useEffect } from 'react';
import { useMarketing } from '../hooks/useMarketing';

/**
 * Neural Marketing Scripts
 * Dynamically injects GA and FB Pixel scripts based on Admin Config.
 */
export default function NeuralMarketingScripts() {
  const { marketingConfig } = useMarketing();

  useEffect(() => {
    if (!marketingConfig.analyticsEnabled) return;

    // 1. Inject Google Analytics
    if (marketingConfig.gaTrackingId) {
      const gaScript = document.createElement('script');
      gaScript.async = true;
      gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${marketingConfig.gaTrackingId}`;
      document.head.appendChild(gaScript);

      const gaInit = document.createElement('script');
      gaInit.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${marketingConfig.gaTrackingId}');
      `;
      document.head.appendChild(gaInit);
    }

    // 2. Inject Facebook Pixel
    if (marketingConfig.fbPixelId) {
      const fbScript = document.createElement('script');
      fbScript.innerHTML = `
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${marketingConfig.fbPixelId}');
        fbq('track', 'PageView');
      `;
      document.head.appendChild(fbScript);
    }

    return () => {
      // Clean up scripts on unmount if necessary, 
      // but usually these remain for the session.
    };
  }, [marketingConfig.analyticsEnabled, marketingConfig.gaTrackingId, marketingConfig.fbPixelId]);

  return null;
}
