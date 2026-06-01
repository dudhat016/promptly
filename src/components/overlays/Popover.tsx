import React, { cloneElement, createContext, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

export type PopoverPlacement =
  | 'top' | 'top-start' | 'top-end'
  | 'bottom' | 'bottom-start' | 'bottom-end'
  | 'left' | 'right';

interface PopoverContextValue {
  open: boolean;
  setOpen: (v: boolean) => void;
}

const PopoverContext = createContext<PopoverContextValue>({ open: false, setOpen: () => {} });

// ─── Popover Root ─────────────────────────────────────────────
interface PopoverProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function Popover({ children, defaultOpen = false, open: controlledOpen, onOpenChange }: PopoverProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const setOpen = (v: boolean) => {
    if (!isControlled) setUncontrolledOpen(v);
    onOpenChange?.(v);
  };

  return (
    <PopoverContext.Provider value={{ open, setOpen }}>
      {children}
    </PopoverContext.Provider>
  );
}

// ─── Trigger ──────────────────────────────────────────────────
interface PopoverTriggerProps {
  children: React.ReactElement;
  asChild?: boolean;
}

function PopoverTrigger({ children, asChild }: PopoverTriggerProps) {
  const { open, setOpen } = useContext(PopoverContext);
  const child = React.Children.only(children) as React.ReactElement<any>;

  if (asChild) {
    return cloneElement(child, {
      'data-popover-trigger': 'true',
      'aria-expanded': open,
      onClick: (e: React.MouseEvent) => {
        child.props.onClick?.(e);
        setOpen(!open);
      },
    });
  }

  return (
    <span
      data-popover-trigger="true"
      aria-expanded={open}
      onClick={() => setOpen(!open)}
      className="inline-flex"
    >
      {children}
    </span>
  );
}

// ─── Content ─────────────────────────────────────────────────
interface PopoverContentProps {
  children: React.ReactNode;
  placement?: PopoverPlacement;
  className?: string;
  arrow?: boolean;
  sameWidth?: boolean;
  offset?: number;
}

function PopoverContent({
  children,
  placement = 'bottom-start',
  className,
  arrow = false,
  sameWidth = false,
  offset = 8,
}: PopoverContentProps) {
  const { open, setOpen } = useContext(PopoverContext);
  const contentRef = useRef<HTMLDivElement>(null);
  const [styles, setStyles] = useState<React.CSSProperties>({ position: 'fixed', visibility: 'hidden' });

  useEffect(() => {
    if (!open) return;

    const trigger = document.querySelector('[data-popover-trigger="true"]');
    if (!trigger) return;

    const updatePosition = () => {
      const rect = trigger.getBoundingClientRect();
      const contentEl = contentRef.current;
      const cw = contentEl?.offsetWidth || 200;
      const ch = contentEl?.offsetHeight || 100;

      let top = 0;
      let left = 0;

      switch (placement) {
        case 'bottom':
          top = rect.bottom + offset;
          left = rect.left + rect.width / 2 - cw / 2;
          break;
        case 'bottom-start':
          top = rect.bottom + offset;
          left = rect.left;
          break;
        case 'bottom-end':
          top = rect.bottom + offset;
          left = rect.right - cw;
          break;
        case 'top':
          top = rect.top - ch - offset;
          left = rect.left + rect.width / 2 - cw / 2;
          break;
        case 'top-start':
          top = rect.top - ch - offset;
          left = rect.left;
          break;
        case 'top-end':
          top = rect.top - ch - offset;
          left = rect.right - cw;
          break;
        case 'left':
          top = rect.top + rect.height / 2 - ch / 2;
          left = rect.left - cw - offset;
          break;
        case 'right':
          top = rect.top + rect.height / 2 - ch / 2;
          left = rect.right + offset;
          break;
      }

      // Viewport clamping
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      if (left + cw > vw - 8) left = vw - cw - 8;
      if (left < 8) left = 8;
      if (top + ch > vh - 8) top = rect.top - ch - offset;
      if (top < 8) top = 8;

      setStyles({
        position: 'fixed',
        top,
        left,
        width: sameWidth ? rect.width : undefined,
        visibility: 'visible',
      });
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, placement, offset, sameWidth]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const trigger = document.querySelector('[data-popover-trigger="true"]');
      if (
        contentRef.current && !contentRef.current.contains(e.target as Node) &&
        trigger && !trigger.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, setOpen]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, setOpen]);

  const animVariants = {
    initial: { opacity: 0, scale: 0.96, y: placement.startsWith('bottom') ? -4 : placement.startsWith('top') ? 4 : 0 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit:    { opacity: 0, scale: 0.96 },
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={contentRef}
          role="dialog"
          initial={animVariants.initial}
          animate={animVariants.animate}
          exit={animVariants.exit}
          transition={{ type: 'spring', damping: 25, stiffness: 320 }}
          style={styles}
          className={cn(
            'z-[200] min-w-[180px] rounded-xl border border-border bg-card shadow-xl shadow-black/10 dark:shadow-black/30 outline-none',
            className
          )}
        >
          {arrow && (
            <div className="absolute -top-1.5 left-4 w-3 h-3 rotate-45 bg-card border-l border-t border-border" />
          )}
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

// ─── Named re-exports ─────────────────────────────────────────

Popover.Trigger = PopoverTrigger;
Popover.Content = PopoverContent;

export default Popover;
export { PopoverTrigger, PopoverContent };
