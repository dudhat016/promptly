import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, getDocs, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { Contact, Tag, Segment, AutomationFlow, EmailTemplate } from '../../types';
import { Send, Plus, Users, Tag as TagIcon, GitBranch, Filter } from 'lucide-react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import ContactManager from '../../components/marketing/ContactManager';

export default function AdminMarketing() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [automations, setAutomations] = useState<AutomationFlow[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active mode from URL path (e.g., /admin/marketing/contacts)
  const getActiveMode = () => {
    const path = location.pathname;
    if (path.includes('/contacts')) return 'contact';
    if (path.includes('/tags')) return 'tag';
    if (path.includes('/segments')) return 'segment';
    if (path.includes('/automations')) return 'automation';
    return 'contact';
  };

  const activeMode = getActiveMode();

  useEffect(() => {
    async function loadData() {
      try {
        const [cSnap, tSnap, sSnap, aSnap, tmpSnap] = await Promise.all([
          getDocs(collection(db, 'marketing_contacts')),
          getDocs(collection(db, 'marketing_tags')),
          getDocs(collection(db, 'marketing_segments')),
          getDocs(collection(db, 'marketing_automations')),
          getDocs(collection(db, 'templates'))
        ]);
        setContacts(cSnap.docs.map(d => ({ id: d.id, ...d.data() } as Contact)));
        setTags(tSnap.docs.map(d => ({ id: d.id, ...d.data() } as Tag)));
        setSegments(sSnap.docs.map(d => ({ id: d.id, ...d.data() } as Segment)));
        setAutomations(aSnap.docs.map(d => ({ id: d.id, ...d.data() } as AutomationFlow)));
        setTemplates(tmpSnap.docs.map(d => ({ id: d.id, ...d.data() } as EmailTemplate)));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);



  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 capitalize">{activeMode}s</h2>
          <p className="text-slate-500 mt-2">Manage and organize your marketing {activeMode}s.</p>
        </div>

        <div>
          {activeMode === 'automation' && (
            <Link 
              to="/admin/marketing/automations/new"
              className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
            >
              <Plus className="w-5 h-5" />
              Create Automation
            </Link>
          )}
          {activeMode === 'tag' && (
            <Link 
              to="/admin/marketing/tags/new"
              className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
            >
              <Plus className="w-5 h-5" />
              Create Tag
            </Link>
          )}
          {activeMode === 'segment' && (
            <Link 
              to="/admin/marketing/segments/new"
              className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
            >
              <Plus className="w-5 h-5" />
              Create Segment
            </Link>
          )}
          {activeMode === 'contact' && (
            <Link 
              to="/admin/marketing/contacts/new"
              className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
            >
              <Plus className="w-5 h-5" />
              Add Contact
            </Link>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden p-8">

        {loading ? (
          <div className="p-12 text-center text-slate-500 font-bold">Loading CRM Data...</div>
        ) : (
          <>
            {activeMode === 'contact' && (
              <ContactManager 
                contacts={contacts}
                tags={tags}
                segments={segments}
                templates={templates}
                onAddContact={() => navigate('/admin/marketing/contacts/new')}
                onEditContact={(c) => navigate(`/admin/marketing/contacts/edit/${c.id}`)}
                onDeleteContact={async (id) => {
                  if (confirm('Delete contact?')) {
                    await deleteDoc(doc(db, 'marketing_contacts', id));
                    setContacts(prev => prev.filter(c => c.id !== id));
                  }
                }}
              />
            )}

            {activeMode === 'automation' && (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {automations.map(flow => (
                  <div key={flow.id} className="bg-slate-50 border border-slate-100 rounded-3xl p-6 hover:shadow-xl transition-all">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${flow.active ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-400'}`}>
                        <GitBranch className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900">{flow.name}</h4>
                        <p className="text-xs text-slate-500 uppercase tracking-widest">{flow.steps?.length || 0} Steps</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-6">
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${flow.active ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'}`}>
                        {flow.active ? 'Active' : 'Draft'}
                      </span>
                      <div className="flex gap-2">
                        <Link to={`/admin/marketing/automations/edit/${flow.id}`} className="px-4 py-2 bg-white text-indigo-600 text-xs font-bold rounded-xl hover:bg-indigo-50 border border-slate-200">
                          Edit
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
                {automations.length === 0 && <p className="text-slate-500 col-span-3">No automations found. Create one!</p>}
              </div>
            )}
            
            {activeMode === 'tag' && (
              <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
                {tags.map(tag => (
                  <div key={tag.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-6 relative group flex flex-col justify-between h-32">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
                        <h4 className="font-bold text-slate-900">{tag.name}</h4>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2">{tag.description}</p>
                    </div>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      <Link to={`/admin/marketing/tags/edit/${tag.id}`} className="p-2 bg-white text-indigo-600 hover:bg-indigo-50 rounded-xl shadow-sm border border-slate-100">
                        Edit
                      </Link>
                      <button onClick={async () => {
                        if (confirm('Delete this tag?')) {
                          await deleteDoc(doc(db, 'marketing_tags', tag.id));
                          setTags(tags.filter(t => t.id !== tag.id));
                        }
                      }} className="p-2 bg-white text-rose-600 hover:bg-rose-50 rounded-xl shadow-sm border border-slate-100">
                        Del
                      </button>
                    </div>
                  </div>
                ))}
                {tags.length === 0 && <p className="text-slate-500 col-span-3">No tags found.</p>}
              </div>
            )}
            {activeMode === 'segment' && (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {segments.map(segment => (
                  <div key={segment.id} className="bg-slate-50 border border-slate-100 rounded-3xl p-6 relative group">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                        <Filter className="w-5 h-5" />
                      </div>
                      <h4 className="font-bold text-slate-900">{segment.name}</h4>
                    </div>
                    <p className="text-xs text-slate-500 mb-6">{segment.filters?.length || 0} Rules defined</p>
                    <div className="flex gap-2">
                      <Link to={`/admin/marketing/segments/edit/${segment.id}`} className="px-4 py-2 bg-white text-indigo-600 text-xs font-bold rounded-xl hover:bg-indigo-50 border border-slate-200">
                        Edit
                      </Link>
                      <button onClick={async () => {
                        if (confirm('Delete this segment?')) {
                          await deleteDoc(doc(db, 'marketing_segments', segment.id));
                          setSegments(segments.filter(s => s.id !== segment.id));
                        }
                      }} className="px-4 py-2 bg-white text-rose-600 text-xs font-bold rounded-xl hover:bg-rose-50 border border-slate-200">
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                {segments.length === 0 && <p className="text-slate-500 col-span-3">No segments found.</p>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
