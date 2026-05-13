import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface AccordionItem {
  id: string;
  title: React.ReactNode;
  content: React.ReactNode;
  disabled?: boolean;
}

interface AccordionProps {
  items: AccordionItem[];
  allowMultiple?: boolean;
  defaultOpenIds?: string[];
  className?: string;
  itemClassName?: string;
  triggerClassName?: string;
  contentClassName?: string;
  variant?: 'default' | 'separated' | 'ghost';
}

/**
 * A premium Accordion component with smooth height animations and multiple variants.
 * Ideal for FAQs, settings panels, and collapsible content sections.
 */
export default function Accordion({
  items,
  allowMultiple = false,
  defaultOpenIds = [],
  className,
  itemClassName,
  triggerClassName,
  contentClassName,
  variant = 'default'
}: AccordionProps) {
  const [openIds, setOpenIds] = useState<string[]>(defaultOpenIds);

  const toggleItem = (id: string, disabled?: boolean) => {
    if (disabled) return;

    if (allowMultiple) {
      setOpenIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    } else {
      setOpenIds(prev => prev.includes(id) ? [] : [id]);
    }
  };

  return (
    <div className={cn(variant === 'separated' ? "space-y-3" : "border border-border rounded-xl divide-y divide-border overflow-hidden", className)}>
      {items.map(item => {
        const isOpen = openIds.includes(item.id);

        return (
          <div 
            key={item.id}
            className={cn(
              "transition-all",
              variant === 'separated' && "border border-border rounded-xl bg-card overflow-hidden",
              variant === 'separated' && isOpen && "shadow-lg border-primary/20 ring-1 ring-primary/5",
              variant === 'ghost' && "border-none bg-transparent rounded-none",
              item.disabled && "opacity-40 cursor-not-allowed",
              itemClassName
            )}
          >
            <button
              onClick={() => toggleItem(item.id, item.disabled)}
              disabled={item.disabled}
              className={cn(
                "w-full px-6 py-4 flex items-center justify-between text-left font-bold transition-all hover:bg-muted/30",
                isOpen && variant !== 'ghost' && "bg-muted/20 text-primary",
                triggerClassName
              )}
            >
              <span className="text-sm md:text-base">{item.title}</span>
              <div className={cn(
                "shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors",
                isOpen ? "bg-primary/10 text-primary" : "text-muted-foreground"
              )}>
                <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", isOpen && "rotate-180")} />
              </div>
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
                >
                  <div className={cn(
                    "px-6 pb-5 text-sm md:text-base text-muted-foreground leading-relaxed",
                    contentClassName
                  )}>
                    {item.content}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
