import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  ArrowRight,
  Award,
  BarChart3,
  Bot,
  Briefcase,
  Check,
  ChevronRight,
  Clock,
  Code2,
  Copy,
  Cpu,
  GraduationCap,
  Layers,
  Library,
  Megaphone,
  Palette,
  PenLine,
  Repeat,
  Search,
  Sparkles,
  Star,
  TrendingUp,
  Unlock,
  Users,
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
import { api } from '../lib/api';
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

const AI_TOOLS = ['ChatGPT', 'Claude', 'Gemini', 'Llama', 'Mistral', 'Grok'];

const PAIN_POINTS = [
  { icon: Clock,         title: 'Hours wasted every week',            desc: 'You spend more time writing and rewriting prompts than using the output. Trial and error with no end in sight.' },
  { icon: AlertTriangle, title: 'Mediocre results, every time',        desc: 'Generic prompts produce generic output. You know AI can do better — you just don\'t know how to get it there.' },
  { icon: Repeat,        title: 'Starting from scratch each session',  desc: 'No system. No library. Every new task means reinventing the wheel. Your best prompts live in a forgotten chat history.' },
];

const BENEFITS = [
  { icon: Zap,     title: 'Expert results in 30 seconds',      desc: 'Grab a tested, expert-crafted prompt and paste it straight into ChatGPT, Claude, or Gemini. Zero tweaking required.' },
  { icon: Library, title: 'Your personal prompt vault',        desc: 'Save and organize your best prompts in one place. Access them from any device, any time. Never lose a great prompt again.' },
  { icon: Cpu,     title: 'Works with every AI model',         desc: 'Every prompt is tagged for the right model. Filter by ChatGPT, Claude, Gemini, and more — always the right fit.' },
];

const FEATURES = [
  {
    icon: Sparkles,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10 border-violet-500/20',
    title: 'Curated Prompt Library',
    desc: '12,000+ hand-tested prompts across 20+ categories. Every prompt is reviewed, rated, and organized so you find the right one fast.',
  },
  {
    icon: Library,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    title: 'Personal Vault',
    desc: 'Save, label, and search your favourite prompts in your own private library. Organized how you think — accessible everywhere.',
  },
  {
    icon: Layers,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
    title: 'Smart Collections',
    desc: 'Group related prompts into shareable collections. Perfect for teams, clients, or personal workflow bundles.',
  },
  {
    icon: Cpu,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
    title: 'Multi-Model Support',
    desc: 'Every prompt specifies which AI model it\'s optimised for. Works seamlessly with ChatGPT, Claude, Gemini, Llama, and more.',
  },
];

const USE_CASES = [
  {
    icon: Megaphone,
    color: 'text-rose-400',
    bg: 'bg-rose-500/10 border-rose-500/20',
    role: 'Content Marketers',
    headline: 'Publish 3× faster',
    desc: 'Blog posts, social captions, email sequences, ad copy — get expert prompts for every content type and ship without the writer\'s block.',
    tags: ['Blog Writing', 'Social Media', 'Email Copy', 'Ad Creative'],
  },
  {
    icon: Code2,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10 border-violet-500/20',
    role: 'Developers',
    headline: 'Ship better code, faster',
    desc: 'Code review, refactoring, documentation, debugging, and architecture prompts crafted by senior engineers — not generic templates.',
    tags: ['Code Review', 'Debugging', 'Docs', 'Architecture'],
  },
  {
    icon: Wand2,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
    role: 'Freelancers',
    headline: 'Deliver more, charge more',
    desc: 'Handle client deliverables faster with prompts for proposals, contracts, presentations, and creative briefs — all polished, all professional.',
    tags: ['Proposals', 'Pitches', 'Client Briefs', 'Reports'],
  },
  {
    icon: Users,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    role: 'Agency Teams',
    headline: 'Consistent output at scale',
    desc: 'Build shared prompt collections for your team so every piece of output is on-brand, consistent, and delivers client expectations every time.',
    tags: ['Team Vaults', 'Brand Consistency', 'Client Work', 'Scale'],
  },
];

const STEPS = [
  { step: '01', title: 'Find the right prompt',    desc: 'Search by category, use case, or keyword. Every prompt is tested and rated by real users.' },
  { step: '02', title: 'Unlock it to your vault',  desc: 'One click saves it permanently to your personal library — organized, searchable, yours forever.' },
  { step: '03', title: 'Paste it. Get results.',   desc: 'Drop it into any AI tool and get professional output immediately. No editing, no guessing.' },
];

const TRENDING_STATIC = [
  { tag: 'Marketing', title: 'Viral LinkedIn Post Generator',  desc: 'High-engagement posts that build authority and drive real followers in your niche.' },
  { tag: 'Coding',    title: 'React Code Reviewer',            desc: 'Expert-level feedback on your components — performance, accessibility, best practices.' },
  { tag: 'Writing',   title: 'Cold Email That Converts',       desc: 'A proven framework that gets replies from busy decision-makers without feeling salesy.' },
];

const TESTIMONIALS_STATIC = [
  { name: 'Sarah K.',  role: 'Content Marketer', quote: 'I cut my content creation time by 60%. The marketing prompts alone are worth 10x the price.',                           rating: 5 },
  { name: 'James R.',  role: 'Freelance Dev',    quote: 'The coding prompts are insanely good. I use them every single day for code reviews and refactoring.',                   rating: 5 },
  { name: 'Priya M.',  role: 'Agency Founder',   quote: 'My entire team uses this. The vault keeps us consistent across every client deliverable, every time.',                  rating: 5 },
];

const MOCK_CARDS = [
  { tag: 'Marketing', title: 'Viral LinkedIn Post Generator', pro: false },
  { tag: 'Coding',    title: 'React Performance Optimizer',   pro: true  },
  { tag: 'SEO',       title: 'Keyword Cluster Builder',        pro: false },
  { tag: 'Writing',   title: 'Cold Email That Converts',       pro: true  },
];

// ─── Shared style tokens ──────────────────────────────────────────────────────
const S = {
  card:      'bg-card border border-border rounded-xl',
  cardHover: 'bg-card border border-border rounded-xl hover:bg-muted/50 hover:border-border/80 transition-all',
  tag:       'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20',
  badge:     'inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-600 border border-amber-500/20 dark:text-amber-400',
  heading:   'font-display font-bold tracking-tight text-foreground',
  sub:       'text-muted-foreground leading-relaxed',
  section:   'py-16 md:py-24',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const { config, formatPrice } = useConfig();
  const { prefix } = usePath();
  useSEO('home');

  const displayCategories = config.categories.slice(0, 8);

  const [livePrompts,     setLivePrompts]     = useState<Prompt[]>([]);
  const [trendingPrompts, setTrendingPrompts] = useState<any[]>([]);
  const [testimonials,    setTestimonials]    = useState<any[]>([]);
  const [socialStats,     setSocialStats]     = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    async function loadPrompts() {
      let list: Prompt[] = [];
      try {
        const res: any = await api.get('/prompts?limit=50');
        list = Array.isArray(res) ? res : (res?.data || []);
      } catch {}

      if (!list || list.length === 0) {
        try {
          const snap = await getDocs(collection(db, 'prompts'));
          list = snap.docs.map(d => ({ ...d.data(), id: d.id } as Prompt));
        } catch {}
      }

      list = list.filter(p => !p.status || p.status === 'approved');

      if (list.length > 0) {
        const sortedByViews = [...list].sort((a: any, b: any) => (b.viewsCount || 0) - (a.viewsCount || 0));
        const sortedByCopies = [...list].sort((a: any, b: any) => (b.copiesCount || 0) - (a.copiesCount || 0));
        setLivePrompts(sortedByViews.slice(0, 4));
        setTrendingPrompts(sortedByCopies.slice(0, 3));
      }
    }
    loadPrompts();

    getDocs(query(collection(db, 'testimonials'), where('featured', '==', true), limit(6)))
      .then(s => { if (!s.empty) setTestimonials(s.docs.map(d => ({ id: d.id, ...d.data() }))); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const cfg = config as any;
    if (cfg.socialProofStats?.length > 0) {
      setSocialStats(cfg.socialProofStats);
    } else {
      const promptCount = config.categories.reduce((s: number, c: any) => s + (c.promptCount || 0), 0);
      setSocialStats([
        { value: promptCount > 0 ? `${promptCount.toLocaleString()}+` : '12,000+', label: 'Expert Prompts' },
        { value: '5,000+', label: 'Active Users'   },
        { value: config.categories.length > 0 ? `${config.categories.length}+` : '20+', label: 'Categories' },
        { value: '4.9★',   label: 'Average Rating' },
      ]);
    }
  }, [config]);

  const displayTestimonials = testimonials.length > 0 ? testimonials : TESTIMONIALS_STATIC;

  return (
    <div className="min-h-screen bg-background">

      {/* ══════════════════════════════════════════════════════
          1. HERO
      ══════════════════════════════════════════════════════ */}
      <section className="relative pt-24 pb-20 md:pt-32 md:pb-32 overflow-hidden bg-background">
        {/* Grid dot pattern */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '36px 36px' }} />
        {/* Glow blob */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] md:w-[900px] h-[400px] md:h-[600px] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(139,92,246,0.15) 0%, transparent 65%)' }} />

        <PageContainer ignoreCustomizer>
          <div className="text-center max-w-4xl mx-auto">

            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className={`${S.tag} mx-auto mb-6 md:mb-8`}>
              <Sparkles className="w-3.5 h-3.5" />
              Expert Prompts for Serious AI Users
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.7 }}
              className={`${S.heading} text-4xl sm:text-5xl md:text-[5rem] lg:text-[5.5rem] leading-[1.05] mb-5 md:mb-6`}
            >
              Your AI isn't<br />the problem.
              <br />
              <span className="gradient-text">Your prompts are.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.7 }}
              className="text-base sm:text-lg md:text-xl text-muted-foreground mb-8 md:mb-10 max-w-2xl mx-auto leading-relaxed px-2"
            >
              Most people waste 80% of their AI time on prompts that don't work.
              {' '}{config.siteName} gives you a library of expert-crafted, tested prompts
              that deliver professional results — every single time.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4 mb-10 md:mb-14 px-4 sm:px-0"
            >
              <Link
                to={prefix('/register')}
                className="group relative inline-flex items-center gap-2 px-6 md:px-8 py-3.5 md:py-4 rounded-lg font-semibold text-sm md:text-base gradient-cta w-full sm:w-auto justify-center overflow-hidden"
                style={{ boxShadow: '0 0 40px rgba(139,92,246,0.4)' }}
              >
                Start for Free — No Card Needed
                <ArrowRight className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to={prefix('/explore')}
                className="inline-flex items-center gap-2 px-6 md:px-8 py-3.5 md:py-4 rounded-lg font-semibold text-sm md:text-base text-foreground/70 border border-border hover:text-foreground transition-all w-full sm:w-auto justify-center"
              >
                Browse Free Prompts
              </Link>
            </motion.div>

            {/* AI model compatibility */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}
              className="flex items-center justify-center flex-wrap gap-x-4 gap-y-2 mb-12 md:mb-16"
            >
              <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">Works with</span>
              {AI_TOOLS.map(tool => (
                <span key={tool} className="text-xs font-semibold text-muted-foreground/60 px-2.5 py-1 rounded-md bg-muted/50 border border-border">
                  {tool}
                </span>
              ))}
            </motion.div>

            {/* Mock product UI */}
            <motion.div
              initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.9 }}
              className="relative max-w-3xl mx-auto px-2 sm:px-0"
            >
              <div className="absolute bottom-0 left-0 right-0 h-36 md:h-48 pointer-events-none z-10"
                style={{ background: 'linear-gradient(to top, hsl(var(--background)), transparent)' }} />
              <div className="rounded-xl md:rounded-2xl overflow-hidden border border-border"
                style={{ background: '#111', boxShadow: '0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border/60" style={{ background: '#161616' }}>
                  <div className="w-3 h-3 rounded-full bg-white/10" />
                  <div className="w-3 h-3 rounded-full bg-white/10" />
                  <div className="w-3 h-3 rounded-full bg-white/10" />
                  <div className="mx-3 flex-1 rounded-md text-xs text-muted-foreground/50 px-3 py-1.5 flex items-center gap-2"
                    style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <Search className="w-3 h-3" />
                    Search 12,000+ expert prompts...
                  </div>
                </div>
                <div className="p-3 md:p-4 grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
                  {(livePrompts.length > 0
                    ? livePrompts
                    : MOCK_CARDS.map(m => ({ title: m.title, tags: [m.tag], categoryId: m.tag.toLowerCase() } as Partial<Prompt>))
                  ).map((p, i) => (
                    <Link
                      key={i}
                      to={livePrompts.length > 0 ? prefix(`/prompt/${(p as Prompt).slug || (p as Prompt).id}`) : prefix('/explore')}
                      className="rounded-xl p-3 md:p-4 flex items-start gap-3 border border-white/8 hover:border-white/15 transition-all"
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

      {/* ══════════════════════════════════════════════════════
          2. SOCIAL PROOF BAR
      ══════════════════════════════════════════════════════ */}
      <div className="border-y border-border bg-muted/20">
        <PageContainer className="py-6 md:py-8" ignoreCustomizer>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 text-center">
            {socialStats.map((s, i) => (
              <div key={i} className="py-2">
                <div className="text-2xl md:text-3xl font-bold text-foreground mb-1">{s.value}</div>
                <div className="text-[10px] md:text-xs text-muted-foreground/70 uppercase tracking-widest font-medium">{s.label}</div>
              </div>
            ))}
          </div>
        </PageContainer>
      </div>

      {/* ══════════════════════════════════════════════════════
          3. PROBLEM — Agitation
      ══════════════════════════════════════════════════════ */}
      <section className={`${S.section} bg-background`}>
        <PageContainer ignoreCustomizer>
          <div className="text-center mb-10 md:mb-14">
            <div className={`${S.tag} mx-auto mb-5 md:mb-6 border-rose-500/30 bg-rose-500/10 text-rose-400`}>
              <AlertTriangle className="w-3.5 h-3.5" />
              Sound Familiar?
            </div>
            <h2 className={`${S.heading} text-3xl sm:text-4xl md:text-5xl mb-3 md:mb-4`}>
              What bad prompts are costing you
              <br className="hidden sm:block" />
              <span className="text-muted-foreground/60"> every single day</span>
            </h2>
            <p className={`${S.sub} max-w-xl mx-auto text-sm md:text-base px-2`}>
              If you're using AI without a prompt system, you're leaving 90% of its power on the table.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
            {PAIN_POINTS.map((p, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }} viewport={{ once: true }}
                className={`${S.card} p-6 md:p-7`}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4 md:mb-5"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <p.icon className="w-5 h-5 text-rose-400" />
                </div>
                <h3 className="font-bold text-foreground mb-2 text-sm md:text-base">{p.title}</h3>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Before / After */}
          <motion.div
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="mt-8 md:mt-12 grid sm:grid-cols-2 gap-4 md:gap-5"
          >
            <div className="rounded-2xl p-6 md:p-7 border border-rose-500/20" style={{ background: 'rgba(239,68,68,0.04)' }}>
              <div className="flex items-center gap-3 mb-5 md:mb-6">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(239,68,68,0.15)' }}>
                  <X className="w-4 h-4 text-rose-400" />
                </div>
                <span className="font-bold text-muted-foreground text-xs md:text-sm uppercase tracking-wider">Without {config.siteName}</span>
              </div>
              {['Generic prompts → generic results', 'Hours debugging why AI doesn\'t understand', 'Starting from scratch every session', 'Inconsistent output you can\'t rely on'].map((item, i) => (
                <div key={i} className="flex items-start gap-3 mb-2.5 last:mb-0">
                  <X className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span className="text-xs md:text-sm text-muted-foreground">{item}</span>
                </div>
              ))}
            </div>
            <div className="rounded-2xl p-6 md:p-7 border border-emerald-500/20" style={{ background: 'rgba(16,185,129,0.04)' }}>
              <div className="flex items-center gap-3 mb-5 md:mb-6">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(16,185,129,0.15)' }}>
                  <Check className="w-4 h-4 text-emerald-400" />
                </div>
                <span className="font-bold text-muted-foreground text-xs md:text-sm uppercase tracking-wider">With {config.siteName}</span>
              </div>
              {['Expert prompts → expert results, instantly', 'Professional output in under 30 seconds', 'A personal vault of your best prompts', 'Consistent, repeatable results every time'].map((item, i) => (
                <div key={i} className="flex items-start gap-3 mb-2.5 last:mb-0">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="text-xs md:text-sm text-foreground/70">{item}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </PageContainer>
      </section>

      {/* ══════════════════════════════════════════════════════
          4. SOLUTION — The insight
      ══════════════════════════════════════════════════════ */}
      <section className={`${S.section} border-y border-border bg-muted/30`}>
        <PageContainer ignoreCustomizer>
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto"
          >
            <div className={`${S.tag} mx-auto mb-6 md:mb-8`}>
              <Unlock className="w-3.5 h-3.5" />
              The Insight
            </div>
            <h2 className={`${S.heading} text-3xl sm:text-4xl md:text-5xl lg:text-6xl mb-5 md:mb-6 leading-[1.1]`}>
              The world's best AI users<br />
              don't type better —<br />
              <span className="gradient-text">they prompt smarter.</span>
            </h2>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed px-2">
              Top marketers, developers, and creators aren't spending more time on AI.
              They're using proven prompt frameworks refined over thousands of real-world uses.
              Now you can use the same ones — without spending years figuring them out.
            </p>
          </motion.div>
        </PageContainer>
      </section>

      {/* ══════════════════════════════════════════════════════
          5. FEATURES — Everything you get
      ══════════════════════════════════════════════════════ */}
      <section className={`${S.section} bg-background`}>
        <PageContainer ignoreCustomizer>
          <div className="text-center mb-10 md:mb-14">
            <div className={`${S.tag} mx-auto mb-5 md:mb-6`}>
              <Sparkles className="w-3.5 h-3.5" />
              Everything You Need
            </div>
            <h2 className={`${S.heading} text-3xl sm:text-4xl md:text-5xl mb-3 md:mb-4`}>
              One platform, every AI workflow
            </h2>
            <p className={`${S.sub} max-w-xl mx-auto text-sm md:text-base px-2`}>
              From finding the perfect prompt to organizing your library and building AI personas —
              {' '}{config.siteName} covers the full workflow.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {FEATURES.map((f, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }} viewport={{ once: true }}
                className={`${S.card} p-6 md:p-7 group hover:border-border/80 transition-all relative overflow-hidden`}
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{ background: 'radial-gradient(ellipse at top left, rgba(139,92,246,0.06), transparent 60%)' }} />
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-5 border ${f.bg} relative`}>
                  <f.icon className={`w-5 h-5 ${f.color}`} />
                </div>
                <h3 className="font-bold text-foreground mb-2 relative text-sm md:text-base">{f.title}</h3>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed relative">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </PageContainer>
      </section>

      {/* ══════════════════════════════════════════════════════
          6. CATEGORIES — Product reveal
      ══════════════════════════════════════════════════════ */}
      <section className={`${S.section} border-y border-border bg-muted/30`}>
        <PageContainer ignoreCustomizer>
          <div className="text-center mb-10 md:mb-14">
            <div className={`${S.tag} mx-auto mb-5 md:mb-6`}>
              <Sparkles className="w-3.5 h-3.5" />
              Introducing {config.siteName}
            </div>
            <h2 className={`${S.heading} text-3xl sm:text-4xl md:text-5xl mb-3 md:mb-4`}>
              The prompt library built for<br className="hidden sm:block" /> serious AI users
            </h2>
            <p className={`${S.sub} max-w-xl mx-auto text-sm md:text-base px-2`}>
              A curated marketplace of {socialStats[0]?.value || '12,000+'} expert-crafted, tested prompts —
              organized by category, searchable by use case, ready to use.
            </p>
          </div>

          {displayCategories.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 md:gap-3 max-w-4xl mx-auto">
              {displayCategories.map((cat, i) => {
                const key = cat.slug?.toLowerCase() || cat.name.toLowerCase().split(' ')[0];
                const style = CATEGORY_ICON_MAP[key] ?? DEFAULT_CAT;
                const Icon = style.icon;
                return (
                  <motion.div key={cat.id}
                    initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }} viewport={{ once: true }}>
                    <Link to={prefix(`/category/${encodeURIComponent(cat.id || cat.name.toLowerCase())}`)}
                      className="group flex items-center gap-3 rounded-xl p-3 md:p-4 border border-border hover:bg-muted/50 hover:border-border/80 transition-all">
                      <Icon className={`w-4 h-4 md:w-5 md:h-5 ${style.color} shrink-0`} />
                      <span className="text-xs md:text-sm font-semibold text-foreground/70 group-hover:text-foreground transition-colors truncate">{cat.name}</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors ml-auto shrink-0" />
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 md:gap-3 max-w-4xl mx-auto">
              {(['Marketing','Coding','Writing','Design','Business','SEO','Education','AI Agents'] as const).map((name, i) => {
                const key = name.toLowerCase().replace(' ', '-');
                const style = CATEGORY_ICON_MAP[key] ?? CATEGORY_ICON_MAP[name.toLowerCase()] ?? DEFAULT_CAT;
                const Icon = style.icon;
                return (
                  <motion.div key={i}
                    initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }} viewport={{ once: true }}>
                    <Link to={prefix(`/category/${encodeURIComponent(name.toLowerCase())}`)}
                      className="group flex items-center gap-3 rounded-xl p-3 md:p-4 border border-border hover:bg-muted/50 transition-all">
                      <Icon className={`w-4 h-4 md:w-5 md:h-5 ${style.color} shrink-0`} />
                      <span className="text-xs md:text-sm font-semibold text-foreground/70 group-hover:text-foreground transition-colors truncate">{name}</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors ml-auto shrink-0" />
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}

          <div className="text-center mt-6 md:mt-8">
            <Link to={prefix('/explore')}
              className="inline-flex items-center gap-2 px-5 md:px-6 py-2.5 md:py-3 rounded-lg text-xs md:text-sm font-semibold text-muted-foreground border border-border hover:text-foreground transition-all">
              View All Categories <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </PageContainer>
      </section>

      {/* ══════════════════════════════════════════════════════
          7. BENEFITS — Outcomes
      ══════════════════════════════════════════════════════ */}
      <section className={`${S.section} bg-background`}>
        <PageContainer ignoreCustomizer>
          <div className="text-center mb-10 md:mb-14">
            <h2 className={`${S.heading} text-3xl sm:text-4xl md:text-5xl mb-3 md:mb-4`}>What you get</h2>
            <p className={`${S.sub} max-w-xl mx-auto text-sm md:text-base px-2`}>
              Not features. Real outcomes that change how you work with AI.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 max-w-5xl mx-auto">
            {BENEFITS.map((b, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }} viewport={{ once: true }}
                className="rounded-2xl p-6 md:p-8 border border-border group hover:border-violet-500/30 transition-all relative overflow-hidden"
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{ background: 'radial-gradient(ellipse at top left, rgba(139,92,246,0.08), transparent 60%)' }} />
                <div className="w-11 h-11 md:w-12 md:h-12 rounded-xl flex items-center justify-center mb-5 md:mb-6 relative"
                  style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)' }}>
                  <b.icon className="w-5 h-5 md:w-6 md:h-6 text-violet-400" />
                </div>
                <h3 className="font-bold text-foreground text-base md:text-xl mb-2 md:mb-3 relative">{b.title}</h3>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed relative">{b.desc}</p>
              </motion.div>
            ))}
          </div>
        </PageContainer>
      </section>

      {/* ══════════════════════════════════════════════════════
          8. HOW IT WORKS
      ══════════════════════════════════════════════════════ */}
      <section className={`${S.section} border-y border-border bg-muted/30`}>
        <PageContainer ignoreCustomizer>
          <div className="text-center mb-10 md:mb-14">
            <h2 className={`${S.heading} text-3xl sm:text-4xl md:text-5xl mb-3 md:mb-4`}>Up and running in 60 seconds</h2>
            <p className={`${S.sub} max-w-xl mx-auto text-sm md:text-base`}>No learning curve. No setup. Just results.</p>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-8 md:gap-10 max-w-4xl mx-auto relative">
            {STEPS.map((step, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.12 }} viewport={{ once: true }}
                className="relative text-center"
              >
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-7 left-[55%] w-[90%] h-px"
                    style={{ background: 'linear-gradient(to right, rgba(139,92,246,0.4), transparent)' }} />
                )}
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-5 text-base md:text-lg font-bold text-violet-400 border"
                  style={{ background: 'rgba(139,92,246,0.1)', borderColor: 'rgba(139,92,246,0.3)' }}>
                  {step.step}
                </div>
                <h3 className="font-bold text-foreground mb-2 text-sm md:text-base">{step.title}</h3>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </PageContainer>
      </section>

      {/* ══════════════════════════════════════════════════════
          9. WHO IT'S FOR — Use cases
      ══════════════════════════════════════════════════════ */}
      <section className={`${S.section} bg-background`}>
        <PageContainer ignoreCustomizer>
          <div className="text-center mb-10 md:mb-14">
            <div className={`${S.tag} mx-auto mb-5 md:mb-6`}>
              <Users className="w-3.5 h-3.5" />
              Built for Every AI User
            </div>
            <h2 className={`${S.heading} text-3xl sm:text-4xl md:text-5xl mb-3 md:mb-4`}>
              Whatever you do, we have your prompts
            </h2>
            <p className={`${S.sub} max-w-xl mx-auto text-sm md:text-base px-2`}>
              Promptly serves thousands of professionals across industries — each with their own library of targeted prompts.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 md:gap-5 max-w-4xl mx-auto">
            {USE_CASES.map((uc, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }} viewport={{ once: true }}
                className={`${S.card} p-6 md:p-7 group hover:border-border/80 transition-all`}
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 border ${uc.bg}`}>
                  <uc.icon className={`w-5 h-5 ${uc.color}`} />
                </div>
                <div className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest mb-1">{uc.role}</div>
                <h3 className="font-bold text-foreground text-base md:text-lg mb-2">{uc.headline}</h3>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed mb-4">{uc.desc}</p>
                <div className="flex flex-wrap gap-1.5">
                  {uc.tags.map(tag => (
                    <span key={tag} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">
                      {tag}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </PageContainer>
      </section>

      {/* ══════════════════════════════════════════════════════
          10. TRENDING — Product proof
      ══════════════════════════════════════════════════════ */}
      <section className={`${S.section} border-y border-border bg-muted/30`}>
        <PageContainer ignoreCustomizer>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 md:mb-12">
            <div>
              <h2 className={`${S.heading} text-2xl sm:text-3xl md:text-4xl mb-2`}>Trending This Week</h2>
              <p className="text-muted-foreground text-sm md:text-base">The most-used prompts across our community.</p>
            </div>
            <Link to={prefix('/explore')}
              className="inline-flex items-center gap-2 text-xs md:text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors shrink-0">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
            {(trendingPrompts.length > 0 ? trendingPrompts : TRENDING_STATIC.map(p => ({
              id: p.title, title: p.title, tags: [p.tag], description: p.desc, copiesCount: 0, slug: null
            }))).map((p: any, i: number) => (
              <motion.div key={p.id || i}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }} viewport={{ once: true }}
                className={`${S.cardHover} p-6 md:p-7 group cursor-pointer`}
              >
                <div className="flex items-center justify-between mb-4 md:mb-5">
                  <span className={S.tag}>{p.tags?.[0] || p.categoryId || 'AI'}</span>
                  <div className="flex items-center gap-2">
                    {p.copiesCount > 0 && (
                      <span className="text-[10px] text-muted-foreground/50 font-medium">{p.copiesCount} copies</span>
                    )}
                    <TrendingUp className="w-4 h-4 text-muted-foreground/40 group-hover:text-violet-400 transition-colors" />
                  </div>
                </div>
                <h3 className="font-bold text-foreground mb-2 text-sm md:text-base group-hover:text-violet-300 transition-colors">{p.title}</h3>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed mb-4 md:mb-5 line-clamp-2">
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

      {/* ══════════════════════════════════════════════════════
          11. TESTIMONIALS
      ══════════════════════════════════════════════════════ */}
      <section className={`${S.section} bg-background`}>
        <PageContainer ignoreCustomizer>
          <div className="text-center mb-10 md:mb-14">
            <div className="flex items-center justify-center gap-2 md:gap-3 mb-4 md:mb-5">
              <Rating value={4.9} precision={0.5} readOnly size="sm" />
              <span className="text-muted-foreground text-xs md:text-sm">Rated 4.9/5 by our users</span>
            </div>
            <h2 className={`${S.heading} text-2xl sm:text-3xl md:text-4xl mb-3`}>Real people. Real results.</h2>
            <p className="text-muted-foreground max-w-md mx-auto text-sm md:text-base">
              Thousands of creators, developers, and marketers use {config.siteName} every day.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-5 max-w-5xl mx-auto">
            {displayTestimonials.slice(0, 3).map((t: any, i: number) => (
              <motion.div key={t.id || i}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }} viewport={{ once: true }}
                className={`${S.card} p-6 md:p-7 flex flex-col`}
              >
                <div className="mb-4 md:mb-5"><Rating value={t.rating || 5} readOnly size="sm" /></div>
                <p className="text-foreground/70 text-xs md:text-sm leading-relaxed mb-5 md:mb-6 flex-1 italic">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  {t.imageUrl ? (
                    <img src={t.imageUrl} alt={t.name} className="w-9 h-9 rounded-full object-cover shrink-0 border border-border" />
                  ) : (
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-violet-300 shrink-0"
                      style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.2)' }}>
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

      {/* ══════════════════════════════════════════════════════
          12. PRICING
      ══════════════════════════════════════════════════════ */}
      <section className={`${S.section} border-y border-border bg-muted/30`}>
        <PageContainer className="max-w-4xl" ignoreCustomizer>
          <div className="text-center mb-10 md:mb-14">
            <h2 className={`${S.heading} text-2xl sm:text-3xl md:text-5xl mb-3`}>
              Start free. Upgrade when you're ready.
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto text-sm md:text-base">
              No credit card required. No hidden fees. Cancel anytime.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 md:gap-5">
            {/* Free */}
            <div className="rounded-2xl p-6 md:p-8 border border-border">
              <div className="mb-5 md:mb-6">
                <div className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-widest mb-3">Free Forever</div>
                <div className="text-4xl md:text-5xl font-bold text-foreground">
                  {formatPrice(0)}
                </div>
                <div className="text-xs md:text-sm text-muted-foreground/70 mt-1">No credit card needed</div>
              </div>
              <ul className="space-y-2.5 md:space-y-3 mb-6 md:mb-8">
                {[
                  'Browse full prompt library',
                  'Save prompts to vault',
                  'AI Builder access',
                  'Access to all categories',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-xs md:text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link to={prefix('/register')}
                className="flex items-center justify-center gap-2 w-full py-3 md:py-3.5 rounded-xl font-semibold text-sm text-foreground/70 border border-border hover:text-foreground transition-all">
                Get Started Free
              </Link>
            </div>

            {/* Pro */}
            <div className="rounded-2xl p-6 md:p-8 border relative overflow-hidden"
              style={{ background: 'rgba(139,92,246,0.08)', borderColor: 'rgba(139,92,246,0.3)' }}>
              <div className="absolute top-0 left-0 right-0 h-0.5"
                style={{ background: 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary-end, var(--primary))))' }} />
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at top right, rgba(139,92,246,0.12), transparent 60%)' }} />
              <div className="mb-5 md:mb-6 relative">
                <div className="flex items-center gap-2 mb-3">
                  <div className="text-xs font-semibold text-violet-400 uppercase tracking-widest">Pro</div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-violet-500/20 text-violet-300 border border-violet-500/30">
                    Full Access
                  </span>
                </div>
                <div className="text-4xl md:text-5xl font-bold text-foreground">
                  {formatPrice(0)}
                </div>
                <div className="text-xs md:text-sm text-muted-foreground/70 mt-1">Free for all creators</div>
              </div>
              <ul className="space-y-2.5 md:space-y-3 mb-6 md:mb-8 relative">
                {[
                  'Full library access',
                  'Unlimited vault storage',
                  'All prompt categories',
                  'Unlimited AI Builder usage',
                  'Priority access to new releases',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-xs md:text-sm text-foreground/70">
                    <Check className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link to={prefix('/pricing')}
                className="flex items-center justify-center gap-2 w-full py-3 md:py-3.5 rounded-xl font-semibold text-sm gradient-cta relative"
                style={{ boxShadow: '0 0 24px rgba(139,92,246,0.3)' }}>
                See Full Pricing <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </PageContainer>
      </section>

      {/* ══════════════════════════════════════════════════════
          13. FINAL CTA
      ══════════════════════════════════════════════════════ */}
      <section className="py-20 md:py-32 bg-background">
        <PageContainer className="max-w-3xl text-center relative" ignoreCustomizer>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] md:w-[600px] h-[250px] md:h-[350px] pointer-events-none"
            style={{ background: 'radial-gradient(ellipse, rgba(139,92,246,0.15) 0%, transparent 70%)' }} />
          <motion.div
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="relative px-2"
          >
            <div className="flex justify-center gap-0.5 mb-6 md:mb-7">
              {[1,2,3,4,5].map(n => (
                <Star key={n} className="w-5 h-5 md:w-6 md:h-6 text-amber-400 fill-amber-400" />
              ))}
            </div>
            <h2 className={`${S.heading} text-3xl sm:text-4xl md:text-5xl lg:text-6xl mb-4 md:mb-5 leading-[1.1]`}>
              Stop leaving AI potential
              <br />
              <span className="gradient-text">on the table.</span>
            </h2>
            <p className="text-base md:text-lg text-muted-foreground mb-8 md:mb-10 max-w-xl mx-auto leading-relaxed">
              Join 5,000+ creators, developers, and marketers who get professional AI results
              in seconds — not hours.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4">
              <Link
                to={prefix('/register')}
                className="group inline-flex items-center justify-center gap-2 px-7 md:px-9 py-3.5 md:py-4 rounded-xl font-semibold text-sm md:text-base gradient-cta w-full sm:w-auto"
                style={{ boxShadow: '0 0 50px rgba(139,92,246,0.4)' }}
              >
                Start for Free
                <ArrowRight className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to={prefix('/explore')}
                className="inline-flex items-center justify-center gap-2 px-7 md:px-9 py-3.5 md:py-4 rounded-xl font-semibold text-sm md:text-base text-muted-foreground border border-border hover:text-foreground transition-all w-full sm:w-auto"
              >
                Browse Prompts First
              </Link>
            </div>
            <p className="text-xs text-muted-foreground/50 mt-5 md:mt-6">
              No credit card required · Free forever plan available · Cancel anytime
            </p>
          </motion.div>
        </PageContainer>
      </section>

    </div>
  );
}
