import { motion } from 'motion/react';
import React from 'react';
import { Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePath } from '../../hooks/usePath';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export default function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  const { prefix } = usePath();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16 bg-muted/30">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-[420px]"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to={prefix('/')} className="inline-flex flex-col items-center gap-3 group mb-6">
            <div className="w-11 h-11 gradient-primary rounded-md flex items-center justify-center shadow-md shadow-primary/25 group-hover:scale-95 transition-transform">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold font-display text-foreground">promptly</span>
          </Link>
          <h1 className="text-2xl font-bold text-foreground font-display mb-2">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-md p-8 shadow-sm">
          {children}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground/60">
          {t('auth.layout.agree')}{' '}
          <Link to={prefix('/terms')} className="underline hover:text-foreground transition-colors">
            {t('auth.layout.terms')}
          </Link>
          {' '}{t('common.and')}{' '}
          <Link to={prefix('/privacy')} className="underline hover:text-foreground transition-colors">
            {t('auth.layout.privacy')}
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
