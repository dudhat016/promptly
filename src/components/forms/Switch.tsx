import React, { useId } from 'react';
import { cn } from '../../lib/utils';
import { motion } from 'motion/react';

interface SwitchProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  id?: string;
}

/**
 * A premium animated toggle switch for boolean settings.
 */
export default function Switch({
  checked = false,
  onChange,
  label,
  description,
  disabled = false,
  size = 'md',
  className,
  id,
}: SwitchProps) {
  const generatedId = useId();
  const switchId = id || generatedId;

  const trackSizes = {
    sm: "w-8 h-4",
    md: "w-11 h-6",
    lg: "w-14 h-7",
  };

  const thumbSizes = {
    sm: "w-3 h-3",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const thumbTranslate = {
    sm: 16,
    md: 20,
    lg: 28,
  };

  return (
    <label
      htmlFor={switchId}
      className={cn(
        "inline-flex items-center gap-3 cursor-pointer select-none",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <button
        id={switchId}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange?.(!checked)}
        className={cn(
          "relative inline-flex shrink-0 items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-4 focus:ring-primary/10",
          trackSizes[size],
          checked ? "bg-primary" : "bg-muted"
        )}
      >
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className={cn(
            "pointer-events-none inline-block rounded-full bg-white shadow-lg",
            thumbSizes[size]
          )}
          animate={{ x: checked ? thumbTranslate[size] : 2 }}
        />
      </button>
      {(label || description) && (
        <div className="flex flex-col">
          {label && <span className="text-sm font-semibold text-foreground">{label}</span>}
          {description && <span className="text-xs text-muted-foreground">{description}</span>}
        </div>
      )}
    </label>
  );
}
