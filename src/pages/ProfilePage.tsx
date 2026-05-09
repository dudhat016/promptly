import { updateProfile } from 'firebase/auth';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import {
  Bell,
  ChevronRight,
  CreditCard,
  ExternalLink,
  Lock, LogOut,
  Mail,
  Shield,
  User,
  Zap
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../components/ui/Button';
import ImageUpload from '../components/ui/ImageUpload';
import Input from '../components/ui/Input';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/firebase';
import { cn } from '../lib/utils';

type ProfileTab = 'account' | 'billing' | 'security' | 'notifications';

export default function ProfilePage() {
  const { user, profile, isPro, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<ProfileTab>((searchParams.get('tab') as ProfileTab) || 'account');
  const [isSaving, setIsSaving] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.displayName || '');


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
        <h1 className="text-4xl font-bold text-foreground mb-2">Settings</h1>
        <p className="text-muted-foreground font-medium">Manage your personal information, billing preferences, and security.</p>
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
                <div className="bg-card rounded-lg p-8 md:p-12 border border-border shadow-sm">
                  <h2 className="text-2xl font-bold mb-10 flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/8 text-primary rounded-md flex items-center justify-center">
                      <User className="w-5 h-5" />
                    </div>
                    Account Details
                  </h2>

                  <div className="flex flex-col md:flex-row items-start md:items-center gap-12 mb-12 pb-12 border-b border-border">
                    <ImageUpload
                      value={profile?.photoURL || undefined}
                      onChange={async (url) => {
                        if (!user) return;
                        try {
                          await updateDoc(doc(db, 'users', user.uid), {
                            photoURL: url || null,
                            updatedAt: serverTimestamp()
                          });
                          if (user) await updateProfile(user, { photoURL: url || null });
                          toast.success(url ? 'Profile photo updated!' : 'Profile photo removed');
                        } catch (err) {
                          toast.error('Failed to update profile');
                        }
                      }}
                      variant="circle"
                      label={profile?.displayName || 'Your Profile'}
                      description="Your avatar is used for community comments and your public profile."
                      folder="users"
                    />
                  </div>

                  <form onSubmit={handleUpdateProfile} className="space-y-8">
                    <div className="grid md:grid-cols-2 gap-8">
                      <Input
                        label="Display Name"
                        id="profileDisplayName"
                        name="displayName"
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        variant="filled"
                        placeholder="Your Name"
                      />
                      <Input
                        label="Account Email"
                        id="accountEmail"
                        name="accountEmail"
                        type="email"
                        value={profile?.email || ''}
                        readOnly
                        variant="filled"
                        rightAction={<Lock className="w-4 h-4 opacity-40" />}
                      />
                    </div>

                    <div className="pt-6 flex items-center gap-6">
                      <Button
                        type="submit"
                        isLoading={isSaving}
                        variant="primary"
                      >
                        Save Changes
                      </Button>
                    </div>
                  </form>
                </div>
              </motion.div>
            )}

            {activeTab === 'billing' && (
              <motion.div key="billing" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="bg-card rounded-lg p-8 md:p-12 border border-border shadow-sm space-y-10 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                     <h2 className="text-2xl font-bold flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-500/10 text-amber-600 rounded-md flex items-center justify-center">
                          <CreditCard className="w-5 h-5" />
                        </div>
                        Plan & Billing
                     </h2>
                     <span className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-widest ${isPro ? 'bg-amber-100 text-amber-700' : 'bg-muted text-muted-foreground'}`}>
                       {profile?.subscriptionStatus || 'Free'} Status
                     </span>
                  </div>

                  {!isPro ? (
                    <div className="bg-foreground rounded-lg p-10 text-white relative overflow-hidden group">
                       <Zap className="w-48 h-48 absolute -right-12 -bottom-12 text-white/5 rotate-12 group-hover:rotate-0 transition-transform duration-1000" />
                       <div className="relative z-10 max-w-md">
                         <h3 className="text-3xl font-bold mb-4">Go Pro. Be Expert.</h3>
                         <p className="text-muted-foreground text-sm mb-10 leading-relaxed font-medium">Unlock priority AI model access, unlimited library storage, and advanced prompt engineering tools.</p>
                          <Button
                            onClick={() => window.location.href = '/pricing'}
                            variant="white"
                          >
                            Upgrade for $25/mo
                          </Button>
                       </div>
                    </div>
                  ) : (
                    <div className="bg-gradient-to-br from-foreground to-foreground/80 rounded-lg p-10 text-white relative overflow-hidden shadow-md shadow-primary/20">
                       <Shield className="w-48 h-48 absolute -right-12 -bottom-12 text-white/5 -rotate-12" />
                       <div className="relative z-10">
                         <h3 className="text-3xl font-bold mb-4 text-amber-400">PRO Member</h3>
                         <p className="text-muted-foreground text-sm mb-10 leading-relaxed max-w-md font-medium">Your subscription is active. You have full access to all professional prompt engineering tools.</p>

                          <div className="flex flex-wrap gap-4">
                            <Button
                              variant="outline"
                              leftIcon={ExternalLink}
                              className="bg-white/10 text-white border-white/5 backdrop-blur-sm"
                            >
                              Stripe Billing Portal
                            </Button>
                            <Button
                              variant="ghost"
                              className="text-rose-400 hover:bg-rose-500/10"
                            >
                              Cancel Subscription
                            </Button>
                          </div>
                       </div>
                    </div>
                  )}

                  <div className="pt-4">
                    <div className="flex items-center justify-between mb-8">
                       <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Default Payment Method</h4>
                       <Button
                        variant="ghost"
                        size="sm"
                        className="text-primary font-bold uppercase tracking-widest px-3 py-1.5"
                       >
                         Add New
                       </Button>
                    </div>
                    <div className="group flex items-center justify-between p-8 bg-muted/50 rounded-lg border-2 border-transparent hover:border-indigo-100 hover:bg-card hover:shadow-xl transition-all duration-500">
                      <div className="flex items-center gap-8">
                        <div className="bg-card p-4 rounded-md border border-border shadow-sm group-hover:scale-110 transition-transform">
                          <CreditCard className="w-10 h-10 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <div>
                          <p className="text-lg font-bold text-foreground">Visa ending in 4242</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs font-bold text-primary bg-primary/8 px-2 py-0.5 rounded-md uppercase">Default</span>
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-tighter">Expires 12/2028</span>
                          </div>
                        </div>
                      </div>
                       <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground/40 hover:text-foreground shrink-0"
                       >
                         <ChevronRight className="w-6 h-6" />
                       </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'security' && (
              <motion.div key="security" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                 <div className="bg-card rounded-lg p-8 md:p-12 border border-border shadow-sm">
                    <h2 className="text-2xl font-bold mb-10 flex items-center gap-3">
                       <div className="w-10 h-10 bg-rose-500/10 text-rose-600 rounded-md flex items-center justify-center">
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
                 <div className="bg-card rounded-lg p-8 md:p-12 border border-border shadow-sm">
                    <h2 className="text-2xl font-bold mb-10 flex items-center gap-3">
                       <div className="w-10 h-10 bg-primary/8 text-primary rounded-md flex items-center justify-center">
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
    <Button
      onClick={onClick}
      variant={active ? 'primary' : 'ghost'}
      size="lg"
      fullWidth
      leftIcon={Icon}
      className={cn(
        "justify-start px-6 h-14",
        active ? "shadow-md shadow-primary/20" : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {children}
    </Button>
  );
}

function SecurityItem({ icon: Icon, title, desc, action, actionType = 'button' }: any) {
  return (
    <div className="flex items-center justify-between p-8 bg-muted/50 rounded-lg border border-transparent hover:border-border transition-all">
      <div className="flex items-center gap-6">
        <div className="w-12 h-12 bg-card rounded-md flex items-center justify-center text-muted-foreground shadow-sm">
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="font-bold text-foreground">{title}</p>
          <p className="text-xs font-medium text-muted-foreground max-w-[200px] md:max-w-none">{desc}</p>
        </div>
      </div>
      {actionType === 'status' ? (
        <span className="text-xs font-bold uppercase tracking-widest text-green-600 bg-green-50 px-4 py-2 rounded-md">{action}</span>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="font-bold uppercase tracking-widest border-indigo-100"
        >
          {action}
        </Button>
      )}
    </div>
  );
}

function NotificationToggle({ title, desc, defaultEnabled = false }: any) {
  const [enabled, setEnabled] = useState(defaultEnabled);
  return (
    <div className="flex items-center justify-between group">
      <div className="max-w-md">
        <p className="font-bold text-foreground mb-1">{title}</p>
        <p className="text-sm font-medium text-muted-foreground leading-relaxed">{desc}</p>
      </div>
      <button
        onClick={() => setEnabled(!enabled)}
        aria-label={`Toggle ${title}`}
        className={`w-14 h-8 rounded-full transition-all relative flex-shrink-0 ${enabled ? 'bg-primary shadow-lg shadow-primary/10' : 'bg-muted'}`}
      >
        <motion.div
          animate={{ x: enabled ? 26 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="absolute top-1 w-6 h-6 bg-card rounded-full shadow-sm"
        />
      </button>
    </div>
  );
}
