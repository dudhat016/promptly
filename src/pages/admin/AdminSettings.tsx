import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import {
  Save, Mail, Shield, Zap, Globe, AlertCircle, Settings,
  Search, Lock, Info, Terminal, Layout, CreditCard, Image, Target
} from 'lucide-react';
import { AdminPageHeader } from '../../components/admin';
import { logAuditEvent } from '../../lib/auditLog';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import Select from '../../components/ui/Select';
import AdminEmailSettings from './AdminEmailSettings';
import AdminAssetManager from './AdminAssetManager';
import AdminPaymentSettings from './AdminPaymentSettings';
import AdminMarketingSettings from './AdminMarketingSettings';

type TabType = 'general' | 'email' | 'payment' | 'marketing' | 'assets' | 'seo' | 'security' | 'advanced';

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [generalConfig, setGeneralConfig] = useState({
    siteName: 'Promptly',
    siteTagline: 'Professional AI Prompt Marketplace',
    supportEmail: 'support@techworldproduct.com',
    businessAddress: '',
    currency: 'USD',
    taxRate: 0,
    maintenanceMode: false
  });

  useEffect(() => {
    async function loadConfig() {
      try {
        const docSnap = await getDoc(doc(db, 'configs', 'global'));
        if (docSnap.exists()) {
          setGeneralConfig(prev => ({ ...prev, ...docSnap.data() }));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, []);

  const handleSaveGeneral = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'configs', 'global'), {
        ...generalConfig,
        updatedAt: serverTimestamp()
      });
      logAuditEvent({ action: 'settings.updated', entityType: 'config', entityId: 'global' });
      toast.success('General settings updated!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Info },
    { id: 'email', label: 'Email & SMTP', icon: Mail },
    { id: 'payment', label: 'Payments', icon: CreditCard },
    { id: 'marketing', label: 'Marketing & Ads', icon: Target },
    { id: 'assets', label: 'Asset Vault', icon: Image },
    { id: 'seo', label: 'Default SEO', icon: Search },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'advanced', label: 'Advanced', icon: Terminal },
  ];

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-muted-foreground font-bold uppercase tracking-[0.3em] animate-pulse">Loading Platform Engine...</div>
    </div>
  );

  return (
    <div>
      <AdminPageHeader
        label="System"
        labelIcon={Settings}
        title="Global Settings"
        subtitle="Configure your platform's core engine and delivery systems."
        actions={
          activeTab === 'general' ? (
            <button onClick={handleSaveGeneral} disabled={saving} className="btn-primary">
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          ) : undefined
        }
      />

      <div className="flex flex-col lg:flex-row gap-10">
        {/* Tab Navigation */}
        <div className="lg:w-64 shrink-0">
          <div className="bg-card rounded-lg border border-border p-4 shadow-sm space-y-2 sticky top-10">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-grow">
          <AnimatePresence mode="wait">
            {activeTab === 'general' && (
              <motion.div
                key="general"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="card p-6">
                  <h3 className="section-title mb-5">
                    <Layout className="w-4 h-4 text-primary" />
                    Identity & Branding
                  </h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-5">
                      <div>
                        <label htmlFor="siteName" className="block text-xs font-bold uppercase text-muted-foreground mb-2 ml-1">Platform Name</label>
                        <input 
                          id="siteName"
                          name="siteName"
                          type="text"
                          value={generalConfig.siteName}
                          onChange={e => setGeneralConfig({ ...generalConfig, siteName: e.target.value })}
                          className="select"
                        />
                      </div>
                      <div>
                        <label htmlFor="supportEmail" className="block text-xs font-bold uppercase text-muted-foreground mb-2 ml-1">Support Email</label>
                        <input 
                          id="supportEmail"
                          name="supportEmail"
                          type="email"
                          value={generalConfig.supportEmail}
                          onChange={e => setGeneralConfig({ ...generalConfig, supportEmail: e.target.value })}
                          className="select"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="siteTagline" className="block text-xs font-bold uppercase text-muted-foreground mb-2 ml-1">Platform Tagline</label>
                      <textarea 
                        id="siteTagline"
                        name="siteTagline"
                        value={generalConfig.siteTagline}
                        onChange={e => setGeneralConfig({ ...generalConfig, siteTagline: e.target.value })}
                        className="w-full bg-muted/50 border border-border rounded-md px-3 py-2.5 focus:bg-card focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all text-sm h-[148px] resize-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="card p-6">
                  <h3 className="section-title mb-5">
                    <CreditCard className="w-4 h-4 text-primary" />
                    Commerce & Billing
                  </h3>
                  <div className="grid md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-xs font-bold uppercase text-muted-foreground mb-2 ml-1">Default Currency</label>
                      <Select
                        id="currency"
                        name="currency"
                        value={generalConfig.currency}
                        onChange={val => setGeneralConfig({ ...generalConfig, currency: val })}
                        options={[
                          { label: 'USD ($)', value: 'USD', description: 'United States Dollar' },
                          { label: 'EUR (â‚¬)', value: 'EUR', description: 'Euro' },
                          { label: 'GBP (Â£)', value: 'GBP', description: 'British Pound' },
                          { label: 'INR (â‚¹)', value: 'INR', description: 'Indian Rupee' }
                        ]}
                        isSearchable={false}
                      />
                    </div>
                    <div>
                      <label htmlFor="taxRate" className="block text-xs font-bold uppercase text-muted-foreground mb-2 ml-1">Base Tax Rate (%)</label>
                      <input 
                        id="taxRate"
                        name="taxRate"
                        type="number"
                        value={generalConfig.taxRate}
                        onChange={e => setGeneralConfig({ ...generalConfig, taxRate: Number(e.target.value) })}
                        className="select"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-muted-foreground mb-2 ml-1">Maintenance Mode</label>
                      <button
                        onClick={() => setGeneralConfig({ ...generalConfig, maintenanceMode: !generalConfig.maintenanceMode })}
                        className={`w-full p-4 rounded-md border transition-all font-bold flex items-center justify-center gap-2 ${
                          generalConfig.maintenanceMode 
                            ? 'bg-amber-50 border-amber-200 text-amber-700' 
                            : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full animate-pulse ${generalConfig.maintenanceMode ? 'bg-amber-600' : 'bg-emerald-600'}`} />
                        {generalConfig.maintenanceMode ? 'System Offline' : 'System Online'}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'email' && (
              <motion.div
                key="email"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <AdminEmailSettings />
              </motion.div>
            )}

            {activeTab === 'payment' && (
              <motion.div
                key="payment"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <AdminPaymentSettings />
              </motion.div>
            )}

            {activeTab === 'marketing' && (
              <motion.div
                key="marketing"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <AdminMarketingSettings />
              </motion.div>
            )}

            {activeTab === 'assets' && (
              <motion.div
                key="assets"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <AdminAssetManager />
              </motion.div>
            )}

            {activeTab === 'seo' && (
              <motion.div
                key="seo"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-card rounded-lg border border-border p-6 shadow-sm text-center py-24"
              >
                <Search className="w-16 h-16 text-muted-foreground/20 mx-auto mb-6" />
                <h3 className="text-base font-semibold text-foreground mb-2">SEO Module Integration</h3>
                <p className="text-muted-foreground max-w-sm mx-auto">Default metadata and OG image generation settings are being migrated to this central hub.</p>
              </motion.div>
            )}

            {activeTab === 'security' && (
              <motion.div
                key="security"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-card rounded-lg border border-border p-6 shadow-sm text-center py-24"
              >
                <Lock className="w-16 h-16 text-muted-foreground/20 mx-auto mb-6" />
                <h3 className="text-base font-semibold text-foreground mb-2">Security & Access</h3>
                <p className="text-muted-foreground max-w-sm mx-auto">Configure IP whitelisting, session timeouts, and two-factor authentication requirements.</p>
              </motion.div>
            )}

            {activeTab === 'advanced' && (
              <motion.div
                key="advanced"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="card p-6"
              >
                <div className="flex items-center gap-4 p-6 bg-rose-500/10 border border-rose-500/20 rounded-lg mb-8">
                  <AlertCircle className="w-10 h-10 text-rose-600 shrink-0" />
                  <div>
                    <h4 className="font-bold text-rose-600">Danger Zone</h4>
                    <p className="text-rose-500 text-sm font-medium">These settings can break your platform if configured incorrectly. Proceed with caution.</p>
                  </div>
                </div>
                <div className="space-y-5">
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-md border border-border">
                    <div>
                      <p className="font-bold text-foreground">Clear System Cache</p>
                      <p className="text-xs text-muted-foreground font-medium">Force clear all CDN and local interest profiles.</p>
                    </div>
                    <button className="px-4 py-2 bg-card border border-border rounded-md text-xs font-bold hover:bg-muted transition-all">Execute</button>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-md border border-border opacity-50">
                    <div>
                      <p className="font-bold text-foreground">Developer Mode</p>
                      <p className="text-xs text-muted-foreground font-medium">Enable verbose logging and React DevTools in production.</p>
                    </div>
                    <div className="w-12 h-6 bg-muted-foreground/30 rounded-full relative cursor-not-allowed">
                      <div className="absolute left-1 top-1 w-4 h-4 bg-card rounded-full" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
