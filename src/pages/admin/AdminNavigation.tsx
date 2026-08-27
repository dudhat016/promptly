import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, ExternalLink, Globe, LayoutGrid, Link2, Plus, Save, Sparkles, Tag, Trash2, Layers } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import Button from '../../components/primitives/Button';
import Card from '../../components/primitives/Card';
import Input from '../../components/primitives/Input';
import { useConfig } from '../../hooks/useConfig';
import { db } from '../../lib/firebase';
import { HeaderMenuItem } from '../../types';

const PRESET_PAGES = [
  { label: 'Home / Explore', url: '/' },
  { label: 'Blog & Resources', url: '/blog' },
  { label: 'Support & Help', url: '/contact' },
  { label: 'FAQ', url: '/faq' },
  { label: 'Terms of Service', url: '/terms' },
  { label: 'Privacy Policy', url: '/privacy' },
];

export default function AdminNavigation() {
  const { config } = useConfig();
  const [menuItems, setMenuItems] = useState<HeaderMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Quick Add state
  const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set());
  const [customTagInput, setCustomTagInput] = useState('');
  const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set());
  const [customLinkText, setCustomLinkText] = useState('');
  const [customLinkUrl, setCustomLinkUrl] = useState('');
  const [customLinkTarget, setCustomLinkTarget] = useState<'_self' | '_blank'>('_self');

  // Active left accordion section
  const [activeAccordion, setActiveAccordion] = useState<'cats' | 'tags' | 'pages' | 'custom'>('cats');

  // Load dynamic menu items from Firestore
  useEffect(() => {
    async function loadNavigation() {
      try {
        const snap = await getDoc(doc(db, 'system_settings', 'navigation'));
        if (snap.exists() && snap.data().menuItems) {
          setMenuItems(snap.data().menuItems);
        } else {
          // Default fallback menu
          setMenuItems([
            { id: '1', label: 'Explore', type: 'page', url: '/', order: 0 },
            { id: '2', label: 'Blog', type: 'page', url: '/blog', order: 1 },
            { id: '3', label: 'Support', type: 'page', url: '/contact', order: 2 },
          ]);
        }
      } catch (err) {
        console.error('Failed to load navigation menu:', err);
        toast.error('Failed to load navigation items');
      } finally {
        setLoading(false);
      }
    }
    loadNavigation();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleAddCategories = () => {
    if (selectedCats.size === 0) return;
    const newItems: HeaderMenuItem[] = [];
    selectedCats.forEach(catId => {
      const category = config.categories.find(c => c.id === catId);
      if (category) {
        newItems.push({
          id: Math.random().toString(36).substring(2, 9),
          label: category.name,
          type: 'category',
          url: `/?category=${encodeURIComponent(category.name.toLowerCase())}`,
          order: menuItems.length + newItems.length,
        });
      }
    });
    setMenuItems(prev => [...prev, ...newItems]);
    setSelectedCats(new Set());
    toast.success(`Added ${newItems.length} category item(s) to menu`);
  };

  const handleAddTag = () => {
    if (!customTagInput.trim()) return;
    const tag = customTagInput.trim();
    const newItem: HeaderMenuItem = {
      id: Math.random().toString(36).substring(2, 9),
      label: `#${tag}`,
      type: 'tag',
      url: `/?q=${encodeURIComponent(tag)}`,
      order: menuItems.length,
    };
    setMenuItems(prev => [...prev, newItem]);
    setCustomTagInput('');
    toast.success(`Added #${tag} tag to menu`);
  };

  const handleAddPages = () => {
    if (selectedPages.size === 0) return;
    const newItems: HeaderMenuItem[] = [];
    selectedPages.forEach(url => {
      const page = PRESET_PAGES.find(p => p.url === url);
      if (page) {
        newItems.push({
          id: Math.random().toString(36).substring(2, 9),
          label: page.label,
          type: 'page',
          url: page.url,
          order: menuItems.length + newItems.length,
        });
      }
    });
    setMenuItems(prev => [...prev, ...newItems]);
    setSelectedPages(new Set());
    toast.success(`Added ${newItems.length} page(s) to menu`);
  };

  const handleAddCustomLink = () => {
    if (!customLinkText.trim() || !customLinkUrl.trim()) {
      toast.error('Please enter both Link Text and URL');
      return;
    }
    const newItem: HeaderMenuItem = {
      id: Math.random().toString(36).substring(2, 9),
      label: customLinkText.trim(),
      type: 'custom',
      url: customLinkUrl.trim(),
      target: customLinkTarget,
      order: menuItems.length,
    };
    setMenuItems(prev => [...prev, newItem]);
    setCustomLinkText('');
    setCustomLinkUrl('');
    toast.success('Added custom link to menu');
  };

  const handleRemoveItem = (id: string) => {
    setMenuItems(prev => prev.filter(item => item.id !== id));
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === menuItems.length - 1)) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...menuItems];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    // update order
    updated.forEach((item, idx) => { item.order = idx; });
    setMenuItems(updated);
  };

  const handleItemChange = (id: string, key: keyof HeaderMenuItem, value: any) => {
    setMenuItems(prev => prev.map(item => item.id === id ? { ...item, [key]: value } : item));
  };

  const handleSaveMenu = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'system_settings', 'navigation'), {
        menuItems,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      toast.success('Navigation menu saved successfully!');
    } catch (err) {
      console.error('Save navigation error:', err);
      toast.error('Failed to save menu configuration');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-muted-foreground font-mono text-sm">
        Loading Header Menu Config...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border rounded-xl p-6 shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
            <Layers className="w-6 h-6 text-primary" />
            Header Menu Builder
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            WordPress-style navigation menu manager. Add categories, tags, pages, or custom URLs to your main site navbar.
          </p>
        </div>
        <Button
          onClick={handleSaveMenu}
          isLoading={saving}
          variant="primary"
          leftIcon={Save}
          className="shadow-lg shadow-primary/20 font-bold"
        >
          Save Menu Changes
        </Button>
      </div>

      {/* Grid Layout */}
      <div className="grid lg:grid-cols-12 gap-8">
        {/* Left Column: Quick Add Accordions */}
        <div className="lg:col-span-5 space-y-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-muted-foreground px-1">
            Add Menu Items
          </h2>

          {/* 1. Categories Accordion */}
          <Card className="overflow-hidden">
            <button
              onClick={() => setActiveAccordion(prev => prev === 'cats' ? ('' as any) : 'cats')}
              className="w-full p-4 flex items-center justify-between font-bold text-sm text-foreground bg-muted/30 hover:bg-muted/60 transition-colors"
            >
              <span className="flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-primary" />
                Prompt Categories
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${activeAccordion === 'cats' ? 'rotate-180' : ''}`} />
            </button>
            {activeAccordion === 'cats' && (
              <div className="p-4 space-y-3 border-t border-border">
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {config.categories.map(cat => {
                    const isChecked = selectedCats.has(cat.id);
                    return (
                      <label key={cat.id} className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            setSelectedCats(prev => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(cat.id); else next.delete(cat.id);
                              return next;
                            });
                          }}
                          className="rounded text-primary focus:ring-primary"
                        />
                        {cat.name}
                      </label>
                    );
                  })}
                </div>
                <Button
                  onClick={handleAddCategories}
                  disabled={selectedCats.size === 0}
                  variant="outline"
                  size="sm"
                  leftIcon={Plus}
                  className="w-full font-bold"
                >
                  Add Selected Categories ({selectedCats.size})
                </Button>
              </div>
            )}
          </Card>

          {/* 2. Popular Tags Accordion */}
          <Card className="overflow-hidden">
            <button
              onClick={() => setActiveAccordion(prev => prev === 'tags' ? ('' as any) : 'tags')}
              className="w-full p-4 flex items-center justify-between font-bold text-sm text-foreground bg-muted/30 hover:bg-muted/60 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-emerald-500" />
                Tags & Keywords
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${activeAccordion === 'tags' ? 'rotate-180' : ''}`} />
            </button>
            {activeAccordion === 'tags' && (
              <div className="p-4 space-y-3 border-t border-border">
                <Input
                  label="Tag Name"
                  placeholder="e.g. cinematic, boys, saree"
                  value={customTagInput}
                  onChange={(e) => setCustomTagInput(e.target.value)}
                  variant="outline"
                />
                <Button
                  onClick={handleAddTag}
                  disabled={!customTagInput.trim()}
                  variant="outline"
                  size="sm"
                  leftIcon={Plus}
                  className="w-full font-bold"
                >
                  Add Tag to Menu
                </Button>
              </div>
            )}
          </Card>

          {/* 3. Preset Pages Accordion */}
          <Card className="overflow-hidden">
            <button
              onClick={() => setActiveAccordion(prev => prev === 'pages' ? ('' as any) : 'pages')}
              className="w-full p-4 flex items-center justify-between font-bold text-sm text-foreground bg-muted/30 hover:bg-muted/60 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-500" />
                Pages
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${activeAccordion === 'pages' ? 'rotate-180' : ''}`} />
            </button>
            {activeAccordion === 'pages' && (
              <div className="p-4 space-y-3 border-t border-border">
                <div className="space-y-2">
                  {PRESET_PAGES.map(page => {
                    const isChecked = selectedPages.has(page.url);
                    return (
                      <label key={page.url} className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            setSelectedPages(prev => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(page.url); else next.delete(page.url);
                              return next;
                            });
                          }}
                          className="rounded text-primary focus:ring-primary"
                        />
                        {page.label} <span className="text-[10px] font-mono text-muted-foreground">({page.url})</span>
                      </label>
                    );
                  })}
                </div>
                <Button
                  onClick={handleAddPages}
                  disabled={selectedPages.size === 0}
                  variant="outline"
                  size="sm"
                  leftIcon={Plus}
                  className="w-full font-bold"
                >
                  Add Selected Pages ({selectedPages.size})
                </Button>
              </div>
            )}
          </Card>

          {/* 4. Custom Link Accordion */}
          <Card className="overflow-hidden">
            <button
              onClick={() => setActiveAccordion(prev => prev === 'custom' ? ('' as any) : 'custom')}
              className="w-full p-4 flex items-center justify-between font-bold text-sm text-foreground bg-muted/30 hover:bg-muted/60 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-amber-500" />
                Custom Links
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${activeAccordion === 'custom' ? 'rotate-180' : ''}`} />
            </button>
            {activeAccordion === 'custom' && (
              <div className="p-4 space-y-3 border-t border-border">
                <Input
                  label="URL"
                  placeholder="https://example.com or /blog"
                  value={customLinkUrl}
                  onChange={(e) => setCustomLinkUrl(e.target.value)}
                  variant="outline"
                />
                <Input
                  label="Link Text"
                  placeholder="e.g. Community"
                  value={customLinkText}
                  onChange={(e) => setCustomLinkText(e.target.value)}
                  variant="outline"
                />
                <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={customLinkTarget === '_blank'}
                    onChange={(e) => setCustomLinkTarget(e.target.checked ? '_blank' : '_self')}
                    className="rounded text-primary focus:ring-primary"
                  />
                  Open link in new tab
                </label>
                <Button
                  onClick={handleAddCustomLink}
                  disabled={!customLinkText.trim() || !customLinkUrl.trim()}
                  variant="outline"
                  size="sm"
                  leftIcon={Plus}
                  className="w-full font-bold"
                >
                  Add Custom Link
                </Button>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Menu Structure Tree */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-black uppercase tracking-wider text-muted-foreground">
              Menu Structure ({menuItems.length} items)
            </h2>
            {menuItems.length > 0 && (
              <button
                onClick={() => setMenuItems([])}
                className="text-xs font-bold text-rose-500 hover:underline"
              >
                Clear All
              </button>
            )}
          </div>

          <div className="space-y-3">
            {menuItems.map((item, index) => {
              const isExpanded = expandedItems.has(item.id);
              return (
                <Card key={item.id} className="p-4 space-y-3 border border-border shadow-xs hover:border-primary/40 transition-colors">
                  {/* Item Summary Bar */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => handleMove(index, 'up')}
                          disabled={index === 0}
                          className="p-1 rounded hover:bg-muted text-muted-foreground disabled:opacity-20"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleMove(index, 'down')}
                          disabled={index === menuItems.length - 1}
                          className="p-1 rounded hover:bg-muted text-muted-foreground disabled:opacity-20"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-foreground truncate">
                            {item.label}
                          </span>
                          <span className="text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                            {item.type}
                          </span>
                        </div>
                        <p className="text-xs font-mono text-muted-foreground/80 truncate">
                          {item.url}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => toggleExpand(item.id)}
                        className="p-2 rounded-lg bg-muted/60 hover:bg-muted text-foreground transition-colors"
                        title="Edit Item"
                      >
                        <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 transition-colors"
                        title="Remove Item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Item Form */}
                  {isExpanded && (
                    <div className="pt-3 border-t border-border space-y-3 bg-muted/20 p-3 rounded-lg">
                      <Input
                        label="Navigation Label"
                        value={item.label}
                        onChange={(e) => handleItemChange(item.id, 'label', e.target.value)}
                        variant="outline"
                      />
                      <Input
                        label="URL / Path"
                        value={item.url}
                        onChange={(e) => handleItemChange(item.id, 'url', e.target.value)}
                        variant="outline"
                      />
                      <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={item.target === '_blank'}
                          onChange={(e) => handleItemChange(item.id, 'target', e.target.checked ? '_blank' : '_self')}
                          className="rounded text-primary focus:ring-primary"
                        />
                        Open link in new tab
                      </label>
                    </div>
                  )}
                </Card>
              );
            })}

            {menuItems.length === 0 && (
              <div className="text-center py-16 bg-card border border-dashed border-border rounded-xl">
                <Sparkles className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-foreground">Menu is empty</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                  Use the left column panels to add Categories, Tags, Pages, or Custom Links.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
