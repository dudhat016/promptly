import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { PricingPlan, AccessConfig, PermissionGroup } from '../../types';
import { Save, Zap } from 'lucide-react';
import { AdminPageHeader } from '../../components/admin';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { RefreshCw } from 'lucide-react';
import Select from '../../components/ui/Select';

export default function AdminSubscriptionForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [saving, setSaving] = useState(false);
  const [groups, setGroups] = useState<PermissionGroup[]>([]);
  const [plan, setPlan] = useState<Partial<PricingPlan>>({
    name: '', 
    description: '', 
    monthlyPrice: 0, 
    yearlyPrice: 0, 
    inrMonthlyPrice: 0, 
    inrYearlyPrice: 0, 
    features: [], 
    isPopular: false, 
    permissionGroupId: ''
  });

  useEffect(() => {
    async function loadData() {
      try {
        // Load groups
        const configSnap = await getDoc(doc(db, 'configs', 'access_levels'));
        if (configSnap.exists()) {
          const config = configSnap.data() as AccessConfig;
          setGroups(config.groups || []);
        }

        if (id && id !== 'new') {
          const docSnap = await getDoc(doc(db, 'plans', id));
          if (docSnap.exists()) {
            setPlan({ ...docSnap.data(), id: docSnap.id } as PricingPlan);
          }
        }
      } catch (err) {
        console.error("Error loading plan:", err);
      }
    }
    loadData();
  }, [id]);


  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Clean plan data (remove id field from the payload itself)
      const { id: _, ...saveData } = plan;
      
      const targetId = (id && id !== 'new') ? id : Date.now().toString();
      
      await setDoc(doc(db, 'plans', targetId), {
        ...saveData,
        updatedAt: serverTimestamp()
      }, { merge: true });

      toast.success("Pricing plan saved successfully!");
      navigate('/admin/subscriptions');
    } catch (err) {
      console.error("Error saving plan:", err);
      toast.error("Failed to save plan: " + (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl">
      <AdminPageHeader
        label="Revenue"
        labelIcon={Zap}
        title={id === 'new' ? 'Create Pricing Plan' : 'Edit Pricing Plan'}
        subtitle="Define pricing, features, and permission groups for this plan."
      />

      <div className="bg-card rounded-lg border border-border shadow-sm p-8">
        
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-2">
              <label htmlFor="planName" className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Plan Name</label>
              <input 
                id="planName"
                type="text" required
                value={plan.name || ''}
                onChange={e => setPlan({...plan, name: e.target.value})}
                placeholder="e.g. Pro Plan"
                className="input"
              />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label htmlFor="monthlyPrice" className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Monthly Price ($)</label>
                <input 
                  id="monthlyPrice"
                  type="number" required min="0" step="0.01"
                  value={plan.monthlyPrice || 0}
                  onChange={e => setPlan({...plan, monthlyPrice: parseFloat(e.target.value)})}
                  className="input"
                />
              </div>
              <div>
                <label htmlFor="annualPrice" className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Annual Price ($)</label>
                <input 
                  id="annualPrice"
                  type="number" min="0" step="0.01"
                  value={plan.yearlyPrice || 0}
                  onChange={e => setPlan({...plan, yearlyPrice: parseFloat(e.target.value)})}
                  className="input"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="permissionGroup" className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Linked Permission Group</label>
              <Select
                id="permissionGroup"
                value={plan.permissionGroupId || ''}
                onChange={val => setPlan({...plan, permissionGroupId: val})}
                options={groups.map(g => ({ label: g.name, value: g.id, description: `ID: ${g.id}` }))}
                placeholder="Select a Group"
                isSearchable={true}
              />
            </div>
            <div className="flex items-end">
              <label htmlFor="isPopular" className="flex items-center gap-4 bg-muted/50 border border-border rounded-md p-4 w-full cursor-pointer hover:bg-muted transition-all">
                <input 
                  id="isPopular"
                  type="checkbox"
                  checked={plan.isPopular}
                  onChange={e => setPlan({...plan, isPopular: e.target.checked})}
                  className="w-5 h-5 rounded border-border text-primary focus:ring-primary/600"
                />
                <span className="font-bold text-foreground">Mark as Popular Plan</span>
              </label>
            </div>
          </div>

          <div>
            <label htmlFor="features" className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Features (Comma Separated)</label>
            <textarea 
              id="features"
              required rows={4}
              value={plan.features?.join(', ') || ''}
              onChange={e => setPlan({...plan, features: e.target.value.split(',').map(f => f.trim()).filter(Boolean)})}
              placeholder="e.g. Unlimited Prompts, API Access, Priority Support"
              className="textarea"
            />
          </div>

          <div className="pt-6 border-t border-border flex gap-4">
            <button 
              type="submit" 
              disabled={saving}
              className="flex-grow btn-primary btn-lg"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Plan'}
            </button>
            <Link 
              to="/admin/subscriptions"
              className="px-8 bg-muted text-muted-foreground font-bold py-4 rounded-md hover:bg-muted transition-all text-center"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
