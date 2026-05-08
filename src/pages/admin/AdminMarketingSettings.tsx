import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Target, Save, BarChart3, Facebook, DollarSign, ShieldCheck, Info } from 'lucide-react';
import { AdminPageHeader } from '../../components/admin';
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
      <AdminPageHeader
        label="Marketing"
        labelIcon={Target}
        title="Marketing Settings"
        subtitle="Scale your revenue by monetizing free traffic with Ads and tracking user behavior with analytics."
      />

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Tracking & Analytics */}
        <div className="bg-card rounded-lg border border-border p-10 shadow-sm">
          <h4 className="text-base font-semibold text-foreground mb-8 flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-primary" />
            Neural Analytics
          </h4>
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase text-muted-foreground mb-2 ml-1">Google Analytics ID</label>
              <input 
                type="text"
                placeholder="G-XXXXXXXXXX"
                value={config.gaTrackingId}
                onChange={e => setConfig({ ...config, gaTrackingId: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-muted-foreground mb-2 ml-1">Facebook Pixel ID</label>
              <div className="relative">
                <Facebook className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input 
                  type="text"
                  placeholder="123456789012345"
                  value={config.fbPixelId}
                  onChange={e => setConfig({ ...config, fbPixelId: e.target.value })}
                  className="input pl-12"
                />
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-primary/8 rounded-md border border-primary/100">
              <p className="font-bold text-foreground text-sm">Enable Global Tracking</p>
              <button 
                onClick={() => setConfig({ ...config, analyticsEnabled: !config.analyticsEnabled })}
                className={`w-12 h-6 rounded-full relative transition-all ${config.analyticsEnabled ? 'bg-primary' : 'bg-muted'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-card rounded-full transition-all ${config.analyticsEnabled ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* AdMob & AdSense */}
        <div className="bg-card rounded-lg border border-border p-10 shadow-sm">
          <h4 className="text-base font-semibold text-foreground mb-8 flex items-center gap-3">
            <DollarSign className="w-6 h-6 text-emerald-600" />
            Ad Network
          </h4>
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase text-muted-foreground mb-2 ml-1">Ad Unit / Slot ID</label>
              <input 
                type="text"
                placeholder="ca-pub-XXXXXXXXXXXXXXXX"
                value={config.admobSlotId}
                onChange={e => setConfig({ ...config, admobSlotId: e.target.value })}
                className="w-full bg-muted/50 border border-border rounded-md p-4 focus:bg-card focus:border-primary/40 transition-all font-bold"
              />
            </div>
            <div className="p-6 bg-muted/50 rounded-md border border-border flex items-start gap-4">
              <ShieldCheck className="w-8 h-8 text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold text-foreground text-sm">PRO Protection Active</p>
                <p className="text-xs text-muted-foreground font-medium leading-relaxed mt-1">Ads are automatically hidden for all users with an active **PRO** or **Enterprise** subscription.</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-emerald-500/10 rounded-md border border-emerald-500/20">
              <p className="font-bold text-emerald-600 text-sm">Enable Display Ads</p>
              <button 
                onClick={() => setConfig({ ...config, adsEnabled: !config.adsEnabled })}
                className={`w-12 h-6 rounded-full relative transition-all ${config.adsEnabled ? 'bg-emerald-600' : 'bg-muted'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-card rounded-full transition-all ${config.adsEnabled ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Governance & Ecosystem */}
        <div className="bg-card rounded-lg border border-border p-10 shadow-sm lg:col-span-2">
          <h4 className="text-base font-semibold text-foreground mb-8 flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-primary" />
            Governance & Ecosystem
          </h4>
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <label className="block text-xs font-bold uppercase text-muted-foreground mb-2 ml-1">Min. Payout ($)</label>
              <input 
                type="number"
                value={config.minWithdrawalAmount || 50}
                onChange={e => setConfig({ ...config, minWithdrawalAmount: Number(e.target.value) })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-muted-foreground mb-2 ml-1">Fraud Risk Threshold</label>
              <input 
                type="number"
                value={config.fraudScoreThreshold || 70}
                onChange={e => setConfig({ ...config, fraudScoreThreshold: Number(e.target.value) })}
                className="input"
              />
              <p className="text-xs text-muted-foreground mt-2 font-medium italic">Higher = Less Sensitive</p>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-muted-foreground mb-2 ml-1">Referral Commission (%)</label>
              <input 
                type="number"
                value={config.referralCommission || 25}
                onChange={e => setConfig({ ...config, referralCommission: Number(e.target.value) })}
                className="input"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between bg-card rounded-lg p-8 border border-border shadow-sm">
        <div className="flex items-center gap-4 text-muted-foreground text-sm font-medium">
          <Info className="w-5 h-5 text-primary" />
          Settings are applied globally across the neural workspace.
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="btn-primary btn-lg"
        >
          {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
          {saving ? 'Synchronizing...' : 'Save Marketing Engine'}
        </button>
      </div>
    </motion.div>
  );
}
