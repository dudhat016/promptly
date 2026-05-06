import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { 
  Save, Mail, Shield, Zap, Globe, AlertCircle, Settings, 
  Search, Lock, Info, Terminal, Layout, CreditCard, Image, Target
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
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
      <div className="text-slate-500 font-black uppercase tracking-[0.3em] animate-pulse">Loading Platform Engine...</div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-4">
            <div className="bg-indigo-600 p-2.5 rounded-2xl shadow-xl shadow-indigo-200">
              <Settings className="w-8 h-8 text-white" />
            </div>
            Global Settings
          </h2>
          <p className="text-slate-500 mt-2 font-medium text-lg">Configure your platform's core engine and delivery systems.</p>
        </div>
        
        {activeTab === 'general' && (
          <button 
            onClick={handleSaveGeneral}
            disabled={saving}
            className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Saving Changes...' : 'Save All Changes'}
          </button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-10">
        {/* Tab Navigation */}
        <div className="lg:w-64 shrink-0">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 p-4 shadow-sm space-y-2 sticky top-10">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-bold transition-all ${
                    activeTab === tab.id 
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
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
                <div className="bg-white rounded-[3rem] border border-slate-100 p-10 shadow-sm">
                  <h3 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-3">
                    <Layout className="w-6 h-6 text-indigo-600" />
                    Identity & Branding
                  </h3>
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div>
                        <label className="block text-xs font-black uppercase text-slate-400 mb-2 ml-1">Platform Name</label>
                        <input 
                          type="text"
                          value={generalConfig.siteName}
                          onChange={e => setGeneralConfig({ ...generalConfig, siteName: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 focus:bg-white focus:border-indigo-600 transition-all font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black uppercase text-slate-400 mb-2 ml-1">Support Email</label>
                        <input 
                          type="email"
                          value={generalConfig.supportEmail}
                          onChange={e => setGeneralConfig({ ...generalConfig, supportEmail: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 focus:bg-white focus:border-indigo-600 transition-all font-bold"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase text-slate-400 mb-2 ml-1">Platform Tagline</label>
                      <textarea 
                        value={generalConfig.siteTagline}
                        onChange={e => setGeneralConfig({ ...generalConfig, siteTagline: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 focus:bg-white focus:border-indigo-600 transition-all font-bold h-[148px] resize-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-[3rem] border border-slate-100 p-10 shadow-sm">
                  <h3 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-3">
                    <CreditCard className="w-6 h-6 text-indigo-600" />
                    Commerce & Billing
                  </h3>
                  <div className="grid md:grid-cols-3 gap-8">
                    <div>
                      <label className="block text-xs font-black uppercase text-slate-400 mb-2 ml-1">Default Currency</label>
                      <select 
                        value={generalConfig.currency}
                        onChange={e => setGeneralConfig({ ...generalConfig, currency: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 focus:bg-white focus:border-indigo-600 transition-all font-bold"
                      >
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="INR">INR (₹)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase text-slate-400 mb-2 ml-1">Base Tax Rate (%)</label>
                      <input 
                        type="number"
                        value={generalConfig.taxRate}
                        onChange={e => setGeneralConfig({ ...generalConfig, taxRate: Number(e.target.value) })}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 focus:bg-white focus:border-indigo-600 transition-all font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase text-slate-400 mb-2 ml-1">Maintenance Mode</label>
                      <button
                        onClick={() => setGeneralConfig({ ...generalConfig, maintenanceMode: !generalConfig.maintenanceMode })}
                        className={`w-full p-4 rounded-2xl border transition-all font-bold flex items-center justify-center gap-2 ${
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
                className="bg-white rounded-[3rem] border border-slate-100 p-10 shadow-sm text-center py-24"
              >
                <Search className="w-16 h-16 text-slate-200 mx-auto mb-6" />
                <h3 className="text-xl font-black text-slate-900 mb-2">SEO Module Integration</h3>
                <p className="text-slate-500 max-w-sm mx-auto">Default metadata and OG image generation settings are being migrated to this central hub.</p>
              </motion.div>
            )}

            {activeTab === 'security' && (
              <motion.div
                key="security"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white rounded-[3rem] border border-slate-100 p-10 shadow-sm text-center py-24"
              >
                <Lock className="w-16 h-16 text-slate-200 mx-auto mb-6" />
                <h3 className="text-xl font-black text-slate-900 mb-2">Security & Access</h3>
                <p className="text-slate-500 max-w-sm mx-auto">Configure IP whitelisting, session timeouts, and two-factor authentication requirements.</p>
              </motion.div>
            )}

            {activeTab === 'advanced' && (
              <motion.div
                key="advanced"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white rounded-[3rem] border border-slate-100 p-10 shadow-sm"
              >
                <div className="flex items-center gap-4 p-6 bg-rose-50 border border-rose-100 rounded-3xl mb-8">
                  <AlertCircle className="w-10 h-10 text-rose-600 shrink-0" />
                  <div>
                    <h4 className="font-black text-rose-900">Danger Zone</h4>
                    <p className="text-rose-700 text-sm font-medium">These settings can break your platform if configured incorrectly. Proceed with caution.</p>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div>
                      <p className="font-black text-slate-900">Clear System Cache</p>
                      <p className="text-xs text-slate-500 font-medium">Force clear all CDN and local interest profiles.</p>
                    </div>
                    <button className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black hover:bg-slate-100 transition-all">Execute</button>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 opacity-50">
                    <div>
                      <p className="font-black text-slate-900">Developer Mode</p>
                      <p className="text-xs text-slate-500 font-medium">Enable verbose logging and React DevTools in production.</p>
                    </div>
                    <div className="w-12 h-6 bg-slate-300 rounded-full relative cursor-not-allowed">
                      <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full" />
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
