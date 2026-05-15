import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bot,
  Briefcase,
  Check,
  ChevronRight,
  Clock,
  Code2,
  Copy,
  GraduationCap,
  Layers,
  Library,
  Megaphone,
  Palette,
  PenLine,
  Repeat,
  Search,
  Sparkles,
  TrendingUp,
  Unlock,
  Wand2,
  X,
  Zap
} from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Rating from '../components/feedback/Rating';
import PageContainer from '../components/layout/PageContainer';
import { useConfig } from '../hooks/useConfig';
import { usePath } from '../hooks/usePath';
import { useSEO } from '../hooks/useSEO';
import { db } from '../lib/firebase';
import { Prompt } from '../types';

// ─── Static data ──────────────────────────────────────────────────────────────

const CATEGORY_ICON_MAP: Record<string, { icon: LucideIcon; color: string }> = {
  marketing:    { icon: Megaphone,     color: 'text-rose-400'    },
  coding:       { icon: Code2,         color: 'text-violet-400'  },
  writing:      { icon: PenLine,       color: 'text-sky-400'     },
  content:      { icon: PenLine,       color: 'text-sky-400'     },
  design:       { icon: Palette,       color: 'text-amber-400'   },
  business:     { icon: Briefcase,     color: 'text-emerald-400' },
  seo:          { icon: BarChart3,     color: 'text-blue-400'    },
  growth:       { icon: BarChart3,     color: 'text-blue-400'    },
  education:    { icon: GraduationCap, color: 'text-orange-400'  },
  agents:       { icon: Bot,           color: 'text-teal-400'    },
  'ai-agents':  { icon: Bot,           color: 'text-teal-400'    },
  productivity: { icon: Layers,        color: 'text-indigo-400'  },
};
const DEFAULT_CAT = { icon: Sparkles, color: 'text-primary' };

const PAIN_POINTS = [
  { icon: Clock,         title: 'Hours wasted every week',          desc: 'You spend more time writing and rewriting prompts than actually using the output. Trial and error with no end in sight.' },
  { icon: AlertTriangle, title: 'Mediocre results, every time',      desc: 'Generic prompts produce generic output. You know AI can do better — you just don\'t know how to get it there.' },
  { icon: Repeat,        title: 'Starting from scratch each session', desc: 'No system. No library. Every new task means reinventing the wheel. Your best prompts live in a forgotten chat history.' },
];

const BENEFITS = [
  { icon: Zap,     title: 'Expert results in 30 seconds',       desc: 'Grab a tested, expert-crafted prompt and paste it straight into ChatGPT, Claude, or Gemini. Zero tweaking required.' },
  { icon: Library, title: 'Your personal prompt vault',         desc: 'Save and organize your best prompts in one place. Access them from any device, any time. Never lose a great prompt again.' },
];

const STEPS = [
  { step: '01', title: 'Find the right prompt',    desc: 'Search by category, use case, or keyword. Every prompt is tested and rated by real users.' },
  { step: '02', title: 'Unlock it to your vault',  desc: 'One click saves it permanently to your personal library — organized, searchable, yours forever.' },
  { step: '03', title: 'Paste it. Get results.',   desc: 'Drop it into any AI tool and get professional output immediately. No editing, no guessing.' },
];

const TRENDING = [
  { tag: 'Marketing', title: 'Viral LinkedIn Post Generator',  desc: 'High-engagement posts that build authority and drive real followers in your niche.' },
  { tag: 'Coding',    title: 'React Code Reviewer',            desc: 'Expert-level feedback on your components — performance, accessibility, best practices.' },
  { tag: 'Writing',   title: 'Cold Email That Converts',       desc: 'A proven framework that gets replies from busy decision-makers without feeling salesy.' },
];

const TESTIMONIALS = [
  { name: 'Sarah K.',  role: 'Content Marketer', quote: 'I cut my content creation time by 60%. The marketing prompts alone are worth 10x the price.',                              rating: 5 },
  { name: 'James R.',  role: 'Freelance Dev',    quote: 'The coding prompts are insanely good. I use them every single day for code reviews and refactoring.',                    rating: 5 },
  { name: 'Priya M.',  role: 'Agency Founder',   quote: 'My entire team uses this. The vault keeps us consistent across every client deliverable, every time.',                   rating: 5 },
];

const MOCK_CARDS = [
  { tag: 'Marketing', title: 'Viral LinkedIn Post Generator', pro: false },
  { tag: 'Coding',    title: 'React Performance Optimizer',   pro: true  },
  { tag: 'SEO',       title: 'Keyword Cluster Builder',        pro: false },
  { tag: 'Writing',   title: 'Cold Email That Converts',       pro: true  },
];

// ─── Theme-aware shared styles ────────────────────────────────────────────────
const S = {
  card:        'bg-card border border-border rounded-xl',
  cardHover:   'bg-card border border-border rounded-xl hover:bg-muted/50 hover:border-border/80 transition-all',
  tag:         'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20',
  muted:       'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-muted text-muted-foreground border border-border',
  badge:       'inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-600 border border-amber-500/20 dark:text-amber-400',
  heading:     'font-display font-bold tracking-tight text-foreground',
  sub:         'text-muted-foreground leading-relaxed',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const { config } = useConfig();
  const { prefix } = usePath();
  useSEO('home');

  const displayCategories = config.categories.slice(0, 8);
  const freePlan = config.plans.find(p => p.monthlyPrice === 0);
  const proPlan  = config.plans.find(p => p.monthlyPrice > 0);

  const [livePrompts, setLivePrompts]       = useState<Prompt[]>([]);
  const [trendingPrompts, setTrendingPrompts] = useState<any[]>([]);
  const [testimonials, setTestimonials]       = useState<any[]>([]);
  const [socialStats, setSocialStats]         = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    // Hero mock cards — top by views
    getDocs(query(collection(db, 'prompts'), orderBy('viewsCount', 'desc'), limit(4)))
      .then(snap => setLivePrompts(snap.docs.map(d => ({ ...d.data(), id: d.id } as Prompt))))
      .catch(() => {});

    // Trending section — top by copies
    getDocs(query(collection(db, 'prompts'), orderBy('copiesCount', 'desc'), limit(3)))
      .then(snap => setTrendingPrompts(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(() => {});

    // Testimonials — featured from Firestore, fallback to statics
    getDocs(query(collection(db, 'testimonials'), where('featured', '==', true), limit(6)))
      .then(snap => { if (!snap.empty) setTestimonials(snap.docs.map(d => ({ id: d.id, ...d.data() }))); })
      .catch(() => {});
  }, []);

  // Social proof stats: prefer admin-configured values from global config
  useEffect(() => {
    const cfg = config as any;
    const stats = cfg.socialProofStats;
    if (stats && Array.isArray(stats) && stats.length > 0) {
      setSocialStats(stats);
    } else {
      // Compute from live data
      const promptCount = config.categories.reduce((s: number, c: any) => s + (c.promptCount || 0), 0);
      setSocialStats([
        { value: promptCount > 0 ? `${promptCount.toLocaleString()}+` : '12,000+', label: 'Expert Prompts' },
        { value: '5,000+',  label: 'Active Users'   },
        { value: config.categories.length > 0 ? `${config.categories.length}+` : '20+', label: 'Categories' },
        { value: '4.9★',    label: 'Average Rating' },
      ]);
    }
  }, [config]);

  const displayTestimonials = testimonials.length > 0 ? testimonials : TESTIMONIALS;

  return (
    <div className="min-h-screen bg-background">

      {/* ════════════════════════════════════════════════════════════════════
          1. HERO — HOOK (Attention + Problem-aware)
      ════════════════════════════════════════════════════════════════════ */}
      <section
        className="relative pt-20 pb-32 overflow-hidden bg-background"
      >
        {/* Grid pattern */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '36px 36px',
          }}
        />
        {/* Purple glow blob */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(139,92,246,0.18) 0%, transparent 70%)' }}
        />

        <PageContainer ignoreCustomizer>
          <div className="text-center max-w-4xl mx-auto">

            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`${S.tag} mx-auto mb-8`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Expert Prompts for Serious AI Users
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.7 }}
              className={`${S.heading} text-5xl md:text-[5.5rem] leading-[1.0] mb-6`}
            >
              Your AI isn't<br />
              the problem.
              <br />
              <span className="gradient-text">
                Your prompts are.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.7 }}
              className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed"
            >
              Most people waste 80% of their AI time on prompts that don't work.
              {config.siteName} gives you a library of expert-crafted, tested prompts
              that deliver professional results — every single time.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20"
            >
              <Link
                to={prefix('/register')}
                className="group relative inline-flex items-center gap-2 px-8 py-4 rounded-lg font-semibold text-base gradient-cta w-full sm:w-auto justify-center overflow-hidden"
                style={{ boxShadow: '0 0 40px rgba(139,92,246,0.4)' }}
              >
                <span className="relative z-10 flex items-center gap-2">
                  Start for Free — No Card Needed
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </Link>
              <Link
                to={prefix('/explore')}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-lg font-semibold text-base text-foreground/70 border border-border hover:border-border hover:text-foreground transition-all w-full sm:w-auto justify-center"

              >
                Browse Free Prompts
              </Link>
            </motion.div>

            {/* Mock Product UI */}
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.9 }}
              className="relative max-w-3xl mx-auto"
            >
              <div
                className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none z-10"
                style={{ background: 'linear-gradient(to top, hsl(var(--background)), transparent)' }}
              />
              <div
                className="rounded-2xl overflow-hidden border border-border"
                style={{ background: '#111', boxShadow: '0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)' }}
              >
                {/* Browser chrome */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border/60" style={{ background: '#161616' }}>
                  <div className="w-3 h-3 rounded-full bg-white/10" />
                  <div className="w-3 h-3 rounded-full bg-white/10" />
                  <div className="w-3 h-3 rounded-full bg-white/10" />
                  <div className="mx-3 flex-1 rounded-md text-xs text-muted-foreground/50 px-3 py-1.5 flex items-center gap-2" style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <Search className="w-3 h-3" />
                    Search 12,000+ expert prompts...
                  </div>
                </div>
                {/* Prompt cards — live from Firestore, falls back to statics */}
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(livePrompts.length > 0 ? livePrompts : MOCK_CARDS.map(m => ({ title: m.title, tags: [m.tag], isPaid: m.pro, categoryId: m.tag.toLowerCase() } as Partial<Prompt>))).map((p, i) => (
                    <Link
                      key={i}
                      to={livePrompts.length > 0 ? prefix(`/prompt/${(p as Prompt).slug || (p as Prompt).id}`) : prefix('/explore')}
                      className="rounded-xl p-4 flex items-start gap-3 border border-white/8 hover:border-white/15 transition-all cursor-pointer"
                      style={{ background: 'rgba(255,255,255,0.04)' }}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.25)' }}>
                        <Sparkles className="w-4 h-4 text-violet-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                            style={{ background: 'rgba(139,92,246,0.2)', color: 'rgb(196,181,253)', border: '1px solid rgba(139,92,246,0.25)' }}>
                            {p.tags?.[0] || p.categoryId || 'AI'}
                          </span>
                          {p.isPaid && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider"
                              style={{ background: 'rgba(245,158,11,0.2)', color: 'rgb(252,211,77)', border: '1px solid rgba(245,158,11,0.2)' }}>
                              Pro
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-white/75 truncate">{p.title}</p>
                        {livePrompts.length > 0 && (p as Prompt).copiesCount ? (
                          <p className="text-[10px] text-white/30 mt-0.5">{(p as Prompt).copiesCount} copies</p>
                        ) : null}
                      </div>
                      <Copy className="w-4 h-4 text-white/20 shrink-0 mt-0.5" />
                    </Link>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </PageContainer>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          2. SOCIAL PROOF BAR — Trust signals
      ════════════════════════════════════════════════════════════════════ */}
      <div className="border-y border-border bg-muted/20">
        <PageContainer className="py-8" ignoreCustomizer>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {socialStats.map((s, i) => (
              <div key={i}>
                <div className="text-2xl md:text-3xl font-bold text-foreground mb-1">{s.value}</div>
                <div className="text-xs text-muted-foreground/70 uppercase tracking-widest font-medium">{s.label}</div>
              </div>
            ))}
          </div>
        </PageContainer>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          3. PROBLEM — Agitation (make the pain real)
      ════════════════════════════════════════════════════════════════════ */}
      <section className="py-28 bg-background">
        <PageContainer className="text-center" ignoreCustomizer>
          <div className="text-center mb-16">
            <div className={`${S.tag} mx-auto mb-6 border-rose-500/30 bg-rose-500/10 text-rose-400`}>
              <AlertTriangle className="w-3.5 h-3.5" />
              Sound Familiar?
            </div>
            <h2 className={`${S.heading} text-4xl md:text-5xl mb-4`}>
              What bad prompts are costing you
              <br />
              <span className="text-muted-foreground/60">every single day</span>
            </h2>
            <p className={`${S.sub} max-w-xl mx-auto`}>
              If you're using AI without a prompt system, you're leaving 90% of its power on the table.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {PAIN_POINTS.map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className={`${S.card} p-7`}
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-5"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <p.icon className="w-5 h-5 text-rose-400" />
                </div>
                <h3 className="font-bold text-foreground mb-2">{p.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Before / After comparison */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-12 grid md:grid-cols-2 gap-5"
          >
            {/* Before */}
            <div className="rounded-2xl p-7 border border-rose-500/20" style={{ background: 'rgba(239,68,68,0.04)' }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.15)' }}>
                  <X className="w-4 h-4 text-rose-400" />
                </div>
                <span className="font-bold text-muted-foreground text-sm uppercase tracking-wider">Without {config.siteName}</span>
              </div>
              {[
                'Generic prompts → generic results',
                'Hours debugging why AI doesn\'t understand',
                'Starting from scratch every session',
                'Inconsistent output you can\'t rely on',
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 mb-3 last:mb-0">
                  <X className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground">{item}</span>
                </div>
              ))}
            </div>

            {/* After */}
            <div className="rounded-2xl p-7 border border-emerald-500/20" style={{ background: 'rgba(16,185,129,0.04)' }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.15)' }}>
                  <Check className="w-4 h-4 text-emerald-400" />
                </div>
                <span className="font-bold text-muted-foreground text-sm uppercase tracking-wider">With {config.siteName}</span>
              </div>
              {[
                'Expert prompts → expert results, instantly',
                'Professional output in under 30 seconds',
                'A personal vault of your best prompts',
                'Consistent, repeatable results every time',
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 mb-3 last:mb-0">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="text-sm text-foreground/70">{item}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </PageContainer>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          4. SOLUTION — The shift (bridge problem → product)
      ════════════════════════════════════════════════════════════════════ */}
      <section className="py-28 border-y border-border bg-muted/30">
        <PageContainer className="text-center" ignoreCustomizer>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className={`${S.tag} mx-auto mb-8`}>
              <Unlock className="w-3.5 h-3.5" />
              The Insight
            </div>
            <h2 className={`${S.heading} text-4xl md:text-6xl mb-6 leading-[1.1]`}>
              The world's best AI users
              <br />
              don't type better —
              <br />
              <span className="gradient-text">
                they prompt smarter.
              </span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Top marketers, developers, and creators aren't spending more time on AI.
              They're using proven prompt frameworks that were refined over thousands of real-world uses.
              Now you can use the same ones — without spending years figuring them out.
            </p>
          </motion.div>
        </PageContainer>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          5. TOOL INTRODUCTION — Product reveal
      ════════════════════════════════════════════════════════════════════ */}
      <section className="py-28 bg-background">
        <PageContainer ignoreCustomizer>
          <div className="text-center mb-16">
            <div className={`${S.tag} mx-auto mb-6`}>
              <Sparkles className="w-3.5 h-3.5" />
              Introducing {config.siteName}
            </div>
            <h2 className={`${S.heading} text-4xl md:text-5xl mb-4`}>
              The prompt library built for
              <br />serious AI users
            </h2>
            <p className={`${S.sub} max-w-xl mx-auto`}>
              A curated marketplace of {(socialStats[0]?.value) || '12,000+'} expert-crafted, tested prompts —
              organized by category, searchable by use case, ready to use.
            </p>
          </div>

          {/* Category grid */}
          {displayCategories.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-w-4xl mx-auto">
              {displayCategories.map((cat, i) => {
                const key = cat.slug?.toLowerCase() || cat.name.toLowerCase().split(' ')[0];
                const style = CATEGORY_ICON_MAP[key] ?? DEFAULT_CAT;
                const Icon = style.icon;
                return (
                  <motion.div
                    key={cat.id}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    viewport={{ once: true }}
                  >
                    <Link
                      to={prefix(`/explore?category=${encodeURIComponent(cat.name)}`)}
                      className="group flex items-center gap-3 rounded-xl p-4 border border-border hover:border-border hover:bg-muted/50 transition-all"

                    >
                      <Icon className={`w-5 h-5 ${style.color} shrink-0`} />
                      <span className="text-sm font-semibold text-foreground/70 group-hover:text-foreground transition-colors truncate">{cat.name}</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors ml-auto shrink-0" />
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-w-4xl mx-auto">
              {(['Marketing','Coding','Writing','Design','Business','SEO','Education','AI Agents'] as const).map((name, i) => {
                const key = name.toLowerCase().replace(' ', '-');
                const style = CATEGORY_ICON_MAP[key] ?? CATEGORY_ICON_MAP[name.toLowerCase()] ?? DEFAULT_CAT;
                const Icon = style.icon;
                return (
                  <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} viewport={{ once: true }}>
                    <Link
                      to={prefix(`/explore?category=${encodeURIComponent(name)}`)}
                      className="group flex items-center gap-3 rounded-xl p-4 border border-border hover:border-border transition-all"

                    >
                      <Icon className={`w-5 h-5 ${style.color} shrink-0`} />
                      <span className="text-sm font-semibold text-foreground/70 group-hover:text-foreground transition-colors truncate">{name}</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors ml-auto shrink-0" />
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}

          <div className="text-center mt-8">
            <Link
              to={prefix('/explore')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold text-muted-foreground border border-border hover:border-border hover:text-foreground transition-all"
            >
              View All Categories <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </PageContainer>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          6. BENEFITS — Outcome-focused (not features)
      ════════════════════════════════════════════════════════════════════ */}
      <section className="py-28 border-y border-border bg-muted/30">
        <PageContainer ignoreCustomizer>
          <div className="text-center mb-16">
            <h2 className={`${S.heading} text-4xl md:text-5xl mb-4`}>
              What you get
            </h2>
            <p className={`${S.sub} max-w-xl mx-auto`}>
              Not features. Real outcomes that change how you work with AI.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {BENEFITS.map((b, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="rounded-2xl p-8 border border-border group hover:border-violet-500/30 transition-all relative overflow-hidden"

              >
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{ background: 'radial-gradient(ellipse at top left, rgba(139,92,246,0.08), transparent 60%)' }}
                />
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 relative"
                  style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)' }}>
                  <b.icon className="w-6 h-6 text-violet-400" />
                </div>
                <h3 className="font-bold text-foreground text-xl mb-3 relative">{b.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed relative">{b.desc}</p>
              </motion.div>
            ))}
          </div>
        </PageContainer>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          7. HOW IT WORKS — Process (reduce friction)
      ════════════════════════════════════════════════════════════════════ */}
      <section className="py-28 bg-background">
        <PageContainer ignoreCustomizer>
          <div className="text-center mb-16">
            <h2 className={`${S.heading} text-4xl md:text-5xl mb-4`}>
              Up and running in 60 seconds
            </h2>
            <p className={`${S.sub} max-w-xl mx-auto`}>No learning curve. No setup. Just results.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-10 max-w-4xl mx-auto relative">
            {STEPS.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.12 }}
                viewport={{ once: true }}
                className="relative text-center"
              >
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-7 left-[55%] w-[90%] h-px"
                    style={{ background: 'linear-gradient(to right, rgba(139,92,246,0.4), transparent)' }} />
                )}
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5 text-lg font-bold text-violet-400 border"
                  style={{ background: 'rgba(139,92,246,0.1)', borderColor: 'rgba(139,92,246,0.3)' }}
                >
                  {step.step}
                </div>
                <h3 className="font-bold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </PageContainer>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          8. TRENDING — Product proof (show don't tell)
      ════════════════════════════════════════════════════════════════════ */}
      <section className="py-28 border-y border-border bg-muted/30">
        <PageContainer ignoreCustomizer>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
            <div>
              <h2 className={`${S.heading} text-3xl md:text-4xl mb-2`}>Trending This Week</h2>
              <p className="text-muted-foreground">The most-used prompts across our community.</p>
            </div>
            <Link to={prefix('/explore')}
              className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors shrink-0">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {(trendingPrompts.length > 0 ? trendingPrompts : TRENDING.map(p => ({
              id: p.title, title: p.title, tags: [p.tag], description: p.desc, copiesCount: 0, slug: null
            }))).map((p: any, i: number) => (
              <motion.div
                key={p.id || i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className={`${S.cardHover} p-7 group cursor-pointer`}
              >
                <div className="flex items-center justify-between mb-5">
                  <span className={S.tag}>{p.tags?.[0] || p.categoryId || 'AI'}</span>
                  <div className="flex items-center gap-2">
                    {p.copiesCount > 0 && (
                      <span className="text-[10px] text-muted-foreground/50 font-medium">{p.copiesCount} copies</span>
                    )}
                    <TrendingUp className="w-4 h-4 text-muted-foreground/40 group-hover:text-violet-400 transition-colors" />
                  </div>
                </div>
                <h3 className="font-bold text-foreground mb-2 group-hover:text-violet-300 transition-colors">{p.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-5 line-clamp-2">
                  {p.description || p.desc || ''}
                </p>
                <Link
                  to={p.slug ? prefix(`/prompt/${p.slug}`) : p.id && trendingPrompts.length > 0 ? prefix(`/prompt/${p.id}`) : prefix('/explore')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-400 group-hover:gap-2.5 transition-all"
                >
                  View Prompt <ArrowRight className="w-3 h-3" />
                </Link>
              </motion.div>
            ))}
          </div>
        </PageContainer>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          9. TESTIMONIALS — Social proof (remove doubt)
      ════════════════════════════════════════════════════════════════════ */}
      <section className="py-28 bg-background">
        <PageContainer ignoreCustomizer>
          <div className="text-center mb-14">
            <div className="flex items-center justify-center gap-3 mb-5">
              <Rating value={4.9} precision={0.5} readOnly size="sm" />
              <span className="text-muted-foreground text-sm">Rated 4.9/5 by our users</span>
            </div>
            <h2 className={`${S.heading} text-3xl md:text-4xl mb-3`}>
              Real people. Real results.
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Thousands of creators, developers, and marketers use {config.siteName} every day.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {displayTestimonials.slice(0, 3).map((t: any, i: number) => (
              <motion.div
                key={t.id || i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className={`${S.card} p-7 flex flex-col`}
              >
                <div className="mb-5">
                  <Rating value={t.rating || 5} readOnly size="sm" />
                </div>
                <p className="text-foreground/70 text-sm leading-relaxed mb-6 flex-1 italic">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  {t.imageUrl ? (
                    <img src={t.imageUrl} alt={t.name} className="w-9 h-9 rounded-full object-cover shrink-0 border border-border" />
                  ) : (
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-violet-300 shrink-0"
                      style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.2)' }}
                    >
                      {t.name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-semibold text-foreground">{t.name}</div>
                    <div className="text-xs text-muted-foreground/70">{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </PageContainer>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          10. PRICING — Make saying yes easy
      ════════════════════════════════════════════════════════════════════ */}
      <section className="py-28 border-y border-border bg-muted/30">
        <PageContainer className="max-w-4xl" ignoreCustomizer>
          <div className="text-center mb-14">
            <h2 className={`${S.heading} text-3xl md:text-5xl mb-3`}>
              Start free. Upgrade when you're ready.
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              No credit card required. No hidden fees. Cancel anytime.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {/* Free */}
            <div className="rounded-2xl p-8 border border-border" >
              <div className="mb-6">
                <div className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-widest mb-3">Free Forever</div>
                <div className="text-5xl font-bold text-foreground">
                  {freePlan ? `$${freePlan.monthlyPrice}` : '$0'}
                </div>
                <div className="text-sm text-muted-foreground/70 mt-1">No credit card needed</div>
              </div>
              <ul className="space-y-3 mb-8">
                {(freePlan?.features ?? [
                  'Browse full prompt library',
                  'Save up to 5 prompts to vault',
                  'AI Builder — 3 uses per day',
                  'Access to free categories',
                ]).map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                to={prefix('/register')}
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-semibold text-sm text-foreground/70 border border-border hover:border-border hover:text-foreground transition-all"

              >
                Get Started Free
              </Link>
            </div>

            {/* Pro */}
            <div className="rounded-2xl p-8 border relative overflow-hidden" style={{ background: 'rgba(139,92,246,0.08)', borderColor: 'rgba(139,92,246,0.3)' }}>
              <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary-end, var(--primary))))' }} />
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at top right, rgba(139,92,246,0.12), transparent 60%)' }}
              />
              <div className="mb-6 relative">
                <div className="flex items-center gap-2 mb-3">
                  <div className="text-xs font-semibold text-violet-400 uppercase tracking-widest">Pro</div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-violet-500/20 text-violet-300 border border-violet-500/30">
                    Most Popular
                  </span>
                </div>
                <div className="text-5xl font-bold text-foreground">
                  {proPlan ? `$${proPlan.monthlyPrice}` : '$9'}
                  <span className="text-xl text-muted-foreground/70 font-medium">/mo</span>
                </div>
                <div className="text-sm text-muted-foreground/70 mt-1">Cancel anytime</div>
              </div>
              <ul className="space-y-3 mb-8 relative">
                {(proPlan?.features ?? [
                  'Everything in Free',
                  'Unlimited vault storage',
                  'All premium prompt categories',
                  'Unlimited AI Builder usage',
                  'Priority access to new releases',
                ]).map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-foreground/70">
                    <Check className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                to={prefix('/pricing')}
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-semibold text-sm gradient-cta relative"
                style={{ boxShadow: '0 0 24px rgba(139,92,246,0.3)' }}
              >
                See Full Pricing <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </PageContainer>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          11. FINAL CTA — Close strong
      ════════════════════════════════════════════════════════════════════ */}
      <section className="py-32 bg-background">
        <PageContainer className="max-w-3xl text-center relative" ignoreCustomizer>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] pointer-events-none"
            style={{ background: 'radial-gradient(ellipse, rgba(139,92,246,0.15) 0%, transparent 70%)' }}
          />
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="flex justify-center mb-7">
              <Rating value={5} readOnly size="md" />
            </div>
            <h2 className={`${S.heading} text-4xl md:text-6xl mb-5 leading-[1.1]`}>
              Stop leaving AI potential
              <br />
              <span className="gradient-text">
                on the table.
              </span>
            </h2>
            <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto leading-relaxed">
              Join 5,000+ creators, developers, and marketers who get professional AI results
              in seconds — not hours.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to={prefix('/register')}
                className="group inline-flex items-center justify-center gap-2 px-9 py-4 rounded-xl font-semibold text-base gradient-cta w-full sm:w-auto"
                style={{ boxShadow: '0 0 50px rgba(139,92,246,0.4)' }}
              >
                Start for Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to={prefix('/explore')}
                className="inline-flex items-center justify-center gap-2 px-9 py-4 rounded-xl font-semibold text-base text-muted-foreground border border-border hover:border-border hover:text-foreground transition-all w-full sm:w-auto"

              >
                Browse Prompts First
              </Link>
            </div>
            <p className="text-xs text-muted-foreground/50 mt-6">No credit card required · Free forever plan available · Cancel anytime</p>
          </motion.div>
        </PageContainer>
      </section>

    </div>
  );
}
