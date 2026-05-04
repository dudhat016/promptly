import { useState, useEffect } from 'react';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { Link, useParams, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { db } from '../lib/firebase';
import { LayoutGrid, Tag as TagIcon, Zap, ShieldCheck, CheckSquare, Square, Search, Cpu, Coins } from 'lucide-react';
import { Category, Tag, AIModel } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { recordPromptInteraction } from '../lib/affinity';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ExploreSidebarProps {
  searchTerm: string;
  setSearchTerm: (val: string) => void;
}

export default function ExploreSidebar({ searchTerm, setSearchTerm }: ExploreSidebarProps) {
  const { categorySlug, tagSlug, modelSlug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [models, setModels] = useState<AIModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Parse path for multi-select
  const pathParts = location.pathname.split('/');
  const catIndex = pathParts.indexOf('categories');
  const pathCategories = catIndex !== -1 ? pathParts[catIndex + 1].split('+') : [];
  
  const tagIndex = pathParts.indexOf('tags');
  const pathTags = tagIndex !== -1 ? pathParts[tagIndex + 1].split('+') : [];

  const pricingIndex = pathParts.indexOf('pricing');
  const pathPricing = pricingIndex !== -1 ? pathParts[pricingIndex + 1].split('+') : [];

  // Active Selections
  const activeCategories = new Set([...pathCategories, ...(searchParams.get('categories')?.split(',').filter(Boolean) || [])]);
  if (categorySlug) activeCategories.add(categorySlug);

  const activeTags = new Set([...pathTags, ...(searchParams.get('tags')?.split(',').filter(Boolean) || [])]);
  if (tagSlug) activeTags.add(tagSlug);

  const activePricing = new Set([...pathPricing, ...(searchParams.get('pricing')?.split(',').filter(Boolean) || [])]);

  const toSlug = (text: string) => text.toLowerCase().replace(/\s+/g, '-');

  const handleToggle = (type: 'category' | 'tag' | 'pricing', value: string) => {
    const newCats = new Set(activeCategories);
    const newTags = new Set(activeTags);
    const newPricing = new Set(activePricing);
    
    if (type === 'category') {
      if (newCats.has(value)) newCats.delete(value);
      else newCats.add(value);
    } else if (type === 'tag') {
      if (newTags.has(value)) newTags.delete(value);
      else newTags.add(value);
    } else if (type === 'pricing') {
      if (newPricing.has(value)) newPricing.delete(value);
      else newPricing.add(value);
    }

    const catArray = Array.from(newCats);
    const tagArray = Array.from(newTags);
    const pricingArray = Array.from(newPricing);

    let path = '/explore';
    const params = new URLSearchParams(searchParams);
    
    params.delete('categories');
    params.delete('tags');
    params.delete('pricing');

    if (modelSlug) path += `/model/${modelSlug}`;
    if (catArray.length > 0) path += `/categories/${catArray.join('+')}`;
    if (tagArray.length > 0) path += `/tags/${tagArray.join('+')}`;
    if (pricingArray.length > 0) path += `/pricing/${pricingArray.join('+')}`;

    navigate(`${path}${params.toString() ? '?' + params.toString() : ''}`);
  };

  const handleModelToggle = (selectedModelId: string) => {
    const catArray = Array.from(activeCategories);
    const tagArray = Array.from(activeTags);
    const pricingArray = Array.from(activePricing);
    const newModelSlug = modelSlug === selectedModelId ? null : selectedModelId;
    
    let path = '/explore';
    if (newModelSlug) path += `/model/${newModelSlug}`;
    if (catArray.length > 0) path += `/categories/${catArray.join('+')}`;
    if (tagArray.length > 0) path += `/tags/${tagArray.join('+')}`;
    if (pricingArray.length > 0) path += `/pricing/${pricingArray.join('+')}`;
    
    const params = new URLSearchParams(searchParams);
    params.delete('categories');
    params.delete('tags');
    params.delete('pricing');
    navigate(`${path}${params.toString() ? '?' + params.toString() : ''}`);
  };

  const handleClear = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('categories');
    params.delete('tags');
    params.delete('pricing');
    navigate(`/explore${params.toString() ? '?' + params.toString() : ''}`);
  };

  useEffect(() => {
    async function fetchSidebarData() {
      try {
        const catSnap = await getDocs(collection(db, 'categories'));
        setCategories(catSnap.docs.map(d => ({ id: d.id, ...d.data() } as Category)));

        const promptSnap = await getDocs(query(collection(db, 'prompts'), limit(50)));
        const extractedTags = Array.from(new Set(promptSnap.docs.flatMap(d => d.data().tags || []))).slice(0, 15);
        setTags(extractedTags.map((name, i) => ({ id: `tag-${i}`, name, color: '#6366f1', createdAt: new Date() })));

        const mSnap = await getDocs(collection(db, 'models'));
        setModels(mSnap.docs.map(d => ({ id: d.id, ...d.data() } as AIModel)));
      } catch (error) {
        console.error("Error fetching explore sidebar data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchSidebarData();
  }, []);

  useEffect(() => {
    if (searchTerm && searchTerm.length > 2) {
      const timer = setTimeout(() => {
        const words = searchTerm.toLowerCase().split(' ').filter(w => w.length > 2);
        if (words.length > 0) {
          recordPromptInteraction({ tags: words }, 0.5, false);
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [searchTerm]);

  const suggestions = searchTerm.length > 1 ? [
    ...categories.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())).map(c => ({ id: c.id, name: c.name, type: 'category' })),
    ...models.filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase())).map(m => ({ id: m.id, name: m.name, type: 'model' }))
  ].slice(0, 5) : [];

  return (
    <aside className="lg:w-1/4 space-y-8 flex-shrink-0">
      
      {/* Search */}
      <div className="bg-card rounded-3xl p-6 border border-border shadow-sm">
        <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
          <Search className="w-5 h-5 text-primary" />
          Search
        </h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Keywords, tasks..."
            className="w-full bg-muted border border-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            value={searchTerm}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full mt-2 w-full bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (s.type === 'category') handleToggle('category', s.id);
                    else handleModelToggle(s.id);
                    setSearchTerm('');
                  }}
                  className="w-full text-left px-4 py-3 text-sm hover:bg-muted transition-colors flex items-center justify-between group"
                >
                  <span className="text-foreground font-medium">{s.name}</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-muted px-2 py-1 rounded-md group-hover:bg-background">
                    {s.type}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* AI Models */}
      <div className="bg-card rounded-3xl p-6 border border-border shadow-sm">
        <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
          <Cpu className="w-5 h-5 text-primary" />
          AI Models
        </h3>
        
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-10 skeleton rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <button
              onClick={() => handleModelToggle(modelSlug || '')}
              className={cn(
                "px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-between",
                !modelSlug ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
              )}
            >
              All Models
            </button>
            {models.map(model => {
              const isActive = modelSlug === model.id;
              return (
                <button
                  key={model.id}
                  onClick={() => handleModelToggle(model.id)}
                  className={cn(
                    "px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-between group",
                    isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  {model.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Pricing */}
      <div className="bg-card rounded-3xl p-6 border border-border shadow-sm">
        <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
          <Coins className="w-5 h-5 text-primary" />
          Pricing
        </h3>
        <div className="flex flex-col gap-1.5">
          <button
            onClick={() => handleToggle('pricing', 'free')}
            className={cn(
              "px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-3 group w-full text-left",
              activePricing.has('free') ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
            )}
          >
            {activePricing.has('free') ? (
              <CheckSquare className="w-4 h-4 text-primary shrink-0" />
            ) : (
              <Square className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground/50 shrink-0" />
            )}
            <span className="truncate">Free Prompts</span>
          </button>
          <button
            onClick={() => handleToggle('pricing', 'paid')}
            className={cn(
              "px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-3 group w-full text-left",
              activePricing.has('paid') ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
            )}
          >
            {activePricing.has('paid') ? (
              <CheckSquare className="w-4 h-4 text-primary shrink-0" />
            ) : (
              <Square className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground/50 shrink-0" />
            )}
            <span className="truncate">Premium Prompts</span>
          </button>
        </div>
      </div>

      {/* Categories */}
      <div className="bg-card rounded-3xl p-6 border border-border shadow-sm">
        <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
          <LayoutGrid className="w-5 h-5 text-primary" />
          Categories
        </h3>
        
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-10 skeleton rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {(activeCategories.size > 0 || activeTags.size > 0) && (
              <button
                onClick={handleClear}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-between text-muted-foreground hover:text-destructive hover:bg-destructive/10 mb-2"
              >
                Clear all filters
              </button>
            )}
            {categories.map(category => {
              const catId = category.id.toLowerCase();
              const isActive = activeCategories.has(catId) || activeCategories.has(category.slug);
              return (
                <button
                  key={category.id}
                  onClick={() => handleToggle('category', catId)}
                  className={cn(
                    "px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-3 group w-full text-left",
                    isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <div className="flex items-center gap-3 flex-grow">
                    {isActive ? (
                      <CheckSquare className="w-4 h-4 text-primary shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground/50 shrink-0" />
                    )}
                    <span className="truncate">{category.name}</span>
                  </div>
                  {category.isPremium && (
                    <div title="Premium Category">
                      <Zap className="w-3.5 h-3.5 text-amber-500 fill-current shrink-0" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Popular Tags */}
      <div className="bg-card rounded-3xl p-6 border border-border shadow-sm">
        <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
          <TagIcon className="w-5 h-5 text-primary" />
          Popular Tags
        </h3>
        
        {loading ? (
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-8 w-16 skeleton" />
            ))}
          </div>
        ) : tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {tags.map(tag => {
              const tagId = toSlug(tag.name);
              const isActive = activeTags.has(tagId);
              return (
                <button
                  key={tag.id}
                  onClick={() => handleToggle('tag', tagId)}
                  className={cn(
                    "px-3 py-1.5 text-sm font-bold rounded-lg transition-colors border flex items-center gap-1",
                    isActive 
                      ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                      : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary border-border"
                  )}
                >
                  {isActive && <CheckSquare className="w-3.5 h-3.5" />}
                  #{tag.name}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No tags found.</p>
        )}
      </div>

      {/* Premium Features Promo */}
      <div className="bg-foreground text-background rounded-3xl p-8 shadow-xl relative overflow-hidden group">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-1000" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-primary/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-1000" />
        
        <div className="relative z-10">
          <ShieldCheck className="w-10 h-10 text-primary mb-6" />
          <h3 className="font-black text-2xl mb-3 tracking-tighter">Promptly Pro</h3>
          <p className="opacity-70 text-sm mb-8 leading-relaxed font-medium">
            Unlock elite formulas, advanced neural models, and unlimited assets to dominate the AI landscape.
          </p>
          <Link 
            to="/pricing"
            className="flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground font-black px-6 py-4 rounded-2xl hover:opacity-90 transition-all shadow-lg group/btn"
          >
            <Zap className="w-4 h-4 fill-current group-hover/btn:scale-110 transition-transform" />
            Upgrade Now
          </Link>
        </div>
      </div>
    </aside>
  );
}
