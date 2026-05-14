import { ArrowRight, CheckCircle2, Home, Loader2, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePath } from '../hooks/usePath';
import Button from '../components/primitives/Button';

interface VerifyResult {
  planName: string;
  amount: number;
  currency: string;
  orderId: string;
}

export default function CheckoutVerifyPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { prefix } = usePath();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [message, setMessage] = useState('Verifying your payment...');
  const [result, setResult] = useState<VerifyResult | null>(null);

  const orderId = searchParams.get('order_id');

  useEffect(() => {
    if (!orderId) {
      navigate(prefix('/dashboard'));
      return;
    }

    async function verifyPayment() {
      try {
        const response = await fetch(`/api/payments/verify?order_id=${orderId}`);
        const data = await response.json();

        if (response.ok && (data.status === 'PAID' || data.status === 'COMPLETED')) {
          setResult({
            planName: data.planName || 'Pro Plan',
            amount: data.amount ?? 0,
            currency: data.currency ?? 'INR',
            orderId: data.orderId ?? orderId!,
          });
          setStatus('success');
          setMessage(`Your ${data.planName || 'subscription'} is now active.`);
          toast.success('Subscription Activated!');
        } else {
          setStatus('failed');
          setMessage(data.message || 'Payment verification failed or was cancelled.');
        }
      } catch (err) {
        console.error('Verification Error:', err);
        setStatus('failed');
        setMessage('An error occurred while verifying your payment.');
      }
    }

    verifyPayment();
  }, [orderId]);

  const goToSuccess = () => {
    if (!result) return;
    const params = new URLSearchParams({
      order_id:  result.orderId,
      plan_name: result.planName,
      amount:    String(result.amount),
      currency:  result.currency,
    });
    navigate(prefix(`/checkout/success?${params.toString()}`));
  };

  return (
    <div className="min-h-screen bg-muted/50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card rounded-lg p-10 shadow-2xl shadow-black/5 text-center border border-border">
        {status === 'loading' && (
          <div className="space-y-6">
            <div className="w-20 h-20 bg-primary/8 rounded-lg flex items-center justify-center mx-auto animate-pulse">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Verifying Payment</h2>
            <p className="text-muted-foreground font-medium">Confirming your transaction with the payment gateway…</p>
          </div>
        )}

        {status === 'success' && result && (
          <div className="space-y-6 animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-emerald-100 rounded-lg flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Payment Successful!</h2>
            <p className="text-muted-foreground font-medium">{message}</p>
            <div className="bg-muted/50 rounded-xl p-4 text-left border border-border">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground font-medium">Plan</span>
                <span className="font-bold text-foreground">{result.planName}</span>
              </div>
              {result.amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground font-medium">Amount</span>
                  <span className="font-bold text-foreground">
                    {result.currency === 'INR' ? '₹' : '$'}{result.amount}
                  </span>
                </div>
              )}
            </div>
            <Button
              onClick={goToSuccess}
              variant="primary"
              size="lg"
              fullWidth
              rightIcon={ArrowRight}
              className="mt-4 font-bold shadow-xl shadow-primary/20"
            >
              Finish Upgrade
            </Button>
          </div>
        )}

        {status === 'failed' && (
          <div className="space-y-6 animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-rose-100 rounded-lg flex items-center justify-center mx-auto">
              <XCircle className="w-10 h-10 text-rose-600" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Payment Failed</h2>
            <p className="text-muted-foreground font-medium">{message}</p>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <Button onClick={() => navigate(prefix('/pricing'))} variant="secondary" size="lg" className="font-bold">
                Try Again
              </Button>
              <Button onClick={() => navigate(prefix('/'))} variant="outline" size="lg" leftIcon={Home} className="font-bold border-2">
                Home
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
