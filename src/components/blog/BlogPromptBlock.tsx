import { useState } from 'react';
import { Copy, Check, Sparkles } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import Button from '../primitives/Button';

interface BlogPromptBlockProps {
  content: string;
}

export default function BlogPromptBlock({ content }: BlogPromptBlockProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success(t('blogPrompt.success', 'Prompt copied to clipboard!'));
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error(t('blogPrompt.error', 'Failed to copy prompt.'));
    }
  };

  return (
    <div className="my-6 rounded-2xl border border-border bg-muted/30 overflow-hidden shadow-xs relative group transition-all hover:border-primary/30">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-muted/60 border-b border-border/80">
        <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-foreground">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span>{t('blogPrompt.title', 'Prompt Formula')}</span>
        </div>
        <Button
          onClick={handleCopy}
          variant={copied ? 'secondary' : 'primary'}
          size="sm"
          leftIcon={copied ? Check : Copy}
          className={`font-bold text-xs shadow-xs transition-all ${
            copied ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' : ''
          }`}
        >
          {copied ? t('blogPrompt.copied', 'Copied!') : t('blogPrompt.copy', 'Copy Prompt')}
        </Button>
      </div>

      {/* Prompt Body */}
      <div className="p-4 sm:p-5 font-mono text-xs sm:text-sm leading-relaxed text-foreground bg-muted/10 overflow-hidden whitespace-pre-wrap break-words select-all">
        {content}
      </div>
    </div>
  );
}
