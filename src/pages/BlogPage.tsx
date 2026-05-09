import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { Link, useSearchParams, useParams, useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { BlogPost } from '../types';
import { Calendar, ArrowRight, LayoutGrid, List as ListIcon, X, Eye, Sparkles, Clock } from 'lucide-react';
import Select from '../components/ui/Select';
import { motion } from 'motion/react';
import BlogSidebar from '../components/BlogSidebar';
import { cn } from '../lib/utils';
import { calculateBlogScore, getAffinityProfile } from '../lib/affinity';
import Button from '../components/ui/Button';

function readTime(content: string) {
  return Math.max(1, Math.ceil((content || '').split(/\s+/).length / 200));
}

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchParams] = useSearchParams();
  const { tagSlug } = useParams();
  const navigate = useNavigate();
  const tagFilter = tagSlug || searchParams.get('tag');

  const profile = getAffinityProfile();
  const hasAffinityProfile = Object.keys(profile).length > 0;
  const [sortBy, setSortBy] = useState<'newest' | 'foryou'>(
    hasAffinityProfile && !tagFilter ? 'foryou' : 'newest'
  );

  useEffect(() => {
    async function fetchPosts() {
      try {
        const q = query(
          collection(db, 'blog_posts'),
          where('status', '==', 'published'),
          orderBy('publishedAt', 'desc')
        );
        const snap = await getDocs(q);
        setPosts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as BlogPost)));
      } catch { /* empty */ } finally {
        setLoading(false);
      }
    }
    fetchPosts();
  }, []);

  const allTags = Array.from(new Set(posts.flatMap(p => p.tags || []))).slice(0, 8);
  const tagToSlug = (tag: string) => tag.toLowerCase().replace(/\s+/g, '-');
  const filteredPosts = tagFilter ? posts.filter(p => p.tags?.some(t => tagToSlug(t) === tagFilter)) : posts;
  const displayTag = allTags.find(t => tagToSlug(t) === tagFilter) || tagFilter?.replace(/-/g, ' ') || '';

  const sortedPosts = [...filteredPosts].sort((a, b) => {
    if (sortBy === 'foryou') return calculateBlogScore(b, profile) - calculateBlogScore(a, profile);
    return new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime();
  });

  return (
    <div className="min-h-screen bg-background">

      {/* ── Hero ── */}
      <div className="relative pt-24 pb-16 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[350px] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(139,92,246,0.1) 0%, transparent 70%)' }} />
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-5 bg-primary/10 border border-primary/25 text-primary">
            <Sparkles className="w-3.5 h-3.5" />
            Insights & Resources
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-3 tracking-tight">
            The Promptly Blog
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Prompt engineering guides, AI trends, and product updates from our team.
          </p>
        </div>
      </div>

      {/* ── Featured Hero Post (non-filtered view only) ── */}
      {!tagFilter && !loading && sortedPosts.length > 0 && (
        <div className="container mx-auto px-4 max-w-7xl mb-12">
          <Link to={`/blog/${sortedPosts[0].slug}`} className="group block rounded-2xl overflow-hidden border border-border bg-card transition-all hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5">
            <div className="grid md:grid-cols-2">
              <div className="relative aspect-video md:aspect-auto min-h-[240px] overflow-hidden">
                {sortedPosts[0].coverImage ? (
                  <img src={sortedPosts[0].coverImage} alt={sortedPosts[0].title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-12 h-12 text-primary/30" />
                  </div>
                )}
                <div className="absolute top-4 left-4">
                  <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-primary text-white uppercase tracking-widest">
                    Featured
                  </span>
                </div>
              </div>
              <div className="p-8 md:p-10 flex flex-col justify-center">
                {sortedPosts[0].tags && sortedPosts[0].tags.length > 0 && (
                  <span className="text-xs font-bold uppercase tracking-widest text-primary mb-3">
                    {sortedPosts[0].tags[0]}
                  </span>
                )}
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3 leading-tight group-hover:text-primary transition-colors">
                  {sortedPosts[0].title}
                </h2>
                <p className="text-muted-foreground text-sm leading-relaxed mb-6 line-clamp-3">
                  {sortedPosts[0].excerpt}
                </p>
                <div className="flex items-center gap-4 text-xs font-semibold text-muted-foreground/60">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {sortedPosts[0].publishedAt ? new Date(sortedPosts[0].publishedAt.toMillis?.() || Date.now()).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Draft'}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {readTime(sortedPosts[0].content)} min read
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5" />
                    {sortedPosts[0].viewsCount || 0}
                  </span>
                </div>
                <div className="mt-6">
                  <span className="inline-flex items-center gap-2 text-sm font-bold text-primary group-hover:gap-3 transition-all">
                    Read Article <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </div>
          </Link>
        </div>
      )}

      <div className="container mx-auto px-4 max-w-7xl pb-24">
        <div className="flex flex-col lg:flex-row gap-10">

          {/* ── Main content ── */}
          <div className="flex-grow lg:w-2/3">

            {/* Toolbar */}
            <div className="flex flex-wrap gap-4 items-center justify-between mb-8 pb-5 border-b border-border">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-bold text-foreground">
                  {tagFilter ? `Posts tagged "${displayTag}"` : 'All Posts'}
                </h2>
                {tagFilter && (
                  <Button
                    onClick={() => navigate('/blog')}
                    variant="secondary"
                    size="sm"
                    rightIcon={X}
                    className="h-7 px-2 font-semibold bg-muted border border-border text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-3">
                {hasAffinityProfile && (
                  <div className="w-48">
                    <Select
                      value={sortBy}
                      onChange={val => setSortBy(val as 'newest' | 'foryou')}
                      options={[
                        { label: 'Recommended ✨', value: 'foryou', description: 'Based on your interests' },
                        { label: 'Newest First', value: 'newest', description: 'Latest articles first' }
                      ]}
                      isSearchable={false}
                    />
                  </div>
                )}
                <div className="flex items-center p-1 rounded-lg gap-0.5 bg-muted border border-border">
                  {([['grid', LayoutGrid], ['list', ListIcon]] as const).map(([mode, Icon]) => (
                    <Button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      variant={viewMode === mode ? 'primary' : 'ghost'}
                      size="icon"
                      className={cn(
                        "h-8 w-8 rounded-md transition-all",
                        viewMode === mode ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Post grid */}
            {loading ? (
              <div className={cn('grid gap-5', viewMode === 'grid' ? 'md:grid-cols-2' : 'grid-cols-1')}>
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="rounded-2xl h-80 animate-pulse bg-muted" />
                ))}
              </div>
            ) : sortedPosts.length === 0 ? (
              <div className="py-24 text-center rounded-2xl bg-card border border-border">
                <p className="text-foreground font-bold mb-2">No posts found</p>
                <p className="text-muted-foreground text-sm">
                  {tagFilter ? `No articles tagged "${displayTag}".` : 'Check back soon for our first article!'}
                </p>
              </div>
            ) : (
              <div className={cn('grid gap-5', viewMode === 'grid' ? 'md:grid-cols-2' : 'grid-cols-1')}>
                {(tagFilter ? sortedPosts : sortedPosts.slice(1)).map((post, idx) => (
                  <motion.article
                    key={post.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.07 }}
                    className={cn(
                      'rounded-2xl overflow-hidden transition-all group flex bg-card border border-border hover:border-border/80 hover:bg-muted/30',
                      viewMode === 'grid' ? 'flex-col' : 'flex-col sm:flex-row',
                    )}
                  >
                    {/* Cover image */}
                    <Link
                      to={`/blog/${post.slug}`}
                      className={cn(
                        'block relative overflow-hidden shrink-0',
                        viewMode === 'grid' ? 'aspect-video w-full' : 'w-full sm:w-2/5 h-48 sm:h-auto'
                      )}
                    >
                      {post.coverImage ? (
                        <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      ) : (
                        <div className="w-full h-full bg-primary/10" />
                      )}
                      {post.tags && post.tags.length > 0 && viewMode === 'grid' && (
                        <div className="absolute top-3 left-3">
                          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-background/80 text-primary backdrop-blur-sm border border-primary/30">
                            {post.tags[0]}
                          </span>
                        </div>
                      )}
                    </Link>

                    {/* Content */}
                    <div className="p-6 flex flex-col flex-grow">
                      <div className="flex flex-wrap items-center gap-3 text-xs font-semibold mb-3 uppercase tracking-wider text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {post.publishedAt ? new Date(post.publishedAt.toMillis?.() || Date.now()).toLocaleDateString() : 'N/A'}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {readTime(post.content)} min
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5" />
                          {post.viewsCount || 0}
                        </span>
                        {viewMode === 'list' && post.tags && post.tags.length > 0 && (
                          <span className="text-primary">{post.tags[0]}</span>
                        )}
                      </div>
                      <Link to={`/blog/${post.slug}`} className="block group/title mb-2">
                        <h2 className={cn(
                          'font-bold text-foreground transition-colors group-hover/title:text-primary',
                          viewMode === 'grid' ? 'text-lg line-clamp-2' : 'text-xl line-clamp-2'
                        )}>
                          {post.title}
                        </h2>
                      </Link>
                      <p className="text-sm line-clamp-3 mb-5 leading-relaxed flex-1 text-muted-foreground">
                        {post.excerpt}
                      </p>
                      <div className="pt-4 flex items-center justify-between border-t border-border">
                        <Link
                          to={`/blog/${post.slug}`}
                          className="text-sm font-semibold flex items-center gap-1.5 transition-all group/link text-primary hover:text-primary/80"
                        >
                          Read Article
                          <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
                        </Link>
                      </div>
                    </div>
                  </motion.article>
                ))}
              </div>
            )}
          </div>

          {/* ── Sidebar ── */}
          <BlogSidebar />
        </div>
      </div>
    </div>
  );
}
