import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Sparkles, Search, Library, Zap, ArrowRight, ShieldCheck, TrendingUp } from 'lucide-react';

const FEATURES = [
  {
    title: 'Expert Marketplace',
    desc: 'Browse thousands of high-quality, verified prompts for any AI model.',
    icon: Search
  },
  {
    title: 'Prompt Library',
    desc: 'Organize, save, and access your personal prompt collection anywhere.',
    icon: Library
  },
  {
    title: 'Subscription Unlock',
    desc: 'One membership gives you full access to all premium expert prompts.',
    icon: Zap
  }
];

export default function LandingPage() {
  return (
    <div className="flex flex-col gap-24 pb-24">
      {/* Hero Section */}
      <section className="relative pt-20 pb-16 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-[500px] bg-gradient-to-b from-indigo-50/50 to-transparent -z-10 rounded-[100%]" />
        
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-indigo-100 text-indigo-700 text-sm font-semibold mb-8"
          >
            <Sparkles className="w-4 h-4" />
            <span>Powering the next generation of AI creation</span>
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-6"
          >
            Master the Art of <span className="text-indigo-600">Prompting</span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-2xl mx-auto text-lg md:text-xl text-slate-600 mb-10 leading-relaxed"
          >
            Discover, build, and monetize expert-level AI prompts. Join the leading marketplace for high-performance AI inputs for GPT, Claude, and Gemini.
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link 
              to="/explore" 
              className="w-full sm:w-auto bg-indigo-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all flex items-center justify-center gap-2"
            >
              Explore Prompts
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link 
              to="/pricing" 
              className="w-full sm:w-auto bg-white text-slate-900 border border-slate-200 px-8 py-4 rounded-xl font-bold text-lg hover:bg-slate-50 transition-all"
            >
              View Pricing
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all group"
            >
              <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                <feature.icon className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
              <p className="text-slate-500 leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Social Proof / Stats */}
      <section className="bg-slate-900 py-20 overflow-hidden relative">
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid md:grid-cols-4 gap-12 text-center">
            <div>
              <div className="text-4xl font-black text-white mb-2">50k+</div>
              <div className="text-indigo-400 font-medium tracking-wide uppercase text-xs">Active Users</div>
            </div>
            <div>
              <div className="text-4xl font-black text-white mb-2">10k+</div>
              <div className="text-indigo-400 font-medium tracking-wide uppercase text-xs">Hand-crafted Prompts</div>
            </div>
            <div>
              <div className="text-4xl font-black text-white mb-2">99%</div>
              <div className="text-indigo-400 font-medium tracking-wide uppercase text-xs">Satisfaction Rate</div>
            </div>
            <div>
              <div className="text-4xl font-black text-white mb-2">2x</div>
              <div className="text-indigo-400 font-medium tracking-wide uppercase text-xs">Productivity Boost</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4">
        <div className="bg-indigo-600 rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-400/20 to-transparent" />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            className="relative z-10"
          >
            <h2 className="text-3xl md:text-5xl font-black text-white mb-6">Ready to supercharge your workflow?</h2>
            <p className="text-indigo-100 text-lg mb-10 max-w-xl mx-auto">
              Join thousands of creators who use Promptly to get the most out of LLMs.
            </p>
            <Link 
              to="/login"
              className="inline-flex items-center gap-2 bg-white text-indigo-600 px-10 py-5 rounded-2xl font-black text-xl hover:bg-slate-50 transition-all shadow-2xl shadow-black/20"
            >
              Get Started for Free
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
