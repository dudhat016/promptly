import { motion } from 'motion/react';
import React from 'react';

interface PageShellProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export default function PageShell({
  title,
  description,
  children,
  actions,
}: PageShellProps) {
  return (
    <div>
      {(title || actions) && (
        <div className="mb-8 flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex-grow">
            {title && (
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                {title}
              </h1>
            )}
            {description && (
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                {description}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex-shrink-0">
              {actions}
            </div>
          )}
        </div>
      )}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {children}
      </motion.div>
    </div>
  );
}
