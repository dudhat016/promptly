import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Button from '../ui/Button';
import { Filter, Trash2 } from 'lucide-react';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Segment } from '../../types';
import { toast } from 'react-hot-toast';

export default function SegmentManager() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSegments() {
      try {
        const snap = await getDocs(collection(db, 'marketing_segments'));
        setSegments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Segment)));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchSegments();
  }, []);

  const handleDeleteSegment = async (id: string) => {
    if (!confirm('Delete this segment?')) return;
    try {
      await deleteDoc(doc(db, 'marketing_segments', id));
      setSegments(prev => prev.filter(s => s.id !== id));
      toast.success('Segment deleted');
    } catch (err) {
      toast.error('Failed to delete segment');
    }
  };

  if (loading) return <div className="p-20 text-center text-muted-foreground font-bold uppercase tracking-widest animate-pulse">Loading Segments...</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground border-b border-border">
            <th className="p-8">Segment Name</th>
            <th className="p-8">Rules</th>
            <th className="p-8 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {segments.map(segment => (
            <tr key={segment.id} className="tr group">
              <td className="p-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 text-primary rounded-md flex items-center justify-center">
                    <Filter className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-foreground">{segment.name}</span>
                </div>
              </td>
              <td className="p-8">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{segment.filters?.length || 0} Rules Defined</span>
              </td>
              <td className="p-8 text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    as={Link}
                    to={`/admin/marketing/segments/edit/${segment.id}`}
                    variant="secondary"
                    size="sm"
                  >
                    Edit
                  </Button>
                  <Button 
                    onClick={() => handleDeleteSegment(segment.id)} 
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-rose-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
          {segments.length === 0 && (
            <tr>
              <td colSpan={3} className="p-20 text-center text-muted-foreground font-medium italic">No audience segments found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
