import { collection, deleteDoc, doc, getDocs, orderBy, query, updateDoc } from 'firebase/firestore';
import { Medal, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import type { DataTableActions, DataTableColumn } from '../../components/admin';
import { AdminPageHeader, DataTable, useConfirm } from '../../components/admin';
import Badge from '../../components/primitives/Badge';
import Button from '../../components/primitives/Button';
import { db } from '../../lib/firebase';
import { BADGE_ICON_MAP, BADGE_COLOR_PRESETS } from '../../lib/badges';
import { usePath } from '../../hooks/usePath';
import { BadgeDefinition } from '../../types';
import { cn } from '../../lib/utils';

const CONDITION_LABELS: Record<BadgeDefinition['conditionType'], string> = {
  unlocks:          'Unlocks ≥ N',
  power_unlocks:    'Unlocks ≥ N',
  prompts:          'Prompts ≥ N',
  views:            'Views ≥ N',
  following:        'Following ≥ N',
  streak:           'Streak ≥ N days',
  referrals:        'Referrals ≥ N',
  subscription_pro: 'Has Pro',
  early_adopter:    'Joined before date',
  manual:           'Manual only',
};

export default function AdminBadges() {
  const confirm = useConfirm();
  const { prefix } = usePath();
  const [badges, setBadges] = useState<BadgeDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'badges'), orderBy('order', 'asc')));
      setBadges(snap.docs.map(d => ({ id: d.id, ...d.data() } as BadgeDefinition)));
    } catch {
      toast.error('Failed to load badges');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const handleDelete = async (badge: BadgeDefinition) => {
    const ok = await confirm({
      title: `Delete "${badge.name}"?`,
      description: 'Existing user badges are kept. This only removes the definition.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok || !badge.id) return;
    try {
      await deleteDoc(doc(db, 'badges', badge.id));
      setBadges(prev => prev.filter(b => b.id !== badge.id));
      toast.success('Badge deleted');
    } catch {
      toast.error('Failed to delete badge');
    }
  };

  const handleToggleActive = async (badge: BadgeDefinition) => {
    if (!badge.id) return;
    try {
      await updateDoc(doc(db, 'badges', badge.id), { isActive: !badge.isActive });
      setBadges(prev => prev.map(b => b.id === badge.id ? { ...b, isActive: !b.isActive } : b));
      toast.success(badge.isActive ? 'Badge deactivated' : 'Badge activated');
    } catch {
      toast.error('Failed to update badge');
    }
  };

  const columns: DataTableColumn<BadgeDefinition>[] = [
    {
      key: 'name',
      header: 'Badge',
      searchValue: b => `${b.name} ${b.description}`,
      sortable: true,
      sortValue: b => b.name,
      render: b => {
        const Icon = BADGE_ICON_MAP[b.iconName] ?? BADGE_ICON_MAP['Star'];
        return (
          <div className="flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-full flex items-center justify-center border flex-shrink-0', b.colorClass)}>
              <Icon className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-foreground truncate">{b.name}</p>
              <p className="text-xs text-muted-foreground truncate">{b.description}</p>
            </div>
          </div>
        );
      },
      csvValue: b => b.name,
    },
    {
      key: 'condition',
      header: 'Condition',
      searchValue: b => b.conditionType,
      sortable: true,
      sortValue: b => b.conditionType,
      render: b => (
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-muted-foreground">{CONDITION_LABELS[b.conditionType]}</span>
          {b.conditionType !== 'subscription_pro' && b.conditionType !== 'manual' && (
            <span className="font-bold text-primary bg-primary/8 px-1.5 py-0.5 rounded-md">{b.conditionThreshold}</span>
          )}
        </div>
      ),
      csvValue: b => `${b.conditionType}:${b.conditionThreshold}`,
    },
    {
      key: 'color',
      header: 'Theme',
      render: b => {
        const preset = BADGE_COLOR_PRESETS.find(p => p.value === b.colorClass);
        return (
          <div className="flex items-center gap-1.5">
            <span className={cn('w-3 h-3 rounded-full flex-shrink-0', preset?.preview ?? 'bg-muted')} />
            <span className="text-xs text-muted-foreground">{preset?.label ?? '—'}</span>
          </div>
        );
      },
      csvValue: b => b.colorClass,
    },
    {
      key: 'order',
      header: 'Order',
      sortable: true,
      sortValue: b => b.order,
      render: b => <span className="text-xs font-mono text-muted-foreground">{b.order}</span>,
      csvValue: b => String(b.order),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      sortValue: b => (b.isActive ? 0 : 1),
      render: b => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleToggleActive(b)}
          title={b.isActive ? 'Click to deactivate' : 'Click to activate'}
          className="p-0 h-auto"
        >
          <Badge variant={b.isActive ? 'success' : 'soft'} size="sm">
            {b.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </Button>
      ),
      csvValue: b => (b.isActive ? 'active' : 'inactive'),
    },
  ];

  const actions: DataTableActions<BadgeDefinition> = {
    edit: b => prefix(`/admin/badges/${b.id}/edit`),
    onDelete: handleDelete,
  };

  return (
    <div className="space-y-8">
      <AdminPageHeader
        label="Marketplace"
        labelIcon={Medal}
        title="Badges & Achievements"
        subtitle="Define badges that are automatically awarded when users hit activity milestones."
        actions={
          <div className="flex items-center gap-2">
            <Button
              as={Link}
              to={prefix('/admin/badges/new')}
              variant="primary"
              size="md"
              leftIcon={Plus}
              className="font-bold shadow-sm shadow-primary/20"
            >
              New Badge
            </Button>
          </div>
        }
      />
      <DataTable
        columns={columns}
        data={badges}
        rowKey={b => b.id ?? ''}
        loading={loading}
        actions={actions}
        searchPlaceholder="Search by name or description…"
        exportFilename="badges"
        emptyIcon={Medal}
        emptyTitle="No Badges Yet"
        emptyMessage="Create your first badge definition to reward user activity milestones."
      />
    </div>
  );
}
