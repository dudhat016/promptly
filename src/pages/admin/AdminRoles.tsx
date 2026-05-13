import { useState } from 'react';
import { Plus, Edit3, Trash2, Shield, Save, X, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import { AdminPageHeader, useConfirm } from '../../components/admin';
import Button from '../../components/primitives/Button';
import Input from '../../components/primitives/Input';
import Textarea from '../../components/primitives/Textarea';
import { cn } from '../../lib/utils';
import { AdminSection, StaffRoleDefinition } from '../../types';
import { useStaffRoles } from '../../hooks/useStaffRoles';

const SECTION_GROUPS: { title: string; sections: { id: AdminSection; label: string }[] }[] = [
  {
    title: 'Overview',
    sections: [
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'users', label: 'Users' },
    ],
  },
  {
    title: 'Content',
    sections: [
      { id: 'prompts', label: 'Prompts' },
      { id: 'categories', label: 'Categories' },
      { id: 'templates', label: 'Templates' },
      { id: 'media', label: 'Media Manager' },
      { id: 'blog', label: 'Blog' },
      { id: 'seo', label: 'SEO Audit' },
      { id: 'ai_models', label: 'AI Models' },
    ],
  },
  {
    title: 'Support',
    sections: [
      { id: 'inquiries', label: 'Inquiries' },
      { id: 'tickets', label: 'Tickets' },
    ],
  },
  {
    title: 'Revenue',
    sections: [
      { id: 'subscriptions', label: 'Plans / Subscriptions' },
      { id: 'revenue', label: 'Financials & Invoices' },
      { id: 'affiliates', label: 'Affiliates' },
      { id: 'withdrawals', label: 'Withdrawals' },
    ],
  },
  {
    title: 'Marketing',
    sections: [{ id: 'marketing', label: 'CRM & Campaigns' }],
  },
  {
    title: 'System',
    sections: [
      { id: 'permissions', label: 'Subscription Permissions' },
      { id: 'activity', label: 'Activity Log' },
      { id: 'settings', label: 'Settings' },
      { id: 'emails', label: 'Emails' },
    ],
  },
];

const ROLE_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#3b82f6', '#ef4444', '#14b8a6',
];

const EMPTY_ROLE: Omit<StaffRoleDefinition, 'id' | 'createdAt'> = {
  name: '',
  description: '',
  color: ROLE_COLORS[0],
  sections: [],
};

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

export default function AdminRoles() {
  const confirm = useConfirm();
  const { staffRoles, saveRoles, loading } = useStaffRoles();
  const [isSaving, setIsSaving] = useState(false);
  const [editingRole, setEditingRole] = useState<(Partial<StaffRoleDefinition> & { isNew?: boolean }) | null>(null);

  const openCreate = () => {
    setEditingRole({ ...EMPTY_ROLE, isNew: true });
  };

  const openEdit = (role: StaffRoleDefinition) => {
    setEditingRole({ ...role });
  };

  const closeEditor = () => setEditingRole(null);

  const toggleSection = (section: AdminSection) => {
    if (!editingRole) return;
    const sections = editingRole.sections ?? [];
    setEditingRole({
      ...editingRole,
      sections: sections.includes(section)
        ? sections.filter(s => s !== section)
        : [...sections, section],
    });
  };

  const handleSave = async () => {
    if (!editingRole) return;
    if (!editingRole.name?.trim()) {
      toast.error('Role name is required');
      return;
    }

    setIsSaving(true);
    try {
      const isNew = editingRole.isNew;
      const id = isNew ? slugify(editingRole.name!) : editingRole.id!;

      if (isNew && staffRoles.some(r => r.id === id)) {
        toast.error('A role with this name already exists');
        setIsSaving(false);
        return;
      }

      const newRole: StaffRoleDefinition = {
        id,
        name: editingRole.name!,
        description: editingRole.description ?? '',
        color: editingRole.color ?? ROLE_COLORS[0],
        sections: editingRole.sections ?? [],
        createdAt: isNew ? new Date().toISOString() : editingRole.createdAt,
      };

      const updated = isNew
        ? [...staffRoles, newRole]
        : staffRoles.map(r => (r.id === id ? newRole : r));

      await saveRoles(updated);
      toast.success(isNew ? 'Role created' : 'Role updated');
      closeEditor();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save role');
    } finally {
      setIsSaving(false);
    }
  };

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
    } catch (err) {
      toast.error('Failed to delete role');
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Staff Roles"
        subtitle="Create roles and assign admin panel section access. Set a user's role to 'staff' and assign a staff role to grant scoped access."
        actions={
          <Button onClick={openCreate} leftIcon={Plus} size="sm">
            New Role
          </Button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : staffRoles.length === 0 ? (
        <div className="border border-dashed border-border rounded-2xl p-12 text-center">
          <Shield className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No staff roles yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1 mb-4">Create roles to delegate scoped admin access to team members.</p>
          <Button onClick={openCreate} leftIcon={Plus} size="sm" variant="outline">
            Create First Role
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {staffRoles.map(role => (
            <motion.div
              key={role.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-4"
            >
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

              <div className="flex flex-wrap gap-1.5">
                {role.sections.length === 0 ? (
                  <span className="text-xs text-muted-foreground/50 italic">No sections assigned</span>
                ) : (
                  role.sections.slice(0, 6).map(s => (
                    <span
                      key={s}
                      className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize"
                    >
                      {s.replace(/_/g, ' ')}
                    </span>
                  ))
                )}
                {role.sections.length > 6 && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    +{role.sections.length - 6} more
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 pt-1 border-t border-border">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="w-3.5 h-3.5" />
                  <span className="font-mono text-[10px]">{role.id}</span>
                </div>
                <div className="ml-auto flex gap-2">
                  <Button size="sm" variant="ghost" leftIcon={Edit3} onClick={() => openEdit(role)}>Edit</Button>
                  <Button size="sm" variant="ghost" leftIcon={Trash2} onClick={() => handleDelete(role)} className="text-destructive hover:text-destructive hover:bg-destructive/10">Delete</Button>
                </div>
              </div>
            </motion.div>
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

      {/* Editor Drawer / Modal */}
      <AnimatePresence>
        {editingRole && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              onClick={closeEditor}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed inset-y-0 right-0 w-full max-w-lg bg-background border-l border-border z-50 flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                    style={{ backgroundColor: editingRole.color ?? ROLE_COLORS[0] }}
                  >
                    <Shield className="w-4 h-4" />
                  </div>
                  <h2 className="text-sm font-semibold">
                    {editingRole.isNew ? 'New Staff Role' : `Edit: ${editingRole.name}`}
                  </h2>
                </div>
                <button onClick={closeEditor} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                {/* Basic info */}
                <div className="space-y-4">
                  <Input
                    label="Role Name"
                    placeholder="e.g. Content Creator"
                    value={editingRole.name ?? ''}
                    onChange={e => setEditingRole({ ...editingRole, name: e.target.value })}
                  />
                  <Textarea
                    label="Description"
                    placeholder="Brief description of what this role can do..."
                    value={editingRole.description ?? ''}
                    onChange={e => setEditingRole({ ...editingRole, description: e.target.value })}
                    rows={2}
                  />
                  {editingRole.isNew && editingRole.name && (
                    <p className="text-xs text-muted-foreground">
                      Role ID: <code className="bg-muted px-1.5 py-0.5 rounded text-foreground">{slugify(editingRole.name)}</code>
                    </p>
                  )}
                </div>

                {/* Color picker */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Color</p>
                  <div className="flex gap-2 flex-wrap">
                    {ROLE_COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => setEditingRole({ ...editingRole, color: c })}
                        className={cn(
                          'w-7 h-7 rounded-full border-2 transition-all',
                          editingRole.color === c ? 'border-foreground scale-110' : 'border-transparent'
                        )}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                {/* Section access checkboxes */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Admin Section Access</p>
                  <div className="space-y-5">
                    {SECTION_GROUPS.map(group => (
                      <div key={group.title}>
                        <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-2">{group.title}</p>
                        <div className="grid grid-cols-2 gap-1.5">
                          {group.sections.map(sec => {
                            const checked = (editingRole.sections ?? []).includes(sec.id);
                            return (
                              <button
                                key={sec.id}
                                onClick={() => toggleSection(sec.id)}
                                className={cn(
                                  'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all text-left',
                                  checked
                                    ? 'bg-primary/10 border-primary/40 text-primary'
                                    : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted/60'
                                )}
                              >
                                <div className={cn(
                                  'w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0',
                                  checked ? 'bg-primary border-primary' : 'border-muted-foreground/40'
                                )}>
                                  {checked && (
                                    <svg className="w-2.5 h-2.5 text-primary-foreground" viewBox="0 0 12 12" fill="none">
                                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  )}
                                </div>
                                {sec.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-border shrink-0 flex gap-3">
                <Button variant="outline" onClick={closeEditor} className="flex-1">Cancel</Button>
                <Button onClick={handleSave} isLoading={isSaving} leftIcon={Save} className="flex-1">
                  {editingRole.isNew ? 'Create Role' : 'Save Changes'}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
