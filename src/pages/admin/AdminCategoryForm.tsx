import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { Category } from '../../types';
import { Save, Tag } from 'lucide-react';
import { AdminPageHeader, PageContainer as AdminPageContainer } from '../../components/admin';
import Button from '../../components/primitives/Button';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { usePath } from '../../hooks/usePath';
import { toast } from 'react-hot-toast';
import Input from '../../components/primitives/Input';

export default function AdminCategoryForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { prefix } = usePath();
  
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [category, setCategory] = useState<Partial<Category>>({
    name: '', slug: ''
  });

  useEffect(() => {
    async function loadData() {
      if (id && id !== 'new') {
        const docSnap = await getDoc(doc(db, 'categories', id));
        if (docSnap.exists()) {
          setCategory({ id: docSnap.id, ...docSnap.data() } as Category);
        }
      }
    }
    loadData();
  }, [id]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!category.name?.trim()) newErrors.name = "Category name is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    
    setSaving(true);
    try {
      const slug = category.slug || category.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || '';
      
      if (id && id !== 'new') {
        await updateDoc(doc(db, 'categories', id), {
          ...category,
          slug
        });
      } else {
        const newId = category.id || slug || Date.now().toString();
        await setDoc(doc(db, 'categories', newId), {
          ...category,
          id: newId,
          slug
        });
      }
      toast.success(id && id !== 'new' ? "Category updated" : "New category added");
      navigate(prefix('/admin/categories'));
    } catch (err) {
      console.error(err);
      toast.error("Failed to save category");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <AdminPageHeader
        label="Content"
        labelIcon={Tag}
        title={id === 'new' ? 'Create Category' : 'Edit Category'}
        subtitle="Define a name and URL slug for this prompt category."
      />

      <div className="bg-card rounded-lg border border-border shadow-sm p-8">
        
        <form onSubmit={handleSave} className="space-y-6">
          <Input
            label="Category Name"
            id="categoryName"
            name="categoryName"
            type="text"
            required
            error={errors.name}
            value={category.name || ''}
            onChange={e => {
              setCategory({...category, name: e.target.value});
              if (errors.name) setErrors({...errors, name: ''});
            }}
            placeholder="e.g. Marketing"
          />

          <Input 
            label="URL Slug (Optional)"
            id="categorySlug"
            name="categorySlug"
            type="text"
            value={category.slug || ''}
            onChange={e => setCategory({...category, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})}
            placeholder="e.g. marketing-tools"
            className="font-mono"
            helperText="Leave blank to auto-generate from name."
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
              {saving ? 'Saving...' : 'Save Category'}
            </Button>
            <Button 
              as={Link}
              to={prefix("/admin/categories")}
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
