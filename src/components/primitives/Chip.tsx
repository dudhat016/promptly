import React from 'react';
import { X, LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

export type ChipVariant = 'filled' | 'outline' | 'soft';
export type ChipColor = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';

interface ChipProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: ChipVariant;
  color?: ChipColor;
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  onRemove?: (e: React.MouseEvent) => void;
  clickable?: boolean;
  active?: boolean;
}

/**
 * A premium Chip component for tags, filters, and multi-select.
 * Features: icon support, removable state, clickable/active states, and multiple variants.
 */
export default function Chip({
  className,
  variant = 'soft',
  color = 'default',
  size = 'md',
  icon: Icon,
  onRemove,
  clickable = false,
  active = false,
  children,
  onClick,
  ...props
}: ChipProps) {
  
  const colors: Record<ChipColor, { filled: string; outline: string; soft: string }> = {
    default: {
      filled: "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900",
      outline: "border-border text-foreground bg-transparent",
      soft: "bg-muted text-muted-foreground border-transparent",
    },
    primary: {
      filled: "bg-primary text-primary-foreground",
      outline: "border-primary text-primary bg-transparent",
      soft: "bg-primary/10 text-primary border-transparent",
    },
    success: {
      filled: "bg-emerald-600 text-white",
      outline: "border-emerald-600 text-emerald-600 bg-transparent",
      soft: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-transparent",
    },
    warning: {
      filled: "bg-amber-500 text-white",
      outline: "border-amber-500 text-amber-600 bg-transparent",
      soft: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-transparent",
    },
    error: {
      filled: "bg-destructive text-white",
      outline: "border-destructive text-destructive bg-transparent",
      soft: "bg-destructive/10 text-destructive border-transparent",
    },
    info: {
      filled: "bg-blue-600 text-white",
      outline: "border-blue-600 text-blue-600 bg-transparent",
      soft: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-transparent",
    }
  };

  const sizes = {
    sm: "px-2 py-0.5 text-[10px] gap-1",
    md: "px-3 py-1 text-[11px] gap-1.5",
    lg: "px-4 py-1.5 text-xs gap-2",
  };

  const activeStyles = active ? "ring-2 ring-offset-2 ring-offset-background ring-primary" : "";
  const clickableStyles = (clickable || onClick) ? "cursor-pointer hover:opacity-80 active:scale-95" : "";

  return (
    <div
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded-full font-bold uppercase tracking-wider border transition-all select-none",
        colors[color][variant],
        sizes[size],
        activeStyles,
        clickableStyles,
        className
      )}
      {...props}
    >
      {Icon && <Icon className={cn(size === 'sm' ? "w-2.5 h-2.5" : "w-3.5 h-3.5")} />}
      
      <span className="truncate max-w-[120px]">{children}</span>
      
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(e);
          }}
          className="hover:bg-black/10 dark:hover:bg-white/10 rounded-full p-0.5 transition-colors"
          aria-label="Remove"
        >
          <X className={cn(size === 'sm' ? "w-2.5 h-2.5" : "w-3 h-3")} />
        </button>
      )}
    </div>
  );
}
