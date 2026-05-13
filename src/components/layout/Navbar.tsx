import React from 'react';
import { Menu, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { usePath } from '../../hooks/usePath';
import { useUI } from '../../contexts/UIProvider';
import Button from '../primitives/Button';
import HorizontalMenu from './HorizontalMenu';
import PageContainer from './PageContainer';
import { NavItem } from './types';

interface NavbarProps {
  navItems: NavItem[];
  onMenuClick?: () => void;
  rightActions?: React.ReactNode;
  logo?: React.ReactNode;
  leftContent?: React.ReactNode;
}

export default function Navbar({ navItems, onMenuClick, rightActions, logo, leftContent }: NavbarProps) {
  const { config } = useUI();
  const { prefix } = usePath();
  const isHorizontal = config.orientation === 'horizontal';

  return (
    <header className={cn(
      "h-16 shrink-0 flex items-center z-40 transition-all duration-300",
      (config.navbarStyle === 'fixed' || config.navbarStyle === 'floating') ? "sticky top-0" : "static",
      config.navbarStyle === 'floating' 
        ? "m-4 rounded-2xl glass border border-border shadow-xl w-[calc(100%-2rem)]" 
        : "w-full glass border-b border-border"
    )}>
      <PageContainer className="px-4 md:px-6 flex items-center justify-between">
        {/* Left: Mobile Toggle / Logo */}
        <div className="flex items-center gap-3">
          {/* Mobile Toggle */}
          <Button
            onClick={onMenuClick}
            variant="secondary"
            size="icon"
            className="lg:hidden rounded bg-muted text-foreground hover:bg-border transition-colors h-9 w-9"
          >
            <Menu className="w-5 h-5" />
          </Button>

          {/* Logo (Visible in horizontal or mobile) */}
          {(isHorizontal || !onMenuClick) && (
            <Link to={prefix('/')} className="flex items-center gap-2.5 group">
              {logo || (
                <>
                  <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center shadow-sm shadow-primary/30">
                    <Zap className="w-4 h-4 text-primary-foreground fill-primary-foreground" />
                  </div>
                  <span className="text-base font-bold tracking-tight font-display">promptly</span>
                </>
              )}
            </Link>
          )}

          {/* Left Content (e.g. Breadcrumbs) */}
          {leftContent && (
            <div className="hidden md:block ml-2">
              {leftContent}
            </div>
          )}
        </div>

        {/* Center: Horizontal Menu */}
        {isHorizontal && (
          <div className="hidden lg:flex flex-1 mx-8 max-w-4xl min-w-0">
            <HorizontalMenu items={navItems} />
          </div>
        )}

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {rightActions}
        </div>
      </PageContainer>
    </header>
  );
}
