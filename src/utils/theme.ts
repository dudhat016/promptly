/**
 * Centralized variant maps for all UI components.
 * Eliminates duplicated Tailwind strings across components.
 * Import from here when building new primitives.
 */

// ─── Button Variants ──────────────────────────────────────────
export const buttonVariants = {
  primary: "bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/30",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm",
  outline: "bg-transparent border-2 border-border text-foreground hover:bg-muted/50 hover:border-primary/30",
  ghost: "bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
  danger: "bg-destructive text-destructive-foreground shadow-md shadow-destructive/20 hover:bg-destructive/90 hover:shadow-lg",
  success: "bg-emerald-600 text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700",
  white: "bg-white text-slate-900 shadow-xl hover:bg-slate-50 border border-slate-200",
} as const;

// ─── Input / Textarea Variants ──────────────────────────────
export const inputVariants = {
  outline: "bg-card border-border focus:ring-primary/10 focus:border-primary",
  filled: "bg-muted/50 border-transparent focus:bg-card focus:border-primary/30",
  ghost: "bg-transparent border-transparent hover:bg-muted/30 focus:bg-muted/50 focus:border-primary/30",
} as const;

// ─── Size Scales ────────────────────────────────────────────
export const buttonSizes = {
  sm: "h-9 px-4 text-xs font-bold uppercase tracking-wider",
  md: "h-11 px-6 text-sm font-bold uppercase tracking-widest",
  lg: "h-14 px-8 text-base font-bold uppercase tracking-[0.1em]",
  xl: "h-16 px-10 text-lg font-bold uppercase tracking-[0.15em]",
  icon: "h-11 w-11 p-0 flex items-center justify-center",
} as const;

export const inputSizes = {
  sm: "py-2 px-3 text-xs",
  md: "py-3 px-4 text-sm",
  lg: "py-4 px-5 text-base",
} as const;

// ─── Badge Variants ─────────────────────────────────────────
export const badgeVariants = {
  default: "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900",
  outline: "border-2 border-border text-foreground bg-transparent",
  soft: "bg-primary/10 text-primary border-transparent",
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  error: "bg-destructive/10 text-destructive border-destructive/20",
  info: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
} as const;

// ─── Card Variants ──────────────────────────────────────────
export const cardVariants = {
  default: "bg-card border-border shadow-sm",
  outline: "bg-transparent border-2 border-border",
  glass: "bg-background/40 backdrop-blur-md border-white/10 shadow-xl",
  ghost: "bg-transparent border-transparent",
} as const;

// ─── Rounding Scale ─────────────────────────────────────────
export const roundingScale = {
  none: "rounded-none",
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-xl",
  full: "rounded-full",
} as const;

// ─── Animation Presets ──────────────────────────────────────
export const animations = {
  fadeIn: { initial: { opacity: 0 }, animate: { opacity: 1 } },
  slideUp: { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } },
  slideDown: { initial: { opacity: 0, y: -12 }, animate: { opacity: 1, y: 0 } },
  scaleIn: { initial: { opacity: 0, scale: 0.95 }, animate: { opacity: 1, scale: 1 } },
  spring: { transition: { type: 'spring', damping: 25, stiffness: 300 } },
  springFast: { transition: { type: 'spring', damping: 30, stiffness: 500 } },
} as const;
