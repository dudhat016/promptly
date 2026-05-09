import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { Mail, Lock, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import Input from '../ui/Input';
import Button from '../ui/Button';
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
        <Input
          label="Email Address"
          leftIcon={Mail}
          type="email"
          placeholder="name@example.com"
          {...register('email')}
          error={errors.email?.message}
          variant="filled"
        />
        <Input
          label="Choose Password"
          leftIcon={Lock}
          type="password"
          placeholder="••••••••"
          {...register('password')}
          error={errors.password?.message}
          variant="filled"
        />

        <Button
          type="submit"
          isLoading={isSubmitting}
          variant="primary"
          size="lg"
          fullWidth
          leftIcon={UserPlus}
          className="font-bold shadow-xl shadow-primary/20"
        >
          {isSubmitting ? 'Creating account...' : 'Create Expert Account'}
        </Button>
      </form>

      <div className="relative flex items-center py-2">
        <div className="flex-grow border-t border-border"></div>
        <span className="flex-shrink mx-4 text-xs font-medium uppercase tracking-widest text-muted-foreground/60">or join with</span>
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
        Already have an account?{' '}
        <Link to="/login" className="text-primary hover:underline">
          Sign in here
        </Link>
      </p>
    </div>
  );
}
