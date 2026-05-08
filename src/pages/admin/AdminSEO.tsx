import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Prompt } from '../../types';
import { AlertCircle, CheckCircle2, Search, Edit, Download, Globe, FileText } from 'lucide-react';
import { AdminPageHeader } from '../../components/admin';
import { Link } from 'react-router-dom';

export default function AdminSEO() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [blogPosts, setBlogPosts] = useState<any[]>([]);
  const [sitePages, setSitePages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const pSnap = await getDocs(collection(db, 'prompts'));
      setPrompts(pSnap.docs.map(d => ({ id: d.id, ...d.data() } as Prompt)));

      const bSnap = await getDocs(collection(db, 'blog_posts'));
      setBlogPosts(bSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const sSnap = await getDocs(collection(db, 'site_pages'));
      setSitePages(sSnap.docs.map(d => ({ id: d.id, ...d.data() })));

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
    if (!p.metaDescription) issues.push('Missing meta description');
    if (p.title && p.title.length > 60) issues.push('Title too long (>60 chars)');
    if (!p.content || p.content.split(' ').length < 100) issues.push('Content too short (<100 words)');
    if (!p.slug) issues.push('Missing SEO slug');
    return issues;
  };

  const auditData = prompts.map(p => ({
    ...p,
    issues: getSEOIssues(p)
  }));

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
            <Link to="/admin/site-pages" className="flex items-center gap-2 bg-card border border-border text-muted-foreground px-5 py-2.5 rounded-md font-bold hover:bg-muted transition-all text-sm">
              <Globe className="w-4 h-4" />
              Site Pages
            </Link>
            <button onClick={handleDownloadSitemap} className="flex items-center gap-2 bg-foreground text-background px-5 py-2.5 rounded-md font-bold hover:bg-foreground/90 transition-all shadow-lg text-sm">
              <Download className="w-4 h-4" />
              Sitemap.xml
            </button>
          </>
        }
      />

      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-card p-6 rounded-3xl border border-border">
          <div className="text-muted-foreground text-xs font-black uppercase tracking-widest mb-2">SEO Issues</div>
          <div className="text-4xl font-black text-rose-500">{totalIssues + coreAuditIssues}</div>
        </div>
        <div className="bg-card p-6 rounded-3xl border border-border">
          <div className="text-muted-foreground text-xs font-black uppercase tracking-widest mb-2">Optimized Content</div>
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
          <Link to="/admin/site-pages" className="text-xs font-black text-primary hover:underline uppercase tracking-widest">Update Meta</Link>
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
              <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-muted-foreground">SEO Health</th>
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
                  {p.issues.length === 0 ? (
                    <div className="flex items-center gap-2 text-emerald-600 text-sm font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                      Perfectly Optimized
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {p.issues.map((issue, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-rose-500 text-[11px] font-bold">
                          <AlertCircle className="w-3 h-3" />
                          {issue}
                        </div>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-8 py-6 text-right">
                  <Link
                    to={`/admin/prompts/edit/${p.id}`}
                    className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-xl text-xs font-black hover:bg-primary hover:text-primary-foreground transition-all"
                  >
                    <Edit className="w-3 h-3" />
                    Fix Now
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
