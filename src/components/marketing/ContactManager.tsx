import { collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore';
import {
  CheckCircle2,
  Database,
  Send,
  Tag as TagIcon,
  Upload,
  Users,
  X
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { usePath } from '../../hooks/usePath';
import { api } from '../../lib/api';
import { db } from '../../lib/firebase';
import { cn } from '../../lib/utils';
import { CRMService } from '../../services/crmService';
import { EmailService } from '../../services/emailService';
import { Contact, EmailTemplate, Segment, Tag } from '../../types';
import DataTable, { DataTableColumn } from '../admin/DataTable';
import Tabs from '../navigation/Tabs';
import Badge from '../primitives/Badge';
import Button from '../primitives/Button';
import Select from '../primitives/Select';

export default function ContactManager() {
  const { prefix } = usePath();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'unsubscribed' | 'at_risk'>('all');
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
  const [sendingEmailTo, setSendingEmailTo] = useState<Contact | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [isSending, setIsSending] = useState(false);

  const [isBulkTagging, setIsBulkTagging] = useState(false);
  const [bulkTaggingRows, setBulkTaggingRows] = useState<Contact[]>([]);
  const [importing, setImporting] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);

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

  const handleDeleteContact = async (contact: Contact) => {
    if (!confirm('Delete contact?')) return;
    try {
      await deleteDoc(doc(db, 'marketing_contacts', contact.id));
      setContacts(prev => prev.filter(c => c.id !== contact.id));
      toast.success('Contact deleted');
    } catch (err) {
      toast.error('Failed to delete contact');
    }
  };

  const handleBulkDelete = async (rows: Contact[]) => {
    if (!confirm(`Delete ${rows.length} contacts?`)) return;
    try {
      await Promise.all(rows.map(r => deleteDoc(doc(db, 'marketing_contacts', r.id))));
      const ids = rows.map(r => r.id);
      setContacts(prev => prev.filter(c => !ids.includes(c.id)));
      toast.success(`Deleted ${rows.length} contacts`);
    } catch (err) {
      toast.error('Failed to delete some contacts');
    }
  };

  const handleBulkTag = async (tagId: string) => {
    try {
      await Promise.all(bulkTaggingRows.map(async (contact) => {
        if (!contact.tags.includes(tagId)) {
          const newTags = [...contact.tags, tagId];
          await updateDoc(doc(db, 'marketing_contacts', contact.id), { tags: newTags });
          setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, tags: newTags } : c));

          // Fire tag_added automation trigger for contacts linked to a user
          if (contact.userId) {
            await api.post('/automation/trigger', { triggerType: 'tag_added', userId: contact.userId, data: { value: tagId } }).catch(() => {});
          }
        }
      }));
      setIsBulkTagging(false);
      setBulkTaggingRows([]);
      toast.success('Tags applied successfully');
    } catch (err) {
      toast.error('Failed to apply tags');
    }
  };

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      const header = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
      const emailIdx = header.indexOf('email');
      const nameIdx  = header.indexOf('name');
      const tagsIdx  = header.indexOf('tags');
      if (emailIdx === -1) { toast.error('CSV must have an "email" column'); return; }
      const rows = lines.slice(1).map(line => {
        const cols = line.split(',').map(c => c.trim().replace(/"/g, ''));
        return {
          email: cols[emailIdx] || '',
          name:  nameIdx  !== -1 ? cols[nameIdx]  || '' : '',
          tags:  tagsIdx  !== -1 ? cols[tagsIdx]?.split('|').map(t => t.trim()).filter(Boolean) || [] : [],
        };
      }).filter(r => r.email);
      const r = await api.post('/marketing/contacts/import', { contacts: rows }) as any;
      toast.success(`Imported ${r.created}, updated ${r.updated}, skipped ${r.skipped}`);
      // Refresh the contacts list
      getDocs(collection(db, 'marketing_contacts')).then(snap =>
        setContacts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Contact)))
      ).catch(() => {});
    } catch (err: any) {
      toast.error(err?.message || 'Import failed');
    } finally {
      setImporting(false);
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

  const filteredContacts = contacts.filter(c => {
    const matchesFilter = activeFilter === 'all' ||
                         (activeFilter === 'at_risk' ? c.prediction?.churnRisk === 'high' : c.status === activeFilter);

    let matchesSegment = true;
    if (selectedSegment) {
      const segment = segments.find(s => s.id === selectedSegment);
      if (segment && segment.filters?.length > 0) {
        const results = segment.filters.map(f => {
          const cValue = (c as any)[f.field];
          const targetValue = f.value;

          if (f.operator === 'equals') return String(cValue) === String(targetValue);
          if (f.operator === 'contains') {
            if (Array.isArray(cValue)) return cValue.map(String).includes(String(targetValue));
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

    return matchesFilter && matchesSegment;
  });

  const columns: DataTableColumn<Contact>[] = [
    {
      key: 'contact',
      header: 'Contact Info',
      sortable: true,
      sortValue: c => c.displayName || c.email,
      searchValue: c => `${c.displayName} ${c.email}`,
      render: contact => (
        <div className="flex items-center gap-4 text-left group/name">
          <div className="w-12 h-12 rounded-xl bg-muted/50 border border-border/50 flex items-center justify-center text-muted-foreground group-hover/name:bg-primary/10 group-hover/name:text-primary group-hover/name:scale-105 transition-all shrink-0 shadow-sm">
            <Database className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-foreground truncate group-hover/name:text-primary transition-colors">{contact.displayName || 'Anonymous'}</p>
            <p className="text-xs font-medium text-muted-foreground truncate">{contact.email}</p>
          </div>
        </div>
      ),
      csvValue: c => `${c.displayName || 'Anonymous'} (${c.email})`,
    },
    {
      key: 'tags',
      header: 'Tags',
      render: contact => (
        <div className="flex flex-wrap gap-1.5 max-w-[220px]">
           {contact.tags.map(tId => {
             const tag = tags.find(t => t.id === tId);
             return tag ? (
               <Badge
                key={tId}
                size="sm"
                className="border-border/5"
                style={{ backgroundColor: tag.color + '15', color: tag.color }}
               >
                {tag.name}
               </Badge>
             ) : null;
           })}
           {contact.tags.length === 0 && (
             <Badge variant="soft" size="sm" className="bg-muted/50 text-muted-foreground/30 italic">
               No Tags
             </Badge>
           )}
        </div>
      ),
      csvValue: c => c.tags.map(tId => tags.find(t => t.id === tId)?.name).filter(Boolean).join(', '),
    },
    {
      key: 'leadScore',
      header: 'Lead Status',
      sortable: true,
      sortValue: c => c.leadScore || 0,
      render: contact => (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-4 max-w-[120px]">
            <span className="text-xs font-semibold text-foreground/70">Score: {contact.leadScore || 0}</span>
            <div className={`w-2 h-2 rounded-full shadow-sm animate-pulse ${
              contact.leadScore && contact.leadScore > 70 ? 'bg-emerald-500' :
              contact.leadScore && contact.leadScore > 30 ? 'bg-amber-500' : 'bg-muted-foreground/40'
            }`} />
          </div>
          <div className="w-full h-1.5 bg-muted/50 rounded-full overflow-hidden max-w-[120px] border border-border/30">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${contact.leadScore || 0}%` }}
              className={`h-full shadow-[0_0_8px_rgba(var(--primary-rgb),0.3)] ${
                contact.leadScore && contact.leadScore > 70 ? 'bg-emerald-500' :
                contact.leadScore && contact.leadScore > 30 ? 'bg-amber-500' : 'bg-muted-foreground/60'
              }`}
            />
          </div>
        </div>
      ),
      csvValue: c => c.leadScore || 0,
    },
    {
      key: 'prediction',
      header: 'Risk Profile',
      sortable: true,
      sortValue: c => c.prediction?.churnRisk || 'none',
      render: contact => contact.prediction ? (
        <Badge
          variant={
            contact.prediction.churnRisk === 'low' ? 'success' :
            contact.prediction.churnRisk === 'medium' ? 'warning' : 'error'
          }
          dot
          className="capitalize"
        >
          {contact.prediction.churnRisk} Risk
        </Badge>
      ) : (
        <span className="text-[10px] font-black text-muted-foreground/20 uppercase tracking-widest">N/A</span>
      ),
      csvValue: c => c.prediction?.churnRisk || 'N/A',
    }
  ];

  const toolbar = (
    <div className="w-full flex justify-between flex-wrap items-center gap-3">
      <Tabs
        variant="pill"
        tabs={[
          { id: 'all', label: 'All' },
          { id: 'active', label: 'Active' },
          { id: 'unsubscribed', label: 'Unsubscribed' },
          { id: 'at_risk', label: 'At Risk' },
        ]}
        activeTab={activeFilter}
        onChange={(id) => setActiveFilter(id as any)}
        tabClassName="px-4 py-1.5 rounded-lg text-xs"
        className="bg-muted/50 p-1 rounded-xl border border-border/30"
      />

      <div className="flex items-center gap-2">
        <input
          ref={csvInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleCsvImport}
        />
        <Button
          variant="secondary"
          size="sm"
          isLoading={importing}
          onClick={() => csvInputRef.current?.click()}
          className="flex items-center gap-1.5"
        >
          <Upload className="w-3.5 h-3.5" />
          Import CSV
        </Button>
        <Select
          options={[
            { label: 'All Contacts', value: 'all' },
            ...segments.map(s => ({ label: s.name, value: s.id }))
          ]}
          value={selectedSegment || 'all'}
          onChange={(val) => setSelectedSegment(val === 'all' ? null : val)}
          isSearchable={segments.length > 5}
          className="w-max min-w-[200px]"
          placeholder="Segments"
        />
      </div>
    </div>
  );

  return (
    <>
      <DataTable
        columns={columns}
        data={filteredContacts}
        rowKey={c => c.id}
        loading={loading}
        selectable
        onBulkDelete={handleBulkDelete}
        emptyIcon={Users}
        emptyTitle="No leads found"
        emptyMessage="Try adjusting your filters or import new leads."
        searchPlaceholder="Search leads by name or email..."
        exportFilename="marketing_contacts"
        toolbar={toolbar}
        actions={{
          edit: c => prefix(`/admin/marketing/contacts/${c.id}/edit`),
          onDelete: handleDeleteContact,
          custom: [
            {
              icon: Send,
              label: 'Direct Message',
              onClick: c => setSendingEmailTo(c),
            }
          ],
          bulk: [
            {
              icon: TagIcon,
              label: 'Apply Tag',
              onClick: rows => {
                setBulkTaggingRows(rows);
                setIsBulkTagging(true);
              }
            }
          ]
        }}
      />

      {/* Bulk Tagging Dropdown (Overlay) */}
      <AnimatePresence>
        {isBulkTagging && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-foreground/20 backdrop-blur-sm" onClick={() => setIsBulkTagging(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="w-80 bg-card border border-border rounded-3xl shadow-2xl p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Assign to Audience</div>
                <Button onClick={() => setIsBulkTagging(false)} variant="ghost" size="icon" className="w-8 h-8 rounded-lg">
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="max-h-[350px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {tags.map(tag => (
                  <Button
                    key={tag.id}
                    onClick={() => handleBulkTag(tag.id)}
                    variant="ghost"
                    size="sm"
                    fullWidth
                    className="justify-start gap-4 hover:bg-primary/5 p-3 rounded-xl transition-all group/tag"
                  >
                    <div className="w-4 h-4 rounded-full shadow-inner border border-white/10" style={{ backgroundColor: tag.color }} />
                    <span className="text-xs font-bold text-foreground group-hover/tag:text-primary">{tag.name}</span>
                  </Button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Send Email Modal */}
      <AnimatePresence>
        {sendingEmailTo && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-foreground/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="bg-card rounded-[2.5rem] w-full max-w-xl overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.5)] border border-border/50"
            >
              <div className="p-10 border-b border-border bg-muted/5 flex items-center justify-between">
                <div>
                  <h3 className="text-3xl font-black text-foreground tracking-tight">Direct Message</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-sm font-bold text-muted-foreground">{sendingEmailTo.email}</p>
                  </div>
                </div>
                <Button
                  onClick={() => setSendingEmailTo(null)}
                  variant="ghost"
                  size="icon"
                  className="w-12 h-12 rounded-2xl hover:bg-muted"
                >
                  <X className="w-6 h-6" />
                </Button>
              </div>

              <div className="p-10 space-y-8">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-5">Select Communication Template</label>
                  <div className="grid gap-4 max-h-[350px] overflow-y-auto pr-4 custom-scrollbar">
                    {templates.map(t => (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTemplate(t.id)}
                        className={cn(
                          "flex items-center justify-between p-6 rounded-2xl border-2 transition-all text-left group",
                          selectedTemplate === t.id
                            ? 'border-primary bg-primary/5 shadow-inner'
                            : 'border-border/50 bg-muted/20 hover:border-primary/20 hover:bg-muted/30'
                        )}
                      >
                        <div className="min-w-0 pr-4">
                          <p className={cn("font-bold transition-colors truncate", selectedTemplate === t.id ? 'text-primary' : 'text-foreground')}>
                            {t.name}
                          </p>
                          <p className="text-xs font-medium text-muted-foreground truncate mt-1">{t.subject}</p>
                        </div>
                        <div className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center transition-all shrink-0",
                          selectedTemplate === t.id ? 'bg-primary text-primary-foreground scale-110 shadow-lg' : 'bg-muted/50 text-transparent border border-border'
                        )}>
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex gap-4">
                  <Button
                    onClick={handleSendEmail}
                    isLoading={isSending}
                    disabled={!selectedTemplate}
                    variant="primary"
                    size="lg"
                    fullWidth
                    leftIcon={Send}
                    className="h-16 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20"
                  >
                    {isSending ? 'Transmitting...' : 'Dispatch Message'}
                  </Button>
                  <Button
                    onClick={() => setSendingEmailTo(null)}
                    variant="secondary"
                    size="lg"
                    className="h-16 px-10 rounded-2xl font-black uppercase tracking-widest"
                  >
                    Hold
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
