import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { AlertCircle, Eye, EyeOff, Globe, Mail, Save, Shield, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { db } from '../../lib/firebase';

export default function AdminEmailSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    provider: 'smtp', // Default to SMTP since we are testing it
    apiKey: '',
    fromEmail: 'support@techworldproduct.com',
    fromName: 'Promptly AI',
    smtpHost: 'smtp.hostinger.com',
    smtpPort: '587',
    smtpUser: 'support@techworldproduct.com',
    smtpPass: '#ChDudhat@1286&',
    smtpSecure: true,
    replyTo: 'support@techworldproduct.com'
  });

  const [testing, setTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('🚀 Test email sent successfully! Check your inbox.');
      } else {
        toast.error(`SMTP Error: ${data.error || 'Failed to send'}`);
      }
    } catch (err) {
      toast.error('Connection failed. Is the server running?');
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    async function loadConfig() {
      try {
        const docSnap = await getDoc(doc(db, 'configs', 'email'));
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
      await setDoc(doc(db, 'configs', 'email'), {
        ...config,
        updatedAt: serverTimestamp()
      });
      toast.success('Email settings updated!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-slate-500 font-bold uppercase tracking-widest animate-pulse">Loading Config...</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-900">Email Provider Settings</h2>
          <p className="text-slate-500 mt-2 font-medium">Configure how your SaaS sends emails to real users.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center gap-2 disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Saving...' : 'Save Config'}
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          {/* Provider Selection */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm">
            <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
              <Zap className="w-6 h-6 text-indigo-600" />
              Delivery Provider
            </h3>

            <div className="grid grid-cols-2 gap-4 mb-8">
              {[
                { id: 'simulated', name: 'Simulated', desc: 'Logs to DB only', icon: Shield },
                { id: 'resend', name: 'Resend', desc: 'Modern & Fast API', icon: Zap },
                { id: 'sendgrid', name: 'SendGrid', desc: 'Enterprise Standard', icon: Globe },
                { id: 'smtp', name: 'Custom SMTP', desc: 'Your own server', icon: Mail }
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => setConfig({ ...config, provider: p.id })}
                  className={`p-6 rounded-3xl border-2 text-left transition-all group ${config.provider === p.id ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-50 hover:border-slate-100 hover:bg-slate-50/50'}`}
                >
                  <p className={`font-black uppercase tracking-widest text-[10px] mb-1 ${config.provider === p.id ? 'text-indigo-600' : 'text-slate-400'}`}>{p.name}</p>
                  <p className="font-bold text-slate-900 text-sm mb-2">{p.desc}</p>
                  <p className="text-xs text-slate-500">Reliable delivery for your SaaS.</p>
                </button>
              ))}
            </div>

            <div className="space-y-6">
              {config.provider !== 'simulated' && config.provider !== 'smtp' && (
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">API Key</label>
                  <input
                    type="password"
                    value={config.apiKey}
                    onChange={e => setConfig({ ...config, apiKey: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 focus:bg-white focus:border-indigo-600 transition-all font-mono"
                    placeholder="re_xxxxxxxxxxxxxx"
                  />
                </div>
              )}

              {config.provider === 'smtp' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">SMTP Host</label>
                      <input
                        type="text"
                        value={config.smtpHost}
                        onChange={e => setConfig({ ...config, smtpHost: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 focus:bg-white focus:border-indigo-600 transition-all font-mono"
                        placeholder="smtp.gmail.com"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Port</label>
                      <input
                        type="text"
                        value={config.smtpPort}
                        onChange={e => setConfig({ ...config, smtpPort: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 focus:bg-white focus:border-indigo-600 transition-all font-mono"
                        placeholder="587"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Encryption</label>
                      <select
                        value={config.smtpSecure ? 'ssl' : 'tls'}
                        onChange={e => {
                          const isSSL = e.target.value === 'ssl';
                          setConfig({
                            ...config,
                            smtpSecure: isSSL,
                            smtpPort: isSSL ? '465' : '587'
                          });
                        }}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 focus:bg-white focus:border-indigo-600 transition-all font-bold text-sm"
                      >
                        <option value="tls">STARTTLS (587)</option>
                        <option value="ssl">SSL/TLS (465)</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Username</label>
                      <input
                        type="text"
                        value={config.smtpUser}
                        onChange={e => setConfig({ ...config, smtpUser: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 focus:bg-white focus:border-indigo-600 transition-all font-mono"
                        placeholder="user@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Password</label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={config.smtpPass}
                          onChange={e => setConfig({ ...config, smtpPass: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 pr-12 focus:bg-white focus:border-indigo-600 transition-all font-mono"
                          placeholder="••••••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <p className="text-xs text-slate-500 max-w-md italic">
                      Note: You must use an App Password if using Gmail or Outlook with 2FA enabled.
                    </p>
                    <button
                      onClick={handleTestConnection}
                      disabled={testing || saving}
                      className="px-6 py-3 rounded-xl border-2 border-indigo-100 text-indigo-600 font-bold text-sm hover:bg-indigo-50 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      {testing ? 'Sending Test...' : 'Send Test Email'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sender Details */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm">
            <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
              <Globe className="w-6 h-6 text-indigo-600" />
              Sender Details
            </h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">From Name</label>
                <input
                  type="text"
                  value={config.fromName}
                  onChange={e => setConfig({ ...config, fromName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 focus:bg-white focus:border-indigo-600 transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">From Email</label>
                <input
                  type="email"
                  value={config.fromEmail}
                  onChange={e => setConfig({ ...config, fromEmail: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 focus:bg-white focus:border-indigo-600 transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 text-white rounded-[2rem] p-8">
            <h4 className="font-black text-lg mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-400" />
              Compliance
            </h4>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              Ensure you have verified your domain in your provider's dashboard to prevent emails from going to spam.
            </p>
            <div className="flex items-start gap-3 p-4 bg-white/5 rounded-2xl">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
              <p className="text-[10px] font-medium text-slate-300">
                You are currently in <strong>{config.provider}</strong> mode. Real emails will NOT be sent unless you switch to an API provider.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
