import { motion } from 'motion/react';
import { Wrench, Clock, MessageSquare } from 'lucide-react';
import { useConfig } from '../../hooks/useConfig';

export default function MaintenancePage() {
  const { config } = useConfig();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-md"
      >
        {/* Animated logo */}
        <motion.div
          animate={{ rotate: [0, -10, 10, -10, 0] }}
          transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
          className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-8"
        >
          {config.projectIcon ? (
            <img src={config.projectIcon} alt="" className="w-16 h-16 object-contain" />
          ) : (
            <Wrench className="w-12 h-12 text-primary" />
          )}
        </motion.div>

        <h1 className="text-3xl font-black text-foreground mb-3">{config.siteName} is Updating</h1>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          {config.maintenanceMessage || "We're currently performing scheduled maintenance to improve your experience. We'll be back shortly."}
        </p>

        <div className="bg-card border border-border rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-1 font-bold uppercase tracking-widest">
            <Clock className="w-4 h-4" />
            Status Engine
          </div>
          <p className="text-2xl font-black text-foreground uppercase tracking-tight">Under Optimization</p>
        </div>

        {config.socials?.twitter && (
          <p className="text-xs text-muted-foreground/60 font-medium">
            Follow our{' '}
            <a href={config.socials.twitter} target="_blank" rel="noreferrer" className="text-primary hover:underline font-bold">
              Engineering Feed
            </a>{' '}
            for real-time status updates.
          </p>
        )}
        
        {config.supportEmail && (
          <div className="mt-8 pt-8 border-t border-border flex items-center justify-center gap-2 text-xs text-muted-foreground/40 font-bold uppercase tracking-widest">
            <MessageSquare className="w-3 h-3" />
            {config.supportEmail}
          </div>
        )}
      </motion.div>
    </div>
  );
}
