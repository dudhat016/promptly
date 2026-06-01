import { AnimatePresence, motion } from 'motion/react';
import { WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function OfflineBanner() {
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
            <span>You're offline — some features are unavailable. Changes will sync when you reconnect.</span>
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
            <span>Back online — your changes have been synced.</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
