import { collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore';
import {
  BarChart,
  Code, CreditCard,
  ExternalLink,
  Globe, Image, Info, Layout,
  Mail, MessageSquare,
  Palette, Phone, Plus, Save, Search, Settings, Share2, Shield,
  Sparkles, Target,
  Trash2, UserPlus
} from 'lucide-react';
import { useEffect, useState, useId } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { AdminPageHeader } from '../../components/admin';
import ImageUpload from '../../components/admin/ImageUpload';
import Alert from '../../components/feedback/Alert';
import Button from '../../components/primitives/Button';
import Input from '../../components/primitives/Input';
import Select from '../../components/primitives/Select';
import TagInput from '../../components/primitives/TagInput';
import Textarea from '../../components/primitives/Textarea';
import { useConfig } from '../../hooks/useConfig';
import { logAuditEvent } from '../../lib/auditLog';
import { db } from '../../lib/firebase';
import { cn } from '../../lib/utils';
import AdminAssetManager from './AdminAssetManager';
import AdminEmailSettings from './AdminEmailSettings';
import AdminMarketingSettings from './AdminMarketingSettings';
import AdminPaymentSettings from './AdminPaymentSettings';
import AdminContentSettings from './AdminContentSettings';

type TabType = 'general' | 'branding' | 'auth' | 'ai' | 'contact' | 'social' | 'regional' | 'appearance' | 'email' | 'content' | 'payment' | 'marketing' | 'assets' | 'seo' | 'security' | 'advanced';

interface SitePage {
  id: string;
  title: string;
  description: string;
  keywords: string;
  ogImage: string;
  canonical: string;
  path: string;
}

export default function AdminSettings() {
  const { "*": subPath } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('general');

  // Sync tab with URL
  useEffect(() => {
    const tabFromUrl = subPath?.split('/')[0];
    if (tabFromUrl) {
      // Handle common aliases or typos
      const normalized = tabFromUrl === 'payments' ? 'payment' : tabFromUrl;
      setActiveTab(normalized as TabType);
    } else {
      setActiveTab('general');
    }
  }, [subPath]);

  const handleTabChange = (tabId: string) => {
    // Preserve the current language if possible, otherwise use /en/ as default
    navigate(`/en/admin/settings/${tabId}`);
  };
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { config: liveConfig, refreshConfig } = useConfig();

  // Site Pages SEO State
  const [pages, setPages] = useState<SitePage[]>([]);
  const [editingPage, setEditingPage] = useState<Partial<SitePage> | null>(null);
  const [savingPage, setSavingPage] = useState(false);

  // Dynamic Site Content State
  const [siteContent, setSiteContent] = useState<any>({
    terms: '',
    privacy: '',
    dmca: '',
    cookies: '',
    faq: [],
  });
  const [contentLoading, setContentLoading] = useState(false);
  const [savingContent, setSavingContent] = useState(false);
  const [activeContentPage, setActiveContentPage] = useState('terms');

  const defaultPages = [
    { id: 'home', path: '/', title: 'Promptly - Master AI Prompting' },
    { id: 'explore', path: '/explore', title: 'Explore AI Prompts' },
    { id: 'pricing', path: '/pricing', title: 'Pricing Plans' },
    { id: 'blog', path: '/blog', title: 'AI Prompting Blog' },
    { id: 'contact', path: '/contact', title: 'Contact Us' },
  ];

  const [config, setConfig] = useState<any>({
    siteName: 'Promptly',
    siteTagline: 'Professional AI Prompt Marketplace',
    siteDescription: '',
    supportEmail: 'support@techworldproduct.com',
    contactPhone: '',
    whatsapp: '',
    businessAddress: '',
    currency: 'USD',
    currencySymbol: '$',
    currencyFormat: 'before',
    timezone: 'UTC',
    defaultLanguage: 'en',
    taxRate: 0,
    maintenanceMode: false,
    maintenanceMessage: '',
    logoLight: '',
    logoDark: '',
    favicon: '',
    projectIcon: '',
    ogImage: '',
    googleAnalyticsId: '',
    facebookPixelId: '',
    customHeadScripts: '',
    customFooterScripts: '',
    allowRegistration: true,
    requireEmailVerification: false,
    defaultUserRole: 'user',
    enableSocialLogin: true,
    socials: {
      twitter: '',
      facebook: '',
      instagram: '',
      linkedin: '',
      github: '',
      youtube: '',
      discord: ''
    },
    appearance: {
      theme: 'system',
      primaryColor: '#8B5CF6',
      borderRadius: '0.75rem',
      layoutMode: 'boxed'
    },
    aiDefaults: {
      defaultModel: 'gpt-4o',
      defaultTemperature: 0.7,
      maxTokens: 2000,
      freeCreditsDaily: 5
    },
    systemStatus: 'operational',
    statusText: '',
    checkoutBenefits: [],
    moneyBackDays: 0,
    trustBadges: [],
    socialProofStats: [],
  });

  useEffect(() => {
    async function loadAll() {
      try {
        const [configSnap, pagesSnap, contentSnap] = await Promise.all([
          getDoc(doc(db, 'configs', 'global')),
          getDocs(collection(db, 'site_pages')),
          getDocs(collection(db, 'site_content'))
        ]);

        if (configSnap.exists()) {
          const data = configSnap.data();
          setConfig((prev: any) => ({
            ...prev,
            ...data,
            socials: { ...prev.socials, ...(data.socials || {}) },
            appearance: { ...prev.appearance, ...(data.appearance || {}) },
            aiDefaults: { ...prev.aiDefaults, ...(data.aiDefaults || {}) }
          }));
        }

        const fetchedPages = pagesSnap.docs.map(d => ({ id: d.id, ...d.data() } as SitePage));
        setPages(fetchedPages);

        const contentMap: any = {};
        contentSnap.docs.forEach(d => { contentMap[d.id] = d.data(); });
        setSiteContent((prev: any) => ({
          ...prev,
          terms: contentMap.terms?.content || '',
          privacy: contentMap.privacy?.content || '',
          dmca: contentMap.dmca?.content || '',
          cookies: contentMap.cookies?.content || '',
          faq: contentMap.faq?.categories || [],
          onboarding: contentMap.onboarding || { interests: [], models: [], welcome: { headline: '', description: '' } },
        }));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, []);

  const handleSaveContent = async (id: string) => {
    setSavingContent(true);
    try {
      let data;
      if (id === 'faq') {
        data = { categories: siteContent.faq };
      } else if (id === 'onboarding') {
        data = { ...siteContent.onboarding, updatedAt: serverTimestamp() };
      } else {
        data = { content: siteContent[id], updatedAt: serverTimestamp() };
      }
      
      await setDoc(doc(db, 'site_content', id), data);
      toast.success(`${id.toUpperCase()} updated successfully`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update content');
    } finally {
      setSavingContent(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'configs', 'global'), {
        ...config,
        updatedAt: serverTimestamp()
      });
      await refreshConfig();
      logAuditEvent({ action: 'settings.updated', entityType: 'config', entityId: 'global' });
      toast.success('System parameters synchronized!');
    } catch (err) {
      console.error(err);
      toast.error('Sync failed');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePage = async () => {
    if (!editingPage?.id) return;
    setSavingPage(true);
    try {
      await setDoc(doc(db, 'site_pages', editingPage.id), editingPage);
      toast.success(`${editingPage.id.toUpperCase()} metadata saved!`);
      const snap = await getDocs(collection(db, 'site_pages'));
      setPages(snap.docs.map(d => ({ id: d.id, ...d.data() } as SitePage)));
      setEditingPage(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save page SEO");
    } finally {
      setSavingPage(false);
    }
  };

  const tabs = [
    { id: 'general', label: 'Platform Info', icon: Info },
    { id: 'branding', label: 'Branding', icon: Image },
    { id: 'auth', label: 'Authentication', icon: UserPlus },
    { id: 'ai', label: 'AI Engine', icon: Sparkles },
    { id: 'contact', label: 'Contact', icon: Phone },
    { id: 'social', label: 'Social', icon: Share2 },
    { id: 'regional', label: 'Regional', icon: Globe },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'email', label: 'Email/SMTP', icon: Mail },
    { id: 'content', label: 'Pages & Content', icon: Layout },
    { id: 'payment', label: 'Payments', icon: CreditCard },
    { id: 'marketing', label: 'Marketing', icon: Target },
    { id: 'seo', label: 'SEO/Analytics', icon: Search },
    { id: 'security', label: 'System Control', icon: Shield },
    { id: 'advanced', label: 'Advanced/API', icon: Code },
  ];

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-muted-foreground font-semibold tracking-[0.4em] animate-pulse">Synchronizing Neural Core...</div>
    </div>
  );

  return (
    <div className="pb-24">
      <AdminPageHeader
        label="Configuration"
        labelIcon={Settings}
        title="Global Settings"
        subtitle="Fine-tune your platform's operational parameters, branding, and core logic."
        actions={
          <Button
            onClick={handleSave}
            isLoading={saving}
            variant="primary"
            leftIcon={Save}
            size="sm"
            className="rounded-xl shadow-lg shadow-primary/20"
          >
            Sync Config
          </Button>
        }
      />

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tab Navigation */}
        <div className="lg:w-64 shrink-0">
          <div className="bg-card rounded-2xl border border-border p-3 shadow-sm space-y-1 sticky top-24">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={cn(
                    "flex items-center cursor-pointer gap-3 w-full px-4 py-3 rounded-xl text-[14px] font-semibold tracking-widest transition-all",
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-grow">
          <div className="h-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {activeTab === 'general' && (
              <div className="space-y-6">
                <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
                  <div className="px-8 py-5 border-b border-border bg-muted/10 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <Layout className="w-4 h-4" />
                    </div>
                    <h3 className="font-semibold text-lg text-foreground">Platform Identity</h3>
                  </div>
                  <div className="p-8 space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <Input
                        label="Platform Name"
                        value={config.siteName}
                        onChange={e => setConfig({ ...config, siteName: e.target.value })}
                        variant="outline"
                        placeholder="e.g. Promptly"
                      />
                      <Input
                        label="Tagline"
                        value={config.siteTagline}
                        onChange={e => setConfig({ ...config, siteTagline: e.target.value })}
                        variant="outline"
                        placeholder="Expert AI Prompt Marketplace"
                      />
                    </div>
                    <Textarea
                      label="Global Meta Description"
                      value={config.siteDescription}
                      onChange={e => setConfig({ ...config, siteDescription: e.target.value })}
                      variant="outline"
                      rows={3}
                      placeholder="Default description for search engines..."
                    />
                    <div className="grid md:grid-cols-2 gap-6">
                      <Select
                        label="System Status (shown in footer)"
                        value={config.systemStatus || 'operational'}
                        onChange={e => setConfig({ ...config, systemStatus: e.target.value })}
                        options={[
                          { value: 'operational', label: '✅ All Systems Operational' },
                          { value: 'degraded',    label: '⚠️ Partial Outage' },
                          { value: 'outage',      label: '🔴 Service Disruption' },
                        ]}
                      />
                      <Input
                        label="Status Text Override (optional)"
                        value={config.statusText || ''}
                        onChange={e => setConfig({ ...config, statusText: e.target.value })}
                        variant="outline"
                        placeholder="e.g. Scheduled maintenance at 2am UTC"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground mb-1">Checkout Unlock Benefits</p>
                      <p className="text-xs text-muted-foreground mb-2">Bullet points shown on the checkout page. One per line.</p>
                      <Textarea
                        label=""
                        value={(config.checkoutBenefits || []).join('\n')}
                        onChange={e => setConfig({ ...config, checkoutBenefits: e.target.value.split('\n').filter(Boolean) })}
                        variant="outline"
                        rows={5}
                        placeholder={"5,000+ expert-engineered AI prompts\nCopy, save & organize unlimited prompts\nNew prompts added every week"}
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <Input
                        label="Money-Back Guarantee (days, 0 to hide)"
                        id="moneyBackDays"
                        name="moneyBackDays"
                        type="number"
                        value={config.moneyBackDays ?? 0}
                        onChange={e => setConfig({ ...config, moneyBackDays: parseInt(e.target.value) || 0 })}
                        variant="outline"
                        placeholder="e.g. 7"
                      />
                      <div />
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-foreground mb-1">Trust Badges (Pricing Page)</p>
                      <p className="text-xs text-muted-foreground mb-2">One label per line. Leave empty to use defaults.</p>
                      <Textarea
                        label=""
                        value={(config.trustBadges || []).map((b: any) => b.label || b).join('\n')}
                        onChange={e => setConfig({ ...config, trustBadges: e.target.value.split('\n').filter(Boolean).map(l => ({ label: l })) })}
                        variant="outline"
                        rows={3}
                        placeholder={"Secure Bank-Level Payments\nCashfree & PayPal Support\nInstant Access After Payment"}
                      />
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-foreground mb-1">Social Proof Stats (Landing Page)</p>
                      <p className="text-xs text-muted-foreground mb-2">Format: <code className="bg-muted px-1 rounded text-xs">12,000+ | Expert Prompts</code> — one per line.</p>
                      <Textarea
                        label=""
                        value={(config.socialProofStats || []).map((s: any) => `${s.value} | ${s.label}`).join('\n')}
                        onChange={e => setConfig({
                          ...config,
                          socialProofStats: e.target.value.split('\n').filter(Boolean).map(line => {
                            const [value, label] = line.split('|').map(s => s.trim());
                            return { value: value || '', label: label || '' };
                          })
                        })}
                        variant="outline"
                        rows={4}
                        placeholder={"12,000+ | Expert Prompts\n5,000+ | Active Users\n20+ | Categories\n4.9★ | Average Rating"}
                      />
                    </div>

                    {/* Custom UI Messages */}
                    <div className="border-t border-border pt-6 space-y-4">
                      <div>
                        <p className="text-sm font-bold text-foreground mb-0.5">Custom UI Messages</p>
                        <p className="text-xs text-muted-foreground mb-4">Override the default toast/error messages shown to users. Leave blank to use defaults.</p>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <Input
                          label="Sign-in prompt (unlock)"
                          placeholder="Sign in to unlock prompts"
                          value={(config as any).msgSignInToUnlock || ''}
                          onChange={e => setConfig({ ...config, msgSignInToUnlock: e.target.value } as any)}
                          variant="outline"
                        />
                        <Input
                          label="Out of credits message"
                          placeholder="Out of credits — upgrade to Pro"
                          value={(config as any).msgOutOfCredits || ''}
                          onChange={e => setConfig({ ...config, msgOutOfCredits: e.target.value } as any)}
                          variant="outline"
                        />
                        <Input
                          label="Prompt unlocked success"
                          placeholder="Prompt unlocked!"
                          value={(config as any).msgPromptUnlocked || ''}
                          onChange={e => setConfig({ ...config, msgPromptUnlocked: e.target.value } as any)}
                          variant="outline"
                        />
                        <Input
                          label="Unlock failed error"
                          placeholder="Failed to unlock — try again"
                          value={(config as any).msgUnlockFailed || ''}
                          onChange={e => setConfig({ ...config, msgUnlockFailed: e.target.value } as any)}
                          variant="outline"
                        />
                        <Input
                          label="Low credit nudge threshold"
                          type="number"
                          placeholder="5"
                          helperText="Send a nudge email when credits drop at or below this value."
                          value={(config as any).lowCreditThreshold ?? ''}
                          onChange={e => setConfig({ ...config, lowCreditThreshold: e.target.value ? parseInt(e.target.value) : undefined } as any)}
                          variant="outline"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'branding' && (
              <div className="space-y-6">
                <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
                  <div className="px-8 py-5 border-b border-border bg-muted/10 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <Image className="w-4 h-4" />
                    </div>
                    <h3 className="font-semibold text-lg text-foreground">Brand Assets</h3>
                  </div>
                  <div className="p-8 space-y-12">
                    <div className="grid md:grid-cols-2 gap-12">
                      <ImageUpload
                        label="Logo (Light Mode)"
                        value={config.logoLight}
                        onChange={val => setConfig({ ...config, logoLight: val })}
                        helpText="Visible on dark backgrounds."
                        aspectRatio="any"
                        folder="branding"
                      />
                      <ImageUpload
                        label="Logo (Dark Mode)"
                        value={config.logoDark}
                        onChange={val => setConfig({ ...config, logoDark: val })}
                        helpText="Visible on light backgrounds."
                        aspectRatio="any"
                        folder="branding"
                      />
                      <ImageUpload
                        label="Default OG Image"
                        value={config.ogImage}
                        onChange={val => setConfig({ ...config, ogImage: val })}
                        helpText="Used for social shares by default."
                        aspectRatio="video"
                        folder="branding"
                      />
                      <ImageUpload
                        label="Favicon / Icon"
                        value={config.favicon}
                        onChange={val => setConfig({ ...config, favicon: val })}
                        helpText="Platform favicon and browser icon."
                        aspectRatio="square"
                        folder="branding"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'auth' && (
              <div className="space-y-6">
                <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
                  <div className="px-8 py-5 border-b border-border bg-muted/10 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <UserPlus className="w-4 h-4" />
                    </div>
                    <h3 className="font-semibold text-lg text-foreground">User Access Policy</h3>
                  </div>
                  <div className="p-8 grid md:grid-cols-2 gap-6">
                    <div className="flex items-center justify-between p-5 bg-muted/20 rounded-2xl border border-border">
                      <div>
                        <p className="text-sm font-semibold tracking-wider text-foreground">Allow Registration</p>
                        <p className="text-xs text-muted-foreground font-medium mt-0.5">Toggle public signups.</p>
                      </div>
                      <Button
                        onClick={() => setConfig({ ...config, allowRegistration: !config.allowRegistration })}
                        variant={config.allowRegistration ? 'success' : 'outline'}
                        size="sm"
                        className="rounded-xl px-4"
                      >
                        {config.allowRegistration ? 'Active' : 'Locked'}
                      </Button>
                    </div>
                    <div className="flex items-center justify-between p-5 bg-muted/20 rounded-2xl border border-border">
                      <div>
                        <p className="text-sm font-semibold tracking-wider text-foreground">Email Verification</p>
                        <p className="text-xs text-muted-foreground font-medium mt-0.5">Require account validation.</p>
                      </div>
                      <Button
                        onClick={() => setConfig({ ...config, requireEmailVerification: !config.requireEmailVerification })}
                        variant={config.requireEmailVerification ? 'success' : 'outline'}
                        size="sm"
                        className="rounded-xl px-4"
                      >
                        {config.requireEmailVerification ? 'Enabled' : 'Disabled'}
                      </Button>
                    </div>
                    <div className="flex items-center justify-between p-5 bg-muted/20 rounded-2xl border border-border">
                      <div>
                        <p className="text-sm font-semibold tracking-wider text-foreground">Social Auth</p>
                        <p className="text-xs text-muted-foreground font-medium mt-0.5">Enable Google/GitHub login.</p>
                      </div>
                      <Button
                        onClick={() => setConfig({ ...config, enableSocialLogin: !config.enableSocialLogin })}
                        variant={config.enableSocialLogin ? 'success' : 'outline'}
                        size="sm"
                        className="rounded-xl px-4"
                      >
                        {config.enableSocialLogin ? 'Enabled' : 'Disabled'}
                      </Button>
                    </div>
                    <Select
                      label="New User Role"
                      value={config.defaultUserRole}
                      onChange={val => setConfig({ ...config, defaultUserRole: val })}
                      options={[
                        { label: 'Customer (Buyer)', value: 'user' },
                        { label: 'Creator (Seller)', value: 'creator' }
                      ]}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="space-y-6">
                <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
                  <div className="px-8 py-5 border-b border-border bg-muted/10 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <h3 className="font-semibold text-lg text-foreground">AI Intelligence Defaults</h3>
                  </div>
                  <div className="p-8 grid md:grid-cols-2 gap-6">
                    <Select
                      label="Default LLM Model"
                      value={config.aiDefaults.defaultModel}
                      onChange={val => setConfig({ ...config, aiDefaults: { ...config.aiDefaults, defaultModel: val }})}
                      options={[
                        { label: 'GPT-4o (Omni)', value: 'gpt-4o' },
                        { label: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet' },
                        { label: 'GPT-4 Turbo', value: 'gpt-4-turbo' }
                      ]}
                    />
                    <Input
                      label="Daily Free Credits"
                      type="number"
                      value={config.aiDefaults.freeCreditsDaily}
                      onChange={e => setConfig({ ...config, aiDefaults: { ...config.aiDefaults, freeCreditsDaily: Number(e.target.value) }})}
                      variant="outline"
                    />
                    <Input
                      label="Default Temperature"
                      type="number"
                      step="0.1"
                      value={config.aiDefaults.defaultTemperature}
                      onChange={e => setConfig({ ...config, aiDefaults: { ...config.aiDefaults, defaultTemperature: Number(e.target.value) }})}
                      variant="outline"
                    />
                    <Input
                      label="Max Tokens per Run"
                      type="number"
                      value={config.aiDefaults.maxTokens}
                      onChange={e => setConfig({ ...config, aiDefaults: { ...config.aiDefaults, maxTokens: Number(e.target.value) }})}
                      variant="outline"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'seo' && (
              <div className="space-y-8">
                {/* Analytics & Scripts */}
                <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
                  <div className="px-8 py-5 border-b border-border bg-muted/10 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <BarChart className="w-4 h-4" />
                    </div>
                    <h3 className="font-semibold text-lg text-foreground">Tracking & Custom Scripts</h3>
                  </div>
                  <div className="p-8 space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <Input
                        label="Google Analytics 4 ID"
                        value={config.googleAnalyticsId}
                        onChange={e => setConfig({ ...config, googleAnalyticsId: e.target.value })}
                        variant="outline"
                        placeholder="G-XXXXXXXXXX"
                      />
                      <Input
                        label="Facebook Pixel ID"
                        value={config.facebookPixelId}
                        onChange={e => setConfig({ ...config, facebookPixelId: e.target.value })}
                        variant="outline"
                        placeholder="1234567890"
                      />
                    </div>
                    <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-border">
                      <Textarea
                        label="Global Header Scripts"
                        value={config.customHeadScripts}
                        onChange={e => setConfig({ ...config, customHeadScripts: e.target.value })}
                        variant="outline"
                        rows={5}
                        placeholder="<script>...</script>"
                        helperText="Injected into <head>."
                      />
                      <Textarea
                        label="Global Footer Scripts"
                        value={config.customFooterScripts}
                        onChange={e => setConfig({ ...config, customFooterScripts: e.target.value })}
                        variant="outline"
                        rows={5}
                        placeholder="<script>...</script>"
                        helperText="Injected before </body>."
                      />
                    </div>
                  </div>
                </div>

                {/* Site Pages SEO */}
                <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
                  <div className="px-8 py-5 border-b border-border bg-muted/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <Globe className="w-4 h-4" />
                      </div>
                      <h3 className="font-semibold text-lg text-foreground">Route-Specific SEO</h3>
                    </div>
                    <Button
                      onClick={() => setEditingPage({ id: '', path: '', title: '', description: '' })}
                      variant="outline"
                      size="sm"
                      leftIcon={Plus}
                      className="rounded-xl font-bold"
                    >
                      Custom Page
                    </Button>
                  </div>

                  <div className="p-8">
                    <div className="space-y-8">
                      {/* Page Selection Dropdown */}
                      <div className="flex flex-col md:flex-row items-end gap-4">
                        <div className="flex-grow">
                          <Select
                            label="Select Route to Configure"
                            placeholder="Choose a site page..."
                            value={editingPage?.id || ""}
                            onChange={(val) => {
                              const page = pages.find(p => p.id === val) || defaultPages.find(dp => dp.id === val);
                              setEditingPage(page || null);
                            }}
                            options={[
                              ...(editingPage && !pages.find(p => p.id === editingPage.id) && !defaultPages.find(dp => dp.id === editingPage.id) ? [{
                                label: `NEW: ${editingPage.id || 'Untitled'}`,
                                value: editingPage.id,
                                description: 'Draft Route',
                                icon: Plus
                              }] : []),
                              ...defaultPages.map(dp => ({
                                label: `${dp.id.toUpperCase()} (${dp.path})`,
                                value: dp.id,
                                description: pages.find(p => p.id === dp.id) ? 'Configured' : 'Using Defaults',
                                icon: Globe
                              })),
                              ...pages.filter(p => !defaultPages.find(dp => dp.id === p.id)).map(p => ({
                                label: `${p.id.toUpperCase()} (${p.path})`,
                                value: p.id,
                                description: 'Custom Route',
                                icon: Plus
                              }))
                            ]}
                          />
                        </div>
                        {editingPage?.id && !defaultPages.find(dp => dp.id === editingPage.id) && pages.find(p => p.id === editingPage.id) && (
                          <Button
                            variant="danger"
                            size="sm"
                            className="rounded-xl h-11 px-6 font-bold"
                            leftIcon={Trash2}
                            onClick={() => {
                              if(confirm('Delete custom page SEO?')) {
                                deleteDoc(doc(db, 'site_pages', editingPage.id)).then(() => {
                                  setPages(pages.filter(pg => pg.id !== editingPage.id));
                                  setEditingPage(null);
                                  toast.success('Route SEO deleted');
                                });
                              }
                            }}
                          >
                            Delete Route
                          </Button>
                        )}
                      </div>

                      {/* Edit Area */}
                        {editingPage ? (
                          <div className="space-y-8">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                  <Target className="w-5 h-5" />
                                </div>
                                <div>
                                  <h4 className="text-sm font-bold text-foreground">Configure SEO Metadata</h4>
                                  <p className="text-xs text-muted-foreground font-medium">/{editingPage.id || 'new-route'}</p>
                                </div>
                              </div>
                              <a
                                href={editingPage.path}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 px-4 py-2 bg-muted/50 border border-border rounded-xl text-xs font-bold hover:text-primary transition-colors"
                              >
                                View Page <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>

                            <div className="grid md:grid-cols-2 gap-8">
                              <Input
                                label="Route ID"
                                value={editingPage.id}
                                onChange={e => setEditingPage({...editingPage, id: e.target.value})}
                                variant="outline"
                                placeholder="e.g. explore"
                                helperText="Machine-readable identifier."
                              />
                              <Input
                                label="Route Path"
                                value={editingPage.path}
                                onChange={e => setEditingPage({...editingPage, path: e.target.value})}
                                variant="outline"
                                placeholder="e.g. /explore"
                                helperText="Relative URL path of the page."
                              />
                            </div>

                            <div className="space-y-6 pt-4 border-t border-border/50">
                              <Input
                                label="Meta Title"
                                value={editingPage.title}
                                onChange={e => setEditingPage({...editingPage, title: e.target.value})}
                                variant="outline"
                                placeholder="SEO Optimized Page Title"
                              />
                              <Textarea
                                label="Meta Description"
                                value={editingPage.description}
                                onChange={e => setEditingPage({...editingPage, description: e.target.value})}
                                variant="outline"
                                rows={4}
                                placeholder="Search engine snippet (max 160 characters)..."
                              />
                              <TagInput
                                label="Keywords"
                                tags={editingPage.keywords ? editingPage.keywords.split(',').map(k => k.trim()).filter(Boolean) : []}
                                onChange={tags => setEditingPage({...editingPage, keywords: tags.join(', ')})}
                                placeholder="Add keyword and press enter..."
                                helperText="Search engine keywords (comma-separated internally)."
                              />

                              <div className="grid md:grid-cols-1 gap-6">
                                <ImageUpload
                                  label="Social Sharing (OG Image)"
                                  value={editingPage.ogImage || ''}
                                  onChange={val => setEditingPage({...editingPage, ogImage: val})}
                                  aspectRatio="video"
                                  folder="seo"
                                  helpText="Custom preview image for social media links."
                                />
                              </div>

                              <div className="pt-8">
                                <Button
                                  onClick={handleSavePage}
                                  isLoading={savingPage}
                                  variant="primary"
                                  fullWidth
                                  size="lg"
                                  className="rounded-2xl h-14 font-bold text-sm shadow-xl shadow-primary/20"
                                  leftIcon={Save}
                                >
                                  Update SEO Configuration
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="h-[400px] border-2 border-dashed border-border rounded-[2.5rem] flex flex-col items-center justify-center p-12 text-center bg-muted/5">
                            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground/30 mb-6">
                              <Search className="w-8 h-8" />
                            </div>
                            <h5 className="text-sm font-bold text-foreground mb-2">Select a Route to Begin</h5>
                            <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                              Choose a page from the dropdown above to audit and refine its meta tags, tracking scripts, and social presence.
                            </p>
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'contact' && (
              <div className="space-y-6">
                <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
                  <div className="px-8 py-5 border-b border-border bg-muted/10 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <Phone className="w-4 h-4" />
                    </div>
                    <h3 className="font-semibold text-lg text-foreground">Communication Channels</h3>
                  </div>
                  <div className="p-8 space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <Input label="Support Email" value={config.supportEmail} onChange={e => setConfig({...config, supportEmail: e.target.value})} variant="outline" leftIcon={Mail} />
                      <Input label="Public Phone" value={config.contactPhone} onChange={e => setConfig({...config, contactPhone: e.target.value})} variant="outline" leftIcon={Phone} />
                      <Input label="WhatsApp" value={config.whatsapp} onChange={e => setConfig({...config, whatsapp: e.target.value})} variant="outline" leftIcon={MessageSquare} />
                    </div>
                    <Textarea label="Business HQ Address" value={config.businessAddress} onChange={e => setConfig({...config, businessAddress: e.target.value})} variant="outline" rows={3} />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'social' && (
              <div className="space-y-6">
                <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
                  <div className="px-8 py-5 border-b border-border bg-muted/10 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <Share2 className="w-4 h-4" />
                    </div>
                    <h3 className="font-semibold text-lg text-foreground">Social Presence</h3>
                  </div>
                  <div className="p-8 grid md:grid-cols-2 gap-6">
                    <Input label="X (Twitter)" value={config.socials.twitter} onChange={e => setConfig({...config, socials: {...config.socials, twitter: e.target.value}})} variant="outline" />
                    <Input label="Facebook" value={config.socials.facebook} onChange={e => setConfig({...config, socials: {...config.socials, facebook: e.target.value}})} variant="outline" />
                    <Input label="Instagram" value={config.socials.instagram} onChange={e => setConfig({...config, socials: {...config.socials, instagram: e.target.value}})} variant="outline" />
                    <Input label="LinkedIn" value={config.socials.linkedin} onChange={e => setConfig({...config, socials: {...config.socials, linkedin: e.target.value}})} variant="outline" />
                    <Input label="GitHub" value={config.socials.github} onChange={e => setConfig({...config, socials: {...config.socials, github: e.target.value}})} variant="outline" />
                    <Input label="YouTube" value={config.socials.youtube} onChange={e => setConfig({...config, socials: {...config.socials, youtube: e.target.value}})} variant="outline" />
                    <Input label="Discord" value={config.socials.discord} onChange={e => setConfig({...config, socials: {...config.socials, discord: e.target.value}})} variant="outline" />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'regional' && (
              <div className="space-y-6">
                <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
                  <div className="px-8 py-5 border-b border-border bg-muted/10 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <Globe className="w-4 h-4" />
                    </div>
                    <h3 className="font-semibold text-lg text-foreground">Localization & Regional</h3>
                  </div>
                  <div className="p-8 grid md:grid-cols-2 gap-6">
                    <Select
                      label="Primary Language"
                      value={config.defaultLanguage}
                      onChange={val => setConfig({...config, defaultLanguage: val})}
                      options={[{ label: 'English (US)', value: 'en' }, { label: 'Hindi', value: 'hi' }, { label: 'Spanish', value: 'es' }]}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <Select
                        label="Currency"
                        value={config.currency}
                        onChange={val => setConfig({...config, currency: val})}
                        options={[{ label: 'USD', value: 'USD' }, { label: 'EUR', value: 'EUR' }, { label: 'INR', value: 'INR' }]}
                      />
                      <Input label="Symbol" value={config.currencySymbol} onChange={e => setConfig({...config, currencySymbol: e.target.value})} variant="outline" />
                    </div>
                    <Select
                      label="Timezone"
                      value={config.timezone}
                      onChange={val => setConfig({...config, timezone: val})}
                      options={[{ label: 'UTC', value: 'UTC' }, { label: 'IST', value: 'Asia/Kolkata' }, { label: 'EST', value: 'America/New_York' }]}
                    />
                    <Input label="Tax Rate (%)" type="number" value={config.taxRate} onChange={e => setConfig({...config, taxRate: Number(e.target.value)})} variant="outline" />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'content' && (
              <AdminContentSettings 
                siteContent={siteContent}
                setSiteContent={setSiteContent}
                onSave={handleSaveContent}
                isSaving={savingContent}
              />
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
                  <div className="px-8 py-5 border-b border-border bg-muted/10 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <Palette className="w-4 h-4" />
                    </div>
                    <h3 className="font-semibold text-lg text-foreground">Visual Style</h3>
                  </div>
                  <div className="p-8 grid md:grid-cols-2 gap-6">
                    <Select
                      label="Theme Default"
                      value={config.appearance.theme}
                      onChange={val => setConfig({...config, appearance: {...config.appearance, theme: val}})}
                      options={[{ label: 'System', value: 'system' }, { label: 'Light', value: 'light' }, { label: 'Dark', value: 'dark' }]}
                    />
                    <Input
                      label="Primary Brand Color"
                      type="color"
                      value={config.appearance.primaryColor}
                      onChange={e => setConfig({...config, appearance: {...config.appearance, primaryColor: e.target.value}})}
                      variant="outline"
                      className="h-11"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
                  <div className="px-8 py-5 border-b border-border bg-muted/10 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <Shield className="w-4 h-4" />
                    </div>
                    <h3 className="font-semibold text-lg text-foreground">Platform Governance</h3>
                  </div>
                  <div className="p-8 space-y-6">
                    <div className="flex items-center justify-between p-6 bg-rose-500/5 rounded-3xl border border-rose-500/20">
                      <div>
                        <p className="text-[11px] font-semibold tracking-widest text-rose-600">Maintenance Mode</p>
                        <p className="text-[10px] text-rose-500/60 font-medium mt-1">Restrict public access globally.</p>
                      </div>
                      <Button
                        onClick={() => setConfig({ ...config, maintenanceMode: !config.maintenanceMode })}
                        variant={config.maintenanceMode ? 'danger' : 'outline'}
                        size="sm"
                        className="rounded-2xl px-8"
                      >
                        {config.maintenanceMode ? 'System Locked' : 'Platform Live'}
                      </Button>
                    </div>
                    {config.maintenanceMode && (
                      <Textarea
                        label="Maintenance Messaging"
                        value={config.maintenanceMessage}
                        onChange={e => setConfig({ ...config, maintenanceMessage: e.target.value })}
                        variant="outline"
                        rows={3}
                        placeholder="Explain the downtime to your users..."
                      />
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'email' && <AdminEmailSettings />}
            {activeTab === 'payment' && <AdminPaymentSettings />}
            {activeTab === 'marketing' && <AdminMarketingSettings />}
            {activeTab === 'assets' && <AdminAssetManager />}

            {activeTab === 'advanced' && (
              <div className="bg-card border border-border rounded-3xl p-10 shadow-sm">
                <Alert variant="error" title="Critical Engine Access" className="mb-8">
                  Mutating these parameters can disrupt core delivery pipelines and API authentication.
                </Alert>
                <div className="flex items-center justify-between p-6 bg-muted/20 rounded-3xl border border-border">
                  <div>
                    <p className="font-semibold text-xs tracking-widest text-rose-600">Flush Global Cache</p>
                    <p className="text-[10px] text-muted-foreground font-medium mt-1">Reset CDN states and serialized data clusters.</p>
                  </div>
                  <Button variant="danger" size="sm" className="rounded-2xl">Execute Purge</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
