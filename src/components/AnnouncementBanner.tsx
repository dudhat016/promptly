import { motion, AnimatePresence } from 'motion/react';
import { X, Megaphone, ArrowRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import Button from './primitives/Button';
import { useConfig } from '../hooks/useConfig';
import { Link } from 'react-router-dom';
import { usePath } from '../hooks/usePath';

export default function AnnouncementBanner() {
  const { config } = useConfig();
  const { prefix } = usePath();
  const [isVisible, setIsVisible] = useState(true);

  // If there's no active promotion, don't show the banner
  if (!config.activePromotion || !isVisible) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="relative bg-primary text-primary-foreground overflow-hidden"
        >
          <div className="container mx-auto px-4 py-2.5 flex items-center justify-center gap-4 text-center">
            <div className="flex items-center gap-2 text-xs md:text-sm font-bold tracking-tight">
              <Megaphone className="w-3.5 h-3.5 hidden sm:block" />
              <span>{config.activePromotion}</span>
              <Link 
                to={prefix('/pricing')} 
                className="inline-flex items-center gap-1 ml-2 px-2 py-0.5 rounded bg-white/20 hover:bg-white/30 transition-colors"
              >
                Learn More
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsVisible(false)}
              aria-label="Close announcement"
              className="absolute right-4 top-1/2 -translate-y-1/2 hover:bg-white/10 text-primary-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
          
          {/* Subtle animated shine */}
          <motion.div 
            initial={{ x: '-100%' }}
            animate={{ x: '200%' }}
            transition={{ repeat: Infinity, duration: 3, ease: 'linear', repeatDelay: 5 }}
            className="absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
