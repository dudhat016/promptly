import React from 'react';
import { cn } from '../../lib/utils';
import { LucideIcon, Circle } from 'lucide-react';

export interface TimelineItem {
  id: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  timestamp: string;
  icon?: LucideIcon;
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'default';
}

interface TimelineProps {
  items: TimelineItem[];
  className?: string;
  density?: 'compact' | 'comfortable';
}

/**
 * A premium Timeline component for activity logs, event history, and tracking.
 * Features: custom icons, status colors, and responsive density options.
 */
export default function Timeline({
  items,
  className,
  density = 'comfortable',
}: TimelineProps) {
  
  const colors = {
    primary: "bg-primary text-primary-foreground",
    success: "bg-emerald-500 text-white",
    warning: "bg-amber-500 text-white",
    error: "bg-destructive text-white",
    info: "bg-blue-500 text-white",
    default: "bg-muted text-muted-foreground",
  };

  const ringColors = {
    primary: "ring-primary/20",
    success: "ring-emerald-500/20",
    warning: "ring-amber-500/20",
    error: "ring-destructive/20",
    info: "ring-blue-500/20",
    default: "ring-muted/20",
  };

  return (
    <div className={cn("space-y-0", className)}>
      {items.map((item, index) => {
        const Icon = item.icon || Circle;
        const colorClass = colors[item.color || 'default'];
        const ringClass = ringColors[item.color || 'default'];
        const isLast = index === items.length - 1;

        return (
          <div key={item.id} className="relative flex gap-4 group">
            {/* Connector Line */}
            {!isLast && (
              <div 
                className={cn(
                  "absolute left-[15px] top-[30px] bottom-[-10px] w-0.5 bg-border",
                  density === 'compact' ? "top-[24px]" : "top-[30px]"
                )} 
              />
            )}

            {/* Icon/Dot */}
            <div className="relative shrink-0 z-10">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center ring-4",
                colorClass,
                ringClass,
                density === 'compact' && "w-6 h-6 ring-2"
              )}>
                <Icon className={cn(density === 'compact' ? "w-3 h-3" : "w-4 h-4")} />
              </div>
            </div>

            {/* Content */}
            <div className={cn(
              "flex-1 pb-8",
              density === 'compact' ? "pb-5 pt-0.5" : "pb-8 pt-1"
            )}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-1 mb-1">
                <h4 className="text-sm font-bold text-foreground">
                  {item.title}
                </h4>
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-md">
                  {item.timestamp}
                </span>
              </div>
              
              {item.description && (
                <div className="text-sm text-muted-foreground leading-relaxed">
                  {item.description}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
