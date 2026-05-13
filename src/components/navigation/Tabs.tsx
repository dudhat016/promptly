import { motion } from 'motion/react';
import React, { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';

export type TabVariant = 'line' | 'pill' | 'card' | 'soft';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ElementType;
  badge?: string | number;
  disabled?: boolean;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab?: string;
  defaultTab?: string;
  onChange?: (id: string) => void;
  variant?: TabVariant;
  className?: string;
  tabClassName?: string;
  activeTabClassName?: string;
  fullWidth?: boolean;
}

/**
 * A premium Tabs component supporting multiple variants and layouts.
 * Features keyboard navigation, badges, icons, and smooth spring animations.
 */
export default function Tabs({
  tabs,
  activeTab: controlledActiveTab,
  defaultTab,
  onChange,
  variant = 'line',
  className,
  tabClassName,
  activeTabClassName,
  fullWidth = false,
}: TabsProps) {
  const [internalActiveTab, setInternalActiveTab] = useState(controlledActiveTab || defaultTab || tabs[0]?.id);
  const activeTabId = controlledActiveTab !== undefined ? controlledActiveTab : internalActiveTab;

  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (controlledActiveTab !== undefined) {
      setInternalActiveTab(controlledActiveTab);
    }
  }, [controlledActiveTab]);

  const handleTabClick = (id: string, disabled?: boolean) => {
    if (disabled) return;
    setInternalActiveTab(id);
    onChange?.(id);
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let newIndex = -1;
    if (e.key === 'ArrowRight') {
      newIndex = (index + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft') {
      newIndex = (index - 1 + tabs.length) % tabs.length;
    }

    if (newIndex !== -1) {
      const nextTab = tabs[newIndex];
      if (!nextTab.disabled) {
        handleTabClick(nextTab.id);
        tabsRef.current[newIndex]?.focus();
      }
    }
  };

  const variantStyles: Record<TabVariant, { container: string, tab: string, active: string }> = {
    line: {
      container: "border-b border-border gap-8",
      tab: "pb-4 -mb-px text-muted-foreground hover:text-foreground",
      active: "text-primary",
    },
    pill: {
      container: "bg-muted/50 p-1.5 rounded-xl gap-1",
      tab: "px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground z-10",
      active: "text-foreground",
    },
    card: {
      container: "gap-1",
      tab: "px-6 py-3 rounded-t-xl border border-border border-b-0 bg-muted/30 text-muted-foreground hover:bg-muted/50 translate-y-px",
      active: "bg-card text-foreground font-bold border-b-card translate-y-px z-10 shadow-[0_-4px_10px_-4px_rgba(0,0,0,0.05)]",
    },
    soft: {
      container: "gap-2",
      tab: "px-4 py-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5",
      active: "bg-primary/10 text-primary font-bold",
    }
  };

  const style = variantStyles[variant];

  return (
    <div
      role="tablist"
      className={cn(
        "flex items-center",
        style.container,
        fullWidth && "w-full",
        className
      )}
    >
      {tabs.map((tab, index) => {
        const isActive = activeTabId === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            ref={el => { tabsRef.current[index] = el; }}
            role="tab"
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.id}`}
            disabled={tab.disabled}
            onClick={() => handleTabClick(tab.id, tab.disabled)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={cn(
              "relative cursor-pointer flex items-center gap-2 text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
              style.tab,
              isActive && style.active,
              isActive && activeTabClassName,
              tab.disabled && "opacity-40 cursor-not-allowed grayscale",
              fullWidth && "flex-1 justify-center",
              tabClassName
            )}
          >
            {Icon && <Icon className={cn("w-4 h-4 transition-colors", isActive ? "text-primary" : "text-muted-foreground/70")} />}
            <span>{tab.label}</span>

            {tab.badge !== undefined && (
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-black min-w-[18px] flex items-center justify-center transition-colors",
                isActive
                  ? (variant === 'soft' ? "bg-primary text-primary-foreground" : "bg-primary text-primary-foreground")
                  : "bg-muted-foreground/10 text-muted-foreground"
              )}>
                {tab.badge}
              </span>
            )}

            {/* Indicator for 'line' variant */}
            {variant === 'line' && isActive && (
              <motion.div
                layoutId="activeTabLine"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full shadow-[0_0_8px_rgba(var(--primary),0.5)]"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
            )}

            {/* Background for 'pill' variant */}
            {variant === 'pill' && isActive && (
              <motion.div
                layoutId="activeTabPill"
                className="absolute inset-0 bg-card rounded-lg shadow-sm -z-10"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
