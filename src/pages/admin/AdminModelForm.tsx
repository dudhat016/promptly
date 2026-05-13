import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { Cpu, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AdminPageHeader } from '../../components/admin';
import Button from '../../components/primitives/Button';
import Input from '../../components/primitives/Input';
import Select from '../../components/primitives/Select';
import Textarea from '../../components/primitives/Textarea';
import { usePath } from '../../hooks/usePath';
import { db } from '../../lib/firebase';
import { AIModel } from '../../types';

export default function AdminModelForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { prefix } = usePath();

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
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

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!model.name?.trim()) newErrors.name = "Model name is required";
    if (!model.version?.trim()) newErrors.version = "Version is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

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
      navigate(prefix('/admin/models'));
    } catch (err) {
      console.error(err);
      toast.error("Failed to save model");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
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
            type="text"
            error={errors.name}
            value={model.name || ''}
            onChange={e => {
              setModel({...model, name: e.target.value});
              if (errors.name) setErrors({...errors, name: ''});
            }}
            placeholder="e.g. GPT-4 Turbo"
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Select
                id="modelProvider"
                label="Provider"
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
                type="text"
                error={errors.version}
                value={model.version || ''}
                onChange={e => {
                  setModel({...model, version: e.target.value});
                  if (errors.version) setErrors({...errors, version: ''});
                }}
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
            variant="outline"
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
              to={prefix('/admin/models')}
              variant="secondary"
              size="lg"
              className="px-8 font-bold"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
