import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePath } from '../../hooks/usePath';
import { toast } from 'react-hot-toast';
import { Shield, ArrowLeft, Save, Eye, Plus, Pencil, Trash2 } from 'lucide-react';
import { AdminPageHeader } from '../../components/admin';
import Button from '../../components/primitives/Button';
import Input from '../../components/primitives/Input';
import Textarea from '../../components/primitives/Textarea';
import { cn } from '../../lib/utils';
import { AdminSection, SectionPermission, StaffRoleDefinition } from '../../types';
import { useStaffRoles } from '../../hooks/useStaffRoles';

// ─── Constants ────────────────────────────────────────────────────────────────

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
      { id: 'roles', label: 'Staff Roles' },
      { id: 'activity', label: 'Activity Log' },
      { id: 'settings', label: 'Settings' },
      { id: 'emails', label: 'Emails' },
      { id: 'reports', label: 'Reports' },
    ],
  },
];

const ROLE_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#3b82f6', '#ef4444', '#14b8a6',
];

const DEFAULT_PERMS: SectionPermission = {
  canView: true,
  canCreate: true,
  canEdit: true,
  canDelete: false,
};

const PERM_OPTIONS: { key: keyof SectionPermission; label: string; icon: React.ElementType; color: string }[] = [
  { key: 'canView',   label: 'View',   icon: Eye,    color: 'text-sky-500' },
  { key: 'canCreate', label: 'Create', icon: Plus,   color: 'text-emerald-500' },
  { key: 'canEdit',   label: 'Edit',   icon: Pencil, color: 'text-amber-500' },
  { key: 'canDelete', label: 'Delete', icon: Trash2, color: 'text-rose-500' },
];

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminRoleForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { prefix } = usePath();
  const { staffRoles, saveRoles, loading } = useStaffRoles();
  const isNew = !id || id === 'new';

  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(ROLE_COLORS[0]);
  const [sections, setSections] = useState<AdminSection[]>([]);
  const [sectionPermissions, setSectionPermissions] = useState<Partial<Record<AdminSection, SectionPermission>>>({});
  const [originalId, setOriginalId] = useState<string | null>(null);

  useEffect(() => {
    if (loading || isNew) return;
    const role = staffRoles.find(r => r.id === id);
    if (!role) {
      toast.error('Role not found');
      navigate(prefix('/admin/roles'));
      return;
    }
    setName(role.name);
    setDescription(role.description ?? '');
    setColor(role.color ?? ROLE_COLORS[0]);
    setSections(role.sections ?? []);
    setSectionPermissions(role.sectionPermissions ?? {});
    setOriginalId(role.id);
  }, [loading, id]);

  const toggleSection = (section: AdminSection) => {
    if (sections.includes(section)) {
      setSections(prev => prev.filter(s => s !== section));
      setSectionPermissions(prev => {
        const next = { ...prev };
        delete next[section];
        return next;
      });
    } else {
      setSections(prev => [...prev, section]);
      setSectionPermissions(prev => ({ ...prev, [section]: { ...DEFAULT_PERMS } }));
    }
  };

  const togglePerm = (section: AdminSection, key: keyof SectionPermission) => {
    setSectionPermissions(prev => {
      const current = prev[section] ?? { ...DEFAULT_PERMS };
      return { ...prev, [section]: { ...current, [key]: !current[key] } };
    });
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Role name is required');
      return;
    }

    setIsSaving(true);
    try {
      const newId = isNew ? slugify(name) : originalId!;

      if (isNew && staffRoles.some(r => r.id === newId)) {
        toast.error('A role with this name already exists');
        setIsSaving(false);
        return;
      }

      const newRole: StaffRoleDefinition = {
        id: newId,
        name: name.trim(),
        description: description.trim(),
        color,
        sections,
        sectionPermissions,
        createdAt: isNew ? new Date().toISOString() : staffRoles.find(r => r.id === newId)?.createdAt,
      };

      const updated = isNew
        ? [...staffRoles, newRole]
        : staffRoles.map(r => (r.id === newId ? newRole : r));

      await saveRoles(updated);
      toast.success(isNew ? 'Role created' : 'Role updated');
      navigate(prefix('/admin/roles'));
    } catch (err) {
      console.error(err);
      toast.error('Failed to save role');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isNew && loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  }

  const derivedId = isNew ? slugify(name) : originalId;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        label="Roles"
        labelIcon={Shield}
        title={isNew ? 'New Staff Role' : `Edit: ${name}`}
        subtitle="Define what sections this role can access and what actions they can perform."
        actions={
          <Button
            onClick={() => navigate(prefix('/admin/roles'))}
            variant="secondary"
            size="md"
            leftIcon={ArrowLeft}
            className="font-bold"
          >
            Back to Roles
          </Button>
        }
      />

      <div className="grid xl:grid-cols-3 gap-6 items-start">

        {/* ── Left: identity + color ─────────────────────────── */}
        <div className="xl:col-span-1 space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
            <h3 className="text-sm font-bold text-foreground">Role Identity</h3>

            <Input
              label="Role Name"
              placeholder="e.g. Content Creator"
              value={name}
              onChange={e => setName(e.target.value)}
            />

            <Textarea
              label="Description"
              placeholder="Brief description of what this role can do..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              variant="filled"
            />

            {name && (
              <div className="px-3 py-2 bg-muted/60 rounded-lg">
                <p className="text-[11px] text-muted-foreground mb-0.5">Role ID</p>
                <code className="text-xs font-mono font-bold text-foreground">{derivedId}</code>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Badge Color</p>
              <div className="flex flex-wrap gap-2.5">
                {ROLE_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={cn(
                      'w-8 h-8 rounded-full border-2 transition-all',
                      color === c ? 'border-foreground scale-110 shadow-md' : 'border-transparent hover:scale-105'
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>

              {/* Preview badge */}
              <div className="mt-4 flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
                  style={{ backgroundColor: color }}
                >
                  {name ? name.charAt(0).toUpperCase() : <Shield className="w-4 h-4" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{name || 'Role Name'}</p>
                  <p className="text-xs text-muted-foreground">{sections.length} section{sections.length !== 1 ? 's' : ''} enabled</p>
                </div>
              </div>
            </div>
          </div>

          {/* Save button (sticky on desktop) */}
          <div className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-3">
            <Button
              onClick={handleSave}
              isLoading={isSaving}
              variant="primary"
              size="lg"
              leftIcon={Save}
              fullWidth
              className="font-bold shadow-lg shadow-primary/20"
            >
              {isNew ? 'Create Role' : 'Save Changes'}
            </Button>
            <Button
              onClick={() => navigate(prefix('/admin/roles'))}
              variant="outline"
              size="md"
              fullWidth
            >
              Cancel
            </Button>
          </div>
        </div>

        {/* ── Right: section permissions ────────────────────── */}
        <div className="xl:col-span-2 bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Section Access & Permissions</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Enable a section, then fine-tune what the role can do inside it.</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Enabled
              <span className="w-2 h-2 rounded-full bg-muted-foreground/30 inline-block ml-2" /> Disabled
            </div>
          </div>

          <div className="divide-y divide-border">
            {SECTION_GROUPS.map(group => (
              <div key={group.title}>
                <div className="px-6 py-2.5 bg-muted/30">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">{group.title}</p>
                </div>
                <div className="divide-y divide-border/50">
                  {group.sections.map(sec => {
                    const enabled = sections.includes(sec.id);
                    const perms = sectionPermissions[sec.id] ?? { ...DEFAULT_PERMS };
                    return (
                      <div key={sec.id} className={cn(
                        'px-6 py-3.5 transition-colors',
                        enabled ? 'bg-background' : 'bg-muted/10'
                      )}>
                        <div className="flex items-center gap-4">
                          {/* Toggle */}
                          <button
                            type="button"
                            onClick={() => toggleSection(sec.id)}
                            className={cn(
                              'relative w-9 h-5 rounded-full transition-colors shrink-0 focus:outline-none',
                              enabled ? 'bg-primary' : 'bg-muted-foreground/25'
                            )}
                          >
                            <span className={cn(
                              'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform',
                              enabled ? 'translate-x-4' : 'translate-x-0'
                            )} />
                          </button>

                          {/* Section label */}
                          <span className={cn(
                            'text-sm font-semibold w-44 shrink-0 transition-colors',
                            enabled ? 'text-foreground' : 'text-muted-foreground/50'
                          )}>
                            {sec.label}
                          </span>

                          {/* Permission pills */}
                          {enabled ? (
                            <div className="flex items-center gap-2 flex-wrap">
                              {PERM_OPTIONS.map(({ key, label, icon: Icon, color: iconColor }) => {
                                const active = perms[key] ?? true;
                                return (
                                  <button
                                    key={key}
                                    type="button"
                                    onClick={() => togglePerm(sec.id, key)}
                                    className={cn(
                                      'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all',
                                      active
                                        ? 'bg-card border-border text-foreground shadow-sm'
                                        : 'bg-muted/30 border-dashed border-border/50 text-muted-foreground/50'
                                    )}
                                  >
                                    <Icon className={cn('w-3 h-3', active ? iconColor : 'text-muted-foreground/30')} />
                                    {label}
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground/40 italic">No access</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
