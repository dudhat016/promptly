import AuthLayout from '../../components/auth/AuthLayout';
import UnifiedAuth from '../../components/auth/UnifiedAuth';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import { useEffect } from 'react';
import { usePath } from '../../hooks/usePath';
import { useConfig } from '../../hooks/useConfig';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import Button from '../../components/primitives/Button';

export default function RegisterPage() {
  const { user, loading } = useAuth();
  const { config, loading: configLoading } = useConfig();
  const navigate = useNavigate();
  const { prefix } = usePath();

  useEffect(() => {
    if (user && !loading) {
      navigate(prefix('/dashboard'));
    }
  }, [user, loading, navigate]);

  if (configLoading) return null;

  if (!config.allowRegistration) {
    return (
      <AuthLayout 
        title="Registration Paused" 
        subtitle={`New signups are currently restricted by ${config.siteName} administrators.`}
      >
        <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-6 text-center">
          <div className="w-12 h-12 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6 text-rose-500" />
          </div>
          <p className="text-sm font-medium text-muted-foreground mb-6">
            We are not accepting new members at this moment. Please contact support or check back later.
          </p>
          <Button as={Link} to={prefix('/')} variant="outline" fullWidth leftIcon={ArrowLeft}>
            Back to Home
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout 
      title={`Join ${config.siteName}`} 
      subtitle={config.siteTagline}
    >
      <UnifiedAuth initialMode="register" />
    </AuthLayout>
  );
}
