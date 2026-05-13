import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HelpCircle, ChevronDown, Search, MessageSquare, Loader2 } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useSiteContent } from '../hooks/useSiteContent';

import PageContainer from '../components/layout/PageContainer';

interface FAQItem {
  q: string;
  a: string;
}

interface FAQCategory {
  label: string;
  icon: string;
  items: FAQItem[];
}

const FAQ_DATA: FAQCategory[] = [
  {
    label: 'Getting Started',
    icon: '🚀',
    items: [
      {
        q: 'What is Promptly?',
        a: 'Promptly is a premium AI prompt marketplace where you can discover, save, and use thousands of curated prompts for ChatGPT, Claude, Midjourney, and other AI tools. Build your own vault, collaborate, and supercharge your AI workflows.',
      },
      {
        q: 'Do I need an account to browse prompts?',
        a: 'No! You can browse the prompt library without signing up. However, to save prompts, build your vault, or purchase premium prompts, you\'ll need a free account.',
      },
      {
        q: 'Is Promptly free to use?',
        a: 'Yes — Promptly has a generous free tier that gives you access to thousands of community prompts. Pro and Enterprise plans unlock premium prompts, unlimited vault storage, team features, and API access.',
      },
      {
        q: 'Which AI models does Promptly support?',
        a: 'Prompts on Promptly are tagged by compatible AI model: ChatGPT (GPT-4 / GPT-4o), Claude, Gemini, Midjourney, DALL·E, Stable Diffusion, and more. You can filter by model on the Explore page.',
      },
    ],
  },
  {
    label: 'Plans & Billing',
    icon: '💳',
    items: [
      {
        q: 'What do Pro plans include?',
        a: 'Pro plans include unlimited prompt vault storage, access to all premium prompts, priority support, early access to new features, and API access for integrations.',
      },
      {
        q: 'Can I cancel my subscription anytime?',
        a: 'Absolutely. You can cancel at any time from your Billing Settings. Your Pro access remains active until the end of the current billing period — no questions asked.',
      },
      {
        q: 'Do you offer refunds?',
        a: 'We offer a 7-day money-back guarantee on all paid plans. If you\'re not satisfied, contact our support team within 7 days of purchase for a full refund.',
      },
      {
        q: 'Are there discounts for annual billing?',
        a: 'Yes! Annual billing saves you up to 40% compared to monthly billing. The discount is applied automatically when you select the annual option at checkout.',
      },
    ],
  },
  {
    label: 'Credits & Usage',
    icon: '⚡',
    items: [
      {
        q: 'What are credits?',
        a: 'Credits are used to unlock and download premium prompts. Free accounts receive 10 credits/month. Pro accounts get unlimited usage. Credits are also earned through the Affiliate Program.',
      },
      {
        q: 'Do unused credits roll over?',
        a: 'Free plan credits do not roll over. Pro plan members have unlimited access and don\'t need to worry about credits at all.',
      },
      {
        q: 'How do I earn bonus credits?',
        a: 'You can earn credits by referring friends via your Affiliate link, submitting quality prompts that get approved, and through special promotions. Check the Affiliate page for your unique link.',
      },
    ],
  },
  {
    label: 'Prompts & Vault',
    icon: '📦',
    items: [
      {
        q: 'Can I submit my own prompts?',
        a: 'Yes! You can submit prompts via the Builder tool in your dashboard. Submitted prompts go through a brief review process and can be set to free, paid, or private.',
      },
      {
        q: 'What is My Vault?',
        a: 'My Vault is your personal library of saved and purchased prompts. Organize them with tags, search instantly, and copy to clipboard with one click.',
      },
      {
        q: 'Can I share prompts with my team?',
        a: 'Team sharing is available on the Enterprise plan. It allows multiple users to access a shared prompt library, manage collections collaboratively, and control access permissions.',
      },
    ],
  },
  {
    label: 'Affiliate Program',
    icon: '🤝',
    items: [
      {
        q: 'How does the Affiliate Program work?',
        a: 'Share your unique affiliate link. When someone signs up and upgrades using your link, you earn a commission — paid directly to your connected payout account.',
      },
      {
        q: 'What is the commission rate?',
        a: 'Affiliates earn 30% recurring commission on every subscription payment made by referred users, for as long as they remain subscribed.',
      },
      {
        q: 'When do I get paid?',
        a: 'Payouts are processed on the 1st of each month for the previous month\'s verified commissions. Minimum payout threshold is $20.',
      },
    ],
  },
];

function FAQAccordion({ items }: { items: FAQItem[] }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div key={idx} className="border border-border rounded-xl overflow-hidden">
          <button
            onClick={() => setOpen(open === idx ? null : idx)}
            className="w-full flex items-center justify-between px-5 py-4 text-left gap-4 hover:bg-muted/30 transition-colors"
          >
            <span className="text-sm font-semibold text-foreground">{item.q}</span>
            <ChevronDown
              className={cn(
                "w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200",
                open === idx && "rotate-180"
              )}
            />
          </button>
          <AnimatePresence initial={false}>
            {open === idx && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed border-t border-border pt-3">
                  {item.a}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

export default function FAQPage() {
  const { lng } = useParams<{ lng: string }>();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const { content: dynamicContent, loading } = useSiteContent('faq');

  const faqSource = dynamicContent?.categories || FAQ_DATA;

  const query = search.toLowerCase().trim();
  const filtered = faqSource.map((cat: any) => ({
    ...cat,
    items: (cat.items || []).filter(
      (item: any) =>
        item.q.toLowerCase().includes(query) ||
        item.a.toLowerCase().includes(query)
    ),
  })).filter((cat: any) => {
    if (activeCategory && cat.label !== activeCategory) return false;
    return cat.items.length > 0;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary/40" />
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.3em] animate-pulse">Syncing FAQ Center...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border py-20 px-6 text-center">
        <div
          className="absolute inset-0 opacity-10 dark:opacity-20"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, hsl(var(--primary)) 0%, transparent 70%)' }}
        />
        <div className="relative max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-xs font-bold uppercase tracking-widest text-primary mb-6">
            <HelpCircle className="w-3.5 h-3.5" />
            FAQ
          </div>
          <h1 className="text-4xl font-black text-foreground mb-4">Frequently Asked Questions</h1>
          <p className="text-muted-foreground text-lg mb-8">
            Everything you need to know about Promptly. Can't find an answer?{' '}
            <Link to={`/${lng}/contact`} className="text-primary underline-offset-4 hover:underline">
              Contact us
            </Link>
            .
          </p>

          {/* Search */}
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search questions…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>
      </section>

      <PageContainer className="py-16" ignoreCustomizer>
        {/* Category filter pills */}
        <div className="flex flex-wrap gap-2 mb-10 justify-center">
          <button
            onClick={() => setActiveCategory(null)}
            className={cn(
              "px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider border-2 transition-all",
              activeCategory === null
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/30"
            )}
          >
            All
          </button>
          {faqSource.map((cat: any) => (
            <button
              key={cat.label}
              onClick={() => setActiveCategory(activeCategory === cat.label ? null : cat.label)}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider border-2 transition-all gap-1.5 inline-flex items-center",
                activeCategory === cat.label
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/30"
              )}
            >
              <span>{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>

        {/* FAQ sections */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground font-semibold">No results for "{search}"</p>
            <p className="text-sm text-muted-foreground/60 mt-1">Try a different search term or browse all categories.</p>
          </div>
        ) : (
          <div className="space-y-12">
            {filtered.map((cat: any) => (
              <section key={cat.label}>
                <div className="flex items-center gap-3 mb-5">
                  <span className="text-2xl">{cat.icon}</span>
                  <h2 className="text-lg font-bold text-foreground">{cat.label}</h2>
                </div>
                <FAQAccordion items={cat.items} />
              </section>
            ))}
          </div>
        )}

        {/* Still need help CTA */}
        <div className="mt-16 rounded-2xl border border-border bg-muted/30 p-10 text-center">
          <MessageSquare className="w-10 h-10 text-primary mx-auto mb-4" />
          <h3 className="text-xl font-bold text-foreground mb-2">Still have questions?</h3>
          <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
            Our support team is here to help. Open a ticket and we'll get back to you within 24 hours.
          </p>
          <Link
            to={`/${lng}/dashboard/support`}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold uppercase tracking-widest gradient-cta transition-all hover:opacity-90"
          >
            <MessageSquare className="w-4 h-4" />
            Open a Support Ticket
          </Link>
        </div>
      </PageContainer>
    </div>
  );
}
