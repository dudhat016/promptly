import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, getDocs, query, where, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { BlogPost, UserProfile } from '../types';
import ReactMarkdown from 'react-markdown';
import { Calendar, ArrowLeft, Share2, Eye } from 'lucide-react';
import BlogSidebar from '../components/BlogSidebar';
import ShareModal from '../components/ShareModal';
import { useAuth } from '../hooks/useAuth';

import { useSEO } from '../hooks/useSEO';
import { useMemo } from 'react';
import { recordBlogInteraction } from '../lib/affinity';

export default function BlogDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [author, setAuthor] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const { profile } = useAuth();

  // SEO Optimization
  const seoMeta = useMemo(() => {
    if (!post) return null;
    return {
      title: post.metaTitle || `${post.title} - Promptly Blog`,
      description: post.metaDescription || post.excerpt || post.content.substring(0, 160),
      keywords: post.metaKeywords || (post.tags || []).join(', '),
      author: author?.displayName || 'Promptly Team',
      tags: post.tags,
      ogImage: post.coverImage || 'https://promptly.com/og-image.png',
    };
  }, [post, author]);

  useSEO(seoMeta || 'blog');

  useEffect(() => {
    if (post) {
      // JSON-LD Schema Markup
      const schema = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": post.title,
        "image": post.coverImage || "",
        "datePublished": post.publishedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        "author": {
          "@type": "Person",
          "name": author?.displayName || "Promptly Team"
        },
        "description": post.excerpt
      };

      const script = document.createElement('script');
      script.type = "application/ld+json";
      script.text = JSON.stringify(schema);
      document.head.appendChild(script);

      return () => {
        if (document.head.contains(script)) {
          document.head.removeChild(script);
        }
      };
    }
  }, [post, author]);

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

          // Increment views count
          import('firebase/firestore').then(({ updateDoc, increment }) => {
            updateDoc(docSnap.ref, {
              viewsCount: increment(1)
            }).catch(() => { /* ignore */ });
          });

          // Record interaction for affinity engine
          recordBlogInteraction(postData, 1);

          // Fetch author
          if (postData.authorId) {
            const authorDoc = await getDoc(doc(db, 'users', postData.authorId)).catch(() => null);
            if (authorDoc?.exists()) {
              setAuthor({ uid: authorDoc.id, ...authorDoc.data() } as UserProfile);
            }
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

  // Track Dwell Time (Add affinity without decaying other interests)
  useEffect(() => {
    if (!post) return;
    const interval = setInterval(() => {
      if (!document.hidden) {
        // Add 1 point every 10 seconds of active reading, without applying time decay
        recordBlogInteraction(post, 1, false);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [post]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex flex-col lg:flex-row gap-10">
            <div className="flex-grow lg:w-2/3 max-w-3xl animate-pulse">
              <div className="h-8 w-32 bg-slate-200 rounded mb-8" />
              <div className="h-16 w-3/4 bg-slate-200 rounded-xl mb-6" />
              <div className="h-4 w-1/4 bg-slate-200 rounded mb-12" />
              <div className="aspect-video bg-slate-200 rounded-3xl mb-12" />
              <div className="space-y-4">
                <div className="h-4 bg-slate-200 rounded w-full" />
                <div className="h-4 bg-slate-200 rounded w-full" />
                <div className="h-4 bg-slate-200 rounded w-5/6" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-slate-50 pt-32 pb-16 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-black text-slate-900 mb-4">Post not found</h1>
          <p className="text-slate-500 mb-8">The article you're looking for doesn't exist or has been removed.</p>
          <Link to="/blog" className="text-indigo-600 font-bold hover:text-indigo-700 flex items-center justify-center gap-2">
            <ArrowLeft className="w-5 h-5" /> Back to Blog
          </Link>
        </div>
      </div>
    );
  }

  const tagToSlug = (tag: string) => tag.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="bg-slate-50 min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex flex-col lg:flex-row gap-10">
          <div className="flex-grow lg:w-2/3 max-w-3xl">
            <Link to="/blog" className="inline-flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-semibold mb-8 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to all posts
            </Link>
            
            <div className="mb-10">
              {post.tags && post.tags.length > 0 && (
                <div className="flex gap-2 flex-wrap mb-6">
                  {post.tags.map(tag => (
                    <Link 
                      key={tag} 
                      to={`/blog/tag/${tagToSlug(tag)}`}
                      className="px-3 py-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-xs font-bold rounded-full transition-colors"
                    >
                      {tag}
                    </Link>
                  ))}
                </div>
              )}
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
                <h1 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight tracking-tight">
                  {post.title}
                </h1>
                <button 
                  onClick={() => setIsShareModalOpen(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-900 rounded-2xl font-bold hover:bg-slate-50 transition-all shrink-0 shadow-sm"
                >
                  <Share2 className="w-5 h-5 text-indigo-600" />
                  Share
                </button>
              </div>
              
              <div className="flex flex-wrap items-center gap-6 text-sm font-semibold text-slate-500 border-b border-slate-200 pb-8">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {post.publishedAt ? new Date(post.publishedAt.toMillis?.() || Date.now()).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : 'Draft'}
                </div>
                
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  {post.viewsCount || 0} views
                </div>
                
                {author && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden">
                      {author.photoURL ? (
                        <img src={author.photoURL} alt={author.displayName || 'Author'} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                          {author.displayName?.charAt(0) || 'A'}
                        </div>
                      )}
                    </div>
                    <span className="text-slate-700">{author.displayName || 'Anonymous'}</span>
                  </div>
                )}
              </div>
            </div>

            {post.coverImage && (
              <div className="mb-12 rounded-3xl overflow-hidden shadow-lg border border-slate-200 aspect-video bg-slate-100">
                <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover" />
              </div>
            )}

            <div className="prose prose-lg prose-slate prose-indigo max-w-none">
              <ReactMarkdown>{post.content}</ReactMarkdown>
            </div>
          </div>
          
          <BlogSidebar />
        </div>
      </div>

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
