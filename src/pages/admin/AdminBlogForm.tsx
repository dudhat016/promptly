import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { BlogPost } from '../../types';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { Save, ArrowLeft, Image as ImageIcon, Upload, Loader2 } from 'lucide-react';
import MDEditor from '@uiw/react-md-editor';
import TagInput from '../../components/TagInput';
import { useImageUpload } from '../../hooks/useImageUpload';

export default function AdminBlogForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isNew = !id || id === 'new';

  const { uploadImage, isUploading } = useImageUpload();
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [post, setPost] = useState<Partial<BlogPost>>({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    metaTitle: '',
    metaDescription: '',
    metaKeywords: '',
    coverImage: '',
    status: 'draft',
    tags: []
  });

  const [isManualSEO, setIsManualSEO] = useState({
    slug: false,
    metaTitle: false,
    metaDescription: false,
    metaKeywords: false
  });

  useEffect(() => {
    if (isNew) {
      setLoading(false);
      return;
    }
    
    async function fetchPost() {
      if (!id) return;
      try {
        const docSnap = await getDoc(doc(db, 'blog_posts', id));
        if (docSnap.exists()) {
          const data = docSnap.id ? { id: docSnap.id, ...docSnap.data() } as BlogPost : { ...docSnap.data() } as BlogPost;
          setPost(data);
          // If editing, assume existing SEO is manual
          setIsManualSEO({
            slug: !!data.slug,
            metaTitle: !!data.metaTitle,
            metaDescription: !!data.metaDescription,
            metaKeywords: !!data.metaKeywords
          });
        } else {
          toast.error("Blog post not found");
          navigate('/admin/blog');
        }
      } catch (error) {
        console.error("Error fetching post:", error);
        toast.error("Failed to load post");
      } finally {
        setLoading(false);
      }
    }
    
    fetchPost();
  }, [id, navigate, isNew]);

  // Auto-generate slug from title if slug is empty
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    setPost(prev => ({
      ...prev,
      title,
      slug: isManualSEO.slug ? prev.slug : slug,
      metaTitle: isManualSEO.metaTitle ? prev.metaTitle : title
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setSaving(true);
    const toastId = toast.loading('Saving blog post...');
    
    try {
      const docId = isNew ? post.slug || Date.now().toString() : id!;
      const postData = {
        ...post,
        authorId: user.uid,
        updatedAt: serverTimestamp(),
      };

      if (isNew) {
        postData.createdAt = serverTimestamp();
      }

      if (post.status === 'published' && !post.publishedAt) {
        postData.publishedAt = serverTimestamp();
      }

      await setDoc(doc(db, 'blog_posts', docId), postData, { merge: true });
      
      toast.success("Blog post saved successfully!", { id: toastId });
      navigate('/admin/blog');
    } catch (error) {
      console.error("Error saving post:", error);
      toast.error("Failed to save blog post", { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/admin/blog')}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            {isNew ? 'Create Blog Post' : 'Edit Blog Post'}
          </h2>
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8 space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4 md:col-span-2">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Title</label>
              <input
                type="text"
                required
                value={post.title || ''}
                onChange={handleTitleChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                placeholder="The Future of AI Prompts..."
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Slug (URL)</label>
              <input
                type="text"
                required
                value={post.slug || ''}
                onChange={e => setPost({ ...post, slug: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                placeholder="the-future-of-ai-prompts"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Status</label>
              <select
                value={post.status || 'draft'}
                onChange={e => setPost({ ...post, status: e.target.value as 'draft' | 'published' })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Cover Image</label>
              <div className="flex gap-2">
                <div className="relative flex-grow">
                  <input
                    type="url"
                    value={post.coverImage || ''}
                    onChange={e => setPost({ ...post, coverImage: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="https://example.com/image.jpg"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <label className="cursor-pointer p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors" title="Upload to Hostinger">
                      {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*" 
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const data = await uploadImage(file, 'blog');
                            if (data?.success) {
                              setPost(prev => ({ ...prev, coverImage: data.url }));
                            }
                          }
                        }}
                        disabled={isUploading}
                      />
                    </label>
                  </div>
                </div>
                {post.coverImage && (
                  <div className="w-11 h-11 rounded-lg border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center bg-slate-50">
                    <img src={post.coverImage} alt="Cover Preview" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Tags</label>
              <TagInput
                value={post.tags || []}
                onChange={(tags) => {
                  setPost(prev => ({ 
                    ...prev, 
                    tags,
                    metaKeywords: isManualSEO.metaKeywords ? prev.metaKeywords : tags.join(', ')
                  }));
                }}
                placeholder="Search or create tags..."
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Meta Keywords (SEO)</label>
              <input
                type="text"
                value={post.metaKeywords || ''}
                onChange={e => {
                  setPost({ ...post, metaKeywords: e.target.value });
                  setIsManualSEO(prev => ({ ...prev, metaKeywords: true }));
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                placeholder="ai, blog, tech, tutorial..."
              />
            </div>
          </div>

          <div className="space-y-4 md:col-span-2 grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Meta Title (SEO)</label>
              <input
                type="text"
                value={post.metaTitle || ''}
                onChange={e => {
                  setPost({ ...post, metaTitle: e.target.value });
                  setIsManualSEO(prev => ({ ...prev, metaTitle: true }));
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                placeholder="Google search title..."
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Meta Description (SEO)</label>
              <textarea
                value={post.metaDescription || ''}
                onChange={e => {
                  setPost({ ...post, metaDescription: e.target.value });
                  setIsManualSEO(prev => ({ ...prev, metaDescription: true }));
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                rows={1}
                placeholder="SEO meta description..."
              />
            </div>
          </div>

          <div className="space-y-4 md:col-span-2">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Excerpt</label>
              <textarea
                required
                value={post.excerpt || ''}
                onChange={e => {
                  const excerpt = e.target.value;
                  setPost(prev => ({
                    ...prev,
                    excerpt,
                    metaDescription: isManualSEO.metaDescription ? prev.metaDescription : excerpt
                  }));
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                rows={2}
                placeholder="A short summary of the blog post..."
              />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-semibold text-slate-700">Content (Markdown supported)</label>
              </div>
              <div data-color-mode="light" className="border border-slate-200 rounded-lg overflow-hidden">
                <MDEditor
                  value={post.content || ''}
                  onChange={(val) => setPost({ ...post, content: val || '' })}
                  height={450}
                  previewOptions={{
                    className: "prose prose-sm max-w-none"
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-6 border-t border-slate-100">
          <button
            type="submit"
            disabled={saving}
            className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Saving...' : 'Save Post'}
          </button>
        </div>
      </form>
    </div>
  );
}
