import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Sparkles, Search, Library, Zap, ArrowRight, ShieldCheck, TrendingUp, Cpu, Globe, Rocket } from 'lucide-react';
import { useSEO } from '../hooks/useSEO';
import { useConfig } from '../hooks/useConfig';

const FEATURES = [
  {
    title: 'Expert Marketplace',
    desc: 'Browse thousands of high-quality, verified blueprints for any LLM.',
    icon: Search
  },
  {
    title: 'Secure Vault',
    desc: 'Organize, save, and access your private prompt collection anywhere.',
    icon: Library
  },
  {
    title: 'Universal Access',
    desc: 'One membership gives you full access to all premium expert formulas.',
    icon: Zap
  }
];

export default function LandingPage() {
  const { config } = useConfig();
  useSEO('home');

  return (
    <div className="flex flex-col gap-32 pb-32 overflow-hidden">
      {/* Hero Section */}
      <section className="relative pt-24 pb-20">
        {/* Futuristic Background Element */}
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[140%] h-[600px] bg-primary/5 -z-10 rounded-[100%] blur-[120px]" />
        
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 bg-muted px-5 py-2.5 rounded-full border border-border text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-10 shadow-sm"
          >
            <Sparkles className="w-4 h-4" />
            <span>Redefining {config.siteName} Collaboration</span>
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-6xl md:text-8xl font-black tracking-tight text-foreground mb-8 leading-[0.9]"
          >
            The Operating System for <span className="text-primary">AI Prompts.</span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="max-w-3xl mx-auto text-lg md:text-2xl text-muted-foreground mb-12 leading-relaxed font-medium"
          >
            {config.siteTagline} Join the global marketplace for elite AI blueprints powered by {config.siteName}.
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-6"
          >
            <Link 
              to="/explore" 
              className="w-full sm:w-auto bg-primary text-primary-foreground px-10 py-5 rounded-2xl font-black text-xl hover:opacity-90 shadow-2xl shadow-primary/20 transition-all flex items-center justify-center gap-3"
            >
              Enter Marketplace
              <ArrowRight className="w-6 h-6" />
            </Link>
            <Link 
              to="/pricing" 
              className="w-full sm:w-auto bg-card text-foreground border border-border px-10 py-5 rounded-2xl font-black text-xl hover:bg-muted transition-all shadow-sm"
            >
              View Membership
            </Link>
          </motion.div>

          {/* Abstract Hero Image / Component placeholder */}
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 1 }}
            className="mt-24 relative max-w-5xl mx-auto"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 h-64 top-auto bottom-0" />
            <div className="bg-card rounded-[3rem] border border-border p-4 shadow-2xl overflow-hidden aspect-[16/9] md:aspect-[21/9] flex items-center justify-center">
               <div className="flex flex-col items-center gap-4 text-muted-foreground/20">
                  <Cpu className="w-20 h-20 animate-pulse" />
                  <span className="font-black uppercase tracking-[0.5em] text-xs">Neural Interface v2.5</span>
               </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
           <StatItem label="Active Nodes" value="50K+" />
           <StatItem label="Verified Formulas" value="12K+" />
           <StatItem label="Market Cap" value="$2M+" />
           <StatItem label="Efficiency" value="99.9%" />
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4">
        <div className="text-center mb-20">
           <h2 className="text-4xl md:text-5xl font-black text-foreground mb-4 tracking-tighter">Engineered for Results.</h2>
           <p className="text-muted-foreground max-w-xl mx-auto font-medium">Professional grade tools for serious prompt engineers.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className="bg-card p-10 rounded-[3rem] border border-border shadow-sm hover:shadow-2xl transition-all group relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-primary scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
              <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-8 text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                <feature.icon className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black mb-4 text-foreground leading-tight">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed font-medium">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Dark Banner / Trust Section */}
      <section className="bg-foreground text-background py-32 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
           <Globe className="w-[800px] h-[800px] absolute -right-64 -top-64" />
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-12">
             <div className="inline-flex items-center gap-2 bg-background/10 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-background/20 backdrop-blur-md">
                Institutional Security
             </div>
             <h2 className="text-4xl md:text-6xl font-black tracking-tight leading-[0.95]">Secured by the world's most advanced prompt encryption.</h2>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12">
                <TrustIcon icon={ShieldCheck} label="Military Grade" />
                <TrustIcon icon={Rocket} label="Global Delivery" />
                <TrustIcon icon={Zap} label="Zero Latency" />
             </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4">
        <div className="bg-primary text-primary-foreground rounded-[4rem] p-12 md:p-24 text-center relative overflow-hidden shadow-2xl shadow-primary/20">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            className="relative z-10"
          >
            <h2 className="text-4xl md:text-6xl font-black mb-8 leading-tight tracking-tighter">Ready to join the elite?</h2>
            <p className="opacity-80 text-lg md:text-xl mb-12 max-w-xl mx-auto font-medium">
              Join 50,000+ creators who are engineering the future of AI communication.
            </p>
            <Link 
              to="/register"
              className="inline-flex items-center gap-3 bg-white text-primary px-12 py-6 rounded-[2rem] font-black text-2xl hover:scale-105 transition-all shadow-2xl shadow-black/20"
            >
              Get Access Now
              <ArrowRight className="w-7 h-7" />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

function StatItem({ label, value }: { label: string, value: string }) {
  return (
    <div className="text-center group">
      <div className="text-4xl md:text-6xl font-black text-foreground mb-2 group-hover:text-primary transition-colors">{value}</div>
      <div className="text-muted-foreground font-black tracking-[0.2em] uppercase text-[10px] opacity-50">{label}</div>
    </div>
  );
}

function TrustIcon({ icon: Icon, label }: { icon: any, label: string }) {
  return (
    <div className="flex flex-col items-center gap-4">
       <div className="w-16 h-16 bg-background/5 rounded-3xl flex items-center justify-center border border-background/10">
          <Icon className="w-8 h-8 opacity-60" />
       </div>
       <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{label}</span>
    </div>
  );
}
