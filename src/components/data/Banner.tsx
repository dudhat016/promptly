import React from 'react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { X, Info, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';

interface BannerProps {
  variant?: 'info' | 'warning' | 'success' | 'error';
  title?: string;
  children: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
  show?: boolean;
}

const variantStyles = {
  info: {
    bg: "bg-blue-500/10 border-blue-500/20",
    text: "text-blue-600 dark:text-blue-400",
    icon: Info,
  },
  warning: {
    bg: "bg-amber-500/10 border-amber-500/20",
    text: "text-amber-600 dark:text-amber-400",
    icon: AlertTriangle,
  },
  success: {
    bg: "bg-emerald-500/10 border-emerald-500/20",
    text: "text-emerald-600 dark:text-emerald-400",
    icon: CheckCircle2,
  },
  error: {
    bg: "bg-destructive/10 border-destructive/20",
    text: "text-destructive",
    icon: AlertCircle,
  },
};

/**
 * Global notification banner for alerts, maintenance notices, and status updates.
 */
export default function Banner({
  variant = 'info',
  title,
  children,
  dismissible = true,
  onDismiss,
  className,
  show = true,
}: BannerProps) {
  const style = variantStyles[variant];
  const Icon = style.icon;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className={cn("border rounded-xl p-4 flex items-start gap-3", style.bg, className)}
        >
          <Icon className={cn("w-5 h-5 shrink-0 mt-0.5", style.text)} />
          <div className="flex-1 min-w-0">
            {title && <p className={cn("text-sm font-bold", style.text)}>{title}</p>}
            <div className="text-sm text-foreground/80">{children}</div>
          </div>
          {dismissible && (
            <button
              onClick={onDismiss}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
