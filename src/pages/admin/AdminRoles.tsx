import { motion } from 'motion/react';
import { Plus, Edit3, Trash2, Shield, Users, Eye, Pencil } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { usePath } from '../../hooks/usePath';
import { AdminPageHeader, useConfirm } from '../../components/admin';
import Button from '../../components/primitives/Button';
import Card from '../../components/primitives/Card';
import Spinner from '../../components/feedback/Spinner';
import { AdminSection, SectionPermission, StaffRoleDefinition } from '../../types';
import { useStaffRoles } from '../../hooks/useStaffRoles';

const SECTION_LABELS: Partial<Record<AdminSection, string>> = {
  dashboard: 'Dashboard', users: 'Users', prompts: 'Prompts', categories: 'Categories',
  templates: 'Templates', media: 'Media', blog: 'Blog', seo: 'SEO', ai_models: 'AI Models',
  inquiries: 'Inquiries', tickets: 'Tickets', subscriptions: 'Plans', revenue: 'Revenue',
  affiliates: 'Affiliates', withdrawals: 'Withdrawals', marketing: 'CRM', permissions: 'Permissions',
  roles: 'Roles', activity: 'Activity', settings: 'Settings', emails: 'Emails', reports: 'Reports',
};

const PERM_ICONS: { key: keyof SectionPermission; icon: React.ElementType; color: string; title: string }[] = [
  { key: 'canView',   icon: Eye,    color: 'text-sky-500',     title: 'View' },
  { key: 'canCreate', icon: Plus,   color: 'text-emerald-500', title: 'Create' },
  { key: 'canEdit',   icon: Pencil, color: 'text-amber-500',   title: 'Edit' },
  { key: 'canDelete', icon: Trash2, color: 'text-rose-500',    title: 'Delete' },
];

export default function AdminRoles() {
  const confirm = useConfirm();
  const navigate = useNavigate();
  const { prefix } = usePath();
  const { staffRoles, saveRoles, loading } = useStaffRoles();

  const handleDelete = async (role: StaffRoleDefinition) => {
    const ok = await confirm({
      title: `Delete "${role.name}"?`,
      description: 'Users assigned this role will lose admin access. This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    try {
      await saveRoles(staffRoles.filter(r => r.id !== role.id));
      toast.success('Role deleted');
    } catch {
      toast.error('Failed to delete role');
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Staff Roles"
        subtitle="Create roles and assign admin panel section access with granular permissions per section."
        actions={
          <Button onClick={() => navigate(prefix('/admin/roles/new'))} leftIcon={Plus} size="sm">
            New Role
          </Button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Spinner size="sm" />
        </div>
      ) : staffRoles.length === 0 ? (
        <div className="border border-dashed border-border rounded-2xl p-12 text-center">
          <Shield className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No staff roles yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1 mb-4">Create roles to delegate scoped admin access to team members.</p>
          <Button onClick={() => navigate(prefix('/admin/roles/new'))} leftIcon={Plus} size="sm" variant="outline">
            Create First Role
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {staffRoles.map(role => (
            <Card
              key={role.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="!rounded-2xl p-5 gap-4"
            >
              {/* Header */}
              <div className="flex items-start gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white text-sm font-bold"
                  style={{ backgroundColor: role.color }}
                >
                  {role.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{role.name}</p>
                  <p className="text-xs text-muted-foreground/70 mt-0.5 line-clamp-2">{role.description || 'No description'}</p>
                </div>
              </div>

              {/* Section tags with permission summary */}
              <div className="flex flex-col gap-1.5">
                {role.sections.length === 0 ? (
                  <span className="text-xs text-muted-foreground/50 italic">No sections assigned</span>
                ) : (
                  role.sections.slice(0, 5).map(s => {
                    const perms = role.sectionPermissions?.[s];
                    return (
                      <div key={s} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-muted/40 border border-border/50">
                        <span className="text-[11px] font-semibold text-foreground capitalize">
                          {SECTION_LABELS[s] ?? s.replace(/_/g, ' ')}
                        </span>
                        <div className="flex items-center gap-1">
                          {PERM_ICONS.map(({ key, icon: Icon, color, title }) => {
                            const active = perms ? perms[key] : true;
                            return (
                              <div key={key} title={active ? title : `No ${title.toLowerCase()}`}>
                                <Icon className={`w-3 h-3 ${active ? color : 'text-muted-foreground/20'}`} />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
                {role.sections.length > 5 && (
                  <span className="text-[10px] font-medium px-2 py-0.5 text-muted-foreground">
                    +{role.sections.length - 5} more sections
                  </span>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center gap-2 pt-1 border-t border-border">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="w-3.5 h-3.5" />
                  <span className="font-mono text-[10px]">{role.id}</span>
                </div>
                <div className="ml-auto flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    leftIcon={Edit3}
                    onClick={() => navigate(prefix(`/admin/roles/${role.id}`))}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    leftIcon={Trash2}
                    onClick={() => handleDelete(role)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Usage instructions */}
      <div className="bg-muted/40 border border-border rounded-2xl p-5 text-sm text-muted-foreground space-y-2">
        <p className="font-semibold text-foreground text-xs uppercase tracking-wider">How to assign a staff role</p>
        <ol className="list-decimal list-inside space-y-1 text-xs">
          <li>Go to <strong>Users</strong> and open the user's profile.</li>
          <li>Set their <strong>role</strong> to <code className="bg-muted px-1 rounded text-foreground">staff</code>.</li>
          <li>Set their <strong>staffRole</strong> to the role ID shown on the card above (e.g. <code className="bg-muted px-1 rounded text-foreground">content_creator</code>).</li>
          <li>The user can now log in and will only see the sections you assigned.</li>
        </ol>
      </div>
    </div>
  );
}
