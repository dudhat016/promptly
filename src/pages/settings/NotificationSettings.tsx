import { useState } from 'react';
import {
  Bell, Shield, CreditCard, Sparkles, Mail, Megaphone, Users, Zap, Lock,
} from 'lucide-react';
import { motion } from 'motion/react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import Button from '../../components/primitives/Button';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../lib/firebase';
import type { NotifPrefs } from '../../types';

type NotifPrefKey = keyof NotifPrefs;

const DEFAULTS: NotifPrefs = {
  securityAlerts: true,
  billing: true,
  onboarding: true,
  nudges: true,
  affiliate: true,
  newsletter: false,
  promotions: false,
  productUpdates: true,
};

interface Section {
  key: NotifPrefKey;
  title: string;
  desc: string;
  covers: string[];
  locked?: boolean;
  icon: React.ReactNode;
}

const SECTIONS: Section[] = [
  {
    key: 'securityAlerts',
    title: 'Security Alerts',
    desc: 'Critical account access and suspicious activity notifications.',
    covers: ['New login alerts', 'Password reset confirmations'],
    locked: true,
    icon: <Shield className="w-4 h-4" />,
  },
  {
    key: 'billing',
    title: 'Billing & Payments',
    desc: 'Essential updates about your subscription, payments, and invoices.',
    covers: ['Purchase receipts', 'Subscription renewal confirmations', 'Payment failure notices'],
    locked: true,
    icon: <CreditCard className="w-4 h-4" />,
  },
  {
    key: 'onboarding',
    title: 'Onboarding & Tips',
    desc: 'Helpful guidance when you\'re getting started, including personalised content picks.',
    covers: ['Welcome email', 'Setup tips & personalised prompt picks', 'Credit expiry reminder', 'New prompt published confirmation'],
    icon: <Sparkles className="w-4 h-4" />,
  },
  {
    key: 'nudges',
    title: 'Account Reminders',
    desc: 'Timely alerts about your credit balance, trial, and upcoming renewals.',
    covers: ['Low credit balance alert', 'Trial expiry warning (3 days before)', 'Upcoming renewal reminder'],
    icon: <Bell className="w-4 h-4" />,
  },
  {
    key: 'affiliate',
    title: 'Affiliate Updates',
    desc: 'Stay on top of your referral earnings and payout activity.',
    covers: ['Commission earned notification', 'Withdrawal approved / rejected', 'First referral milestone'],
    icon: <Users className="w-4 h-4" />,
  },
  {
    key: 'newsletter',
    title: 'Newsletter',
    desc: 'Our regular roundup of new prompts, AI workflows, and platform highlights.',
    covers: ['Weekly digest', 'New prompt releases', 'Community highlights'],
    icon: <Mail className="w-4 h-4" />,
  },
  {
    key: 'promotions',
    title: 'Promotions & Deals',
    desc: 'Exclusive discounts, partner offers, and time-limited deals.',
    covers: ['Discount codes', 'Seasonal promotions', 'Partner offers'],
    icon: <Megaphone className="w-4 h-4" />,
  },
  {
    key: 'productUpdates',
    title: 'Product Updates',
    desc: 'Stay informed when we launch new features or AI model integrations.',
    covers: ['New feature announcements', 'AI model releases', 'Platform improvements'],
    icon: <Zap className="w-4 h-4" />,
  },
];

export default function NotificationSettings() {
  const { user, profile } = useAuth();

  const saved = profile?.notificationPrefs ?? {};
  const [prefs, setPrefs] = useState<NotifPrefs>({
    securityAlerts: saved.securityAlerts ?? DEFAULTS.securityAlerts,
    billing:         saved.billing        ?? DEFAULTS.billing,
    onboarding:      saved.onboarding     ?? DEFAULTS.onboarding,
    nudges:          saved.nudges         ?? DEFAULTS.nudges,
    affiliate:       saved.affiliate      ?? DEFAULTS.affiliate,
    newsletter:      saved.newsletter     ?? DEFAULTS.newsletter,
    promotions:      saved.promotions     ?? DEFAULTS.promotions,
    productUpdates:  saved.productUpdates ?? DEFAULTS.productUpdates,
  });
  const [saving, setSaving] = useState(false);

  const toggle = (key: NotifPrefKey, locked?: boolean) => {
    if (locked) return;
    setPrefs(p => ({ ...p, [key]: !p[key] }));
  };

  const disableNonEssential = () => {
    setPrefs(p => ({
      ...p,
      onboarding: false,
      nudges: false,
      affiliate: false,
      newsletter: false,
      promotions: false,
      productUpdates: false,
    }));
  };

  const enableAll = () => {
    setPrefs(p => ({
      ...p,
      onboarding: true,
      nudges: true,
      affiliate: true,
      newsletter: true,
      promotions: true,
      productUpdates: true,
    }));
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

  const optionalEnabled = SECTIONS
    .filter(s => !s.locked)
    .filter(s => prefs[s.key])
    .length;
  const optionalTotal = SECTIONS.filter(s => !s.locked).length;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

      {/* Header */}
      <div className="bg-card rounded-lg p-6 border border-border shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
          <h2 className="text-2xl font-bold flex items-center gap-3 text-foreground">
            <div className="w-10 h-10 bg-primary/10 text-primary rounded-md flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            Email Notifications
          </h2>
          <span className="text-sm font-medium text-muted-foreground bg-muted px-3 py-1.5 rounded-md border border-border w-fit">
            {optionalEnabled} of {optionalTotal} optional categories on
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Choose which emails you receive. Required categories keep your account secure and cannot be disabled.
        </p>
      </div>

      {/* Required section */}
      <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
        <div className="px-6 py-3 bg-muted border-b border-border flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Required — always on</span>
        </div>
        <div className="divide-y divide-border">
          {SECTIONS.filter(s => s.locked).map(section => (
            <SectionRow
              key={section.key}
              section={section}
              value={true}
              onToggle={() => {}}
            />
          ))}
        </div>
      </div>

      {/* Optional sections */}
      <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
        <div className="px-6 py-3 bg-muted border-b border-border flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Your preferences</span>
          <div className="flex items-center gap-2">
            <button
              onClick={enableAll}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Enable all
            </button>
            <span className="text-muted-foreground text-xs">·</span>
            <button
              onClick={disableNonEssential}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground hover:underline"
            >
              Disable all
            </button>
          </div>
        </div>
        <div className="divide-y divide-border">
          {SECTIONS.filter(s => !s.locked).map(section => (
            <SectionRow
              key={section.key}
              section={section}
              value={prefs[section.key]}
              onToggle={() => toggle(section.key)}
            />
          ))}
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-muted rounded-lg border border-border">
        <p className="text-sm text-muted-foreground text-center sm:text-left">
          We respect your inbox. Security and billing emails are always sent to keep your account safe.
        </p>
        <Button onClick={handleSave} isLoading={saving} variant="primary" size="md" className="shrink-0">
          Save Preferences
        </Button>
      </div>

    </motion.div>
  );
}

interface SectionRowProps {
  section: Section;
  value: boolean;
  onToggle: () => void;
}

function SectionRow({ section, value, onToggle }: SectionRowProps) {
  return (
    <div className="flex items-start gap-4 px-6 py-5">
      <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
        value ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
      }`}>
        {section.icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="font-semibold text-foreground text-sm">{section.title}</p>
          {section.locked && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground border border-border px-1.5 py-0.5 rounded">
              Required
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground mb-2">{section.desc}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {section.covers.map(item => (
            <span key={item} className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-muted-foreground/40 inline-block" />
              {item}
            </span>
          ))}
        </div>
      </div>

      <button
        onClick={onToggle}
        disabled={section.locked}
        aria-label={`Toggle ${section.title}`}
        aria-checked={value}
        role="switch"
        className={`w-11 h-6 rounded-full transition-colors relative shrink-0 mt-1 disabled:cursor-not-allowed ${
          value ? 'bg-primary' : 'bg-muted border border-border'
        }`}
      >
        <motion.div
          animate={{ x: value ? 22 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
        />
      </button>
    </div>
  );
}
