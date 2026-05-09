import { CheckSquare, Coins, Cpu, LayoutGrid, Search, ShieldCheck, Square, Tag as TagIcon, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useConfig } from '../hooks/useConfig';
import { recordPromptInteraction } from '../lib/affinity';
import { cn } from '../lib/utils';
import { Tag as TagType } from '../types';
import Input from './ui/Input';
import Checkbox from './ui/Checkbox';
import Button from './ui/Button';


interface ExploreSidebarProps {
  searchTerm: string;
  setSearchTerm: (val: string) => void;
}

export default function ExploreSidebar({ searchTerm, setSearchTerm }: ExploreSidebarProps) {
  const { categorySlug, tagSlug, modelSlug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const { config, loading: configLoading } = useConfig();
  const categories = config.categories;
  const models = config.models;
  const [tags, setTags] = useState<TagType[]>([]);
  const [loading, setLoading] = useState(false);
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
    // Instead of fetching 50 prompts just to get tags, we use a static trending list for speed
    const trendingTags = ['SEO', 'Copywriting', 'Logo', 'Blog', 'Business', 'Art', 'Code', 'Marketing', 'Automation', 'Social Media'];
    setTags(trendingTags.map((name, i) => ({ id: `tag-${i}`, name, color: '#6366f1', createdAt: new Date() })));
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
      <div className="bg-card rounded-lg p-6 border border-border shadow-sm">
        <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
          <Search className="w-5 h-5 text-primary" />
          Search
        </h3>
          <Input
            id="exploreSearch"
            name="exploreSearch"
            type="text"
            placeholder="Keywords, tasks..."
            leftIcon={Search}
            variant="filled"
            value={searchTerm}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full mt-2 w-full bg-card border border-border rounded-md shadow-xl z-50 overflow-hidden">
              {suggestions.map((s, i) => (
                <Button
                  key={i}
                  onClick={() => {
                    if (s.type === 'category') handleToggle('category', s.id);
                    else handleModelToggle(s.id);
                    setSearchTerm('');
                  }}
                  variant="ghost"
                  size="lg"
                  fullWidth
                  className="h-auto px-4 py-3 justify-between font-normal hover:bg-muted"
                >
                  <span className="text-foreground font-medium">{s.name}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-muted px-2 py-1 rounded-md">
                    {s.type}
                  </span>
                </Button>
              ))}
            </div>
          )}
        </div>

      {/* AI Models */}
      <div className="bg-card rounded-lg p-6 border border-border shadow-sm">
        <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
          <Cpu className="w-5 h-5 text-primary" />
          AI Models
        </h3>

        {configLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-10 skeleton rounded-md" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <Button
              onClick={() => handleModelToggle(modelSlug || '')}
              variant={!modelSlug ? 'primary' : 'ghost'}
              size="md"
              fullWidth
              className={cn(
                "justify-start font-bold",
                !modelSlug && "bg-primary/10 text-primary border-none shadow-none"
              )}
            >
              All Models
            </Button>
            {models.map(model => {
              const isActive = modelSlug === model.id;
              return (
                <Button
                  key={model.id}
                  onClick={() => handleModelToggle(model.id)}
                  variant={isActive ? 'primary' : 'ghost'}
                  size="md"
                  fullWidth
                  className={cn(
                    "justify-start font-bold",
                    isActive && "bg-primary/10 text-primary border-none shadow-none"
                  )}
                >
                  {model.name}
                </Button>
              );
            })}
          </div>
        )}
      </div>

      {/* Pricing */}
      <div className="bg-card rounded-lg p-6 border border-border shadow-sm">
        <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
          <Coins className="w-5 h-5 text-primary" />
          Pricing
        </h3>
        <div className="flex flex-col gap-1.5">
          <Checkbox 
            variant="simple"
            checked={activePricing.has('free')}
            onChange={() => handleToggle('pricing', 'free')}
            label="Free Prompts"
            className="px-4 py-2.5 rounded-md w-full"
          />
          <Checkbox 
            variant="simple"
            checked={activePricing.has('paid')}
            onChange={() => handleToggle('pricing', 'paid')}
            label="Premium Prompts"
            className="px-4 py-2.5 rounded-md w-full"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="bg-card rounded-lg p-6 border border-border shadow-sm">
        <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
          <LayoutGrid className="w-5 h-5 text-primary" />
          Categories
        </h3>

        {configLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-10 skeleton rounded-md" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {(activeCategories.size > 0 || activeTags.size > 0) && (
              <Button
                onClick={handleClear}
                variant="ghost"
                size="sm"
                fullWidth
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 mb-2 font-bold"
              >
                Clear all filters
              </Button>
            )}
            {categories.map(category => {
              const catId = category.id.toLowerCase();
              const isActive = activeCategories.has(catId) || activeCategories.has(category.slug);
              return (
                <div key={category.id} className="flex items-center justify-between group px-4 py-2.5 rounded-md transition-all hover:bg-muted">
                  <Checkbox 
                    variant="simple"
                    checked={isActive}
                    onChange={() => handleToggle('category', catId)}
                    label={category.name}
                    className="flex-grow"
                  />
                  {category.isPremium && (
                    <div title="Premium Category">
                      <Zap className="w-3.5 h-3.5 text-amber-500 fill-current shrink-0" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Popular Tags */}
      <div className="bg-card rounded-lg p-6 border border-border shadow-sm">
        <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
          <TagIcon className="w-5 h-5 text-primary" />
          Popular Tags
        </h3>

        {configLoading ? (
          <div className="space-y-3 flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-8 w-16 skeleton rounded-lg" />
            ))}
          </div>
        ) : tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {tags.map(tag => {
              const tagId = toSlug(tag.name);
              const isActive = activeTags.has(tagId);
              return (
                <Button
                  key={tag.id}
                  onClick={() => handleToggle('tag', tagId)}
                  variant={isActive ? 'primary' : 'outline'}
                  size="sm"
                  leftIcon={isActive ? CheckSquare : undefined}
                  className={cn(
                    "text-[11px] font-black h-8 px-3 tracking-tighter",
                    isActive ? "shadow-sm" : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary border-border"
                  )}
                >
                  #{tag.name}
                </Button>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No tags found.</p>
        )}
      </div>

      {/* Premium Features Promo */}
      <div className="bg-foreground text-background rounded-lg p-8 shadow-xl relative overflow-hidden group">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-1000" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-primary/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-1000" />

        <div className="relative z-10">
          <ShieldCheck className="w-10 h-10 text-primary mb-6" />
          <h3 className="font-bold text-2xl mb-3 tracking-tighter">Promptly Pro</h3>
          <p className="opacity-70 text-sm mb-8 leading-relaxed font-medium">
            Unlock elite formulas, advanced neural models, and unlimited assets to dominate the AI landscape.
          </p>
          <Button
            as={Link}
            to="/pricing"
            variant="primary"
            size="lg"
            fullWidth
            leftIcon={Zap}
            className="shadow-xl shadow-primary/20"
          >
            Upgrade Now
          </Button>
        </div>
      </div>
    </aside>
  );
}
