import { ChevronRight, Home } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { usePath } from '../../hooks/usePath';

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: 'Home',
  vault: 'My Vault',
  library: 'My Creations',
  'twin-studio': 'AI Twin Studio',
  'ai-twin': 'AI Twin Studio',
  favorites: 'Favorites',
  saved: 'Unlock Queue',
  collections: 'Collections',
  credits: 'Credits',
  usage: 'Usage',
  affiliate: 'Partner Program',
  notifications: 'Notifications',
  support: 'Support',
  settings: 'Settings',
  profile: 'Profile',
  ai: 'AI Integration',
  billing: 'Billing',
  security: 'Security',
  explore: 'Explore',
  blog: 'Blog',
  docs: 'Docs',
  new: 'New',
  edit: 'Edit',
};

export function UserBreadcrumb() {
  const { pathname } = useLocation();
  const { prefix } = usePath();

  const segments = pathname.split('/').filter(Boolean);
  if (segments.length <= 1) return null;

  const crumbs: { path: string; label: string; isLast: boolean }[] = [];
  let cumulativePath = '';

  segments.forEach((seg, i) => {
    cumulativePath += `/${seg}`;
    // skip locale prefix (e.g. /en)
    if (i === 0 && seg.length === 2) return;
    crumbs.push({
      path: cumulativePath,
      label: SEGMENT_LABELS[seg] ?? seg.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      isLast: false,
    });
  });

  if (crumbs.length > 0) crumbs[crumbs.length - 1].isLast = true;
  if (crumbs.length <= 1) return null;

  return (
    <nav className="hidden md:flex items-center gap-1.5 text-xs font-medium">
      <Link to={prefix('/dashboard')} className="flex items-center text-muted-foreground hover:text-foreground transition-colors">
        <Home className="w-3.5 h-3.5" />
      </Link>
      {crumbs.map(crumb => (
        <span key={crumb.path} className="flex items-center gap-1.5">
          <ChevronRight className="w-3 h-3 text-muted-foreground/40" />
          {crumb.isLast ? (
            <span className="text-foreground font-semibold">{crumb.label}</span>
          ) : (
            <Link to={crumb.path} className="text-muted-foreground hover:text-foreground transition-colors">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
