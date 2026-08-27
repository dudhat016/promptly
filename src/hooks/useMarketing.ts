import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export function useMarketing() {
  const [config, setConfig] = useState({
    gaTrackingId: '',
    fbPixelId: '',
    admobSlotId: '',
    adsEnabled: false,
    analyticsEnabled: false,
    minWithdrawalAmount: 50,
    fraudScoreThreshold: 70,
    referralCommission: 25,
    paymentFeePercent: 2,
    platformFeePercent: 0,
    lockPeriodDays: 14,
    adLabel: 'Sponsored Content',
    adProtectionTitle: 'Neural Protection Active',
    adProtectionSubtitle: 'Upgrade to PRO to instantly remove all advertisements.',
    socialProofIntervalMs: 15000,
    socialProofVisibleMs: 5000,
    socialProofUnlockTpl: '',
    socialProofJoinTpl: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'configs', 'marketing'), (doc) => {
      if (doc.exists()) {
        setConfig(doc.data() as any);
      }
      setLoading(false);
    }, () => setLoading(false));

    return () => unsub();
  }, []);

  return { marketingConfig: config, marketingLoading: loading };
}
