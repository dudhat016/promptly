import { useAuth } from '../../hooks/useAuth';
import { CreditCard, Zap, Shield, ExternalLink, ChevronRight, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

export default function BillingSettings() {
  const { isPro, profile } = useAuth();

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="bg-card rounded-[3rem] p-8 md:p-12 border border-border shadow-sm space-y-10 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-2xl font-black flex items-center gap-3 text-foreground">
              <div className="w-10 h-10 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
              Plan & Billing
            </h2>
            <div className="flex items-center gap-2">
              <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] ${isPro ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-muted text-muted-foreground'}`}>
                {profile?.subscriptionStatus?.toUpperCase() || 'FREE'} STATUS
              </span>
            </div>
        </div>

        {!isPro ? (
          <div className="bg-foreground text-background rounded-[3rem] p-10 relative overflow-hidden group shadow-2xl">
              <Zap className="w-48 h-48 absolute -right-12 -bottom-12 opacity-5 rotate-12 group-hover:rotate-0 transition-transform duration-1000" />
              <div className="relative z-10 max-w-md">
                <div className="bg-background/10 inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-6 backdrop-blur-md border border-background/20">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  Most Popular Upgrade
                </div>
                <h3 className="text-4xl font-black mb-4 tracking-tighter">Go Pro. Be Expert.</h3>
                <p className="opacity-60 text-sm mb-10 leading-relaxed font-medium">Unlock priority AI model access, unlimited library storage, and advanced prompt engineering tools.</p>
                <Link to="/pricing" className="bg-primary text-primary-foreground font-black px-10 py-5 rounded-2xl hover:opacity-90 transition-all shadow-2xl shadow-primary/20 inline-block">
                  Upgrade for $25/mo
                </Link>
              </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-primary to-primary-foreground/10 rounded-[3rem] p-10 text-primary-foreground relative overflow-hidden shadow-2xl shadow-primary/20">
              <Shield className="w-48 h-48 absolute -right-12 -bottom-12 opacity-5 -rotate-12" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <Check className="w-6 h-6 p-1 bg-white text-primary rounded-full" />
                  <h3 className="text-3xl font-black text-white">PRO Member</h3>
                </div>
                <p className="text-white/60 text-sm mb-10 leading-relaxed max-w-md font-medium">Your subscription is active. You have full access to all professional prompt engineering tools.</p>
                
                <div className="flex flex-wrap gap-4">
                  <button className="bg-white/10 text-white font-black px-8 py-4 rounded-2xl hover:bg-white/20 transition-all flex items-center gap-3 border border-white/5 backdrop-blur-sm">
                    <ExternalLink className="w-5 h-5" />
                    Stripe Billing Portal
                  </button>
                  <button className="text-white/50 hover:text-white font-black px-8 py-4 rounded-2xl transition-all text-sm">
                    Cancel Subscription
                  </button>
                </div>
              </div>
          </div>
        )}

        <div className="pt-4">
          <div className="flex items-center justify-between mb-8">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Default Payment Method</h4>
              <button className="text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 px-4 py-2 rounded-xl transition-all">Update Card</button>
          </div>
          <div className="group flex flex-col md:flex-row md:items-center justify-between p-8 bg-muted rounded-[2.5rem] border-2 border-transparent hover:border-primary/20 hover:bg-card hover:shadow-xl transition-all duration-500 gap-6">
            <div className="flex items-center gap-8">
              <div className="bg-card p-4 rounded-2xl border border-border shadow-sm group-hover:scale-110 transition-transform">
                <CreditCard className="w-10 h-10 text-muted-foreground/40 group-hover:text-primary transition-colors" />
              </div>
              <div>
                <p className="text-lg font-black text-foreground">Visa ending in 4242</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[10px] font-black text-primary bg-primary/10 px-2.5 py-0.5 rounded-lg uppercase tracking-wider">Primary</span>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight opacity-60">Expires 12/2028</span>
                </div>
              </div>
            </div>
            <button className="p-4 bg-background text-muted-foreground hover:text-foreground rounded-2xl transition-all shadow-sm border border-border self-end md:self-center"><ChevronRight className="w-6 h-6" /></button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function Sparkles(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  );
}
