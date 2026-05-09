import React from 'react';
import { motion } from 'motion/react';
import { LucideIcon, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'white';
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'icon';
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  isLoading?: boolean;
  leftIcon?: React.ElementType;
  rightIcon?: React.ElementType;
  iconClassName?: string;
  fullWidth?: boolean;
  as?: any;
  to?: string; // For Link support
  href?: string; // For native anchor support
  target?: string;
  rel?: string;
}

/**
 * A highly versatile, premium Button component.
 * Supports multiple variants, sizes, shapes, and interactive states.
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      rounded = 'md',
      isLoading = false,
      leftIcon: LeftIcon,
      rightIcon: RightIcon,
      iconClassName,
      fullWidth = false,
      as: Component = 'button',
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    // Variant Styles
    const variants = {
      primary: "bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/30",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm",
      outline: "bg-transparent border-2 border-border text-foreground hover:bg-muted/50 hover:border-primary/30",
      ghost: "bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
      danger: "bg-destructive text-destructive-foreground shadow-md shadow-destructive/20 hover:bg-destructive/90 hover:shadow-lg",
      success: "bg-emerald-600 text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700",
      white: "bg-white text-slate-900 shadow-xl hover:bg-slate-50 border border-slate-200"
    };

    // Size Styles
    const sizes = {
      sm: "h-9 px-4 text-xs font-bold uppercase tracking-wider",
      md: "h-11 px-6 text-sm font-bold uppercase tracking-widest",
      lg: "h-14 px-8 text-base font-bold uppercase tracking-[0.1em]",
      xl: "h-16 px-10 text-lg font-bold uppercase tracking-[0.15em]",
      icon: "h-11 w-11 p-0 flex items-center justify-center"
    };

    // Rounded Styles
    const rounding = {
      none: "rounded-none",
      sm: "rounded-sm",
      md: "rounded-md",
      lg: "rounded-xl",
      full: "rounded-full"
    };

    const MotionComponent = motion(Component);

    return (
      <MotionComponent
        ref={ref}
        whileHover={!disabled && !isLoading ? { scale: 1.02 } : {}}
        whileTap={!disabled && !isLoading ? { scale: 0.98 } : {}}
        disabled={disabled || isLoading}
        className={cn(
          "relative inline-flex items-center justify-center gap-2 whitespace-nowrap transition-all focus:outline-none focus:ring-4 focus:ring-primary/10 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
          variants[variant],
          sizes[size],
          rounding[rounded],
          fullWidth && "w-full",
          className
        )}
        {...(props as any)}
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <Loader2 className={cn("animate-spin", size === 'sm' ? 'w-3 h-3' : 'w-4 h-4')} />
            {size !== 'icon' && <span>Loading...</span>}
          </div>
        ) : (
          <>
            {LeftIcon && <LeftIcon className={cn(size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4', "shrink-0", iconClassName)} />}
            {size !== 'icon' && <span>{children}</span>}
            {RightIcon && <RightIcon className={cn(size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4', "shrink-0", iconClassName)} />}
          </>
        )}
      </MotionComponent>
    );
  }
);

Button.displayName = "Button";

export default Button;
