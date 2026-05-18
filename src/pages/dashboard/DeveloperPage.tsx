import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Code2, Copy, Eye, EyeOff, Key, Plus, Trash2, Check } from 'lucide-react';
import { api } from '../../lib/api';
import Button from '../../components/primitives/Button';
import Input from '../../components/primitives/Input';

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  rateLimit: number;
  active: boolean;
  lastUsedAt: string | null;
  createdAt: string | null;
}

interface NewKeyResult {
  id: string;
  key: string;
  prefix: string;
  name: string;
  scopes: string[];
}

const SCOPES = [
  { value: 'prompts:read',   label: 'Read Prompts',   description: 'List and fetch prompt content' },
  { value: 'credits:read',   label: 'Read Credits',   description: 'View credit balance and history' },
  { value: 'credits:write',  label: 'Spend Credits',  description: 'Unlock prompts using credits' },
  { value: 'profile:read',   label: 'Read Profile',   description: 'View your account profile' },
];

export default function DeveloperPage() {
  const [keys, setKeys]               = useState<ApiKey[]>([]);
  const [loading, setLoading]         = useState(true);
  const [creating, setCreating]       = useState(false);
  const [showForm, setShowForm]       = useState(false);
  const [newKeyName, setNewKeyName]   = useState('');
  const [selectedScopes, setSelectedScopes] = useState<string[]>(SCOPES.map(s => s.value));
  const [newKey, setNewKey]           = useState<NewKeyResult | null>(null);
  const [showRawKey, setShowRawKey]   = useState(false);
  const [copied, setCopied]           = useState(false);
  const [revoking, setRevoking]       = useState<string | null>(null);

  useEffect(() => { loadKeys(); }, []);

  async function loadKeys() {
    try {
      const res: any = await api.get('/developer/keys');
      setKeys(res.keys ?? []);
    } catch {
      toast.error('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newKeyName.trim()) return toast.error('Enter a name for this key');
    if (selectedScopes.length === 0) return toast.error('Select at least one scope');

    setCreating(true);
    try {
      const res: any = await api.post('/developer/keys', { name: newKeyName.trim(), scopes: selectedScopes });
      setNewKey(res);
      setShowRawKey(true);
      setShowForm(false);
      setNewKeyName('');
      setSelectedScopes(SCOPES.map(s => s.value));
      await loadKeys();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create key');
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id: string) {
    if (!confirm('Revoke this API key? Any app using it will immediately lose access.')) return;
    setRevoking(id);
    try {
      await api.delete(`/developer/keys/${id}`);
      setKeys(prev => prev.filter(k => k.id !== id));
      toast.success('Key revoked');
    } catch {
      toast.error('Failed to revoke key');
    } finally {
      setRevoking(null);
    }
  }

  function copyKey() {
    if (!newKey) return;
    navigator.clipboard.writeText(newKey.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function toggleScope(scope: string) {
    setSelectedScopes(prev =>
      prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]
    );
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[300px]">
      <div className="text-muted-foreground text-sm animate-pulse font-semibold tracking-widest">Loading…</div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Code2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">API Keys</h1>
            <p className="text-sm text-muted-foreground">Programmatic access to Promptly</p>
          </div>
        </div>
        {!showForm && !newKey && (
          <Button onClick={() => setShowForm(true)} variant="primary" size="sm" leftIcon={Plus} className="rounded-xl">
            New Key
          </Button>
        )}
      </div>

      {/* One-time key reveal */}
      {newKey && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-emerald-600" />
            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
              Copy your API key now — it will never be shown again.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-3">
            <code className="flex-1 text-xs font-mono text-foreground break-all">
              {showRawKey ? newKey.key : newKey.prefix + '•'.repeat(24)}
            </code>
            <button onClick={() => setShowRawKey(v => !v)} className="text-muted-foreground hover:text-foreground p-1">
              {showRawKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button onClick={copyKey} className="text-muted-foreground hover:text-foreground p-1">
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Use this key in your app: <code className="bg-muted px-1 rounded">Authorization: Bearer {newKey.prefix}...</code>
          </p>
          <Button onClick={() => setNewKey(null)} variant="outline" size="sm" className="rounded-xl">
            Done
          </Button>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
          <p className="text-sm font-bold text-foreground">New API Key</p>
          <Input
            label="Key Name"
            value={newKeyName}
            onChange={e => setNewKeyName(e.target.value)}
            placeholder="e.g. Production App, Personal Script"
            variant="filled"
          />
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Scopes</p>
            <div className="grid sm:grid-cols-2 gap-2">
              {SCOPES.map(s => (
                <button
                  key={s.value}
                  onClick={() => toggleScope(s.value)}
                  className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                    selectedScopes.includes(s.value)
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-muted/20'
                  }`}
                >
                  <div className={`w-4 h-4 rounded mt-0.5 border-2 flex items-center justify-center shrink-0 ${
                    selectedScopes.includes(s.value) ? 'border-primary bg-primary' : 'border-muted-foreground'
                  }`}>
                    {selectedScopes.includes(s.value) && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">{s.label}</p>
                    <p className="text-xs text-muted-foreground">{s.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCreate} isLoading={creating} variant="primary" size="sm" className="rounded-xl">
              Generate Key
            </Button>
            <Button onClick={() => setShowForm(false)} variant="outline" size="sm" className="rounded-xl">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Key list */}
      {keys.length === 0 && !showForm && !newKey ? (
        <div className="text-center py-16 text-muted-foreground">
          <Key className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-semibold">No API keys yet</p>
          <p className="text-xs mt-1">Generate a key to start using the Promptly API</p>
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map(k => (
            <div key={k.id} className="bg-card border border-border rounded-2xl p-5 flex items-start justify-between gap-4">
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2">
                  <Key className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <p className="text-sm font-bold text-foreground">{k.name}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${
                    k.active
                      ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                      : 'bg-muted text-muted-foreground border border-border'
                  }`}>
                    {k.active ? 'Active' : 'Revoked'}
                  </span>
                </div>
                <code className="text-xs text-muted-foreground font-mono">{k.prefix}</code>
                <div className="flex flex-wrap gap-1 mt-1">
                  {k.scopes.map(s => (
                    <span key={s} className="text-[10px] px-1.5 py-0.5 bg-muted rounded font-mono text-muted-foreground">{s}</span>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {k.lastUsedAt
                    ? `Last used ${new Date(k.lastUsedAt).toLocaleDateString()}`
                    : 'Never used'}
                  {k.createdAt && ` · Created ${new Date(k.createdAt).toLocaleDateString()}`}
                </p>
              </div>
              {k.active && (
                <Button
                  onClick={() => handleRevoke(k.id)}
                  isLoading={revoking === k.id}
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Quick reference */}
      <div className="bg-muted/30 border border-border rounded-2xl p-6 space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quick Reference</p>
        <div className="space-y-2 text-xs font-mono text-muted-foreground">
          <p>Base URL: <span className="text-foreground">/api/v1</span></p>
          <p>Auth header: <span className="text-foreground">Authorization: Bearer sk_live_...</span></p>
          <div className="pt-2 space-y-1 border-t border-border">
            <p><span className="text-primary">GET</span>  /api/v1/prompts</p>
            <p><span className="text-primary">GET</span>  /api/v1/prompts/:id</p>
            <p><span className="text-amber-500">POST</span> /api/v1/prompts/:id/unlock</p>
            <p><span className="text-primary">GET</span>  /api/v1/me</p>
            <p><span className="text-primary">GET</span>  /api/v1/me/credits</p>
          </div>
        </div>
      </div>

    </div>
  );
}
