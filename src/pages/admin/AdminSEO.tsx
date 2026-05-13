import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Prompt } from '../../types';
import { AlertCircle, CheckCircle2, Search, Edit, Download, Globe, FileText } from 'lucide-react';
import { AdminPageHeader } from '../../components/admin';
import { Link } from 'react-router-dom';
import { usePath } from '../../hooks/usePath';
import Button from '../../components/primitives/Button';

export default function AdminSEO() {
  const { prefix } = usePath();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [blogPosts, setBlogPosts] = useState<any[]>([]);
  const [sitePages, setSitePages] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const pSnap = await getDocs(collection(db, 'prompts'));
      setPrompts(pSnap.docs.map(d => ({ ...d.data(), id: d.id } as Prompt)));

      const bSnap = await getDocs(collection(db, 'blog_posts'));
      setBlogPosts(bSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const sSnap = await getDocs(collection(db, 'site_pages'));
      setSitePages(sSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const tSnap = await getDocs(collection(db, 'tags'));
      setTags(tSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      setLoading(false);
    }
    loadData();
  }, []);

  const handleDownloadSitemap = () => {
    const baseUrl = window.location.origin;
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    sitePages.forEach(p => {
      sitemap += `  <url><loc>${baseUrl}${p.path}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>\n`;
    });

    if (sitePages.length === 0) {
      const corePages = ['', '/explore', '/pricing', '/blog', '/contact'];
      corePages.forEach(path => {
        sitemap += `  <url><loc>${baseUrl}${path}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>\n`;
      });
    }

    prompts.forEach(p => {
      if (p.slug) {
        sitemap += `  <url><loc>${baseUrl}/prompt/${p.slug}</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>\n`;
      }
    });

    blogPosts.forEach(b => {
      if (b.slug) {
        sitemap += `  <url><loc>${baseUrl}/blog/${b.slug}</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>\n`;
      }
    });

    sitemap += `</urlset>`;

    const blob = new Blob([sitemap], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sitemap.xml';
    link.click();
    URL.revokeObjectURL(url);
  };

  const getSEOIssues = (p: Prompt) => {
    const issues = [];
    
    // 1. Meta Tags (Foundational)
    if (!p.metaDescription) issues.push('Missing meta description');
    else if (p.metaDescription.length < 120) issues.push('Meta description too short (<120 chars)');
    
    if (p.title && p.title.length > 60) issues.push('Title too long (>60 chars)');
    if (!p.slug) issues.push('Missing SEO slug');

    // 2. Content Quality (Expert)
    const wordCount = p.content?.split(/\s+/).length || 0;
    if (wordCount < 100) issues.push(`Thin content (${wordCount} words)`);
    else if (wordCount > 1500) issues.push('Content may be too long for a prompt (potential noise)');

    if (!p.usageGuide) issues.push('Expert Tip: Missing Usage Guide (Schema improvement)');
    if (!p.sampleOutput) issues.push('Expert Tip: Missing Sample Output (Trust indicator)');

    // 3. Technical & Keywords (Marketing)
    if (!p.metaKeywords || p.metaKeywords.split(',').length < 3) {
      issues.push('Low keyword density (aim for 3+ keywords)');
    }

    // Check if title contains at least one tag (Keyword optimization)
    const titleLower = p.title.toLowerCase();
    const hasTagInTitle = p.tags?.some(tagId => {
      const tag = tags.find(t => t.id === tagId);
      return tag && titleLower.includes(tag.name.toLowerCase());
    });
    if (!hasTagInTitle && p.tags?.length > 0) {
      issues.push('Title lacks primary keyword/tag');
    }

    return issues;
  };

  const auditData = prompts.map(p => {
    const issues = getSEOIssues(p);
    // Expert Scoring Algorithm
    const totalPotentialChecks = 8;
    const score = Math.max(0, Math.round(((totalPotentialChecks - issues.length) / totalPotentialChecks) * 100));
    return { ...p, issues, score };
  });

  const avgScore = auditData.length > 0 
    ? Math.round(auditData.reduce((acc, p) => acc + p.score, 0) / auditData.length) 
    : 100;

  const totalIssues = auditData.reduce((acc, p) => acc + p.issues.length, 0);
  const promptsWithIssues = auditData.filter(p => p.issues.length > 0).length;
  const coreAuditIssues = sitePages.filter(p => !p.description || !p.canonical).length;

  if (loading) return <div className="p-10 text-muted-foreground">Loading SEO Audit...</div>;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        label="Content"
        labelIcon={Search}
        title="SEO Audit"
        subtitle="Identify and fix content gaps to rank higher on search engines."
        actions={
          <>
            <Button
              as={Link}
              to={prefix("/admin/site-pages")}
              variant="secondary"
              size="md"
              leftIcon={Globe}
              className="font-bold"
            >
              Site Pages
            </Button>
            <Button
              onClick={handleDownloadSitemap}
              variant="primary"
              size="md"
              leftIcon={Download}
              className="font-bold shadow-lg shadow-primary/20"
            >
              Sitemap.xml
            </Button>
          </>
        }
      />

      <div className="grid md:grid-cols-4 gap-6">
        <div className="bg-card p-6 rounded-3xl border border-border">
          <div className="text-muted-foreground text-xs font-black uppercase tracking-widest mb-2">Total Issues</div>
          <div className="text-4xl font-black text-rose-500">{totalIssues + coreAuditIssues}</div>
        </div>
        <div className="bg-card p-6 rounded-3xl border border-border">
          <div className="text-muted-foreground text-xs font-black uppercase tracking-widest mb-2">Health Score</div>
          <div className={`text-4xl font-black ${avgScore > 80 ? 'text-emerald-500' : avgScore > 50 ? 'text-amber-500' : 'text-rose-500'}`}>
            {avgScore}%
          </div>
        </div>
        <div className="bg-card p-6 rounded-3xl border border-border">
          <div className="text-muted-foreground text-xs font-black uppercase tracking-widest mb-2">Optimized</div>
          <div className="text-4xl font-black text-emerald-500">{prompts.length - promptsWithIssues}</div>
        </div>
        <div className="bg-card p-6 rounded-3xl border border-border">
          <div className="text-muted-foreground text-xs font-black uppercase tracking-widest mb-2">Broken Slugs</div>
          <div className="text-4xl font-black text-amber-500">{prompts.filter(p => !p.slug).length + blogPosts.filter(b => !b.slug).length}</div>
        </div>
      </div>

      {/* Core Pages Audit */}
      <div className="bg-card rounded-[2.5rem] border border-border overflow-hidden mb-12">
        <div className="px-8 py-6 border-b border-border bg-muted/30 flex items-center justify-between">
          <h3 className="font-black text-foreground flex items-center gap-2">
            <Search className="w-5 h-5 text-primary" />
            Core Site Meta Audit
          </h3>
          <Button
            as={Link}
            to={prefix("/admin/site-pages")}
            variant="ghost"
            size="sm"
            className="text-xs font-black text-primary hover:underline hover:bg-transparent uppercase tracking-widest p-0 h-auto"
          >
            Update Meta
          </Button>
        </div>
        <div className="divide-y divide-border">
          {sitePages.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm font-bold">No site pages configured in database.</div>
          ) : sitePages.map((page, idx) => {
            const hasIssue = !page.description || !page.canonical;
            return (
              <div key={idx} className="px-8 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-xl bg-card border border-border shadow-sm ${hasIssue ? 'text-amber-500' : 'text-emerald-500'}`}>
                    {hasIssue ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="font-bold text-foreground">{page.id.toUpperCase()}</div>
                    <div className="text-xs text-muted-foreground font-medium">{page.path}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-xs font-black uppercase tracking-widest mb-1 ${hasIssue ? 'text-amber-500' : 'text-emerald-500'}`}>
                    {hasIssue ? 'Warning' : 'Optimized'}
                  </div>
                  {hasIssue && (
                    <div className="text-[10px] text-muted-foreground font-medium">
                      {!page.description && 'Missing Description. '}
                      {!page.canonical && 'Missing Canonical.'}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-card rounded-[2.5rem] border border-border overflow-hidden">
        <div className="px-8 py-6 border-b border-border bg-muted/30">
          <h3 className="font-black text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Content Health Audit (Prompts)
          </h3>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-muted/30 border-b border-border">
              <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-muted-foreground">Prompt</th>
              <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-muted-foreground">Marketing Score</th>
              <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-muted-foreground">SEO Health Checks</th>
              <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-muted-foreground text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {auditData.map((p) => (
              <tr key={p.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                <td className="px-8 py-6">
                  <div className="font-bold text-foreground mb-1">{p.title}</div>
                  <div className="text-xs text-muted-foreground font-mono">/{p.slug || 'no-slug'}</div>
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full border-4 flex items-center justify-center text-xs font-black ${
                      p.score > 80 ? 'border-emerald-500 text-emerald-600' : 
                      p.score > 50 ? 'border-amber-500 text-amber-600' : 
                      'border-rose-500 text-rose-600'
                    }`}>
                      {p.score}%
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">Visibility</div>
                      <div className="h-1.5 w-24 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${p.score > 80 ? 'bg-emerald-500' : p.score > 50 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${p.score}%` }} />
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  {p.issues.length === 0 ? (
                    <div className="flex items-center gap-2 text-emerald-600 text-sm font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                      Perfectly Optimized
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {p.issues.slice(0, 3).map((issue, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-rose-500 text-[11px] font-bold">
                          <AlertCircle className="w-3 h-3" />
                          {issue}
                        </div>
                      ))}
                      {p.issues.length > 3 && (
                        <div className="text-[9px] text-muted-foreground font-black uppercase tracking-widest pl-5">
                          + {p.issues.length - 3} more expert tips
                        </div>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-8 py-6 text-right">
                  <Button
                    as={Link}
                    to={prefix(`/admin/prompts/${p.id}/edit`)}
                    variant="secondary"
                    size="sm"
                    leftIcon={Edit}
                    className="rounded-xl text-xs font-black"
                  >
                    Fix Now
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
