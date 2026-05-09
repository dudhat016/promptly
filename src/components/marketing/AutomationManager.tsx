import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Button from '../ui/Button';
import { GitBranch } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { AutomationFlow } from '../../types';

export default function AutomationManager() {
  const [automations, setAutomations] = useState<AutomationFlow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAutomations() {
      try {
        const snap = await getDocs(collection(db, 'marketing_automations'));
        setAutomations(snap.docs.map(d => ({ id: d.id, ...d.data() } as AutomationFlow)));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchAutomations();
  }, []);

  if (loading) return <div className="p-20 text-center text-muted-foreground font-bold uppercase tracking-widest animate-pulse">Loading Automations...</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground border-b border-border">
            <th className="p-8">Automation Name</th>
            <th className="p-8">Steps</th>
            <th className="p-8">Status</th>
            <th className="p-8 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {automations.map(flow => (
            <tr key={flow.id} className="tr group">
              <td className="p-8">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-md flex items-center justify-center ${flow.active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    <GitBranch className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-foreground">{flow.name}</span>
                </div>
              </td>
              <td className="p-8">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{flow.steps?.length || 0} Steps</span>
              </td>
              <td className="p-8">
                <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border ${flow.active ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-muted text-muted-foreground border-border'}`}>
                  {flow.active ? 'Active' : 'Draft'}
                </span>
              </td>
              <td className="p-8 text-right">
                <Button
                  as={Link}
                  to={`/admin/marketing/automations/edit/${flow.id}`}
                  variant="secondary"
                  size="sm"
                >
                  Edit
                </Button>
              </td>
            </tr>
          ))}
          {automations.length === 0 && (
            <tr>
              <td colSpan={4} className="p-20 text-center text-muted-foreground font-medium italic">No automations found. Create your first campaign flow.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
