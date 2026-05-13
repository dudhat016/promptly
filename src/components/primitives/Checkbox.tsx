import React, { useId, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { Check, Minus } from 'lucide-react';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
  error?: string;
  variant?: 'default' | 'simple';
  indeterminate?: boolean;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, error, variant = 'default', indeterminate, ...props }, ref) => {
    const generatedId = useId();
    const checkboxId = props.id || generatedId;
    const innerRef = useRef<HTMLInputElement>(null);

    // Sync indeterminate state
    useEffect(() => {
      if (innerRef.current) {
        innerRef.current.indeterminate = !!indeterminate;
      }
    }, [indeterminate]);

    // Compose refs
    const setRef = (node: HTMLInputElement) => {
      (innerRef as any).current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as any).current = node;
    };

    const variants = {
      default: cn(
        "flex items-start gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer group select-none",
        props.checked || indeterminate
          ? "bg-primary/5 border-primary/20" 
          : "bg-muted/30 border-transparent hover:bg-muted/50",
      ),
      simple: cn(
        "flex items-center gap-2 cursor-pointer group select-none transition-all",
        (props.checked || indeterminate) ? "text-primary" : "text-muted-foreground hover:text-foreground"
      )
    };

    return (
      <div className={cn("space-y-1", variant === 'simple' && "inline-block")}>
        <label 
          htmlFor={checkboxId}
          className={cn(
            variants[variant],
            error && "border-destructive/30 bg-destructive/5",
            className
          )}
        >
          <div className="relative flex items-center justify-center mt-0.5">
            <input
              {...props}
              id={checkboxId}
              type="checkbox"
              ref={setRef}
              className="peer appearance-none w-5 h-5 rounded border-2 border-muted-foreground/30 bg-background transition-all checked:bg-primary checked:border-primary cursor-pointer focus:outline-none focus:ring-4 focus:ring-primary/10"
            />
            {indeterminate ? (
              <Minus 
                className="absolute w-3.5 h-3.5 text-white transition-all opacity-100 scale-100 pointer-events-none" 
                strokeWidth={4}
              />
            ) : (
              <Check 
                className={cn(
                  "absolute w-3.5 h-3.5 text-white transition-all opacity-0 scale-50 pointer-events-none",
                  props.checked && "opacity-100 scale-100"
                )} 
                strokeWidth={4}
              />
            )}
          </div>
          
          <div className="flex flex-col">
            {label && (
              <span className={cn(
                "text-sm font-bold transition-colors",
                props.checked ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
              )}>
                {label}
              </span>
            )}
            {description && (
              <span className="text-xs text-muted-foreground/70 leading-tight mt-0.5">
                {description}
              </span>
            )}
          </div>
        </label>
        {error && (
          <p className="text-[10px] font-bold text-destructive uppercase tracking-widest px-1">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";

export default Checkbox;
