import { ChevronRight, Home } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const SEGMENT_LABELS: Record<string, string> = {
  admin: 'Admin',
  users: 'Users',
  prompts: 'Prompts',
  categories: 'Categories',
  templates: 'Templates',
  blog: 'Blog',
  seo: 'SEO Audit',
  models: 'AI Models',
  inquiries: 'Inquiries',
  tickets: 'Tickets',
  subscriptions: 'Plans',
  revenue: 'Financials',
  referrals: 'Affiliates',
  withdrawals: 'Withdrawals',
  emails: 'Email Logs',
  settings: 'Settings',
  permissions: 'Permissions',
  marketing: 'Marketing',
  contacts: 'Contacts',
  tags: 'Tags',
  segments: 'Segments',
  automations: 'Automations',
  new: 'New',
  edit: 'Edit',
};

export default function AdminBreadcrumb() {
  const { pathname } = useLocation();
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length <= 1) return null;

  const crumbs = segments.map((seg, i) => {
    const path = '/' + segments.slice(0, i + 1).join('/');
    const label = SEGMENT_LABELS[seg] ?? seg.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const isLast = i === segments.length - 1;
    return { path, label, isLast };
  });

  return (
    <nav className="flex items-center gap-1.5 text-xs font-medium">
      <Link to="/admin" className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
        <Home className="w-3.5 h-3.5" />
      </Link>
      {crumbs.map((crumb) => (
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
