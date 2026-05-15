import { Link } from 'react-router-dom';
import { Github, Globe, Linkedin, Sparkles, Twitter, Facebook, Instagram, Youtube } from 'lucide-react';
import { useConfig } from '../hooks/useConfig';
import { useParams } from 'react-router-dom';
import NewsletterSignup from './marketing/NewsletterSignup';

export default function Footer() {
  const { config } = useConfig();
  const { lng } = useParams();
  const prefix = (path: string) => `/${lng}${path.startsWith('/') ? path : '/' + path}`;

  const COLS = [
    {
      heading: 'Platform',
      links: [
        { to: prefix('/explore'),   label: 'Explore Prompts' },
        { to: prefix('/pricing'),   label: 'Pricing'          },
        { to: prefix('/blog'),      label: 'Blog'             },
        { to: prefix('/affiliate'), label: 'Partner Program'  },
      ],
    },
    {
      heading: 'Legal',
      links: [
        { to: prefix('/terms'),   label: 'Terms of Service' },
        { to: prefix('/privacy'), label: 'Privacy Policy'   },
        { to: prefix('/cookies'), label: 'Cookie Policy'    },
        { to: prefix('/dmca'),    label: 'DMCA'             },
      ],
    },
    {
      heading: 'Support',
      links: [
        { to: prefix('/contact'), label: 'Contact Us'  },
        { to: prefix('/faq'),     label: 'Common FAQs' },
        { to: prefix('/dashboard/support'), label: 'Help Center' },
      ],
    },
  ];

  return (
    <footer className="bg-background border-t border-border">
      <div className="container mx-auto px-4 pt-16 pb-8">

        {/* Top grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 pb-12 border-b border-border">

          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to={prefix('/')} className="flex items-center gap-2 mb-4 group w-fit">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center group-hover:scale-95 transition-transform gradient-cta"
                style={{ boxShadow: '0 0 14px rgba(139,92,246,0.35)' }}
              >
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-base font-display text-foreground">{config.siteName}</span>
            </Link>
            <p className="text-sm leading-relaxed max-w-[200px] mb-5 text-muted-foreground">
              {config.siteTagline}
            </p>
            <div className="flex flex-wrap gap-2">
              {config.socials?.twitter && (
                <a href={config.socials.twitter} target="_blank" rel="noopener noreferrer" className="footer-social-btn"><Twitter className="w-3.5 h-3.5" /></a>
              )}
              {config.socials?.facebook && (
                <a href={config.socials.facebook} target="_blank" rel="noopener noreferrer" className="footer-social-btn"><Facebook className="w-3.5 h-3.5" /></a>
              )}
              {config.socials?.instagram && (
                <a href={config.socials.instagram} target="_blank" rel="noopener noreferrer" className="footer-social-btn"><Instagram className="w-3.5 h-3.5" /></a>
              )}
              {config.socials?.linkedin && (
                <a href={config.socials.linkedin} target="_blank" rel="noopener noreferrer" className="footer-social-btn"><Linkedin className="w-3.5 h-3.5" /></a>
              )}
              {config.socials?.github && (
                <a href={config.socials.github} target="_blank" rel="noopener noreferrer" className="footer-social-btn"><Github className="w-3.5 h-3.5" /></a>
              )}
              {config.socials?.youtube && (
                <a href={config.socials.youtube} target="_blank" rel="noopener noreferrer" className="footer-social-btn"><Youtube className="w-3.5 h-3.5" /></a>
              )}
              {config.socials?.discord && (
                <a href={config.socials.discord} target="_blank" rel="noopener noreferrer" className="footer-social-btn">
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                </a>
              )}
            </div>
          </div>

          {/* Link columns */}
          {COLS.map((col) => (
            <div key={col.heading}>
              <p className="text-xs font-semibold uppercase tracking-widest mb-4 text-muted-foreground/60">
                {col.heading}
              </p>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
                {col.heading === 'Support' && config.supportEmail && (
                  <li>
                    <a
                      href={`mailto:${config.supportEmail}`}
                      className="text-sm font-medium text-primary/70 hover:text-primary transition-colors"
                    >
                      {config.supportEmail}
                    </a>
                  </li>
                )}
              </ul>
            </div>
          ))}
        </div>

        {/* Newsletter strip */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-8 border-b border-border">
          <div>
            <p className="text-sm font-bold text-foreground">Get AI prompt tips, weekly.</p>
            <p className="text-xs text-muted-foreground mt-0.5">New prompts, tools, and workflow ideas. No spam.</p>
          </div>
          <NewsletterSignup variant="inline" label="" className="w-full sm:w-auto sm:min-w-[340px]" />
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6">
          <p className="text-xs font-medium text-muted-foreground/50">
            © {new Date().getFullYear()} {config.siteName}. All rights reserved.
          </p>
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                config.systemStatus === 'degraded' ? 'bg-amber-500' :
                config.systemStatus === 'outage'   ? 'bg-rose-500'  : 'bg-emerald-500'
              }`} />
              <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground/40">
                {config.systemStatus === 'degraded' ? 'Partial outage' :
                 config.systemStatus === 'outage'   ? 'Service disruption' :
                 config.statusText || 'All systems operational'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground/40">
              <Globe className="w-3.5 h-3.5" />
              <span className="text-xs font-medium uppercase tracking-widest">{lng}</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
