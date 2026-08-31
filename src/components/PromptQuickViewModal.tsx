import { AnimatePresence, motion } from 'motion/react';
import { Check, Copy, ExternalLink, Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { usePath } from '../hooks/usePath';
import { Prompt } from '../types';
import Button from './primitives/Button';

interface PromptQuickViewModalProps {
  prompt: Prompt | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function PromptQuickViewModal({ prompt, isOpen, onClose }: PromptQuickViewModalProps) {
  const [copied, setCopied] = useState(false);
  const { prefix } = usePath();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const [imgError, setImgError] = useState(false);

  if (!isOpen || !prompt) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt.content);
    setCopied(true);
    toast.success('Prompt copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const openGemini = () => {
    navigator.clipboard.writeText(prompt.content);
    toast.success('Prompt copied! Opening Gemini...');
    window.open('https://gemini.google.com/', '_blank');
  };

  const openChatGPT = () => {
    navigator.clipboard.writeText(prompt.content);
    toast.success('Prompt copied! Opening ChatGPT...');
    window.open('https://chatgpt.com/', '_blank');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-md"
        />

        {/* Modal Box */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="relative bg-card border border-border w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col md:flex-row my-auto max-h-[90vh]"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors backdrop-blur-sm"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Left: Image Display */}
          <div className="md:w-1/2 bg-muted/40 relative flex items-center justify-center min-h-[280px] md:min-h-[460px] overflow-hidden group">
            {prompt.imageUrl && !imgError ? (
              <img
                src={prompt.imageUrl}
                alt={prompt.title}
                onError={() => setImgError(true)}
                className="w-full h-full object-cover max-h-[450px] md:max-h-[550px]"
              />
            ) : (
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <Sparkles className="w-12 h-12 opacity-30 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wider">AI Prompt Preview</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none md:hidden" />
            <div className="absolute bottom-3 left-3 md:hidden text-white">
              <span className="text-[10px] font-bold uppercase tracking-widest bg-primary px-2 py-0.5 rounded-full">
                {prompt.model || 'AI Model'}
              </span>
            </div>
          </div>

          {/* Right: Content & Action Panel */}
          <div className="md:w-1/2 p-6 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-4">
              {/* Header Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                {prompt.model && (
                  <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-md bg-primary/10 text-primary border border-primary/20">
                    {prompt.model}
                  </span>
                )}
                {prompt.categoryId && (
                  <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-md bg-muted text-muted-foreground border border-border">
                    {prompt.categoryId}
                  </span>
                )}
              </div>

              {/* Title & Description */}
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight leading-snug">
                  {prompt.title}
                </h2>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {prompt.description}
                </p>
              </div>

              {/* Prompt Text Container */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  <span>Prompt Formula</span>
                  <span className="text-[10px] font-normal text-muted-foreground/80">Copy and paste into AI</span>
                </div>
                <div className="relative bg-muted/60 border border-border rounded-xl p-3.5 max-h-48 overflow-y-auto font-mono text-xs text-foreground/90 leading-relaxed select-all">
                  {prompt.content}
                </div>
              </div>

              {/* Tags */}
              {prompt.tags && prompt.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {prompt.tags.slice(0, 5).map(tag => (
                    <span key={tag} className="text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Actions Footer */}
            <div className="space-y-3 pt-6 border-t border-border mt-4">
              {/* Primary 1-Click Copy */}
              <Button
                onClick={handleCopy}
                variant={copied ? 'success' : 'primary'}
                size="lg"
                fullWidth
                leftIcon={copied ? Check : Copy}
                className="font-bold py-3 text-sm shadow-lg shadow-primary/20"
              >
                {copied ? 'Prompt Copied!' : 'Copy Prompt'}
              </Button>

              {/* Instant Launch Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={openGemini}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 border border-blue-500/20 text-xs font-bold transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open Gemini
                </button>
                <button
                  onClick={openChatGPT}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 text-xs font-bold transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open ChatGPT
                </button>
              </div>

              {/* Link to Full Detail Page */}
              <div className="text-center">
                <Link
                  to={prefix(`/prompt/${prompt.slug || prompt.id}`)}
                  onClick={onClose}
                  className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors underline underline-offset-4"
                >
                  View Full Detail Page →
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
