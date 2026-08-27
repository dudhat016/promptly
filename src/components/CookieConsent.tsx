import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, X, Settings2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, Card, Checkbox } from './primitives';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';
import { usePath } from '../hooks/usePath';

export interface CookieConsentData {
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
  timestamp: string;
}

export default function CookieConsent() {
  const { t } = useTranslation();
  const { prefix } = usePath();
  const [isVisible, setIsVisible] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [consent, setConsent] = useState({
    analytics: true,
    marketing: true,
    functional: true,
  });

  useEffect(() => {
    const saved = localStorage.getItem('promptly_cookie_consent');
    if (!saved) {
      const timer = setTimeout(() => setIsVisible(true), 2500);
      return () => clearTimeout(timer);
    }
  }, []);

  const saveConsent = (data: typeof consent) => {
    const fullData: CookieConsentData = { ...data, timestamp: new Date().toISOString() };
    localStorage.setItem('promptly_cookie_consent', JSON.stringify(fullData));
    setIsVisible(false);
    window.dispatchEvent(new Event('cookieConsentChanged'));
  };

  const handleAcceptAll = () => saveConsent({ analytics: true, marketing: true, functional: true });
  const handleRejectAll = () => saveConsent({ analytics: false, marketing: false, functional: true });

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-6 left-6 right-6 z-[200] max-w-4xl mx-auto"
        >
          <Card variant="raised" padding="none" className="border-primary/20 shadow-2xl shadow-primary/10 overflow-visible">
            <div className="flex flex-col md:flex-row items-stretch">
              <div className="hidden md:flex w-32 bg-primary/5 items-center justify-center border-r border-border shrink-0">
                <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center text-primary">
                  <Shield className="w-8 h-8" />
                </div>
              </div>

              <div className="p-6 md:p-8 flex-1">
                {!showManage ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-foreground">{t('cookie.title')}</h3>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-bold uppercase tracking-wider">
                        {t('cookie.badge')}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {t('cookie.description')}{' '}
                      <Link to={prefix('/privacy')} className="text-primary hover:underline font-bold">
                        {t('cookie.privacyLink')}
                      </Link>.
                    </p>
                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      <Button onClick={handleAcceptAll} variant="primary" size="sm">{t('cookie.acceptAll')}</Button>
                      <Button onClick={handleRejectAll} variant="outline" size="sm">{t('cookie.rejectNonEssential')}</Button>
                      <Button variant="ghost" size="sm" leftIcon={Settings2} onClick={() => setShowManage(true)}>
                        {t('cookie.managePreferences')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-foreground">{t('cookie.manageCookies')}</h3>
                      <Button variant="ghost" size="icon" onClick={() => setShowManage(false)}>
                        <X className="w-5 h-5" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <PreferenceCard
                        title={t('cookie.essential')}
                        description={t('cookie.essentialDesc')}
                        checked={true}
                        disabled={true}
                      />
                      <PreferenceCard
                        title={t('cookie.analytics')}
                        description={t('cookie.analyticsDesc')}
                        checked={consent.analytics}
                        onChange={(v: boolean) => setConsent(c => ({ ...c, analytics: v }))}
                      />
                      <PreferenceCard
                        title={t('cookie.marketing')}
                        description={t('cookie.marketingDesc')}
                        checked={consent.marketing}
                        onChange={(v: boolean) => setConsent(c => ({ ...c, marketing: v }))}
                      />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2 border-t border-border mt-4">
                      <Button onClick={() => setShowManage(false)} variant="ghost" size="sm">{t('cookie.back')}</Button>
                      <Button onClick={() => saveConsent(consent)} variant="primary" size="sm">{t('cookie.savePreferences')}</Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function PreferenceCard({ title, description, checked, onChange, disabled = false }: any) {
  return (
    <div className={cn(
      "p-4 rounded-xl border-2 transition-all",
      checked ? "border-primary/20 bg-primary/5" : "border-border bg-muted/20 opacity-60"
    )}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-bold uppercase tracking-wider">{title}</span>
        <div className="scale-75 origin-right">
          <Checkbox
            variant="simple"
            checked={checked}
            onChange={disabled ? undefined : (e) => onChange(e.target.checked)}
            disabled={disabled}
          />
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground leading-tight line-clamp-2">{description}</p>
    </div>
  );
}
