import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { Mail, Lock, LogIn } from 'lucide-react';
import { Link } from 'react-router-dom';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { signInWithEmail, signInWithGoogle } from '../../lib/firebase';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid professional email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginForm() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      await signInWithEmail(data.email, data.password);
      toast.success('Welcome back!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to sign in');
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
      toast.success('Successfully signed in with Google');
    } catch (err: any) {
      toast.error(err.message || 'Google sign in failed');
    }
  };

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Input
          label="Email Address"
          leftIcon={Mail}
          type="email"
          placeholder="name@example.com"
          {...register('email')}
          error={errors.email?.message}
          variant="filled"
        />
        <div className="space-y-2">
          <Input
            label="Password"
            leftIcon={Lock}
            type="password"
            placeholder="••••••••"
            {...register('password')}
            error={errors.password?.message}
            variant="filled"
          />
          <div className="text-right">
            <Link
              to="/forgot-password"
              className="text-xs font-medium uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
            >
              Forgot Password?
            </Link>
          </div>
        </div>

        <Button
          type="submit"
          isLoading={isSubmitting}
          variant="primary"
          size="lg"
          fullWidth
          leftIcon={LogIn}
          className="font-bold shadow-xl shadow-primary/20"
        >
          {isSubmitting ? 'Signing in...' : 'Sign In'}
        </Button>
      </form>

      <div className="relative flex items-center py-2">
        <div className="flex-grow border-t border-border"></div>
        <span className="flex-shrink mx-4 text-xs font-medium uppercase tracking-widest text-muted-foreground/60">or continue with</span>
        <div className="flex-grow border-t border-border"></div>
      </div>

      <Button
        onClick={handleGoogleLogin}
        isLoading={isSubmitting}
        variant="white"
        size="lg"
        fullWidth
        className="font-bold border border-border"
      >
        <img src="https://www.google.com/favicon.ico" className="w-5 h-5 mr-1" alt="Google" />
        Google Account
      </Button>

      <p className="text-center text-sm font-medium text-muted-foreground">
        Don't have an account?{' '}
        <Link to="/register" className="text-primary hover:underline">
          Create one for free
        </Link>
      </p>
    </div>
  );
}
