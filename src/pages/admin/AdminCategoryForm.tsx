import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { Category } from '../../types';
import { Save, Tag } from 'lucide-react';
import { AdminPageHeader } from '../../components/admin';
import Button from '../../components/ui/Button';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import Input from '../../components/ui/Input';

export default function AdminCategoryForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [saving, setSaving] = useState(false);
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
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
      navigate('/admin/categories');
    } catch (err) {
      console.error(err);
      toast.error("Failed to save category");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
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
            type="text" required
            value={category.name || ''}
            onChange={e => setCategory({...category, name: e.target.value})}
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
              to="/admin/categories"
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
