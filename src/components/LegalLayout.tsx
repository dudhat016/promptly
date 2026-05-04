import { ReactNode } from 'react';
import { motion } from 'motion/react';

interface LegalLayoutProps {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}

export default function LegalLayout({ title, lastUpdated, children }: LegalLayoutProps) {
  return (
    <div className="bg-slate-50 min-h-screen py-24">
      <div className="container mx-auto px-4 max-w-4xl">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[3rem] p-8 md:p-16 shadow-xl shadow-slate-200/50 border border-slate-100"
        >
          <div className="mb-12 border-b border-slate-100 pb-8">
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">{title}</h1>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Last Updated: {lastUpdated}</p>
          </div>

          <div className="prose prose-slate prose-indigo max-w-none 
            prose-headings:font-black prose-headings:text-slate-900 prose-headings:tracking-tight
            prose-p:text-slate-600 prose-p:leading-relaxed prose-p:font-medium
            prose-li:text-slate-600 prose-li:font-medium
            prose-strong:text-slate-900 prose-strong:font-black
            prose-a:text-indigo-600 prose-a:font-bold prose-a:no-underline hover:prose-a:underline
          ">
            {children}
          </div>
        </motion.div>

        <div className="mt-12 text-center">
          <p className="text-slate-400 text-sm font-medium">
            Have questions about our policies? <a href="/contact" className="text-indigo-600 font-bold hover:underline">Contact Support</a>
          </p>
        </div>
      </div>
    </div>
  );
}
