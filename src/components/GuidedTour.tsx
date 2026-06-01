import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { cn } from '../lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TourStep {
  selector: string;
  title: string;
  description: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

interface GuidedTourProps {
  steps: TourStep[];
  onClose: () => void;
}

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PADDING = 10;
const TOOLTIP_W = 300;
const TOOLTIP_H_EST = 160;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getPlacement(rect: TargetRect, preferred: TourStep['placement']): TourStep['placement'] {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const spaceTop    = rect.top - PADDING;
  const spaceBottom = vh - rect.top - rect.height - PADDING;
  const spaceLeft   = rect.left - PADDING;
  const spaceRight  = vw - rect.left - rect.width - PADDING;

  const order: TourStep['placement'][] = [preferred ?? 'bottom', 'bottom', 'top', 'right', 'left'];
  const fits: Record<NonNullable<TourStep['placement']>, boolean> = {
    top:    spaceTop    >= TOOLTIP_H_EST,
    bottom: spaceBottom >= TOOLTIP_H_EST,
    left:   spaceLeft   >= TOOLTIP_W,
    right:  spaceRight  >= TOOLTIP_W,
  };
  return order.find(p => fits[p!]) ?? 'bottom';
}

function tooltipStyle(rect: TargetRect, placement: NonNullable<TourStep['placement']>): React.CSSProperties {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top  + rect.height / 2;
  const gap = PADDING + 4;

  switch (placement) {
    case 'top':    return { bottom: window.innerHeight - rect.top + gap, left: Math.min(Math.max(cx - TOOLTIP_W / 2, 8), window.innerWidth - TOOLTIP_W - 8), width: TOOLTIP_W };
    case 'bottom': return { top: rect.top + rect.height + gap,           left: Math.min(Math.max(cx - TOOLTIP_W / 2, 8), window.innerWidth - TOOLTIP_W - 8), width: TOOLTIP_W };
    case 'left':   return { top: Math.min(Math.max(cy - TOOLTIP_H_EST / 2, 8), window.innerHeight - TOOLTIP_H_EST - 8), right: window.innerWidth - rect.left + gap, width: TOOLTIP_W };
    case 'right':  return { top: Math.min(Math.max(cy - TOOLTIP_H_EST / 2, 8), window.innerHeight - TOOLTIP_H_EST - 8), left: rect.left + rect.width + gap, width: TOOLTIP_W };
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GuidedTour({ steps, onClose }: GuidedTourProps) {
  const [stepIdx, setStepIdx] = useState(0);
  const [rect, setRect] = useState<TargetRect | null>(null);
  const [dontShow, setDontShow] = useState(false);
  const rafRef = useRef<number>(0);

  const step = steps[stepIdx];
  const isLast = stepIdx === steps.length - 1;

  // Track target element position (re-measures on every frame for accuracy)
  useLayoutEffect(() => {
    function measure() {
      const el = document.querySelector(step.selector);
      if (!el) { setRect(null); return; }
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    }
    measure();
    rafRef.current = window.requestAnimationFrame(function loop() {
      measure();
      rafRef.current = window.requestAnimationFrame(loop);
    });
    return () => window.cancelAnimationFrame(rafRef.current);
  }, [step.selector]);

  // Scroll target into view when step changes
  useEffect(() => {
    const el = document.querySelector(step.selector);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
  }, [step.selector]);

  // Keyboard nav
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose();
      if (e.key === 'ArrowRight' && !isLast) setStepIdx(i => i + 1);
      if (e.key === 'ArrowLeft' && stepIdx > 0) setStepIdx(i => i - 1);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIdx, isLast]);

  function handleClose() {
    if (dontShow) localStorage.setItem('tour-dismissed', 'true');
    onClose();
  }

  function handleFinish() {
    if (dontShow) localStorage.setItem('tour-dismissed', 'true');
    onClose();
  }

  const placement = rect ? getPlacement(rect, step.placement) : 'bottom';
  const tipStyle  = rect ? tooltipStyle(rect, placement) : {};

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] pointer-events-none">

        {/* Dark overlay with spotlight cutout via box-shadow */}
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 pointer-events-auto"
          onClick={handleClose}
          style={{ background: 'rgba(0,0,0,0.55)' }}
        />

        {/* Spotlight: a transparent rect over the target */}
        {rect && (
          <motion.div
            key={`spotlight-${stepIdx}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="absolute rounded-xl"
            style={{
              top: rect.top - PADDING,
              left: rect.left - PADDING,
              width: rect.width + PADDING * 2,
              height: rect.height + PADDING * 2,
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
              background: 'transparent',
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Tooltip card */}
        {rect && (
          <motion.div
            key={`tooltip-${stepIdx}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute pointer-events-auto bg-card border border-border rounded-2xl shadow-2xl p-5"
            style={tipStyle}
          >
            {/* Step indicator */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex gap-1.5">
                {steps.map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'h-1 rounded-full transition-all duration-300',
                      i === stepIdx ? 'bg-primary w-6' : 'bg-muted w-3'
                    )}
                  />
                ))}
              </div>
              <button
                onClick={handleClose}
                className="w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Content */}
            <h3 className="font-bold text-foreground text-sm mb-1">{step.title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
              <span className="text-[10px] text-muted-foreground font-medium">
                {stepIdx + 1} of {steps.length}
              </span>
              <div className="flex items-center gap-2">
                {stepIdx > 0 && (
                  <button
                    onClick={() => setStepIdx(i => i - 1)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center bg-muted hover:bg-border text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                )}
                {isLast ? (
                  <button
                    onClick={handleFinish}
                    className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors"
                  >
                    Done
                  </button>
                ) : (
                  <button
                    onClick={() => setStepIdx(i => i + 1)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Don't show again (last step only) */}
            {isLast && (
              <label className="flex items-center gap-2 mt-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="w-3.5 h-3.5 rounded accent-primary"
                  checked={dontShow}
                  onChange={e => setDontShow(e.target.checked)}
                />
                <span className="text-[10px] text-muted-foreground">Don't show again</span>
              </label>
            )}
          </motion.div>
        )}

        {/* Fallback message when target element not found */}
        {!rect && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-auto bg-card border border-border rounded-2xl shadow-2xl p-5 w-72"
          >
            <p className="text-sm font-bold text-foreground mb-1">{step.title}</p>
            <p className="text-xs text-muted-foreground">{step.description}</p>
            <div className="flex justify-between items-center mt-4">
              <span className="text-[10px] text-muted-foreground">{stepIdx + 1} of {steps.length}</span>
              <div className="flex gap-2">
                {stepIdx > 0 && (
                  <button onClick={() => setStepIdx(i => i - 1)} className="px-3 py-1.5 rounded-lg bg-muted text-xs font-bold">Back</button>
                )}
                {isLast
                  ? <button onClick={handleFinish} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold">Done</button>
                  : <button onClick={() => setStepIdx(i => i + 1)} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold">Next</button>
                }
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </AnimatePresence>,
    document.body
  );
}
