import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { ChevronLeft, ChevronRight, Sparkles, Users, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import PageContainer from '../components/layout/PageContainer';
import NeuralAdBanner from '../components/NeuralAdBanner';
import { Button, Select } from '../components/primitives';
import PromptCard from '../components/PromptCard';
import PromptCardSkeleton from '../components/PromptCardSkeleton';
import PromptQuickViewModal from '../components/PromptQuickViewModal';
import { useAuth } from '../hooks/useAuth';
import { usePath } from '../hooks/usePath';
import { useSEO } from '../hooks/useSEO';
import { calculatePromptScore, getAffinityProfile } from '../lib/affinity';
import { db } from '../lib/firebase';
import { cn, toSlug, toTitleCase } from '../lib/utils';
import { Prompt } from '../types';

export default function ExplorePage() {
  const { isPro, isAdmin, profile } = useAuth();
  const navigate = useNavigate();
  const { prefix } = usePath();
  const [rawPrompts, setRawPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Instant Quick View modal state
  const [quickPrompt, setQuickPrompt] = useState<Prompt | null>(null);

  const { tagSlug, categorySlug, modelSlug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
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

  // Feed mode & sort state
  const [feedMode, setFeedMode] = useState<'all' | 'foryou' | 'following'>('foryou');
  const [sortBy, setSortBy] = useState<'newest' | 'likes' | 'views' | 'copies'>('newest');
  const [activeInterestChips, setActiveInterestChips] = useState<Set<string>>(new Set());

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 16;

  const toggleChip = (chip: string) => {
    setActiveInterestChips(prev => {
      const next = new Set(prev);
      if (next.has(chip)) next.delete(chip); else next.add(chip);
      return next;
    });
    setCurrentPage(1);
  };

  // Parse Categories
  const queryCat = searchParams.get('category');
  const catIndex = pathParts.indexOf('categories');
  const pathCats = catIndex !== -1 ? pathParts[catIndex + 1].split('+') : [];
  const activeCategories = new Set(pathCats.map(c => toSlug(c)));
  if (categorySlug) activeCategories.add(toSlug(categorySlug));
  if (queryCat) activeCategories.add(toSlug(queryCat));

  // Parse Tags
  const queryTag = searchParams.get('tag');
  const tagIndex = pathParts.indexOf('tags');
  const pathTags = tagIndex !== -1 ? pathParts[tagIndex + 1].split('+') : [];
  const activeTags = new Set(pathTags.map(t => toSlug(t)));
  if (tagSlug) activeTags.add(toSlug(tagSlug));
  if (queryTag) activeTags.add(toSlug(queryTag));

  // Auto-redirect spaces / %20 / query params in URLs to clean hyphenated slugs (/tag/birthday-photoshot, /category/cars-and-bikes)
  useEffect(() => {
    if (queryCat) {
      navigate(prefix(`/category/${toSlug(queryCat)}`), { replace: true });
      return;
    }
    if (categorySlug) {
      const cleanCat = toSlug(categorySlug);
      if (categorySlug !== cleanCat || categorySlug.includes('%20') || categorySlug.includes(' ')) {
        navigate(prefix(`/category/${cleanCat}`), { replace: true });
        return;
      }
    }
    if (queryTag) {
      navigate(prefix(`/tag/${toSlug(queryTag)}`), { replace: true });
      return;
    }
    if (tagSlug) {
      const cleanTag = toSlug(tagSlug);
      if (tagSlug !== cleanTag || tagSlug.includes('%20') || tagSlug.includes(' ')) {
        navigate(prefix(`/tag/${cleanTag}`), { replace: true });
        return;
      }
    }
  }, [categorySlug, tagSlug, queryCat, queryTag, navigate, prefix]);

  // Parse Pricing
  const pricingIndex = pathParts.indexOf('pricing');
  const pathPricing = pricingIndex !== -1 ? pathParts[pricingIndex + 1].split('+') : [];
  const activePricing = new Set(pathPricing.map(p => p.toLowerCase()));

  useEffect(() => {
    setCurrentPage(1);
  }, [location.pathname]);

  useEffect(() => {
    const CACHE_KEY = 'promptly_explore_v2';
    const CACHE_TTL = 10 * 60 * 1000;
    async function fetchPrompts() {
      try {
        const stored = sessionStorage.getItem(CACHE_KEY);
        if (stored) {
          const { data, ts } = JSON.parse(stored);
          if (Date.now() - ts < CACHE_TTL) {
            setRawPrompts(data);
            setLoading(false);
            return;
          }
        }
      } catch {}
      setLoading(true);
      try {
        const q = query(collection(db, 'prompts'), orderBy('createdAt', 'desc'), limit(500));
        const snap = await getDocs(q);
        const all = snap.docs
          .map(d => ({ ...d.data(), id: d.id } as Prompt))
          .filter(p => p.status === 'approved')
          .filter(p => p.moderationStatus !== 'hidden');

        // Deduplicate by slug — keeps the newest (first due to orderBy desc)
        // prevents duplicate Firestore docs with the same slug from showing as separate cards
        const seenSlugs = new Set<string>();
        const data = all.filter(p => {
          const key = p.slug || p.id!;
          if (seenSlugs.has(key)) return false;
          seenSlugs.add(key);
          return true;
        });

        try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() })); } catch {}
        setRawPrompts(data);
        setFetchError(null);
      } catch (err) {
        console.error('Explore fetch error:', err);
        setFetchError('Failed to load prompts. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    fetchPrompts();
  }, []);

  const prompts = rawPrompts;

  // Sync search term to URL so searches are shareable
  useEffect(() => {
    setCurrentPage(1);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (searchTerm) next.set('q', searchTerm);
      else next.delete('q');
      return next;
    }, { replace: true });
  }, [searchTerm]);

  // Filtering Logic
  const filteredPrompts = prompts.filter(p => {
    // Model Filter
    if (activeModel !== 'All' && p.model.toLowerCase() !== activeModel.toLowerCase()) return false;

    // Search Filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const inTitle = p.title.toLowerCase().includes(search);
      const inDesc = p.description.toLowerCase().includes(search);
      const inTags = p.tags.some(t => t.toLowerCase().includes(search));
      if (!inTitle && !inDesc && !inTags) return false;
    }

    // Category Filter
    if (activeCategories.size > 0) {
      const catSlug = toSlug(p.categoryId);
      if (!activeCategories.has(catSlug) && !activeCategories.has(p.categoryId.toLowerCase())) return false;
    }

    // Tag Filter
    if (activeTags.size > 0) {
      const hasTag = p.tags.some(t => activeTags.has(toSlug(t)) || activeTags.has(t.toLowerCase()));
      if (!hasTag) return false;
    }

    return true;
  });

  // Feed-mode filter on top of URL filters
  const followingSet = new Set<string>(profile?.following || []);

  const feedFilteredPrompts = (() => {
    if (feedMode === 'following') {
      return filteredPrompts.filter(p => followingSet.has(p.creatorId || ''));
    }
    if (feedMode === 'foryou' && activeInterestChips.size > 0) {
      return filteredPrompts.filter(p => {
        const allTags = [p.categoryId, ...p.tags].map(t => t.toLowerCase());
        return Array.from(activeInterestChips).some(chip => allTags.includes(chip));
      });
    }
    return filteredPrompts;
  })();

  // Sorting Logic
  const sortedPrompts = [...feedFilteredPrompts].sort((a, b) => {
    if (feedMode === 'foryou') {
      const affinityProfile = getAffinityProfile();
      const hasAffinityData = Object.keys(affinityProfile).length > 0;
      if (hasAffinityData) return calculatePromptScore(b, affinityProfile) - calculatePromptScore(a, affinityProfile);
      if (profile?.interests && profile.interests.length > 0) {
        const coldProfile: Record<string, number> = {};
        profile.interests.forEach(i => { coldProfile[i.toLowerCase().replace(/\s+/g, '-')] = 5; });
        return calculatePromptScore(b, coldProfile) - calculatePromptScore(a, coldProfile);
      }
      return (b.likesCount || 0) - (a.likesCount || 0);
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
    { value: 'newest', label: 'Newest First' },
    { value: 'likes', label: 'Most Liked' },
    { value: 'views', label: 'Most Viewed' },
    { value: 'copies', label: 'Most Copied' },
  ];

  let pageTitle = "Explore Prompts";
  let subtitle = "Discover the best AI prompts for your workflow.";

  const hasUrlFilters = activeModel !== 'All' || activeCategories.size > 0 || activeTags.size > 0 || activePricing.size > 0;

  if (feedMode === 'foryou' && !hasUrlFilters) {
    pageTitle = "For You";
    subtitle = "Personalized picks based on your interests and activity.";
  } else if (feedMode === 'following' && !hasUrlFilters) {
    pageTitle = "Following";
    subtitle = "Latest prompts from creators you follow.";
  } else if (activeModel !== 'All' && activeCategories.size === 0 && activeTags.size === 0) {
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

  useSEO({
    title: pageTitle,
    description: subtitle || 'Browse hundreds of AI prompts for ChatGPT, Claude, Gemini and more. Filter by category, model, and pricing.',
  });

  return (
    <PageContainer className="pt-20 pb-12 max-w-[1280px]" ignoreCustomizer>
      {/* Header */}
      {/* <div className="mb-8 md:mb-12">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-2 text-foreground">{pageTitle}</h1>
        <p className="text-muted-foreground text-sm md:text-base">{subtitle}</p>
      </div> */}

      {/* Main Full-Width Layout */}
      <div className="w-full">
        {/* Content Area */}
        <div className="w-full">
          {loading && prompts.length === 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
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
              {/* Popular Category Quick Filter Bar (Competitor-style pill carousel) */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 mb-6 -mx-1 px-1">
                {[
                  { label: 'All', value: '' },
                  { label: '🔥 Trending', value: 'trending' },
                  { label: '👦 Boys', value: 'boys' },
                  { label: '👧 Girls', value: 'girls' },
                  { label: '👩‍❤️‍👨 Couple', value: 'couple' },
                  { label: '🥻 Saree', value: 'saree' },
                  { label: '🎬 Cinematic', value: 'cinematic' },
                  { label: '🏎️ Cars & Bikes', value: 'cars-bikes' },
                  { label: '🪔 Festival', value: 'festival' },
                  { label: '🎨 Anime & Art', value: 'art' },
                ].map(pill => {
                  const isActive = pill.value === ''
                    ? (activeCategories.size === 0 && activeTags.size === 0 && !searchTerm)
                    : (activeCategories.has(pill.value) || activeTags.has(pill.value) || searchTerm.toLowerCase() === pill.value);
                  return (
                    <button
                      key={pill.label}
                      onClick={() => {
                        setSearchTerm('');
                        if (pill.value === '') {
                          navigate(prefix('/'));
                        } else {
                          navigate(prefix(`/category/${toSlug(pill.value)}`));
                        }
                        setCurrentPage(1);
                      }}
                      className={cn(
                        'shrink-0 px-4 py-2 rounded-full text-xs font-extrabold transition-all border shadow-xs flex items-center gap-1.5',
                        isActive
                          ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20 scale-105'
                          : 'bg-card text-foreground/80 border-border hover:border-primary/40 hover:text-foreground hover:bg-muted/60'
                      )}
                    >
                      {pill.label}
                    </button>
                  );
                })}
              </div>



              {/* Interest Chips (For You mode) */}
              {feedMode === 'foryou' && profile?.interests && profile.interests.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {profile.interests.map(interest => {
                    const chip = interest.toLowerCase().replace(/\s+/g, '-');
                    const isActive = activeInterestChips.has(chip);
                    return (
                      <button
                        key={chip}
                        onClick={() => toggleChip(chip)}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
                          isActive
                            ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                            : 'bg-muted/40 text-muted-foreground border-border hover:border-primary/30 hover:text-foreground'
                        )}
                      >
                        {interest}
                      </button>
                    );
                  })}
                  {activeInterestChips.size > 0 && (
                    <button
                      onClick={() => setActiveInterestChips(new Set())}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold border border-dashed border-muted-foreground/30 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}

              <NeuralAdBanner className="mb-6" slot="explore-top-ad" />
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <h2 className="text-xl font-bold text-foreground">
                  {feedFilteredPrompts.length} {feedFilteredPrompts.length === 1 ? 'Prompt' : 'Prompts'}
                </h2>
                {feedMode !== 'foryou' && (
                  <div className="w-full sm:w-64">
                    <Select
                      options={sortOptions}
                      value={sortBy}
                      onChange={(val) => setSortBy(val as any)}
                      placeholder="Sort by..."
                      isSearchable={false}
                    />
                  </div>
                )}
              </div>

              {paginatedPrompts.length > 0 ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {paginatedPrompts.map((prompt) => (
                    <PromptCard
                      key={prompt.id}
                      prompt={prompt}
                    />
                  ))}
                </div>
              ) : feedMode === 'following' && !followingSet.size ? (
                <div className="text-center py-24 bg-muted/30 rounded-2xl border border-dashed border-border">
                  <Users className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-foreground">Not following anyone yet</h3>
                  <p className="text-muted-foreground max-w-xs mx-auto mt-2">
                    Follow creators you like to see their latest prompts here.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setFeedMode('all')}
                    className="mt-6"
                  >
                    Browse all prompts
                  </Button>
                </div>
              ) : (
                <div className="text-center py-24 bg-muted/30 rounded-2xl border border-dashed border-border">
                  <Zap className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-foreground">No prompts found</h3>
                  <p className="text-muted-foreground max-w-xs mx-auto mt-2">
                    Try adjusting your filters or search terms to find what you're looking for.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm('');
                      setActiveInterestChips(new Set());
                      navigate(prefix('/'));
                    }}
                    className="mt-6"
                  >
                    Clear all filters
                  </Button>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-12 flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>

                  {[...Array(totalPages)].map((_, i) => (
                    <Button
                      key={i}
                      variant={currentPage === i + 1 ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={() => setCurrentPage(i + 1)}
                      className="w-10 h-10 font-bold"
                    >
                      {i + 1}
                    </Button>
                  ))}

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* SEO & Guide Section for Competitor Ranking */}
      <div className="mt-16 pt-10 border-t border-border bg-card/40 rounded-2xl p-6 sm:p-10 space-y-6">
        <h2 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Trending AI Photo Editing Prompts for Gemini & ChatGPT
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Create viral, aesthetic AI photos and custom artwork with battle-tested prompts. Every prompt on Promptly is tested and verified for 1-click copy-pasting directly into Gemini AI, ChatGPT, or Midjourney.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {[
            { title: '1. Select Your Vibe', desc: 'Browse trending prompts for Boys, Girls, Couples, Saree, Cars, and Cinematic edits.' },
            { title: '2. Click Copy', desc: 'Use the 1-click "Copy Prompt" button on any card or quick preview modal.' },
            { title: '3. Open in AI', desc: 'Click "Open in Gemini" or "Open in ChatGPT" to jump directly into the generator.' },
            { title: '4. Generate Masterpiece', desc: 'Paste the prompt text and watch your high-res viral image generate instantly.' },
          ].map(step => (
            <div key={step.title} className="bg-background border border-border rounded-xl p-4 space-y-1">
              <h3 className="text-xs font-black uppercase tracking-wider text-primary">{step.title}</h3>
              <p className="text-xs text-muted-foreground leading-snug">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Instant Quick View Modal */}
      <PromptQuickViewModal
        prompt={quickPrompt}
        isOpen={!!quickPrompt}
        onClose={() => setQuickPrompt(null)}
      />
    </PageContainer>
  );
}
