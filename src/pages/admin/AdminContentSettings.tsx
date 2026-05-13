import React, { useState } from 'react';
import { Layout, Plus, Trash2, Save, HelpCircle, FileText, ChevronDown, ChevronUp, Sparkles, Rocket } from 'lucide-react';
import Button from '../../components/primitives/Button';
import Input from '../../components/primitives/Input';
import Textarea from '../../components/primitives/Textarea';
import Select from '../../components/primitives/Select';
import { cn } from '../../lib/utils';
import Editor from '../../components/primitives/Editor';

interface AdminContentSettingsProps {
  siteContent: any;
  setSiteContent: (content: any) => void;
  onSave: (id: string) => void;
  isSaving: boolean;
}

export default function AdminContentSettings({
  siteContent,
  setSiteContent,
  onSave,
  isSaving
}: AdminContentSettingsProps) {
  const [activeSubTab, setActiveSubTab] = useState('legal');
  const [editingPage, setEditingPage] = useState('terms');
  const [editingOnboarding, setEditingOnboarding] = useState('interests');

  const pages = [
    { id: 'terms', label: 'Terms of Service' },
    { id: 'privacy', label: 'Privacy Policy' },
    { id: 'dmca', label: 'DMCA Policy' },
    { id: 'cookies', label: 'Cookie Policy' }
  ];

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
      </div>

      {activeSubTab === 'legal' && (
        <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
          <div className="px-8 py-5 border-b border-border bg-muted/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <FileText className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-lg text-foreground">Legal & Policy Pages</h3>
            </div>
            <Button
              onClick={() => onSave(editingPage)}
              isLoading={isSaving}
              variant="primary"
              size="sm"
              leftIcon={Save}
              className="rounded-xl px-6"
            >
              Save Changes
            </Button>
          </div>
          <div className="p-8 space-y-6">
            <Select 
              label="Select Page to Edit"
              value={editingPage}
              onChange={setEditingPage}
              options={pages.map(p => ({ label: p.label, value: p.id }))}
            />
            <Editor 
              value={siteContent[editingPage] || ''}
              onChange={content => setSiteContent({ ...siteContent, [editingPage]: content })}
              placeholder="Start typing your page content here..."
            />
            <p className="text-xs text-muted-foreground font-medium mt-3">
              Tip: Use the toolbar above to format your text. Headers and lists help with readability.
            </p>
          </div>
        </div>
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
              <div key={catIdx} className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
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
                    <div key={itemIdx} className="bg-card border border-border rounded-2xl p-6 relative group shadow-sm transition-all hover:border-primary/20">
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
                    </div>
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
              </div>
            ))}
          </div>
        </div>
      )}
      {activeSubTab === 'onboarding' && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
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
          </div>
        </div>
      )}
    </div>
  );
}
