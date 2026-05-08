import { ChevronRight, Home } from 'lucide-react';
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface BreadcrumbItem {
  name: string;
  item: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  className?: string;
}

export default function Breadcrumbs({ items, className = '' }: BreadcrumbsProps) {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  const displayItems: BreadcrumbItem[] = items || (() => {
    const crumbs: BreadcrumbItem[] = [];
    let currentPath = '';
    pathnames.forEach(value => {
      currentPath += `/${value}`;
      if (value === 'edit') return;
      crumbs.push({ name: value.replace(/-/g, ' '), item: currentPath });
    });
    return crumbs;
  })();

  if (displayItems.length === 0) return null;

  return (
    <nav className={`flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-muted-foreground/60 mb-8 overflow-x-auto whitespace-nowrap scrollbar-hide ${className}`} aria-label="Breadcrumb">
      <Link 
        to="/" 
        className="hover:text-primary transition-colors flex items-center gap-1 group shrink-0"
      >
        <Home className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
      </Link>
      
      {displayItems.map((item, index) => {
        const isLast = index === displayItems.length - 1;
        return (
          <React.Fragment key={index}>
            <ChevronRight className="w-3 h-3 opacity-30 shrink-0" />
            {isLast ? (
              <span className="text-primary font-black truncate max-w-[200px]" aria-current="page">
                {item.name}
              </span>
            ) : (
              <Link 
                to={item.item}
                className="hover:text-primary transition-colors transition-all shrink-0"
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
