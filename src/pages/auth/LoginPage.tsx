import AuthLayout from '../../components/auth/AuthLayout';
import UnifiedAuth from '../../components/auth/UnifiedAuth';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !loading) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  return (
    <AuthLayout 
      title="Welcome Back" 
      subtitle="Sign in to your professional prompt engineering workspace."
    >
      <UnifiedAuth initialMode="login" />
    </AuthLayout>
  );
}
