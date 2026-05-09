import { useState } from 'react';
import { ArrowRight, Check, ChevronDown, DollarSign, Gift, Shield, Sparkles, TrendingUp, Users, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import { cn } from '../lib/utils';

const FAQS = [
  { q: 'How much can I realistically earn?', a: 'With 50 active Pro subscribers ($15/mo each), you earn $187.50/month — $2,250/year — on complete autopilot. Top affiliates with audiences of 5k+ earn $1,000–$3,000/month.' },
  { q: 'When and how do I get paid?', a: 'Payouts are processed monthly once you reach the $50 minimum threshold. We pay via PayPal or UPI. No delays, no surprises.' },
  { q: 'Is the commission truly recurring?', a: 'Yes. You earn 25% every month for as long as your referral stays subscribed — not just the first payment. One good referral can pay you for years.' },
  { q: 'Do I need technical skills or a website?', a: 'None. Your referral link works anywhere — a tweet, a YouTube video description, a newsletter, or a WhatsApp group. If you can share a link, you can earn.' },
  { q: 'What happens if someone upgrades or downgrades?', a: 'Your commission is always 25% of whatever plan they are on. If they upgrade, you earn more. The tracking is automatic and fully transparent in your dashboard.' },
];

const EARNINGS = [
  { refs: 10, monthly: 37.5, annual: 450 },
  { refs: 50, monthly: 187.5, annual: 2250 },
  { refs: 200, monthly: 750, annual: 9000 },
];

export default function AffiliateInfoPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background">

      {/* ── Hero ── */}
      <div className="relative pt-24 pb-20 overflow-hidden text-center">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(139,92,246,0.14) 0%, transparent 70%)' }} />
        <div className="absolute inset-0 pointer-events-none opacity-30"
          style={{ backgroundImage: 'radial-gradient(circle, hsl(var(--muted-foreground)/0.2) 1px, transparent 1px)', backgroundSize: '36px 36px' }} />
        <div className="container mx-auto px-4 max-w-4xl relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-6 bg-primary/10 border border-primary/25 text-primary">
              <Gift className="w-3.5 h-3.5" />
              Partner Program — Now Open
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 tracking-tight leading-[1.05]">
              Earn{' '}
              <span style={{ background: 'linear-gradient(135deg, hsl(258,90%,70%), hsl(280,100%,75%))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                25% Recurring
              </span>
              <br />Commission — Forever
            </h1>
            <p className="text-xl max-w-2xl mx-auto mb-10 leading-relaxed text-muted-foreground">
              Share Promptly with your audience. Earn every month for as long as they stay subscribed. No cap. No expiry. Just passive income.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/login"
                className="inline-flex items-center gap-2 px-7 py-4 rounded-xl font-bold text-white text-base transition-all"
                style={{ background: 'linear-gradient(135deg, hsl(258,90%,56%), hsl(280,90%,60%))', boxShadow: '0 0 30px rgba(139,92,246,0.35)' }}
              >
                Join Free — Get My Link <ArrowRight className="w-5 h-5" />
              </Link>
              <a href="#calculator"
                className="inline-flex items-center gap-2 px-7 py-4 rounded-xl font-semibold text-sm transition-all bg-muted border border-border text-foreground hover:bg-muted/70"
              >
                See Earnings Calculator
              </a>
            </div>
          </motion.div>

          {/* Trust strip */}
          <div className="flex flex-wrap items-center justify-center gap-8 mt-14">
            {[
              { value: '25%', label: 'Commission Rate' },
              { value: 'Forever', label: 'Recurring Duration' },
              { value: '$50', label: 'Payout Threshold' },
              { value: '24h', label: 'Avg. Processing' },
            ].map(({ value, label }) => (
              <div key={label} className="text-center">
                <div className="text-2xl font-bold text-foreground">{value}</div>
                <div className="text-xs font-semibold uppercase tracking-widest mt-0.5 text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Problem ── */}
      <div className="py-20 border-t border-border">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-14">
            <p className="text-xs font-bold uppercase tracking-widest mb-3 text-primary">The Problem</p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Most "side income" opportunities are broken</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">You work hard to grow an audience. The tools you recommend should work as hard for you.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { icon: '💸', title: 'One-time commissions', body: 'You refer someone, get paid once, then nothing. Their lifetime value goes to the company — not you.' },
              { icon: '📉', title: 'Low conversion rates', body: 'Outdated products with bad UX mean your audience doesn\'t convert. You spend time promoting, they don\'t buy.' },
              { icon: '🕑', title: 'Months to reach payout', body: 'Most affiliate programs set $100+ minimums and pay quarterly. You wait 90+ days for $12.' },
            ].map((card, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                className="rounded-2xl p-7 bg-card border border-border"
                style={{ borderColor: 'rgba(239,68,68,0.15)' }}>
                <div className="text-3xl mb-4">{card.icon}</div>
                <h3 className="font-bold text-foreground mb-2">{card.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{card.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Solution bridge ── */}
      <div className="py-20 border-t border-border border-b bg-primary/[0.02]">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <p className="text-xs font-bold uppercase tracking-widest mb-3 text-primary">The Solution</p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-5 leading-tight">
            A product your audience <em className="not-italic text-primary">already wants</em> — and a commission structure that rewards loyalty
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Promptly converts because it solves a real problem for a fast-growing audience. When your referrals upgrade, you earn 25% every single month — not once. Refer 50 paying users and collect $187/month without lifting a finger.
          </p>
        </div>
      </div>

      {/* ── Earnings Calculator ── */}
      <div id="calculator" className="py-24">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-14">
            <p className="text-xs font-bold uppercase tracking-widest mb-3 text-primary">Earnings Calculator</p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">See what your audience is worth</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">Based on 25% commission on the $15/month Pro plan.</p>
          </div>

          <div className="rounded-2xl overflow-hidden border border-border">
            <div className="grid grid-cols-3 text-xs font-bold uppercase tracking-widest px-6 py-4 bg-muted border-b border-border text-muted-foreground">
              <span>Active Referrals</span>
              <span className="text-center">Monthly Income</span>
              <span className="text-right">Annual Income</span>
            </div>
            {EARNINGS.map(({ refs, monthly, annual }, i) => (
              <div key={refs}
                className="grid grid-cols-3 px-6 py-5 items-center"
                style={{
                  borderBottom: i < EARNINGS.length - 1 ? '1px solid hsl(var(--border))' : 'none',
                  background: i === 1 ? 'rgba(139,92,246,0.05)' : 'transparent',
                }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                    style={i === 1
                      ? { background: 'rgba(139,92,246,0.2)', color: 'rgb(167,139,250)' }
                      : { background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }
                    }>
                    {refs}
                  </div>
                  <span className="font-semibold text-muted-foreground">{refs} users</span>
                  {i === 1 && <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: 'rgba(139,92,246,0.15)', color: 'rgb(167,139,250)' }}>Popular</span>}
                </div>
                <div className="text-center font-bold text-xl text-foreground">${monthly.toFixed(2)}</div>
                <div className="text-right">
                  <span className="font-bold text-lg text-emerald-600 dark:text-emerald-400">${annual.toLocaleString()}/yr</span>
                </div>
              </div>
            ))}
            <div className="px-6 py-4 text-center border-t border-primary/20 bg-primary/[0.03]">
              <p className="text-xs text-muted-foreground">Commission compounds as referrals stay subscribed. No cap on earnings.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── How it works ── */}
      <div className="py-20 border-t border-border">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-14">
            <p className="text-xs font-bold uppercase tracking-widest mb-3 text-primary">Simple Process</p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Three steps to passive income</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { step: '01', title: 'Get your link', body: 'Sign up (free) and head to your Affiliate Dashboard. Your unique referral link is ready instantly — no approval required.' },
              { step: '02', title: 'Share anywhere', body: 'Post on YouTube, Twitter, your blog, newsletter, or Discord. The link works everywhere. We track every click and conversion.' },
              { step: '03', title: 'Collect monthly', body: 'Every time a referral pays their subscription, 25% lands in your balance. Withdraw once you hit $50 via PayPal or UPI.' },
            ].map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.12 }}
                className="rounded-2xl p-7 flex flex-col bg-card border border-border">
                <div className="text-5xl font-bold mb-4 text-primary/20">{s.step}</div>
                <h3 className="font-bold text-foreground text-lg mb-2">{s.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Why partner ── */}
      <div className="py-20 border-t border-border">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-14">
            <p className="text-xs font-bold uppercase tracking-widest mb-3 text-primary">Your Advantage</p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Why top creators choose Promptly</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: TrendingUp, iconBg: 'rgba(139,92,246,0.15)', iconBorder: 'rgba(139,92,246,0.25)', iconColor: 'text-violet-500 dark:text-violet-400', title: 'High Conversion Rate', body: 'Promptly\'s clean design and expert curation convert visitors 3× better than typical SaaS tools in this niche.' },
              { icon: DollarSign, iconBg: 'rgba(16,185,129,0.1)', iconBorder: 'rgba(16,185,129,0.2)', iconColor: 'text-emerald-600 dark:text-emerald-400', title: 'Recurring for Life', body: 'Not a one-time bounty. Your 25% applies every billing period — monthly or annual — for the entire lifetime of the subscription.' },
              { icon: Shield, iconBg: 'rgba(245,158,11,0.1)', iconBorder: 'rgba(245,158,11,0.2)', iconColor: 'text-amber-600 dark:text-amber-400', title: 'Reliable Payouts', body: 'Automatic processing on the 1st of every month. Full transparency — every referral, every commission, visible in your dashboard.' },
            ].map(({ icon: Icon, iconBg, iconBorder, iconColor, title, body }, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                className="rounded-2xl p-7 bg-card border border-border">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5"
                  style={{ background: iconBg, border: `1px solid ${iconBorder}` }}>
                  <Icon className={`w-5 h-5 ${iconColor}`} />
                </div>
                <h3 className="font-bold text-foreground text-lg mb-2">{title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Mock Dashboard Preview ── */}
      <div className="py-20 border-t border-border">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-3 text-primary">Your Dashboard</p>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-5 leading-tight">Track every click, referral, and dollar in real time</h2>
              <p className="leading-relaxed mb-8 text-muted-foreground">Your affiliate dashboard shows every referral, commission, and payout in one clean view. No spreadsheets. No guessing.</p>
              <ul className="space-y-3">
                {['Real-time click and conversion tracking', 'Monthly commission breakdown by referral', 'One-click withdrawal when threshold is met', 'Fraud-protected payout system'].map(item => (
                  <li key={item} className="flex items-center gap-3 text-sm text-muted-foreground">
                    <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                      style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)' }}>
                      <Check className="w-3 h-3 text-violet-400" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl overflow-hidden bg-card border border-border">
              <div className="px-6 py-4 flex items-center gap-2 border-b border-border">
                <div className="w-2 h-2 rounded-full bg-rose-500" />
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="ml-2 text-xs font-semibold text-muted-foreground">affiliate.dashboard</span>
              </div>
              <div className="p-6 space-y-4">
                {[
                  { label: 'Total Clicks', value: '1,248', valueClass: 'text-foreground' },
                  { label: 'Active Referrals', value: '42', valueClass: 'text-foreground' },
                  { label: 'Pending Commission', value: '$126.00', valueClass: 'text-primary' },
                  { label: 'Available Balance', value: '$157.50', valueClass: 'text-emerald-600 dark:text-emerald-400' },
                ].map(({ label, value, valueClass }) => (
                  <div key={label} className="flex items-center justify-between rounded-xl px-4 py-3 bg-muted border border-border">
                    <span className="text-sm font-medium text-muted-foreground">{label}</span>
                    <span className={`font-bold text-lg ${valueClass}`}>{value}</span>
                  </div>
                ))}
                <Button
                  variant="primary"
                  fullWidth
                  size="lg"
                  className="mt-2 font-bold shadow-xl shadow-primary/20"
                >
                  Withdraw Funds →
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── FAQ ── */}
      <div className="py-20 border-t border-border">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-14">
            <p className="text-xs font-bold uppercase tracking-widest mb-3 text-primary">FAQ</p>
            <h2 className="text-3xl font-bold text-foreground">Common questions</h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div key={i} className="rounded-xl overflow-hidden border border-border">
                <Button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  variant="ghost"
                  fullWidth
                  rightIcon={ChevronDown}
                  iconClassName={cn("transition-transform duration-200", openFaq === i && "rotate-180")}
                  className={cn(
                    "flex items-center justify-between px-6 py-5 text-left h-auto",
                    openFaq === i ? "bg-primary/5 text-primary" : "bg-card hover:bg-muted/50 text-foreground"
                  )}
                >
                  <span className="font-semibold text-sm pr-4 whitespace-normal">{faq.q}</span>
                </Button>
                {openFaq === i && (
                  <div className="px-6 pb-5 text-sm leading-relaxed text-muted-foreground bg-primary/[0.02]">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Final CTA ── */}
      <div className="py-24 border-t border-border">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <div className="rounded-2xl px-8 py-16 relative overflow-hidden"
            style={{ background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.2)' }}>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] pointer-events-none"
              style={{ background: 'radial-gradient(ellipse, rgba(139,92,246,0.2) 0%, transparent 70%)' }} />
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6"
                style={{ background: 'linear-gradient(135deg, hsl(258,90%,56%), hsl(280,90%,60%))' }}>
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Ready to start earning?</h2>
              <p className="text-muted-foreground text-lg mb-8 max-w-md mx-auto">
                Hundreds of creators are already earning recurring commissions with Promptly. Your link is waiting.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/login"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-white transition-all"
                  style={{ background: 'linear-gradient(135deg, hsl(258,90%,56%), hsl(280,90%,60%))', boxShadow: '0 0 30px rgba(139,92,246,0.35)' }}
                >
                  Become a Partner <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
              <div className="flex items-center justify-center gap-6 mt-8">
                {[
                  { icon: Users, label: '1,000+ Active Affiliates' },
                  { icon: Zap, label: 'Instant Approval' },
                  { icon: Shield, label: 'Free to Join' },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
