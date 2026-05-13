import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  placement?: TooltipPlacement;
  delay?: number;
  className?: string;
  arrow?: boolean;
}

/**
 * A premium Tooltip component with smooth animations and smart positioning.
 * Features: delayed appearance, spring animations, and automatic arrow pointing.
 */
export default function Tooltip({
  content,
  children,
  placement = 'top',
  delay = 200,
  className,
  arrow = true,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const show = () => {
    timeoutRef.current = setTimeout(() => setIsVisible(true), delay);
  };

  const hide = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  const placementStyles: Record<TooltipPlacement, string> = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2.5",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2.5",
    left: "right-full top-1/2 -translate-y-1/2 mr-2.5",
    right: "left-full top-1/2 -translate-y-1/2 ml-2.5",
  };

  const animationVariants = {
    top:    { initial: { opacity: 0, scale: 0.9, y: 5 },  animate: { opacity: 1, scale: 1, y: 0 } },
    bottom: { initial: { opacity: 0, scale: 0.9, y: -5 }, animate: { opacity: 1, scale: 1, y: 0 } },
    left:   { initial: { opacity: 0, scale: 0.9, x: 5 },  animate: { opacity: 1, scale: 1, x: 0 } },
    right:  { initial: { opacity: 0, scale: 0.9, x: -5 }, animate: { opacity: 1, scale: 1, x: 0 } },
  };

  const arrowStyles: Record<TooltipPlacement, string> = {
    top:    "bottom-[-4px] left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-slate-900 dark:border-t-slate-800",
    bottom: "top-[-4px] left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-slate-900 dark:border-b-slate-800",
    left:   "right-[-4px] top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-slate-900 dark:border-l-slate-800",
    right:  "left-[-4px] top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-slate-900 dark:border-r-slate-800",
  };

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={animationVariants[placement].initial}
            animate={animationVariants[placement].animate}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className={cn(
              "absolute z-[100] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white bg-slate-900 dark:bg-slate-800 rounded-lg shadow-2xl shadow-black/20 whitespace-nowrap pointer-events-none",
              placementStyles[placement],
              className
            )}
          >
            {content}
            {arrow && (
              <div className={cn("absolute border-[5px]", arrowStyles[placement])} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
