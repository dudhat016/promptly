import React from 'react';
import { cn } from '../../lib/utils';

type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type SpinnerVariant = 'primary' | 'muted' | 'white';

interface SpinnerProps {
  size?: SpinnerSize;
  variant?: SpinnerVariant;
  label?: string;
  className?: string;
}

const sizes: Record<SpinnerSize, string> = {
  xs: 'w-3 h-3 border-[1.5px]',
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-[3px]',
  xl: 'w-12 h-12 border-4',
};

const variants: Record<SpinnerVariant, string> = {
  primary: 'border-primary/20 border-t-primary',
  muted: 'border-muted-foreground/20 border-t-muted-foreground',
  white: 'border-white/20 border-t-white',
};

const Spinner = React.forwardRef<HTMLSpanElement, SpinnerProps>(
  ({ size = 'md', variant = 'primary', label = 'Loading…', className }, ref) => (
    <span ref={ref} role="status" aria-label={label} className={cn("inline-flex items-center justify-center", className)}>
      <span
        className={cn(
          "rounded-full animate-spin",
          sizes[size],
          variants[variant]
        )}
      />
      <span className="sr-only">{label}</span>
    </span>
  )
);

Spinner.displayName = "Spinner";

export default Spinner;
