import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Bot, Key, ExternalLink, CheckCircle2, AlertCircle, RefreshCw, Trash2 } from 'lucide-react';
import Input from '../../components/primitives/Input';
import Button from '../../components/primitives/Button';
import { motion } from 'motion/react';
import { toast } from 'react-hot-toast';
import Alert from '../../components/feedback/Alert';
import {
  listGeminiModels,
  listOpenAIModels,
  listAnthropicModels,
  type GeminiModelInfo,
  type OpenAIModelInfo,
  type AnthropicModelInfo,
  type AIProvider
} from '../../services/geminiService';

export default function AIIntegrationPage() {
  const { user, profile } = useAuth();
  const [geminiKey, setGeminiKey] = useState(profile?.aiKeys?.gemini || '');
  const [openaiKey, setOpenaiKey] = useState(profile?.aiKeys?.openai || '');
  const [anthropicKey, setAnthropicKey] = useState(profile?.aiKeys?.anthropic || '');

  const [isTestingGemini, setIsTestingGemini] = useState(false);
  const [isTestingOpenAI, setIsTestingOpenAI] = useState(false);
  const [isTestingAnthropic, setIsTestingAnthropic] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [isLoadingGeminiModels, setIsLoadingGeminiModels] = useState(false);
  const [isLoadingOpenAIModels, setIsLoadingOpenAIModels] = useState(false);
  const [isLoadingAnthropicModels, setIsLoadingAnthropicModels] = useState(false);

  const [geminiModels, setGeminiModels] = useState<GeminiModelInfo[]>([]);
  const [openaiModels, setOpenaiModels] = useState<OpenAIModelInfo[]>([]);
  const [anthropicModels, setAnthropicModels] = useState<AnthropicModelInfo[]>([]);

  const [geminiChatModel, setGeminiChatModel] = useState(profile?.aiModels?.gemini?.chat || '');
  const [geminiTextModel, setGeminiTextModel] = useState(profile?.aiModels?.gemini?.text || '');
  const [geminiImageModel, setGeminiImageModel] = useState(profile?.aiModels?.gemini?.image || '');

  const [openaiChatModel, setOpenaiChatModel] = useState(profile?.aiModels?.openai?.chat || '');
  const [openaiTextModel, setOpenaiTextModel] = useState(profile?.aiModels?.openai?.text || '');

  const [anthropicChatModel, setAnthropicChatModel] = useState(profile?.aiModels?.anthropic?.chat || '');
  const [anthropicTextModel, setAnthropicTextModel] = useState(profile?.aiModels?.anthropic?.text || '');

  const [chatProvider, setChatProvider] = useState<AIProvider | ''>(profile?.aiProviders?.chat || '');
  const [textProvider, setTextProvider] = useState<AIProvider | ''>(profile?.aiProviders?.text || '');

  const [geminiStatus, setGeminiStatus] = useState<'idle' | 'success' | 'error'>(profile?.aiKeys?.gemini ? 'success' : 'idle');
  const [openaiStatus, setOpenaiStatus] = useState<'idle' | 'success' | 'error'>(profile?.aiKeys?.openai ? 'success' : 'idle');
  const [anthropicStatus, setAnthropicStatus] = useState<'idle' | 'success' | 'error'>(profile?.aiKeys?.anthropic ? 'success' : 'idle');

  const [geminiFreeOnly, setGeminiFreeOnly] = useState(true);
  const FREE_GEMINI_MODELS = ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.0-flash'] as const;
  const [openaiAffordableOnly, setOpenaiAffordableOnly] = useState(true);
  const [anthropicAffordableOnly, setAnthropicAffordableOnly] = useState(true);

  useEffect(() => {
    setGeminiKey(profile?.aiKeys?.gemini || '');
    setOpenaiKey(profile?.aiKeys?.openai || '');
    setAnthropicKey(profile?.aiKeys?.anthropic || '');

    setGeminiChatModel(profile?.aiModels?.gemini?.chat || '');
    setGeminiTextModel(profile?.aiModels?.gemini?.text || '');
    setGeminiImageModel(profile?.aiModels?.gemini?.image || '');

    setOpenaiChatModel(profile?.aiModels?.openai?.chat || '');
    setOpenaiTextModel(profile?.aiModels?.openai?.text || '');

    setAnthropicChatModel(profile?.aiModels?.anthropic?.chat || '');
    setAnthropicTextModel(profile?.aiModels?.anthropic?.text || '');

    setChatProvider(profile?.aiProviders?.chat || '');
    setTextProvider(profile?.aiProviders?.text || '');
  }, [
    profile?.aiKeys?.gemini,
    profile?.aiKeys?.openai,
    profile?.aiKeys?.anthropic,
    profile?.aiModels?.gemini?.chat,
    profile?.aiModels?.gemini?.text,
    profile?.aiModels?.gemini?.image,
    profile?.aiModels?.openai?.chat,
    profile?.aiModels?.openai?.text,
    profile?.aiModels?.anthropic?.chat,
    profile?.aiModels?.anthropic?.text,
    profile?.aiProviders?.chat,
    profile?.aiProviders?.text
  ]);

  const testModels = ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.0-flash'] as const;

  const handleLoadGeminiModels = async () => {
    if (!geminiKey.trim()) {
      toast.error("Please enter an API key first");
      return;
    }

    setIsLoadingGeminiModels(true);
    try {
      const models = await listGeminiModels(geminiKey.trim());
      const usable = models.filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'));
      const filtered = geminiFreeOnly ? usable.filter((m) => (FREE_GEMINI_MODELS as readonly string[]).includes(m.id)) : usable;
      setGeminiModels(filtered);
      if (!geminiChatModel && filtered[0]?.id) setGeminiChatModel(filtered[0].id);
      if (!geminiTextModel && filtered[0]?.id) setGeminiTextModel(filtered[0].id);
      if (!geminiImageModel && filtered[0]?.id) setGeminiImageModel(filtered[0].id);
      toast.success(`Loaded ${filtered.length} model(s)`);
    } catch (err: any) {
      toast.error(err.message || "Failed to load models");
    } finally {
      setIsLoadingGeminiModels(false);
    }
  };

  const handleLoadOpenAIModels = async () => {
    if (!openaiKey.trim()) return toast.error("Please enter an API key first");
    setIsLoadingOpenAIModels(true);
    try {
      const models = await listOpenAIModels(openaiKey.trim());
      const filtered = openaiAffordableOnly ? models.filter((m) => /mini|nano/i.test(m.id)) : models;
      setOpenaiModels(filtered);
      if (!openaiChatModel && filtered[0]?.id) setOpenaiChatModel(filtered[0].id);
      if (!openaiTextModel && filtered[0]?.id) setOpenaiTextModel(filtered[0].id);
      toast.success(`Loaded ${filtered.length} model(s)`);
    } catch (err: any) {
      toast.error(err.message || "Failed to load models");
    } finally {
      setIsLoadingOpenAIModels(false);
    }
  };

  const handleLoadAnthropicModels = async () => {
    if (!anthropicKey.trim()) return toast.error("Please enter an API key first");
    setIsLoadingAnthropicModels(true);
    try {
      const models = await listAnthropicModels(anthropicKey.trim());
      const filtered = anthropicAffordableOnly ? models.filter((m) => /haiku|sonnet/i.test(m.id)) : models;
      setAnthropicModels(filtered);
      if (!anthropicChatModel && filtered[0]?.id) setAnthropicChatModel(filtered[0].id);
      if (!anthropicTextModel && filtered[0]?.id) setAnthropicTextModel(filtered[0].id);
      toast.success(`Loaded ${filtered.length} model(s)`);
    } catch (err: any) {
      toast.error(err.message || "Failed to load models");
    } finally {
      setIsLoadingAnthropicModels(false);
    }
  };

  const handleTestGemini = async () => {
    if (!geminiKey.trim()) {
      toast.error("Please enter an API key first");
      return;
    }

    setIsTestingGemini(true);
    setGeminiStatus('idle');

    try {
      let lastErrorMessage = "Failed to validate API key";

      for (const testModel of testModels) {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${testModel}:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: 'ping' }] }],
            }),
          }
        );

        if (response.ok) {
          setGeminiStatus('success');
          toast.success(`Connection successful! Verified by generating content with ${testModel}.`);
          return;
        }

        const errorData = await response.json().catch(() => ({}));
        const message = errorData?.error?.message || `Request failed with status ${response.status}`;
        lastErrorMessage = message;

        // Some accounts/projects currently show Free Tier quotas as 0. Try other models before failing.
        if (response.status === 429 && /limit:\s*0\b/i.test(String(message))) {
          continue;
        }

        throw new Error(message);
      }

      throw new Error(
        `Your Gemini API key appears valid, but this project has 0 free-tier quota for the tested models (${testModels.join(
          ', '
        )}). Enable billing / upgrade your plan in Google AI Studio, or use a different API key.`
      );
    } catch (err: any) {
      setGeminiStatus('error');
      toast.error(err.message || "Failed to validate API key");
    } finally {
      setIsTestingGemini(false);
    }
  };

  const handleTestOpenAI = async () => {
    if (!openaiKey.trim()) return toast.error("Please enter an API key first");
    setIsTestingOpenAI(true);
    setOpenaiStatus('idle');
    try {
      const model = openaiChatModel || 'gpt-4o-mini';
      const res = await fetch('/api/ai/openai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          systemInstruction: 'test',
          messages: [{ role: 'user', content: 'ping' }],
          customApiKey: openaiKey.trim()
        })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || data?.message || `Request failed with status ${res.status}`);
      }
      setOpenaiStatus('success');
      toast.success(`OpenAI connected (model: ${model}).`);
    } catch (err: any) {
      setOpenaiStatus('error');
      toast.error(err.message || "Failed to validate API key");
    } finally {
      setIsTestingOpenAI(false);
    }
  };

  const handleTestAnthropic = async () => {
    if (!anthropicKey.trim()) return toast.error("Please enter an API key first");
    setIsTestingAnthropic(true);
    setAnthropicStatus('idle');
    try {
      const model = anthropicChatModel || 'claude-3-5-sonnet-20240620';
      const res = await fetch('/api/ai/anthropic/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model,
          systemInstruction: 'test',
          messages: [{ role: 'user', content: 'ping' }],
          customApiKey: anthropicKey.trim()
        })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || data?.message || `Request failed with status ${res.status}`);
      }
      setAnthropicStatus('success');
      toast.success(`Anthropic connected (model: ${model}).`);
    } catch (err: any) {
      setAnthropicStatus('error');
      toast.error(err.message || "Failed to validate API key");
    } finally {
      setIsTestingAnthropic(false);
    }
  };

  const handleSaveKey = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        'aiKeys.gemini': geminiKey || null,
        'aiKeys.openai': openaiKey || null,
        'aiKeys.anthropic': anthropicKey || null,

        'aiModels.gemini.chat': geminiChatModel || null,
        'aiModels.gemini.text': geminiTextModel || null,
        'aiModels.gemini.image': geminiImageModel || null,

        'aiModels.openai.chat': openaiChatModel || null,
        'aiModels.openai.text': openaiTextModel || null,

        'aiModels.anthropic.chat': anthropicChatModel || null,
        'aiModels.anthropic.text': anthropicTextModel || null,

        'aiProviders.chat': chatProvider || null,
        'aiProviders.text': textProvider || null,
        updatedAt: serverTimestamp()
      });
      toast.success("AI Integration updated successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save API key");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveGemini = async () => {
    if (!user) return;
    if (!confirm("Are you sure you want to disconnect your AI API? You won't be able to use the Creative Tools until you reconnect.")) return;

    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        'aiKeys.gemini': null,
        'aiModels.gemini.chat': null,
        'aiModels.gemini.text': null,
        'aiModels.gemini.image': null,
        updatedAt: serverTimestamp()
      });
      setGeminiKey('');
      setGeminiModels([]);
      setGeminiChatModel('');
      setGeminiTextModel('');
      setGeminiImageModel('');
      setGeminiStatus('idle');
      toast.success("Gemini disconnected");
    } catch (err) {
      toast.error("Failed to remove API key");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveOpenAI = async () => {
    if (!user) return;
    if (!confirm("Disconnect OpenAI?")) return;

    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        'aiKeys.openai': null,
        'aiModels.openai.chat': null,
        'aiModels.openai.text': null,
        updatedAt: serverTimestamp()
      });
      setOpenaiKey('');
      setOpenaiModels([]);
      setOpenaiChatModel('');
      setOpenaiTextModel('');
      setOpenaiStatus('idle');
      toast.success("OpenAI disconnected");
    } catch {
      toast.error("Failed to remove API key");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveAnthropic = async () => {
    if (!user) return;
    if (!confirm("Disconnect Anthropic?")) return;

    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        'aiKeys.anthropic': null,
        'aiModels.anthropic.chat': null,
        'aiModels.anthropic.text': null,
        updatedAt: serverTimestamp()
      });
      setAnthropicKey('');
      setAnthropicModels([]);
      setAnthropicChatModel('');
      setAnthropicTextModel('');
      setAnthropicStatus('idle');
      toast.success("Anthropic disconnected");
    } catch {
      toast.error("Failed to remove API key");
    } finally {
      setIsSaving(false);
    }
  };

  const connectedProviders = (['gemini', 'openai', 'anthropic'] as const).filter((p) => {
    if (p === 'gemini') return !!profile?.aiKeys?.gemini;
    if (p === 'openai') return !!profile?.aiKeys?.openai;
    return !!profile?.aiKeys?.anthropic;
  });
  const connectedCount = connectedProviders.length;
  const anyConnected = connectedCount > 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="space-y-8"
    >
      <div className="bg-card rounded-lg p-6 border border-border shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-8 border-b border-border">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">AI Integration</h2>
              <p className="text-sm text-muted-foreground mt-1">Connect your own AI API keys to power your Creative Studio.</p>
            </div>
          </div>
          <div className={`px-4 py-2 rounded-full flex items-center gap-2 text-xs font-bold uppercase tracking-widest ${
            anyConnected ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-muted text-muted-foreground border border-border'
          }`}>
            {anyConnected ? (
              <><CheckCircle2 className="w-3.5 h-3.5" /> {connectedCount} Connected</>
            ) : (
              'Not Connected'
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-8">
            <Alert 
              variant="info" 
              title="Bring Your Own Key (BYOK)"
            >
              To provide the most advanced AI features at the lowest cost, Promptly uses a BYOK model. You only pay for what you use directly to the AI providers.
            </Alert>

            <div className="space-y-6">
              <div className="flex items-center gap-2 text-foreground font-bold text-sm">
                <img src="https://www.gstatic.com/lamda/images/favicon_v2_16x16.png" className="w-4 h-4" alt="Gemini" />
                Google AI (Gemini)
              </div>
              <label className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground">
                <input
                  type="checkbox"
                  checked={geminiFreeOnly}
                  onChange={(e) => setGeminiFreeOnly(e.target.checked)}
                />
                Show free-tier models only
              </label>
               
              <div className="space-y-4">
                <Input
                  label="Gemini API Key"
                  id="geminiKey"
                  name="geminiKey"
                  type="password"
                  value={geminiKey}
                  onChange={(e) => {
                    setGeminiKey(e.target.value);
                    if (geminiStatus !== 'idle') setGeminiStatus('idle');
                  }}
                  placeholder="Paste your API key here..."
                  variant="filled"
                  rightAction={
                    <Key className="w-4 h-4 opacity-40" />
                  }
                />
                
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <Button
                    onClick={handleTestGemini}
                    isLoading={isTestingGemini}
                    variant="outline"
                    size="sm"
                    leftIcon={RefreshCw}
                  >
                    Test Connection
                  </Button>

                  <Button
                    onClick={handleLoadGeminiModels}
                    isLoading={isLoadingGeminiModels}
                    variant="outline"
                    size="sm"
                  >
                    Load Models
                  </Button>
                  
                  <Button
                    onClick={handleSaveKey}
                    isLoading={isSaving}
                    variant="primary"
                    size="sm"
                  >
                    Save & Connect
                  </Button>

                  {profile?.aiKeys?.gemini && (
                    <Button
                      onClick={handleRemoveGemini}
                      variant="ghost"
                      size="sm"
                      className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                      leftIcon={Trash2}
                    >
                      Disconnect
                    </Button>
                  )}
                </div>
              </div>

              {geminiModels.length > 0 && (
                <div className="pt-6 space-y-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Model Preferences</div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Chat Model</label>
                      <select
                        value={geminiChatModel}
                        onChange={(e) => setGeminiChatModel(e.target.value)}
                        className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-xs font-bold focus:outline-none"
                      >
                        {geminiModels.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.displayName ? `${m.displayName} (${m.id})` : m.id}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Text/Prompt Model</label>
                      <select
                        value={geminiTextModel}
                        onChange={(e) => setGeminiTextModel(e.target.value)}
                        className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-xs font-bold focus:outline-none"
                      >
                        {geminiModels.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.displayName ? `${m.displayName} (${m.id})` : m.id}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Image Model</label>
                    <select
                      value={geminiImageModel}
                      onChange={(e) => setGeminiImageModel(e.target.value)}
                      className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-xs font-bold focus:outline-none"
                    >
                      {geminiModels.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.displayName ? `${m.displayName} (${m.id})` : m.id}
                        </option>
                      ))}
                    </select>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    These preferences apply across your tools (Chat Studio, Captions, Magic Prompt).
                  </p>
                </div>
              )}
            </div>

            {/* OpenAI */}
            <div className="space-y-6 pt-10 border-t border-border">
              <div className="flex items-center gap-2 text-foreground font-bold text-sm">
                <span>OpenAI (ChatGPT)</span>
              </div>
              <label className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground">
                <input
                  type="checkbox"
                  checked={openaiAffordableOnly}
                  onChange={(e) => setOpenaiAffordableOnly(e.target.checked)}
                />
                Show affordable models only (mini/nano)
              </label>

              <div className="space-y-4">
                <Input
                  label="OpenAI API Key"
                  id="openaiKey"
                  name="openaiKey"
                  type="password"
                  value={openaiKey}
                  onChange={(e) => {
                    setOpenaiKey(e.target.value);
                    if (openaiStatus !== 'idle') setOpenaiStatus('idle');
                  }}
                  placeholder="Paste your OpenAI API key here..."
                  variant="filled"
                  rightAction={<Key className="w-4 h-4 opacity-40" />}
                />

                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <Button
                    onClick={handleTestOpenAI}
                    isLoading={isTestingOpenAI}
                    variant="outline"
                    size="sm"
                    leftIcon={RefreshCw}
                  >
                    Test Connection
                  </Button>

                  <Button
                    onClick={handleLoadOpenAIModels}
                    isLoading={isLoadingOpenAIModels}
                    variant="outline"
                    size="sm"
                  >
                    Load Models
                  </Button>

                  <Button
                    onClick={handleSaveKey}
                    isLoading={isSaving}
                    variant="primary"
                    size="sm"
                  >
                    Save
                  </Button>

                  {profile?.aiKeys?.openai && (
                    <Button
                      onClick={handleRemoveOpenAI}
                      variant="ghost"
                      size="sm"
                      className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                      leftIcon={Trash2}
                    >
                      Disconnect
                    </Button>
                  )}
                </div>
              </div>

              {openaiModels.length > 0 && (
                <div className="pt-2 space-y-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Model Preferences</div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Chat Model</label>
                      <select
                        value={openaiChatModel}
                        onChange={(e) => setOpenaiChatModel(e.target.value)}
                        className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-xs font-bold focus:outline-none"
                      >
                        {openaiModels.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.id}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Text Model</label>
                      <select
                        value={openaiTextModel}
                        onChange={(e) => setOpenaiTextModel(e.target.value)}
                        className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-xs font-bold focus:outline-none"
                      >
                        {openaiModels.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.id}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Anthropic */}
            <div className="space-y-6 pt-10 border-t border-border">
              <div className="flex items-center gap-2 text-foreground font-bold text-sm">
                <span>Anthropic (Claude)</span>
              </div>
              <label className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground">
                <input
                  type="checkbox"
                  checked={anthropicAffordableOnly}
                  onChange={(e) => setAnthropicAffordableOnly(e.target.checked)}
                />
                Show affordable models only (haiku/sonnet)
              </label>

              <div className="space-y-4">
                <Input
                  label="Anthropic API Key"
                  id="anthropicKey"
                  name="anthropicKey"
                  type="password"
                  value={anthropicKey}
                  onChange={(e) => {
                    setAnthropicKey(e.target.value);
                    if (anthropicStatus !== 'idle') setAnthropicStatus('idle');
                  }}
                  placeholder="Paste your Anthropic API key here..."
                  variant="filled"
                  rightAction={<Key className="w-4 h-4 opacity-40" />}
                />

                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <Button
                    onClick={handleTestAnthropic}
                    isLoading={isTestingAnthropic}
                    variant="outline"
                    size="sm"
                    leftIcon={RefreshCw}
                  >
                    Test Connection
                  </Button>

                  <Button
                    onClick={handleLoadAnthropicModels}
                    isLoading={isLoadingAnthropicModels}
                    variant="outline"
                    size="sm"
                  >
                    Load Models
                  </Button>

                  <Button
                    onClick={handleSaveKey}
                    isLoading={isSaving}
                    variant="primary"
                    size="sm"
                  >
                    Save
                  </Button>

                  {profile?.aiKeys?.anthropic && (
                    <Button
                      onClick={handleRemoveAnthropic}
                      variant="ghost"
                      size="sm"
                      className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                      leftIcon={Trash2}
                    >
                      Disconnect
                    </Button>
                  )}
                </div>
              </div>

              {anthropicModels.length > 0 && (
                <div className="pt-2 space-y-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Model Preferences</div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Chat Model</label>
                      <select
                        value={anthropicChatModel}
                        onChange={(e) => setAnthropicChatModel(e.target.value)}
                        className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-xs font-bold focus:outline-none"
                      >
                        {anthropicModels.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.displayName ? `${m.displayName} (${m.id})` : m.id}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Text Model</label>
                      <select
                        value={anthropicTextModel}
                        onChange={(e) => setAnthropicTextModel(e.target.value)}
                        className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-xs font-bold focus:outline-none"
                      >
                        {anthropicModels.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.displayName ? `${m.displayName} (${m.id})` : m.id}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Defaults */}
            <div className="pt-10 border-t border-border space-y-4">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Default Providers</div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Chat Provider</label>
                  <select
                    value={chatProvider}
                    onChange={(e) => setChatProvider(e.target.value as AIProvider)}
                    className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-xs font-bold focus:outline-none"
                  >
                    <option value="">Auto</option>
                    {geminiKey && <option value="gemini">Gemini</option>}
                    {openaiKey && <option value="openai">OpenAI</option>}
                    {anthropicKey && <option value="anthropic">Anthropic</option>}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Text Provider</label>
                  <select
                    value={textProvider}
                    onChange={(e) => setTextProvider(e.target.value as AIProvider)}
                    className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-xs font-bold focus:outline-none"
                  >
                    <option value="">Auto</option>
                    {geminiKey && <option value="gemini">Gemini</option>}
                    {openaiKey && <option value="openai">OpenAI</option>}
                    {anthropicKey && <option value="anthropic">Anthropic</option>}
                  </select>
                </div>
              </div>
              <Button onClick={handleSaveKey} isLoading={isSaving} variant="primary" size="sm">
                Save Defaults
              </Button>
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-muted/30 rounded-2xl p-6 border border-border">
              <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                <Bot className="w-4 h-4 text-primary" />
                Setup Guide
              </h3>
              
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px]">1</span>
                    Get Gemini Key
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Visit <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">Google AI Studio <ExternalLink className="w-2.5 h-2.5" /></a> and create a new API key.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px]">2</span>
                    Enable Models
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Once connected, use the "Load Models" button to fetch the latest available versions like Gemini 2.0 Flash.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px]">3</span>
                    Set Preferences
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Assign specific models for Chat, Text, and Image generation to optimize your workflow.
                  </p>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-border">
                <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
                  Quick Links
                </div>
                <div className="space-y-2">
                  <a 
                    href="https://platform.openai.com/api-keys" 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 text-[11px] text-muted-foreground transition-colors"
                  >
                    OpenAI Dashboard <ExternalLink className="w-3 h-3" />
                  </a>
                  <a 
                    href="https://console.anthropic.com/settings/keys" 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 text-[11px] text-muted-foreground transition-colors"
                  >
                    Anthropic Console <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            <div className="bg-primary/5 rounded-2xl p-6 border border-primary/10">
              <h3 className="text-xs font-bold text-primary uppercase tracking-[0.2em] mb-4">Pro Tip</h3>
              <p className="text-[11px] text-foreground/70 leading-relaxed italic">
                "Gemini 2.0 Flash is currently free to use with a generous quota. It's the best way to get high-performance AI features in Promptly without spending a dime."
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
