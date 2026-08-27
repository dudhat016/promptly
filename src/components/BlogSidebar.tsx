import { addDoc, collection, getDocs, limit, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { Mail, Search, Sparkles, Tag as TagIcon, TrendingUp } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { usePath } from '../hooks/usePath';
import { calculateBlogScore, getAffinityProfile } from '../lib/affinity';
import { db } from '../lib/firebase';
import { BlogPost } from '../types';
import Spinner from './feedback/Spinner';
import Button from './primitives/Button';
import Input from './primitives/Input';

interface BlogSidebarProps {
  activeTags?: string[];
}

export default function BlogSidebar({ activeTags = [] }: BlogSidebarProps) {
  const [tags, setTags] = useState<string[]>([]);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { prefix } = usePath();
  const profile = useMemo(() => getAffinityProfile(), []);

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

        const extractedTags = Array.from(new Set([...activeTags, ...fetchedPosts.flatMap(p => p.tags || [])])).slice(0, 15);
        setTags(extractedTags);
        setHasFetched(true);
      } catch (error) {
        console.error("Error fetching tags for sidebar:", error);
      }
    }
    fetchTags();
  }, [hasFetched, activeTags]);

  const tagToSlug = (tag: string) => tag.toLowerCase().replace(/\s+/g, '-');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) navigate(prefix(`/blog?q=${encodeURIComponent(searchQuery.trim())}`));
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsSubmitting(true);
    try {

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

  const trendingPosts = useMemo(() =>
    [...posts].sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0)).slice(0, 3)
  , [posts]);

  const recommendedPosts = useMemo(() =>
    [...posts].sort((a, b) => calculateBlogScore(b, profile) - calculateBlogScore(a, profile)).slice(0, 3)
  , [posts, profile]);

  const displayTags = useMemo(() => {
    const set = new Set<string>();
    activeTags.forEach(t => set.add(t));
    tags.forEach(t => set.add(t));
    return Array.from(set).slice(0, 15);
  }, [activeTags, tags]);

  return (
    <aside className="lg:w-1/3 space-y-8 pt-5">
      {/* Search Box */}
      <div className="bg-card rounded-2xl p-6 border border-border shadow-xs">
        <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
          <Search className="w-5 h-5 text-primary" />
          Search Blog
        </h3>
        <form onSubmit={handleSearch}>
          <Input
            id="blogSearch"
            name="blogSearch"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search articles..."
            leftIcon={Search}
            variant="outline"
          />
        </form>
      </div>

      {/* Trending Posts */}
      {posts.length > 0 && (
        <div className="bg-card rounded-2xl p-6 border border-border shadow-xs">
          <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Trending Now
          </h3>
          <div className="space-y-4">
            {trendingPosts.map(post => (
              <Link
                key={`trending-${post.id}`}
                to={prefix(`/blog/${post.slug}`)}
                className="group flex gap-3 items-center"
              >
                {post.coverImage ? (
                  <img src={post.coverImage} alt="" className="w-16 h-16 rounded-xl object-cover" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center">
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
        <div className="bg-card rounded-2xl p-6 border border-primary/20 shadow-xs bg-primary/[0.03]">
          <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Recommended
          </h3>
          <div className="space-y-4">
            {recommendedPosts.map(post => (
              <Link
                key={`rec-${post.id}`}
                to={prefix(`/blog/${post.slug}`)}
                className="group flex gap-3 items-center"
              >
                {post.coverImage ? (
                  <img src={post.coverImage} alt="" className="w-16 h-16 rounded-xl object-cover" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-primary/15 flex items-center justify-center">
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
      <div className="bg-card rounded-2xl p-6 border border-border shadow-xs">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <TagIcon className="w-5 h-5 text-primary" />
          Popular Tags
        </h3>
        <div className="flex flex-wrap gap-2">
          {displayTags.length > 0 ? displayTags.map(tag => {
            const isActive = activeTags.some(t => tagToSlug(t) === tagToSlug(tag));
            return (
              <Link
                key={tag}
                to={prefix(`/blog/tag/${tagToSlug(tag)}`)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  isActive
                    ? 'bg-primary/15 text-primary border-primary/30 shadow-xs font-bold'
                    : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted border-border/80'
                }`}
              >
                #{tag}
              </Link>
            );
          }) : (
            <div className="animate-pulse flex flex-wrap gap-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-8 w-16 bg-muted rounded-xl" />
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
          <Input
            type="email"
            placeholder="Enter your email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:ring-white/30"
          />
          <Button
            type="submit"
            disabled={isSubmitting}
            variant="secondary"
            fullWidth
            className="bg-card text-primary hover:bg-primary/8 shadow-lg"
          >
            {isSubmitting ? <Spinner size="xs" /> : 'Subscribe Now'}
          </Button>
        </form>
      </div>
    </aside>
  );
}
