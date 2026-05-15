import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, X, Zap, LogOut, Gift } from 'lucide-react';
import { cn } from '../../lib/utils';
import { usePath } from '../../hooks/usePath';
import { NavItem } from './types';
import { motion, AnimatePresence } from 'motion/react';
import Button from '../primitives/Button';
import { useUI } from '../../contexts/UIProvider';

interface SidebarProps {
  items: NavItem[];
  logo?: React.ReactNode;
  onClose?: () => void;
  isMobile?: boolean;
  bottomSection?: React.ReactNode;
}

export default function Sidebar({ items, logo, onClose, isMobile, bottomSection }: SidebarProps) {
  const { config, setReferralModalOpen } = useUI();
  const { prefix } = usePath();
  const location = useLocation();
  const sidebarWidth = config.sidebarCollapsed && !isMobile ? 80 : config.sidebarWidth;

  const isActive = (path?: string) => path ? location.pathname.startsWith(prefix(path)) : false;

  return (
    <aside
      style={{ width: isMobile ? '100%' : `${sidebarWidth}px` }}
      className={cn(
        "flex flex-col h-screen sticky top-0 border-r border-border transition-all duration-300 z-30",
        config.sidebarTheme === 'gradient' ? "gradient-cta border-primary/20" : "bg-sidebar",
        isMobile ? "w-full fixed inset-y-0 left-0" : "hidden lg:flex"
      )}
    >
      {/* Header / Logo */}
      <div className={cn(
        "h-16 flex items-center justify-between px-5 border-b shrink-0",
        config.sidebarTheme === 'gradient' ? "border-white/10" : "border-border"
      )}>
        <Link to={prefix('/')} className="flex items-center gap-2.5 group">
          {logo || (
            <>
              <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center shadow-sm shadow-primary/30 group-hover:scale-95 transition-transform">
                <Zap className="w-4 h-4 text-primary-foreground fill-primary-foreground" />
              </div>
              {(!config.sidebarCollapsed || isMobile) && (
                <span className={cn(
                  "text-base font-bold tracking-tight font-display",
                  config.sidebarTheme === 'gradient' ? "text-white" : "text-foreground"
                )}>promptly</span>
              )}
            </>
          )}
        </Link>
        {isMobile && onClose && (
          <Button onClick={onClose} variant="ghost" size="icon" className="h-8 w-8">
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {items.map((item, idx) => (
          <SidebarItem 
            key={(item.label || item.sectionTitle || 'item') + idx} 
            item={item} 
            isActive={isActive(item.path)} 
            collapsed={config.sidebarCollapsed && !isMobile}
          />
        ))}
      </nav>

      {/* Refer & Earn Button */}
      <div className="px-3 mb-2">
        <button
          onClick={() => setReferralModalOpen(true)}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group overflow-hidden relative",
            config.sidebarTheme === 'gradient' 
              ? "bg-white/10 hover:bg-white/20 text-white border border-white/10" 
              : "bg-primary/5 hover:bg-primary/10 text-primary border border-primary/10"
          )}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer" />
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
            config.sidebarTheme === 'gradient' ? "bg-white/10" : "bg-primary/10"
          )}>
            <Gift className="w-4 h-4" />
          </div>
          {(!config.sidebarCollapsed || isMobile) && (
            <div className="text-left">
              <p className="text-[11px] font-bold uppercase tracking-widest leading-none">Refer & Earn</p>
              <p className={cn(
                "text-[9px] mt-0.5 font-medium",
                config.sidebarTheme === 'gradient' ? "text-white/60" : "text-primary/60"
              )}>Get 25% Recurring</p>
            </div>
          )}
        </button>
      </div>

      {/* Bottom Section */}
      {bottomSection && (
        <div className="p-3 border-t border-border shrink-0">
          {bottomSection}
        </div>
      )}
    </aside>
  );
}

function SidebarItem({ item, isActive, collapsed }: { item: NavItem; isActive: boolean; collapsed: boolean }) {
  const { config } = useUI();
  const { prefix } = usePath();
  const [isOpen, setIsOpen] = useState(isActive);

  useEffect(() => {
    if (isActive) setIsOpen(true);
  }, [isActive]);

  if (item.sectionTitle && !collapsed) {
    return (
      <p className={cn(
        "px-3 mt-4 mb-2 text-[10px] font-bold uppercase tracking-widest",
        config.sidebarTheme === 'gradient' ? "text-white/40" : "text-muted-foreground/50"
      )}>
        {item.sectionTitle}
      </p>
    );
  }

  if (item.children && item.children.length > 0) {
    return (
      <div className="mb-0.5">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          variant={isActive ? 'primary' : 'ghost'}
          size="md"
          fullWidth
          leftIcon={item.icon}
          rightIcon={!collapsed ? ChevronDown : undefined}
          iconClassName={cn("transition-transform duration-200", isOpen && "rotate-180")}
          className={cn(
            "justify-start px-3 font-medium h-10",
            isActive 
              ? (config.sidebarTheme === 'gradient' ? "bg-white text-primary" : "bg-primary text-primary-foreground")
              : (config.sidebarTheme === 'gradient' ? "text-white/70 hover:text-white hover:bg-white/10" : "text-muted-foreground hover:text-foreground"),
            collapsed && "justify-center px-0"
          )}
        >
          {!collapsed && <span>{item.label}</span>}
        </Button>

        <AnimatePresence initial={false}>
          {isOpen && !collapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden pl-3 mt-0.5 space-y-0.5"
            >
              <div className="ml-4 pl-3 border-l border-border space-y-0.5 py-0.5">
                {item.children.map((child, idx) => (
                  <SidebarItem key={(child.label || 'sub') + idx} item={child} isActive={isActive} collapsed={false} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (item.divider) {
    return <div className="h-px bg-border my-2 mx-3" />;
  }

  return (
    <Link
      to={prefix(item.path || '#')}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all h-10",
        isActive 
          ? (config.sidebarTheme === 'gradient' 
              ? "bg-white text-primary shadow-lg shadow-black/10" 
              : "bg-primary text-primary-foreground shadow-sm shadow-primary/30")
          : (config.sidebarTheme === 'gradient'
              ? "text-white/70 hover:text-white hover:bg-white/10"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"),
        collapsed && "justify-center px-0"
      )}
    >
      {item.icon && <item.icon className="w-4 h-4 shrink-0" />}
      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
      {item.badge && !collapsed && (
        <span className={cn(
          "min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[9px] font-bold px-1",
          item.badgeVariant === 'danger' ? 'bg-rose-500 text-white'
            : item.badgeVariant === 'warning' ? 'bg-amber-500 text-white'
            : 'bg-primary/20 text-primary'
        )}>
          {item.badge}
        </span>
      )}
    </Link>
  );
}
