import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { Contact, Segment } from '../../types';
import { Filter, ChevronRight } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import SegmentBuilder from '../../components/marketing/SegmentBuilder';
import { toast } from 'react-hot-toast';

export default function AdminMarketingSegmentForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [segment, setSegment] = useState<Partial<Segment> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const cSnap = await getDocs(collection(db, 'marketing_contacts'));
        setContacts(cSnap.docs.map(d => ({ id: d.id, ...d.data() } as Contact)));

        if (id && id !== 'new') {
          const docSnap = await getDoc(doc(db, 'marketing_segments', id));
          if (docSnap.exists()) {
            setSegment({ id: docSnap.id, ...docSnap.data() } as Segment);
          } else {
            setSegment({ name: 'New Segment', filters: [], matchType: 'and' });
          }
        } else {
          setSegment({ name: 'New Segment', filters: [], matchType: 'and' });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  const handleSave = async (updatedSegment: any) => {
    try {
      if (id && id !== 'new') {
        await updateDoc(doc(db, 'marketing_segments', id), updatedSegment);
      } else {
        const newId = Date.now().toString();
        await setDoc(doc(db, 'marketing_segments', newId), { ...updatedSegment, id: newId });
      }
      toast.success(id && id !== 'new' ? "Segment updated" : "New segment created");
      navigate('/admin/marketing?tab=segment');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save segment');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-8 font-medium">
        <Link to="/admin" className="hover:text-indigo-600 flex items-center gap-2"><Filter className="w-4 h-4" /> Admin</Link>
        <ChevronRight className="w-4 h-4" />
        <Link to="/admin/marketing?tab=segment" className="hover:text-indigo-600">Marketing & CRM</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-slate-900">{id === 'new' ? 'Create Segment' : 'Edit Segment'}</span>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500 font-bold">Loading Builder...</div>
      ) : (
        <SegmentBuilder 
          segment={segment} 
          contacts={contacts} 
          onSave={handleSave} 
          onCancel={() => navigate('/admin/marketing?tab=segment')} 
        />
      )}
    </div>
  );
}
