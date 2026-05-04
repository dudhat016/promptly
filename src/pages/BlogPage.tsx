import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { Link, useSearchParams, useParams, useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { BlogPost } from '../types';
import { Calendar, ArrowRight, LayoutGrid, List as ListIcon, X, Eye } from 'lucide-react';
import { motion } from 'motion/react';
import BlogSidebar from '../components/BlogSidebar';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { calculateBlogScore, getAffinityProfile } from '../lib/affinity';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
        const querySnapshot = await getDocs(q);
        setPosts(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BlogPost)));
      } catch (error) {
        console.error("Error fetching blog posts:", error);
      } finally {
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
    if (sortBy === 'foryou') {
      return calculateBlogScore(b, profile) - calculateBlogScore(a, profile);
    }
    return new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime();
  });

  return (
    <div className="bg-slate-50 min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight">
            Latest Insights & News
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Discover the latest trends in AI, prompt engineering guides, and updates from our team.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-10">
          {/* Main Content Area */}
          <div className="flex-grow lg:w-2/3">
            <div className="flex flex-wrap gap-4 items-center justify-between mb-8 pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-slate-800">
                  {tagFilter ? `Posts tagged "${displayTag}"` : 'All Posts'}
                </h2>
                {tagFilter && (
                  <button 
                    onClick={() => {
                      if (tagSlug) {
                        navigate('/blog');
                      } else {
                        // fallback for old ?tag= query
                        navigate('/blog');
                      }
                    }}
                    className="flex items-center gap-1 text-xs font-bold text-slate-500 bg-slate-200 hover:bg-slate-300 px-2 py-1 rounded-md transition-colors"
                  >
                    Clear Filter <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-4">
                {hasAffinityProfile && (
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="foryou">Recommended ✨</option>
                    <option value="newest">Newest First</option>
                  </select>
                )}
                <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={cn(
                      "p-2 rounded-md transition-all",
                      viewMode === 'grid' ? "bg-indigo-50 text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={cn(
                      "p-2 rounded-md transition-all",
                      viewMode === 'list' ? "bg-indigo-50 text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    <ListIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {loading ? (
              <div className={cn(
                "grid gap-8",
                viewMode === 'grid' ? "md:grid-cols-2" : "grid-cols-1"
              )}>
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="bg-white rounded-3xl h-96 animate-pulse border border-slate-100" />
                ))}
              </div>
            ) : sortedPosts.length === 0 ? (
              <div className="text-center py-24 bg-white rounded-3xl shadow-sm border border-slate-100">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">No posts found</h3>
                <p className="text-slate-500">
                  {tagFilter ? `We couldn't find any articles tagged with "${displayTag}".` : "Check back soon for our first article!"}
                </p>
              </div>
            ) : (
              <div className={cn(
                "grid gap-8",
                viewMode === 'grid' ? "md:grid-cols-2" : "grid-cols-1"
              )}>
                {sortedPosts.map((post, index) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={cn(
                      "bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-slate-100 flex",
                      viewMode === 'grid' ? "flex-col" : "flex-col sm:flex-row h-auto sm:h-64"
                    )}
                  >
                    <Link 
                      to={`/blog/${post.slug}`} 
                      className={cn(
                        "block relative overflow-hidden bg-slate-100 shrink-0",
                        viewMode === 'grid' ? "aspect-video w-full" : "w-full sm:w-2/5 h-48 sm:h-full"
                      )}
                    >
                      {post.coverImage ? (
                        <img 
                          src={post.coverImage} 
                          alt={post.title} 
                          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 opacity-20" />
                      )}
                      {post.tags && post.tags.length > 0 && viewMode === 'grid' && (
                        <div className="absolute top-4 left-4 flex gap-2 flex-wrap">
                          <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-indigo-600 text-xs font-bold rounded-full shadow-sm">
                            {post.tags[0]}
                          </span>
                        </div>
                      )}
                    </Link>
                    <div className="p-6 md:p-8 flex flex-col flex-grow">
                      <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500 mb-4 tracking-wider">
                        <span className="flex items-center gap-1.5 uppercase">
                          <Calendar className="w-3.5 h-3.5" />
                          {post.publishedAt ? new Date(post.publishedAt.toMillis?.() || Date.now()).toLocaleDateString() : 'N/A'}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5" />
                          {post.viewsCount || 0}
                        </span>
                        {viewMode === 'list' && post.tags && post.tags.length > 0 && (
                          <span className="text-indigo-600 uppercase">{post.tags[0]}</span>
                        )}
                      </div>
                      <Link to={`/blog/${post.slug}`} className="block group">
                        <h2 className={cn(
                          "font-bold text-slate-900 mb-3 group-hover:text-indigo-600 transition-colors",
                          viewMode === 'grid' ? "text-xl line-clamp-2" : "text-2xl line-clamp-2"
                        )}>
                          {post.title}
                        </h2>
                      </Link>
                      <p className="text-slate-600 mb-6 line-clamp-3">
                        {post.excerpt}
                      </p>
                      <div className="mt-auto pt-6 border-t border-slate-100 flex items-center justify-between">
                        <Link 
                          to={`/blog/${post.slug}`}
                          className="text-indigo-600 font-bold text-sm flex items-center gap-1 hover:gap-2 transition-all"
                        >
                          Read Article <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <BlogSidebar />
        </div>
      </div>
    </div>
  );
}
