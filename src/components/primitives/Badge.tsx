import React from 'react';
import { cn } from '../../lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outline' | 'soft' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
  pulse?: boolean;
}

const Badge = ({
  className,
  variant = 'default',
  size = 'md',
  dot = false,
  pulse = false,
  children,
  ...props
}: BadgeProps) => {
  const variants = {
    default: "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900",
    outline: "border-2 border-border text-foreground bg-transparent",
    soft: "bg-primary/10 text-primary border-transparent",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    error: "bg-destructive/10 text-destructive border-destructive/20",
    info: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
  };

  const sizes = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-0.5 text-sm",
    lg: "px-3 py-1 text-base"
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold border transition-all",
        variants[variant],
        sizes[size],
        pulse && "animate-pulse",
        className
      )}
      {...props}
    >
      {dot && (
        <span className={cn(
          "w-1.5 h-1.5 rounded-full",
          variant === 'default' ? "bg-white" : "bg-current"
        )} />
      )}
      {children}
    </div>
  );
};

export default Badge;
