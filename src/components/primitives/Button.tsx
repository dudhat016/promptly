import { Loader2 } from 'lucide-react';
import React from 'react';
import { cn } from '../../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'white' | 'soft' | 'gradient' | 'link';
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
      secondary: "bg-muted text-foreground hover:bg-muted/80 shadow-sm",
      outline: "bg-card border-2 border-border text-foreground hover:border-primary/40 hover:bg-muted/30",
      ghost: "bg-transparent text-muted-foreground hover:bg-primary/10 hover:text-primary",
      danger: "bg-destructive text-white shadow-md shadow-destructive/20 hover:bg-destructive/90 hover:shadow-lg",
      success: "bg-emerald-600 text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700",
      white: "bg-white text-slate-900 shadow-xl hover:bg-slate-50 border border-slate-200",
      soft: "bg-primary/10 text-primary hover:bg-primary/20",
      gradient: "gradient-cta shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/35 hover:opacity-95",
      link: "bg-transparent text-primary underline-offset-4 hover:underline p-0 h-auto shadow-none uppercase-none tracking-normal font-semibold"
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

    return (
      <Component
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          variants[variant],
          variant !== 'link' && sizes[size],
          variant !== 'link' && rounding[rounded],
          "relative cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap transition-all focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
          variant !== 'link' && "disabled:bg-muted disabled:text-muted-foreground/60 disabled:border-transparent disabled:shadow-none",
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
            {size === 'icon' ? children : children != null && <span>{children}</span>}
            {RightIcon && <RightIcon className={cn(size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4', "shrink-0", iconClassName)} />}
          </>
        )}
      </Component>
    );
  }
);

Button.displayName = "Button";

export default Button;
