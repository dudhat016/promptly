import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, serverTimestamp, addDoc, query, where, limit } from 'firebase/firestore';
import { Prompt, Category, AIModel } from '../../types';
import { Save, LayoutGrid, ChevronDown } from 'lucide-react';
import { AdminPageHeader, ImageUpload } from '../../components/admin';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { toast } from 'react-hot-toast';
import TagInput from '../../components/TagInput';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Textarea from '../../components/ui/Textarea';
import Checkbox from '../../components/ui/Checkbox';

export default function AdminPromptForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [models, setModels] = useState<AIModel[]>([]);
  const [saving, setSaving] = useState(false);
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
  };

  const handleDescriptionChange = (val: string) => {
    setPrompt(prev => ({
      ...prev,
      description: val,
      metaDescription: isManualSEO.metaDescription ? prev.metaDescription : val
    }));
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
            const data = { id: d.id, ...d.data() } as Prompt;
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
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
      navigate('/admin/prompts');
    } catch (err) {
      console.error(err);
      toast.error("Failed to save prompt");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl">
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
              type="text" required
              value={prompt.title || ''}
              onChange={e => handleTitleChange(e.target.value)}
              placeholder="e.g. Expert Python Architect"
            />
            <Input 
              label="SEO Slug"
              id="promptSlug"
              name="promptSlug"
              type="text" required
              value={prompt.slug || ''}
              onChange={e => {
                setPrompt({...prompt, slug: slugify(e.target.value)});
                setIsManualSEO(prev => ({ ...prev, slug: true }));
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
              <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Model</label>
              <Select
                id="promptModel"
                name="promptModel"
                value={prompt.model || ''}
                onChange={val => setPrompt({...prompt, model: val})}
                options={models.map(m => ({ label: m.name, value: m.id, description: m.provider }))}
                placeholder="Select Model"
                isSearchable={true}
              />
              {models.length === 0 && <p className="text-xs text-amber-600 mt-1 font-bold">No models found in database.</p>}
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Category</label>
              <Select
                id="promptCategory"
                name="promptCategory"
                value={prompt.categoryId || ''}
                onChange={val => setPrompt({...prompt, categoryId: val})}
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
            required rows={2}
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
            required rows={8}
            value={prompt.content || ''}
            onChange={e => setPrompt({...prompt, content: e.target.value})}
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
              <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Difficulty Level <span className="text-muted-foreground/40 normal-case tracking-normal font-normal ml-1">optional</span></label>
              <Select
                id="promptDifficulty"
                name="promptDifficulty"
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
              to="/admin/prompts"
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
