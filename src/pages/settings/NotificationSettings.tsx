import { useState } from 'react';
import { Bell, Loader2, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import Button from '../../components/primitives/Button';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../lib/firebase';

interface NotifPrefs {
  productUpdates: boolean;
  promotions: boolean;
  securityAlerts: boolean;
  engagementInsights: boolean;
}

const DEFAULTS: NotifPrefs = {
  productUpdates: true,
  promotions: false,
  securityAlerts: true,
  engagementInsights: true,
};

export default function NotificationSettings() {
  const { user, profile } = useAuth();

  const saved = (profile as any)?.notificationPrefs as Partial<NotifPrefs> | undefined;
  const [prefs, setPrefs] = useState<NotifPrefs>({
    productUpdates:    saved?.productUpdates    ?? DEFAULTS.productUpdates,
    promotions:        saved?.promotions        ?? DEFAULTS.promotions,
    securityAlerts:    saved?.securityAlerts    ?? DEFAULTS.securityAlerts,
    engagementInsights:saved?.engagementInsights?? DEFAULTS.engagementInsights,
  });
  const [saving, setSaving] = useState(false);

  const toggle = (key: keyof NotifPrefs) => {
    if (key === 'securityAlerts') return; // security alerts are mandatory
    setPrefs(p => ({ ...p, [key]: !p[key] }));
  };

  const muteAll = () => {
    setPrefs(p => ({ ...p, productUpdates: false, promotions: false, engagementInsights: false }));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        notificationPrefs: prefs,
        updatedAt: serverTimestamp(),
      });
      toast.success('Notification preferences saved');
    } catch {
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const ITEMS: { key: keyof NotifPrefs; title: string; desc: string; locked?: boolean }[] = [
    {
      key: 'productUpdates',
      title: 'Product Updates',
      desc: 'Stay ahead with new features, AI model releases, and platform performance improvements.',
    },
    {
      key: 'promotions',
      title: 'Promotional Offers',
      desc: 'Exclusive discounts, partner deals, and affiliate program news tailored to your interests.',
    },
    {
      key: 'securityAlerts',
      title: 'Security Alerts',
      desc: 'Critical account access notifications and suspicious activity reports. Cannot be disabled.',
      locked: true,
    },
    {
      key: 'engagementInsights',
      title: 'Engagement Insights',
      desc: 'Get notified when your shared prompts receive high engagement or community comments.',
    },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="bg-card rounded-lg p-6 border border-border shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <h2 className="text-2xl font-bold flex items-center gap-3 text-foreground">
            <div className="w-10 h-10 bg-primary/10 text-primary rounded-md flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            Email Preferences
          </h2>
          <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-md border border-border">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Smart Filtering Active</span>
          </div>
        </div>

        <div className="space-y-10">
          {ITEMS.map(item => (
            <div key={item.key} className="flex items-center justify-between group gap-8">
              <div className="max-w-md">
                <p className="font-bold text-foreground mb-1 text-lg leading-tight">
                  {item.title}
                  {item.locked && (
                    <span className="ml-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground align-middle">Required</span>
                  )}
                </p>
                <p className="text-sm font-medium text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
              <button
                onClick={() => toggle(item.key)}
                disabled={item.locked}
                aria-label={`Toggle ${item.title}`}
                className={`w-14 h-8 rounded-full transition-all relative flex-shrink-0 disabled:cursor-not-allowed ${
                  prefs[item.key] ? 'bg-primary shadow-lg shadow-primary/20' : 'bg-muted border border-border'
                }`}
              >
                <motion.div
                  animate={{ x: prefs[item.key] ? 26 : 2 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="absolute top-1 w-6 h-6 bg-card rounded-full shadow-md"
                />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-16 p-8 bg-muted rounded-md border border-border flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-sm font-medium text-muted-foreground text-center md:text-left max-w-sm">
            We respect your inbox. You can unsubscribe from non-essential emails at any time.
          </p>
          <div className="flex items-center gap-3">
            <Button
              onClick={muteAll}
              variant="outline"
              size="md"
              className="text-muted-foreground font-bold uppercase tracking-[0.2em]"
            >
              Mute All
            </Button>
            <Button
              onClick={handleSave}
              isLoading={saving}
              variant="primary"
              size="md"
            >
              Save Preferences
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
