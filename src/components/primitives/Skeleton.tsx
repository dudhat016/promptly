import { cn } from '../../lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'rectangular' | 'circular' | 'text';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

/**
 * Standardized loading placeholder with shimmer animation.
 * Use variant="text" with lines for paragraph placeholders.
 */
export default function Skeleton({
  className,
  variant = 'rectangular',
  width,
  height,
  lines = 1,
}: SkeletonProps) {
  const base = "animate-pulse bg-muted/60 rounded-md";

  const variants = {
    rectangular: "rounded-md",
    circular: "rounded-full",
    text: "rounded h-4",
  };

  if (variant === 'text' && lines > 1) {
    return (
      <div className={cn("space-y-2.5", className)}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(base, variants.text, i === lines - 1 && "w-3/4")}
            style={{ width: i === lines - 1 ? '75%' : width, height }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(base, variants[variant], className)}
      style={{ width, height }}
    />
  );
}
