import { motion, AnimatePresence } from 'motion/react';
import { Share2, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Button from '../primitives/Button';
import { BadgeDef } from '../../lib/badges';

interface Props {
  badges: BadgeDef[];
  onClose: () => void;
}

export default function BadgeMilestoneModal({ badges, onClose }: Props) {
  if (!badges.length) return null;

  const first = badges[0];
  const Icon  = first.icon;

  const handleShare = () => {
    const text = badges.length === 1
      ? `I just earned the "${first.label}" badge on Promptly! 🏅`
      : `I just earned ${badges.length} new badges on Promptly! 🏅`;
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Copied to clipboard — share your achievement!');
    }).catch(() => {
      toast(text, { duration: 5000 });
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="relative bg-card border border-border rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl overflow-hidden"
        >
          {/* Background glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-primary/10 blur-3xl" />
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Badge icon with ring animation */}
          <div className="relative inline-flex items-center justify-center mb-5">
            <motion.div
              animate={{ scale: [1, 1.12, 1], opacity: [0.5, 0.8, 0.5] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
              className={`absolute inset-0 rounded-full blur-xl ${first.color.split(' ')[0]}`}
            />
            <div className={`relative w-20 h-20 rounded-2xl flex items-center justify-center border-2 ${first.color}`}>
              <Icon className="w-9 h-9" />
            </div>
          </div>

          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1"
          >
            Achievement Unlocked
          </motion.p>

          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl font-bold text-foreground mb-2"
          >
            {first.label}
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="text-sm text-muted-foreground mb-6 leading-relaxed"
          >
            {first.description}
          </motion.p>

          {/* Multiple badges earned */}
          {badges.length > 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center justify-center gap-2 mb-5 flex-wrap"
            >
              {badges.slice(1).map(b => {
                const BIcon = b.icon;
                return (
                  <div key={b.id} title={b.label} className={`w-9 h-9 rounded-xl flex items-center justify-center border ${b.color}`}>
                    <BIcon className="w-4 h-4" />
                  </div>
                );
              })}
              <span className="text-xs text-muted-foreground font-medium">
                +{badges.length - 1} more badge{badges.length > 2 ? 's' : ''}
              </span>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="flex gap-2"
          >
            <Button variant="outline" size="sm" leftIcon={Share2} onClick={handleShare} className="flex-1">
              Share
            </Button>
            <Button variant="primary" size="sm" onClick={onClose} className="flex-1">
              Continue
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
