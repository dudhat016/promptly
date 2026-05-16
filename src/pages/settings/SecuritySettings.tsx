import React from 'react';
import { Shield, Mail, Lock, LogOut, CheckCircle2, ShieldAlert } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'react-hot-toast';
import { auth } from '../../lib/firebase';
import Button from '../../components/primitives/Button';
import { useAuth } from '../../hooks/useAuth';

export default function SecuritySettings() {
  const { profile } = useAuth();

  const joinedDate = profile?.createdAt
    ? (() => {
        try {
          const d = typeof (profile.createdAt as any).toDate === 'function'
            ? (profile.createdAt as any).toDate()
            : new Date(profile.createdAt as string);
          return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
        } catch { return null; }
      })()
    : null;

  const handleSignOutAllSessions = async () => {
    try {
      await auth.signOut();
      toast.success('Signed out of all sessions');
    } catch {
      toast.error('Failed to sign out');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
        <div className="bg-card rounded-lg p-6 border border-border shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <h2 className="text-2xl font-bold flex items-center gap-3 text-foreground">
              <div className="w-10 h-10 bg-rose-500/10 text-rose-500 rounded-md flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              Security & Access
            </h2>
            <div className="flex items-center gap-2 px-4 py-2 bg-green-500/5 text-green-500 border border-green-500/10 rounded-md">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-[0.15em]">System Protected</span>
            </div>
          </div>

          <div className="space-y-4">
            <SecurityItem
              icon={Mail}
              title="Google Authentication"
              desc="Your identity is securely verified via your Google account."
              action="Verified"
              actionType="status"
            />
            <SecurityItem
              icon={Lock}
              title="Multi-Factor Auth"
              desc="Additional MFA is managed through your Google account security settings."
              action="Manage in Google"
              onAction={() => window.open('https://myaccount.google.com/security', '_blank')}
            />
            <SecurityItem
              icon={LogOut}
              title="Active Sessions"
              desc="Sign out of all devices immediately. You will need to sign back in."
              action="Sign Out All"
              onAction={handleSignOutAllSessions}
            />
          </div>

          {joinedDate && (
            <div className="mt-16 p-8 bg-muted rounded-md border border-border flex items-center gap-6">
              <div className="w-12 h-12 bg-card rounded-md flex items-center justify-center shrink-0 shadow-sm">
                <ShieldAlert className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground mb-1">Account Created</h4>
                <p className="text-xs text-muted-foreground">Your account has been secured since {joinedDate}.</p>
              </div>
            </div>
          )}
        </div>
    </motion.div>
  );
}

function SecurityItem({ icon: Icon, title, desc, action, actionType = 'button', onAction }: {
  icon: React.ElementType;
  title: string;
  desc: string;
  action: string;
  actionType?: 'button' | 'status';
  onAction?: () => void;
}) {
  return (
    <div className="flex items-center justify-between p-8 bg-muted/30 rounded-lg border border-transparent hover:border-border hover:bg-muted/50 transition-all group gap-6">
      <div className="flex items-center gap-6">
        <div className="w-14 h-14 bg-card rounded-md flex items-center justify-center text-muted-foreground/40 shadow-sm border border-border group-hover:scale-110 transition-transform group-hover:text-primary">
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="font-bold text-foreground text-lg leading-tight mb-1">{title}</p>
          <p className="text-xs font-medium text-muted-foreground max-w-[200px] md:max-w-md leading-relaxed">{desc}</p>
        </div>
      </div>
      {actionType === 'status' ? (
        <div className="flex items-center gap-2 px-6 py-3 bg-primary/10 text-primary border border-primary/20 rounded-md shrink-0">
          <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-[0.2em]">{action}</span>
        </div>
      ) : (
        <Button
          onClick={onAction}
          variant="outline"
          size="sm"
          className="font-bold uppercase tracking-[0.2em] shadow-sm shrink-0"
        >
          {action}
        </Button>
      )}
    </div>
  );
}
