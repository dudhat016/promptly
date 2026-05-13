import AuthLayout from '../../components/auth/AuthLayout';
import UnifiedAuth from '../../components/auth/UnifiedAuth';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { usePath } from '../../hooks/usePath';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { prefix } = usePath();

  useEffect(() => {
    if (user && !loading) {
      navigate(prefix('/dashboard'));
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
