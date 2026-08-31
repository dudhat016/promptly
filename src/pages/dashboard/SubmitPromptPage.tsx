import { addDoc, collection, doc, getDoc, getDocs, increment, serverTimestamp, updateDoc } from 'firebase/firestore';
import { BookOpen, ChevronDown, ImageIcon, Info, Pencil, Send } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import TagInput from '../../components/TagInput';
import Button from '../../components/primitives/Button';
import Card from '../../components/primitives/Card';
import Input from '../../components/primitives/Input';
import Select from '../../components/primitives/Select';
import Textarea from '../../components/primitives/Textarea';
import { useAuth } from '../../hooks/useAuth';
import { usePath } from '../../hooks/usePath';
import { api } from '../../lib/api';
import { db } from '../../lib/firebase';
import { useImageUpload } from '../../hooks/useImageUpload';
import { EmailService } from '../../services/emailService';
import { Category, AIModel } from '../../types';

const slugify = (text: string) =>
  text.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '');

export default function SubmitPromptPage() {
  const { user, profile } = useAuth();
  const { prefix } = usePath();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const isEditing = !!editId;

  const { uploadImage, isUploading } = useImageUpload();

  const [categories, setCategories] = useState<Category[]>([]);
  const [models, setModels] = useState<AIModel[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(isEditing);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [seoOpen, setSeoOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '', slug: '', description: '', content: '',
    imageUrl: '', categoryId: '', model: '', tags: [] as string[],
    sampleOutput: '', usageGuide: '',
    metaTitle: '', metaDescription: '', metaKeywords: '',
  });

  const [manualSlug, setManualSlug] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [catRes, modRes]: [any, any] = await Promise.all([
          api.get('/categories'),
          api.get('/models'),
        ]);

        const catData = Array.isArray(catRes) ? catRes : (catRes?.data || []);
        const modData = Array.isArray(modRes) ? modRes : (modRes?.data || []);

        setCategories(catData);
        setModels(modData);
      } catch (err) {
        console.error('Failed to load categories/models via API:', err);
      }

      if (editId) {
        try {
          const snap = await getDoc(doc(db, 'prompts', editId));
          if (!snap.exists()) { toast.error('Prompt not found'); navigate(prefix('/dashboard/library')); return; }
          const data = snap.data();
          if (data.creatorId !== user?.uid) { toast.error('Not your prompt'); navigate(prefix('/dashboard/library')); return; }
          if (data.status === 'approved') { toast.error('Published prompts cannot be edited — submit a new prompt instead'); navigate(prefix('/dashboard/library')); return; }
          setForm({
            title: data.title || '',
            slug: data.slug || '',
            description: data.description || '',
            content: data.content || '',
            imageUrl: data.imageUrl || '',
            categoryId: data.categoryId || '',
            model: data.model || '',
            tags: data.tags || [],
            sampleOutput: data.sampleOutput || '',
            usageGuide: data.usageGuide || '',
            metaTitle: data.metaTitle || '',
            metaDescription: data.metaDescription || '',
            metaKeywords: data.metaKeywords || '',
          });
          setManualSlug(!!data.slug);
          if (data.status === 'rejected' && data.rejectionReason) {
            setRejectionReason(data.rejectionReason);
          }
        } catch {
          toast.error('Failed to load prompt');
          navigate(prefix('/dashboard/library'));
        } finally {
          setLoadingEdit(false);
        }
      }
    }
    load();
  }, [editId, user?.uid]);

  const set = (key: keyof typeof form, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: '' }));
  };

  const handleTitleChange = (val: string) => {
    setForm(prev => ({
      ...prev,
      title: val,
      slug: manualSlug ? prev.slug : slugify(val),
      metaTitle: prev.metaTitle || val,
    }));
    if (errors.title) setErrors(prev => ({ ...prev, title: '' }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await uploadImage(file, 'prompts');
    if (result?.success && result.url) {
      set('imageUrl', result.url);
    } else {
      toast.error('Image upload failed');
    }
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.title.trim() || form.title.length < 10) e.title = 'Title must be at least 10 characters';
    if (!form.description.trim() || form.description.length < 30) e.description = 'Description must be at least 30 characters';
    if (!form.content.trim() || form.content.length < 150) e.content = 'Prompt content must be at least 150 characters';
    if (!form.categoryId) e.categoryId = 'Category is required';
    if (!form.model) e.model = 'AI Model is required';
    if (!form.imageUrl) e.imageUrl = 'Cover image is required';
    if (form.tags.length < 2) e.tags = 'Add at least 2 tags';
    setErrors(e);
    if (Object.keys(e).length > 0) {
      toast.error('Please fix the highlighted fields');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !user) return;
    setSaving(true);
    try {
      if (isEditing && editId) {
        await updateDoc(doc(db, 'prompts', editId), {
          ...form,
          slug: form.slug || slugify(form.title),
          status: 'pending',
          moderationStatus: 'active',
          submittedAt: new Date().toISOString(),
          updatedAt: serverTimestamp(),
          rejectionReason: null,
          previousRejectionReason: rejectionReason || null,
          resubmissionCount: increment(1),
        });
        toast.success('Prompt resubmitted for review!');
        EmailService.sendPromptSubmittedEmail(user.uid, form.title).catch(() => {});
      } else {
        await addDoc(collection(db, 'prompts'), {
          ...form,
          slug: form.slug || slugify(form.title),
          creatorId: user.uid,
          creatorName: profile?.displayName || user.displayName || user.email || 'Creator',
          creatorRole: 'user',
          status: 'pending',
          moderationStatus: 'active',
          likesCount: 0,
          viewsCount: 0,
          copiesCount: 0,
          reportCount: 0,
          submittedAt: new Date().toISOString(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast.success('Prompt submitted for review!');
        EmailService.sendPromptSubmittedEmail(user.uid, form.title).catch(() => {});
      }
      navigate(prefix('/dashboard/library'));
    } catch (err) {
      console.error(err);
      toast.error(`Failed to ${isEditing ? 'update' : 'submit'} prompt`);
    } finally {
      setSaving(false);
    }
  };

  const categoryOptions = [
    { value: '', label: 'Select a category' },
    ...categories.map(c => ({ value: c.id, label: c.name })),
  ];
  const modelOptions = [
    { value: '', label: 'Select AI model' },
    ...models.map(m => ({ value: (m as any).name || m.id, label: (m as any).displayName || (m as any).name || m.id })),
  ];

  if (loadingEdit) {
    return (
      <div className="max-w-3xl mx-auto py-16">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-1/3 bg-muted rounded-lg" />
          <div className="h-64 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-[0.2em] text-xs mb-2">
          {isEditing ? <Pencil className="w-4 h-4" /> : <Send className="w-4 h-4" />}
          {isEditing ? 'Edit Submission' : 'Marketplace Submission'}
        </div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          {isEditing ? 'Edit Prompt' : 'Submit a Prompt'}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isEditing
            ? 'Update your prompt and resubmit it for review.'
            : 'Your submission will be reviewed by our team before appearing on the marketplace.'}
        </p>
      </div>

      {/* Rejection reason banner */}
      {rejectionReason && (
        <div className="flex gap-3 p-4 bg-rose-500/5 border border-rose-500/20 rounded-xl mb-6">
          <Info className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-semibold text-rose-600 mb-0.5">Previous rejection reason</p>
            <p className="text-muted-foreground">{rejectionReason}</p>
          </div>
        </div>
      )}

      {/* Guidelines */}
      {!isEditing && (
        <div className="flex gap-3 p-4 bg-primary/5 border border-primary/20 rounded-xl mb-8">
          <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground">Submission guidelines</p>
            <ul className="space-y-0.5 list-disc list-inside">
              <li>Title ≥ 10 characters, content ≥ 150 characters</li>
              <li>Cover image and at least 2 tags are required</li>
              <li>Do not submit prompts that have already been published</li>
              <li>Review takes 24–48 hours — you'll see the status in My Creations</li>
            </ul>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Core fields */}
        <Card className="space-y-5">
          <h2 className="font-bold text-foreground text-sm uppercase tracking-widest text-primary/80 flex items-center gap-2">
            <BookOpen className="w-4 h-4" /> Core Details
          </h2>

          <Input
            label="Title *"
            value={form.title}
            onChange={e => handleTitleChange(e.target.value)}
            placeholder="e.g. Expert Cold Email Generator"
            error={errors.title}
            variant="outline"
          />

          <Textarea
            label="Short Description *"
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="What does this prompt do? Who is it for? (min 30 chars)"
            rows={3}
            error={errors.description}
            variant="outline"
          />

          <Textarea
            label="Prompt Content *"
            value={form.content}
            onChange={e => set('content', e.target.value)}
            placeholder="Paste your full prompt here... (min 150 chars)"
            rows={8}
            error={errors.content}
            variant="outline"
            helperText={`${form.content.length} / 150 min chars`}
          />
        </Card>

        {/* Classification */}
        <Card className="space-y-5">
          <h2 className="font-bold text-sm uppercase tracking-widest text-primary/80">Classification</h2>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="AI Model *"
              value={form.model}
              onChange={val => set('model', val)}
              options={modelOptions}
              error={errors.model}
            />
            <Select
              label="Category *"
              value={form.categoryId}
              onChange={val => set('categoryId', val)}
              options={categoryOptions}
              error={errors.categoryId}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Tags * <span className="text-muted-foreground font-normal">(add 2–10)</span>
            </label>
            <TagInput
              value={form.tags}
              onChange={tags => { set('tags', tags); }}
            />
            {errors.tags && <p className="text-xs text-destructive mt-1">{errors.tags}</p>}
          </div>
        </Card>

        {/* Image */}
        <Card className="space-y-4">
          <h2 className="font-bold text-sm uppercase tracking-widest text-primary/80">Cover Image *</h2>

          {form.imageUrl ? (
            <div className="relative rounded-xl overflow-hidden aspect-video border border-border">
              <img src={form.imageUrl} alt="Cover" className="w-full h-full object-cover" />
              <Button
                type="button"
                onClick={() => set('imageUrl', '')}
                variant="secondary"
                size="sm"
                className="absolute top-3 right-3"
              >
                Change
              </Button>
            </div>
          ) : (
            <label className={`flex flex-col items-center justify-center aspect-video rounded-xl border-2 border-dashed cursor-pointer transition-colors hover:border-primary/40 hover:bg-primary/5 ${errors.imageUrl ? 'border-destructive' : 'border-border'}`}>
              <ImageIcon className="w-8 h-8 text-muted-foreground/40 mb-2" />
              <span className="text-sm font-medium text-muted-foreground">
                {isUploading ? 'Uploading...' : 'Click to upload cover image'}
              </span>
              <span className="text-xs text-muted-foreground/60 mt-1">PNG, JPG, WebP — recommended 1280×720</span>
              <input type="file" accept="image/*" className="sr-only" onChange={handleImageUpload} disabled={isUploading} />
            </label>
          )}
          {errors.imageUrl && <p className="text-xs text-destructive">{errors.imageUrl}</p>}
        </Card>

        {/* Optional extras */}
        <Card className="space-y-5">
          <h2 className="font-bold text-sm uppercase tracking-widest text-primary/80">Optional Extras</h2>
          <Textarea
            label="Sample Output"
            value={form.sampleOutput}
            onChange={e => set('sampleOutput', e.target.value)}
            placeholder="Paste an example of what this prompt produces..."
            rows={4}
            variant="outline"
          />
          <Textarea
            label="Usage Guide"
            value={form.usageGuide}
            onChange={e => set('usageGuide', e.target.value)}
            placeholder="Tips, variable replacements, best practices..."
            rows={3}
            variant="outline"
          />
        </Card>

        {/* SEO accordion */}
        <Card padding="none" className="overflow-hidden">
          <button
            type="button"
            onClick={() => setSeoOpen(v => !v)}
            className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-muted/30 transition-colors"
          >
            <span className="font-bold text-sm uppercase tracking-widest text-primary/80">SEO Fields (optional)</span>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${seoOpen ? 'rotate-180' : ''}`} />
          </button>
          {seoOpen && (
            <div className="px-6 pb-6 space-y-4 border-t border-border pt-5">
              <Input
                label="SEO Slug"
                value={form.slug}
                onChange={e => { setManualSlug(true); set('slug', e.target.value); }}
                placeholder="auto-generated from title"
                variant="outline"
                helperText="Leave blank to auto-generate from title"
              />
              <Input
                label="Meta Title"
                value={form.metaTitle}
                onChange={e => set('metaTitle', e.target.value)}
                variant="outline"
              />
              <Textarea
                label="Meta Description"
                value={form.metaDescription}
                onChange={e => set('metaDescription', e.target.value)}
                rows={2}
                variant="outline"
              />
              <Input
                label="Meta Keywords"
                value={form.metaKeywords}
                onChange={e => set('metaKeywords', e.target.value)}
                placeholder="comma, separated, keywords"
                variant="outline"
              />
            </div>
          )}
        </Card>

        <div className="flex gap-3 pb-8">
          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={() => navigate(prefix('/dashboard/library'))}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={saving || isUploading}
            leftIcon={isEditing ? Pencil : Send}
            className="flex-1 shadow-lg shadow-primary/20"
          >
            {saving
              ? (isEditing ? 'Saving...' : 'Submitting...')
              : (isEditing ? 'Save & Resubmit' : 'Submit for Review')}
          </Button>
        </div>
      </form>
    </div>
  );
}
