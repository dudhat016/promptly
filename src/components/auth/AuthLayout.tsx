import { motion } from 'motion/react';
import React from 'react';
import { Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export default function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-24 bg-slate-50/50">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-block mb-8 group">
            <div className="w-16 h-16 bg-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-indigo-200 group-hover:rotate-12 transition-transform duration-500">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <span className="text-2xl font-black tracking-tighter text-slate-900">promptly</span>
          </Link>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 mb-3">{title}</h1>
          <p className="text-slate-500 font-medium">{subtitle}</p>
        </div>

        <div className="bg-white rounded-[3rem] border border-slate-100 p-10 shadow-2xl shadow-indigo-500/5">
          {children}
        </div>

        <p className="mt-8 text-center text-sm text-slate-400 font-medium italic">
          Expert-crafted prompts for a new generation of creators.
        </p>
      </motion.div>
    </div>
  );
}
