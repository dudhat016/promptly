import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { AccessConfig, PermissionGroup, PermissionSet } from '../../types';
import { Save, ShieldCheck, Plus, Trash2, Edit3, Settings2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';

const DEFAULT_PERMISSIONS: PermissionSet = {
  canViewPremium: false,
  canCopyPrompts: false,
  canExportData: false,
  canUseAIBuilder: false,
  canCreateCollections: false,
  canAccessPremiumModels: false,
  canUseAPI: false,
  canRemoveWatermarks: false,
  hasPrioritySupport: false,
  canCustomBrandEmails: false,
  maxDailyPrompts: 5,
  maxFavorites: 5
};

export default function AdminPermissions() {
  const [config, setConfig] = useState<AccessConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editingGroup, setEditingGroup] = useState<PermissionGroup | null>(null);

  useEffect(() => {
    async function loadData() {
      const snap = await getDoc(doc(db, 'configs', 'access_levels'));
      if (snap.exists()) {
        setConfig(snap.data() as AccessConfig);
      } else {
        const initialGroups: PermissionGroup[] = [
          { id: 'free', name: 'Free Tier', description: 'Basic access for all users', permissions: { ...DEFAULT_PERMISSIONS }, createdAt: new Date() },
          { id: 'pro', name: 'Pro Pack', description: 'Advanced tools for power users', permissions: { ...DEFAULT_PERMISSIONS, canViewPremium: true, canCopyPrompts: true, canAccessPremiumModels: true, maxDailyPrompts: 100 }, createdAt: new Date() },
          { id: 'enterprise', name: 'Enterprise', description: 'Full access for companies', permissions: { ...DEFAULT_PERMISSIONS, canViewPremium: true, canCopyPrompts: true, canExportData: true, canUseAIBuilder: true, canCreateCollections: true, canAccessPremiumModels: true, canUseAPI: true, canRemoveWatermarks: true, hasPrioritySupport: true, canCustomBrandEmails: true, maxDailyPrompts: -1 }, createdAt: new Date() }
        ];
        setConfig({ id: 'access_levels', groups: initialGroups, lastUpdated: new Date() });
      }
    }
    loadData();
  }, []);

  const handleSave = async () => {
    if (!config) return;
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'configs', 'access_levels'), { ...config, lastUpdated: serverTimestamp() });
      toast.success("Permission Groups updated!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  const addGroup = () => {
    const newGroup: PermissionGroup = {
      id: `group_${Date.now()}`,
      name: 'New Permission Group',
      description: 'Describe what this group provides',
      permissions: { ...DEFAULT_PERMISSIONS },
      createdAt: new Date()
    };
    setConfig(prev => prev ? { ...prev, groups: [...prev.groups, newGroup] } : null);
    setEditingGroup(newGroup);
  };

  const updateGroupPermissions = (groupId: string, key: keyof PermissionSet) => {
    if (!config) return;
    const updatedGroups = config.groups.map(g => {
      if (g.id !== groupId) return g;
      const val = g.permissions[key];
      return {
        ...g,
        permissions: {
          ...g.permissions,
          [key]: typeof val === 'boolean' ? !val : val
        }
      };
    });
    setConfig({ ...config, groups: updatedGroups });
  };

  const deleteGroup = (id: string) => {
    if (!confirm("Are you sure? Any plans linked to this group will lose their permission context.")) return;
    setConfig(prev => prev ? { ...prev, groups: prev.groups.filter(g => g.id !== id) } : null);
  };

  if (!config) return <div className="p-12 text-center text-slate-500 font-bold animate-pulse">Loading Permission Groups...</div>;

  const permissionKeys = Object.keys(DEFAULT_PERMISSIONS) as (keyof PermissionSet)[];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Permission Groups</h2>
          <p className="text-slate-500 mt-2 font-medium">Create reusable permission sets and link them to your pricing plans.</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={addGroup}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-900 px-6 py-4 rounded-2xl font-bold hover:bg-slate-50 transition-all"
          >
            <Plus className="w-5 h-5" />
            Create Group
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {isSaving ? 'Saving...' : 'Sync All Groups'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-slate-400 min-w-[250px]">Feature / Capability</th>
                {config.groups.map(group => (
                  <th key={group.id} className="px-8 py-6 min-w-[200px] border-l border-slate-100">
                    <div className="flex items-center justify-between group">
                      <div>
                        <p className="text-indigo-600 font-black uppercase tracking-widest text-[10px]">{group.id}</p>
                        <h4 className="font-black text-slate-900 text-base">{group.name}</h4>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setEditingGroup(group)} className="p-2 hover:bg-slate-200 rounded-lg text-slate-500"><Edit3 className="w-4 h-4" /></button>
                        <button onClick={() => deleteGroup(group.id)} className="p-2 hover:bg-rose-100 rounded-lg text-rose-500"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {permissionKeys.map(key => (
                <tr key={key} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-5">
                    <p className="font-bold text-slate-900 capitalize text-sm">{key.replace(/([A-Z])/g, ' $1')}</p>
                    <p className="text-[10px] text-slate-400 font-medium">Internal key: {key}</p>
                  </td>
                  {config.groups.map(group => (
                    <td key={group.id} className="px-8 py-5 text-center border-l border-slate-100">
                      {typeof group.permissions[key] === 'boolean' ? (
                        <button 
                          onClick={() => updateGroupPermissions(group.id, key)}
                          className={`w-12 h-6 rounded-full transition-all relative ${group.permissions[key] ? 'bg-indigo-600' : 'bg-slate-200'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${group.permissions[key] ? 'right-1' : 'left-1'}`} />
                        </button>
                      ) : (
                        <input 
                          type="number" 
                          value={group.permissions[key]}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            const updatedGroups = config.groups.map(g => g.id === group.id ? { ...g, permissions: { ...g.permissions, [key]: val } } : g);
                            setConfig({ ...config, groups: updatedGroups });
                          }}
                          className="w-20 text-center bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold focus:bg-white focus:border-indigo-600 transition-all"
                        />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Group Modal */}
      <AnimatePresence>
        {editingGroup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-[3rem] w-full max-w-lg p-10 shadow-2xl"
            >
              <h3 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3">
                <Settings2 className="w-8 h-8 text-indigo-600" />
                Edit Permission Group
              </h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Group Name</label>
                  <input 
                    type="text"
                    value={editingGroup.name}
                    onChange={e => {
                      const updated = { ...editingGroup, name: e.target.value };
                      setEditingGroup(updated);
                      setConfig(prev => prev ? { ...prev, groups: prev.groups.map(g => g.id === editingGroup.id ? updated : g) } : null);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:bg-white focus:border-indigo-600 font-bold transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Description</label>
                  <textarea 
                    rows={3}
                    value={editingGroup.description}
                    onChange={e => {
                      const updated = { ...editingGroup, description: e.target.value };
                      setEditingGroup(updated);
                      setConfig(prev => prev ? { ...prev, groups: prev.groups.map(g => g.id === editingGroup.id ? updated : g) } : null);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:bg-white focus:border-indigo-600 font-medium transition-all"
                  />
                </div>
              </div>

              <div className="mt-10 flex gap-4">
                <button 
                  onClick={() => setEditingGroup(null)}
                  className="flex-grow bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-slate-800 transition-all"
                >
                  Confirm Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

