import { collection, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { Mail, Plus, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import type { DataTableActions, DataTableColumn } from '../../components/admin';
import { AdminPageHeader, DataTable, useConfirm } from '../../components/admin';
import Badge from '../../components/primitives/Badge';
import Button from '../../components/primitives/Button';
import Card from '../../components/primitives/Card';
import { db } from '../../lib/firebase';
import { api } from '../../lib/api';
import { usePath } from '../../hooks/usePath';
import { EmailTemplate } from '../../types';

const GROUP_LABELS: Record<string, string> = {
  auth: 'Auth', onboarding: 'Onboarding', nudge: 'Nudge', newsletter: 'Newsletter',
};
const GROUP_VARIANT: Record<string, 'soft' | 'success' | 'warning' | 'error' | 'info'> = {
  auth: 'soft', onboarding: 'success', nudge: 'soft', newsletter: 'info',
};

export default function AdminTemplates() {
  const confirm = useConfirm();
  const { prefix } = usePath();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading]     = useState(true);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => { fetchTemplates(); }, []);

  async function fetchTemplates() {
    try {
      setLoading(true);
      const snap = await getDocs(collection(db, 'templates'));
      setTemplates(snap.docs.map(d => ({ id: d.id, ...d.data() } as EmailTemplate)));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  const handleDelete = async (t: EmailTemplate) => {
    const ok = await confirm({
      title: 'Delete template?',
      description: `"${t.name}" will be removed. The system will fall back to its built-in default.`,
      confirmLabel: 'Delete', destructive: true,
    });
    if (!ok) return;
    try {
      await deleteDoc(doc(db, 'templates', t.id));
      setTemplates(p => p.filter(x => x.id !== t.id));
      toast.success('Template deleted');
    } catch { toast.error('Delete failed'); }
  };

  const handleBulkDelete = async (rows: EmailTemplate[]) => {
    await Promise.all(rows.map(t => deleteDoc(doc(db, 'templates', t.id))));
    setTemplates(p => p.filter(x => !rows.some(r => r.id === x.id)));
    toast.success(`${rows.length} template${rows.length > 1 ? 's' : ''} deleted`);
  };



  const handleSeedTemplates = async () => {
    setSeeding(true);
    try {
      const r: any = await api.post('/email/seed-templates', {});
      if (r.error || r.success === false) {
        toast.error(r.error || 'Seed failed');
        return;
      }
      toast.success(`Seeded ${r.seeded} new templates (${r.skipped} already existed)`);
      if (r.seeded > 0) fetchTemplates();
    } catch { toast.error('Seed failed'); }
    finally { setSeeding(false); }
  };


  // Stats by group
  const groupCounts = useMemo(() => {
    const m: Record<string, number> = {};
    templates.forEach(t => {
      const g = (t as any).group || 'unknown';
      m[g] = (m[g] || 0) + 1;
    });
    return m;
  }, [templates]);

  const columns: DataTableColumn<EmailTemplate>[] = [
    {
      key: 'name',
      header: 'Template Name',
      searchValue: t => t.name,
      sortable: true,
      sortValue: t => t.name,
      render: t => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary/8 text-primary rounded-lg flex items-center justify-center shrink-0">
            <Mail className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-foreground truncate">{t.name}</p>
            <p className="text-[11px] text-muted-foreground/70 font-mono truncate">{t.id}</p>
          </div>
        </div>
      ),
      csvValue: t => t.name,
    },
    {
      key: 'group',
      header: 'Group',
      searchValue: t => (t as any).group || '',
      sortable: true,
      sortValue: t => (t as any).group || '',
      render: t => {
        const g = (t as any).group as string | undefined;
        return g ? (
          <Badge variant={GROUP_VARIANT[g] ?? 'soft'} size="sm">
            {GROUP_LABELS[g] || g}
          </Badge>
        ) : <span className="text-muted-foreground/40 text-xs">—</span>;
      },
      csvValue: t => (t as any).group || '',
    },
    {
      key: 'subject',
      header: 'Subject Line',
      searchValue: t => t.subject ?? '',
      sortable: true,
      sortValue: t => t.subject ?? '',
      render: t => (
        <p className="text-sm text-muted-foreground font-medium truncate max-w-xs" title={t.subject}>
          {t.subject || <span className="italic opacity-40">No subject</span>}
        </p>
      ),
      csvValue: t => t.subject ?? '',
    },
    {
      key: 'variables',
      header: 'Variables',
      render: t => {
        const vars: string[] = (t as any).variables || [];
        if (!vars.length) return <span className="text-muted-foreground/40 text-xs">—</span>;
        return (
          <div className="flex items-center gap-1 flex-wrap">
            {vars.slice(0, 3).map(v => (
              <code key={v} className="text-[10px] font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                {`{{${v}}}`}
              </code>
            ))}
            {vars.length > 3 && (
              <span className="text-[10px] text-muted-foreground">+{vars.length - 3}</span>
            )}
          </div>
        );
      },
      csvValue: t => ((t as any).variables || []).join(', '),
    },
  ];

  const actions: DataTableActions<EmailTemplate> = {
    edit: t => prefix(`/admin/emails/templates/${t.id}/edit`),
    onDelete: handleDelete,
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        label="Content"
        labelIcon={Mail}
        title="Email Templates"
        subtitle="Customize transactional and marketing emails. Saved templates override system defaults."
        actions={
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSeedTemplates}
              isLoading={seeding}
              variant="secondary"
              size="md"
              leftIcon={Sparkles}
              className="font-bold"
            >
              Seed Defaults
            </Button>
            <Button
              as={Link}
              to={prefix('/admin/emails/templates/new')}
              variant="primary"
              size="md"
              leftIcon={Plus}
              className="font-bold shadow-sm shadow-primary/20"
            >
              New Template
            </Button>
          </div>
        }
      />

      {/* Group stats bar */}
      {templates.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {Object.entries(GROUP_LABELS).map(([key, label]) => {
            const count = groupCounts[key] || 0;
            return (
              <Card
                key={key}
                padding="none"
                className="px-3 py-2.5 flex-row items-center justify-between gap-2 hover:border-primary/30"
              >
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground truncate">{label}</p>
                  <p className="text-lg font-black text-foreground leading-none mt-0.5">{count}</p>
                </div>
                {count > 0 && (
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    GROUP_VARIANT[key] === 'error'   ? 'bg-destructive' :
                    GROUP_VARIANT[key] === 'success' ? 'bg-emerald-500' :
                    GROUP_VARIANT[key] === 'warning' ? 'bg-amber-500'   :
                    GROUP_VARIANT[key] === 'info'    ? 'bg-blue-500'    :
                    'bg-primary'
                  }`} />
                )}
              </Card>
            );
          })}
        </div>
      )}

      <DataTable
        columns={columns}
        data={templates}
        rowKey={t => t.id}
        loading={loading}
        actions={actions}
        searchPlaceholder="Search templates…"
        selectable
        onBulkDelete={handleBulkDelete}
        exportFilename="email-templates"
        emptyIcon={Mail}
        emptyTitle="No templates yet"
        emptyMessage="Click 'New Template' to create your first email template."
      />
    </div>
  );
}
