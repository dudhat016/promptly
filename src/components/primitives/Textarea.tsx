import { motion } from 'motion/react';
import React, { useId } from 'react';
import { cn } from '../../lib/utils';

type TextareaElement = HTMLTextAreaElement;

interface TextareaProps extends Omit<React.TextareaHTMLAttributes<TextareaElement>, 'as'> {
  label?: string;
  error?: string;
  helperText?: string;
  variant?: 'outline' | 'filled' | 'ghost';
  isSuccess?: boolean;
  as?: any;
}

const Textarea = React.forwardRef<TextareaElement, TextareaProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      variant = 'outline',
      isSuccess,
      id,
      required,
      as: Component = 'textarea',
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const textareaId = id || props.name || generatedId;

    const variants = {
      outline: "bg-card border-border",
      filled:  "bg-muted/50 border-transparent focus:bg-card",
      ghost:   "bg-transparent border-transparent hover:bg-muted/30 focus:bg-muted/50",
    };

    const stateBorder = error
      ? "border-destructive focus:border-destructive"
      : isSuccess
      ? "border-emerald-500 focus:border-emerald-500"
      : "focus:border-primary";

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const MotionComponent = React.useMemo(() => motion.create(Component), [Component]);

    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="block cursor-pointer text-md font-semibold text-muted-foreground px-1"
          >
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </label>
        )}

        <MotionComponent
          {...(props as any)}
          id={textareaId}
          ref={ref}
          required={required}
          className={cn(
            "w-full border rounded-md p-4 text-sm focus:outline-none transition-colors",
            "placeholder:text-muted-foreground/40 font-medium min-h-[120px] resize-y",
            variants[variant],
            stateBorder,
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
              <p className="text-[11px] font-medium text-muted-foreground/60">{helperText}</p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

export default Textarea;
