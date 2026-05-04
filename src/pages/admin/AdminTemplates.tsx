import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { EmailTemplate } from '../../types';
import { Edit2, Plus, Trash2, Mail } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function AdminTemplates() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchTemplates() {
      try {
        const snap = await getDocs(collection(db, 'templates'));
        setTemplates(snap.docs.map(d => ({ id: d.id, ...d.data() } as EmailTemplate)));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchTemplates();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    await deleteDoc(doc(db, 'templates', id));
    setTemplates(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900">Email Templates</h2>
          <p className="text-slate-500 mt-2">Manage automated email structures and marketing copy.</p>
        </div>
        
        <Link 
          to="/admin/templates/new"
          className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
        >
          <Plus className="w-5 h-5" />
          Add Template
        </Link>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Template Name</th>
                <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Subject Line</th>
                <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={3} className="p-8 text-center text-slate-500">Loading templates...</td></tr>
              ) : templates.map(template => (
                <tr key={template.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                        <Mail className="w-5 h-5" />
                      </div>
                      <p className="font-bold text-slate-900">{template.name}</p>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-slate-600 font-medium">
                    {template.subject}
                  </td>
                  <td className="px-8 py-5 text-right space-x-2">
                    <button onClick={() => navigate(`/admin/templates/edit/${template.id}`)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(template.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && templates.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-slate-500 font-bold">No templates found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
