import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePath } from '../hooks/usePath';
import { collection, getDocs, query, where, limit, doc, getDoc, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { BlogPost, UserProfile } from '../types';
import ReactMarkdown from 'react-markdown';
import { Calendar, ArrowLeft, Share2, Eye, Sparkles, ArrowRight, Clock, ShieldCheck } from 'lucide-react';
import BlogSidebar from '../components/BlogSidebar';
import ShareModal from '../components/ShareModal';
import { useAuth } from '../hooks/useAuth';
import { useSEO } from '../hooks/useSEO';
import { INTERACTION_WEIGHTS, recordBlogInteraction } from '../lib/affinity';
import Schema from '../components/SEO/Schema';
import Breadcrumbs from '../components/navigation/Breadcrumbs';
import { generateSmartDescription, generateSmartKeywords } from '../utils/seo';
import Button from '../components/primitives/Button';
import PageContainer from '../components/layout/PageContainer';

function readTime(content: string) {
  return Math.max(1, Math.ceil((content || '').split(/\s+/).length / 200));
}

export default function BlogDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { prefix } = usePath();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [author, setAuthor] = useState<UserProfile | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const { profile } = useAuth();

  const seoMeta = useMemo(() => {
    if (!post) return null;
    return {
      title: post.metaTitle || `${post.title} - Promptly Blog`,
      description: generateSmartDescription(post, 'blog'),
      keywords: generateSmartKeywords(post),
      author: author?.displayName || 'Promptly Team',
      tags: post.tags,
      ogImage: post.coverImage || 'https://promptly.com/og-image.png',
    };
  }, [post, author]);

  useSEO(seoMeta || 'blog');


  useEffect(() => {
    async function fetchPost() {
      if (!slug) return;
      try {
        const q = query(collection(db, 'blog_posts'), where('slug', '==', slug), limit(1));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const docSnap = querySnapshot.docs[0];
          const postData = { id: docSnap.id, ...docSnap.data() } as BlogPost;
          setPost(postData);
          import('firebase/firestore').then(({ updateDoc, increment }) => {
            updateDoc(docSnap.ref, { viewsCount: increment(1) }).catch(() => {});
          });
          recordBlogInteraction(postData, INTERACTION_WEIGHTS.VIEW);

          // Fetch related posts by shared tags
          if (postData.tags && postData.tags.length > 0) {
            getDocs(query(
              collection(db, 'blog_posts'),
              where('status', '==', 'published'),
              where('tags', 'array-contains-any', postData.tags.slice(0, 10)),
              orderBy('publishedAt', 'desc'),
              limit(4)
            )).then(relSnap => {
              setRelatedPosts(
                relSnap.docs
                  .map(d => ({ id: d.id, ...d.data() } as BlogPost))
                  .filter(p => p.slug !== postData.slug)
                  .slice(0, 3)
              );
            }).catch(() => {});
          }

          // Only fetch the user profile for community-authored posts
          const isOfficial = postData.authorRole === 'admin' || postData.authorRole === 'staff';
          if (postData.authorId && !isOfficial) {
            const authorDoc = await getDoc(doc(db, 'users', postData.authorId)).catch(() => null);
            if (authorDoc?.exists()) setAuthor({ uid: authorDoc.id, ...authorDoc.data() } as UserProfile);
          }
        } else {
          setPost(null);
        }
      } catch (error) {
        console.error("Error fetching blog post:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchPost();
  }, [slug]);

  useEffect(() => {
    if (!post) return;
    const interval = setInterval(() => {
      if (!document.hidden) recordBlogInteraction(post, INTERACTION_WEIGHTS.VIEW, false);
    }, 10000);
    return () => clearInterval(interval);
  }, [post]);

  const tagToSlug = (tag: string) => tag.toLowerCase().replace(/\s+/g, '-');

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-16 bg-background">
      <PageContainer className="max-w-7xl" ignoreCustomizer>
          <div className="flex flex-col lg:flex-row gap-10">
            <div className="flex-grow lg:w-2/3 max-w-3xl animate-pulse">
              <div className="h-6 w-24 rounded-full mb-8 bg-muted" />
              <div className="h-12 w-3/4 rounded-xl mb-4 bg-muted" />
              <div className="h-4 w-1/3 rounded mb-10 bg-muted" />
              <div className="aspect-video rounded-2xl mb-10 bg-muted" />
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-4 rounded mb-3 bg-muted" style={{ width: `${85 + (i % 3) * 5}%` }} />
              ))}
            </div>
          </div>
        </PageContainer>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen pt-32 pb-16 flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-foreground mb-4">Post not found</h1>
          <p className="mb-8 text-muted-foreground">The article you're looking for doesn't exist or has been removed.</p>
          <Link to={prefix('/blog')} className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-semibold transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Blog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 bg-background">
      {post && (
        <Schema 
          type="Blog" 
          data={{ ...post, authorName: author?.displayName }} 
          breadcrumbs={[
            { name: 'Blog', item: prefix('/blog') },
            { name: post.title, item: prefix(`/blog/${post.slug}`) }
          ]}
        />
      )}
      <PageContainer className="max-w-7xl" ignoreCustomizer>
        <div className="flex flex-col lg:flex-row gap-10">

          {/* ── Article ── */}
          <div className="flex-grow lg:w-2/3 max-w-3xl">
            <Breadcrumbs
          items={[
            { name: 'Blog', item: prefix('/blog') },
            { name: post.title, item: prefix(`/blog/${post.slug}`) }
          ]}
        />

        <Link to={prefix('/blog')}
              className="inline-flex items-center gap-2 text-sm font-semibold mb-8 transition-colors text-muted-foreground hover:text-primary"
            >
              <ArrowLeft className="w-4 h-4" /> Back to all posts
            </Link>

            <div className="mb-10">
              {post.tags && post.tags.length > 0 && (
                <div className="flex gap-2 flex-wrap mb-6">
                  {post.tags.map(tag => (
                    <Link
                      key={tag}
                      to={prefix(`/blog/tag/${tagToSlug(tag)}`)}
                      className="px-3 py-1 text-xs font-bold rounded-full transition-colors bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20"
                    >
                      {tag}
                    </Link>
                  ))}
                </div>
              )}

              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-6">
                <h1 className="text-4xl md:text-5xl font-bold text-foreground leading-tight tracking-tight">
                  {post.title}
                </h1>
                <Button
                  onClick={() => setIsShareModalOpen(true)}
                  variant="secondary"
                  size="md"
                  leftIcon={Share2}
                  className="rounded-xl font-semibold text-sm transition-all shrink-0 bg-muted border border-border text-muted-foreground hover:bg-muted/70 hover:text-foreground h-11"
                >
                  Share
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-5 pb-8 border-b border-border">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  {post.publishedAt ? new Date(post.publishedAt.toMillis?.() || Date.now()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Draft'}
                </div>
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  {Math.max(1, Math.ceil((post.content || '').split(/\s+/).length / 200))} min read
                </div>
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <Eye className="w-4 h-4" />
                  {post.viewsCount || 0} views
                </div>
                {(() => {
                  const isOfficial = post.authorRole === 'admin' || post.authorRole === 'staff';
                  const displayName = post.authorName || author?.displayName || 'Promptly Team';
                  return (
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
                        {isOfficial ? (
                          <div className="w-full h-full flex items-center justify-center gradient-cta">
                            <ShieldCheck className="w-4 h-4 text-white" />
                          </div>
                        ) : author?.photoURL ? (
                          <img src={author.photoURL} alt={displayName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-bold text-primary bg-primary/20">
                            {displayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-muted-foreground">{displayName}</span>
                        {isOfficial && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded-md">
                            Official
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {post.coverImage && (
              <div className="mb-12 rounded-2xl overflow-hidden aspect-video border border-border">
                <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover" />
              </div>
            )}

            {/* Markdown content */}
            <div className="prose prose-neutral dark:prose-invert prose-lg max-w-none
              prose-headings:text-foreground prose-headings:font-bold prose-headings:tracking-tight
              prose-p:text-muted-foreground prose-p:leading-relaxed
              prose-a:text-primary prose-a:no-underline hover:prose-a:opacity-80
              prose-strong:text-foreground
              prose-code:text-primary prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:border prose-code:border-border
              prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:rounded-xl
              prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground
              prose-hr:border-border
              prose-li:text-muted-foreground
              prose-img:rounded-xl
            ">
              <ReactMarkdown>{post.content}</ReactMarkdown>
            </div>

            {/* ── Post-article CTA ── */}
            <div className="mt-16 rounded-2xl p-8 text-center relative overflow-hidden"
              style={{ background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.2)' }}>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[150px] pointer-events-none"
                style={{ background: 'radial-gradient(ellipse, rgba(139,92,246,0.2) 0%, transparent 70%)' }} />
              <div className="relative z-10">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.3)' }}>
                  <Sparkles className="w-5 h-5 text-violet-400" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Ready to put this into practice?</h3>
                <p className="text-sm mb-6 max-w-sm mx-auto text-muted-foreground">
                  Browse 5,000+ expert-engineered AI prompts on Promptly and start getting better results today.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link to={prefix('/explore')}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm gradient-cta transition-all">
                    Explore Prompts <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link to={prefix('/pricing')}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all bg-muted border border-border text-muted-foreground hover:text-foreground hover:bg-muted/70">
                    View Pricing
                  </Link>
                </div>
              </div>
            </div>

            {/* ── Author bio ── */}
            {author && (
              <div className="mt-10 rounded-2xl p-7 flex items-start gap-5 bg-card border border-border">
                <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0">
                  {author.photoURL ? (
                    <img src={author.photoURL} alt={author.displayName || 'Author'} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-xl text-primary bg-primary/20">
                      {author.displayName?.charAt(0) || 'A'}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-1 text-muted-foreground">Written by</p>
                  <h4 className="font-bold text-foreground mb-1">{author.displayName || 'Promptly Team'}</h4>
                  <p className="text-sm text-muted-foreground">
                    Expert in AI prompting and productivity. Writing guides to help you get the most from modern AI tools.
                  </p>
                </div>
              </div>
            )}

            {/* ── Related posts ── */}
            {relatedPosts.length > 0 && (
              <div className="mt-12">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-foreground">Related Articles</h3>
                  <Link
                    to={prefix('/blog')}
                    className="text-sm font-semibold text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                  >
                    View all <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {relatedPosts.map(related => (
                    <Link
                      key={related.id}
                      to={prefix(`/blog/${related.slug}`)}
                      className="group flex flex-col rounded-xl overflow-hidden border border-border bg-card hover:border-primary/30 hover:shadow-md transition-all"
                    >
                      <div className="relative aspect-video overflow-hidden bg-muted shrink-0">
                        {related.coverImage ? (
                          <img
                            src={related.coverImage}
                            alt={related.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Sparkles className="w-8 h-8 text-primary/20" />
                          </div>
                        )}
                      </div>
                      <div className="p-4 flex flex-col flex-grow">
                        {related.tags && related.tags.length > 0 && (
                          <span className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">
                            {related.tags[0]}
                          </span>
                        )}
                        <h4 className="font-bold text-sm text-foreground line-clamp-2 leading-snug mb-2 group-hover:text-primary transition-colors">
                          {related.title}
                        </h4>
                        <div className="mt-auto flex items-center gap-3 text-[10px] font-semibold text-muted-foreground/70 pt-3 border-t border-border">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {readTime(related.content)} min
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {related.viewsCount || 0}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Sidebar ── */}
          <BlogSidebar />
        </div>
      </PageContainer>

      {post && (
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          title={post.title}
          url={window.location.href}
          referralCode={profile?.referralCode}
        />
      )}
    </div>
  );
}
