import AuthLayout from '../../components/auth/AuthLayout';
import UnifiedAuth from '../../components/auth/UnifiedAuth';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export default function RegisterPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !loading) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  return (
    <AuthLayout 
      title="Join Promptly" 
      subtitle="Start building high-performance prompts in seconds."
    >
      <UnifiedAuth initialMode="register" />
    </AuthLayout>
  );
}
