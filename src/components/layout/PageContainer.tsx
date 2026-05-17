import React from 'react';
import { useUI } from '../../contexts/UIProvider';
import { cn } from '../../lib/utils';

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  /**
   * If true, the container will ignore the customizer's width settings
   * and use the default compact width. (Used for public pages)
   */
  ignoreCustomizer?: boolean;
}

export default function PageContainer({ children, className, ignoreCustomizer }: PageContainerProps) {
  const { config } = useUI();
  
  // Public pages or forced static containers ignore the real-time customizer width
  const effectiveWidth = ignoreCustomizer ? 'compact' : config.contentWidth;
  
  const maxWidth = effectiveWidth === 'compact' ? "max-w-[var(--content-max-width)]" : "max-w-full";

  return (
    <div className={cn(maxWidth, "w-full mx-auto", ignoreCustomizer && "px-4 sm:px-6 lg:px-8", className)}>
      {children}
    </div>
  );
}
