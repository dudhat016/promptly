import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import {
  Bot, Code2, Key, ExternalLink, CheckCircle2, XCircle, RefreshCw, Trash2, Loader2,
} from 'lucide-react';
import { ProFeatureCard } from '../../components/ProGate';
import Input from '../../components/primitives/Input';
import Select from '../../components/primitives/Select';
import Button from '../../components/primitives/Button';
import { motion } from 'motion/react';
import { toast } from 'react-hot-toast';
import Alert from '../../components/feedback/Alert';
import {
  listGeminiModels, listOpenAIModels, listAnthropicModels,
  type GeminiModelInfo, type OpenAIModelInfo, type AnthropicModelInfo, type AIProvider,
} from '../../services/geminiService';

type Status = 'idle' | 'testing' | 'success' | 'error';

// ── Per-provider state ────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: Status }) {
  if (status === 'testing') return (
    <span className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Testing…
    </span>
  );
  if (status === 'success') return (
    <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 bg-emerald-500/8 border border-emerald-500/20 px-2.5 py-1 rounded-full">
      <CheckCircle2 className="w-3.5 h-3.5" /> Connected
    </span>
  );
  if (status === 'error') return (
    <span className="flex items-center gap-1.5 text-[11px] font-bold text-rose-600 bg-rose-500/8 border border-rose-500/20 px-2.5 py-1 rounded-full">
      <XCircle className="w-3.5 h-3.5" /> Error
    </span>
  );
  return null;
}

function ModelSelect({ label, value, options, onChange }: {
  label: string; value: string; options: { id: string; displayName?: string }[]; onChange: (v: string) => void;
}) {
  if (!options.length) return null;
  return (
    <Select
      label={label}
      value={value}
      onChange={onChange}
      options={options.map(m => ({ value: m.id, label: m.displayName ? `${m.displayName} — ${m.id}` : m.id }))}
    />
  );
}

export default function AIIntegrationPage() {
  const { user, profile } = useAuth();

  // ── Keys ──────────────────────────────────────────────────────────────────
  const [geminiKey,    setGeminiKey]    = useState(profile?.aiKeys?.gemini    || '');
  const [openaiKey,    setOpenaiKey]    = useState(profile?.aiKeys?.openai    || '');
  const [anthropicKey, setAnthropicKey] = useState(profile?.aiKeys?.anthropic || '');

  // ── Connection status ─────────────────────────────────────────────────────
  const [geminiStatus,    setGeminiStatus]    = useState<Status>(profile?.aiKeys?.gemini    ? 'success' : 'idle');
  const [openaiStatus,    setOpenaiStatus]    = useState<Status>(profile?.aiKeys?.openai    ? 'success' : 'idle');
  const [anthropicStatus, setAnthropicStatus] = useState<Status>(profile?.aiKeys?.anthropic ? 'success' : 'idle');

  // ── Loaded models ─────────────────────────────────────────────────────────
  const [geminiModels,    setGeminiModels]    = useState<GeminiModelInfo[]>([]);
  const [openaiModels,    setOpenaiModels]    = useState<OpenAIModelInfo[]>([]);
  const [anthropicModels, setAnthropicModels] = useState<AnthropicModelInfo[]>([]);

  // ── Model preferences ─────────────────────────────────────────────────────
  const [gChat, setGChat] = useState(profile?.aiModels?.gemini?.chat    || '');
  const [gText, setGText] = useState(profile?.aiModels?.gemini?.text    || '');
  const [gImg,  setGImg]  = useState(profile?.aiModels?.gemini?.image   || '');
  const [oChat, setOChat] = useState(profile?.aiModels?.openai?.chat    || '');
  const [oText, setOText] = useState(profile?.aiModels?.openai?.text    || '');
  const [aChat, setAChat] = useState(profile?.aiModels?.anthropic?.chat || '');
  const [aText, setAText] = useState(profile?.aiModels?.anthropic?.text || '');

  // ── Default providers ─────────────────────────────────────────────────────
  const [chatProvider, setChatProvider] = useState<AIProvider | ''>(profile?.aiProviders?.chat || '');
  const [textProvider, setTextProvider] = useState<AIProvider | ''>(profile?.aiProviders?.text || '');

  // ── Loading state ─────────────────────────────────────────────────────────
  const [loadingGemini,    setLoadingGemini]    = useState(false);
  const [loadingOpenAI,    setLoadingOpenAI]    = useState(false);
  const [loadingAnthropic, setLoadingAnthropic] = useState(false);
  const [saving, setSaving] = useState(false);

  const [geminiFreeOnly,       setGeminiFreeOnly]       = useState(true);
  const [openaiAffordableOnly, setOpenaiAffordableOnly] = useState(true);
  const [anthropicAffordable,  setAnthropicAffordable]  = useState(true);

  const FREE_GEMINI = ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.0-flash'] as const;

  // Sync when profile loads
  useEffect(() => {
    setGeminiKey(profile?.aiKeys?.gemini    || '');
    setOpenaiKey(profile?.aiKeys?.openai    || '');
    setAnthropicKey(profile?.aiKeys?.anthropic || '');
    setGChat(profile?.aiModels?.gemini?.chat    || '');
    setGText(profile?.aiModels?.gemini?.text    || '');
    setGImg( profile?.aiModels?.gemini?.image   || '');
    setOChat(profile?.aiModels?.openai?.chat    || '');
    setOText(profile?.aiModels?.openai?.text    || '');
    setAChat(profile?.aiModels?.anthropic?.chat || '');
    setAText(profile?.aiModels?.anthropic?.text || '');
    setChatProvider(profile?.aiProviders?.chat || '');
    setTextProvider(profile?.aiProviders?.text || '');
  }, [profile]);

  // ── Test handlers ─────────────────────────────────────────────────────────
  const testModels = ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.0-flash'] as const;

  async function testGemini() {
    if (!geminiKey.trim()) { toast.error('Enter an API key first'); return; }
    setGeminiStatus('testing');
    try {
      for (const model of testModels) {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: 'ping' }] }] }) }
        );
        if (res.ok) { setGeminiStatus('success'); toast.success(`Gemini connected (${model})`); return; }
        const err = await res.json().catch(() => ({}));
        if (res.status === 429 && /limit:\s*0\b/i.test(String(err?.error?.message))) continue;
        throw new Error(err?.error?.message || `Status ${res.status}`);
      }
      throw new Error('Valid key but quota is 0 — enable billing in Google AI Studio.');
    } catch (e: any) { setGeminiStatus('error'); toast.error(e.message); }
  }

  async function testOpenAI() {
    if (!openaiKey.trim()) { toast.error('Enter an API key first'); return; }
    setOpenaiStatus('testing');
    try {
      const res = await fetch('/api/ai/openai/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: oChat || 'gpt-4o-mini', systemInstruction: 'test', messages: [{ role: 'user', content: 'ping' }], customApiKey: openaiKey.trim() }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d?.error || `Status ${res.status}`); }
      setOpenaiStatus('success'); toast.success('OpenAI connected');
    } catch (e: any) { setOpenaiStatus('error'); toast.error(e.message); }
  }

  async function testAnthropic() {
    if (!anthropicKey.trim()) { toast.error('Enter an API key first'); return; }
    setAnthropicStatus('testing');
    try {
      const res = await fetch('/api/ai/anthropic/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: aChat || 'claude-3-5-sonnet-20240620', systemInstruction: 'test', messages: [{ role: 'user', content: 'ping' }], customApiKey: anthropicKey.trim() }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d?.error || `Status ${res.status}`); }
      setAnthropicStatus('success'); toast.success('Anthropic connected');
    } catch (e: any) { setAnthropicStatus('error'); toast.error(e.message); }
  }

  // ── Load model lists ──────────────────────────────────────────────────────
  async function loadGeminiModels() {
    if (!geminiKey.trim()) { toast.error('Enter an API key first'); return; }
    setLoadingGemini(true);
    try {
      const all = await listGeminiModels(geminiKey.trim());
      const usable = all.filter(m => (m.supportedGenerationMethods || []).includes('generateContent'));
      const list = geminiFreeOnly ? usable.filter(m => (FREE_GEMINI as readonly string[]).includes(m.id)) : usable;
      setGeminiModels(list);
      if (!gChat && list[0]?.id) setGChat(list[0].id);
      if (!gText && list[0]?.id) setGText(list[0].id);
      if (!gImg  && list[0]?.id) setGImg(list[0].id);
      toast.success(`${list.length} model(s) loaded`);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoadingGemini(false); }
  }

  async function loadOpenAIModels() {
    if (!openaiKey.trim()) { toast.error('Enter an API key first'); return; }
    setLoadingOpenAI(true);
    try {
      const all = await listOpenAIModels(openaiKey.trim());
      const list = openaiAffordableOnly ? all.filter(m => /mini|nano/i.test(m.id)) : all;
      setOpenaiModels(list);
      if (!oChat && list[0]?.id) setOChat(list[0].id);
      if (!oText && list[0]?.id) setOText(list[0].id);
      toast.success(`${list.length} model(s) loaded`);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoadingOpenAI(false); }
  }

  async function loadAnthropicModels() {
    if (!anthropicKey.trim()) { toast.error('Enter an API key first'); return; }
    setLoadingAnthropic(true);
    try {
      const all = await listAnthropicModels(anthropicKey.trim());
      const list = anthropicAffordable ? all.filter(m => /haiku|sonnet/i.test(m.id)) : all;
      setAnthropicModels(list);
      if (!aChat && list[0]?.id) setAChat(list[0].id);
      if (!aText && list[0]?.id) setAText(list[0].id);
      toast.success(`${list.length} model(s) loaded`);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoadingAnthropic(false); }
  }

  // ── Disconnect helpers ────────────────────────────────────────────────────
  async function disconnect(provider: 'gemini' | 'openai' | 'anthropic') {
    if (!user || !confirm(`Disconnect ${provider}?`)) return;
    setSaving(true);
    try {
      const patch: Record<string, any> = { updatedAt: serverTimestamp() };
      if (provider === 'gemini') {
        patch['aiKeys.gemini'] = null;
        patch['aiModels.gemini.chat'] = null; patch['aiModels.gemini.text'] = null; patch['aiModels.gemini.image'] = null;
        setGeminiKey(''); setGeminiModels([]); setGChat(''); setGText(''); setGImg(''); setGeminiStatus('idle');
      } else if (provider === 'openai') {
        patch['aiKeys.openai'] = null;
        patch['aiModels.openai.chat'] = null; patch['aiModels.openai.text'] = null;
        setOpenaiKey(''); setOpenaiModels([]); setOChat(''); setOText(''); setOpenaiStatus('idle');
      } else {
        patch['aiKeys.anthropic'] = null;
        patch['aiModels.anthropic.chat'] = null; patch['aiModels.anthropic.text'] = null;
        setAnthropicKey(''); setAnthropicModels([]); setAChat(''); setAText(''); setAnthropicStatus('idle');
      }
      await updateDoc(doc(db, 'users', user.uid), patch);
      toast.success(`${provider} disconnected`);
    } catch { toast.error('Failed to disconnect'); }
    finally { setSaving(false); }
  }

  // ── Save all ──────────────────────────────────────────────────────────────
  async function saveAll() {
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        'aiKeys.gemini':    geminiKey    || null,
        'aiKeys.openai':    openaiKey    || null,
        'aiKeys.anthropic': anthropicKey || null,
        'aiModels.gemini.chat':    gChat || null, 'aiModels.gemini.text':    gText || null, 'aiModels.gemini.image':   gImg  || null,
        'aiModels.openai.chat':    oChat || null, 'aiModels.openai.text':    oText || null,
        'aiModels.anthropic.chat': aChat || null, 'aiModels.anthropic.text': aText || null,
        'aiProviders.chat': chatProvider || null,
        'aiProviders.text': textProvider || null,
        updatedAt: serverTimestamp(),
      });
      toast.success('AI settings saved!');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  }

  const connectedCount = [geminiStatus, openaiStatus, anthropicStatus].filter(s => s === 'success').length;

  // ── Provider card ─────────────────────────────────────────────────────────
  const providers = [
    {
      key: 'gemini' as const,
      name: 'Google AI (Gemini)',
      logo: 'https://www.gstatic.com/lamda/images/favicon_v2_16x16.png',
      docsUrl: 'https://aistudio.google.com/app/apikey',
      docsLabel: 'Google AI Studio',
      status: geminiStatus,
      apiKey: geminiKey,
      setApiKey: (v: string) => { setGeminiKey(v); if (geminiStatus !== 'idle') setGeminiStatus('idle'); },
      placeholder: 'AIzaSy…',
      onTest: testGemini,
      onLoad: loadGeminiModels,
      loading: loadingGemini,
      filter: { label: 'Free-tier models only', checked: geminiFreeOnly, onChange: setGeminiFreeOnly },
      models: geminiModels,
      modelSelects: [
        { label: 'Chat Model',   value: gChat, onChange: setGChat },
        { label: 'Text Model',   value: gText, onChange: setGText },
        { label: 'Image Model',  value: gImg,  onChange: setGImg  },
      ],
    },
    {
      key: 'openai' as const,
      name: 'OpenAI (ChatGPT)',
      logo: null,
      docsUrl: 'https://platform.openai.com/api-keys',
      docsLabel: 'OpenAI Dashboard',
      status: openaiStatus,
      apiKey: openaiKey,
      setApiKey: (v: string) => { setOpenaiKey(v); if (openaiStatus !== 'idle') setOpenaiStatus('idle'); },
      placeholder: 'sk-…',
      onTest: testOpenAI,
      onLoad: loadOpenAIModels,
      loading: loadingOpenAI,
      filter: { label: 'Affordable models only (mini/nano)', checked: openaiAffordableOnly, onChange: setOpenaiAffordableOnly },
      models: openaiModels,
      modelSelects: [
        { label: 'Chat Model', value: oChat, onChange: setOChat },
        { label: 'Text Model', value: oText, onChange: setOText },
      ],
    },
    {
      key: 'anthropic' as const,
      name: 'Anthropic (Claude)',
      logo: null,
      docsUrl: 'https://console.anthropic.com/settings/keys',
      docsLabel: 'Anthropic Console',
      status: anthropicStatus,
      apiKey: anthropicKey,
      setApiKey: (v: string) => { setAnthropicKey(v); if (anthropicStatus !== 'idle') setAnthropicStatus('idle'); },
      placeholder: 'sk-ant-…',
      onTest: testAnthropic,
      onLoad: loadAnthropicModels,
      loading: loadingAnthropic,
      filter: { label: 'Affordable models only (haiku/sonnet)', checked: anthropicAffordable, onChange: setAnthropicAffordable },
      models: anthropicModels,
      modelSelects: [
        { label: 'Chat Model', value: aChat, onChange: setAChat },
        { label: 'Text Model', value: aText, onChange: setAText },
      ],
    },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

      {/* ── Header ── */}
      <div className="bg-card rounded-lg p-6 border border-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center shrink-0">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">AI Integration</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Connect your own API keys (BYOK) to power the Creative Studio.</p>
          </div>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest border w-fit ${
          connectedCount > 0 ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-muted text-muted-foreground border-border'
        }`}>
          <CheckCircle2 className="w-3.5 h-3.5" />
          {connectedCount > 0 ? `${connectedCount} provider${connectedCount > 1 ? 's' : ''} connected` : 'Not connected'}
        </div>
      </div>

      <Alert variant="info" title="Bring Your Own Key (BYOK)">
        Connect your AI provider keys to get the most advanced features. You pay providers directly — Promptly never stores or uses your keys server-side for billing.
      </Alert>

      {/* ── Provider cards ── */}
      {providers.map(p => (
        <div key={p.key} className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
          {/* Card header */}
          <div className="px-6 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {p.logo && <img src={p.logo} className="w-5 h-5" alt="" />}
              <span className="text-sm font-bold text-foreground">{p.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={p.status} />
              <a href={p.docsUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors">
                {p.docsLabel} <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Filter toggle */}
            <label className="flex items-center gap-2 text-xs text-muted-foreground font-medium cursor-pointer w-fit">
              <input type="checkbox" checked={p.filter.checked} onChange={e => p.filter.onChange(e.target.checked)} className="rounded" />
              {p.filter.label}
            </label>

            {/* API key input */}
            <Input
              label="API Key"
              type="password"
              value={p.apiKey}
              onChange={e => p.setApiKey(e.target.value)}
              placeholder={p.placeholder}
              variant="filled"
              rightAction={<Key className="w-4 h-4 opacity-40" />}
            />

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={p.onTest}
                isLoading={p.status === 'testing'}
                variant="outline"
                size="sm"
                leftIcon={RefreshCw}
                disabled={!p.apiKey.trim()}
              >
                Test Connection
              </Button>
              <Button
                onClick={p.onLoad}
                isLoading={p.loading}
                variant="outline"
                size="sm"
                disabled={!p.apiKey.trim()}
              >
                Load Models
              </Button>
              {profile?.aiKeys?.[p.key] && (
                <Button
                  onClick={() => disconnect(p.key)}
                  variant="ghost"
                  size="sm"
                  leftIcon={Trash2}
                  className="text-rose-500 hover:bg-rose-500/10 ml-auto"
                >
                  Disconnect
                </Button>
              )}
            </div>

            {/* Model selectors — only shown after loading */}
            {p.models.length > 0 && (
              <div className="pt-4 border-t border-border space-y-4">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Model Preferences</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  {p.modelSelects.map(ms => (
                    <ModelSelect key={ms.label} label={ms.label} value={ms.value} options={p.models} onChange={ms.onChange} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}

      {/* ── Default Providers ── */}
      <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-muted/30">
          <span className="text-sm font-bold text-foreground">Default Providers</span>
          <p className="text-xs text-muted-foreground mt-0.5">When multiple keys are connected, choose which provider to use by default.</p>
        </div>
        <div className="p-6 grid sm:grid-cols-2 gap-4">
          <Select
            label="Default Chat Provider"
            value={chatProvider}
            onChange={v => setChatProvider(v as AIProvider)}
            options={[
              { value: '', label: 'Auto (first available)' },
              ...(geminiKey    ? [{ value: 'gemini',    label: 'Google Gemini' }]    : []),
              ...(openaiKey    ? [{ value: 'openai',    label: 'OpenAI' }]           : []),
              ...(anthropicKey ? [{ value: 'anthropic', label: 'Anthropic Claude' }] : []),
            ]}
          />
          <Select
            label="Default Text Provider"
            value={textProvider}
            onChange={v => setTextProvider(v as AIProvider)}
            options={[
              { value: '', label: 'Auto (first available)' },
              ...(geminiKey    ? [{ value: 'gemini',    label: 'Google Gemini' }]    : []),
              ...(openaiKey    ? [{ value: 'openai',    label: 'OpenAI' }]           : []),
              ...(anthropicKey ? [{ value: 'anthropic', label: 'Anthropic Claude' }] : []),
            ]}
          />
        </div>
      </div>

      {/* ── Single Save All ── */}
      <div className="flex justify-end">
        <Button onClick={saveAll} isLoading={saving} variant="primary" size="md" leftIcon={CheckCircle2}>
          Save AI Settings
        </Button>
      </div>

      {/* ── Promptly API access ── */}
      <div className="border-t border-border pt-6 space-y-2">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Programmatic Access</p>
        <ProFeatureCard
          icon={Code2}
          title="Promptly REST API"
          description="Access the full prompt library, manage vault contents, and automate workflows via REST API with dedicated rate limits."
        />
        <ProFeatureCard
          icon={Key}
          title="API Key Management"
          description="Generate, rotate, and scope API keys for your integrations. Supports per-key usage limits and audit logs."
        />
      </div>

    </motion.div>
  );
}
