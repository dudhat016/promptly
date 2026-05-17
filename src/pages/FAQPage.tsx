import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HelpCircle, ChevronDown, Search, MessageSquare, Loader2 } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useSiteContent } from '../hooks/useSiteContent';
import { useMarketing } from '../hooks/useMarketing';
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

function buildFaqData(commission: number, minPayout: number): FAQCategory[] {
  return [
    {
      label: 'Getting Started',
      icon: '🚀',
      items: [
        { q: 'What is Promptly?', a: 'Promptly is a premium AI prompt marketplace where you can discover, save, and use thousands of curated prompts for ChatGPT, Claude, Gemini, and other AI tools. Build your personal vault, organize collections, and supercharge your AI workflows.' },
        { q: 'Do I need an account to browse prompts?', a: "No! You can browse the entire prompt library without signing up. To save prompts to your vault, unlock premium content, or submit your own prompts, you'll need a free account." },
        { q: 'Is Promptly free to use?', a: 'Yes — Promptly has a generous free tier giving you access to thousands of prompts. Pro plans unlock premium prompts, unlimited vault storage, AI Twin Studio, and team features.' },
        { q: 'Which AI models does Promptly support?', a: 'Prompts are tagged by compatible model: ChatGPT (GPT-4 / GPT-4o), Claude, Gemini, Llama, Mistral, Midjourney, DALL·E, and more. Filter by model on the Explore page.' },
      ],
    },
    {
      label: 'Plans & Billing',
      icon: '💳',
      items: [
        { q: 'What do Pro plans include?', a: 'Pro includes unlimited vault storage, all premium prompt categories, AI Twin Studio, Smart Collections, unlimited AI builder usage, and priority support.' },
        { q: 'Can I cancel my subscription anytime?', a: 'Absolutely. Cancel with one click from Billing Settings. Your Pro access stays active until the end of the billing period — no extra charges, no questions asked.' },
        { q: 'Do you offer refunds?', a: "We offer a 7-day money-back guarantee on all paid plans. If you're not satisfied, contact support within 7 days for a full refund." },
        { q: 'Are there discounts for annual billing?', a: 'Yes — annual billing saves you up to 40% vs monthly. The discount is applied automatically when you select the annual option at checkout.' },
      ],
    },
    {
      label: 'Credits & Usage',
      icon: '⚡',
      items: [
        { q: 'What are credits?', a: 'Credits unlock premium prompts. Free accounts receive credits monthly. Pro accounts get unlimited access. You also earn bonus credits through the Affiliate Program and by submitting approved prompts.' },
        { q: 'Do unused credits roll over?', a: "Free plan credits reset monthly and don't roll over. Pro members have unlimited access and don't need to manage credits at all." },
        { q: 'How do I earn bonus credits?', a: 'Earn credits by referring friends via your affiliate link, submitting quality prompts that get approved, and through special promotions. Check your Affiliate Dashboard for your unique link.' },
      ],
    },
    {
      label: 'Prompts & Vault',
      icon: '📦',
      items: [
        { q: 'Can I submit my own prompts?', a: 'Yes! Submit prompts via the Builder in your dashboard. Submitted prompts go through a brief review, and can be set to free, paid, or private.' },
        { q: 'What is My Vault?', a: 'Your Vault is a personal library of saved and unlocked prompts. Organize with tags, search instantly, and copy to clipboard with one click — accessible from any device.' },
        { q: 'What are Collections?', a: 'Collections let you group related prompts into shareable bundles. Perfect for organizing workflows, sharing with teammates, or building topic-specific libraries.' },
        { q: 'What is AI Twin Studio?', a: 'AI Twin Studio lets you build custom AI personas trained on your tone and style. Get consistent, on-brand output from any AI model — every time. Available on Pro.' },
      ],
    },
    {
      label: 'Affiliate Program',
      icon: '🤝',
      items: [
        { q: 'How does the Affiliate Program work?', a: 'Share your unique referral link. When someone signs up and upgrades, you earn a recurring commission — paid automatically to your payout account every month they stay subscribed.' },
        { q: 'What is the commission rate?', a: `Affiliates earn ${commission}% recurring commission on every subscription payment — monthly or annual — for the entire lifetime of the subscription. No expiry, no cap.` },
        { q: 'When do I get paid?', a: `Payouts are processed on the 1st of each month for the previous month's verified commissions. Minimum payout threshold is $${minPayout}. We pay via PayPal or UPI.` },
        { q: 'Do I need technical skills or a big audience?', a: 'None at all. Your referral link works anywhere — a tweet, a newsletter, a YouTube description, or a WhatsApp message. If you can share a link, you can earn.' },
      ],
    },
  ];
}

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
  const { marketingConfig } = useMarketing();

  const FAQ_DATA = buildFaqData(
    marketingConfig.referralCommission ?? 25,
    marketingConfig.minWithdrawalAmount ?? 50
  );
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
      <section className="relative overflow-hidden border-b border-border pt-24 pb-14 md:pb-20 text-center">
        <div className="absolute inset-0 opacity-10 dark:opacity-20"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, hsl(var(--primary)) 0%, transparent 70%)' }} />
        <PageContainer className="relative z-10" ignoreCustomizer>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-xs font-bold uppercase tracking-widest text-primary mb-5 md:mb-6">
              <HelpCircle className="w-3.5 h-3.5" />
              Help Center
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-foreground mb-3 md:mb-4 tracking-tight">
              Frequently Asked Questions
            </h1>
            <p className="text-muted-foreground text-base md:text-lg mb-7 md:mb-8 max-w-xl mx-auto px-2">
              Everything you need to know about Promptly. Can't find an answer?{' '}
              <Link to={`/${lng}/contact`} className="text-primary underline-offset-4 hover:underline font-semibold">
                Contact us
              </Link>
              .
            </p>
            {/* Search */}
            <div className="relative max-w-md mx-auto px-4 sm:px-0">
              <Search className="absolute left-7 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search questions…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-3 md:py-3.5 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary transition-colors text-sm"
              />
            </div>
          </motion.div>
        </PageContainer>
      </section>

      <PageContainer className="py-12 md:py-16" ignoreCustomizer>
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
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="mt-12 md:mt-16 rounded-2xl border border-border bg-muted/30 px-6 py-10 md:p-12 text-center"
        >
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)' }}>
            <MessageSquare className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-lg md:text-xl font-bold text-foreground mb-2">Still have questions?</h3>
          <p className="text-muted-foreground text-sm md:text-base mb-6 max-w-sm mx-auto">
            Our support team is here to help. Open a ticket and we'll get back to you within 24 hours.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to={`/${lng}/dashboard/support`}
              className="inline-flex items-center gap-2 px-5 md:px-6 py-2.5 md:py-3 rounded-xl text-sm font-bold uppercase tracking-widest gradient-cta transition-all hover:opacity-90 w-full sm:w-auto justify-center"
            >
              <MessageSquare className="w-4 h-4" />
              Open a Support Ticket
            </Link>
            <Link
              to={`/${lng}/contact`}
              className="inline-flex items-center gap-2 px-5 md:px-6 py-2.5 md:py-3 rounded-xl text-sm font-semibold border border-border text-muted-foreground hover:text-foreground transition-all w-full sm:w-auto justify-center"
            >
              Contact Us
            </Link>
          </div>
        </motion.div>
      </PageContainer>
    </div>
  );
}
