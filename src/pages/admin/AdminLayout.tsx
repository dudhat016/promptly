import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { 
  Users, LayoutGrid, CreditCard, BarChart3, Shield, Tag as TagIcon, Mail, Edit2, Zap, ShieldCheck, Send, ChevronDown, Cpu, FileText, MessageSquare, Search, X, Settings as SettingsIcon
} from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

function SidebarLink({ to, icon: Icon, children }: any) {
  return (
    <NavLink 
      to={to}
      end={to === '/admin'}
      className={({ isActive }) => 
        `flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${
          isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
        }`
      }
    >
      <Icon className="w-5 h-5" />
      {children}
    </NavLink>
  );
}

function SidebarSubLink({ to, children }: any) {
  return (
    <NavLink 
      to={to}
      className={({ isActive }) => 
        `flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
          isActive ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'
        }`
      }
    >
      <div className="w-1.5 h-1.5 rounded-full bg-current opacity-40" />
      {children}
    </NavLink>
  );
}

function SidebarGroup({ icon: Icon, label, children, activePath }: any) {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(location.pathname.includes(activePath));

  useEffect(() => {
    setIsOpen(location.pathname.includes(activePath));
  }, [location.pathname, activePath]);

  return (
    <div className="space-y-1">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl font-bold transition-all ${
          location.pathname.includes(activePath) ? 'text-white bg-indigo-600/10' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
        }`}
      >
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5" />
          {label}
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="pl-6 mt-1 space-y-1 border-l-2 border-slate-800 ml-6">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const { user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      {/* Mobile Sidebar Toggle */}
      <button 
        onClick={() => setIsSidebarOpen(true)}
        className="lg:hidden fixed bottom-6 right-6 z-50 bg-indigo-600 text-white p-4 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all"
      >
        <LayoutGrid className="w-6 h-6" />
      </button>

      {/* Backdrop for Mobile */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60]"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`w-72 bg-slate-900 text-white min-h-screen flex flex-col p-6 fixed lg:sticky top-0 h-screen overflow-y-auto z-[70] shadow-2xl shadow-slate-900/50 transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex items-center justify-between mb-12 px-2">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-black text-xl leading-tight">Admin</h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Control Tower</p>
            </div>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-2 text-slate-500 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="space-y-2 flex-grow">
          <SidebarLink to="/admin" icon={BarChart3}>Overview</SidebarLink>
          <SidebarLink to="/admin/prompts" icon={LayoutGrid}>Prompts</SidebarLink>
          <SidebarLink to="/admin/seo" icon={Search}>SEO Audit</SidebarLink>
          <SidebarLink to="/admin/categories" icon={TagIcon}>Categories</SidebarLink>
          <SidebarLink to="/admin/inquiries" icon={MessageSquare}>Inquiries</SidebarLink>
          <SidebarLink to="/admin/tickets" icon={ShieldCheck}>Support Tickets</SidebarLink>
          <SidebarLink to="/admin/blog" icon={FileText}>Blog</SidebarLink>
          <SidebarLink to="/admin/users" icon={Users}>Users</SidebarLink>
          <SidebarLink to="/admin/models" icon={Cpu}>AI Models</SidebarLink>
          <SidebarLink to="/admin/referrals" icon={CreditCard}>Affiliates</SidebarLink>
          <SidebarLink to="/admin/withdrawals" icon={Send}>Withdrawals</SidebarLink>
          <SidebarLink to="/admin/revenue" icon={CreditCard}>Financials</SidebarLink>
          <SidebarLink to="/admin/emails" icon={Mail}>Email Logs</SidebarLink>
          <SidebarLink to="/admin/templates" icon={Edit2}>Templates</SidebarLink>
          <SidebarLink to="/admin/subscriptions" icon={Zap}>Plans & Trial</SidebarLink>
          <SidebarLink to="/admin/permissions" icon={ShieldCheck}>Permissions</SidebarLink>
          <SidebarLink to="/admin/settings" icon={SettingsIcon}>Settings</SidebarLink>
          
          <SidebarGroup icon={Send} label="Marketing & CRM" activePath="/admin/marketing">
            <SidebarSubLink to="/admin/marketing/contacts">Contacts</SidebarSubLink>
            <SidebarSubLink to="/admin/marketing/tags">Tags</SidebarSubLink>
            <SidebarSubLink to="/admin/marketing/segments">Segments</SidebarSubLink>
            <SidebarSubLink to="/admin/marketing/automations">Automations</SidebarSubLink>
          </SidebarGroup>
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-800">
          <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-2xl">
            {user?.photoURL ? (
              <img src={user.photoURL} className="w-10 h-10 rounded-xl" alt="" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center text-white font-bold uppercase">
                {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'A'}
              </div>
            )}
            <div className="overflow-hidden">
              <p className="text-xs font-bold truncate">{user?.displayName}</p>
              <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-grow w-full lg:w-auto p-4 lg:p-10 max-w-[1400px] mx-auto overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}
