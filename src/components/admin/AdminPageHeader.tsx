import type { LucideIcon } from 'lucide-react';

interface AdminPageHeaderProps {
  label?: string;
  labelIcon?: React.ElementType;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function AdminPageHeader({ label, labelIcon: LabelIcon, title, subtitle, actions }: AdminPageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
      <div className="space-y-1.5">
        {label && (
          <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-[0.2em] text-xs">
            {LabelIcon && <LabelIcon className="w-4 h-4" />}
            {label}
          </div>
        )}
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
        {subtitle && <p className="text-muted-foreground font-medium">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
    </div>
  );
}
