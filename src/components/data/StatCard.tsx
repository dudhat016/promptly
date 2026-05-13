import React from 'react';
import { cn } from '../../lib/utils';
import { motion } from 'motion/react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ElementType;
  className?: string;
}

/**
 * KPI stat card with percentage change indicator and optional icon.
 */
export default function StatCard({
  title,
  value,
  change,
  changeLabel = 'vs last period',
  icon: Icon,
  className,
}: StatCardProps) {
  const trend = change !== undefined ? (change > 0 ? 'up' : change < 0 ? 'down' : 'flat') : null;

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-card border border-border rounded-xl p-5 flex flex-col gap-3",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          {title}
        </span>
        {Icon && (
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-primary" />
          </div>
        )}
      </div>

      <span className="text-2xl font-bold text-foreground tracking-tight">{value}</span>

      {change !== undefined && (
        <div className="flex items-center gap-1.5">
          <div className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold",
            trend === 'up' && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
            trend === 'down' && "bg-destructive/10 text-destructive",
            trend === 'flat' && "bg-muted text-muted-foreground"
          )}>
            <TrendIcon className="w-3 h-3" />
            {Math.abs(change).toFixed(1)}%
          </div>
          <span className="text-[10px] text-muted-foreground">{changeLabel}</span>
        </div>
      )}
    </motion.div>
  );
}
