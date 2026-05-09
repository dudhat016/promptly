import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { Layout, Save, Trash2, Globe, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { AdminPageHeader } from '../../components/admin';
import { toast } from 'react-hot-toast';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import Button from '../../components/ui/Button';
import { cn } from '../../lib/utils';

interface SitePage {
  id: string; // home, explore, pricing, blog, contact
  title: string;
  description: string;
  keywords: string;
  ogImage: string;
  canonical: string;
  path: string;
}

export default function AdminSitePages() {
  const [pages, setPages] = useState<SitePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPage, setEditingPage] = useState<Partial<SitePage> | null>(null);
  const [saving, setSaving] = useState(false);

  const defaultPages = [
    { id: 'home', path: '/', title: 'Promptly - Master AI Prompting' },
    { id: 'explore', path: '/explore', title: 'Explore AI Prompts' },
    { id: 'pricing', path: '/pricing', title: 'Pricing Plans' },
    { id: 'blog', path: '/blog', title: 'AI Prompting Blog' },
    { id: 'contact', path: '/contact', title: 'Contact Us' },
  ];

  useEffect(() => {
    fetchPages();
  }, []);

  async function fetchPages() {
    try {
      const snap = await getDocs(collection(db, 'site_pages'));
      const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() } as SitePage));
      setPages(fetched);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load site pages");
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async () => {
    if (!editingPage?.id) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'site_pages', editingPage.id), editingPage);
      toast.success("Page SEO updated!");
      fetchPages();
      setEditingPage(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save page");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-muted-foreground font-bold">Loading Site Pages...</div>;

  return (
    <div>
      <AdminPageHeader
        label="Content"
        labelIcon={Globe}
        title="Site Pages SEO"
        subtitle="Manage dynamic SEO metadata for core site routes."
        actions={
          <Button
            onClick={() => setEditingPage({ id: '', path: '', title: '', description: '' })}
            variant="primary"
            size="md"
            leftIcon={Plus}
            className="font-bold shadow-sm shadow-primary/20"
          >
            Add Custom Page
          </Button>
        }
      />

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-4">
          {defaultPages.map(dp => {
            const exists = pages.find(p => p.id === dp.id);
            return (
              <Button
                key={dp.id}
                onClick={() => setEditingPage(exists || dp)}
                variant={editingPage?.id === dp.id ? 'primary' : 'ghost'}
                size="lg"
                className={cn(
                  "w-full flex items-center justify-between p-6 rounded-md border transition-all text-left h-auto",
                  editingPage?.id === dp.id 
                    ? 'bg-primary border-primary text-white shadow-xl shadow-primary/20 scale-[1.02] hover:bg-primary/90' 
                    : 'bg-card border-border text-muted-foreground hover:border-primary/20 hover:bg-muted/10'
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={cn("p-3 rounded-md", editingPage?.id === dp.id ? 'bg-card/20' : 'bg-primary/8 text-primary')}>
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">{dp.id.toUpperCase()}</p>
                    <p className={cn("text-xs font-bold", editingPage?.id === dp.id ? 'text-primary-foreground/80' : 'text-muted-foreground')}>{dp.path}</p>
                  </div>
                </div>
                {exists ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5 opacity-50" />}
              </Button>
            );
          })}
          
          <div className="h-[1px] bg-muted my-8" />
          
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-4">Custom Pages</h3>
          {pages.filter(p => !defaultPages.find(dp => dp.id === p.id)).map(p => (
            <Button
              key={p.id}
              onClick={() => setEditingPage(p)}
              variant={editingPage?.id === p.id ? 'primary' : 'ghost'}
              size="lg"
              className={cn(
                "w-full flex items-center justify-between p-6 rounded-md border transition-all text-left h-auto",
                editingPage?.id === p.id 
                  ? 'bg-primary border-primary text-white shadow-xl shadow-primary/20 hover:bg-primary/90' 
                  : 'bg-card border-border text-muted-foreground hover:border-primary/20 hover:bg-muted/10'
              )}
            >
              <div className="flex items-center gap-4">
                <div className={cn("p-3 rounded-md", editingPage?.id === p.id ? 'bg-card/20' : 'bg-primary/8 text-primary')}>
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm">{p.id}</p>
                  <p className={cn("text-xs font-bold", editingPage?.id === p.id ? 'text-primary-foreground/80' : 'text-muted-foreground')}>{p.path}</p>
                </div>
              </div>
            </Button>
          ))}
        </div>

        <div className="lg:col-span-2">
          {editingPage ? (
            <div className="bg-card rounded-lg border border-border shadow-sm p-10 sticky top-24">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-base font-semibold">Configure <span className="text-primary">/{editingPage.id}</span></h3>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground bg-muted/50 px-4 py-2 rounded-md border border-border">
                  <Globe className="w-3 h-3" />
                  Dynamic SEO
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <Input 
                    label="Page ID (System)"
                    id="pageId"
                    name="pageId"
                    type="text" 
                    value={editingPage.id || ''}
                    onChange={e => setEditingPage({...editingPage, id: e.target.value})}
                    placeholder="home, pricing, etc"
                    className="font-mono"
                  />
                  <Input 
                    label="Path"
                    id="pagePath"
                    name="pagePath"
                    type="text" 
                    value={editingPage.path || ''}
                    onChange={e => setEditingPage({...editingPage, path: e.target.value})}
                    placeholder="/example"
                    className="font-mono"
                  />
                </div>

                <Input 
                  label="Meta Title"
                  id="metaTitle"
                  name="metaTitle"
                  type="text" 
                  value={editingPage.title || ''}
                  onChange={setEditingPage ? e => setEditingPage({...editingPage, title: e.target.value}) : undefined}
                  placeholder="Page title for search engines"
                />

                <Textarea 
                  label="Meta Description"
                  id="metaDescription"
                  name="metaDescription"
                  rows={3}
                  value={editingPage.description || ''}
                  onChange={e => setEditingPage({...editingPage, description: e.target.value})}
                  placeholder="Brief summary for Google results (150-160 chars)"
                  variant="filled"
                />

                <Input 
                  label="Keywords (Comma separated)"
                  id="metaKeywords"
                  name="metaKeywords"
                  type="text" 
                  value={editingPage.keywords || ''}
                  onChange={e => setEditingPage({...editingPage, keywords: e.target.value})}
                  placeholder="ai, prompts, marketplace, gpt"
                />

                <div className="grid grid-cols-2 gap-4">
                  <Input 
                    label="OG Image URL"
                    id="ogImage"
                    name="ogImage"
                    type="text" 
                    value={editingPage.ogImage || ''}
                    onChange={e => setEditingPage({...editingPage, ogImage: e.target.value})}
                    placeholder="https://site.com/image.png"
                  />
                  <Input 
                    label="Canonical URL"
                    id="canonicalUrl"
                    name="canonicalUrl"
                    type="text" 
                    value={editingPage.canonical || ''}
                    onChange={e => setEditingPage({...editingPage, canonical: e.target.value})}
                    placeholder="https://promptly.com/pricing"
                  />
                </div>

                <div className="pt-6 border-t border-border flex gap-4">
                  <Button
                    onClick={handleSave}
                    isLoading={saving}
                    variant="primary"
                    size="lg"
                    fullWidth
                    leftIcon={Save}
                    className="font-bold shadow-xl shadow-primary/20"
                  >
                    {saving ? 'Saving...' : 'Save Meta Data'}
                  </Button>
                  <Button
                    onClick={() => setEditingPage(null)}
                    variant="secondary"
                    size="lg"
                    className="px-8 font-bold"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[400px] bg-muted/50 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center p-12 text-center">
              <Globe className="w-16 h-16 text-muted-foreground/20 mb-4" />
              <h3 className="text-base font-semibold text-foreground mb-2">Select a Page</h3>
              <p className="text-muted-foreground max-w-xs">Choose a core site page from the list to manage its dynamic SEO meta tags.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
