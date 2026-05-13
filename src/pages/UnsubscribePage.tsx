import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { Mail, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import Button from '../components/primitives/Button';

export default function UnsubscribePage() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email');
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'not_found'>('loading');

  useEffect(() => {
    async function performUnsubscribe() {
      if (!email) {
        setStatus('error');
        return;
      }

      try {
        const q = query(collection(db, 'marketing_contacts'), where('email', '==', email));
        const snap = await getDocs(q);

        if (snap.empty) {
          setStatus('not_found');
          return;
        }

        const contactDoc = snap.docs[0];
        await updateDoc(doc(db, 'marketing_contacts', contactDoc.id), {
          status: 'unsubscribed',
          unsubscribedAt: new Date().toISOString()
        });

        setStatus('success');
      } catch (err) {
        console.error(err);
        setStatus('error');
      }
    }

    performUnsubscribe();
  }, [email]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-card rounded-lg border border-border shadow-2xl shadow-black/5 p-12 text-center"
      >
        <div className="w-20 h-20 bg-muted/50 rounded-3xl flex items-center justify-center mx-auto mb-8">
          <Mail className="w-10 h-10 text-primary" />
        </div>

        {status === 'loading' && (
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Processing...</h2>
            <p className="text-muted-foreground">Please wait while we update your preferences.</p>
          </div>
        )}

        {status === 'success' && (
          <div>
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Unsubscribed</h2>
            <p className="text-muted-foreground mb-8">
              We've removed <strong>{email}</strong> from our marketing list. You will no longer receive promotional emails.
            </p>
            <Button as={Link} to="/" variant="ghost" size="md" leftIcon={ArrowLeft} className="font-bold">
              Back to Promptly
            </Button>
          </div>
        )}

        {status === 'not_found' && (
          <div>
            <div className="flex justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-amber-500" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Email Not Found</h2>
            <p className="text-muted-foreground mb-8">
              The email address <strong>{email}</strong> is not in our marketing database.
            </p>
            <Button as={Link} to="/" variant="primary" size="md">
              Return Home
            </Button>
          </div>
        )}

        {status === 'error' && (
          <div>
            <div className="flex justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-rose-500" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Oops!</h2>
            <p className="text-muted-foreground mb-8">Something went wrong. Please try again later or contact support.</p>
            <Button onClick={() => window.location.reload()} variant="primary" size="md">
              Try Again
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
