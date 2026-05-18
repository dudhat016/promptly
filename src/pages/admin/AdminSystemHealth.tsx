import { collection, getCountFromServer, getDocs, limit, orderBy, query } from 'firebase/firestore';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  Mail,
  Play,
  RefreshCw,
  Server,
  XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';

const CRON_SECRET = import.meta.env.VITE_CRON_SECRET ?? '';

interface HealthRecord {
  jobId: string;
  lastRunAt: { seconds: number } | null;
  lastStatus: 'ok' | 'error' | null;
  lastResult: Record<string, any>;
  durationMs: number;
}

interface CollectionStat {
  label: string;
  collection: string;
  icon: React.ReactNode;
  count: number | null;
}

interface EmailLog {
  id: string;
  to: string;
  type: string;
  status: string;
  sentAt: { seconds: number } | null;
}

const JOB_META: Record<string, { label: string; schedule: string; description: string }> = {
  'automation-tick': { label: 'Automation Tick',  schedule: 'Every 10 min',  description: 'Processes due automation flow instances' },
  'nudges':          { label: 'Nudges',            schedule: 'Hourly',        description: 'Trial expiry + renewal reminder emails' },
  'segment-rebuild': { label: 'Segment Rebuild',   schedule: 'Hourly',        description: 'Re-evaluates CRM segment filters' },
  'process-locks':   { label: 'Process Locks',     schedule: 'Daily 03:00',   description: 'Approves affiliate commissions past lock period' },
  'expire-trials':   { label: 'Expire Trials',     schedule: 'Daily 04:00',   description: 'Downgrades expired trial users to free plan' },
};

function formatRelative(seconds: number): string {
  const diff = Math.floor(Date.now() / 1000) - seconds;
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function StatusIcon({ status }: { status: 'ok' | 'error' | null }) {
  if (status === 'ok')    return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
  if (status === 'error') return <XCircle      className="w-5 h-5 text-red-400" />;
  return <Clock className="w-5 h-5 text-zinc-500" />;
}

export default function AdminSystemHealth() {
  const [jobs, setJobs]               = useState<HealthRecord[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsError, setJobsError]     = useState<string | null>(null);

  const [colStats, setColStats] = useState<CollectionStat[]>([
    { label: 'Users',          collection: 'users',                 icon: <Activity className="w-4 h-4" />, count: null },
    { label: 'Prompts',        collection: 'prompts',               icon: <Database className="w-4 h-4" />, count: null },
    { label: 'Orders',         collection: 'orders',                icon: <Server className="w-4 h-4" />,   count: null },
    { label: 'Commissions',    collection: 'referral_commissions',  icon: <Cpu className="w-4 h-4" />,      count: null },
    { label: 'Email Logs',     collection: 'email_logs',            icon: <Mail className="w-4 h-4" />,     count: null },
    { label: 'Contacts (CRM)', collection: 'marketing_contacts',    icon: <Activity className="w-4 h-4" />, count: null },
  ]);

  const [emailLogs, setEmailLogs]     = useState<EmailLog[]>([]);
  const [triggering, setTriggering]   = useState<string | null>(null);
  const [triggerMsg, setTriggerMsg]   = useState<Record<string, string>>({});

  useEffect(() => {
    fetchJobs();
    fetchColStats();
    fetchEmailLogs();
  }, []);

  async function fetchJobs() {
    setJobsLoading(true);
    setJobsError(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (CRON_SECRET) headers['Authorization'] = `Bearer ${CRON_SECRET}`;
      const res = await fetch('/api/cron/health', { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setJobs(data.jobs ?? []);
    } catch (e: any) {
      setJobsError(e.message);
    } finally {
      setJobsLoading(false);
    }
  }

  async function fetchColStats() {
    const updated = await Promise.all(
      colStats.map(async (s) => {
        try {
          const snap = await getCountFromServer(collection(db, s.collection));
          return { ...s, count: snap.data().count };
        } catch {
          return { ...s, count: -1 };
        }
      })
    );
    setColStats(updated);
  }

  async function fetchEmailLogs() {
    try {
      const snap = await getDocs(
        query(collection(db, 'email_logs'), orderBy('sentAt', 'desc'), limit(10))
      );
      setEmailLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as EmailLog)));
    } catch { /* non-fatal */ }
  }

  async function triggerJob(jobId: string) {
    setTriggering(jobId);
    setTriggerMsg(prev => ({ ...prev, [jobId]: '' }));
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (CRON_SECRET) headers['Authorization'] = `Bearer ${CRON_SECRET}`;
      const res = await fetch(`/api/cron/${jobId}`, { method: 'POST', headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setTriggerMsg(prev => ({ ...prev, [jobId]: `Done — ${JSON.stringify(data).slice(0, 80)}` }));
      // refresh job status after trigger
      setTimeout(fetchJobs, 1500);
    } catch (e: any) {
      setTriggerMsg(prev => ({ ...prev, [jobId]: `Error: ${e.message}` }));
    } finally {
      setTriggering(null);
    }
  }

  const allJobIds = Object.keys(JOB_META);

  // Merge health records into the full job list (some may not have run yet)
  const jobCards = allJobIds.map(id => {
    const record = jobs.find(j => j.jobId === id);
    return { id, meta: JOB_META[id], record: record ?? null };
  });

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">System Health</h1>
          <p className="text-sm text-zinc-400 mt-1">Cron job status, collection stats, and recent email activity</p>
        </div>
        <button
          onClick={() => { fetchJobs(); fetchColStats(); fetchEmailLogs(); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm text-zinc-300 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Collection stats */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Collection Counts</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {colStats.map(s => (
            <div key={s.collection} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-2">
              <div className="text-zinc-500">{s.icon}</div>
              <div className="text-2xl font-bold text-white">
                {s.count === null ? '…' : s.count === -1 ? '—' : s.count.toLocaleString()}
              </div>
              <div className="text-xs text-zinc-400">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Cron jobs */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Cron Jobs</h2>
        {jobsError && (
          <div className="flex items-center gap-2 mb-4 px-4 py-3 rounded-lg bg-red-950/40 border border-red-800 text-red-300 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {jobsError} — make sure VITE_CRON_SECRET is set and the server is running
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {jobCards.map(({ id, meta, record }) => (
            <div key={id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <StatusIcon status={record?.lastStatus ?? null} />
                    <span className="font-semibold text-white text-sm">{meta.label}</span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">{meta.description}</p>
                </div>
                <span className="text-xs text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded shrink-0">{meta.schedule}</span>
              </div>

              {record ? (
                <div className="text-xs text-zinc-400 space-y-1">
                  <div className="flex gap-4">
                    <span>Last run: <span className="text-zinc-300">{record.lastRunAt ? formatRelative(record.lastRunAt.seconds) : 'never'}</span></span>
                    <span>Duration: <span className="text-zinc-300">{record.durationMs}ms</span></span>
                  </div>
                  {record.lastResult && Object.keys(record.lastResult).length > 0 && (
                    <div className="bg-zinc-800 rounded px-2 py-1 font-mono text-zinc-400 truncate">
                      {JSON.stringify(record.lastResult)}
                    </div>
                  )}
                </div>
              ) : jobsLoading ? (
                <div className="text-xs text-zinc-600">Loading…</div>
              ) : (
                <div className="text-xs text-zinc-600">Never run</div>
              )}

              <div className="mt-auto">
                <button
                  onClick={() => triggerJob(id)}
                  disabled={triggering === id}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-50 transition-colors"
                >
                  {triggering === id
                    ? <RefreshCw className="w-3 h-3 animate-spin" />
                    : <Play className="w-3 h-3" />
                  }
                  {triggering === id ? 'Running…' : 'Run now'}
                </button>
                {triggerMsg[id] && (
                  <p className="text-xs mt-1.5 text-zinc-400 break-all">{triggerMsg[id]}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent email logs */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Recent Email Activity</h2>
        {emailLogs.length === 0 ? (
          <p className="text-sm text-zinc-600">No email logs found.</p>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-xs text-zinc-500 uppercase">
                  <th className="text-left px-4 py-3">Recipient</th>
                  <th className="text-left px-4 py-3">Type</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Sent</th>
                </tr>
              </thead>
              <tbody>
                {emailLogs.map((log, i) => (
                  <tr key={log.id} className={i < emailLogs.length - 1 ? 'border-b border-zinc-800/60' : ''}>
                    <td className="px-4 py-3 text-zinc-300 truncate max-w-[180px]">{log.to}</td>
                    <td className="px-4 py-3 text-zinc-400">{log.type}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                        log.status === 'sent' ? 'bg-emerald-950/50 text-emerald-400' : 'bg-red-950/50 text-red-400'
                      }`}>
                        {log.status === 'sent' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">
                      {log.sentAt ? formatRelative(log.sentAt.seconds) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
