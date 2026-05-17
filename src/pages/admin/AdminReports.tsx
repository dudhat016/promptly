import { collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, orderBy, query, updateDoc, where, serverTimestamp, addDoc } from 'firebase/firestore';
import { AlertTriangle, CheckCircle, Eye, EyeOff, Flag, MessageSquare, Trash2, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { AdminPageHeader, useConfirm } from '../../components/admin';
import Button from '../../components/primitives/Button';
import Textarea from '../../components/primitives/Textarea';
import { useAuth } from '../../hooks/useAuth';
import { usePath } from '../../hooks/usePath';
import { logAuditEvent } from '../../lib/auditLog';
import { db } from '../../lib/firebase';
import { cn } from '../../lib/utils';
import { EmailService } from '../../services/emailService';
import { PromptReport } from '../../types';

type Tab = 'pending' | 'reviewed' | 'dismissed' | 'actioned';

const REASON_LABELS: Record<string, string> = {
  spam: 'Spam or misleading',
  harmful: 'Harmful or dangerous',
  inappropriate: 'Inappropriate content',
  copyright: 'Copyright violation',
  wrong_category: 'Wrong category',
  duplicate: 'Duplicate',
  other: 'Other',
};

const STATUS_COLORS: Record<Tab, string> = {
  pending: 'text-amber-600 bg-amber-500/10 border-amber-500/20',
  reviewed: 'text-primary bg-primary/10 border-primary/20',
  dismissed: 'text-muted-foreground bg-muted border-border',
  actioned: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20',
};

interface ReportWithCount extends PromptReport {
  totalForPrompt?: number;
}

export default function AdminReports() {
  const confirm = useConfirm();
  const { user } = useAuth();
  const { prefix } = usePath();
  const [reports, setReports] = useState<ReportWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('pending');
  const [selectedReport, setSelectedReport] = useState<ReportWithCount | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'prompt_reports'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as PromptReport));
      // Count reports per prompt
      const countMap: Record<string, number> = {};
      all.forEach(r => { countMap[r.promptId] = (countMap[r.promptId] || 0) + 1; });
      setReports(all.map(r => ({ ...r, totalForPrompt: countMap[r.promptId] })));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, []);

  const filtered = reports.filter(r => r.status === activeTab);
  const pendingCount = reports.filter(r => r.status === 'pending').length;

  const updateReportStatus = async (report: PromptReport, status: Tab, note?: string) => {
    await updateDoc(doc(db, 'prompt_reports', report.id!), {
      status,
      reviewedBy: user?.uid,
      reviewedAt: serverTimestamp(),
      ...(note ? { adminNote: note } : {}),
    });
  };

  const handleDismiss = async (report: ReportWithCount) => {
    setActionLoading(report.id!);
    try {
      await updateReportStatus(report, 'dismissed', adminNote || undefined);
      setSelectedReport(null);
      setAdminNote('');
      logAuditEvent({ action: 'report.dismissed', entityType: 'prompt', entityId: report.promptId, actorId: user?.uid, actorEmail: user?.email ?? undefined, details: { reportId: report.id } });
      toast.success('Report dismissed');
    } catch { toast.error('Failed'); } finally { setActionLoading(null); }
  };

  const handleWarnCreator = async (report: ReportWithCount) => {
    setActionLoading(report.id!);
    try {
      await updateReportStatus(report, 'reviewed', adminNote || undefined);
      // Notify creator
      await addDoc(collection(db, 'users', report.promptCreatorId, 'notifications'), {
        type: 'prompt_warning',
        title: 'Content warning on your prompt',
        message: `Your prompt "${report.promptTitle}" received a community report. Please review our content guidelines.`,
        promptId: report.promptId,
        read: false,
        createdAt: serverTimestamp(),
      });
      getDoc(doc(db, 'users', report.promptCreatorId)).then(snap => {
        if (!snap.exists()) return;
        const d = snap.data();
        if (d.email) EmailService.sendPromptWarningEmail(report.promptCreatorId, d.email, d.displayName || 'Creator', report.promptTitle);
      }).catch(() => {});
      setSelectedReport(null);
      setAdminNote('');
      logAuditEvent({ action: 'report.warn_creator', entityType: 'prompt', entityId: report.promptId, actorId: user?.uid, actorEmail: user?.email ?? undefined, details: { reportId: report.id } });
      toast.success('Creator warned');
    } catch { toast.error('Failed'); } finally { setActionLoading(null); }
  };

  const handleHidePrompt = async (report: ReportWithCount) => {
    const ok = await confirm({ title: 'Hide this prompt?', description: 'It will be removed from Explore. The creator can still see it.', confirmLabel: 'Hide', destructive: true });
    if (!ok) return;
    setActionLoading(report.id!);
    try {
      await updateDoc(doc(db, 'prompts', report.promptId), { moderationStatus: 'hidden' });
      await updateReportStatus(report, 'actioned', adminNote || undefined);
      // Notify creator
      await addDoc(collection(db, 'users', report.promptCreatorId, 'notifications'), {
        type: 'prompt_hidden',
        title: 'Your prompt has been hidden',
        message: `"${report.promptTitle}" has been removed from the marketplace following a review of community reports.`,
        promptId: report.promptId,
        read: false,
        createdAt: serverTimestamp(),
      });
      getDoc(doc(db, 'users', report.promptCreatorId)).then(snap => {
        if (!snap.exists()) return;
        const d = snap.data();
        if (d.email) EmailService.sendPromptHiddenEmail(report.promptCreatorId, d.email, d.displayName || 'Creator', report.promptTitle);
      }).catch(() => {});
      setSelectedReport(null);
      setAdminNote('');
      logAuditEvent({ action: 'report.hide_prompt', entityType: 'prompt', entityId: report.promptId, actorId: user?.uid, actorEmail: user?.email ?? undefined, details: { reportId: report.id } });
      toast.success('Prompt hidden from Explore');
    } catch { toast.error('Failed'); } finally { setActionLoading(null); }
  };

  const handleDeletePrompt = async (report: ReportWithCount) => {
    const ok = await confirm({ title: 'Delete this prompt permanently?', description: 'This cannot be undone.', confirmLabel: 'Delete', destructive: true });
    if (!ok) return;
    setActionLoading(report.id!);
    try {
      await deleteDoc(doc(db, 'prompts', report.promptId));
      await updateReportStatus(report, 'actioned', adminNote || 'Prompt deleted');
      setSelectedReport(null);
      setAdminNote('');
      logAuditEvent({ action: 'report.delete_prompt', entityType: 'prompt', entityId: report.promptId, actorId: user?.uid, actorEmail: user?.email ?? undefined, details: { reportId: report.id } });
      toast.success('Prompt deleted');
    } catch { toast.error('Failed'); } finally { setActionLoading(null); }
  };

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: 'pending', label: 'Pending', count: pendingCount },
    { key: 'reviewed', label: 'Reviewed' },
    { key: 'dismissed', label: 'Dismissed' },
    { key: 'actioned', label: 'Actioned' },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        label="Support"
        labelIcon={Flag}
        title="Content Reports"
        subtitle="Review community reports and moderate flagged prompts."
      />

      {/* Tab bar */}
      <div className="flex items-center gap-1 p-1 bg-muted rounded-lg w-fit">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all',
              activeTab === tab.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white min-w-[18px] text-center">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Reports list */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-muted-foreground text-sm animate-pulse">Loading reports...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Flag className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="font-semibold text-foreground">No {activeTab} reports</p>
            <p className="text-sm text-muted-foreground mt-1">
              {activeTab === 'pending' ? 'No community reports waiting for review.' : `All ${activeTab} reports are shown here.`}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map(report => (
              <div
                key={report.id}
                onClick={() => { setSelectedReport(report); setAdminNote(''); }}
                className="flex items-center gap-4 px-6 py-4 hover:bg-muted/30 cursor-pointer transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-semibold text-foreground text-sm truncate">{report.promptTitle}</p>
                    {(report.totalForPrompt ?? 0) > 1 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/10 text-rose-600 border border-rose-500/20">
                        {report.totalForPrompt} reports
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {REASON_LABELS[report.reason] || report.reason}
                    {report.details && ` — "${report.details}"`}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={cn('px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border', STATUS_COLORS[report.status])}>
                    {report.status}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {report.createdAt?.toDate ? report.createdAt.toDate().toLocaleDateString() : 'Recent'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center">
                  <Flag className="w-4 h-4 text-rose-500" />
                </div>
                <div>
                  <p className="font-bold text-foreground text-sm">Review Report</p>
                  <p className="text-xs text-muted-foreground">Choose an action below</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedReport(null)} className="w-8 h-8">
                <XCircle className="w-4 h-4" />
              </Button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Prompt info */}
              <div className="bg-muted/30 rounded-xl p-4 space-y-1">
                <p className="font-semibold text-foreground text-sm">{selectedReport.promptTitle}</p>
                <p className="text-xs text-muted-foreground">
                  Reason: <span className="font-semibold">{REASON_LABELS[selectedReport.reason]}</span>
                </p>
                {selectedReport.details && (
                  <p className="text-xs text-muted-foreground">Details: "{selectedReport.details}"</p>
                )}
                {(selectedReport.totalForPrompt ?? 0) > 1 && (
                  <p className="text-xs text-rose-600 font-semibold">{selectedReport.totalForPrompt} total reports on this prompt</p>
                )}
              </div>

              {/* Admin note */}
              <Textarea
                label="Internal Note (optional)"
                value={adminNote}
                onChange={e => setAdminNote(e.target.value)}
                rows={2}
                placeholder="Add a note for the audit log..."
                variant="filled"
              />

              {/* View prompt link */}
              <Button
                as={Link}
                to={prefix(`/prompt/${selectedReport.promptId}`)}
                target="_blank"
                variant="secondary"
                size="sm"
                leftIcon={Eye}
                fullWidth
              >
                View Prompt
              </Button>
            </div>

            {/* Actions */}
            <div className="px-6 pb-6 grid grid-cols-2 gap-3">
              <Button
                variant="secondary"
                size="md"
                leftIcon={CheckCircle}
                isLoading={actionLoading === selectedReport.id}
                onClick={() => handleDismiss(selectedReport)}
                className="text-muted-foreground"
              >
                Dismiss
              </Button>
              <Button
                variant="secondary"
                size="md"
                leftIcon={MessageSquare}
                isLoading={actionLoading === selectedReport.id}
                onClick={() => handleWarnCreator(selectedReport)}
                className="text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
              >
                Warn Creator
              </Button>
              <Button
                variant="secondary"
                size="md"
                leftIcon={EyeOff}
                isLoading={actionLoading === selectedReport.id}
                onClick={() => handleHidePrompt(selectedReport)}
                className="text-rose-600 border-rose-500/30 hover:bg-rose-500/10"
              >
                Hide Prompt
              </Button>
              <Button
                variant="secondary"
                size="md"
                leftIcon={Trash2}
                isLoading={actionLoading === selectedReport.id}
                onClick={() => handleDeletePrompt(selectedReport)}
                className="text-rose-700 border-rose-600/30 hover:bg-rose-600/10"
              >
                Delete Prompt
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
