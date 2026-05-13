import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Gift, Copy, Check, Share2, 
  Twitter, Linkedin, Facebook, MessageCircle,
  Zap, Award, TrendingUp
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useMarketing } from '../../hooks/useMarketing';
import { usePath } from '../../hooks/usePath';
import { Button } from '../primitives';
import { cn } from '../../lib/utils';
import { toast } from 'react-hot-toast';

interface ReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ReferralModal({ isOpen, onClose }: ReferralModalProps) {
  const { profile } = useAuth();
  const { marketingConfig } = useMarketing();
  const { prefix } = usePath();
  const [copied, setCopied] = useState(false);

  const referralLink = profile?.referralCode
    ? `${window.location.origin}${prefix('/login')}?ref=${profile.referralCode}`
    : '';

  const copyToClipboard = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success('Referral link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareSocial = (platform: string) => {
    const text = encodeURIComponent(`Check out Promptly - the ultimate AI prompt marketplace! 🚀 Use my link to get started: ${referralLink}`);
    const urls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${text}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`,
      whatsapp: `https://api.whatsapp.com/send?text=${text}`
    };
    window.open(urls[platform], '_blank');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg bg-card border border-border rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Header Image/Pattern */}
          <div className="h-32 bg-primary/10 relative overflow-hidden flex items-center justify-center">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
            <div className="w-20 h-20 rounded-3xl bg-primary/20 flex items-center justify-center text-primary relative">
              <Gift className="w-10 h-10 animate-bounce" />
              <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-lg border-2 border-card">
                <Zap className="w-4 h-4 fill-current" />
              </div>
            </div>
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-background/50 hover:bg-background transition-colors"
            >
              <X className="w-4 h-4 text-foreground" />
            </button>
          </div>

          <div className="p-8 space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-foreground tracking-tight">Refer a Friend, Earn Cash</h2>
              <p className="text-muted-foreground">
                Get <span className="text-primary font-bold">{marketingConfig.referralCommission}% recurring commission</span> for every person you bring to Promptly.
              </p>
            </div>

            {/* Referral Link Box */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Your Unique Link</label>
              <div className="flex gap-2">
                <div className="flex-1 bg-muted/50 border border-border rounded-xl px-4 py-3 font-mono text-xs text-muted-foreground truncate flex items-center">
                  {referralLink || 'Generating link...'}
                </div>
                <Button
                  onClick={copyToClipboard}
                  variant={copied ? 'success' : 'primary'}
                  size="md"
                  className="shrink-0 rounded-xl"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* Social Sharing */}
            <div className="grid grid-cols-4 gap-3">
              <SocialButton icon={Twitter} color="bg-[#1DA1F2]" onClick={() => shareSocial('twitter')} label="Twitter" />
              <SocialButton icon={Linkedin} color="bg-[#0A66C2]" onClick={() => shareSocial('linkedin')} label="LinkedIn" />
              <SocialButton icon={Facebook} color="bg-[#1877F2]" onClick={() => shareSocial('facebook')} label="Facebook" />
              <SocialButton icon={MessageCircle} color="bg-[#25D366]" onClick={() => shareSocial('whatsapp')} label="WhatsApp" />
            </div>

            {/* Perks / Features */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">Recurring</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">Every month they stay subscribed.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">Unlimited</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">No cap on how many you refer.</p>
                </div>
              </div>
            </div>

            <Button
              variant="ghost"
              fullWidth
              size="lg"
              className="text-primary hover:bg-primary/5 font-bold"
              onClick={() => { onClose(); window.location.href = prefix('/affiliate'); }}
            >
              View Full Dashboard
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function SocialButton({ icon: Icon, color, onClick, label }: any) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 group"
      title={`Share on ${label}`}
    >
      <div className={cn(
        "w-12 h-12 rounded-2xl flex items-center justify-center text-white transition-transform group-hover:scale-110",
        color
      )}>
        <Icon className="w-5 h-5" />
      </div>
      <span className="text-[10px] font-bold text-muted-foreground group-hover:text-foreground">{label}</span>
    </button>
  );
}
