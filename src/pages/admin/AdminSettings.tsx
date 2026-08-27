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

type TabType = 'general' | 'branding' | 'auth' | 'email' | 'content' | 'security';

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
    setActiveTab(['general','branding','auth','email','content','security'].includes(tab) ? tab : 'general');
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
    adminNotify: { newUser: true, newTicket: false },
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
        subtitle="Configure your platform identity, branding, and compliance."
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
                  <Input label="Site URL" value={config.siteUrl} onChange={e => setConfig({ ...config, siteUrl: e.target.value })} variant="outline" placeholder="https://your-domain.com" />
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



            <Card icon={Bell} title="Admin Notifications">
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground mb-4">Send an email to the support address when any of these events occur.</p>
                <div className="grid md:grid-cols-2 gap-3">
                  <ToggleRow label="New User Signup" description="Notify when a new account is created." value={config.adminNotify?.newUser ?? true} onToggle={() => setConfig({ ...config, adminNotify: { ...config.adminNotify, newUser: !config.adminNotify?.newUser } })} />
                  <ToggleRow label="New Support Ticket" description="Notify when a user opens a ticket." value={config.adminNotify?.newTicket ?? false} onToggle={() => setConfig({ ...config, adminNotify: { ...config.adminNotify, newTicket: !config.adminNotify?.newTicket } })} />
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



        {/* ── CONTENT & SEO ────────────────────────────────────── */}
        {activeTab === 'content' && (
          <div className="space-y-6">
            <AdminContentSettings
              siteContent={siteContent}
              setSiteContent={setSiteContent}
              onSave={handleSaveContent}
              isSaving={savingContent}
              config={config}
              setConfig={setConfig}
              pages={pages}
              setPages={setPages}
              editingPage={editingPage}
              setEditingPage={setEditingPage}
              savingPage={savingPage}
              handleSavePage={handleSavePage}
              defaultPages={defaultPages}
            />
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
                <p className="text-xs text-muted-foreground">Send a POST request to an external URL whenever a key platform event fires (new user signup, new ticket, content report).</p>
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
