import { motion, AnimatePresence } from 'motion/react';
import { X, Twitter, Linkedin, Facebook, Link as LinkIcon, Check, Mail, Share2, Instagram } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import Button from './primitives/Button';

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c-.001 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413" />
    </svg>
  );
}

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  url: string;
}

export default function ShareModal({ isOpen, onClose, title, url }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  
  const finalUrl = url;
  
  const shareLinks = [
    {
      name: 'WhatsApp',
      icon: WhatsAppIcon,
      color: 'bg-[#25D366]',
      link: `https://api.whatsapp.com/send?text=${encodeURIComponent(title + ' ' + finalUrl)}`
    },
    {
      name: 'Instagram',
      icon: Instagram,
      color: 'bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888]',
      link: `https://www.instagram.com/`
    },
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
            </p>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-8">
              {shareLinks.map((platform) => (
                <a
                  key={platform.name}
                  href={platform.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    if (platform.name === 'Instagram') {
                      navigator.clipboard.writeText(finalUrl);
                      toast.success('Link copied! Paste it in your Instagram story or message.');
                    }
                  }}
                  className="flex flex-col items-center gap-1.5 group"
                >
                  <div className={`w-12 h-12 ${platform.color} text-white rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
                    <platform.icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate w-full text-center">{platform.name}</span>
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
