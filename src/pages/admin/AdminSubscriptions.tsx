import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, getDocs, getDoc, doc, deleteDoc, updateDoc, setDoc } from 'firebase/firestore';
import { PricingPlan, AppConfig } from '../../types';
import { Settings, Plus, Edit2, Trash2, Check, X, Shield, Zap } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

export default function AdminSubscriptions() {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this plan?')) return;
    try {
      await deleteDoc(doc(db, 'plans', id));
      setPlans(prev => prev.filter(p => p.id !== id));
      toast.success("Plan deleted successfully");
    } catch (err) {
      toast.error("Failed to delete plan");
    }
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
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Offer Strategy</h2>
          <p className="text-slate-500 mt-2 font-medium">Select one active promotion strategy for your platform.</p>
        </div>
        
        <Link 
          to="/admin/subscriptions/new"
          className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
        >
          <Plus className="w-5 h-5" />
          Add Pricing Plan
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-8 mb-12">
        {/* Trial Config */}
        <div 
          onClick={() => setActivePromotion('trial')}
          className={`cursor-pointer group relative bg-white rounded-[3rem] p-10 border-4 transition-all duration-500 ${
            config?.activePromotion === 'trial' ? 'border-indigo-600 ring-8 ring-indigo-50 shadow-2xl' : 'border-slate-100 hover:border-slate-200'
          }`}
        >
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-8">
              <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center transition-all duration-500 ${
                config?.activePromotion === 'trial' ? 'bg-indigo-600 text-white rotate-12' : 'bg-slate-100 text-slate-400'
              }`}>
                <Zap className="w-8 h-8 fill-current" />
              </div>
              <div className={`w-8 h-8 rounded-full border-4 flex items-center justify-center transition-all ${
                config?.activePromotion === 'trial' ? 'border-indigo-600 bg-indigo-600' : 'border-slate-200'
              }`}>
                {config?.activePromotion === 'trial' && <Check className="w-4 h-4 text-white font-black" />}
              </div>
            </div>
            
            <h3 className="text-2xl font-black text-slate-900 mb-2">Free Trial</h3>
            <p className="text-sm text-slate-500 font-medium leading-relaxed mb-8 flex-grow">
              Give users full access for a limited time to boost conversion.
            </p>

            <div className={`space-y-4 pt-6 border-t transition-all ${config?.activePromotion === 'trial' ? 'border-indigo-100 opacity-100' : 'border-slate-50 opacity-50 grayscale pointer-events-none'}`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Duration (Days)</span>
                <input 
                  type="number"
                  value={config?.freeTrialDays ?? 7}
                  onClick={(e) => e.stopPropagation()}
                  onChange={async (e) => {
                    const val = parseInt(e.target.value) || 0;
                    await setDoc(doc(db, 'configs', 'global'), { freeTrialDays: val }, { merge: true });
                    setConfig(prev => prev ? { ...prev, freeTrialDays: val } : null);
                  }}
                  className="w-20 text-center bg-slate-50 border border-slate-200 rounded-xl p-3 font-black text-slate-900 focus:bg-white focus:border-indigo-600 transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Yearly Bonus Config */}
        <div 
          onClick={() => setActivePromotion('yearly_bonus')}
          className={`cursor-pointer group relative bg-white rounded-[3rem] p-10 border-4 transition-all duration-500 ${
            config?.activePromotion === 'yearly_bonus' ? 'border-emerald-500 ring-8 ring-emerald-50 shadow-2xl' : 'border-slate-100 hover:border-slate-200'
          }`}
        >
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-8">
              <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center transition-all duration-500 ${
                config?.activePromotion === 'yearly_bonus' ? 'bg-emerald-500 text-white rotate-12' : 'bg-slate-100 text-slate-400'
              }`}>
                <Shield className="w-8 h-8 fill-current" />
              </div>
              <div className={`w-8 h-8 rounded-full border-4 flex items-center justify-center transition-all ${
                config?.activePromotion === 'yearly_bonus' ? 'border-emerald-500 bg-emerald-500' : 'border-slate-200'
              }`}>
                {config?.activePromotion === 'yearly_bonus' && <Check className="w-4 h-4 text-white font-black" />}
              </div>
            </div>
            
            <h3 className="text-2xl font-black text-slate-900 mb-2">Annual Bonus</h3>
            <p className="text-sm text-slate-500 font-medium leading-relaxed mb-6 flex-grow">
              Incentivize long-term commitment with special rewards.
            </p>

            <div className={`space-y-6 pt-6 border-t transition-all ${config?.activePromotion === 'yearly_bonus' ? 'border-emerald-100 opacity-100' : 'border-slate-50 opacity-50 grayscale pointer-events-none'}`}>
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between bg-slate-50 p-2 rounded-2xl">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setDoc(doc(db, 'configs', 'global'), { yearlyIncentiveType: 'months' }, { merge: true }); setConfig(prev => prev ? {...prev, yearlyIncentiveType: 'months'} : null); }}
                    className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${config?.yearlyIncentiveType === 'months' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}
                  >Months</button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setDoc(doc(db, 'configs', 'global'), { yearlyIncentiveType: 'percent' }, { merge: true }); setConfig(prev => prev ? {...prev, yearlyIncentiveType: 'percent'} : null); }}
                    className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${config?.yearlyIncentiveType === 'percent' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}
                  >Percentage</button>
                </div>

                <div className="flex items-center justify-between px-2">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    {config?.yearlyIncentiveType === 'months' ? 'Months Free' : 'Auto-Calculated'}
                  </span>
                  {config?.yearlyIncentiveType === 'months' ? (
                    <div className="flex items-center gap-3">
                      <input 
                        type="number"
                        value={config?.yearlyIncentiveValue ?? 2}
                        onClick={(e) => e.stopPropagation()}
                        onChange={async (e) => {
                          const val = parseInt(e.target.value) || 0;
                          await setDoc(doc(db, 'configs', 'global'), { yearlyIncentiveValue: val }, { merge: true });
                          setConfig(prev => prev ? { ...prev, yearlyIncentiveValue: val } : null);
                        }}
                        className="w-20 text-center bg-emerald-50 border border-emerald-200 rounded-xl p-3 font-black text-emerald-900 focus:bg-white focus:border-emerald-500 transition-all"
                      />
                    </div>
                  ) : (
                    <div className="bg-emerald-100 text-emerald-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">
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
          className={`cursor-pointer group relative bg-white rounded-[3rem] p-10 border-4 transition-all duration-500 ${
            config?.activePromotion === 'none' ? 'border-slate-900 ring-8 ring-slate-50 shadow-2xl' : 'border-slate-100 hover:border-slate-200'
          }`}
        >
          <div className="flex flex-col h-full items-center justify-center text-center">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-all ${
              config?.activePromotion === 'none' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-300'
            }`}>
              <X className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">No Promotion</h3>
            <p className="text-sm text-slate-500 font-medium">Standard pricing without special offers.</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Plan Name</th>
                <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Price</th>
                <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Limits</th>
                <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={4} className="p-8 text-center text-slate-500">Loading plans...</td></tr>
              ) : plans.map(plan => (
                <tr key={plan.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-5">
                    <p className="font-black text-lg text-slate-900">{plan.name}</p>
                  </td>
                  <td className="px-8 py-5">
                    <p className="font-bold text-slate-900">${plan.monthlyPrice}/mo</p>
                    {plan.yearlyPrice && <p className="text-xs text-slate-500">${plan.yearlyPrice}/yr</p>}
                  </td>
                  <td className="px-8 py-5 text-xs font-medium text-slate-600">
                    <p>Features: {plan.features?.length || 0}</p>
                  </td>
                  <td className="px-8 py-5 text-right space-x-2">
                    <button onClick={() => navigate(`/admin/subscriptions/edit/${plan.id}`)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(plan.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && plans.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500 font-bold">No plans found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
