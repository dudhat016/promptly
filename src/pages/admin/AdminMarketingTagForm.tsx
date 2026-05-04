import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { Tag } from '../../types';
import { Save, ChevronRight, Tag as TagIcon } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';

export default function AdminMarketingTagForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [saving, setSaving] = useState(false);
  const [tag, setTag] = useState<Partial<Tag>>({
    name: '', description: '', color: '#4f46e5'
  });

  useEffect(() => {
    async function loadData() {
      if (id && id !== 'new') {
        const docSnap = await getDoc(doc(db, 'marketing_tags', id));
        if (docSnap.exists()) {
          setTag({ id: docSnap.id, ...docSnap.data() } as Tag);
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
        await updateDoc(doc(db, 'marketing_tags', id), tag);
      } else {
        const newId = tag.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || Date.now().toString();
        await setDoc(doc(db, 'marketing_tags', newId), { ...tag, id: newId });
      }
      toast.success(id && id !== 'new' ? "Tag updated" : "New tag created");
      navigate('/admin/marketing?tab=tag');
    } catch (err) {
      console.error(err);
      toast.error("Failed to save tag");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-8 font-medium">
        <Link to="/admin" className="hover:text-indigo-600 flex items-center gap-2"><TagIcon className="w-4 h-4" /> Admin</Link>
        <ChevronRight className="w-4 h-4" />
        <Link to="/admin/marketing?tab=tag" className="hover:text-indigo-600">Marketing & CRM</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-slate-900">{id === 'new' ? 'Create Tag' : 'Edit Tag'}</span>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-10">
        <h2 className="text-3xl font-black mb-8">{id === 'new' ? 'Create Tag' : 'Edit Tag'}</h2>
        
        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Tag Name</label>
            <input 
              type="text" required
              value={tag.name || ''}
              onChange={e => setTag({...tag, name: e.target.value})}
              placeholder="e.g. VIP Customer"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Description</label>
            <textarea 
              rows={3}
              value={tag.description || ''}
              onChange={e => setTag({...tag, description: e.target.value})}
              placeholder="What does this tag mean?"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Color</label>
            <input 
              type="color"
              value={tag.color || '#4f46e5'}
              onChange={e => setTag({...tag, color: e.target.value})}
              className="w-full h-12 rounded-xl cursor-pointer"
            />
          </div>

          <div className="pt-6 border-t border-slate-100 flex gap-4">
            <button 
              type="submit" 
              disabled={saving}
              className="flex-grow bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Tag'}
            </button>
            <Link 
              to="/admin/marketing?tab=tag"
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
