import { useState } from 'react';
import { Mail, ArrowLeft, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import Input from '../primitives/Input';
import Button from '../primitives/Button';
import { sendPasswordReset } from '../../lib/firebase';
import { usePath } from '../../hooks/usePath';

export default function ForgotPasswordForm() {
  const { prefix } = usePath();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to send reset link');
      
      setIsSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset link');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSent) {
    return (
      <div className="text-center space-y-6 py-4">
        <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <Send className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-foreground">Check your email</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We've sent a password reset link to <span className="text-primary underline decoration-indigo-200">{email}</span>
          </p>
        </div>
        <Link 
          to={prefix('/login')} 
          className="inline-flex items-center gap-2 text-primary font-bold text-sm hover:gap-3 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          label="Recovery Email"
          leftIcon={Mail}
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          variant="outline"
        />

        {error && (
          <div className="bg-red-50 border border-red-100 p-4 rounded-md">
            <p className="text-xs font-medium text-destructive">{error}</p>
          </div>
        )}

        <Button
          type="submit"
          isLoading={isLoading}
          variant="primary"
          size="lg"
          fullWidth
          leftIcon={Send}
          className="font-bold shadow-xl shadow-primary/20"
        >
          {isLoading ? 'Sending Link...' : 'Send Reset Link'}
        </Button>
      </form>

      <p className="text-center">
        <Link 
          to={prefix('/login')} 
          className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted-foreground hover:text-primary transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Cancel and return
        </Link>
      </p>
    </div>
  );
}
