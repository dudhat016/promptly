import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Target, Save, BarChart3, Facebook, DollarSign, ShieldCheck, Info } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'react-hot-toast';

export default function AdminMarketingSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    gaTrackingId: '',
    fbPixelId: '',
    admobSlotId: '',
    adsEnabled: false,
    analyticsEnabled: false,
    minWithdrawalAmount: 50,
    fraudScoreThreshold: 70,
    referralCommission: 25
  });

  useEffect(() => {
    async function loadConfig() {
      try {
        const docSnap = await getDoc(doc(db, 'configs', 'marketing'));
        if (docSnap.exists()) {
          setConfig(prev => ({ ...prev, ...docSnap.data() }));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'configs', 'marketing'), {
        ...config,
        updatedAt: serverTimestamp()
      });
      toast.success('Marketing settings synchronized!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Monetization Strategy Header */}
      <div className="bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl">
        <Target className="w-48 h-48 absolute -right-12 -bottom-12 opacity-5 -rotate-12" />
        <div className="relative z-10">
          <h3 className="text-3xl font-black mb-2 tracking-tight">Monetization Engine</h3>
          <p className="text-slate-400 font-medium max-w-md">Scale your revenue by monetizing free traffic with Ads and tracking user behavior with elite analytics tools.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Tracking & Analytics */}
        <div className="bg-white rounded-[3rem] border border-slate-100 p-10 shadow-sm">
          <h4 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-indigo-600" />
            Neural Analytics
          </h4>
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-black uppercase text-slate-400 mb-2 ml-1">Google Analytics ID</label>
              <input 
                type="text"
                placeholder="G-XXXXXXXXXX"
                value={config.gaTrackingId}
                onChange={e => setConfig({ ...config, gaTrackingId: e.target.value })}
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 focus:bg-white focus:border-indigo-600 transition-all font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase text-slate-400 mb-2 ml-1">Facebook Pixel ID</label>
              <div className="relative">
                <Facebook className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="text"
                  placeholder="123456789012345"
                  value={config.fbPixelId}
                  onChange={e => setConfig({ ...config, fbPixelId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 pl-12 focus:bg-white focus:border-indigo-600 transition-all font-bold"
                />
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
              <p className="font-black text-indigo-900 text-sm">Enable Global Tracking</p>
              <button 
                onClick={() => setConfig({ ...config, analyticsEnabled: !config.analyticsEnabled })}
                className={`w-12 h-6 rounded-full relative transition-all ${config.analyticsEnabled ? 'bg-indigo-600' : 'bg-slate-200'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${config.analyticsEnabled ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* AdMob & AdSense */}
        <div className="bg-white rounded-[3rem] border border-slate-100 p-10 shadow-sm">
          <h4 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
            <DollarSign className="w-6 h-6 text-emerald-600" />
            Ad Network
          </h4>
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-black uppercase text-slate-400 mb-2 ml-1">Ad Unit / Slot ID</label>
              <input 
                type="text"
                placeholder="ca-pub-XXXXXXXXXXXXXXXX"
                value={config.admobSlotId}
                onChange={e => setConfig({ ...config, admobSlotId: e.target.value })}
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 focus:bg-white focus:border-emerald-600 transition-all font-bold"
              />
            </div>
            <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-start gap-4">
              <ShieldCheck className="w-8 h-8 text-emerald-600 shrink-0" />
              <div>
                <p className="font-black text-slate-900 text-sm">PRO Protection Active</p>
                <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1">Ads are automatically hidden for all users with an active **PRO** or **Enterprise** subscription.</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
              <p className="font-black text-emerald-900 text-sm">Enable Display Ads</p>
              <button 
                onClick={() => setConfig({ ...config, adsEnabled: !config.adsEnabled })}
                className={`w-12 h-6 rounded-full relative transition-all ${config.adsEnabled ? 'bg-emerald-600' : 'bg-slate-200'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${config.adsEnabled ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Governance & Ecosystem */}
        <div className="bg-white rounded-[3rem] border border-slate-100 p-10 shadow-sm lg:col-span-2">
          <h4 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-indigo-600" />
            Governance & Ecosystem
          </h4>
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <label className="block text-xs font-black uppercase text-slate-400 mb-2 ml-1">Min. Payout ($)</label>
              <input 
                type="number"
                value={config.minWithdrawalAmount || 50}
                onChange={e => setConfig({ ...config, minWithdrawalAmount: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 focus:bg-white focus:border-indigo-600 transition-all font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase text-slate-400 mb-2 ml-1">Fraud Risk Threshold</label>
              <input 
                type="number"
                value={config.fraudScoreThreshold || 70}
                onChange={e => setConfig({ ...config, fraudScoreThreshold: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 focus:bg-white focus:border-indigo-600 transition-all font-bold"
              />
              <p className="text-[10px] text-slate-400 mt-2 font-medium italic">Higher = Less Sensitive</p>
            </div>
            <div>
              <label className="block text-xs font-black uppercase text-slate-400 mb-2 ml-1">Referral Commission (%)</label>
              <input 
                type="number"
                value={config.referralCommission || 25}
                onChange={e => setConfig({ ...config, referralCommission: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 focus:bg-white focus:border-indigo-600 transition-all font-bold"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4 text-slate-500 text-sm font-medium">
          <Info className="w-5 h-5 text-indigo-400" />
          Settings are applied globally across the neural workspace.
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="bg-indigo-600 text-white px-10 py-5 rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
          {saving ? 'Synchronizing...' : 'Save Marketing Engine'}
        </button>
      </div>
    </motion.div>
  );
}
