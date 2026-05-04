import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, getDocs, doc, deleteDoc, orderBy } from 'firebase/firestore';
import { Prompt } from '../../types';
import { Search, Plus, Edit2, Trash2, Heart, Eye } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function AdminPrompts() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchPrompts();
  }, []);

  async function fetchPrompts() {
    try {
      const q = query(collection(db, 'prompts'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setPrompts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Prompt)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this prompt?')) return;
    await deleteDoc(doc(db, 'prompts', id));
    setPrompts(prev => prev.filter(p => p.id !== id));
  };

  const filteredPrompts = prompts.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.model.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900">Prompts Library</h2>
          <p className="text-slate-500 mt-2">Manage all system prompts and templates.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search prompts..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white border border-slate-200 rounded-2xl py-3 pl-10 pr-6 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-64 transition-all"
            />
          </div>
          <Link 
            to="/admin/prompts/new"
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
          >
            <Plus className="w-5 h-5" />
            Add Prompt
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Prompt</th>
                <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Model</th>
                <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Stats</th>
                <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={4} className="p-8 text-center text-slate-500">Loading prompts...</td></tr>
              ) : filteredPrompts.map(prompt => (
                <tr key={prompt.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${prompt.isPaid ? 'bg-amber-400' : 'bg-green-400'}`} />
                      <div>
                        <p className="font-bold text-slate-900">{prompt.title}</p>
                        <p className="text-xs text-slate-500 line-clamp-1 max-w-md">{prompt.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">
                      {prompt.model}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4 text-slate-400 text-xs font-bold">
                      <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {prompt.likesCount || 0}</span>
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {prompt.viewsCount || 0}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right space-x-2">
                    <button onClick={() => navigate(`/admin/prompts/edit/${prompt.id}`)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(prompt.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
