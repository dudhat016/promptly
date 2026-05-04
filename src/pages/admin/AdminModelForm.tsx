import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { ChevronRight, Cpu, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { AIModel } from '../../types';
import { toast } from 'react-hot-toast';

export default function AdminModelForm() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [saving, setSaving] = useState(false);
  const [model, setModel] = useState<Partial<AIModel>>({
    name: '', provider: 'OpenAI', version: '', description: ''
  });

  useEffect(() => {
    async function loadModel() {
      if (id && id !== 'new') {
        const docSnap = await getDoc(doc(db, 'models', id));
        if (docSnap.exists()) {
          setModel({ id: docSnap.id, ...docSnap.data() } as AIModel);
        }
      }
    }
    loadModel();
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (id && id !== 'new') {
        await updateDoc(doc(db, 'models', id), {
          ...model,
          updatedAt: serverTimestamp()
        });
      } else {
        const newId = model.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || Date.now().toString();
        await setDoc(doc(db, 'models', newId), {
          ...model,
          id: newId,
          createdAt: serverTimestamp()
        });
      }
      toast.success(id && id !== 'new' ? "Model updated" : "New model added");
      navigate('/admin/models');
    } catch (err) {
      console.error(err);
      toast.error("Failed to save model");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-8 font-medium">
        <Link to="/admin" className="hover:text-indigo-600 flex items-center gap-2"><Cpu className="w-4 h-4" /> Admin</Link>
        <ChevronRight className="w-4 h-4" />
        <Link to="/admin/models" className="hover:text-indigo-600">AI Models</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-slate-900">{id === 'new' ? 'New AI Model' : 'Edit Model'}</span>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-10">
        <h2 className="text-3xl font-black mb-8">{id === 'new' ? 'Add AI Model' : 'Edit Model'}</h2>

        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Model Name</label>
            <input
              type="text" required
              value={model.name || ''}
              onChange={e => setModel({...model, name: e.target.value})}
              placeholder="e.g. GPT-4 Turbo"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Provider</label>
              <select
                required
                value={model.provider || 'OpenAI'}
                onChange={e => setModel({...model, provider: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all appearance-none"
              >
                <option value="OpenAI">OpenAI</option>
                <option value="Anthropic">Anthropic</option>
                <option value="Google">Google</option>
                <option value="Meta">Meta</option>
                <option value="Mistral">Mistral</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Version</label>
              <input
                type="text" required
                value={model.version || ''}
                onChange={e => setModel({...model, version: e.target.value})}
                placeholder="e.g. v2024-05"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Description</label>
            <textarea
              rows={3}
              value={model.description || ''}
              onChange={e => setModel({...model, description: e.target.value})}
              placeholder="What are the strengths of this model?"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all resize-none"
            />
          </div>

          <div className="pt-6 border-t border-slate-100 flex gap-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-grow bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Model'}
            </button>
            <Link
              to="/admin/models"
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
