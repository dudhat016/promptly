import { Link, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Home, ArrowLeft, Search } from 'lucide-react';

export default function NotFoundPage() {
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
        <div className="text-[10rem] font-black leading-none select-none mb-4 gradient-text">
          404
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-3">Page Not Found</h1>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          The page you're looking for doesn't exist or has been moved. Let's get you back on track.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to={base}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold uppercase tracking-widest gradient-cta transition-all hover:opacity-90"
          >
            <Home className="w-4 h-4" />
            Go Home
          </Link>
          <Link
            to={`${base}/explore`}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold uppercase tracking-widest bg-muted text-foreground hover:bg-muted/80 transition-all"
          >
            <Search className="w-4 h-4" />
            Browse Prompts
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
