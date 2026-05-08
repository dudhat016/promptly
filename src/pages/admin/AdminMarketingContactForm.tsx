import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { Contact, Tag } from '../../types';
import { Save, Users } from 'lucide-react';
import { AdminPageHeader } from '../../components/admin';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';

import Select from '../../components/ui/Select';

export default function AdminMarketingContactForm() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [tags, setTags] = useState<Tag[]>([]);
  const [saving, setSaving] = useState(false);
  const [contact, setContact] = useState<Partial<Contact>>({
    email: '', displayName: '', tags: [], status: 'active', customFields: {}
  });

  useEffect(() => {
    async function loadData() {
      const tSnap = await getDocs(collection(db, 'marketing_tags'));
      setTags(tSnap.docs.map(d => ({ id: d.id, ...d.data() } as Tag)));

      if (id && id !== 'new') {
        const docSnap = await getDoc(doc(db, 'marketing_contacts', id));
        if (docSnap.exists()) {
          setContact({ id: docSnap.id, ...docSnap.data() } as Contact);
        }
      }
    }
    loadData();
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (id && id !== 'new') {
        await updateDoc(doc(db, 'marketing_contacts', id), contact);
      } else {
        const newId = Date.now().toString();
        await setDoc(doc(db, 'marketing_contacts', newId), { ...contact, id: newId, createdAt: new Date() });
      }
      toast.success(id && id !== 'new' ? "Contact updated" : "New contact created");
      navigate('/admin/marketing?tab=contact');
    } catch (err) {
      console.error(err);
      toast.error("Failed to save contact");
    } finally {
      setSaving(false);
    }
  };

  const toggleTag = (tagId: string) => {
    const currentTags = contact.tags || [];
    if (currentTags.includes(tagId)) {
      setContact({ ...contact, tags: currentTags.filter(t => t !== tagId) });
    } else {
      setContact({ ...contact, tags: [...currentTags, tagId] });
    }
  };

  const inputCls = "w-full bg-card border border-border rounded-2xl p-4 text-foreground focus:outline-none focus:border-primary transition-all";

  return (
    <div className="max-w-4xl">
      <AdminPageHeader
        label="Marketing CRM"
        labelIcon={Users}
        title={id === 'new' ? 'Create Contact' : 'Edit Contact'}
        subtitle="Add or update a contact in your CRM database."
      />

      <div className="bg-card rounded-lg border border-border p-8">

        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">Email Address</label>
              <input
                type="email" required
                value={contact.email || ''}
                onChange={e => setContact({ ...contact, email: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">Display Name</label>
              <input
                type="text"
                value={contact.displayName || ''}
                onChange={e => setContact({ ...contact, displayName: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">Status</label>
            <Select
              value={contact.status || 'active'}
              onChange={val => setContact({ ...contact, status: val as any })}
              options={[
                { label: 'Active', value: 'active', description: 'Contact is subscribed and receiving emails' },
                { label: 'Unsubscribed', value: 'unsubscribed', description: 'User opted out of marketing' },
                { label: 'Bounced', value: 'bounced', description: 'Email delivery failed' }
              ]}
              isSearchable={false}
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-muted-foreground mb-4">Applied Tags</label>
            <div className="flex flex-wrap gap-3">
              {tags.map(tag => {
                const isActive = (contact.tags || []).includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                      isActive
                        ? 'border-primary bg-primary/10 text-primary shadow-sm'
                        : 'border-border bg-card text-muted-foreground hover:border-primary/50'
                    }`}
                  >
                    {tag.name}
                  </button>
                );
              })}
              {tags.length === 0 && <p className="text-sm text-muted-foreground italic">No tags available. Create some in the CRM dashboard.</p>}
            </div>
          </div>

          <div className="pt-6 border-t border-border flex gap-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-grow text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, hsl(258,90%,56%), hsl(280,90%,60%))' }}
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Contact'}
            </button>
            <Link
              to="/admin/marketing?tab=contact"
              className="px-8 bg-muted text-muted-foreground font-bold py-4 rounded-2xl hover:bg-muted/80 transition-all text-center"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
