import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { BlogPost } from '../../types';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { Save, ArrowLeft, Upload, Loader2, FileText } from 'lucide-react';
import { AdminPageHeader } from '../../components/admin';
import MDEditor from '@uiw/react-md-editor';
import TagInput from '../../components/TagInput';
import { useImageUpload } from '../../hooks/useImageUpload';

export default function AdminBlogForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme } = useTheme();
  const isNew = !id || id === 'new';

  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

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

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  const inputCls = "w-full bg-card border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors";

  return (
    <div className="max-w-4xl space-y-6">
      <AdminPageHeader
        label="Content"
        labelIcon={FileText}
        title={isNew ? 'Create Blog Post' : 'Edit Blog Post'}
        subtitle="Write and publish platform blog content and announcements."
        actions={
          <button onClick={() => navigate('/admin/blog')} className="btn-secondary">
            <ArrowLeft className="w-4 h-4" />
            Back to Blog
          </button>
        }
      />

      <form onSubmit={handleSave} className="bg-card rounded-2xl border border-border p-6 md:p-8 space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4 md:col-span-2">
            <div>
              <label className="block text-sm font-semibold text-muted-foreground mb-1">Title</label>
              <input
                type="text"
                required
                value={post.title || ''}
                onChange={handleTitleChange}
                className={inputCls}
                placeholder="The Future of AI Prompts..."
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-muted-foreground mb-1">Slug (URL)</label>
              <input
                type="text"
                required
                value={post.slug || ''}
                onChange={e => setPost({ ...post, slug: e.target.value })}
                className={inputCls}
                placeholder="the-future-of-ai-prompts"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-muted-foreground mb-1">Status</label>
              <select
                value={post.status || 'draft'}
                onChange={e => setPost({ ...post, status: e.target.value as 'draft' | 'published' })}
                className={inputCls}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-muted-foreground mb-1">Cover Image</label>
              <div className="flex gap-2">
                <div className="relative flex-grow">
                  <input
                    type="url"
                    value={post.coverImage || ''}
                    onChange={e => setPost({ ...post, coverImage: e.target.value })}
                    className={inputCls}
                    placeholder="https://example.com/image.jpg"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <label className="cursor-pointer p-1.5 text-primary hover:bg-primary/10 rounded-md transition-colors" title="Upload image">
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
                  <div className="w-11 h-11 rounded-lg border border-border overflow-hidden shrink-0 flex items-center justify-center bg-muted">
                    <img src={post.coverImage} alt="Cover Preview" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-muted-foreground mb-1">Tags</label>
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
              <label className="block text-sm font-semibold text-muted-foreground mb-1">Meta Keywords (SEO)</label>
              <input
                type="text"
                value={post.metaKeywords || ''}
                onChange={e => {
                  setPost({ ...post, metaKeywords: e.target.value });
                  setIsManualSEO(prev => ({ ...prev, metaKeywords: true }));
                }}
                className={inputCls}
                placeholder="ai, blog, tech, tutorial..."
              />
            </div>
          </div>

          <div className="space-y-4 md:col-span-2 grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-muted-foreground mb-1">Meta Title (SEO)</label>
              <input
                type="text"
                value={post.metaTitle || ''}
                onChange={e => {
                  setPost({ ...post, metaTitle: e.target.value });
                  setIsManualSEO(prev => ({ ...prev, metaTitle: true }));
                }}
                className={inputCls}
                placeholder="Google search title..."
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-muted-foreground mb-1">Meta Description (SEO)</label>
              <textarea
                value={post.metaDescription || ''}
                onChange={e => {
                  setPost({ ...post, metaDescription: e.target.value });
                  setIsManualSEO(prev => ({ ...prev, metaDescription: true }));
                }}
                className={inputCls}
                rows={1}
                placeholder="SEO meta description..."
              />
            </div>
          </div>

          <div className="space-y-4 md:col-span-2">
            <div>
              <label className="block text-sm font-semibold text-muted-foreground mb-1">Excerpt</label>
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
                className={inputCls}
                rows={2}
                placeholder="A short summary of the blog post..."
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-semibold text-muted-foreground">Content (Markdown supported)</label>
              </div>
              <div data-color-mode={isDark ? 'dark' : 'light'} className="border border-border rounded-lg overflow-hidden">
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

        <div className="flex justify-end pt-6 border-t border-border">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-sm text-white transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, hsl(258,90%,56%), hsl(280,90%,60%))' }}
          >
            <Save className="w-5 h-5" />
            {saving ? 'Saving...' : 'Save Post'}
          </button>
        </div>
      </form>
    </div>
  );
}
