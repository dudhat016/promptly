import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/firebase';
import { 
  collection, query, getDocs, getDoc, doc, updateDoc, deleteDoc, 
  orderBy, limit, where, Timestamp, addDoc, serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { Prompt, UserProfile, Category, Payout, EmailNotification, EmailTemplate, PricingPlan, AppConfig, AccessConfig, PermissionSet } from '../types';
import { 
  Users, LayoutGrid, CreditCard, BarChart3, AlertCircle, 
  Check, X, Trash2, Shield, UserCheck, Star, ArrowUpRight,
  Search, Filter, MoreVertical, ShieldCheck, Zap, Plus,
  Edit2, Save, Tag as TagIcon, Mail, Send, Clock, Loader2,
  Calendar, Settings, ToggleLeft, ToggleRight, List,
  UserPlus, Folder, PlayCircle, StopCircle, Braces, ChevronRight,
  Layers, Package, Sliders
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { Contact, Tag, Segment, AutomationFlow } from '../types';
import { Gift, Award } from 'lucide-react';
import { EmailService } from '../services/emailService';
import AutomationBuilder from '../components/marketing/AutomationBuilder';
import ContactManager from '../components/marketing/ContactManager';
import SegmentBuilder from '../components/marketing/SegmentBuilder';

// Utility to handle Firestore timestamps or ISO strings
const formatDate = (date: any) => {
  if (!date) return 'N/A';
  try {
    if (date instanceof Timestamp) return date.toDate().toLocaleDateString();
    if (typeof date === 'object' && date.seconds) return new Date(date.seconds * 1000).toLocaleDateString();
    const parsed = new Date(date);
    return parsed.toString() !== 'Invalid Date' ? parsed.toLocaleDateString() : 'N/A';
  } catch (err) {
    return 'N/A';
  }
};

type AdminTab = 'overview' | 'prompts' | 'users' | 'categories' | 'referrals' | 'revenue' | 'emails' | 'templates' | 'subscriptions' | 'permissions' | 'marketing';

export default function AdminPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPrompts: 0,
    proUsers: 0,
    totalEarnings: 0,
    estimatedRevenue: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Email States
  const [notifications, setNotifications] = useState<EmailNotification[]>([]);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [offerData, setOfferData] = useState({ subject: '', content: '', target: 'all' as 'all' | 'pro' | 'free' });
  const [isSendingOffer, setIsSendingOffer] = useState(false);

  // Template States
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  // Subscription States
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [editingPlan, setEditingPlan] = useState<PricingPlan | null>(null);
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Marketing States
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [automations, setAutomations] = useState<AutomationFlow[]>([]);
  const [isMarketingModalOpen, setIsMarketingModalOpen] = useState(false);
  const [marketingMode, setMarketingMode] = useState<'contact' | 'tag' | 'segment' | 'automation'>('contact');
  const [editingContact, setEditingContact] = useState<Partial<Contact> | null>(null);
  const [editingAutomation, setEditingAutomation] = useState<Partial<AutomationFlow> | null>(null);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [isSegmentBuilderOpen, setIsSegmentBuilderOpen] = useState(false);
  const [editingSegment, setEditingSegment] = useState<Partial<Segment> | null>(null);
  const [isSavingMarketing, setIsSavingMarketing] = useState(false);

  // Access States
  const [accessLevels, setAccessLevels] = useState<AccessConfig | null>(null);
  const [isSavingAccess, setIsSavingAccess] = useState(false);

  // CRUD Modals
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Partial<Prompt> | null>(null);
  
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);

  useEffect(() => {
    if (isAdmin) {
      fetchAdminData();
    }
  }, [isAdmin]);

  async function fetchAdminData() {
    setLoading(true);
    try {
      // Fetch Prompts
      const pSnap = await getDocs(query(collection(db, 'prompts'), orderBy('createdAt', 'desc')));
      const pData = pSnap.docs.map(d => ({ id: d.id, ...d.data() } as Prompt));
      setPrompts(pData);

      // Fetch Users
      const uSnap = await getDocs(collection(db, 'users'));
      const uData = uSnap.docs.map(d => ({ uid: d.id, ...d.data() } as any as UserProfile));
      setUsers(uData);

      // Fetch Categories
      const cSnap = await getDocs(collection(db, 'categories'));
      const cData = cSnap.docs.map(d => ({ id: d.id, ...d.data() } as Category));
      setCategories(cData);

      // Fetch Payouts
      const paySnap = await getDocs(query(collection(db, 'payouts'), orderBy('processedAt', 'desc'), limit(50)));
      const payData = paySnap.docs.map(d => ({ id: d.id, ...d.data() } as any as Payout));
      setPayouts(payData);

      // Fetch Notifications
      const nSnap = await getDocs(query(collection(db, 'notifications'), orderBy('sentAt', 'desc'), limit(100)));
      const nData = nSnap.docs.map(d => ({ id: d.id, ...d.data() } as EmailNotification));
      setNotifications(nData);

      // Fetch Templates
      const tSnap = await getDocs(collection(db, 'templates'));
      const tData = tSnap.docs.map(d => ({ id: d.id, ...d.data() } as EmailTemplate));
      
      const defaultTemplates: EmailTemplate[] = [
        { id: 'welcome', type: 'Welcome', subject: 'Welcome to Promptly!', content: 'Thank you for joining our community {{name}}! Explore thousands of AI prompts and start building your library today.', variables: ['name', 'email'], lastUpdated: null },
        { id: 'login', type: 'Login Alert', subject: 'New Login Detected', content: 'A new login was detected for your account on {{time}}. If this wasn\'t you, please secure your account.', variables: ['email', 'time'], lastUpdated: null },
        { id: 'affiliate_join', type: 'Affiliate Welcome', subject: 'Your Affiliate Account is Active!', content: 'Congratulations! Your affiliate code "{{code}}" is now active. Start sharing and earn recurring commissions.', variables: ['email', 'code'], lastUpdated: null },
        { id: 'new_prompt', type: 'Prompt Published', subject: 'Your Prompt is Live!', content: 'Great job! Your prompt "{{title}}" has been successfully published to Promptly.', variables: ['email', 'title'], lastUpdated: null },
        { id: 'subs_ending', type: 'Subscription Ending', subject: 'Subscription Ending Soon', content: 'Your Pro subscription will expire soon for {{email}}. Renew now to maintain uninterrupted access.', variables: ['email'], lastUpdated: null }
      ];

      const merged = defaultTemplates.map(def => {
        const found = tData.find(t => t.id === def.id);
        return found || def;
      });
      setTemplates(merged);

      // Fetch Plans
      const plansSnap = await getDocs(collection(db, 'plans'));
      const plansData = plansSnap.docs.map(d => ({ id: d.id, ...d.data() } as PricingPlan));
      
      const defaultPlans: PricingPlan[] = [
        { id: 'free', name: 'Free', description: 'Basic prompt generation', monthlyPrice: 0, yearlyPrice: 0, features: ['Daily limits apply', 'Community support'], accessLevel: 'free', limits: { dailyPrompts: 5, favorites: 10 } },
        { id: 'pro', name: 'Pro', description: 'Advanced AI features', monthlyPrice: 29, yearlyPrice: 290, features: ['Unlimited generations', 'Priority support', 'Commercial usage'], accessLevel: 'pro', isPopular: true, limits: { dailyPrompts: 999, favorites: 999 } },
        { id: 'enterprise', name: 'Enterprise', description: 'Custom solutions', monthlyPrice: 99, yearlyPrice: 990, features: ['API Access', 'Dedicated account manager', 'SLA guarantees'], accessLevel: 'enterprise', limits: { dailyPrompts: 9999, favorites: 9999 } }
      ];

      setPlans(plansData.length > 0 ? plansData : defaultPlans);

      // Fetch Access Levels
      const accessSnap = await getDoc(doc(db, 'config', 'access_levels'));
      if (accessSnap.exists()) {
        setAccessLevels(accessSnap.data() as AccessConfig);
      } else {
        const defaultAccess: AccessConfig = {
          id: 'access_levels',
          free: { canViewPremium: false, canCopyPrompts: true, canExportData: false, canUseAIBuilder: false, canCreateCollections: false, maxDailyPrompts: 5, maxFavorites: 10 },
          pro: { canViewPremium: true, canCopyPrompts: true, canExportData: true, canUseAIBuilder: true, canCreateCollections: true, maxDailyPrompts: 999, maxFavorites: 999 },
          enterprise: { canViewPremium: true, canCopyPrompts: true, canExportData: true, canUseAIBuilder: true, canCreateCollections: true, maxDailyPrompts: 9999, maxFavorites: 9999 },
          lastUpdated: null
        };
        setAccessLevels(defaultAccess);
      }

      // Fetch Config
      const configSnap = await getDoc(doc(db, 'config', 'global'));
      if (configSnap.exists()) {
        setConfig(configSnap.data() as AppConfig);
      } else {
        setConfig({ id: 'global', freeTrialEnabled: false, freeTrialDays: 7, lastUpdated: null });
      }

      // Fetch Marketing Data
      const contactsSnap = await getDocs(collection(db, 'marketing_contacts'));
      setContacts(contactsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Contact)));

      const tagsSnap = await getDocs(collection(db, 'marketing_tags'));
      setTags(tagsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Tag)));

      const segmentsSnap = await getDocs(collection(db, 'marketing_segments'));
      setSegments(segmentsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Segment)));

      const automationsSnap = await getDocs(collection(db, 'marketing_automations'));
      setAutomations(automationsSnap.docs.map(d => ({ id: d.id, ...d.data() } as AutomationFlow)));

      // Calc stats
      setStats({
        totalUsers: uData.length,
        totalPrompts: pData.length,
        proUsers: uData.filter(u => u.subscriptionStatus === 'pro').length,
        totalEarnings: uData.reduce((acc, u) => acc + (u.affiliateEarnings || 0), 0),
        estimatedRevenue: uData.filter(u => u.subscriptionStatus === 'pro').length * 15
      });
    } catch (err) {
      console.error("Admin Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  }

  // --- Prompt CRUD ---
  const handleSavePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPrompt?.title) return;

    try {
      if (editingPrompt.id) {
        // Update
        const { id, ...data } = editingPrompt;
        await updateDoc(doc(db, 'prompts', id), {
          ...data,
          updatedAt: serverTimestamp()
        });
        setPrompts(prev => prev.map(p => p.id === id ? { ...p, ...data } as Prompt : p));
      } else {
        // Create
        const newPrompt = {
          ...editingPrompt,
          creatorId: 'system',
          likesCount: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        const docRef = await addDoc(collection(db, 'prompts'), newPrompt);
        setPrompts(prev => [{ id: docRef.id, ...newPrompt } as any, ...prev]);
      }
      setIsPromptModalOpen(false);
      setEditingPrompt(null);
    } catch (err) {
      console.error(err);
      alert("Failed to save prompt");
    }
  };

  const handleDeletePrompt = async (id: string) => {
    if (!confirm("Are you sure you want to delete this prompt?")) return;
    try {
      await deleteDoc(doc(db, 'prompts', id));
      setPrompts(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      alert("Delete failed");
    }
  };

  // --- Email Template CRUD ---
  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;
    setIsSavingTemplate(true);
    try {
      await setDoc(doc(db, 'templates', editingTemplate.id), {
        ...editingTemplate,
        lastUpdated: serverTimestamp()
      });
      setTemplates(prev => prev.map(t => t.id === editingTemplate.id ? editingTemplate : t));
      setEditingTemplate(null);
      alert("Template updated successfully!");
    } catch (err) {
      alert("Failed to save template");
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan || !editingPlan.id) return;
    setIsSavingPlan(true);
    try {
      await setDoc(doc(db, 'plans', editingPlan.id), editingPlan);
      setPlans(prev => {
        const index = prev.findIndex(p => p.id === editingPlan.id);
        if (index > -1) {
          return prev.map(p => p.id === editingPlan.id ? editingPlan : p);
        }
        return [...prev, editingPlan];
      });
      setEditingPlan(null);
      alert("Plan saved successfully!");
    } catch (err) {
      alert("Failed to save plan");
    } finally {
      setIsSavingPlan(false);
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!confirm("Delete this pricing plan? Users currently on this plan might lose access features.")) return;
    try {
      await deleteDoc(doc(db, 'plans', id));
      setPlans(prev => prev.filter(p => p.id !== id));
      alert("Plan deleted.");
    } catch (err) {
      alert("Failed to delete plan");
    }
  };

  const handleToggleTrial = async () => {
    if (!config) return;
    setIsSavingConfig(true);
    try {
      const newConfig = { ...config, freeTrialEnabled: !config.freeTrialEnabled, lastUpdated: serverTimestamp() };
      await setDoc(doc(db, 'config', 'global'), newConfig);
      setConfig(newConfig);
    } catch (err) {
      alert("Failed to update config");
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleUpdateTrialDays = async (days: number) => {
    if (!config) return;
    setIsSavingConfig(true);
    try {
      const newConfig = { ...config, freeTrialDays: days, lastUpdated: serverTimestamp() };
      await setDoc(doc(db, 'config', 'global'), newConfig);
      setConfig(newConfig);
    } catch (err) {
      alert("Failed to update trial days");
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleSaveAccess = async () => {
    if (!accessLevels) return;
    setIsSavingAccess(true);
    try {
      await setDoc(doc(db, 'config', 'access_levels'), {
        ...accessLevels,
        lastUpdated: serverTimestamp()
      });
      alert("Permissions saved successfully!");
    } catch (err) {
      alert("Failed to save permissions");
    } finally {
      setIsSavingAccess(false);
    }
  };

  const togglePermission = (tier: 'free' | 'pro' | 'enterprise', key: keyof PermissionSet) => {
    if (!accessLevels) return;
    const newAccess = { ...accessLevels };
    newAccess[tier] = {
      ...newAccess[tier],
      [key]: !newAccess[tier][key]
    };
    setAccessLevels(newAccess);
  };

  // --- Marketing CRUD ---
  const handleSaveMarketingAction = async (item: any, typeOverride?: string) => {
    setIsSavingMarketing(true);
    try {
      const mode = typeOverride || marketingMode;
      const collectionName = `marketing_${mode}s`;
      if (item.id) {
        const { id, ...data } = item;
        await updateDoc(doc(db, collectionName, id), data);
      } else {
        await addDoc(collection(db, collectionName), {
          ...item,
          createdAt: serverTimestamp()
        });
      }
      alert(`${mode} saved!`);
      fetchAdminData();
      setIsMarketingModalOpen(false);
      setIsBuilderOpen(false);
    } catch (err) {
      alert("Failed to save marketing item");
    } finally {
      setIsSavingMarketing(false);
    }
  };

  const handleDeleteMarketingItem = async (id: string, mode: string) => {
    if (!confirm(`Delete this ${mode}?`)) return;
    try {
      await deleteDoc(doc(db, `marketing_${mode}s`, id));
      fetchAdminData();
    } catch (err) {
      alert("Delete failed");
    }
  };

  // --- Category CRUD ---
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory?.name) return;

    try {
      if (editingCategory.id) {
        await updateDoc(doc(db, 'categories', editingCategory.id), { name: editingCategory.name, slug: editingCategory.slug });
        setCategories(prev => prev.map(c => c.id === editingCategory.id ? { ...c, ...editingCategory } as Category : c));
      } else {
        const docRef = await addDoc(collection(db, 'categories'), {
          name: editingCategory.name,
          slug: editingCategory.name.toLowerCase().replace(/\s+/g, '-')
        });
        setCategories(prev => [...prev, { id: docRef.id, ...editingCategory } as Category]);
      }
      setIsCategoryModalOpen(false);
      setEditingCategory(null);
    } catch (err) {
      alert("Failed to save category");
    }
  };

  const handleSendOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSendingOffer(true);
    try {
      let targets = [...users];
      if (offerData.target === 'pro') targets = targets.filter(u => u.subscriptionStatus === 'pro');
      if (offerData.target === 'free') targets = targets.filter(u => u.subscriptionStatus !== 'pro');

      for (const target of targets) {
        await EmailService.logEmail({
          type: 'offer',
          recipientEmail: target.email,
          recipientId: target.uid,
          subject: offerData.subject,
          content: offerData.content
        });
      }

      alert(`Successfully "sent" offer to ${targets.length} users.`);
      setIsOfferModalOpen(false);
      setOfferData({ subject: '', content: '', target: 'all' });
      
      // Refresh local logs
      const nSnap = await getDocs(query(collection(db, 'notifications'), orderBy('sentAt', 'desc'), limit(100)));
      setNotifications(nSnap.docs.map(d => ({ id: d.id, ...d.data() } as EmailNotification)));
    } catch (err) {
      alert("Failed to send offers");
    } finally {
      setIsSendingOffer(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Delete category? Items in this category will become orphaned.")) return;
    try {
      await deleteDoc(doc(db, 'categories', id));
      setCategories(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      alert("Delete failed");
    }
  };

  // --- User CRUD ---
  const handleUpdateUser = async (userId: string, updates: Partial<UserProfile>) => {
    try {
      await updateDoc(doc(db, 'users', userId), updates);
      setUsers(prev => prev.map(u => u.uid === userId ? { ...u, ...updates } : u));
    } catch (err) {
      alert("Failed to update user");
    }
  };

  const handlePayout = async (affiliate: UserProfile) => {
    const amount = affiliate.affiliateEarnings || 0;
    if (amount <= 0) {
      alert("This affiliate has no earnings to pay out.");
      return;
    }
    
    if (!confirm(`Are you sure you want to process a payout of $${amount} for ${affiliate.email}? This will reset their pending earnings to $0.`)) return;

    try {
      // Create Payout Record
      const payoutData = {
        userId: affiliate.uid,
        userEmail: affiliate.email,
        amount: amount,
        status: 'paid',
        processedAt: new Date().toISOString()
      };
      
      await addDoc(collection(db, 'payouts'), payoutData);

      // Reset Balance
      await updateDoc(doc(db, 'users', affiliate.uid), {
        affiliateEarnings: 0,
        updatedAt: serverTimestamp()
      });
      
      setUsers(prev => prev.map(u => u.uid === affiliate.uid ? { ...u, affiliateEarnings: 0 } : u));
      setPayouts(prev => [{ id: 'temp-' + Date.now(), ...payoutData } as Payout, ...prev]);
      alert("Payout processed successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to process payout.");
    }
  };

  if (authLoading) return <AdminSkeleton />;
  if (!isAdmin) return <AdminAccessDenied />;

  const filteredUsers = users.filter(u => 
    u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPrompts = prompts.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      {/* Sidebar */}
      <aside className="w-72 bg-slate-900 text-white min-h-screen flex flex-col p-6 sticky top-0 h-screen overflow-y-auto z-10 shadow-2xl shadow-slate-900/50">
        <div className="flex items-center gap-3 mb-12 px-2">
          <div className="bg-indigo-600 p-2 rounded-xl">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-black text-xl leading-tight">Admin</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Control Tower</p>
          </div>
        </div>

        <nav className="space-y-2 flex-grow">
          <SidebarLink active={activeTab === 'overview'} icon={BarChart3} onClick={() => setActiveTab('overview')}>Overview</SidebarLink>
          <SidebarLink active={activeTab === 'prompts'} icon={LayoutGrid} onClick={() => setActiveTab('prompts')}>Prompts</SidebarLink>
          <SidebarLink active={activeTab === 'categories'} icon={TagIcon} onClick={() => setActiveTab('categories')}>Categories</SidebarLink>
          <SidebarLink active={activeTab === 'users'} icon={Users} onClick={() => setActiveTab('users')}>Users</SidebarLink>
          <SidebarLink active={activeTab === 'referrals'} icon={Gift} onClick={() => setActiveTab('referrals')}>Affiliates</SidebarLink>
          <SidebarLink active={activeTab === 'revenue'} icon={CreditCard} onClick={() => setActiveTab('revenue')}>Financials</SidebarLink>
          <SidebarLink active={activeTab === 'emails'} icon={Mail} onClick={() => setActiveTab('emails')}>Email Logs</SidebarLink>
          <SidebarLink active={activeTab === 'templates'} icon={Edit2} onClick={() => setActiveTab('templates')}>Templates</SidebarLink>
          <SidebarLink active={activeTab === 'subscriptions'} icon={Zap} onClick={() => setActiveTab('subscriptions')}>Plans & Trial</SidebarLink>
          <SidebarLink active={activeTab === 'permissions'} icon={ShieldCheck} onClick={() => setActiveTab('permissions')}>Permissions</SidebarLink>
          <SidebarLink active={activeTab === 'marketing'} icon={Send} onClick={() => setActiveTab('marketing')}>Marketing & CRM</SidebarLink>
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-800">
          <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-2xl">
            <img src={user?.photoURL || ''} className="w-10 h-10 rounded-xl" alt="" />
            <div className="overflow-hidden">
              <p className="text-xs font-bold truncate">{user?.displayName}</p>
              <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-grow p-10 max-w-[1400px] mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
          <div>
            <h2 className="text-3xl font-black text-slate-900 capitalize">{activeTab}</h2>
            <p className="text-slate-500">Managing Promptly system resources.</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white border border-slate-200 rounded-2xl py-3 pl-10 pr-6 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-64 transition-all"
              />
            </div>
            {activeTab === 'prompts' && (
              <button 
                onClick={() => { setEditingPrompt({ tags: [], isPaid: false, model: 'GPT-4' }); setIsPromptModalOpen(true); }}
                className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
              >
                <Plus className="w-5 h-5" />
                Add Prompt
              </button>
            )}
            {activeTab === 'subscriptions' && (
              <button 
                onClick={() => setEditingPlan({ 
                  id: '', name: '', description: '', monthlyPrice: 0, yearlyPrice: 0, 
                  features: [], accessLevel: 'free', limits: { dailyPrompts: 10, favorites: 20 } 
                })}
                className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
              >
                <Plus className="w-5 h-5" />
                New Plan
              </button>
            )}
            {activeTab === 'categories' && (
              <button 
                onClick={() => { setEditingCategory({}); setIsCategoryModalOpen(true); }}
                className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
              >
                <Plus className="w-5 h-5" />
                Add Category
              </button>
            )}
            {activeTab === 'emails' && (
              <button 
                onClick={() => setIsOfferModalOpen(true)}
                className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
              >
                <Send className="w-5 h-5" />
                Send Offer
              </button>
            )}
            {activeTab === 'marketing' && (
              <div className="flex gap-4">
                <button 
                  onClick={() => { setMarketingMode('contact'); setEditingContact({ tags: [], status: 'active' }); setIsMarketingModalOpen(true); }}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                >
                  <UserPlus className="w-5 h-5" />
                  Add Contact
                </button>
                <button 
                  onClick={() => { setEditingAutomation({ steps: [], active: false, trigger: { type: 'user_signup' } }); setIsBuilderOpen(true); }}
                  className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold hover:bg-black transition-all shadow-lg shadow-slate-100"
                >
                  <PlayCircle className="w-5 h-5" />
                  Visual Builder
                </button>
              </div>
            )}
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'marketing' && (
            <motion.div key="marketing" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div className="grid md:grid-cols-4 gap-6">
                <StatBox label="Total Contacts" value={contacts.length} sub="CRM Database" icon={Users} color="text-blue-600" bg="bg-blue-50" />
                <StatBox label="Active Flows" value={automations.filter(a => a.active).length} sub="Automations" icon={PlayCircle} color="text-indigo-600" bg="bg-indigo-50" />
                <StatBox label="Segments" value={segments.length} sub="Filtered Lists" icon={Layers} color="text-purple-600" bg="bg-purple-50" />
                <StatBox label="Active Tags" value={tags.length} sub="Categorization" icon={TagIcon} color="text-amber-600" bg="bg-amber-50" />
              </div>

              <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                    {(['contact', 'tag', 'segment', 'automation'] as const).map(mode => (
                      <button 
                        key={mode}
                        onClick={() => setMarketingMode(mode)}
                        className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${marketingMode === mode ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                        {mode}s
                      </button>
                    ))}
                  </div>
                </div>

                {marketingMode === 'contact' && (
                  <ContactManager 
                    contacts={contacts}
                    tags={tags}
                    segments={segments}
                    onAddContact={() => { setEditingContact({ tags: [], status: 'active' }); setIsMarketingModalOpen(true); }}
                    onEditContact={(c) => { setEditingContact(c); setIsMarketingModalOpen(true); }}
                    onDeleteContact={(id) => handleDeleteMarketingItem(id, 'contact')}
                  />
                )}

                {marketingMode === 'automation' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {automations.map(flow => (
                      <div key={flow.id} className="bg-slate-50 border border-slate-100 p-8 rounded-3xl hover:border-indigo-200 transition-all group">
                        <div className="flex items-center justify-between mb-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${flow.active ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                            <Zap className="w-6 h-6" />
                          </div>
                          <div className="flex items-center gap-2">
                             <button onClick={() => { setEditingAutomation(flow); setIsBuilderOpen(true); }} className="p-2 text-slate-400 hover:text-indigo-600"><Edit2 className="w-5 h-5" /></button>
                             <button onClick={() => handleDeleteMarketingItem(flow.id, 'automation')} className="p-2 text-slate-400 hover:text-rose-500"><Trash2 className="w-5 h-5" /></button>
                          </div>
                        </div>
                        <h3 className="text-lg font-black text-slate-900 mb-1">{flow.name}</h3>
                        <p className="text-xs text-slate-500 font-medium mb-4">Trigger: {flow.trigger.type.replace('_', ' ')}</p>
                        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                          <span className="text-[10px] font-black uppercase text-slate-400">{flow.steps.length} Steps</span>
                          <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${flow.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                            {flow.active ? 'Active' : 'Paused'}
                          </span>
                        </div>
                      </div>
                    ))}
                    <button 
                      onClick={() => { setEditingAutomation({ steps: [], active: false, trigger: { type: 'user_signup' } }); setIsBuilderOpen(true); }}
                      className="group p-8 rounded-[2.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-4 hover:border-indigo-600 hover:bg-indigo-50/30 transition-all"
                    >
                      <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-slate-300 group-hover:text-indigo-600 shadow-sm">
                        <Plus className="w-8 h-8" />
                      </div>
                      <p className="text-sm font-black uppercase tracking-widest text-slate-400 group-hover:text-indigo-600">Visual Flow</p>
                    </button>
                  </div>
                )}

                {marketingMode === 'tag' && (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {tags.map(tag => (
                      <div key={tag.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50 flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
                          <span className="font-bold text-slate-900 text-sm">{tag.name}</span>
                        </div>
                        <button onClick={() => handleDeleteMarketingItem(tag.id, 'tag')} className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 className="w-4 h-4 text-slate-300 hover:text-rose-500" />
                        </button>
                      </div>
                    ))}
                    <button 
                      onClick={() => { const name = prompt('Tag Name:'); if(name) handleSaveMarketingAction({ name, color: '#6366f1' }); }}
                      className="p-4 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-indigo-400 hover:text-indigo-600 transition-all flex items-center justify-center gap-2 font-bold text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Add Tag
                    </button>
                  </div>
                )}

                {marketingMode === 'segment' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {segments.map(seg => (
                      <div key={seg.id} className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                           <h3 className="text-xl font-black uppercase tracking-tight">{seg.name}</h3>
                           <button onClick={() => handleDeleteMarketingItem(seg.id, 'segment')} className="text-slate-300 hover:text-rose-500"><Trash2 className="w-5 h-5" /></button>
                        </div>
                        <p className="text-slate-500 text-sm mb-6">{seg.description}</p>
                        <div className="space-y-2">
                           {seg.filters.map((f, idx) => (
                             <div key={idx} className="flex items-center gap-2 text-xs font-bold text-slate-400 bg-slate-50 p-2 rounded-lg border border-slate-100">
                               <Filter className="w-3 h-3" />
                               <span>{f.field}</span>
                               <span className="text-indigo-600">{f.operator}</span>
                               <span className="text-slate-900">"{f.value}"</span>
                             </div>
                           ))}
                        </div>
                        <button 
                          onClick={() => { setEditingSegment(seg); setIsSegmentBuilderOpen(true); }}
                          className="w-full mt-6 py-3 border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all font-bold"
                        >
                          Edit Segment Rules
                        </button>
                      </div>
                    ))}
                    <button 
                      onClick={() => {
                        setEditingSegment({ name: '', description: '', filters: [] });
                        setIsSegmentBuilderOpen(true);
                      }}
                      className="p-8 rounded-[2rem] border-2 border-dashed border-slate-200 text-slate-400 hover:border-indigo-600 hover:text-indigo-600 transition-all flex flex-col items-center justify-center gap-3 font-black text-xs uppercase tracking-widest"
                    >
                      <Plus className="w-8 h-8" />
                      Create Segment
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                <StatBox label="Total Community" value={stats.totalUsers} sub="Registered users" icon={Users} color="text-blue-600" bg="bg-blue-50" />
                <StatBox label="Active Prompts" value={stats.totalPrompts} sub="Marketplace items" icon={LayoutGrid} color="text-indigo-600" bg="bg-indigo-50" />
                <StatBox label="Categories" value={categories.length} sub="Prompt types" icon={TagIcon} color="text-purple-600" bg="bg-purple-50" />
                <StatBox label="Est. Revenue" value={`$${stats.estimatedRevenue}`} sub="Monthly projection" icon={CreditCard} color="text-amber-600" bg="bg-amber-50" />
              </div>

              <div className="grid lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-black">Top Performing Prompts</h3>
                    <ArrowUpRight className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="space-y-6">
                    {prompts.slice(0, 5).map((p, i) => (
                      <div key={p.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-black text-slate-300 w-4">{i + 1}</span>
                          <div>
                            <p className="font-bold text-slate-900 line-clamp-1">{p.title}</p>
                            <p className="text-xs text-slate-500">{p.model}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-indigo-600">
                          <Star className="w-4 h-4 fill-current" />
                          <span className="text-sm font-black">{p.likesCount || 0}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                  <h3 className="text-xl font-black mb-8">Recent Activity</h3>
                  <div className="space-y-6">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="flex gap-4">
                        <div className="w-2 h-2 rounded-full bg-indigo-500 mt-2 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-slate-900">System check completed for node_{i}82</p>
                          <p className="text-xs text-slate-400 mt-1">2 hours ago</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'users' && (
            <motion.div key="users" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">User</th>
                    <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Join Date</th>
                    <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Status</th>
                    <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Role</th>
                    <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredUsers.map(u => (
                    <tr key={u.uid} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-3">
                          <img src={u.photoURL || ''} className="w-10 h-10 rounded-xl bg-slate-100" />
                          <div>
                            <p className="font-bold text-slate-900 line-clamp-1">{u.displayName || 'Anonymous User'}</p>
                            <p className="text-xs text-slate-500">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-4 text-sm text-slate-500">
                        {formatDate(u.createdAt)}
                      </td>
                      <td className="px-8 py-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tight ${u.subscriptionStatus === 'pro' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                          {u.subscriptionStatus}
                        </span>
                      </td>
                      <td className="px-8 py-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tight ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-8 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleUpdateUser(u.uid, { subscriptionStatus: u.subscriptionStatus === 'pro' ? 'free' : 'pro' })}
                            className="p-2 text-slate-400 hover:text-indigo-600" title="Toggle Subscription"
                          >
                            <UserCheck className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => handleUpdateUser(u.uid, { role: u.role === 'admin' ? 'user' : 'admin' })}
                            className="p-2 text-slate-400 hover:text-purple-600" title="Toggle Admin"
                          >
                            <Shield className="w-5 h-5" />
                          </button>
                          {u.subscriptionStatus === 'pro' && (
                            <button 
                              onClick={() => { EmailService.sendSubscriptionEndingEmail(u.uid, u.email); alert("Reminder sent!"); }}
                              className="p-2 text-slate-400 hover:text-amber-600" title="Send Expiry Reminder"
                            >
                              <Clock className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          )}

          {activeTab === 'prompts' && (
            <motion.div key="prompts" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
               <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Prompt Title</th>
                    <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Model</th>
                    <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Access</th>
                    <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredPrompts.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-4">
                        <div>
                          <p className="font-bold text-slate-900 line-clamp-1">{p.title}</p>
                          <p className="text-xs text-slate-500 line-clamp-1">{p.description}</p>
                        </div>
                      </td>
                      <td className="px-8 py-4">
                        <span className="text-xs font-bold bg-slate-100 px-2 py-1 rounded-lg text-slate-600">{p.model}</span>
                      </td>
                      <td className="px-8 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase transition-all ${p.isPaid ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                          {p.isPaid ? <CreditCard className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
                          {p.isPaid ? 'Premium' : 'Free'}
                        </span>
                      </td>
                      <td className="px-8 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => { setEditingPrompt(p); setIsPromptModalOpen(true); }}
                            className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => handleDeletePrompt(p.id!)}
                            className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          )}

          {activeTab === 'categories' && (
            <motion.div key="categories" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
               <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Name</th>
                    <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Slug</th>
                    <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {categories.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-4 font-bold text-slate-900">{c.name}</td>
                      <td className="px-8 py-4 text-sm text-slate-500">{c.slug}</td>
                      <td className="px-8 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => { setEditingCategory(c); setIsCategoryModalOpen(true); }}
                            className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => handleDeleteCategory(c.id)}
                            className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          )}

          {activeTab === 'referrals' && (
            <motion.div key="referrals" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                 <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Affiliate User</th>
                      <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Code</th>
                      <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Total Referrals</th>
                      <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Earnings</th>
                      <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {users.filter(u => u.referralCode).map(u => {
                      const count = users.filter(usr => usr.referredBy === u.referralCode).length;
                      return (
                      <tr key={u.uid} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-4">
                          <div className="flex items-center gap-3">
                            <img src={u.photoURL || ''} className="w-8 h-8 rounded-lg bg-slate-100" />
                            <p className="font-bold text-slate-900">{u.email}</p>
                          </div>
                        </td>
                        <td className="px-8 py-4 text-xs font-black text-indigo-600">{u.referralCode}</td>
                        <td className="px-8 py-4 font-bold">{count} Users</td>
                        <td className="px-8 py-4 font-black text-slate-900 font-mono">${u.affiliateEarnings || 0}.00</td>
                        <td className="px-8 py-4 text-right">
                          <button 
                            onClick={() => handlePayout(u)}
                            className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-black uppercase text-[10px] hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                          >
                            Process Payout
                          </button>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Payout History Section */}
              <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-50">
                   <h3 className="text-xl font-black">Payout History</h3>
                </div>
                <table className="w-full text-left">
                  <thead>
                     <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Affiliate</th>
                        <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Amount</th>
                        <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Date</th>
                        <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                     {payouts.map(p => (
                       <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-8 py-4 text-sm font-bold text-slate-900">{p.userEmail}</td>
                          <td className="px-8 py-4 text-sm font-black font-mono text-green-600">${p.amount}.00</td>
                          <td className="px-8 py-4 text-xs text-slate-500">{new Date(p.processedAt).toLocaleDateString()}</td>
                          <td className="px-8 py-4">
                             <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-black uppercase rounded-lg">Paid</span>
                          </td>
                       </tr>
                     ))}
                     {payouts.length === 0 && (
                       <tr>
                         <td colSpan={4} className="px-8 py-12 text-center text-slate-400 font-bold uppercase text-xs tracking-widest">No payout history yet</td>
                       </tr>
                     )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'revenue' && (
            <motion.div key="revenue" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
              <div className="grid md:grid-cols-3 gap-6">
                 <div className="bg-slate-900 text-white p-8 rounded-[2.5rem]">
                   <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Total MRR</p>
                   <h4 className="text-4xl font-black">${stats.estimatedRevenue}.00</h4>
                   <div className="flex items-center gap-2 text-green-400 text-xs mt-4">
                     <ArrowUpRight className="w-4 h-4" />
                     <span>+12.5% from last month</span>
                   </div>
                 </div>
                 <div className="bg-white border border-slate-100 p-8 rounded-[2.5rem]">
                   <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Active Subs</p>
                   <h4 className="text-4xl font-black">{stats.proUsers}</h4>
                   <p className="text-slate-500 text-xs mt-4 font-medium">Churn rate: 4.2%</p>
                 </div>
                 <div className="bg-white border border-slate-100 p-8 rounded-[2.5rem]">
                   <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">ARPU</p>
                   <h4 className="text-4xl font-black">$15.00</h4>
                   <p className="text-slate-500 text-xs mt-4 font-medium">Average Revenue Per User</p>
                 </div>
              </div>

              <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8">
                <h3 className="text-xl font-black mb-8">Recent Payments (Simulated)</h3>
                <div className="space-y-4">
                  {users.filter(u => u.subscriptionStatus === 'pro').slice(0, 5).map((u, i) => (
                    <div key={u.uid + i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                      <div className="flex items-center gap-4">
                        <div className="bg-green-100 p-2 rounded-xl text-green-600">
                          <Check className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 truncate max-w-[200px]">{u.email}</p>
                          <p className="text-[10px] text-slate-500">Stripe ID: pi_test_{i}x92j</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-slate-900">$15.00</p>
                        <p className="text-[10px] text-green-500 uppercase font-black">Success</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'emails' && (
            <motion.div key="emails" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="grid md:grid-cols-4 gap-4 mb-8">
                <EmailStat label="Total Sent" value={notifications.length} icon={Mail} color="text-indigo-600" bg="bg-indigo-50" />
                <EmailStat label="Login Alerts" value={notifications.filter(n => n.type === 'login').length} icon={ShieldCheck} color="text-blue-600" bg="bg-blue-50" />
                <EmailStat label="Welcome" value={notifications.filter(n => n.type === 'welcome').length} icon={UserCheck} color="text-green-600" bg="bg-green-50" />
                <EmailStat label="Affiliate" value={notifications.filter(n => n.type === 'affiliate_join').length} icon={Gift} color="text-amber-600" bg="bg-amber-50" />
              </div>

              <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Notification</th>
                      <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Recipient</th>
                      <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Time</th>
                      <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {notifications.map(n => (
                      <tr key={n.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-4">
                          <div>
                            <p className="font-bold text-slate-900">{n.subject}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-500">{n.type}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-4">
                          <p className="text-sm font-medium text-slate-600">{n.recipientEmail}</p>
                        </td>
                        <td className="px-8 py-4 text-xs text-slate-400 font-medium">
                          {n.sentAt?.toDate ? n.sentAt.toDate().toLocaleString() : 'Just now'}
                        </td>
                        <td className="px-8 py-4 text-right">
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-black uppercase rounded-lg">Sent</span>
                        </td>
                      </tr>
                    ))}
                    {notifications.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-8 py-20 text-center text-slate-400 font-bold uppercase text-xs tracking-widest">No email logs found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'templates' && (
            <motion.div key="templates" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map(template => (
                  <div key={template.id} className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm hover:border-indigo-200 transition-all group">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                        <Mail className="w-6 h-6" />
                      </div>
                      <button 
                        onClick={() => setEditingTemplate(template)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                    </div>
                    <h3 className="text-lg font-black text-slate-900 mb-1">{template.type}</h3>
                    <p className="text-slate-500 text-sm mb-4 line-clamp-1">{template.subject}</p>
                    <div className="flex flex-wrap gap-2">
                      {template.variables.map(v => (
                        <span key={v} className="text-[10px] font-bold px-2 py-1 bg-slate-100 text-slate-400 rounded-lg">
                          {`{{${v}}}`}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'subscriptions' && (
            <motion.div key="subscriptions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              {/* Trial Config */}
              <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-[1.5rem] flex items-center justify-center">
                    <Calendar className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900">7-Day Free Trial</h3>
                    <p className="text-slate-500 font-medium">Control whether new users get automatic PRO access during their first week.</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
                    <span className="text-xs font-black uppercase text-slate-400">Duration</span>
                    <input 
                      type="number" 
                      value={config?.freeTrialDays || 7}
                      onChange={(e) => handleUpdateTrialDays(parseInt(e.target.value))}
                      className="w-12 bg-transparent font-black text-slate-900 focus:outline-none text-center"
                    />
                    <span className="text-xs font-black uppercase text-slate-400">Days</span>
                  </div>
                  <button 
                    onClick={handleToggleTrial}
                    disabled={isSavingConfig}
                    className={`p-1.5 rounded-full transition-all ${config?.freeTrialEnabled ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}
                  >
                    {config?.freeTrialEnabled ? <ToggleRight className="w-10 h-10" /> : <ToggleLeft className="w-10 h-10" />}
                  </button>
                </div>
              </div>

              {/* Plans List */}
              <div className="grid md:grid-cols-3 gap-6">
                {plans.map(plan => (
                  <div key={plan.id} className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm group">
                    <div className="flex items-center justify-between mb-6">
                      <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-[1.25rem] flex items-center justify-center font-black text-xl">
                        {plan.name[0]}
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setEditingPlan(plan)}
                          className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleDeletePlan(plan.id)}
                          className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    <div className="mb-6">
                      <h3 className="text-2xl font-black text-slate-900 mb-1">{plan.name}</h3>
                      <p className="text-slate-500 text-sm font-medium">{plan.description}</p>
                    </div>
                    <div className="flex items-baseline gap-2 mb-8">
                      <span className="text-3xl font-black text-slate-900">${plan.monthlyPrice}</span>
                      <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">/ month</span>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs font-black uppercase text-slate-400 tracking-widest mb-4">
                        <span>Access Level</span>
                        <span className="text-indigo-600">{plan.accessLevel}</span>
                      </div>
                      {plan.features.slice(0, 3).map(f => (
                        <div key={f} className="flex items-center gap-3 text-sm font-bold text-slate-600">
                          <Check className="w-4 h-4 text-green-500" />
                          <span className="truncate">{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Plan Limits Explanation */}
              <div className="bg-slate-900 text-white rounded-[2.5rem] p-10 flex items-center justify-between">
                <div>
                  <h4 className="text-2xl font-black mb-2">Technical Guardrails</h4>
                  <p className="text-slate-400 font-medium max-w-xl">
                    Access levels (Free, Pro, Enterprise) directly control API limits and prompt generation capabilities across the entire platform.
                  </p>
                </div>
                <div className="flex gap-4">
                  <div className="text-center px-6 py-4 bg-white/5 rounded-2xl border border-white/10">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">PRO Daily</p>
                    <p className="text-xl font-black text-indigo-400">Unlimited</p>
                  </div>
                  <div className="text-center px-6 py-4 bg-white/5 rounded-2xl border border-white/10">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">FREE Daily</p>
                    <p className="text-xl font-black text-amber-400">{plans.find(p => p.id === 'free')?.limits.dailyPrompts || 5}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'permissions' && accessLevels && (
            <motion.div key="permissions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-100 px-8 py-5 flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Feature Access Control Matrix</h3>
                  <button 
                    onClick={handleSaveAccess}
                    disabled={isSavingAccess}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 text-sm disabled:opacity-50"
                  >
                    {isSavingAccess ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save All Changes
                  </button>
                </div>
                
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-50">
                      <th className="px-8 py-6 text-sm font-black text-slate-900 bg-slate-50/30">Feature Capability</th>
                      <th className="px-8 py-6 text-center text-xs font-black uppercase text-slate-400">Free</th>
                      <th className="px-8 py-6 text-center text-xs font-black uppercase text-indigo-400">Pro</th>
                      <th className="px-8 py-6 text-center text-xs font-black uppercase text-amber-400">Enterprise</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    <PermissionRow 
                      label="View Premium Prompts" 
                      sub="Access to paid prompt marketplace items"
                      tiers={['free', 'pro', 'enterprise']}
                      config={accessLevels}
                      onToggle={(tier: any) => togglePermission(tier, 'canViewPremium')}
                    />
                    <PermissionRow 
                      label="One-Click Copy" 
                      sub="Ability to copy prompt text to clipboard"
                      tiers={['free', 'pro', 'enterprise']}
                      config={accessLevels}
                      onToggle={(tier: any) => togglePermission(tier, 'canCopyPrompts')}
                    />
                    <PermissionRow 
                      label="AI Prompt Builder" 
                      sub="Smart generation using Gemini API"
                      tiers={['free', 'pro', 'enterprise']}
                      config={accessLevels}
                      onToggle={(tier: any) => togglePermission(tier, 'canUseAIBuilder')}
                    />
                    <PermissionRow 
                      label="Private Collections" 
                      sub="Save prompts to private folders"
                      tiers={['free', 'pro', 'enterprise']}
                      config={accessLevels}
                      onToggle={(tier: any) => togglePermission(tier, 'canCreateCollections')}
                    />
                    <PermissionRow 
                      label="Data Export" 
                      sub="Export prompt library to CSV/PDF"
                      tiers={['free', 'pro', 'enterprise']}
                      config={accessLevels}
                      onToggle={(tier: any) => togglePermission(tier, 'canExportData')}
                    />
                  </tbody>
                </table>
              </div>

              {/* Usage Quotas */}
              <div className="grid md:grid-cols-3 gap-6">
                {(['free', 'pro', 'enterprise'] as const).map((tier) => (
                  <div key={tier} className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6">{tier} Usage Quotas</h4>
                    <div className="space-y-6">
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Max Daily Generations</label>
                        <input 
                          type="number"
                          value={accessLevels[tier].maxDailyPrompts}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            const newAccess = { ...accessLevels };
                            newAccess[tier].maxDailyPrompts = val;
                            setAccessLevels(newAccess);
                          }}
                          className="w-full bg-slate-50 border-2 border-transparent rounded-xl p-3 font-black text-slate-900 focus:bg-white focus:border-indigo-600 transition-all text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Max Favorites Limit</label>
                        <input 
                          type="number"
                          value={accessLevels[tier].maxFavorites}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            const newAccess = { ...accessLevels };
                            newAccess[tier].maxFavorites = val;
                            setAccessLevels(newAccess);
                          }}
                          className="w-full bg-slate-50 border-2 border-transparent rounded-xl p-3 font-black text-slate-900 focus:bg-white focus:border-indigo-600 transition-all text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Plan Edit Modal */}
        <AnimatePresence>
          {editingPlan && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setEditingPlan(null)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="relative bg-white w-full max-w-2xl rounded-[3rem] p-10 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-2xl font-black">Configure Plan</h3>
                    <p className="text-slate-500 text-sm">Managing {editingPlan.name}</p>
                  </div>
                  <button onClick={() => setEditingPlan(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleSavePlan} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Plan ID (Slug)</label>
                      <input 
                        type="text" required
                        value={editingPlan.id}
                        onChange={e => setEditingPlan({...editingPlan, id: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                        placeholder="e.g. enterprise-plus"
                        className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-4 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all"
                        disabled={plans.some(p => p.id === editingPlan.id && editingPlan.id !== '') && !!plans.find(p => p.id === editingPlan.id)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Display Name</label>
                      <input 
                        type="text" required
                        value={editingPlan.name}
                        onChange={e => setEditingPlan({...editingPlan, name: e.target.value})}
                        placeholder="e.g. Ultra Pro"
                        className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-4 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Description</label>
                    <input 
                      type="text" required
                      value={editingPlan.description}
                      onChange={e => setEditingPlan({...editingPlan, description: e.target.value})}
                      placeholder="e.g. For large teams and scaling startups"
                      className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-4 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Access Level</label>
                      <select 
                        value={editingPlan.accessLevel}
                        onChange={e => setEditingPlan({...editingPlan, accessLevel: e.target.value as any})}
                        className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-4 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all appearance-none"
                      >
                        <option value="free">Free Access</option>
                        <option value="pro">Pro Access</option>
                        <option value="enterprise">Enterprise Access</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Monthly Price ($)</label>
                      <input 
                        type="number" required
                        value={editingPlan.monthlyPrice}
                        onChange={e => setEditingPlan({...editingPlan, monthlyPrice: parseFloat(e.target.value)})}
                        className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-4 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Yearly Price ($)</label>
                      <input 
                        type="number" required
                        value={editingPlan.yearlyPrice}
                        onChange={e => setEditingPlan({...editingPlan, yearlyPrice: parseFloat(e.target.value)})}
                        className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-4 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all"
                      />
                    </div>
                    <div />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Daily Prompt Limit</label>
                      <input 
                        type="number" required
                        value={editingPlan.limits.dailyPrompts}
                        onChange={e => setEditingPlan({
                          ...editingPlan, 
                          limits: { ...editingPlan.limits, dailyPrompts: parseInt(e.target.value) }
                        })}
                        className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-4 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Favorite Limit</label>
                      <input 
                        type="number" required
                        value={editingPlan.limits.favorites}
                        onChange={e => setEditingPlan({
                          ...editingPlan, 
                          limits: { ...editingPlan.limits, favorites: parseInt(e.target.value) }
                        })}
                        className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-4 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Features (Comma separated)</label>
                    <textarea 
                      required rows={3}
                      value={editingPlan.features.join(', ')}
                      onChange={e => setEditingPlan({
                        ...editingPlan, 
                        features: e.target.value.split(',').map(s => s.trim()).filter(s => s !== '')
                      })}
                      className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-4 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all resize-none"
                    />
                  </div>

                  <div className="flex items-center gap-4 bg-slate-50 p-6 rounded-[2rem]">
                    <div className="flex-1">
                      <p className="text-sm font-black text-slate-900">Mark as Popular</p>
                      <p className="text-xs text-slate-500 font-medium">Adds visual highlight on pricing page.</p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setEditingPlan({...editingPlan, isPopular: !editingPlan.isPopular})}
                      className={`p-1 rounded-full transition-all ${editingPlan.isPopular ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-400'}`}
                    >
                      {editingPlan.isPopular ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                    </button>
                  </div>

                  <button 
                    disabled={isSavingPlan}
                    type="submit" 
                    className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl hover:bg-black transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {isSavingPlan ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    {isSavingPlan ? 'Saving Changes...' : 'Push Updates Live'}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Template Modal */}
        <AnimatePresence>
          {isOfferModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setIsOfferModalOpen(false)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="relative bg-white w-full max-w-xl rounded-[3rem] p-10 shadow-2xl"
              >
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-black">Send Bulk Offer</h3>
                  <button onClick={() => setIsOfferModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <form onSubmit={handleSendOffer} className="space-y-6">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Target Audience</label>
                    <select 
                      value={offerData.target}
                      onChange={e => setOfferData({...offerData, target: e.target.value as any})}
                      className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-4 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all appearance-none"
                    >
                      <option value="all">All Registered Users ({users.length})</option>
                      <option value="pro">Pro Members Only ({users.filter(u => u.subscriptionStatus === 'pro').length})</option>
                      <option value="free">Free Users Only ({users.filter(u => u.subscriptionStatus !== 'pro').length})</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Subject</label>
                    <input 
                      type="text" required
                      value={offerData.subject}
                      onChange={e => setOfferData({...offerData, subject: e.target.value})}
                      placeholder="e.g. 50% Off Early Bird Special!"
                      className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-4 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Content</label>
                    <textarea 
                      required rows={5}
                      value={offerData.content}
                      onChange={e => setOfferData({...offerData, content: e.target.value})}
                      placeholder="Write your beautiful marketing message here..."
                      className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-4 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all resize-none"
                    />
                  </div>
                  <button 
                    disabled={isSendingOffer}
                    type="submit" 
                    className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {isSendingOffer ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    {isSendingOffer ? 'Broadcasting...' : 'Blast Offer Email'}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        {/* Template Modal */}
        <AnimatePresence>
          {editingTemplate && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setEditingTemplate(null)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="relative bg-white w-full max-w-2xl rounded-[3rem] p-10 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-2xl font-black">Edit Template</h3>
                    <p className="text-slate-500 text-sm">{editingTemplate.type}</p>
                  </div>
                  <button onClick={() => setEditingTemplate(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleSaveTemplate} className="space-y-6">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Subject Line</label>
                    <input 
                      type="text" required
                      value={editingTemplate.subject}
                      onChange={e => setEditingTemplate({...editingTemplate, subject: e.target.value})}
                      className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-4 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                       <label className="text-xs font-black uppercase tracking-widest text-slate-400">Email Content</label>
                       <div className="flex gap-2">
                         {editingTemplate.variables.map(v => (
                           <button 
                             key={v} type="button"
                             onClick={() => setEditingTemplate({...editingTemplate, content: editingTemplate.content + ` {{${v}}}`})}
                             className="text-[10px] font-bold px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                           >
                             {`+ {{${v}}}`}
                           </button>
                         ))}
                       </div>
                    </div>
                    <textarea 
                      required rows={10}
                      value={editingTemplate.content}
                      onChange={e => setEditingTemplate({...editingTemplate, content: e.target.value})}
                      className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-4 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all resize-none font-sans leading-relaxed"
                    />
                  </div>
                  <button 
                    disabled={isSavingTemplate}
                    type="submit" 
                    className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl hover:bg-black transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {isSavingTemplate ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    {isSavingTemplate ? 'Saving Changes...' : 'Save Template'}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Marketing Builder Overlays */}
        <AnimatePresence>
          {isBuilderOpen && editingAutomation && (
            <div className="fixed inset-0 z-[110] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-8">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-7xl h-full"
              >
                <AutomationBuilder 
                  flow={editingAutomation}
                  tags={tags}
                  templates={templates}
                  onSave={(flow) => {
                    handleSaveMarketingAction({ ...flow, id: editingAutomation.id }, 'automation');
                  }}
                  onCancel={() => setIsBuilderOpen(false)}
                />
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isSegmentBuilderOpen && editingSegment && (
             <div className="fixed inset-0 z-[110] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-8">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="w-full max-w-5xl"
                >
                  <SegmentBuilder 
                    segment={editingSegment}
                    contacts={contacts}
                    onSave={(seg) => {
                      handleSaveMarketingAction({ ...seg, id: editingSegment.id }, 'segment');
                      setIsSegmentBuilderOpen(false);
                    }}
                    onCancel={() => setIsSegmentBuilderOpen(false)}
                  />
                </motion.div>
             </div>
          )}
        </AnimatePresence>

        {/* Marketing Modals */}
        <AnimatePresence>
          {isMarketingModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setIsMarketingModalOpen(false)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="relative bg-white w-full max-w-xl rounded-[3rem] p-10 shadow-2xl overflow-hidden"
              >
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-black capitalize">Manage {marketingMode}</h3>
                  <button onClick={() => setIsMarketingModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {marketingMode === 'contact' && editingContact && (
                  <form onSubmit={(e) => { e.preventDefault(); handleSaveMarketingAction(editingContact); }} className="space-y-6">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Display Name</label>
                      <input 
                        type="text" required
                        value={editingContact.displayName || ''}
                        onChange={e => setEditingContact({...editingContact, displayName: e.target.value})}
                        className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-4 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Email Address</label>
                      <input 
                        type="email" required
                        value={editingContact.email || ''}
                        onChange={e => setEditingContact({...editingContact, email: e.target.value})}
                        className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-4 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Status</label>
                      <select 
                        value={editingContact.status}
                        onChange={e => setEditingContact({...editingContact, status: e.target.value as any})}
                        className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-4 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all appearance-none"
                      >
                        <option value="active">Active</option>
                        <option value="unsubscribed">Unsubscribed</option>
                        <option value="bounced">Bounced</option>
                      </select>
                    </div>
                    <button 
                      disabled={isSavingMarketing}
                      className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-2"
                    >
                      {isSavingMarketing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                      Save Contact
                    </button>
                  </form>
                )}

                {marketingMode === 'automation' && editingAutomation && (
                  <form onSubmit={(e) => { e.preventDefault(); handleSaveMarketingAction(editingAutomation); }} className="space-y-6">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Flow Name</label>
                      <input 
                        type="text" required
                        value={editingAutomation.name || ''}
                        onChange={e => setEditingAutomation({...editingAutomation, name: e.target.value})}
                        className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-4 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Trigger Event</label>
                      <select 
                        value={editingAutomation.trigger?.type}
                        onChange={e => setEditingAutomation({...editingAutomation, trigger: { ...editingAutomation.trigger!, type: e.target.value as any }})}
                        className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-4 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all appearance-none"
                      >
                        <option value="user_signup">On User Signup</option>
                        <option value="tag_added">On Tag Added</option>
                        <option value="subscription_changed">On Subscription Change</option>
                      </select>
                    </div>
                    <div className="bg-slate-50 p-6 rounded-3xl">
                       <p className="text-xs font-black uppercase text-slate-400 mb-4 flex items-center gap-2">
                        <Sliders className="w-3 h-3" />
                         Flow Steps ({editingAutomation.steps?.length || 0})
                       </p>
                       <div className="space-y-3">
                          {editingAutomation.steps?.map((step, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm">
                               <div className="flex items-center gap-3">
                                  <div className="w-6 h-6 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center text-[10px] font-bold">{idx + 1}</div>
                                  <span className="text-xs font-bold capitalize">{step.type.replace('_', ' ')}</span>
                               </div>
                               <button onClick={() => {
                                 const s = [...editingAutomation.steps!];
                                 s.splice(idx, 1);
                                 setEditingAutomation({...editingAutomation, steps: s});
                               }} className="text-slate-300 hover:text-rose-500"><X className="w-4 h-4" /></button>
                            </div>
                          ))}
                          <button 
                            type="button"
                            onClick={() => {
                              const type = prompt('Step Type (send_email, wait, add_tag):', 'send_email');
                              if(type) setEditingAutomation({...editingAutomation, steps: [...(editingAutomation.steps || []), { id: Date.now().toString(), type: type as any, params: {} }]});
                            }}
                            className="w-full border-2 border-dashed border-slate-200 rounded-xl py-3 text-slate-400 hover:border-indigo-400 hover:text-indigo-600 transition-all font-bold text-xs"
                          >
                            + Add Step
                          </button>
                       </div>
                    </div>
                    <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl">
                      <input 
                        type="checkbox" id="flowStatus"
                        checked={editingAutomation.active || false}
                        onChange={e => setEditingAutomation({...editingAutomation, active: e.target.checked})}
                        className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <label htmlFor="flowStatus" className="text-sm font-bold text-slate-700">Set Flow Active</label>
                    </div>
                    <button 
                      disabled={isSavingMarketing}
                      className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-black transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-2"
                    >
                      {isSavingMarketing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                      Save Automation Flow
                    </button>
                  </form>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* --- Modals --- */}
      <AnimatePresence>
        {isPromptModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsPromptModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-[3rem] p-10 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black">{editingPrompt?.id ? 'Edit Marketplace Prompt' : 'Add New Marketplace Prompt'}</h3>
                <button onClick={() => setIsPromptModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleSavePrompt} className="space-y-6">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Title</label>
                  <input 
                    type="text" required
                    value={editingPrompt?.title || ''}
                    onChange={e => setEditingPrompt({...editingPrompt, title: e.target.value})}
                    placeholder="e.g. Expert Python Architect"
                    className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-4 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Model</label>
                    <input 
                      type="text" required
                      value={editingPrompt?.model || ''}
                      onChange={e => setEditingPrompt({...editingPrompt, model: e.target.value})}
                      placeholder="e.g. GPT-4o"
                      className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-4 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Category</label>
                    <select 
                      required
                      value={editingPrompt?.categoryId || ''}
                      onChange={e => setEditingPrompt({...editingPrompt, categoryId: e.target.value})}
                      className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-4 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all appearance-none"
                    >
                      <option value="">Select Category</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Short Description</label>
                  <textarea 
                    required rows={2}
                    value={editingPrompt?.description || ''}
                    onChange={e => setEditingPrompt({...editingPrompt, description: e.target.value})}
                    placeholder="Describe what this prompt does in a few sentences..."
                    className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-4 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Full Prompt Template</label>
                  <textarea 
                    required rows={8}
                    value={editingPrompt?.content || ''}
                    onChange={e => setEditingPrompt({...editingPrompt, content: e.target.value})}
                    placeholder="Paste the expert prompt content here..."
                    className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-4 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all font-mono text-sm"
                  />
                </div>
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl">
                  <input 
                    type="checkbox" id="modalPaid" 
                    checked={editingPrompt?.isPaid || false}
                    onChange={e => setEditingPrompt({...editingPrompt, isPaid: e.target.checked})}
                    className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="modalPaid" className="text-sm font-bold text-slate-700 select-none">Premium Item (Requires PRO Subscription to View Full Content)</label>
                </div>
                <div className="flex gap-4 pt-4 sticky bottom-0 bg-white shadow-[0_-20px_20px_rgba(255,255,255,0.8)] pb-2">
                  <button type="submit" className="flex-grow bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                    <Save className="w-5 h-5" />
                    Save Changes
                  </button>
                  <button type="button" onClick={() => setIsPromptModalOpen(false)} className="px-8 bg-slate-100 text-slate-600 font-bold py-4 rounded-2xl hover:bg-slate-200 transition-all">Cancel</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isCategoryModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               onClick={() => setIsCategoryModalOpen(false)}
               className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl"
            >
              <h3 className="text-2xl font-black mb-8">{editingCategory?.id ? 'Edit Category' : 'Create New Category'}</h3>
              <form onSubmit={handleSaveCategory} className="space-y-6">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Category Name</label>
                  <input 
                    type="text" required
                    value={editingCategory?.name || ''}
                    onChange={e => setEditingCategory({...editingCategory, name: e.target.value})}
                    placeholder="e.g. Marketing"
                    className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-4 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all"
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="submit" className="flex-grow bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                    <Save className="w-5 h-5" />
                    Save Category
                  </button>
                  <button type="button" onClick={() => setIsCategoryModalOpen(false)} className="px-8 bg-slate-100 text-slate-600 font-bold py-4 rounded-2xl hover:bg-slate-200 transition-all">Cancel</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PermissionRow({ label, sub, tiers, config, onToggle }: any) {
  return (
    <tr className="hover:bg-slate-50/50 transition-colors">
      <td className="px-8 py-5">
        <p className="font-bold text-slate-900">{label}</p>
        <p className="text-xs text-slate-500">{sub}</p>
      </td>
      {tiers.map((tier: string) => (
        <td key={tier} className="px-8 py-5 text-center">
          <button 
            onClick={() => onToggle(tier)}
            className="p-2 rounded-full transition-all text-indigo-600"
          >
            {/* Logic simplified for the toggle display in the row */}
            {(label === 'View Premium Prompts' && config[tier].canViewPremium) ||
             (label === 'One-Click Copy' && config[tier].canCopyPrompts) ||
             (label === 'AI Prompt Builder' && config[tier].canUseAIBuilder) ||
             (label === 'Private Collections' && config[tier].canCreateCollections) ||
             (label === 'Data Export' && config[tier].canExportData) ? (
              <ToggleRight className="w-8 h-8" />
            ) : (
              <ToggleLeft className="w-8 h-8 text-slate-300" />
            )}
          </button>
        </td>
      ))}
    </tr>
  );
}

function SidebarLink({ children, icon: Icon, active, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-all ${active ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
    >
      <Icon className="w-5 h-5" />
      {children}
    </button>
  );
}

function StatBox({ label, value, sub, icon: Icon, color, bg }: any) {
  return (
    <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm transition-all hover:shadow-md">
      <div className={`w-12 h-12 ${bg} ${color} rounded-2xl flex items-center justify-center mb-4`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
        <h4 className="text-2xl font-black text-slate-900 mb-1">{value}</h4>
        <p className="text-xs text-slate-500 font-medium">{sub}</p>
      </div>
    </div>
  );
}

function EmailStat({ label, value, icon: Icon, color, bg }: any) {
  return (
    <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
      <div className={`w-10 h-10 ${bg} ${color} rounded-xl flex items-center justify-center flex-shrink-0`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
        <h4 className="text-xl font-black text-slate-900 leading-tight">{value}</h4>
      </div>
    </div>
  );
}

function AdminSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-slate-500 font-bold animate-pulse">Initializing Control Tower...</p>
      </div>
    </div>
  );
}

function AdminAccessDenied() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-[3rem] p-12 border border-slate-100 shadow-xl text-center">
        <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-8">
          <AlertCircle className="w-10 h-10" />
        </div>
        <h2 className="text-3xl font-black text-slate-900 mb-4">Access Restricted</h2>
        <p className="text-slate-500 mb-8 leading-relaxed">This area is for system administrators only. Please sign in with an authorized account to continue.</p>
        <button onClick={() => window.location.href = '/'} className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-slate-800 transition-all">
          Back to Safety
        </button>
      </div>
    </div>
  );
}
