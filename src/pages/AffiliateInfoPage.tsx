import { ArrowRight, DollarSign, Gift, ShieldCheck, TrendingUp, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

export default function AffiliateInfoPage() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="relative pt-24 pb-20 overflow-hidden bg-slate-900">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-[500px] bg-gradient-to-b from-indigo-500/10 to-transparent -z-10 rounded-[100%]" />

        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex  items-center gap-2 bg-indigo-600/20 text-indigo-400 px-4 py-2 rounded-full border border-indigo-500/30 text-sm font-black uppercase tracking-widest mb-8"
          >
            <Gift className="w-4 h-4" />
            Partner Program
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tight"
          >
            Earn <span className="text-indigo-500">25% Recurring</span> Commission
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-2xl mx-auto text-xl text-slate-400 mb-10 font-medium leading-relaxed"
          >
            Join the Promptly Affiliate Program and earn passive income by sharing the world's leading AI prompt marketplace.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Link
              to="/login"
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-10 py-5 rounded-2xl font-black text-xl hover:bg-indigo-700 shadow-2xl shadow-indigo-500/20 transition-all"
            >
              Get Started Now
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Why Join */}
      <section className="py-24 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Why Partner With Us?</h2>
            <p className="text-slate-500 font-bold max-w-xl mx-auto">We provide the tools and high-converting platform to help you succeed.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={TrendingUp}
              title="High Conversion"
              desc="Our premium design and expert-curated content lead to industry-leading conversion rates."
            />
            <FeatureCard
              icon={DollarSign}
              title="Lifetime Recurring"
              desc="Earn every month for the lifetime of the user. As long as they stay subscribed, you get paid."
            />
            <FeatureCard
              icon={ShieldCheck}
              title="Reliable Payouts"
              desc="Automatic monthly payouts via PayPal or Stripe once you reach the $50 minimum threshold."
            />
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-24">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl font-black text-slate-900 mb-8 tracking-tight">How It Works</h2>
              <div className="space-y-8">
                <Step num="01" title="Sign Up" desc="Create your account and head to the Affiliate dashboard to get your unique link." />
                <Step num="02" title="Promote" desc="Share your link on social media, your blog, or with your community." />
                <Step num="03" title="Earn" desc="Track your clicks and earnings in real-time. Get paid every month." />
              </div>
            </div>
            <div className="bg-slate-900 rounded-[3rem] p-10 relative overflow-hidden shadow-2xl">
               <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 blur-3xl rounded-full" />
               <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center">
                      <Zap className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-white text-xl font-black">Affiliate Stats</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="bg-slate-800 p-4 rounded-2xl flex justify-between items-center border border-slate-700">
                      <span className="text-slate-400 font-bold text-sm">Total Clicks</span>
                      <span className="text-white font-black">1,248</span>
                    </div>
                    <div className="bg-slate-800 p-4 rounded-2xl flex justify-between items-center border border-slate-700">
                      <span className="text-slate-400 font-bold text-sm">New Referrals</span>
                      <span className="text-white font-black">42</span>
                    </div>
                    <div className="bg-indigo-600 p-6 rounded-2xl flex justify-between items-center shadow-xl shadow-indigo-900/20">
                      <span className="text-indigo-100 font-black">Available Balance</span>
                      <span className="text-white text-2xl font-black font-mono">$157.50</span>
                    </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 container mx-auto px-4">
        <div className="bg-slate-900 rounded-[3rem] p-16 text-center">
          <h2 className="text-3xl md:text-5xl font-black text-white mb-6">Ready to grow with us?</h2>
          <p className="text-slate-400 text-lg mb-10 max-w-xl mx-auto">Join hundreds of partners who are building their passive income with Promptly.</p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 bg-white text-slate-900 px-10 py-5 rounded-2xl font-black text-xl hover:bg-slate-50 transition-all shadow-xl"
          >
            Become a Partner
          </Link>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc }: any) {
  return (
    <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
      <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-all">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-xl font-black text-slate-900 mb-4 tracking-tight">{title}</h3>
      <p className="text-slate-500 font-medium leading-relaxed">{desc}</p>
    </div>
  );
}

function Step({ num, title, desc }: any) {
  return (
    <div className="flex gap-6">
      <div className="text-3xl font-black text-indigo-600/20 italic select-none">{num}</div>
      <div>
        <h4 className="text-lg font-black text-slate-900 mb-1">{title}</h4>
        <p className="text-slate-500 font-medium text-sm leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
