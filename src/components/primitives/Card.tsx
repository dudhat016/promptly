import { motion, type HTMLMotionProps } from 'motion/react';
import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps extends HTMLMotionProps<'div'> {
  variant?: 'default' | 'outline' | 'glass' | 'ghost' | 'raised' | 'flat';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  as?: any;
  interactive?: boolean;
  [key: string]: any;
}

/**
 * A highly flexible Card component with sub-components for structured content.
 * Supports multiple variants, interactive states, and sticky headers/footers.
 */
const MotionDiv = motion.div;

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', padding = 'md', as: Component = 'div', interactive = false, children, ...props }, ref) => {
    const variants = {
      default: "bg-card border-border shadow-sm",
      outline: "bg-transparent border-2 border-border",
      glass: "bg-background/40 backdrop-blur-md border-white/10 shadow-xl",
      ghost: "bg-transparent border-transparent",
      raised: "bg-card border-border shadow-xl shadow-black/5 dark:shadow-black/20",
      flat: "bg-muted/30 border-border/50 shadow-none"
    };

    const paddings = {
      none: "p-0",
      sm: "p-4",
      md: "p-6",
      lg: "p-8"
    };

    const MotionComponent = Component === 'div' ? MotionDiv : Component;

    return (
      <MotionComponent
        ref={ref}
        whileHover={interactive ? { y: -4, transition: { duration: 0.2 } } : {}}
        className={cn(
          "rounded-xl border transition-all flex flex-col",
          variants[variant],
          paddings[padding],
          interactive && "cursor-pointer hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5",
          className
        )}
        {...(props as any)}
      >
        {children}
      </MotionComponent>
    );
  }
) as React.ForwardRefExoticComponent<CardProps & React.RefAttributes<HTMLDivElement>> & Record<string, any> & {
  Header: typeof CardHeader;
  Body: typeof CardBody;
  Footer: typeof CardFooter;
};

// ─── Sub-components ───────────────────────────────────────────

interface CardHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  sticky?: boolean;
}

const CardHeader = ({ title, subtitle, action, sticky, className, children, ...props }: CardHeaderProps) => (
  <div
    className={cn(
      "px-6 py-4 border-b border-border flex items-center justify-between gap-4",
      sticky && "sticky top-0 bg-card z-10",
      className
    )}
    {...props}
  >
    <div className="flex-1 min-w-0">
      {title && <h3 className="text-base font-bold text-foreground truncate">{title}</h3>}
      {subtitle && <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>}
      {children}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

const CardBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("p-6 flex-1", className)} {...props} />
);

const CardFooter = ({ className, sticky, ...props }: React.HTMLAttributes<HTMLDivElement> & { sticky?: boolean }) => (
  <div
    className={cn(
      "px-6 py-4 border-t border-border bg-muted/5",
      sticky && "sticky bottom-0 bg-card z-10",
      className
    )}
    {...props}
  />
);

Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;

Card.displayName = "Card";

export default Card;
