import { collection, getDocs, query, where } from 'firebase/firestore';
import { BookOpen, CheckCircle, Clock, Plus, XCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PromptCard from '../../components/PromptCard';
import PromptCardSkeleton from '../../components/PromptCardSkeleton';
import Button from '../../components/primitives/Button';
import { useAuth } from '../../hooks/useAuth';
import { usePath } from '../../hooks/usePath';
import { db } from '../../lib/firebase';
import { Prompt } from '../../types';
import { cn } from '../../lib/utils';

const STATUS_CONFIG = {
  pending: { icon: Clock, label: 'Under Review', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  approved: { icon: CheckCircle, label: 'Published', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  rejected: { icon: XCircle, label: 'Rejected', className: 'bg-rose-500/10 text-rose-600 border-rose-500/20' },
};

function StatusBadge({ status }: { status?: string }) {
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
  if (!cfg) return null;
  const Icon = cfg.icon;
  return (
    <span className={cn('flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border', cfg.className)}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

export default function DashboardLibrary() {
  const { user } = useAuth();
  const { prefix } = usePath();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      try {
        const q = query(collection(db, 'prompts'), where('creatorId', '==', user.uid));
        const qSnap = await getDocs(q);
        setPrompts(qSnap.docs.map(d => ({ ...d.data(), id: d.id } as Prompt)));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user]);

  const approvedCount = prompts.filter(p => p.status === 'approved').length;
  const pendingCount = prompts.filter(p => p.status === 'pending').length;
  const rejectedCount = prompts.filter(p => p.status === 'rejected').length;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-[0.2em] text-xs mb-2">
            <BookOpen className="w-4 h-4" />
            My Contributions
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">My Creations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Prompts you've submitted to the marketplace.
          </p>
          {prompts.length > 0 && (
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {approvedCount > 0 && <StatusBadge status="approved" />}
              {pendingCount > 0 && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border bg-amber-500/10 text-amber-600 border-amber-500/20">
                  <Clock className="w-3 h-3" />{pendingCount} under review
                </span>
              )}
              {rejectedCount > 0 && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border bg-rose-500/10 text-rose-600 border-rose-500/20">
                  <XCircle className="w-3 h-3" />{rejectedCount} rejected
                </span>
              )}
            </div>
          )}
        </div>
        <Button
          as={Link}
          to={prefix('/dashboard/submit')}
          variant="primary"
          size="sm"
          leftIcon={Plus}
          className="shrink-0 shadow-sm shadow-primary/20"
        >
          Submit Prompt
        </Button>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => <PromptCardSkeleton key={i} />)}
        </div>
      ) : prompts.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {prompts.map(p => (
            <div key={p.id} className="relative">
              <PromptCard prompt={p} />
              {/* Status badge overlay */}
              {p.status && p.status !== 'approved' && (
                <div className="absolute top-3 left-3 z-20">
                  <StatusBadge status={p.status} />
                </div>
              )}
              {/* Rejection reason */}
              {p.status === 'rejected' && p.rejectionReason && (
                <div className="mt-2 p-3 bg-rose-500/5 border border-rose-500/20 rounded-lg">
                  <p className="text-xs text-rose-600 font-medium">
                    <span className="font-bold">Rejection reason:</span> {p.rejectionReason}
                  </p>
                </div>
              )}
            </div>
          ))}
        </motion.div>
      ) : (
        <div className="py-24 bg-muted/30 rounded-2xl border border-border border-dashed text-center">
          <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-muted-foreground/30" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-1">No submissions yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
            Submit a prompt to the marketplace. It'll appear here after our team reviews it.
          </p>
          <Button as={Link} to={prefix('/dashboard/submit')} variant="primary" leftIcon={Plus}>
            Submit Your First Prompt
          </Button>
        </div>
      )}
    </div>
  );
}
