import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { Tag } from '../../types';
import { Save, Tag as TagIcon } from 'lucide-react';
import { AdminPageHeader } from '../../components/admin';
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
    <div className="max-w-xl">
      <AdminPageHeader
        label="Marketing CRM"
        labelIcon={TagIcon}
        title={id === 'new' ? 'Create Tag' : 'Edit Tag'}
        subtitle="Define a label to segment and organize your contacts."
      />

      <div className="bg-card rounded-lg border border-border shadow-sm p-8">
        
        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Tag Name</label>
            <input 
              type="text" required
              value={tag.name || ''}
              onChange={e => setTag({...tag, name: e.target.value})}
              placeholder="e.g. VIP Customer"
              className="input"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Description</label>
            <textarea 
              rows={3}
              value={tag.description || ''}
              onChange={e => setTag({...tag, description: e.target.value})}
              placeholder="What does this tag mean?"
              className="textarea"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Color</label>
            <input 
              type="color"
              value={tag.color || '#4f46e5'}
              onChange={e => setTag({...tag, color: e.target.value})}
              className="w-full h-12 rounded-md cursor-pointer"
            />
          </div>

          <div className="pt-6 border-t border-border flex gap-4">
            <button 
              type="submit" 
              disabled={saving}
              className="flex-grow btn-primary btn-lg"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Tag'}
            </button>
            <Link 
              to="/admin/marketing?tab=tag"
              className="px-8 bg-muted text-muted-foreground font-bold py-4 rounded-md hover:bg-muted transition-all text-center"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
