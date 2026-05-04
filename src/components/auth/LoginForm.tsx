import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { Mail, Lock, LogIn } from 'lucide-react';
import { Link } from 'react-router-dom';
import AuthInput from './AuthInput';
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
        <AuthInput
          label="Email Address"
          icon={Mail}
          type="email"
          placeholder="name@example.com"
          {...register('email')}
          error={errors.email?.message}
        />
        <div className="space-y-2">
          <AuthInput
            label="Password"
            icon={Lock}
            type="password"
            placeholder="••••••••"
            {...register('password')}
            error={errors.password?.message}
          />
          <div className="text-right">
            <Link 
              to="/forgot-password" 
              className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-colors"
            >
              Forgot Password?
            </Link>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-sm hover:bg-black transition-all shadow-xl shadow-slate-200 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <LogIn className="w-4 h-4" />
              Sign In
            </>
          )}
        </button>
      </form>

      <div className="relative flex items-center py-2">
        <div className="flex-grow border-t border-slate-100"></div>
        <span className="flex-shrink mx-4 text-[10px] font-black uppercase tracking-widest text-slate-300">or continue with</span>
        <div className="flex-grow border-t border-slate-100"></div>
      </div>

      <button
        onClick={handleGoogleLogin}
        disabled={isSubmitting}
        className="w-full flex items-center justify-center gap-3 bg-white border-2 border-slate-100 py-4 px-6 rounded-2xl font-black text-slate-700 hover:border-indigo-200 hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
      >
        <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
        Google Account
      </button>

      <p className="text-center text-sm font-bold text-slate-500">
        Don't have an account?{' '}
        <Link to="/register" className="text-indigo-600 hover:underline">
          Create one for free
        </Link>
      </p>
    </div>
  );
}
