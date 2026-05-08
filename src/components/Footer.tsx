import { Link } from 'react-router-dom';
import { Github, Globe, Linkedin, Sparkles, Twitter } from 'lucide-react';
import { useConfig } from '../hooks/useConfig';

export default function Footer() {
  const { config } = useConfig();

  const COLS = [
    {
      heading: 'Platform',
      links: [
        { to: '/explore',   label: 'Explore Prompts' },
        { to: '/pricing',   label: 'Pricing'          },
        { to: '/blog',      label: 'Blog'             },
        { to: '/affiliate', label: 'Partner Program'  },
      ],
    },
    {
      heading: 'Legal',
      links: [
        { to: '/terms',   label: 'Terms of Service' },
        { to: '/privacy', label: 'Privacy Policy'   },
        { to: '/cookies', label: 'Cookie Policy'    },
        { to: '/dmca',    label: 'DMCA'             },
      ],
    },
    {
      heading: 'Support',
      links: [
        { to: '/contact', label: 'Contact Us'  },
        { to: '/support', label: 'Help Center' },
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
            <Link to="/" className="flex items-center gap-2 mb-4 group w-fit">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center group-hover:scale-95 transition-transform"
                style={{ background: 'linear-gradient(135deg, hsl(258,90%,56%), hsl(280,90%,60%))', boxShadow: '0 0 14px rgba(139,92,246,0.35)' }}
              >
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-bold text-base font-display text-foreground">{config.siteName}</span>
            </Link>
            <p className="text-sm leading-relaxed max-w-[200px] mb-5 text-muted-foreground">
              {config.siteTagline}
            </p>
            <div className="flex gap-2">
              {([Twitter, Linkedin, Github] as const).map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-9 h-9 flex items-center justify-center rounded-lg transition-all border border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground hover:bg-muted"
                >
                  <Icon className="w-3.5 h-3.5" />
                </a>
              ))}
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

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6">
          <p className="text-xs font-medium text-muted-foreground/50">
            © {new Date().getFullYear()} {config.siteName}. All rights reserved.
          </p>
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground/40">
                All systems operational
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground/40">
              <Globe className="w-3.5 h-3.5" />
              <span className="text-xs font-medium uppercase tracking-widest">EN</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
