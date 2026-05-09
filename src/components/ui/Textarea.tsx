import React from 'react';
import { cn } from '../../lib/utils';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  variant?: 'outline' | 'filled' | 'ghost';
}

/**
 * A standardized, accessible Textarea component for the entire SaaS platform.
 */
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, variant = 'outline', id, ...props }, ref) => {
    const textareaId = id || props.name || `textarea-${Math.random().toString(36).substr(2, 9)}`;

    // Variant Styles
    const variants = {
      outline: "bg-card border-border focus:ring-primary/10 focus:border-primary",
      filled: "bg-muted/50 border-transparent focus:bg-card focus:border-primary/30",
      ghost: "bg-transparent border-transparent hover:bg-muted/30 focus:bg-muted/50 focus:border-primary/30"
    };

    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label 
            htmlFor={textareaId} 
            className="block text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground px-1"
          >
            {label}
          </label>
        )}
        <textarea
          {...props}
          id={textareaId}
          ref={ref}
          className={cn(
            "w-full border-2 rounded-md p-4 text-sm focus:outline-none focus:ring-4 transition-all placeholder:text-muted-foreground/30 font-medium min-h-[120px] resize-y",
            variants[variant],
            error && "border-destructive/50 focus:ring-destructive/10 focus:border-destructive",
            className
          )}
        />
        {(error || helperText) && (
          <div className="px-1">
            {error ? (
              <p className="text-[11px] font-bold text-destructive animate-in fade-in slide-in-from-top-1">
                {error}
              </p>
            ) : (
              <p className="text-[11px] font-medium text-muted-foreground/60">
                {helperText}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

export default Textarea;
