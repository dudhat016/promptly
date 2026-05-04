import { collection, getDocs, limit, query } from 'firebase/firestore';
import { ArrowUpRight, Check, ChevronDown, ChevronLeft, ChevronRight, Search, SlidersHorizontal, Sliders, LayoutGrid, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import ExploreSidebar from '../components/ExploreSidebar';
import PromptCard from '../components/PromptCard';
import PromptCardSkeleton from '../components/PromptCardSkeleton';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/firebase';
import { Prompt } from '../types';
import { getAffinityProfile, calculatePromptScore } from '../lib/affinity';

export default function ExplorePage() {
  const { isPro, isAdmin, profile } = useAuth();
  const navigate = useNavigate();
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
    // Reset to first page when filters change
    setCurrentPage(1);
  }, [location.pathname]);

  useEffect(() => {
    async function fetchPrompts() {
      setLoading(true);
      try {
        const promptsRef = collection(db, 'prompts');
        const q = query(promptsRef, limit(100));
        const querySnapshot = await getDocs(q);
        const fetchedPrompts = querySnapshot.docs.map(doc => {
          const data = doc.data();
          const id = doc.id;
          
          // SECURITY: Proactively scrub content for paid prompts
          const isUnlocked = (profile?.unlockedPrompts || []).includes(id);
          const hasAccess = isPro || isAdmin || isUnlocked || !data.isPaid;
          
          if (!hasAccess) {
            delete data.content; // Formula stays in DB, never reaches client state
          }
          
          return { id, ...data } as Prompt;
        });
        setPrompts(fetchedPrompts);
      } catch (err: any) {
        setFetchError(err.message || "Failed to connect to database");
      } finally {
        setLoading(false);
      }
    }
    fetchPrompts();
  }, []);

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

  const toTitleCase = (str: string) => str.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

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
            <div className="col-span-full text-center py-24 bg-destructive/10 rounded-[2.5rem] border border-destructive/20">
              <h3 className="text-xl font-bold text-destructive mb-2">Failed to load prompts</h3>
              <p className="text-muted-foreground font-mono text-sm max-w-2xl mx-auto">{fetchError}</p>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-foreground">
                  {filteredPrompts.length} {filteredPrompts.length === 1 ? 'Prompt' : 'Prompts'}
                </h2>
                <div className="relative">
                  <button
                    onClick={() => setIsSortOpen(!isSortOpen)}
                    className="flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
                    <span>{sortOptions.find(o => o.id === sortBy)?.label}</span>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isSortOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isSortOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setIsSortOpen(false)} />
                      <div className="absolute right-0 top-full mt-2 w-full min-w-[200px] bg-card border border-border rounded-2xl shadow-xl z-20 py-2 overflow-hidden">
                        {sortOptions.map(option => (
                          <button
                            key={option.id}
                            onClick={() => {
                              setSortBy(option.id as any);
                              setIsSortOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors flex items-center justify-between ${
                              sortBy === option.id
                                ? 'bg-primary/10 text-primary'
                                : 'text-muted-foreground hover:bg-muted'
                            }`}
                          >
                            {option.label}
                            {sortBy === option.id && <Check className="w-4 h-4 text-primary" />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {filteredPrompts.length === 0 ? (
                <div className="text-center py-24 bg-muted rounded-[2.5rem] border border-border">
                  <div className="bg-background w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <Search className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-1">No prompts found</h3>
                  <p className="text-muted-foreground max-w-xs mx-auto">Try adjusting your search or filters to find what you're looking for.</p>
                  <button 
                    onClick={() => {
                      setSearchTerm('');
                      navigate('/explore');
                    }}
                    className="mt-6 text-primary font-bold hover:underline"
                  >
                    Clear all filters
                  </button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {paginatedPrompts.map((prompt) => (
                    <PromptCard key={prompt.id} prompt={prompt} />
                  ))}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-12">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-xl border border-border disabled:opacity-30 hover:bg-muted transition-colors text-foreground"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="flex items-center gap-1">
                    {[...Array(totalPages)].map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentPage(i + 1)}
                        className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${
                          currentPage === i + 1
                            ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-110'
                            : 'text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-xl border border-border disabled:opacity-30 hover:bg-muted transition-colors text-foreground"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
