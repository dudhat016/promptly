import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { Contact, Segment } from '../../types';
import { ArrowLeft, Filter } from 'lucide-react';
import { AdminPageHeader } from '../../components/admin';
import { useNavigate, useParams } from 'react-router-dom';
import SegmentBuilder from '../../components/marketing/SegmentBuilder';
import { usePath } from '../../hooks/usePath';
import { toast } from 'react-hot-toast';
import Button from '../../components/primitives/Button';

export default function AdminMarketingSegmentForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { prefix } = usePath();

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
          setSegment(docSnap.exists()
            ? { id: docSnap.id, ...docSnap.data() } as Segment
            : { name: 'New Segment', filters: [], matchType: 'and' }
          );
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
      toast.success(id && id !== 'new' ? 'Segment updated' : 'New segment created');
      navigate(prefix('/admin/marketing/segments'));
    } catch (err) {
      console.error(err);
      toast.error('Failed to save segment');
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        label="Marketing CRM"
        labelIcon={Filter}
        title={id === 'new' ? 'Create Segment' : 'Edit Segment'}
        subtitle="Build contact segments using rules and filters."
        actions={
          <Button
            onClick={() => navigate(prefix('/admin/marketing/segments'))}
            variant="secondary"
            size="md"
            leftIcon={ArrowLeft}
            className="font-bold"
          >
            Back
          </Button>
        }
      />

      {loading ? (
        <div className="p-12 text-center text-muted-foreground font-bold animate-pulse">Loading Builder...</div>
      ) : (
        <SegmentBuilder
          segment={segment}
          contacts={contacts}
          onSave={handleSave}
          onCancel={() => navigate(prefix('/admin/marketing/segments'))}
        />
      )}
    </div>
  );
}
