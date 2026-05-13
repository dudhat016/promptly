import { addDoc, collection, getDocs, increment, query, serverTimestamp, updateDoc, where, doc } from 'firebase/firestore';
import { AlertTriangle, CheckCircle, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { AnimatePresence, motion } from 'motion/react';
import Button from './primitives/Button';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/firebase';
import { Prompt } from '../types';
import { cn } from '../lib/utils';

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam or misleading', desc: 'Fake, clickbait, or promotional content' },
  { value: 'harmful', label: 'Harmful or dangerous', desc: 'Content that could cause real-world harm' },
  { value: 'inappropriate', label: 'Inappropriate content', desc: 'Offensive, adult, or violent material' },
  { value: 'copyright', label: 'Copyright violation', desc: 'Stolen from another creator or source' },
  { value: 'wrong_category', label: 'Wrong category', desc: 'Miscategorized or completely off-topic' },
  { value: 'duplicate', label: 'Duplicate', desc: 'Near-identical to an existing prompt' },
  { value: 'other', label: 'Something else', desc: 'Describe the issue below' },
] as const;

type ReportReason = typeof REPORT_REASONS[number]['value'];

interface Props {
  prompt: Prompt;
  isOpen: boolean;
  onClose: () => void;
}

export default function ReportModal({ prompt, isOpen, onClose }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState<'reason' | 'done'>('reason');
  const [selected, setSelected] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleClose = () => {
    setStep('reason');
    setSelected(null);
    setDetails('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      // Check if user already reported this prompt
      if (user) {
        const existing = await getDocs(
          query(collection(db, 'prompt_reports'),
            where('promptId', '==', prompt.id),
            where('reporterId', '==', user.uid)
          )
        );
        if (!existing.empty) {
          toast.error('You have already reported this prompt');
          setSubmitting(false);
          return;
        }
      }

      await addDoc(collection(db, 'prompt_reports'), {
        promptId: prompt.id,
        promptTitle: prompt.title,
        promptCreatorId: prompt.creatorId,
        reporterId: user?.uid ?? null,
        reason: selected,
        details: details.trim() || null,
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      // Increment reportCount on the prompt; auto-flag at 5+
      const promptRef = doc(db, 'prompts', prompt.id!);
      const newCount = (prompt.reportCount ?? 0) + 1;
      await updateDoc(promptRef, {
        reportCount: increment(1),
        ...(newCount >= 5 && prompt.moderationStatus === 'active'
          ? { moderationStatus: 'flagged' }
          : {}),
      });

      setStep('done');
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.2 }}
            className="relative bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
          >
            {step === 'reason' ? (
              <>
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4 text-rose-500" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground text-sm">Report Prompt</h3>
                      <p className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">{prompt.title}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={handleClose} className="w-8 h-8">
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Reasons */}
                <div className="px-6 py-4 space-y-2 max-h-[360px] overflow-y-auto">
                  <p className="text-xs text-muted-foreground mb-3">Why are you reporting this prompt?</p>
                  {REPORT_REASONS.map(reason => (
                    <button
                      key={reason.value}
                      onClick={() => setSelected(reason.value)}
                      className={cn(
                        'w-full text-left px-4 py-3 rounded-xl border transition-all',
                        selected === reason.value
                          ? 'border-primary bg-primary/5 text-foreground'
                          : 'border-border hover:border-primary/30 hover:bg-muted/40 text-foreground'
                      )}
                    >
                      <p className="text-sm font-semibold">{reason.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{reason.desc}</p>
                    </button>
                  ))}

                  {selected === 'other' && (
                    <textarea
                      value={details}
                      onChange={e => setDetails(e.target.value)}
                      placeholder="Describe the issue... (max 200 characters)"
                      maxLength={200}
                      rows={3}
                      className="w-full mt-2 px-3 py-2 text-sm bg-muted/30 border border-border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground"
                    />
                  )}
                </div>

                {/* Footer */}
                <div className="px-6 pb-6 flex gap-3 border-t border-border pt-4">
                  <Button variant="secondary" size="md" fullWidth onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    fullWidth
                    disabled={!selected || (selected === 'other' && !details.trim())}
                    isLoading={submitting}
                    onClick={handleSubmit}
                    className="bg-rose-500 hover:bg-rose-600 border-rose-500 shadow-rose-500/20 shadow-md"
                  >
                    Submit Report
                  </Button>
                </div>
              </>
            ) : (
              <div className="px-6 py-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-7 h-7 text-emerald-500" />
                </div>
                <h3 className="font-bold text-foreground text-base mb-2">Report Submitted</h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-6">
                  Thank you. Our team will review this within 48 hours. Your report helps keep the marketplace safe.
                </p>
                <Button variant="primary" size="md" onClick={handleClose}>
                  Done
                </Button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
