import { useEffect, useState } from 'react';
import {
  Shield, Lock, LogOut, CheckCircle2, ShieldAlert, Activity,
  Globe, Clock, AlertTriangle, Key,
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'react-hot-toast';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import Button from '../../components/primitives/Button';
import Spinner from '../../components/feedback/Spinner';
import Card from '../../components/primitives/Card';
import { useAuth } from '../../hooks/useAuth';

interface LoginEvent {
  id: string;
  sentAt: any;
}

export default function SecuritySettings() {
  const { profile, user } = useAuth();
  const [loginHistory, setLoginHistory] = useState<LoginEvent[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

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

  const lastSignIn = auth.currentUser?.metadata?.lastSignInTime
    ? new Date(auth.currentUser.metadata.lastSignInTime).toLocaleString(undefined, {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : null;

  const providers = auth.currentUser?.providerData ?? [];

  useEffect(() => {
    if (!user?.email) { setLoadingHistory(false); return; }
    fetchLoginHistory(user.email);
  }, [user?.email]);

  async function fetchLoginHistory(email: string) {
    try {
      const snap = await getDocs(
        query(
          collection(db, 'email_logs'),
          where('recipientEmail', '==', email),
          where('type', '==', 'login_alert'),
          orderBy('sentAt', 'desc'),
          limit(5)
        )
      );
      setLoginHistory(snap.docs.map(d => ({ id: d.id, ...d.data() } as LoginEvent)));
    } catch {
      // Index may not exist yet — fail silently
    } finally {
      setLoadingHistory(false);
    }
  }

  const handleSignOutAll = async () => {
    try {
      await auth.signOut();
      toast.success('Signed out of all sessions');
    } catch {
      toast.error('Failed to sign out');
    }
  };

  const providerLabel = (id: string) => {
    const map: Record<string, string> = {
      'google.com': 'Google',
      'password':   'Email & Password',
      'github.com': 'GitHub',
      'facebook.com': 'Facebook',
    };
    return map[id] ?? id;
  };

  const formatEventDate = (sentAt: any): string => {
    try {
      const d = sentAt?.toDate?.() ?? new Date(sentAt?.seconds * 1000);
      return d.toLocaleString(undefined, {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch { return 'Unknown'; }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

      {/* Header */}
      <Card className="!rounded-lg" padding="md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-2xl font-bold flex items-center gap-3 text-foreground">
            <div className="w-10 h-10 bg-rose-500/10 text-rose-500 rounded-md flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            Security & Access
          </h2>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/8 text-emerald-600 border border-emerald-500/20 rounded-md w-fit text-xs font-bold uppercase tracking-widest">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Account Protected
          </div>
        </div>
      </Card>

      {/* Sign-in Methods */}
      <Card className="!rounded-lg" padding="none">
        <div className="px-6 py-3 bg-muted border-b border-border">
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Sign-in Methods</span>
        </div>
        <div className="divide-y divide-border">
          {(providers.length > 0 ? providers : [{ providerId: 'google.com', email: user?.email }]).map((p: any) => (
            <div key={p.providerId} className="flex items-center justify-between px-6 py-4 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary/10 text-primary rounded-md flex items-center justify-center">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{providerLabel(p.providerId)}</p>
                  <p className="text-xs text-muted-foreground">{p.email ?? user?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-500/8 border border-emerald-500/20 px-2.5 py-1 rounded-md">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Connected
              </div>
            </div>
          ))}

          {/* MFA row */}
          <div className="flex items-center justify-between px-6 py-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-muted text-muted-foreground rounded-md flex items-center justify-center">
                <Key className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Multi-Factor Authentication</p>
                <p className="text-xs text-muted-foreground">Managed through your Google account security settings</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('https://myaccount.google.com/security', '_blank')}
              className="shrink-0 text-xs"
            >
              Manage in Google
            </Button>
          </div>

          {/* Password row */}
          <div className="flex items-center justify-between px-6 py-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-muted text-muted-foreground rounded-md flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Password</p>
                <p className="text-xs text-muted-foreground">Managed via your Google account — no separate password needed</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('https://myaccount.google.com/signinoptions/password', '_blank')}
              className="shrink-0 text-xs"
            >
              Change in Google
            </Button>
          </div>
        </div>
      </Card>

      {/* Active Session */}
      <Card className="!rounded-lg" padding="none">
        <div className="px-6 py-3 bg-muted border-b border-border">
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Active Session</span>
        </div>
        <div className="px-6 py-5 flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-primary/10 text-primary rounded-md flex items-center justify-center shrink-0 mt-0.5">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Current Session</p>
              <p className="text-xs text-muted-foreground mt-0.5">{user?.email}</p>
              {lastSignIn && (
                <p className="text-xs text-muted-foreground mt-0.5">Last signed in: {lastSignIn}</p>
              )}
            </div>
          </div>
          <Button
            onClick={handleSignOutAll}
            variant="outline"
            size="sm"
            leftIcon={LogOut}
            className="shrink-0 text-xs border-rose-500/30 text-rose-600 hover:bg-rose-500/10"
          >
            Sign Out All
          </Button>
        </div>
      </Card>

      {/* Recent Login Activity */}
      <Card className="!rounded-lg" padding="none">
        <div className="px-6 py-3 bg-muted border-b border-border flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Recent Login Activity</span>
          <span className="text-xs text-muted-foreground">Last 5 events</span>
        </div>

        {loadingHistory ? (
          <div className="p-8 flex items-center justify-center">
            <Spinner size="sm" />
          </div>
        ) : loginHistory.length > 0 ? (
          <div className="divide-y divide-border">
            {loginHistory.map((event, i) => (
              <div key={event.id} className="flex items-center justify-between px-6 py-4 gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${i === 0 ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} />
                  <div>
                    <p className="text-sm text-foreground font-medium">
                      {i === 0 ? 'Most recent login' : 'Login event'}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatEventDate(event.sentAt)}</p>
                  </div>
                </div>
                {i === 0 && (
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-500/8 border border-emerald-500/20 px-2 py-1 rounded">
                    Current
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-8 flex items-center gap-3 text-muted-foreground">
            <Clock className="w-4 h-4 shrink-0" />
            <p className="text-sm">
              No login alerts on record yet. Login alerts are sent to your email on each new sign-in.
            </p>
          </div>
        )}

        <div className="px-6 py-3 border-t border-border bg-muted/50 flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Don't recognise a login?{' '}
            <button onClick={handleSignOutAll} className="text-rose-500 font-semibold hover:underline">
              Sign out all sessions
            </button>{' '}
            immediately and change your password.
          </p>
        </div>
      </Card>

      {/* Account info */}
      {joinedDate && (
        <div className="flex items-center gap-4 p-5 bg-muted rounded-lg border border-border">
          <div className="w-8 h-8 bg-card rounded-md flex items-center justify-center shrink-0 border border-border">
            <ShieldAlert className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-sm text-muted-foreground">
            Your account has been secured since{' '}
            <span className="font-semibold text-foreground">{joinedDate}</span>.
          </p>
        </div>
      )}

    </motion.div>
  );
}
