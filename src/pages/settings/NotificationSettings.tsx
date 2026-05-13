import { useState } from 'react';
import { Bell, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import Button from '../../components/primitives/Button';

export default function NotificationSettings() {
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
            <NotificationToggle 
              title="Product Updates" 
              desc="Stay ahead with new features, AI model releases, and platform performance improvements." 
            />
            <NotificationToggle 
              title="Promotional Offers" 
              desc="Exclusive discounts, partner deals, and affiliate program news tailored to your interests." 
            />
            <NotificationToggle 
              title="Security Alerts" 
              desc="Critical account access notifications and suspicious activity reports to keep your vault safe." 
              defaultEnabled 
            />
            <NotificationToggle 
              title="Engagement Insights" 
              desc="Get notified when your shared prompts receive high engagement or community comments." 
            />
          </div>

          <div className="mt-16 p-8 bg-muted rounded-md border border-border flex flex-col md:flex-row items-center justify-between gap-6">
            <p className="text-sm font-medium text-muted-foreground text-center md:text-left max-w-sm">
              We respect your inbox. You can unsubscribe from non-essential emails at any time.
            </p>
            <Button 
              variant="outline" 
              size="md" 
              className="text-primary font-bold uppercase tracking-[0.2em] border-primary/20"
            >
              Mute All Notifications
            </Button>
          </div>
        </div>
    </motion.div>
  );
}

function NotificationToggle({ title, desc, defaultEnabled = false }: any) {
  const [enabled, setEnabled] = useState(defaultEnabled);
  return (
    <div className="flex items-center justify-between group gap-8">
      <div className="max-w-md">
        <p className="font-bold text-foreground mb-1 text-lg leading-tight">{title}</p>
        <p className="text-sm font-medium text-muted-foreground leading-relaxed">{desc}</p>
      </div>
      <button 
        onClick={() => setEnabled(!enabled)}
        className={`w-14 h-8 rounded-full transition-all relative flex-shrink-0 ${enabled ? 'bg-primary shadow-lg shadow-primary/20' : 'bg-muted border border-border'}`}
      >
        <motion.div 
          animate={{ x: enabled ? 26 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="absolute top-1 w-6 h-6 bg-card rounded-full shadow-md" 
        />
      </button>
    </div>
  );
}
