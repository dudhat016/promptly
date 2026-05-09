import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Target, Save, BarChart3, Facebook, DollarSign, ShieldCheck, Info } from 'lucide-react';
import { AdminPageHeader } from '../../components/admin';
import { motion } from 'motion/react';
import { toast } from 'react-hot-toast';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { cn } from '../../lib/utils';

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
            <Input
              label="Google Analytics ID"
              id="gaTrackingId"
              name="gaTrackingId"
              type="text"
              placeholder="G-XXXXXXXXXX"
              value={config.gaTrackingId}
              onChange={e => setConfig({ ...config, gaTrackingId: e.target.value })}
              variant="filled"
            />
            <Input
              label="Facebook Pixel ID"
              id="fbPixelId"
              name="fbPixelId"
              type="text"
              placeholder="123456789012345"
              value={config.fbPixelId}
              onChange={e => setConfig({ ...config, fbPixelId: e.target.value })}
              variant="filled"
              leftIcon={Facebook}
            />
            <div className="flex items-center justify-between p-4 bg-primary/8 rounded-md border border-primary/100">
              <p className="font-bold text-foreground text-sm">Enable Global Tracking</p>
              <Button 
                onClick={() => setConfig({ ...config, analyticsEnabled: !config.analyticsEnabled })}
                variant={config.analyticsEnabled ? 'primary' : 'ghost'}
                size="sm"
                className={cn(
                  "w-12 h-6 rounded-full transition-all relative p-0",
                  config.analyticsEnabled ? 'bg-primary' : 'bg-muted-foreground/30'
                )}
              >
                <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm", config.analyticsEnabled ? 'left-7' : 'left-1')} />
              </Button>
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
            <Input
              label="Ad Unit / Slot ID"
              id="admobSlotId"
              name="admobSlotId"
              type="text"
              placeholder="ca-pub-XXXXXXXXXXXXXXXX"
              value={config.admobSlotId}
              onChange={e => setConfig({ ...config, admobSlotId: e.target.value })}
              variant="filled"
              className="font-bold"
            />
            <div className="p-6 bg-muted/50 rounded-md border border-border flex items-start gap-4">
              <ShieldCheck className="w-8 h-8 text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold text-foreground text-sm">PRO Protection Active</p>
                <p className="text-xs text-muted-foreground font-medium leading-relaxed mt-1">Ads are automatically hidden for all users with an active **PRO** or **Enterprise** subscription.</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-emerald-500/10 rounded-md border border-emerald-500/20">
              <p className="font-bold text-emerald-600 text-sm">Enable Display Ads</p>
              <Button 
                onClick={() => setConfig({ ...config, adsEnabled: !config.adsEnabled })}
                variant={config.adsEnabled ? 'success' : 'ghost'}
                size="sm"
                className={cn(
                  "w-12 h-6 rounded-full transition-all relative p-0",
                  config.adsEnabled ? 'bg-emerald-600' : 'bg-muted-foreground/30'
                )}
              >
                <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm", config.adsEnabled ? 'left-7' : 'left-1')} />
              </Button>
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
            <Input
              label="Min. Payout ($)"
              id="minWithdrawalAmount"
              name="minWithdrawalAmount"
              type="number"
              value={config.minWithdrawalAmount || 50}
              onChange={e => setConfig({ ...config, minWithdrawalAmount: Number(e.target.value) })}
              variant="filled"
            />
            <Input
              label="Fraud Risk Threshold"
              id="fraudScoreThreshold"
              name="fraudScoreThreshold"
              type="number"
              value={config.fraudScoreThreshold || 70}
              onChange={e => setConfig({ ...config, fraudScoreThreshold: Number(e.target.value) })}
              variant="filled"
              helperText="Higher = Less Sensitive"
            />
            <Input
              label="Referral Commission (%)"
              id="referralCommission"
              name="referralCommission"
              type="number"
              value={config.referralCommission || 25}
              onChange={e => setConfig({ ...config, referralCommission: Number(e.target.value) })}
              variant="filled"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between bg-card rounded-lg p-8 border border-border shadow-sm">
        <div className="flex items-center gap-4 text-muted-foreground text-sm font-medium">
          <Info className="w-5 h-5 text-primary" />
          Settings are applied globally across the neural workspace.
        </div>
        <Button 
          onClick={handleSave}
          isLoading={saving}
          variant="primary"
          size="lg"
          leftIcon={Save}
          className="font-bold shadow-lg shadow-primary/20 px-8"
        >
          {saving ? 'Synchronizing...' : 'Save Marketing Engine'}
        </Button>
      </div>
    </motion.div>
  );
}
