import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { AccessConfig, PermissionGroup, PermissionSet } from '../../types';
import { Save, ShieldCheck, Plus, Trash2, Edit3, Settings2 } from 'lucide-react';
import { AdminPageHeader, useConfirm } from '../../components/admin';
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
  const confirm = useConfirm();
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

  const deleteGroup = async (id: string) => {
    const ok = await confirm({
      title: 'Delete this permission group?',
      description: 'Any plans linked to this group will lose their permission context.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    setConfig(prev => prev ? { ...prev, groups: prev.groups.filter(g => g.id !== id) } : null);
  };

  if (!config) return <div className="p-12 text-center text-muted-foreground font-bold animate-pulse">Loading Permission Groups...</div>;

  const permissionKeys = Object.keys(DEFAULT_PERMISSIONS) as (keyof PermissionSet)[];

  return (
    <div>
      <AdminPageHeader
        label="System"
        labelIcon={ShieldCheck}
        title="Permissions"
        subtitle="Create reusable permission sets and link them to your pricing plans."
        actions={
          <>
            <button onClick={addGroup} className="btn-secondary">
              <Plus className="w-5 h-5" />
              Create Group
            </button>
            <button onClick={handleSave} disabled={isSaving} className="btn-primary disabled:opacity-50">
              <Save className="w-5 h-5" />
              {isSaving ? 'Saving...' : 'Sync All Groups'}
            </button>
          </>
        }
      />

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/30 border-b border-border">
                <th className="px-8 py-6 text-xs font-bold uppercase tracking-widest text-muted-foreground min-w-[250px]">Feature / Capability</th>
                {config.groups.map(group => (
                  <th key={group.id} className="px-8 py-6 min-w-[200px] border-l border-border">
                    <div className="flex items-center justify-between group">
                      <div>
                        <p className="text-primary font-bold uppercase tracking-widest text-xs">{group.id}</p>
                        <h4 className="font-bold text-foreground text-base">{group.name}</h4>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setEditingGroup(group)} className="p-2 hover:bg-muted rounded-lg text-muted-foreground"><Edit3 className="w-4 h-4" /></button>
                        <button onClick={() => deleteGroup(group.id)} className="p-2 hover:bg-rose-500/10 rounded-lg text-rose-500"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {permissionKeys.map(key => (
                <tr key={key} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-6 py-3">
                    <p className="font-bold text-foreground capitalize text-sm">{key.replace(/([A-Z])/g, ' $1')}</p>
                    <p className="text-xs text-muted-foreground font-medium">Internal key: {key}</p>
                  </td>
                  {config.groups.map(group => (
                    <td key={group.id} className="px-6 py-3 text-center border-l border-border">
                      {typeof group.permissions[key] === 'boolean' ? (
                        <button 
                          onClick={() => updateGroupPermissions(group.id, key)}
                          className={`w-12 h-6 rounded-full transition-all relative ${group.permissions[key] ? 'bg-primary' : 'bg-muted'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 bg-card rounded-full transition-all ${group.permissions[key] ? 'right-1' : 'left-1'}`} />
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
                          className="w-20 text-center bg-muted/50 border border-border rounded-md p-2 text-xs font-bold focus:bg-card focus:border-primary/40 transition-all"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-muted/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-card rounded-lg w-full max-w-lg p-10 shadow-2xl"
            >
              <h3 className="text-base font-semibold text-foreground mb-6 flex items-center gap-3">
                <Settings2 className="w-8 h-8 text-primary" />
                Edit Permission Group
              </h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold uppercase text-muted-foreground mb-2 tracking-widest">Group Name</label>
                  <input 
                    type="text"
                    value={editingGroup.name}
                    onChange={e => {
                      const updated = { ...editingGroup, name: e.target.value };
                      setEditingGroup(updated);
                      setConfig(prev => prev ? { ...prev, groups: prev.groups.map(g => g.id === editingGroup.id ? updated : g) } : null);
                    }}
                    className="w-full bg-muted/50 border border-border rounded-md p-4 focus:bg-card focus:border-primary/40 font-bold transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-muted-foreground mb-2 tracking-widest">Description</label>
                  <textarea 
                    rows={3}
                    value={editingGroup.description}
                    onChange={e => {
                      const updated = { ...editingGroup, description: e.target.value };
                      setEditingGroup(updated);
                      setConfig(prev => prev ? { ...prev, groups: prev.groups.map(g => g.id === editingGroup.id ? updated : g) } : null);
                    }}
                    className="w-full bg-muted/50 border border-border rounded-md p-4 focus:bg-card focus:border-primary/40 font-medium transition-all"
                  />
                </div>
              </div>

              <div className="mt-10 flex gap-4">
                <button 
                  onClick={() => setEditingGroup(null)}
                  className="flex-grow bg-muted text-white font-bold py-4 rounded-md hover:bg-muted transition-all"
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

