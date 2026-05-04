import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { Layout, Save, Trash2, Globe, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface SitePage {
  id: string; // home, explore, pricing, blog, contact
  title: string;
  description: string;
  keywords: string;
  ogImage: string;
  canonical: string;
  path: string;
}

export default function AdminSitePages() {
  const [pages, setPages] = useState<SitePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPage, setEditingPage] = useState<Partial<SitePage> | null>(null);
  const [saving, setSaving] = useState(false);

  const defaultPages = [
    { id: 'home', path: '/', title: 'Promptly - Master AI Prompting' },
    { id: 'explore', path: '/explore', title: 'Explore AI Prompts' },
    { id: 'pricing', path: '/pricing', title: 'Pricing Plans' },
    { id: 'blog', path: '/blog', title: 'AI Prompting Blog' },
    { id: 'contact', path: '/contact', title: 'Contact Us' },
  ];

  useEffect(() => {
    fetchPages();
  }, []);

  async function fetchPages() {
    try {
      const snap = await getDocs(collection(db, 'site_pages'));
      const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() } as SitePage));
      setPages(fetched);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load site pages");
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async () => {
    if (!editingPage?.id) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'site_pages', editingPage.id), editingPage);
      toast.success("Page SEO updated!");
      fetchPages();
      setEditingPage(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save page");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-slate-500 font-bold">Loading Site Pages...</div>;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-900">Site Pages SEO</h2>
          <p className="text-slate-500 mt-2">Manage dynamic SEO metadata for core site routes.</p>
        </div>
        <button 
          onClick={() => setEditingPage({ id: '', path: '', title: '', description: '' })}
          className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all"
        >
          <Plus className="w-5 h-5" />
          Add Custom Page
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-4">
          {defaultPages.map(dp => {
            const exists = pages.find(p => p.id === dp.id);
            return (
              <button
                key={dp.id}
                onClick={() => setEditingPage(exists || dp)}
                className={`w-full flex items-center justify-between p-6 rounded-[2rem] border transition-all text-left ${
                  editingPage?.id === dp.id 
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-200 scale-[1.02]' 
                    : 'bg-white border-slate-100 text-slate-600 hover:border-indigo-200'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl ${editingPage?.id === dp.id ? 'bg-white/20' : 'bg-indigo-50 text-indigo-600'}`}>
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-black text-sm">{dp.id.toUpperCase()}</p>
                    <p className={`text-[10px] font-bold ${editingPage?.id === dp.id ? 'text-indigo-100' : 'text-slate-400'}`}>{dp.path}</p>
                  </div>
                </div>
                {exists ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5 opacity-50" />}
              </button>
            );
          })}
          
          <div className="h-[1px] bg-slate-100 my-8" />
          
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 px-4">Custom Pages</h3>
          {pages.filter(p => !defaultPages.find(dp => dp.id === p.id)).map(p => (
            <button
              key={p.id}
              onClick={() => setEditingPage(p)}
              className={`w-full flex items-center justify-between p-6 rounded-[2rem] border transition-all text-left ${
                editingPage?.id === p.id 
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-200' 
                  : 'bg-white border-slate-100 text-slate-600 hover:border-indigo-200'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${editingPage?.id === p.id ? 'bg-white/20' : 'bg-indigo-50 text-indigo-600'}`}>
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-black text-sm">{p.id}</p>
                  <p className={`text-[10px] font-bold ${editingPage?.id === p.id ? 'text-indigo-100' : 'text-slate-400'}`}>{p.path}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="lg:col-span-2">
          {editingPage ? (
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-10 sticky top-24">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black">Configure <span className="text-indigo-600">/{editingPage.id}</span></h3>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                  <Globe className="w-3 h-3" />
                  Dynamic SEO
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Page ID (System)</label>
                    <input 
                      type="text" 
                      value={editingPage.id || ''}
                      onChange={e => setEditingPage({...editingPage, id: e.target.value})}
                      placeholder="home, pricing, etc"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Path</label>
                    <input 
                      type="text" 
                      value={editingPage.path || ''}
                      onChange={e => setEditingPage({...editingPage, path: e.target.value})}
                      placeholder="/example"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Meta Title</label>
                  <input 
                    type="text" 
                    value={editingPage.title || ''}
                    onChange={e => setEditingPage({...editingPage, title: e.target.value})}
                    placeholder="Page title for search engines"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Meta Description</label>
                  <textarea 
                    rows={3}
                    value={editingPage.description || ''}
                    onChange={e => setEditingPage({...editingPage, description: e.target.value})}
                    placeholder="Brief summary for Google results (150-160 chars)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Keywords (Comma separated)</label>
                  <input 
                    type="text" 
                    value={editingPage.keywords || ''}
                    onChange={e => setEditingPage({...editingPage, keywords: e.target.value})}
                    placeholder="ai, prompts, marketplace, gpt"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">OG Image URL</label>
                    <input 
                      type="text" 
                      value={editingPage.ogImage || ''}
                      onChange={e => setEditingPage({...editingPage, ogImage: e.target.value})}
                      placeholder="https://site.com/image.png"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Canonical URL</label>
                    <input 
                      type="text" 
                      value={editingPage.canonical || ''}
                      onChange={e => setEditingPage({...editingPage, canonical: e.target.value})}
                      placeholder="https://promptly.com/pricing"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-50 flex gap-4">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-grow bg-indigo-600 text-white font-black py-4 rounded-2xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-xl shadow-indigo-100"
                  >
                    <Save className="w-5 h-5" />
                    {saving ? 'Saving...' : 'Save Meta Data'}
                  </button>
                  <button
                    onClick={() => setEditingPage(null)}
                    className="px-8 bg-slate-100 text-slate-600 font-bold py-4 rounded-2xl hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[400px] bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-12 text-center">
              <Globe className="w-16 h-16 text-slate-200 mb-4" />
              <h3 className="text-xl font-black text-slate-900 mb-2">Select a Page</h3>
              <p className="text-slate-500 max-w-xs">Choose a core site page from the list to manage its dynamic SEO meta tags.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
