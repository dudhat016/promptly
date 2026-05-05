import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useImageUpload } from '../hooks/useImageUpload';
import { db } from '../lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { useSearchParams } from 'react-router-dom';
import { User, Shield, CreditCard, Settings, Gift, 
  Check, Mail, Camera, Bell, Lock, LogOut,
  ChevronRight, ExternalLink, Zap, Clock, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '../lib/firebase';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';

type ProfileTab = 'account' | 'billing' | 'security' | 'notifications';

export default function ProfilePage() {
  const { user, profile, isPro, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<ProfileTab>((searchParams.get('tab') as ProfileTab) || 'account');
  const [isSaving, setIsSaving] = useState(false);
  const { uploadImage, isUploading } = useImageUpload();
  const [displayName, setDisplayName] = useState(profile?.displayName || '');

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const data = await uploadImage(file, 'users');
    
    if (data?.success) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          photoURL: data.url,
          updatedAt: serverTimestamp()
        });

        // Sync with Auth profile for instant header update
        await updateProfile(user, { photoURL: data.url });

        toast.success('Profile photo updated!');
      } catch (err) {
        console.error('Firestore Update Error:', err);
        toast.error('Failed to update profile record');
      }
    }
  };

  useEffect(() => {
    const tab = searchParams.get('tab') as ProfileTab;
    if (tab && ['account', 'billing', 'security', 'notifications'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (tab: ProfileTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  if (loading) return <div className="flex items-center justify-center py-20">Loading...</div>;
  if (!user) return null;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName,
        updatedAt: serverTimestamp()
      });
      toast.success('Settings updated successfully!');
    } catch (err) {
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Settings Header */}
      <header className="mb-12">
        <h1 className="text-4xl font-black text-slate-900 mb-2">Settings</h1>
        <p className="text-slate-500 font-medium">Manage your personal information, billing preferences, and security.</p>
      </header>

      <div className="flex flex-col lg:flex-row gap-12">
        {/* Sidebar Nav */}
        <aside className="w-full lg:w-64 flex-shrink-0">
          <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-4 lg:pb-0 scrollbar-hide">
            <TabLink active={activeTab === 'account'} icon={User} onClick={() => handleTabChange('account')}>Account</TabLink>
            <TabLink active={activeTab === 'billing'} icon={CreditCard} onClick={() => handleTabChange('billing')}>Billing & Plans</TabLink>
            <TabLink active={activeTab === 'security'} icon={Shield} onClick={() => handleTabChange('security')}>Security</TabLink>
            <TabLink active={activeTab === 'notifications'} icon={Bell} onClick={() => handleTabChange('notifications')}>Notifications</TabLink>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-grow">
          <AnimatePresence mode="wait">
            {activeTab === 'account' && (
              <motion.div key="account" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="bg-white rounded-[3rem] p-8 md:p-12 border border-slate-100 shadow-sm">
                  <h2 className="text-2xl font-black mb-10 flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                      <User className="w-5 h-5" />
                    </div>
                    Account Details
                  </h2>
                  
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-8 mb-12 pb-12 border-b border-slate-50">
                    <div className="relative group">
                      <div className="w-28 h-28 rounded-[2rem] bg-slate-100 overflow-hidden shadow-xl shadow-slate-200 border-4 border-white relative">
                        <img src={profile?.photoURL || undefined} className="w-full h-full object-cover" alt="" />
                        {isUploading && (
                          <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                          </div>
                        )}
                      </div>
                      <label className="absolute -bottom-2 -right-2 p-3 bg-slate-900 text-white rounded-2xl shadow-xl border-4 border-white hover:scale-110 transition-transform cursor-pointer">
                        <Camera className="w-4 h-4" />
                        <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} disabled={isUploading} />
                      </label>
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 mb-1">{profile?.displayName || 'Your Profile'}</h3>
                      <p className="text-slate-500 text-sm font-medium mb-4">Your avatar is used for community comments and your public profile.</p>
                      <div className="flex gap-3">
                        <label className="text-xs font-black uppercase tracking-widest text-indigo-600 px-4 py-2 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-all cursor-pointer">
                          {isUploading ? 'Uploading...' : 'Upload New'}
                          <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} disabled={isUploading} />
                        </label>
                        <button 
                          onClick={() => updateDoc(doc(db, 'users', user.uid), { photoURL: null })}
                          className="text-xs font-black uppercase tracking-widest text-slate-400 px-4 py-2 hover:bg-slate-50 rounded-xl transition-all"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleUpdateProfile} className="space-y-8">
                    <div className="grid md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Display Name</label>
                        <input 
                          type="text" 
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-5 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all font-bold text-slate-900"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Account Email</label>
                        <div className="w-full bg-slate-100 border-2 border-transparent rounded-2xl p-5 text-slate-400 font-bold flex items-center justify-between group cursor-not-allowed">
                          <span className="truncate">{profile?.email}</span>
                          <Lock className="w-4 h-4 opacity-40" />
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 flex items-center gap-6">
                      <button 
                        disabled={isSaving}
                        className="bg-indigo-600 text-white font-black px-10 py-5 rounded-[2rem] hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-xl shadow-indigo-100 disabled:opacity-50"
                      >
                        {isSaving ? 'Syncing...' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            )}

            {activeTab === 'billing' && (
              <motion.div key="billing" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="bg-white rounded-[3rem] p-8 md:p-12 border border-slate-100 shadow-sm space-y-10 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                     <h2 className="text-2xl font-black flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                          <CreditCard className="w-5 h-5" />
                        </div>
                        Plan & Billing
                     </h2>
                     <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${isPro ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                       {profile?.subscriptionStatus || 'Free'} Status
                     </span>
                  </div>

                  {!isPro ? (
                    <div className="bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden group">
                       <Zap className="w-48 h-48 absolute -right-12 -bottom-12 text-white/5 rotate-12 group-hover:rotate-0 transition-transform duration-1000" />
                       <div className="relative z-10 max-w-md">
                         <h3 className="text-3xl font-black mb-4">Go Pro. Be Expert.</h3>
                         <p className="text-slate-400 text-sm mb-10 leading-relaxed font-medium">Unlock priority AI model access, unlimited library storage, and advanced prompt engineering tools.</p>
                         <button onClick={() => window.location.href = '/pricing'} className="bg-indigo-600 text-white font-black px-10 py-5 rounded-2xl hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-500/20">
                           Upgrade for $25/mo
                         </button>
                       </div>
                    </div>
                  ) : (
                    <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl shadow-indigo-950/20">
                       <Shield className="w-48 h-48 absolute -right-12 -bottom-12 text-white/5 -rotate-12" />
                       <div className="relative z-10">
                         <h3 className="text-3xl font-black mb-4 text-amber-400">PRO Member</h3>
                         <p className="text-slate-400 text-sm mb-10 leading-relaxed max-w-md font-medium">Your subscription is active. You have full access to all professional prompt engineering tools.</p>
                         
                         <div className="flex flex-wrap gap-4">
                           <button className="bg-white/10 text-white font-black px-8 py-4 rounded-2xl hover:bg-white/20 transition-all flex items-center gap-3 border border-white/5 backdrop-blur-sm">
                             <ExternalLink className="w-5 h-5" />
                             Stripe Billing Portal
                           </button>
                           <button className="text-rose-400 font-black px-8 py-4 rounded-2xl hover:bg-rose-500/10 transition-all text-sm">
                             Cancel Subscription
                           </button>
                         </div>
                       </div>
                    </div>
                  )}

                  <div className="pt-4">
                    <div className="flex items-center justify-between mb-8">
                       <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Default Payment Method</h4>
                       <button className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-all">Add New</button>
                    </div>
                    <div className="group flex items-center justify-between p-8 bg-slate-50 rounded-[2.5rem] border-2 border-transparent hover:border-indigo-100 hover:bg-white hover:shadow-xl transition-all duration-500">
                      <div className="flex items-center gap-8">
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm group-hover:scale-110 transition-transform">
                          <CreditCard className="w-10 h-10 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                        </div>
                        <div>
                          <p className="text-lg font-black text-slate-900">Visa ending in 4242</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md uppercase">Default</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Expires 12/2028</span>
                          </div>
                        </div>
                      </div>
                      <button className="p-3 text-slate-300 hover:text-slate-900 transition-colors"><ChevronRight className="w-6 h-6" /></button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'security' && (
              <motion.div key="security" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                 <div className="bg-white rounded-[3rem] p-8 md:p-12 border border-slate-100 shadow-sm">
                    <h2 className="text-2xl font-black mb-10 flex items-center gap-3">
                       <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
                         <Shield className="w-5 h-5" />
                       </div>
                       Security & Authentication
                    </h2>
                    
                    <div className="space-y-4">
                      <SecurityItem 
                        icon={Mail} 
                        title="Google Authentication" 
                        desc="Your account is secured via your Google account."
                        action="Connected"
                        actionType="status"
                      />
                       <SecurityItem 
                        icon={Lock} 
                        title="Two-Factor Auth" 
                        desc="Enhanced security for your prompt library and earnings."
                        action="Enable 2FA"
                      />
                       <SecurityItem 
                        icon={LogOut} 
                        title="Session Management" 
                        desc="Review and manage your active login sessions."
                        action="Manage All"
                      />
                    </div>
                 </div>
              </motion.div>
            )}

            {activeTab === 'notifications' && (
              <motion.div key="notifications" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                 <div className="bg-white rounded-[3rem] p-8 md:p-12 border border-slate-100 shadow-sm">
                    <h2 className="text-2xl font-black mb-10 flex items-center gap-3">
                       <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                         <Bell className="w-5 h-5" />
                       </div>
                       Email Preferences
                    </h2>
                    
                    <div className="space-y-10">
                      <NotificationToggle title="Product Updates" desc="New features, AI model releases, and performance improvements." />
                      <NotificationToggle title="Promotional Offers" desc="Special discounts, partner deals, and affiliate news." />
                      <NotificationToggle title="Security Alerts" desc="Important account access and suspicious activity notifications." defaultEnabled />
                      <NotificationToggle title="Library Activity" desc="Notifications when your prompts receive likes or comments." />
                    </div>
                 </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function TabLink({ children, icon: Icon, active, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`flex-shrink-0 lg:w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-black text-sm transition-all ${active ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}
    >
      <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-slate-400 group-hover:text-slate-900'}`} />
      {children}
    </button>
  );
}

function SecurityItem({ icon: Icon, title, desc, action, actionType = 'button' }: any) {
  return (
    <div className="flex items-center justify-between p-8 bg-slate-50 rounded-[2.5rem] border border-transparent hover:border-slate-100 transition-all">
      <div className="flex items-center gap-6">
        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 shadow-sm">
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="font-black text-slate-900">{title}</p>
          <p className="text-xs font-medium text-slate-500 max-w-[200px] md:max-w-none">{desc}</p>
        </div>
      </div>
      {actionType === 'status' ? (
        <span className="text-[10px] font-black uppercase tracking-widest text-green-600 bg-green-50 px-4 py-2 rounded-xl">{action}</span>
      ) : (
        <button className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:bg-indigo-50 px-4 py-2 rounded-xl transition-all border border-indigo-100">{action}</button>
      )}
    </div>
  );
}

function NotificationToggle({ title, desc, defaultEnabled = false }: any) {
  const [enabled, setEnabled] = useState(defaultEnabled);
  return (
    <div className="flex items-center justify-between group">
      <div className="max-w-md">
        <p className="font-black text-slate-900 mb-1">{title}</p>
        <p className="text-sm font-medium text-slate-500 leading-relaxed">{desc}</p>
      </div>
      <button 
        onClick={() => setEnabled(!enabled)}
        className={`w-14 h-8 rounded-full transition-all relative flex-shrink-0 ${enabled ? 'bg-indigo-600 shadow-lg shadow-indigo-100' : 'bg-slate-200'}`}
      >
        <motion.div 
          animate={{ x: enabled ? 26 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-sm" 
        />
      </button>
    </div>
  );
}

