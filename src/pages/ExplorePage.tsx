import { limit } from 'firebase/firestore';
import { Check, ChevronDown, ChevronLeft, ChevronRight, Clock, Search, SlidersHorizontal, Sparkles, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import ExploreSidebar from '../components/ExploreSidebar';
import PromptCard from '../components/PromptCard';
import PromptCardSkeleton from '../components/PromptCardSkeleton';
import { useAuth } from '../hooks/useAuth';
import { calculatePromptScore, getAffinityProfile } from '../lib/affinity';
import { toTitleCase } from '../lib/utils';
import { firestoreService } from '../services/firestoreService';
import { Prompt } from '../types';
import NeuralAdBanner from '../components/NeuralAdBanner';
import Button from '../components/ui/Button';

export default function ExplorePage() {
  const { isPro, isAdmin, profile } = useAuth();
  const navigate = useNavigate();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [recentlyViewed, setRecentlyViewed] = useState<any[]>([]);

  const { tagSlug, categorySlug, modelSlug } = useParams();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  // DERIVE FILTERS DIRECTLY FROM URL (Single Source of Truth)
  const pathParts = location.pathname.split('/');

  // Parse Model
  const modelIndex = pathParts.indexOf('model');
  const pathModel = modelIndex !== -1 ? pathParts[modelIndex + 1] : null;
  const activeModel = pathModel || modelSlug || 'All';

  // Search Term
  const initialSearch = searchParams.get('q') || '';
  const [searchTerm, setSearchTerm] = useState(initialSearch);

  // Sort state
  const [sortBy, setSortBy] = useState<'newest' | 'likes' | 'views' | 'copies' | 'foryou'>('foryou');
  const [isSortOpen, setIsSortOpen] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const affinityProfile = profile?.affinityProfile || getAffinityProfile();

  // DERIVE FILTERS DIRECTLY FROM URL (Single Source of Truth)

  // Parse Categories
  const catIndex = pathParts.indexOf('categories');
  const pathCats = catIndex !== -1 ? pathParts[catIndex + 1].split('+') : [];
  const activeCategories = new Set(pathCats.map(c => c.toLowerCase()));
  if (categorySlug) activeCategories.add(categorySlug.toLowerCase());

  // Parse Tags
  const tagIndex = pathParts.indexOf('tags');
  const pathTags = tagIndex !== -1 ? pathParts[tagIndex + 1].split('+') : [];
  const activeTags = new Set(pathTags.map(t => t.toLowerCase()));
  if (tagSlug) activeTags.add(tagSlug.toLowerCase());

  // Parse Pricing
  const pricingIndex = pathParts.indexOf('pricing');
  const pathPricing = pricingIndex !== -1 ? pathParts[pricingIndex + 1].split('+') : [];
  const activePricing = new Set(pathPricing.map(p => p.toLowerCase()));

  useEffect(() => {
    setCurrentPage(1);
  }, [location.pathname]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
      setRecentlyViewed(stored);
    } catch (e) {}
  }, []);

  useEffect(() => {
    async function fetchPrompts() {
      setLoading(true);
      try {
        const fetchedPrompts = await firestoreService.getCollection<Prompt>('prompts', [limit(100)]);

        // SECURITY: Proactively scrub content for paid prompts
        const promptsWithSecurity = fetchedPrompts.map(p => {
          const isUnlocked = (profile?.unlockedPrompts || []).includes(p.id!);
          const hasAccess = isPro || isAdmin || isUnlocked || !p.isPaid;

          if (!hasAccess) {
            const { content, ...safePrompt } = p;
            return safePrompt as Prompt;
          }
          return p;
        });

        setPrompts(promptsWithSecurity);
      } catch (err: any) {
        setFetchError(err.message || "Failed to connect to database");
      } finally {
        setLoading(false);
      }
    }
    fetchPrompts();
  }, [profile?.unlockedPrompts, isPro, isAdmin]);

  const filteredPrompts = prompts.filter(p => {
    // 1. Search Filter
    const matchesSearch = searchTerm === '' ||
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase());

    // 2. Model Filter
    const matchesModel = activeModel === 'All' ||
      (p.model && p.model.toLowerCase() === activeModel.toLowerCase());

    // 3. Category Filter
    const matchesCategory = activeCategories.size === 0 ||
      (p.categoryId && activeCategories.has(p.categoryId.toLowerCase()));

    // 4. Tag Filter
    const toSlug = (text: string) => text.toLowerCase().replace(/\s+/g, '-');
    const matchesTag = activeTags.size === 0 ||
      Array.from(activeTags).some(activeTag =>
        p.tags && p.tags.some(t => toSlug(t) === activeTag)
      );

    // 5. Pricing Filter
    let matchesPricing = true;
    if (activePricing.size === 1) {
      if (activePricing.has('free')) matchesPricing = p.isPaid !== true;
      if (activePricing.has('paid')) matchesPricing = p.isPaid === true;
    }

    return matchesSearch && matchesModel && matchesCategory && matchesTag && matchesPricing;
  });

  const sortedPrompts = [...filteredPrompts].sort((a, b) => {
    if (sortBy === 'foryou') {
      const scoreA = calculatePromptScore(a, affinityProfile);
      const scoreB = calculatePromptScore(b, affinityProfile);
      return scoreB - scoreA;
    }
    if (sortBy === 'likes') return (b.likesCount || 0) - (a.likesCount || 0);
    if (sortBy === 'views') return (b.viewsCount || 0) - (a.viewsCount || 0);
    if (sortBy === 'copies') return (b.copiesCount || 0) - (a.copiesCount || 0);
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const totalPages = Math.ceil(sortedPrompts.length / itemsPerPage);
  const paginatedPrompts = sortedPrompts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const sortOptions = [
    { id: 'newest', label: 'Newest First' },
    { id: 'foryou', label: 'Recommended for You' },
    { id: 'likes', label: 'Most Liked' },
    { id: 'views', label: 'Most Viewed' },
    { id: 'copies', label: 'Most Copied' },
  ];


  let pageTitle = "Explore Prompts";
  let subtitle = "Discover the best AI prompts for your workflow.";

  if (activeModel !== 'All' && activeCategories.size === 0 && activeTags.size === 0) {
    pageTitle = `${activeModel.toUpperCase()} Prompts`;
    subtitle = `Browse all prompts optimized for ${activeModel.toUpperCase()}.`;
  } else if (activeCategories.size === 1 && activeTags.size === 0 && activeModel === 'All') {
    const cat = Array.from(activeCategories)[0];
    pageTitle = `${toTitleCase(cat)} Prompts`;
    subtitle = `Explore our collection of ${toTitleCase(cat).toLowerCase()} prompts.`;
  } else if (activeTags.size === 1 && activeCategories.size === 0 && activeModel === 'All') {
    const tag = Array.from(activeTags)[0];
    pageTitle = `Prompts tagged with #${toTitleCase(tag)}`;
    subtitle = `Find exactly what you need with the ${tag} tag.`;
  } else if (activeCategories.size > 0 || activeTags.size > 0 || activeModel !== 'All' || activePricing.size > 0) {
    pageTitle = `Filtered Results`;
    const filterParts = [];
    if (activeModel !== 'All') filterParts.push(activeModel.toUpperCase());
    if (activePricing.size > 0) filterParts.push(Array.from(activePricing).map(p => toTitleCase(p)).join(' + '));
    if (activeCategories.size > 0) filterParts.push(`${activeCategories.size} Categories`);
    if (activeTags.size > 0) filterParts.push(`${activeTags.size} Tags`);
    subtitle = `Showing prompts for: ${filterParts.join(' + ')}`;
  }

  useEffect(() => {
    document.title = `${pageTitle} | Promptly`;
  }, [pageTitle]);

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-2 text-foreground">{pageTitle}</h1>
        <p className="text-muted-foreground text-lg">{subtitle}</p>
      </div>

      {/* Main Layout */}
      <div className="flex flex-col lg:flex-row gap-10">

        {/* Sidebar */}
        <ExploreSidebar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />

        {/* Content Area */}
        <div className="flex-grow lg:w-3/4">
          {loading && prompts.length === 0 ? (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <PromptCardSkeleton key={i} />
              ))}
            </div>
          ) : fetchError ? (
            <div className="col-span-full text-center py-24 bg-destructive/10 rounded-lg border border-destructive/20">
              <h3 className="text-xl font-bold text-destructive mb-2">Failed to load prompts</h3>
              <p className="text-muted-foreground font-mono text-sm max-w-2xl mx-auto">{fetchError}</p>
            </div>
          ) : (
            <>
              <NeuralAdBanner className="mb-6" slot="explore-top-ad" />
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-foreground">
                  {filteredPrompts.length} {filteredPrompts.length === 1 ? 'Prompt' : 'Prompts'}
                </h2>
                <div className="relative">
                  <Button
                    onClick={() => setIsSortOpen(!isSortOpen)}
                    variant="white"
                    size="md"
                    className="border border-border font-bold"
                  >
                    <SlidersHorizontal className="w-4 h-4 text-muted-foreground mr-1" />
                    <span>{sortOptions.find(o => o.id === sortBy)?.label}</span>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ml-1 ${isSortOpen ? 'rotate-180' : ''}`} />
                  </Button>

                  {isSortOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setIsSortOpen(false)} />
                      <div className="absolute right-0 top-full mt-2 w-full min-w-[200px] bg-card border border-border rounded-md shadow-xl z-20 py-2 overflow-hidden">
                         {sortOptions.map(option => (
                           <Button
                             key={option.id}
                             onClick={() => {
                               setSortBy(option.id as any);
                               setIsSortOpen(false);
                             }}
                             variant={sortBy === option.id ? 'primary' : 'ghost'}
                             size="sm"
                             fullWidth
                             className="justify-between px-4 py-2.5 h-auto font-bold rounded-none border-b border-border last:border-0"
                           >
                             {option.label}
                             {sortBy === option.id && <Check className="w-4 h-4" />}
                           </Button>
                         ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {filteredPrompts.length === 0 ? (
                <div className="text-center py-24 bg-muted rounded-xl border border-border">
                  <div className="bg-background w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <Search className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-1">No prompts found</h3>
                  <p className="text-muted-foreground max-w-xs mx-auto">Try adjusting your search or filters to find what you're looking for.</p>
                   <Button
                    onClick={() => { setSearchTerm(''); navigate('/explore'); }}
                    variant="ghost"
                    className="mt-6 text-primary font-bold h-auto py-1"
                  >
                    Clear all filters
                  </Button>
                </div>
              ) : (
                <>
                  <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {paginatedPrompts.slice(0, 6).map((prompt) => (
                      <PromptCard key={prompt.id} prompt={prompt} />
                    ))}
                  </div>

                  {/* Pro upsell inline banner — shown to free users after first 6 cards */}
                  {!isPro && !isAdmin && paginatedPrompts.length > 6 && (
                    <div className="my-6 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden"
                      style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.18)' }}>
                      <div className="absolute top-0 right-0 w-48 h-48 pointer-events-none"
                        style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)' }} />
                      <div className="flex items-center gap-4 relative z-10">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)' }}>
                          <Sparkles className="w-5 h-5 text-violet-400" />
                        </div>
                        <div>
                          <p className="font-bold text-foreground text-sm">Unlock all {filteredPrompts.length}+ prompts</p>
                          <p className="text-xs text-muted-foreground">Pro members get unlimited access, copies, and new prompts every week.</p>
                        </div>
                      </div>
                       <Button 
                        onClick={() => navigate('/pricing')}
                        variant="primary"
                        size="md"
                        leftIcon={Zap}
                        className="relative z-10"
                      >
                        Go Pro
                      </Button>
                    </div>
                  )}

                  {paginatedPrompts.length > 6 && (
                    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {paginatedPrompts.slice(6).map((prompt) => (
                        <PromptCard key={prompt.id} prompt={prompt} />
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-12">
                  <Button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    variant="secondary"
                    size="icon"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <div className="flex items-center gap-1">
                    {[...Array(Math.min(totalPages, 7))].map((_, i) => (
                      <Button
                        key={i}
                        onClick={() => setCurrentPage(i + 1)}
                        variant={currentPage === i + 1 ? 'primary' : 'ghost'}
                        size="icon"
                        className={currentPage === i + 1 ? 'scale-110 shadow-lg shadow-primary/20' : ''}
                      >
                        {i + 1}
                      </Button>
                    ))}
                    {totalPages > 7 && <span className="text-muted-foreground text-sm px-1 font-bold">…{totalPages}</span>}
                  </div>
                  <Button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    variant="secondary"
                    size="icon"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>
              )}

              {/* Recently viewed strip */}
              {recentlyViewed.length > 0 && (
                <div className="mt-16 pt-10 border-t border-border">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="w-4 h-4 text-muted-foreground/60" />
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Recently Viewed</h3>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {recentlyViewed.map(p => (
                      <Link key={p.id} to={`/prompt/${p.slug}`}
                        className="flex-none rounded-xl px-4 py-3 bg-card border border-border hover:border-primary/20 hover:bg-muted/30 transition-all group min-w-[180px] max-w-[220px]"
                      >
                        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-1">{p.model}</div>
                        <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                          {p.title}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
