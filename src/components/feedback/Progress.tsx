import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

type ProgressVariant = 'default' | 'success' | 'warning' | 'error' | 'gradient';
type ProgressSize = 'xs' | 'sm' | 'md' | 'lg';

interface ProgressProps {
  value: number;
  max?: number;
  variant?: ProgressVariant;
  size?: ProgressSize;
  label?: string;
  showValue?: boolean;
  valueFormat?: (v: number, max: number) => string;
  animated?: boolean;
  striped?: boolean;
  className?: string;
  trackClassName?: string;
}

const variantFill: Record<ProgressVariant, string> = {
  default: 'bg-primary',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  error: 'bg-destructive',
  gradient: 'bg-gradient-to-r from-primary to-violet-400',
};

const heights: Record<ProgressSize, string> = {
  xs: 'h-1',
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
};

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  (
    {
      value,
      max = 100,
      variant = 'default',
      size = 'md',
      label,
      showValue = false,
      valueFormat,
      animated = true,
      striped = false,
      className,
      trackClassName,
    },
    ref
  ) => {
    const pct = Math.min(100, Math.max(0, (value / max) * 100));
    const displayValue = valueFormat ? valueFormat(value, max) : `${Math.round(pct)}%`;

    return (
      <div ref={ref} className={cn("w-full space-y-1.5", className)}>
        {(label || showValue) && (
          <div className="flex items-center justify-between px-0.5">
            {label && (
              <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                {label}
              </span>
            )}
            {showValue && (
              <span className="text-[11px] font-bold text-foreground tabular-nums">{displayValue}</span>
            )}
          </div>
        )}

        <div
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-label={label}
          className={cn(
            "w-full rounded-full bg-muted overflow-hidden",
            heights[size],
            trackClassName
          )}
        >
          <motion.div
            initial={animated ? { width: 0 } : { width: `${pct}%` }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
            className={cn(
              "h-full rounded-full",
              variantFill[variant],
              striped && [
                "bg-[length:1rem_1rem]",
                "bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)]",
                animated && "animate-[progress-stripes_1s_linear_infinite]",
              ]
            )}
          />
        </div>
      </div>
    );
  }
);

Progress.displayName = "Progress";

export default Progress;
