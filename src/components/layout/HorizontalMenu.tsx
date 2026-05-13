import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, MoreHorizontal, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { usePath } from '../../hooks/usePath';
import { NavItem } from './types';
import { motion, AnimatePresence } from 'motion/react';
import Button from '../primitives/Button';

interface HorizontalMenuProps {
  items: NavItem[];
}

export default function HorizontalMenu({ items }: HorizontalMenuProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);
  const filteredItems = items.filter(item => item.label || (item.children && item.children.length > 0));
  const [visibleCount, setVisibleCount] = useState(filteredItems.length);
  const { prefix } = usePath();
  const location = useLocation();

  useLayoutEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !shadowRef.current) return;

      const containerWidth = containerRef.current.clientWidth;
      const shadowChildren = Array.from(shadowRef.current.children) as HTMLElement[];
      
      let totalWidth = 0;
      let count = filteredItems.length;
      const MORE_WIDTH = 80;

      for (let i = 0; i < shadowChildren.length; i++) {
        const itemWidth = shadowChildren[i].offsetWidth + 4;
        
        if (totalWidth + itemWidth > containerWidth - (i < filteredItems.length - 1 ? MORE_WIDTH : 0)) {
          count = i;
          break;
        }
        totalWidth += itemWidth;
      }

      setVisibleCount(count);
    };

    const observer = new ResizeObserver(handleResize);
    if (containerRef.current) observer.observe(containerRef.current);
    handleResize();

    return () => observer.disconnect();
  }, [filteredItems]);

  const visibleItems = filteredItems.slice(0, visibleCount);
  const overflowItems = filteredItems.slice(visibleCount);
  const isActive = (path?: string) => path ? location.pathname.startsWith(prefix(path)) : false;

  return (
    <div className="relative w-full flex items-center h-full">
      <div ref={containerRef} className="flex items-center gap-1 w-full h-full">
        {visibleItems.map((item, idx) => (
          <MenuItem key={(item.label || 'item') + idx} item={item} isActive={isActive(item.path)} />
        ))}
        
        {overflowItems.length > 0 && (
          <MenuDropdown 
            label="More" 
            icon={MoreHorizontal} 
            items={overflowItems} 
            isOverflow 
          />
        )}
      </div>

      <div 
        ref={shadowRef} 
        className="absolute invisible pointer-events-none flex items-center gap-1 whitespace-nowrap"
        aria-hidden="true"
      >
        {filteredItems.map((item, idx) => (
          <MenuItem key={`shadow-${idx}`} item={item} isActive={false} />
        ))}
      </div>
    </div>
  );
}

function MenuItem({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const { prefix } = usePath();

  if (item.children && item.children.length > 0) {
    return <MenuDropdown label={item.label} icon={item.icon} items={item.children} isActive={isActive} />;
  }

  return (
    <Link
      to={prefix(item.path || '#')}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap shrink-0",
        isActive 
          ? "bg-primary/10 text-primary" 
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {item.icon && <item.icon className="w-4 h-4 shrink-0" />}
      <span>{item.label}</span>
    </Link>
  );
}

function MenuDropdown({ 
  label, 
  icon: Icon, 
  items, 
  isActive, 
  isOverflow = false 
}: { 
  label: string; 
  icon?: React.ElementType; 
  items: NavItem[]; 
  isActive?: boolean;
  isOverflow?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { prefix } = usePath();

  // Handle click outside for overflow menu
  useEffect(() => {
    if (!isOverflow) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, isOverflow]);

  const handleMouseEnter = () => {
    if (isOverflow) return; // Only toggle on click for "More"
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    if (isOverflow) return;
    timeoutRef.current = setTimeout(() => setIsOpen(false), 150);
  };

  const handleClick = () => {
    if (isOverflow) {
      setIsOpen(!isOpen);
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative shrink-0"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Button
        variant="ghost"
        onClick={handleClick}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap h-auto uppercase-none tracking-normal font-sans [&>span]:flex [&>span]:items-center [&>span]:gap-2",
          (isActive || isOpen)
            ? "bg-primary/10 text-primary" 
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
          isOverflow && "px-2"
        )}
      >
        {Icon && <Icon className="w-4 h-4 shrink-0" />}
        {!isOverflow && <span>{label}</span>}
        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", isOpen && "rotate-180")} />
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute top-full z-50 mt-1 min-w-[200px] bg-card border border-border rounded-lg shadow-xl p-1.5",
              isOverflow ? "right-0" : "left-0"
            )}
          >
            {items.map((sub, idx) => (
              <SubMenuItem 
                key={(sub.label || 'sub') + idx} 
                item={sub} 
                onItemClick={() => setIsOpen(false)} 
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SubMenuItem({ 
  item, 
  onItemClick 
}: { 
  item: NavItem; 
  onItemClick?: () => void;
}) {
  const { prefix } = usePath();
  const location = useLocation();
  const [isChildOpen, setIsChildOpen] = useState(false);
  const isActive = item.path ? location.pathname.startsWith(prefix(item.path)) : false;

  if (item.children && item.children.length > 0) {
    return (
      <div 
        className="relative"
        onMouseEnter={() => setIsChildOpen(true)}
        onMouseLeave={() => setIsChildOpen(false)}
      >
        <Button
          variant="ghost"
          className={cn(
            "flex items-center justify-between w-full gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors h-auto uppercase-none tracking-normal font-sans [&>span]:flex [&>span]:items-center [&>span]:justify-between [&>span]:w-full",
            isChildOpen ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <div className="flex items-center gap-2.5">
            {item.icon && <item.icon className="w-4 h-4 shrink-0" />}
            <span>{item.label}</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>

        <AnimatePresence>
          {isChildOpen && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="absolute left-full top-0 ml-1 min-w-[200px] bg-card border border-border rounded-lg shadow-xl p-1.5"
            >
              {item.children.map((child, idx) => (
                <SubMenuItem 
                  key={(child.label || 'child') + idx} 
                  item={child} 
                  onItemClick={onItemClick} 
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <Link
      to={prefix(item.path || '#')}
      onClick={onItemClick}
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors",
        isActive 
          ? "bg-primary/10 text-primary" 
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {item.icon && <item.icon className="w-4 h-4 shrink-0" />}
      <span>{item.label}</span>
    </Link>
  );
}
