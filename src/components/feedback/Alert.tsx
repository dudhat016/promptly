import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2, AlertTriangle, Info, XCircle, LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

type AlertVariant = 'info' | 'success' | 'warning' | 'error';

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children?: React.ReactNode;
  icon?: LucideIcon | false;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
  solid?: boolean;
}

const variantMap: Record<AlertVariant, {
  icon: LucideIcon;
  base: string;
  solid: string;
  iconClass: string;
}> = {
  info: {
    icon: Info,
    base: "bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-300",
    solid: "bg-blue-600 border-blue-600 text-white",
    iconClass: "text-blue-500 dark:text-blue-400",
  },
  success: {
    icon: CheckCircle2,
    base: "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300",
    solid: "bg-emerald-600 border-emerald-600 text-white",
    iconClass: "text-emerald-500 dark:text-emerald-400",
  },
  warning: {
    icon: AlertTriangle,
    base: "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300",
    solid: "bg-amber-500 border-amber-500 text-white",
    iconClass: "text-amber-500 dark:text-amber-400",
  },
  error: {
    icon: XCircle,
    base: "bg-destructive/10 border-destructive/20 text-destructive dark:text-red-300",
    solid: "bg-destructive border-destructive text-white",
    iconClass: "text-destructive dark:text-red-400",
  },
};

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ variant = 'info', title, children, icon, dismissible = false, onDismiss, className, solid = false }, ref) => {
    const [visible, setVisible] = React.useState(true);

    const cfg = variantMap[variant];
    const Icon = icon === false ? null : (icon || cfg.icon);

    const handleDismiss = () => {
      setVisible(false);
      onDismiss?.();
    };

    return (
      <AnimatePresence>
        {visible && (
          <motion.div
            ref={ref}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.2 }}
            role="alert"
            className={cn(
              "relative flex gap-3 rounded-xl border px-4 py-3.5 text-sm",
              solid ? cfg.solid : cfg.base,
              className
            )}
          >
            {Icon && (
              <span className="mt-0.5 shrink-0">
                <Icon className={cn("w-4 h-4", solid ? "text-current opacity-90" : cfg.iconClass)} />
              </span>
            )}

            <div className="flex-1 min-w-0">
              {title && <p className="font-bold mb-0.5">{title}</p>}
              {children && <div className={cn("leading-relaxed", title ? "opacity-80" : "")}>{children}</div>}
            </div>

            {dismissible && (
              <button
                onClick={handleDismiss}
                className="shrink-0 mt-0.5 p-0.5 rounded-md opacity-60 hover:opacity-100 transition-opacity"
                aria-label="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    );
  }
);

Alert.displayName = "Alert";

export default Alert;
