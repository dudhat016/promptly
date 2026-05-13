import { Link, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { ShieldOff, ArrowLeft, LogIn } from 'lucide-react';

export default function ForbiddenPage() {
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
        <div className="w-24 h-24 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-6">
          <ShieldOff className="w-12 h-12 text-destructive" />
        </div>
        <div className="text-7xl font-black text-destructive/20 leading-none mb-4 select-none">403</div>
        <h1 className="text-2xl font-bold text-foreground mb-3">Access Denied</h1>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          You don't have permission to view this page. If you think this is a mistake, please contact support.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => history.back()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold uppercase tracking-widest bg-muted text-foreground hover:bg-muted/80 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
          <Link
            to={`${base}/login`}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold uppercase tracking-widest gradient-cta transition-all hover:opacity-90"
          >
            <LogIn className="w-4 h-4" />
            Sign In
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
