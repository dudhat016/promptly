import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Edit2, Trash2 } from 'lucide-react';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Tag } from '../../types';
import { toast } from 'react-hot-toast';

export default function TagManager() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTags() {
      try {
        const snap = await getDocs(collection(db, 'marketing_tags'));
        setTags(snap.docs.map(d => ({ id: d.id, ...d.data() } as Tag)));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchTags();
  }, []);

  const handleDeleteTag = async (id: string) => {
    if (!confirm('Delete this tag?')) return;
    try {
      await deleteDoc(doc(db, 'marketing_tags', id));
      setTags(prev => prev.filter(t => t.id !== id));
      toast.success('Tag deleted');
    } catch (err) {
      toast.error('Failed to delete tag');
    }
  };

  if (loading) return <div className="p-20 text-center text-muted-foreground font-bold uppercase tracking-widest animate-pulse">Loading Tags...</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground border-b border-border">
            <th className="p-8">Tag Name</th>
            <th className="p-8">Description</th>
            <th className="p-8 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {tags.map(tag => (
            <tr key={tag.id} className="tr group">
              <td className="p-8">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
                  <span className="font-bold text-foreground">{tag.name}</span>
                </div>
              </td>
              <td className="p-8">
                <p className="text-sm text-muted-foreground line-clamp-1 max-w-md">{tag.description || 'No description provided'}</p>
              </td>
              <td className="p-8 text-right">
                <div className="flex items-center justify-end gap-2">
                  <Link to={`/admin/marketing/tags/edit/${tag.id}`} className="p-2 text-muted-foreground hover:text-primary transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </Link>
                  <button 
                    onClick={() => handleDeleteTag(tag.id)} 
                    className="p-2 text-muted-foreground hover:text-rose-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {tags.length === 0 && (
            <tr>
              <td colSpan={3} className="p-20 text-center text-muted-foreground font-medium italic">No marketing tags found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
