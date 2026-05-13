import { limit } from 'firebase/firestore';
import { ChevronLeft, ChevronRight, SlidersHorizontal, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import ExploreSidebar from '../components/ExploreSidebar';
import PromptCard from '../components/PromptCard';
import PromptCardSkeleton from '../components/PromptCardSkeleton';
import { useAuth } from '../hooks/useAuth';
import { calculatePromptScore, getAffinityProfile } from '../lib/affinity';
import { toTitleCase } from '../lib/utils';
import { apiService } from '../services/ApiService';
import { Prompt } from '../types';
import NeuralAdBanner from '../components/NeuralAdBanner';
import { usePath } from '../hooks/usePath';
import { Button, Select } from '../components/primitives';
import PageContainer from '../components/layout/PageContainer';

export default function ExplorePage() {
  const { isPro, isAdmin, profile } = useAuth();
  const navigate = useNavigate();
  const { prefix } = usePath();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

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

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

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
    async function fetchPrompts() {
      setLoading(true);
      try {
        const allPrompts = await apiService.getCollection<Prompt>('prompts');

        // Filter: only approved prompts that aren't hidden by moderation
        const fetchedPrompts = allPrompts.filter(p =>
          (p.status === 'approved' || !p.status) &&
          p.moderationStatus !== 'hidden'
        );

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
        setFetchError(null);
      } catch (err) {
        console.error("Explore Fetch Error:", err);
        setFetchError("Service synchronization issue. Please check your network or try again.");
      } finally {
        setLoading(false);
      }
    }
    fetchPrompts();
  }, [isPro, isAdmin, profile?.unlockedPrompts]);

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
      if (!activeCategories.has(p.categoryId.toLowerCase())) return false;
    }

    // Tag Filter
    if (activeTags.size > 0) {
      const hasTag = p.tags.some(t => activeTags.has(t.toLowerCase()));
      if (!hasTag) return false;
    }

    // Pricing Filter
    if (activePricing.size > 0) {
      const isFree = !p.isPaid;
      const isPaid = p.isPaid;
      if (activePricing.has('free') && !isFree && !activePricing.has('paid')) return false;
      if (activePricing.has('paid') && !isPaid && !activePricing.has('free')) return false;
    }

    return true;
  });

  // Sorting Logic
  const sortedPrompts = [...filteredPrompts].sort((a, b) => {
    if (sortBy === 'likes') return (b.likesCount || 0) - (a.likesCount || 0);
    if (sortBy === 'views') return (b.viewsCount || 0) - (a.viewsCount || 0);
    if (sortBy === 'copies') return (b.copiesCount || 0) - (a.copiesCount || 0);
    if (sortBy === 'foryou') {
      const affinityProfile = getAffinityProfile();
      const hasAffinityData = Object.keys(affinityProfile).length > 0;

      if (hasAffinityData) {
        return calculatePromptScore(b, affinityProfile) - calculatePromptScore(a, affinityProfile);
      }

      // Cold-start: build a temporary profile from stored interests
      if (profile?.interests && profile.interests.length > 0) {
        const coldProfile: Record<string, number> = {};
        profile.interests.forEach(i => {
          coldProfile[i.toLowerCase().replace(/\s+/g, '-')] = 5;
        });
        return calculatePromptScore(b, coldProfile) - calculatePromptScore(a, coldProfile);
      }

      // No data at all — fall back to likes
      return (b.likesCount || 0) - (a.likesCount || 0);
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const totalPages = Math.ceil(sortedPrompts.length / itemsPerPage);
  const paginatedPrompts = sortedPrompts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'foryou', label: 'Recommended for You' },
    { value: 'likes', label: 'Most Liked' },
    { value: 'views', label: 'Most Viewed' },
    { value: 'copies', label: 'Most Copied' },
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
    <PageContainer className="py-12" ignoreCustomizer>
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
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <h2 className="text-xl font-bold text-foreground">
                  {filteredPrompts.length} {filteredPrompts.length === 1 ? 'Prompt' : 'Prompts'}
                </h2>
                <div className="w-full sm:w-64">
                  <Select
                    options={sortOptions}
                    value={sortBy}
                    onChange={(val) => setSortBy(val as any)}
                    placeholder="Sort by..."
                    isSearchable={false}
                  />
                </div>
              </div>

              {paginatedPrompts.length > 0 ? (
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {paginatedPrompts.map((prompt) => (
                    <PromptCard key={prompt.id} prompt={prompt} />
                  ))}
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
                      navigate(prefix('/explore'));
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
    </PageContainer>
  );
}
