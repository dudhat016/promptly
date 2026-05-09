import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { AlertCircle, Eye, EyeOff, Globe, Mail, Save, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { db } from '../../lib/firebase';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

export default function AdminEmailSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    provider: (process.env as any).EMAIL_PROVIDER || 'smtp',
    fromEmail: (process.env as any).FROM_EMAIL || '',
    fromName: (process.env as any).FROM_NAME || '',
    smtpHost: (process.env as any).SMTP_HOST || '',
    smtpPort: (process.env as any).SMTP_PORT || '',
    smtpUser: (process.env as any).SMTP_USER || '',
    smtpPass: (process.env as any).SMTP_PASS || '',
    smtpSecure: (process.env as any).SMTP_SECURE === 'true',
    replyTo: (process.env as any).FROM_EMAIL || ''
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
          setConfig(prev => ({ ...prev, ...docSnap.data(), provider: 'smtp' }));
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
        provider: 'smtp',
        updatedAt: serverTimestamp()
      });
      toast.success('SMTP settings updated!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-muted-foreground font-bold uppercase tracking-widest animate-pulse">Loading Config...</div>;

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground flex items-center gap-3">
            <Mail className="w-6 h-6 text-primary" />
            Email SMTP Infrastructure
          </h3>
          <p className="text-muted-foreground mt-1 font-medium">Configure your custom SMTP server for reliable transactional email delivery.</p>
        </div>
        <Button
          onClick={handleSave}
          isLoading={saving}
          variant="primary"
          size="md"
          leftIcon={Save}
          className="font-bold shadow-sm shadow-primary/20"
        >
          {saving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          {/* SMTP Configuration */}
          <div className="bg-card rounded-lg border border-border p-8 shadow-sm">
            <h4 className="text-lg font-bold mb-6 flex items-center gap-3">
              <Zap className="w-6 h-6 text-primary" />
              Server Configuration
            </h4>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Input
                    label="SMTP Host"
                    id="smtpHost"
                    name="smtpHost"
                    type="text"
                    value={config.smtpHost}
                    onChange={e => setConfig({ ...config, smtpHost: e.target.value })}
                    variant="filled"
                    className="font-mono"
                    placeholder="smtp.hostinger.com"
                  />
                </div>
                <div>
                  <Input
                    label="Port"
                    id="smtpPort"
                    name="smtpPort"
                    type="text"
                    value={config.smtpPort}
                    onChange={e => setConfig({ ...config, smtpPort: e.target.value })}
                    variant="filled"
                    className="font-mono"
                    placeholder="587"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-muted-foreground mb-2 ml-1">Encryption</label>
                  <Select
                    value={config.smtpSecure ? 'ssl' : 'tls'}
                    onChange={val => {
                      const isSSL = val === 'ssl';
                      setConfig({
                        ...config,
                        smtpSecure: isSSL,
                        smtpPort: isSSL ? '465' : '587'
                      });
                    }}
                    options={[
                      { label: 'STARTTLS (587)', value: 'tls', description: 'Recommended for most servers' },
                      { label: 'SSL/TLS (465)', value: 'ssl', description: 'Legacy secure connection' }
                    ]}
                    isSearchable={false}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Input
                    label="Username"
                    id="smtpUser"
                    name="smtpUser"
                    type="text"
                    value={config.smtpUser}
                    onChange={e => setConfig({ ...config, smtpUser: e.target.value })}
                    variant="filled"
                    className="font-mono"
                    placeholder="support@techworldproduct.com"
                  />
                </div>
                <div>
                  <Input
                    label="Password"
                    id="smtpPass"
                    name="smtpPass"
                    type={showPassword ? "text" : "password"}
                    value={config.smtpPass}
                    onChange={e => setConfig({ ...config, smtpPass: e.target.value })}
                    variant="filled"
                    className="font-mono"
                    placeholder="••••••••••••"
                    rightAction={
                      <Button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-primary"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </Button>
                    }
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-border flex items-center justify-between">
                <p className="text-xs text-muted-foreground max-w-md italic">
                  Note: You must use an App Password if using Gmail or Outlook with 2FA enabled.
                </p>
                <Button
                  onClick={handleTestConnection}
                  isLoading={testing}
                  disabled={saving}
                  variant="outline"
                  size="md"
                  leftIcon={Mail}
                  className="px-6 py-3 border-2 border-primary/20 text-primary font-bold hover:bg-primary/5"
                >
                  {testing ? 'Sending Test...' : 'Send Test Email'}
                </Button>
              </div>
            </div>
          </div>

          {/* Sender Details */}
          <div className="bg-card rounded-lg border border-border p-8 shadow-sm">
            <h4 className="text-lg font-bold mb-6 flex items-center gap-3">
              <Globe className="w-6 h-6 text-primary" />
              Sender Details
            </h4>
            <div className="grid grid-cols-2 gap-6">
              <Input
                label="From Name"
                id="fromName"
                name="fromName"
                type="text"
                value={config.fromName}
                onChange={e => setConfig({ ...config, fromName: e.target.value })}
                variant="filled"
              />
              <Input
                label="From Email"
                id="fromEmail"
                name="fromEmail"
                type="email"
                value={config.fromEmail}
                onChange={e => setConfig({ ...config, fromEmail: e.target.value })}
                variant="filled"
              />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-muted text-white rounded-lg p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Zap className="w-24 h-24 text-primary" />
            </div>
            <div className="relative z-10">
              <h4 className="text-base font-semibold mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                SMTP Delivery
              </h4>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                Your SaaS is configured to send transactional emails via your custom SMTP server. Ensure your host and credentials are correct.
              </p>
              <div className="flex items-start gap-3 p-4 bg-white/5 rounded-lg">
                <AlertCircle className="w-5 h-5 text-primary shrink-0" />
                <p className="text-[10px] font-medium text-muted-foreground/60">
                  You are using a <strong>Custom SMTP</strong> provider. Ensure your server allows outbound connections on the specified port.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
