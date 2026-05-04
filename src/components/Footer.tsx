import { Link } from 'react-router-dom';
import { Sparkles, Twitter, Linkedin, Facebook, Github, Globe } from 'lucide-react';
import { useConfig } from '../hooks/useConfig';

export default function Footer() {
  const { config } = useConfig();
  
  return (
    <footer className="bg-card border-t border-border pt-24 pb-12 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[100px] -z-10 rounded-full translate-x-1/2 -translate-y-1/2" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-16 mb-20">
          <div className="col-span-1 md:col-span-1">
            <Link to="/" className="flex items-center gap-3 mb-8 group">
              <div className="bg-primary p-2 rounded-xl group-hover:rotate-12 transition-transform shadow-lg shadow-primary/20">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-black text-2xl tracking-tighter text-foreground uppercase">{config.siteName}</span>
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed mb-8 font-medium max-w-xs">
              {config.siteTagline}
            </p>
            <div className="flex gap-4">
              <SocialIcon icon={Twitter} />
              <SocialIcon icon={Linkedin} />
              <SocialIcon icon={Github} />
            </div>
          </div>

          <div>
            <h4 className="font-black text-muted-foreground uppercase tracking-[0.2em] text-[10px] mb-8">Platform</h4>
            <ul className="space-y-4">
              <FooterLink to="/explore" label="Blueprint Library" />
              <FooterLink to="/pricing" label="Membership Plans" />
              <FooterLink to="/blog" label="Engineering Blog" />
              <FooterLink to="/affiliate" label="Partner Program" />
            </ul>
          </div>

          <div>
            <h4 className="font-black text-muted-foreground uppercase tracking-[0.2em] text-[10px] mb-8">Legal Console</h4>
            <ul className="space-y-4">
              <FooterLink to="/terms" label="Terms of Service" />
              <FooterLink to="/privacy" label="Privacy Policy" />
              <FooterLink to="/cookies" label="Cookie Policy" />
              <FooterLink to="/dmca" label="DMCA Notice" />
            </ul>
          </div>

          <div>
            <h4 className="font-black text-muted-foreground uppercase tracking-[0.2em] text-[10px] mb-8">Support Nodes</h4>
            <ul className="space-y-4">
              <FooterLink to="/contact" label="Contact Center" />
              <FooterLink to="/contact" label="Documentation" />
              <li>
                <a href={`mailto:${config.supportEmail}`} className="text-muted-foreground hover:text-primary font-bold text-sm transition-all flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  {config.supportEmail}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-12 border-t border-border flex flex-col md:flex-row justify-between items-center gap-8">
          <p className="text-muted-foreground/30 text-[10px] font-black uppercase tracking-[0.3em]">
            © {new Date().getFullYear()} {config.siteName.toUpperCase()} CORE. SYSTEM v2.5.0.
          </p>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
              <span className="text-muted-foreground/40 text-[10px] font-black uppercase tracking-widest">Mainnet Operational</span>
            </div>
            <div className="h-4 w-[1px] bg-border" />
            <div className="flex items-center gap-2 text-muted-foreground/40 hover:text-primary transition-colors cursor-pointer">
              <Globe className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Global (EN)</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

function SocialIcon({ icon: Icon }: { icon: any }) {
  return (
    <a href="#" className="p-2.5 bg-muted text-muted-foreground hover:text-primary hover:bg-muted/50 rounded-xl border border-border transition-all shadow-sm active:scale-95">
      <Icon className="w-5 h-5" />
    </a>
  );
}

function FooterLink({ to, label }: { to: string; label: string }) {
  return (
    <li>
      <Link to={to} className="text-muted-foreground hover:text-primary font-bold text-sm transition-all inline-flex items-center group">
        <div className="w-0 group-hover:w-2 h-[2px] bg-primary transition-all mr-0 group-hover:mr-2 rounded-full" />
        {label}
      </Link>
    </li>
  );
}
