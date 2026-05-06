import { ArrowRight, CheckCircle2, Home, Loader2, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function CheckoutVerifyPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [message, setMessage] = useState('Verifying your payment...');

  const orderId = searchParams.get('order_id');

  useEffect(() => {
    if (!orderId) {
      navigate('/dashboard');
      return;
    }

    async function verifyPayment() {
      try {
        // 1. Call your backend to verify the order status with Cashfree/PayPal
        const response = await fetch(`/api/payments/verify?order_id=${orderId}`);
        const data = await response.json();

        if (response.ok && data.status === 'PAID') {
          setStatus('success');
          setMessage(`Payment successful! Your ${data.planName || 'subscription'} is now active.`);
          toast.success("Subscription Activated!");
        } else {
          setStatus('failed');
          setMessage(data.message || "Payment verification failed or was cancelled.");
        }
      } catch (err) {
        console.error("Verification Error:", err);
        setStatus('failed');
        setMessage("An error occurred while verifying your payment.");
      }
    }

    verifyPayment();
  }, [orderId, navigate]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] p-10 shadow-2xl shadow-slate-200 text-center border border-slate-100">
        {status === 'loading' && (
          <div className="space-y-6">
            <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto animate-pulse">
              <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Verifying Payment</h2>
            <p className="text-slate-500 font-medium">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-6 animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-emerald-100 rounded-3xl flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Payment Successful!</h2>
            <p className="text-slate-500 font-medium">{message}</p>
            <button
              onClick={() => navigate(`/checkout/success?order_id=${orderId}`)}
              className="w-full bg-slate-900 text-white font-black py-4 rounded-xl hover:bg-black transition-all flex items-center justify-center gap-2 group mt-4"
            >
              Finish Upgrade
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        )}

        {status === 'failed' && (
          <div className="space-y-6 animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-rose-100 rounded-3xl flex items-center justify-center mx-auto">
              <XCircle className="w-10 h-10 text-rose-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Payment Failed</h2>
            <p className="text-slate-500 font-medium">{message}</p>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <button
                onClick={() => navigate('/pricing')}
                className="bg-slate-100 text-slate-900 font-black py-4 rounded-xl hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
              >
                Try Again
              </button>
              <button
                onClick={() => navigate('/')}
                className="bg-white border-2 border-slate-100 text-slate-500 font-black py-4 rounded-xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                Home
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
