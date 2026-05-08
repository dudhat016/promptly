import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  X, Mail, Tag as TagIcon, Clock, TrendingUp, AlertTriangle,
  CheckCircle2, Database, ExternalLink, Activity, ArrowLeft,
  Edit2, Trash2, Shield, Calendar, MailOpen, MousePointer2, Send
} from 'lucide-react';
import { AdminPageHeader } from '../../components/admin';
import { collection, query, where, getDocs, orderBy, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Contact, Tag, ActivityItem } from '../../types';
import { toast } from 'react-hot-toast';

export default function AdminMarketingContactDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contact, setContact] = useState<Contact | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'timeline' | 'details' | 'marketing'>('timeline');

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      try {
        // Fetch Contact
        const contactDoc = await getDoc(doc(db, 'marketing_contacts', id));
        if (!contactDoc.exists()) {
          toast.error('Contact not found');
          navigate('/admin/marketing/contacts');
          return;
        }
        setContact({ id: contactDoc.id, ...contactDoc.data() } as Contact);

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

      } catch (err) {
        console.error(err);
        toast.error('Failed to load contact data');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id, navigate]);

  const handleDelete = async () => {
    if (!id || !confirm('Permanently delete this contact?')) return;
    try {
      await deleteDoc(doc(db, 'marketing_contacts', id));
      toast.success('Contact deleted');
      navigate('/admin/marketing/contacts');
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
            <button onClick={() => navigate('/admin/marketing/contacts')} className="btn-secondary">
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <Link to={`/admin/marketing/contacts/edit/${contact.id}`} className="btn-secondary">
              <Edit2 className="w-4 h-4" />
              Edit
            </Link>
            <button onClick={handleDelete} className="btn-secondary text-rose-600 hover:bg-rose-500/10 border-rose-500/20">
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
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
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-10 py-5 text-xs font-black uppercase tracking-[0.2em] transition-all border-b-2 ${
                activeTab === tab 
                ? 'border-primary text-primary bg-background' 
                : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab}
            </button>
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
                      activity.type.includes('email') ? 'bg-primary text-white' :
                      activity.type.includes('tag') ? 'bg-amber-500 text-white' : 'bg-muted text-foreground'
                    }`}>
                      {activity.type.includes('email') && <Mail className="w-5 h-5" />}
                      {activity.type.includes('tag') && <TagIcon className="w-5 h-5" />}
                      {!activity.type.includes('email') && !activity.type.includes('tag') && <Clock className="w-5 h-5" />}
                    </div>
                    <div className="bg-muted/10 rounded-2xl border border-border/50 p-6 hover:border-primary/20 transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{activity.type.replace('_', ' ')}</span>
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
                   <span className="text-xl font-black">24%</span>
                </div>
                <div className="flex items-center justify-between pb-6 border-b border-background/10">
                   <div className="flex items-center gap-3">
                     <div className="p-2 bg-background/10 rounded-lg"><MousePointer2 className="w-4 h-4" /></div>
                     <span className="text-xs font-bold uppercase">Click Rate</span>
                   </div>
                   <span className="text-xl font-black">8.4%</span>
                </div>
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                     <div className="p-2 bg-background/10 rounded-lg"><Calendar className="w-4 h-4" /></div>
                     <span className="text-xs font-bold uppercase">Last Contacted</span>
                   </div>
                   <span className="text-xs font-bold uppercase">3 Days Ago</span>
                </div>
             </div>

             <button className="w-full btn-primary py-5 mt-10 shadow-lg">
               <Mail className="w-5 h-5" />
               Send Campaign Now
             </button>
           </div>

           <div className="bg-card rounded-2xl border border-border p-8 shadow-sm">
             <h4 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground mb-6">CRM Notes</h4>
             <textarea 
               placeholder="Add a private note about this contact..."
               className="w-full bg-muted/30 border-none rounded-xl p-4 text-sm font-medium focus:ring-1 focus:ring-primary/20 min-h-[150px] transition-all"
             />
             <button className="w-full btn-secondary py-3 mt-4 text-[10px]">Save Note</button>
           </div>
        </div>
      </div>
    </div>
  );
}
