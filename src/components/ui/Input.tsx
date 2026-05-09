import React from 'react';
import { cn } from '../../lib/utils';

import { LucideIcon, Loader2, CheckCircle2 } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  variant?: 'outline' | 'filled' | 'ghost';
  inputSize?: 'sm' | 'md' | 'lg';
  leftIcon?: LucideIcon;
  rightIcon?: LucideIcon;
  rightAction?: React.ReactNode;
  isLoading?: boolean;
  isSuccess?: boolean;
}

/**
 * A highly flexible, enterprise-ready Input component for a SaaS platform.
 * Supports multiple variants, sizes, icons, and state feedback (loading/success/error).
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      variant = 'outline',
      inputSize = 'md',
      leftIcon: LeftIcon,
      rightIcon: RightIcon,
      rightAction,
      isLoading,
      isSuccess,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || props.name || `input-${Math.random().toString(36).substr(2, 9)}`;

    // Variant Styles
    const variants = {
      outline: "bg-card border-border focus:ring-primary/10 focus:border-primary",
      filled: "bg-muted/50 border-transparent focus:bg-card focus:border-primary/30",
      ghost: "bg-transparent border-transparent hover:bg-muted/30 focus:bg-muted/50 focus:border-primary/30"
    };

    // Size Styles
    const sizes = {
      sm: "py-2 px-3 text-xs",
      md: "py-3 px-4 text-sm",
      lg: "py-4 px-5 text-base"
    };

    return (
      <div className="space-y-1.5 w-full">
        <div className="flex items-center justify-between px-1">
          {label && (
            <label 
              htmlFor={inputId} 
              className="block text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground"
            >
              {label}
            </label>
          )}
          {isLoading && <Loader2 className="w-3 h-3 text-primary animate-spin" />}
        </div>

        <div className="relative group">
          {LeftIcon && (
            <LeftIcon className={cn(
              "absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors",
              inputSize === 'sm' ? "w-3.5 h-3.5" : "w-4 h-4"
            )} />
          )}
          
          <input
            {...props}
            id={inputId}
            ref={ref}
            className={cn(
              "w-full rounded-md border-2 transition-all focus:outline-none focus:ring-4 placeholder:text-muted-foreground/30 font-medium",
              variants[variant],
              sizes[inputSize],
              LeftIcon && (inputSize === 'sm' ? "pl-9" : "pl-11"),
              (RightIcon || rightAction || isLoading || isSuccess) && "pr-11",
              error && "border-destructive/50 focus:ring-destructive/10 focus:border-destructive",
              isSuccess && "border-emerald-500/50 focus:ring-emerald-500/10 focus:border-emerald-500",
              className
            )}
          />

          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {isLoading && !rightAction && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
            {isSuccess && !isLoading && <CheckCircle2 className="w-4 h-4 text-emerald-500 animate-in zoom-in" />}
            {RightIcon && !isLoading && !isSuccess && <RightIcon className="w-4 h-4 text-muted-foreground" />}
            {rightAction}
          </div>
        </div>

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

Input.displayName = "Input";

export default Input;
