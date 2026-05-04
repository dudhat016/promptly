import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { AIModel } from '../../types';
import { Box, Plus, Trash2, Edit, Cpu } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

export default function AdminModels() {
  const [models, setModels] = useState<AIModel[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadModels() {
      try {
        const snap = await getDocs(collection(db, 'models'));
        setModels(snap.docs.map(d => ({ id: d.id, ...d.data() } as AIModel)));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadModels();
  }, []);

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this model?')) {
      try {
        await deleteDoc(doc(db, 'models', id));
        setModels(models.filter(m => m.id !== id));
        toast.success("AI Model deleted");
      } catch (err) {
        console.error(err);
        toast.error('Failed to delete model');
      }
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-500 font-bold">Loading AI Models...</div>;
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900">AI Models</h2>
          <p className="text-slate-500 mt-2">Manage the AI engines that power your prompts.</p>
        </div>
        <Link 
          to="/admin/models/new"
          className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
        >
          <Plus className="w-5 h-5" />
          Add AI Model
        </Link>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {models.map(model => (
          <div key={model.id} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 hover:shadow-xl transition-all group">
            <div className="flex items-start justify-between mb-6">
              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                <Cpu className="w-8 h-8" />
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => navigate(`/admin/models/edit/${model.id}`)}
                  className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                >
                  <Edit className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => handleDelete(model.id)}
                  className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <h3 className="text-xl font-black text-slate-900 mb-1">{model.name}</h3>
            <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-4">{model.provider} • {model.version}</p>
            <p className="text-sm text-slate-500 line-clamp-2">{model.description}</p>
            
            <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
              <span>ID: {model.id}</span>
              <span className="px-3 py-1 bg-slate-100 rounded-lg">Realtime</span>
            </div>
          </div>
        ))}

        {models.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
            <Cpu className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <h3 className="text-xl font-black text-slate-900 mb-2">No AI Models Found</h3>
            <p className="text-slate-500">Start by adding your first AI model engine.</p>
          </div>
        )}
      </div>
    </div>
  );
}
