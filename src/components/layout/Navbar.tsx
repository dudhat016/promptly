import React from 'react';
import { Menu } from 'lucide-react';
import { cn } from '../../lib/utils';
import Button from '../primitives/Button';
import PageContainer from './PageContainer';
import { NavItem } from './types';

interface NavbarProps {
  navItems?: NavItem[];
  onMenuClick?: () => void;
  rightActions?: React.ReactNode;
  logo?: React.ReactNode;
  leftContent?: React.ReactNode;
}

export default function Navbar({ onMenuClick, rightActions, logo, leftContent }: NavbarProps) {
  return (
    <header className="h-16 shrink-0 flex items-center z-40 sticky top-0 w-full glass border-b border-border transition-all duration-300">
      <PageContainer className="px-4 md:px-6 flex items-center justify-between">
        {/* Left: Mobile Toggle / Logo / Breadcrumb */}
        <div className="flex items-center gap-3">
          <Button
            onClick={onMenuClick}
            variant="secondary"
            size="icon"
            className={cn("lg:hidden rounded bg-muted text-foreground hover:bg-border transition-colors h-9 w-9", !onMenuClick && "hidden")}
          >
            <Menu className="w-5 h-5" />
          </Button>

          {logo && (
            <div className="flex items-center gap-2.5">{logo}</div>
          )}

          {leftContent && (
            <div className="hidden md:block ml-2">
              {leftContent}
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {rightActions}
        </div>
      </PageContainer>
    </header>
  );
}
