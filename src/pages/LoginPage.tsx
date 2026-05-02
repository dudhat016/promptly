import { signInWithGoogle, signInAsGuest } from '../lib/firebase';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useEffect, useState } from 'react';
import { Sparkles, LogIn, User } from 'lucide-react';
import { motion } from 'motion/react';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      sessionStorage.setItem('referralCode', ref);
    }
  }, [searchParams]);

  useEffect(() => {
    if (user && !loading) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  const handleLogin = async (type: 'google' | 'guest') => {
    setIsLoggingIn(true);
    try {
      if (type === 'google') {
        await signInWithGoogle();
      } else {
        await signInAsGuest();
      }
    } catch (error) {
      console.error("Login Error:", error);
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center px-4 py-24">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-[2rem] border border-slate-200 p-10 shadow-2xl shadow-indigo-500/10"
      >
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-200">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 mb-2">Welcome Back</h1>
          <p className="text-slate-500">Sign in to access your custom prompt library and premium content.</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => handleLogin('google')}
            disabled={isLoggingIn}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-slate-100 py-4 px-6 rounded-2xl font-bold text-slate-700 hover:border-indigo-200 hover:bg-slate-50 transition-all active:scale-95 shadow-sm disabled:opacity-50"
          >
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
            Continue with Google
          </button>

          <div className="relative flex items-center py-4">
            <div className="flex-grow border-t border-slate-100"></div>
            <span className="flex-shrink mx-4 text-slate-400 text-xs font-bold uppercase tracking-widest">or</span>
            <div className="flex-grow border-t border-slate-100"></div>
          </div>

          <button
            onClick={() => handleLogin('guest')}
            disabled={isLoggingIn}
            className="w-full flex items-center justify-center gap-3 bg-slate-50 border-2 border-transparent py-4 px-6 rounded-2xl font-bold text-slate-600 hover:bg-slate-100 transition-all active:scale-95 disabled:opacity-50"
          >
            <User className="w-5 h-5" />
            Sign in as Guest (Testing)
          </button>
        </div>

        <div className="mt-8 pt-8 border-t border-slate-50 text-center">
          <p className="text-sm text-slate-400">
            By joining, you agree to our <a href="#" className="text-indigo-600 hover:underline">Terms of Service</a> and <a href="#" className="text-indigo-600 hover:underline">Privacy Policy</a>.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
