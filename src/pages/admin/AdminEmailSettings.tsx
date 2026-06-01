import { AlertCircle, Eye, EyeOff, Globe, Mail, RefreshCw, Save, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { AdminPageHeader } from '../../components/admin';
import Input from '../../components/primitives/Input';
import Button from '../../components/primitives/Button';
import Card from '../../components/primitives/Card';
import Select from '../../components/primitives/Select';
import { api } from '../../lib/api';
import { usePath } from '../../hooks/usePath';

interface SmtpConfig {
  fromName:   string;
  fromEmail:  string;
  replyTo:    string;
  smtpHost:   string;
  smtpPort:   string;
  smtpUser:   string;
  smtpPass:   string;
  smtpSecure: boolean;
}

const DEFAULTS: SmtpConfig = {
  fromName: '', fromEmail: '', replyTo: '',
  smtpHost: '', smtpPort: '587', smtpUser: '', smtpPass: '',
  smtpSecure: false,
};

export default function AdminEmailSettings() {
  const { prefix } = usePath();
  const [config, setConfig]       = useState<SmtpConfig>(DEFAULTS);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [testing, setTesting]     = useState(false);
  const [showPass, setShowPass]   = useState(false);
  const [testResult, setTestResult] = useState<'ok' | 'error' | null>(null);

  useEffect(() => {
    api.get('/email/settings')
      .then((r: any) => {
        if (r && typeof r === 'object' && !r.error) setConfig(c => ({ ...c, ...r }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/email/settings', config);
      toast.success('Settings saved');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false); }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const r = await api.post('/marketing/test-email') as any;
      if (r?.success) {
        setTestResult('ok');
        toast.success('Test email sent — check your inbox');
      } else {
        setTestResult('error');
        toast.error(r?.error || 'SMTP test failed');
      }
    } catch {
      setTestResult('error');
      toast.error('Could not reach SMTP server');
    } finally {
      setTesting(false);
    }
  };

  const set = (k: keyof SmtpConfig, v: any) => setConfig(c => ({ ...c, [k]: v }));

  if (loading) return (
    <div className="p-12 text-center text-muted-foreground text-sm animate-pulse">Loading settings…</div>
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        label="Emails"
        labelIcon={Mail}
        title="Email Settings"
        subtitle="SMTP server credentials and sender identity for all outgoing emails."
        actions={
          <div className="flex items-center gap-2">
            <Button onClick={handleTest} isLoading={testing} variant="secondary" size="md" leftIcon={RefreshCw}>
              Send Test Email
            </Button>
            <Button onClick={handleSave} isLoading={saving} variant="primary" size="md" leftIcon={Save}>
              Save
            </Button>
          </div>
        }
      />

      {/* Test result banner */}
      {testResult === 'ok' && (
        <div className="flex items-center gap-3 px-5 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-sm font-semibold text-emerald-700 dark:text-emerald-400">
          <Mail className="w-4 h-4 shrink-0" /> Test email sent successfully.
        </div>
      )}
      {testResult === 'error' && (
        <div className="flex items-center gap-3 px-5 py-3 bg-destructive/10 border border-destructive/20 rounded-xl text-sm font-semibold text-destructive">
          <AlertCircle className="w-4 h-4 shrink-0" /> SMTP test failed — check credentials below.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">

          {/* SMTP server */}
          <Card className="space-y-5">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              <p className="font-bold text-foreground text-sm">SMTP Server</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Input
                  label="Host"
                  value={config.smtpHost}
                  onChange={e => set('smtpHost', e.target.value)}
                  placeholder="smtp.hostinger.com"
                  variant="filled"
                  className="font-mono"
                />
              </div>
              <Input
                label="Port"
                value={config.smtpPort}
                onChange={e => set('smtpPort', e.target.value)}
                placeholder="587"
                variant="filled"
                className="font-mono"
              />
              <Select
                label="Encryption"
                value={config.smtpSecure ? 'ssl' : 'tls'}
                onChange={val => set('smtpSecure', val === 'ssl')}
                options={[
                  { label: 'STARTTLS — port 587 (recommended)', value: 'tls' },
                  { label: 'SSL/TLS — port 465', value: 'ssl' },
                ]}
                isSearchable={false}
              />
              <Input
                label="Username"
                value={config.smtpUser}
                onChange={e => set('smtpUser', e.target.value)}
                placeholder="noreply@yourdomain.com"
                variant="filled"
                className="font-mono"
              />
              <Input
                label="Password"
                type={showPass ? 'text' : 'password'}
                value={config.smtpPass}
                onChange={e => set('smtpPass', e.target.value)}
                placeholder="••••••••••••"
                variant="filled"
                className="font-mono"
                rightAction={
                  <Button type="button" onClick={() => setShowPass(v => !v)} variant="ghost" size="icon">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                }
              />
            </div>
          </Card>

          {/* Sender identity */}
          <Card className="space-y-5">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              <p className="font-bold text-foreground text-sm">Sender Identity</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="From Name"
                value={config.fromName}
                onChange={e => set('fromName', e.target.value)}
                placeholder="Promptly"
                variant="filled"
              />
              <Input
                label="From Email"
                type="email"
                value={config.fromEmail}
                onChange={e => set('fromEmail', e.target.value)}
                placeholder="noreply@yourdomain.com"
                variant="filled"
              />
              <div className="sm:col-span-2">
                <Input
                  label="Reply-To (optional)"
                  type="email"
                  value={config.replyTo}
                  onChange={e => set('replyTo', e.target.value)}
                  placeholder="support@yourdomain.com"
                  variant="filled"
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Side notes */}
        <div className="space-y-4">
          <div className="bg-muted/40 border border-border rounded-xl p-5 space-y-3">
            <p className="text-xs font-bold text-foreground uppercase tracking-widest">Tips</p>
            <ul className="text-xs text-muted-foreground space-y-2 list-disc list-inside leading-relaxed">
              <li>Use port <strong>587</strong> with STARTTLS for most hosts</li>
              <li>Gmail/Outlook with 2FA requires an App Password</li>
              <li>Hostinger: use <code className="font-mono bg-muted px-1 rounded">smtp.hostinger.com</code></li>
              <li>Settings saved here are used for all transactional and broadcast emails</li>
              <li>Use "Send Test Email" to verify the connection</li>
            </ul>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-5">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                Credentials are stored in Firestore. For higher security, set <code className="font-mono bg-amber-500/10 px-1 rounded">SMTP_*</code> env vars on your server — they take priority over these settings.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
