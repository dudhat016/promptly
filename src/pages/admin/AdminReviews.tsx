import {
  collectionGroup, doc, getDoc, onSnapshot, orderBy, query,
  serverTimestamp, updateDoc, deleteDoc, where,
} from 'firebase/firestore';
import { AlertCircle, CheckCircle, MessageSquare, Star, Trash2, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { AdminPageHeader, useConfirm } from '../../components/admin';
import Button from '../../components/primitives/Button';
import Rating from '../../components/feedback/Rating';
import Spinner from '../../components/feedback/Spinner';
import Tabs from '../../components/navigation/Tabs';
import { useAuth } from '../../hooks/useAuth';
import { usePath } from '../../hooks/usePath';
import { db } from '../../lib/firebase';
import { cn } from '../../lib/utils';
import { PromptReview } from '../../types';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

const STATUS_CONFIG = {
  pending:  { label: 'Pending',  color: 'text-amber-600 bg-amber-500/10 border-amber-500/20' },
  approved: { label: 'Approved', color: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20' },
  rejected: { label: 'Rejected', color: 'text-rose-600 bg-rose-500/10 border-rose-500/20' },
};

function StatusBadge({ status }: { status?: string }) {
  const key = (status as StatusFilter) ?? 'pending';
  const cfg = STATUS_CONFIG[key] ?? STATUS_CONFIG.pending;
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold border', cfg.color)}>
      {cfg.label}
    </span>
  );
}

export default function AdminReviews() {
  const confirm = useConfirm();
  const { user } = useAuth();
  const { prefix } = usePath();
  const [reviews, setReviews]         = useState<PromptReview[]>([]);
  const [loading, setLoading]         = useState(true);
  const [queryError, setQueryError]   = useState<string | null>(null);
  const [activeTab, setActiveTab]     = useState<StatusFilter>('pending');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collectionGroup(db, 'reviews'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() } as PromptReview)));
      setQueryError(null);
      setLoading(false);
    }, (err) => {
      console.error('[AdminReviews] collectionGroup query failed:', err);
      setQueryError(err.message);
      setLoading(false);
    });
    return unsub;
  }, []);

  const getRef = (r: PromptReview) => doc(db, 'prompts', r.promptId, 'reviews', r.id);

  // Recalculates avgRating + reviewCount on the prompt doc when a review is added or removed.
  const updatePromptStats = async (promptId: string, ratingDelta: number, countDelta: number) => {
    const promptRef = doc(db, 'prompts', promptId);
    const snap = await getDoc(promptRef);
    if (!snap.exists()) return;
    const { avgRating = 0, reviewCount = 0 } = snap.data();
    const newCount = Math.max(0, reviewCount + countDelta);
    const newAvg = newCount === 0
      ? 0
      : parseFloat(((avgRating * reviewCount + ratingDelta) / newCount).toFixed(1));
    await updateDoc(promptRef, { reviewCount: newCount, avgRating: newAvg });
  };

  const handleApprove = async (r: PromptReview) => {
    if (actionLoading) return;
    setActionLoading(r.id);
    try {
      await updateDoc(getRef(r), {
        moderationStatus: 'approved',
        reviewedAt: serverTimestamp(),
        reviewedBy: user?.uid ?? '',
      });
      // Only count it if it wasn't already approved (avoid double-counting re-approvals)
      if (r.moderationStatus !== 'approved') {
        await updatePromptStats(r.promptId, r.rating, 1).catch(() => {});
      }
      toast.success('Review approved');
    } catch {
      toast.error('Failed to approve');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (r: PromptReview) => {
    if (actionLoading) return;
    setActionLoading(r.id);
    try {
      await updateDoc(getRef(r), {
        moderationStatus: 'rejected',
        reviewedAt: serverTimestamp(),
        reviewedBy: user?.uid ?? '',
      });
      // Remove from stats only if it was previously approved
      if (r.moderationStatus === 'approved') {
        await updatePromptStats(r.promptId, -r.rating, -1).catch(() => {});
      }
      toast.success('Review rejected');
    } catch {
      toast.error('Failed to reject');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (r: PromptReview) => {
    const ok = await confirm({ title: `Delete review from "${r.displayName}"?`, description: 'This cannot be undone.', confirmLabel: 'Delete', destructive: true });
    if (!ok) return;
    try {
      await deleteDoc(getRef(r));
      // Remove from stats only if the review was approved and counted
      if (r.moderationStatus === 'approved') {
        await updatePromptStats(r.promptId, -r.rating, -1).catch(() => {});
      }
      toast.success('Review deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const visible = activeTab === 'all'
    ? reviews
    : reviews.filter(r => (r.moderationStatus ?? 'pending') === activeTab);

  const counts: Record<StatusFilter, number> = {
    all:      reviews.length,
    pending:  reviews.filter(r => (r.moderationStatus ?? 'pending') === 'pending').length,
    approved: reviews.filter(r => r.moderationStatus === 'approved').length,
    rejected: reviews.filter(r => r.moderationStatus === 'rejected').length,
  };

  const tabs: { key: StatusFilter; label: string }[] = [
    { key: 'pending',  label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'all',      label: 'All' },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        label="Marketplace"
        labelIcon={Star}
        title="Reviews"
        subtitle="Moderate user-submitted prompt reviews before they appear publicly."
      />

      {/* ── Index error banner ── */}
      {queryError && (
        <div className="flex items-start gap-3 p-4 bg-rose-500/5 border border-rose-500/20 rounded-xl text-sm">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-rose-600">Firestore query failed — index missing</p>
            <p className="text-xs text-muted-foreground mt-1">
              Run <code className="bg-muted px-1 py-0.5 rounded text-[11px]">firebase deploy --only firestore:indexes</code> to create the required collection-group index, then reload.
            </p>
            <p className="text-[10px] text-muted-foreground/60 mt-1 font-mono">{queryError}</p>
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <Tabs
        tabs={tabs.map(t => ({ id: t.key, label: t.label, badge: counts[t.key] > 0 ? counts[t.key] : undefined }))}
        activeTab={activeTab}
        onChange={id => setActiveTab(id as StatusFilter)}
        variant="pill"
      />

      {/* ── Table ── */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center gap-3">
            <Spinner size="sm" />
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Loading reviews...</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="py-20 flex flex-col items-center text-center px-8">
            <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
              <MessageSquare className="w-7 h-7 text-muted-foreground/20" />
            </div>
            <p className="text-sm font-bold text-foreground mb-1">No {activeTab === 'all' ? '' : activeTab} reviews</p>
            <p className="text-xs text-muted-foreground">They'll show up here once users start reviewing prompts.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-muted/30 border-b border-border">
                  {['Reviewer', 'Prompt', 'Rating', 'Comment', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visible.map(r => {
                  const status = r.moderationStatus ?? 'pending';
                  const isLoading = actionLoading === r.id;
                  return (
                    <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                      {/* Reviewer */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          {r.photoURL ? (
                            <img src={r.photoURL} className="w-8 h-8 rounded-lg object-cover border border-border shrink-0" alt="" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center font-bold text-primary text-xs shrink-0">
                              {(r.displayName || '?').charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-semibold text-foreground">{r.displayName}</p>
                            <p className="text-[10px] text-muted-foreground/60 font-mono">{r.userId.slice(0, 8)}…</p>
                          </div>
                        </div>
                      </td>

                      {/* Prompt */}
                      <td className="px-4 py-3">
                        {r.promptSlug ? (
                          <Link
                            to={prefix(`/prompt/${r.promptSlug}`)}
                            target="_blank"
                            className="text-sm font-semibold text-primary hover:underline line-clamp-1 max-w-[160px] block"
                          >
                            {r.promptTitle || r.promptId.slice(0, 12)}
                          </Link>
                        ) : (
                          <span className="text-sm text-muted-foreground font-mono">{r.promptId.slice(0, 12)}…</span>
                        )}
                      </td>

                      {/* Rating */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Rating value={r.rating} readOnly size="sm" />
                          <span className="text-xs font-bold text-muted-foreground">{r.rating}/5</span>
                        </div>
                      </td>

                      {/* Comment */}
                      <td className="px-4 py-3 max-w-[280px]">
                        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                          {r.comment || <span className="italic text-muted-foreground/40">No comment</span>}
                        </p>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <StatusBadge status={status} />
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {status !== 'approved' && (
                            <Button
                              onClick={() => handleApprove(r)}
                              variant="ghost"
                              size="icon"
                              isLoading={isLoading}
                              className="h-8 w-8 text-emerald-600 hover:bg-emerald-500/10"
                              title="Approve"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          )}
                          {status !== 'rejected' && (
                            <Button
                              onClick={() => handleReject(r)}
                              variant="ghost"
                              size="icon"
                              isLoading={isLoading}
                              className="h-8 w-8 text-amber-600 hover:bg-amber-500/10"
                              title="Reject"
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            onClick={() => handleDelete(r)}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground/40 hover:text-rose-500 hover:bg-rose-500/10"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
