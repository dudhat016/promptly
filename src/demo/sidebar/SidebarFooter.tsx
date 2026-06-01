import UpgradeCard from '../../components/layout/UpgradeCard';
import { UserCard } from './UserCard';
import { HelpWidget } from './HelpWidget';
import { cn } from '../../lib/utils';

interface SidebarFooterProps {
  collapsed?: boolean;
  isGradient?: boolean;
}

/**
 * Shared sidebar bottom section — rendered via bottomSection prop in every layout variant.
 * Add any new bottom widget here and it appears in all 12+ layouts automatically.
 */
export function SidebarFooter({ collapsed, isGradient }: SidebarFooterProps) {
  return (
    <div className="space-y-2">
      <UserCard collapsed={collapsed} isGradient={isGradient} />

      {!collapsed && (
        <div className={cn(
          'pt-2 border-t space-y-0.5',
          isGradient ? 'border-white/10' : 'border-border'
        )}>
          <HelpWidget isGradient={isGradient} />
        </div>
      )}

      <UpgradeCard collapsed={collapsed} />
    </div>
  );
}
