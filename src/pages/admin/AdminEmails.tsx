import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, getDocs, orderBy, limit } from 'firebase/firestore';
import { EmailNotification } from '../../types';
import { Mail, Check, X } from 'lucide-react';
import { AdminPageHeader } from '../../components/admin';

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
      <AdminPageHeader
        label="Communications"
        labelIcon={Mail}
        title="Email Logs"
        subtitle="Monitor outgoing transactional and marketing emails."
      />

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="thead-row">
                <th className="th">Recipient</th>
                <th className="th">Subject</th>
                <th className="th">Status</th>
                <th className="th">Sent At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Loading email logs...</td></tr>
              ) : notifications.map(log => (
                <tr key={log.id} className="tr">
                  <td className="px-6 py-3">
                    <p className="font-bold text-foreground">{log.recipientEmail}</p>
                    <p className="text-xs text-muted-foreground">{log.type}</p>
                  </td>
                  <td className="px-6 py-3 text-sm text-muted-foreground">
                    {log.data?.subject || 'N/A'}
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      {log.status === 'sent' ? (
                        <span className="badge-green">
                          <Check className="w-3 h-3" /> Sent
                        </span>
                      ) : (
                        <span className="badge-red">
                          <X className="w-3 h-3" /> Failed
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-3 text-xs font-medium text-muted-foreground">
                    {new Date(log.sentAt?.seconds ? log.sentAt.seconds * 1000 : Date.now()).toLocaleString()}
                  </td>
                </tr>
              ))}
              {!loading && notifications.length === 0 && (
                <tr><td colSpan={4} className="p-8 text-center text-muted-foreground font-bold">No email logs found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
