import { ReactNode } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import PageContainer from './layout/PageContainer';
import { usePath } from '../hooks/usePath';

interface LegalLayoutProps {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}

export default function LegalLayout({ title, lastUpdated, children }: LegalLayoutProps) {
  const { prefix } = usePath();
  return (
    <div className="bg-muted/50 min-h-screen py-24">
      <PageContainer ignoreCustomizer>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-lg p-8 md:p-16 shadow-xl shadow-black/5 border border-border"
        >
          <div className="mb-12 border-b border-border pb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 tracking-tight">{title}</h1>
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Last Updated: {lastUpdated}</p>
          </div>

          <div className="prose prose-slate prose-indigo max-w-none 
            prose-headings:font-bold prose-headings:text-foreground prose-headings:tracking-tight
            prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:font-medium
            prose-li:text-muted-foreground prose-li:font-medium
            prose-strong:text-foreground prose-strong:font-bold
            prose-a:text-primary prose-a:font-bold prose-a:no-underline hover:prose-a:underline
          ">
            {children}
          </div>
        </motion.div>

        <div className="mt-12 text-center">
          <p className="text-muted-foreground text-sm font-medium">
            Have questions about our policies? <Link to={prefix('/contact')} className="text-primary font-bold hover:underline">Contact Support</Link>
          </p>
        </div>
      </PageContainer>
    </div>
  );
}
