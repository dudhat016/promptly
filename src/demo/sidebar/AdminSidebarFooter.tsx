import { Settings, Shield } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { usePath } from '../../hooks/usePath';
import { cn } from '../../lib/utils';

interface AdminSidebarFooterProps {
  collapsed?: boolean;
  isGradient?: boolean;
}

export function AdminSidebarFooter({ collapsed, isGradient }: AdminSidebarFooterProps) {
  const { profile } = useAuth();
  const { prefix } = usePath();
  const navigate = useNavigate();

  const initials = (profile?.displayName?.charAt(0) || profile?.email?.charAt(0) || 'A').toUpperCase();
  const roleLabel = profile?.role === 'admin' ? 'Admin' : profile?.role === 'staff' ? 'Staff' : 'Admin';
  const isAdmin = profile?.role === 'admin';

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-2 py-1">
        <Link to={prefix('/admin/settings')} title={profile?.displayName || 'Admin'}>
          {profile?.photoURL ? (
            <img src={profile.photoURL} className="w-8 h-8 rounded-lg object-cover ring-2 ring-primary/30" alt="" />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
              {initials}
            </div>
          )}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Admin identity card */}
      <div className={cn('flex items-center gap-3 p-2.5 rounded-xl', isGradient ? 'bg-white/10' : 'bg-muted/50')}>
        {profile?.photoURL ? (
          <img src={profile.photoURL} className="w-9 h-9 rounded-lg object-cover shrink-0" alt="" />
        ) : (
          <div className="w-9 h-9 rounded-lg bg-primary/20 text-primary flex items-center justify-center text-sm font-bold shrink-0">
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className={cn('text-xs font-bold truncate', isGradient ? 'text-white' : 'text-foreground')}>
              {profile?.displayName || 'Admin'}
            </p>
            <span className={cn(
              'shrink-0 flex items-center gap-0.5 text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full leading-none',
              isAdmin
                ? 'bg-rose-500/15 text-rose-500'
                : isGradient ? 'bg-white/20 text-white' : 'bg-amber-500/15 text-amber-500'
            )}>
              <Shield className="w-2 h-2" />
              {roleLabel}
            </span>
          </div>
          <p className={cn('text-[10px] truncate mt-0.5', isGradient ? 'text-white/60' : 'text-muted-foreground')}>
            {profile?.email}
          </p>
        </div>
        <Link
          to={prefix('/admin/settings')}
          className={cn(
            'p-1.5 rounded-lg transition-colors shrink-0',
            isGradient
              ? 'text-white/50 hover:text-white hover:bg-white/10'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          )}
          title="Admin settings"
        >
          <Settings className="w-3.5 h-3.5" />
        </Link>
      </div>

    </div>
  );
}
