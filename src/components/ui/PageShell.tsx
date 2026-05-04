import { motion } from 'motion/react';
import React from 'react';
import Breadcrumbs from './Breadcrumbs';

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
      <Breadcrumbs />
      <div className='w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12'>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {(title || actions) && (
            <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex-grow">
                {title && (
                  <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight mb-1">
                    {title}
                  </h1>
                )}
                {description && (
                  <p className="text-slate-500 font-medium text-sm leading-relaxed max-w-2xl">
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
        </motion.div>
        <motion.main
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
}
