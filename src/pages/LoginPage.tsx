import { signInWithGoogle, signInAsGuest, signInWithEmail, signUpWithEmail } from '../lib/firebase';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useEffect, useState } from 'react';
import { Sparkles, LogIn, User } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'react-hot-toast';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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

  const handleLogin = async (type: 'google' | 'guest' | 'email-signin' | 'email-signup') => {
    setIsLoggingIn(true);
    try {
      if (type === 'google') {
        await signInWithGoogle();
      } else if (type === 'guest') {
        await signInAsGuest();
      } else if (type === 'email-signin') {
        if (!email || !password) throw new Error("Please enter email and password");
        await signInWithEmail(email, password);
      } else if (type === 'email-signup') {
        if (!email || !password) throw new Error("Please enter email and password");
        await signUpWithEmail(email, password);
      }
    } catch (error: any) {
      console.error("Login Error:", error);
      if (error?.code === 'auth/admin-restricted-operation' || error?.code === 'auth/operation-not-allowed') {
        toast.error("Login method disabled. Please check Firebase settings.");
      } else {
        toast.error(`Login failed: ${error.message}`);
      }
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
          <div className="space-y-3 mb-6">
            <input 
              type="email" 
              placeholder="Email address" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
            />
            <input 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
            />
            <div className="flex gap-3">
              <button
                onClick={() => handleLogin('email-signin')}
                disabled={isLoggingIn}
                className="flex-1 bg-indigo-600 py-3 rounded-2xl font-bold text-white hover:bg-indigo-700 transition-all shadow-md disabled:opacity-50"
              >
                Sign In
              </button>
              <button
                onClick={() => handleLogin('email-signup')}
                disabled={isLoggingIn}
                className="flex-1 bg-slate-900 py-3 rounded-2xl font-bold text-white hover:bg-black transition-all shadow-md disabled:opacity-50"
              >
                Sign Up
              </button>
            </div>
          </div>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-slate-100"></div>
            <span className="flex-shrink mx-4 text-slate-400 text-xs font-bold uppercase tracking-widest">or</span>
            <div className="flex-grow border-t border-slate-100"></div>
          </div>

          <button
            onClick={() => handleLogin('google')}
            disabled={isLoggingIn}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-slate-100 py-4 px-6 rounded-2xl font-bold text-slate-700 hover:border-indigo-200 hover:bg-slate-50 transition-all active:scale-95 shadow-sm disabled:opacity-50"
          >
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
            Continue with Google
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
