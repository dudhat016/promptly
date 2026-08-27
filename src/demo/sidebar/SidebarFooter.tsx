import { UserCard } from './UserCard';

interface SidebarFooterProps {
  collapsed?: boolean;
  isGradient?: boolean;
}

export function SidebarFooter({ collapsed, isGradient }: SidebarFooterProps) {
  return (
    <div>
      <UserCard collapsed={collapsed} isGradient={isGradient} />
    </div>
  );
}
