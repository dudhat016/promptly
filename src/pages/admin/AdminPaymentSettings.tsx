import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { AlertCircle, CreditCard, ExternalLink, Globe, Lock, Save, ShieldCheck, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { db } from '../../lib/firebase';

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
        ...config,
        updatedAt: serverTimestamp()
      });
      toast.success('Payment settings updated!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-slate-500 font-bold uppercase tracking-widest animate-pulse">Loading Gateway Config...</div>;

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <CreditCard className="w-6 h-6 text-indigo-600" />
            Payment Infrastructure
          </h3>
          <p className="text-slate-500 mt-1 font-medium">Configure global payment gateways for your SaaS revenue.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center gap-2 disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Syncing...' : 'Save Configuration'}
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Cashfree Integration */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Zap className="w-24 h-24 text-indigo-600" />
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                  <Zap className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="flex flex-col">
                  <h4 className="font-black text-lg leading-tight">Cashfree Payments</h4>
                  {(process.env as any).CASHFREE_APP_ID && (
                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-0.5">Environment Managed</span>
                  )}
                </div>
              </div>
              <button 
                onClick={() => setConfig({ ...config, cashfree: { ...config.cashfree, enabled: !config.cashfree.enabled }})}
                className={`w-12 h-6 rounded-full relative transition-all ${config.cashfree.enabled ? 'bg-indigo-600' : 'bg-slate-200'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${config.cashfree.enabled ? 'left-7' : 'left-1'}`} />
              </button>
            </div>

            <div className={`space-y-6 transition-all ${config.cashfree.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">App ID</label>
                <input 
                  type="text"
                  value={config.cashfree.appId}
                  readOnly={!!(process.env as any).CASHFREE_APP_ID}
                  onChange={e => setConfig({ ...config, cashfree: { ...config.cashfree, appId: e.target.value }})}
                  placeholder="CF_APP_ID"
                  className={`w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 focus:bg-white focus:border-indigo-600 transition-all font-mono text-sm ${!!(process.env as any).CASHFREE_APP_ID ? 'cursor-not-allowed opacity-75' : ''}`}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">Secret Key</label>
                <input 
                  type="password"
                  value={config.cashfree.secretKey}
                  readOnly={!!(process.env as any).CASHFREE_SECRET_KEY}
                  onChange={e => setConfig({ ...config, cashfree: { ...config.cashfree, secretKey: e.target.value }})}
                  placeholder="••••••••••••••••"
                  className={`w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 focus:bg-white focus:border-indigo-600 transition-all font-mono text-sm ${!!(process.env as any).CASHFREE_SECRET_KEY ? 'cursor-not-allowed opacity-75' : ''}`}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">Environment</label>
                <div className="flex gap-2">
                  {['sandbox', 'production'].map(env => (
                    <button
                      key={env}
                      onClick={() => setConfig({ ...config, cashfree: { ...config.cashfree, environment: env as any }})}
                      className={`flex-grow py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                        config.cashfree.environment === env 
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' 
                          : 'bg-white text-slate-500 border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      {env}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PayPal Integration */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Globe className="w-24 h-24 text-blue-600" />
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <Globe className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex flex-col">
                  <h4 className="font-black text-lg leading-tight">PayPal Global</h4>
                  {(process.env as any).PAYPAL_CLIENT_ID && (
                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-0.5">Environment Managed</span>
                  )}
                </div>
              </div>
              <button 
                onClick={() => setConfig({ ...config, paypal: { ...config.paypal, enabled: !config.paypal.enabled }})}
                className={`w-12 h-6 rounded-full relative transition-all ${config.paypal.enabled ? 'bg-blue-600' : 'bg-slate-200'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${config.paypal.enabled ? 'left-7' : 'left-1'}`} />
              </button>
            </div>

            <div className={`space-y-6 transition-all ${config.paypal.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">Client ID</label>
                <input 
                  type="text"
                  value={config.paypal.clientId}
                  readOnly={!!(process.env as any).PAYPAL_CLIENT_ID}
                  onChange={e => setConfig({ ...config, paypal: { ...config.paypal, clientId: e.target.value }})}
                  placeholder="PAYPAL_CLIENT_ID"
                  className={`w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 focus:bg-white focus:border-blue-600 transition-all font-mono text-sm ${!!(process.env as any).PAYPAL_CLIENT_ID ? 'cursor-not-allowed opacity-75' : ''}`}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">Secret Key</label>
                <input 
                  type="password"
                  value={config.paypal.secretKey}
                  readOnly={!!(process.env as any).PAYPAL_SECRET_KEY}
                  onChange={e => setConfig({ ...config, paypal: { ...config.paypal, secretKey: e.target.value }})}
                  placeholder="••••••••••••••••"
                  className={`w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 focus:bg-white focus:border-blue-600 transition-all font-mono text-sm ${!!(process.env as any).PAYPAL_SECRET_KEY ? 'cursor-not-allowed opacity-75' : ''}`}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">Environment</label>
                <div className="flex gap-2">
                  {['sandbox', 'live'].map(env => (
                    <button
                      key={env}
                      onClick={() => setConfig({ ...config, paypal: { ...config.paypal, environment: env as any }})}
                      className={`flex-grow py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                        config.paypal.environment === env 
                          ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100' 
                          : 'bg-white text-slate-500 border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      {env}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <div className="bg-slate-900 text-white rounded-[2.5rem] p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <ShieldCheck className="w-32 h-32 text-indigo-400" />
            </div>
            <div className="relative z-10">
              <h4 className="text-xl font-black mb-4 flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-indigo-400" />
                Security Standards
              </h4>
              <p className="text-slate-400 text-sm leading-relaxed mb-6">
                All payment credentials are encrypted at rest. We recommend using Environment Variables for maximum security in production environments.
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-white/5 px-4 py-2 rounded-lg">
                  <Lock className="w-3 h-3" /> PCI-DSS Compliant
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-white/5 px-4 py-2 rounded-lg">
                  <Globe className="w-3 h-3" /> SSL Secured
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-indigo-50 border border-indigo-100 rounded-[2.5rem] p-8 flex flex-col justify-center">
          <div className="flex items-center gap-4 mb-4">
            <AlertCircle className="w-6 h-6 text-indigo-600" />
            <h4 className="font-black text-indigo-900">Developer Note</h4>
          </div>
          <p className="text-indigo-700 text-sm font-medium leading-relaxed mb-6">
            Webhook integration is required to automate user subscription activation after successful payment.
          </p>
          <a href="#" className="text-indigo-600 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:underline">
            View Docs <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
