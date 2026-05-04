import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Filter, UserPlus, Mail, Tag as TagIcon, 
  MoreVertical, Trash2, Edit2, ChevronDown, Download,
  CheckCircle2, XCircle, Clock, Database, Users, Send, X
} from 'lucide-react';
import { Contact, Tag, Segment, EmailTemplate } from '../../types';
import { EmailService } from '../../services/emailService';
import { toast } from 'react-hot-toast';

interface Props {
  contacts: Contact[];
  tags: Tag[];
  segments: Segment[];
  templates: EmailTemplate[];
  onAddContact: () => void;
  onEditContact: (contact: Contact) => void;
  onDeleteContact: (id: string) => void;
}

export default function ContactManager({ 
  contacts, tags, segments, templates,
  onAddContact, onEditContact, onDeleteContact 
}: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'unsubscribed'>('all');
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
  const [sendingEmailTo, setSendingEmailTo] = useState<Contact | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSendEmail = async () => {
    if (!sendingEmailTo || !selectedTemplate) return;
    setIsSending(true);
    try {
      await EmailService.sendEmailWithTemplate(
        sendingEmailTo.id,
        sendingEmailTo.email,
        selectedTemplate,
        { name: sendingEmailTo.displayName || 'User' }
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

  const filteredContacts = contacts.filter(c => {
    const matchesSearch = c.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         c.displayName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = activeFilter === 'all' || c.status === activeFilter;
    
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

  return (
    <div className="space-y-8">
      {/* Search and Filters */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 p-6 flex flex-wrap items-center gap-6 shadow-sm">
        <div className="flex-1 min-w-[300px] relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
          <input 
            type="text"
            placeholder="Search contacts by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-indigo-600 transition-all"
          />
        </div>
        
        <div className="flex bg-slate-50 p-1.5 rounded-2xl">
          {(['all', 'active', 'unsubscribed'] as const).map(filter => (
            <button 
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeFilter === filter ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {filter}
            </button>
          ))}
        </div>

        <div className="relative group">
          <button className="flex items-center gap-2 bg-slate-50 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-600 border border-transparent hover:border-slate-200">
            <Filter className="w-4 h-4" />
            {selectedSegment ? segments.find(s => s.id === selectedSegment)?.name : 'Segments'}
            <ChevronDown className="w-4 h-4" />
          </button>
          <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-slate-100 rounded-3xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 p-4">
             <button onClick={() => setSelectedSegment(null)} className="w-full text-left p-3 rounded-xl hover:bg-slate-50 text-xs font-bold text-slate-600">All Contacts</button>
             {segments.map(s => (
               <button 
                key={s.id} 
                onClick={() => setSelectedSegment(s.id)}
                className="w-full text-left p-3 rounded-xl hover:bg-indigo-50 text-xs font-bold text-slate-900"
               >
                 {s.name}
               </button>
             ))}
          </div>
        </div>
      </div>

      {/* Grid view of contacts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredContacts.map(contact => (
            <motion.div 
              key={contact.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-100 rounded-[2.5rem] p-8 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-50/50 transition-all group relative overflow-hidden"
            >
              <div className="flex items-start justify-between relative z-10">
                <div className="flex items-start gap-6">
                  <div className="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all shrink-0">
                    <Database className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">
                      {contact.displayName || 'Anonymous'}
                    </h3>
                    <p className="text-sm font-bold text-slate-400 mb-4">{contact.email}</p>
                    
                    <div className="flex flex-wrap gap-2">
                       {contact.tags.map(tId => {
                         const tag = tags.find(t => t.id === tId);
                         return tag ? (
                           <span key={tId} className="px-3 py-1 rounded-lg text-[10px] font-black uppercase" style={{ backgroundColor: tag.color + '15', color: tag.color }}>
                            {tag.name}
                           </span>
                         ) : null;
                       })}
                       {contact.tags.length === 0 && <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">No Tags</span>}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-3">
                  <div className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${
                    contact.status === 'active' ? 'bg-green-100 text-green-700' : 
                    contact.status === 'unsubscribed' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {contact.status === 'active' && <CheckCircle2 className="w-3 h-3" />}
                    {contact.status === 'unsubscribed' && <XCircle className="w-3 h-3" />}
                    {contact.status}
                  </div>
                  
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => setSendingEmailTo(contact)}
                      className="p-3 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all"
                      title="Send Email"
                    >
                      <Mail className="w-4 h-4" />
                    </button>
                    <button onClick={() => onEditContact(contact)} className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => onDeleteContact(contact.id)} className="p-3 bg-rose-50 text-rose-600 rounded-2xl hover:bg-rose-600 hover:text-white transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Stats / Activity Bar */}
              <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> Last Active: Just now</span>
                </div>
                <button className="text-indigo-600 hover:underline">View History</button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredContacts.length === 0 && (
          <div className="col-span-full py-32 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
              <Users className="w-10 h-10 text-slate-200" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">No contacts found</h3>
            <p className="text-slate-400 font-medium">Try adjusting your search or filters to find what you're looking for.</p>
          </div>
        )}
      </div>

      {/* Send Email Modal */}
      <AnimatePresence>
        {sendingEmailTo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black text-slate-900">Send Campaign</h3>
                  <p className="text-slate-500 font-medium">To: {sendingEmailTo.email}</p>
                </div>
                <button onClick={() => setSendingEmailTo(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-8 space-y-6">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Select Template</label>
                  <div className="grid gap-3 max-h-[300px] overflow-y-auto pr-2">
                    {templates.map(t => (
                      <button 
                        key={t.id}
                        onClick={() => setSelectedTemplate(t.id)}
                        className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center justify-between group ${selectedTemplate === t.id ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-100 hover:border-slate-200 bg-slate-50/30'}`}
                      >
                        <div className="overflow-hidden">
                          <p className="font-bold text-slate-900 truncate">{t.name}</p>
                          <p className="text-[10px] text-slate-500 truncate">{t.subject}</p>
                        </div>
                        {selectedTemplate === t.id && <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0" />}
                      </button>
                    ))}
                    {templates.length === 0 && <p className="text-center text-slate-400 py-8 text-xs font-bold uppercase">No templates found</p>}
                  </div>
                </div>

                <div className="pt-4 flex gap-4">
                  <button 
                    onClick={handleSendEmail}
                    disabled={!selectedTemplate || isSending}
                    className="flex-grow bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Send className="w-5 h-5" />
                    {isSending ? 'Sending...' : 'Send Now'}
                  </button>
                  <button 
                    onClick={() => setSendingEmailTo(null)}
                    className="px-8 bg-slate-100 text-slate-600 font-bold py-4 rounded-2xl hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {contacts.length > 0 && (
        <div className="flex justify-center pt-8">
           <button className="flex items-center gap-2 px-8 py-4 bg-white border border-slate-100 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
             <Download className="w-4 h-4" />
             Export Contacts (CSV)
           </button>
        </div>
      )}
    </div>
  );
}
