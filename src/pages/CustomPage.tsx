import { doc, getDoc } from 'firebase/firestore';
import { FileText, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Spinner from '../components/feedback/Spinner';
import PageContainer from '../components/layout/PageContainer';
import Breadcrumbs from '../components/navigation/Breadcrumbs';
import { DEFAULT_LEGAL_PAGES } from '../data/defaultLegalContent';
import { usePath } from '../hooks/usePath';
import { useSEO } from '../hooks/useSEO';
import { db } from '../lib/firebase';

interface CustomPageData {
  title: string;
  content: string;
  metaTitle?: string;
  metaDescription?: string;
  updatedAt?: string;
}

export default function CustomPage({ defaultSlug }: { defaultSlug?: string }) {
  const { slug: routeSlug } = useParams<{ slug: string }>();
  const slug = defaultSlug || routeSlug || 'terms';
  const { prefix } = usePath();

  const [pageData, setPageData] = useState<CustomPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function loadPage() {
      setLoading(true);
      setNotFound(false);
      try {
        // 1. Try fetching from site_pages collection
        const pageRef = doc(db, 'site_pages', slug);
        const pageSnap = await getDoc(pageRef);

        if (pageSnap.exists()) {
          setPageData(pageSnap.data() as CustomPageData);
          setLoading(false);
          return;
        }

        // 2. Fallback to site_content document (built-in legal pages saved per id)
        const siteContentRef = doc(db, 'site_content', slug);
        const siteContentSnap = await getDoc(siteContentRef);

        if (siteContentSnap.exists() && siteContentSnap.data().content) {
          const data = siteContentSnap.data();
          const titles: Record<string, string> = {
            terms: 'Terms of Service',
            privacy: 'Privacy Policy',
            dmca: 'DMCA Policy',
            cookies: 'Cookie Policy',
          };
          setPageData({
            title: titles[slug] || slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            content: data.content,
            updatedAt: data.updatedAt,
          });
        } else if (DEFAULT_LEGAL_PAGES[slug]) {
          // 3. Fallback to standard default legal content if not customized yet in Firestore
          setPageData({
            title: DEFAULT_LEGAL_PAGES[slug].title,
            content: DEFAULT_LEGAL_PAGES[slug].content,
          });
        } else {
          setNotFound(true);
        }
      } catch (err) {
        console.error('Error loading custom page:', err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    loadPage();
  }, [slug]);

  useSEO({
    title: pageData?.metaTitle || pageData?.title || 'Page',
    description: pageData?.metaDescription || 'Read page content on Promptly.',
  });

  if (loading) {
    return (
      <PageContainer className="pt-24 pb-16 flex items-center justify-center min-h-[50vh]">
        <Spinner size="lg" />
      </PageContainer>
    );
  }

  if (notFound || !pageData) {
    return (
      <PageContainer className="pt-24 pb-16 text-center max-w-[1280px]">
        <div className="max-w-md mx-auto py-16 bg-muted/20 border border-dashed border-border rounded-2xl p-8">
          <Sparkles className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-foreground">Page Not Found</h1>
          <p className="text-xs text-muted-foreground mt-2">
            The page you are looking for does not exist or has been moved.
          </p>
        </div>
      </PageContainer>
    );
  }

  const formatDate = (val?: any) => {
    if (!val) return null;
    if (typeof val === 'object' && typeof val.toDate === 'function') {
      return val.toDate().toLocaleDateString();
    }
    const date = new Date(val);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString();
    }
    return String(val);
  };

  const formattedDate = formatDate(pageData.updatedAt);

  const processContent = (rawContent: string) => {
    if (!rawContent) return '';
    // If content contains HTML tags (e.g. from Rich Text Editor), render directly
    if (/<[a-z][\s\S]*>/i.test(rawContent)) {
      return rawContent;
    }
    // If content is plain text with newlines, wrap double newlines into paragraphs
    return rawContent
      .trim()
      .split(/\n\s*\n/)
      .map(para => `<p>${para.replace(/\n/g, '<br/>')}</p>`)
      .join('');
  };

  return (
    <PageContainer className="pt-20 pb-16 max-w-[1280px] w-full" ignoreCustomizer>
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { name: 'Home', item: prefix('/') },
          { name: pageData.title, item: '#' },
        ]}
      />

      {/* Hero Title Header */}
      <div className="mb-10 pb-6 border-b border-border">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <FileText className="w-5 h-5" />
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-foreground tracking-tight break-words">
            {pageData.title}
          </h1>
        </div>
        {formattedDate && (
          <p className="text-xs text-muted-foreground mt-1">
            Last Updated: {formattedDate}
          </p>
        )}
      </div>

      {/* Main Page Content Body */}
        <div
          className="prose rich-text-content dark:prose-invert max-w-none text-foreground/90 leading-relaxed text-sm sm:text-base break-words [overflow-wrap:break-word]"
          dangerouslySetInnerHTML={{ __html: processContent(pageData.content) }}
        />
    </PageContainer>
  );
}
