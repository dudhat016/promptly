import { collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore';
import {
  BarChart, Bell,
  ExternalLink,
  Globe, HardDrive, Image,
  Link2, Lock, Mail, MessageSquare,
  Palette, Phone, Plus, Save, Search, Settings, Shield,
  Sparkles, Target, Trash2, UserPlus, Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useParams } from 'react-router-dom';
import { AdminPageHeader } from '../../components/admin';
import ImageUpload from '../../components/admin/ImageUpload';
import Alert from '../../components/feedback/Alert';
import Button from '../../components/primitives/Button';
import CardPrimitive from '../../components/primitives/Card';
import Input from '../../components/primitives/Input';
import Select from '../../components/primitives/Select';
import TagInput from '../../components/primitives/TagInput';
import Textarea from '../../components/primitives/Textarea';
import { useConfig } from '../../hooks/useConfig';
import { logAuditEvent } from '../../lib/auditLog';
import { db } from '../../lib/firebase';
import AdminContentSettings from './AdminContentSettings';
import AdminEmailSettings from './AdminEmailSettings';
import AdminPaymentSettings from './AdminPaymentSettings';

type TabType = 'general' | 'branding' | 'auth' | 'ai' | 'email' | 'payments' | 'content' | 'security';

interface SitePage {
  id: string;
  title: string;
  description: string;
  keywords: string;
  ogImage: string;
  canonical: string;
  path: string;
}

// ── Aliases: old sub-paths redirect to the new consolidated tab ───────────────
const TAB_ALIASES: Record<string, TabType> = {
  appearance: 'branding',
  contact:    'general',
  social:     'general',
  regional:   'general',
  seo:        'content',
  advanced:   'security',
  payment:    'payments',
  assets:     'security',
};

// ── Card wrapper ──────────────────────────────────────────────────────────────
function Card({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <CardPrimitive padding="none" className="!rounded-3xl shadow-sm">
      <CardPrimitive.Header title={
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Icon className="w-4 h-4" />
          </div>
          <h3 className="font-semibold text-lg text-foreground">{title}</h3>
        </div>
      } />
      <CardPrimitive.Body>{children}</CardPrimitive.Body>
    </CardPrimitive>
  );
}

// ── Toggle row ────────────────────────────────────────────────────────────────
function ToggleRow({ label, description, value, onToggle, activeLabel = 'Enabled', inactiveLabel = 'Disabled' }: {
  label: string; description: string; value: boolean;
  onToggle: () => void; activeLabel?: string; inactiveLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between p-5 bg-muted/20 rounded-2xl border border-border">
      <div>
        <p className="text-sm font-semibold tracking-wider text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground font-medium mt-0.5">{description}</p>
      </div>
      <Button onClick={onToggle} variant={value ? 'success' : 'outline'} size="sm" className="rounded-xl px-4 shrink-0">
        {value ? activeLabel : inactiveLabel}
      </Button>
    </div>
  );
}

export default function AdminSettings() {
  const { '*': subPath } = useParams();
  const [activeTab, setActiveTab] = useState<TabType>('general');

  useEffect(() => {
    const raw = subPath?.split('/')[0] ?? '';
    const tab = (TAB_ALIASES[raw] ?? raw) as TabType;
    setActiveTab(['general','branding','auth','ai','email','payments','content','security'].includes(tab) ? tab : 'general');
  }, [subPath]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { config: liveConfig, refreshConfig } = useConfig();

  // Site Pages SEO state
  const [pages, setPages] = useState<SitePage[]>([]);
  const [editingPage, setEditingPage] = useState<Partial<SitePage> | null>(null);
  const [savingPage, setSavingPage] = useState(false);

  // Site Content state
  const [siteContent, setSiteContent] = useState<any>({ terms: '', privacy: '', dmca: '', cookies: '', faq: [] });
  const [savingContent, setSavingContent] = useState(false);

  const defaultPages = [
    { id: 'home',    path: '/',        title: 'Promptly - Master AI Prompting' },
    { id: 'explore', path: '/explore', title: 'Explore AI Prompts' },
    { id: 'pricing', path: '/pricing', title: 'Pricing Plans' },
    { id: 'blog',    path: '/blog',    title: 'AI Prompting Blog' },
    { id: 'contact', path: '/contact', title: 'Contact Us' },
  ];

  const [config, setConfig] = useState<any>({
    // ── Identity ──
    siteName: 'Promptly',
    siteTagline: 'Professional AI Prompt Marketplace',
    siteDescription: '',
    siteUrl: '',
    // ── Status ──
    systemStatus: 'operational',
    statusText: '',
    // ── Contact ──
    supportEmail: 'support@techworldproduct.com',
    contactPhone: '',
    whatsapp: '',
    businessAddress: '',
    // ── Social ──
    socials: { twitter: '', facebook: '', instagram: '', linkedin: '', github: '', youtube: '', discord: '' },
    // ── Regional ──
    currency: 'USD',
    currencySymbol: '$',
    currencyFormat: 'before',
    timezone: 'UTC',
    defaultLanguage: 'en',
    taxRate: 0,
    // ── Checkout & Trust ──
    checkoutBenefits: [],
    moneyBackDays: 0,
    trustBadges: [],
    socialProofStats: [],
    // ── Custom messages ──
    msgSignInToUnlock: '',
    msgOutOfCredits: '',
    msgPromptUnlocked: '',
    msgUnlockFailed: '',
    lowCreditThreshold: '',
    // ── Admin notifications ──
    adminNotify: { newUser: true, newOrder: true, newTicket: false, failedPayment: true },
    // ── Branding ──
    logoLight: '',
    logoDark: '',
    favicon: '',
    projectIcon: '',
    ogImage: '',
    appearance: { theme: 'system', primaryColor: '#8B5CF6' },
    // ── Auth ──
    allowRegistration: true,
    requireEmailVerification: false,
    enableSocialLogin: true,
    defaultUserRole: 'user',
    sessionTimeout: 0,
    maxLoginAttempts: 5,
    // ── AI ──
    aiDefaults: { defaultModel: 'gpt-4o', defaultTemperature: 0.7, maxTokens: 2000, freeCreditsDaily: 5 },
    // ── SEO / Analytics ──
    googleAnalyticsId: '',
    facebookPixelId: '',
    customHeadScripts: '',
    customFooterScripts: '',
    // ── Security / Compliance ──
    maintenanceMode: false,
    maintenanceMessage: '',
    cookieConsent: false,
    cookieConsentText: 'We use cookies to improve your experience and analyse site traffic.',
    gdprMode: false,
    webhookUrl: '',
    // ── Storage & Uploads ──
    storage: { maxImageSizeMb: 2, promptImageRatio: '16:9' },
  });

  useEffect(() => {
    async function loadAll() {
      try {
        const [configSnap, pagesSnap, contentSnap] = await Promise.all([
          getDoc(doc(db, 'configs', 'global')),
          getDocs(collection(db, 'site_pages')),
          getDocs(collection(db, 'site_content')),
        ]);
        if (configSnap.exists()) {
          const data = configSnap.data();
          setConfig((prev: any) => ({
            ...prev,
            ...data,
            socials:    { ...prev.socials,    ...(data.socials    ?? {}) },
            appearance: { ...prev.appearance, ...(data.appearance ?? {}) },
            aiDefaults: { ...prev.aiDefaults, ...(data.aiDefaults ?? {}) },
            adminNotify:{ ...prev.adminNotify,...(data.adminNotify ?? {}) },
            storage:    { ...prev.storage,    ...(data.storage    ?? {}) },
          }));
        }
        setPages(pagesSnap.docs.map(d => ({ id: d.id, ...d.data() } as SitePage)));
        const cm: any = {};
        contentSnap.docs.forEach(d => { cm[d.id] = d.data(); });
        setSiteContent((prev: any) => ({
          ...prev,
          terms:      cm.terms?.content    || '',
          privacy:    cm.privacy?.content  || '',
          dmca:       cm.dmca?.content     || '',
          cookies:    cm.cookies?.content  || '',
          faq:        cm.faq?.categories   || [],
          onboarding: cm.onboarding        || { interests: [], models: [], welcome: { headline: '', description: '' } },
        }));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'configs', 'global'), { ...config, updatedAt: serverTimestamp() });
      await refreshConfig();
      logAuditEvent({ action: 'settings.updated', entityType: 'config', entityId: 'global' });
      toast.success('Settings saved!');
    } catch (err) {
      console.error(err);
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveContent = async (id: string) => {
    setSavingContent(true);
    try {
      let data: any;
      if (id === 'faq')        data = { categories: siteContent.faq };
      else if (id === 'onboarding') data = { ...siteContent.onboarding, updatedAt: serverTimestamp() };
      else                     data = { content: siteContent[id], updatedAt: serverTimestamp() };
      await setDoc(doc(db, 'site_content', id), data);
      toast.success('Content saved');
    } catch { toast.error('Failed to save content'); }
    finally { setSavingContent(false); }
  };

  const handleSavePage = async () => {
    if (!editingPage?.id) return;
    setSavingPage(true);
    try {
      await setDoc(doc(db, 'site_pages', editingPage.id), editingPage);
      toast.success('Page SEO saved');
      const snap = await getDocs(collection(db, 'site_pages'));
      setPages(snap.docs.map(d => ({ id: d.id, ...d.data() } as SitePage)));
      setEditingPage(null);
    } catch { toast.error('Failed to save page SEO'); }
    finally { setSavingPage(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-muted-foreground font-semibold tracking-[0.4em] animate-pulse">Loading settings…</div>
    </div>
  );

  return (
    <div>
      <AdminPageHeader
        label="Configuration"
        labelIcon={Settings}
        title="Global Settings"
        subtitle="Configure your platform identity, branding, payments, and compliance."
        actions={
          <Button onClick={handleSave} isLoading={saving} variant="primary" leftIcon={Save} size="sm" className="rounded-xl shadow-lg shadow-primary/20">
            Save Changes
          </Button>
        }
      />

      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* ── GENERAL ──────────────────────────────────────────── */}
        {activeTab === 'general' && (
          <div className="space-y-6">

            <Card icon={Globe} title="Platform Identity">
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <Input label="Platform Name" value={config.siteName} onChange={e => setConfig({ ...config, siteName: e.target.value })} variant="outline" placeholder="Promptly" />
                  <Input label="Tagline" value={config.siteTagline} onChange={e => setConfig({ ...config, siteTagline: e.target.value })} variant="outline" placeholder="Expert AI Prompt Marketplace" />
                </div>
                <Textarea label="Global Meta Description" value={config.siteDescription} onChange={e => setConfig({ ...config, siteDescription: e.target.value })} variant="outline" rows={2} placeholder="Default description for search engines…" />
                <div className="grid md:grid-cols-2 gap-6">
                  <Input label="Site URL" value={config.siteUrl} onChange={e => setConfig({ ...config, siteUrl: e.target.value })} variant="outline" placeholder="https://promptly.com" />
                  <Select
                    label="System Status"
                    value={config.systemStatus || 'operational'}
                    onChange={e => setConfig({ ...config, systemStatus: e.target.value })}
                    options={[
                      { value: 'operational', label: '✅ All Systems Operational' },
                      { value: 'degraded',    label: '⚠️ Partial Outage' },
                      { value: 'outage',      label: '🔴 Service Disruption' },
                    ]}
                  />
                </div>
                <Input label="Status Text Override" value={config.statusText || ''} onChange={e => setConfig({ ...config, statusText: e.target.value })} variant="outline" placeholder="e.g. Scheduled maintenance at 2am UTC" />
              </div>
            </Card>

            <Card icon={Phone} title="Contact & Social">
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <Input label="Support Email" value={config.supportEmail} onChange={e => setConfig({ ...config, supportEmail: e.target.value })} variant="outline" leftIcon={Mail} />
                  <Input label="Public Phone" value={config.contactPhone} onChange={e => setConfig({ ...config, contactPhone: e.target.value })} variant="outline" leftIcon={Phone} />
                  <Input label="WhatsApp" value={config.whatsapp} onChange={e => setConfig({ ...config, whatsapp: e.target.value })} variant="outline" leftIcon={MessageSquare} />
                </div>
                <Textarea label="Business Address" value={config.businessAddress} onChange={e => setConfig({ ...config, businessAddress: e.target.value })} variant="outline" rows={2} />
                <div className="border-t border-border pt-6">
                  <p className="text-sm font-semibold text-foreground mb-4">Social Links</p>
                  <div className="grid md:grid-cols-2 gap-4">
                    {(['twitter','facebook','instagram','linkedin','github','youtube','discord'] as const).map(key => (
                      <Input key={key} label={key.charAt(0).toUpperCase() + key.slice(1)} value={config.socials[key]} onChange={e => setConfig({ ...config, socials: { ...config.socials, [key]: e.target.value } })} variant="outline" placeholder={`https://${key}.com/…`} />
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            <Card icon={Globe} title="Regional & Localization">
              <div className="grid md:grid-cols-2 gap-6">
                <Select label="Primary Language" value={config.defaultLanguage} onChange={val => setConfig({ ...config, defaultLanguage: val })} options={[{ label: 'English (US)', value: 'en' }, { label: 'Hindi', value: 'hi' }, { label: 'Spanish', value: 'es' }]} />
                <Select label="Timezone" value={config.timezone} onChange={val => setConfig({ ...config, timezone: val })} options={[{ label: 'UTC', value: 'UTC' }, { label: 'IST (India)', value: 'Asia/Kolkata' }, { label: 'EST (US East)', value: 'America/New_York' }, { label: 'PST (US West)', value: 'America/Los_Angeles' }]} />
                <div className="grid grid-cols-2 gap-4">
                  <Select label="Currency" value={config.currency} onChange={val => setConfig({ ...config, currency: val })} options={[{ label: 'USD ($)', value: 'USD' }, { label: 'EUR (€)', value: 'EUR' }, { label: 'GBP (£)', value: 'GBP' }, { label: 'INR (₹)', value: 'INR' }]} />
                  <Input label="Symbol" value={config.currencySymbol} onChange={e => setConfig({ ...config, currencySymbol: e.target.value })} variant="outline" />
                </div>
              </div>
            </Card>

            <Card icon={Target} title="Checkout & Trust Signals">
              <div className="space-y-6">
                <div>
                  <p className="text-sm font-semibold text-foreground mb-1">Checkout Unlock Benefits</p>
                  <p className="text-xs text-muted-foreground mb-2">One benefit per line — shown on the checkout page.</p>
                  <Textarea label="" value={(config.checkoutBenefits || []).join('\n')} onChange={e => setConfig({ ...config, checkoutBenefits: e.target.value.split('\n').filter(Boolean) })} variant="outline" rows={4} placeholder={"5,000+ expert-engineered AI prompts\nCopy, save & organise unlimited prompts\nNew prompts added every week"} />
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <Input label="Money-Back Guarantee (days, 0 to hide)" type="number" value={config.moneyBackDays ?? 0} onChange={e => setConfig({ ...config, moneyBackDays: parseInt(e.target.value) || 0 })} variant="outline" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground mb-1">Trust Badges</p>
                  <p className="text-xs text-muted-foreground mb-2">One label per line — shown on the pricing page.</p>
                  <Textarea label="" value={(config.trustBadges || []).map((b: any) => b.label || b).join('\n')} onChange={e => setConfig({ ...config, trustBadges: e.target.value.split('\n').filter(Boolean).map(l => ({ label: l })) })} variant="outline" rows={3} placeholder={"Secure Bank-Level Payments\nCashfree & PayPal Support\nInstant Access After Payment"} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground mb-1">Social Proof Stats</p>
                  <p className="text-xs text-muted-foreground mb-2">Format: <code className="bg-muted px-1 rounded text-xs">12,000+ | Expert Prompts</code> — one per line.</p>
                  <Textarea label="" value={(config.socialProofStats || []).map((s: any) => `${s.value} | ${s.label}`).join('\n')} onChange={e => setConfig({ ...config, socialProofStats: e.target.value.split('\n').filter(Boolean).map(line => { const [value, label] = line.split('|').map((s: string) => s.trim()); return { value: value || '', label: label || '' }; }) })} variant="outline" rows={4} placeholder={"12,000+ | Expert Prompts\n5,000+ | Active Users\n20+ | Categories\n4.9★ | Average Rating"} />
                </div>
              </div>
            </Card>

            <Card icon={MessageSquare} title="Custom UI Messages">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground mb-4">Override default toast and error messages shown to users. Leave blank to use defaults.</p>
                <div className="grid md:grid-cols-2 gap-4">
                  <Input label="Sign-in prompt (unlock)" placeholder="Sign in to unlock prompts" value={config.msgSignInToUnlock || ''} onChange={e => setConfig({ ...config, msgSignInToUnlock: e.target.value })} variant="outline" />
                  <Input label="Out of credits message" placeholder="Out of credits — upgrade to Pro" value={config.msgOutOfCredits || ''} onChange={e => setConfig({ ...config, msgOutOfCredits: e.target.value })} variant="outline" />
                  <Input label="Prompt unlocked success" placeholder="Prompt unlocked!" value={config.msgPromptUnlocked || ''} onChange={e => setConfig({ ...config, msgPromptUnlocked: e.target.value })} variant="outline" />
                  <Input label="Unlock failed error" placeholder="Failed to unlock — try again" value={config.msgUnlockFailed || ''} onChange={e => setConfig({ ...config, msgUnlockFailed: e.target.value })} variant="outline" />
                  <Input label="Low credit nudge threshold" type="number" placeholder="5" helperText="Send a nudge email when credits drop to or below this." value={config.lowCreditThreshold ?? ''} onChange={e => setConfig({ ...config, lowCreditThreshold: e.target.value ? parseInt(e.target.value) : undefined })} variant="outline" />
                </div>
              </div>
            </Card>

            <Card icon={Bell} title="Admin Notifications">
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground mb-4">Send an email to the support address when any of these events occur.</p>
                <div className="grid md:grid-cols-2 gap-3">
                  <ToggleRow label="New User Signup" description="Notify when a new account is created." value={config.adminNotify?.newUser ?? true} onToggle={() => setConfig({ ...config, adminNotify: { ...config.adminNotify, newUser: !config.adminNotify?.newUser } })} />
                  <ToggleRow label="New Order / Purchase" description="Notify on every successful payment." value={config.adminNotify?.newOrder ?? true} onToggle={() => setConfig({ ...config, adminNotify: { ...config.adminNotify, newOrder: !config.adminNotify?.newOrder } })} />
                  <ToggleRow label="New Support Ticket" description="Notify when a user opens a ticket." value={config.adminNotify?.newTicket ?? false} onToggle={() => setConfig({ ...config, adminNotify: { ...config.adminNotify, newTicket: !config.adminNotify?.newTicket } })} />
                  <ToggleRow label="Failed Payment" description="Notify on dunning / payment failure events." value={config.adminNotify?.failedPayment ?? true} onToggle={() => setConfig({ ...config, adminNotify: { ...config.adminNotify, failedPayment: !config.adminNotify?.failedPayment } })} />
                </div>
              </div>
            </Card>

          </div>
        )}

        {/* ── BRANDING ─────────────────────────────────────────── */}
        {activeTab === 'branding' && (
          <div className="space-y-6">
            <Card icon={Image} title="Brand Assets">
              <div className="grid md:grid-cols-2 gap-12">
                <ImageUpload label="Logo (Light Mode)" value={config.logoLight} onChange={val => setConfig({ ...config, logoLight: val })} helpText="Visible on dark backgrounds." aspectRatio="any" folder="branding" />
                <ImageUpload label="Logo (Dark Mode)" value={config.logoDark} onChange={val => setConfig({ ...config, logoDark: val })} helpText="Visible on light backgrounds." aspectRatio="any" folder="branding" />
                <ImageUpload label="Default OG / Social Image" value={config.ogImage} onChange={val => setConfig({ ...config, ogImage: val })} helpText="Used when sharing links on social media." aspectRatio="video" folder="branding" />
                <ImageUpload label="Favicon / Browser Icon" value={config.favicon} onChange={val => setConfig({ ...config, favicon: val })} helpText="Shown in browser tabs and bookmarks." aspectRatio="square" folder="branding" />
              </div>
            </Card>

            <Card icon={Palette} title="Visual Style">
              <div className="grid md:grid-cols-2 gap-6">
                <Select
                  label="Default Theme"
                  value={config.appearance.theme}
                  onChange={val => setConfig({ ...config, appearance: { ...config.appearance, theme: val } })}
                  options={[{ label: 'System (auto)', value: 'system' }, { label: 'Light', value: 'light' }, { label: 'Dark', value: 'dark' }]}
                />
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Primary Brand Color</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={config.appearance.primaryColor} onChange={e => setConfig({ ...config, appearance: { ...config.appearance, primaryColor: e.target.value } })} className="w-11 h-11 rounded-xl border border-border cursor-pointer bg-transparent" />
                    <Input label="" value={config.appearance.primaryColor} onChange={e => setConfig({ ...config, appearance: { ...config.appearance, primaryColor: e.target.value } })} variant="outline" placeholder="#8B5CF6" />
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ── USERS & AUTH ─────────────────────────────────────── */}
        {activeTab === 'auth' && (
          <div className="space-y-6">
            <Card icon={UserPlus} title="User Access Policy">
              <div className="grid md:grid-cols-2 gap-4">
                <ToggleRow label="Allow Registration" description="Toggle public signups on or off." value={config.allowRegistration} onToggle={() => setConfig({ ...config, allowRegistration: !config.allowRegistration })} activeLabel="Open" inactiveLabel="Closed" />
                <ToggleRow label="Email Verification" description="Require users to verify their email." value={config.requireEmailVerification} onToggle={() => setConfig({ ...config, requireEmailVerification: !config.requireEmailVerification })} />
                <ToggleRow label="Social Auth (Google / GitHub)" description="Enable OAuth sign-in methods." value={config.enableSocialLogin} onToggle={() => setConfig({ ...config, enableSocialLogin: !config.enableSocialLogin })} />
                <Select label="Default Role for New Users" value={config.defaultUserRole} onChange={val => setConfig({ ...config, defaultUserRole: val })} options={[{ label: 'Customer (Buyer)', value: 'user' }, { label: 'Creator (Seller)', value: 'creator' }]} />
              </div>
            </Card>

            <Card icon={Lock} title="Session & Login Security">
              <div className="grid md:grid-cols-2 gap-6">
                <Input
                  label="Session Timeout (minutes, 0 = never)"
                  type="number"
                  value={config.sessionTimeout ?? 0}
                  onChange={e => setConfig({ ...config, sessionTimeout: parseInt(e.target.value) || 0 })}
                  variant="outline"
                  helperText="Auto-sign-out inactive users after this period."
                  placeholder="0"
                />
                <Input
                  label="Max Login Attempts before Lockout"
                  type="number"
                  value={config.maxLoginAttempts ?? 5}
                  onChange={e => setConfig({ ...config, maxLoginAttempts: parseInt(e.target.value) || 5 })}
                  variant="outline"
                  helperText="Set to 0 to disable lockout."
                  placeholder="5"
                />
              </div>
            </Card>
          </div>
        )}

        {/* ── EMAIL / SMTP ──────────────────────────────────────── */}
        {activeTab === 'email' && <AdminEmailSettings />}

        {/* ── PAYMENTS ─────────────────────────────────────────── */}
        {activeTab === 'payments' && <AdminPaymentSettings />}

        {/* ── AI ENGINE ────────────────────────────────────────── */}
        {activeTab === 'ai' && (
          <Card icon={Sparkles} title="AI Intelligence Defaults">
            <div className="grid md:grid-cols-2 gap-6">
              <Select
                label="Default LLM Model"
                value={config.aiDefaults.defaultModel}
                onChange={val => setConfig({ ...config, aiDefaults: { ...config.aiDefaults, defaultModel: val } })}
                options={[
                  { label: 'GPT-4o (Omni)',        value: 'gpt-4o' },
                  { label: 'GPT-4 Turbo',          value: 'gpt-4-turbo' },
                  { label: 'Claude 3.5 Sonnet',    value: 'claude-3-5-sonnet' },
                  { label: 'Claude 3 Haiku',       value: 'claude-3-haiku' },
                  { label: 'Gemini 1.5 Pro',       value: 'gemini-1.5-pro' },
                ]}
              />
              <Input label="Daily Free Credits per User" type="number" value={config.aiDefaults.freeCreditsDaily} onChange={e => setConfig({ ...config, aiDefaults: { ...config.aiDefaults, freeCreditsDaily: Number(e.target.value) } })} variant="outline" />
              <Input label="Default Temperature (0–2)" type="number" step="0.1" min="0" max="2" value={config.aiDefaults.defaultTemperature} onChange={e => setConfig({ ...config, aiDefaults: { ...config.aiDefaults, defaultTemperature: Number(e.target.value) } })} variant="outline" />
              <Input label="Max Output Tokens per Run" type="number" value={config.aiDefaults.maxTokens} onChange={e => setConfig({ ...config, aiDefaults: { ...config.aiDefaults, maxTokens: Number(e.target.value) } })} variant="outline" />
            </div>
          </Card>
        )}

        {/* ── CONTENT & SEO ────────────────────────────────────── */}
        {activeTab === 'content' && (
          <div className="space-y-6">
            <AdminContentSettings siteContent={siteContent} setSiteContent={setSiteContent} onSave={handleSaveContent} isSaving={savingContent} />

            <Card icon={BarChart} title="Analytics & Tracking Scripts">
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <Input label="Google Analytics 4 ID" value={config.googleAnalyticsId} onChange={e => setConfig({ ...config, googleAnalyticsId: e.target.value })} variant="outline" placeholder="G-XXXXXXXXXX" />
                  <Input label="Facebook / Meta Pixel ID" value={config.facebookPixelId} onChange={e => setConfig({ ...config, facebookPixelId: e.target.value })} variant="outline" placeholder="1234567890" />
                </div>
                <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-border">
                  <Textarea label="Global Header Scripts" value={config.customHeadScripts} onChange={e => setConfig({ ...config, customHeadScripts: e.target.value })} variant="outline" rows={5} placeholder="<script>…</script>" helperText="Injected into <head> on every page." />
                  <Textarea label="Global Footer Scripts" value={config.customFooterScripts} onChange={e => setConfig({ ...config, customFooterScripts: e.target.value })} variant="outline" rows={5} placeholder="<script>…</script>" helperText="Injected before </body> on every page." />
                </div>
              </div>
            </Card>

            <Card icon={Search} title="Route-Specific SEO">
              <div className="space-y-8">
                <div className="flex flex-col md:flex-row items-end gap-4">
                  <div className="flex-grow">
                    <Select
                      label="Select Route to Configure"
                      placeholder="Choose a site page…"
                      value={editingPage?.id || ''}
                      onChange={val => {
                        const page = pages.find(p => p.id === val) || defaultPages.find(dp => dp.id === val);
                        setEditingPage(page || null);
                      }}
                      options={[
                        ...(editingPage && !pages.find(p => p.id === editingPage.id) && !defaultPages.find(dp => dp.id === editingPage.id)
                          ? [{ label: `NEW: ${editingPage.id || 'Untitled'}`, value: editingPage.id, description: 'Draft Route', icon: Plus }]
                          : []),
                        ...defaultPages.map(dp => ({
                          label: `${dp.id.toUpperCase()} (${dp.path})`,
                          value: dp.id,
                          description: pages.find(p => p.id === dp.id) ? 'Configured' : 'Using Defaults',
                          icon: Globe,
                        })),
                        ...pages.filter(p => !defaultPages.find(dp => dp.id === p.id)).map(p => ({
                          label: `${p.id.toUpperCase()} (${p.path})`,
                          value: p.id,
                          description: 'Custom Route',
                          icon: Plus,
                        })),
                      ]}
                    />
                  </div>
                  <Button onClick={() => setEditingPage({ id: '', path: '', title: '', description: '' })} variant="outline" size="sm" leftIcon={Plus} className="rounded-xl font-bold">
                    Add Custom Route
                  </Button>
                  {editingPage?.id && !defaultPages.find(dp => dp.id === editingPage.id) && pages.find(p => p.id === editingPage.id) && (
                    <Button variant="danger" size="sm" className="rounded-xl font-bold" leftIcon={Trash2}
                      onClick={() => { if (confirm('Delete custom route SEO?')) { deleteDoc(doc(db, 'site_pages', editingPage.id)).then(() => { setPages(pages.filter(pg => pg.id !== editingPage.id)); setEditingPage(null); toast.success('Deleted'); }); } }}>
                      Delete
                    </Button>
                  )}
                </div>

                {editingPage ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><Target className="w-4 h-4" /></div>
                        <div>
                          <h4 className="text-sm font-bold text-foreground">SEO Metadata</h4>
                          <p className="text-xs text-muted-foreground">/{editingPage.id || 'new-route'}</p>
                        </div>
                      </div>
                      {editingPage.path && (
                        <a href={editingPage.path} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 border border-border rounded-xl text-xs font-bold hover:text-primary transition-colors">
                          View Page <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                      <Input label="Route ID" value={editingPage.id} onChange={e => setEditingPage({ ...editingPage, id: e.target.value })} variant="outline" placeholder="e.g. explore" helperText="Machine-readable identifier." />
                      <Input label="Route Path" value={editingPage.path} onChange={e => setEditingPage({ ...editingPage, path: e.target.value })} variant="outline" placeholder="/explore" />
                    </div>
                    <Input label="Meta Title" value={editingPage.title} onChange={e => setEditingPage({ ...editingPage, title: e.target.value })} variant="outline" placeholder="SEO Optimized Page Title" />
                    <Textarea label="Meta Description" value={editingPage.description} onChange={e => setEditingPage({ ...editingPage, description: e.target.value })} variant="outline" rows={3} placeholder="Search engine snippet (max 160 characters)…" />
                    <TagInput label="Keywords" tags={editingPage.keywords ? editingPage.keywords.split(',').map(k => k.trim()).filter(Boolean) : []} onChange={tags => setEditingPage({ ...editingPage, keywords: tags.join(', ') })} placeholder="Add keyword and press Enter…" helperText="Comma-separated internally." />
                    <ImageUpload label="Social Sharing Image (OG)" value={editingPage.ogImage || ''} onChange={val => setEditingPage({ ...editingPage, ogImage: val })} aspectRatio="video" folder="seo" helpText="Custom preview image for social links." />
                    <Button onClick={handleSavePage} isLoading={savingPage} variant="primary" fullWidth size="lg" className="rounded-2xl h-14 font-bold shadow-xl shadow-primary/20" leftIcon={Save}>
                      Save SEO Configuration
                    </Button>
                  </div>
                ) : (
                  <div className="h-56 border-2 border-dashed border-border rounded-3xl flex flex-col items-center justify-center text-center p-8 bg-muted/5">
                    <Search className="w-8 h-8 text-muted-foreground/30 mb-3" />
                    <p className="text-sm font-semibold text-foreground">Select a Route to Configure</p>
                    <p className="text-xs text-muted-foreground mt-1">Choose from the dropdown above or add a custom route.</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* ── SECURITY ─────────────────────────────────────────── */}
        {activeTab === 'security' && (
          <div className="space-y-6">

            <Card icon={Shield} title="Platform Governance">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-6 bg-rose-500/5 rounded-2xl border border-rose-500/20">
                  <div>
                    <p className="text-sm font-semibold tracking-wider text-rose-600">Maintenance Mode</p>
                    <p className="text-xs text-rose-500/60 font-medium mt-1">Lock the site to the public while you make updates.</p>
                  </div>
                  <Button onClick={() => setConfig({ ...config, maintenanceMode: !config.maintenanceMode })} variant={config.maintenanceMode ? 'danger' : 'outline'} size="sm" className="rounded-xl px-6 shrink-0">
                    {config.maintenanceMode ? 'Site Locked' : 'Site Live'}
                  </Button>
                </div>
                {config.maintenanceMode && (
                  <Textarea label="Maintenance Message" value={config.maintenanceMessage} onChange={e => setConfig({ ...config, maintenanceMessage: e.target.value })} variant="outline" rows={3} placeholder="We'll be back shortly…" />
                )}
              </div>
            </Card>

            <Card icon={Globe} title="Privacy & Compliance">
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <ToggleRow label="Cookie Consent Banner" description="Show a GDPR-compliant cookie notice to visitors." value={config.cookieConsent ?? false} onToggle={() => setConfig({ ...config, cookieConsent: !config.cookieConsent })} />
                  <ToggleRow label="GDPR / Privacy Mode" description="Anonymise IP addresses sent to analytics providers." value={config.gdprMode ?? false} onToggle={() => setConfig({ ...config, gdprMode: !config.gdprMode })} />
                </div>
                {config.cookieConsent && (
                  <Textarea label="Cookie Consent Message" value={config.cookieConsentText || ''} onChange={e => setConfig({ ...config, cookieConsentText: e.target.value })} variant="outline" rows={2} placeholder="We use cookies to improve your experience…" />
                )}
              </div>
            </Card>

            <Card icon={Link2} title="Webhooks & Integrations">
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">Send a POST request to an external URL whenever a key platform event fires (new user, new order, failed payment).</p>
                <Input label="Webhook Endpoint URL" value={config.webhookUrl || ''} onChange={e => setConfig({ ...config, webhookUrl: e.target.value })} variant="outline" placeholder="https://hooks.example.com/events" helperText="Must accept POST with JSON body. Leave blank to disable." />
              </div>
            </Card>

            <Card icon={HardDrive} title="Storage & Uploads">
              <div className="space-y-6">
                <p className="text-xs text-muted-foreground">
                  Control file upload limits across the platform. These limits apply to all image uploads (prompt covers, blog images, avatars, assets).
                </p>
                <div className="grid md:grid-cols-2 gap-6">
                  <Input
                    label="Max Image Upload Size (MB)"
                    type="number"
                    value={config.storage?.maxImageSizeMb ?? 2}
                    onChange={e => setConfig({ ...config, storage: { ...config.storage, maxImageSizeMb: Math.max(0.1, parseFloat(e.target.value) || 2) } })}
                    variant="outline"
                    helperText="Users will see an error if their image exceeds this size."
                    placeholder="2"
                  />
                </div>
                <div className="grid md:grid-cols-3 gap-3">
                  {[1, 2, 5].map(mb => (
                    <button
                      key={mb}
                      type="button"
                      onClick={() => setConfig({ ...config, storage: { ...config.storage, maxImageSizeMb: mb } })}
                      className={`py-2.5 rounded-xl border-2 text-xs font-bold uppercase tracking-wider transition-all ${
                        config.storage?.maxImageSizeMb === mb
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:border-primary/30'
                      }`}
                    >
                      {mb} MB
                    </button>
                  ))}
                </div>

                <div className="border-t border-border pt-6">
                  <p className="text-sm font-semibold text-foreground mb-1">Prompt Image Ratio</p>
                  <p className="text-xs text-muted-foreground mb-4">
                    All prompt cards on the marketplace will display images at this ratio. Images are shown without cropping — letterbox areas use the card background.
                  </p>
                  <div className="grid grid-cols-5 gap-2">
                    {(['1:1', '3:2', '4:3', '16:9', '9:16'] as const).map(ratio => {
                      const [w, h] = ratio.split(':').map(Number);
                      const pct = Math.round((h / w) * 100);
                      const active = (config.storage?.promptImageRatio ?? '16:9') === ratio;
                      return (
                        <button
                          key={ratio}
                          type="button"
                          onClick={() => setConfig({ ...config, storage: { ...config.storage, promptImageRatio: ratio } })}
                          className={`flex flex-col items-center gap-2 py-3 rounded-xl border-2 text-xs font-bold transition-all ${
                            active ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/30'
                          }`}
                        >
                          {/* Visual preview box */}
                          <div className="flex items-center justify-center w-10" style={{ height: 40 }}>
                            <div
                              className={`rounded border-2 ${active ? 'border-primary bg-primary/20' : 'border-muted-foreground/30 bg-muted/40'}`}
                              style={{
                                width:  w >= h ? 36 : Math.round(36 * w / h),
                                height: h >= w ? 36 : Math.round(36 * h / w),
                              }}
                            />
                          </div>
                          {ratio}
                          <span className="text-[9px] font-normal opacity-60">{pct}%</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Card>

            <Card icon={Zap} title="Advanced">
              <Alert variant="error" title="Danger Zone" className="mb-6">
                These actions affect live infrastructure and cannot be undone.
              </Alert>
              <div className="flex items-center justify-between p-5 bg-muted/20 rounded-2xl border border-border">
                <div>
                  <p className="font-semibold text-sm text-rose-600">Flush Global Cache</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Reset CDN states and serialised data clusters.</p>
                </div>
                <Button variant="danger" size="sm" className="rounded-xl shrink-0">Execute Purge</Button>
              </div>
            </Card>

          </div>
        )}

      </div>
    </div>
  );
}
