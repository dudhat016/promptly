import { Link, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { ShieldOff, ArrowLeft, LogIn } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Button from '../../components/primitives/Button';

export default function ForbiddenPage() {
  const { lng } = useParams<{ lng: string }>();
  const { t } = useTranslation();
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
        <h1 className="text-2xl font-bold text-foreground mb-3">{t('errors.403.title')}</h1>
        <p className="text-muted-foreground mb-8 leading-relaxed">{t('errors.403.desc')}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="secondary" leftIcon={ArrowLeft} onClick={() => history.back()}>
            {t('errors.403.back')}
          </Button>
          <Button as={Link} to={`${base}/login`} variant="gradient" leftIcon={LogIn}>
            {t('errors.403.signIn')}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
