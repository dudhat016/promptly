import { Link } from 'react-router-dom';
import { Home, ArrowLeft, Search } from 'lucide-react';
import { usePath } from '../hooks/usePath';
import { motion } from 'motion/react';
import Button from '../components/primitives/Button';

export default function NotFoundPage() {
  const { prefix } = usePath();
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-8 relative inline-block"
        >
          <div className="w-32 h-32 bg-primary/8 rounded-full flex items-center justify-center mx-auto">
            <Search className="w-16 h-16 text-primary animate-pulse" />
          </div>
          <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground font-bold px-3 py-1 rounded-full shadow-lg text-lg">
            404
          </div>
        </motion.div>

        <h1 className="text-4xl font-bold text-foreground mb-4 tracking-tight">Oops! Page not found.</h1>
        <p className="text-muted-foreground mb-10 font-medium">
          The page you're looking for doesn't exist or has been moved. Let's get you back on track.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            as={Link} 
            to={prefix('/')} 
            variant="primary" 
            size="lg" 
            leftIcon={Home}
          >
            Go Home
          </Button>
          <Button 
            onClick={() => window.history.back()}
            variant="secondary"
            size="lg"
            leftIcon={ArrowLeft}
          >
            Go Back
          </Button>
        </div>

        <div className="mt-16 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground font-medium">Looking for something specific?</p>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            <Link to={prefix('/explore')} className="text-xs font-bold uppercase tracking-widest text-primary hover:underline">Explore Prompts</Link>
            <Link to={prefix('/blog')} className="text-xs font-bold uppercase tracking-widest text-primary hover:underline">Read Blog</Link>
            <Link to={prefix('/pricing')} className="text-xs font-bold uppercase tracking-widest text-primary hover:underline">Pricing</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
