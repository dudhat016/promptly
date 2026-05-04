import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, getDocs, orderBy, limit } from 'firebase/firestore';
import { EmailNotification } from '../../types';
import { Mail, Check, X } from 'lucide-react';

export default function AdminEmails() {
  const [notifications, setNotifications] = useState<EmailNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      try {
        const q = query(collection(db, 'email_logs'), orderBy('sentAt', 'desc'), limit(50));
        const snap = await getDocs(q);
        setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() } as EmailNotification)));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, []);

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900">Email System Logs</h2>
          <p className="text-slate-500 mt-2">Monitor outgoing transactional and marketing emails.</p>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Recipient</th>
                <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Subject</th>
                <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Status</th>
                <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Sent At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={4} className="p-8 text-center text-slate-500">Loading email logs...</td></tr>
              ) : notifications.map(log => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-4">
                    <p className="font-bold text-slate-900">{log.recipientEmail}</p>
                    <p className="text-xs text-slate-500">{log.type}</p>
                  </td>
                  <td className="px-8 py-4 text-sm text-slate-600">
                    {log.data?.subject || 'N/A'}
                  </td>
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-2">
                      {log.status === 'sent' ? (
                        <span className="flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase">
                          <Check className="w-3 h-3" /> Sent
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 bg-rose-100 text-rose-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase">
                          <X className="w-3 h-3" /> Failed
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-4 text-xs font-medium text-slate-500">
                    {new Date(log.sentAt?.seconds ? log.sentAt.seconds * 1000 : Date.now()).toLocaleString()}
                  </td>
                </tr>
              ))}
              {!loading && notifications.length === 0 && (
                <tr><td colSpan={4} className="p-8 text-center text-slate-500 font-bold">No email logs found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
