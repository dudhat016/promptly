import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Filter, Mail, MoreVertical, Trash2, Edit2, ChevronDown, Download,
  CheckCircle2, XCircle, Clock, Database, Users, Send, X, Tag as TagIcon
} from 'lucide-react';
import { collection, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Contact, Tag, Segment, EmailTemplate } from '../../types';
import { EmailService } from '../../services/emailService';
import { CRMService } from '../../services/crmService';
import { toast } from 'react-hot-toast';

export default function ContactManager() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'unsubscribed' | 'at_risk'>('all');
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
  const [sendingEmailTo, setSendingEmailTo] = useState<Contact | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  // Bulk Actions State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkTagging, setIsBulkTagging] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [cSnap, tSnap, sSnap, tmpSnap] = await Promise.all([
          getDocs(collection(db, 'marketing_contacts')),
          getDocs(collection(db, 'marketing_tags')),
          getDocs(collection(db, 'marketing_segments')),
          getDocs(collection(db, 'templates'))
        ]);
        setContacts(cSnap.docs.map(d => ({ id: d.id, ...d.data() } as Contact)));
        setTags(tSnap.docs.map(d => ({ id: d.id, ...d.data() } as Tag)));
        setSegments(sSnap.docs.map(d => ({ id: d.id, ...d.data() } as Segment)));
        setTemplates(tmpSnap.docs.map(d => ({ id: d.id, ...d.data() } as EmailTemplate)));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleDeleteContact = async (id: string) => {
    if (!confirm('Delete contact?')) return;
    try {
      await deleteDoc(doc(db, 'marketing_contacts', id));
      setContacts(prev => prev.filter(c => c.id !== id));
      setSelectedIds(prev => prev.filter(p => p !== id));
      toast.success('Contact deleted');
    } catch (err) {
      toast.error('Failed to delete contact');
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.length} contacts?`)) return;
    try {
      await Promise.all(selectedIds.map(id => deleteDoc(doc(db, 'marketing_contacts', id))));
      setContacts(prev => prev.filter(c => !selectedIds.includes(c.id)));
      setSelectedIds([]);
      toast.success(`Deleted ${selectedIds.length} contacts`);
    } catch (err) {
      toast.error('Failed to delete some contacts');
    }
  };

  const handleBulkTag = async (tagId: string) => {
    try {
      await Promise.all(selectedIds.map(async (id) => {
        const contact = contacts.find(c => c.id === id);
        if (contact && !contact.tags.includes(tagId)) {
          const newTags = [...contact.tags, tagId];
          await updateDoc(doc(db, 'marketing_contacts', id), { tags: newTags });
          setContacts(prev => prev.map(c => c.id === id ? { ...c, tags: newTags } : c));
        }
      }));
      setIsBulkTagging(false);
      toast.success('Tags applied successfully');
    } catch (err) {
      toast.error('Failed to apply tags');
    }
  };

  const handleSendEmail = async () => {
    if (!sendingEmailTo || !selectedTemplate) return;
    const template = templates.find(t => t.id === selectedTemplate);
    setIsSending(true);
    try {
      await EmailService.sendEmailWithTemplate(
        sendingEmailTo.id,
        sendingEmailTo.email,
        selectedTemplate,
        { name: sendingEmailTo.displayName || 'User' }
      );
      
      // Log CRM Activity
      await CRMService.logActivity(
        sendingEmailTo.id,
        'email_sent',
        `Campaign Email Sent: ${template?.name || 'Unknown'}`,
        { templateId: selectedTemplate, subject: template?.subject }
      );

      toast.success('Campaign email sent!');
      setSendingEmailTo(null);
      setSelectedTemplate('');
    } catch (err) {
      console.error(err);
      toast.error('Failed to send email');
    } finally {
      setIsSending(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredContacts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredContacts.map(c => c.id));
    }
  };

  const toggleSelectContact = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const filteredContacts = contacts.filter(c => {
    const matchesSearch = c.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         c.displayName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = activeFilter === 'all' || 
                         (activeFilter === 'at_risk' ? c.prediction?.churnRisk === 'high' : c.status === activeFilter);
    
    // Segment logic
    let matchesSegment = true;
    if (selectedSegment) {
      const segment = segments.find(s => s.id === selectedSegment);
      if (segment && segment.filters?.length > 0) {
        const results = segment.filters.map(f => {
          const cValue = (c as any)[f.field];
          const targetValue = f.value;
          
          if (f.operator === 'equals') return String(cValue) === String(targetValue);
          if (f.operator === 'contains') {
            if (Array.isArray(cValue)) return cValue.some(v => String(v).toLowerCase().includes(String(targetValue).toLowerCase()));
            return String(cValue).toLowerCase().includes(String(targetValue).toLowerCase());
          }
          if (f.operator === 'greater_than') return Number(cValue) > Number(targetValue);
          if (f.operator === 'less_than') return Number(cValue) < Number(targetValue);
          if (f.operator === 'in') {
            const list = String(targetValue).split(',').map(s => s.trim());
            return list.includes(String(cValue));
          }
          if (f.operator === 'not_in') {
            const list = String(targetValue).split(',').map(s => s.trim());
            return !list.includes(String(cValue));
          }
          return true;
        });

        if (segment.matchType === 'or') {
          matchesSegment = results.some(r => r);
        } else {
          matchesSegment = results.every(r => r);
        }
      }
    }

    return matchesSearch && matchesFilter && matchesSegment;
  });

  if (loading) return <div className="p-20 text-center text-muted-foreground font-bold uppercase tracking-widest animate-pulse">Loading Contacts...</div>;

  return (
    <div className="space-y-8 pb-20">
      {/* Search and Filters */}
      <div className="bg-card rounded-lg border border-border p-6 flex flex-wrap items-center gap-6 shadow-sm">
        <div className="flex-1 min-w-[300px] relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input 
            type="text"
            placeholder="Search contacts by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-muted/50 border-none rounded-md py-4 pl-12 pr-4 text-sm font-bold focus:ring-1 focus:ring-primary/20 transition-all"
          />
        </div>
        
        <div className="flex bg-muted/50 p-1 rounded-md">
          {(['all', 'active', 'unsubscribed', 'at_risk'] as const).map(filter => (
            <button 
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-6 py-2 rounded-md text-xs font-bold uppercase tracking-widest transition-all ${activeFilter === filter ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {filter.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="relative group">
          <button className="flex items-center gap-2 bg-muted/50 px-6 py-3 rounded-md text-xs font-bold uppercase tracking-widest text-muted-foreground border border-transparent hover:border-border">
            <Filter className="w-4 h-4" />
            {selectedSegment ? segments.find(s => s.id === selectedSegment)?.name : 'Segments'}
            <ChevronDown className="w-4 h-4" />
          </button>
          <div className="absolute top-full right-0 mt-2 w-64 bg-card border border-border rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 p-4">
             <button onClick={() => setSelectedSegment(null)} className="w-full text-left p-3 rounded-md hover:bg-muted/50 text-xs font-bold text-muted-foreground">All Contacts</button>
             {segments.map(s => (
               <button 
                key={s.id} 
                onClick={() => setSelectedSegment(s.id)}
                className="w-full text-left p-3 rounded-md hover:bg-primary/8 text-xs font-bold text-foreground"
               >
                 {s.name}
               </button>
             ))}
          </div>
        </div>
      </div>

      {/* Table view of contacts */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground border-b border-border">
                <th className="p-8 w-12">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.length === filteredContacts.length && filteredContacts.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20"
                  />
                </th>
                <th className="p-8">Contact</th>
                <th className="p-8">Tags</th>
                <th className="p-8">Lead Score</th>
                <th className="p-8">Risk</th>
                <th className="p-8">Status</th>
                <th className="p-8 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <AnimatePresence mode="popLayout">
                {filteredContacts.map(contact => (
                  <motion.tr 
                    key={contact.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={`tr group ${selectedIds.includes(contact.id) ? 'bg-primary/5' : ''}`}
                  >
                    <td className="p-8">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(contact.id)}
                        onChange={() => toggleSelectContact(contact.id)}
                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20"
                      />
                    </td>
                    <td className="p-8">
                      <Link 
                        to={`/admin/marketing/contacts/${contact.id}`}
                        className="flex items-center gap-4 text-left group/name"
                      >
                        <div className="w-12 h-12 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground group-hover/name:bg-primary/10 group-hover/name:text-primary transition-all shrink-0">
                          <Database className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-bold text-foreground uppercase tracking-tight group-hover/name:text-primary transition-colors">{contact.displayName || 'Anonymous'}</p>
                          <p className="text-xs font-bold text-muted-foreground">{contact.email}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="p-8">
                      <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                         {contact.tags.map(tId => {
                           const tag = tags.find(t => t.id === tId);
                           return tag ? (
                             <span key={tId} className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase" style={{ backgroundColor: tag.color + '15', color: tag.color }}>
                              {tag.name}
                             </span>
                           ) : null;
                         })}
                         {contact.tags.length === 0 && <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest italic opacity-40">No Tags</span>}
                      </div>
                    </td>
                    <td className="p-8">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-[60px]">
                          <div 
                            className={`h-full ${contact.leadScore && contact.leadScore > 70 ? 'bg-emerald-500' : contact.leadScore && contact.leadScore > 30 ? 'bg-amber-500' : 'bg-muted-foreground/40'}`}
                            style={{ width: `${contact.leadScore || 0}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-foreground">{contact.leadScore || 0}</span>
                      </div>
                    </td>
                    <td className="p-8">
                      {contact.prediction ? (
                        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-tight ${
                          contact.prediction.churnRisk === 'low' ? 'text-emerald-600 bg-emerald-500/10' :
                          contact.prediction.churnRisk === 'medium' ? 'text-amber-600 bg-amber-500/10' : 'text-rose-600 bg-rose-500/10'
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            contact.prediction.churnRisk === 'low' ? 'bg-emerald-500' :
                            contact.prediction.churnRisk === 'medium' ? 'bg-amber-500' : 'bg-rose-500'
                          }`} />
                          {contact.prediction.churnRisk}
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-muted-foreground/40 uppercase">No Data</span>
                      )}
                    </td>
                    <td className="p-8">
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border ${
                        contact.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 
                        contact.status === 'unsubscribed' ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' : 'bg-muted text-muted-foreground border-border'
                      }`}>
                        {contact.status === 'active' && <CheckCircle2 className="w-3 h-3" />}
                        {contact.status === 'unsubscribed' && <XCircle className="w-3 h-3" />}
                        {contact.status}
                      </div>
                    </td>
                    <td className="p-8 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => setSendingEmailTo(contact)}
                          className="p-3 text-muted-foreground hover:text-primary transition-colors"
                          title="Send Email"
                        >
                          <Mail className="w-4 h-4" />
                        </button>
                        <Link to={`/admin/marketing/contacts/edit/${contact.id}`} className="p-3 text-muted-foreground hover:text-primary transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </Link>
                        <button onClick={() => handleDeleteContact(contact.id)} className="p-3 text-muted-foreground hover:text-rose-600 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {filteredContacts.length === 0 && (
          <div className="p-20 text-center">
            <div className="w-16 h-16 bg-muted/50 rounded-md flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-muted-foreground/20" />
            </div>
            <h3 className="font-bold text-foreground mb-1">No contacts found</h3>
            <p className="text-sm text-muted-foreground font-medium">Try adjusting your filters or search terms.</p>
          </div>
        )}
      </div>

      {/* Floating Bulk Action Bar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-foreground text-background px-8 py-4 rounded-full shadow-2xl flex items-center gap-8 z-50 min-w-[500px]"
          >
            <div className="flex items-center gap-4 border-r border-background/20 pr-8">
              <span className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
                {selectedIds.length}
              </span>
              <span className="text-sm font-bold uppercase tracking-widest">Contacts Selected</span>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsBulkTagging(!isBulkTagging)}
                className="flex items-center gap-2 px-4 py-2 hover:bg-background/10 rounded-md text-xs font-bold uppercase tracking-widest transition-all"
              >
                <TagIcon className="w-4 h-4" />
                Add Tags
              </button>
              <button 
                className="flex items-center gap-2 px-4 py-2 hover:bg-background/10 rounded-md text-xs font-bold uppercase tracking-widest transition-all"
              >
                <Send className="w-4 h-4" />
                Bulk Email
              </button>
              <button 
                onClick={handleBulkDelete}
                className="flex items-center gap-2 px-4 py-2 hover:bg-rose-500/20 text-rose-400 rounded-md text-xs font-bold uppercase tracking-widest transition-all"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>

            <button 
              onClick={() => setSelectedIds([])}
              className="ml-auto p-2 hover:bg-background/10 rounded-full transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Sub-menu for Bulk Tagging */}
            {isBulkTagging && (
              <div className="absolute bottom-full left-0 mb-4 w-64 bg-card border border-border rounded-lg shadow-2xl p-4 overflow-hidden">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 px-2">Select Tag to Apply</div>
                <div className="max-h-[200px] overflow-y-auto space-y-1">
                  {tags.map(tag => (
                    <button 
                      key={tag.id}
                      onClick={() => handleBulkTag(tag.id)}
                      className="w-full text-left p-2 rounded-md hover:bg-primary/5 flex items-center gap-3 transition-all"
                    >
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
                      <span className="text-sm font-medium text-foreground">{tag.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>



      {contacts.length > 0 && selectedIds.length === 0 && (
        <div className="flex justify-center">
           <button className="flex items-center gap-2 px-8 py-4 bg-card border border-border rounded-md font-bold text-xs uppercase tracking-widest text-muted-foreground hover:bg-muted/50 transition-all shadow-sm">
             <Download className="w-4 h-4" />
             Export Contacts (CSV)
           </button>
        </div>
      )}

      {/* Send Email Modal */}
      <AnimatePresence>
        {sendingEmailTo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-foreground/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-card rounded-lg w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-foreground">Send Campaign</h3>
                  <p className="text-muted-foreground font-medium">To: {sendingEmailTo.email}</p>
                </div>
                <button onClick={() => setSendingEmailTo(null)} className="p-2 hover:bg-muted rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-8 space-y-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Select Template</label>
                  <div className="grid gap-3 max-h-[300px] overflow-y-auto pr-2">
                    {templates.map(t => (
                      <button 
                        key={t.id}
                        onClick={() => setSelectedTemplate(t.id)}
                        className={`w-full text-left p-4 rounded-md border-2 transition-all flex items-center justify-between group ${selectedTemplate === t.id ? 'border-primary bg-primary/10' : 'border-border hover:border-border bg-muted/20'}`}
                      >
                        <div className="overflow-hidden">
                          <p className="font-bold text-foreground truncate">{t.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{t.subject}</p>
                        </div>
                        {selectedTemplate === t.id && <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />}
                      </button>
                    ))}
                    {templates.length === 0 && <p className="text-center text-muted-foreground py-8 text-xs font-bold uppercase">No templates found</p>}
                  </div>
                </div>

                <div className="pt-4 flex gap-4">
                  <button 
                    onClick={handleSendEmail}
                    disabled={!selectedTemplate || isSending}
                    className="flex-grow btn-primary py-4"
                  >
                    <Send className="w-5 h-5" />
                    {isSending ? 'Sending...' : 'Send Now'}
                  </button>
                  <button 
                    onClick={() => setSendingEmailTo(null)}
                    className="px-8 bg-muted text-muted-foreground font-bold py-4 rounded-md hover:bg-muted transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
