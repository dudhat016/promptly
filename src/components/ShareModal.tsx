import { motion, AnimatePresence } from 'motion/react';
import { X, Twitter, Linkedin, Facebook, Link as LinkIcon, Check, Mail, Share2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import Button from './ui/Button';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  url: string;
  referralCode?: string | null;
}

export default function ShareModal({ isOpen, onClose, title, url, referralCode }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  
  // Append referral code to URL if present
  const finalUrl = referralCode ? `${url}?ref=${referralCode}` : url;
  
  const shareLinks = [
    {
      name: 'Twitter',
      icon: Twitter,
      color: 'bg-[#1DA1F2]',
      link: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(finalUrl)}`
    },
    {
      name: 'LinkedIn',
      icon: Linkedin,
      color: 'bg-[#0077b5]',
      link: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(finalUrl)}`
    },
    {
      name: 'Facebook',
      icon: Facebook,
      color: 'bg-[#4267B2]',
      link: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(finalUrl)}`
    },
    {
      name: 'Email',
      icon: Mail,
      color: 'bg-muted-foreground/70',
      link: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent("Check this out: " + finalUrl)}`
    }
  ];

  const handleCopy = () => {
    navigator.clipboard.writeText(finalUrl);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-foreground/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-card w-full max-w-md rounded-lg p-8 shadow-2xl relative z-10"
          >
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Share2 className="w-6 h-6 text-primary" />
                Share
              </h3>
              <Button 
                onClick={onClose} 
                variant="ghost" 
                size="icon" 
                className="text-muted-foreground"
              >
                <X className="w-6 h-6" />
              </Button>
            </div>

            <p className="text-muted-foreground font-medium mb-8">
              Share this {title.toLowerCase().includes('post') ? 'article' : 'prompt'} with your community.
              {referralCode && <span className="block mt-2 text-primary font-bold text-xs uppercase tracking-widest">Your referral link is active! ðŸš€</span>}
            </p>

            <div className="grid grid-cols-4 gap-4 mb-10">
              {shareLinks.map((platform) => (
                <a
                  key={platform.name}
                  href={platform.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-2 group"
                >
                  <div className={`w-14 h-14 ${platform.color} text-white rounded-md flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                    <platform.icon className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{platform.name}</span>
                </a>
              ))}
            </div>

            <div className="bg-muted/50 p-2 rounded-md border border-border flex items-center gap-2">
              <div className="flex-grow px-3 text-xs font-mono text-muted-foreground truncate">
                {finalUrl}
              </div>
              <Button
                onClick={handleCopy}
                variant={copied ? 'success' : 'primary'}
                size="md"
                leftIcon={copied ? Check : LinkIcon}
                className="font-bold"
              >
                {copied ? 'Copied' : 'Copy Link'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
