import { LucideIcon } from 'lucide-react';
import React from 'react';

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon: LucideIcon;
  error?: string;
}

export default function AuthInput({ label, icon: Icon, error, ...props }: AuthInputProps) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </label>
      <div className="relative group">
        <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <input
          {...props}
          className={`w-full bg-muted/50 border ${error ? 'border-destructive/40 focus:border-destructive/60' : 'border-border focus:border-primary/40'} rounded-md py-3 pl-11 pr-4 text-sm placeholder:text-muted-foreground/50 focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all`}
        />
      </div>
      {error && (
        <p className="text-xs font-medium text-destructive ml-1">
          {error}
        </p>
      )}
    </div>
  );
}
