import { Link, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { ServerCrash, RotateCcw, Home } from 'lucide-react';

export default function ServerErrorPage() {
  const { lng } = useParams<{ lng: string }>();
  const base = `/${lng || 'en'}`;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-md"
      >
        <div className="w-24 h-24 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-6">
          <ServerCrash className="w-12 h-12 text-amber-500" />
        </div>
        <div className="text-7xl font-black text-amber-500/20 leading-none mb-4 select-none">500</div>
        <h1 className="text-2xl font-bold text-foreground mb-3">Something Went Wrong</h1>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          Our servers encountered an unexpected error. We've been notified and are working on a fix.
          Please try again in a few minutes.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold uppercase tracking-widest bg-muted text-foreground hover:bg-muted/80 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            Try Again
          </button>
          <Link
            to={base}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold uppercase tracking-widest gradient-cta transition-all hover:opacity-90"
          >
            <Home className="w-4 h-4" />
            Go Home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
