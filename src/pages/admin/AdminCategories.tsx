import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, getDocs, doc, deleteDoc, orderBy } from 'firebase/firestore';
import { Category } from '../../types';
import { Search, Plus, Edit2, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    try {
      const q = query(collection(db, 'categories'), orderBy('name', 'asc'));
      const snap = await getDocs(q);
      setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() } as Category)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    await deleteDoc(doc(db, 'categories', id));
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900">Categories</h2>
          <p className="text-slate-500 mt-2">Manage the organizational structure of prompts.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search categories..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white border border-slate-200 rounded-2xl py-3 pl-10 pr-6 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-64 transition-all"
            />
          </div>
          <Link 
            to="/admin/categories/new"
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
          >
            <Plus className="w-5 h-5" />
            Add Category
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Category Name</th>
                <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Slug</th>
                <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={3} className="p-8 text-center text-slate-500">Loading categories...</td></tr>
              ) : filteredCategories.map(category => (
                <tr key={category.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-5">
                    <p className="font-bold text-slate-900">{category.name}</p>
                  </td>
                  <td className="px-8 py-5">
                    <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-xs font-bold font-mono">
                      {category.slug || category.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right space-x-2">
                    <button onClick={() => navigate(`/admin/categories/edit/${category.id}`)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(category.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all">
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
