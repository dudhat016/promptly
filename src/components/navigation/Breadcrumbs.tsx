import { ChevronRight, Home } from 'lucide-react';
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { usePath } from '../../hooks/usePath';

interface BreadcrumbItem {
  name: string;
  item: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  className?: string;
}

export default function Breadcrumbs({ items, className = '' }: BreadcrumbsProps) {
  const { prefix } = usePath();
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  const displayItems: BreadcrumbItem[] = items || (() => {
    const crumbs: BreadcrumbItem[] = [];
    let currentPath = '';
    const SUPPORTED_LOCALES = new Set(['en', 'es', 'fr', 'hi', 'ar']);
    
    pathnames.forEach((value, index) => {
      currentPath += `/${value}`;
      if (index === 0 && SUPPORTED_LOCALES.has(value)) return;
      if (value === 'edit') return;
      
      const formattedName = value
        .replace(/-/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
        
      crumbs.push({ name: formattedName, item: currentPath });
    });
    return crumbs;
  })();

  if (displayItems.length === 0) return null;

  return (
    <nav
      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-card/90 backdrop-blur-md border border-border shadow-xs text-xs overflow-x-auto whitespace-nowrap scrollbar-hide max-w-full ${className}`}
      aria-label="Breadcrumb"
    >
      <Link
        to={prefix('/')}
        className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all font-semibold shrink-0"
      >
        <Home className="w-3.5 h-3.5" />
      </Link>

      {displayItems.map((item, index) => {
        const isLast = index === displayItems.length - 1;
        return (
          <React.Fragment key={index}>
            <span className="text-muted-foreground/30 font-light select-none shrink-0">/</span>
            {isLast ? (
              <span
                className="px-2 py-0.5 font-semibold text-foreground truncate max-w-[240px] sm:max-w-[380px]"
                aria-current="page"
                title={item.name}
              >
                {item.name}
              </span>
            ) : (
              <Link
                to={item.item}
                className="px-2 py-0.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all font-semibold shrink-0"
              >
                {item.name}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
