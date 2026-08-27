import { Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { usePath } from '../../hooks/usePath';
import { cn } from '../../lib/utils';

interface UserCardProps {
  collapsed?: boolean;
  isGradient?: boolean;
}

export function UserCard({ collapsed, isGradient }: UserCardProps) {
  const { profile, isPro } = useAuth();
  const { prefix } = usePath();

  const initials = (profile?.displayName?.charAt(0) || profile?.email?.charAt(0) || 'U').toUpperCase();

  if (collapsed) {
    return (
      <Link to={prefix('/settings/profile')} className="flex justify-center" title={profile?.displayName || 'Profile'}>
        {profile?.photoURL ? (
          <img src={profile.photoURL} className="w-8 h-8 rounded-full object-cover ring-2 ring-primary/30" alt="" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
            {initials}
          </div>
        )}
      </Link>
    );
  }

  return (
    <div className={cn('flex items-center gap-3 p-2.5 rounded-xl', isGradient ? 'bg-white/10' : 'bg-muted/50')}>
      {profile?.photoURL ? (
        <img src={profile.photoURL} className="w-8 h-8 rounded-full object-cover shrink-0" alt="" />
      ) : (
        <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">
          {initials}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className={cn('text-xs font-bold truncate', isGradient ? 'text-white' : 'text-foreground')}>
          {profile?.displayName || 'User'}
        </p>
        <p className={cn('text-[10px] truncate mt-0.5', isGradient ? 'text-white/60' : 'text-muted-foreground')}>
          {profile?.email}
        </p>
      </div>
      <Link
        to={prefix('/settings/profile')}
        className={cn(
          'p-1.5 rounded-lg transition-colors shrink-0',
          isGradient
            ? 'text-white/50 hover:text-white hover:bg-white/10'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
        )}
        title="Profile settings"
      >
        <Settings className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
