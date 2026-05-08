import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { Cpu, Save } from 'lucide-react';
import { AdminPageHeader } from '../../components/admin';
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
    <div className="max-w-xl">
      <AdminPageHeader
        label="Content"
        labelIcon={Cpu}
        title={id === 'new' ? 'Add AI Model' : 'Edit Model'}
        subtitle="Register an AI engine to power your prompt library."
      />

      <div className="bg-card rounded-lg border border-border shadow-sm p-8">

        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Model Name</label>
            <input
              type="text" required
              value={model.name || ''}
              onChange={e => setModel({...model, name: e.target.value})}
              placeholder="e.g. GPT-4 Turbo"
              className="input"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Provider</label>
              <select
                required
                value={model.provider || 'OpenAI'}
                onChange={e => setModel({...model, provider: e.target.value})}
                className="select"
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
              <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Version</label>
              <input
                type="text" required
                value={model.version || ''}
                onChange={e => setModel({...model, version: e.target.value})}
                placeholder="e.g. v2024-05"
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Description</label>
            <textarea
              rows={3}
              value={model.description || ''}
              onChange={e => setModel({...model, description: e.target.value})}
              placeholder="What are the strengths of this model?"
              className="textarea"
            />
          </div>

          <div className="pt-6 border-t border-border flex gap-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-grow btn-primary btn-lg"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Model'}
            </button>
            <Link
              to="/admin/models"
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
