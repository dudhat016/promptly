import { Moon, Sun } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../hooks/useTheme';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <button
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      className="relative p-2.5 bg-muted/50 hover:bg-muted text-muted-foreground hover:text-primary rounded-2xl transition-all border border-transparent hover:border-border overflow-hidden active:scale-95"
      aria-label="Toggle theme"
    >
      <AnimatePresence mode="wait" initial={false}>
        {theme === 'light' ? (
          <motion.div
            key="sun"
            initial={{ y: 20, opacity: 0, rotate: 45 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: -20, opacity: 0, rotate: -45 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            <Sun className="w-5 h-5" />
          </motion.div>
        ) : (
          <motion.div
            key="moon"
            initial={{ y: 20, opacity: 0, rotate: -45 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: -20, opacity: 0, rotate: 45 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            <Moon className="w-5 h-5" />
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}
