import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { Tag } from '../../types';
import { Save, Tag as TagIcon } from 'lucide-react';
import { AdminPageHeader } from '../../components/admin';
import Button from '../../components/primitives/Button';
import { Link, useNavigate, useParams } from 'react-router-dom';
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
    if (!tag.name?.trim()) newErrors.name = "Tag name is required";
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
      toast.success(id && id !== 'new' ? "Tag updated" : "New tag created");
      navigate(prefix('/admin/marketing?tab=tag'));
    } catch (err) {
      console.error(err);
      toast.error("Failed to save tag");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <AdminPageHeader
        label="Marketing CRM"
        labelIcon={TagIcon}
        title={id === 'new' ? 'Create Tag' : 'Edit Tag'}
        subtitle="Define a label to segment and organize your contacts."
      />

      <div className="bg-card rounded-lg border border-border shadow-sm p-8">
        
        <form onSubmit={handleSave} className="space-y-6">
          <Input 
            label="Tag Name"
            id="tagName"
            name="tagName"
            type="text"
            error={errors.name}
            value={tag.name || ''}
            onChange={e => {
              setTag({...tag, name: e.target.value});
              if (errors.name) setErrors({...errors, name: ''});
            }}
            placeholder="e.g. VIP Customer"
            variant="filled"
          />

          <Textarea 
            label="Description"
            id="tagDescription"
            name="tagDescription"
            rows={3}
            value={tag.description || ''}
            onChange={e => setTag({...tag, description: e.target.value})}
            placeholder="What does this tag mean?"
            variant="filled"
          />

          <Input 
            label="Color"
            type="color"
            value={tag.color || '#4f46e5'}
            onChange={e => setTag({...tag, color: e.target.value})}
            className="h-12 cursor-pointer"
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
              {saving ? 'Saving...' : 'Save Tag'}
            </Button>
            <Button 
              as={Link}
              to={prefix("/admin/marketing?tab=tag")}
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
