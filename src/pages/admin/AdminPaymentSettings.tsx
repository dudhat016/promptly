import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { AlertCircle, Check, CheckCircle2, Clock, Copy, CreditCard, ExternalLink, Globe, KeyRound, Lock, Percent, RefreshCw, Save, ShieldCheck, Webhook, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { db } from '../../lib/firebase';
import { api } from '../../lib/api';
import Input from '../../components/primitives/Input';
import Button from '../../components/primitives/Button';
import Card from '../../components/primitives/Card';
import { cn } from '../../lib/utils';
import { useConfig } from '../../hooks/useConfig';

function EnvVarField({ label, envVar }: { label: string; envVar: string }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">{label}</label>
      <div className="flex items-center gap-2.5 px-3 py-2.5 bg-muted/40 border border-border rounded-lg">
        <KeyRound className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <code className="text-xs font-mono text-muted-foreground flex-1">{envVar}</code>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 uppercase tracking-widest shrink-0">
          Env Var
        </span>
      </div>
    </div>
  );
}

export default function AdminPaymentSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    cashfree: {
      enabled: false,
      environment: 'sandbox' as 'sandbox' | 'production',
      webhookSecret: '',
    },
    paypal: {
      enabled: false,
      environment: 'sandbox' as 'sandbox' | 'live',
      webhookId: '',
    },
    stripe: {
      enabled: false,
      webhookSecret: '',
    },
    fees: {
      paymentFeePercent: 2,
      platformFeePercent: 0,
    },
  });
  const [governance, setGovernance] = useState({
    minWithdrawalAmount: 50,
    fraudScoreThreshold: 70,
    referralCommission: 25,
  });
  const [taxRate, setTaxRate] = useState(0);
  const { refreshConfig } = useConfig();
  const [processingLocks, setProcessingLocks] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const handleProcessLocks = async () => {
    setProcessingLocks(true);
    try {
      const r = await api.post('/affiliates/process-locks') as any;
      toast.success(`Approved ${r.approved ?? 0} commission(s) — earnings credited to affiliates`);
    } catch {
      toast.error('Failed to process lock periods');
    } finally {
      setProcessingLocks(false);
    }
  };

  useEffect(() => {
    async function loadConfig() {
      try {
        const docSnap = await getDoc(doc(db, 'configs', 'payment'));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setConfig(prev => ({
            cashfree: {
              enabled:       data.cashfree?.enabled       ?? prev.cashfree.enabled,
              environment:   data.cashfree?.environment   ?? prev.cashfree.environment,
              webhookSecret: data.cashfree?.webhookSecret ?? '',
            },
            paypal: {
              enabled:     data.paypal?.enabled     ?? prev.paypal.enabled,
              environment: data.paypal?.environment ?? prev.paypal.environment,
              webhookId:   data.paypal?.webhookId   ?? '',
            },
            stripe: {
              enabled:       data.stripe?.enabled       ?? prev.stripe.enabled,
              webhookSecret: data.stripe?.webhookSecret ?? '',
            },
            fees: {
              paymentFeePercent:  data.fees?.paymentFeePercent  ?? 2,
              platformFeePercent: data.fees?.platformFeePercent ?? 0,
            },
          }));
        }
        const mktSnap = await getDoc(doc(db, 'configs', 'marketing'));
        if (mktSnap.exists()) {
          const d = mktSnap.data();
          setGovernance({
            minWithdrawalAmount: d.minWithdrawalAmount ?? 50,
            fraudScoreThreshold: d.fraudScoreThreshold ?? 70,
            referralCommission:  d.referralCommission  ?? 25,
          });
        }
        const globalSnap = await getDoc(doc(db, 'configs', 'global'));
        if (globalSnap.exists()) {
          const d = globalSnap.data();
          setTaxRate(d.taxRate ?? 0);
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
        cashfree: {
          enabled:       config.cashfree.enabled,
          environment:   config.cashfree.environment,
          webhookSecret: config.cashfree.webhookSecret,
        },
        paypal: {
          enabled:     config.paypal.enabled,
          environment: config.paypal.environment,
          webhookId:   config.paypal.webhookId,
        },
        stripe: {
          enabled:       config.stripe.enabled,
          webhookSecret: config.stripe.webhookSecret,
        },
        fees: config.fees,
        updatedAt: serverTimestamp(),
      });
      await setDoc(doc(db, 'configs', 'marketing'), {
        ...governance,
        paymentFeePercent: config.fees.paymentFeePercent,
        platformFeePercent: config.fees.platformFeePercent,
        updatedAt: serverTimestamp()
      }, { merge: true });
      await setDoc(doc(db, 'configs', 'global'), {
        taxRate: taxRate,
        updatedAt: serverTimestamp()
      }, { merge: true });
      await refreshConfig();
      toast.success('Payment settings updated!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://yourdomain.com';

  const WEBHOOK_URLS = {
    cashfree: `${appUrl}/api/payments/webhook/cashfree`,
    paypal:   `${appUrl}/api/payments/webhook/paypal`,
    stripe:   `${appUrl}/api/payments/webhook/stripe`,
  };

  const copyUrl = (key: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(key);
    setTimeout(() => setCopiedUrl(null), 2000);
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
        <Card className="!rounded-lg !p-8 relative overflow-visible group">
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
                  <span className="text-xs font-bold text-primary uppercase tracking-widest mt-0.5">Keys via Env Vars</span>
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
              <EnvVarField label="App ID" envVar="CASHFREE_APP_ID" />
              <EnvVarField label="Secret Key" envVar="CASHFREE_SECRET_KEY" />
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
              <Input
                label="Webhook Secret"
                id="cashfreeWebhookSecret"
                name="cashfreeWebhookSecret"
                type="password"
                value={config.cashfree.webhookSecret}
                onChange={e => setConfig({ ...config, cashfree: { ...config.cashfree, webhookSecret: e.target.value }})}
                placeholder="From Cashfree Developers → Webhooks"
                className="font-mono"
                variant="filled"
                helperText="Used to verify incoming webhook signatures (HMAC-SHA256)"
              />
            </div>
          </div>
        </Card>

        {/* PayPal Integration */}
        <Card className="!rounded-lg !p-8 relative overflow-visible group">
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
                  <span className="text-xs font-bold text-blue-500 uppercase tracking-widest mt-0.5">Keys via Env Vars</span>
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
              <EnvVarField label="Client ID" envVar="PAYPAL_CLIENT_ID" />
              <EnvVarField label="Secret Key" envVar="PAYPAL_CLIENT_SECRET" />
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
              <Input
                label="Webhook ID"
                id="paypalWebhookId"
                name="paypalWebhookId"
                type="text"
                value={config.paypal.webhookId}
                onChange={e => setConfig({ ...config, paypal: { ...config.paypal, webhookId: e.target.value }})}
                placeholder="From PayPal Developer → Apps → Webhooks"
                className="font-mono"
                variant="filled"
                helperText="Required for PayPal to verify webhook delivery"
              />
            </div>
          </div>
        </Card>
        {/* Stripe Integration */}
        <Card className="!rounded-lg !p-8 relative overflow-visible group md:col-span-2">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <CreditCard className="w-24 h-24 text-[#635BFF]" />
          </div>

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md flex items-center justify-center" style={{ background: 'rgba(99,91,255,0.1)' }}>
                  <CreditCard className="w-5 h-5" style={{ color: '#635BFF' }} />
                </div>
                <div className="flex flex-col">
                  <h4 className="font-bold text-lg leading-tight">Stripe Payments</h4>
                  <span className="text-xs font-bold uppercase tracking-widest mt-0.5" style={{ color: '#635BFF' }}>Keys via Env Vars · USD only</span>
                </div>
              </div>
              <Button
                onClick={() => setConfig({ ...config, stripe: { ...config.stripe, enabled: !config.stripe.enabled }})}
                variant={config.stripe.enabled ? 'primary' : 'ghost'}
                size="sm"
                className={cn(
                  "w-12 h-6 rounded-full relative transition-all p-0",
                  config.stripe.enabled ? '' : 'bg-muted'
                )}
                style={config.stripe.enabled ? { background: '#635BFF' } : {}}
              >
                <div className={cn("absolute top-1 w-4 h-4 bg-card rounded-full transition-all", config.stripe.enabled ? 'left-7' : 'left-1')} />
              </Button>
            </div>

            <div className={`grid md:grid-cols-3 gap-6 transition-all ${config.stripe.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
              <EnvVarField label="Secret Key" envVar="STRIPE_SECRET_KEY" />
              <EnvVarField label="Publishable Key" envVar="VITE_STRIPE_PUBLIC_KEY" />
              <Input
                label="Webhook Secret"
                id="stripeWebhookSecret"
                name="stripeWebhookSecret"
                type="password"
                value={config.stripe.webhookSecret}
                onChange={e => setConfig({ ...config, stripe: { ...config.stripe, webhookSecret: e.target.value }})}
                placeholder="whsec_..."
                className="font-mono"
                variant="filled"
                helperText="From Stripe Dashboard → Webhooks → Signing secret"
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Fee & Tax Settings */}
      <Card className="!rounded-lg !p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-amber-500/10 rounded-md flex items-center justify-center">
            <Percent className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h4 className="font-bold text-lg leading-tight">Transaction Fee & Tax Settings</h4>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              Configure payment gateway fees, platform commissions, and global customer tax rates.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
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
          <div>
            <Input
              label="Tax Rate (%)"
              id="taxRate"
              name="taxRate"
              type="number"
              value={taxRate}
              onChange={e => setTaxRate(Number(e.target.value))}
              min={0}
              max={100}
              step={0.1}
              variant="filled"
              helperText="Charged to customers at checkout. e.g. GST/VAT/Sales Tax."
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
            const grossComm = net * (governance.referralCommission / 100);
            const platFee = grossComm * (config.fees.platformFeePercent / 100);
            const affiliate = Math.max(0, grossComm - platFee);
            return (
              <>
                <div className="flex justify-between"><span className="text-muted-foreground">Gross sale</span><span>${sale.toFixed(2)}</span></div>
                <div className="flex justify-between text-rose-500"><span>− Payment fee ({config.fees.paymentFeePercent}%)</span><span>−${payFee.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Net to distribute</span><span>${net.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Gross commission ({governance.referralCommission}%)</span><span>${grossComm.toFixed(2)}</span></div>
                {config.fees.platformFeePercent > 0 && <div className="flex justify-between text-rose-500"><span>− Platform fee ({config.fees.platformFeePercent}%)</span><span>−${platFee.toFixed(2)}</span></div>}
                <div className="flex justify-between font-bold text-emerald-600 border-t border-border pt-1 mt-1"><span>Affiliate receives</span><span>${affiliate.toFixed(2)}</span></div>
              </>
            );
          })()}
        </div>
      </Card>

      {/* ── Webhook Setup Guide ── */}
      <Card className="!rounded-lg !p-8 space-y-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-violet-500/10 rounded-md flex items-center justify-center">
            <Webhook className="w-5 h-5 text-violet-500" />
          </div>
          <div>
            <h4 className="font-bold text-lg leading-tight">Webhook Endpoints</h4>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              Copy these URLs and paste them into each gateway's webhook settings. Required for auto-renew to work.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Cashfree webhook card */}
          <div className="rounded-xl border border-border p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              <span className="font-bold text-sm text-foreground">Cashfree</span>
              {config.cashfree.webhookSecret && (
                <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 uppercase tracking-widest flex items-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5" /> Secret Saved
                </span>
              )}
            </div>

            {/* URL row */}
            <div className="bg-muted/50 rounded-lg border border-border overflow-hidden">
              <div className="px-3 py-1.5 border-b border-border bg-muted/30">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Webhook URL</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2">
                <code className="text-xs font-mono text-foreground flex-1 truncate">{WEBHOOK_URLS.cashfree}</code>
                <button
                  onClick={() => copyUrl('cashfree', WEBHOOK_URLS.cashfree)}
                  className="shrink-0 p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  {copiedUrl === 'cashfree' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Events list */}
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Subscribe to these events</p>
              {[
                'SUBSCRIPTION_PAYMENT_SUCCESS',
                'SUBSCRIPTION_PAYMENT_FAILED',
                'SUBSCRIPTION_CANCELLED',
                'PAYMENT_SUCCESS_WEBHOOK',
              ].map(e => (
                <div key={e} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/50 shrink-0" />
                  <code>{e}</code>
                </div>
              ))}
            </div>

            {/* Setup steps */}
            <div className="space-y-1.5 pt-2 border-t border-border">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Setup Steps</p>
              {[
                'Log in to Cashfree Dashboard',
                'Go to Developers → Webhooks',
                'Click "Add New Webhook"',
                'Paste the URL above and select events',
                'Copy the Webhook Secret and save it above',
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <span className="w-4 h-4 rounded-full bg-muted text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                  {step}
                </div>
              ))}
              <a
                href="https://merchant.cashfree.com/merchants/developers/webhook"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline mt-2"
              >
                Open Cashfree Webhooks <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* PayPal webhook card */}
          <div className="rounded-xl border border-border p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-500" />
              <span className="font-bold text-sm text-foreground">PayPal</span>
              {config.paypal.webhookId && (
                <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 uppercase tracking-widest flex items-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5" /> ID Saved
                </span>
              )}
            </div>

            {/* URL row */}
            <div className="bg-muted/50 rounded-lg border border-border overflow-hidden">
              <div className="px-3 py-1.5 border-b border-border bg-muted/30">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Webhook URL</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2">
                <code className="text-xs font-mono text-foreground flex-1 truncate">{WEBHOOK_URLS.paypal}</code>
                <button
                  onClick={() => copyUrl('paypal', WEBHOOK_URLS.paypal)}
                  className="shrink-0 p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  {copiedUrl === 'paypal' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Events list */}
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Subscribe to these events</p>
              {[
                'BILLING.SUBSCRIPTION.ACTIVATED',
                'BILLING.SUBSCRIPTION.CANCELLED',
                'BILLING.SUBSCRIPTION.EXPIRED',
                'PAYMENT.SALE.COMPLETED',
              ].map(e => (
                <div key={e} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500/50 shrink-0" />
                  <code>{e}</code>
                </div>
              ))}
            </div>

            {/* Setup steps */}
            <div className="space-y-1.5 pt-2 border-t border-border">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Setup Steps</p>
              {[
                'Go to PayPal Developer Dashboard',
                'Open My Apps & Credentials',
                'Select your app → Webhooks tab',
                'Click "Add Webhook"',
                'Paste the URL and select events above',
                'Copy the Webhook ID and save it above',
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <span className="w-4 h-4 rounded-full bg-muted text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                  {step}
                </div>
              ))}
              <a
                href="https://developer.paypal.com/dashboard/applications/live"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold text-blue-500 hover:underline mt-2"
              >
                Open PayPal Developer <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Stripe webhook card */}
          <div className="rounded-xl border border-border p-5 space-y-4">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" style={{ color: '#635BFF' }} />
              <span className="font-bold text-sm text-foreground">Stripe</span>
              {config.stripe.webhookSecret && (
                <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 uppercase tracking-widest flex items-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5" /> Secret Saved
                </span>
              )}
            </div>

            <div className="bg-muted/50 rounded-lg border border-border overflow-hidden">
              <div className="px-3 py-1.5 border-b border-border bg-muted/30">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Webhook URL</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2">
                <code className="text-xs font-mono text-foreground flex-1 truncate">{WEBHOOK_URLS.stripe}</code>
                <button
                  onClick={() => copyUrl('stripe', WEBHOOK_URLS.stripe)}
                  className="shrink-0 p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  {copiedUrl === 'stripe' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Subscribe to these events</p>
              {['checkout.session.completed'].map(e => (
                <div key={e} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#635BFF' }} />
                  <code>{e}</code>
                </div>
              ))}
            </div>

            <div className="space-y-1.5 pt-2 border-t border-border">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Setup Steps</p>
              {[
                'Log in to Stripe Dashboard',
                'Go to Developers → Webhooks',
                'Click "Add endpoint"',
                'Paste the URL above, select checkout.session.completed',
                'Copy the Signing Secret (whsec_...) and save it above',
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <span className="w-4 h-4 rounded-full bg-muted text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                  {step}
                </div>
              ))}
              <a
                href="https://dashboard.stripe.com/webhooks"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold hover:underline mt-2"
                style={{ color: '#635BFF' }}
              >
                Open Stripe Webhooks <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Webhook test */}
        <div className="rounded-xl border border-dashed border-border p-5 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-foreground flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-primary" />
              Test Webhook Delivery
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Use each gateway's "Send Test Event" button after saving your webhook URL. Check server logs for confirmation.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <a
              href="https://merchant.cashfree.com/merchants/developers/webhook"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="secondary" size="sm" rightIcon={ExternalLink}>Test Cashfree</Button>
            </a>
            <a
              href="https://developer.paypal.com/dashboard/webhooks"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="secondary" size="sm" rightIcon={ExternalLink}>Test PayPal</Button>
            </a>
          </div>
        </div>
      </Card>

      {/* Governance & Ecosystem */}
      <Card className="!rounded-lg !p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-primary/10 rounded-md flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h4 className="font-bold text-lg leading-tight">Governance & Ecosystem</h4>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              Withdrawal limits, fraud thresholds, and referral commission rules.
            </p>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <Input
            label="Min. Payout ($)"
            type="number"
            value={governance.minWithdrawalAmount}
            onChange={e => setGovernance({ ...governance, minWithdrawalAmount: Number(e.target.value) })}
            variant="filled"
          />
          <Input
            label="Fraud Risk Threshold"
            type="number"
            value={governance.fraudScoreThreshold}
            onChange={e => setGovernance({ ...governance, fraudScoreThreshold: Number(e.target.value) })}
            variant="filled"
            helperText="Higher = Less Sensitive"
          />
          <Input
            label="Referral Commission (%)"
            type="number"
            value={governance.referralCommission}
            onChange={e => setGovernance({ ...governance, referralCommission: Number(e.target.value) })}
            variant="filled"
          />
        </div>
        <div className="mt-6 pt-6 border-t border-border flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-foreground">Process Lock Periods</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Release pending commissions past their lock window and credit affiliate earnings.
            </p>
          </div>
          <Button
            onClick={handleProcessLocks}
            isLoading={processingLocks}
            variant="secondary"
            size="sm"
            leftIcon={Clock}
            className="shrink-0"
          >
            Process Now
          </Button>
        </div>
      </Card>

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
