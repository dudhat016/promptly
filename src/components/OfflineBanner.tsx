import { AnimatePresence, motion } from 'motion/react';
import { WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function OfflineBanner() {
  const { t } = useTranslation();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    function handleOffline() { setIsOffline(true); setShowReconnected(false); }
    function handleOnline() {
      setIsOffline(false);
      setShowReconnected(true);
      setTimeout(() => setShowReconnected(false), 3000);
    }
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          key="offline"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="relative z-50 bg-amber-500 text-white overflow-hidden"
        >
          <div className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold">
            <WifiOff className="w-3.5 h-3.5 shrink-0" />
            <span>{t('offline.message')}</span>
          </div>
        </motion.div>
      )}
      {showReconnected && !isOffline && (
        <motion.div
          key="reconnected"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="relative z-50 bg-emerald-500 text-white overflow-hidden"
        >
          <div className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold">
            <span>{t('offline.reconnected')}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
