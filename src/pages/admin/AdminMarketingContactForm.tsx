import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { Contact, Tag } from '../../types';
import { Save, ChevronRight, Users } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';

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

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-8 font-medium">
        <Link to="/admin" className="hover:text-indigo-600 flex items-center gap-2"><Users className="w-4 h-4" /> Admin</Link>
        <ChevronRight className="w-4 h-4" />
        <Link to="/admin/marketing?tab=contact" className="hover:text-indigo-600">Marketing & CRM</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-slate-900">{id === 'new' ? 'Create Contact' : 'Edit Contact'}</span>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-10">
        <h2 className="text-3xl font-black mb-8">{id === 'new' ? 'Create Contact' : 'Edit Contact'}</h2>
        
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Email Address</label>
              <input 
                type="email" required
                value={contact.email || ''}
                onChange={e => setContact({...contact, email: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Display Name</label>
              <input 
                type="text"
                value={contact.displayName || ''}
                onChange={e => setContact({...contact, displayName: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Status</label>
            <select
              value={contact.status || 'active'}
              onChange={e => setContact({...contact, status: e.target.value as any})}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all appearance-none"
            >
              <option value="active">Active</option>
              <option value="unsubscribed">Unsubscribed</option>
              <option value="bounced">Bounced</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Applied Tags</label>
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
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' 
                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    {tag.name}
                  </button>
                );
              })}
              {tags.length === 0 && <p className="text-sm text-slate-400 italic">No tags available. Create some in the CRM dashboard.</p>}
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex gap-4">
            <button 
              type="submit" 
              disabled={saving}
              className="flex-grow bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Contact'}
            </button>
            <Link 
              to="/admin/marketing?tab=contact"
              className="px-8 bg-slate-100 text-slate-600 font-bold py-4 rounded-2xl hover:bg-slate-200 transition-all text-center"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
