import React from 'react';
import { cn } from '../../lib/utils';

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  ignoreCustomizer?: boolean;
}

export default function PageContainer({ children, className, ignoreCustomizer }: PageContainerProps) {
  return (
    <div className={cn("w-full mx-auto", ignoreCustomizer && "px-4 sm:px-6 lg:px-8", className)}>
      {children}
    </div>
  );
}
