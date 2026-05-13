import { CheckCircle2, Loader2, LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import React, { useId } from 'react';
import { cn } from '../../lib/utils';

type InputElement = HTMLInputElement;

interface InputProps extends Omit<React.InputHTMLAttributes<InputElement>, 'as'> {
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
  as?: any;
}

const Input = React.forwardRef<InputElement, InputProps>(
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
      as: Component = 'input',
      required,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || props.name || generatedId;

    // Base variant (idle state only — focus/error/success override border below)
    const variants = {
      outline: "bg-card border-border",
      filled:  "bg-muted/50 border-transparent focus:bg-card",
      ghost:   "bg-transparent border-transparent hover:bg-muted/30 focus:bg-muted/50",
    };

    const sizes = {
      sm: "py-2 px-3 text-sm",
      md: "py-3 px-4 text-base",
      lg: "py-4 px-5 text-base",
    };

    // Border/outline state priority: error > success > focus > idle
    // We use focus:border-* to override the idle border on focus.
    // ring is replaced with a simple outline approach via border width.
    const stateBorder = error
      ? "border-destructive focus:border-destructive"
      : isSuccess
      ? "border-emerald-500 focus:border-emerald-500"
      : "focus:border-primary";

    // Icon color mirrors state
    const iconColor = error
      ? "text-destructive"
      : isSuccess
      ? "text-emerald-500"
      : "text-muted-foreground group-focus-within:text-primary";

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const MotionComponent = React.useMemo(() => motion.create(Component), [Component]);

    return (
      <div className="space-y-1.5 w-full">
        {(label || isLoading) && (
          <div className="flex items-center justify-between px-1">
            {label && (
              <label
                htmlFor={inputId}
                className="block cursor-pointer text-md font-semibold text-muted-foreground"
              >
                {label}
                {required && <span className="text-destructive ml-1">*</span>}
              </label>
            )}
            {isLoading && <Loader2 className="w-3 h-3 text-primary animate-spin" />}
          </div>
        )}

        <div className="relative group">
          <MotionComponent
            {...(props as any)}
            id={inputId}
            ref={ref}
            required={required}
            className={cn(
              "w-full rounded-md border transition-colors focus:outline-none",
              "placeholder:text-muted-foreground/40 font-medium",
              variants[variant],
              sizes[inputSize],
              stateBorder,
              LeftIcon && (inputSize === 'sm' ? "pl-9" : "pl-11"),
              (RightIcon || rightAction || isLoading || isSuccess) && "pr-11",
              className
            )}
          />

          {/* Icons rendered AFTER the input so they paint on top of the input background */}
          {LeftIcon && (
            <LeftIcon
              className={cn(
                "absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors",
                inputSize === 'sm' ? "w-3.5 h-3.5" : "w-4 h-4",
                iconColor
              )}
            />
          )}

          {(isLoading || isSuccess || RightIcon || rightAction) && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {isLoading && !rightAction && <Loader2 className="w-4 h-4 text-primary animate-spin pointer-events-none" />}
              {isSuccess && !isLoading && <CheckCircle2 className="w-4 h-4 text-emerald-500 pointer-events-none" />}
              {RightIcon && !isLoading && !isSuccess && <RightIcon className="w-4 h-4 text-muted-foreground pointer-events-none" />}
              {rightAction && <div>{rightAction}</div>}
            </div>
          )}
        </div>

        {(error || helperText) && (
          <div className="px-1">
            {error ? (
              <p className="text-[11px] font-bold text-destructive">
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

Input.displayName = "Input";

export default Input;
