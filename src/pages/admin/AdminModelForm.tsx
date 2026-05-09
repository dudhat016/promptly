import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { Cpu, Save } from 'lucide-react';
import { AdminPageHeader } from '../../components/admin';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { AIModel } from '../../types';
import { toast } from 'react-hot-toast';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import Button from '../../components/ui/Button';

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
          <Input 
            label="Model Name"
            id="modelName"
            name="modelName"
            type="text" required
            value={model.name || ''}
            onChange={e => setModel({...model, name: e.target.value})}
            placeholder="e.g. GPT-4 Turbo"
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="modelProvider" className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Provider</label>
              <Select
                id="modelProvider"
                value={model.provider || 'OpenAI'}
                onChange={val => setModel({...model, provider: val})}
                options={[
                  { label: 'OpenAI', value: 'OpenAI', description: 'GPT-3.5, GPT-4, etc.' },
                  { label: 'Anthropic', value: 'Anthropic', description: 'Claude 2, Claude 3, etc.' },
                  { label: 'Google', value: 'Google', description: 'Gemini, PaLM, etc.' },
                  { label: 'Meta', value: 'Meta', description: 'Llama 2, Llama 3, etc.' },
                  { label: 'Mistral', value: 'Mistral', description: 'Mistral 7B, Mixtral, etc.' },
                  { label: 'Other', value: 'Other', description: 'Custom or open source models' }
                ]}
                isSearchable={false}
              />
            </div>
            <div>
              <Input 
                label="Version"
                id="modelVersion"
                name="modelVersion"
                type="text" required
                value={model.version || ''}
                onChange={e => setModel({...model, version: e.target.value})}
                placeholder="e.g. v2024-05"
              />
            </div>
          </div>

          <Textarea 
            label="Description"
            id="modelDescription"
            name="modelDescription"
            rows={3}
            value={model.description || ''}
            onChange={e => setModel({...model, description: e.target.value})}
            placeholder="What are the strengths of this model?"
            variant="filled"
          />

          <div className="pt-6 border-t border-border flex gap-4">
            <Button
              type="submit"
              isLoading={saving}
              variant="primary"
              size="lg"
              fullWidth
              leftIcon={Save}
              className="font-bold"
            >
              {saving ? 'Saving...' : 'Save Model'}
            </Button>
            <Button
              as={Link}
              to="/admin/models"
              variant="secondary"
              size="lg"
              className="px-8 font-bold"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
