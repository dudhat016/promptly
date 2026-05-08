import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, serverTimestamp, addDoc, query, where, limit } from 'firebase/firestore';
import { Prompt, Category, AIModel } from '../../types';
import { Save, LayoutGrid, ChevronDown } from 'lucide-react';
import { AdminPageHeader } from '../../components/admin';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { toast } from 'react-hot-toast';
import TagInput from '../../components/TagInput';
import { useImageUpload } from '../../hooks/useImageUpload';
import { Image as ImageIcon, X } from 'lucide-react';

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

  const { uploadImage, isUploading } = useImageUpload();

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
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Title</label>
              <input 
                type="text" required
                value={prompt.title || ''}
                onChange={e => handleTitleChange(e.target.value)}
                placeholder="e.g. Expert Python Architect"
                className="input"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">SEO Slug</label>
              <input 
                type="text" required
                value={prompt.slug || ''}
                onChange={e => {
                  setPrompt({...prompt, slug: slugify(e.target.value)});
                  setIsManualSEO(prev => ({ ...prev, slug: true }));
                }}
                placeholder="expert-python-architect"
                className="w-full bg-muted/50 border border-border rounded-md p-4 focus:bg-card focus:border-primary/40 focus:outline-none transition-all font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Meta Title (SEO)</label>
              <input 
                type="text"
                value={prompt.metaTitle || ''}
                onChange={e => {
                  setPrompt({...prompt, metaTitle: e.target.value});
                  setIsManualSEO(prev => ({ ...prev, metaTitle: true }));
                }}
                placeholder="Google search title..."
                className="input"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Meta Keywords (SEO)</label>
              <input 
                type="text"
                value={prompt.metaKeywords || ''}
                onChange={e => {
                  setPrompt({...prompt, metaKeywords: e.target.value});
                  setIsManualSEO(prev => ({ ...prev, metaKeywords: true }));
                }}
                placeholder="ai, prompt, gpt4, seo..."
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Meta Description (SEO)</label>
            <textarea 
              rows={2}
              value={prompt.metaDescription || ''}
              onChange={e => {
                setPrompt({...prompt, metaDescription: e.target.value});
                setIsManualSEO(prev => ({ ...prev, metaDescription: true }));
              }}
              placeholder="SEO meta description for Google search results..."
              className="textarea"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Model</label>
              <div className="relative">
                <select 
                  required
                  value={prompt.model || ''}
                  onChange={e => setPrompt({...prompt, model: e.target.value})}
                  className="w-full bg-muted/50 border border-border rounded-md p-4 focus:bg-card focus:border-primary/40 focus:outline-none transition-all appearance-none cursor-pointer pr-12"
                >
                  <option value="">Select Model</option>
                  {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
              {models.length === 0 && <p className="text-xs text-amber-600 mt-1 font-bold">No models found in database. Please add models first.</p>}
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Category</label>
              <div className="relative">
                <select 
                  required
                  value={prompt.categoryId || ''}
                  onChange={e => setPrompt({...prompt, categoryId: e.target.value})}
                  className="w-full bg-muted/50 border border-border rounded-md p-4 focus:bg-card focus:border-primary/40 focus:outline-none transition-all appearance-none cursor-pointer pr-12"
                >
                  <option value="">Select Category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
              {categories.length === 0 && <p className="text-xs text-amber-600 mt-1 font-bold">No categories found in database. Please add categories first.</p>}
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
            <div className="flex items-start gap-6">
              {prompt.imageUrl ? (
                <div className="relative group w-48 h-48 rounded-md overflow-hidden border-2 border-border shadow-xl">
                  <img src={prompt.imageUrl} className="w-full h-full object-cover" alt="Preview" />
                  <button 
                    onClick={() => setPrompt(prev => ({ ...prev, imageUrl: '' }))}
                    className="absolute top-2 right-2 bg-rose-500 text-white p-2 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="w-48 h-48 rounded-md border-2 border-dashed border-border bg-muted/50 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-muted hover:border-primary/300 transition-all text-muted-foreground hover:text-primary">
                  <input 
                    type="file" className="hidden" accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const res = await uploadImage(file, 'prompts');
                        if (res?.success) setPrompt(prev => ({ ...prev, imageUrl: res.url }));
                      }
                    }}
                  />
                  {isUploading ? (
                    <div className="w-6 h-6 border-2 border-primary/600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <ImageIcon className="w-8 h-8 opacity-40" />
                      <span className="text-xs font-bold uppercase tracking-widest">Upload Image</span>
                    </>
                  )}
                </label>
              )}
              <div className="flex-grow pt-4">
                <p className="text-xs text-muted-foreground font-medium leading-relaxed mb-2">Recommended: 1200x800px or 3:2 Aspect Ratio. <br/> This image will be used in marketplace cards and search results.</p>
                <div className="text-xs font-bold uppercase tracking-widest text-primary bg-primary/8 px-3 py-1 rounded-lg w-fit">Supports PNG, JPG, WEBP</div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Short Description</label>
            <textarea 
              required rows={2}
              value={prompt.description || ''}
              onChange={e => handleDescriptionChange(e.target.value)}
              placeholder="Describe what this prompt does in a few sentences..."
              className="textarea"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Full Prompt Template</label>
            <textarea
              required rows={8}
              value={prompt.content || ''}
              onChange={e => setPrompt({...prompt, content: e.target.value})}
              placeholder="Paste the expert prompt content here. Use [VARIABLE], {{variable}}, or <variable> syntax for placeholders..."
              className="input font-mono"
            />
            <p className="text-xs text-muted-foreground/60 mt-1.5">Wrap placeholders in <code className="bg-muted px-1 rounded">[brackets]</code>, <code className="bg-muted px-1 rounded">{"{{braces}}"}</code>, or <code className="bg-muted px-1 rounded">&lt;tags&gt;</code> — they'll be highlighted on the detail page.</p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Sample Output <span className="text-muted-foreground/40 normal-case tracking-normal font-normal ml-1">optional</span></label>
            <textarea
              rows={5}
              value={prompt.sampleOutput || ''}
              onChange={e => setPrompt({...prompt, sampleOutput: e.target.value})}
              placeholder="Paste an example AI response generated by this prompt. Shown to unlocked users as proof of quality."
              className="textarea"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Usage Guide <span className="text-muted-foreground/40 normal-case tracking-normal font-normal ml-1">optional</span></label>
            <textarea
              rows={4}
              value={prompt.usageGuide || ''}
              onChange={e => setPrompt({...prompt, usageGuide: e.target.value})}
              placeholder="Step-by-step tips on how to use this prompt. Shown as a 'How to Use' section after unlock. Plain text or use line breaks for steps."
              className="textarea"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Difficulty Level <span className="text-muted-foreground/40 normal-case tracking-normal font-normal ml-1">optional</span></label>
              <div className="relative">
                <select
                  value={prompt.difficulty || ''}
                  onChange={e => setPrompt({...prompt, difficulty: (e.target.value as Prompt['difficulty']) || undefined})}
                  className="w-full bg-muted/50 border border-border rounded-md p-4 focus:bg-card focus:border-primary/40 focus:outline-none transition-all appearance-none cursor-pointer pr-12"
                >
                  <option value="">Not set</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>
            <div className="flex items-end pb-1">
              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-md border border-border w-full">
                <input
                  type="checkbox" id="isPaid"
                  checked={prompt.isPaid || false}
                  onChange={e => setPrompt({...prompt, isPaid: e.target.checked})}
                  className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
                />
                <label htmlFor="isPaid" className="text-sm font-bold text-foreground select-none">
                  Premium (PRO Only)
                </label>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-border flex gap-4">
            <button 
              type="submit" 
              disabled={saving}
              className="flex-grow btn-primary btn-lg"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Prompt'}
            </button>
            <Link 
              to="/admin/prompts"
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
