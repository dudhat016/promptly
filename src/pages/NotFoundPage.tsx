import { Link } from 'react-router-dom';
import { Home, ArrowLeft, Search } from 'lucide-react';
import { motion } from 'motion/react';

export default function NotFoundPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-8 relative inline-block"
        >
          <div className="w-32 h-32 bg-indigo-50 rounded-full flex items-center justify-center mx-auto">
            <Search className="w-16 h-16 text-indigo-600 animate-pulse" />
          </div>
          <div className="absolute -top-2 -right-2 bg-indigo-600 text-white font-black px-3 py-1 rounded-full shadow-lg text-lg">
            404
          </div>
        </motion.div>

        <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Oops! Page not found.</h1>
        <p className="text-slate-500 mb-10 font-medium">
          The page you're looking for doesn't exist or has been moved. Let's get you back on track.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            to="/" 
            className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all"
          >
            <Home className="w-5 h-5" />
            Go Home
          </Link>
          <button 
            onClick={() => window.history.back()}
            className="flex items-center justify-center gap-2 bg-white text-slate-900 border border-slate-200 px-8 py-4 rounded-2xl font-bold hover:bg-slate-50 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
            Go Back
          </button>
        </div>

        <div className="mt-16 pt-8 border-t border-slate-100">
          <p className="text-sm text-slate-400 font-medium">Looking for something specific?</p>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            <Link to="/explore" className="text-xs font-black uppercase tracking-widest text-indigo-600 hover:underline">Explore Prompts</Link>
            <Link to="/blog" className="text-xs font-black uppercase tracking-widest text-indigo-600 hover:underline">Read Blog</Link>
            <Link to="/pricing" className="text-xs font-black uppercase tracking-widest text-indigo-600 hover:underline">Pricing</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
