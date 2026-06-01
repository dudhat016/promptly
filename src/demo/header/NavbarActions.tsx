import { Coins, HelpCircle, MoreHorizontal, Search } from 'lucide-react';
import { useState } from 'react';
import { ThemeToggle } from '../../components/ThemeToggle';
import NotificationBell from '../../components/notifications/NotificationBell';
import UserDropdown from '../../components/layout/UserDropdown';
import LanguageSwitcher from '../../components/navigation/LanguageSwitcher';
import { AppsDropdown } from './AppsDropdown';
import { QuickActionsDropdown } from './QuickActionsDropdown';
import { MobileActionsSheet } from './MobileActionsSheet';

interface NavbarActionsProps {
  isAdmin?: boolean;
  isPro?: boolean;
  credits?: number;
  onTourOpen?: () => void;
  onSearchOpen?: () => void;
}

export function NavbarActions({
  isAdmin,
  isPro,
  credits = 0,
  onTourOpen,
  onSearchOpen,
}: NavbarActionsProps) {
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  return (
    <>
      {/* Mobile: "More" button */}
      <button
        onClick={() => setMobileSheetOpen(true)}
        className="sm:hidden w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        title="More"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {/* Desktop: Global search bar */}
      <button
        onClick={onSearchOpen}
        className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-muted hover:bg-border rounded-lg border border-border text-xs text-muted-foreground font-medium transition-colors mr-1"
        title="Search (Ctrl+K)"
      >
        <Search className="w-3.5 h-3.5" />
        <span>Search</span>
        <kbd className="ml-1 px-1 py-0.5 rounded bg-background border border-border text-[9px] font-bold">⌘K</kbd>
      </button>

      {/* Apps launcher */}
      <AppsDropdown />

      {/* Quick actions */}
      <QuickActionsDropdown />

      {/* Credits badge */}
      <div
        data-tour="credits"
        className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-primary/8 text-primary rounded border border-primary/12 text-xs font-semibold mr-1"
      >
        <Coins className="w-3.5 h-3.5" />
        <span>{isPro ? '∞' : credits}</span>
      </div>

      {/* Help / guided tour */}
      <button
        onClick={onTourOpen}
        className="hidden sm:flex w-8 h-8 rounded-lg items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        title="Help tour"
      >
        <HelpCircle className="w-4 h-4" />
      </button>

      {/* Notifications */}
      <NotificationBell />

      {/* Language selector */}
      <LanguageSwitcher className="hidden md:block" />

      {/* Theme toggle */}
      <ThemeToggle />

      {/* User menu */}
      <div data-tour="profile">
        <UserDropdown isAdmin={isAdmin} />
      </div>

      {/* Mobile bottom sheet */}
      <MobileActionsSheet
        open={mobileSheetOpen}
        onClose={() => setMobileSheetOpen(false)}
        onSearchOpen={onSearchOpen ?? (() => {})}
        isPro={isPro}
        credits={credits}
      />
    </>
  );
}
