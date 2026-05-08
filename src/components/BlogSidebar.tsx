import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { Mail, Search, Sparkles, Tag as TagIcon, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { calculateBlogScore, getAffinityProfile } from '../lib/affinity';
import { db } from '../lib/firebase';
import { BlogPost } from '../types';

export default function BlogSidebar() {
  const [tags, setTags] = useState<string[]>([]);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    if (hasFetched) return;
    async function fetchTags() {
      try {
        const q = query(
          collection(db, 'blog_posts'),
          where('status', '==', 'published'),
          orderBy('publishedAt', 'desc'),
          limit(20)
        );
        const snapshot = await getDocs(q);
        const fetchedPosts = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as BlogPost));
        setPosts(fetchedPosts);

        const extractedTags = Array.from(new Set(fetchedPosts.flatMap(p => p.tags || []))).slice(0, 8);
        setTags(extractedTags);
        setHasFetched(true);
      } catch (error) {
        console.error("Error fetching tags for sidebar:", error);
      }
    }
    fetchTags();
  }, [hasFetched]);

  const tagToSlug = (tag: string) => tag.toLowerCase().replace(/\s+/g, '-');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) navigate(`/explore?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsSubmitting(true);
    try {
      // Import addDoc and serverTimestamp from firebase/firestore at the top
      // (Wait, we already imported what we need, let's just use them directly if not, we need to import)
      // Actually let's assume we import them properly. Let's do dynamic import or just standard.
      const { addDoc, getDocs, updateDoc, query, where, serverTimestamp } = await import('firebase/firestore');

      const contactRef = collection(db, 'marketing_contacts');
      const q = query(contactRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        await addDoc(contactRef, {
          email,
          displayName: email.split('@')[0],
          firstName: '',
          lastName: '',
          tags: ['newsletter'],
          status: 'active',
          source: 'blog_sidebar',
          createdAt: serverTimestamp(),
          lastActiveAt: serverTimestamp()
        });
      } else {
        const existingDoc = querySnapshot.docs[0];
        const existingTags = existingDoc.data().tags || [];
        if (!existingTags.includes('newsletter')) {
          await updateDoc(existingDoc.ref, {
            tags: [...existingTags, 'newsletter'],
            lastActiveAt: serverTimestamp()
          });
        }
      }
      toast.success("Subscribed to newsletter!");
      setEmail('');
    } catch (error) {
      console.error("Error subscribing:", error);
      toast.error("Failed to subscribe");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <aside className="lg:w-1/3 space-y-8">
      {/* Search Box */}
      <div className="bg-card rounded-lg p-6 border border-border shadow-sm">
        <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
          <Search className="w-5 h-5 text-primary" />
          Search Blog
        </h3>
        <form onSubmit={handleSearch} className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search articles..."
            className="w-full bg-muted/50 border border-border rounded-md pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-indigo-500 transition-all"
          />
          <Search className="w-4 h-4 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2" />
        </form>
      </div>

      {/* Trending Posts */}
      {posts.length > 0 && (
        <div className="bg-card rounded-lg p-6 border border-border shadow-sm">
          <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Trending Now
          </h3>
          <div className="space-y-4">
            {[...posts].sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0)).slice(0, 3).map(post => (
              <Link
                key={`trending-${post.id}`}
                to={`/blog/${post.slug}`}
                className="group flex gap-3 items-center"
              >
                {post.coverImage ? (
                  <img src={post.coverImage} alt="" className="w-16 h-16 rounded-md object-cover" />
                ) : (
                  <div className="w-16 h-16 rounded-md bg-muted flex items-center justify-center">
                    <Search className="w-6 h-6 text-muted-foreground/30" />
                  </div>
                )}
                <div>
                  <h4 className="font-bold text-foreground text-sm line-clamp-2 group-hover:text-primary transition-colors">
                    {post.title}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <span>{post.viewsCount || 0} views</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recommended For You */}
      {Object.keys(getAffinityProfile()).length > 0 && posts.length > 0 && (
        <div className="bg-card rounded-lg p-6 border border-primary/20 shadow-sm"
          style={{ background: 'rgba(139,92,246,0.05)' }}>
          <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Recommended
          </h3>
          <div className="space-y-4">
            {[...posts].sort((a, b) => calculateBlogScore(b, getAffinityProfile()) - calculateBlogScore(a, getAffinityProfile())).slice(0, 3).map(post => (
              <Link
                key={`rec-${post.id}`}
                to={`/blog/${post.slug}`}
                className="group flex gap-3 items-center"
              >
                {post.coverImage ? (
                  <img src={post.coverImage} alt="" className="w-16 h-16 rounded-md object-cover" />
                ) : (
                  <div className="w-16 h-16 rounded-md bg-primary/15 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-primary/40" />
                  </div>
                )}
                <div>
                  <h4 className="font-bold text-foreground text-sm line-clamp-2 group-hover:text-primary transition-colors">
                    {post.title}
                  </h4>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Popular Tags */}
      <div className="bg-card rounded-lg p-6 border border-border shadow-sm">
        <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
          <TagIcon className="w-5 h-5 text-primary" />
          Popular Tags
        </h3>
        <div className="flex flex-wrap gap-2">
          {tags.length > 0 ? tags.map(tag => (
            <Link
              key={tag}
              to={`/blog/tag/${tagToSlug(tag)}`}
              className="px-3 py-1.5 bg-muted/50 text-muted-foreground hover:bg-primary/8 hover:text-primary text-sm font-semibold rounded-lg transition-colors border border-border"
            >
              {tag}
            </Link>
          )) : (
            <div className="animate-pulse flex flex-wrap gap-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-8 w-16 bg-muted rounded-lg" />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Newsletter */}
      <div className="bg-gradient-to-br from-primary to-violet-700 rounded-lg p-8 shadow-xl shadow-primary/10 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-card/10 rounded-full blur-2xl" />
        <Mail className="w-8 h-8 mb-4 text-white/70" />
        <h3 className="font-bold text-2xl mb-2">Stay Updated</h3>
        <p className="text-primary-foreground/80 text-sm mb-6">
          Get the latest prompt engineering guides and AI news delivered directly to your inbox.
        </p>
        <form className="space-y-3" onSubmit={handleSubscribe}>
          <input
            type="email"
            placeholder="Enter your email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-card/10 border border-white/20 rounded-md px-4 py-3 text-sm text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-white/50"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-card text-primary font-bold text-sm px-4 py-3 rounded-md hover:bg-primary/8 transition-colors shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-primary/30 border-t-indigo-600 rounded-full animate-spin" />
            ) : (
              "Subscribe Now"
            )}
          </button>
        </form>
      </div>
    </aside>
  );
}
