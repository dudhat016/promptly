import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { AlertCircle, CreditCard, ExternalLink, Globe, Lock, Percent, Save, ShieldCheck, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { db } from '../../lib/firebase';
import Input from '../../components/primitives/Input';
import Button from '../../components/primitives/Button';
import { cn } from '../../lib/utils';

export default function AdminPaymentSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    cashfree: {
      enabled: false,
      appId: (process.env as any).CASHFREE_APP_ID || '',
      secretKey: (process.env as any).CASHFREE_SECRET_KEY || '',
      environment: (process.env as any).CASHFREE_ENV || 'sandbox'
    },
    paypal: {
      enabled: false,
      clientId: (process.env as any).PAYPAL_CLIENT_ID || '',
      secretKey: (process.env as any).PAYPAL_SECRET_KEY || '',
      environment: (process.env as any).PAYPAL_ENV || 'sandbox'
    },
    fees: {
      paymentFeePercent: 2,
      platformFeePercent: 0
    }
  });

  useEffect(() => {
    async function loadConfig() {
      try {
        const docSnap = await getDoc(doc(db, 'configs', 'payment'));
        if (docSnap.exists()) {
          const data = docSnap.data();
          // Merge Firestore data (like 'enabled' flags) with ENV values (keys)
          setConfig(prev => ({
            cashfree: {
              ...prev.cashfree,
              enabled: data.cashfree?.enabled ?? prev.cashfree.enabled,
              environment: data.cashfree?.environment ?? prev.cashfree.environment,
            },
            paypal: {
              ...prev.paypal,
              enabled: data.paypal?.enabled ?? prev.paypal.enabled,
              environment: data.paypal?.environment ?? prev.paypal.environment,
            },
            fees: {
              paymentFeePercent: data.fees?.paymentFeePercent ?? 2,
              platformFeePercent: data.fees?.platformFeePercent ?? 0,
            }
          }));
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
      await setDoc(doc(db, 'configs', 'payment'), {
        cashfree: config.cashfree,
        paypal: config.paypal,
        fees: config.fees,
        updatedAt: serverTimestamp()
      });
      // Sync fee rates to configs/marketing so awardAffiliateCommission reads them
      await setDoc(doc(db, 'configs', 'marketing'), {
        paymentFeePercent: config.fees.paymentFeePercent,
        platformFeePercent: config.fees.platformFeePercent,
        updatedAt: serverTimestamp()
      }, { merge: true });
      toast.success('Payment settings updated!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-muted-foreground font-bold uppercase tracking-widest animate-pulse">Loading Gateway Config...</div>;

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground flex items-center gap-3">
            <CreditCard className="w-6 h-6 text-primary" />
            Payment Infrastructure
          </h3>
          <p className="text-muted-foreground mt-1 font-medium">Configure global payment gateways for your SaaS revenue.</p>
        </div>
        <Button
          onClick={handleSave}
          isLoading={saving}
          variant="primary"
          size="md"
          leftIcon={Save}
          className="font-bold shadow-sm shadow-primary/20"
        >
          {saving ? 'Syncing...' : 'Save Configuration'}
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Cashfree Integration */}
        <div className="bg-card rounded-lg border border-border p-8 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Zap className="w-24 h-24 text-primary" />
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/8 rounded-md flex items-center justify-center">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <div className="flex flex-col">
                  <h4 className="font-bold text-lg leading-tight">Cashfree Payments</h4>
                  {(process.env as any).CASHFREE_APP_ID && (
                    <span className="text-xs font-bold text-primary uppercase tracking-widest mt-0.5">Environment Managed</span>
                  )}
                </div>
              </div>
              <Button 
                onClick={() => setConfig({ ...config, cashfree: { ...config.cashfree, enabled: !config.cashfree.enabled }})}
                variant={config.cashfree.enabled ? 'primary' : 'ghost'}
                size="sm"
                className={cn(
                  "w-12 h-6 rounded-full relative transition-all p-0",
                  config.cashfree.enabled ? 'bg-primary' : 'bg-muted'
                )}
              >
                <div className={cn("absolute top-1 w-4 h-4 bg-card rounded-full transition-all", config.cashfree.enabled ? 'left-7' : 'left-1')} />
              </Button>
            </div>

            <div className={`space-y-6 transition-all ${config.cashfree.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
              <Input
                label="App ID"
                id="cashfreeAppId"
                name="cashfreeAppId"
                type="text"
                value={config.cashfree.appId}
                readOnly={!!(process.env as any).CASHFREE_APP_ID}
                onChange={e => setConfig({ ...config, cashfree: { ...config.cashfree, appId: e.target.value }})}
                placeholder="CF_APP_ID"
                className="font-mono"
                variant="filled"
              />
              <Input
                label="Secret Key"
                id="cashfreeSecretKey"
                name="cashfreeSecretKey"
                type="password"
                value={config.cashfree.secretKey}
                readOnly={!!(process.env as any).CASHFREE_SECRET_KEY}
                onChange={e => setConfig({ ...config, cashfree: { ...config.cashfree, secretKey: e.target.value }})}
                placeholder="••••••••••••••••"
                className="font-mono"
                variant="filled"
              />
              <div>
                <label className="block text-xs font-bold uppercase text-muted-foreground mb-2 ml-1">Environment</label>
                <div className="flex gap-2">
                  {['sandbox', 'production'].map(env => (
                    <Button
                      key={env}
                      onClick={() => setConfig({ ...config, cashfree: { ...config.cashfree, environment: env as any }})}
                      variant={config.cashfree.environment === env ? 'primary' : 'ghost'}
                      size="md"
                      className={cn(
                        "flex-grow font-bold uppercase tracking-widest border transition-all h-auto py-3",
                        config.cashfree.environment === env 
                          ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20'
                          : 'bg-card text-muted-foreground border-border hover:border-primary/50'
                      )}
                    >
                      {env}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PayPal Integration */}
        <div className="bg-card rounded-lg border border-border p-8 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Globe className="w-24 h-24 text-blue-600" />
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-md flex items-center justify-center">
                  <Globe className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex flex-col">
                  <h4 className="font-bold text-lg leading-tight">PayPal Global</h4>
                  {(process.env as any).PAYPAL_CLIENT_ID && (
                    <span className="text-xs font-bold text-blue-500 uppercase tracking-widest mt-0.5">Environment Managed</span>
                  )}
                </div>
              </div>
              <Button 
                onClick={() => setConfig({ ...config, paypal: { ...config.paypal, enabled: !config.paypal.enabled }})}
                variant={config.paypal.enabled ? 'primary' : 'ghost'}
                size="sm"
                className={cn(
                  "w-12 h-6 rounded-full relative transition-all p-0",
                  config.paypal.enabled ? 'bg-blue-600' : 'bg-muted'
                )}
              >
                <div className={cn("absolute top-1 w-4 h-4 bg-card rounded-full transition-all", config.paypal.enabled ? 'left-7' : 'left-1')} />
              </Button>
            </div>

            <div className={`space-y-6 transition-all ${config.paypal.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
              <Input
                label="Client ID"
                id="paypalClientId"
                name="paypalClientId"
                type="text"
                value={config.paypal.clientId}
                readOnly={!!(process.env as any).PAYPAL_CLIENT_ID}
                onChange={e => setConfig({ ...config, paypal: { ...config.paypal, clientId: e.target.value }})}
                placeholder="PAYPAL_CLIENT_ID"
                className="font-mono"
                variant="filled"
              />
              <Input
                label="Secret Key"
                id="paypalSecretKey"
                name="paypalSecretKey"
                type="password"
                value={config.paypal.secretKey}
                readOnly={!!(process.env as any).PAYPAL_SECRET_KEY}
                onChange={e => setConfig({ ...config, paypal: { ...config.paypal, secretKey: e.target.value }})}
                placeholder="••••••••••••••••"
                className="font-mono"
                variant="filled"
              />
              <div>
                <label className="block text-xs font-bold uppercase text-muted-foreground mb-2 ml-1">Environment</label>
                <div className="flex gap-2">
                  {['sandbox', 'live'].map(env => (
                    <Button
                      key={env}
                      onClick={() => setConfig({ ...config, paypal: { ...config.paypal, environment: env as any }})}
                      variant={config.paypal.environment === env ? 'primary' : 'ghost'}
                      size="md"
                      className={cn(
                        "flex-grow font-bold uppercase tracking-widest border transition-all h-auto py-3",
                        config.paypal.environment === env 
                          ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200' 
                          : 'bg-card text-muted-foreground border-border hover:border-blue-600/50'
                      )}
                    >
                      {env}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fee Settings */}
      <div className="bg-card rounded-lg border border-border p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-amber-500/10 rounded-md flex items-center justify-center">
            <Percent className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h4 className="font-bold text-lg leading-tight">Affiliate Fee Settings</h4>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              Fees are deducted from the gross sale before calculating affiliate commission.
              Net commission = (Sale − Payment Fee) × Commission Rate × (1 − Platform Fee)
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <Input
              label="Payment Gateway Fee (%)"
              id="paymentFeePercent"
              name="paymentFeePercent"
              type="number"
              value={config.fees.paymentFeePercent}
              onChange={e => setConfig({ ...config, fees: { ...config.fees, paymentFeePercent: Number(e.target.value) }})}
              min={0}
              max={10}
              step={0.1}
              variant="filled"
              helperText="Cashfree: ~2% · PayPal: ~3.49% · Stripe: ~2.9%"
            />
          </div>
          <div>
            <Input
              label="Platform Fee (%)"
              id="platformFeePercent"
              name="platformFeePercent"
              type="number"
              value={config.fees.platformFeePercent}
              onChange={e => setConfig({ ...config, fees: { ...config.fees, platformFeePercent: Number(e.target.value) }})}
              min={0}
              max={50}
              step={0.5}
              variant="filled"
              helperText="Percentage of gross commission kept by the platform. 0 = pass full commission to affiliate."
            />
          </div>
        </div>

        {/* Live Preview */}
        <div className="mt-6 p-4 bg-muted/50 rounded-xl border border-border text-sm font-mono space-y-1">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Commission Preview (on $15 sale)</p>
          {(() => {
            const sale = 15;
            const payFee = sale * (config.fees.paymentFeePercent / 100);
            const net = sale - payFee;
            const grossComm = net * 0.25;
            const platFee = grossComm * (config.fees.platformFeePercent / 100);
            const affiliate = Math.max(0, grossComm - platFee);
            return (
              <>
                <div className="flex justify-between"><span className="text-muted-foreground">Gross sale</span><span>${sale.toFixed(2)}</span></div>
                <div className="flex justify-between text-rose-500"><span>− Payment fee ({config.fees.paymentFeePercent}%)</span><span>−${payFee.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Net to distribute</span><span>${net.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Gross commission (25%)</span><span>${grossComm.toFixed(2)}</span></div>
                {config.fees.platformFeePercent > 0 && <div className="flex justify-between text-rose-500"><span>− Platform fee ({config.fees.platformFeePercent}%)</span><span>−${platFee.toFixed(2)}</span></div>}
                <div className="flex justify-between font-bold text-emerald-600 border-t border-border pt-1 mt-1"><span>Affiliate receives</span><span>${affiliate.toFixed(2)}</span></div>
              </>
            );
          })()}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <div className="bg-muted text-white rounded-lg p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <ShieldCheck className="w-32 h-32 text-primary" />
            </div>
            <div className="relative z-10">
              <h4 className="text-base font-semibold mb-4 flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-primary" />
                Security Standards
              </h4>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                All payment credentials are encrypted at rest. We recommend using Environment Variables for maximum security in production environments.
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground bg-card/5 px-4 py-2 rounded-lg">
                  <Lock className="w-3 h-3" /> PCI-DSS Compliant
                </div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground bg-card/5 px-4 py-2 rounded-lg">
                  <Globe className="w-3 h-3" /> SSL Secured
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-primary/8 border border-primary/100 rounded-lg p-8 flex flex-col justify-center">
          <div className="flex items-center gap-4 mb-4">
            <AlertCircle className="w-6 h-6 text-primary" />
            <h4 className="font-bold text-foreground">Developer Note</h4>
          </div>
          <p className="text-primary text-sm font-medium leading-relaxed mb-6">
            Webhook integration is required to automate user subscription activation after successful payment.
          </p>
          <Button
            as="a"
            href="#"
            variant="ghost"
            size="sm"
            rightIcon={ExternalLink}
            className="text-primary font-bold uppercase tracking-widest h-auto p-0 hover:bg-transparent hover:underline justify-start"
          >
            View Docs
          </Button>
        </div>
      </div>
    </div>
  );
}
