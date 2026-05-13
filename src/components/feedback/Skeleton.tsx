import React from 'react';
import { cn } from '../../lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'rect' | 'circle' | 'text';
  animation?: 'pulse' | 'wave' | 'none';
}

/**
 * A premium Skeleton component for loading states.
 * Supports multiple variants and animations.
 */
const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant = 'rect', animation = 'pulse', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "bg-muted/60",
          variant === 'circle' && "rounded-full",
          variant === 'rect' && "rounded-xl",
          variant === 'text' && "rounded h-4 w-full mb-2",
          animation === 'pulse' && "animate-pulse",
          animation === 'wave' && "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent",
          className
        )}
        {...props}
      />
    );
  }
);

Skeleton.displayName = "Skeleton";

export default Skeleton;
