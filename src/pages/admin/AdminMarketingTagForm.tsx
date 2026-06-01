import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { Tag } from '../../types';
import { ArrowLeft, Save, Tag as TagIcon } from 'lucide-react';
import { AdminPageHeader } from '../../components/admin';
import Button from '../../components/primitives/Button';
import Card from '../../components/primitives/Card';
import { useNavigate, useParams } from 'react-router-dom';
import { usePath } from '../../hooks/usePath';
import { toast } from 'react-hot-toast';
import Input from '../../components/primitives/Input';
import Textarea from '../../components/primitives/Textarea';

export default function AdminMarketingTagForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { prefix } = usePath();

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tag, setTag] = useState<Partial<Tag>>({
    name: '', description: '', color: '#4f46e5'
  });

  useEffect(() => {
    async function loadData() {
      if (id && id !== 'new') {
        const docSnap = await getDoc(doc(db, 'marketing_tags', id));
        if (docSnap.exists()) {
          setTag({ id: docSnap.id, ...docSnap.data() } as Tag);
        }
      }
    }
    loadData();
  }, [id]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!tag.name?.trim()) newErrors.name = 'Tag name is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      if (id && id !== 'new') {
        await updateDoc(doc(db, 'marketing_tags', id), tag);
      } else {
        const newId = tag.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || Date.now().toString();
        await setDoc(doc(db, 'marketing_tags', newId), { ...tag, id: newId });
      }
      toast.success(id && id !== 'new' ? 'Tag updated' : 'New tag created');
      navigate(prefix('/admin/marketing/tags'));
    } catch (err) {
      console.error(err);
      toast.error('Failed to save tag');
    } finally {
      setSaving(false);
    }
  };

  const PRESET_COLORS = [
    '#4f46e5', '#7c3aed', '#db2777', '#dc2626',
    '#ea580c', '#ca8a04', '#16a34a', '#0891b2',
    '#0284c7', '#4338ca', '#be123c', '#15803d',
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        label="Marketing CRM"
        labelIcon={TagIcon}
        title={id === 'new' ? 'Create Tag' : 'Edit Tag'}
        subtitle="Define a label to segment and organize your contacts."
        actions={
          <Button
            onClick={() => navigate(prefix('/admin/marketing/tags'))}
            variant="secondary"
            size="md"
            leftIcon={ArrowLeft}
            className="font-bold"
          >
            Back
          </Button>
        }
      />

      <Card padding="lg" className="!rounded-3xl shadow-sm">
        <form onSubmit={handleSave} className="space-y-6">
          <Input
            label="Tag Name"
            id="tagName"
            name="tagName"
            type="text"
            error={errors.name}
            value={tag.name || ''}
            onChange={e => {
              setTag({ ...tag, name: e.target.value });
              if (errors.name) setErrors({ ...errors, name: '' });
            }}
            placeholder="e.g. VIP Customer"
            variant="outline"
          />

          <Textarea
            label="Description"
            id="tagDescription"
            name="tagDescription"
            rows={3}
            value={tag.description || ''}
            onChange={e => setTag({ ...tag, description: e.target.value })}
            placeholder="What does this tag mean?"
            variant="outline"
          />

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
              Tag Color
            </label>
            {/* Preset swatches */}
            <div className="flex flex-wrap gap-2 mb-4">
              {PRESET_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setTag({ ...tag, color })}
                  className="w-8 h-8 rounded-lg border-2 transition-all hover:scale-110"
                  style={{
                    backgroundColor: color,
                    borderColor: tag.color === color ? color : 'transparent',
                    boxShadow: tag.color === color ? `0 0 0 3px ${color}33` : undefined,
                  }}
                />
              ))}
              {/* Custom color picker */}
              <label className="w-8 h-8 rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary/50 transition-all overflow-hidden relative">
                <span className="text-[10px] font-black text-muted-foreground">+</span>
                <input
                  type="color"
                  value={tag.color || '#4f46e5'}
                  onChange={e => setTag({ ...tag, color: e.target.value })}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </label>
            </div>
            {/* Preview */}
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl border border-border w-fit">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: tag.color || '#4f46e5' }} />
              <span className="text-xs font-bold text-foreground">{tag.name || 'Tag preview'}</span>
              <span className="text-[10px] font-mono text-muted-foreground">{tag.color || '#4f46e5'}</span>
            </div>
          </div>

          <div className="pt-4 border-t border-border flex gap-3">
            <Button
              type="submit"
              isLoading={saving}
              variant="primary"
              size="md"
              leftIcon={Save}
              className="font-bold shadow-sm shadow-primary/20"
            >
              {saving ? 'Saving...' : id === 'new' ? 'Create Tag' : 'Save Changes'}
            </Button>
            <Button
              type="button"
              onClick={() => navigate(prefix('/admin/marketing/tags'))}
              variant="secondary"
              size="md"
              className="font-bold"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
