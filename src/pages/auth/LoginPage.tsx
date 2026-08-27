import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AuthLayout from '../../components/auth/AuthLayout';
import UnifiedAuth from '../../components/auth/UnifiedAuth';
import { useAuth } from '../../hooks/useAuth';
import { usePath } from '../../hooks/usePath';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { prefix } = usePath();

  useEffect(() => {
    if (user && !loading) {
      navigate(prefix('/dashboard'));
    }
  }, [user, loading, navigate]);

  return (
    <AuthLayout
      title={t('auth.login.title')}
      subtitle={t('auth.login.subtitle')}
    >
      <UnifiedAuth initialMode="login" />
    </AuthLayout>
  );
}
