import React from 'react';
import { cn } from '../../lib/utils';
import { motion } from 'motion/react';
import { SearchX, FolderOpen, Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
  variant?: 'default' | 'search' | 'inbox';
  className?: string;
}

/**
 * Standardized empty state for lists, tables, and search results.
 */
export default function EmptyState({
  icon,
  title,
  description,
  action,
  variant = 'default',
  className,
}: EmptyStateProps) {
  const defaultIcons = {
    default: FolderOpen,
    search: SearchX,
    inbox: Inbox,
  };

  const Icon = icon || defaultIcons[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex flex-col items-center justify-center py-16 px-6 text-center", className)}
    >
      <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-5">
        <Icon className="w-8 h-8 text-muted-foreground/50" />
      </div>
      <h3 className="text-lg font-bold text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>
      )}
      {action}
    </motion.div>
  );
}
