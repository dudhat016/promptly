import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { Mail, Lock, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import AuthInput from './AuthInput';
import { signUpWithEmail, signInWithGoogle } from '../../lib/firebase';

const registerSchema = z.object({
  email: z.string().email('Please enter a valid professional email'),
  password: z.string().min(8, 'Security first! Password must be at least 8 characters'),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterForm() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormValues) => {
    try {
      await signUpWithEmail(data.email, data.password);
      toast.success('Account created successfully! Welcome to the elite.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create account');
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
      toast.success('Successfully joined with Google');
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
        <AuthInput
          label="Choose Password"
          icon={Lock}
          type="password"
          placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
          {...register('password')}
          error={errors.password?.message}
        />

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-primary text-primary-foreground py-3 rounded-md font-semibold text-sm hover:bg-primary/90 transition-all shadow-sm shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <UserPlus className="w-4 h-4" />
              Create Expert Account
            </>
          )}
        </button>
      </form>

      <div className="relative flex items-center py-2">
        <div className="flex-grow border-t border-border"></div>
        <span className="flex-shrink mx-4 text-xs font-medium uppercase tracking-widest text-muted-foreground/60">or join with</span>
        <div className="flex-grow border-t border-border"></div>
      </div>

      <button
        onClick={handleGoogleLogin}
        disabled={isSubmitting}
        className="w-full flex items-center justify-center gap-3 bg-card border border-border py-3 px-6 rounded-md font-semibold text-sm text-foreground hover:border-primary/30 hover:bg-muted/50 transition-all shadow-sm disabled:opacity-50"
      >
        <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
        Google Account
      </button>

      <p className="text-center text-sm font-medium text-muted-foreground">
        Already have an account?{' '}
        <Link to="/login" className="text-primary hover:underline">
          Sign in here
        </Link>
      </p>
    </div>
  );
}
