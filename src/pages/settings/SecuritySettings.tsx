import { Shield, Mail, Lock, LogOut, CheckCircle2, ShieldAlert } from 'lucide-react';
import { motion } from 'motion/react';

export default function SecuritySettings() {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
        <div className="bg-card rounded-[3rem] p-8 md:p-12 border border-border shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <h2 className="text-2xl font-black flex items-center gap-3 text-foreground">
              <div className="w-10 h-10 bg-rose-500/10 text-rose-500 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              Security & Access
            </h2>
            <div className="flex items-center gap-2 px-4 py-2 bg-green-500/5 text-green-500 border border-green-500/10 rounded-2xl">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-xs font-black uppercase tracking-[0.15em]">System Protected</span>
            </div>
          </div>
          
          <div className="space-y-4">
            <SecurityItem 
              icon={Mail} 
              title="Google Authentication" 
              desc="Your identity is securely verified via your Google Workspace account."
              action="Verified"
              actionType="status"
            />
            <SecurityItem 
              icon={Lock} 
              title="Multi-Factor Auth" 
              desc="Add an extra layer of protection to your prompt library and wallet."
              action="Enable 2FA"
            />
            <SecurityItem 
              icon={LogOut} 
              title="Active Sessions" 
              desc="Monitor and manage devices where your account is currently logged in."
              action="Manage"
            />
          </div>

          <div className="mt-16 p-8 bg-muted rounded-[2rem] border border-border flex items-center gap-6">
            <div className="w-12 h-12 bg-card rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
              <ShieldAlert className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground mb-1">Last Security Review</h4>
              <p className="text-xs text-muted-foreground">Your account security was last audited on May 4, 2026. No vulnerabilities were detected.</p>
            </div>
          </div>
        </div>
    </motion.div>
  );
}

function SecurityItem({ icon: Icon, title, desc, action, actionType = 'button' }: any) {
  return (
    <div className="flex items-center justify-between p-8 bg-muted/30 rounded-[2.5rem] border border-transparent hover:border-border hover:bg-muted/50 transition-all group gap-6">
      <div className="flex items-center gap-6">
        <div className="w-14 h-14 bg-card rounded-2xl flex items-center justify-center text-muted-foreground/40 shadow-sm border border-border group-hover:scale-110 transition-transform group-hover:text-primary">
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="font-black text-foreground text-lg leading-tight mb-1">{title}</p>
          <p className="text-xs font-medium text-muted-foreground max-w-[200px] md:max-w-md leading-relaxed">{desc}</p>
        </div>
      </div>
      {actionType === 'status' ? (
        <div className="flex items-center gap-2 px-6 py-3 bg-primary/10 text-primary border border-primary/20 rounded-xl shrink-0">
          <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">{action}</span>
        </div>
      ) : (
        <button className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground bg-card hover:bg-muted border border-border px-6 py-3 rounded-xl transition-all shrink-0 shadow-sm">
          {action}
        </button>
      )}
    </div>
  );
}
