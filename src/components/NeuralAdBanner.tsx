import { useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useMarketing } from '../hooks/useMarketing';
import { ShieldCheck, Info } from 'lucide-react';

interface AdProps {
  slot?: string;
  format?: 'auto' | 'fluid' | 'rectangle';
  className?: string;
}

/**
 * Neural Ad Banner
 * Renders Ads with "Pro Protection" - hidden for paying subscribers.
 */
export default function NeuralAdBanner({ slot, format = 'auto', className = "" }: AdProps) {
  const { isPro, isAdmin } = useAuth();
  const { marketingConfig } = useMarketing();
  const adRef = useRef<HTMLModElement>(null);

  // PRO PROTECTION: Do not render anything for Pro or Admin users
  if (isPro || isAdmin || !marketingConfig.adsEnabled) {
    return null;
  }

  const activeSlot = slot || marketingConfig.admobSlotId;

  useEffect(() => {
    if (!activeSlot) return;

    try {
      // Push the ad to the Google Adsense/AdMob queue
      const adsbygoogle = (window as any).adsbygoogle || [];
      adsbygoogle.push({});
    } catch (e) {
      console.error("âŒ [Neural Ads] Ad injection failed:", e);
    }
  }, [activeSlot]);

  if (!activeSlot) return null;

  return (
    <div className={`my-8 ${className}`}>
      {/* Ad Label */}
      <div className="flex items-center gap-2 mb-3 px-4">
        <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground bg-muted px-2 py-1 rounded">Sponsored Content</div>
        <div className="h-px flex-grow bg-muted" />
      </div>

      {/* Ad Container */}
      <div className="bg-muted/50 border border-dashed border-border rounded-md overflow-hidden min-h-[100px] flex items-center justify-center relative group">
        <ins
          ref={adRef}
          className="adsbygoogle"
          style={{ display: 'block', width: '100%' }}
          data-ad-client={activeSlot}
          data-ad-slot={activeSlot} // Using slot ID for testing
          data-ad-format={format}
          data-full-width-responsive="true"
        />

        {/* Neural Overlay (Visible if ad fails to load or during dev) */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-card/90 backdrop-blur-sm">
           <ShieldCheck className="w-8 h-8 text-primary mb-2" />
           <p className="text-xs font-bold uppercase tracking-widest text-foreground">Neural Protection Active</p>
           <p className="text-[9px] text-muted-foreground font-medium max-w-[150px] mt-1">Upgrade to PRO to instantly remove all advertisements.</p>
        </div>
      </div>
    </div>
  );
}
