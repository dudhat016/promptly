import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, X, Zap, LogOut, Gift } from 'lucide-react';
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
  const collapsed = config.sidebarCollapsed && !isMobile;

  // Active check for top-level: parent items use startsWith, leaves use exact
  const checkActive = (path?: string, hasChildren?: boolean) => {
    if (!path) return false;
    const p = prefix(path);
    if (hasChildren) return location.pathname.startsWith(p);
    return location.pathname === p || location.pathname.startsWith(p + '/');
  };

  const isGradient = config.sidebarTheme === 'gradient';

  return (
    <aside
      style={{ width: isMobile ? '100%' : `${sidebarWidth}px` }}
      className={cn(
        "flex flex-col h-screen sticky top-0 border-r border-border transition-all duration-300 z-30",
        isGradient ? "gradient-cta border-primary/20" : "bg-sidebar",
        isMobile ? "w-full fixed inset-y-0 left-0" : "hidden lg:flex"
      )}
    >
      {/* Header / Logo */}
      <div className={cn(
        "h-16 flex items-center justify-between px-5 border-b shrink-0",
        isGradient ? "border-white/10" : "border-border"
      )}>
        <Link to={prefix('/')} className="flex items-center gap-2.5 group">
          {logo || (
            <>
              <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center shadow-sm shadow-primary/30 group-hover:scale-95 transition-transform">
                <Zap className="w-4 h-4 text-primary-foreground fill-primary-foreground" />
              </div>
              {(!collapsed || isMobile) && (
                <span className={cn(
                  "text-base font-bold tracking-tight font-display",
                  isGradient ? "text-white" : "text-foreground"
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
            isActive={checkActive(item.path, !!(item.children?.length))}
            collapsed={collapsed}
            depth={0}
          />
        ))}
      </nav>

      {/* Refer & Earn */}
      <div className="px-3 mb-2">
        <button
          onClick={() => setReferralModalOpen(true)}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group overflow-hidden relative",
            isGradient
              ? "bg-white/10 hover:bg-white/20 text-white border border-white/10"
              : "bg-primary/5 hover:bg-primary/10 text-primary border border-primary/10"
          )}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer" />
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
            isGradient ? "bg-white/10" : "bg-primary/10"
          )}>
            <Gift className="w-4 h-4" />
          </div>
          {(!collapsed || isMobile) && (
            <div className="text-left">
              <p className="text-[11px] font-bold uppercase tracking-widest leading-none">Refer & Earn</p>
              <p className={cn(
                "text-[9px] mt-0.5 font-medium",
                isGradient ? "text-white/60" : "text-primary/60"
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

// ─── SidebarItem ─────────────────────────────────────────────────────────────

interface SidebarItemProps {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
  depth?: number;
}

function SidebarItem({ item, isActive, collapsed, depth = 0 }: SidebarItemProps) {
  const { config } = useUI();
  const { prefix } = usePath();
  const location = useLocation();
  const isGradient = config.sidebarTheme === 'gradient';

  // Compute active for any path — exact+trailing-slash for leaves, startsWith for parents
  const checkActive = (path?: string, hasChildren = false) => {
    if (!path) return false;
    const p = prefix(path);
    if (hasChildren) return location.pathname.startsWith(p);
    return location.pathname === p || location.pathname.startsWith(p + '/');
  };

  const anyChildActive = item.children?.some(c => checkActive(c.path, !!(c.children?.length))) ?? false;

  const [isOpen, setIsOpen] = useState(isActive || anyChildActive);

  useEffect(() => {
    if (isActive || anyChildActive) setIsOpen(true);
  }, [isActive, anyChildActive]);

  // ── Section divider ──
  if (item.sectionTitle) {
    if (collapsed) return null;
    return (
      <p className={cn(
        "px-3 pt-5 pb-1 text-[10px] font-bold uppercase tracking-widest",
        isGradient ? "text-white/40" : "text-muted-foreground/50"
      )}>
        {item.sectionTitle}
      </p>
    );
  }

  // ── Horizontal divider ──
  if (item.divider) {
    return <div className="h-px bg-border my-2 mx-3" />;
  }

  // ── Expandable parent ──
  if (item.children && item.children.length > 0) {
    const parentActive = isActive || anyChildActive;

    return (
      <div>
        <button
          onClick={() => setIsOpen(o => !o)}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium h-10 transition-all",
            parentActive
              ? isGradient
                ? "bg-white/15 text-white"
                : "bg-primary/10 text-primary"
              : isGradient
                ? "text-white/70 hover:text-white hover:bg-white/10"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
            collapsed && "justify-center px-0"
          )}
        >
          {item.icon && (
            <item.icon className={cn(
              "w-4 h-4 shrink-0",
              collapsed && "w-5 h-5"
            )} />
          )}
          {!collapsed && (
            <>
              <span className="flex-1 text-left truncate">{item.label}</span>
              {item.badge && (
                <span className={cn(
                  "min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[9px] font-bold px-1 mr-1",
                  item.badgeVariant === 'danger' ? 'bg-rose-500 text-white'
                    : item.badgeVariant === 'warning' ? 'bg-amber-500 text-white'
                    : 'bg-primary/20 text-primary'
                )}>
                  {item.badge}
                </span>
              )}
              {/* Chevron — only this element rotates, not the left icon */}
              <ChevronRight className={cn(
                "w-3.5 h-3.5 shrink-0 opacity-50 transition-transform duration-200",
                isOpen && "rotate-90"
              )} />
            </>
          )}
        </button>

        <AnimatePresence initial={false}>
          {isOpen && !collapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className={cn(
                "ml-4 pl-3 mt-0.5 space-y-0.5 py-0.5",
                isGradient ? "border-l border-white/15" : "border-l border-border"
              )}>
                {item.children.map((child, idx) => (
                  <SidebarItem
                    key={(child.label || 'sub') + idx}
                    item={child}
                    isActive={checkActive(child.path, !!(child.children?.length))}
                    collapsed={false}
                    depth={depth + 1}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ── Leaf link ──
  // Children (depth > 0) use softer active style; top-level leaves use full primary
  const leafActiveClass = depth > 0
    ? isGradient
      ? "text-white font-semibold bg-white/10"
      : "text-primary font-semibold bg-primary/8"
    : isGradient
      ? "bg-white text-primary shadow-lg shadow-black/10"
      : "bg-primary text-primary-foreground shadow-sm shadow-primary/30";

  const leafInactiveClass = isGradient
    ? "text-white/70 hover:text-white hover:bg-white/10"
    : "text-muted-foreground hover:text-foreground hover:bg-muted/60";

  return (
    <Link
      to={prefix(item.path || '#')}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all h-9",
        isActive ? leafActiveClass : leafInactiveClass,
        collapsed && "justify-center px-0 h-10"
      )}
    >
      {item.icon && (
        <item.icon className={cn("w-4 h-4 shrink-0", collapsed && "w-5 h-5")} />
      )}
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {item.badge && (
            <span className={cn(
              "min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[9px] font-bold px-1",
              item.badgeVariant === 'danger' ? 'bg-rose-500 text-white'
                : item.badgeVariant === 'warning' ? 'bg-amber-500 text-white'
                : 'bg-primary/20 text-primary'
            )}>
              {item.badge}
            </span>
          )}
        </>
      )}
    </Link>
  );
}
