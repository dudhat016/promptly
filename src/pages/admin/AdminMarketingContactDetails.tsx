import { collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, updateDoc, where } from 'firebase/firestore';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Clock,
  Database,
  Edit2,
  Mail,
  MailOpen, MousePointer2, Send,
  Shield,
  Tag as TagIcon,
  Trash2,
  TrendingUp
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { usePath } from '../../hooks/usePath';
import { AdminPageHeader } from '../../components/admin';
import Button from '../../components/primitives/Button';
import Textarea from '../../components/primitives/Textarea';
import { db } from '../../lib/firebase';
import { cn } from '../../lib/utils';
import { ActivityItem, Contact, Tag } from '../../types';

export default function AdminMarketingContactDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { prefix } = usePath();
  const [contact, setContact] = useState<Contact | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'timeline' | 'details' | 'marketing'>('timeline');
  const [note, setNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [emailStats, setEmailStats] = useState({ sent: 0, opens: 0, clicks: 0, lastSentAt: null as any });

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      try {
        // Fetch Contact
        const contactDoc = await getDoc(doc(db, 'marketing_contacts', id));
        if (!contactDoc.exists()) {
          toast.error('Contact not found');
          navigate(prefix('/admin/marketing/contacts'));
          return;
        }
        const contactData = { id: contactDoc.id, ...contactDoc.data() } as Contact;
        setContact(contactData);
        setNote(contactData.notes || '');

        // Fetch Tags for lookup
        const tagsSnap = await getDocs(collection(db, 'marketing_tags'));
        setTags(tagsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Tag)));

        // Fetch Activities
        const q = query(
          collection(db, 'marketing_activities'),
          where('contactId', '==', id),
          orderBy('timestamp', 'desc')
        );
        const activitySnap = await getDocs(q);
        setActivities(activitySnap.docs.map(d => ({ id: d.id, ...d.data() } as ActivityItem)));

        // Fetch real email metrics for this contact
        const logsSnap = await getDocs(query(
          collection(db, 'email_logs'),
          where('recipientEmail', '==', contactData.email),
          orderBy('sentAt', 'desc'),
          limit(200)
        ));
        const logs = logsSnap.docs.map(d => d.data());
        setEmailStats({
          sent:      logs.filter(l => l.status === 'sent').length,
          opens:     logs.filter(l => (l.opens || 0) > 0).length,
          clicks:    logs.filter(l => (l.clicks || 0) > 0).length,
          lastSentAt: logs.length > 0 ? logs[0].sentAt : null,
        });

      } catch (err) {
        console.error(err);
        toast.error('Failed to load contact data');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id, navigate]);

  const handleSaveNote = async () => {
    if (!id) return;
    setSavingNote(true);
    try {
      await updateDoc(doc(db, 'marketing_contacts', id), { notes: note, updatedAt: new Date().toISOString() });
      toast.success('Note saved');
    } catch {
      toast.error('Failed to save note');
    } finally {
      setSavingNote(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !confirm('Permanently delete this contact?')) return;
    try {
      await deleteDoc(doc(db, 'marketing_contacts', id));
      toast.success('Contact deleted');
      navigate(prefix('/admin/marketing/contacts'));
    } catch (err) {
      toast.error('Failed to delete contact');
    }
  };

  if (loading) return <div className="p-20 text-center text-muted-foreground font-bold uppercase tracking-widest animate-pulse">Loading Contact Profile...</div>;
  if (!contact) return null;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        label="Marketing CRM"
        labelIcon={Send}
        title={contact.displayName || contact.email || 'Contact Detail'}
        subtitle="View engagement history, tags, and contact profile."
        actions={
          <div className="flex items-center gap-3">
            <Button
              onClick={() => navigate(prefix('/admin/marketing/contacts'))}
              variant="secondary"
              size="md"
              leftIcon={ArrowLeft}
              className="font-bold"
            >
              Back
            </Button>
            <Button
              as={Link}
              to={prefix(`/admin/marketing/contacts/${contact.id}/edit`)}
              variant="secondary"
              size="md"
              leftIcon={Edit2}
              className="font-bold"
            >
              Edit
            </Button>
            <Button
              onClick={handleDelete}
              variant="secondary"
              size="md"
              leftIcon={Trash2}
              className="text-rose-600 hover:bg-rose-500/10 border-rose-500/20 font-bold"
            >
              Delete
            </Button>
          </div>
        }
      />

      {/* Main Header Card */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="p-10 flex flex-wrap items-start justify-between gap-10">
          <div className="flex items-center gap-8">
            <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center text-primary border-4 border-white shadow-xl">
              <Database className="w-12 h-12" />
            </div>
            <div>
              <div className="flex items-center gap-4 mb-2">
                <h1 className="text-4xl font-black text-foreground tracking-tight">{contact.displayName || 'Anonymous'}</h1>
                <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                  contact.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                }`}>
                  {contact.status}
                </span>
              </div>
              <p className="text-xl text-muted-foreground font-medium flex items-center gap-3">
                <Mail className="w-5 h-5 text-primary" />
                {contact.email}
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="bg-muted/30 p-6 rounded-2xl border border-border min-w-[180px]">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-2">
                <TrendingUp className="w-3 h-3 text-emerald-500" /> Lead Score
              </p>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-black text-foreground leading-none">{contact.leadScore || 0}</span>
                <span className="text-xs font-bold text-muted-foreground mb-1">/ 100</span>
              </div>
              <div className="w-full h-1.5 bg-muted rounded-full mt-4 overflow-hidden">
                 <div
                   className={`h-full ${contact.leadScore && contact.leadScore > 70 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                   style={{ width: `${contact.leadScore || 0}%` }}
                 />
              </div>
            </div>

            <div className="bg-muted/30 p-6 rounded-2xl border border-border min-w-[180px]">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-2">
                <AlertTriangle className={`w-3 h-3 ${contact.prediction?.churnRisk === 'high' ? 'text-rose-500' : 'text-emerald-500'}`} /> Churn Risk
              </p>
              <span className={`text-2xl font-black uppercase tracking-tight ${
                contact.prediction?.churnRisk === 'high' ? 'text-rose-600' :
                contact.prediction?.churnRisk === 'medium' ? 'text-amber-600' : 'text-emerald-600'
              }`}>
                {contact.prediction?.churnRisk || 'Low'}
              </span>
              <p className="text-[10px] font-bold text-muted-foreground mt-4 uppercase">Reliability: {(contact.prediction?.probability || 92)}%</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-t border-border bg-muted/20">
          {(['timeline', 'details', 'marketing'] as const).map(tab => (
            <Button
              key={tab}
              onClick={() => setActiveTab(tab)}
              variant="ghost"
              size="lg"
              className={cn(
                "px-10 py-5 text-xs font-black uppercase tracking-[0.2em] rounded-none h-auto transition-all border-b-2",
                activeTab === tab
                ? 'border-primary text-primary bg-background'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/10'
              )}
            >
              {tab}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-10">
        {/* Left Side: Content */}
        <div className="col-span-8 space-y-10">
          {activeTab === 'timeline' && (
            <div className="bg-card rounded-2xl border border-border p-10 shadow-sm">
              <h3 className="text-xl font-bold text-foreground mb-10 flex items-center gap-3 uppercase tracking-tight">
                <Activity className="w-6 h-6 text-primary" />
                Customer Journey
              </h3>

              <div className="space-y-12 relative before:absolute before:left-[23px] before:top-2 before:bottom-2 before:w-1 before:bg-border/50">
                {activities.map((activity) => (
                  <div key={activity.id} className="relative pl-20 group">
                    <div className={`absolute left-0 top-0 w-12 h-12 rounded-2xl border-4 border-card flex items-center justify-center z-10 shadow-md transition-transform group-hover:scale-110 ${
                      activity.type.includes('email') ? 'bg-primary text-primary-foreground' :
                      activity.type.includes('tag') ? 'bg-amber-500 text-white' : 'bg-muted text-foreground'
                    }`}>
                      {activity.type.includes('email') && <Mail className="w-5 h-5" />}
                      {activity.type.includes('tag') && <TagIcon className="w-5 h-5" />}
                      {!activity.type.includes('email') && !activity.type.includes('tag') && <Clock className="w-5 h-5" />}
                    </div>
                    <div className="bg-muted/10 rounded-2xl border border-border/50 p-6 hover:border-primary/20 transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{activity.type.replace(/_/g, ' ')}</span>
                        <span className="text-xs font-bold text-muted-foreground flex items-center gap-2">
                          <Calendar className="w-3 h-3" />
                          {activity.timestamp?.toDate().toLocaleString()}
                        </span>
                      </div>
                      <p className="text-lg font-bold text-foreground mb-4">{activity.description}</p>
                      {activity.metadata && (
                        <div className="grid grid-cols-2 gap-4">
                           {Object.entries(activity.metadata).map(([key, val]) => (
                             <div key={key} className="bg-background/50 rounded-lg p-3 border border-border/50">
                               <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">{key}</p>
                               <p className="text-xs font-bold text-foreground">{String(val)}</p>
                             </div>
                           ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {activities.length === 0 && (
                  <div className="text-center py-20 bg-muted/20 rounded-2xl border-2 border-dashed border-border">
                    <Clock className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">No activity history found.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'details' && (
            <div className="bg-card rounded-2xl border border-border p-10 shadow-sm space-y-12">
               <section>
                 <h3 className="text-xl font-bold text-foreground mb-8 flex items-center gap-3 uppercase tracking-tight">
                   <Shield className="w-6 h-6 text-primary" />
                   System Information
                 </h3>
                 <div className="grid grid-cols-2 gap-6">
                    <div className="bg-muted/30 p-6 rounded-xl border border-border">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Internal ID</p>
                      <p className="text-sm font-mono text-foreground break-all">{contact.id}</p>
                    </div>
                    <div className="bg-muted/30 p-6 rounded-xl border border-border">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Created Date</p>
                      <p className="text-sm font-bold text-foreground">{contact.createdAt?.toDate().toLocaleString()}</p>
                    </div>
                 </div>
               </section>

               <section>
                 <h3 className="text-xl font-bold text-foreground mb-8 flex items-center gap-3 uppercase tracking-tight">
                   <Edit2 className="w-6 h-6 text-primary" />
                   Custom Fields
                 </h3>
                 <div className="bg-muted/20 rounded-2xl border border-border divide-y divide-border">
                    {Object.entries(contact.customFields || {}).map(([key, val]) => (
                      <div key={key} className="flex items-center justify-between p-6">
                        <span className="font-bold text-muted-foreground uppercase tracking-widest text-xs">{key}</span>
                        <span className="font-bold text-foreground">{String(val)}</span>
                      </div>
                    ))}
                    {Object.keys(contact.customFields || {}).length === 0 && (
                      <div className="p-10 text-center text-muted-foreground italic text-sm">No custom fields defined for this contact.</div>
                    )}
                 </div>
               </section>
            </div>
          )}

          {activeTab === 'marketing' && (
            <div className="bg-card rounded-2xl border border-border p-10 shadow-sm space-y-12">
               <section>
                 <h3 className="text-xl font-bold text-foreground mb-8 flex items-center gap-3 uppercase tracking-tight">
                   <TagIcon className="w-6 h-6 text-primary" />
                   Active Tags
                 </h3>
                 <div className="flex flex-wrap gap-3">
                    {contact.tags.map(tId => {
                      const tag = tags.find(t => t.id === tId);
                      return tag ? (
                        <div key={tId} className="group flex items-center gap-3 bg-muted/30 pl-4 pr-2 py-2 rounded-xl border border-border hover:border-primary/30 transition-all">
                           <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
                           <span className="text-xs font-bold text-foreground uppercase tracking-widest">{tag.name}</span>
                        </div>
                      ) : null;
                    })}
                    {contact.tags.length === 0 && <p className="text-muted-foreground italic">No tags assigned.</p>}
                 </div>
               </section>
            </div>
          )}
        </div>

        {/* Right Side: Quick Stats & Actions */}
        <div className="col-span-4 space-y-8">
           <div className="bg-foreground text-background rounded-2xl p-8 shadow-xl">
             <h4 className="text-xs font-black uppercase tracking-[0.2em] mb-8 flex items-center gap-2 opacity-60">
               <Activity className="w-4 h-4" /> Engagement Metrics
             </h4>

             <div className="space-y-6">
                <div className="flex items-center justify-between pb-6 border-b border-background/10">
                   <div className="flex items-center gap-3">
                     <div className="p-2 bg-background/10 rounded-lg"><MailOpen className="w-4 h-4" /></div>
                     <span className="text-xs font-bold uppercase">Open Rate</span>
                   </div>
                   <span className="text-xl font-black">
                     {emailStats.sent > 0 ? `${Math.round((emailStats.opens / emailStats.sent) * 100)}%` : '—'}
                   </span>
                </div>
                <div className="flex items-center justify-between pb-6 border-b border-background/10">
                   <div className="flex items-center gap-3">
                     <div className="p-2 bg-background/10 rounded-lg"><MousePointer2 className="w-4 h-4" /></div>
                     <span className="text-xs font-bold uppercase">Click Rate</span>
                   </div>
                   <span className="text-xl font-black">
                     {emailStats.sent > 0 ? `${Math.round((emailStats.clicks / emailStats.sent) * 100)}%` : '—'}
                   </span>
                </div>
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                     <div className="p-2 bg-background/10 rounded-lg"><Calendar className="w-4 h-4" /></div>
                     <span className="text-xs font-bold uppercase">Last Contacted</span>
                   </div>
                   <span className="text-xs font-bold uppercase">
                     {emailStats.lastSentAt
                       ? (() => { try { const d = emailStats.lastSentAt.toDate ? emailStats.lastSentAt.toDate() : new Date(emailStats.lastSentAt.seconds * 1000); return d.toLocaleDateString(); } catch { return '—'; } })()
                       : '—'}
                   </span>
                </div>
             </div>

             <Button
               as={Link}
               to={prefix('/admin/emails/broadcast')}
               variant="primary"
               size="lg"
               fullWidth
               leftIcon={Mail}
               className="py-5 mt-10 shadow-lg font-bold"
             >
               Send Campaign Now
             </Button>
           </div>

           <div className="bg-card rounded-2xl border border-border p-8 shadow-sm">
             <h4 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground mb-6">CRM Notes</h4>
             <Textarea
               placeholder="Add a private note about this contact..."
               variant="filled"
               className="min-h-[150px]"
               value={note}
               onChange={e => setNote(e.target.value)}
             />
             <Button
                onClick={handleSaveNote}
                isLoading={savingNote}
                disabled={!note.trim()}
                variant="secondary"
                size="sm"
                fullWidth
                className="py-3 mt-4 text-[10px] font-bold"
              >
                Save Note
              </Button>
           </div>
        </div>
      </div>
    </div>
  );
}
