import { signInWithGoogle, signInAsGuest, signInWithEmail, signUpWithEmail } from '../lib/firebase';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useEffect, useState } from 'react';
import { Sparkles, LogIn, User, Mail, Lock as LockIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'react-hot-toast';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

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
        className="max-w-md w-full bg-card rounded-lg border border-border p-10 shadow-md shadow-primary/10"
      >
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-primary rounded-md flex items-center justify-center mx-auto mb-6 shadow-xl shadow-primary/20">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Welcome Back</h1>
          <p className="text-muted-foreground">Sign in to access your custom prompt library and premium content.</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-3 mb-6">
            <Input 
              id="email"
              name="email"
              type="email" 
              placeholder="Email address" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              leftIcon={Mail}
              variant="filled"
            />
            <Input 
              id="password"
              name="password"
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              leftIcon={LockIcon}
              variant="filled"
            />
            <div className="flex gap-3">
              <Button
                onClick={() => handleLogin('email-signin')}
                isLoading={isLoggingIn}
                variant="primary"
                className="flex-1"
                leftIcon={LogIn}
              >
                Sign In
              </Button>
              <Button
                onClick={() => handleLogin('email-signup')}
                isLoading={isLoggingIn}
                variant="white"
                className="flex-1"
                leftIcon={User}
              >
                Sign Up
              </Button>
            </div>
          </div>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-border"></div>
            <span className="flex-shrink mx-4 text-muted-foreground text-xs font-bold uppercase tracking-widest">or</span>
            <div className="flex-grow border-t border-border"></div>
          </div>

          <Button
            onClick={() => handleLogin('google')}
            isLoading={isLoggingIn}
            variant="outline"
            fullWidth
            size="lg"
            className="border-2 font-bold"
          >
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5 mr-1" alt="Google" />
            Continue with Google
          </Button>
        </div>

        <div className="mt-8 pt-8 border-t border-border text-center">
          <p className="text-sm text-muted-foreground">
            By joining, you agree to our <a href="#" className="text-primary hover:underline">Terms of Service</a> and <a href="#" className="text-primary hover:underline">Privacy Policy</a>.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
