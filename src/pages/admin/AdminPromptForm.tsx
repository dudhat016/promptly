import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, serverTimestamp, addDoc, query, where, limit } from 'firebase/firestore';
import { Prompt, Category, AIModel } from '../../types';
import { Save, ChevronRight, LayoutGrid } from 'lucide-react';
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
    title: '', slug: '', description: '', metaTitle: '', metaDescription: '', metaKeywords: '', content: '', imageUrl: '', model: '', isPaid: false, tags: []
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
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-8 font-medium">
        <Link to="/admin" className="hover:text-indigo-600 flex items-center gap-2"><LayoutGrid className="w-4 h-4" /> Admin</Link>
        <ChevronRight className="w-4 h-4" />
        <Link to="/admin/prompts" className="hover:text-indigo-600">Prompts</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-slate-900">{id === 'new' ? 'Create New Prompt' : 'Edit Prompt'}</span>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-10">
        <h2 className="text-3xl font-black mb-8">{id === 'new' ? 'Create Prompt' : 'Edit Prompt'}</h2>
        
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Title</label>
              <input 
                type="text" required
                value={prompt.title || ''}
                onChange={e => handleTitleChange(e.target.value)}
                placeholder="e.g. Expert Python Architect"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">SEO Slug</label>
              <input 
                type="text" required
                value={prompt.slug || ''}
                onChange={e => {
                  setPrompt({...prompt, slug: slugify(e.target.value)});
                  setIsManualSEO(prev => ({ ...prev, slug: true }));
                }}
                placeholder="expert-python-architect"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Meta Title (SEO)</label>
              <input 
                type="text"
                value={prompt.metaTitle || ''}
                onChange={e => {
                  setPrompt({...prompt, metaTitle: e.target.value});
                  setIsManualSEO(prev => ({ ...prev, metaTitle: true }));
                }}
                placeholder="Google search title..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Meta Keywords (SEO)</label>
              <input 
                type="text"
                value={prompt.metaKeywords || ''}
                onChange={e => {
                  setPrompt({...prompt, metaKeywords: e.target.value});
                  setIsManualSEO(prev => ({ ...prev, metaKeywords: true }));
                }}
                placeholder="ai, prompt, gpt4, seo..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Meta Description (SEO)</label>
            <textarea 
              rows={2}
              value={prompt.metaDescription || ''}
              onChange={e => {
                setPrompt({...prompt, metaDescription: e.target.value});
                setIsManualSEO(prev => ({ ...prev, metaDescription: true }));
              }}
              placeholder="SEO meta description for Google search results..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Model</label>
              <div className="relative">
                <select 
                  required
                  value={prompt.model || ''}
                  onChange={e => setPrompt({...prompt, model: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all appearance-none cursor-pointer pr-12"
                >
                  <option value="">Select Model</option>
                  {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ChevronRight className="w-5 h-5 rotate-90" />
                </div>
              </div>
              {models.length === 0 && <p className="text-[10px] text-amber-600 mt-1 font-bold">No models found in database. Please add models first.</p>}
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Category</label>
              <div className="relative">
                <select 
                  required
                  value={prompt.categoryId || ''}
                  onChange={e => setPrompt({...prompt, categoryId: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all appearance-none cursor-pointer pr-12"
                >
                  <option value="">Select Category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ChevronRight className="w-5 h-5 rotate-90" />
                </div>
              </div>
              {categories.length === 0 && <p className="text-[10px] text-amber-600 mt-1 font-bold">No categories found in database. Please add categories first.</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Tags</label>
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
            <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Prompt Preview Image</label>
            <div className="flex items-start gap-6">
              {prompt.imageUrl ? (
                <div className="relative group w-48 h-48 rounded-[2rem] overflow-hidden border-2 border-slate-100 shadow-xl">
                  <img src={prompt.imageUrl} className="w-full h-full object-cover" alt="Preview" />
                  <button 
                    onClick={() => setPrompt(prev => ({ ...prev, imageUrl: '' }))}
                    className="absolute top-2 right-2 bg-rose-500 text-white p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="w-48 h-48 rounded-[2rem] border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-100 hover:border-indigo-300 transition-all text-slate-400 hover:text-indigo-600">
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
                    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <ImageIcon className="w-8 h-8 opacity-40" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Upload Image</span>
                    </>
                  )}
                </label>
              )}
              <div className="flex-grow pt-4">
                <p className="text-xs text-slate-400 font-medium leading-relaxed mb-2">Recommended: 1200x800px or 3:2 Aspect Ratio. <br/> This image will be used in marketplace cards and search results.</p>
                <div className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg w-fit">Supports PNG, JPG, WEBP</div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Short Description</label>
            <textarea 
              required rows={2}
              value={prompt.description || ''}
              onChange={e => handleDescriptionChange(e.target.value)}
              placeholder="Describe what this prompt does in a few sentences..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Full Prompt Template</label>
            <textarea 
              required rows={8}
              value={prompt.content || ''}
              onChange={e => setPrompt({...prompt, content: e.target.value})}
              placeholder="Paste the expert prompt content here..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all font-mono text-sm"
            />
          </div>

          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <input 
              type="checkbox" id="isPaid" 
              checked={prompt.isPaid || false}
              onChange={e => setPrompt({...prompt, isPaid: e.target.checked})}
              className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="isPaid" className="text-sm font-bold text-slate-700 select-none">
              Premium Item (Requires PRO Subscription)
            </label>
          </div>

          <div className="pt-6 border-t border-slate-100 flex gap-4">
            <button 
              type="submit" 
              disabled={saving}
              className="flex-grow bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Prompt'}
            </button>
            <Link 
              to="/admin/prompts"
              className="px-8 bg-slate-100 text-slate-600 font-bold py-4 rounded-2xl hover:bg-slate-200 transition-all text-center"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
