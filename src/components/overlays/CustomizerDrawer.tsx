import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, X, RotateCcw, Copy, Check, Sun, Moon, Monitor, ChevronLeft, ChevronRight } from 'lucide-react';
import { useUI, type UIConfig, type PrimaryColor } from '../../contexts/UIProvider';
import i18n from '../../i18n';
import { cn } from '../../lib/utils';

// ─── Color presets ───────────────────────────────────────────
const colorOptions: { value: PrimaryColor; label: string; hex: string }[] = [
  { value: 'violet',  label: 'Violet',       hex: '#7c3aed' },
  { value: 'blue',    label: 'Blue',         hex: '#3b82f6' },
  { value: 'indigo',  label: 'Indigo',       hex: '#6366f1' },
  { value: 'purple',  label: 'Purple',       hex: '#a855f7' },
  { value: 'cyan',    label: 'Cyan',         hex: '#06b6d4' },
  { value: 'teal',    label: 'Teal',         hex: '#14b8a6' },
  { value: 'emerald', label: 'Emerald',      hex: '#10b981' },
  { value: 'amber',   label: 'Amber',        hex: '#f59e0b' },
  { value: 'orange',  label: 'Orange',       hex: '#f97316' },
  { value: 'rose',    label: 'Rose',         hex: '#f43f5e' },
];

const radiusOptions = [0, 4, 8, 12, 16];

const fontOptions: { value: UIConfig['fontFamily']; label: string }[] = [
  { value: 'inter',          label: 'Inter' },
  { value: 'geist',          label: 'Geist' },
  { value: 'outfit',         label: 'Outfit' },
  { value: 'space-grotesk',  label: 'Space Grotesk' },
];

const languageOptions = [
  { code: 'en', label: 'EN' },
  { code: 'hi', label: 'HI' },
  { code: 'ar', label: 'AR' },
  { code: 'es', label: 'ES' },
  { code: 'fr', label: 'FR' },
];

// ─── Component ───────────────────────────────────────────────
export default function CustomizerDrawer() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hexInput, setHexInput] = useState('');
  const hexRef = useRef<HTMLInputElement>(null);
  const { config, setConfig, resetConfig } = useUI();

  const handleCopyConfig = () => {
    navigator.clipboard.writeText(JSON.stringify(config, null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleHexApply = () => {
    const hex = hexInput.startsWith('#') ? hexInput : `#${hexInput}`;
    if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
      setConfig({ customColor: hex });
    }
  };

  const handleHexKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleHexApply();
  };

  return (
    <>
      {/* Floating trigger */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open theme customizer"
        className="fixed bottom-6 right-6 rtl:right-auto rtl:left-6 z-50 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-110 transition-transform"
      >
        <Settings className="w-5 h-5 animate-spin" style={{ animationDuration: '8s' }} />
      </button>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />

            {/* Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="absolute top-0 right-0 rtl:right-auto rtl:left-0 bottom-0 w-80 bg-card border-l rtl:border-l-0 rtl:border-r border-border shadow-2xl flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">Theme Customizer</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Personalize your workspace</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleCopyConfig}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title="Copy config JSON"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={resetConfig}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title="Reset to defaults"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setOpen(false)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-7">

                {/* ── Theme Mode ── */}
                <Section label="Theme Mode">
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { value: 'light', icon: Sun, label: 'Light' },
                      { value: 'dark',  icon: Moon, label: 'Dark' },
                      { value: 'system',icon: Monitor, label: 'System' },
                    ] as const).map(({ value, icon: Icon, label }) => (
                      <button
                        key={value}
                        onClick={() => setConfig({ mode: value })}
                        className={cn(
                          "flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-xs font-bold uppercase tracking-wider transition-all",
                          config.mode === value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/30"
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        {label}
                      </button>
                    ))}
                  </div>
                </Section>

                {/* ── Primary Color ── */}
                <Section label="Primary Color">
                  <div className="grid grid-cols-5 gap-2.5">
                    {colorOptions.map(c => (
                      <button
                        key={c.value}
                        onClick={() => setConfig({ primaryColor: c.value, customColor: undefined })}
                        className={cn(
                          "w-10 h-10 rounded-xl transition-all flex items-center justify-center",
                          config.primaryColor === c.value && !config.customColor
                            ? "ring-2 ring-offset-2 ring-offset-card ring-primary scale-110"
                            : "hover:scale-110"
                        )}
                        style={{ backgroundColor: c.hex }}
                        title={c.label}
                      />
                    ))}
                  </div>

                  {/* Hex input */}
                  <div className="mt-3 flex gap-2">
                    <div className="flex-1 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono">#</span>
                      <input
                        ref={hexRef}
                        type="text"
                        maxLength={6}
                        placeholder="7c3aed"
                        value={hexInput}
                        onChange={e => setHexInput(e.target.value.replace(/[^0-9a-fA-F]/g, ''))}
                        onKeyDown={handleHexKeyDown}
                        className="w-full bg-muted/50 border border-border rounded-lg pl-7 pr-3 py-2 text-xs font-mono focus:outline-none focus:border-primary transition-colors"
                      />
                    </div>
                    <button
                      onClick={handleHexApply}
                      className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:bg-primary/90 transition-colors"
                    >
                      Apply
                    </button>
                  </div>
                  {config.customColor && (
                    <button
                      onClick={() => { setConfig({ customColor: undefined }); setHexInput(''); }}
                      className="text-[11px] text-primary hover:underline mt-1"
                    >
                      Clear custom color
                    </button>
                  )}
                </Section>

                {/* ── Border Radius ── */}
                <Section label="Border Radius">
                  <div className="flex gap-2">
                    {radiusOptions.map(r => (
                      <button
                        key={r}
                        onClick={() => setConfig({ radius: r })}
                        className={cn(
                          "flex-1 h-10 border-2 flex items-center justify-center text-xs font-bold transition-all",
                          config.radius === r
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/30"
                        )}
                        style={{ borderRadius: `${r}px` }}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </Section>

                {/* ── Font Family ── */}
                <Section label="Font Family">
                  <div className="grid grid-cols-2 gap-2">
                    {fontOptions.map(f => (
                      <button
                        key={f.value}
                        onClick={() => setConfig({ fontFamily: f.value })}
                        className={cn(
                          "py-2.5 px-3 rounded-lg border-2 text-xs font-bold transition-all text-left",
                          config.fontFamily === f.value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/30"
                        )}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </Section>

                {/* ── Layout ── */}
                <Section label="Layout Mode">
                  <div className="flex gap-2">
                    {(['boxed', 'full'] as const).map(layout => (
                      <button
                        key={layout}
                        onClick={() => setConfig({ layoutMode: layout })}
                        className={cn(
                          "flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider border-2 transition-all",
                          config.layoutMode === layout
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/30"
                        )}
                      >
                        {layout}
                      </button>
                    ))}
                  </div>
                </Section>

                {/* ── Content Width ── */}
                <Section label="Content Width">
                  <div className="flex gap-2">
                    {(['compact', 'wide'] as const).map(w => (
                      <button
                        key={w}
                        onClick={() => setConfig({ contentWidth: w })}
                        className={cn(
                          "flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider border-2 transition-all",
                          config.contentWidth === w
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/30"
                        )}
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                </Section>

                {/* ── Navbar Style ── */}
                <Section label="Navbar Style">
                  <div className="flex gap-2">
                    {(['fixed', 'static', 'floating'] as const).map(ns => (
                      <button
                        key={ns}
                        onClick={() => setConfig({ navbarStyle: ns })}
                        className={cn(
                          "flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider border-2 transition-all",
                          config.navbarStyle === ns
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/30"
                        )}
                      >
                        {ns}
                      </button>
                    ))}
                  </div>
                </Section>

                {/* ── Navigation Orientation ── */}
                <Section label="Navigation">
                  <div className="flex gap-2">
                    {(['vertical', 'horizontal'] as const).map(orientation => (
                      <button
                        key={orientation}
                        onClick={() => setConfig({ orientation })}
                        className={cn(
                          "flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider border-2 transition-all",
                          config.orientation === orientation
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/30"
                        )}
                      >
                        {orientation}
                      </button>
                    ))}
                  </div>
                </Section>

                {/* ── Sidebar Width ── */}
                <Section label="Sidebar Width">
                  <div className="flex gap-2">
                    {([240, 260, 280] as const).map(w => (
                      <button
                        key={w}
                        onClick={() => setConfig({ sidebarWidth: w })}
                        className={cn(
                          "flex-1 py-2.5 rounded-lg text-xs font-bold border-2 transition-all",
                          config.sidebarWidth === w
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/30"
                        )}
                      >
                        {w}px
                      </button>
                    ))}
                  </div>
                </Section>

                {/* ── Sidebar Theme ── */}
                <Section label="Sidebar Theme">
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { value: 'default',  label: 'Default' },
                      { value: 'dark',     label: 'Dark' },
                      { value: 'light',    label: 'Light' },
                      { value: 'gradient', label: 'Brand' },
                    ] as const).map(({ value, label }) => (
                      <button
                        key={value}
                        onClick={() => setConfig({ sidebarTheme: value })}
                        className={cn(
                          "py-2.5 rounded-lg border-2 text-[10px] font-bold uppercase tracking-wider transition-all",
                          config.sidebarTheme === value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/30"
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </Section>

                {/* ── Toggles ── */}
                <Section label="Options">
                  <div className="space-y-3">
                    <Toggle
                      label="Card Shadows"
                      checked={config.cardShadow}
                      onChange={v => setConfig({ cardShadow: v })}
                    />
                    <Toggle
                      label="Collapsed Sidebar"
                      checked={config.sidebarCollapsed}
                      onChange={v => setConfig({ sidebarCollapsed: v })}
                    />
                  </div>
                </Section>

                {/* ── Language ── */}
                <Section label="Language">
                  <div className="flex gap-2 flex-wrap">
                    {languageOptions.map(lang => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setConfig({ language: lang.code });
                          i18n.changeLanguage(lang.code);
                        }}
                        className={cn(
                          "flex-1 min-w-[44px] py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider border-2 transition-all",
                          config.language === lang.code
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/30"
                        )}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                </Section>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-border shrink-0">
                <button
                  onClick={resetConfig}
                  className="w-full py-2.5 rounded-xl border-2 border-dashed border-border text-xs font-bold uppercase tracking-widest text-muted-foreground hover:border-destructive/40 hover:text-destructive transition-all"
                >
                  Reset All Defaults
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Helpers ─────────────────────────────────────────────────
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-sm text-foreground">{label}</span>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          "w-11 h-6 rounded-full transition-colors relative shrink-0",
          checked ? "bg-primary" : "bg-muted"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-5" : "translate-x-0.5"
          )}
        />
      </button>
    </label>
  );
}
