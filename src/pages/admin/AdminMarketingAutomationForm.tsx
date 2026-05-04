import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, getDocs, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { Tag, EmailTemplate, AutomationFlow } from '../../types';
import { GitBranch, ChevronRight } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AutomationBuilder from '../../components/marketing/AutomationBuilder';
import { toast } from 'react-hot-toast';

export default function AdminMarketingAutomationForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [tags, setTags] = useState<Tag[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [flow, setFlow] = useState<Partial<AutomationFlow> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [tSnap, tmpSnap] = await Promise.all([
          getDocs(collection(db, 'marketing_tags')),
          getDocs(collection(db, 'templates'))
        ]);
        setTags(tSnap.docs.map(d => ({ id: d.id, ...d.data() } as Tag)));
        setTemplates(tmpSnap.docs.map(d => ({ id: d.id, ...d.data() } as EmailTemplate)));

        if (id && id !== 'new') {
          const docSnap = await getDoc(doc(db, 'marketing_automations', id));
          if (docSnap.exists()) {
            setFlow({ id: docSnap.id, ...docSnap.data() } as AutomationFlow);
          } else {
            setFlow({ name: 'New Automation Flow', trigger: { type: 'user_signup' }, steps: [], active: false });
          }
        } else {
          setFlow({ name: 'New Automation Flow', trigger: { type: 'user_signup' }, steps: [], active: false });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  const handleSave = async (updatedFlow: any) => {
    try {
      if (id && id !== 'new') {
        await updateDoc(doc(db, 'marketing_automations', id), updatedFlow);
      } else {
        const newId = Date.now().toString();
        await setDoc(doc(db, 'marketing_automations', newId), { ...updatedFlow, id: newId });
      }
      toast.success(id && id !== 'new' ? "Automation updated" : "New automation created");
      navigate('/admin/marketing?tab=automation');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save automation');
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-8 font-medium">
        <Link to="/admin" className="hover:text-indigo-600 flex items-center gap-2"><GitBranch className="w-4 h-4" /> Admin</Link>
        <ChevronRight className="w-4 h-4" />
        <Link to="/admin/marketing?tab=automation" className="hover:text-indigo-600">Marketing & CRM</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-slate-900">{id === 'new' ? 'Create Automation' : 'Edit Automation'}</span>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500 font-bold">Loading Builder...</div>
      ) : (
        <AutomationBuilder 
          flow={flow} 
          tags={tags} 
          templates={templates} 
          onSave={handleSave} 
          onCancel={() => navigate('/admin/marketing?tab=automation')} 
        />
      )}
    </div>
  );
}
