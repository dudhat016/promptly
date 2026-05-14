import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, serverTimestamp, addDoc, query, where, limit } from 'firebase/firestore';
import { Prompt, Category, AIModel } from '../../types';
import { Save, LayoutGrid, ChevronDown } from 'lucide-react';
import { AdminPageHeader, ImageUpload } from '../../components/admin';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { usePath } from '../../hooks/usePath';
import { useAuth } from '../../hooks/useAuth';
import { toast } from 'react-hot-toast';
import TagInput from '../../components/TagInput';
import Select from '../../components/primitives/Select';
import Input from '../../components/primitives/Input';
import Button from '../../components/primitives/Button';
import Textarea from '../../components/primitives/Textarea';
import Checkbox from '../../components/primitives/Checkbox';

export default function AdminPromptForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { prefix } = usePath();
  const { user, profile } = useAuth();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [models, setModels] = useState<AIModel[]>([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [prompt, setPrompt] = useState<Partial<Prompt>>({
    title: '', slug: '', description: '', metaTitle: '', metaDescription: '', metaKeywords: '',
    content: '', imageUrl: '', model: '', isPaid: false, tags: [],
    sampleOutput: '', usageGuide: '', difficulty: undefined
  });

  const [isManualSEO, setIsManualSEO] = useState({
    slug: false,
    metaTitle: false,
    metaDescription: false,
    metaKeywords: false
  });

  const slugify = (text: string) => {
    return text.toString().toLowerCase()
      .replace(/\s+/g, '-')           // Replace spaces with -
      .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
      .replace(/\-\-+/g, '-')         // Replace multiple - with single -
      .replace(/^-+/, '')             // Trim - from start of text
      .replace(/-+$/, '');            // Trim - from end of text
  };

  const handleTitleChange = (val: string) => {
    const slug = slugify(val);
    setPrompt(prev => ({ 
      ...prev, 
      title: val, 
      slug: isManualSEO.slug ? prev.slug : slug,
      metaTitle: isManualSEO.metaTitle ? prev.metaTitle : val
    }));
    if (errors.title) setErrors(prev => ({ ...prev, title: '' }));
  };

  const handleDescriptionChange = (val: string) => {
    setPrompt(prev => ({
      ...prev,
      description: val,
      metaDescription: isManualSEO.metaDescription ? prev.metaDescription : val
    }));
    if (errors.description) setErrors(prev => ({ ...prev, description: '' }));
  };

  useEffect(() => {
    async function loadData() {
      const catSnap = await getDocs(collection(db, 'categories'));
      setCategories(catSnap.docs.map(d => ({ id: d.id, ...d.data() } as Category)));

      const modSnap = await getDocs(collection(db, 'models'));
      setModels(modSnap.docs.map(d => ({ id: d.id, ...d.data() } as AIModel)));

      if (id && id !== 'new') {
        const docRef = doc(db, 'prompts', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.id ? { id: docSnap.id, ...docSnap.data() } as Prompt : { ...docSnap.data() } as Prompt;
          setPrompt(data);
          // If we are editing, assume everything is "manual" so we don't overwrite existing SEO
          setIsManualSEO({
            slug: !!data.slug,
            metaTitle: !!data.metaTitle,
            metaDescription: !!data.metaDescription,
            metaKeywords: !!data.metaKeywords
          });
        } else {
          // Try lookup by slug
          const q = query(collection(db, 'prompts'), where('slug', '==', id), limit(1));
          const qSnap = await getDocs(q);
          if (!qSnap.empty) {
            const d = qSnap.docs[0];
            const data = { ...d.data(), id: d.id } as Prompt;
            setPrompt(data);
            setIsManualSEO({
              slug: !!data.slug,
              metaTitle: !!data.metaTitle,
              metaDescription: !!data.metaDescription,
              metaKeywords: !!data.metaKeywords
            });
          }
        }
      }
    }
    loadData();
  }, [id]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!prompt.title?.trim()) newErrors.title = "Title is required";
    if (!prompt.slug?.trim()) newErrors.slug = "SEO slug is required";
    if (!prompt.model) newErrors.model = "AI Model is required";
    if (!prompt.categoryId) newErrors.categoryId = "Category is required";
    if (!prompt.description?.trim()) newErrors.description = "Short description is required";
    if (!prompt.content?.trim()) newErrors.content = "Prompt template content is required";
    
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      toast.error("Please fill in all required fields");
      return false;
    }
    return true;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    
    setSaving(true);
    try {
      if (id && id !== 'new') {
        const docRef = doc(db, 'prompts', id);
        await updateDoc(docRef, {
          ...prompt,
          updatedAt: serverTimestamp()
        });

        // Save version history
        await addDoc(collection(db, 'prompts', id, 'versions'), {
          content: prompt.content,
          updatedAt: serverTimestamp(),
          changeLog: 'Admin update' // Could be made dynamic later
        });
      } else {
        const newId = Date.now().toString();
        const docRef = doc(db, 'prompts', newId);
        await setDoc(docRef, {
          ...prompt,
          id: newId,
          creatorId: user?.uid || 'system',
          creatorName: 'Promptly Team',
          creatorRole: profile?.role || 'admin',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          likesCount: 0,
          viewsCount: 0,
          copiesCount: 0
        });

        // Initial version
        await addDoc(collection(db, 'prompts', newId, 'versions'), {
          content: prompt.content,
          updatedAt: serverTimestamp(),
          changeLog: 'Initial creation'
        });
      }
      toast.success(id && id !== 'new' ? "Prompt updated!" : "New prompt created!");
      navigate(prefix('/admin/prompts'));
    } catch (err) {
      console.error(err);
      toast.error("Failed to save prompt");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <AdminPageHeader
        label="Content"
        labelIcon={LayoutGrid}
        title={id === 'new' ? 'Create Prompt' : 'Edit Prompt'}
        subtitle="Configure prompt content, SEO metadata, and settings."
      />

      <div className="bg-card rounded-lg border border-border shadow-sm p-8">
        
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Title"
              id="promptTitle"
              name="promptTitle"
              type="text"
              required
              error={errors.title}
              value={prompt.title || ''}
              onChange={e => handleTitleChange(e.target.value)}
              placeholder="e.g. Expert Python Architect"
            />
            <Input
              label="SEO Slug"
              id="promptSlug"
              name="promptSlug"
              type="text"
              required
              error={errors.slug}
              value={prompt.slug || ''}
              onChange={e => {
                const slug = slugify(e.target.value);
                setPrompt({...prompt, slug});
                setIsManualSEO(prev => ({ ...prev, slug: true }));
                if (errors.slug) setErrors(prev => ({ ...prev, slug: '' }));
              }}
              placeholder="expert-python-architect"
              className="font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Meta Title (SEO)"
              id="metaTitle"
              name="metaTitle"
              type="text"
              value={prompt.metaTitle || ''}
              onChange={e => {
                setPrompt({...prompt, metaTitle: e.target.value});
                setIsManualSEO(prev => ({ ...prev, metaTitle: true }));
              }}
              placeholder="Google search title..."
            />
            <Input 
              label="Meta Keywords (SEO)"
              id="metaKeywords"
              name="metaKeywords"
              type="text"
              value={prompt.metaKeywords || ''}
              onChange={e => {
                setPrompt({...prompt, metaKeywords: e.target.value});
                setIsManualSEO(prev => ({ ...prev, metaKeywords: true }));
              }}
              placeholder="ai, prompt, gpt4, seo..."
            />
          </div>

          <Textarea 
            label="Meta Description (SEO)"
            id="metaDescription"
            name="metaDescription"
            rows={2}
            value={prompt.metaDescription || ''}
            onChange={e => {
              setPrompt({...prompt, metaDescription: e.target.value});
              setIsManualSEO(prev => ({ ...prev, metaDescription: true }));
            }}
            placeholder="SEO meta description for Google search results..."
            className="min-h-[80px]"
            variant="filled"
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Select
                id="promptModel"
                name="promptModel"
                label="Model"
                value={prompt.model || ''}
                error={errors.model}
                onChange={val => {
                  setPrompt({...prompt, model: val});
                  if (errors.model) setErrors(prev => ({ ...prev, model: '' }));
                }}
                options={models.map(m => ({ label: m.name, value: m.id, description: m.provider }))}
                placeholder="Select Model"
                isSearchable={true}
              />
              {models.length === 0 && <p className="text-xs text-amber-600 mt-1 font-bold">No models found in database.</p>}
            </div>
            <div>
              <Select
                id="promptCategory"
                name="promptCategory"
                label="Category"
                value={prompt.categoryId || ''}
                error={errors.categoryId}
                onChange={val => {
                  setPrompt({...prompt, categoryId: val});
                  if (errors.categoryId) setErrors(prev => ({ ...prev, categoryId: '' }));
                }}
                options={categories.map(c => ({ label: c.name, value: c.id }))}
                placeholder="Select Category"
                isSearchable={true}
              />
              {categories.length === 0 && <p className="text-xs text-amber-600 mt-1 font-bold">No categories found in database.</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Tags</label>
            <TagInput 
              value={prompt.tags || []}
              onChange={(tags) => {
                setPrompt(prev => ({
                  ...prev,
                  tags,
                  metaKeywords: isManualSEO.metaKeywords ? prev.metaKeywords : tags.join(', ')
                }));
              }}
              placeholder="Search or create tags..."
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Prompt Preview Image</label>
            <ImageUpload
              value={prompt.imageUrl || ''}
              onChange={url => setPrompt(prev => ({ ...prev, imageUrl: url }))}
              folder="prompts"
              aspectRatio="square"
              helpText="Recommended: 1200x800px or 3:2 Aspect Ratio. This image will be used in marketplace cards and search results."
            />
          </div>

          <Textarea
            label="Short Description"
            id="description"
            name="description"
            rows={2}
            required
            error={errors.description}
            value={prompt.description || ''}
            onChange={e => handleDescriptionChange(e.target.value)}
            placeholder="Describe what this prompt does in a few sentences..."
            className="min-h-[80px]"
            variant="filled"
          />

          <Textarea
            label="Full Prompt Template"
            id="content"
            name="content"
            rows={8}
            required
            error={errors.content}
            value={prompt.content || ''}
            onChange={e => {
              setPrompt({...prompt, content: e.target.value});
              if (errors.content) setErrors(prev => ({ ...prev, content: '' }));
            }}
            placeholder="Paste the expert prompt content here. Use [VARIABLE], {{variable}}, or <variable> syntax for placeholders..."
            className="font-mono min-h-[200px]"
            variant="filled"
            helperText="Wrap placeholders in [brackets], {{braces}}, or <tags> — they'll be highlighted on the detail page."
          />

          <Textarea 
            label="Sample Output (optional)"
            id="sampleOutput"
            name="sampleOutput"
            rows={5}
            value={prompt.sampleOutput || ''}
            onChange={e => setPrompt({...prompt, sampleOutput: e.target.value})}
            placeholder="Paste an example AI response generated by this prompt. Shown to unlocked users as proof of quality."
            variant="filled"
          />

          <Textarea 
            label="Usage Guide (optional)"
            id="usageGuide"
            name="usageGuide"
            rows={4}
            value={prompt.usageGuide || ''}
            onChange={e => setPrompt({...prompt, usageGuide: e.target.value})}
            placeholder="Step-by-step tips on how to use this prompt. Shown as a 'How to Use' section after unlock. Plain text or use line breaks for steps."
            variant="filled"
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Select
                id="promptDifficulty"
                name="promptDifficulty"
                label="Difficulty Level (optional)"
                value={prompt.difficulty || ''}
                onChange={val => setPrompt({...prompt, difficulty: (val as Prompt['difficulty']) || undefined})}
                options={[
                  { label: 'Not set', value: '' },
                  { label: 'Beginner', value: 'beginner', description: 'Basic prompt structure' },
                  { label: 'Intermediate', value: 'intermediate', description: 'Uses variables and context' },
                  { label: 'Advanced', value: 'advanced', description: 'Complex logic and chain of thought' }
                ]}
                isSearchable={false}
              />
            </div>
            <Checkbox 
              label="Premium (PRO Only)"
              description="Users will need a PRO subscription to view this prompt content."
              id="isPaid"
              name="isPaid"
              checked={prompt.isPaid || false}
              onChange={e => setPrompt({...prompt, isPaid: e.target.checked})}
              className="flex-1"
            />
          </div>

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
              {saving ? 'Saving...' : 'Save Prompt'}
            </Button>
            <Button 
              as={Link}
              to={prefix("/admin/prompts")}
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
