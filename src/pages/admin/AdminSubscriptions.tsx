import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, getDocs, getDoc, doc, deleteDoc, setDoc } from 'firebase/firestore';
import { PricingPlan, AppConfig } from '../../types';
import { Check, CreditCard, DollarSign, Edit2, Plus, Sparkles, Trash2, Zap, Shield, X } from 'lucide-react';
import Input from '../../components/ui/Input';
import { AdminPageHeader, DataTable } from '../../components/admin';
import type { DataTableColumn, DataTableActions } from '../../components/admin';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import Button from '../../components/ui/Button';

export default function AdminSubscriptions() {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    async function fetchData() {
      try {
        const [planSnap, configSnap] = await Promise.all([
          getDocs(collection(db, 'plans')),
          getDoc(doc(db, 'configs', 'global'))
        ]);
        setPlans(planSnap.docs.map(d => ({ id: d.id, ...d.data() } as PricingPlan)));
        if (configSnap.exists()) {
          setConfig(configSnap.data() as AppConfig);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleDelete = async (plan: PricingPlan) => {
    if (!confirm('Delete this pricing plan?')) return;
    try {
      await deleteDoc(doc(db, 'plans', plan.id));
      setPlans(prev => prev.filter(p => p.id !== plan.id));
      toast.success('Plan deleted');
    } catch {
      toast.error('Failed to delete plan');
    }
  };

  const handleBulkDelete = async (rows: PricingPlan[]) => {
    await Promise.all(rows.map(p => deleteDoc(doc(db, 'plans', p.id))));
    setPlans(prev => prev.filter(p => !rows.some(r => r.id === p.id)));
    toast.success(`${rows.length} plans deleted`);
  };

  const setActivePromotion = async (type: 'trial' | 'yearly_bonus' | 'none') => {
    try {
      await setDoc(doc(db, 'configs', 'global'), { 
        activePromotion: type,
        freeTrialEnabled: type === 'trial'
      }, { merge: true });
      setConfig(prev => ({ 
        ...(prev || { id: 'global', freeTrialDays: 7, yearlyIncentiveType: 'months', yearlyIncentiveValue: 2, lastUpdated: new Date() }), 
        activePromotion: type,
        freeTrialEnabled: type === 'trial'
      } as AppConfig));
      toast.success(`Strategy updated to: ${type.replace('_', ' ')}`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update promotion');
    }
  };

  return (
    <div>
      <AdminPageHeader
        label="Revenue"
        labelIcon={Zap}
        title="Plans & Offers"
        subtitle="Select one active promotion strategy for your platform."
        actions={
          <Button 
            as={Link} 
            to="/admin/subscriptions/new" 
            variant="primary"
            leftIcon={Plus}
            size="sm"
          >
            Add Pricing Plan
          </Button>
        }
      />

      <div className="grid lg:grid-cols-3 gap-8 mb-12">
        {/* Trial Config */}
        <div 
          onClick={() => setActivePromotion('trial')}
          className={`cursor-pointer group relative bg-card rounded-lg p-6 border-4 transition-all duration-500 ${
            config?.activePromotion === 'trial' ? 'border-primary/600 ring-8 ring-primary/50 shadow-2xl' : 'border-border hover:border-border'
          }`}
        >
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-8">
              <div className={`w-16 h-16 rounded-md flex items-center justify-center transition-all duration-500 ${
                config?.activePromotion === 'trial' ? 'bg-primary text-white rotate-12' : 'bg-muted text-muted-foreground'
              }`}>
                <Zap className="w-8 h-8 fill-current" />
              </div>
              <div className={`w-8 h-8 rounded-full border-4 flex items-center justify-center transition-all ${
                config?.activePromotion === 'trial' ? 'border-primary/600 bg-primary' : 'border-border'
              }`}>
                {config?.activePromotion === 'trial' && <Check className="w-4 h-4 text-white font-bold" />}
              </div>
            </div>
            
            <h3 className="text-base font-semibold text-foreground mb-2">Free Trial</h3>
            <p className="text-sm text-muted-foreground font-medium leading-relaxed mb-8 flex-grow">
              Give users full access for a limited time to boost conversion.
            </p>

            <div className={`space-y-4 pt-6 border-t transition-all ${config?.activePromotion === 'trial' ? 'border-primary/100 opacity-100' : 'border-border opacity-50 grayscale pointer-events-none'}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Duration (Days)</span>
                <Input 
                  type="number"
                  value={config?.freeTrialDays ?? 7}
                  onClick={(e) => e.stopPropagation()}
                  onChange={async (e) => {
                    const val = parseInt(e.target.value) || 0;
                    await setDoc(doc(db, 'configs', 'global'), { freeTrialDays: val }, { merge: true });
                    setConfig(prev => prev ? { ...prev, freeTrialDays: val } : null);
                  }}
                  className="w-20 text-center"
                  variant="filled"
                  inputSize="sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Yearly Bonus Config */}
        <div 
          onClick={() => setActivePromotion('yearly_bonus')}
          className={`cursor-pointer group relative bg-card rounded-lg p-6 border-4 transition-all duration-500 ${
            config?.activePromotion === 'yearly_bonus' ? 'border-emerald-500 ring-8 ring-emerald-50 shadow-2xl' : 'border-border hover:border-border'
          }`}
        >
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-8">
              <div className={`w-16 h-16 rounded-md flex items-center justify-center transition-all duration-500 ${
                config?.activePromotion === 'yearly_bonus' ? 'bg-emerald-500 text-white rotate-12' : 'bg-muted text-muted-foreground'
              }`}>
                <Shield className="w-8 h-8 fill-current" />
              </div>
              <div className={`w-8 h-8 rounded-full border-4 flex items-center justify-center transition-all ${
                config?.activePromotion === 'yearly_bonus' ? 'border-emerald-500 bg-emerald-500' : 'border-border'
              }`}>
                {config?.activePromotion === 'yearly_bonus' && <Check className="w-4 h-4 text-white font-bold" />}
              </div>
            </div>
            
            <h3 className="text-base font-semibold text-foreground mb-2">Annual Bonus</h3>
            <p className="text-sm text-muted-foreground font-medium leading-relaxed mb-6 flex-grow">
              Incentivize long-term commitment with special rewards.
            </p>

            <div className={`space-y-6 pt-6 border-t transition-all ${config?.activePromotion === 'yearly_bonus' ? 'border-emerald-100 opacity-100' : 'border-border opacity-50 grayscale pointer-events-none'}`}>
              <div className="flex flex-col gap-4">
                 <div className="flex items-center justify-between bg-muted/50 p-1 rounded-lg">
                   <Button 
                     onClick={(e) => { e.stopPropagation(); setDoc(doc(db, 'configs', 'global'), { yearlyIncentiveType: 'months' }, { merge: true }); setConfig(prev => prev ? {...prev, yearlyIncentiveType: 'months'} : null); }}
                     variant={config?.yearlyIncentiveType === 'months' ? 'white' : 'ghost'}
                     size="sm"
                     className="flex-1"
                   >
                     Months
                   </Button>
                   <Button 
                     onClick={(e) => { e.stopPropagation(); setDoc(doc(db, 'configs', 'global'), { yearlyIncentiveType: 'percent' }, { merge: true }); setConfig(prev => prev ? {...prev, yearlyIncentiveType: 'percent'} : null); }}
                     variant={config?.yearlyIncentiveType === 'percent' ? 'white' : 'ghost'}
                     size="sm"
                     className="flex-1"
                   >
                     Percentage
                   </Button>
                 </div>

                <div className="flex items-center justify-between px-2">
                  <span className="text-xs font-bold uppercase text-muted-foreground tracking-widest">
                    {config?.yearlyIncentiveType === 'months' ? 'Months Free' : 'Auto-Calculated'}
                  </span>
                  {config?.yearlyIncentiveType === 'months' ? (
                    <div className="flex items-center gap-3">
                      <Input 
                        type="number"
                        value={config?.yearlyIncentiveValue ?? 2}
                        onClick={(e) => e.stopPropagation()}
                        onChange={async (e) => {
                          const val = parseInt(e.target.value) || 0;
                          await setDoc(doc(db, 'configs', 'global'), { yearlyIncentiveValue: val }, { merge: true });
                          setConfig(prev => prev ? { ...prev, yearlyIncentiveValue: val } : null);
                        }}
                        className="w-20 text-center text-emerald-600"
                        variant="filled"
                        inputSize="sm"
                      />
                    </div>
                  ) : (
                    <div className="bg-emerald-500/10 text-emerald-600 px-4 py-2 rounded-md text-xs font-bold uppercase tracking-widest">
                      Live Logic Active
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* None Config */}
        <div 
          onClick={() => setActivePromotion('none')}
          className={`cursor-pointer group relative bg-card rounded-lg p-6 border-4 transition-all duration-500 ${
            config?.activePromotion === 'none' ? 'border-border ring-8 ring-muted shadow-2xl' : 'border-border hover:border-border'
          }`}
        >
          <div className="flex flex-col h-full items-center justify-center text-center">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-all ${
              config?.activePromotion === 'none' ? 'bg-muted text-foreground' : 'bg-muted/50 text-muted-foreground/40'
            }`}>
              <X className="w-10 h-10" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-2">No Promotion</h3>
            <p className="text-sm text-muted-foreground font-medium">Standard pricing without special offers.</p>
          </div>
        </div>
      </div>

      <DataTable
        columns={[
          {
            key: 'name',
            header: 'Plan Name',
            searchValue: p => p.name,
            sortable: true,
            sortValue: p => p.name,
            render: p => <p className="font-bold text-foreground">{p.name}</p>,
            csvValue: p => p.name,
          },
          {
            key: 'price',
            header: 'Price',
            sortable: true,
            sortValue: p => p.monthlyPrice ?? 0,
            render: p => (
              <div>
                <p className="font-bold text-foreground">${p.monthlyPrice}/mo</p>
                {p.yearlyPrice && <p className="text-xs text-muted-foreground">${p.yearlyPrice}/yr</p>}
              </div>
            ),
            csvValue: p => `$${p.monthlyPrice}/mo`,
          },
          {
            key: 'features',
            header: 'Features',
            sortable: true,
            sortValue: p => p.features?.length ?? 0,
            render: p => (
              <span className="text-sm font-medium text-muted-foreground">{p.features?.length || 0} features</span>
            ),
            csvValue: p => p.features?.length ?? 0,
          },
        ] satisfies DataTableColumn<PricingPlan>[]}
        data={plans}
        rowKey={p => p.id}
        loading={loading}
        actions={{ edit: (p: PricingPlan) => `/admin/subscriptions/edit/${p.id}`, onDelete: handleDelete } satisfies DataTableActions<PricingPlan>}
        searchPlaceholder="Search plans..."
        selectable
        onBulkDelete={handleBulkDelete}
        exportFilename="pricing-plans"
        emptyIcon={Zap}
        emptyTitle="No plans found"
        emptyMessage="Start by adding your first pricing plan."
      />
    </div>
  );
}
