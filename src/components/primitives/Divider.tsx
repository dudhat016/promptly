import { cn } from '../../lib/utils';

interface DividerProps {
  className?: string;
  label?: string;
  icon?: React.ReactNode;
  orientation?: 'horizontal' | 'vertical';
}

/**
 * A divider with optional centered label or icon.
 */
export default function Divider({ className, label, icon, orientation = 'horizontal' }: DividerProps) {
  if (orientation === 'vertical') {
    return <div className={cn("w-px bg-border self-stretch", className)} />;
  }

  if (!label && !icon) {
    return <div className={cn("h-px w-full bg-border", className)} />;
  }

  return (
    <div className={cn("flex items-center gap-4 w-full", className)}>
      <div className="flex-1 h-px bg-border" />
      {icon ? (
        <span className="text-muted-foreground shrink-0">{icon}</span>
      ) : (
        <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60 shrink-0">
          {label}
        </span>
      )}
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}
