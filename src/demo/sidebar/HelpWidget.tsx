import { BookOpen, LifeBuoy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePath } from '../../hooks/usePath';
import { cn } from '../../lib/utils';

interface HelpWidgetProps {
  isGradient?: boolean;
  collapsed?: boolean;
}

const HELP_LINKS = [
  { icon: BookOpen, label: 'Documentation', path: '/docs' },
  { icon: LifeBuoy,  label: 'Support',       path: '/dashboard/support' },
];

export function HelpWidget({ isGradient, collapsed }: HelpWidgetProps) {
  const { prefix } = usePath();

  if (collapsed) return null;

  return (
    <div className="space-y-0.5">
      {HELP_LINKS.map(({ icon: Icon, label, path }) => (
        <Link
          key={label}
          to={prefix(path)}
          className={cn(
            'flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
            isGradient
              ? 'text-white/50 hover:text-white hover:bg-white/10'
              : 'text-muted-foreground/70 hover:text-foreground hover:bg-muted/60'
          )}
        >
          <Icon className="w-3.5 h-3.5 shrink-0" />
          {label}
        </Link>
      ))}
    </div>
  );
}
