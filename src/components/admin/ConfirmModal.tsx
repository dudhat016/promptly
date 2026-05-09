import { createContext, useContext, useRef, useState } from 'react';
import { AlertTriangle, Trash2, HelpCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Button from '../ui/Button';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

// ─── Context ─────────────────────────────────────────────────────────────────

const ConfirmContext = createContext<ConfirmFn>(() => Promise.resolve(false));

export function useConfirm(): ConfirmFn {
  return useContext(ConfirmContext);
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<(v: boolean) => void>(() => {});

  const confirm: ConfirmFn = (opts) => {
    setOptions(opts);
    return new Promise((resolve) => {
      resolverRef.current = resolve;
    });
  };

  const handleConfirm = () => { resolverRef.current(true);  setOptions(null); };
  const handleCancel  = () => { resolverRef.current(false); setOptions(null); };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}

      <AnimatePresence>
        {options && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200]"
              onClick={handleCancel}
            />

            {/* Dialog */}
            <motion.div
              key="dialog"
              initial={{ opacity: 0, scale: 0.94, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 8 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[201] w-full max-w-sm px-4"
            >
              <div className="bg-card border border-border rounded-2xl shadow-2xl shadow-black/25 overflow-hidden">
                {/* Icon header */}
                <div className={`px-6 pt-6 pb-4`}>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                    options.destructive ? 'bg-rose-500/10' : 'bg-amber-500/10'
                  }`}>
                    {options.destructive
                      ? <Trash2 className="w-6 h-6 text-rose-500" />
                      : <HelpCircle className="w-6 h-6 text-amber-500" />
                    }
                  </div>
                  <h2 className="text-base font-bold text-foreground">{options.title}</h2>
                  {options.description && (
                    <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{options.description}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 justify-end px-6 py-4 bg-muted/30 border-t border-border">
                  <Button
                    onClick={handleCancel}
                    variant="ghost"
                    size="sm"
                    className="font-bold uppercase tracking-widest text-xs"
                  >
                    {options.cancelLabel ?? 'Cancel'}
                  </Button>
                  <Button
                    onClick={handleConfirm}
                    variant={options.destructive ? 'danger' : 'primary'}
                    size="sm"
                    className="font-bold uppercase tracking-widest text-xs"
                  >
                    {options.confirmLabel ?? 'Confirm'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}
