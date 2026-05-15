import { collection, doc, getDocs, query, updateDoc, where, addDoc } from 'firebase/firestore';
import { AlertCircle, ArrowLeft, CheckCircle2, Mail, RotateCcw } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Link, useSearchParams } from 'react-router-dom';
import Button from '../components/primitives/Button';
import { api } from '../lib/api';
import { db } from '../lib/firebase';
import { usePath } from '../hooks/usePath';

export default function UnsubscribePage() {
  const [searchParams] = useSearchParams();
  const { prefix } = usePath();
  const email = searchParams.get('email') || '';
  const confirmed = searchParams.get('confirmed') === 'true';

  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'resubscribed'>(
    confirmed ? 'success' : 'loading'
  );
  const [resubLoading, setResubLoading] = useState(false);

  useEffect(() => {
    if (confirmed || !email) {
      setStatus(confirmed ? 'success' : 'error');
      return;
    }

    // Direct page visit — process client-side
    async function performUnsubscribe() {
      try {
        const snap = await getDocs(query(collection(db, 'marketing_contacts'), where('email', '==', email)));
        if (!snap.empty) {
          await updateDoc(doc(db, 'marketing_contacts', snap.docs[0].id), {
            status: 'unsubscribed', unsubscribedAt: new Date().toISOString(),
          });
        } else {
          // Create a blocked entry so future sends are suppressed
          await addDoc(collection(db, 'marketing_contacts'), {
            email, status: 'unsubscribed', source: 'unsubscribe_link',
            unsubscribedAt: new Date().toISOString(), createdAt: new Date().toISOString(),
          });
        }
        setStatus('success');
      } catch {
        setStatus('error');
      }
    }
    performUnsubscribe();
  }, [email, confirmed]);

  const handleResubscribe = async () => {
    if (!email) return;
    setResubLoading(true);
    try {
      await api.post('/email/resubscribe', { email });
      setStatus('resubscribed');
      toast.success('You\'ve been resubscribed!');
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setResubLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-card rounded-2xl border border-border shadow-2xl shadow-black/5 overflow-hidden"
      >
        <div className="bg-primary px-8 py-5 text-center">
          <p className="text-white font-black text-lg tracking-tight">PROMPTLY</p>
          <p className="text-primary-foreground/70 text-[10px] font-bold uppercase tracking-widest mt-0.5">Premium AI Prompt Marketplace</p>
        </div>

        <div className="p-10 text-center">
          {status === 'loading' && (
            <>
              <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-6 animate-pulse">
                <Mail className="w-8 h-8 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Processing…</h2>
              <p className="text-muted-foreground mt-2 text-sm">Updating your email preferences.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Unsubscribed</h2>
              <p className="text-muted-foreground text-sm mb-1">
                <span className="font-semibold text-foreground">{email || 'Your address'}</span> has been removed from all marketing emails.
              </p>
              <p className="text-muted-foreground/60 text-xs mb-8">
                Transactional emails (receipts, password resets) may still be sent as required for your account.
              </p>
              <div className="space-y-3">
                {email && (
                  <Button onClick={handleResubscribe} isLoading={resubLoading} variant="secondary" size="md" leftIcon={RotateCcw} className="w-full">
                    Undo — Resubscribe
                  </Button>
                )}
                <Button as={Link} to={prefix('/')} variant="ghost" size="md" leftIcon={ArrowLeft} className="w-full text-muted-foreground">
                  Back to Promptly
                </Button>
              </div>
            </>
          )}

          {status === 'resubscribed' && (
            <>
              <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Mail className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Welcome back!</h2>
              <p className="text-muted-foreground text-sm mb-8">
                <span className="font-semibold text-foreground">{email}</span> has been resubscribed. You'll hear from us again.
              </p>
              <Button as={Link} to={prefix('/')} variant="primary" size="md" className="w-full">
                Back to Promptly
              </Button>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 bg-destructive/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Something went wrong</h2>
              <p className="text-muted-foreground text-sm mb-8">
                We couldn't process your request. Please try again or contact support.
              </p>
              <div className="space-y-3">
                <Button onClick={() => window.location.reload()} variant="primary" size="md" className="w-full">
                  Try Again
                </Button>
                <Button as={Link} to={prefix('/')} variant="ghost" size="md" leftIcon={ArrowLeft} className="w-full text-muted-foreground">
                  Back to Promptly
                </Button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
