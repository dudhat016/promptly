import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePath } from '../../hooks/usePath';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { BlogPost } from '../../types';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { Save, ArrowLeft, Upload, Loader2, FileText } from 'lucide-react';
import { AdminPageHeader, ImageUpload } from '../../components/admin';
import Button from '../../components/primitives/Button';
import Editor from '../../components/primitives/Editor';
import TagInput from '../../components/TagInput';
import { useImageUpload } from '../../hooks/useImageUpload';
import Select from '../../components/primitives/Select';
import { cn } from '../../lib/utils';
import Input from '../../components/primitives/Input';
import Textarea from '../../components/primitives/Textarea';

export default function AdminBlogForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { prefix } = usePath();
  const { user } = useAuth();
  const { theme } = useTheme();
  const isNew = !id || id === 'new';

  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const { uploadImage, isUploading } = useImageUpload();
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
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
          navigate(prefix('/admin/blog'));
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
    if (errors.title) setErrors(prev => ({ ...prev, title: '' }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!post.title?.trim()) newErrors.title = "Title is required";
    if (!post.slug?.trim()) newErrors.slug = "URL slug is required";
    if (!post.excerpt?.trim()) newErrors.excerpt = "Excerpt is required";
    if (!post.content?.trim()) newErrors.content = "Content is required";

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      toast.error("Please fill in all required fields");
      return false;
    }
    return true;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!validate()) return;

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
      navigate(prefix('/admin/blog'));
    } catch (error) {
      console.error("Error saving post:", error);
      toast.error("Failed to save blog post", { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  const inputCls = "w-full bg-card border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:border-primary transition-colors";

  return (
    <div className="space-y-6">
      <AdminPageHeader
        label="Content"
        labelIcon={FileText}
        title={isNew ? 'Create Blog Post' : 'Edit Blog Post'}
        subtitle="Write and publish platform blog content and announcements."
        actions={
          <Button
            onClick={() => navigate(prefix('/admin/blog'))}
            variant="secondary"
            size="md"
            leftIcon={ArrowLeft}
            className="font-bold"
          >
            Back to Blog
          </Button>
        }
      />

      <form onSubmit={handleSave} className="bg-card rounded-2xl border border-border p-6 md:p-8 space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4 md:col-span-2">
            <Input 
              label="Title"
              id="blogTitle"
              name="blogTitle"
              type="text"
              error={errors.title}
              value={post.title || ''}
              onChange={handleTitleChange}
              placeholder="The Future of AI Prompts..."
            />
          </div>

          <div className="space-y-4">
            <Input 
              label="Slug (URL)"
              id="blogSlug"
              name="blogSlug"
              type="text"
              error={errors.slug}
              value={post.slug || ''}
              onChange={e => {
                setPost({ ...post, slug: e.target.value });
                if (errors.slug) setErrors(prev => ({ ...prev, slug: '' }));
              }}
              placeholder="the-future-of-ai-prompts"
              className="font-mono"
            />

            <div>
              <label className="block text-sm font-semibold text-muted-foreground mb-1">Status</label>
              <Select
                value={post.status || 'draft'}
                onChange={val => setPost({ ...post, status: val as 'draft' | 'published' })}
                options={[
                  { label: 'Draft', value: 'draft', description: 'Post is only visible to admins' },
                  { label: 'Published', value: 'published', description: 'Post is live for all users' }
                ]}
                isSearchable={false}
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-muted-foreground mb-2">Cover Image</label>
            <ImageUpload
              value={post.coverImage || ''}
              onChange={url => setPost({ ...post, coverImage: url })}
              folder="blog"
              aspectRatio="video"
              helpText="Recommended: 1200x630px (Open Graph Standard). This image will be used in blog cards and social sharing previews."
            />
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
            <Input 
              label="Meta Keywords (SEO)"
              id="metaKeywords"
              name="metaKeywords"
              type="text"
              value={post.metaKeywords || ''}
              onChange={e => {
                setPost({ ...post, metaKeywords: e.target.value });
                setIsManualSEO(prev => ({ ...prev, metaKeywords: true }));
              }}
              placeholder="ai, blog, tech, tutorial..."
            />
          </div>

          <div className="space-y-4 md:col-span-2 grid md:grid-cols-2 gap-6">
            <Input 
              label="Meta Title (SEO)"
              id="metaTitle"
              name="metaTitle"
              type="text"
              value={post.metaTitle || ''}
              onChange={e => {
                setPost({ ...post, metaTitle: e.target.value });
                setIsManualSEO(prev => ({ ...prev, metaTitle: true }));
              }}
              placeholder="Google search title..."
            />
            <Textarea 
              label="Meta Description (SEO)"
              id="metaDescription"
              name="metaDescription"
              value={post.metaDescription || ''}
              onChange={e => {
                setPost({ ...post, metaDescription: e.target.value });
                setIsManualSEO(prev => ({ ...prev, metaDescription: true }));
              }}
              rows={1}
              placeholder="SEO meta description..."
              className="min-h-[50px]"
              variant="filled"
            />
          </div>

          <div className="space-y-4 md:col-span-2">
            <Textarea 
              label="Excerpt"
              id="blogExcerpt"
              name="blogExcerpt"
              error={errors.excerpt}
              value={post.excerpt || ''}
              onChange={e => {
                const excerpt = e.target.value;
                setPost(prev => ({
                  ...prev,
                  excerpt,
                  metaDescription: isManualSEO.metaDescription ? prev.metaDescription : excerpt
                }));
                if (errors.excerpt) setErrors(prev => ({ ...prev, excerpt: '' }));
              }}
              rows={2}
              placeholder="A short summary of the blog post..."
              className="min-h-[80px]"
              variant="filled"
            />

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-semibold text-muted-foreground">Content</label>
              </div>
              <Editor
                value={post.content || ''}
                onChange={(val) => {
                  setPost({ ...post, content: val || '' });
                  if (errors.content) setErrors(prev => ({ ...prev, content: '' }));
                }}
                placeholder="Start writing your masterpiece..."
              />
              {errors.content && (
                <p className="text-[11px] font-bold text-destructive mt-1.5 animate-in fade-in slide-in-from-top-1">
                  {errors.content}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-6 border-t border-border">
          <Button
            type="submit"
            isLoading={saving}
            variant="primary"
            size="lg"
            leftIcon={Save}
            className="font-bold shadow-lg shadow-primary/20 px-8"
          >
            {saving ? 'Saving...' : 'Save Post'}
          </Button>
        </div>
      </form>
    </div>
  );
}
