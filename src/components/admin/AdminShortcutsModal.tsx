import { AnimatePresence, motion } from 'motion/react';
import { Keyboard, X } from 'lucide-react';
import Button from '../ui/Button';

interface AdminShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

const SHORTCUT_GROUPS = [
  {
    category: 'Navigation',
    shortcuts: [
      { keys: ['Ctrl', 'K'], label: 'Open global search' },
      { keys: ['?'],          label: 'Show keyboard shortcuts' },
      { keys: ['Esc'],        label: 'Close modal' },
    ],
  },
  {
    category: 'Search results',
    shortcuts: [
      { keys: ['↑', '↓'], label: 'Navigate results' },
      { keys: ['↵'],       label: 'Open selected result' },
    ],
  },
  {
    category: 'Tables',
    shortcuts: [
      { keys: ['Click header'], label: 'Sort by column' },
      { keys: ['Shift', 'Click'], label: 'Multi-select rows' },
    ],
  },
];

export default function AdminShortcutsModal({ open, onClose }: AdminShortcutsModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="shortcuts-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
            onClick={onClose}
          />

          <motion.div
            key="shortcuts-panel"
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -12 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="fixed left-1/2 -translate-x-1/2 top-[15vh] z-[101] w-full max-w-md px-4"
          >
            <div className="bg-card border border-border rounded-2xl shadow-2xl shadow-black/25 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Keyboard className="w-3.5 h-3.5" />
                  </div>
                  <h2 className="text-sm font-bold text-foreground">Keyboard Shortcuts</h2>
                </div>
                <Button
                  onClick={onClose}
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground p-1"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Shortcuts */}
              <div className="p-5 space-y-6">
                {SHORTCUT_GROUPS.map(group => (
                  <div key={group.category}>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">
                      {group.category}
                    </p>
                    <div className="space-y-2.5">
                      {group.shortcuts.map(s => (
                        <div key={s.label} className="flex items-center justify-between gap-4">
                          <span className="text-sm text-foreground">{s.label}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            {s.keys.map((k, i) => (
                              <span key={k} className="flex items-center gap-1">
                                <kbd className="text-[10px] font-bold bg-muted border border-border rounded px-1.5 py-0.5 text-muted-foreground">
                                  {k}
                                </kbd>
                                {i < s.keys.length - 1 && (
                                  <span className="text-[10px] text-muted-foreground/50">+</span>
                                )}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-border bg-muted/20">
                <p className="text-[10px] text-muted-foreground text-center">
                  Press <kbd className="text-[9px] font-bold bg-muted border border-border rounded px-1 py-0.5">?</kbd> anywhere to toggle this panel
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
