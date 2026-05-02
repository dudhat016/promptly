import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useSearchParams } from 'react-router-dom';
import { User, Shield, CreditCard, Settings, Gift, 
  Check, Mail, Camera, Bell, Lock, LogOut,
  ChevronRight, ExternalLink, Zap, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '../lib/firebase';
import { useNavigate, Link } from 'react-router-dom';

type ProfileTab = 'account' | 'billing' | 'security' | 'notifications';

export default function ProfilePage() {
  const { user, profile, isPro, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<ProfileTab>((searchParams.get('tab') as ProfileTab) || 'account');
  const [isSaving, setIsSaving] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [successMessage, setSuccessMessage] = useState('');

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

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return null;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName,
        updatedAt: serverTimestamp()
      });
      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      alert('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-20">
      <div className="max-w-5xl mx-auto px-4 md:px-6">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar Nav */}
          <aside className="w-full md:w-64">
            <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-4 md:pb-0 scrollbar-hide">
              <TabLink active={activeTab === 'account'} icon={User} onClick={() => handleTabChange('account')}>Account</TabLink>
              <TabLink active={activeTab === 'billing'} icon={CreditCard} onClick={() => handleTabChange('billing')}>Billing</TabLink>
              <TabLink active={activeTab === 'security'} icon={Shield} onClick={() => handleTabChange('security')}>Security</TabLink>
              <TabLink active={activeTab === 'notifications'} icon={Bell} onClick={() => handleTabChange('notifications')}>Notifications</TabLink>
            </div>
            
            <div className="hidden md:block pt-4 mt-4 border-t border-slate-200 space-y-2">
               <Link to="/affiliate" className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm text-slate-500 hover:bg-slate-100 transition-all text-left">
                 <Gift className="w-5 h-5" />
                 Affiliate Dashboard
               </Link>
               <button 
                 onClick={() => { auth.signOut(); navigate('/'); }}
                 className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm text-red-500 hover:bg-red-50 transition-all text-left"
               >
                 <LogOut className="w-5 h-5" />
                 Sign Out
               </button>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-grow">
            <AnimatePresence mode="wait">
              {activeTab === 'account' && (
                <motion.div key="account" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
                  <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm">
                    <h2 className="text-2xl font-black mb-8">Account Details</h2>
                    
                    <div className="flex items-center gap-6 mb-10 pb-10 border-b border-slate-50">
                      <div className="relative">
                        <img src={profile?.photoURL || ''} className="w-24 h-24 rounded-3xl bg-slate-100 object-cover" alt="" />
                        <button className="absolute -bottom-2 -right-2 p-2 bg-indigo-600 text-white rounded-xl shadow-lg border-2 border-white">
                          <Camera className="w-4 h-4" />
                        </button>
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-slate-900">{profile?.displayName || 'Set your name'}</h3>
                        <p className="text-slate-500 text-sm">Personalize how others see you in the community.</p>
                      </div>
                    </div>

                    <form onSubmit={handleUpdateProfile} className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Display Name</label>
                          <input 
                            type="text" 
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-4 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Email Address</label>
                          <div className="w-full bg-slate-100 border-2 border-transparent rounded-2xl p-4 text-slate-400 font-bold flex items-center gap-2 cursor-not-allowed">
                            <Lock className="w-4 h-4" />
                            {profile?.email}
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 flex items-center justify-between">
                        <button 
                          disabled={isSaving}
                          className="bg-slate-900 text-white font-black px-8 py-4 rounded-2xl hover:bg-slate-800 transition-all flex items-center gap-2"
                        >
                          {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                        {successMessage && <span className="text-green-600 font-bold text-sm flex items-center gap-2 animate-bounce">
                          <Check className="w-4 h-4" />
                          {successMessage}
                        </span>}
                      </div>
                    </form>
                  </div>
                </motion.div>
              )}

              {activeTab === 'billing' && (
                <motion.div key="billing" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
                  <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm space-y-8">
                    <div className="flex items-center justify-between mb-2">
                       <h2 className="text-2xl font-black">Plan & Billing</h2>
                       <span className={`px-4 py-1 rounded-full text-xs font-black uppercase tracking-tight ${isPro ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                         {profile?.subscriptionStatus} PLAN
                       </span>
                    </div>

                    {!isPro ? (
                      <div className="bg-indigo-600 rounded-[2rem] p-8 text-white">
                         <Zap className="w-8 h-8 mb-4" />
                         <h3 className="text-xl font-black mb-2">Upgrade to Pro</h3>
                         <p className="text-indigo-100 text-sm mb-6 leading-relaxed">Get unlimited access to expert prompts, advanced AI models, and priority support.</p>
                         <button onClick={() => window.location.href = '/pricing'} className="bg-white text-indigo-600 font-black px-6 py-3 rounded-xl hover:bg-indigo-50 transition-all">
                           Explore Plans
                         </button>
                      </div>
                    ) : (
                      <div className="bg-slate-900 rounded-[2rem] p-8 text-white">
                         <Shield className="w-8 h-8 mb-4 text-amber-400" />
                         <h3 className="text-xl font-black mb-2">You're a PRO Member</h3>
                         <p className="text-slate-400 text-sm mb-6 leading-relaxed">Your subscription is active. Next billing date: {new Date(Date.now() + 30 * 24*60*60*1000).toLocaleDateString()}.</p>
                         <div className="flex gap-4">
                           <button className="bg-white/10 text-white font-black px-6 py-3 rounded-xl hover:bg-white/20 transition-all flex items-center gap-2">
                             <ExternalLink className="w-4 h-4" />
                             Manage Billing
                           </button>
                         </div>
                      </div>
                    )}

                    <div>
                      <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6 font-sans">Payment Methods</h4>
                      <div className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-4">
                          <div className="bg-white p-2 rounded-lg border border-slate-200">
                            <CreditCard className="w-6 h-6 text-slate-400" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">Visa ending in 4242</p>
                            <p className="text-xs text-slate-500">Expires 12/28</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-1 rounded">Primary</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'security' && (
                <motion.div key="security" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
                   <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm">
                      <h2 className="text-2xl font-black mb-8">Security & Access</h2>
                      
                      <div className="space-y-6">
                        <SecurityItem 
                          icon={Mail} 
                          title="Authentication Method" 
                          desc="You currently sign in using Google."
                          action="Connected"
                          actionType="status"
                        />
                         <SecurityItem 
                          icon={Clock} 
                          title="Two-Factor Authentication" 
                          desc="Add an extra layer of security to your account."
                          action="Setup 2FA"
                        />
                         <SecurityItem 
                          icon={LogOut} 
                          title="Active Sessions" 
                          desc="Manages devices that are logged into your account."
                          action="Manage Sessions"
                        />
                      </div>
                   </div>
                </motion.div>
              )}

              {activeTab === 'notifications' && (
                <motion.div key="notifications" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
                   <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm">
                      <h2 className="text-2xl font-black mb-8">Notification Settings</h2>
                      
                      <div className="space-y-8">
                        <NotificationToggle title="New Prompt Releases" desc="Get notified when the systems publishes new expert prompts." />
                        <NotificationToggle title="Community Activity" desc="Likes and comments on your public dashboard items." />
                        <NotificationToggle title="Product Updates" desc="Occasional emails about new features and improvements." />
                        <NotificationToggle title="Marketing & Sales" desc="Special offers and affiliate program opportunities." />
                      </div>
                   </div>
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
}

function TabLink({ children, icon: Icon, active, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`flex-shrink-0 md:w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-bold text-sm transition-all ${active ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/10' : 'text-slate-500 hover:bg-white hover:text-slate-900'}`}
    >
      <Icon className={`w-5 h-5 ${active ? 'text-indigo-400' : 'text-slate-400'}`} />
      {children}
    </button>
  );
}

function SecurityItem({ icon: Icon, title, desc, action, actionType = 'button' }: any) {
  return (
    <div className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400">
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="font-bold text-slate-900">{title}</p>
          <p className="text-xs text-slate-500">{desc}</p>
        </div>
      </div>
      {actionType === 'status' ? (
        <span className="text-[10px] font-black uppercase text-green-600 bg-green-50 px-3 py-1 rounded-full">{action}</span>
      ) : (
        <button className="text-[10px] font-black uppercase text-indigo-600 hover:underline">{action}</button>
      )}
    </div>
  );
}

function NotificationToggle({ title, desc }: any) {
  const [enabled, setEnabled] = useState(true);
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-bold text-slate-900">{title}</p>
        <p className="text-sm text-slate-500">{desc}</p>
      </div>
      <button 
        onClick={() => setEnabled(!enabled)}
        className={`w-14 h-8 rounded-full transition-all relative ${enabled ? 'bg-indigo-600' : 'bg-slate-200'}`}
      >
        <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${enabled ? 'left-7' : 'left-1'}`} />
      </button>
    </div>
  );
}
