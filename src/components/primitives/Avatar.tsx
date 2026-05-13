import React from 'react';
import { cn } from '../../lib/utils';

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  fallback?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'offline' | 'away' | 'busy';
}

const sizes = {
  xs: "w-6 h-6 text-[10px]",
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-14 h-14 text-lg",
  xl: "w-20 h-20 text-2xl",
};

const statusColors = {
  online: "bg-emerald-500",
  offline: "bg-slate-400",
  away: "bg-amber-500",
  busy: "bg-destructive",
};

export function Avatar({ src, alt = '', fallback, size = 'md', status, className, ...props }: AvatarProps) {
  const initials = fallback || alt.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className={cn("relative inline-flex shrink-0", className)} {...props}>
      <div className={cn(
        "rounded-full overflow-hidden flex items-center justify-center font-bold bg-primary/10 text-primary ring-2 ring-background",
        sizes[size]
      )}>
        {src ? (
          <img src={src} alt={alt} className="w-full h-full object-cover" />
        ) : (
          <span>{initials}</span>
        )}
      </div>
      {status && (
        <span className={cn(
          "absolute bottom-0 right-0 rounded-full ring-2 ring-background",
          statusColors[status],
          size === 'xs' || size === 'sm' ? "w-2 h-2" : "w-3 h-3"
        )} />
      )}
    </div>
  );
}

interface AvatarGroupProps {
  children: React.ReactNode;
  max?: number;
  size?: AvatarProps['size'];
  className?: string;
}

export function AvatarGroup({ children, max = 4, size = 'md', className }: AvatarGroupProps) {
  const avatars = React.Children.toArray(children);
  const visible = avatars.slice(0, max);
  const remaining = avatars.length - max;

  return (
    <div className={cn("flex -space-x-2", className)}>
      {visible.map((child, i) => (
        <div key={i} className="relative" style={{ zIndex: visible.length - i }}>
          {child}
        </div>
      ))}
      {remaining > 0 && (
        <div className={cn(
          "rounded-full flex items-center justify-center font-bold bg-muted text-muted-foreground ring-2 ring-background",
          sizes[size]
        )}>
          +{remaining}
        </div>
      )}
    </div>
  );
}

export default Avatar;
