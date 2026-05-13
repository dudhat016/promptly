import { collection, deleteDoc, doc, getDocs, orderBy, query, updateDoc, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { CheckCircle, Clock, Eye, Heart, LayoutGrid, Plus, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';
import type { DataTableActions, DataTableColumn } from '../../components/admin';
import { AdminPageHeader, DataTable, useConfirm } from '../../components/admin';
import Button from '../../components/primitives/Button';
import Textarea from '../../components/primitives/Textarea';
import { useAuth } from '../../hooks/useAuth';
import { usePath } from '../../hooks/usePath';
import { logAuditEvent } from '../../lib/auditLog';
import { db } from '../../lib/firebase';
import { cn } from '../../lib/utils';
import { Prompt } from '../../types';

type Tab = 'all' | 'pending' | 'approved' | 'rejected';

export default function AdminPrompts() {
  const confirm = useConfirm();
  const { user } = useAuth();
  const { prefix } = usePath();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('pending');
  const [rejectModalPrompt, setRejectModalPrompt] = useState<Prompt | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => { fetchPrompts(); }, []);

  async function fetchPrompts() {
    try {
      const q = query(collection(db, 'prompts'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setPrompts(snap.docs.map(d => ({ ...d.data(), id: d.id } as Prompt)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async (prompt: Prompt) => {
    const ok = await confirm({ title: 'Delete this prompt?', description: 'This action cannot be undone.', confirmLabel: 'Delete', destructive: true });
    if (!ok) return;
    try {
      await deleteDoc(doc(db, 'prompts', prompt.id!));
      setPrompts(prev => prev.filter(p => p.id !== prompt.id));
      logAuditEvent({ action: 'prompt.deleted', entityType: 'prompt', entityId: prompt.id, actorId: user?.uid, actorEmail: user?.email ?? undefined, details: { title: prompt.title } });
      toast.success('Prompt deleted');
    } catch {
      toast.error('Failed to delete prompt');
    }
  };

  const handleBulkDelete = async (rows: Prompt[]) => {
    await Promise.all(rows.map(p => deleteDoc(doc(db, 'prompts', p.id!))));
    setPrompts(prev => prev.filter(p => !rows.some(r => r.id === p.id)));
    logAuditEvent({ action: 'prompt.bulk_deleted', entityType: 'prompt', actorId: user?.uid, actorEmail: user?.email ?? undefined, details: { count: rows.length, ids: rows.map(r => r.id) } });
    toast.success(`${rows.length} prompts deleted`);
  };

  const handleApprove = async (prompt: Prompt, isPaid: boolean) => {
    setActionLoading(prompt.id!);
    try {
      await updateDoc(doc(db, 'prompts', prompt.id!), {
        status: 'approved',
        isPaid,
        approvedBy: user?.uid,
        approvedAt: new Date().toISOString(),
        moderationStatus: 'active',
        updatedAt: serverTimestamp(),
      });
      // Notify creator
      await addDoc(collection(db, 'users', prompt.creatorId, 'notifications'), {
        type: 'prompt_approved',
        title: 'Your prompt was approved!',
        message: `"${prompt.title}" is now live on the marketplace as a ${isPaid ? 'premium' : 'free'} prompt.`,
        promptId: prompt.id,
        read: false,
        createdAt: serverTimestamp(),
      });
      setPrompts(prev => prev.map(p => p.id === prompt.id ? { ...p, status: 'approved', isPaid, approvedBy: user?.uid } : p));
      logAuditEvent({ action: 'prompt.approved', entityType: 'prompt', entityId: prompt.id, actorId: user?.uid, actorEmail: user?.email ?? undefined, details: { title: prompt.title, isPaid } });
      toast.success(`Approved as ${isPaid ? 'Premium' : 'Free'}!`);
    } catch {
      toast.error('Failed to approve');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectModalPrompt || !rejectReason.trim()) {
      toast.error('Please enter a rejection reason');
      return;
    }
    setActionLoading(rejectModalPrompt.id!);
    try {
      await updateDoc(doc(db, 'prompts', rejectModalPrompt.id!), {
        status: 'rejected',
        rejectionReason: rejectReason,
        updatedAt: serverTimestamp(),
      });
      // Notify creator
      await addDoc(collection(db, 'users', rejectModalPrompt.creatorId, 'notifications'), {
        type: 'prompt_rejected',
        title: 'Your prompt needs revision',
        message: `"${rejectModalPrompt.title}" was not approved. Reason: ${rejectReason}`,
        promptId: rejectModalPrompt.id,
        read: false,
        createdAt: serverTimestamp(),
      });
      setPrompts(prev => prev.map(p => p.id === rejectModalPrompt.id ? { ...p, status: 'rejected', rejectionReason: rejectReason } : p));
      logAuditEvent({ action: 'prompt.rejected', entityType: 'prompt', entityId: rejectModalPrompt.id, actorId: user?.uid, actorEmail: user?.email ?? undefined, details: { title: rejectModalPrompt.title, reason: rejectReason } });
      toast.success('Prompt rejected');
      setRejectModalPrompt(null);
      setRejectReason('');
    } catch {
      toast.error('Failed to reject');
    } finally {
      setActionLoading(null);
    }
  };

  const pendingCount = prompts.filter(p => p.status === 'pending').length;

  const filteredPrompts = prompts.filter(p => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return p.status === 'pending';
    if (activeTab === 'approved') return p.status === 'approved' || !p.status;
    if (activeTab === 'rejected') return p.status === 'rejected';
    return true;
  });

  const baseColumns: DataTableColumn<Prompt>[] = [
    {
      key: 'prompt',
      header: 'Prompt',
      searchValue: p => `${p.title} ${p.description ?? ''} ${p.model}`,
      render: p => (
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${p.isPaid ? 'bg-amber-400' : 'bg-emerald-400'}`} />
          <div className="min-w-0">
            <p className="font-bold text-foreground truncate">{p.title}</p>
            <p className="text-xs text-muted-foreground line-clamp-1 max-w-xs">{p.description}</p>
          </div>
        </div>
      ),
      csvValue: p => p.title,
    },
    {
      key: 'model',
      header: 'Model',
      searchValue: p => p.model,
      sortable: true,
      sortValue: p => p.model,
      render: p => <span className="badge-primary">{p.model}</span>,
      csvValue: p => p.model,
    },
    {
      key: 'type',
      header: 'Type',
      sortable: true,
      sortValue: p => p.isPaid ? 'paid' : 'free',
      render: p => (
        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${p.isPaid ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'}`}>
          {p.isPaid ? 'Paid' : 'Free'}
        </span>
      ),
      csvValue: p => p.isPaid ? 'Paid' : 'Free',
    },
    {
      key: 'stats',
      header: 'Stats',
      sortable: true,
      sortValue: p => p.likesCount ?? 0,
      render: p => (
        <div className="flex items-center gap-4 text-muted-foreground text-xs font-bold">
          <span className="flex items-center gap-1.5"><Heart className="w-3.5 h-3.5 text-rose-400" />{p.likesCount ?? 0}</span>
          <span className="flex items-center gap-1.5"><Eye className="w-3.5 h-3.5 text-primary/60" />{p.viewsCount ?? 0}</span>
        </div>
      ),
      csvValue: p => `${p.likesCount ?? 0} likes, ${p.viewsCount ?? 0} views`,
    },
  ];

  const pendingColumns: DataTableColumn<Prompt>[] = [
    ...baseColumns,
    {
      key: 'actions_inline',
      header: 'Review',
      render: p => (
        <div className="flex items-center gap-2">
          <Button
            onClick={() => handleApprove(p, false)}
            isLoading={actionLoading === p.id}
            variant="secondary"
            size="sm"
            leftIcon={CheckCircle}
            className="text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10 text-xs"
          >
            Free
          </Button>
          <Button
            onClick={() => handleApprove(p, true)}
            isLoading={actionLoading === p.id}
            variant="secondary"
            size="sm"
            leftIcon={CheckCircle}
            className="text-amber-600 border-amber-500/30 hover:bg-amber-500/10 text-xs"
          >
            Premium
          </Button>
          <Button
            onClick={() => setRejectModalPrompt(p)}
            variant="secondary"
            size="sm"
            leftIcon={XCircle}
            className="text-rose-600 border-rose-500/30 hover:bg-rose-500/10 text-xs"
          >
            Reject
          </Button>
        </div>
      ),
    },
  ];

  const displayColumns = activeTab === 'pending' ? pendingColumns : baseColumns;

  const actions: DataTableActions<Prompt> = {
    view: p => prefix(`/prompt/${p.slug || p.id}`),
    edit: p => prefix(`/admin/prompts/${p.id}/edit`),
    onDelete: handleDelete,
  };

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: 'pending', label: 'Pending Review', count: pendingCount },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'all', label: 'All Prompts' },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        label="Content"
        labelIcon={LayoutGrid}
        title="Prompts Library"
        subtitle="Manage all prompts and review creator submissions."
        actions={
          <Button as={Link} to={prefix('/admin/prompts/new')} variant="primary" leftIcon={Plus} size="sm">
            Add Prompt
          </Button>
        }
      />

      {/* Tab bar */}
      <div className="flex items-center gap-1 p-1 bg-muted rounded-lg w-fit">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all',
              activeTab === tab.key
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white min-w-[18px] text-center">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <DataTable
        columns={displayColumns}
        data={filteredPrompts}
        rowKey={p => p.id!}
        loading={loading}
        actions={actions}
        searchPlaceholder="Search by title, model..."
        selectable
        onBulkDelete={handleBulkDelete}
        exportFilename="prompts"
        emptyIcon={LayoutGrid}
        emptyTitle={activeTab === 'pending' ? 'No pending submissions' : 'No prompts found'}
        emptyMessage={activeTab === 'pending' ? 'Creator submissions will appear here for review.' : 'Start by adding your first prompt.'}
      />

      {/* Reject modal */}
      {rejectModalPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl w-full max-w-md p-8 shadow-2xl">
            <div className="flex items-center gap-3 mb-2">
              <XCircle className="w-5 h-5 text-rose-500" />
              <h3 className="font-bold text-foreground">Reject Submission</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              Provide a reason so the creator knows what to improve before resubmitting.
            </p>
            <p className="text-sm font-semibold text-foreground mb-3 truncate">"{rejectModalPrompt.title}"</p>
            <Textarea
              label="Rejection Reason *"
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={4}
              placeholder="e.g. Content is too short, image is missing, duplicate of an existing prompt..."
              variant="filled"
            />
            <div className="flex gap-3 mt-6">
              <Button variant="secondary" size="lg" fullWidth onClick={() => { setRejectModalPrompt(null); setRejectReason(''); }}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="lg"
                fullWidth
                isLoading={actionLoading === rejectModalPrompt.id}
                onClick={handleRejectConfirm}
                className="bg-rose-500 hover:bg-rose-600 border-rose-500"
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
