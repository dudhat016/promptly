import { Lock, LogIn, Mail, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { signInWithEmail, signInWithGoogle, signUpWithEmail } from '../../lib/firebase';
import Input from '../primitives/Input';
import Button from '../primitives/Button';
import { cn } from '../../lib/utils';

interface UnifiedAuthProps {
  initialMode?: 'login' | 'register';
  onSuccess?: () => void;
  hideFooter?: boolean;
}

export default function UnifiedAuth({ initialMode = 'login', onSuccess, hideFooter = false }: UnifiedAuthProps) {
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmail(email, password);
        toast.success('Welcome back!');
      } else {
        await signUpWithEmail(email, password);
        toast.success('Account created successfully!');
      }
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      toast.success('Successfully signed in with Google');
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-foreground uppercase tracking-widest text-xs">
          {isLogin ? 'Login to your account' : 'Join the elite'}
        </h3>
        <Button
          type="button"
          onClick={() => setIsLogin(!isLogin)}
          variant="ghost"
          size="sm"
          className="text-primary uppercase tracking-widest font-medium underline underline-offset-4"
        >
          {isLogin ? 'New user? Sign up' : 'Already have an account? Log in'}
        </Button>
      </div>

      <form onSubmit={handleEmailAuth} className="space-y-4">
        <Input
          label="Email Address"
          leftIcon={Mail}
          type="email"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          variant="filled"
        />
        <div className="space-y-2">
          <Input
            label={isLogin ? "Password" : "Choose Password"}
            leftIcon={Lock}
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete={isLogin ? "current-password" : "new-password"}
            variant="filled"
          />
          {isLogin && (
            <div className="text-right">
              <Link to="/forgot-password" title="Reset your password" className="text-xs font-medium uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">
                Forgot Password?
              </Link>
            </div>
          )}
        </div>

        <Button
          type="submit"
          isLoading={loading}
          variant={isLogin ? 'primary' : 'primary'}
          size="lg"
          fullWidth
          leftIcon={isLogin ? LogIn : UserPlus}
          className={cn(
            "font-semibold py-3",
            isLogin ? "bg-foreground hover:bg-foreground/90 shadow-black/5" : "bg-primary shadow-primary/10"
          )}
        >
          {isLogin ? 'Sign In' : 'Create Expert Account'}
        </Button>
      </form>

      <div className="relative flex items-center py-2">
        <div className="flex-grow border-t border-border"></div>
        <span className="flex-shrink mx-4 text-xs font-medium uppercase tracking-widest text-muted-foreground/60">or use email</span>
        <div className="flex-grow border-t border-border"></div>
      </div>

      <Button
        type="button"
        onClick={handleGoogleAuth}
        isLoading={loading}
        variant="outline"
        size="lg"
        fullWidth
        className="font-semibold bg-card border border-border hover:bg-muted/50 transition-all shadow-sm"
      >
        <svg className="w-5 h-5 mr-3 shrink-0" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Continue with Google
      </Button>

      {!hideFooter && (
        <p className="text-center text-sm font-medium text-muted-foreground">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <Button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            variant="ghost"
            size="sm"
            className="text-primary hover:underline px-1 py-0 h-auto font-medium"
          >
            {isLogin ? 'Create one for free' : 'Sign in here'}
          </Button>
        </p>
      )}
    </div>
  );
}
