import React, { useEffect, useState } from 'react';
import { collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';
import { Layout, Plus, Trash2, Save, HelpCircle, FileText, ChevronDown, ChevronUp, Sparkles, Rocket, ExternalLink, BarChart, Search, Target, Globe } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Button from '../../components/primitives/Button';
import Card from '../../components/primitives/Card';
import Input from '../../components/primitives/Input';
import Textarea from '../../components/primitives/Textarea';
import Select from '../../components/primitives/Select';
import TagInput from '../../components/primitives/TagInput';
import ImageUpload from '../../components/admin/ImageUpload';
import { cn } from '../../lib/utils';
import { db } from '../../lib/firebase';
import { usePath } from '../../hooks/usePath';
import Editor from '../../components/primitives/Editor';

export interface SitePage {
  id: string;
  path: string;
  title: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
  canonical?: string;
}

interface AdminContentSettingsProps {
  siteContent: any;
  setSiteContent: (content: any) => void;
  onSave: (id: string) => void;
  isSaving: boolean;
  config: any;
  setConfig: (config: any) => void;
  pages: SitePage[];
  setPages: any;
  editingPage: Partial<SitePage> | null;
  setEditingPage: (page: Partial<SitePage> | null) => void;
  savingPage: boolean;
  handleSavePage: () => void;
  defaultPages: Array<{ id: string; path: string; title: string }>;
}

export default function AdminContentSettings({
  siteContent,
  setSiteContent,
  onSave,
  isSaving,
  config,
  setConfig,
  pages,
  setPages,
  editingPage: seoEditingPage,
  setEditingPage: setSeoEditingPage,
  savingPage,
  handleSavePage,
  defaultPages,
}: AdminContentSettingsProps) {
  const { prefix } = usePath();
  const [activeSubTab, setActiveSubTab] = useState('legal');
  const [editingPage, setEditingPage] = useState('terms');
  const [editingOnboarding, setEditingOnboarding] = useState('interests');

  // Custom pages from Firestore (site_pages)
  const [customPages, setCustomPages] = useState<any[]>([]);
  const [isCreatingNewPage, setIsCreatingNewPage] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState('');
  const [newPageSlug, setNewPageSlug] = useState('');
  const [savingCustomPage, setSavingCustomPage] = useState(false);

  // Default system policy pages
  const systemPages = [
    { id: 'terms', label: 'Terms of Service', isSystem: true, path: '/terms' },
    { id: 'privacy', label: 'Privacy Policy', isSystem: true, path: '/privacy' },
    { id: 'dmca', label: 'DMCA Policy', isSystem: true, path: '/dmca' },
    { id: 'cookies', label: 'Cookie Policy', isSystem: true, path: '/cookies' }
  ];

  useEffect(() => {
    async function loadCustomPages() {
      try {
        const snap = await getDocs(collection(db, 'site_pages'));
        const docs = snap.docs.map(d => ({ ...d.data(), id: d.id }));
        setCustomPages(docs);
      } catch (err) {
        console.error('Failed to load site pages:', err);
      }
    }
    loadCustomPages();
  }, []);

  const allPageOptions = [
    ...systemPages.map(p => ({ label: `[System] ${p.label}`, value: p.id, isSystem: true })),
    ...customPages.map(p => ({ label: `[Custom] ${p.title} (/p/${p.id})`, value: p.id, isSystem: false }))
  ];

  const currentCustomPage = customPages.find(p => p.id === editingPage);
  const isCurrentCustom = !!currentCustomPage;

  const handleCreateCustomPage = async () => {
    if (!newPageTitle.trim() || !newPageSlug.trim()) {
      toast.error('Please enter Page Title and URL Slug');
      return;
    }
    const cleanSlug = newPageSlug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-');
    setSavingCustomPage(true);
    try {
      const pageData = {
        title: newPageTitle.trim(),
        content: '<p>Write your custom page content here...</p>',
        isSystem: false,
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'site_pages', cleanSlug), pageData, { merge: true });
      setCustomPages(prev => [...prev.filter(p => p.id !== cleanSlug), { id: cleanSlug, ...pageData }]);
      setEditingPage(cleanSlug);
      setIsCreatingNewPage(false);
      setNewPageTitle('');
      setNewPageSlug('');
      toast.success(`Custom page "${pageData.title}" created successfully!`);
    } catch (err) {
      console.error('Error creating custom page:', err);
      toast.error('Failed to create custom page');
    } finally {
      setSavingCustomPage(false);
    }
  };

  const handleDeleteCustomPage = async (pageId: string) => {
    if (!confirm('Are you sure you want to delete this custom page?')) return;
    try {
      await deleteDoc(doc(db, 'site_pages', pageId));
      setCustomPages(prev => prev.filter(p => p.id !== pageId));
      setEditingPage('terms');
      toast.success('Custom page deleted');
    } catch (err) {
      console.error('Failed to delete custom page:', err);
      toast.error('Failed to delete custom page');
    }
  };

  // FAQ Management Helpers
  const addCategory = () => {
    const newFaq = [...siteContent.faq, { label: 'New Category', icon: '❓', items: [] }];
    setSiteContent({ ...siteContent, faq: newFaq });
  };

  const removeCategory = (catIdx: number) => {
    const newFaq = siteContent.faq.filter((_: any, i: number) => i !== catIdx);
    setSiteContent({ ...siteContent, faq: newFaq });
  };

  const updateCategory = (catIdx: number, field: string, value: string) => {
    const newFaq = [...siteContent.faq];
    newFaq[catIdx] = { ...newFaq[catIdx], [field]: value };
    setSiteContent({ ...siteContent, faq: newFaq });
  };

  const addFaqItem = (catIdx: number) => {
    const newFaq = [...siteContent.faq];
    newFaq[catIdx].items = [...newFaq[catIdx].items, { q: 'New Question', a: 'Answer here...' }];
    setSiteContent({ ...siteContent, faq: newFaq });
  };

  const removeFaqItem = (catIdx: number, itemIdx: number) => {
    const newFaq = [...siteContent.faq];
    newFaq[catIdx].items = newFaq[catIdx].items.filter((_: any, i: number) => i !== itemIdx);
    setSiteContent({ ...siteContent, faq: newFaq });
  };

  const updateFaqItem = (catIdx: number, itemIdx: number, field: string, value: string) => {
    const newFaq = [...siteContent.faq];
    newFaq[catIdx].items[itemIdx] = { ...newFaq[catIdx].items[itemIdx], [field]: value };
    setSiteContent({ ...siteContent, faq: newFaq });
  };

  const moveCategory = (idx: number, dir: 'up' | 'down') => {
    const newFaq = [...siteContent.faq];
    const newIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= newFaq.length) return;
    [newFaq[idx], newFaq[newIdx]] = [newFaq[newIdx], newFaq[idx]];
    setSiteContent({ ...siteContent, faq: newFaq });
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2 p-1 bg-muted/30 rounded-2xl w-fit">
        <Button 
          variant={activeSubTab === 'legal' ? 'white' : 'ghost'} 
          size="sm" 
          onClick={() => setActiveSubTab('legal')}
          className="rounded-xl font-bold uppercase tracking-widest text-[10px]"
        >
          Legal Pages
        </Button>
        <Button 
          variant={activeSubTab === 'faq' ? 'white' : 'ghost'} 
          size="sm" 
          onClick={() => setActiveSubTab('faq')}
          className="rounded-xl font-bold uppercase tracking-widest text-[10px]"
        >
          FAQ Center
        </Button>
        <Button 
          variant={activeSubTab === 'onboarding' ? 'white' : 'ghost'} 
          size="sm" 
          onClick={() => setActiveSubTab('onboarding')}
          className="rounded-xl font-bold uppercase tracking-widest text-[10px]"
        >
          Onboarding
        </Button>
        <Button 
          variant={activeSubTab === 'seo' ? 'white' : 'ghost'} 
          size="sm" 
          onClick={() => setActiveSubTab('seo')}
          className="rounded-xl font-bold uppercase tracking-widest text-[10px]"
        >
          SEO & Analytics
        </Button>
      </div>

      {activeSubTab === 'legal' && (
        <Card padding="none" className="!rounded-3xl shadow-sm">
          <div className="px-8 py-5 border-b border-border bg-muted/10 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-foreground">Legal & Policy Pages</h3>
                <p className="text-xs text-muted-foreground">Manage system policy pages and create dynamic custom pages.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => setIsCreatingNewPage(!isCreatingNewPage)}
                variant="outline"
                size="sm"
                leftIcon={Plus}
                className="rounded-xl font-bold"
              >
                {isCreatingNewPage ? 'Cancel' : 'Create Custom Page'}
              </Button>
              <Button
                onClick={async () => {
                  if (isCurrentCustom && currentCustomPage) {
                    await setDoc(doc(db, 'site_pages', currentCustomPage.id), {
                      ...currentCustomPage,
                      content: siteContent[editingPage] || currentCustomPage.content || '',
                      updatedAt: new Date().toISOString(),
                    }, { merge: true });
                    toast.success(`Saved custom page "${currentCustomPage.title}"`);
                  } else {
                    onSave(editingPage);
                  }
                }}
                isLoading={isSaving}
                variant="primary"
                size="sm"
                leftIcon={Save}
                className="rounded-xl px-6 font-bold shadow-lg shadow-primary/20"
              >
                Save Changes
              </Button>
            </div>
          </div>

          <div className="p-8 space-y-6">
            {/* Create New Page Form */}
            {isCreatingNewPage && (
              <div className="p-4 bg-muted/20 border border-primary/30 rounded-2xl space-y-4">
                <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Create New Dynamic Custom Page
                </h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    label="Page Title"
                    placeholder="e.g. Refund Policy or About Us"
                    value={newPageTitle}
                    onChange={(e) => {
                      setNewPageTitle(e.target.value);
                      if (!newPageSlug) {
                        setNewPageSlug(e.target.value.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-'));
                      }
                    }}
                    variant="outline"
                  />
                  <Input
                    label="URL Slug"
                    placeholder="e.g. refund-policy or about-us"
                    value={newPageSlug}
                    onChange={(e) => setNewPageSlug(e.target.value)}
                    variant="outline"
                    helperText="Public path will be /p/your-slug"
                  />
                </div>
                <Button
                  onClick={handleCreateCustomPage}
                  isLoading={savingCustomPage}
                  disabled={!newPageTitle.trim() || !newPageSlug.trim()}
                  variant="primary"
                  size="sm"
                  leftIcon={Plus}
                  className="font-bold"
                >
                  Create Page Document
                </Button>
              </div>
            )}

            {/* Page Select Dropdown & Actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
              <div className="w-full sm:w-80">
                <Select
                  label="Select Page to Edit"
                  value={editingPage}
                  onChange={(val) => {
                    setEditingPage(val);
                    const custom = customPages.find(p => p.id === val);
                    if (custom && custom.content) {
                      setSiteContent({ ...siteContent, [val]: custom.content });
                    }
                  }}
                  options={allPageOptions}
                />
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={prefix(isCurrentCustom ? `/p/${editingPage}` : `/${editingPage}`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 bg-primary/10 border border-primary/20 rounded-xl text-xs font-bold text-primary hover:bg-primary/20 transition-colors shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View Live Page
                </a>
                {isCurrentCustom && (
                  <Button
                    onClick={() => handleDeleteCustomPage(editingPage)}
                    variant="danger"
                    size="sm"
                    leftIcon={Trash2}
                    className="rounded-xl font-bold"
                  >
                    Delete Page
                  </Button>
                )}
              </div>
            </div>

            {/* Editor */}
            <Editor
              value={siteContent[editingPage] ?? (currentCustomPage?.content || '')}
              onChange={content => setSiteContent({ ...siteContent, [editingPage]: content })}
              placeholder="Start typing your page content here..."
            />
            <p className="text-xs text-muted-foreground font-medium mt-3">
              Tip: Standard HTML and headings format cleanly on the public page viewer.
            </p>
          </div>
        </Card>
      )}

      {activeSubTab === 'faq' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-foreground leading-none">FAQ Management</h3>
                <p className="text-xs text-muted-foreground mt-1">Organize your platform's common questions.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={addCategory} variant="outline" size="sm" leftIcon={Plus} className="rounded-xl">
                Add Category
              </Button>
              <Button onClick={() => onSave('faq')} isLoading={isSaving} variant="primary" size="sm" leftIcon={Save} className="rounded-xl px-6 shadow-lg shadow-primary/20">
                Sync FAQ Center
              </Button>
            </div>
          </div>

          <div className="space-y-8">
            {siteContent.faq.map((cat: any, catIdx: number) => (
              <Card key={catIdx} padding="none" className="!rounded-3xl shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="px-8 py-5 border-b border-border bg-muted/5 flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-grow">
                    <div className="flex flex-col gap-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveCategory(catIdx, 'up')} disabled={catIdx === 0}>
                        <ChevronUp className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveCategory(catIdx, 'down')} disabled={catIdx === siteContent.faq.length - 1}>
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="w-12">
                      <Input 
                        value={cat.icon} 
                        onChange={e => updateCategory(catIdx, 'icon', e.target.value)} 
                        className="text-center text-xl h-11"
                      />
                    </div>
                    <div className="flex-grow">
                      <Input 
                        value={cat.label} 
                        onChange={e => updateCategory(catIdx, 'label', e.target.value)}
                        className="font-bold text-lg border-none bg-transparent hover:bg-muted/50 focus:bg-muted/50"
                        placeholder="Category Label"
                      />
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 rounded-xl" onClick={() => removeCategory(catIdx)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="p-8 space-y-6 bg-muted/5">
                  {cat.items.map((item: any, itemIdx: number) => (
                    <Card key={itemIdx} interactive className="!rounded-2xl relative group shadow-sm hover:border-primary/20">
                      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-lg" onClick={() => removeFaqItem(catIdx, itemIdx)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      <div className="space-y-4 pr-8">
                        <Input 
                          label="Question" 
                          value={item.q} 
                          onChange={e => updateFaqItem(catIdx, itemIdx, 'q', e.target.value)} 
                          variant="outline" 
                          className="font-semibold"
                        />
                        <Textarea 
                          label="Answer" 
                          value={item.a} 
                          onChange={e => updateFaqItem(catIdx, itemIdx, 'a', e.target.value)} 
                          variant="outline" 
                          rows={3}
                        />
                      </div>
                    </Card>
                  ))}

                  <Button
                    onClick={() => addFaqItem(catIdx)} 
                    variant="outline" 
                    fullWidth 
                    className="border-dashed border-2 py-8 rounded-2xl hover:border-primary/50 hover:bg-primary/5 group"
                  >
                    <Plus className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                    Add Question to {cat.label}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
      {activeSubTab === 'onboarding' && (
        <div className="space-y-6">
          <Card padding="none" className="!rounded-3xl shadow-sm">
            <div className="px-8 py-5 border-b border-border bg-muted/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Rocket className="w-4 h-4" />
                </div>
                <h3 className="font-semibold text-lg text-foreground">User Onboarding flow</h3>
              </div>
              <Button
                onClick={() => onSave('onboarding')}
                isLoading={isSaving}
                variant="primary"
                size="sm"
                leftIcon={Save}
                className="rounded-xl px-6"
              >
                Sync Onboarding
              </Button>
            </div>
            <div className="p-8 space-y-6">
              <Select 
                label="Section to Edit"
                value={editingOnboarding}
                onChange={setEditingOnboarding}
                options={[
                  { label: 'Interests & Categories', value: 'interests' },
                  { label: 'AI Model Options', value: 'models' },
                  { label: 'Final Welcome message', value: 'welcome' }
                ]}
              />

              {editingOnboarding === 'interests' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-foreground">Categories & Interests</h4>
                    <Button onClick={() => {
                      const newOnboarding = { ...siteContent.onboarding };
                      newOnboarding.interests = [...(newOnboarding.interests || []), { id: 'new', name: 'New Interest', icon: '✨' }];
                      setSiteContent({ ...siteContent, onboarding: newOnboarding });
                    }} variant="ghost" size="sm" leftIcon={Plus}>Add Interest</Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(siteContent.onboarding?.interests || []).map((interest: any, idx: number) => (
                      <div key={idx} className="p-4 border border-border rounded-2xl flex items-center gap-3 bg-muted/5">
                        <Input 
                          value={interest.icon} 
                          onChange={e => {
                            const newOnboarding = { ...siteContent.onboarding };
                            newOnboarding.interests[idx].icon = e.target.value;
                            setSiteContent({ ...siteContent, onboarding: newOnboarding });
                          }}
                          className="w-12 text-center"
                        />
                        <Input 
                          value={interest.name} 
                          onChange={e => {
                            const newOnboarding = { ...siteContent.onboarding };
                            newOnboarding.interests[idx].name = e.target.value;
                            newOnboarding.interests[idx].id = e.target.value.toLowerCase().replace(/\s+/g, '-');
                            setSiteContent({ ...siteContent, onboarding: newOnboarding });
                          }}
                          className="flex-grow"
                        />
                        <Button variant="ghost" size="icon" onClick={() => {
                          const newOnboarding = { ...siteContent.onboarding };
                          newOnboarding.interests = newOnboarding.interests.filter((_: any, i: number) => i !== idx);
                          setSiteContent({ ...siteContent, onboarding: newOnboarding });
                        }} className="text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {editingOnboarding === 'models' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-foreground">Available AI Models</h4>
                    <Button onClick={() => {
                      const newOnboarding = { ...siteContent.onboarding };
                      newOnboarding.models = [...(newOnboarding.models || []), { id: 'new-model', name: 'New Model', provider: 'Provider', description: 'Description', icon: '🤖' }];
                      setSiteContent({ ...siteContent, onboarding: newOnboarding });
                    }} variant="ghost" size="sm" leftIcon={Plus}>Add Model</Button>
                  </div>
                  <div className="space-y-3">
                    {(siteContent.onboarding?.models || []).map((model: any, idx: number) => (
                      <div key={idx} className="p-4 border border-border rounded-2xl space-y-4 bg-muted/5">
                        <div className="flex gap-3">
                          <Input label="Icon" value={model.icon} onChange={e => {
                            const newOnboarding = { ...siteContent.onboarding };
                            newOnboarding.models[idx].icon = e.target.value;
                            setSiteContent({ ...siteContent, onboarding: newOnboarding });
                          }} className="w-16" />
                          <Input label="Model Name" value={model.name} onChange={e => {
                            const newOnboarding = { ...siteContent.onboarding };
                            newOnboarding.models[idx].name = e.target.value;
                            setSiteContent({ ...siteContent, onboarding: newOnboarding });
                          }} className="flex-grow" />
                          <Button variant="ghost" size="icon" onClick={() => {
                            const newOnboarding = { ...siteContent.onboarding };
                            newOnboarding.models = newOnboarding.models.filter((_: any, i: number) => i !== idx);
                            setSiteContent({ ...siteContent, onboarding: newOnboarding });
                          }} className="text-destructive mt-8">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <Input label="Provider" value={model.provider} onChange={e => {
                            const newOnboarding = { ...siteContent.onboarding };
                            newOnboarding.models[idx].provider = e.target.value;
                            setSiteContent({ ...siteContent, onboarding: newOnboarding });
                          }} />
                          <Input label="Description" value={model.description} onChange={e => {
                            const newOnboarding = { ...siteContent.onboarding };
                            newOnboarding.models[idx].description = e.target.value;
                            setSiteContent({ ...siteContent, onboarding: newOnboarding });
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {editingOnboarding === 'welcome' && (
                <div className="space-y-4">
                  <Input 
                    label="Headline"
                    value={siteContent.onboarding?.welcome?.headline || ''}
                    onChange={e => {
                      const newOnboarding = { ...siteContent.onboarding };
                      newOnboarding.welcome = { ...newOnboarding.welcome, headline: e.target.value };
                      setSiteContent({ ...siteContent, onboarding: newOnboarding });
                    }}
                  />
                  <Textarea 
                    label="Description"
                    value={siteContent.onboarding?.welcome?.description || ''}
                    onChange={e => {
                      const newOnboarding = { ...siteContent.onboarding };
                      newOnboarding.welcome = { ...newOnboarding.welcome, description: e.target.value };
                      setSiteContent({ ...siteContent, onboarding: newOnboarding });
                    }}
                    rows={4}
                  />
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {activeSubTab === 'seo' && (
        <div className="space-y-6">
          <Card icon={BarChart} title="Analytics & Tracking Scripts">
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Input label="Google Analytics 4 ID" value={config.googleAnalyticsId || ''} onChange={e => setConfig({ ...config, googleAnalyticsId: e.target.value })} variant="outline" placeholder="G-XXXXXXXXXX" />
                <Input label="Facebook / Meta Pixel ID" value={config.facebookPixelId || ''} onChange={e => setConfig({ ...config, facebookPixelId: e.target.value })} variant="outline" placeholder="1234567890" />
              </div>
              <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-border">
                <Textarea label="Global Header Scripts" value={config.customHeadScripts || ''} onChange={e => setConfig({ ...config, customHeadScripts: e.target.value })} variant="outline" rows={5} placeholder="<script>…</script>" helperText="Injected into <head> on every page." />
                <Textarea label="Global Footer Scripts" value={config.customFooterScripts || ''} onChange={e => setConfig({ ...config, customFooterScripts: e.target.value })} variant="outline" rows={5} placeholder="<script>…</script>" helperText="Injected before </body> on every page." />
              </div>
            </div>
          </Card>

          <Card icon={Search} title="Route-Specific SEO">
            <div className="space-y-8">
              <div className="flex flex-col md:flex-row items-end gap-4">
                <div className="flex-grow">
                  <Select
                    label="Select Route to Configure"
                    placeholder="Choose a site page…"
                    value={seoEditingPage?.id || ''}
                    onChange={val => {
                      const page = pages.find(p => p.id === val) || defaultPages.find(dp => dp.id === val);
                      setSeoEditingPage(page || null);
                    }}
                    options={[
                      ...(seoEditingPage && !pages.find(p => p.id === seoEditingPage.id) && !defaultPages.find(dp => dp.id === seoEditingPage.id)
                        ? [{ label: `NEW: ${seoEditingPage.id || 'Untitled'}`, value: seoEditingPage.id, description: 'Draft Route', icon: Plus }]
                        : []),
                      ...defaultPages.map(dp => ({
                        label: `${dp.id.toUpperCase()} (${dp.path})`,
                        value: dp.id,
                        description: pages.find(p => p.id === dp.id) ? 'Configured' : 'Using Defaults',
                        icon: Globe,
                      })),
                      ...pages.filter(p => !defaultPages.find(dp => dp.id === p.id)).map(p => ({
                        label: `${p.id.toUpperCase()} (${p.path})`,
                        value: p.id,
                        description: 'Custom Route',
                        icon: Plus,
                      })),
                    ]}
                  />
                </div>
                <Button onClick={() => setSeoEditingPage({ id: '', path: '', title: '', description: '' })} variant="outline" size="sm" leftIcon={Plus} className="rounded-xl font-bold">
                  Add Custom Route
                </Button>
                {seoEditingPage?.id && !defaultPages.find(dp => dp.id === seoEditingPage.id) && pages.find(p => p.id === seoEditingPage.id) && (
                  <Button variant="danger" size="sm" className="rounded-xl font-bold" leftIcon={Trash2}
                    onClick={() => { if (confirm('Delete custom route SEO?')) { deleteDoc(doc(db, 'site_pages', seoEditingPage.id!)).then(() => { setPages(pages.filter(pg => pg.id !== seoEditingPage.id)); setSeoEditingPage(null); toast.success('Deleted'); }); } }}>
                    Delete
                  </Button>
                )}
              </div>

              {seoEditingPage ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><Target className="w-4 h-4" /></div>
                      <div>
                        <h4 className="text-sm font-bold text-foreground">SEO Metadata</h4>
                        <p className="text-xs text-muted-foreground">/{seoEditingPage.id || 'new-route'}</p>
                      </div>
                    </div>
                    {seoEditingPage.path && (
                      <a href={seoEditingPage.path} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 border border-border rounded-xl text-xs font-bold hover:text-primary transition-colors">
                        View Page <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                    <Input label="Route ID" value={seoEditingPage.id || ''} onChange={e => setSeoEditingPage({ ...seoEditingPage, id: e.target.value })} variant="outline" placeholder="e.g. explore" helperText="Machine-readable identifier." />
                    <Input label="Route Path" value={seoEditingPage.path || ''} onChange={e => setSeoEditingPage({ ...seoEditingPage, path: e.target.value })} variant="outline" placeholder="/explore" />
                  </div>
                  <Input label="Meta Title" value={seoEditingPage.title || ''} onChange={e => setSeoEditingPage({ ...seoEditingPage, title: e.target.value })} variant="outline" placeholder="SEO Optimized Page Title" />
                  <Textarea label="Meta Description" value={seoEditingPage.description || ''} onChange={e => setSeoEditingPage({ ...seoEditingPage, description: e.target.value })} variant="outline" rows={3} placeholder="Search engine snippet (max 160 characters)…" />
                  <TagInput label="Keywords" tags={seoEditingPage.keywords ? seoEditingPage.keywords.split(',').map(k => k.trim()).filter(Boolean) : []} onChange={tags => setSeoEditingPage({ ...seoEditingPage, keywords: tags.join(', ') })} placeholder="Add keyword and press Enter…" helperText="Comma-separated internally." />
                  <ImageUpload label="Social Sharing Image (OG)" value={seoEditingPage.ogImage || ''} onChange={val => setSeoEditingPage({ ...seoEditingPage, ogImage: val })} aspectRatio="video" folder="seo" helpText="Custom preview image for social links." />
                  <Button onClick={handleSavePage} isLoading={savingPage} variant="primary" fullWidth size="lg" className="rounded-2xl h-14 font-bold shadow-xl shadow-primary/20" leftIcon={Save}>
                    Save SEO Configuration
                  </Button>
                </div>
              ) : (
                <div className="h-56 border-2 border-dashed border-border rounded-3xl flex flex-col items-center justify-center text-center p-8 bg-muted/5">
                  <Search className="w-8 h-8 text-muted-foreground/30 mb-3" />
                  <p className="text-sm font-semibold text-foreground">Select a Route to Configure</p>
                  <p className="text-xs text-muted-foreground mt-1">Choose from the dropdown above or add a custom route.</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
